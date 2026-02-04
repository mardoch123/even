import React, { useState, useEffect } from 'react';
import { Calendar, CreditCard, Search, MapPin, Filter, DollarSign, Lock, Loader, MessageSquare, ShoppingBag } from 'lucide-react';
import { Button } from '../components/Button';
import { Link, useNavigate } from 'react-router-dom';
import { ServiceCard } from '../components/ServiceCard';
import { useCurrency } from '../contexts/CurrencyContext';
import { adsService } from '../services/adsService';
import { useAuth } from '../contexts/AuthContext';
import { providerService } from '../services/providerService';
import { eventService, Event as EveneoEvent } from '../services/eventService';
import { messageService } from '../services/messageService';
import { ServiceProvider } from '../types';

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { currentUser } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState<number | null>(null);
  const [filterDate, setFilterDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Wallet State for Client
  const [walletBalance, setWalletBalance] = useState(0);

  // Ads State
  const [activeCampaigns, setActiveCampaigns] = useState<any[]>([]);

  // Blocked Dates (Options)
  const [myBlockedDates, setMyBlockedDates] = useState<any[]>([]);

  // Real Data
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [myEvents, setMyEvents] = useState<EveneoEvent[]>([]);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);

  useEffect(() => {
    const balance = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
    setWalletBalance(balance);

    // Load active campaigns
    const campaigns = adsService.getCampaigns().filter(c => c.status === 'active');
    setActiveCampaigns(campaigns);

    // Load my blocked dates
    const allBlocks = JSON.parse(localStorage.getItem('eveneo_blocked_dates') || '[]');
    if (currentUser) {
      setMyBlockedDates(allBlocks.filter((b: any) => b.clientId === currentUser.id));
    }

    // Fetch Real Providers
    const fetchProviders = async () => {
      setLoadingProviders(true);
      try {
        const data = await providerService.getProviders();
        setProviders(data);
      } catch (error) {
        console.error("Failed to fetch providers:", error);
      } finally {
        setLoadingProviders(false);
      }
    };
    fetchProviders();

    // Fetch Real User Data (Events & Messages)
    if (currentUser) {
      const fetchUserData = async () => {
        try {
          const events = await eventService.getEventsByClientId(currentUser.id);
          setMyEvents(events);

          const unread = await messageService.getUnreadCount(currentUser.id);
          setUnreadMessagesCount(unread);
        } catch (error) {
          console.error("Failed to fetch user data:", error);
        }
      };
      fetchUserData();
    }

  }, [currentUser]);

  const openAssistant = () => {
    window.dispatchEvent(new Event('open-eva-chat'));
  };

  // Filter & Sort logic with Sponsorship Priority
  const filteredRecommendations = providers
    .filter(item => {
      const matchQuery = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchLocation = filterLocation ? item.location.toLowerCase().includes(filterLocation.toLowerCase()) : true;

      const matchPrice = filterPriceMax ? (item.priceValue || 0) <= filterPriceMax : true;

      const matchDate = filterDate ? true : true; // Date filtering would require checking availability

      return matchQuery && matchLocation && matchPrice && matchDate;
    })
    .sort((a, b) => {
      const isASponsored = activeCampaigns.some(c => c.providerId === a.id);
      const isBSponsored = activeCampaigns.some(c => c.providerId === b.id);

      if (isASponsored && !isBSponsored) return -1;
      if (!isASponsored && isBSponsored) return 1;
      return (b.rating || 0) - (a.rating || 0);
    });

  return (
    <div className="min-h-screen bg-gray-50 pt-20 md:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-eveneo-dark">Bonjour, {currentUser?.name || 'Vous'} 👋</h1>
            <p className="text-gray-500">Voici un aperçu de votre activité.</p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-8">
          <Link to="/messages" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-eveneo-pink/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-pink-100 text-eveneo-pink flex items-center justify-center shrink-0">
              <MessageSquare size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Messages non lus</p>
              <p className="text-2xl font-bold text-gray-900">{unreadMessagesCount}</p>
            </div>
          </Link>

          <Link to="/orders" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-eveneo-blue/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-eveneo-blue flex items-center justify-center shrink-0">
              <ShoppingBag size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Commandes</p>
              <p className="text-2xl font-bold text-gray-900">{myEvents.length}</p>
            </div>
          </Link>

          <Link to="/wallet" className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:border-eveneo-orange/30 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-orange-100 text-eveneo-orange flex items-center justify-center shrink-0">
              <CreditCard size={24} />
            </div>
            <div>
              <p className="text-gray-500 text-sm font-medium">Portefeuille</p>
              <p className="text-2xl font-bold text-gray-900">{formatPrice(walletBalance)}</p>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content - Options */}
          <div className="lg:col-span-2 space-y-6">

            {/* Mes commandes */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h2 className="text-lg font-extrabold text-gray-900">Mes commandes</h2>
                  <p className="text-sm text-gray-500">Retrouvez vos réservations et gérez les annulations.</p>
                </div>
                <Link to="/orders">
                  <Button variant="ghost" className="text-eveneo-violet">Tout voir</Button>
                </Link>
              </div>

              {myEvents.length > 0 ? (
                <div className="space-y-3">
                  {myEvents.slice(0, 5).map(evt => (
                    <div key={evt.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/40">
                      <div>
                        <p className="font-bold text-gray-900">{evt.name}</p>
                        <p className="text-xs text-gray-500">Date : {evt.date}</p>
                      </div>
                      <Link to={`/event/${evt.id}`} className="w-full sm:w-auto">
                        <Button variant="secondary" fullWidth>Voir / Annuler</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
                  <p className="font-bold text-gray-700">Aucune commande pour le moment</p>
                  <p className="text-sm text-gray-500 mt-1">Après paiement, ta commande apparaîtra ici.</p>
                </div>
              )}
            </div>

            {/* NEW: ACTIVE OPTIONS / BLOCKED DATES */}
            {myBlockedDates.length > 0 && (
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Lock className="text-blue-600" size={20} />
                  <h2 className="text-lg font-bold text-blue-900">Mes Options en cours</h2>
                </div>
                <div className="space-y-3">
                  {myBlockedDates.map((block: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-800">Option posée (Prestataire {block.providerId})</p>
                        <p className="text-sm text-gray-500">Du {block.startDate} au {block.endDate}</p>
                      </div>
                      <Link to={`/provider/${block.providerId}`}>
                        <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                          Voir / Confirmer
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>

          {/* Sidebar - Suggestions */}
          <div className="space-y-6">
            <div className="bg-eveneo-dark text-white rounded-2xl shadow-lg p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-eveneo-gradient opacity-20 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <h3 className="font-bold mb-2 z-10 relative">Besoin d'inspiration ?</h3>
              <p className="text-sm text-gray-300 mb-4 z-10 relative">Demandez à Éva, notre assistante intelligente.</p>
              <Button
                variant="secondary"
                size="sm"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 z-10 relative"
                onClick={openAssistant}
              >
                Ouvrir le chat
              </Button>
            </div>
          </div>
        </div>

        {/* 4. Recherche & Découverte Module */}
        <div className="border-t border-gray-200 pt-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-2">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">Recherche & Découverte</h2>
              <p className="text-gray-500">Explorez nos prestataires pour votre prochain événement.</p>
            </div>
            <Link to="/search">
              <Button variant="ghost" className="text-eveneo-violet">Voir tout</Button>
            </Link>
          </div>

          {/* Search Bar & Filters */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-8">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-grow relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Rechercher un service (ex: Traiteur bio)"
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 rounded-xl focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button variant="secondary" onClick={() => setShowFilters(!showFilters)} className="shrink-0">
                <Filter size={18} className="mr-2" /> Filtres
              </Button>
            </div>

            {/* Advanced Filters Area */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-50 animate-in fade-in">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Localisation</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Ville..."
                      className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-eveneo-violet"
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="date"
                      className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-eveneo-violet"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Prix Max</label>
                  <div className="relative">
                    <DollarSign size={16} className="absolute left-3 top-3 text-gray-400" />
                    <input
                      type="number"
                      placeholder="Budget max"
                      className="w-full pl-9 p-2 bg-gray-50 rounded-lg text-sm border border-gray-200 focus:outline-none focus:border-eveneo-violet"
                      value={filterPriceMax || ''}
                      onChange={(e) => setFilterPriceMax(e.target.value ? Number(e.target.value) : null)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Grid */}
          {loadingProviders ? (
            <div className="flex justify-center items-center py-20">
              <Loader className="animate-spin text-eveneo-violet" size={40} />
            </div>
          ) : filteredRecommendations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRecommendations.map(provider => {
                const isSponsored = activeCampaigns.some(c => c.providerId === provider.id);
                return (
                  <ServiceCard
                    key={provider.id}
                    provider={{ ...provider, priceRange: formatPrice(provider.priceValue) }}
                    isSponsored={isSponsored}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Aucun résultat ne correspond à vos filtres.
            </div>
          )}

          <p className="text-center text-xs text-gray-400 mt-6">
            ⚡ Pertinence calculée par IA.
          </p>
        </div>
      </div>
    </div>
  );
};
