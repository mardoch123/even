
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Lock, CreditCard, CheckCircle, Info, Clock, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useCurrency } from '../contexts/CurrencyContext';
import { notificationService } from '../services/notificationService';
import { useAuth } from '../contexts/AuthContext';

export const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Hold Timer Logic (15 mins)
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    const timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Mock total base cost calculation based on demo logic
  const baseAmount = 4350;
  const serviceFeePercent = 0.05;
  const serviceFee = baseAmount * serviceFeePercent;
  const totalAmount = baseAmount + serviceFee;

  const handlePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (timeLeft === 0) {
        alert("Le temps de réservation a expiré. Veuillez recommencer.");
        return;
    }
    setIsLoading(true);
    // Simulate payment processing
    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      
      // Update event status
      const storageKey = `event_status_${id}`;
      localStorage.setItem(storageKey, 'confirmed'); 

      // Trigger Notifications via Service
      notificationService.send({
          userId: currentUser?.id || 'guest',
          template: 'booking_confirmed',
          data: { eventName: 'Mariage de Sophie & Thomas', eventId: id },
          channels: ['email', 'sms']
      });
      
      notificationService.send({
          userId: currentUser?.id || 'guest',
          template: 'payment_received',
          data: { amount: formatPrice(totalAmount), invoiceId: `INV-${Date.now()}` },
          channels: ['email']
      });

      console.log(`[Audit] Payment Successful for event ${id}. Hold converted to Booking.`);

      // Redirect after showing success
      setTimeout(() => {
        navigate('/dashboard/client');
      }, 2500);
    }, 2000);
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 animate-in zoom-in duration-300">
          <CheckCircle size={40} />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Paiement Réussi !</h1>
        <p className="text-gray-500 mb-8 text-center max-w-md">
          Votre événement est confirmé. Les prestataires ont été notifiés et vos fonds sont sécurisés.
        </p>
        <Button variant="primary" onClick={() => navigate('/dashboard/client')}>
          Retour au tableau de bord
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left Column: Summary */}
      <div className="w-full md:w-1/2 bg-gray-50 p-8 md:p-12 flex flex-col justify-center border-r border-gray-200">
        <div className="max-w-md mx-auto w-full">
             <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-6 text-sm font-medium">
                <ArrowLeft size={16} className="mr-2" /> Annuler
            </button>

            {/* Hold Timer Banner */}
            <div className={`mb-6 rounded-xl p-4 flex items-center gap-3 border ${timeLeft < 300 ? 'bg-red-50 border-red-100 text-red-700' : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
                <Clock size={20} className="shrink-0" />
                <div>
                    <p className="font-bold text-sm">Créneau réservé temporairement</p>
                    <p className="text-xs opacity-90">Complétez le paiement avant <span className="font-mono font-bold text-lg ml-1">{formatTime(timeLeft)}</span></p>
                </div>
            </div>

            <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs font-bold uppercase tracking-wider">
                <span>Événement</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Mariage de Sophie & Thomas</h1>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
                <div className="flex justify-between text-gray-600">
                    <span>Sous-total (Prestations)</span>
                    <span>{formatPrice(baseAmount)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                    <span className="flex items-center gap-1">
                      Frais de service (5%) 
                      <span title="Couvre le support 24/7 et la protection des fonds" className="cursor-help flex items-center">
                        <Info size={12} className="text-gray-400" />
                      </span>
                    </span>
                    <span>{formatPrice(serviceFee)}</span>
                </div>
                <div className="border-t border-gray-100 pt-4 flex justify-between items-center">
                    <span className="font-bold text-gray-900 text-lg">Total à payer</span>
                    <span className="font-bold text-2xl text-eveneo-dark">{formatPrice(totalAmount)}</span>
                </div>
            </div>
            
             <div className="mt-6 flex gap-3 text-xs text-gray-400">
                 <div className="flex items-center gap-1"><ShieldCheck size={14} /> Paiement sécurisé</div>
                 <div className="flex items-center gap-1"><Lock size={14} /> Chiffrement SSL</div>
             </div>
        </div>
      </div>

      {/* Right Column: Payment Form (Stripe Style) */}
      <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
             <h2 className="text-xl font-bold mb-6 text-gray-900">Détails du paiement</h2>
             
             <form onSubmit={handlePayment} className="space-y-6">
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex gap-3 mb-6">
                    <div className="bg-indigo-100 p-2 rounded-full h-fit text-indigo-600">
                        <CreditCard size={20} />
                    </div>
                    <div className="text-sm text-indigo-900">
                        <span className="font-bold">Fonds sécurisés (Escrow)</span>
                        <p className="mt-1 text-xs opacity-80">L'argent n'est versé au prestataire qu'une fois la mission validée par vos soins.</p>
                    </div>
                </div>

                <Input label="Email" type="email" value="jean@exemple.com" readOnly className="bg-gray-50 text-gray-500" />

                <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Carte Bancaire</label>
                    <div className="border border-gray-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-eveneo-violet focus-within:border-eveneo-violet transition-all">
                       <div className="flex items-center px-3 border-b border-gray-200 bg-white">
                          <CreditCard size={20} className="text-gray-400 mr-2" />
                          <input className="w-full py-3.5 outline-none text-sm" placeholder="Numéro de carte" required />
                       </div>
                       <div className="flex bg-white">
                          <input className="w-1/2 py-3.5 px-3 border-r border-gray-200 outline-none text-sm" placeholder="MM / AA" required />
                          <input className="w-1/2 py-3.5 px-3 outline-none text-sm" placeholder="CVC" required />
                       </div>
                    </div>
                </div>

                <Input label="Nom sur la carte" placeholder="Jean Dupont" required />

                <Button 
                    variant="primary" 
                    fullWidth 
                    size="lg" 
                    type="submit" 
                    disabled={isLoading || timeLeft === 0}
                    className="bg-gray-900 hover:bg-black text-white mt-4 shadow-lg"
                >
                    {isLoading ? 'Traitement...' : `Payer ${formatPrice(totalAmount)}`}
                </Button>
                
                <div className="text-center mt-4">
                    <span className="text-xs text-gray-400">
                        En payant, vous acceptez nos <a href="#" className="underline hover:text-gray-600">Conditions Générales de Vente</a>.
                    </span>
                </div>
             </form>
        </div>
      </div>
    </div>
  );
};
