import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { Button } from '../components/Button';

export const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      setError('');
      setLoading(true);
      try {
        if (!sessionId) throw new Error('session_id manquant.');

        const { data, error: fnError } = await supabase.functions.invoke('handle-stripe-checkout-success', {
          body: { sessionId },
        });

        if (fnError) throw fnError;
        if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Paiement non confirmé.');
      } catch (e: any) {
        setError(String(e?.message || e));
      } finally {
        setLoading(false);
      }
    };

    void run();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <p className="font-extrabold text-eveneo-dark">Validation du paiement...</p>
          <p className="text-sm text-gray-500">Veuillez patienter.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 text-red-600 mb-2">
            <AlertTriangle size={18} />
            <p className="font-bold">Paiement non validé</p>
          </div>
          <p className="text-sm text-gray-600">{error}</p>
          <div className="mt-6">
            <Button variant="primary" fullWidth onClick={() => navigate('/dashboard/client')}>
              Aller au dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 text-green-600 mb-2">
          <CheckCircle size={18} />
          <p className="font-bold">Paiement confirmé</p>
        </div>
        <p className="text-sm text-gray-600">Merci, votre paiement a bien été pris en compte.</p>
        <div className="mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate('/dashboard/client')}>
            Aller au dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
