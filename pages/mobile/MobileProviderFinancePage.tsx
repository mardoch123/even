import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronDown,
  Building2,
  Bell,
  Settings,
  Star,
  MessageSquare,
  Eye
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { eventService } from '../../services/eventService';
import { providerService } from '../../services/providerService';

interface Transaction {
  id: string;
  type: 'income' | 'withdrawal';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending';
}

export const MobileProviderFinancePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [balance, setBalance] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyAverage, setDailyAverage] = useState(0);
  const [growth, setGrowth] = useState(12);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [providerStats, setProviderStats] = useState({
    rating: 0,
    reviewCount: 0,
    viewCount: 0
  });

  useEffect(() => {
    const fetchFinanceData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch provider data
        const providerData = await providerService.getProviderById(currentUser.id);
        setProviderStats({
          rating: providerData?.rating || 0,
          reviewCount: providerData?.reviewCount || 0,
          viewCount: 0 // Would need real tracking
        });

        // Fetch completed event items (revenue)
        const eventItems = await eventService.getEventItemsByProviderId(currentUser.id);
        const completedItems = eventItems.filter(item => 
          item.status === 'confirmed' || 
          item.status === 'completed_by_provider' || 
          item.status === 'validated_by_client'
        );

        // Calculate total revenue
        const total = completedItems.reduce((sum, item) => sum + (item.price || 0), 0);
        setTotalRevenue(total);
        setBalance(total); // Simplified - would be actual wallet balance

        // Calculate daily average based on time range
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
        setDailyAverage(Math.round(total / days));

        // Generate transactions from completed items
        const txs: Transaction[] = completedItems.map(item => ({
          id: item.id,
          type: 'income' as const,
          amount: item.price || 0,
          description: 'Réservation confirmée',
          date: item.created_at || new Date().toISOString(),
          status: 'completed' as const
        })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setTransactions(txs.slice(0, 10));
      } catch (error) {
        console.error('Error fetching finance data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinanceData();
  }, [currentUser, timeRange]);

  // Generate chart data points (simplified)
  const chartData = [
    { day: 1, value: 0 },
    { day: 5, value: totalRevenue * 0.2 },
    { day: 10, value: totalRevenue * 0.4 },
    { day: 15, value: totalRevenue * 0.6 },
    { day: 20, value: totalRevenue * 0.75 },
    { day: 25, value: totalRevenue * 0.9 },
    { day: 30, value: totalRevenue }
  ];

  const timeRangeLabels = {
    '7d': '7 jours',
    '30d': '30 jours',
    '90d': '90 jours',
    '1y': '1 an'
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 safe-area-top border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            Finances
          </h1>
          
          <div className="flex gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors relative">
              <Bell size={22} className="text-gray-700" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </button>
            <button 
              onClick={() => navigate('/settings')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Settings size={22} className="text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <section className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                <Building2 size={28} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{currentUser?.name || 'Utilisateur'}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                  <span className="text-sm text-white/90">Vérifié</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Bell size={20} className="text-white" />
              </button>
              <button 
                onClick={() => navigate('/settings')}
                className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
              >
                <Settings size={20} className="text-white" />
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 mt-5">
            <div className="flex items-center gap-1.5">
              <Star size={16} className="text-yellow-300 fill-yellow-300" />
              <span className="font-semibold">{providerStats.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageSquare size={16} className="text-white/80" />
              <span className="font-semibold">{providerStats.reviewCount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye size={16} className="text-white/80" />
              <span className="font-semibold">{providerStats.viewCount}</span>
            </div>
          </div>
        </section>

        {/* Revenue Chart */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp size={20} className="text-eveneo-blue" />
              <h2 className="text-lg font-bold text-gray-900">Évolution des revenus</h2>
            </div>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-eveneo-blue rounded-full text-sm font-medium">
              {timeRangeLabels[timeRange]}
              <ChevronDown size={16} />
            </button>
          </div>

          {/* Chart */}
          <div className="h-48 relative">
            {/* Grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between">
              {[4, 3, 2, 1, 0].map((i) => (
                <div key={i} className="border-t border-gray-100 h-0" />
              ))}
            </div>

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 pr-2">
              <span>€4k</span>
              <span>€3k</span>
              <span>€2k</span>
              <span>€1k</span>
              <span>€0k</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-10 right-0 top-0 bottom-0">
              {/* Simple line chart visualization */}
              <svg className="w-full h-full" viewBox="0 0 300 150" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                  </linearGradient>
                </defs>
                
                {/* Area fill */}
                <path
                  d={`M 0,150 ${chartData.map((d, i) => `L ${(i / (chartData.length - 1)) * 300},${150 - (d.value / totalRevenue) * 150}`).join(' ')} L 300,150 Z`}
                  fill="url(#chartGradient)"
                />
                
                {/* Line */}
                <path
                  d={`M 0,150 ${chartData.map((d, i) => `L ${(i / (chartData.length - 1)) * 300},${150 - (d.value / totalRevenue) * 150}`).join(' ')}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                />

                {/* Data points */}
                {chartData.map((d, i) => (
                  <circle
                    key={i}
                    cx={(i / (chartData.length - 1)) * 300}
                    cy={150 - (d.value / totalRevenue) * 150}
                    r="4"
                    fill="#3b82f6"
                  />
                ))}
              </svg>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-10 right-0 bottom-0 flex justify-between text-xs text-gray-400 pt-2">
              <span>1</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>30</span>
            </div>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-3 gap-4 mt-6 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">{formatPrice(totalRevenue)}</p>
              <p className="text-xs text-gray-500">Revenus totaux</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">{formatPrice(dailyAverage)}</p>
              <p className="text-xs text-gray-500">Moyenne/jour</p>
            </div>
            <div className="text-center">
              <div className="w-3 h-3 bg-orange-500 rounded-full mx-auto mb-2" />
              <p className="text-lg font-bold text-gray-900">+{growth}%</p>
              <p className="text-xs text-gray-500">Croissance</p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Actions rapides</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate('/wallet')}
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
                <Wallet size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Portefeuille</p>
                <p className="text-xs text-gray-500">{formatPrice(balance)}</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/wallet/withdraw')}
              className="flex items-center gap-3 p-4 bg-green-50 rounded-xl active:scale-95 transition-transform"
            >
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
                <ArrowDownRight size={20} className="text-white" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-900">Retirer</p>
                <p className="text-xs text-gray-500">Vers votre compte</p>
              </div>
            </button>
          </div>
        </section>

        {/* Recent Transactions */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Transactions récentes</h2>
            <button 
              onClick={() => navigate('/wallet/transactions')}
              className="text-eveneo-blue text-sm font-medium"
            >
              Voir tout
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <DollarSign size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-500">Aucune transaction</p>
              <p className="text-gray-400 text-sm mt-1">
                Vos transactions apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.slice(0, 5).map((tx) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tx.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {tx.type === 'income' ? (
                        <ArrowUpRight size={18} className="text-green-600" />
                      ) : (
                        <ArrowDownRight size={18} className="text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{tx.description}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(tx.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <span className={`font-semibold ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {tx.type === 'income' ? '+' : '-'}{formatPrice(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
};
