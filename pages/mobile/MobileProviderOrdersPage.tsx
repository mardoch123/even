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
  CalendarCheck,
  MapPin,
  Users,
  DollarSign,
  MessageSquare,
  Phone,
  Filter,
  Search
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { eventService } from '../../services/eventService';
import { messageService } from '../../services/messageService';
import { supabase } from '../../services/supabaseClient';

interface Order {
  id: string;
  clientName: string;
  clientAvatar?: string;
  clientPhone?: string;
  eventName: string;
  eventType: string;
  date: string;
  time: string;
  guests: number;
  price: number;
  status: 'pending' | 'confirmed' | 'completed_by_provider' | 'validated_by_client' | 'declined';
  location: string;
  notes?: string;
  createdAt: string;
}

export const MobileProviderOrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [confirmedOrders, setConfirmedOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'confirmed' | 'completed'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch real event items for this provider
        const eventItems = await eventService.getEventItemsByProviderId(currentUser.id);
        
        // Get event details for each item
        const orders: Order[] = await Promise.all(
          eventItems.map(async (item) => {
            const event = await eventService.getEventById(item.event_id);
            const clientProfile = await supabase
              .from('profiles')
              .select('full_name, avatar_url, phone')
              .eq('id', event?.client_id)
              .single();
            
            return {
              id: item.id,
              clientName: clientProfile.data?.full_name || (event as any)?.client_name || 'Client',
              clientAvatar: clientProfile.data?.avatar_url || (event as any)?.client_avatar,
              clientPhone: clientProfile.data?.phone,
              eventName: event?.name || 'Événement',
              eventType: (event as any)?.event_type || 'Mariage',
              date: item.service_start_at ? new Date(item.service_start_at).toLocaleDateString('fr-FR') : '-',
              time: item.service_start_at ? new Date(item.service_start_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '-',
              guests: (event as any)?.guest_count || 50,
              price: item.price || 0,
              status: item.status as Order['status'],
              location: (event as any)?.location || 'Non spécifié',
              notes: (item as any)?.notes,
              createdAt: item.created_at || new Date().toISOString()
            };
          })
        );
        
        // Separate by status
        setPendingOrders(orders.filter(o => o.status === 'pending'));
        setConfirmedOrders(orders.filter(o => o.status === 'confirmed' || o.status === 'completed_by_provider'));
        setCompletedOrders(orders.filter(o => o.status === 'validated_by_client'));
      } catch (error) {
        console.error('Error fetching orders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [currentUser]);

  const handleAccept = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await eventService.updateEventItem(orderId, { status: 'confirmed' });
      
      // Move from pending to confirmed
      const acceptedOrder = pendingOrders.find(o => o.id === orderId);
      if (acceptedOrder) {
        setPendingOrders(prev => prev.filter(o => o.id !== orderId));
        setConfirmedOrders(prev => [...prev, { ...acceptedOrder, status: 'confirmed' }]);
      }
      
      // Send notification to client
      const orderToNotify = pendingOrders.find(o => o.id === orderId);
      if (orderToNotify) {
        // Would send notification here
      }
    } catch (error) {
      console.error('Error accepting order:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await eventService.deleteEventItem(orderId);
      setPendingOrders(prev => prev.filter(o => o.id !== orderId));
    } catch (error) {
      console.error('Error declining order:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleComplete = async (orderId: string) => {
    setProcessingId(orderId);
    try {
      await eventService.updateEventItem(orderId, { status: 'completed_by_provider' });
      
      const order = confirmedOrders.find(o => o.id === orderId);
      if (order) {
        setConfirmedOrders(prev => prev.filter(o => o.id !== orderId));
        setCompletedOrders(prev => [...prev, { ...order, status: 'completed_by_provider' }]);
      }
    } catch (error) {
      console.error('Error completing order:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleContact = (clientId: string) => {
    navigate(`/messages?client=${clientId}`);
  };

  const getFilteredOrders = () => {
    let orders: Order[] = [];
    switch (activeTab) {
      case 'pending':
        orders = pendingOrders;
        break;
      case 'confirmed':
        orders = confirmedOrders;
        break;
      case 'completed':
        orders = completedOrders;
        break;
    }
    
    if (!searchQuery) return orders;
    
    return orders.filter(o => 
      o.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.eventName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const tabs = [
    { id: 'pending' as const, label: 'En attente', count: pendingOrders.length },
    { id: 'confirmed' as const, label: 'Confirmées', count: confirmedOrders.length },
    { id: 'completed' as const, label: 'Terminées', count: completedOrders.length }
  ];

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
            Mes commandes
          </h1>
          
          <div className="w-10" />
        </div>

        {/* Search */}
        <div className="relative mt-3">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Rechercher une commande..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
          />
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-4 border-b border-gray-200">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-eveneo-blue text-eveneo-blue'
                  : 'border-transparent text-gray-500'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id ? 'bg-eveneo-blue/10' : 'bg-gray-100'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-4">
        {loading ? (
          // Skeleton
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-20 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : getFilteredOrders().length === 0 ? (
          // Empty state
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              {activeTab === 'pending' ? (
                <CalendarX size={32} className="text-gray-400" />
              ) : activeTab === 'confirmed' ? (
                <CalendarCheck size={32} className="text-gray-400" />
              ) : (
                <CheckCircle size={32} className="text-gray-400" />
              )}
            </div>
            <p className="text-gray-900 font-medium">
              {activeTab === 'pending' && 'Aucune commande en attente'}
              {activeTab === 'confirmed' && 'Aucune commande confirmée'}
              {activeTab === 'completed' && 'Aucune commande terminée'}
            </p>
            <p className="text-gray-500 text-sm mt-1">
              {activeTab === 'pending' && 'Les nouvelles demandes apparaîtront ici'}
              {activeTab === 'confirmed' && 'Vos commandes confirmées apparaîtront ici'}
              {activeTab === 'completed' && 'Vos commandes terminées apparaîtront ici'}
            </p>
          </div>
        ) : (
          // Orders list
          <div className="space-y-4">
            {getFilteredOrders().map((order) => (
              <div key={order.id} className="bg-white rounded-2xl p-4 shadow-sm">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white font-bold">
                      {order.clientAvatar ? (
                        <img src={order.clientAvatar} alt={order.clientName} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        order.clientName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{order.clientName}</h3>
                      <p className="text-sm text-gray-500">{order.eventType}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    order.status === 'pending' ? 'bg-orange-100 text-orange-700' :
                    order.status === 'confirmed' || order.status === 'completed_by_provider' ? 'bg-green-100 text-green-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {order.status === 'pending' && 'En attente'}
                    {order.status === 'confirmed' && 'Confirmée'}
                    {order.status === 'completed_by_provider' && 'Réalisée'}
                    {order.status === 'validated_by_client' && 'Validée'}
                  </span>
                </div>

                {/* Event details */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3">
                  <h4 className="font-medium text-gray-900 mb-2">{order.eventName}</h4>
                  <div className="space-y-1.5 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span>{order.date} à {order.time}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-gray-400" />
                      <span>{order.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-gray-400" />
                      <span>{order.guests} invités</span>
                    </div>
                    {order.notes && (
                      <div className="flex items-start gap-2 mt-2 pt-2 border-t border-gray-200">
                        <span className="text-gray-500">Notes:</span>
                        <span className="text-gray-700">{order.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price and actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <DollarSign size={18} className="text-eveneo-violet" />
                    <span className="text-lg font-bold text-gray-900">{formatPrice(order.price)}</span>
                  </div>

                  {/* Action buttons based on status */}
                  <div className="flex gap-2">
                    {order.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDecline(order.id)}
                          disabled={processingId === order.id}
                          className="px-4 py-2 border border-gray-300 rounded-xl font-medium text-gray-700 active:scale-95 transition-transform disabled:opacity-50"
                        >
                          {processingId === order.id ? '...' : 'Refuser'}
                        </button>
                        <button
                          onClick={() => handleAccept(order.id)}
                          disabled={processingId === order.id}
                          className="px-4 py-2 bg-eveneo-blue text-white rounded-xl font-medium active:scale-95 transition-transform disabled:opacity-50"
                        >
                          {processingId === order.id ? '...' : 'Accepter'}
                        </button>
                      </>
                    )}
                    
                    {order.status === 'confirmed' && (
                      <>
                        <button
                          onClick={() => handleContact(order.id)}
                          className="p-2 border border-gray-300 rounded-xl text-gray-600 active:scale-95 transition-transform"
                        >
                          <MessageSquare size={18} />
                        </button>
                        <button
                          onClick={() => handleComplete(order.id)}
                          disabled={processingId === order.id}
                          className="px-4 py-2 bg-green-500 text-white rounded-xl font-medium active:scale-95 transition-transform disabled:opacity-50"
                        >
                          {processingId === order.id ? '...' : 'Terminer'}
                        </button>
                      </>
                    )}
                    
                    {(order.status === 'completed_by_provider' || order.status === 'validated_by_client') && (
                      <button
                        onClick={() => navigate(`/event/${order.id}`)}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium active:scale-95 transition-transform"
                      >
                        Détails
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
