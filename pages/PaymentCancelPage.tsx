import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';

export const PaymentCancelPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 text-amber-600 mb-2">
          <AlertTriangle size={18} />
          <p className="font-bold">Paiement annulé</p>
        </div>
        <p className="text-sm text-gray-600">Le paiement a été annulé. Vous pouvez réessayer quand vous voulez.</p>
        <div className="mt-6">
          <Button variant="primary" fullWidth onClick={() => navigate(-1)}>
            Réessayer
          </Button>
        </div>
      </div>
    </div>
  );
};
