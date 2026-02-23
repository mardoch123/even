import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  CalendarX,
  CalendarCheck
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { eventService } from '../../services/eventService';

interface BookingRequest {
  id: string;
  clientName: string;
  clientAvatar?: string;
  eventName: string;
  date: string;
  time: string;
  guests: number;
  price: number;
  status: 'pending' | 'confirmed' | 'declined';
  createdAt: string;
}

export const MobileProviderRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [pendingRequests, setPendingRequests] = useState<BookingRequest[]>([]);
  const [upcomingBookings, setUpcomingBookings] = useState<BookingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch real event items for this provider
        const eventItems = await eventService.getEventItemsByProviderId(currentUser.id);
        
        // Get event details for each item
        const requests: BookingRequest[] = await Promise.all(
          eventItems.map(async (item) => {
            const event = await eventService.getEventById(item.event_id);
            return {
              id: item.id,
              clientName: (event as any)?.client_name || 'Client',
              clientAvatar: (event as any)?.client_avatar,
              eventName: event?.name || 'Événement',
              date: item.service_start_at ? new Date(item.service_start_at).toLocaleDateString('fr-FR') : '-',
              time: item.service_start_at ? new Date(item.service_start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
              guests: 50, // Would need real guest count
              price: item.price || 0,
              status: item.status === 'pending' ? 'pending' : 
                      item.status === 'confirmed' || item.status === 'completed_by_provider' || item.status === 'validated_by_client' ? 'confirmed' : 'declined',
              createdAt: item.created_at || new Date().toISOString()
            };
          })
        );
        
        // Separate pending and confirmed
        setPendingRequests(requests.filter(r => r.status === 'pending'));
        setUpcomingBookings(requests.filter(r => r.status === 'confirmed'));
      } catch (error) {
        console.error('Error fetching requests:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRequests();
  }, [currentUser]);

  const handleAccept = async (requestId: string) => {
    try {
      await eventService.updateEventItem(requestId, { status: 'confirmed' });
      // Refresh data
      const request = pendingRequests.find(r => r.id === requestId);
      if (request) {
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
        setUpcomingBookings(prev => [...prev, { ...request, status: 'confirmed' }]);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleDecline = async (requestId: string) => {
    try {
      // Supprimer l'item car il n'y a pas de statut 'cancelled' pour event_items
      await eventService.deleteEventItem(requestId);
      setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    } catch (error) {
      console.error('Error declining request:', error);
    }
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
            Demandes
          </h1>
          
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Demandes en attente */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={20} className="text-eveneo-blue" />
              <h2 className="text-lg font-bold text-gray-900">Demandes de réservation</h2>
            </div>
            <span className="w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingRequests.length}
            </span>
          </div>

          {loading ? (
            // Skeleton
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : pendingRequests.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarX size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">Aucune demande en attente</p>
              <p className="text-gray-500 text-sm mt-1">
                Les nouvelles demandes de réservation apparaîtront ici
              </p>
            </div>
          ) : (
            // List of pending requests
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white font-bold">
                      {request.clientName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{request.clientName}</h3>
                      <p className="text-sm text-gray-500">{request.eventName}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {request.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {request.time}
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-eveneo-violet">
                      {formatPrice(request.price)}
                    </span>
                  </div>
                  
                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDecline(request.id)}
                      className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700 active:scale-95 transition-transform"
                    >
                      Refuser
                    </button>
                    <button
                      onClick={() => handleAccept(request.id)}
                      className="flex-1 py-2.5 bg-eveneo-blue text-white rounded-xl font-medium active:scale-95 transition-transform"
                    >
                      Accepter
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Prochaines réservations */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CalendarCheck size={20} className="text-green-600" />
              <h2 className="text-lg font-bold text-gray-900">Prochaines réservations</h2>
            </div>
            {upcomingBookings.length > 0 && (
              <button className="text-eveneo-blue font-medium text-sm">
                Voir tout
              </button>
            )}
          </div>

          {loading ? (
            // Skeleton
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : upcomingBookings.length === 0 ? (
            // Empty state
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CalendarCheck size={28} className="text-gray-400" />
              </div>
              <p className="text-gray-900 font-medium">Aucune réservation à venir</p>
              <p className="text-gray-500 text-sm mt-1">
                Vos prochaines réservations confirmées apparaîtront ici
              </p>
            </div>
          ) : (
            // List of upcoming bookings
            <div className="space-y-3">
              {upcomingBookings.slice(0, 3).map((booking) => (
                <div 
                  key={booking.id} 
                  onClick={() => navigate(`/event/${booking.id}`)}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl active:scale-95 transition-transform"
                >
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle size={20} className="text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{booking.clientName}</h3>
                    <p className="text-sm text-gray-500">{booking.date} · {booking.time}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
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
