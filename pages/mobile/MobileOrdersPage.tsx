import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Calendar, 
  ChevronRight,
  Clock,
  CheckCircle,
  Play,
  Flag,
  XCircle
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { MobileOverlayLoader } from '../../components/MobileLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { eventService, Event as EveneoEvent } from '../../services/eventService';

export const MobileOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [activeTab, setActiveTab] = useState<'mine' | 'public'>('mine');
  const [events, setEvents] = useState<EveneoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await eventService.getEventsByClientId(currentUser.id);
        setEvents(data);
      } catch (error) {
        console.error('Error fetching events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentUser]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> Confirmé
          </span>
        );
      case 'draft':
        return (
          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full flex items-center gap-1">
            <Clock size={12} /> Brouillon
          </span>
        );
      case 'started':
        return (
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full flex items-center gap-1">
            <Play size={12} /> En cours
          </span>
        );
      case 'ended':
      case 'completed':
        return (
          <span className="px-2 py-1 bg-gray-800 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Flag size={12} /> Terminé
          </span>
        );
      case 'cancelled_refunded':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-600 text-xs font-medium rounded-full flex items-center gap-1">
            <XCircle size={12} /> Annulé
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        day: date.getDate(),
        month: date.toLocaleString('fr-FR', { month: 'short' }),
        full: date.toLocaleDateString('fr-FR', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      };
    } catch {
      return { day: '--', month: '---', full: dateStr };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-eveneo-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 safe-area-top">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Commandes</h1>
        <button 
          onClick={() => navigate('/events')}
          className="p-2 -mr-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <Plus size={24} className="text-gray-700" />
        </button>
      </header>

      {/* Tabs */}
      <div className="px-4 border-b border-gray-100">
        <div className="flex">
          <button
            onClick={() => setActiveTab('mine')}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'mine' 
                ? 'text-eveneo-blue' 
                : 'text-gray-500'
            }`}
          >
            Mes Commandes
            {activeTab === 'mine' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-eveneo-blue" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('public')}
            className={`flex-1 py-3 text-sm font-medium relative ${
              activeTab === 'public' 
                ? 'text-eveneo-blue' 
                : 'text-gray-500'
            }`}
          >
            Commandes Publics
            {activeTab === 'public' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-eveneo-blue" />
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 pt-4">
        {loading ? (
          // Skeleton loader pour les commandes
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-4 flex gap-4">
                <div className="w-16 h-16 rounded-xl bg-gray-200 animate-pulse shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="w-3/4 h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="w-1/2 h-3 bg-gray-200 rounded animate-pulse" />
                  <div className="w-1/3 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'mine' ? (
          events.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Aucune commande</p>
              <p className="text-gray-400 text-sm mt-1">
                Créez votre première commande
              </p>
              <button
                onClick={() => navigate('/events')}
                className="mt-6 px-6 py-3 bg-eveneo-blue text-white rounded-xl font-medium"
              >
                Créer une commande
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => {
                const date = formatDate(event.date);
                return (
                  <Link
                    key={event.id}
                    to={`/event/${event.id}`}
                    className="block bg-gray-50 rounded-2xl p-4 active:scale-[0.98] transition-transform"
                  >
                    <div className="flex gap-4">
                      {/* Date badge */}
                      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-eveneo-blue to-eveneo-violet flex flex-col items-center justify-center text-white shrink-0">
                        <span className="text-xs font-bold uppercase">{date.month}</span>
                        <span className="text-2xl font-bold">{date.day}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-gray-900 truncate">
                            {event.name}
                          </h3>
                          {getStatusBadge(event.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {formatPrice(event.total_cost)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {date.full}
                        </p>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center">
                        <ChevronRight size={20} className="text-gray-400" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg">Commandes publics</p>
            <p className="text-gray-400 text-sm mt-1">
              Bientôt disponible
            </p>
          </div>
        )}
      </main>

      {/* Navigation du bas */}
      <MobileBottomNav />
    </div>
  );
};
