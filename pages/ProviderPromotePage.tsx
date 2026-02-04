
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket, ArrowLeft, MapPin, Target, Eye, MousePointer, CreditCard, Globe, Play, Pause, StopCircle, LayoutDashboard, Plus, Image as ImageIcon, Type, Tag, Info, AlertCircle, Check, Wallet, X, Sparkles, ShieldCheck, ShieldAlert, Lightbulb, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useCurrency } from '../contexts/CurrencyContext';
import { useToast } from '../contexts/ToastContext';
import { adsService, AdSettings, AdCampaign, AdAuditResult } from '../services/adsService';
import { useAuth } from '../contexts/AuthContext';
import { ServiceCard } from '../components/ServiceCard'; // Reuse card for preview

const AUDIENCES = [
    { id: 'local', label: 'Local (Ma ville)', icon: MapPin, reachMult: 1 },
    { id: 'region', label: 'Régional (+50km)', icon: Globe, reachMult: 5 },
    { id: 'retarget', label: 'Retargeting (Visiteurs récents)', icon: Target, reachMult: 0.5 },
];

export const ProviderPromotePage: React.FC = () => {
    const navigate = useNavigate();
    const { formatPrice } = useCurrency();
    const { addToast } = useToast();
    const { currentUser } = useAuth();
    
    const [activeTab, setActiveTab] = useState<'manage' | 'create'>('manage');
    const [settings, setSettings] = useState<AdSettings>(adsService.getSettings());
    const [myCampaigns, setMyCampaigns] = useState<AdCampaign[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
    
    // Create Form State
    const [selectedDurationId, setSelectedDurationId] = useState<string>('7d');
    const [selectedAudience, setSelectedAudience] = useState('local');
    const [adHeadline, setAdHeadline] = useState('Offre Spéciale !');
    const [adTagline, setAdTagline] = useState('Réservez maintenant pour profiter de -10%');
    const [adTags, setAdTags] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // AI Analysis State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [adAnalysis, setAdAnalysis] = useState<AdAuditResult | null>(null);
    
    // Image Selection State
    const [availableImages, setAvailableImages] = useState<string[]>([]);
    const [selectedAdImage, setSelectedAdImage] = useState<string>('');

    // Payment Choice State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

    useEffect(() => {
        if (!currentUser) return;
        
        // Load Wallet Balance
        const balance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
        setWalletBalance(balance);

        // Load Campaigns
        const loadCampaigns = () => {
            const all = adsService.getProviderCampaigns(currentUser.id);
            setMyCampaigns(all);
            if (all.length === 0 && activeTab === 'manage') setActiveTab('create');
        };

        loadCampaigns();
        
        // Load Images (Avatar + Portfolio)
        const loadImages = () => {
            const images = [];
            if (currentUser.avatarUrl) images.push(currentUser.avatarUrl);
            
            const storedPortfolio = localStorage.getItem('provider_portfolio');
            if (storedPortfolio) {
                const portfolio = JSON.parse(storedPortfolio);
                if (Array.isArray(portfolio)) {
                    images.push(...portfolio);
                }
            } else {
                // Fallback defaults for demo
                images.push('https://picsum.photos/400/300?random=1');
                images.push('https://picsum.photos/400/300?random=2');
            }
            
            // Remove dupes and empty
            const uniqueImages = Array.from(new Set(images)).filter(Boolean);
            setAvailableImages(uniqueImages);
            if (uniqueImages.length > 0 && !selectedAdImage) {
                setSelectedAdImage(uniqueImages[0]);
            }
        };
        loadImages();
        
        // Real-time updates for dashboard
        const interval = setInterval(() => {
            // We keep simulation for background noise, but relies on real events mostly
            adsService.simulateTraffic(); 
            
            // Refresh list
            const all = adsService.getProviderCampaigns(currentUser.id);
            setMyCampaigns(all);

            // Refresh selected campaign stats if open
            if (selectedCampaign) {
                const updatedSelected = all.find(c => c.id === selectedCampaign.id);
                // Update stats AND status from source of truth
                if (updatedSelected && !isLoading) {
                     setSelectedCampaign(updatedSelected);
                }
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [currentUser, selectedCampaign?.id, activeTab, isLoading]);

    // Calculations
    const calculatePrice = (durId: string) => {
        const multiplier = settings.durationMultipliers[durId] || 1;
        return settings.baseCPM * multiplier * 10; // Arbitrary base multiplier for budget calculation
    };

    const calculateReach = (durId: string, audId: string) => {
        const durMult = settings.durationMultipliers[durId] || 1;
        const audMult = AUDIENCES.find(a => a.id === audId)?.reachMult || 1;
        return Math.floor(500 * durMult * audMult);
    };

    const currentPrice = calculatePrice(selectedDurationId);
    const currentReach = calculateReach(selectedDurationId, selectedAudience);

    // Helper to prepare campaign data
    const getCampaignPayload = () => ({
        durationId: selectedDurationId,
        audience: selectedAudience,
        price: currentPrice,
        creative: {
            headline: adHeadline,
            tagline: adTagline,
            tags: adTags.split(',').map(t => t.trim()),
            customImage: selectedAdImage || currentUser?.avatarUrl
        },
        provider: {
            id: currentUser?.id || 'unknown',
            name: currentUser?.name || 'Provider',
            category: 'Service',
            location: currentUser?.location || '',
            rating: 5.0,
            reviewCount: 0,
            priceRange: 'Sur devis',
            priceValue: 0,
            priceUnit: 'event' as const,
            imageUrl: currentUser?.avatarUrl || '',
            verified: currentUser?.isVerified || false
        }
    });

    const handleAnalyze = async () => {
        if (!adHeadline || !adTagline) {
            addToast('error', "Veuillez remplir le titre et le message avant l'analyse.");
            return;
        }
        
        setIsAnalyzing(true);
        setAdAnalysis(null);
        
        try {
            const creative = {
                headline: adHeadline,
                tagline: adTagline,
                tags: adTags.split(',').map(t => t.trim()),
                customImage: selectedAdImage
            };
            
            const result = await adsService.auditAdContent(creative);
            setAdAnalysis(result);
            if (result.isSafe) {
                addToast('success', 'Contenu validé par l\'IA.');
            } else {
                addToast('warning', 'Problèmes de conformité détectés.');
            }
        } catch (e) {
            addToast('error', "Erreur lors de l'analyse.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Initiate Purchase (Check Balance first)
    const initiatePurchase = () => {
        if (!adHeadline || !adTagline) {
            addToast('error', 'Veuillez remplir le titre et la description de la publicité.');
            return;
        }
        
        // If audit failed and score is low, warn user
        if (adAnalysis && !adAnalysis.isSafe) {
            if(!confirm("L'IA a détecté des problèmes de conformité. Votre publicité risque d'être rejetée. Voulez-vous continuer quand même ?")) {
                return;
            }
        }

        // Check balance
        if (walletBalance >= currentPrice) {
            setShowPaymentModal(true);
        } else {
            // Go straight to Stripe
            goToStripe();
        }
    };

    const goToStripe = () => {
        setIsLoading(true);
        const campaignData = getCampaignPayload();
        localStorage.setItem('pending_campaign_data', JSON.stringify(campaignData));
        setTimeout(() => {
            navigate(`/payment/stripe?amount=${currentPrice}&type=ads`);
        }, 500);
    };

    const payWithWallet = async () => {
        setIsLoading(true);
        setShowPaymentModal(false);
        
        const campaignData = getCampaignPayload();
        
        try {
            // 1. Deduct Balance
            const newBalance = walletBalance - currentPrice;
            setWalletBalance(newBalance);
            localStorage.setItem('provider_wallet_balance', newBalance.toString());

            // 2. Create Campaign directly
            await adsService.createCampaign(
                campaignData.provider, 
                campaignData.durationId, 
                campaignData.audience, 
                campaignData.price,
                campaignData.creative
            );

            addToast('success', 'Paiement effectué via le portefeuille ! Campagne créée.');
            setActiveTab('manage');
            
        } catch (error) {
            console.error(error);
            addToast('error', 'Erreur lors du paiement.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = (campaignId: string, newStatus: 'active' | 'paused' | 'stopped') => {
        if (newStatus === 'stopped') {
            if (!confirm("Voulez-vous vraiment arrêter cette campagne définitivement ? Le budget restant sera perdu.")) return;
        }
        
        // 1. Update Service
        adsService.updateCampaignStatus(campaignId, newStatus);
        
        // 2. Reload Campaigns locally to ensure list is fresh immediately
        const all = adsService.getProviderCampaigns(currentUser.id);
        setMyCampaigns(all);
        
        // 3. Update Selected View based on fresh data
        if (selectedCampaign?.id === campaignId) {
            const updated = all.find(c => c.id === campaignId);
            setSelectedCampaign(updated || null);
        }
        
        addToast('info', `Campagne ${newStatus === 'active' ? 'activée' : newStatus === 'paused' ? 'mise en pause' : 'arrêtée'}.`);
    };

    // Derived metrics
    const getCTR = (c: AdCampaign) => c.stats.impressions > 0 ? ((c.stats.clicks / c.stats.impressions) * 100).toFixed(2) : '0.00';
    const getCPC = (c: AdCampaign) => c.stats.clicks > 0 ? (c.budgetSpent / c.stats.clicks).toFixed(2) : '0.00';

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <Link to="/dashboard/provider" className="inline-flex items-center text-gray-500 hover:text-eveneo-dark">
                        <ArrowLeft size={18} className="mr-2" /> Retour Dashboard
                    </Link>
                    
                    <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
                        <button 
                            onClick={() => setActiveTab('manage')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'manage' ? 'bg-eveneo-violet text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <LayoutDashboard size={18} /> Mes Campagnes
                        </button>
                        <button 
                            onClick={() => setActiveTab('create')}
                            className={`px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'create' ? 'bg-eveneo-violet text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                        >
                            <Plus size={18} /> Nouveau Boost
                        </button>
                    </div>
                </div>

                {activeTab === 'manage' && (
                    <div className="animate-in fade-in">
                        <div className="flex flex-col lg:flex-row gap-6 h-full">
                            {/* List */}
                            <div className={`flex-grow bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col transition-all`}>
                                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                                    <h2 className="text-xl font-bold text-gray-900">Historique des Boosts</h2>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Système de tracking actif
                                    </div>
                                </div>
                                {myCampaigns.length === 0 ? (
                                    <div className="p-12 text-center text-gray-500">
                                        Vous n'avez aucune campagne active. Lancez un boost pour augmenter votre visibilité !
                                    </div>
                                ) : (
                                    <div className="overflow-y-auto max-h-[600px]">
                                        <table className="w-full text-left text-sm">
                                            <thead className="bg-white text-gray-500 font-medium border-b border-gray-200 uppercase text-xs sticky top-0">
                                                <tr>
                                                    <th className="px-6 py-3">Campagne</th>
                                                    <th className="px-6 py-3">Statut</th>
                                                    <th className="px-6 py-3 text-right">Budget Restant</th>
                                                    <th className="px-6 py-3 text-right">Vues</th>
                                                    <th className="px-6 py-3 text-right">Clics</th>
                                                    <th className="px-6 py-3">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {myCampaigns.map(camp => (
                                                    <tr key={camp.id} className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedCampaign?.id === camp.id ? 'bg-blue-50' : ''}`} onClick={() => setSelectedCampaign(camp)}>
                                                        <td className="px-6 py-4">
                                                            <p className="font-bold text-gray-900">{camp.creative?.headline || 'Campagne'}</p>
                                                            <p className="text-xs text-gray-500 font-mono">{camp.id.slice(-6)}</p>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                                                                camp.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                camp.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                                                                camp.status === 'pending_review' ? 'bg-purple-100 text-purple-700 animate-pulse' :
                                                                camp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                                'bg-gray-200 text-gray-600'
                                                            }`}>
                                                                {camp.status === 'pending_review' ? 'En examen' : camp.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-medium">
                                                            {formatPrice(camp.budgetTotal - camp.budgetSpent)}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">{camp.stats.impressions}</td>
                                                        <td className="px-6 py-4 text-right">{camp.stats.clicks}</td>
                                                        <td className="px-6 py-4">
                                                            <Button size="sm" variant="ghost" className="text-blue-600 hover:bg-blue-100" onClick={(e) => { e.stopPropagation(); setSelectedCampaign(camp); }}>
                                                                Voir détails
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            {/* Detailed Stats Panel */}
                            {selectedCampaign && (
                                <div className="w-full lg:w-[400px] bg-white rounded-2xl shadow-xl border border-gray-200 flex flex-col animate-in slide-in-from-right overflow-hidden shrink-0">
                                    <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                                        <div>
                                            <h3 className="font-bold text-lg text-gray-900">Performance</h3>
                                            <p className="text-xs text-gray-500">{selectedCampaign.creative.headline}</p>
                                        </div>
                                        <button onClick={() => setSelectedCampaign(null)} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={20} /></button>
                                    </div>

                                    {selectedCampaign.status === 'pending_review' && (
                                        <div className="p-4 bg-purple-50 border-b border-purple-100 text-sm text-purple-800">
                                            <p className="font-bold flex items-center gap-2"><AlertCircle size={16} /> En attente de validation</p>
                                            <p className="mt-1">Notre système d'IA analyse votre publicité. Un administrateur validera le contenu sous peu.</p>
                                        </div>
                                    )}

                                    {selectedCampaign.status === 'rejected' && (
                                        <div className="p-4 bg-red-50 border-b border-red-100 text-sm text-red-800">
                                            <p className="font-bold flex items-center gap-2"><AlertCircle size={16} /> Publicité Refusée</p>
                                            <p className="mt-1">Motif : {selectedCampaign.aiAnalysis?.reason || "Contenu inapproprié"}</p>
                                        </div>
                                    )}

                                    <div className="p-6 space-y-6 flex-grow overflow-y-auto">
                                        {/* Progress */}
                                        <div>
                                            <div className="flex justify-between text-xs mb-1 text-gray-500">
                                                <span>Budget Consommé</span>
                                                <span>{((selectedCampaign.budgetSpent / selectedCampaign.budgetTotal) * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div className="bg-eveneo-violet h-2 rounded-full transition-all duration-1000" style={{ width: `${(selectedCampaign.budgetSpent / selectedCampaign.budgetTotal) * 100}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Key Metrics Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-blue-50 p-3 rounded-xl text-center border border-blue-100">
                                                <p className="text-xs text-blue-600 uppercase font-bold mb-1">CTR (Taux Clic)</p>
                                                <p className="text-xl font-bold text-blue-900">{getCTR(selectedCampaign)}%</p>
                                            </div>
                                            <div className="bg-purple-50 p-3 rounded-xl text-center border border-purple-100">
                                                <p className="text-xs text-purple-600 uppercase font-bold mb-1">Coût / Clic</p>
                                                <p className="text-xl font-bold text-purple-900">{getCPC(selectedCampaign)}€</p>
                                            </div>
                                            <div className="bg-green-50 p-3 rounded-xl text-center border border-green-100 col-span-2">
                                                <p className="text-xs text-green-600 uppercase font-bold mb-1">Réservations Directes</p>
                                                <p className="text-2xl font-bold text-green-900">{selectedCampaign.stats.reservations}</p>
                                                <p className="text-xs text-green-700 mt-1">{formatPrice(selectedCampaign.stats.revenueGenerated)} de C.A.</p>
                                            </div>
                                        </div>

                                        {/* Logs */}
                                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-40 overflow-y-auto">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Derniers événements</h4>
                                            {selectedCampaign.events && selectedCampaign.events.length > 0 ? (
                                                <ul className="space-y-2 text-xs text-gray-600">
                                                    {selectedCampaign.events.slice(-5).reverse().map((ev, idx) => (
                                                        <li key={idx} className="flex justify-between">
                                                            <span>{ev.type === 'click' ? '🖱️ Clic' : '💰 Conversion'}</span>
                                                            <span className="text-gray-400">{new Date(ev.timestamp).toLocaleTimeString()}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p className="text-xs text-gray-400 italic">Aucune interaction récente.</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Control Buttons */}
                                    {selectedCampaign.status !== 'completed' && selectedCampaign.status !== 'stopped' && selectedCampaign.status !== 'rejected' && selectedCampaign.status !== 'pending_review' && (
                                        <div className="p-4 border-t border-gray-100 bg-gray-50 grid grid-cols-2 gap-3">
                                            {selectedCampaign.status === 'active' ? (
                                                <Button variant="secondary" className="border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => handleStatusChange(selectedCampaign.id, 'paused')}>
                                                    <Pause size={16} className="mr-2" /> Pause
                                                </Button>
                                            ) : (
                                                <Button variant="secondary" className="border-green-200 text-green-700 hover:bg-green-50" onClick={() => handleStatusChange(selectedCampaign.id, 'active')}>
                                                    <Play size={16} className="mr-2" /> Reprendre
                                                </Button>
                                            )}
                                            <Button variant="secondary" className="border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleStatusChange(selectedCampaign.id, 'stopped')}>
                                                <StopCircle size={16} className="mr-2" /> Arrêter
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'create' && (
                    <div className="animate-in fade-in">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                            {/* Form Configuration (2/3 width) */}
                            <div className="lg:col-span-2 space-y-8">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6">Configuration de la publicité</h2>
                                    
                                    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
                                        {/* 1. Contenu */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                                                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">1</div>
                                                Contenu de l'annonce
                                            </h3>
                                            <div className="space-y-4">
                                                <Input 
                                                    label="Titre d'accroche (Max 25 chars)" 
                                                    placeholder="Ex: Offre Spéciale !" 
                                                    maxLength={25}
                                                    icon={Type}
                                                    value={adHeadline}
                                                    onChange={(e) => { setAdHeadline(e.target.value); setAdAnalysis(null); }}
                                                />
                                                <Input 
                                                    label="Message promotionnel (Max 50 chars)" 
                                                    placeholder="Ex: -20% sur les mariages d'hiver" 
                                                    maxLength={50}
                                                    icon={Info}
                                                    value={adTagline}
                                                    onChange={(e) => { setAdTagline(e.target.value); setAdAnalysis(null); }}
                                                />
                                                <Input 
                                                    label="Mots-clés ciblés (séparés par des virgules)" 
                                                    placeholder="Ex: Mariage, Luxe, Bio" 
                                                    icon={Tag}
                                                    value={adTags}
                                                    onChange={(e) => { setAdTags(e.target.value); setAdAnalysis(null); }}
                                                />
                                                
                                                {/* Image Selection */}
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                                                        <ImageIcon size={16} /> Visuel de l'annonce
                                                    </label>
                                                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                                        {availableImages.map((img, idx) => (
                                                            <div 
                                                                key={idx}
                                                                onClick={() => setSelectedAdImage(img)}
                                                                className={`relative aspect-square rounded-xl cursor-pointer border-2 overflow-hidden group ${selectedAdImage === img ? 'border-eveneo-violet ring-2 ring-eveneo-violet/30' : 'border-gray-100 hover:border-gray-300'}`}
                                                            >
                                                                <img src={img} alt="Choix" className="w-full h-full object-cover" />
                                                                {selectedAdImage === img && (
                                                                    <div className="absolute inset-0 bg-eveneo-violet/20 flex items-center justify-center">
                                                                        <div className="bg-white rounded-full p-1 shadow-sm">
                                                                            <Check size={16} className="text-eveneo-violet" />
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        <Link to="/settings" className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:text-eveneo-violet hover:border-eveneo-violet hover:bg-violet-50 transition-colors">
                                                            <Plus size={20} />
                                                            <span className="text-[10px] font-bold">Ajouter</span>
                                                        </Link>
                                                    </div>
                                                </div>

                                                {/* AI Audit Button & Results */}
                                                <div className="mt-4">
                                                    {!adAnalysis && !isAnalyzing && (
                                                        <button 
                                                            onClick={handleAnalyze}
                                                            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
                                                        >
                                                            <Sparkles size={18} className="group-hover:animate-spin" /> 
                                                            Analyser le contenu avec l'IA
                                                        </button>
                                                    )}

                                                    {isAnalyzing && (
                                                        <div className="w-full py-4 bg-gray-50 rounded-xl border border-gray-200 flex flex-col items-center justify-center animate-pulse">
                                                            <Loader2 size={24} className="text-indigo-600 animate-spin mb-2" />
                                                            <p className="text-sm text-indigo-800 font-medium">Audit en cours (Sécurité & Impact)...</p>
                                                        </div>
                                                    )}

                                                    {adAnalysis && (
                                                        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm animate-in slide-in-from-top-2">
                                                            <div className="flex justify-between items-start mb-4">
                                                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                                                    <Sparkles size={18} className="text-indigo-600" /> Rapport d'analyse IA
                                                                </h4>
                                                                <button onClick={handleAnalyze} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                                                                    <Play size={10} /> Relancer
                                                                </button>
                                                            </div>

                                                            <div className="grid grid-cols-2 gap-4 mb-4">
                                                                {/* Safety Score */}
                                                                <div className={`p-3 rounded-lg border ${adAnalysis.isSafe ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                                                    <p className="text-xs uppercase font-bold mb-1 flex items-center gap-1">
                                                                        {adAnalysis.isSafe ? <ShieldCheck size={14} className="text-green-600" /> : <ShieldAlert size={14} className="text-red-600" />}
                                                                        <span className={adAnalysis.isSafe ? 'text-green-700' : 'text-red-700'}>Sécurité</span>
                                                                    </p>
                                                                    <div className="w-full bg-white rounded-full h-2 mb-1 border border-gray-100">
                                                                        <div className={`h-full rounded-full ${adAnalysis.safetyScore > 80 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${adAnalysis.safetyScore}%` }}></div>
                                                                    </div>
                                                                    <p className="text-right text-xs font-bold">{adAnalysis.safetyScore}/100</p>
                                                                </div>

                                                                {/* Quality Score */}
                                                                <div className="p-3 rounded-lg border bg-blue-50 border-blue-100">
                                                                    <p className="text-xs uppercase font-bold mb-1 flex items-center gap-1 text-blue-700">
                                                                        <Target size={14} /> Impact Marketing
                                                                    </p>
                                                                    <div className="w-full bg-white rounded-full h-2 mb-1 border border-gray-100">
                                                                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${adAnalysis.qualityScore}%` }}></div>
                                                                    </div>
                                                                    <p className="text-right text-xs font-bold">{adAnalysis.qualityScore}/100</p>
                                                                </div>
                                                            </div>

                                                            {adAnalysis.suggestions.length > 0 && (
                                                                <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
                                                                    <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                                                                        <Lightbulb size={14} /> Suggestions d'amélioration :
                                                                    </p>
                                                                    <ul className="list-disc list-inside text-xs text-amber-700 space-y-1">
                                                                        {adAnalysis.suggestions.map((s, i) => (
                                                                            <li key={i}>{s}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                            
                                                            {!adAnalysis.isSafe && adAnalysis.issues.length > 0 && (
                                                                <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
                                                                    <p className="text-xs font-bold text-red-800 mb-2">Problèmes détectés :</p>
                                                                    <ul className="list-disc list-inside text-xs text-red-700 space-y-1">
                                                                        {adAnalysis.issues.map((issue, i) => (
                                                                            <li key={i}>{issue}</li>
                                                                        ))}
                                                                    </ul>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-6"></div>

                                        {/* 2. Audience */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                                                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">2</div>
                                                Ciblez votre audience
                                            </h3>
                                            <div className="grid grid-cols-3 gap-3">
                                                {AUDIENCES.map(aud => (
                                                    <button
                                                        key={aud.id}
                                                        onClick={() => setSelectedAudience(aud.id)}
                                                        className={`p-3 rounded-xl border-2 text-center transition-all flex flex-col items-center gap-2 ${
                                                            selectedAudience === aud.id 
                                                            ? 'border-blue-600 bg-blue-50' 
                                                            : 'border-gray-100 hover:border-gray-200'
                                                        }`}
                                                    >
                                                        <aud.icon size={20} className={selectedAudience === aud.id ? 'text-blue-600' : 'text-gray-400'} />
                                                        <span className={`text-xs font-bold ${selectedAudience === aud.id ? 'text-blue-900' : 'text-gray-600'}`}>{aud.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="border-t border-gray-100 pt-6"></div>

                                        {/* 3. Durée & Budget */}
                                        <div>
                                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-gray-800">
                                                <div className="w-6 h-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs">3</div>
                                                Durée & Budget
                                            </h3>
                                            <div className="grid grid-cols-2 gap-3">
                                                {Object.keys(settings.durationMultipliers).map(durId => {
                                                    const price = calculatePrice(durId);
                                                    const label = durId === '24h' ? '24 Heures' : durId === '3d' ? '3 Jours' : durId === '7d' ? '7 Jours' : '30 Jours';
                                                    return (
                                                        <div 
                                                            key={durId}
                                                            onClick={() => setSelectedDurationId(durId)}
                                                            className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                                                selectedDurationId === durId 
                                                                ? 'border-purple-600 bg-purple-50 shadow-sm' 
                                                                : 'border-gray-100 hover:border-gray-200'
                                                            }`}
                                                        >
                                                            <span className="font-bold text-gray-900 text-sm mb-1">{label}</span>
                                                            <span className="font-bold text-purple-700 text-sm">{formatPrice(price)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Live Preview & Summary (1/3 width, Sticky) */}
                            <div className="lg:col-span-1">
                                <div className="sticky top-24 space-y-4">
                                    <div className="bg-gray-100 rounded-2xl p-4 border border-gray-200">
                                        <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 text-center">Aperçu Résultat Recherche</h3>
                                        
                                        {/* Preview Container with auto height */}
                                        <div className="transform scale-95 origin-top">
                                            <ServiceCard 
                                                provider={{
                                                    id: 'preview',
                                                    name: currentUser?.name || 'Votre Nom',
                                                    category: 'Votre Catégorie',
                                                    rating: 5.0,
                                                    reviewCount: 12,
                                                    priceRange: 'À partir de 50€',
                                                    priceValue: 50,
                                                    priceUnit: 'event',
                                                    imageUrl: selectedAdImage || 'https://picsum.photos/400/300',
                                                    verified: true,
                                                    location: currentUser?.location || 'Paris',
                                                    portfolio: [selectedAdImage] // Lock to selected image so carousel doesn't show arrows if single
                                                }}
                                                isSponsored={true}
                                                className="h-auto shadow-sm bg-white"
                                            />
                                            <div className="mt-2 bg-white/80 backdrop-blur-sm p-3 rounded-lg border border-purple-100 text-xs text-purple-900 text-center shadow-sm">
                                                <strong className="block text-sm mb-1">{adHeadline || 'Titre'}</strong>
                                                {adTagline || 'Description de votre offre...'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-6">
                                        <h3 className="text-xl font-bold mb-6">Récapitulatif</h3>
                                        
                                        <div className="space-y-4 mb-6 border-b border-gray-700 pb-6">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Audience</span>
                                                <span className="font-medium">{AUDIENCES.find(a => a.id === selectedAudience)?.label}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Portée estimée</span>
                                                <span className="font-bold text-green-400">~ {currentReach.toLocaleString()} vues</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-400">Durée</span>
                                                <span className="font-medium">{selectedDurationId}</span>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-lg font-bold">Total</span>
                                            <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                                                {formatPrice(currentPrice)}
                                            </span>
                                        </div>

                                        <Button 
                                            variant="primary" 
                                            fullWidth 
                                            size="lg" 
                                            onClick={initiatePurchase}
                                            disabled={isLoading}
                                            className="bg-white text-gray-900 hover:bg-gray-100 font-bold shadow-glow"
                                        >
                                            {isLoading ? 'Validation...' : 'Lancer la campagne'}
                                        </Button>
                                        
                                        <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                                            <CreditCard size={12} /> Paiement sécurisé • Facture immédiate
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Payment Choice Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl border border-gray-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Choisir le mode de paiement</h3>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                        </div>
                        
                        <div className="mb-6 text-center">
                            <p className="text-gray-500 mb-2">Montant à payer</p>
                            <p className="text-3xl font-bold text-eveneo-dark">{formatPrice(currentPrice)}</p>
                        </div>

                        <div className="space-y-3">
                            <button 
                                onClick={payWithWallet}
                                disabled={isLoading}
                                className="w-full p-4 rounded-xl border-2 border-eveneo-violet bg-violet-50 hover:bg-violet-100 transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-eveneo-violet text-white rounded-full flex items-center justify-center">
                                        <Wallet size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-eveneo-dark group-hover:text-eveneo-violet">Mon Portefeuille</p>
                                        <p className="text-xs text-gray-500">Solde dispo: {formatPrice(walletBalance)}</p>
                                    </div>
                                </div>
                                <div className="text-sm font-bold text-eveneo-violet">Utiliser</div>
                            </button>

                            <div className="relative flex py-2 items-center">
                                <div className="flex-grow border-t border-gray-200"></div>
                                <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">OU</span>
                                <div className="flex-grow border-t border-gray-200"></div>
                            </div>

                            <button 
                                onClick={goToStripe}
                                disabled={isLoading}
                                className="w-full p-4 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all flex items-center justify-between"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 text-gray-600 rounded-full flex items-center justify-center">
                                        <CreditCard size={20} />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-bold text-gray-900">Carte Bancaire</p>
                                        <p className="text-xs text-gray-500">Via Stripe Sécurisé</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
