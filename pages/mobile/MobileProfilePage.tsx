import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  Bell, 
  CreditCard, 
  Heart, 
  FileText, 
  ChevronRight,
  LogOut,
  Camera,
  Star,
  MessageSquare,
  Eye
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { MobileOverlayLoader } from '../../components/MobileLoader';
import { UserRole, KYCStatus } from '../../types';
import { supabase } from '../../services/supabaseClient';

interface ProfileStats {
  eventsCount: number;
  messagesCount: number;
  favoritesCount: number;
}

export const MobileProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { formatPrice } = useCurrency();

  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<ProfileStats>({
    eventsCount: 0,
    messagesCount: 0,
    favoritesCount: 0
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Récupérer les statistiques réelles
  useEffect(() => {
    const fetchStats = async () => {
      if (!currentUser) return;
      
      try {
        // Compter les événements
        const { count: eventsCount } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', currentUser.id);

        // Compter les messages non lus
        const { count: messagesCount } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('receiver_id', currentUser.id)
          .eq('read', false);

        // Compter les favoris (depuis localStorage pour l'instant)
        const favorites = JSON.parse(localStorage.getItem('eveneo_favorites') || '[]');

        setStats({
          eventsCount: eventsCount || 0,
          messagesCount: messagesCount || 0,
          favoritesCount: favorites.length
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      }
    };

    fetchStats();
  }, [currentUser]);

  const handleLogout = async () => {
    setLoading(true);
    await logout();
    navigate('/login');
  };

  const getKYCStatusColor = (status?: KYCStatus) => {
    switch (status) {
      case 'verified': return 'bg-green-500';
      case 'pending': return 'bg-amber-500';
      case 'rejected': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getKYCStatusText = (status?: KYCStatus) => {
    switch (status) {
      case 'verified': return 'Vérifié';
      case 'pending': return 'En attente';
      case 'rejected': return 'Rejeté';
      default: return 'Non vérifié';
    }
  };

  const menuItems = [
    {
      icon: User,
      label: 'Informations personnelles',
      path: '/settings',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Shield,
      label: 'Vérification d\'identité (KYC)',
      path: '/settings?tab=kyc',
      color: 'bg-green-100 text-green-600',
      badge: currentUser?.kycStatus !== 'verified' ? 'À faire' : undefined
    },
    {
      icon: CreditCard,
      label: 'Portefeuille & Paiements',
      path: '/wallet',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      icon: Heart,
      label: 'Mes favoris',
      path: '/favorites',
      color: 'bg-pink-100 text-pink-600',
      badge: stats.favoritesCount > 0 ? String(stats.favoritesCount) : undefined
    },
    {
      icon: Bell,
      label: 'Notifications',
      path: '/notifications',
      color: 'bg-amber-100 text-amber-600'
    },
    {
      icon: FileText,
      label: 'Mes réservations',
      path: '/orders',
      color: 'bg-indigo-100 text-indigo-600',
      badge: stats.eventsCount > 0 ? String(stats.eventsCount) : undefined
    },
  ];

  if (!currentUser) {
    return <MobileOverlayLoader message="Chargement..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 safe-area-top">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Mon Profil</h1>
        <div className="w-10" /> {/* Spacer pour centrer */}
      </header>

      {/* Carte profil */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-r from-eveneo-blue to-eveneo-violet rounded-3xl p-6 text-white relative overflow-hidden shadow-lg">
          {/* Éléments décoratifs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 right-10 w-16 h-16 bg-white/10 rounded-full" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white/30 bg-white/20">
                    {currentUser.avatarUrl ? (
                      <img 
                        src={currentUser.avatarUrl} 
                        alt={currentUser.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl font-bold">
                        {(currentUser.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                    <Camera size={14} className="text-gray-600" />
                  </button>
                </div>

                {/* Info utilisateur */}
                <div>
                  <h2 className="text-xl font-bold">{currentUser.name || 'Utilisateur'}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`w-2.5 h-2.5 rounded-full ${getKYCStatusColor(currentUser.kycStatus)}`} />
                    <span className="text-white/90 text-sm">{getKYCStatusText(currentUser.kycStatus)}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button 
                  onClick={() => navigate('/notifications')}
                  className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Bell size={20} />
                </button>
                <button 
                  onClick={() => navigate('/settings')}
                  className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <User size={20} />
                </button>
              </div>
            </div>

            {/* Stats rapides */}
            <div className="flex items-center gap-6 mt-6 pt-4 border-t border-white/20">
              <div className="flex items-center gap-2">
                <Star size={18} className="text-yellow-300" fill="currentColor" />
                <span className="font-semibold">0.0</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare size={18} />
                <span className="font-semibold">{stats.messagesCount}</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={18} />
                <span className="font-semibold">0</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Informations de contact */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Contact</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Mail size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <Phone size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Téléphone</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentUser.phone || 'Non renseigné'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                <MapPin size={18} className="text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500">Adresse</p>
                <p className="text-sm font-medium text-gray-900">
                  {currentUser.location || 'Non renseignée'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {menuItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
                  index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center shrink-0`}>
                  <Icon size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{item.label}</p>
                </div>
                {item.badge && (
                  <span className="px-2 py-1 bg-eveneo-violet text-white text-xs font-bold rounded-full">
                    {item.badge}
                  </span>
                )}
                <ChevronRight size={20} className="text-gray-400" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Bouton déconnexion */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-medium flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          <LogOut size={20} />
          Se déconnecter
        </button>
      </div>

      {/* Modal de confirmation déconnexion */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Se déconnecter ?</h3>
            <p className="text-gray-500 mb-6">
              Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                disabled={loading}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium disabled:opacity-50"
              >
                {loading ? '...' : 'Déconnecter'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation du bas */}
      <MobileBottomNav />
    </div>
  );
};
