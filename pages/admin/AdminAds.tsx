
import React, { useState, useEffect } from 'react';
import { Save, Megaphone, TrendingUp, MousePointer, Eye, DollarSign, Calendar, Search, RefreshCw, ShoppingBag, Power, Globe, MapPin, AlertCircle, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { adsService, AdSettings, AdCampaign } from '../../services/adsService';
import { useCurrency } from '../../contexts/CurrencyContext';

export const AdminAds: React.FC = () => {
    const { formatPrice } = useCurrency();
    const [activeTab, setActiveTab] = useState<'stats' | 'campaigns' | 'settings' | 'moderation'>('stats');
    
    // Settings State
    const [settings, setSettings] = useState<AdSettings>(adsService.getSettings());
    const [allowedCountriesInput, setAllowedCountriesInput] = useState('');
    
    // Data State
    const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
    const [globalStats, setGlobalStats] = useState<any>({});
    const [selectedCampaign, setSelectedCampaign] = useState<AdCampaign | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        // Initial Load
        const loadData = () => {
            const camps = adsService.getCampaigns();
            const currentSettings = adsService.getSettings();
            setCampaigns(camps);
            setGlobalStats(adsService.getGlobalStats());
            setSettings(currentSettings);
            setAllowedCountriesInput(currentSettings.allowedCountries.join(', '));
        };
        loadData();

        // Real-time simulation loop for the Admin Dashboard
        const interval = setInterval(() => {
            adsService.simulateTraffic();
            setRefreshKey(k => k + 1); // Force re-render
            // Reload data
            const freshCamps = adsService.getCampaigns();
            setCampaigns(freshCamps);
            setGlobalStats(adsService.getGlobalStats());
            
            // Update selected campaign if open
            if (selectedCampaign) {
                const freshSelected = freshCamps.find(c => c.id === selectedCampaign.id);
                if (freshSelected) setSelectedCampaign(freshSelected);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [selectedCampaign?.id]);

    const handleSaveSettings = () => {
        const countries = allowedCountriesInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
        const newSettings = { ...settings, allowedCountries: countries };
        adsService.saveSettings(newSettings);
        setSettings(newSettings);
        alert("Configuration des prix et restrictions mise à jour.");
    };

    const toggleEnabled = () => {
        const newSettings = { ...settings, enabled: !settings.enabled };
        adsService.saveSettings(newSettings);
        setSettings(newSettings);
        if (!newSettings.enabled) {
            alert("Le système de publicité a été désactivé globalement. Les boutons de boost disparaîtront des profils prestataires.");
        } else {
            alert("Le système de publicité est activé.");
        }
    };

    const handleModeration = (id: string, action: 'approve' | 'reject') => {
        if (action === 'approve') {
            adsService.updateCampaignStatus(id, 'active');
            alert("Publicité approuvée et mise en ligne.");
        } else {
            if (confirm("Refuser définitivement cette publicité ?")) {
                adsService.updateCampaignStatus(id, 'rejected');
                alert("Publicité refusée.");
            }
        }
        // Force refresh local state
        const freshCamps = adsService.getCampaigns();
        setCampaigns(freshCamps);
    };

    const pendingAds = campaigns.filter(c => c.status === 'pending_review');

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Gestion Publicité & Sponsoring</h1>
                    <p className="text-gray-500">Configurez les prix et suivez la performance des campagnes.</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-1 flex overflow-x-auto max-w-full">
                    <button onClick={() => setActiveTab('stats')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'stats' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Stats
                    </button>
                    <button onClick={() => setActiveTab('moderation')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'moderation' ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Modération
                        {pendingAds.length > 0 && <span className="bg-white text-orange-600 rounded-full px-1.5 py-0.5 text-xs">{pendingAds.length}</span>}
                    </button>
                    <button onClick={() => setActiveTab('campaigns')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'campaigns' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Campagnes
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                        Config
                    </button>
                </div>
            </div>

            {/* STATS TAB */}
            {activeTab === 'stats' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in">
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-white/20 p-3 rounded-xl"><DollarSign size={24} /></div>
                            <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded-full">+15%</span>
                        </div>
                        <p className="text-purple-100 text-sm font-medium">Revenu Publicitaire Total</p>
                        <h3 className="text-3xl font-bold">{formatPrice(globalStats.totalRevenue || 0)}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Eye size={24} /></div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Impressions Générées</p>
                        <h3 className="text-3xl font-bold text-gray-900">{(globalStats.totalImpressions || 0).toLocaleString()}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-orange-50 p-3 rounded-xl text-orange-600"><MousePointer size={24} /></div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Clics Totaux</p>
                        <h3 className="text-3xl font-bold text-gray-900">{(globalStats.totalClicks || 0).toLocaleString()}</h3>
                    </div>
                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-green-50 p-3 rounded-xl text-green-600"><Megaphone size={24} /></div>
                        </div>
                        <p className="text-gray-500 text-sm font-medium">Campagnes Actives</p>
                        <h3 className="text-3xl font-bold text-gray-900">{globalStats.activeCampaignsCount || 0}</h3>
                    </div>
                </div>
            )}

            {/* MODERATION TAB */}
            {activeTab === 'moderation' && (
                <div className="animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-200 bg-orange-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-orange-900 flex items-center gap-2">
                                    <ShieldAlert size={20} /> File d'attente Modération
                                </h3>
                                <p className="text-sm text-orange-700">Les publicités détectées comme suspectes par l'IA nécessitent votre validation.</p>
                            </div>
                            <span className="bg-white text-orange-700 px-3 py-1 rounded-full text-sm font-bold border border-orange-200">
                                {pendingAds.length} en attente
                            </span>
                        </div>

                        {pendingAds.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-xl font-bold text-gray-700">Tout est propre !</h3>
                                <p>Aucune publicité en attente de validation.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {pendingAds.map(ad => (
                                    <div key={ad.id} className="p-6 flex flex-col lg:flex-row gap-6 items-start">
                                        <div className="flex-grow space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-gray-900 text-lg">{ad.creative.headline}</h4>
                                                    <p className="text-gray-600">{ad.creative.tagline}</p>
                                                </div>
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 font-mono">
                                                    {ad.providerName}
                                                </span>
                                            </div>
                                            
                                            <div className="flex gap-2 flex-wrap">
                                                {ad.creative.tags.map(tag => (
                                                    <span key={tag} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs">#{tag}</span>
                                                ))}
                                            </div>

                                            <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-sm">
                                                <strong className="text-red-800 flex items-center gap-2 mb-1">
                                                    <AlertCircle size={14} /> Analyse IA :
                                                </strong>
                                                <p className="text-red-700">{ad.aiAnalysis?.reason || "Contenu potentiellement inapproprié."}</p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-2 min-w-[150px]">
                                            <Button 
                                                size="sm" 
                                                variant="primary" 
                                                className="bg-green-600 hover:bg-green-700 border-transparent w-full justify-center"
                                                onClick={() => handleModeration(ad.id, 'approve')}
                                            >
                                                <CheckCircle size={16} className="mr-2" /> Approuver
                                            </Button>
                                            <Button 
                                                size="sm" 
                                                variant="outline" 
                                                className="border-red-200 text-red-600 hover:bg-red-50 w-full justify-center"
                                                onClick={() => handleModeration(ad.id, 'reject')}
                                            >
                                                <XCircle size={16} className="mr-2" /> Refuser
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CAMPAIGNS TAB */}
            {activeTab === 'campaigns' && (
                <div className="flex gap-6 animate-in fade-in h-[600px]">
                    {/* List */}
                    <div className="flex-grow bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800">Toutes les promotions</h3>
                            <span className="text-xs text-gray-500 flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Live</span>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-white text-gray-500 font-medium border-b border-gray-200 uppercase text-xs sticky top-0">
                                    <tr>
                                        <th className="px-6 py-3">Prestataire</th>
                                        <th className="px-6 py-3">Cible</th>
                                        <th className="px-6 py-3 text-right">Budget</th>
                                        <th className="px-6 py-3 text-right">Vues</th>
                                        <th className="px-6 py-3 text-right">Clics</th>
                                        <th className="px-6 py-3">Statut</th>
                                        <th className="px-6 py-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {campaigns.map(camp => (
                                        <tr key={camp.id} className={`hover:bg-gray-50 transition-colors ${selectedCampaign?.id === camp.id ? 'bg-blue-50' : ''}`}>
                                            <td className="px-6 py-4 font-bold text-gray-900">{camp.providerName}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium flex items-center gap-1"><Globe size={10} /> {camp.targetCountry}</span>
                                                    <span className="text-xs text-gray-500">{camp.duration}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium">{formatPrice(camp.budgetTotal)}</td>
                                            <td className="px-6 py-4 text-right">{camp.stats.impressions.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right">{camp.stats.clicks.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                {camp.status === 'active' ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ACTIF</span>
                                                ) : camp.status === 'paused' ? (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">PAUSE</span>
                                                ) : camp.status === 'pending_review' ? (
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold">EXAMEN</span>
                                                ) : camp.status === 'rejected' ? (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">REFUSÉ</span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded text-xs font-bold">TERMINÉ</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <button 
                                                    onClick={() => setSelectedCampaign(camp)}
                                                    className="text-blue-600 hover:underline text-xs font-bold"
                                                >
                                                    Détails
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Detail Panel */}
                    {selectedCampaign && (
                        <div className="w-1/3 bg-white rounded-2xl shadow-xl border border-gray-200 p-6 flex flex-col animate-in slide-in-from-right">
                            <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{selectedCampaign.providerName}</h2>
                                    <p className="text-sm text-gray-500">Campagne #{selectedCampaign.id}</p>
                                </div>
                                <button onClick={() => setSelectedCampaign(null)} className="text-gray-400 hover:text-gray-600">Fermer</button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Impressions</p>
                                        <p className="text-2xl font-bold text-gray-900">{selectedCampaign.stats.impressions}</p>
                                    </div>
                                    <div className="bg-gray-50 p-4 rounded-xl text-center">
                                        <p className="text-xs text-gray-500 uppercase font-bold mb-1">Clics</p>
                                        <p className="text-2xl font-bold text-blue-600">{selectedCampaign.stats.clicks}</p>
                                    </div>
                                </div>

                                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                                    <h4 className="font-bold text-green-800 mb-2 flex items-center gap-2">
                                        <ShoppingBag size={18} /> Impact Business (Estimé)
                                    </h4>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-sm text-green-700">Commandes générées</p>
                                            <p className="text-sm text-green-700">Chiffre d'affaires</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-green-900 text-lg">{selectedCampaign.stats.reservations}</p>
                                            <p className="font-bold text-green-900">{formatPrice(selectedCampaign.stats.revenueGenerated)}</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedCampaign.status === 'rejected' && (
                                    <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-red-700 text-sm">
                                        <strong>Campagne refusée.</strong> {selectedCampaign.aiAnalysis?.reason}
                                    </div>
                                )}

                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-sm font-bold mb-2">Consommation Budget</p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: '65%' }}></div>
                                    </div>
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>65% consommé</span>
                                        <span>Reste: {formatPrice(selectedCampaign.budgetTotal * 0.35)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* SETTINGS TAB */}
            {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in">
                    {/* Existing Settings content remains the same */}
                    <div className={`bg-white rounded-2xl shadow-sm border p-8 transition-colors ${settings.enabled ? 'border-green-200' : 'border-red-200'}`}>
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <Power size={20} className={settings.enabled ? "text-green-600" : "text-red-600"} /> 
                            État du Système Publicitaire
                        </h2>

                        <div className={`flex items-center justify-between p-6 rounded-xl mb-6 border ${settings.enabled ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div>
                                <p className={`font-bold text-lg ${settings.enabled ? 'text-green-800' : 'text-red-800'}`}>
                                    {settings.enabled ? 'Système ACTIF' : 'Système DÉSACTIVÉ'}
                                </p>
                                <p className="text-sm opacity-80 mt-1">
                                    {settings.enabled 
                                        ? "Les prestataires peuvent acheter des boosts et les campagnes sont diffusées." 
                                        : "L'achat de boost est bloqué et toutes les campagnes sont masquées."}
                                </p>
                            </div>
                            <button 
                                onClick={toggleEnabled}
                                className={`w-16 h-9 rounded-full flex items-center p-1 transition-all duration-300 shadow-inner ${settings.enabled ? 'bg-green-500' : 'bg-gray-300'}`}
                            >
                                <div className={`w-7 h-7 bg-white rounded-full shadow-md transform transition-transform duration-300 flex items-center justify-center ${settings.enabled ? 'translate-x-7' : 'translate-x-0'}`}>
                                    <Power size={14} className={settings.enabled ? "text-green-500" : "text-gray-400"} />
                                </div>
                            </button>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                                <Globe size={16} /> Régions Autorisées
                            </label>
                            <input 
                                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-eveneo-violet"
                                placeholder="France, Canada, Belgique..."
                                value={allowedCountriesInput}
                                onChange={(e) => setAllowedCountriesInput(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Pricing Config */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <DollarSign size={20} className="text-blue-600" /> 
                            Tarification
                        </h2>
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    CPM de Base (Coût pour 1000 vues)
                                </label>
                                <div className="relative">
                                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input 
                                        type="number" 
                                        value={settings.baseCPM}
                                        onChange={(e) => setSettings({...settings, baseCPM: Number(e.target.value)})}
                                        className="w-full pl-9 p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        <Button variant="primary" fullWidth size="lg" onClick={handleSaveSettings} className="shadow-xl">
                            <Save size={18} className="mr-2" /> Sauvegarder la configuration
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};
