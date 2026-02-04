
import React, { useState, useEffect } from 'react';
import { Search, RotateCcw, AlertTriangle, CheckCircle, ArrowUpRight, XCircle, Filter, CreditCard, Landmark, Siren, Clock, RefreshCcw, Calendar, Lock, Power } from 'lucide-react';
import { Button } from '../../components/Button';
import { useCurrency } from '../../contexts/CurrencyContext';
import { notificationService } from '../../services/notificationService';

const MOCK_TRANSACTIONS = [
    { id: 'tx-1', event: 'Mariage Sophie & Thomas', amount: 4350, status: 'held', date: '2024-06-24', issues: false },
    { id: 'tx-2', event: 'Gala Tech Corp', amount: 12500, status: 'released', date: '2024-06-20', issues: false },
    { id: 'tx-3', event: 'Anniversaire Julien', amount: 850, status: 'disputed', date: '2024-06-18', issues: true },
    { id: 'tx-4', event: 'Soirée Privée Marc', amount: 2400, status: 'held', date: '2024-06-28', issues: false },
];

export const AdminEvents: React.FC = () => {
  const { formatPrice } = useCurrency();
  const [activeTab, setActiveTab] = useState<'transactions' | 'withdrawals' | 'urgencies' | 'refunds' | 'blocks'>('urgencies');
  
  // Initialize from LocalStorage or fall back to Mock
  const [transactions, setTransactions] = useState<any[]>(() => {
      const stored = localStorage.getItem('admin_transactions');
      return stored ? JSON.parse(stored) : MOCK_TRANSACTIONS;
  });

  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [refundRequests, setRefundRequests] = useState<any[]>([]);
  const [urgentReplacements, setUrgentReplacements] = useState<any[]>([]);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Feature Flag: Block Date
  const [isBlockFeatureEnabled, setIsBlockFeatureEnabled] = useState(true);

  // Load data function to be called on mount and interval
  const loadData = () => {
      const storedWithdrawals = localStorage.getItem('admin_withdrawals');
      if (storedWithdrawals) setWithdrawals(JSON.parse(storedWithdrawals));

      const storedRefunds = localStorage.getItem('admin_refund_requests');
      if (storedRefunds) setRefundRequests(JSON.parse(storedRefunds));

      // Read REAL replacement broadcasts
      const storedReplacements = localStorage.getItem('eveneo_replacements');
      if (storedReplacements) {
          const reps = JSON.parse(storedReplacements);
          // Filter only active ones for display priority
          const active = reps.filter((r: any) => r.status === 'seeking');
          setUrgentReplacements(reps);
      }

      // Load Blocked Dates
      const storedBlocks = localStorage.getItem('eveneo_blocked_dates');
      if (storedBlocks) setBlockedDates(JSON.parse(storedBlocks));
      
      // Load Feature Flag
      const storedFeature = localStorage.getItem('eveneo_feature_block_date');
      setIsBlockFeatureEnabled(storedFeature !== 'false'); // Default true if not set
  };

  useEffect(() => {
      loadData();
      const interval = setInterval(loadData, 5000); // Refresh every 5s for real-time status
      return () => clearInterval(interval);
  }, []);

  const updateTransactions = (newTransactions: any[]) => {
      setTransactions(newTransactions);
      localStorage.setItem('admin_transactions', JSON.stringify(newTransactions));
  };

  const toggleBlockFeature = () => {
      const newValue = !isBlockFeatureEnabled;
      setIsBlockFeatureEnabled(newValue);
      localStorage.setItem('eveneo_feature_block_date', String(newValue));
      // alert(`Fonctionnalité de blocage de date ${newValue ? 'ACTIVÉE' : 'DÉSACTIVÉE'}.`);
  };

  const filteredTransactions = transactions.filter(t => 
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
      t.event.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Refund Logic (Transaction Disputes)
  const handleRefund = (id: string) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      if (confirm(`CONFIRMATION : Effectuer un remboursement intégral de ${formatPrice(tx.amount)} au client ?`)) {
          const updated = transactions.map(t => t.id === id ? { ...t, status: 'refunded' } : t);
          updateTransactions(updated);

          const currentClientBalance = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
          const newClientBalance = currentClientBalance + tx.amount;
          localStorage.setItem('client_wallet_balance', newClientBalance.toString());

          alert(`SUCCÈS : Le client a été crédité de ${formatPrice(tx.amount)} sur son solde.`);
      }
  };

  const handleRelease = (id: string) => {
      const tx = transactions.find(t => t.id === id);
      if (!tx) return;

      if (confirm(`CONFIRMATION : Libérer les fonds (${formatPrice(tx.amount)}) vers le prestataire ?`)) {
          const updated = transactions.map(t => t.id === id ? { ...t, status: 'released' } : t);
          updateTransactions(updated);

          const currentProviderBalance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
          const newProviderBalance = currentProviderBalance + tx.amount;
          localStorage.setItem('provider_wallet_balance', newProviderBalance.toString());

          alert(`SUCCÈS : Le prestataire a reçu ${formatPrice(tx.amount)} sur son portefeuille.`);
      }
  };

  const handleRefundRequest = (reqId: string, action: 'approve' | 'reject') => {
      const req = refundRequests.find(r => r.id === reqId);
      if (!req) return;

      if (action === 'approve') {
          if (confirm(`Confirmer le remboursement sur carte bancaire de ${formatPrice(req.amount)} ?`)) {
              const updated = refundRequests.map(r => r.id === reqId ? { ...r, status: 'approved' } : r);
              setRefundRequests(updated);
              localStorage.setItem('admin_refund_requests', JSON.stringify(updated));
              alert("Remboursement validé.");
          }
      } else {
          if (confirm(`Refuser la demande et recréditer le portefeuille client ?`)) {
              const updated = refundRequests.map(r => r.id === reqId ? { ...r, status: 'rejected' } : r);
              setRefundRequests(updated);
              localStorage.setItem('admin_refund_requests', JSON.stringify(updated));

              const currentBalance = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
              localStorage.setItem('client_wallet_balance', (currentBalance + req.amount).toString());
              alert("Remboursement refusé. Fonds recrédités au client.");
          }
      }
  };

  const handleWithdrawalAction = (id: string, approved: boolean) => {
      const newStatus = approved ? 'approved' : 'rejected';
      const updatedWithdrawals = withdrawals.map(w => w.id === id ? { ...w, status: newStatus } : w);
      setWithdrawals(updatedWithdrawals);
      localStorage.setItem('admin_withdrawals', JSON.stringify(updatedWithdrawals));

      if (!approved) {
          const w = withdrawals.find(x => x.id === id);
          if (w) {
             const currentProviderBalance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
             localStorage.setItem('provider_wallet_balance', (currentProviderBalance + w.amount).toString());
          }
          alert("Retrait refusé. Montant recrédité.");
      } else {
          alert("Retrait validé.");
      }
  };

  // --- Cancel Block Logic ---
  const handleCancelBlock = (blockId: string) => {
      if(confirm("Voulez-vous vraiment annuler ce blocage ? La date sera libérée immédiatement.")) {
          const updatedBlocks = blockedDates.filter(b => b.id !== blockId);
          setBlockedDates(updatedBlocks);
          localStorage.setItem('eveneo_blocked_dates', JSON.stringify(updatedBlocks));
          alert("Blocage annulé avec succès.");
      }
  };

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Finance & Opérations</h1>
                <p className="text-gray-500">Suivi des urgences, flux financiers et options posées.</p>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">Options actives</p>
                    <p className="font-bold text-xl text-blue-600">{blockedDates.length}</p>
                </div>
                <div className="h-8 w-px bg-gray-200"></div>
                <div className="text-right">
                    <p className="text-xs text-gray-500 uppercase font-bold">À Rembourser</p>
                    <p className="font-bold text-xl text-gray-900">{refundRequests.filter(r => r.status === 'pending').length}</p>
                </div>
            </div>
        </div>

        {/* Tabs */}
        <div className="bg-white p-1 rounded-xl border border-gray-200 inline-flex shadow-sm overflow-x-auto max-w-full">
            <button 
                onClick={() => setActiveTab('urgencies')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'urgencies' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Siren size={16} className={activeTab === 'urgencies' ? 'animate-pulse' : ''} /> 
                Urgences
            </button>
            <button 
                onClick={() => setActiveTab('blocks')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'blocks' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Lock size={16} /> 
                Blocages & Options
            </button>
            <button 
                onClick={() => setActiveTab('refunds')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'refunds' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <RefreshCcw size={16} /> 
                Remboursements
            </button>
            <button 
                onClick={() => setActiveTab('transactions')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'transactions' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <CreditCard size={16} /> Transactions
            </button>
            <button 
                onClick={() => setActiveTab('withdrawals')}
                className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 whitespace-nowrap ${
                    activeTab === 'withdrawals' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
                <Landmark size={16} /> Retraits
            </button>
        </div>

        {/* BLOCKS TAB */}
        {activeTab === 'blocks' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-blue-50 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-2">
                        <Lock className="text-blue-600" size={20} />
                        <h3 className="font-bold text-blue-900">Dates Bloquées (Options Posées)</h3>
                    </div>
                    
                    {/* FEATURE TOGGLE */}
                    <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-blue-200 shadow-sm">
                        <span className="text-xs font-bold text-blue-800 uppercase">Module Blocage</span>
                        <button 
                            onClick={toggleBlockFeature}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isBlockFeatureEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isBlockFeatureEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                        <span className={`text-xs font-bold ${isBlockFeatureEnabled ? 'text-green-600' : 'text-gray-500'}`}>
                            {isBlockFeatureEnabled ? 'ACTIF' : 'INACTIF'}
                        </span>
                    </div>
                </div>
                
                {blockedDates.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Aucune date bloquée actuellement.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Client</th>
                                    <th className="px-6 py-3">Prestataire (ID)</th>
                                    <th className="px-6 py-3">Période</th>
                                    <th className="px-6 py-3">Durée</th>
                                    <th className="px-6 py-3">Payé</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {blockedDates.map((block, idx) => (
                                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50">
                                        <td className="px-6 py-4 font-bold text-gray-900">{block.clientName}</td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">{block.providerId}</td>
                                        <td className="px-6 py-4">
                                            Du {block.startDate} au {block.endDate}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold">{block.duration} jours</span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-green-600">
                                            {formatPrice(block.amountPaid)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleCancelBlock(block.id)}>
                                                <XCircle size={14} className="mr-1" /> Annuler le blocage
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* URGENT REPLACEMENTS TAB */}
        {activeTab === 'urgencies' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-red-50 flex items-center gap-2">
                    <Siren className="text-red-600" size={20} />
                    <h3 className="font-bold text-red-900">Prestations en recherche de prestataire (Temps Réel)</h3>
                </div>
                
                {urgentReplacements.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Aucune urgence en cours. Tout va bien !</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Événement</th>
                                    <th className="px-6 py-3">Catégorie</th>
                                    <th className="px-6 py-3">Budget</th>
                                    <th className="px-6 py-3">Date & Heure</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3">Lancé il y a</th>
                                </tr>
                            </thead>
                            <tbody>
                                {urgentReplacements.map((req, idx) => (
                                    <tr key={idx} className={`border-b border-gray-50 ${req.status === 'seeking' ? 'bg-red-50/30 animate-pulse-subtle' : ''}`}>
                                        <td className="px-6 py-4 font-bold text-gray-900">{req.eventName}</td>
                                        <td className="px-6 py-4">{req.category}</td>
                                        <td className="px-6 py-4 font-bold">{formatPrice(req.price)}</td>
                                        <td className="px-6 py-4">{req.date} à {req.slot}</td>
                                        <td className="px-6 py-4">
                                            {req.status === 'seeking' && <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold animate-pulse">RECHERCHE EN COURS</span>}
                                            {req.status === 'replaced' && <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">REMPLACÉ</span>}
                                            {req.status === 'expired' && <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-xs font-bold">EXPIRÉ (Remboursé)</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500">
                                            {Math.floor((Date.now() - req.broadcastTime) / 1000 / 60)} min
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* REFUNDS TAB */}
        {activeTab === 'refunds' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="font-bold text-gray-900">Demandes de Remboursement CB</h3>
                </div>
                {refundRequests.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">Aucune demande de remboursement en attente.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200 uppercase text-xs">
                                <tr>
                                    <th className="px-6 py-3">Demandeur</th>
                                    <th className="px-6 py-3">Montant</th>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {refundRequests.map((req) => (
                                    <tr key={req.id} className="border-b border-gray-50">
                                        <td className="px-6 py-4">
                                            <p className="font-bold">{req.userName}</p>
                                            <p className="text-xs text-gray-500">{req.userId}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-red-600">{formatPrice(req.amount)}</td>
                                        <td className="px-6 py-4">{req.date}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                req.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                                                req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {req.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <Button size="sm" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50" onClick={() => handleRefundRequest(req.id, 'reject')}>
                                                        Refuser (Recréditer Wallet)
                                                    </Button>
                                                    <Button size="sm" variant="primary" className="bg-green-600 hover:bg-green-700 border-transparent" onClick={() => handleRefundRequest(req.id, 'approve')}>
                                                        Valider (Virement)
                                                    </Button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        )}

        {/* TRANSACTIONS TAB */}
        {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 flex gap-4 bg-gray-50">
                    <div className="relative flex-grow max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Rechercher par ID ou Événement..." 
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm" className="bg-white"><Filter size={16} className="mr-2" /> {filteredTransactions.length} Résultats</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-white text-gray-500 font-medium border-b border-gray-200 uppercase text-xs tracking-wider">
                            <tr>
                                <th className="px-6 py-3">Transaction ID</th>
                                <th className="px-6 py-3">Événement</th>
                                <th className="px-6 py-3">Montant</th>
                                <th className="px-6 py-3">Statut Fonds</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredTransactions.map(tx => (
                                <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{tx.id}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">
                                        {tx.event}
                                        {tx.issues && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs bg-red-100 text-red-700 font-bold"><AlertTriangle size={12} className="mr-1"/> Litige</span>}
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{formatPrice(tx.amount)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                            tx.status === 'released' ? 'bg-green-100 text-green-700' :
                                            tx.status === 'refunded' ? 'bg-gray-200 text-gray-600 line-through' :
                                            tx.status === 'disputed' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {tx.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            {tx.status !== 'refunded' && tx.status !== 'released' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleRefund(tx.id)}
                                                        className="px-3 py-1.5 text-xs bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg flex items-center gap-1 transition-colors font-bold"
                                                        title="Rembourser intégralement au client"
                                                    >
                                                        <RotateCcw size={12} /> Rembourser
                                                    </button>
                                                    <button 
                                                        onClick={() => handleRelease(tx.id)}
                                                        className="px-3 py-1.5 text-xs bg-white border border-green-200 hover:bg-green-50 text-green-600 rounded-lg flex items-center gap-1 transition-colors font-bold"
                                                        title="Libérer les fonds vers le prestataire"
                                                    >
                                                        <CheckCircle size={12} /> Libérer
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* WITHDRAWALS TAB */}
        {activeTab === 'withdrawals' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[400px]">
                {withdrawals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400">
                        <div className="bg-gray-50 p-4 rounded-full mb-4">
                            <Landmark size={32} className="text-gray-300" />
                        </div>
                        <p className="font-medium">Aucune demande de retrait en attente.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-white text-gray-500 font-medium border-b border-gray-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="px-6 py-3">Ref</th>
                                    <th className="px-6 py-3">Prestataire</th>
                                    <th className="px-6 py-3">Montant</th>
                                    <th className="px-6 py-3">Coordonnées Bancaires</th>
                                    <th className="px-6 py-3">Statut</th>
                                    <th className="px-6 py-3 text-right">Validation</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {withdrawals.map(w => (
                                    <tr key={w.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{w.id}</td>
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-900">{w.providerName}</p>
                                            <p className="text-xs text-gray-400">{w.date}</p>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-lg text-gray-900">{formatPrice(w.amount)}</td>
                                        <td className="px-6 py-4">
                                            <div className="bg-gray-50 p-2 rounded border border-gray-200 inline-block">
                                                <p className="font-mono text-xs font-bold text-gray-800">{w.iban}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                w.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                w.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {w.status === 'pending' ? 'À Valider' : w.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {w.status === 'pending' && (
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleWithdrawalAction(w.id, false)}
                                                        className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 flex items-center gap-1 text-xs font-bold transition-colors"
                                                    >
                                                        <XCircle size={14} /> Rejeter
                                                    </button>
                                                    <button 
                                                        onClick={() => handleWithdrawalAction(w.id, true)}
                                                        className="px-3 py-1.5 bg-green-600 text-white border border-transparent rounded-lg hover:bg-green-700 flex items-center gap-1 text-xs font-bold shadow-sm transition-colors"
                                                    >
                                                        <CheckCircle size={14} /> Valider le virement
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
        )}
    </div>
  );
};
