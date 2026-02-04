import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { PageLoader } from '../components/PageLoader';
import { supabase, supabaseConfigError } from '../services/supabaseClient';

 const withTimeout = async <T,>(promiseLike: any, ms: number): Promise<T> => {
     let timeoutId: any;
     const timeout = new Promise<T>((_, reject) => {
         timeoutId = window.setTimeout(() => reject(new Error('timeout')), ms);
     });
     try {
         const p = Promise.resolve(promiseLike) as Promise<T>;
         return await Promise.race([p, timeout]);
     } finally {
         window.clearTimeout(timeoutId);
     }
 };

interface AuthContextType {
    currentUser: User | null;
    loading: boolean;
    login: (identifier: string, password: string) => Promise<void>;
    loginWithProvider: (provider: 'google' | 'facebook' | 'apple', role?: UserRole) => Promise<void>;
    loginWithGoogle: (role?: UserRole) => Promise<void>;
    register: (email: string, password: string, role: UserRole, name: string, phone?: string) => Promise<void>;
    updatePassword: (password: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const clearLocalAuthState = () => {
        try {
            const keys = [
                'eveneo_user',
                'eveneo_user_role',
                'provider_profile_completed',
                'provider_kyc_status',
                'provider_wallet_balance'
            ];
            for (const k of keys) localStorage.removeItem(k);
        } catch {
            // ignore
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            if (supabaseConfigError) {
                console.error(supabaseConfigError);
                setLoading(false);
                return;
            }
            const timeoutMs = 7000;
            let timedOut = false;

            const timeout = new Promise<null>((resolve) => {
                window.setTimeout(() => {
                    timedOut = true;
                    resolve(null);
                }, timeoutMs);
            });

            try {
                const sessionResult = await Promise.race([
                    supabase.auth.getSession(),
                    timeout
                ]);

                if (timedOut || !sessionResult || !(sessionResult as any).data) {
                    return;
                }

                const { data: { session } } = sessionResult as any;
                if (session?.user) {
                    const user = await Promise.race([
                        fetchProfile(session.user.id),
                        timeout
                    ]);
                    if (timedOut) return;

                    if (user) {
                        setCurrentUser(user as any);
                    } else {
                        console.warn("Session found but no profile. Logging out.");
                        try {
                            await supabase.auth.signOut();
                        } finally {
                            clearLocalAuthState();
                        }
                    }
                }
            } catch (e) {
                console.error("Auth initialization error:", e);
            } finally {
                setLoading(false);
            }
        };
        void initAuth();

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (session?.user) {
                    const user = await fetchProfile(session.user.id);
                    setCurrentUser(user);
                } else if (event === 'SIGNED_OUT') {
                    setCurrentUser(null);
                    clearLocalAuthState();
                }
            } catch (e) {
                console.error('Auth state change error:', e);
            }
        });
        return () => authListener.subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string): Promise<User | null> => {
        if (supabaseConfigError) {
            throw new Error(supabaseConfigError);
        }
        const timeoutMs = 7000;
        const { data, error } = await withTimeout<any>(
            supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single(),
            timeoutMs
        );

        if (error || !data) {
            console.error("Fetch profile error:", error);
            return null;
        }

        let lsPlan: any = undefined;
        try {
            const raw = localStorage.getItem('eveneo_user');
            if (raw) {
                const parsed = JSON.parse(raw);
                lsPlan = parsed?.subscriptionPlan;
            }
        } catch {
            // ignore
        }

        const planFromProfile = (data.subscription_plan || data.subscriptionPlan || (data.details && data.details.subscriptionPlan)) as any;
        const subscriptionPlan = (planFromProfile || lsPlan) as any;

        return {
            id: data.id,
            email: data.email,
            name: data.full_name || 'Utilisateur',
            role: (data.role as UserRole) || UserRole.CLIENT,
            avatarUrl: data.avatar_url,
            isVerified: data.is_verified,
            kycStatus: data.kyc_status,
            subscriptionPlan,
            phone: data.phone,
            location: data.location,
            details: data.details,
            hasPassword: true
        };
    };

    const login = async (identifier: string, password: string) => {
        try {
            if (supabaseConfigError) {
                throw new Error(supabaseConfigError);
            }
            const timeoutMs = 10000;
            const rawIdentifier = (identifier || '').trim();
            const looksLikeEmail = rawIdentifier.includes('@');
            const attempt = async (payload: any) => {
                return await withTimeout<any>(supabase.auth.signInWithPassword(payload), timeoutMs);
            };

            let result: any;
            if (looksLikeEmail) {
                result = await attempt({ email: rawIdentifier, password });
            } else {
                const cleaned = rawIdentifier.replace(/[^\d+]/g, '');
                const phone1 = cleaned.startsWith('00') ? `+${cleaned.slice(2)}` : cleaned;
                result = await attempt({ phone: phone1, password });

                if (result?.error && phone1 && !phone1.startsWith('+') && /^\d{8,15}$/.test(phone1)) {
                    const retry = await attempt({ phone: `+${phone1}`, password });
                    if (!retry?.error) result = retry;
                }
            }

            const { data, error } = result;

            if (error) throw error;
            if (!data.user) throw new Error('No user data returned');

            // Verify profile exists
            const user = await withTimeout<User | null>(fetchProfile(data.user.id), 10000);
            if (!user) {
                throw new Error("Profil utilisateur introuvable. Veuillez contacter le support.");
            }

            setCurrentUser(user);

        } catch (err: any) {
            const msg = String(err?.message || err);
            console.error("Login Failed:", msg);
            if (msg === 'timeout') {
                throw new Error('Connexion impossible pour le moment (timeout). Vérifiez votre réseau et réessayez.');
            }
            throw new Error(msg === "Invalid login credentials" ? "Email ou mot de passe incorrect." : msg);
        }
    };

    const loginWithProvider = async (provider: 'google' | 'facebook' | 'apple', role: UserRole = UserRole.CLIENT) => {
        try {
            if (supabaseConfigError) {
                throw new Error(supabaseConfigError);
            }
            const timeoutMs = 10000;
            const { data, error } = await withTimeout<any>(
                supabase.auth.signInWithOAuth({
                    provider: provider,
                    options: {
                        redirectTo: window.location.origin + '/#/',
                        queryParams: { role: role }
                    }
                }),
                timeoutMs
            );
            if (error) throw error;
        } catch (err: any) {
            const msg = String(err?.message || err);
            console.warn("Supabase OAuth Failed:", msg);

            if (msg === 'timeout') {
                throw new Error('Connexion impossible pour le moment (timeout). Vérifiez votre réseau et réessayez.');
            }

            if (msg?.includes('provider is not enabled')) {
                throw new Error(`La connexion avec ${provider} n'est pas activée. Veuillez contacter l'administrateur ou utiliser l'email.`);
            }
            throw err;
        }
    };

    const loginWithGoogle = async (role?: UserRole) => {
        return loginWithProvider('google', role);
    };

    const register = async (email: string, password: string, role: UserRole, name: string, phone?: string) => {
        try {
            if (supabaseConfigError) {
                throw new Error(supabaseConfigError);
            }
            const timeoutMs = 10000;
            const { data, error } = await withTimeout<any>(
                supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: name, role: role, phone: phone },
                        emailRedirectTo: window.location.origin + '/onboarding'
                    }
                }),
                timeoutMs
            );

            if (error) throw error;

            if (!data.user) {
                throw new Error("Échec de la création du compte.");
            }

            // Wait for trigger to create profile (it runs automatically)
            // Poll for profile existence
            if (data.session) {
                let profile = null;
                let attempts = 0;
                const maxAttempts = 10;

                while (!profile && attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between attempts
                    profile = await fetchProfile(data.user.id);
                    attempts++;
                }

                if (profile) {
                    setCurrentUser(profile);
                } else {
                    console.warn("Profile not created by trigger, creating manually");
                    // Fallback: create profile manually if trigger failed
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: data.user.id,
                            email: email,
                            full_name: name,
                            role: role,
                            phone: phone,
                            is_verified: false,
                            kyc_status: 'none'
                        });

                    if (profileError) {
                        console.error("Manual profile creation failed:", profileError);
                    } else {
                        const newProfile = await fetchProfile(data.user.id);
                        if (newProfile) {
                            setCurrentUser(newProfile);
                        }
                    }
                }
            } else {
                // No session means email confirmation required
                console.log("Email confirmation required. Check your inbox.");
            }

        } catch (err: any) {
            console.error("Supabase Registration Failed:", err);
            const msg = String(err?.message || err);
            if (msg === 'timeout') {
                throw new Error('Inscription impossible pour le moment (timeout). Vérifiez votre réseau et réessayez.');
            }
            if (err.message?.includes("already registered") ||
                err.message?.includes("existe déjà") ||
                err.message?.includes("User already registered")) {
                throw new Error("Un compte existe déjà avec cette adresse email.");
            }
            throw new Error(err.message || "Erreur lors de l'inscription.");
        }
    };

    const updatePassword = async (password: string) => {
        try {
            const { error } = await supabase.auth.updateUser({ password: password });
            if (error) throw error;
            if (currentUser) {
                setCurrentUser({ ...currentUser, hasPassword: true });
            }
        } catch (err: any) {
            console.error("Password Update Failed:", err.message);
            throw err;
        }
    };

    const logout = async () => {
        try {
            await withTimeout<any>(supabase.auth.signOut(), 7000);
        } catch (e) {
            console.warn('Logout failed (continuing):', e);
        } finally {
            clearLocalAuthState();
            setCurrentUser(null);
        }
    };

    const value: AuthContextType = {
        currentUser,
        loading,
        login,
        loginWithProvider,
        loginWithGoogle,
        register,
        updatePassword,
        logout
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? <PageLoader /> : children}
        </AuthContext.Provider>
    );
};