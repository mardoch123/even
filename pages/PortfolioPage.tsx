import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Image as ImageIcon, Trash2, Plus, Upload, Calendar, FileText, Truck, Check, X, ShoppingBag, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { UserRole } from '../types';
import { imageModerationService } from '../services/imageModerationService';

const DAYS_OF_WEEK = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const PortfolioPage: React.FC = () => {
  const { currentUser } = useAuth();

  const isProvider = currentUser?.role === UserRole.PROVIDER;

  const [cancellationPolicy, setCancellationPolicy] = useState("Annulation gratuite jusqu'à 72h avant l'événement.");
  const [serviceArea, setServiceArea] = useState("Rayon de 50km autour de Paris.");
  const [warrantyEnabled, setWarrantyEnabled] = useState(true);
  const [availability, setAvailability] = useState<string[]>(['Samedi', 'Dimanche']);

  const [includedItems, setIncludedItems] = useState<string[]>(['Service à table (3h)', 'Vaisselle en porcelaine', 'Nettoyage fin de chantier']);
  const [excludedItems, setExcludedItems] = useState<string[]>(['Boissons alcoolisées', 'Heures supplémentaires après minuit']);
  const [newItemInput, setNewItemInput] = useState('');
  const [newExcludedInput, setNewExcludedInput] = useState('');

  const [portfolioImages, setPortfolioImages] = useState<string[]>([
    'https://picsum.photos/400/300?random=1',
    'https://picsum.photos/400/300?random=2'
  ]);
  const [portfolioMeta, setPortfolioMeta] = useState<Record<string, { blocked: boolean; reasons: string[] }>>({});
  const [newImageUrl, setNewImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const providerCategory = String((currentUser as any)?.details?.category || '').toLowerCase();
  const isPastryProvider = providerCategory.includes('pât') || providerCategory.includes('patiss') || providerCategory.includes('patis');
  const isMakeupProvider = providerCategory.includes('maqu') || providerCategory.includes('makeup') || providerCategory.includes('make-up');

  const [pastrySpecialties, setPastrySpecialties] = useState<string[]>([]);
  const [pastryMinLeadDays, setPastryMinLeadDays] = useState<number | ''>('');
  const [pastryWeeklyCapacity, setPastryWeeklyCapacity] = useState<number | ''>('');
  const [pastryDelivery, setPastryDelivery] = useState<'yes' | 'no'>('yes');

  const MAKEUP_SPECIALTIES = ['Peau mature', 'Bridal', 'Editorial', 'Afro-textures', 'Autres'];
  const [makeupSpecialties, setMakeupSpecialties] = useState<string[]>([]);
  const [makeupOtherSpecialty, setMakeupOtherSpecialty] = useState('');
  const [makeupLooks, setMakeupLooks] = useState<{ title: string; tags: string[]; image?: string }[]>([]);
  const [newLookTitle, setNewLookTitle] = useState('');
  const [newLookTags, setNewLookTags] = useState('');
  const [makeupBeforeAfter, setMakeupBeforeAfter] = useState<{ before?: string; after?: string }[]>([]);

  const [packages, setPackages] = useState<{ name: string; price: number; desc: string }[]>([]);
  const [newPkg, setNewPkg] = useState({ name: '', price: '', desc: '' });

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const isFreePlan = !currentUser?.subscriptionPlan || currentUser.subscriptionPlan === 'free';
  const portfolioLimit = isFreePlan ? 3 : 100;

  useEffect(() => {
    const storedPortfolio = localStorage.getItem('provider_portfolio');
    const storedPackages = localStorage.getItem('provider_packages');
    const storedPolicy = localStorage.getItem('provider_cancellation_policy');
    const storedArea = localStorage.getItem('provider_service_area');
    const storedWarranty = localStorage.getItem('provider_warranty_enabled');
    const storedAvail = localStorage.getItem('provider_availability');
    const storedIncluded = localStorage.getItem('provider_included_items');
    const storedExcluded = localStorage.getItem('provider_excluded_items');
    const storedPortfolioMeta = localStorage.getItem('provider_portfolio_meta');
    const storedPastrySpecialties = localStorage.getItem('provider_pastry_specialties');
    const storedPastryMinLeadDays = localStorage.getItem('provider_pastry_min_lead_days');
    const storedPastryWeeklyCapacity = localStorage.getItem('provider_pastry_weekly_capacity');
    const storedPastryDelivery = localStorage.getItem('provider_pastry_delivery');
    const storedMakeupSpecialties = localStorage.getItem('provider_makeup_specialties');
    const storedMakeupOther = localStorage.getItem('provider_makeup_other_specialty');
    const storedMakeupLooks = localStorage.getItem('provider_makeup_looks');
    const storedMakeupBeforeAfter = localStorage.getItem('provider_makeup_before_after');

    if (storedPortfolio) setPortfolioImages(JSON.parse(storedPortfolio));
    if (storedPackages) setPackages(JSON.parse(storedPackages));
    if (storedPolicy) setCancellationPolicy(storedPolicy);
    if (storedArea) setServiceArea(storedArea);
    if (storedWarranty) setWarrantyEnabled(storedWarranty === 'true');
    if (storedAvail) setAvailability(JSON.parse(storedAvail));
    if (storedIncluded) setIncludedItems(JSON.parse(storedIncluded));
    if (storedExcluded) setExcludedItems(JSON.parse(storedExcluded));
    if (storedPortfolioMeta) setPortfolioMeta(JSON.parse(storedPortfolioMeta));

    if (storedPastrySpecialties) setPastrySpecialties(JSON.parse(storedPastrySpecialties));
    if (storedPastryMinLeadDays) setPastryMinLeadDays(Number(storedPastryMinLeadDays));
    if (storedPastryWeeklyCapacity) setPastryWeeklyCapacity(Number(storedPastryWeeklyCapacity));
    if (storedPastryDelivery) setPastryDelivery(storedPastryDelivery === 'no' ? 'no' : 'yes');

    if (storedMakeupSpecialties) setMakeupSpecialties(JSON.parse(storedMakeupSpecialties));
    if (storedMakeupOther) setMakeupOtherSpecialty(storedMakeupOther);
    if (storedMakeupLooks) setMakeupLooks(JSON.parse(storedMakeupLooks));
    if (storedMakeupBeforeAfter) setMakeupBeforeAfter(JSON.parse(storedMakeupBeforeAfter));
  }, []);

  const toggleDay = (day: string) => {
    if (availability.includes(day)) setAvailability(availability.filter(d => d !== day));
    else setAvailability([...availability, day]);
  };

  const readFileAsDataUrl = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('read_failed'));
      reader.readAsDataURL(file);
    });

  const processMakeupImage = async (file: File) => {
    const dataUrl = await readFileAsDataUrl(file);
    if (!dataUrl) return null;
    setMessage({ type: 'info', text: "Analyse OCR de l'image..." });
    const scan = await imageModerationService.scanForIdentifiers(dataUrl);
    if (scan.blocked) {
      setMessage({ type: 'error', text: "Image refusée : watermark/@handle/logo détecté." });
      return null;
    }
    setMessage(null);
    return dataUrl;
  };

  const addIncludedItem = () => {
    if (newItemInput.trim()) {
      setIncludedItems([...includedItems, newItemInput.trim()]);
      setNewItemInput('');
    }
  };
  const removeIncludedItem = (index: number) => {
    const newItems = [...includedItems];
    newItems.splice(index, 1);
    setIncludedItems(newItems);
  };

  const addExcludedItem = () => {
    if (newExcludedInput.trim()) {
      setExcludedItems([...excludedItems, newExcludedInput.trim()]);
      setNewExcludedInput('');
    }
  };
  const removeExcludedItem = (index: number) => {
    const newItems = [...excludedItems];
    newItems.splice(index, 1);
    setExcludedItems(newItems);
  };

  const addImage = () => {
    if (portfolioImages.length >= portfolioLimit) {
      alert('Limite atteinte.');
      return;
    }
    if (newImageUrl) {
      setPortfolioImages([...portfolioImages, newImageUrl]);
      setNewImageUrl('');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (portfolioImages.length >= portfolioLimit) {
      alert('Limite atteinte.');
      return;
    }
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (isMakeupProvider) {
        const dataUrl = await processMakeupImage(file);
        if (!dataUrl) return;
        setPortfolioMeta(prev => ({ ...prev, [dataUrl]: { blocked: false, reasons: [] } }));
        setPortfolioImages(prev => [...prev, dataUrl]);
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      if (!dataUrl) return;

      if (isPastryProvider) {
        setMessage({ type: 'info', text: "Analyse OCR de l'image..." });
        const scan = await imageModerationService.scanForIdentifiers(dataUrl);
        if (scan.blocked) {
          setPortfolioMeta(prev => ({ ...prev, [dataUrl]: { blocked: true, reasons: scan.reasons } }));
          setMessage({ type: 'error', text: "Image masquée : texte/logo/@handle détecté." });
        } else {
          setPortfolioMeta(prev => ({ ...prev, [dataUrl]: { blocked: false, reasons: [] } }));
          setMessage(null);
        }
      }

      setPortfolioImages(prev => [...prev, dataUrl]);
    }
  };

  const removeImage = (index: number) => {
    const newImages = [...portfolioImages];
    newImages.splice(index, 1);
    setPortfolioImages(newImages);
  };

  const toggleMakeupSpecialty = (s: string) => {
    setMakeupSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const addLook = () => {
    const t = newLookTitle.trim();
    if (!t) return;
    const tags = newLookTags
      .split(',')
      .map(x => x.trim())
      .filter(Boolean)
      .slice(0, 8);
    setMakeupLooks(prev => [{ title: t, tags }, ...prev].slice(0, 20));
    setNewLookTitle('');
    setNewLookTags('');
  };

  const uploadLookImage = async (idx: number, file: File) => {
    const dataUrl = await processMakeupImage(file);
    if (!dataUrl) return;
    setMakeupLooks(prev => prev.map((l, i) => i === idx ? { ...l, image: dataUrl } : l));
  };

  const removeLook = (idx: number) => {
    setMakeupLooks(prev => prev.filter((_, i) => i !== idx));
  };

  const addBeforeAfterPair = () => {
    setMakeupBeforeAfter(prev => [...prev, { before: undefined, after: undefined }].slice(0, 12));
  };

  const setBeforeAfterImage = (idx: number, side: 'before' | 'after', url: string) => {
    setMakeupBeforeAfter(prev => prev.map((p, i) => i === idx ? { ...p, [side]: url } : p));
  };

  const removeBeforeAfterPair = (idx: number) => {
    setMakeupBeforeAfter(prev => prev.filter((_, i) => i !== idx));
  };

  const uploadBeforeAfterSide = async (idx: number, side: 'before' | 'after', file: File) => {
    const dataUrl = await processMakeupImage(file);
    if (!dataUrl) return;
    setMakeupBeforeAfter(prev => prev.map((p, i) => i === idx ? { ...p, [side]: dataUrl } : p));
  };

  const addPastrySpecialty = (value: string) => {
    const v = value.trim();
    if (!v) return;
    setPastrySpecialties(prev => prev.includes(v) ? prev : [...prev, v]);
  };
  const removePastrySpecialty = (idx: number) => {
    setPastrySpecialties(prev => prev.filter((_, i) => i !== idx));
  };

  const addPackage = () => {
    if (newPkg.name && newPkg.price) {
      setPackages([...packages, { ...newPkg, price: Number(newPkg.price) }]);
      setNewPkg({ name: '', price: '', desc: '' });
    }
  };

  const removePackage = (idx: number) => {
    const newP = [...packages];
    newP.splice(idx, 1);
    setPackages(newP);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    setTimeout(() => {
      localStorage.setItem('provider_portfolio', JSON.stringify(portfolioImages));
      localStorage.setItem('provider_packages', JSON.stringify(packages));
      localStorage.setItem('provider_cancellation_policy', cancellationPolicy);
      localStorage.setItem('provider_service_area', serviceArea);
      localStorage.setItem('provider_warranty_enabled', String(warrantyEnabled));
      localStorage.setItem('provider_availability', JSON.stringify(availability));
      localStorage.setItem('provider_included_items', JSON.stringify(includedItems));
      localStorage.setItem('provider_excluded_items', JSON.stringify(excludedItems));
      localStorage.setItem('provider_portfolio_meta', JSON.stringify(portfolioMeta));
      localStorage.setItem('provider_profile_completed', 'true');

      if (isPastryProvider) {
        localStorage.setItem('provider_pastry_specialties', JSON.stringify(pastrySpecialties));
        localStorage.setItem('provider_pastry_min_lead_days', String(pastryMinLeadDays || ''));
        localStorage.setItem('provider_pastry_weekly_capacity', String(pastryWeeklyCapacity || ''));
        localStorage.setItem('provider_pastry_delivery', pastryDelivery);

        const storedUserStr = localStorage.getItem('eveneo_user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
        const nextUser = {
          ...storedUser,
          details: {
            ...(storedUser.details || {}),
            pastrySpecialties,
            pastryMinLeadDays: pastryMinLeadDays === '' ? null : Number(pastryMinLeadDays),
            pastryWeeklyCapacity: pastryWeeklyCapacity === '' ? null : Number(pastryWeeklyCapacity),
            pastryDelivery: pastryDelivery === 'yes',
            portfolioMeta
          }
        };
        localStorage.setItem('eveneo_user', JSON.stringify(nextUser));
      }

      if (isMakeupProvider) {
        localStorage.setItem('provider_makeup_specialties', JSON.stringify(makeupSpecialties));
        localStorage.setItem('provider_makeup_other_specialty', makeupOtherSpecialty);
        localStorage.setItem('provider_makeup_looks', JSON.stringify(makeupLooks));
        localStorage.setItem('provider_makeup_before_after', JSON.stringify(makeupBeforeAfter));

        const storedUserStr = localStorage.getItem('eveneo_user');
        const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};
        const nextUser = {
          ...storedUser,
          details: {
            ...(storedUser.details || {}),
            makeupSpecialties,
            makeupOtherSpecialty: makeupOtherSpecialty || null,
            makeupLooks,
            makeupBeforeAfter,
            portfolioMeta
          }
        };
        localStorage.setItem('eveneo_user', JSON.stringify(nextUser));
      }

      setIsLoading(false);
      setMessage({ type: 'success', text: 'Profil public mis à jour.' });
    }, 700);
  };

  if (!isProvider) {
    return (
      <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-gray-100 p-8">
          <h1 className="text-2xl font-bold text-gray-900">Accès restreint</h1>
          <p className="text-gray-500 mt-2">Cette page est réservée aux prestataires.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/dashboard/provider">
          <Button variant="ghost" size="sm" className="pl-0 mb-4 text-gray-500">
            <ArrowLeft size={18} className="mr-1" /> Retour
          </Button>
        </Link>

        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-eveneo-dark mb-2">Portfolio</h1>
            <p className="text-gray-500">Gérez ce qui est visible sur votre profil public (photos, options, infos service).</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${portfolioImages.length >= portfolioLimit ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
            {portfolioImages.length} / {isFreePlan ? 3 : '∞'}
          </span>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
              <ImageIcon size={20} className="text-eveneo-pink" /> Photos du portfolio
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
              {portfolioImages.map((img, idx) => (
                <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-gray-100">
                  <img
                    src={img}
                    className={`w-full h-full object-cover ${portfolioMeta[img]?.blocked ? 'blur-md scale-105' : ''}`}
                  />
                  {portfolioMeta[img]?.blocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs font-bold px-3 text-center">
                      Image masquée (identification détectée)
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-all">
                    <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-red-500 rounded-full">
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}

              {portfolioImages.length < portfolioLimit && (
                <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center p-4 bg-gray-50 group relative">
                  <div className="w-full flex flex-col gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*" />
                    <Button type="button" size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()} className="w-full text-xs bg-white">
                      <Upload size={12} className="mr-1" /> PC
                    </Button>
                    {!isPastryProvider && !isMakeupProvider && (
                      <>
                        <div className="text-xs text-gray-400 text-center">- ou -</div>
                        <input type="text" placeholder="URL..." className="w-full text-xs p-2 border border-gray-200 rounded text-center" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} />
                        <Button type="button" size="sm" variant="primary" onClick={addImage} disabled={!newImageUrl} className="w-full text-xs">
                          <Plus size={12} className="mr-1" /> Lien
                        </Button>
                      </>
                    )}
                    {isPastryProvider && (
                      <div className="text-[11px] text-gray-500 text-center mt-1">
                        Ajout par lien désactivé (OCR requis)
                      </div>
                    )}
                    {isMakeupProvider && (
                      <div className="text-[11px] text-gray-500 text-center mt-1">
                        Ajout par lien désactivé (portfolio hébergé dans l'app)
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {isMakeupProvider && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <FileText size={20} className="text-eveneo-violet" /> Informations Maquilleur
              </h2>

              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Spécialisations</label>
                  <div className="flex flex-wrap gap-2">
                    {MAKEUP_SPECIALTIES.map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => toggleMakeupSpecialty(s)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border ${makeupSpecialties.includes(s) ? 'bg-eveneo-dark text-white border-eveneo-dark' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {makeupSpecialties.includes('Autres') && (
                    <div className="mt-3">
                      <input
                        type="text"
                        className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none"
                        placeholder="Autres spécialisations (ex: FX, shooting studio...)"
                        value={makeupOtherSpecialty}
                        onChange={(e) => setMakeupOtherSpecialty(e.target.value)}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Aucun lien externe ni watermark autorisé. Les photos sont analysées automatiquement.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Looks professionnels</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <input
                      type="text"
                      className="md:col-span-1 bg-white border border-gray-200 rounded-xl p-3 outline-none"
                      placeholder="Titre (ex: Glam Bridal)"
                      value={newLookTitle}
                      onChange={(e) => setNewLookTitle(e.target.value)}
                    />
                    <input
                      type="text"
                      className="md:col-span-2 bg-white border border-gray-200 rounded-xl p-3 outline-none"
                      placeholder="Tags (séparés par des virgules)"
                      value={newLookTags}
                      onChange={(e) => setNewLookTags(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="button" variant="secondary" onClick={addLook}>
                      <Plus size={16} className="mr-2" /> Ajouter
                    </Button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {makeupLooks.map((l, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4">
                            <div className="w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-white">
                              {l.image ? (
                                <img src={l.image} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[11px] text-gray-500">Photo</div>
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900">{l.title}</p>
                              {Array.isArray(l.tags) && l.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-2">
                                  {l.tags.map((t, i) => (
                                    <span key={i} className="px-3 py-1 rounded-full bg-white border border-gray-200 text-xs font-bold text-gray-700">{t}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-2">
                            <label className="text-xs font-bold text-gray-600 cursor-pointer">
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  e.target.value = '';
                                  if (f) void uploadLookImage(idx, f);
                                }}
                              />
                              <span className="inline-block px-3 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50">Importer</span>
                            </label>
                            <button type="button" onClick={() => removeLook(idx)} className="text-red-600 font-bold text-sm">Supprimer</button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {makeupLooks.length === 0 && (
                      <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4">
                        Ajoute quelques looks (ex: "Bridal Soft Glam", "Editorial Smokey").
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">Photos avant / après</label>
                    <Button type="button" variant="secondary" onClick={addBeforeAfterPair}>
                      <Plus size={16} className="mr-2" /> Ajouter une paire
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {makeupBeforeAfter.map((p, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-2xl p-4 bg-white">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                            <div className="aspect-square">
                              {p.before ? (
                                <img src={p.before} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Avant</div>
                              )}
                            </div>
                            <div className="p-2 border-t border-gray-200 bg-white flex justify-center">
                              <label className="text-xs font-bold text-gray-700 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void uploadBeforeAfterSide(idx, 'before', f);
                                  }}
                                />
                                <span className="inline-block px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100">Importer Avant</span>
                              </label>
                            </div>
                          </div>
                          <div className="rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
                            <div className="aspect-square">
                              {p.after ? (
                                <img src={p.after} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">Après</div>
                              )}
                            </div>
                            <div className="p-2 border-t border-gray-200 bg-white flex justify-center">
                              <label className="text-xs font-bold text-gray-700 cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    e.target.value = '';
                                    if (f) void uploadBeforeAfterSide(idx, 'after', f);
                                  }}
                                />
                                <span className="inline-block px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100">Importer Après</span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <p className="text-[11px] text-gray-500">Les images avec watermark/@handle/logo sont refusées automatiquement.</p>
                          <button type="button" onClick={() => removeBeforeAfterPair(idx)} className="text-red-600 font-bold text-sm">Supprimer</button>
                        </div>
                      </div>
                    ))}
                    {makeupBeforeAfter.length === 0 && (
                      <div className="text-sm text-gray-500 bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-4">
                        Ajoute des paires avant/après pour mettre en valeur la transformation.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isPastryProvider && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
                <FileText size={20} className="text-eveneo-violet" /> Informations Pâtissier
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Spécialités</label>
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      className="flex-grow bg-white border border-gray-200 rounded-xl p-3 outline-none"
                      placeholder="Ex: wedding cake"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addPastrySpecialty((e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        const el = document.activeElement as HTMLInputElement | null;
                        if (el && el.tagName === 'INPUT') {
                          addPastrySpecialty(el.value);
                          el.value = '';
                        }
                      }}
                    >
                      <Plus size={16} />
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {pastrySpecialties.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => removePastrySpecialty(i)}
                        className="px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Délai minimal de commande (jours)</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none"
                      value={pastryMinLeadDays}
                      onChange={(e) => setPastryMinLeadDays(e.target.value === '' ? '' : Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Capacité de production / semaine</label>
                    <input
                      type="number"
                      className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none"
                      value={pastryWeeklyCapacity}
                      onChange={(e) => setPastryWeeklyCapacity(e.target.value === '' ? '' : Number(e.target.value))}
                      min={0}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Livraison</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setPastryDelivery('yes')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border ${pastryDelivery === 'yes' ? 'bg-eveneo-dark text-white border-eveneo-dark' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        Oui
                      </button>
                      <button
                        type="button"
                        onClick={() => setPastryDelivery('no')}
                        className={`px-4 py-2 rounded-xl text-sm font-bold border ${pastryDelivery === 'no' ? 'bg-eveneo-dark text-white border-eveneo-dark' : 'bg-white text-gray-600 border-gray-200'}`}
                      >
                        Non
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-gray-800">
              <Calendar size={20} className="text-blue-600" /> Disponibilités & Infos service
            </h2>

            <div className="space-y-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Jours de disponibilité habituels</label>
                <div className="flex flex-wrap gap-3">
                  {DAYS_OF_WEEK.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(day)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${availability.includes(day) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2"><Truck size={16} /> Zone d'intervention</label>
                  <input type="text" className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none" value={serviceArea} onChange={(e) => setServiceArea(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-2"><FileText size={16} /> Politique d'annulation</label>
                  <input type="text" className="w-full bg-white border border-gray-200 rounded-xl p-3 outline-none" value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100">
                <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                  <label className="block text-sm font-bold text-green-800 mb-2 flex items-center gap-2"><Check size={16} /> Inclus</label>
                  <ul className="space-y-2 mb-3">
                    {includedItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between bg-white p-2 rounded-lg border border-green-100 text-sm">
                        <span>{item}</span>
                        <button type="button" onClick={() => removeIncludedItem(idx)}><X size={14} /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input className="flex-grow p-2 text-sm border border-green-200 rounded-lg outline-none" value={newItemInput} onChange={(e) => setNewItemInput(e.target.value)} />
                    <button type="button" onClick={addIncludedItem} className="bg-green-600 text-white p-2 rounded-lg"><Plus size={16} /></button>
                  </div>
                </div>

                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                  <label className="block text-sm font-bold text-red-800 mb-2 flex items-center gap-2"><X size={16} /> Non Inclus</label>
                  <ul className="space-y-2 mb-3">
                    {excludedItems.map((item, idx) => (
                      <li key={idx} className="flex justify-between bg-white p-2 rounded-lg border border-red-100 text-sm">
                        <span>{item}</span>
                        <button type="button" onClick={() => removeExcludedItem(idx)}><X size={14} /></button>
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <input className="flex-grow p-2 text-sm border border-red-200 rounded-lg outline-none" value={newExcludedInput} onChange={(e) => setNewExcludedInput(e.target.value)} />
                    <button type="button" onClick={addExcludedItem} className="bg-red-600 text-white p-2 rounded-lg"><Plus size={16} /></button>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-xl border border-gray-200 mt-2">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShoppingBag size={18} className="text-eveneo-violet" /> Options & Services Supplémentaires (Add-ons)
                </h3>

                <div className="space-y-2 mb-4">
                  {packages.map((pkg, i) => (
                    <div key={i} className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                      <div>
                        <p className="font-bold text-sm">{pkg.name} <span className="text-eveneo-violet ml-2">{pkg.price}€</span></p>
                        {pkg.desc && <p className="text-xs text-gray-500">{pkg.desc}</p>}
                      </div>
                      <button type="button" onClick={() => removePackage(i)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16} /></button>
                    </div>
                  ))}
                  {packages.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">Aucune option configurée.</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <input placeholder="Nom (ex: Heure sup)" value={newPkg.name} onChange={(e) => setNewPkg({ ...newPkg, name: e.target.value })} className="p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-eveneo-violet" />
                  <input placeholder="Prix (€)" type="number" value={newPkg.price} onChange={(e) => setNewPkg({ ...newPkg, price: e.target.value })} className="p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-eveneo-violet" />
                  <input placeholder="Description (ex: Par heure)" value={newPkg.desc} onChange={(e) => setNewPkg({ ...newPkg, desc: e.target.value })} className="p-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-eveneo-violet" />
                </div>

                <Button type="button" onClick={addPackage} size="sm" variant="secondary" fullWidth className="border-gray-300 bg-white hover:bg-gray-100 text-green-600 font-bold">
                  <Plus size={14} className="mr-1" /> Ajouter cette option
                </Button>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex items-start gap-3">
                <input type="checkbox" checked={warrantyEnabled} onChange={(e) => setWarrantyEnabled(e.target.checked)} className="w-5 h-5 mt-1" />
                <div>
                  <label className="font-bold text-gray-900 flex items-center gap-2"><ShieldCheck size={18} className="text-green-600" /> Garantie Événéo</label>
                  <p className="text-sm text-gray-600 mt-1">L'argent est bloqué sur un compte séquestre.</p>
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 p-4 rounded-xl text-sm shadow-lg animate-in slide-in-from-bottom-5 z-50 flex items-center gap-2 ${message.type === 'success' ? 'bg-green-100 text-green-800' : message.type === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}

          <div className="flex justify-end pt-4 sticky bottom-0 bg-gray-50/90 backdrop-blur py-4 border-t border-gray-200 -mx-4 px-4 md:mx-0 md:px-0 md:bg-transparent md:border-0 z-10">
            <Button variant="primary" size="lg" type="submit" disabled={isLoading} className="shadow-xl">
              {isLoading ? '...' : 'Enregistrer'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
