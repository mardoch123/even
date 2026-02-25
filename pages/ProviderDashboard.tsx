
import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, Calendar as CalendarIcon, Settings, DollarSign, Check, X, AlertCircle, Lock, Zap, Siren, ArrowRight, Filter, Rocket, Eye, MousePointer, ShoppingBag, Globe, Clock } from 'lucide-react';
import { Button } from '../components/Button';
import { KYCSection } from '../components/KYCSection';
import { KYCStatus, ServiceProvider } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { replacementService } from '../services/replacementService';
import { adsService, AdSettings } from '../services/adsService';
import { supabase, supabaseConfigError } from '../services/supabaseClient';
import { eventService, EventItemRow } from '../services/eventService';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';

type TimeRange = '7d' | '30d' | '1y' | 'all';

type DemoRequest = {
  id: string;
  clientName: string;
  label: string;
  status: 'pending' | 'accepted' | 'rejected';
};

type ProviderStats = {
  revenue: number;
  views: number;
  reservations: number;
  conversion: string;
  graph: number[];
};

export const ProviderDashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { formatPrice } = useCurrency();
  const { addToast } = useToast();
  
  const [kycStatus, setKycStatus] = useState<KYCStatus>(() => {
      const fromProfile = (currentUser?.kycStatus as KYCStatus | undefined) || undefined;
      if (fromProfile) return fromProfile;
      if (currentUser?.isVerified) return 'verified';
      return 'none';
  });
  const [urgentOpportunities, setUrgentOpportunities] = useState<any[]>([]);
  
  // Blocked dates by clients
  const [clientBlocks, setClientBlocks] = useState<any[]>([]);

  // Ads & Settings State
  const [adSettings, setAdSettings] = useState<AdSettings>(adsService.getSettings());
  
  const [revenueFilter, setRevenueFilter] = useState<TimeRange>('30d');

  const [stats, setStats] = useState<ProviderStats>({
    revenue: 0,
    views: 0,
    reservations: 0,
    conversion: '0%',
    graph: [0, 0, 0, 0, 0, 0, 0]
  });

  useEffect(() => {
    const fromProfile = (currentUser?.kycStatus as KYCStatus | undefined) || undefined;
    if (fromProfile && fromProfile !== kycStatus) {
      setKycStatus(fromProfile);
      return;
    }
    if (currentUser?.isVerified && kycStatus !== 'verified') {
      setKycStatus('verified');
    }
  }, [currentUser?.kycStatus, currentUser?.isVerified]);

  useEffect(() => {
    setAdSettings(adsService.getSettings());

    const myCategory = 'Traiteur';
    const myBasePrice = 50;

    const ops = replacementService.getOpportunitiesForProvider(myCategory, myBasePrice);
    setUrgentOpportunities(ops);

    const allBlocks = JSON.parse(localStorage.getItem('eveneo_blocked_dates') || '[]');
    if (currentUser) {
      setClientBlocks(allBlocks.filter((b: any) => b.providerId === currentUser.id || b.providerId === '1'));
    }

    const interval = setInterval(() => {
      setUrgentOpportunities(replacementService.getOpportunitiesForProvider(myCategory, myBasePrice));
    }, 30000);

    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    const loadStats = async () => {
      if (!currentUser?.id) {
        setStats({ revenue: 0, views: 0, reservations: 0, conversion: '0%', graph: [0, 0, 0, 0, 0, 0, 0] });
        return;
      }

      if (supabaseConfigError) {
        setStats({ revenue: 0, views: 0, reservations: 0, conversion: '0%', graph: [0, 0, 0, 0, 0, 0, 0] });
        return;
      }

      const now = new Date();
      const end = now;
      let start: Date | null = null;
      if (revenueFilter === '7d') start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (revenueFilter === '30d') start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      if (revenueFilter === '1y') start = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      try {
        const { data: providerRow, error: providerErr } = await supabase
          .from('service_providers')
          .select('id')
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (providerErr) throw providerErr;
        const providerId = providerRow?.id as string | undefined;
        if (!providerId) {
          setStats({ revenue: 0, views: 0, reservations: 0, conversion: '0%', graph: [0, 0, 0, 0, 0, 0, 0] });
          return;
        }

        const items = await eventService.getEventItemsByProviderId(providerId);
        const filtered = (items || []).filter((it: EventItemRow) => {
          const ts = it.created_at || null;
          if (!ts) return false;
          const d = new Date(ts);
          if (Number.isNaN(d.getTime())) return false;
          if (start && d < start) return false;
          return d <= end;
        });

        const consideredStatuses = new Set(['confirmed', 'completed_by_provider', 'validated_by_client']);

        let revenue = 0;
        let reservations = 0;
        for (const it of filtered) {
          if (!consideredStatuses.has(String(it.status))) continue;
          revenue += Number(it.price || 0);
          reservations += 1;
        }

        let graphStart = start;
        if (!graphStart) {
          const createdDates = filtered
            .map(i => (i.created_at ? new Date(i.created_at) : null))
            .filter((d): d is Date => Boolean(d) && !Number.isNaN(d.getTime()));
          graphStart = createdDates.length > 0 ? new Date(Math.min(...createdDates.map(d => d.getTime()))) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }

        const buckets = new Array(7).fill(0) as number[];
        const rangeMs = Math.max(1, end.getTime() - graphStart.getTime());
        for (const it of filtered) {
          if (!consideredStatuses.has(String(it.status))) continue;
          if (!it.created_at) continue;
          const d = new Date(it.created_at);
          if (Number.isNaN(d.getTime())) continue;
          const raw = (d.getTime() - graphStart.getTime()) / rangeMs;
          const idx = Math.min(6, Math.max(0, Math.floor(raw * 7)));
          buckets[idx] += Number(it.price || 0);
        }

        const max = Math.max(0, ...buckets);
        const graph = buckets.map(v => {
          if (max <= 0) return 0;
          return Math.round((v / max) * 100);
        });

        let views = 0;
        try {
          let viewsQuery = supabase
            .from('provider_profile_views')
            .select('id', { count: 'exact', head: true })
            .eq('provider_id', providerId)
            .lte('created_at', end.toISOString());

          if (start) {
            viewsQuery = viewsQuery.gte('created_at', start.toISOString());
          }

          const { count, error: viewsErr } = await viewsQuery;
          if (viewsErr) throw viewsErr;
          views = Number(count || 0);
        } catch (e) {
          views = 0;
        }

        const conversion = views > 0 ? `${Math.round((reservations / views) * 1000) / 10}%` : '0%';

        setStats({ revenue, views, reservations, conversion, graph });
      } catch (e) {
        console.error('Failed to load provider stats:', e);
        setStats({ revenue: 0, views: 0, reservations: 0, conversion: '0%', graph: [0, 0, 0, 0, 0, 0, 0] });
      }
    };

    loadStats();
  }, [currentUser?.id, revenueFilter]);

  const handleAcceptOpportunity = async (op: any) => {
      if (confirm(`Voulez-vous reprendre la mission "${op.eventName}" immédiatement ?`)) {
          const meProvider: ServiceProvider = {
              id: currentUser?.id || 'p1',
              name: currentUser?.name || 'Moi',
              category: 'Traiteur',
              rating: 5, reviewCount: 10, priceRange: '50€', priceValue: 50, priceUnit: 'item', imageUrl: currentUser?.avatarUrl || '', verified: true, location: 'Paris'
          };
          await replacementService.acceptReplacement(op, meProvider);
          addToast('success', "Mission acceptée ! Redirection...");
          navigate(`/event/${op.eventId}`);
      }
  };

  // --- Ads Feature Logic ---
  const providerCountry = (currentUser?.location || '').split(',').pop()?.trim() || 'Canada';
  const isAdsAllowedRegion = adSettings.allowedCountries.includes(providerCountry);
  const isAdsFeatureEnabled = adSettings.enabled;

  const isRestricted = kycStatus !== 'verified';
  const plan = currentUser?.subscriptionPlan || 'free';
  const isFreePlan = plan === 'free';
  const [demoRequests, setDemoRequests] = useState<DemoRequest[]>(() => [
    { id: 'req-1', clientName: 'Alice Bernard', label: 'Mariage • 12 Août 2024 • 150 pers.', status: 'pending' }
  ]);

  const activeRequestsCount = demoRequests.filter(r => r.status === 'pending' || r.status === 'accepted').length;

  const handleRejectRequest = async (requestId: string) => {
    const ok = window.confirm('Refuser cette demande ?');
    if (!ok) return;
    try {
      addToast('info', 'Suppression en cours...');
      setDemoRequests(prev => prev.filter(r => r.id !== requestId));
      addToast('success', 'Demande refusée.');
    } catch {
      addToast('error', 'Impossible de refuser pour le moment.');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    if (isFreePlan && activeRequestsCount >= 1) {
      addToast('error', 'Limite atteinte (Plan Gratuit).');
      return;
    }
    try {
      setDemoRequests(prev => prev.filter(r => r.id !== requestId));
      addToast('success', 'Demande acceptée !');
    } catch {
      addToast('error', 'Impossible d\'accepter pour le moment.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <img src="https://picsum.photos/100/100?random=88" alt="Logo" className="w-16 h-16 rounded-2xl border-2 border-white shadow-sm" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold text-eveneo-dark">DJ Magic Event</h1>
                {kycStatus === 'verified' ? (
                   <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1">
                     <Check size={10} /> Vérifié
                   </span>
                ) : (
                   <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">Non vérifié</span>
                )}
              </div>
              <p className="text-gray-500">Tableau de bord Prestataire • <span className="uppercase text-xs font-bold text-eveneo-violet">{plan}</span></p>
            </div>
          </div>
          <div className="flex gap-3">
            <Link to="/settings">
              <Button variant="secondary" className="border-gray-300 text-gray-600">
                <Settings size={18} className="mr-2" />
                Paramètres
              </Button>
            </Link>
            
            {/* Ads Button Logic (If Enabled Globally) */}
            {isAdsFeatureEnabled ? (
                isAdsAllowedRegion ? (
                    <Link to="/promote">
                        <Button variant="primary" className="bg-gradient-to-r from-purple-600 to-blue-600 border-none text-white shadow-glow hover:shadow-xl">
                            <Rocket size={18} className="mr-2" /> Publicité & Stats
                        </Button>
                    </Link>
                ) : (
                    <div className="relative group">
                        <Button disabled className="bg-gray-200 text-gray-400 border-none cursor-not-allowed">
                            <Lock size={18} className="mr-2" /> Boost (Indisponible)
                        </Button>
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-64 bg-gray-800 text-white text-xs p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none text-center shadow-lg z-10">
                            Le boost n'est pas disponible dans votre région ({providerCountry}).
                        </div>
                    </div>
                )
            ) : null}
          </div>
        </div>

        {/* URGENT OPPORTUNITIES SECTION */}
        {urgentOpportunities.length > 0 && (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-6 animate-pulse-subtle">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-red-500 text-white p-2 rounded-full animate-bounce">
                        <Siren size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-red-800">Opportunités Urgentes (Dernière Minute)</h3>
                        <p className="text-red-700 text-sm">Ces missions ont été annulées par d'autres prestataires. Premier arrivé, premier servi !</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {urgentOpportunities.map((op, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-900">{op.eventName}</h4>
                                <p className="text-sm text-gray-500">{op.date} à {op.slot} • <span className="font-bold text-green-600">{formatPrice(op.price)}</span></p>
                            </div>
                            <Button size="sm" variant="primary" className="bg-red-600 hover:bg-red-700 border-none" onClick={() => handleAcceptOpportunity(op)}>
                                Accepter la mission <ArrowRight size={16} className="ml-1" />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* BLOCKED DATES SECTION */}
        {clientBlocks.length > 0 && (
            <div className="mb-8 bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-600 text-white p-2 rounded-full">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-blue-900">Calendrier des Options</h3>
                        <p className="text-blue-700 text-sm">Ces dates sont bloquées par des clients potentiels. Elles ne peuvent pas être réservées par d'autres.</p>
                    </div>
                </div>
                <div className="space-y-3">
                    {clientBlocks.map((block, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-blue-100 flex justify-between items-center">
                            <div>
                                <p className="font-bold text-gray-800">{block.clientName}</p>
                                <p className="text-sm text-gray-500">Bloqué du {block.startDate} au {block.endDate}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Option Active</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Subscription Card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${isFreePlan ? 'bg-gray-400' : 'bg-eveneo-gradient'}`}>
                    <Zap size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-gray-900">Mon Abonnement : <span className="uppercase text-eveneo-violet">{plan}</span></h3>
                    <p className="text-sm text-gray-500">
                        {isFreePlan ? 'Limité à 1 commande simultanée et 3 photos.' : 'Profitez de toutes les fonctionnalités illimitées.'}
                    </p>
                </div>
            </div>
            <Button variant={isFreePlan ? "primary" : "outline"} onClick={() => navigate('/subscription')}>
                {isFreePlan ? 'Passer au plan supérieur' : 'Gérer mon abonnement'}
            </Button>
        </div>

        {/* KYC Module */}
        <KYCSection status={kycStatus} onStatusChange={setKycStatus} />

        {/* Dashboard Content */}
        <div className={`transition-all duration-500 ${isRestricted ? 'opacity-50 pointer-events-none filter blur-sm select-none' : ''}`}>
            
            {/* Filters Row */}
            <div className="flex justify-end mb-4">
                <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex items-center gap-1">
                    <div className="px-2 text-gray-400">
                        <Filter size={14} />
                    </div>
                    {(['7d', '30d', '1y', 'all'] as TimeRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setRevenueFilter(range)}
                            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                revenueFilter === range ? 'bg-eveneo-violet text-white shadow-sm' : 'text-gray-500 hover:bg-gray-50'
                            }`}
                        >
                            {range === '7d' ? '7 Jours' : range === '30d' ? 'Mois' : range === '1y' ? 'Année' : 'Tout'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                <div className="bg-green-50 p-2 rounded-lg text-green-600"><DollarSign size={20} /></div>
                <span className="text-xs font-bold text-green-500">+12%</span>
                </div>
                <p className="text-gray-500 text-sm">Revenus</p>
                <h3 className="text-3xl font-bold text-gray-900">{formatPrice(stats.revenue)}</h3>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                <div className="bg-purple-50 p-2 rounded-lg text-purple-600"><Users size={20} /></div>
                <span className="text-xs font-bold text-green-500">+5%</span>
                </div>
                <p className="text-gray-500 text-sm">Vues du profil</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.views}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><CalendarIcon size={20} /></div>
                </div>
                <p className="text-gray-500 text-sm">Réservations</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.reservations}</h3>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                <div className="bg-orange-50 p-2 rounded-lg text-orange-600"><TrendingUp size={20} /></div>
                </div>
                <p className="text-gray-500 text-sm">Taux de conversion</p>
                <h3 className="text-3xl font-bold text-gray-900">{stats.conversion}</h3>
            </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Requests */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-6">Demandes de réservation</h2>
                
                <div className="space-y-4">
                    {demoRequests.length === 0 ? (
                      <div className="text-center py-10 bg-gray-50 border border-dashed border-gray-200 rounded-2xl">
                        <p className="text-sm text-gray-500">Aucune demande en attente.</p>
                      </div>
                    ) : (
                      demoRequests.map((req) => (
                        <div key={req.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                          {isFreePlan && activeRequestsCount >= 1 && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center text-center p-4 rounded-xl">
                                  <Lock className="text-red-500 mb-2" size={24} />
                                  <h4 className="font-bold text-gray-900">Limite atteinte (Plan Gratuit)</h4>
                                  <p className="text-sm text-gray-500 mb-3">Vous avez déjà une commande en cours. Passez pro pour accepter plusieurs commandes simultanément.</p>
                                  <Link to="/subscription">
                                      <Button size="sm" variant="primary">Voir les abonnements</Button>
                                  </Link>
                              </div>
                          )}
                          <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex gap-4">
                                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold">
                                    {req.clientName.split(' ').map(p => p.charAt(0)).slice(0, 2).join('')}
                                  </div>
                                  <div>
                                    <h4 className="font-bold text-gray-900">{req.clientName}</h4>
                                    <p className="text-sm text-gray-500">{req.label}</p>
                                    <div className="mt-2 inline-flex bg-yellow-50 text-yellow-700 px-2 py-1 rounded text-xs font-bold">
                                        En attente
                                    </div>
                                  </div>
                              </div>
                              <div className="flex items-center gap-2 self-start">
                                  <button type="button" onClick={() => handleRejectRequest(req.id)} className="p-2 rounded-full bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 transition-colors">
                                    <X size={20} />
                                  </button>
                                  <button type="button" onClick={() => handleAcceptRequest(req.id)} className="p-2 rounded-full bg-eveneo-dark hover:bg-green-600 text-white transition-colors">
                                    <Check size={20} />
                                  </button>
                              </div>
                          </div>
                        </div>
                      ))
                    )}
                </div>
            </div>

            {/* Sidebar - Revenue Graph (Dynamic) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
                <h3 className="font-bold text-gray-900 mb-6">Aperçu dynamique ({revenueFilter})</h3>
                <div className="flex-grow flex items-end gap-2 h-48 mb-4">
                {stats.graph.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col justify-end group cursor-pointer">
                    <div 
                        className="bg-eveneo-blue/20 group-hover:bg-eveneo-violet rounded-t-lg transition-all duration-300 relative"
                        style={{ height: `${h}%` }}
                    >
                    </div>
                    </div>
                ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 uppercase font-semibold">
                <span>Début</span>
                <span>Fin</span>
                </div>
            </div>
            </div>
        </div>
        
        {isRestricted && (
            <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 bg-eveneo-dark text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 z-30 animate-bounce">
                <AlertCircle size={20} className="text-orange-400" />
                <span className="font-medium">Veuillez valider votre identité pour accéder au tableau de bord.</span>
            </div>
        )}
      </div>
    </div>
  );
};
