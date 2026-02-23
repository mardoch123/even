import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell, 
  Calendar, 
  MessageCircle, 
  CreditCard, 
  Star,
  CheckCircle,
  AlertCircle,
  Trash2,
  Settings
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
// Helper function to format time ago
const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'À l\'instant';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

interface Notification {
  id: string;
  type: 'booking' | 'message' | 'payment' | 'review' | 'system';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

const notificationIcons = {
  booking: Calendar,
  message: MessageCircle,
  payment: CreditCard,
  review: Star,
  system: Bell
};

const notificationColors = {
  booking: 'bg-blue-100 text-blue-600',
  message: 'bg-green-100 text-green-600',
  payment: 'bg-purple-100 text-purple-600',
  review: 'bg-yellow-100 text-yellow-600',
  system: 'bg-gray-100 text-gray-600'
};

export const MobileNotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    // Simuler le chargement des notifications
    const loadNotifications = async () => {
      setLoading(true);
      // TODO: Remplacer par l'appel API réel
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'booking',
          title: 'Réservation confirmée',
          message: 'Votre réservation avec DJ Nova a été confirmée pour le 15 mars 2026.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 min ago
          actionUrl: '/orders'
        },
        {
          id: '2',
          type: 'message',
          title: 'Nouveau message',
          message: 'Sophie vous a envoyé un message concernant votre événement.',
          read: false,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          actionUrl: '/messages'
        },
        {
          id: '3',
          type: 'payment',
          title: 'Paiement reçu',
          message: 'Votre paiement de 750 € a bien été reçu.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
        {
          id: '4',
          type: 'review',
          title: 'Nouvel avis',
          message: 'Vous avez reçu un nouvel avis 5 étoiles de Marie.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
        },
        {
          id: '5',
          type: 'system',
          title: 'Mise à jour',
          message: 'Nouvelles fonctionnalités disponibles sur l\'application.',
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
        }
      ];
      
      setNotifications(mockNotifications);
      setLoading(false);
    };

    loadNotifications();
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const filteredNotifications = activeFilter === 'unread' 
    ? notifications.filter(n => !n.read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header style Airbnb */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between px-4 py-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          
          <button 
            onClick={() => navigate('/settings/notifications')}
            className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Settings size={22} className="text-gray-700" />
          </button>
        </div>

        {/* Filtres */}
        <div className="flex px-4 pb-3 gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'all' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              activeFilter === 'unread' 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Non lues {unreadCount > 0 && `(${unreadCount})`}
          </button>
        </div>
      </header>

      {/* Actions rapides */}
      {unreadCount > 0 && (
        <div className="px-4 py-3 border-b border-gray-100">
          <button
            onClick={markAllAsRead}
            className="text-sm text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            <CheckCircle size={16} />
            Tout marquer comme lu
          </button>
        </div>
      )}

      {/* Liste des notifications */}
      <main>
        {loading ? (
          // Skeleton loader
          <div className="divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 p-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-full h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          // État vide
          <div className="flex flex-col items-center justify-center py-20 px-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Bell size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeFilter === 'unread' ? 'Aucune notification non lue' : 'Aucune notification'}
            </h3>
            <p className="text-gray-500 text-center text-sm">
              {activeFilter === 'unread' 
                ? 'Vous avez lu toutes vos notifications.' 
                : 'Vos notifications apparaîtront ici.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => {
              const Icon = notificationIcons[notification.type];
              const colorClass = notificationColors[notification.type];
              
              return (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`flex gap-4 p-4 cursor-pointer transition-colors hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                >
                  {/* Icône */}
                  <div className={`w-12 h-12 rounded-full ${colorClass} flex items-center justify-center shrink-0`}>
                    <Icon size={22} />
                  </div>

                  {/* Contenu */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`font-semibold text-gray-900 ${!notification.read ? 'text-base' : 'text-sm'}`}>
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-gray-400 text-xs mt-2">
                      {formatTimeAgo(notification.createdAt)}
                    </p>
                  </div>

                  {/* Actions */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
