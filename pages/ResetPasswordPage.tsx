import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Lock } from 'lucide-react';
import { supabase, supabaseConfigError } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const hasAuthParams = useMemo(() => {
    const href = window.location.href;
    return href.includes('code=') || href.includes('access_token=') || href.includes('refresh_token=');
  }, []);

  useEffect(() => {
    const init = async () => {
      setError('');
      setInfo('');

      try {
        if (supabaseConfigError) throw new Error(supabaseConfigError);

        if (hasAuthParams) {
          const { error: exchError } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (exchError) throw exchError;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setInfo("Ouvre le lien de réinitialisation depuis ton email pour continuer.");
        }
      } catch (err: any) {
        setError(String(err?.message || err || 'Impossible de valider le lien.'));
      } finally {
        setIsLoading(false);
      }
    };

    void init();
  }, [hasAuthParams]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setInfo('');

    try {
      if (password.length < 6) throw new Error('Le mot de passe doit faire au moins 6 caractères.');
      if (password !== confirmPassword) throw new Error('Les mots de passe ne correspondent pas.');

      const { error: updError } = await supabase.auth.updateUser({ password });
      if (updError) throw updError;

      navigate('/login', { replace: true });
    } catch (err: any) {
      setError(String(err?.message || err || 'Impossible de mettre à jour le mot de passe.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
        <div className="mb-6">
          <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-eveneo-violet">
            <ArrowLeft size={18} /> Retour
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-eveneo-dark mb-2">Réinitialiser le mot de passe</h1>
        <p className="text-gray-500 mb-6">Choisis un nouveau mot de passe.</p>

        {isLoading && (
          <div className="text-gray-600">Chargement...</div>
        )}

        {!isLoading && (error || info) && (
          <div className={`mb-4 p-3 rounded-xl text-sm flex items-center gap-2 ${error ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'}`}>
            <AlertCircle size={18} />
            {error || info}
          </div>
        )}

        {!isLoading && !error && (
          <form onSubmit={handleSave} className="space-y-4">
            <Input
              label="Nouveau mot de passe"
              type="password"
              placeholder="Minimum 6 caractères"
              icon={Lock}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Input
              label="Confirmer le mot de passe"
              type="password"
              placeholder="Répétez le mot de passe"
              icon={Lock}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button variant="primary" fullWidth size="lg" type="submit" disabled={isSaving || !!supabaseConfigError}>
              {isSaving ? 'Sauvegarde...' : 'Mettre à jour'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
