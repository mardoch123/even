
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { CheckCircle, Smartphone, Mail, User, ArrowRight, ShieldCheck, Upload, Camera, AlertCircle, List, ChevronDown } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserRole } from '../types';
import { supabase } from '../services/supabaseClient';
import { useToast } from '../contexts/ToastContext';

const PROVIDER_CATEGORIES = [
  'Traiteur',
  'DJ',
  'Photographe',
  'Vidéaste',
  'Lieu de réception',
  'Décoration & Fleurs',
  'Animation',
  'Wedding Planner',
  'Sécurité',
  'Voiturier / Transport',
  'Maquillage / Coiffure',
  'Musiciens / Groupe',
  'Location de matériel',
  'Autre'
];

const COUNTRY_CODES = [
  { code: '+33', label: 'France', flag: '🇫🇷' },
  { code: '+1', label: 'Canada', flag: '🇨🇦' },
  { code: '+1', label: 'USA', flag: '🇺🇸' },
  { code: '+32', label: 'Belgique', flag: '🇧🇪' },
  { code: '+41', label: 'Suisse', flag: '🇨🇭' },
  { code: '+44', label: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+49', label: 'Allemagne', flag: '🇩🇪' },
  { code: '+34', label: 'Espagne', flag: '🇪🇸' },
  { code: '+39', label: 'Italie', flag: '🇮🇹' },
  { code: '+212', label: 'Maroc', flag: '🇲🇦' },
  { code: '+216', label: 'Tunisie', flag: '🇹🇳' },
  { code: '+221', label: 'Sénégal', flag: '🇸🇳' },
];

const CATEGORY_SPECIFIC_FIELDS: Record<string, { label: string, key: string, type: 'text' | 'select' | 'number' | 'multiselect', options?: string[] }[]> = {
  'Traiteur': [
    { label: 'Type de cuisine', key: 'cuisineType', type: 'select', options: ['Française', 'Italienne', 'Asiatique', 'Fusion', 'Vegan', 'Traditionnelle'] },
    { label: 'Régimes spéciaux pris en compte', key: 'dietaryOptions', type: 'multiselect', options: ['Sans Gluten', 'Halal', 'Kasher', 'Végétarien', 'Aucun'] },
    { label: 'Dégustation avant événement ?', key: 'tastingAvailable', type: 'select', options: ['Oui', 'Non', 'Sur devis'] }
  ],
  'DJ': [
    { label: 'Styles musicaux', key: 'musicStyles', type: 'multiselect', options: ['Généraliste', 'House/Electro', 'Pop/Rock', 'Latino', 'Jazz', 'Rap/RnB'] },
    { label: 'Matériel son/lumière inclus ?', key: 'equipmentIncluded', type: 'select', options: ['Oui, complet', 'Son uniquement', 'Non'] },
    { label: 'Années d\'expérience', key: 'experienceYears', type: 'number' }
  ],
  'Photographe': [
    { label: 'Style photographique', key: 'photoStyle', type: 'select', options: ['Reportage / Naturel', 'Artistique / Posé', 'Studio', 'Vintage'] },
    { label: 'Délai de livraison (jours)', key: 'deliveryTime', type: 'number' },
    { label: 'Option Drone ?', key: 'droneAvailable', type: 'select', options: ['Oui', 'Non'] }
  ],
  'Lieu de réception': [
    { label: 'Capacité assise maximum', key: 'capacitySeated', type: 'number' },
    { label: 'Hébergement sur place ?', key: 'accommodation', type: 'select', options: ['Oui', 'Non'] },
    { label: 'Espaces extérieurs ?', key: 'outdoorSpace', type: 'select', options: ['Oui', 'Non'] }
  ]
};

const CLIENT_FIELDS = [
  { label: 'Type d\'événements préférés', key: 'eventInterests', type: 'multiselect', options: ['Mariage', 'Anniversaire', 'Soirée Entreprise', 'Festival', 'Privé'] },
  { label: 'Budget moyen par événement (€)', key: 'averageBudget', type: 'number' }
];

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { addToast } = useToast();
  const role = searchParams.get('role') === 'provider' ? UserRole.PROVIDER : UserRole.CLIENT;

  const [step, setStep] = useState(1);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [countryCode, setCountryCode] = useState('+33');
  const [localPhone, setLocalPhone] = useState('');
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [city, setCity] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [siret, setSiret] = useState('');
  const [category, setCategory] = useState(PROVIDER_CATEGORIES[0]);
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  const [detailsData, setDetailsData] = useState<Record<string, any>>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (location.state && location.state.prefilledPhone) {
      const phone = location.state.prefilledPhone;
      if (phone.startsWith('+')) {
        const foundCode = COUNTRY_CODES.find(c => phone.startsWith(c.code));
        if (foundCode) {
          setCountryCode(foundCode.code);
          setLocalPhone(phone.replace(foundCode.code, '').trim());
        } else {
          setLocalPhone(phone);
        }
      } else {
        setLocalPhone(phone);
      }
    }
  }, [location.state]);

  const handleSendCode = async () => {
    if (!localPhone) {
      setError("Veuillez entrer un numéro de téléphone.");
      return;
    }

    const cleanedLocal = localPhone.replace(/[\s.-]/g, '');
    const finalLocal = cleanedLocal.startsWith('0') ? cleanedLocal.substring(1) : cleanedLocal;
    const fullPhoneNumber = `${countryCode}${finalLocal}`;

    setIsLoading(true);
    setError('');
    setIsDemoMode(false);

    try {
      const { error: sendError } = await supabase.auth.signInWithOtp({
        phone: fullPhoneNumber
      });

      if (sendError) throw sendError;

      addToast('success', `Code envoyé au ${fullPhoneNumber}`);
      setVerificationId(fullPhoneNumber);
    } catch (err: any) {
      const msg = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
      const lowerMsg = msg.toLowerCase();

      // FIX: Explicitly check for "Unsupported phone provider" to enable demo mode
      // Handles cases where Twilio/MessageBird is not set up in Supabase project
      if (
        lowerMsg.includes("sms provider") ||
        lowerMsg.includes("unsupported phone provider") ||
        lowerMsg.includes("signups not allowed") ||
        lowerMsg.includes("error sending sms")
      ) {
        console.warn("SMS Provider not configured (switching to Demo Mode):", msg);
        setError("Service SMS indisponible (Mode Démo activé). Utilisez le code : 123456");
        setIsDemoMode(true);
        setVerificationId(fullPhoneNumber);
      } else {
        console.error("Supabase Send Error:", err);
        setError(msg || "Erreur lors de l'envoi du code. Veuillez réessayer.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!code || !verificationId) return;
    setIsLoading(true);
    setError('');

    if (isDemoMode) {
      if (code === '123456') {
        setTimeout(() => {
          addToast('success', "Numéro vérifié (Mode Démo) !");
          setStep(2); // Skip email, go directly to info
          setIsLoading(false);
        }, 500);
      } else {
        setError("Code invalide (Mode Démo : 123456)");
        setIsLoading(false);
      }
      return;
    }

    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: verificationId,
        token: code,
        type: 'sms'
      });

      if (verifyError) throw verifyError;

      addToast('success', "Numéro de téléphone vérifié avec succès !");
      setStep(2); // Skip email, go directly to info
    } catch (err: any) {
      console.error("Verification Error:", err);
      setError("Code invalide ou expiré. Veuillez réessayer.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyEmail = async () => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Try to get current session first
      const { data: { session: currentSession }, error: getError } = await supabase.auth.getSession();

      let session = currentSession;

      // 2. If no session, try to refresh (sometimes works if token is in URL)
      if (!session) {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError) {
          // If refresh fails, we really don't have a session
          throw new Error("Session introuvable. Veuillez vous connecter pour continuer.");
        }
        session = refreshedSession;
      }

      if (!session?.user) {
        throw new Error("Session expirée. Veuillez vous connecter.");
      }

      // 3. Check if email is confirmed
      // Force reload user data to be sure
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      if (user?.email_confirmed_at) {
        addToast('success', "Email vérifié avec succès !");
        setStep(3);
      } else {
        setError("Votre email n'est pas encore vérifié. Veuillez cliquer sur le lien reçu.");
      }
    } catch (err: any) {
      console.error("Email Verification Error:", err);
      if (err.message?.includes("Session") || err.message?.includes("AuthSessionMissingError")) {
        setError("Nous ne détectons pas votre connexion. Si vous avez validé votre email dans un autre onglet, veuillez vous connecter ici.");
        // Optionally show a login button or link here via state, but text is a good start.
      } else {
        setError("Impossible de vérifier l'email. Réessayez ou connectez-vous.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setIsLoading(true);
    setError('');
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        // If we can't get the user, we can't resend. Prompt login.
        throw new Error("Session introuvable. Veuillez vous connecter pour renvoyer l'email.");
      }

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
        options: {
          emailRedirectTo: window.location.origin + '/onboarding'
        }
      });

      if (error) throw error;
      addToast('success', "Email de confirmation renvoyé ! Vérifiez vos spams.");
    } catch (err: any) {
      console.error("Resend Error:", err);
      if (err.message?.includes("Session") || err.message?.includes("connecter")) {
        setError("Veuillez vous connecter pour renvoyer l'email.");
      } else if (err.status === 429) {
        setError("Trop de tentatives. Veuillez patienter une minute.");
      } else {
        setError("Erreur lors du renvoi. Vérifiez votre connexion.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDetailsSubmit = () => {
    if (!city.trim()) { setError("La ville est obligatoire pour valider votre zone d'intervention."); return; }
    if (role === UserRole.PROVIDER && !companyName.trim()) { setError("Le nom de l'entreprise est obligatoire."); return; }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(3);
    }, 600);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImage(file);
      setProfileImagePreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleDynamicDetailChange = (key: string, value: any) => {
    setDetailsData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleCompleteProfile = () => {
    setIsLoading(true);

    const storedUserStr = localStorage.getItem('eveneo_user');
    const storedUser = storedUserStr ? JSON.parse(storedUserStr) : {};

    // Ensure location/city is saved
    const userPayload = {
      ...storedUser,
      role: role,
      location: city, // IMPORTANT: Store city
      avatarUrl: profileImagePreview || storedUser.avatarUrl,
      isVerified: role === UserRole.CLIENT,
      details: {
        ...detailsData,
        companyName: role === UserRole.PROVIDER ? companyName : undefined,
        siret: role === UserRole.PROVIDER ? siret : undefined,
        category: role === UserRole.PROVIDER ? category : undefined,
      }
    };

    setTimeout(() => {
      setIsLoading(false);

      localStorage.setItem('eveneo_user', JSON.stringify(userPayload));
      localStorage.setItem('eveneo_user_role', role);
      localStorage.setItem('provider_profile_completed', 'true');
      // Fallback for specific location access
      localStorage.setItem('user_address', city);

      // FORCE RELOAD: This ensures AuthContext re-initializes from localStorage
      // resolving the issue where users have to login twice or aren't redirected.
      window.location.href = '/#/';
      window.location.reload();
    }, 1500);
  };

  const renderStepIndicator = () => (
    <div className="flex justify-center items-center mb-8">
      {[1, 2, 3].map((i) => (
        <React.Fragment key={i}>
          <div className={`
            w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 text-sm
            ${step === i ? 'bg-eveneo-gradient text-white shadow-glow scale-110' :
              step > i ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}
          `}>
            {step > i ? <CheckCircle size={18} /> : i}
          </div>
          {i < 3 && (
            <div className={`w-8 md:w-16 h-1 bg-gray-200 mx-1 md:mx-2 rounded-full overflow-hidden`}>
              <div className={`h-full bg-green-500 transition-all duration-500 ${step > i ? 'w-full' : 'w-0'}`} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const getFieldsForCategory = () => {
    if (role === UserRole.CLIENT) return CLIENT_FIELDS;
    return CATEGORY_SPECIFIC_FIELDS[category] || [];
  };

  return (
    <div className="min-h-screen bg-eveneo-light pt-24 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-eveneo-dark mb-2">Finalisons votre compte</h1>
          <p className="text-gray-500">Étape {step} sur 3</p>
        </div>

        {renderStepIndicator()}

        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 border border-gray-100 relative overflow-hidden">

          {step === 1 && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-eveneo-blue mx-auto mb-6">
                <Smartphone size={32} />
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">Vérification Téléphone</h2>
              <p className="text-center text-gray-500 text-sm mb-6">Nous allons vous envoyer un code SMS sécurisé.</p>

              <div className="max-w-sm mx-auto">
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {!verificationId ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Numéro de mobile</label>
                      <div className="flex">
                        <div className="relative">
                          <select
                            className="appearance-none bg-gray-50 border border-gray-200 border-r-0 rounded-l-xl py-3 pl-3 pr-8 h-full focus:outline-none focus:border-eveneo-violet"
                            value={countryCode}
                            onChange={(e) => setCountryCode(e.target.value)}
                          >
                            {COUNTRY_CODES.map((c) => (
                              <option key={`${c.code}-${c.label}`} value={c.code}>
                                {c.flag} {c.code}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>

                        <input
                          type="tel"
                          className="flex-grow bg-gray-50 border border-gray-200 rounded-r-xl p-3 focus:outline-none focus:border-eveneo-violet"
                          placeholder="6 12 34 56 78"
                          value={localPhone}
                          onChange={(e) => setLocalPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        />
                      </div>
                    </div>

                    <Button variant="primary" fullWidth onClick={handleSendCode} disabled={isLoading}>
                      {isLoading ? 'Envoi...' : 'Envoyer le code'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4 animate-in fade-in">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Code reçu</label>
                      <Input
                        placeholder="123456"
                        className="text-center text-2xl tracking-[0.5em] font-mono font-bold"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        maxLength={6}
                        autoFocus
                      />
                    </div>

                    <Button variant="primary" fullWidth onClick={handleVerifyCode} disabled={isLoading || code.length < 6}>
                      {isLoading ? 'Vérification...' : 'Valider le code'}
                    </Button>

                    <button
                      onClick={() => { setVerificationId(null); setCode(''); setError(''); setIsDemoMode(false); }}
                      className="w-full text-sm text-gray-500 hover:text-eveneo-violet underline mt-2"
                    >
                      Changer de numéro
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-eveneo-pink mx-auto mb-6">
                {role === UserRole.PROVIDER ? <ShieldCheck size={32} /> : <User size={32} />}
              </div>
              <h2 className="text-2xl font-bold text-center mb-6">Informations Générales</h2>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">{error}</div>}

              <div className="space-y-4 max-w-md mx-auto">
                <div className="flex flex-col items-center gap-2 mb-6">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 cursor-pointer hover:border-eveneo-violet relative overflow-hidden group" onClick={() => fileInputRef.current?.click()}>
                    {profileImagePreview ? <img src={profileImagePreview} className="w-full h-full object-cover" /> : <Camera size={32} />}
                  </div>
                  <span className="text-xs text-gray-500">Photo de profil</span>
                  <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                </div>

                <Input label="Ville (Obligatoire) *" placeholder="Paris" value={city} onChange={(e) => setCity(e.target.value)} required />

                {role === UserRole.PROVIDER && (
                  <>
                    <Input label="Nom de l'entreprise *" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                    <Input label="SIRET / NEQ" value={siret} onChange={(e) => setSiret(e.target.value)} placeholder="123 456 789..." />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Catégorie *</label>
                      <select className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20" value={category} onChange={(e) => setCategory(e.target.value)}>
                        {PROVIDER_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>
                  </>
                )}

                <Button variant="primary" fullWidth onClick={handleDetailsSubmit} disabled={isLoading} className="mt-4">
                  Suivant
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in slide-in-from-right duration-300">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-6">
                <List size={32} />
              </div>
              <h2 className="text-2xl font-bold text-center mb-2">Détails de l'activité</h2>
              <p className="text-center text-gray-500 mb-8">Complétez votre profil pour une meilleure visibilité.</p>

              <div className="space-y-5 max-w-md mx-auto">
                {getFieldsForCategory().map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{field.label}</label>

                    {field.type === 'select' && (
                      <select
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3"
                        onChange={(e) => handleDynamicDetailChange(field.key, e.target.value)}
                      >
                        <option value="">Sélectionner...</option>
                        {field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    )}

                    {field.type === 'multiselect' && (
                      <div className="flex flex-wrap gap-2">
                        {field.options?.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => {
                              const current = detailsData[field.key] || [];
                              const updated = current.includes(opt) ? current.filter((i: string) => i !== opt) : [...current, opt];
                              handleDynamicDetailChange(field.key, updated);
                            }}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${(detailsData[field.key] || []).includes(opt)
                              ? 'bg-eveneo-violet text-white border-eveneo-violet'
                              : 'bg-white text-gray-600 border-gray-200'
                              }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}

                    {field.type === 'text' && (
                      <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" onChange={(e) => handleDynamicDetailChange(field.key, e.target.value)} />
                    )}

                    {field.type === 'number' && (
                      <input type="number" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3" onChange={(e) => handleDynamicDetailChange(field.key, Number(e.target.value))} />
                    )}
                  </div>
                ))}

                <div className="pt-4">
                  <Button variant="primary" fullWidth size="lg" onClick={handleCompleteProfile} disabled={isLoading} className="group">
                    {isLoading ? 'Finalisation...' : "Terminer l'inscription"}
                    {!isLoading && <ArrowRight className="ml-2" size={18} />}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
