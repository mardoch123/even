import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, Filter, ArrowRight, CheckCircle, Clock, Play, Flag } from 'lucide-react';
import { Button } from '../components/Button';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { eventService, Event as EveneoEvent } from '../services/eventService';

export const OrdersPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [orders, setOrders] = useState<EveneoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const data = await eventService.getEventsByClientId(currentUser.id);
        setOrders(data);
      } finally {
        setIsLoading(false);
      }
    };
    void fetch();
  }, [currentUser]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    const total = orders.length;
    const confirmed = orders.filter(o => o.status === 'confirmed').length;
    const started = orders.filter(o => o.status === 'started').length;
    const completed = orders.filter(o => o.status === 'completed' || o.status === 'ended').length;
    const cancelled = orders.filter(o => o.status === 'cancelled_refunded').length;
    return { total, confirmed, started, completed, cancelled };
  }, [orders]);

  const now = useMemo(() => new Date(), []);
  const upcomingOrders = useMemo(() => {
    return filteredOrders
      .filter(o => {
        const d = new Date(o.date);
        if (Number.isNaN(d.getTime())) return true;
        return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredOrders, now]);

  const pastOrders = useMemo(() => {
    return filteredOrders
      .filter(o => {
        const d = new Date(o.date);
        if (Number.isNaN(d.getTime())) return false;
        return d < new Date(now.getFullYear(), now.getMonth(), now.getDate());
      })
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredOrders, now]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="bg-green-100 text-green-700 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <CheckCircle size={12} /> Confirmée
          </span>
        );
      case 'draft':
        return (
          <span className="bg-gray-100 text-gray-600 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <Clock size={12} /> Brouillon
          </span>
        );
      case 'started':
        return (
          <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <Play size={12} /> En cours
          </span>
        );
      case 'ended':
        return (
          <span className="bg-indigo-100 text-indigo-700 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <Flag size={12} /> Terminée
          </span>
        );
      case 'completed':
        return (
          <span className="bg-gray-800 text-white px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1">
            <Flag size={12} /> Terminée
          </span>
        );
      case 'cancelled_refunded':
        return (
          <span className="bg-gray-200 text-gray-600 px-2 py-1 text-xs font-bold rounded-full">
            Annulée
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-eveneo-dark">Mes Commandes</h1>
            <p className="text-gray-500">Retrouvez l'historique de toutes vos réservations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Total</p>
            <p className="text-2xl font-extrabold text-eveneo-dark mt-1">{summary.total}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Confirmées</p>
            <p className="text-2xl font-extrabold text-green-700 mt-1">{summary.confirmed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">En cours</p>
            <p className="text-2xl font-extrabold text-blue-700 mt-1">{summary.started}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Terminées</p>
            <p className="text-2xl font-extrabold text-gray-800 mt-1">{summary.completed}</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase">Annulées</p>
            <p className="text-2xl font-extrabold text-gray-500 mt-1">{summary.cancelled}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une commande..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            <Filter size={18} className="text-gray-400 shrink-0" />
            {['all', 'draft', 'confirmed', 'started', 'cancelled_refunded', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  statusFilter === status
                    ? 'bg-eveneo-dark text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all'
                  ? 'Tous'
                  : status === 'cancelled_refunded'
                    ? 'Annulées'
                    : status === 'started'
                      ? 'En cours'
                    : (status || '').charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          {(upcomingOrders.length > 0 || pastOrders.length > 0) ? (
            <>
              {upcomingOrders.length > 0 && (
                <div>
                  <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wide mb-3">À venir</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {upcomingOrders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-6 flex-grow">
                          <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0 bg-eveneo-gradient">
                            <span className="text-xs font-bold uppercase">{new Date(o.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-bold">{new Date(o.date).getDate()}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-bold text-gray-900 truncate">{o.name}</h3>
                              {getStatusBadge(o.status)}
                            </div>
                            <p className="text-gray-500 text-sm">Total: {formatPrice(o.total_cost)}</p>
                            <p className="text-xs text-gray-400 mt-1">Date: {o.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <Link to={`/event/${o.id}`} className="w-full md:w-auto">
                            <Button variant="secondary" fullWidth>
                              Détails <ArrowRight size={16} className="ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {pastOrders.length > 0 && (
                <div>
                  <h2 className="text-sm font-extrabold text-gray-700 uppercase tracking-wide mb-3">Passées</h2>
                  <div className="grid grid-cols-1 gap-4">
                    {pastOrders.map((o) => (
                      <div
                        key={o.id}
                        className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-6 flex-grow">
                          <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0 bg-eveneo-gradient">
                            <span className="text-xs font-bold uppercase">{new Date(o.date).toLocaleString('default', { month: 'short' })}</span>
                            <span className="text-2xl font-bold">{new Date(o.date).getDate()}</span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="text-lg font-bold text-gray-900 truncate">{o.name}</h3>
                              {getStatusBadge(o.status)}
                            </div>
                            <p className="text-gray-500 text-sm">Total: {formatPrice(o.total_cost)}</p>
                            <p className="text-xs text-gray-400 mt-1">Date: {o.date}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                          <Link to={`/event/${o.id}`} className="w-full md:w-auto">
                            <Button variant="secondary" fullWidth>
                              Voir <ArrowRight size={16} className="ml-2" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl">
              <Calendar size={48} className="mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-600">{isLoading ? 'Chargement...' : 'Aucune commande trouvée'}</h3>
              <p className="text-gray-400">{isLoading ? 'Veuillez patienter.' : 'Vos réservations apparaîtront ici après paiement.'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
