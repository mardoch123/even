
import React, { useState, useEffect } from 'react';
import { Check, Star, Shield, Zap, CheckCircle, Wallet, CreditCard, X } from 'lucide-react';
import { Button } from '../components/Button';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { planService } from '../services/planService';
import { PricingPlan } from '../types';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';

export const SubscriptionPage: React.FC = () => {
    const { formatPrice } = useCurrency();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const { addToast } = useToast();
    
    const [billing, setBilling] = useState<'month' | 'year'>('month');
    const [plans, setPlans] = useState<PricingPlan[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState('');
    
    // Payment Choice
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
    const [priceToPay, setPriceToPay] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    useEffect(() => {
        setPlans(planService.getPlans());
        const handlePlansUpdate = () => setPlans(planService.getPlans());
        window.addEventListener('plans-updated', handlePlansUpdate);
        
        // Load Balance
        const balance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
        setWalletBalance(balance);

        return () => window.removeEventListener('plans-updated', handlePlansUpdate);
    }, []);

    const handleSubscribe = (plan: PricingPlan) => {
        setProcessingId(plan.id);
        
        // Calculate actual price
        const actualCharge = billing === 'year' ? (plan.price * 12 * 0.8) : plan.price;

        if (actualCharge > 0) {
            setPriceToPay(actualCharge);
            setSelectedPlan(plan);
            
            // Check wallet balance
            if (walletBalance >= actualCharge) {
                setShowPaymentModal(true);
            } else {
                // Go directly to Stripe
                goToStripe(actualCharge, plan.id);
            }
        } else {
            // Free Plan Activation logic (unchanged)
            activateFreePlan(plan);
        }
    };

    const activateFreePlan = (plan: PricingPlan) => {
        setTimeout(() => {
            setProcessingId(null);
            updateUserPlan(plan.id);
            setSuccessMsg(`Votre abonnement au plan ${plan.name} est actif.`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setTimeout(() => {
                navigate('/dashboard/provider');
            }, 2000);
        }, 1500);
    };

    const goToStripe = (amount: number, planId: string) => {
        setTimeout(() => {
            navigate(`/payment/stripe?amount=${amount}&type=subscription&planId=${planId}&billing=${billing}`);
        }, 500);
    };

    const payWithWallet = () => {
        if (!selectedPlan) return;
        setProcessingId(selectedPlan.id); // Keep loader
        setShowPaymentModal(false);

        setTimeout(() => {
            // 1. Deduct
            const newBalance = walletBalance - priceToPay;
            setWalletBalance(newBalance);
            localStorage.setItem('provider_wallet_balance', newBalance.toString());

            // 2. Activate
            updateUserPlan(selectedPlan.id);
            
            // 3. Success UI
            setProcessingId(null);
            setSuccessMsg(`Votre abonnement ${selectedPlan.name} a été payé avec votre solde.`);
            addToast('success', 'Paiement validé via le portefeuille.');
            
            setTimeout(() => {
                navigate('/dashboard/provider');
            }, 2000);
        }, 1500);
    };

    const updateUserPlan = (planId: string) => {
        const userStr = localStorage.getItem('eveneo_user');
        if (userStr) {
            const user = JSON.parse(userStr);
            user.subscriptionPlan = planId;
            localStorage.setItem('eveneo_user', JSON.stringify(user));
        }
    };

    if (successMsg) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-md animate-in zoom-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Abonnement Confirmé !</h2>
                    <p className="text-gray-500 mb-6">{successMsg}</p>
                    <Button variant="primary" onClick={() => navigate('/dashboard/provider')}>
                        Retour au tableau de bord
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
            <div className="max-w-6xl mx-auto text-center">
                <h1 className="text-4xl font-bold text-eveneo-dark mb-4">Choisissez votre plan</h1>
                <p className="text-gray-500 text-lg mb-8">Des outils puissants pour booster votre activité événementielle.</p>

                <div className="inline-flex bg-white p-1 rounded-xl border border-gray-200 mb-12 shadow-sm">
                    <button 
                        onClick={() => setBilling('month')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${billing === 'month' ? 'bg-eveneo-dark text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Mensuel
                    </button>
                    <button 
                        onClick={() => setBilling('year')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${billing === 'year' ? 'bg-eveneo-dark text-white shadow-md' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Annuel <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full uppercase">-20%</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div key={plan.id} className={`relative bg-white rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 flex flex-col ${plan.recommended ? 'border-eveneo-violet shadow-2xl shadow-eveneo-violet/20 z-10 scale-105' : 'border-gray-100 shadow-lg'}`}>
                            {plan.recommended && (
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-eveneo-gradient text-white text-xs font-bold px-4 py-1 rounded-full shadow-glow">
                                    RECOMMANDÉ
                                </div>
                            )}
                            
                            <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                            <div className="text-4xl font-bold text-eveneo-dark mb-1">
                                {plan.price === 0 ? 'Gratuit' : formatPrice(billing === 'year' ? plan.price * 0.8 : plan.price)}
                                <span className="text-sm text-gray-400 font-normal"> / mois</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-8">{billing === 'year' && plan.price > 0 ? 'Facturé annuellement' : 'Sans engagement'}</p>

                            <ul className="space-y-4 mb-8 text-left flex-grow">
                                {plan.features.map((feat, i) => (
                                    <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                        <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 mt-0.5">
                                            <Check size={12} />
                                        </div>
                                        <span>{feat}</span>
                                    </li>
                                ))}
                            </ul>

                            {plan.id === 'agency' ? (
                                <Button 
                                    variant="outline" 
                                    fullWidth 
                                    onClick={() => navigate('/contact-sales')}
                                    className="border-gray-200 text-eveneo-dark"
                                >
                                    Contacter l'équipe vente
                                </Button>
                            ) : (
                                <Button 
                                    variant={plan.recommended ? 'primary' : 'outline'} 
                                    fullWidth 
                                    onClick={() => handleSubscribe(plan)}
                                    disabled={!!processingId}
                                    className={!plan.recommended ? "border-gray-200" : ""}
                                >
                                    {processingId === plan.id ? 'Traitement...' : (plan.price === 0 ? 'Sélectionner' : `S'abonner (${billing === 'year' ? 'Annuel' : 'Mensuel'})`)}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedPlan && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Abonnement {selectedPlan.name}</h3>
                            <button 
                                onClick={() => { setShowPaymentModal(false); setProcessingId(null); }} 
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X size={24}/>
                            </button>
                        </div>
                        
                        <div className="mb-6 text-center">
                            <p className="text-gray-500 mb-2">Total à payer ({billing === 'year' ? 'Annuel' : 'Mensuel'})</p>
                            <p className="text-3xl font-bold text-eveneo-dark">{formatPrice(priceToPay)}</p>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={payWithWallet}
                                className="w-full p-4 rounded-xl border-2 border-eveneo-violet bg-violet-50 hover:bg-violet-100 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-eveneo-violet text-white rounded-full flex items-center justify-center">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-eveneo-dark group-hover:text-eveneo-violet">Mon Portefeuille</p>
                                        <p className="text-xs text-gray-500">Solde dispo: {formatPrice(walletBalance)}</p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-eveneo-violet">Payer</div>
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OU</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <button 
                                onClick={() => goToStripe(priceToPay, selectedPlan.id)}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
                                        <CreditCard size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Carte Bancaire</p>
                                        <p className="text-xs text-gray-500">Via Stripe</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
