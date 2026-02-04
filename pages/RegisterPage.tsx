
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, User, Phone, Facebook, AlertCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserRole } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Logo } from '../components/Logo';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, loginWithProvider } = useAuth();
  
  const [role, setRole] = useState<UserRole>(UserRole.CLIENT);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const urlRole = searchParams.get('role');
    if (urlRole === 'provider') setRole(UserRole.PROVIDER);
    else setRole(UserRole.CLIENT);
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await register(email, password, role, name, phone);
      navigate(`/onboarding?role=${role === UserRole.PROVIDER ? 'provider' : 'client'}`, { 
          state: { prefilledPhone: phone } 
      });
    } catch (error: any) {
      console.error("Registration failed", error);
      setError(error.message || "Une erreur est survenue lors de l'inscription.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook' | 'apple') => {
      setIsLoading(true);
      setError('');
      try {
          await loginWithProvider(provider, role);
          navigate(`/onboarding?role=${role === UserRole.PROVIDER ? 'provider' : 'client'}`);
      } catch (error: any) {
          console.error(`${provider} Registration failed`, error);
          setError(`Erreur lors de l'inscription avec ${provider}.`);
      } finally {
          setIsLoading(false);
      }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          {/* Logo sans fond blanc ni ombre */}
          <Link to="/" className="inline-flex mb-4">
            <Logo height={48} className="" />
          </Link>
          <h2 className="text-3xl font-bold text-eveneo-dark">Créer un compte</h2>
          <p className="text-gray-500 mt-2">Rejoignez la communauté Événéo</p>
        </div>

        {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl flex items-start gap-2 text-sm border border-red-100">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
            </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
            <button type="button" onClick={() => handleSocialRegister('google')} disabled={isLoading} className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            </button>
            <button type="button" onClick={() => handleSocialRegister('facebook')} disabled={isLoading} className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none text-[#1877F2]">
                <Facebook size={20} fill="currentColor" />
            </button>
            <button type="button" onClick={() => handleSocialRegister('apple')} disabled={isLoading} className="flex items-center justify-center p-3 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors focus:outline-none text-black">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 4.37-1.54 1.81.07 3.17.83 3.9 1.74-3.29 1.77-2.74 6.75 1.32 8.26-.22.77-1.4 3.65-2.67 3.77zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="flex-shrink-0 mx-4 text-gray-400 text-xs uppercase">Ou Email</span>
            <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <Input label="Nom complet" placeholder="Jean Dupont" icon={User} required value={name} onChange={(e) => setName(e.target.value)} />
          
          {role === UserRole.PROVIDER && (
             <Input label="Numéro de téléphone (Vérification requise)" type="tel" placeholder="+33 6 12 34 56 78" icon={Phone} required value={phone} onChange={(e) => setPhone(e.target.value)} className="bg-blue-50 border-blue-100 focus:border-blue-300" />
          )}
          
          <Input label="Email" type="email" placeholder="jean@exemple.com" icon={Mail} required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Mot de passe" type="password" placeholder="••••••••" icon={Lock} required value={password} onChange={(e) => setPassword(e.target.value)} />
          
          <div className="text-xs text-gray-500">
            En cliquant sur S'inscrire, vous acceptez nos <a href="#" className="underline">CGU</a> et notre <a href="#" className="underline">Politique de confidentialité</a>.
          </div>

          <Button variant="primary" fullWidth size="lg" type="submit" disabled={isLoading}>
            {isLoading ? 'Création...' : 'Créer mon compte'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <span className="text-gray-600">Déjà un compte ? </span>
          <Link to="/login" className="text-eveneo-violet font-bold hover:underline">
            Se connecter
          </Link>
        </div>
      </div>
    </div>
  );
};
