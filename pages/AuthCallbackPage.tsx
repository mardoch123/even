import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseConfigError } from '../services/supabaseClient';
import { UserRole } from '../types';

const normalizeRole = (raw: string | null): UserRole => {
  if (!raw) return UserRole.CLIENT;
  const v = String(raw).toUpperCase();
  if (v === UserRole.ADMIN) return UserRole.ADMIN;
  if (v === UserRole.PROVIDER) return UserRole.PROVIDER;
  if (v === UserRole.CLIENT) return UserRole.CLIENT;
  return UserRole.CLIENT;
};

export const AuthCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        if (supabaseConfigError) throw new Error(supabaseConfigError);

        const { error: exchError } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (exchError) throw exchError;

        const role = normalizeRole(searchParams.get('role'));

        const { data: { user } } = await supabase.auth.getUser();
        if (!user?.id) throw new Error('Utilisateur introuvable.');

        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!existingProfile) {
          const fullName = (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || 'Utilisateur';
          const email = user.email || '';

          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: user.id,
              email,
              full_name: fullName,
              role,
              is_verified: true,
              kyc_status: 'none'
            });
          if (insertError) throw insertError;
        } else if (!existingProfile.role) {
          const { error: updError } = await supabase
            .from('profiles')
            .update({ role })
            .eq('id', user.id);
          if (updError) throw updError;
        }

        if (role === UserRole.ADMIN) navigate('/admin/dashboard', { replace: true });
        else if (role === UserRole.PROVIDER) navigate('/dashboard/provider', { replace: true });
        else navigate('/dashboard/client', { replace: true });
      } catch (err: any) {
        setError(String(err?.message || err || 'Erreur lors de la connexion.'));
      }
    };

    void run();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <p className="font-extrabold text-eveneo-dark">Connexion en cours...</p>
        <p className="text-sm text-gray-500">Veuillez patienter.</p>
        {error && (
          <p className="text-sm text-red-600 mt-4">{error}</p>
        )}
      </div>
    </div>
  );
};
