
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, MapPin, Calendar, ArrowLeft, CheckCircle, ShieldCheck, MessageCircle, Plus, Minus, Heart, Share2, Clock, Truck, Image as ImageIcon, Lock, AlertCircle, Check, X, ShoppingBag, User, XCircle } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import { reviewService, Review } from '../services/reviewService';
import { providerService } from '../services/providerService';
import { eventService } from '../services/eventService';
import { UserRole, ServiceProvider } from '../types';
import { formatCityAndRadius, isProviderIdentityUnlockedByPlan, maskProviderDisplayName, sanitizeProviderText } from '../utils/providerPrivacy';
import { getIndicativePriceRange } from '../utils/providerPricing';

const DEFAULT_PROVIDER: ServiceProvider = {
    id: '1',
    name: 'Gourmet Prestige',
    category: 'Traiteur',
    rating: 4.9,
    reviewCount: 85,
    priceRange: '50€ / pers',
    priceValue: 50,
    priceUnit: 'item',
    imageUrl: 'https://picsum.photos/800/600?random=10',
    verified: true,
    location: 'Paris, Île-de-France',
    description: "Spécialiste de la gastronomie française revisitée pour vos événements. Nous travaillons uniquement avec des produits frais et de saison pour garantir une expérience culinaire inoubliable.",
    details: {
        cuisineType: 'Française',
        dietaryOptions: ['Végétarien', 'Sans Gluten'],
    },
    includedItems: [
        'Service à table (3h)',
        'Vaisselle en porcelaine',
        'Nettoyage fin de chantier',
        'Déplacement (Paris IM)'
    ],
    excludedItems: [
        'Boissons alcoolisées',
        'Heures supplémentaires après minuit',
        'Mobilier (Tables/Chaises)'
    ],
    addOns: [
        { id: 'add1', name: 'Atelier Cocktail', price: 15, description: '+15€ par personne (Animation 1h)' },
        { id: 'add2', name: 'Pièce montée', price: 250, description: 'Prix fixe pour 50 pers.' },
        { id: 'add3', name: 'Serveur supplémentaire', price: 150, description: 'Pour la soirée (4h)' }
    ],
    cancellationPolicy: "Annulation gratuite jusqu'à 72h avant l'événement.",
    serviceArea: "Rayon de 50km autour de Paris",
    warrantyEnabled: true,
    availability: ['Samedi', 'Dimanche'],
    bookedDates: ['2024-06-15', '2024-06-22', '2024-07-06'],
    portfolio: [
        'https://picsum.photos/800/600?random=101',
        'https://picsum.photos/800/600?random=102',
        'https://picsum.photos/800/600?random=103',
        'https://picsum.photos/800/600?random=104'
    ]
};

export const ProviderProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { currentUser } = useAuth();
    const { formatPrice } = useCurrency();
    const { addToast } = useToast();

    const [provider, setProvider] = useState<ServiceProvider | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [selectedHours, setSelectedHours] = useState<number[]>([]);
    const [unavailableHours, setUnavailableHours] = useState<Set<number>>(new Set());
    const [quantity, setQuantity] = useState<number>(50);
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);

    const [showBlockModal, setShowBlockModal] = useState(false);
    const [blockDuration, setBlockDuration] = useState<number>(1);

    const [reviews, setReviews] = useState<Review[]>([]);
    const [isFavorite, setIsFavorite] = useState(false);

    const [activePortfolioImage, setActivePortfolioImage] = useState<string | null>(null);

    const [completedEventsCount, setCompletedEventsCount] = useState<number | null>(null);

    const [showBookingOptionsModal, setShowBookingOptionsModal] = useState(false);
    const [pendingBooking, setPendingBooking] = useState<{
        amount: number;
        providerId: string;
        providerName: string;
        date: string;
        serviceStartAt: string;
        serviceEndAt: string;
    } | null>(null);

    // Admin Feature Flag
    const [isBlockFeatureEnabled, setIsBlockFeatureEnabled] = useState(true);

    const isOwner = currentUser?.id === provider?.id || (currentUser?.role === UserRole.PROVIDER && id === 'me');
    const isProviderUser = currentUser?.role === UserRole.PROVIDER;

    const providerPlan = (provider?.details as any)?.subscriptionPlan as string | undefined;
    const identityUnlocked = isOwner || isProviderIdentityUnlockedByPlan(providerPlan);

    useEffect(() => {
        const fetchProvider = async () => {
            setLoading(true);
            try {
                const incomingProviderData = location.state?.providerData as ServiceProvider | undefined;

                // Check Admin Setting (Default true if not set)
                const storedFeature = localStorage.getItem('eveneo_feature_block_date');
                setIsBlockFeatureEnabled(storedFeature !== 'false');

                if (incomingProviderData) {
                    setProvider(incomingProviderData);
                } else if (id === 'me' && currentUser) {
                    // Load profile data logic...
                    const storedAddress = localStorage.getItem('user_address');
                    const storedBio = localStorage.getItem('user_bio');
                    const storedPolicy = localStorage.getItem('provider_cancellation_policy');
                    const storedArea = localStorage.getItem('provider_service_area');
                    const storedWarranty = localStorage.getItem('provider_warranty_enabled');
                    const storedAvail = localStorage.getItem('provider_availability');
                    const storedPortfolio = localStorage.getItem('provider_portfolio');
                    const storedKyc = localStorage.getItem('provider_kyc_status');
                    const storedIncluded = localStorage.getItem('provider_included_items');
                    const storedExcluded = localStorage.getItem('provider_excluded_items');
                    const storedPackages = localStorage.getItem('provider_packages');

                    setProvider({
                        ...DEFAULT_PROVIDER, // Fallback for structure
                        id: currentUser.id,
                        name: currentUser.name,
                        imageUrl: currentUser.avatarUrl || DEFAULT_PROVIDER.imageUrl,
                        location: storedAddress || currentUser.location || DEFAULT_PROVIDER.location,
                        description: storedBio || DEFAULT_PROVIDER.description,
                        cancellationPolicy: storedPolicy || DEFAULT_PROVIDER.cancellationPolicy,
                        serviceArea: storedArea || DEFAULT_PROVIDER.serviceArea,
                        warrantyEnabled: storedWarranty === 'true',
                        availability: storedAvail ? JSON.parse(storedAvail) : DEFAULT_PROVIDER.availability,
                        portfolio: storedPortfolio ? JSON.parse(storedPortfolio) : DEFAULT_PROVIDER.portfolio,
                        includedItems: storedIncluded ? JSON.parse(storedIncluded) : DEFAULT_PROVIDER.includedItems,
                        excludedItems: storedExcluded ? JSON.parse(storedExcluded) : DEFAULT_PROVIDER.excludedItems,
                        addOns: storedPackages ? JSON.parse(storedPackages).map((p: any, i: number) => ({
                            id: `pkg-${i}`,
                            name: p.name,
                            price: p.price,
                            description: p.desc
                        })) : DEFAULT_PROVIDER.addOns,
                        verified: storedKyc === 'verified'
                    });
                } else if (id) {
                    // Fetch from Supabase
                    const fetchedProvider = await providerService.getProviderById(id);
                    if (fetchedProvider) {
                        setProvider(fetchedProvider);
                    } else {
                        setError("Prestataire introuvable.");
                    }
                }
            } catch (err) {
                console.error("Error loading provider:", err);
                setError("Erreur lors du chargement du profil.");
            } finally {
                setLoading(false);
            }
        };

        fetchProvider();
    }, [id, currentUser, location.state]);

    useEffect(() => {
        const fetchBookedHours = async () => {
            if (!provider?.id || !selectedDate) {
                setUnavailableHours(new Set());
                return;
            }

            try {
                const ranges = await eventService.getProviderBookedRanges(provider.id, selectedDate);
                const blocked = new Set<number>();
                for (const r of ranges) {
                    const start = new Date(r.service_start_at);
                    const end = new Date(r.service_end_at);

                    const current = new Date(start);
                    current.setMinutes(0, 0, 0);
                    while (current < end) {
                        blocked.add(current.getHours());
                        current.setHours(current.getHours() + 1);
                    }
                }
                setUnavailableHours(blocked);
            } catch (e) {
                setUnavailableHours(new Set());
            }
        };

        fetchBookedHours();
    }, [provider?.id, selectedDate]);

    useEffect(() => {
        setSelectedHours([]);
    }, [selectedDate]);

    useEffect(() => {
        if (provider?.id) {
            setReviews(reviewService.getReviewsByProvider(provider.id));
            const storedFavs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
            setIsFavorite(storedFavs.includes(provider.id));
        }
    }, [provider?.id]);

    useEffect(() => {
        const fetchCounts = async () => {
            if (!provider?.id) return;
            try {
                const items = await eventService.getEventItemsByProviderId(provider.id);
                const done = items.filter(i => i.status === 'validated_by_client' || i.status === 'completed_by_provider');
                const uniqueEvents = new Set(done.map(d => d.event_id));
                setCompletedEventsCount(uniqueEvents.size);
            } catch {
                setCompletedEventsCount(null);
            }
        };
        void fetchCounts();
    }, [provider?.id]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eveneo-violet"></div>
            </div>
        );
    }

    if (error || !provider) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center px-4">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Oups !</h1>
                <p className="text-gray-600 mb-6">{error || "Impossible d'afficher ce profil."}</p>
                <Button onClick={() => navigate('/search')}>Retour à la recherche</Button>
            </div>
        );
    }

    const displayProviderName = identityUnlocked ? provider.name : maskProviderDisplayName(provider.name);
    const displayProviderLocation = identityUnlocked ? provider.location : formatCityAndRadius(provider.location, provider.serviceArea);
    const safeDescription = provider.description ? sanitizeProviderText(provider.description, identityUnlocked) : '';
    const detailsTags = Object.entries(provider.details || {})
        .filter(([k]) => !['subscriptionPlan', 'fullName', 'companyName', 'email', 'phone', 'links', 'externalLinks', 'socialLinks', 'qrCodes'].includes(k))
        .flatMap(([, v]) => Array.isArray(v) ? v : [])
        .map((t: any) => sanitizeProviderText(String(t), identityUnlocked));

    const indicative = getIndicativePriceRange(provider);
    const indicativeLabel = indicative
        ? `${formatPrice(indicative.min)} – ${formatPrice(indicative.max)}${indicative.suffix ? ` ${indicative.suffix}` : ''}`
        : null;

    const isDJ = (provider.category || '').toLowerCase().includes('dj');
    const djDetails = (provider.details || {}) as any;
    const djClips = Array.isArray(djDetails.djClips) ? djDetails.djClips : [];
    const djEquipment = Array.isArray(djDetails.djEquipment) ? djDetails.djEquipment : [];
    const djStyles = Array.isArray(djDetails.djStyles) ? djDetails.djStyles : [];
    const djEventCategories = Array.isArray(djDetails.djEvents) ? djDetails.djEvents : [];

    const isPastry = (provider.category || '').toLowerCase().includes('pât') || (provider.category || '').toLowerCase().includes('patiss') || (provider.category || '').toLowerCase().includes('patis');
    const pastryDetails = (provider.details || {}) as any;
    const pastrySpecialties = Array.isArray(pastryDetails.pastrySpecialties) ? pastryDetails.pastrySpecialties : [];
    const pastryMinLeadDays = pastryDetails.pastryMinLeadDays;
    const pastryWeeklyCapacity = pastryDetails.pastryWeeklyCapacity;
    const pastryDelivery = pastryDetails.pastryDelivery;
    const portfolioMeta = (provider.details as any)?.portfolioMeta || (isOwner ? (() => {
        try { return JSON.parse(localStorage.getItem('provider_portfolio_meta') || '{}'); } catch { return {}; }
    })() : {});

    const reassurance = {
        identityVerified: !!provider.verified,
        insuranceActive: !!(provider.details as any)?.insuranceActive,
        certification: !!(provider.details as any)?.certification,
        proSinceYear: (provider.details as any)?.proSinceYear as number | undefined
    };
    const proYears = reassurance.proSinceYear ? Math.max(0, new Date().getFullYear() - reassurance.proSinceYear) : null;

    const calculateTotal = () => {
        let base = 0;
        if (provider?.priceUnit === 'item') base = (provider.priceValue || 0) * quantity;
        else if (provider?.priceUnit === 'hour') base = (provider.priceValue || 0) * (selectedHours.length > 0 ? selectedHours.length : 1);
        else base = provider?.priceValue || 0;

        const addOnTotal = (provider?.addOns || [])
            .filter(a => selectedAddOns.includes(a.id))
            .reduce((acc, curr) => acc + curr.price, 0);

        return base + addOnTotal;
    };

    const totalPrice = calculateTotal();

    const BUSINESS_HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08h -> 22h

    const toggleHour = (hour: number) => {
        if (unavailableHours.has(hour)) return;
        if (isOwner || isProviderUser) return;

        setSelectedHours(prev => {
            const exists = prev.includes(hour);
            const next = exists ? prev.filter(h => h !== hour) : [...prev, hour];
            next.sort((a, b) => a - b);
            return next;
        });
    };

    const getServiceStartEnd = (): { startAt: string; endAt: string } | null => {
        if (!selectedDate || selectedHours.length === 0) return null;

        const sorted = [...selectedHours].sort((a, b) => a - b);
        for (let i = 1; i < sorted.length; i++) {
            if (sorted[i] !== sorted[i - 1] + 1) return null;
        }

        const startHour = sorted[0];
        const endHour = sorted[sorted.length - 1] + 1;

        const startLocal = new Date(`${selectedDate}T${String(startHour).padStart(2, '0')}:00:00`);
        const endLocal = new Date(`${selectedDate}T${String(endHour).padStart(2, '0')}:00:00`);

        return { startAt: startLocal.toISOString(), endAt: endLocal.toISOString() };
    };

    const handleShare = async () => {
        if (navigator.share) {
            try { await navigator.share({ title: provider.name, url: window.location.href }); } catch (e) { }
        } else {
            await navigator.clipboard.writeText(window.location.href);
            addToast('success', 'Lien copié !');
        }
    };

    const handleFavoriteToggle = () => {
        if (!currentUser) { navigate('/login', { state: { from: location.pathname } }); return; }
        const storedFavs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
        let newFavs;
        if (isFavorite) {
            newFavs = storedFavs.filter((fid: string) => fid !== provider.id);
            addToast('info', 'Retiré des favoris');
        } else {
            newFavs = [...storedFavs, provider.id];
            addToast('success', 'Ajouté aux favoris !');
        }
        localStorage.setItem('user_favorites', JSON.stringify(newFavs));
        setIsFavorite(!isFavorite);
    };

    const handleAskQuestion = () => {
        if (!currentUser) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }
        if (isProviderUser) {
            addToast('info', "Action réservée aux clients.");
            return;
        }
        navigate('/messages');
    };

    const handleBookingAction = () => {
        if (!selectedDate) {
            document.getElementById('availability-section')?.scrollIntoView({ behavior: 'smooth' });
            addToast('info', 'Veuillez sélectionner une date.');
            return;
        }
        if (selectedHours.length === 0) {
            document.getElementById('availability-section')?.scrollIntoView({ behavior: 'smooth' });
            addToast('info', 'Veuillez sélectionner une ou plusieurs heures.');
            return;
        }

        const slot = getServiceStartEnd();
        if (!slot) {
            addToast('error', 'Veuillez sélectionner des heures consécutives.');
            return;
        }
        if (!currentUser) {
            navigate('/login', { state: { from: location.pathname } });
            return;
        }

        const base = {
            amount: totalPrice,
            providerId: provider.id,
            providerName: provider.name,
            date: selectedDate,
            serviceStartAt: slot.startAt,
            serviceEndAt: slot.endAt
        };

        if ((provider.addOns || []).length > 0) {
            setPendingBooking(base);
            setShowBookingOptionsModal(true);
            return;
        }

        const params = new URLSearchParams({
            amount: base.amount.toString(),
            type: 'service_booking',
            providerId: base.providerId,
            providerName: base.providerName,
            date: base.date,
            serviceStartAt: base.serviceStartAt,
            serviceEndAt: base.serviceEndAt,
            addOns: ''
        });
        navigate(`/payment/stripe?${params.toString()}`);
    };

    const proceedToBookingPayment = (opts?: { clearAddOns?: boolean }) => {
        if (!pendingBooking) return;

        const addOns = opts?.clearAddOns ? '' : selectedAddOns.join(',');
        if (opts?.clearAddOns) setSelectedAddOns([]);

        const params = new URLSearchParams({
            amount: pendingBooking.amount.toString(),
            type: 'service_booking',
            providerId: pendingBooking.providerId,
            providerName: pendingBooking.providerName,
            date: pendingBooking.date,
            serviceStartAt: pendingBooking.serviceStartAt,
            serviceEndAt: pendingBooking.serviceEndAt,
            addOns
        });
        setShowBookingOptionsModal(false);
        setPendingBooking(null);
        navigate(`/payment/stripe?${params.toString()}`);
    };

    const toggleAddOn = (addOnId: string) => {
        if (selectedAddOns.includes(addOnId)) {
            setSelectedAddOns(selectedAddOns.filter(id => id !== addOnId));
        } else {
            setSelectedAddOns([...selectedAddOns, addOnId]);
        }
    };

    const openBlockModal = () => {
        if (!selectedDate || !currentUser) return;
        setShowBlockModal(true);
    };

    const proceedToBlockPayment = () => {
        if (!selectedDate) return;
        navigate(`/payment/stripe?amount=${blockDuration * 5}&type=hold_date&date=${selectedDate}&duration=${blockDuration}&providerId=${provider.id}`);
    };

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDay = new Date(currentYear, currentMonth, 1).getDay() === 0 ? 6 : new Date(currentYear, currentMonth, 1).getDay() - 1;
    const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

    const monthLabel = (year: number, month: number) => new Date(year, month, 1).toLocaleString('fr-FR', { month: 'long', year: 'numeric' });

    const normalizeYearMonth = (year: number, month: number) => {
        if (month < 0) return { year: year - 1, month: 11 };
        if (month > 11) return { year: year + 1, month: 0 };
        return { year, month };
    };

    const addMonths = (year: number, month: number, delta: number) => {
        const total = year * 12 + month + delta;
        return { year: Math.floor(total / 12), month: total % 12 };
    };

    const renderMonthGrid = (year: number, month: number) => {
        const dim = new Date(year, month + 1, 0).getDate();
        const fd = new Date(year, month, 1).getDay() === 0 ? 6 : new Date(year, month, 1).getDay() - 1;

        return (
            <div className="bg-white rounded-2xl border border-gray-100 p-3">
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-extrabold text-gray-700 capitalize">{monthLabel(year, month)}</p>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {dayLabels.map((d, i) => (
                        <div key={`${year}-${month}-dow-${i}`} className="text-center text-[9px] font-bold text-gray-400 mb-0.5">{d}</div>
                    ))}
                    {Array.from({ length: fd }).map((_, i) => <div key={`empty-${year}-${month}-${i}`} />)}
                    {Array.from({ length: dim }, (_, i) => i + 1).map(day => {
                        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isBooked = provider.bookedDates?.includes(dateStr);
                        const isSelected = selectedDate === dateStr;
                        return (
                            <button
                                key={`${year}-${month}-${day}`}
                                disabled={isBooked || isOwner || isProviderUser}
                                onClick={() => setSelectedDate(dateStr)}
                                className={`h-7 w-7 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-all ${isBooked
                                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed line-through'
                                    : isSelected
                                        ? 'bg-eveneo-dark text-white shadow-sm'
                                        : 'bg-white border border-gray-200 hover:border-eveneo-violet hover:text-eveneo-violet'
                                    }`}
                            >
                                {day}
                            </button>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-gray-50 min-h-screen pb-32">
            <div className="relative h-[40vh] lg:h-[50vh] w-full bg-gray-900 group">
                <img src={provider.imageUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-700" alt="Cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-transparent to-transparent"></div>

                <div className="absolute top-24 left-4 z-20">
                    <button onClick={() => navigate(-1)} className="bg-white/90 backdrop-blur p-2 rounded-full shadow-md text-gray-700 hover:text-eveneo-violet transition-all hover:scale-110">
                        <ArrowLeft size={24} />
                    </button>
                </div>
                <div className="absolute top-24 right-4 flex flex-col gap-2 z-20">
                    <button onClick={handleFavoriteToggle} className={`backdrop-blur-md p-2 rounded-full transition-all hover:scale-110 ${isFavorite ? 'bg-white text-red-500' : 'bg-white/20 text-white hover:bg-white/30'}`}>
                        <Heart size={24} fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                    <button onClick={handleShare} className="bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/30 transition-all hover:scale-110">
                        <Share2 size={24} />
                    </button>
                </div>
                <div className="absolute bottom-8 left-4 sm:left-8 z-20 text-white">
                    <h1 className="text-3xl md:text-5xl font-bold mb-2 drop-shadow-lg">{displayProviderName}</h1>
                    <div className="flex items-center gap-2 text-sm md:text-base opacity-90">
                        <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full font-medium border border-white/10">{provider.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><MapPin size={16} /> {displayProviderLocation}</span>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        <span className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                            ⭐ {provider.rating} ({provider.reviewCount} avis)
                        </span>
                        {completedEventsCount !== null && (
                            <span className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/10">
                                {completedEventsCount} événements réalisés
                            </span>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                        {reassurance.identityVerified && (
                            <span className="bg-green-500/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold border border-green-400/30">
                                <CheckCircle size={14} className="inline-block mr-1" /> Identité vérifiée
                            </span>
                        )}
                        {reassurance.insuranceActive && (
                            <span className="bg-blue-500/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold border border-blue-400/30">
                                <ShieldCheck size={14} className="inline-block mr-1" /> Assurance active
                            </span>
                        )}
                        {reassurance.certification && (
                            <span className="bg-purple-500/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold border border-purple-400/30">
                                <Check size={14} className="inline-block mr-1" /> Certification
                            </span>
                        )}
                        {proYears !== null && (
                            <span className="bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-extrabold border border-white/10">
                                Pro depuis {proYears} ans
                            </span>
                        )}
                    </div>

                    {!identityUnlocked && (
                        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                <Lock size={18} />
                            </div>
                            <div>
                                <p className="font-extrabold text-amber-900">Informations d'identification masquées</p>
                                <p className="text-sm text-amber-800 mt-1">
                                    Email, téléphone, liens externes, réseaux sociaux et QR codes sont bloqués par défaut. Déblocage via forfait payant.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 relative z-10">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Colonne Principale */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Description & Tags */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-start mb-6">
                                <h2 className="text-xl font-bold text-gray-900">À propos</h2>
                                <div className="flex items-center gap-1 text-amber-400 font-bold text-xl bg-amber-50 px-3 py-1 rounded-lg">
                                    <span className="text-amber-500">{provider.rating}</span> <Star size={20} fill="currentColor" />
                                    <span className="text-xs text-gray-400 font-normal ml-1">({provider.reviewCount} avis)</span>
                                </div>
                            </div>

                            {indicativeLabel && (
                                <div className="mb-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Prix indicatif</p>
                                    <p className="text-lg font-extrabold text-eveneo-violet mt-1">{indicativeLabel}</p>
                                    <p className="text-xs text-gray-500 mt-1">Ces prix sont indicatifs et servent à qualifier le lead. La réservation se fait sur la plateforme.</p>
                                </div>
                            )}

                            <p className="text-gray-600 leading-relaxed text-lg">{safeDescription}</p>
                            <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-gray-100">
                                {detailsTags.map((tag: string, i: number) => (
                                    <span key={i} className="px-4 py-1.5 bg-gray-100 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors cursor-default">{tag}</span>
                                ))}
                            </div>
                        </div>

                        {isPastry && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">Pâtissier • Informations</h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">Spécialités</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(pastrySpecialties.length > 0 ? pastrySpecialties : ['Wedding cake', 'Bento cake', 'Sans gluten']).map((s: any, i: number) => (
                                                <span key={i} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700">
                                                    {sanitizeProviderText(String(s), identityUnlocked)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Délai minimal</p>
                                            <p className="font-extrabold text-gray-900">{pastryMinLeadDays ? `${pastryMinLeadDays} jours` : 'Non précisé'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Capacité / semaine</p>
                                            <p className="font-extrabold text-gray-900">{pastryWeeklyCapacity ? `${pastryWeeklyCapacity}` : 'Non précisé'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Livraison</p>
                                            <p className="font-extrabold text-gray-900">{pastryDelivery === true ? 'Oui' : pastryDelivery === false ? 'Non' : 'Non précisé'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* DJ Specific (no outbound links, in-app media only) */}
                        {isDJ && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-6">DJ • Démonstrations & Détails</h2>

                                {(djClips.length > 0) && (
                                    <div className="mb-8">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">Clips</p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {djClips.slice(0, 4).map((c: any, idx: number) => (
                                                <div key={idx} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                                                    <p className="text-sm font-extrabold text-gray-900 mb-2">{sanitizeProviderText(String(c.title || `Clip ${idx + 1}`), identityUnlocked)}</p>
                                                    {String(c.type || '').toLowerCase() === 'audio' ? (
                                                        <audio controls className="w-full">
                                                            <source src={String(c.src || '')} />
                                                        </audio>
                                                    ) : (
                                                        <video controls className="w-full rounded-xl bg-black" preload="none">
                                                            <source src={String(c.src || '')} />
                                                        </video>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400 mt-3">Clips intégrés. Aucun lien sortant, aucun watermark.</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">Équipements</p>
                                        <ul className="space-y-2">
                                            {(djEquipment.length > 0 ? djEquipment : ['Contrôleur DJ', 'Sonorisation', 'Micro']).map((e: any, i: number) => (
                                                <li key={i} className="text-sm text-gray-700 font-medium">- {sanitizeProviderText(String(e), identityUnlocked)}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-3">Styles musicaux</p>
                                        <div className="flex flex-wrap gap-2">
                                            {(djStyles.length > 0 ? djStyles : ['House', 'Afrobeats', 'Mariage', 'Corporate']).map((s: any, i: number) => (
                                                <span key={i} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-sm font-bold text-gray-700">
                                                    {sanitizeProviderText(String(s), identityUnlocked)}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-5">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-3">Événements réalisés (catégories)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        {(djEventCategories.length > 0 ? djEventCategories : [
                                            { category: 'Mariage', meta: '120 personnes' },
                                            { category: 'Club', meta: '' },
                                            { category: 'Entreprise', meta: '' }
                                        ]).map((ev: any, i: number) => (
                                            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                                                <p className="font-extrabold text-gray-900">{sanitizeProviderText(String(ev.category || ev.title || 'Événement'), identityUnlocked)}</p>
                                                {(ev.meta || ev.size) && (
                                                    <p className="text-xs text-gray-500 mt-1">{sanitizeProviderText(String(ev.meta || ev.size), identityUnlocked)}</p>
                                                )}
                                                <p className="text-[11px] text-gray-400 mt-2">Sans nom de salle, sans localisation précise.</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Portfolio */}
                        {provider.portfolio && provider.portfolio.length > 0 && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <ImageIcon size={24} className="text-eveneo-pink" /> Portfolio
                                </h2>
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                    {provider.portfolio.map((img, idx) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => setActivePortfolioImage(img)}
                                            className="rounded-xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-lg transition-shadow cursor-zoom-in group h-28 sm:h-32 md:h-36 text-left"
                                        >
                                            <div className="relative w-full h-full">
                                                <img
                                                    src={img}
                                                    className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ${(portfolioMeta?.[img]?.blocked) ? 'blur-md scale-105' : ''}`}
                                                    alt={`Portfolio ${idx}`}
                                                />
                                                {(portfolioMeta?.[img]?.blocked) && (
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-[10px] font-bold px-2 text-center">
                                                        Image masquée
                                                    </div>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Reviews */}
                        <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                            <div className="flex justify-between items-center mb-8">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                    <MessageCircle size={24} className="text-blue-500" /> Avis Clients
                                </h2>
                                <Link to={`/provider/${provider.id}/reviews`}>
                                    <Button variant="ghost" size="sm" className="text-gray-500">Voir tout</Button>
                                </Link>
                            </div>

                            <div className="space-y-6">
                                {reviews.length > 0 ? reviews.slice(0, 3).map(review => (
                                    <div key={review.id} className="border-b border-gray-50 pb-6 last:border-0 last:pb-0">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-600 font-bold border border-gray-200">
                                                    {(review.userName || 'A').charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900 text-sm">{review.userName}</p>
                                                    <p className="text-xs text-gray-400">{new Date(review.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} fill={i < review.rating ? "#FFC107" : "none"} className={i < review.rating ? "text-amber-400" : "text-gray-200"} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-gray-600 text-sm leading-relaxed pl-13">{review.comment}</p>
                                    </div>
                                )) : (
                                    <div className="text-center py-8 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        Aucun avis pour le moment.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Inclus & Exclus (Grid) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Ce qui est inclus */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-green-100 bg-green-50/30">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-green-800">
                                    <CheckCircle className="text-green-600" size={20} /> Ce qui est inclus
                                </h2>
                                <ul className="space-y-3">
                                    {(provider.includedItems || ['Service complet']).map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                                            <Check size={16} className="text-green-500 mt-0.5 shrink-0" strokeWidth={3} />
                                            <span>{sanitizeProviderText(String(item), identityUnlocked)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Ce qui n'est PAS inclus */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 bg-red-50/30">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-800">
                                    <XCircle className="text-red-600" size={20} /> Ce qui n'est pas inclus
                                </h2>
                                <ul className="space-y-3">
                                    {(provider.excludedItems || ['Non spécifié']).map((item, i) => (
                                        <li key={i} className="flex items-start gap-3 text-gray-700 text-sm">
                                            <X size={16} className="text-red-500 mt-0.5 shrink-0" strokeWidth={3} />
                                            <span>{sanitizeProviderText(String(item), identityUnlocked)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Options (Add-ons) */}
                        {provider.addOns && provider.addOns.length > 0 && (
                            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <ShoppingBag className="text-eveneo-violet" size={24} />
                                    Options & Extras
                                </h2>
                                <div className="space-y-4">
                                    {provider.addOns.map((addon) => (
                                        <label
                                            key={addon.id}
                                            className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${selectedAddOns.includes(addon.id)
                                                ? 'border-eveneo-violet bg-violet-50/50'
                                                : 'border-gray-100 hover:border-gray-200'
                                                }`}
                                        >
                                            <div className="flex items-start gap-4">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedAddOns.includes(addon.id) ? 'border-eveneo-violet bg-eveneo-violet text-white' : 'border-gray-300 bg-white'
                                                    }`}>
                                                    {selectedAddOns.includes(addon.id) && <Check size={14} strokeWidth={3} />}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-900">{sanitizeProviderText(addon.name, identityUnlocked)}</p>
                                                    <p className="text-sm text-gray-500">{sanitizeProviderText(String(addon.description || ''), identityUnlocked)}</p>
                                                </div>
                                            </div>
                                            <div className="font-bold text-eveneo-violet whitespace-nowrap">
                                                +{formatPrice(addon.price)}
                                            </div>
                                            <input
                                                type="checkbox"
                                                className="hidden"
                                                checked={selectedAddOns.includes(addon.id)}
                                                onChange={() => toggleAddOn(addon.id)}
                                            />
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Calendrier */}
                        <div id="availability-section" className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 scroll-mt-24">
                            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <Calendar className="text-gray-900" size={24} /> Disponibilités
                            </h2>
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const prev = addMonths(currentYear, currentMonth, -1);
                                            setCurrentYear(prev.year);
                                            setCurrentMonth(prev.month);
                                        }}
                                    >
                                        -
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const next = addMonths(currentYear, currentMonth, 1);
                                            setCurrentYear(next.year);
                                            setCurrentMonth(next.month);
                                        }}
                                    >
                                        +
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 font-bold uppercase">Sélectionnez une date</p>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                                {renderMonthGrid(currentYear, currentMonth)}
                                {renderMonthGrid(addMonths(currentYear, currentMonth, 1).year, addMonths(currentYear, currentMonth, 1).month)}
                                <div className="hidden lg:block">
                                    {renderMonthGrid(addMonths(currentYear, currentMonth, 2).year, addMonths(currentYear, currentMonth, 2).month)}
                                </div>
                            </div>

                            {/* Légende */}
                            <div className="flex gap-4 text-[11px] text-gray-500 mb-5">
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-white border border-gray-200"></div> Disponible</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-gray-100"></div> Réservé</div>
                                <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-eveneo-dark"></div> Sélectionné</div>
                            </div>

                            {selectedDate && !isProviderUser && !isOwner && (
                                <div className="mb-5">
                                    <div className="flex items-center justify-between gap-4 mb-3">
                                        <div>
                                            <p className="text-xs font-bold text-gray-500 uppercase">Choisissez vos heures</p>
                                            <p className="text-xs text-gray-600">Sélectionnez une ou plusieurs heures consécutives.</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-gray-400 uppercase font-bold">Durée</p>
                                            <p className="font-bold text-eveneo-violet">{selectedHours.length || 0}h</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
                                        {BUSINESS_HOURS.map(h => {
                                            const isDisabled = unavailableHours.has(h);
                                            const isSelected = selectedHours.includes(h);
                                            return (
                                                <button
                                                    key={h}
                                                    type="button"
                                                    disabled={isDisabled}
                                                    onClick={() => toggleHour(h)}
                                                    className={`py-1.5 rounded-lg text-xs font-bold transition-all border ${isDisabled
                                                        ? 'bg-gray-50 text-gray-300 cursor-not-allowed border-gray-100'
                                                        : isSelected
                                                            ? 'bg-eveneo-dark text-white border-eveneo-dark shadow-md'
                                                            : 'bg-white text-gray-700 border-gray-200 hover:border-eveneo-violet hover:text-eveneo-violet'
                                                        }`}
                                                >
                                                    {String(h).padStart(2, '0')}:00
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* BLOC CONDITIONNEL POUR LE BOUTON DE BLOCAGE */}
                            {selectedDate && !isProviderUser && !isOwner && isBlockFeatureEnabled && (
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Lock size={20} /></div>
                                        <div>
                                            <p className="font-bold text-blue-900">Sécuriser la date du {selectedDate}</p>
                                            <p className="text-xs text-blue-700">Bloquez cette date pendant 1 à 5 jours pour réfléchir.</p>
                                        </div>
                                    </div>
                                    <Button size="sm" onClick={openBlockModal} className="bg-blue-600 hover:bg-blue-700 border-none text-white shadow-md whitespace-nowrap">
                                        Bloquer cette date
                                    </Button>
                                </div>
                            )}
                        </div>

                    </div>

                    {/* Sidebar (Sticky) */}
                    <div className="hidden lg:block lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl p-6 shadow-xl border border-gray-100 sticky top-24">
                            <div className="space-y-6">
                                <div className="text-center pb-6 border-b border-gray-100">
                                    <p className="text-sm text-gray-500 mb-1 uppercase font-bold">À partir de</p>
                                    <p className="text-4xl font-bold text-gray-900">{formatPrice(provider.priceValue)}</p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {provider.priceUnit === 'item' ? 'par personne' : provider.priceUnit === 'hour' ? 'par heure' : 'forfait événement'}
                                    </p>
                                </div>

                                {/* QUANTITY INPUT FOR ITEM SERVICES */}
                                {provider.priceUnit === 'item' && (
                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                        <label className="block text-xs font-bold text-gray-700 uppercase mb-2">Nombre d'invités</label>
                                        <div className="flex items-center gap-2">
                                            <Button size="sm" variant="outline" onClick={() => setQuantity(Math.max(1, quantity - 10))}><Minus size={14} /></Button>
                                            <input
                                                type="number"
                                                value={quantity}
                                                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                                                className="w-full text-center bg-white border border-gray-200 rounded-lg py-1 font-bold"
                                            />
                                            <Button size="sm" variant="outline" onClick={() => setQuantity(quantity + 10)}><Plus size={14} /></Button>
                                        </div>
                                    </div>
                                )}

                                {provider.warrantyEnabled && (
                                    <div className="flex items-start gap-3 bg-green-50 p-3 rounded-xl border border-green-100">
                                        <div className="bg-white p-1.5 rounded-full text-green-600 shrink-0 shadow-sm"><ShieldCheck size={18} /></div>
                                        <div><h3 className="font-bold text-green-800 text-sm">Garantie Événéo</h3><p className="text-xs text-green-700">Fonds bloqués jusqu'à la fin de la mission.</p></div>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="bg-gray-50 p-2 rounded-lg text-gray-500 shrink-0"><Truck size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">Zone d'intervention</h3>
                                            <p className="text-xs text-gray-500 leading-tight mt-1">{provider.serviceArea}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <div className="bg-gray-50 p-2 rounded-lg text-gray-500 shrink-0"><Clock size={20} /></div>
                                        <div>
                                            <h3 className="font-bold text-gray-900 text-sm">Politique d'annulation</h3>
                                            <p className="text-xs text-gray-500 leading-tight mt-1">{provider.cancellationPolicy}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <Button variant="outline" fullWidth onClick={handleAskQuestion} disabled={isProviderUser} className="border-gray-200 text-gray-700 hover:border-eveneo-violet hover:text-eveneo-violet">
                                    <MessageCircle size={18} className="mr-2" /> Poser une question
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barre de réservation fixe (Mobile & Desktop) */}
            {!isOwner && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] z-50 flex flex-col md:flex-row justify-between items-center md:justify-center md:gap-12 animate-in slide-in-from-bottom-4">
                    <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto justify-between md:justify-start">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Total estimé</span>
                            <span className="text-2xl font-bold text-eveneo-violet">{formatPrice(totalPrice)}</span>
                            {provider.priceUnit === 'hour' && <span className="text-xs text-gray-400">pour {selectedHours.length || 0} heures</span>}
                            {provider.priceUnit === 'item' && <span className="text-xs text-gray-400">pour {quantity} personnes</span>}
                        </div>
                        {selectedDate && (
                            <div className="text-right md:text-left">
                                <span className="text-xs text-gray-400 uppercase font-bold">Date choisie</span>
                                <div className="flex items-center gap-1 font-medium text-gray-800">
                                    <Calendar size={14} /> {selectedDate}
                                </div>
                            </div>
                        )}
                    </div>
                    <Button variant="primary" size="lg" className="shadow-glow px-12 w-full md:w-auto" onClick={handleBookingAction} disabled={isProviderUser}>
                        {isProviderUser ? 'Réservé aux clients' : (selectedDate ? 'Réserver maintenant' : 'Vérifier disponibilité')}
                    </Button>
                </div>
            )}

            {/* Modal Blocage */}
            {showBlockModal && (
                <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">Bloquer une date</h3>
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6">
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-blue-800 uppercase mb-1">Durée (Jours)</label>
                                <input type="range" min="1" max="5" value={blockDuration} onChange={(e) => setBlockDuration(Number(e.target.value))} className="w-full h-2 bg-blue-200 rounded-lg accent-blue-600" />
                                <span className="text-lg font-bold text-blue-900 block text-center mt-2">{blockDuration} jours</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-blue-200">
                                <span className="text-sm font-bold text-blue-900">Coût total</span>
                                <span className="text-xl font-bold text-blue-900">{formatPrice(blockDuration * 5)}</span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button variant="ghost" fullWidth onClick={() => setShowBlockModal(false)}>Annuler</Button>
                            <Button variant="primary" fullWidth onClick={proceedToBlockPayment}>Payer et Bloquer</Button>
                        </div>
                    </div>
                </div>
            )}

            {activePortfolioImage && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setActivePortfolioImage(null)}>
                    <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
                        <button
                            type="button"
                            onClick={() => setActivePortfolioImage(null)}
                            className="absolute -top-3 -right-3 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg"
                            aria-label="Fermer"
                        >
                            <X size={18} />
                        </button>
                        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
                            <img src={activePortfolioImage} alt="Portfolio" className="w-full h-[70vh] object-contain bg-black" />
                        </div>
                    </div>
                </div>
            )}

            {showBookingOptionsModal && pendingBooking && (
                <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowBookingOptionsModal(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Options du prestataire</h3>
                                <p className="text-sm text-gray-500 mt-1">Choisissez librement des options (facultatif) avant le résumé et le paiement.</p>
                            </div>
                            <button type="button" className="text-gray-400 hover:text-gray-700" onClick={() => setShowBookingOptionsModal(false)} aria-label="Fermer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-bold text-gray-500 uppercase">Réservation</p>
                                    <p className="font-bold text-gray-900">{pendingBooking.providerName}</p>
                                    <p className="text-xs text-gray-600 mt-1">{pendingBooking.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-gray-500 uppercase">Total estimé</p>
                                    <p className="text-lg font-extrabold text-eveneo-violet">{formatPrice(totalPrice)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[45vh] overflow-auto pr-1">
                            {(provider.addOns || []).map((addon) => (
                                <label
                                    key={addon.id}
                                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-sm ${selectedAddOns.includes(addon.id)
                                        ? 'border-eveneo-violet bg-violet-50/50'
                                        : 'border-gray-100 hover:border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedAddOns.includes(addon.id)
                                            ? 'border-eveneo-violet bg-eveneo-violet text-white'
                                            : 'border-gray-300 bg-white'
                                            }`}>
                                            {selectedAddOns.includes(addon.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900">{addon.name}</p>
                                            {addon.description && <p className="text-sm text-gray-500">{addon.description}</p>}
                                        </div>
                                    </div>
                                    <div className="font-bold text-eveneo-violet whitespace-nowrap">+{formatPrice(addon.price)}</div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={selectedAddOns.includes(addon.id)}
                                        onChange={() => toggleAddOn(addon.id)}
                                    />
                                </label>
                            ))}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 mt-6">
                            <Button variant="outline" fullWidth onClick={() => proceedToBookingPayment({ clearAddOns: true })}>
                                Continuer sans options
                            </Button>
                            <Button variant="primary" fullWidth onClick={() => proceedToBookingPayment()}>
                                Continuer
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
