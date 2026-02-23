import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Grid3X3, 
  SlidersHorizontal,
  Users,
  Star,
  BadgeCheck,
  X
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { MobileOverlayLoader } from '../../components/MobileLoader';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { providerService } from '../../services/providerService';
import { ServiceProvider } from '../../types';
import { adsService, AdCampaign } from '../../services/adsService';

// Catégories pour les filtres
const categories = [
  { key: 'all', label: 'Tous' },
  { key: 'photographer', label: 'Photographe' },
  { key: 'caterer', label: 'Traiteur' },
  { key: 'musician', label: 'Musicien' },
  { key: 'dj', label: 'DJ' },
  { key: 'venue', label: 'Lieu' },
  { key: 'decorator', label: 'Décorateur' },
  { key: 'security', label: 'Sécurité' },
];

interface ProviderStats {
  total: number;
  premium: number;
  verified: number;
}

export const MobileSearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [providers, setProviders] = useState<ServiceProvider[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ServiceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [stats, setStats] = useState<ProviderStats>({ total: 0, premium: 0, verified: 0 });
  const [showFilters, setShowFilters] = useState(false);

  // Charger les données initiales
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await providerService.getProviders();
        setProviders(data);
        setFilteredProviders(data);
        
        // Calculer les statistiques
        const total = data.length;
        const premium = data.filter(p => p.details?.subscriptionPlan === 'pro' || p.details?.subscriptionPlan === 'business').length;
        const verified = data.filter(p => p.verified).length;
        setStats({ total, premium, verified });
      } catch (error) {
        console.error('Error fetching providers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Recherche dynamique
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0 && activeCategory === 'all') {
      setFilteredProviders(providers);
      return;
    }

    setSearching(true);
    try {
      const categoryFilter = activeCategory === 'all' ? '' : activeCategory;
      const results = await providerService.searchProviders(query, categoryFilter, '');
      setFilteredProviders(results);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  }, [providers, activeCategory]);

  // Filtrer par catégorie
  const handleCategoryChange = async (categoryKey: string) => {
    setActiveCategory(categoryKey);
    
    setSearching(true);
    try {
      const categoryFilter = categoryKey === 'all' ? '' : categoryKey;
      const results = await providerService.searchProviders(searchQuery, categoryFilter, '');
      setFilteredProviders(results);
    } catch (error) {
      console.error('Category filter error:', error);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return <MobileOverlayLoader message="Chargement des prestataires..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 flex items-center justify-between sticky top-0 z-40 safe-area-top shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Meilleurs prestataires</h1>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <Grid3X3 size={20} className="text-gray-700" />
          </button>
          <button 
            onClick={() => setShowFilters(true)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <SlidersHorizontal size={20} className="text-gray-700" />
          </button>
        </div>
      </header>

      <main className="px-4 pt-4">
        {/* Carte statistiques */}
        <div className="bg-gradient-to-r from-eveneo-blue to-blue-500 rounded-2xl p-5 text-white shadow-lg">
          <h2 className="text-lg font-semibold mb-4">Statistiques des prestataires</h2>
          <div className="flex items-center justify-around">
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Users size={20} />
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-sm text-white/80">Total</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                <Star size={20} />
              </div>
              <p className="text-2xl font-bold">{stats.premium}</p>
              <p className="text-sm text-white/80">Premium</p>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mx-auto mb-2">
                <BadgeCheck size={20} />
              </div>
              <p className="text-2xl font-bold">{stats.verified}</p>
              <p className="text-sm text-white/80">Vérifiés</p>
            </div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Rechercher un prestataire..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-12 pr-10 py-4 bg-white rounded-2xl border border-gray-100 shadow-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-eveneo-blue focus:ring-2 focus:ring-eveneo-blue/20"
            />
            {searching && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-eveneo-blue border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            {searchQuery && !searching && (
              <button
                onClick={() => handleSearch('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Filtres par catégorie */}
        <div className="mt-4 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.key
                    ? 'bg-eveneo-blue text-white shadow-md'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-eveneo-blue/50'
                }`}
              >
                {activeCategory === cat.key && (
                  <span className="mr-1">✓</span>
                )}
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Résultats */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-gray-600">
              <span className="font-bold text-eveneo-blue">{filteredProviders.length}</span> prestataire{filteredProviders.length > 1 ? 's' : ''} trouvé{filteredProviders.length > 1 ? 's' : ''}
            </p>
            <button className="px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-full flex items-center gap-1">
              <Star size={14} fill="currentColor" />
              Top prestataires
            </button>
          </div>

          {/* Liste des prestataires */}
          {filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-gray-400" />
              </div>
              <p className="text-gray-500 text-lg">Aucun prestataire trouvé</p>
              <p className="text-gray-400 text-sm mt-1">Essayez avec d'autres critères</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProviders.map((provider) => (
                <Link
                  key={provider.id}
                  to={`/provider/${provider.id}`}
                  className="block bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform"
                >
                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-gray-100">
                      <img
                        src={provider.imageUrl}
                        alt={provider.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 truncate">{provider.name}</h3>
                          <p className="text-sm text-gray-500">{provider.category}</p>
                        </div>
                        {provider.verified && (
                          <BadgeCheck size={18} className="text-eveneo-blue shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star size={14} className="text-amber-400" fill="currentColor" />
                        <span className="text-sm font-medium">{provider.rating.toFixed(1)}</span>
                        <span className="text-xs text-gray-400">({provider.reviewCount})</span>
                      </div>
                      <p className="text-eveneo-blue font-semibold mt-1">
                        {formatPrice(provider.priceValue)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1 truncate">{provider.location}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modal filtres avancés */}
      {showFilters && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Filtres</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Prix maximum</label>
                  <input
                    type="range"
                    min="0"
                    max="5000"
                    step="100"
                    className="w-full accent-eveneo-blue"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0€</span>
                    <span>5000€+</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Note minimum</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center hover:border-eveneo-blue transition-colors"
                      >
                        <Star size={16} className="text-amber-400" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Localisation</label>
                  <input
                    type="text"
                    placeholder="Ville ou code postal"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-eveneo-blue"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => setShowFilters(false)}
                className="w-full py-3 bg-eveneo-blue text-white font-medium rounded-xl"
              >
                Appliquer les filtres
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
