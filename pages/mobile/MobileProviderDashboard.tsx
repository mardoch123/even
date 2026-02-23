import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  User,
  BarChart3,
  TrendingUp,
  Eye,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  Clock3,
  Award,
  ChevronRight,
  Bell,
  MessageSquare,
  DollarSign,
  Shield,
  AlertTriangle,
  FileText,
  Camera,
  CreditCard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { eventService } from '../../services/eventService';
import { providerService } from '../../services/providerService';
import { ServiceProvider } from '../../types';

// Composant pour le graphique circulaire simple
const DonutChart: React.FC<{ data: { label: string; value: number; color: string }[] }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  let cumulativePercent = 0;

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
          {/* Background circle */}
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          
          {/* Data segments */}
          {data.map((item, index) => {
            const percent = (item.value / total) * 100;
            const dashArray = `${percent} ${100 - percent}`;
            const offset = 100 - cumulativePercent;
            cumulativePercent += percent;
            
            return (
              <circle
                key={index}
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke={item.color}
                strokeWidth="3"
                strokeDasharray={dashArray}
                strokeDashoffset={offset}
                className="transition-all duration-500"
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold text-gray-900">{total}</span>
        </div>
      </div>
      
      {/* Legend */}
      <div className="flex-1 space-y-2">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const MobileProviderDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'calendar' | 'messages' | 'stats'>('overview');
  
  // Stats réelles
  const [stats, setStats] = useState({
    views: 0,
    conversion: 0,
    rating: 0,
    responseTime: 0,
    totalRequests: 0,
    acceptedRequests: 0,
    pendingRequests: 0,
    declinedRequests: 0,
    revenue: 0
  });

  const [demandStats, setDemandStats] = useState([
    { label: 'Acceptées', value: 0, color: '#22c55e' },
    { label: 'En attente', value: 0, color: '#f59e0b' },
    { label: 'Déclinées', value: 0, color: '#ef4444' }
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch provider data
        const providerData = await providerService.getProviderById(currentUser.id);
        setProvider(providerData);
        
        // Fetch real event items (demandes) for this provider
        const eventItems = await eventService.getEventItemsByProviderId(currentUser.id);
        
        // Calculer les statistiques réelles
        const total = eventItems.length;
        const accepted = eventItems.filter(item => 
          item.status === 'confirmed' || 
          item.status === 'completed_by_provider' || 
          item.status === 'validated_by_client'
        ).length;
        const pending = eventItems.filter(item => item.status === 'pending').length;
        const declined = total - accepted - pending; // Les autres sont considérés comme déclinés
        
        // Calculer le revenu total
        const totalRevenue = eventItems
          .filter(item => 
            item.status === 'confirmed' || 
            item.status === 'completed_by_provider' || 
            item.status === 'validated_by_client'
          )
          .reduce((sum, item) => sum + (item.price || 0), 0);
        
        // Calculer le taux de conversion
        const conversionRate = total > 0 ? Math.round((accepted / total) * 100) : 0;
        
        setStats({
          views: 0, // Nécessiterait un système de tracking des vues
          conversion: conversionRate,
          rating: providerData?.rating || 0,
          responseTime: calculateAverageResponseTime(eventItems),
          totalRequests: total,
          acceptedRequests: accepted,
          pendingRequests: pending,
          declinedRequests: declined,
          revenue: totalRevenue
        });
        
        // Mettre à jour les stats du graphique
        if (total > 0) {
          setDemandStats([
            { label: 'Acceptées', value: Math.round((accepted / total) * 100), color: '#22c55e' },
            { label: 'En attente', value: Math.round((pending / total) * 100), color: '#f59e0b' },
            { label: 'Déclinées', value: Math.round((declined / total) * 100), color: '#ef4444' }
          ]);
        }
      } catch (error) {
        console.error('Error fetching provider data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Fonction pour calculer le temps de réponse moyen
  const calculateAverageResponseTime = (items: any[]): number => {
    if (!items || items.length === 0) return 0;
    
    // Filtrer les items qui ont une date de réponse
    const itemsWithResponse = items.filter(item => item.responded_at && item.created_at);
    if (itemsWithResponse.length === 0) return 0;
    
    const totalHours = itemsWithResponse.reduce((sum, item) => {
      const created = new Date(item.created_at).getTime();
      const responded = new Date(item.responded_at).getTime();
      const hours = (responded - created) / (1000 * 60 * 60);
      return sum + hours;
    }, 0);
    
    return Math.round(totalHours / itemsWithResponse.length);
  };

  const metricCards = [
    {
      icon: Eye,
      value: stats.views,
      label: 'Vues profil',
      change: '+15%',
      changePositive: true
    },
    {
      icon: TrendingUp,
      value: `${stats.conversion}%`,
      label: 'Taux conversion',
      change: '+8%',
      changePositive: true
    },
    {
      icon: Star,
      value: `${stats.rating}/5`,
      label: 'Satisfaction',
      change: '+5%',
      changePositive: true
    },
    {
      icon: Clock,
      value: `${stats.responseTime}h`,
      label: 'Temps réponse',
      change: '-12%',
      changePositive: false
    }
  ];

  const bottomNavItems = [
    { id: 'overview', icon: BarChart3, label: 'Accueil', badge: 0 },
    { id: 'calendar', icon: Calendar, label: 'Agenda', badge: 5 },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: 2 },
    { id: 'stats', icon: DollarSign, label: 'Revenus', badge: 0 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-eveneo-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 safe-area-top border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900 truncate max-w-[200px]">
            {provider?.name || 'Mon Dashboard'}
          </h1>
          
          <div className="flex gap-2">
            <button 
              onClick={() => navigate('/provider/calendar')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors relative"
            >
              <Calendar size={22} className="text-gray-700" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                5
              </span>
            </button>
            <button 
              onClick={() => navigate('/profile')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <User size={22} className="text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Section Vérification Profil - BIEN VISIBLE */}
        {(!currentUser?.isVerified && currentUser?.kycStatus !== 'verified') && (
          <section className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Shield size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">Vérifiez votre profil</h2>
                <p className="text-white/90 text-sm mb-3">
                  Complétez votre vérification pour recevoir des demandes et être visible par les clients.
                </p>
                <button 
                  onClick={() => navigate('/kyc')}
                  className="bg-white text-orange-600 font-semibold px-4 py-2 rounded-xl text-sm active:scale-95 transition-transform"
                >
                  Commencer la vérification
                </button>
              </div>
            </div>
          </section>
        )}

        {currentUser?.kycStatus === 'pending' && (
          <section className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <Clock3 size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">Vérification en cours</h2>
                <p className="text-white/90 text-sm">
                  Votre dossier est en cours d'examen. Vous serez notifié dès qu'il sera approuvé.
                </p>
              </div>
            </div>
          </section>
        )}

        {currentUser?.isVerified && (
          <section className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-4 text-white shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle size={24} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">Profil vérifié</h2>
                <p className="text-white/90 text-sm">
                  Votre profil est vérifié. Vous pouvez recevoir des demandes.
                </p>
              </div>
              <Shield size={28} className="text-white/80" />
            </div>
          </section>
        )}

        {/* Métriques de performance */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={20} className="text-eveneo-blue" />
            <h2 className="text-lg font-bold text-gray-900">Métriques de performance</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {metricCards.map((metric, index) => (
              <div key={index} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    index === 0 ? 'bg-blue-100 text-blue-600' :
                    index === 1 ? 'bg-green-100 text-green-600' :
                    index === 2 ? 'bg-yellow-100 text-yellow-600' :
                    'bg-purple-100 text-purple-600'
                  }`}>
                    <metric.icon size={18} />
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    metric.changePositive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {metric.change}
                  </span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Répartition des demandes */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Répartition des demandes</h2>
          <DonutChart data={demandStats} />
        </section>

        {/* Badges et réalisations */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Award size={20} className="text-eveneo-violet" />
            <h2 className="text-lg font-bold text-gray-900">Badges et réalisations</h2>
          </div>
          
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {[
              { icon: Star, label: 'Top Rated', color: 'bg-yellow-100 text-yellow-600' },
              { icon: CheckCircle, label: 'Vérifié', color: 'bg-green-100 text-green-600' },
              { icon: Clock3, label: 'Rapide', color: 'bg-blue-100 text-blue-600' },
              { icon: Award, label: 'Expert', color: 'bg-purple-100 text-purple-600' }
            ].map((badge, index) => (
              <div 
                key={index}
                className="flex flex-col items-center gap-2 min-w-[80px]"
              >
                <div className={`w-14 h-14 rounded-2xl ${badge.color} flex items-center justify-center`}>
                  <badge.icon size={24} />
                </div>
                <span className="text-xs font-medium text-gray-700 text-center">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Actions rapides */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-3">Actions rapides</h2>
          <div className="space-y-2">
            {[
              { label: 'Voir mon profil public', path: `/provider/${currentUser?.id}`, icon: Eye },
              { label: 'Gérer mes disponibilités', path: '/provider/calendar', icon: Calendar },
              { label: 'Mes demandes en attente', path: '/provider/requests', icon: Clock3, badge: 5 },
              { label: 'Promouvoir mes services', path: '/promote', icon: TrendingUp }
            ].map((action, index) => (
              <button
                key={index}
                onClick={() => navigate(action.path)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <action.icon size={20} className="text-gray-600" />
                  <span className="font-medium text-gray-900">{action.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  {action.badge && (
                    <span className="w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {action.badge}
                    </span>
                  )}
                  <ChevronRight size={18} className="text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-bottom z-40">
        <div className="flex items-center justify-around py-2">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors ${
                activeTab === item.id 
                  ? 'text-eveneo-blue' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <div className="relative">
                <item.icon size={22} />
                {item.badge > 0 && (
                  <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
};
