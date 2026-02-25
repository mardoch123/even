import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Logo } from '../../components/Logo';
import { UserRole } from '../../types';
import { supabaseConfigError } from '../../services/supabaseClient';
import { MobileOverlayLoader } from '../../components/MobileLoader';

export const MobileLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, loginWithProvider, currentUser } = useAuth();
  
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const signupRole: UserRole = searchParams.get('role') === 'provider' ? UserRole.PROVIDER : UserRole.CLIENT;

  useEffect(() => {
    if (supabaseConfigError) {
      setError(supabaseConfigError);
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      // Rediriger vers le dashboard correspondant au rôle
      if (currentUser.role === UserRole.ADMIN) {
        navigate('/admin/dashboard', { replace: true });
      } else if (currentUser.role === UserRole.PROVIDER) {
        navigate('/dashboard/provider', { replace: true });
      } else {
        navigate('/dashboard/client', { replace: true });
      }
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await login(identifier, password);
      // La redirection sera gérée par le useEffect ci-dessus
    } catch (err: any) {
      console.error(err);
      setError(String(err?.message || err || 'Connexion impossible.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError('');
    try {
      await loginWithProvider('google', signupRole);
      // Ne pas naviguer manuellement: Supabase redirige vers /#/auth/callback
    } catch (err) {
      setError(String((err as any)?.message || 'Erreur lors de la connexion Google'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Overlay de chargement */}
      {isLoading && <MobileOverlayLoader message="Connexion en cours..." />}

      {/* Header avec bouton retour et Logo */}
      <div className="flex-1 flex flex-col px-6 pt-12 pb-8">
        {/* Bouton retour */}
        <div className="mb-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        </div>

        {/* Logo et tagline */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <Logo height={50} />
          </div>
          <p className="text-gray-500 text-base">
            Votre plateforme d'événements
          </p>
        </div>

        {/* Message d'erreur */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} className="text-red-500 shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Formulaire */}
        <form onSubmit={handleLogin} className="space-y-5">
          {/* Champ Email */}
          <div>
            <label className="block text-gray-700 font-medium text-base mb-2">
              Email
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Mail size={20} />
              </div>
              <input
                type="email"
                placeholder="Entrez votre email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={isLoading || !!supabaseConfigError}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-eveneo-violet focus:ring-2 focus:ring-eveneo-violet/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Champ Mot de passe */}
          <div>
            <label className="block text-gray-700 font-medium text-base mb-2">
              Mot de passe
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={20} />
              </div>
              <input
                type="password"
                placeholder="Entrez votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading || !!supabaseConfigError}
                className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl text-gray-800 placeholder-gray-400 focus:outline-none focus:border-eveneo-violet focus:ring-2 focus:ring-eveneo-violet/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Se souvenir de moi + Mot de passe oublié */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-eveneo-violet focus:ring-eveneo-violet"
              />
              <span className="text-gray-600 text-sm">Se souvenir de moi</span>
            </label>
            <Link 
              to="/forgot-password" 
              className="text-eveneo-blue font-medium text-sm hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>

          {/* Bouton Se connecter */}
          <button
            type="submit"
            disabled={isLoading || !!supabaseConfigError}
            className="w-full py-4 bg-gradient-to-r from-eveneo-blue via-eveneo-violet to-eveneo-pink text-white font-semibold text-lg rounded-2xl shadow-lg shadow-eveneo-violet/30 active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            ) : (
              'Se connecter'
            )}
          </button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm">Ou continuer avec</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Bouton Google */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isLoading || !!supabaseConfigError}
          className="w-full py-4 bg-white border border-gray-200 rounded-2xl flex items-center justify-center gap-3 font-medium text-gray-700 shadow-sm active:scale-[0.98] transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continuer avec Google
        </button>

        {/* Lien d'inscription */}
        <div className="mt-auto pt-8 text-center">
          <p className="text-gray-500">
            Pas encore de compte ?{' '}
            <Link 
              to={signupRole === UserRole.PROVIDER ? "/register?role=provider" : "/register"}
              className="text-eveneo-blue font-semibold hover:underline"
            >
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
