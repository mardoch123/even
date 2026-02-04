
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Search, Filter, ArrowRight, CheckCircle, Clock, Play, Flag } from 'lucide-react';
import { Button } from '../components/Button';
import { useCurrency } from '../contexts/CurrencyContext';
import { useAuth } from '../contexts/AuthContext';
import { eventService, Event as EveneoEvent } from '../services/eventService';

export const EventsPage: React.FC = () => {
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [events, setEvents] = useState<EveneoEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      if (!currentUser) return;
      setIsLoading(true);
      try {
        const data = await eventService.getEventsByClientId(currentUser.id);
        setEvents(data);
      } finally {
        setIsLoading(false);
      }
    };
    void fetch();
  }, [currentUser]);

  const filteredEvents = useMemo(() => {
    return events.filter(evt => {
      const matchesSearch = evt.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || evt.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'confirmed': return <span className="bg-green-100 text-green-700 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle size={12} /> Payé</span>;
        case 'draft': return <span className="bg-gray-100 text-gray-600 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1"><Clock size={12} /> Brouillon</span>;
        case 'started': return <span className="bg-blue-100 text-blue-700 px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1"><Play size={12} /> En cours</span>;
        case 'completed': return <span className="bg-gray-800 text-white px-2 py-1 text-xs font-bold rounded-full flex items-center gap-1"><Flag size={12} /> Terminé</span>;
        default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
            <div>
                <h1 className="text-3xl font-bold text-eveneo-dark">Mes Événements</h1>
                <p className="text-gray-500">Retrouvez l'historique de toutes vos réservations.</p>
            </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Rechercher un événement..." 
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            
            <div className="flex items-center gap-2 overflow-x-auto">
                <Filter size={18} className="text-gray-400 shrink-0" />
                {['all', 'draft', 'confirmed', 'completed'].map((status) => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                            statusFilter === status 
                            ? 'bg-eveneo-dark text-white' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                        {status === 'all' ? 'Tous' : (status || '').charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>
        </div>

        {/* Events Grid */}
        <div className="grid grid-cols-1 gap-4">
            {filteredEvents.length > 0 ? (
                filteredEvents.map(evt => (
                    <div key={evt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-6 flex-grow">
                            <div className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg shrink-0 ${
                                evt.status === 'draft' ? 'bg-gray-400' : 'bg-eveneo-gradient'
                            }`}>
                                <span className="text-xs font-bold uppercase">{new Date(evt.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-2xl font-bold">{new Date(evt.date).getDate()}</span>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-bold text-gray-900">{evt.name}</h3>
                                    {getStatusBadge(evt.status)}
                                </div>
                                <p className="text-gray-500 text-sm flex items-center gap-4">
                                    <span>Total: {formatPrice(evt.total_cost)}</span>
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Link to={`/event/${evt.id}`} className="w-full md:w-auto">
                                <Button variant="secondary" fullWidth>
                                    Voir <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                ))
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
