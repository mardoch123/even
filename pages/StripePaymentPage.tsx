
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Lock, ArrowLeft, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import { eventService } from '../services/eventService';
import { providerService } from '../services/providerService';
import { AddOn, ServiceProvider } from '../types';

// Helper to get Stripe Key securely (placeholder logic for insertion)
const getStripeKey = () => {
    // -----------------------------------------------------------
    // INSERT YOUR STRIPE PUBLISHABLE KEY HERE
    // Example: 'pk_test_51...'
    // -----------------------------------------------------------
    const envKey = (import.meta as any).env?.VITE_STRIPE_PK as string | undefined;
    const localKey = 'pk_test_51Sk3MkK4GI5A1w6lKdRVW1CqwatdVNtX5dujDSh76SClKHmGR1KDRLaO1AZQ8zEFrpJPfyDeqI8SC0tVqfgPdZZI00xCIg7C5B';
    return envKey || localKey;
};

export const StripePaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  
  const amountStr = searchParams.get('amount') || '0';
  const type = searchParams.get('type'); 
  const dateToHold = searchParams.get('date');
  const durationStr = searchParams.get('duration');
  const providerId = searchParams.get('providerId');
  const providerName = searchParams.get('providerName');
  const serviceStartAt = searchParams.get('serviceStartAt');
  const serviceEndAt = searchParams.get('serviceEndAt');
  const addOnsStr = searchParams.get('addOns');
  const amount = parseFloat(amountStr);
  
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'payment' | 'processing' | 'success'>('payment');
  const [stripeError, setStripeError] = useState('');

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const selectedAddOnIds = (addOnsStr || '').split(',').map(s => s.trim()).filter(Boolean);
  const selectedAddOns: AddOn[] = (provider?.addOns || []).filter(a => selectedAddOnIds.includes(a.id));
  
  // Stripe Objects
  const [stripeCheckoutUrl, setStripeCheckoutUrl] = useState<string | null>(null);

  useEffect(() => {
    const fetchProvider = async () => {
      if (type !== 'service_booking' || !providerId) {
        setProvider(null);
        return;
      }
      try {
        const p = await providerService.getProviderById(providerId);
        setProvider(p);
      } catch (e) {
        setProvider(null);
      }
    };
    void fetchProvider();
  }, [type, providerId]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStripeError('');

    setStep('processing');

    try {
      const label = type === 'service_booking'
        ? (providerName ? `Réservation - ${providerName}` : 'Réservation')
        : type === 'wallet_topup'
          ? 'Rechargement portefeuille'
          : type === 'subscription'
            ? 'Abonnement'
            : 'Paiement Événéo';

      const { data, error } = await supabase.functions.invoke('create-stripe-checkout-session', {
        body: {
          amount,
          currency: 'eur',
          type,
          label,
          providerId,
          providerName,
          date: dateToHold,
          duration: durationStr,
          serviceStartAt,
          serviceEndAt,
          addOns: addOnsStr,
        },
      });

      if (error) throw error;

      const url = (data as any)?.url as string | undefined;
      if (!url) throw new Error('URL Stripe manquante.');

      setStripeCheckoutUrl(url);
      window.location.href = url;
    } catch (err: any) {
      console.error('Stripe Checkout Error:', err);
      setStripeError(String(err?.message || err || 'Le paiement a échoué.'));
      setStep('payment');
      setIsLoading(false);
    }
  };

  const completeSuccessFlow = async () => {
      setIsLoading(false);
      setStep('success');
      
      // Business Logic Updates
      if (type === 'hold_date') {
          // Create Block Record
          const duration = parseInt(durationStr || '1', 10);
          
          // Calculate End Date
          const startDate = new Date(dateToHold || '');
          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + duration);

          const newBlock = {
              id: `blk-${Date.now()}`,
              providerId: providerId,
              clientId: currentUser?.id || 'guest',
              clientName: currentUser?.name || 'Invité',
              startDate: dateToHold,
              endDate: endDate.toISOString().split('T')[0],
              duration: duration,
              status: 'active',
              amountPaid: amount
          };

          // Store in LocalStorage (mock backend)
          const existingBlocks = JSON.parse(localStorage.getItem('eveneo_blocked_dates') || '[]');
          localStorage.setItem('eveneo_blocked_dates', JSON.stringify([...existingBlocks, newBlock]));

          console.log(`Date ${dateToHold} blocked for provider ${providerId} for ${duration} days.`);
      } else if (type === 'wallet_topup') {
          const currentBalance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
          localStorage.setItem('provider_wallet_balance', (currentBalance + amount).toString());
      } else if (type === 'service_booking') {
          try {
              if (currentUser?.id && providerId && dateToHold && serviceStartAt && serviceEndAt) {
                  const createdEvent = await eventService.createEvent({
                      client_id: currentUser.id,
                      name: providerName ? `Réservation - ${providerName}` : 'Réservation',
                      date: dateToHold,
                      status: 'confirmed',
                      total_cost: amount
                  });

                  if (createdEvent) {
                      const addOns = (addOnsStr || '')
                          .split(',')
                          .map(s => s.trim())
                          .filter(Boolean);

                      await eventService.createEventItem({
                          event_id: createdEvent.id,
                          provider_id: providerId,
                          price: amount,
                          status: 'confirmed',
                          selected_add_ons: addOns,
                          paid_to_provider: false,
                          service_start_at: serviceStartAt,
                          service_end_at: serviceEndAt
                      });
                  }
              }
          } catch (e) {
              console.error('Error creating booking after payment:', e);
          }
      }
      
      // Redirect
      setTimeout(() => {
        if (type === 'hold_date') navigate('/dashboard/client');
        else if (type === 'service_booking') navigate('/dashboard/client');
        else if (type === 'subscription') navigate('/dashboard/provider');
        else if (type === 'ads') navigate('/promote');
        else navigate('/wallet');
      }, 2500);
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-500 mb-6 animate-in zoom-in">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Paiement réussi</h2>
        <p className="text-gray-500 mb-2">{formatPrice(amount)} payés.</p>
        <p className="text-sm text-gray-400 text-center">
            {type === 'hold_date' ? `La date du ${dateToHold} est maintenant bloquée pour ${durationStr || 1} jour(s).` : 'Opération effectuée avec succès.'}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Left Side */}
      <div className="w-full md:w-1/2 bg-white p-8 md:p-12 flex flex-col justify-center border-r border-gray-200">
        <div className="max-w-md mx-auto w-full">
           <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-gray-900 mb-8 text-sm font-medium">
             <ArrowLeft size={16} className="mr-2" /> Annuler
           </button>
           
           <div className="flex items-center gap-2 mb-2 text-gray-500 font-medium">
             <div className="w-6 h-6 bg-gray-200 rounded flex items-center justify-center font-bold text-xs text-gray-600">É</div>
             <span>Événéo Inc.</span>
           </div>
           
           <h1 className="text-4xl font-bold text-gray-900 mb-12">
               {type === 'hold_date' ? 'Option de Blocage' : 'Paiement Sécurisé'}
           </h1>
           
           {type === 'hold_date' && (
               <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                   <div className="flex items-start gap-3 mb-2">
                        <Clock className="text-blue-600 shrink-0" size={24} />
                        <div>
                            <p className="font-bold text-blue-900">Blocage de date</p>
                            <p className="text-sm text-blue-700">Vous réservez l'exclusivité de cette date.</p>
                        </div>
                   </div>
                   <div className="text-sm text-blue-800 mt-2 pl-9 space-y-1">
                        <p>• Date : <strong>{dateToHold}</strong></p>
                        <p>• Durée : <strong>{durationStr || 1} jour(s)</strong></p>
                   </div>
               </div>
           )}
           
           <div className="space-y-4">
             <div className="flex justify-between text-lg">
               <span className="text-gray-600">Montant</span>
               <span className="font-bold">{formatPrice(amount)}</span>
             </div>

             {type === 'service_booking' && provider && (
               <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                 <p className="text-xs font-bold text-gray-500 uppercase">Résumé</p>
                 <p className="font-bold text-gray-900 mt-1">{provider.name}</p>
                 {dateToHold && (
                   <p className="text-xs text-gray-600 mt-1">Date : {dateToHold}</p>
                 )}
                 {serviceStartAt && serviceEndAt && (
                   <p className="text-xs text-gray-600 mt-1">
                     Horaire : {new Date(serviceStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(serviceEndAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                   </p>
                 )}

                 {selectedAddOns.length > 0 && (
                   <div className="mt-3">
                     <p className="text-xs font-bold text-gray-500 uppercase mb-2">Options</p>
                     <div className="space-y-1">
                       {selectedAddOns.map(a => (
                         <div key={a.id} className="flex justify-between text-sm text-gray-700">
                           <span>{a.name}</span>
                           <span className="font-semibold">{formatPrice(a.price)}</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}
               </div>
             )}
             <div className="border-t border-gray-100 pt-4 flex justify-between text-xl font-bold">
               <span>Total à payer</span>
               <span>{formatPrice(amount)}</span>
             </div>
           </div>
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full shadow-2xl shadow-gray-200/50 bg-white rounded-2xl p-6 border border-gray-100">
           {step === 'processing' ? (
             <div className="flex flex-col items-center justify-center py-12">
               <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
               <p className="text-gray-600 font-medium">Traitement sécurisé...</p>
             </div>
           ) : (
             <form onSubmit={handlePay}>
               <h3 className="text-xl font-bold mb-6 text-gray-800">Payer par carte</h3>
               
               {stripeError && (
                   <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-sm text-red-600">
                       <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                       {stripeError}
                   </div>
               )}

               <div className="space-y-4">
                 <Input label="Email" type="email" value={currentUser?.email || "client@exemple.com"} readOnly className="bg-gray-50" />
                 
                 <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Carte Bancaire</label>
                    <div className="border border-gray-300 rounded-lg p-3 bg-white focus-within:ring-2 focus-within:ring-indigo-500">
                       <div className="flex flex-col gap-2 opacity-60">
                        <div className="flex items-center border-b pb-2">
                          <CreditCard size={20} className="text-gray-400 mr-2" />
                          <input className="w-full outline-none text-sm" placeholder="Paiement via Stripe" disabled />
                        </div>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">
                          Redirection vers Stripe Checkout
                        </p>
                      </div>
                    </div>
                 </div>

                 <Input label="Nom sur la carte" placeholder="Jean Dupont" required />
                 
                 <Button variant="primary" fullWidth size="lg" className="bg-[#635BFF] hover:bg-[#5851df] text-white border-transparent mt-4 shadow-md" disabled={isLoading}>
                   {isLoading ? 'Traitement...' : `Payer ${formatPrice(amount)}`}
                 </Button>
                 
                 <div className="text-center mt-4 flex items-center justify-center gap-1 text-xs text-gray-400">
                     <Lock size={10} /> Paiement chiffré et sécurisé
                 </div>
               </div>
             </form>
           )}
        </div>
      </div>
    </div>
  );
};
