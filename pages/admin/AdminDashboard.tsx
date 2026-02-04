
import React, { useEffect, useState } from 'react';
import { Users, DollarSign, ShoppingBag, AlertTriangle, TrendingUp, Activity, CheckCircle, ArrowUpRight, Filter, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/Button';
import { notificationService } from '../../services/notificationService';

export const AdminDashboard: React.FC = () => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '1y'>('30d');
  
  const [stats, setStats] = useState({
      calculatedProfit: 0, 
      subscriptionRevenue: 0, 
      totalVolume: 0, 
      totalPaidOut: 0, 
      users: 14240,
      usersChange: 8.2,
      events: 834,
      alerts: 12,
  });

  const [pendingTasks, setPendingTasks] = useState({
      kyc: 5,
      withdrawals: 3,
      reports: 2
  });

  // Helper to get a date string relative to today
  const getDateMinusDays = (days: number) => {
      const d = new Date();
      d.setDate(d.getDate() - days);
      return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    notificationService.requestPermission();
    
    // --- 1. Load Tasks ---
    const kycQueue = JSON.parse(localStorage.getItem('admin_kyc_queue') || '[]');
    const withdrawals = JSON.parse(localStorage.getItem('admin_withdrawals') || '[]');
    const reports = JSON.parse(localStorage.getItem('eveneo_reports') || '[]');

    if (kycQueue.length > 0 || withdrawals.length > 0 || reports.length > 0) {
        setPendingTasks({
            kyc: Math.max(kycQueue.length, 1), 
            withdrawals: Math.max(withdrawals.filter((w: any) => w.status === 'pending').length, 1),
            reports: Math.max(reports.filter((r: any) => r.status === 'pending').length, 1)
        });
    }

    // --- 2. Calculate Financials with REAL FILTERING ---
    
    // DATA SOURCE with DATES (Simulating the DB state)
    const MOCK_DB_TRANSACTIONS = [
        // Recent (last 7 days)
        { amount: 4350, type: 'order', status: 'paid', date: getDateMinusDays(1) }, 
        { amount: 850, type: 'order', status: 'paid', date: getDateMinusDays(2) },
        { amount: 29, type: 'subscription', status: 'paid', date: getDateMinusDays(3) },
        { amount: 3000, type: 'payout', status: 'completed', date: getDateMinusDays(4) }, // Payout

        // Medium term (last 30 days)
        { amount: 12500, type: 'order', status: 'paid', date: getDateMinusDays(15) },
        { amount: 2400, type: 'order', status: 'paid', date: getDateMinusDays(20) },
        { amount: 99, type: 'subscription', status: 'paid', date: getDateMinusDays(10) },
        { amount: 29, type: 'subscription', status: 'paid', date: getDateMinusDays(28) },
        { amount: 8000, type: 'payout', status: 'completed', date: getDateMinusDays(18) }, // Payout

        // Long term (last year)
        { amount: 3000, type: 'order', status: 'paid', date: getDateMinusDays(60) },
        { amount: 5000, type: 'order', status: 'paid', date: getDateMinusDays(120) },
        { amount: 99, type: 'subscription', status: 'paid', date: getDateMinusDays(200) },
        { amount: 4000, type: 'payout', status: 'completed', date: getDateMinusDays(90) },
    ];

    // Determine cutoff date based on filter
    const now = new Date();
    let cutoffDate = new Date();
    if (timeRange === '7d') cutoffDate.setDate(now.getDate() - 7);
    if (timeRange === '30d') cutoffDate.setDate(now.getDate() - 30);
    if (timeRange === '1y') cutoffDate.setDate(now.getDate() - 365);

    // Filter transactions
    const filteredTx = MOCK_DB_TRANSACTIONS.filter(t => new Date(t.date) >= cutoffDate);

    // 1. Total Orders (Ensemble des commandes)
    const totalOrders = filteredTx
        .filter(t => t.type === 'order')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 2. Total Paid Out (Total payé aux prestataires)
    const totalPaidOut = filteredTx
        .filter(t => t.type === 'payout')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 3. Total Subscriptions
    const totalSubscriptions = filteredTx
        .filter(t => t.type === 'subscription')
        .reduce((acc, curr) => acc + curr.amount, 0);

    // 4. Calculated Profit (Orders - Paid Out) + Subs
    // Note: Strictly "Orders - Paid Out" might be negative if a huge payout happens today from an old order.
    // Usually Profit = Commission. Here we follow user instruction: "ensemble des commande en cours - le total payé"
    const profit = (totalOrders - totalPaidOut) + totalSubscriptions;

    setStats(prev => ({
        ...prev,
        totalVolume: totalOrders,
        totalPaidOut: totalPaidOut,
        calculatedProfit: profit,
        subscriptionRevenue: totalSubscriptions
    }));

  }, [timeRange]); // Re-run when timeRange changes

  const statCards = [
      { label: 'Bénéfice Net (Calculé)', value: `${stats.calculatedProfit.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, change: timeRange === '7d' ? '+2%' : '+12%', icon: DollarSign, color: 'bg-green-600' },
      { label: 'Total Abonnements', value: `${stats.subscriptionRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, change: '+5%', icon: CreditCard, color: 'bg-purple-600' },
      { label: 'Volume Commandes', value: `${stats.totalVolume.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`, change: '+18%', icon: ShoppingBag, color: 'bg-blue-600' },
      { label: 'Utilisateurs Totaux', value: stats.users.toLocaleString(), change: `+${stats.usersChange}%`, icon: Users, color: 'bg-gray-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in pb-10">
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Vue d'ensemble</h1>
                <p className="text-gray-500">Bienvenue dans le centre de contrôle Événéo.</p>
            </div>
            
            <div className="flex items-center bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                <div className="px-3 text-gray-400 border-r border-gray-100 mr-2">
                    <Filter size={16} />
                </div>
                <button 
                    onClick={() => setTimeRange('7d')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${timeRange === '7d' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    7 Jours
                </button>
                <button 
                    onClick={() => setTimeRange('30d')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${timeRange === '30d' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    30 Jours
                </button>
                <button 
                    onClick={() => setTimeRange('1y')}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${timeRange === '1y' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                >
                    Année
                </button>
            </div>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((stat, idx) => (
                <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:border-gray-300 transition-colors group relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-5 transform translate-x-2 -translate-y-2">
                        <stat.icon size={100} />
                    </div>
                    <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className={`${stat.color} p-3 rounded-xl text-white shadow-lg shadow-gray-200 group-hover:scale-110 transition-transform`}>
                            <stat.icon size={24} />
                        </div>
                        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">
                            {stat.change}
                        </span>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1 relative z-10">{stat.value}</h3>
                    <p className="text-sm text-gray-500 font-medium relative z-10">{stat.label}</p>
                </div>
            ))}
        </div>

        {/* Action Center (Tasks) */}
        <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Actions Requises</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border-l-4 border-orange-400 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><CheckCircle size={20} className="text-orange-500" /> Vérifications KYC</h3>
                        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">{pendingTasks.kyc} en attente</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Prestataires en attente de validation d'identité.</p>
                </div>
                <Link to="/admin/moderation">
                    <Button variant="primary" fullWidth size="sm" className="bg-orange-600 text-white border-transparent hover:bg-orange-700 shadow-md font-bold">
                        Traiter les dossiers
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border-l-4 border-blue-400 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><ArrowUpRight size={20} className="text-blue-500" /> Retraits Fonds</h3>
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{pendingTasks.withdrawals} demandes</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Demandes de virement bancaire à approuver.</p>
                </div>
                <Link to="/admin/events">
                    <Button variant="primary" fullWidth size="sm" className="bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-md font-bold">
                        Valider les paiements
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border-l-4 border-red-400 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between h-full">
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><AlertTriangle size={20} className="text-red-500" /> Modération</h3>
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">{pendingTasks.reports} signalements</span>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">Contenu signalé ou utilisateurs problématiques.</p>
                </div>
                <Link to="/admin/moderation">
                    <Button variant="primary" fullWidth size="sm" className="bg-red-600 text-white border-transparent hover:bg-red-700 shadow-md font-bold">
                        Voir les alertes
                    </Button>
                </Link>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
            {/* Charts */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <TrendingUp size={20} className="text-eveneo-violet" /> Performance Financière ({timeRange})
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-bold">
                        <div className="flex items-center gap-2">
                             <span className="w-3 h-3 rounded-full bg-gray-900"></span> Marge Nette
                        </div>
                    </div>
                </div>
                
                <div className="h-64 flex items-end gap-3 justify-between px-2 border-b border-gray-100 pb-2">
                    {[35, 45, 40, 60, 55, 70, 80, 75, 65, 85, 90, 95].map((h, i) => (
                        <div key={i} className="w-full flex flex-col gap-1 h-full justify-end group relative cursor-pointer">
                            {/* Tooltip */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 font-bold shadow-xl">
                                {(h * (stats.calculatedProfit / 1000)).toFixed(0)} €
                            </div>
                            {/* Bar */}
                            <div 
                                className="w-full bg-gray-900 rounded-t-md opacity-90 group-hover:opacity-100 transition-all duration-300 group-hover:bg-eveneo-violet shadow-sm" 
                                style={{ height: `${h}%` }}
                            ></div>
                            <div 
                                className="w-full bg-gray-100 rounded-b-md" 
                                style={{ height: '10%' }}
                            ></div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-400 font-bold uppercase tracking-wider">
                    <span>P1</span><span>P2</span><span>P3</span><span>P4</span><span>P5</span><span>P6</span><span>P7</span><span>P8</span><span>P9</span><span>P10</span><span>P11</span><span>P12</span>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Activity size={20} /> Activité Récente
                    </h3>
                </div>
                
                <div className="space-y-6 overflow-y-auto flex-grow max-h-[350px] pr-2 custom-scrollbar">
                    {[
                        { action: 'Nouvel inscrit', target: 'Gourmet Deluxe (Provider)', time: '2 min', icon: Users, color: 'bg-blue-100 text-blue-600' },
                        { action: 'Paiement reçu', target: '4,350€ - Mariage Sophie', time: '15 min', icon: DollarSign, color: 'bg-green-100 text-green-600' },
                        { action: 'Alerte modération', target: 'Commentaire suspect #882', time: '1h', icon: AlertTriangle, color: 'bg-red-100 text-red-600' },
                        { action: 'Retrait validé', target: 'Virement DJ Snake', time: '3h', icon: ArrowUpRight, color: 'bg-purple-100 text-purple-600' },
                        { action: 'KYC Approuvé', target: 'Salle les Pins', time: '5h', icon: CheckCircle, color: 'bg-teal-100 text-teal-600' },
                        { action: 'Nouvel inscrit', target: 'Jean Dupont (Client)', time: '6h', icon: Users, color: 'bg-blue-100 text-blue-600' },
                    ].map((log, i) => (
                        <div key={i} className="flex items-start gap-4 group p-2 hover:bg-gray-50 rounded-xl transition-colors cursor-default">
                            <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${log.color} shadow-sm`}>
                                <log.icon size={18} />
                            </div>
                            <div className="flex-grow">
                                <p className="font-bold text-gray-800 text-sm group-hover:text-eveneo-violet transition-colors">{log.action}</p>
                                <p className="text-xs text-gray-500">{log.target}</p>
                            </div>
                            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">{log.time}</span>
                        </div>
                    ))}
                </div>
                <Button variant="ghost" size="sm" fullWidth className="mt-4 text-gray-500">Voir tout l'historique</Button>
            </div>
        </div>
    </div>
  );
};
