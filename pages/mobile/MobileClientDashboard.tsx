import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, ChevronDown, Camera, UtensilsCrossed, Music, Palette, Sparkles, X } from 'lucide-react';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { providerService } from '../../services/providerService';
import { eventService, Event as EveneoEvent } from '../../services/eventService';
import { messageService } from '../../services/messageService';
import { ServiceProvider } from '../../types';
import { MobileOverlayLoader } from '../../components/MobileLoader';

// Catégories avec icônes
const categories = [
  { key: 'photographer', label: 'Photographe', icon: Camera, color: 'bg-blue-100 text-blue-600' },
  { key: 'caterer', label: 'Traiteurs', icon: UtensilsCrossed, color: 'bg-green-100 text-green-600' },
  { key: 'musician', label: 'Musiciens', icon: Music, color: 'bg-purple-100 text-purple-600' },
  { key: 'decorator', label: 'Décorateur', icon: Palette, color: 'bg-orange-100 text-orange-600' },
];

export const MobileClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [availableLocations, setAvailableLocations] = useState<string[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [myEvents, setMyEvents] = useState<EveneoEvent[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all providers
        const data = await providerService.getProviders();
        setProviders(data);
        setFilteredProviders(data.slice(0, 4)); // Top 4 pour suggestions

        // Fetch unique locations
        const locations = await providerService.getUniqueLocations();
        setAvailableLocations(locations);
        // Définir la première location comme défaut ou une valeur par défaut
        if (locations.length > 0 && !location) {
          setLocation(locations[0]);
        } else if (!location) {
          setLocation('Montréal, Canada');
        }

        // Fetch user events
        if (currentUser) {
          const events = await eventService.getEventsByClientId(currentUser.id);
          setMyEvents(events);

          // Fetch unread messages
          const unread = await messageService.getUnreadCount(currentUser.id);
          setUnreadMessages(unread);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // Recherche dynamique
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      // Réinitialiser aux suggestions par défaut
      setFilteredProviders(providers.slice(0, 4));
      return;
    }

    setSearching(true);
    try {
      const results = await providerService.searchProviders(query, '', location);
      setFilteredProviders(results.slice(0, 10)); // Limiter à 10 résultats
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  }, [providers, location]);

  // Soumission du formulaire de recherche
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`);
    }
  };

  // Changer de location
  const handleLocationChange = async (newLocation: string) => {
    setLocation(newLocation);
    setShowLocationPicker(false);
    
    // Recharger les prestataires pour cette location
    try {
      const results = await providerService.searchProviders(searchQuery, '', newLocation);
      setFilteredProviders(results.slice(0, 10));
    } catch (error) {
      console.error("Location filter error:", error);
    }
  };

  const getFirstName = (fullName: string) => {
    return fullName?.split(' ')[0] || 'Vous';
  };

  if (loading) {
    return <MobileOverlayLoader message="Chargement..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <MobileHeader 
        unreadCount={unreadNotifications}
        onNotificationClick={() => navigate('/notifications')}
      />

      {/* Contenu principal */}
      <main className="pt-16 px-4">
        {/* Carte de bienvenue */}
        <div className="mt-4 bg-gradient-to-r from-eveneo-blue via-eveneo-violet to-eveneo-orange rounded-3xl p-6 text-white relative overflow-hidden shadow-lg shadow-eveneo-violet/20">
          {/* Éléments décoratifs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
          <div className="absolute bottom-0 right-10 w-16 h-16 bg-white/10 rounded-full" />
          
          {/* Icône décorative */}
          <div className="absolute top-4 right-4">
            <Sparkles className="text-white/40" size={40} />
          </div>

          <div className="relative z-10">
            <h1 className="text-2xl font-bold mb-1">
              Bonjour {getFirstName(currentUser?.name || '')} {currentUser?.name?.split(' ').slice(1).join(' ') || ''} ! 👋
            </h1>
            <p className="text-white/80 text-sm mb-4">
              Trouvez les meilleurs prestataires pour vos besoins
            </p>

            {/* Localisation */}
            <button 
              onClick={() => setShowLocationPicker(true)}
              className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-medium active:scale-95 transition-transform"
            >
              <MapPin size={16} />
              {location || 'Choisir une ville'}
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Barre de recherche */}
        <form onSubmit={handleSearchSubmit} className="mt-6">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Rechercher un prestataire..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-eveneo-violet focus:ring-2 focus:ring-eveneo-violet/20"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-eveneo-violet border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {searchQuery && !searching && (
              <button
                type="button"
                onClick={() => handleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </form>



        {/* Suggestions de catégories */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Suggestions</h2>
            <Link to="/categories" className="text-eveneo-violet text-sm font-medium">
              Voir tout
            </Link>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.key}
                  to={`/search?category=${cat.label}`}
                  className="flex flex-col items-center"
                >
                  <div className={`w-14 h-14 rounded-2xl ${cat.color} flex items-center justify-center mb-2`}>
                    <Icon size={24} />
                  </div>
                  <span className="text-xs text-gray-600 text-center font-medium">
                    {cat.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Prestataires populaires / Résultats de recherche */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              {searchQuery ? 'Résultats' : 'Populaires'}
            </h2>
            <Link to="/search" className="text-eveneo-violet text-sm font-medium">
              Voir tout
            </Link>
          </div>
          
          {filteredProviders.length === 0 && searchQuery && (
            <div className="text-center py-8 text-gray-500">
              <p>Aucun prestataire trouvé pour "{searchQuery}"</p>
              <p className="text-sm mt-1">Essayez avec d'autres termes</p>
            </div>
          )}
          
          <div className="space-y-4">
            {filteredProviders.map((provider) => (
              <Link
                key={provider.id}
                to={`/provider/${provider.id}`}
                className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0">
                    <img
                      src={provider.imageUrl}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{provider.name}</h3>
                    <p className="text-sm text-gray-500">{provider.category}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-amber-400">★</span>
                      <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({provider.reviewCount})</span>
                    </div>
                    <p className="text-eveneo-violet font-semibold mt-1">
                      {formatPrice(provider.priceValue)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Mes réservations récentes */}
        {myEvents.length > 0 && (
          <div className="mt-8 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Mes réservations</h2>
              <Link to="/orders" className="text-eveneo-violet text-sm font-medium">
                Voir tout
              </Link>
            </div>
            
            <div className="space-y-3">
              {myEvents.slice(0, 3).map((event) => (
                <Link
                  key={event.id}
                  to={`/event/${event.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-500">{event.date}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.status === 'confirmed' 
                        ? 'bg-green-100 text-green-700'
                        : event.status === 'draft'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {event.status === 'confirmed' ? 'Confirmé' : event.status === 'draft' ? 'Brouillon' : 'En cours'}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Navigation du bas */}
      <MobileBottomNav />

      {/* Modal de sélection de location */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl max-h-[70vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Choisir une ville</h3>
              <button 
                onClick={() => setShowLocationPicker(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[50vh]">
              {availableLocations.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MapPin size={32} className="mx-auto mb-2 text-gray-300" />
                  <p>Aucune ville disponible</p>
                </div>
              ) : (
                <div className="py-2">
                  {availableLocations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => handleLocationChange(loc)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between hover:bg-gray-50 transition-colors ${
                        location === loc ? 'bg-eveneo-violet/5 text-eveneo-violet' : 'text-gray-700'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <MapPin size={18} className={location === loc ? 'text-eveneo-violet' : 'text-gray-400'} />
                        {loc}
                      </span>
                      {location === loc && (
                        <div className="w-2 h-2 rounded-full bg-eveneo-violet" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
