
import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowUpRight, Wallet, Clock, AlertCircle, Lock, Banknote, FileText, Download, Landmark, Save, CheckCircle, ArrowLeft, X, RefreshCcw, ShieldAlert } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useAuth } from '../contexts/AuthContext';
import { UserRole, Transaction, Invoice } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { useCurrency } from '../contexts/CurrencyContext';
import { notificationService } from '../services/notificationService';
import { invoiceService } from '../services/invoiceService';
import { useToast } from '../contexts/ToastContext';

const MOCK_TRANSACTIONS: Transaction[] = [
    { id: 'tx-1', type: 'payment', amount: 4350, currency: 'EUR', date: '2024-06-24', status: 'completed', description: 'Paiement Mariage Sophie' },
    { id: 'tx-2', type: 'deposit', amount: 500, currency: 'EUR', date: '2024-06-20', status: 'completed', description: 'Rechargement CB' },
    { id: 'tx-3', type: 'subscription_fee', amount: 29, currency: 'EUR', date: '2024-06-01', status: 'completed', description: 'Abonnement Pro Mensuel' },
];

const MOCK_INVOICES: Invoice[] = [
    { id: 'INV-2024-001', date: '2024-06-24', amount: 4350, status: 'paid', downloadUrl: '#' },
    { id: 'INV-2024-002', date: '2024-06-01', amount: 29, status: 'paid', downloadUrl: '#' },
];

export const WalletPage: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');
  
  // State for withdrawals
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  
  // State for adding funds (Clients)
  const [amount, setAmount] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);

  // Bank Details State
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [bankOwner, setBankOwner] = useState(currentUser?.name || '');
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [savedBank, setSavedBank] = useState<boolean>(false);

  // Transaction History State
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);

  // Separate balances for client vs provider
  const [currentBalance, setCurrentBalance] = useState<number>(0);
  
  // Check for available refunds (from replacement logic)
  const [availableRefund, setAvailableRefund] = useState<{amount: number, source: string, date: string} | null>(null);

  // Check if there is a pending withdrawal
  const hasPendingWithdrawal = transactions.some(t => t.type === 'payout' && t.status === 'pending');

  useEffect(() => {
      // Load Balance depending on role
      if (currentUser?.role === UserRole.PROVIDER) {
          const pBal = parseFloat(localStorage.getItem('provider_wallet_balance') || '2450');
          setCurrentBalance(pBal);
      } else {
          const cBal = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
          setCurrentBalance(cBal);
      }

      // Check for special refunds in storage
      const keys = Object.keys(localStorage);
      const refundKey = keys.find(k => k.startsWith('refund_available_'));
      if (refundKey) {
          const data = JSON.parse(localStorage.getItem(refundKey) || '{}');
          setAvailableRefund(data);
      }

      // Load bank details if any
      const storedIban = localStorage.getItem('provider_iban');
      const storedBic = localStorage.getItem('provider_bic');
      const storedOwner = localStorage.getItem('provider_bank_owner');
      if (storedIban) {
          setIban(storedIban);
          setBic(storedBic || '');
          setBankOwner(storedOwner || currentUser?.name || '');
          setSavedBank(true);
      } else {
          // If provider, default to editing mode if no bank details
          if (currentUser?.role === UserRole.PROVIDER) {
              setIsEditingBank(true);
          }
      }
  }, [currentUser]);

  const providerPending = 850; 

  const handleTopUp = (e: React.FormEvent) => {
      e.preventDefault();
      if (!amount) return;
      setIsLoading(true);
      navigate(`/payment/stripe?amount=${amount}&type=wallet_topup`);
  };

  const handleRefundToCard = () => {
      if (!availableRefund) return;
      
      if(!confirm(`Confirmer le remboursement de ${formatPrice(availableRefund.amount)} sur votre carte bancaire ?`)) return;

      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          
          // 1. Débiter le wallet IMMEDIATEMENT
          const amountToRefund = availableRefund.amount;
          const newBalance = currentBalance - amountToRefund;
          setCurrentBalance(newBalance);
          localStorage.setItem('client_wallet_balance', newBalance.toString());
          
          // 2. Créer une demande Admin
          const refundRequest = {
              id: `ref_req_${Date.now()}`,
              userId: currentUser?.id || 'guest',
              userName: currentUser?.name || 'Client',
              amount: amountToRefund,
              date: new Date().toLocaleString(),
              status: 'pending',
              refundKey: Object.keys(localStorage).find(k => k.startsWith('refund_available_'))
          };
          
          const existingRequests = JSON.parse(localStorage.getItem('admin_refund_requests') || '[]');
          localStorage.setItem('admin_refund_requests', JSON.stringify([refundRequest, ...existingRequests]));

          setAvailableRefund(null);
          
          const keyToRemove = refundRequest.refundKey;
          if (keyToRemove) localStorage.removeItem(keyToRemove);

          addToast('success', `Remboursement de ${formatPrice(amountToRefund)} initié vers votre carte.`);
      }, 1500);
  };

  const handleSaveBankDetails = (e: React.FormEvent) => {
      e.preventDefault();
      if (!iban || !bic || !bankOwner) return;
      setIsLoading(true);
      
      setTimeout(() => {
          localStorage.setItem('provider_iban', iban);
          localStorage.setItem('provider_bic', bic);
          localStorage.setItem('provider_bank_owner', bankOwner);
          setSavedBank(true);
          setIsEditingBank(false);
          setIsLoading(false);
          addToast('success', 'Coordonnées bancaires enregistrées.');
      }, 1000);
  };

  const openWithdrawModal = () => {
      if (currentBalance <= 0) {
          addToast('error', "Solde insuffisant pour un retrait.");
          return;
      }

      if (!savedBank || !iban) {
          addToast('warning', "Veuillez d'abord enregistrer vos coordonnées bancaires.");
          setIsEditingBank(true);
          return;
      }
      
      // Block if pending withdrawal exists
      if (hasPendingWithdrawal) {
          addToast('error', "Un retrait est déjà en cours de traitement.");
          return;
      }

      setWithdrawAmount(currentBalance.toString());
      setShowWithdrawModal(true);
  };

  const executeWithdraw = (e: React.FormEvent) => {
      e.preventDefault();
      const val = parseFloat(withdrawAmount);

      if (isNaN(val) || val <= 0) {
          addToast('error', "Montant invalide.");
          return;
      }

      if (val > currentBalance) {
          addToast('error', "Montant supérieur au solde disponible.");
          return;
      }

      setIsLoading(true);
      setTimeout(() => {
          setIsLoading(false);
          
          const newBalance = currentBalance - val;
          setCurrentBalance(newBalance);
          
          if (currentUser?.role === UserRole.PROVIDER) {
             localStorage.setItem('provider_wallet_balance', newBalance.toString());
          } else {
             localStorage.setItem('client_wallet_balance', newBalance.toString());
          }

          const newTx: Transaction = {
              id: `wd-${Date.now()}`,
              type: 'payout',
              amount: val,
              currency: 'EUR',
              date: new Date().toISOString().split('T')[0],
              status: 'pending',
              description: `Virement vers ${iban ? iban.slice(-4) : 'Compte'}`
          };
          setTransactions([newTx, ...transactions]);

          const withdrawalRequest = {
              id: newTx.id,
              providerId: currentUser?.id || 'unknown',
              providerName: currentUser?.name || 'Prestataire',
              amount: val,
              iban: iban,
              status: 'pending', 
              date: newTx.date
          };
          
          const existingRequests = JSON.parse(localStorage.getItem('admin_withdrawals') || '[]');
          localStorage.setItem('admin_withdrawals', JSON.stringify([withdrawalRequest, ...existingRequests]));

          notificationService.send({
             userId: currentUser?.id || 'u1',
             template: 'payout_sent',
             data: { amount: formatPrice(val) },
             channels: ['email', 'push']
          });
          
          setShowWithdrawModal(false);
          addToast('success', `Demande de retrait de ${formatPrice(val)} envoyée !`);
      }, 1500);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
      invoiceService.generateInvoiceBlob(invoice, currentUser);
      addToast('success', "Facture générée et prête à l'impression.");
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
            <Link to={currentUser?.role === UserRole.PROVIDER ? "/dashboard/provider" : "/dashboard/client"}>
                <Button variant="ghost" size="sm" className="pl-0 mb-6 text-gray-500 hover:text-eveneo-dark">
                    <ArrowLeft size={18} className="mr-1" /> Retour au tableau de bord
                </Button>
            </Link>
            
            <h1 className="text-3xl font-bold text-eveneo-dark mb-2">Mon Portefeuille</h1>
            <p className="text-gray-500 mb-8">Gérez vos fonds, factures et coordonnées bancaires.</p>

            {/* Navigation Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'overview' ? 'bg-eveneo-dark text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    Vue d'ensemble
                </button>
                <button 
                    onClick={() => setActiveTab('transactions')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'transactions' ? 'bg-eveneo-dark text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    Historique
                </button>
                <button 
                    onClick={() => setActiveTab('invoices')}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors ${activeTab === 'invoices' ? 'bg-eveneo-dark text-white' : 'bg-white text-gray-600 hover:bg-gray-100'}`}
                >
                    Factures
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="md:col-span-2 space-y-6">
                    
                    {activeTab === 'overview' && (
                        <div className="bg-eveneo-dark text-white rounded-3xl p-8 shadow-xl relative overflow-hidden animate-in fade-in">
                             <div className="absolute top-0 right-0 w-64 h-64 bg-eveneo-gradient opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                             
                             <div className="relative z-10">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
                                            <Wallet size={24} />
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-sm font-medium">Solde Disponible</p>
                                            <h2 className="text-4xl font-bold">
                                                {formatPrice(currentBalance)}
                                            </h2>
                                        </div>
                                    </div>
                                </div>

                                {currentUser?.role === UserRole.PROVIDER && (
                                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4 mb-6">
                                        <div className="bg-amber-500/20 p-2 rounded-full text-amber-400">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-bold">En attente de validation</p>
                                            <p className="font-bold text-xl">{formatPrice(providerPending)}</p>
                                            <p className="text-xs text-gray-500">Fonds bloqués jusqu'à la fin des missions (Délai 48h).</p>
                                        </div>
                                    </div>
                                )}

                                <div className="flex flex-wrap gap-4">
                                    {currentUser?.role === UserRole.PROVIDER ? (
                                        <Button 
                                            variant="secondary" 
                                            className="bg-white text-eveneo-dark border-white hover:bg-gray-200 font-bold"
                                            onClick={openWithdrawModal}
                                            disabled={isLoading || hasPendingWithdrawal}
                                        >
                                            <ArrowUpRight size={18} className="mr-2" /> {hasPendingWithdrawal ? 'Retrait en cours...' : 'Retirer mes gains'}
                                        </Button>
                                    ) : (
                                        availableRefund ? (
                                            <Button 
                                                variant="secondary" 
                                                className="bg-white text-eveneo-dark border-white hover:bg-gray-200 font-bold"
                                                onClick={handleRefundToCard}
                                                disabled={isLoading}
                                            >
                                                <RefreshCcw size={18} className="mr-2" /> Rembourser sur ma Carte
                                            </Button>
                                        ) : (
                                            <Button disabled className="bg-white/20 text-white border-transparent cursor-not-allowed opacity-50">
                                                <ArrowUpRight size={18} className="mr-2" /> Retrait Indisponible
                                            </Button>
                                        )
                                    )}
                                </div>
                             </div>
                        </div>
                    )}

                    {activeTab === 'transactions' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
                            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800">Livre de comptes</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Description</th>
                                            <th className="px-6 py-3">Type</th>
                                            <th className="px-6 py-3 text-right">Montant</th>
                                            <th className="px-6 py-3">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="px-6 py-4 text-gray-500">{tx.date}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">{tx.description}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        tx.type === 'payment' ? 'bg-red-50 text-red-600' : 
                                                        tx.type === 'deposit' ? 'bg-green-50 text-green-600' : 
                                                        tx.type === 'payout' ? 'bg-orange-50 text-orange-600' :
                                                        'bg-blue-50 text-blue-600'
                                                    }`}>
                                                        {tx.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 text-right font-bold ${
                                                    ['payment', 'subscription_fee', 'payout'].includes(tx.type) ? 'text-red-500' : 'text-green-500'
                                                }`}>
                                                    {['payment', 'subscription_fee', 'payout'].includes(tx.type) ? '-' : '+'} {formatPrice(tx.amount)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {tx.status === 'pending' ? (
                                                         <span className="flex items-center gap-1 text-orange-500 text-xs font-bold">
                                                            <Clock size={12} /> En attente
                                                         </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div> Completed
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'invoices' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-in fade-in">
                            <h3 className="font-bold text-gray-900 mb-4">Factures Disponibles</h3>
                            <div className="space-y-3">
                                {MOCK_INVOICES.map(inv => (
                                    <div key={inv.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:border-eveneo-violet/30 hover:bg-gray-50 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-gray-100 p-3 rounded-lg text-gray-500">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">Facture {inv.id}</p>
                                                <p className="text-xs text-gray-400">{inv.date}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="font-bold text-gray-900">{formatPrice(inv.amount)}</span>
                                            <button 
                                                onClick={() => handleDownloadInvoice(inv)}
                                                className="text-eveneo-violet hover:text-eveneo-blue p-2 hover:bg-violet-50 rounded-full transition-colors"
                                                title="Imprimer la facture"
                                            >
                                                <Download size={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions Sidebar */}
                <div className="md:col-span-1">
                    {currentUser?.role === UserRole.CLIENT ? (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <CreditCard size={20} /> Ajouter des fonds
                            </h3>
                            <form onSubmit={handleTopUp}>
                                <Input 
                                    label="Montant" 
                                    placeholder="Ex: 100" 
                                    type="number" 
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    icon={Banknote}
                                />
                                <Button variant="primary" fullWidth type="submit" disabled={!amount || isLoading}>
                                    {isLoading ? 'Redirection...' : 'Payer avec Stripe'}
                                </Button>
                            </form>
                            <div className="mt-6 p-4 bg-blue-50 rounded-xl text-sm text-blue-800">
                                <p className="flex items-start gap-2">
                                    <Lock size={16} className="shrink-0 mt-0.5" />
                                    <span>Vos fonds sont stockés sur un compte de cantonnement sécurisé.</span>
                                </p>
                            </div>
                        </div>
                    ) : (
                         <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-24">
                            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                                <Landmark size={20} /> Coordonnées Bancaires
                            </h3>
                            <p className="text-sm text-gray-500 mb-4">Pour recevoir vos virements, enregistrez votre IBAN.</p>
                            
                            {/* SECURITY CHECK: Lock bank details if withdrawal is pending */}
                            {hasPendingWithdrawal && (
                                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-start gap-3 animate-pulse-subtle">
                                    <ShieldAlert size={24} className="text-red-600 shrink-0" />
                                    <div>
                                        <p className="font-bold text-red-800 text-sm">Modification Bloquée</p>
                                        <p className="text-xs text-red-700 mt-1">
                                            Un virement est en cours de traitement. Vous ne pouvez pas modifier vos coordonnées bancaires pour le moment par sécurité.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {!isEditingBank && savedBank ? (
                                <div className={`mb-4 animate-in fade-in ${hasPendingWithdrawal ? 'opacity-70 pointer-events-none grayscale' : ''}`}>
                                    <div className="p-4 border border-green-200 bg-green-50 rounded-xl mb-4 relative">
                                        <div className="absolute top-2 right-2 text-green-600">
                                            <CheckCircle size={16} />
                                        </div>
                                        <p className="text-xs text-green-700 uppercase font-bold mb-1">IBAN Enregistré</p>
                                        <p className="font-mono text-gray-800 font-bold break-all">{iban}</p>
                                        <p className="text-xs text-gray-500 uppercase font-bold mt-2 mb-1">BIC</p>
                                        <p className="text-gray-800 text-sm">{bic}</p>
                                        <p className="text-xs text-gray-500 uppercase font-bold mt-2 mb-1">Titulaire</p>
                                        <p className="text-gray-800 text-sm">{bankOwner}</p>
                                    </div>
                                    {!hasPendingWithdrawal && (
                                        <Button variant="outline" fullWidth onClick={() => setIsEditingBank(true)}>Modifier mes coordonnées</Button>
                                    )}
                                </div>
                            ) : (
                                !hasPendingWithdrawal && (
                                    <form onSubmit={handleSaveBankDetails} className="space-y-4 animate-in fade-in">
                                        <Input 
                                            label="Titulaire du compte" 
                                            placeholder="Nom Prénom"
                                            value={bankOwner}
                                            onChange={(e) => setBankOwner(e.target.value)}
                                            required
                                        />
                                        <Input 
                                            label="IBAN" 
                                            placeholder="FR76..."
                                            value={iban}
                                            onChange={(e) => setIban(e.target.value)}
                                            required
                                        />
                                        <Input 
                                            label="BIC / SWIFT" 
                                            placeholder="ABCD..."
                                            value={bic}
                                            onChange={(e) => setBic(e.target.value)}
                                            required
                                        />
                                        <div className="flex gap-2">
                                            <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                                                <Save size={16} className="mr-2" /> {isLoading ? '...' : 'Enregistrer'}
                                            </Button>
                                            {savedBank && (
                                                <Button type="button" variant="ghost" onClick={() => setIsEditingBank(false)}>Annuler</Button>
                                            )}
                                        </div>
                                    </form>
                                )
                            )}
                            
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                <h4 className="font-bold mb-2 flex items-center gap-2 text-sm text-orange-600">
                                    <AlertCircle size={16} /> Important
                                </h4>
                                <p className="text-xs text-gray-500 mb-2">
                                    Pour recevoir vos gains, l'IBAN doit correspondre à l'identité vérifiée lors du KYC. Les virements sont irréversibles.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Withdrawal Modal */}
        {showWithdrawModal && (
            <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in">
                <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                    <button 
                        onClick={() => setShowWithdrawModal(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                    >
                        <X size={24} />
                    </button>
                    
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Retirer mes gains</h2>
                    <p className="text-gray-500 mb-6">Virement vers {iban ? `...${iban.slice(-4)}` : 'votre compte'}</p>
                    
                    <form onSubmit={executeWithdraw}>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Montant à retirer</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    value={withdrawAmount}
                                    onChange={(e) => setWithdrawAmount(e.target.value)}
                                    max={currentBalance}
                                    min={1}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
                                    placeholder="0.00"
                                    autoFocus
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">EUR</span>
                            </div>
                            <div className="flex justify-between mt-2 text-xs">
                                <span className="text-gray-500">Solde disponible : {formatPrice(currentBalance)}</span>
                                <button 
                                    type="button"
                                    onClick={() => setWithdrawAmount(currentBalance.toString())}
                                    className="text-eveneo-violet font-bold hover:underline"
                                >
                                    Tout retirer
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" variant="ghost" fullWidth onClick={() => setShowWithdrawModal(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" variant="primary" fullWidth disabled={isLoading || !withdrawAmount}>
                                {isLoading ? 'Traitement...' : 'Confirmer le virement'}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        )}
    </div>
  );
};
