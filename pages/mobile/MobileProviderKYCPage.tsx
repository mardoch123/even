import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Shield,
  CheckCircle,
  AlertCircle,
  Camera,
  Upload,
  FileText,
  User,
  Briefcase,
  MapPin,
  ChevronRight,
  X,
  Loader2,
  IdCard,
  Building2,
  CreditCard
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface KYCDocument {
  id: string;
  type: 'identity' | 'address' | 'business' | 'bank';
  status: 'pending' | 'verified' | 'rejected';
  url?: string;
  uploadedAt?: string;
  rejectionReason?: string;
}

interface KYCFormData {
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  idNumber: string;
  idType: 'passport' | 'id_card' | 'driver_license';
  address: string;
  city: string;
  postalCode: string;
  country: string;
  businessName?: string;
  businessNumber?: string;
  businessType?: 'individual' | 'company';
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankName?: string;
}

export const MobileProviderKYCPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  const [kycStatus, setKycStatus] = useState<'not_started' | 'pending' | 'verified' | 'rejected'>('not_started');
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadType, setCurrentUploadType] = useState<KYCDocument['type']>('identity');
  
  const [formData, setFormData] = useState<KYCFormData>({
    firstName: '',
    lastName: '',
    birthDate: '',
    nationality: '',
    idNumber: '',
    idType: 'id_card',
    address: '',
    city: '',
    postalCode: '',
    country: 'France',
    businessType: 'individual',
    businessName: '',
    businessNumber: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankName: ''
  });

  useEffect(() => {
    const fetchKYCData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // First check if user profile is already verified
        if (currentUser.kycStatus === 'verified' || currentUser.isVerified) {
          setKycStatus('verified');
          setLoading(false);
          return;
        }

        // Get existing KYC data from provider_kyc table
        const { data: kycData } = await supabase
          .from('provider_kyc')
          .select('*')
          .eq('provider_id', currentUser.id)
          .single();

        if (kycData) {
          setKycStatus(kycData.status || 'not_started');
          setFormData({
            firstName: kycData.first_name || '',
            lastName: kycData.last_name || '',
            birthDate: kycData.birth_date || '',
            nationality: kycData.nationality || '',
            idNumber: kycData.id_number || '',
            idType: kycData.id_type || 'id_card',
            address: kycData.address || '',
            city: kycData.city || '',
            postalCode: kycData.postal_code || '',
            country: kycData.country || 'France',
            businessType: kycData.business_type || 'individual',
            businessName: kycData.business_name || '',
            businessNumber: kycData.business_number || '',
            bankAccountName: kycData.bank_account_name || '',
            bankAccountNumber: kycData.bank_account_number || '',
            bankName: kycData.bank_name || ''
          });
        } else if (currentUser.kycStatus) {
          // Use kycStatus from user profile if no KYC data found
          setKycStatus(currentUser.kycStatus as any);
        }

        // Get uploaded documents
        const { data: docsData } = await supabase
          .from('kyc_documents')
          .select('*')
          .eq('provider_id', currentUser.id);

        if (docsData) {
          setDocuments(docsData.map(d => ({
            id: d.id,
            type: d.document_type,
            status: d.status,
            url: d.url,
            uploadedAt: d.uploaded_at,
            rejectionReason: d.rejection_reason
          })));
        }
      } catch (error) {
        console.error('Error fetching KYC data:', error);
        // If error but user has kycStatus, use it
        if (currentUser?.kycStatus) {
          setKycStatus(currentUser.kycStatus as any);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchKYCData();
  }, [currentUser]);

  const handleInputChange = (field: keyof KYCFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: KYCDocument['type']) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingDoc(type);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${type}-${Date.now()}.${fileExt}`;
      const filePath = `kyc/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      // Save document reference
      const { data: docData, error: dbError } = await supabase
        .from('kyc_documents')
        .upsert({
          provider_id: currentUser.id,
          document_type: type,
          url: publicUrl,
          status: 'pending',
          uploaded_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id,document_type'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Update local state
      setDocuments(prev => {
        const filtered = prev.filter(d => d.type !== type);
        return [...filtered, {
          id: docData.id,
          type,
          status: 'pending',
          url: publicUrl,
          uploadedAt: new Date().toISOString()
        }];
      });

    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Erreur lors du téléchargement du document');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('provider_kyc')
        .upsert({
          provider_id: currentUser.id,
          first_name: formData.firstName,
          last_name: formData.lastName,
          birth_date: formData.birthDate,
          nationality: formData.nationality,
          id_number: formData.idNumber,
          id_type: formData.idType,
          address: formData.address,
          city: formData.city,
          postal_code: formData.postalCode,
          country: formData.country,
          business_type: formData.businessType,
          business_name: formData.businessName,
          business_number: formData.businessNumber,
          bank_account_name: formData.bankAccountName,
          bank_account_number: formData.bankAccountNumber,
          bank_name: formData.bankName,
          status: 'pending',
          submitted_at: new Date().toISOString()
        }, {
          onConflict: 'provider_id'
        });

      if (error) throw error;

      // Update user profile
      await updateProfile({ kycStatus: 'pending' });
      
      setKycStatus('pending');
      alert('Votre demande de vérification a été soumise avec succès !');
      navigate('/provider/profile');
    } catch (error) {
      console.error('Error submitting KYC:', error);
      alert('Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const getDocumentStatus = (type: KYCDocument['type']) => {
    return documents.find(d => d.type === type)?.status || 'missing';
  };

  const getDocumentUrl = (type: KYCDocument['type']) => {
    return documents.find(d => d.type === type)?.url;
  };

  const renderStatusBanner = () => {
    switch (kycStatus) {
      case 'verified':
        return (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle size={24} className="text-green-600" />
            <div>
              <p className="font-semibold text-green-800">Vérification approuvée</p>
              <p className="text-sm text-green-600">Votre compte est vérifié</p>
            </div>
          </div>
        );
      case 'pending':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Loader2 size={24} className="text-yellow-600 animate-spin" />
            <div>
              <p className="font-semibold text-yellow-800">Vérification en cours</p>
              <p className="text-sm text-yellow-600">Nous examinons vos documents</p>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle size={24} className="text-red-600" />
            <div>
              <p className="font-semibold text-red-800">Vérification refusée</p>
              <p className="text-sm text-red-600">Veuillez corriger les informations</p>
            </div>
          </div>
        );
      default:
        return (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
            <Shield size={24} className="text-eveneo-blue" />
            <div>
              <p className="font-semibold text-gray-900">Vérification requise</p>
              <p className="text-sm text-gray-600">Complétez votre profil pour être vérifié</p>
            </div>
          </div>
        );
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-6">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            activeStep === step 
              ? 'bg-eveneo-blue text-white' 
              : activeStep > step 
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-500'
          }`}>
            {activeStep > step ? <CheckCircle size={16} /> : step}
          </div>
          {step < 4 && (
            <div className={`w-8 h-0.5 ${activeStep > step ? 'bg-green-500' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderIdentityStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Identité</h3>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">Prénom</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => handleInputChange('firstName', e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
            placeholder="Prénom"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">Nom</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => handleInputChange('lastName', e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
            placeholder="Nom"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Date de naissance</label>
        <input
          type="date"
          value={formData.birthDate}
          onChange={(e) => handleInputChange('birthDate', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Nationalité</label>
        <input
          type="text"
          value={formData.nationality}
          onChange={(e) => handleInputChange('nationality', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Ex: Française"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Type de pièce d'identité</label>
        <select
          value={formData.idType}
          onChange={(e) => handleInputChange('idType', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
        >
          <option value="id_card">Carte d'identité</option>
          <option value="passport">Passeport</option>
          <option value="driver_license">Permis de conduire</option>
        </select>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Numéro de pièce</label>
        <input
          type="text"
          value={formData.idNumber}
          onChange={(e) => handleInputChange('idNumber', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Numéro"
        />
      </div>

      {/* Document upload */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <IdCard size={24} className="text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Pièce d'identité</p>
            <p className="text-xs text-gray-500">Recto et verso</p>
          </div>
          {getDocumentStatus('identity') === 'verified' && <CheckCircle size={20} className="text-green-500 ml-auto" />}
          {getDocumentStatus('identity') === 'pending' && <Loader2 size={20} className="text-yellow-500 ml-auto animate-spin" />}
        </div>
        
        {getDocumentUrl('identity') ? (
          <div className="relative">
            <img src={getDocumentUrl('identity')} alt="ID" className="w-full h-32 object-cover rounded-lg" />
            {kycStatus !== 'verified' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-lg"
              >
                <Camera size={24} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setCurrentUploadType('identity');
              fileInputRef.current?.click();
            }}
            disabled={uploadingDoc === 'identity'}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-eveneo-blue hover:text-eveneo-blue transition-colors"
          >
            {uploadingDoc === 'identity' ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Upload size={24} />
                <span className="text-sm">Télécharger</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderAddressStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Adresse</h3>
      
      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Adresse</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Numéro et rue"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">Ville</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
            placeholder="Ville"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1.5">Code postal</label>
          <input
            type="text"
            value={formData.postalCode}
            onChange={(e) => handleInputChange('postalCode', e.target.value)}
            className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
            placeholder="Code postal"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Pays</label>
        <input
          type="text"
          value={formData.country}
          onChange={(e) => handleInputChange('country', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Pays"
        />
      </div>

      {/* Address proof upload */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <MapPin size={24} className="text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Justificatif d'adresse</p>
            <p className="text-xs text-gray-500">Facture de moins de 3 mois</p>
          </div>
          {getDocumentStatus('address') === 'verified' && <CheckCircle size={20} className="text-green-500 ml-auto" />}
          {getDocumentStatus('address') === 'pending' && <Loader2 size={20} className="text-yellow-500 ml-auto animate-spin" />}
        </div>
        
        {getDocumentUrl('address') ? (
          <div className="relative">
            <img src={getDocumentUrl('address')} alt="Address" className="w-full h-32 object-cover rounded-lg" />
            {kycStatus !== 'verified' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-lg"
              >
                <Camera size={24} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setCurrentUploadType('address');
              fileInputRef.current?.click();
            }}
            disabled={uploadingDoc === 'address'}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-eveneo-blue hover:text-eveneo-blue transition-colors"
          >
            {uploadingDoc === 'address' ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Upload size={24} />
                <span className="text-sm">Télécharger</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderBusinessStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Entreprise</h3>
      
      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Type d'activité</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleInputChange('businessType', 'individual')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${
              formData.businessType === 'individual' 
                ? 'border-eveneo-blue bg-blue-50 text-eveneo-blue' 
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <User size={20} className="mx-auto mb-1" />
            <span className="text-sm">Individuel</span>
          </button>
          <button
            onClick={() => handleInputChange('businessType', 'company')}
            className={`p-3 rounded-xl border-2 text-center transition-colors ${
              formData.businessType === 'company' 
                ? 'border-eveneo-blue bg-blue-50 text-eveneo-blue' 
                : 'border-gray-200 text-gray-600'
            }`}
          >
            <Building2 size={20} className="mx-auto mb-1" />
            <span className="text-sm">Entreprise</span>
          </button>
        </div>
      </div>

      {formData.businessType === 'company' && (
        <>
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Nom de l'entreprise</label>
            <input
              type="text"
              value={formData.businessName}
              onChange={(e) => handleInputChange('businessName', e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
              placeholder="Nom de l'entreprise"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Numéro d'immatriculation</label>
            <input
              type="text"
              value={formData.businessNumber}
              onChange={(e) => handleInputChange('businessNumber', e.target.value)}
              className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
              placeholder="SIRET ou équivalent"
            />
          </div>

          {/* Business document upload */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Briefcase size={24} className="text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">Document professionnel</p>
                <p className="text-xs text-gray-500">KBIS ou équivalent</p>
              </div>
              {getDocumentStatus('business') === 'verified' && <CheckCircle size={20} className="text-green-500 ml-auto" />}
              {getDocumentStatus('business') === 'pending' && <Loader2 size={20} className="text-yellow-500 ml-auto animate-spin" />}
            </div>
            
            {getDocumentUrl('business') ? (
              <div className="relative">
                <img src={getDocumentUrl('business')} alt="Business" className="w-full h-32 object-cover rounded-lg" />
                {kycStatus !== 'verified' && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-lg"
                  >
                    <Camera size={24} />
                  </button>
                )}
              </div>
            ) : (
              <button
                onClick={() => {
                  setCurrentUploadType('business');
                  fileInputRef.current?.click();
                }}
                disabled={uploadingDoc === 'business'}
                className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-eveneo-blue hover:text-eveneo-blue transition-colors"
              >
                {uploadingDoc === 'business' ? (
                  <Loader2 size={24} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={24} />
                    <span className="text-sm">Télécharger</span>
                  </>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );

  const renderBankStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Coordonnées bancaires</h3>
      
      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Nom du titulaire</label>
        <input
          type="text"
          value={formData.bankAccountName}
          onChange={(e) => handleInputChange('bankAccountName', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Nom complet"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">Nom de la banque</label>
        <input
          type="text"
          value={formData.bankName}
          onChange={(e) => handleInputChange('bankName', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
          placeholder="Nom de la banque"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-500 mb-1.5">IBAN</label>
        <input
          type="text"
          value={formData.bankAccountNumber}
          onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
          className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20 font-mono"
          placeholder="FRXX XXXX XXXX XXXX XXXX XXXX XXX"
        />
      </div>

      {/* Bank document upload */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-center gap-3 mb-3">
          <CreditCard size={24} className="text-gray-400" />
          <div>
            <p className="font-medium text-gray-900">Relevé d'identité bancaire</p>
            <p className="text-xs text-gray-500">RIB ou relevé de compte</p>
          </div>
          {getDocumentStatus('bank') === 'verified' && <CheckCircle size={20} className="text-green-500 ml-auto" />}
          {getDocumentStatus('bank') === 'pending' && <Loader2 size={20} className="text-yellow-500 ml-auto animate-spin" />}
        </div>
        
        {getDocumentUrl('bank') ? (
          <div className="relative">
            <img src={getDocumentUrl('bank')} alt="Bank" className="w-full h-32 object-cover rounded-lg" />
            {kycStatus !== 'verified' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/50 flex items-center justify-center text-white rounded-lg"
              >
                <Camera size={24} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => {
              setCurrentUploadType('bank');
              fileInputRef.current?.click();
            }}
            disabled={uploadingDoc === 'bank'}
            className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center gap-2 text-gray-500 hover:border-eveneo-blue hover:text-eveneo-blue transition-colors"
          >
            {uploadingDoc === 'bank' ? (
              <Loader2 size={24} className="animate-spin" />
            ) : (
              <>
                <Upload size={24} />
                <span className="text-sm">Télécharger</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-eveneo-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 safe-area-top border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            Vérification KYC
          </h1>
          
          <div className="w-10" />
        </div>
      </header>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf"
        onChange={(e) => handleDocumentUpload(e, currentUploadType)}
        className="hidden"
      />

      {/* Main Content */}
      <main className="px-4 py-4">
        {/* Status Banner */}
        <div className="mb-6">
          {renderStatusBanner()}
        </div>

        {kycStatus !== 'verified' && (
          <>
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Step Content */}
            <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              {activeStep === 1 && renderIdentityStep()}
              {activeStep === 2 && renderAddressStep()}
              {activeStep === 3 && renderBusinessStep()}
              {activeStep === 4 && renderBankStep()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              {activeStep > 1 && (
                <button
                  onClick={() => setActiveStep(prev => prev - 1)}
                  className="flex-1 py-3 border border-gray-300 rounded-xl font-medium text-gray-700"
                >
                  Précédent
                </button>
              )}
              {activeStep < 4 ? (
                <button
                  onClick={() => setActiveStep(prev => prev + 1)}
                  className="flex-1 py-3 bg-eveneo-blue text-white rounded-xl font-medium"
                >
                  Continuer
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 py-3 bg-gradient-to-r from-eveneo-violet to-eveneo-pink text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {submitting ? 'Envoi...' : 'Soumettre'}
                </button>
              )}
            </div>
          </>
        )}

        {kycStatus === 'verified' && (
          <div className="bg-white rounded-2xl p-6 shadow-sm text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={40} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Compte vérifié !</h3>
            <p className="text-gray-600 mb-6">
              Votre compte prestataire est entièrement vérifié. Vous pouvez maintenant recevoir des réservations.
            </p>
            <button
              onClick={() => navigate('/dashboard/provider')}
              className="w-full py-3 bg-eveneo-blue text-white rounded-xl font-medium"
            >
              Retour au dashboard
            </button>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
