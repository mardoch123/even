
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Facebook } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';
import { UserRole } from '../types';
import { supabaseConfigError } from '../services/supabaseClient';

const CAROUSEL_TEXTS = [
  "L'événementiel réinventé.",
  "Trouvez la perle rare pour votre mariage.",
  "Paiement 100% sécurisé et garanti.",
  "Gérez votre activité en toute simplicité."
];

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithProvider, currentUser } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const signupRole: UserRole = searchParams.get('role') === 'provider' ? UserRole.PROVIDER : UserRole.CLIENT;

  useEffect(() => {
    const interval = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % CAROUSEL_TEXTS.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (supabaseConfigError) {
      setError(supabaseConfigError);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Rediriger vers le dashboard correspondant au rôle
      if (currentUser.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (currentUser.role === 'provider') {
        navigate('/dashboard/provider', { replace: true });
      } else {
        navigate('/dashboard/client', { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handlePostLoginRedirect = () => {
    // Rediriger vers le dashboard correspondant au rôle
    if (currentUser?.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    } else if (currentUser?.role === 'provider') {
      navigate('/dashboard/provider', { replace: true });
    } else {
      navigate('/dashboard/client', { replace: true });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(identifier, password);
      handlePostLoginRedirect();
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message || err || 'Connexion impossible.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
      setIsLoading(true);
      setError('');
      try {
          await loginWithProvider(provider, signupRole);
          handlePostLoginRedirect();
      } catch (err) {
          setError(String((err as any)?.message || `Erreur lors de la connexion ${provider}`));
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {isLoading && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center px-6">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-6 w-full max-w-sm">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-eveneo-violet"></div>
              <div>
                <p className="font-extrabold text-eveneo-dark">Connexion en cours...</p>
                <p className="text-sm text-gray-500">Veuillez patienter.</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 lg:px-24 py-12 relative z-10">
        <div className="mb-10">
          <Link to="/" className="hidden md:flex items-center gap-2 group mb-8">
            <Logo height={40} className="group-hover:scale-105 transition-transform" />
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-eveneo-dark mb-3">Bon retour !</h1>
          <p className="text-gray-500">Connectez-vous pour accéder à votre espace.</p>
        </div>

        {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                <AlertCircle size={18} />
                {error}
            </div>
        )}

        <div className="max-w-md w-full mx-auto lg:mx-0 space-y-4">
            <div className="grid grid-cols-3 gap-3">
                <button 
                    type="button"
                    onClick={() => handleSocialLogin('google')}
                    disabled={isLoading || !!supabaseConfigError}
                    className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                </button>
                <button 
                    type="button"
                    onClick={() => handleSocialLogin('facebook')}
                    disabled={isLoading || !!supabaseConfigError}
                    className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none text-[#1877F2]"
                >
                    <Facebook size={20} fill="currentColor" />
                </button>
                <button 
                    type="button"
                    onClick={() => handleSocialLogin('apple')}
                    disabled={isLoading || !!supabaseConfigError}
                    className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none text-black"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.54 1.81.07 3.17.83 3.9 1.74-3.29 1.77-2.74 6.75 1.32 8.26-.22.77-1.4 3.65-2.67 3.77zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                </button>
            </div>

            <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Ou classique</span>
                <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
            <Input 
                label="Email ou Téléphone" 
                type="text" 
                placeholder="exemple@mail.com" 
                icon={Mail}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
            />
            <Input 
                label="Mot de passe" 
                type="password" 
                placeholder="••••••••" 
                icon={Lock}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            
            <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-gray-600 cursor-pointer">
                <input type="checkbox" className="rounded border-gray-300 text-eveneo-violet focus:ring-eveneo-violet" />
                Se souvenir de moi
                </label>
                <a href="#" className="text-eveneo-violet font-medium hover:underline">Mot de passe oublié ?</a>
            </div>

            <Button 
                variant="primary" 
                fullWidth 
                size="lg" 
                type="submit" 
                disabled={isLoading || !!supabaseConfigError}
                className="mt-6"
            >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
            </Button>
            </form>

            <p className="mt-8 text-center text-gray-600">
              Pas encore de compte ?{' '}
              <Link to={signupRole === UserRole.PROVIDER ? "/register?role=provider" : "/register"} className="text-eveneo-violet font-bold hover:underline">
                Créer un compte
              </Link>
            </p>
        </div>
      </div>

      {/* Right Side - Image & Carousel */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-gray-900">
        <div className="absolute inset-0 bg-eveneo-gradient opacity-20 mix-blend-multiply z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-20"></div>
        <img 
          src="https://images.unsplash.com/photo-1505236858219-8359eb29e329?auto=format&fit=crop&q=80&w=1200" 
          alt="Event Atmosphere" 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-20 left-12 right-12 z-30">
            <div className="h-24">
                {CAROUSEL_TEXTS.map((text, idx) => (
                    <p 
                        key={idx}
                        className={`text-3xl md:text-4xl font-bold text-white transition-all duration-700 absolute top-0 left-0 ${
                            idx === carouselIndex ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                        }`}
                    >
                        "{text}"
                    </p>
                ))}
            </div>
            <div className="flex gap-2 mt-4">
                {CAROUSEL_TEXTS.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            idx === carouselIndex ? 'w-8 bg-white' : 'w-2 bg-white/30'
                        }`} 
                    />
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};
