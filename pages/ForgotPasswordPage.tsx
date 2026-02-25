import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase, supabaseConfigError } from '../services/supabaseClient';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [debug, setDebug] = useState('');

  useEffect(() => {
    if (supabaseConfigError) setError(supabaseConfigError);
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');
    setDebug('');

    try {
      if (supabaseConfigError) throw new Error(supabaseConfigError);

      const redirectTo = window.location.origin + '/#/reset-password';
      setDebug(`redirectTo=${redirectTo}`);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });

      if (resetError) throw resetError;

      setSuccess("Si un compte existe avec cet email, un lien de réinitialisation vient d'être envoyé.");
    } catch (err: any) {
      const status = err?.status ? ` (status ${err.status})` : '';
      const code = err?.code ? ` code=${err.code}` : '';
      const name = err?.name ? ` ${err.name}` : '';
      const msg = String(err?.message || err || "Impossible d'envoyer l'email.");
      setError(`${name}${status}${code} - ${msg}`.trim());
    } finally {
      setIsLoading(false);
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

        <h1 className="text-2xl font-bold text-eveneo-dark mb-2">Mot de passe oublié</h1>
        <p className="text-gray-500 mb-6">Entrez votre email pour recevoir un lien de réinitialisation.</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {debug && !success && (
          <div className="mb-4 p-3 bg-gray-50 text-gray-600 rounded-xl text-xs break-all">
            {debug}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="exemple@mail.com"
            icon={Mail}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button variant="primary" fullWidth size="lg" type="submit" disabled={isLoading || !!supabaseConfigError}>
            {isLoading ? 'Envoi...' : 'Envoyer le lien'}
          </Button>
        </form>
      </div>
    </div>
  );
};
