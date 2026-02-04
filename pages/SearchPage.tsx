

import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ServiceCard } from '../components/ServiceCard';
import { Button } from '../components/Button';
import { ServiceProvider } from '../types';
import { Filter, MapPin, Search as SearchIcon, Calendar, DollarSign, Music, Utensils, Camera, User, Package } from 'lucide-react';
import { adsService, AdCampaign } from '../services/adsService';
import { providerService } from '../services/providerService';

// Configuration des Familles de Filtres Dynamiques
const FILTER_FAMILIES: Record<string, { trigger: string[], title: string, icon: any, filters: { key: string, label: string, options: string[] }[] }> = {
    'Ambiance': {
        trigger: ['DJ', 'Musiciens', 'Animation'],
        title: 'Ambiance & Animation',
        icon: Music,
        filters: [
            { key: 'musicStyles', label: 'Style Musical', options: ['Généraliste', 'Latino', 'Jazz', 'Electro', 'Rock'] },
            { key: 'equipmentIncluded', label: 'Matériel Inclus', options: ['Oui', 'Sonorisation', 'Éclairage', 'Non'] }
        ]
    },
    'Food': {
        trigger: ['Traiteur', 'Pâtissier', 'Barman'],
        title: 'Nourriture & Boisson',
        icon: Utensils,
        filters: [
            { key: 'dietaryOptions', label: 'Régime Alimentaire', options: ['Sans Gluten', 'Végétarien', 'Halal', 'Casher'] },
            { key: 'serviceType', label: 'Type de Service', options: ['Livraison', 'Buffet', 'Service à table'] }
        ]
    },
    'Visual': {
        trigger: ['Photographe', 'Vidéaste', 'Décoration'],
        title: 'Visuel & Souvenirs',
        icon: Camera,
        filters: [
            { key: 'photoStyle', label: 'Style Artistique', options: ['Naturel', 'Posé', 'Vintage', 'Corporatif'] },
            { key: 'deliveryTime', label: 'Délai Livraison', options: ['< 1 semaine', '< 1 mois'] }
        ]
    },
    'Staff': {
        trigger: ['Sécurité', 'Hôtesses', 'Coiffure', 'Maquillage'],
        title: 'Personnel & Beauté',
        icon: User,
        filters: [
            { key: 'experienceLevel', label: 'Niveau Expérience', options: ['Junior', 'Senior', 'Expert'] },
            { key: 'locationType', label: 'Lieu Prestation', options: ['À domicile', 'Sur lieu événement', 'En salon'] }
        ]
    },
    'Logistics': {
        trigger: ['Lieu', 'Location de matériel'],
        title: 'Logistique',
        icon: Package,
        filters: [
            { key: 'capacity', label: 'Capacité', options: ['0-50', '50-100', '100+'] },
            { key: 'outdoorSpace', label: 'Espace Extérieur', options: ['Oui', 'Non'] }
        ]
    }
};

const AdTracker: React.FC<{ campaignId: string, children: React.ReactNode }> = ({ campaignId, children }) => {
    const ref = useRef<HTMLDivElement>(null);
    const [hasTracked, setHasTracked] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && !hasTracked) {
                    adsService.trackImpression(campaignId);
                    setHasTracked(true);
                }
            },
            { threshold: 0.5 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) observer.unobserve(ref.current);
        };
    }, [campaignId, hasTracked]);

    return <div ref={ref}>{children}</div>;
};

export const SearchPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const initialCategory = searchParams.get('category') || 'Tous';

    const [searchTerm, setSearchTerm] = useState('');
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const [providers, setProviders] = useState<ServiceProvider[]>([]);
    const [loading, setLoading] = useState(true);

    // Universal Filters
    const [locationFilter, setLocationFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [budgetMax, setBudgetMax] = useState<number | ''>('');

    // Dynamic Filters State (Stores generic key-value pairs from JSONB)
    const [dynamicFilters, setDynamicFilters] = useState<Record<string, string>>({});

    const [sponsoredAds, setSponsoredAds] = useState<AdCampaign[]>([]);

    // Fetch Data from Supabase
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch organic providers from Supabase
                const fetchedProviders = await providerService.searchProviders(searchTerm, activeCategory, locationFilter);
                setProviders(fetchedProviders);

                // Fetch ads (Mock/Local for now)
                const ads = adsService.getRelevantAds(searchTerm, activeCategory, locationFilter);
                setSponsoredAds(ads);
            } catch (error) {
                console.error("Failed to fetch providers", error);
            } finally {
                setLoading(false);
            }
        };

        // Debounce search slightly to avoid too many requests
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, activeCategory, locationFilter]);

    useEffect(() => {
        const cat = searchParams.get('category');
        if (cat) setActiveCategory(cat);
    }, [searchParams]);

    // Identify current filter family based on active category
    const currentFamilyKey = Object.keys(FILTER_FAMILIES).find(key =>
        FILTER_FAMILIES[key].trigger.includes(activeCategory)
    );
    const currentFamily = currentFamilyKey ? FILTER_FAMILIES[currentFamilyKey] : null;

    // Client-side filtering for attributes not handled by Supabase query yet (Budget, Dynamic Details)
    const filteredProviders = providers.filter(p => {
        // 1. Budget Filter
        const matchesBudget = budgetMax === '' || p.priceValue <= budgetMax;

        // 2. Dynamic Attributes Filters (JSONB check)
        let matchesDynamic = true;
        if (currentFamily && p.details) {
            for (const [key, value] of Object.entries(dynamicFilters)) {
                if (value && value !== '') {
                    const providerVal = p.details[key];
                    if (Array.isArray(providerVal)) {
                        if (!providerVal.includes(value)) matchesDynamic = false;
                    } else if (providerVal !== value) {
                        matchesDynamic = false;
                    }
                }
            }
        }

        return matchesBudget && matchesDynamic;
    });

    const adProviders = sponsoredAds.map(ad => {
        const baseProvider = providers.find(p => p.id === ad.providerId) || {
            id: ad.providerId,
            name: ad.providerName,
            category: ad.providerCategory || 'Sponsorisé',
            rating: 5.0,
            reviewCount: 0,
            priceRange: 'Sur devis',
            priceValue: 0,
            priceUnit: 'event',
            imageUrl: ad.creative.customImage || 'https://picsum.photos/400/300',
            verified: true,
            location: ad.targetCountry
        };

        return {
            ...baseProvider,
            _campaignId: ad.id,
            _creative: ad.creative
        };
    });

    // Merge ads and organic results (avoiding duplicates if ad provider is also in organic list)
    const organicProviders = filteredProviders.filter(p => !adProviders.find(ad => ad.id === p.id));
    const displayList = [...adProviders, ...organicProviders];

    // Reset dynamic filters when category changes
    useEffect(() => {
        setDynamicFilters({});
    }, [activeCategory]);

    return (
        <div className="bg-eveneo-light min-h-screen pt-24 pb-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Header & Universal Search */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-eveneo-dark mb-6">Trouvez le prestataire idéal</h1>

                    {/* Universal Filters Bar */}
                    <div className="bg-white p-4 rounded-2xl shadow-md border border-gray-100 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Keyword */}
                            <div className="relative">
                                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Recherche..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-transparent focus:border-eveneo-violet focus:bg-white transition-all outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {/* Location */}
                            <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Ville ou CP"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-transparent focus:border-eveneo-violet focus:bg-white transition-all outline-none"
                                    value={locationFilter}
                                    onChange={(e) => setLocationFilter(e.target.value)}
                                />
                            </div>
                            {/* Date (Calendar First Logic) */}
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="date"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-transparent focus:border-eveneo-violet focus:bg-white transition-all outline-none text-gray-600"
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                />
                            </div>
                            {/* Budget */}
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="number"
                                    placeholder="Budget Max (€)"
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-xl border border-transparent focus:border-eveneo-violet focus:bg-white transition-all outline-none"
                                    value={budgetMax}
                                    onChange={(e) => setBudgetMax(e.target.value ? Number(e.target.value) : '')}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Categories Tags */}
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar mb-6">
                        {['Tous', 'Traiteur', 'DJ', 'Photographe', 'Lieu', 'Animation', 'Décoration', 'Sécurité'].map((tag) => (
                            <button
                                key={tag}
                                onClick={() => setActiveCategory(tag)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${activeCategory === tag
                                        ? 'bg-eveneo-dark text-white shadow-lg scale-105'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    {/* Dynamic Filters Panel (Conditional) */}
                    {currentFamily && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-8 animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-2 mb-3 text-eveneo-violet font-bold text-sm uppercase tracking-wide">
                                <currentFamily.icon size={16} /> Filtres : {currentFamily.title}
                            </div>
                            <div className="flex flex-wrap gap-4">
                                {currentFamily.filters.map(filter => (
                                    <div key={filter.key} className="flex items-center gap-2">
                                        <label className="text-sm text-gray-600">{filter.label}:</label>
                                        <select
                                            className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-eveneo-violet"
                                            value={dynamicFilters[filter.key] || ''}
                                            onChange={(e) => setDynamicFilters({ ...dynamicFilters, [filter.key]: e.target.value })}
                                        >
                                            <option value="">Tout</option>
                                            {filter.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Results Grid */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eveneo-violet"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {displayList.length > 0 ? displayList.map((item) => {
                            const isAd = !!(item as any)._campaignId;
                            const campaignId = (item as any)._campaignId;

                            const card = (
                                <ServiceCard
                                    key={item.id}
                                    provider={item}
                                    isSponsored={isAd}
                                />
                            );

                            if (isAd && campaignId) {
                                return (
                                    <AdTracker key={`ad-${campaignId}`} campaignId={campaignId}>
                                        {card}
                                        {(item as any)._creative && (
                                            <div className="mt-2 px-2 text-center">
                                                <p className="text-sm font-bold text-purple-800">{(item as any)._creative.headline}</p>
                                                <p className="text-xs text-gray-500">{(item as any)._creative.tagline}</p>
                                            </div>
                                        )}
                                    </AdTracker>
                                );
                            }

                            return card;
                        }) : (
                            <div className="col-span-full text-center py-20">
                                <p className="text-gray-500 text-lg">Aucun prestataire ne correspond à vos critères.</p>
                                <Button variant="ghost" className="mt-4" onClick={() => { setSearchTerm(''); setLocationFilter(''); setActiveCategory('Tous'); }}>
                                    Réinitialiser la recherche
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
