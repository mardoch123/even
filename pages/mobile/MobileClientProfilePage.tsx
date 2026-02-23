import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Edit3,
  ChevronRight,
  LogOut,
  Settings,
  Wallet,
  HelpCircle,
  Shield,
  Bell,
  Globe,
  Moon,
  CreditCard,
  History,
  Image as ImageIcon,
  Briefcase,
  Star,
  Award,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Plus,
  FileText,
  Package,
  Trash2,
  Edit2,
  MessageSquare
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabaseClient';
import { providerService } from '../../services/providerService';
import { UserRole, AddOn } from '../../types';

interface PortfolioImage {
  id: string;
  url: string;
  caption?: string;
}

export const MobileClientProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout, updateProfile } = useAuth();
  const { formatPrice } = useCurrency();
  const { language, setLanguage, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<'main' | 'edit' | 'settings' | 'wallet' | 'portfolio' | 'addons' | 'help'>('main');
  const [portfolio, setPortfolio] = useState<PortfolioImage[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  // Add-ons state
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [showAddOnForm, setShowAddOnForm] = useState(false);
  const [editingAddOn, setEditingAddOn] = useState<AddOn | null>(null);
  const [addOnForm, setAddOnForm] = useState({ name: '', price: '', description: '' });
  
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    location: '',
    bio: ''
  });

  // Settings state
  const [settings, setSettings] = useState({
    notifications: true,
    emailNotifications: true,
    language: language
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Get profile data
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        setFormData({
          fullName: profile?.full_name || currentUser.name || '',
          phone: profile?.phone || '',
          location: profile?.location || '',
          bio: profile?.bio || ''
        });

        // If provider, get portfolio and add-ons from service_providers table
        if (currentUser.role === UserRole.PROVIDER) {
          const { data: providerData } = await supabase
            .from('service_providers')
            .select('portfolio, add_ons')
            .eq('owner_id', currentUser.id)
            .single();
          
          const portfolioUrls = providerData?.portfolio || [];
          setPortfolio(portfolioUrls.map((url: string, index: number) => ({
            id: `img-${index}-${Date.now()}`,
            url,
            caption: ''
          })));
          
          // Load add-ons
          const loadedAddOns = providerData?.add_ons || [];
          setAddOns(loadedAddOns);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await supabase
        .from('profiles')
        .update({
          full_name: formData.fullName,
          phone: formData.phone,
          location: formData.location,
          bio: formData.bio
        })
        .eq('id', currentUser.id);

      await updateProfile({ name: formData.fullName });
      setIsEditing(false);
      setActiveSection('main');
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingImage(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `portfolio/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('provider-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('provider-assets')
        .getPublicUrl(filePath);

      // Update provider portfolio in service_providers table
      const currentPortfolio = portfolio.map(p => p.url);
      const newPortfolio = [...currentPortfolio, publicUrl];
      
      const { error: updateError } = await supabase
        .from('service_providers')
        .update({ portfolio: newPortfolio })
        .eq('owner_id', currentUser.id);

      if (updateError) throw updateError;

      setPortfolio(prev => [...prev, { id: `${Date.now()}`, url: publicUrl, caption: '' }]);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Erreur lors du téléchargement de l\'image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!currentUser) return;
    
    const image = portfolio.find(p => p.id === imageId);
    if (!image) return;

    try {
      const newPortfolio = portfolio.filter(p => p.id !== imageId).map(p => p.url);
      
      const { error } = await supabase
        .from('service_providers')
        .update({ portfolio: newPortfolio })
        .eq('owner_id', currentUser.id);

      if (error) throw error;

      setPortfolio(prev => prev.filter(p => p.id !== imageId));
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Erreur lors de la suppression de l\'image');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Add-on management functions
  const handleSaveAddOn = async () => {
    if (!currentUser || !addOnForm.name || !addOnForm.price) return;
    
    try {
      const newAddOn: AddOn = {
        id: editingAddOn?.id || `addon-${Date.now()}`,
        name: addOnForm.name,
        price: parseFloat(addOnForm.price),
        description: addOnForm.description
      };
      
      let updatedAddOns: AddOn[];
      if (editingAddOn) {
        updatedAddOns = addOns.map(a => a.id === editingAddOn.id ? newAddOn : a);
      } else {
        updatedAddOns = [...addOns, newAddOn];
      }
      
      const { error } = await supabase
        .from('service_providers')
        .update({ add_ons: updatedAddOns })
        .eq('owner_id', currentUser.id);
      
      if (error) throw error;
      
      setAddOns(updatedAddOns);
      setShowAddOnForm(false);
      setEditingAddOn(null);
      setAddOnForm({ name: '', price: '', description: '' });
    } catch (error) {
      console.error('Error saving add-on:', error);
      alert('Erreur lors de l\'enregistrement de l\'option');
    }
  };

  const handleDeleteAddOn = async (addOnId: string) => {
    if (!currentUser) return;
    
    try {
      const updatedAddOns = addOns.filter(a => a.id !== addOnId);
      
      const { error } = await supabase
        .from('service_providers')
        .update({ add_ons: updatedAddOns })
        .eq('owner_id', currentUser.id);
      
      if (error) throw error;
      
      setAddOns(updatedAddOns);
    } catch (error) {
      console.error('Error deleting add-on:', error);
      alert('Erreur lors de la suppression de l\'option');
    }
  };

  const handleEditAddOn = (addOn: AddOn) => {
    setEditingAddOn(addOn);
    setAddOnForm({
      name: addOn.name,
      price: addOn.price.toString(),
      description: addOn.description || ''
    });
    setShowAddOnForm(true);
  };

  const isProvider = currentUser?.role === UserRole.PROVIDER;

  // Main Menu Items
  const mainMenuItems = [
    {
      icon: Edit3,
      label: 'Modifier le profil',
      description: 'Mettre à jour vos informations',
      action: () => setActiveSection('edit'),
      color: 'bg-blue-100 text-blue-600'
    },
    {
      icon: Settings,
      label: 'Paramètres',
      description: 'Préférences et configuration',
      action: () => setActiveSection('settings'),
      color: 'bg-gray-100 text-gray-600'
    },
    {
      icon: Wallet,
      label: 'Portefeuille',
      description: 'Gérer vos paiements',
      action: () => setActiveSection('wallet'),
      color: 'bg-green-100 text-green-600'
    },
    ...(isProvider ? [
      {
        icon: ImageIcon,
        label: 'Portfolio',
        description: `${portfolio.length} photo${portfolio.length !== 1 ? 's' : ''}`,
        action: () => setActiveSection('portfolio'),
        color: 'bg-purple-100 text-purple-600' as const
      },
      {
        icon: Package,
        label: 'Options supplémentaires',
        description: `${addOns.length} option${addOns.length !== 1 ? 's' : ''}`,
        action: () => setActiveSection('addons'),
        color: 'bg-indigo-100 text-indigo-600' as const
      }
    ] : []),
    {
      icon: HelpCircle,
      label: 'Aide et support',
      description: 'Centre d\'aide et FAQ',
      action: () => setActiveSection('help'),
      color: 'bg-orange-100 text-orange-600'
    }
  ];

  // Render Main Profile View
  const renderMainView = () => (
    <>
      {/* Profile Card */}
      <section className="bg-white rounded-2xl p-6 shadow-sm mx-4 mt-4">
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white text-3xl font-bold overflow-hidden border-4 border-white shadow-lg">
              {currentUser?.avatar ? (
                <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full object-cover" />
              ) : (
                formData.fullName.charAt(0).toUpperCase() || <User size={40} />
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 w-9 h-9 bg-eveneo-blue rounded-full flex items-center justify-center shadow-lg border-2 border-white"
            >
              <Camera size={16} className="text-white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>
          
          <h2 className="text-xl font-bold text-gray-900">{formData.fullName || 'Utilisateur'}</h2>
          <p className="text-gray-500 mt-1">{currentUser?.email}</p>
          
          <div className="mt-3">
            <span className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${
              isProvider 
                ? 'bg-purple-100 text-purple-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              <Briefcase size={14} />
              {isProvider ? 'Prestataire' : 'Client'}
            </span>
          </div>

          {isProvider && (
            <div className="flex items-center gap-6 mt-5 pt-5 border-t border-gray-100 w-full justify-center">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">4.8</p>
                <p className="text-xs text-gray-500">Note</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{portfolio.length}</p>
                <p className="text-xs text-gray-500">Photos</p>
              </div>
              <div className="w-px h-10 bg-gray-200" />
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">12</p>
                <p className="text-xs text-gray-500">Avis</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Menu */}
      <section className="bg-white rounded-2xl shadow-sm mx-4 mt-4 overflow-hidden">
        {mainMenuItems.map((item, index) => (
          <button
            key={index}
            onClick={item.action}
            className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
              index !== mainMenuItems.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className={`w-12 h-12 ${item.color} rounded-xl flex items-center justify-center`}>
              <item.icon size={22} />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.description}</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        ))}
      </section>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="mx-4 mt-4 mb-6 flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-medium hover:bg-red-100 transition-colors"
      >
        <LogOut size={20} />
        Se déconnecter
      </button>
    </>
  );

  // Render Edit Profile View
  const renderEditView = () => (
    <div className="px-4 py-4 space-y-4">
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Informations personnelles</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Nom complet</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
              placeholder="Votre nom"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Téléphone</label>
            <div className="relative">
              <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
                placeholder="Votre téléphone"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Localisation</label>
            <div className="relative">
              <MapPin size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20"
                placeholder="Votre ville"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm text-gray-500 mb-1.5">Bio</label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData({...formData, bio: e.target.value})}
              rows={4}
              className="w-full p-3 bg-gray-50 rounded-xl border-0 focus:ring-2 focus:ring-eveneo-blue/20 resize-none"
              placeholder="Parlez de vous..."
            />
          </div>
        </div>
      </section>

      <button
        onClick={handleSaveProfile}
        disabled={saving}
        className="w-full py-4 bg-eveneo-blue text-white rounded-2xl font-semibold active:scale-95 transition-transform disabled:opacity-50"
      >
        {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
      </button>
    </div>
  );

  // Render Settings View
  const renderSettingsView = () => (
    <div className="px-4 py-4 space-y-4">
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Notifications</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Bell size={18} className="text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Notifications push</p>
                <p className="text-xs text-gray-500">Alertes sur votre téléphone</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(s => ({...s, notifications: !s.notifications}))}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.notifications ? 'bg-eveneo-blue' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Emails</p>
                <p className="text-xs text-gray-500">Notifications par email</p>
              </div>
            </div>
            <button
              onClick={() => setSettings(s => ({...s, emailNotifications: !s.emailNotifications}))}
              className={`w-12 h-6 rounded-full transition-colors ${
                settings.emailNotifications ? 'bg-eveneo-blue' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                settings.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Préférences</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <Moon size={18} className="text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Mode sombre</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Interface plus sombre</p>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`w-12 h-6 rounded-full transition-colors ${
                isDark ? 'bg-eveneo-blue' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                isDark ? 'translate-x-6' : 'translate-x-0.5'
              }`} />
            </button>
          </div>
          
          <button className="w-full flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Globe size={18} className="text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Langue</p>
                <p className="text-xs text-gray-500">Français</p>
              </div>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-semibold text-gray-900 mb-4">Sécurité</h3>
        
        <button 
          onClick={() => navigate('/kyc')}
          className="w-full flex items-center justify-between py-2"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Shield size={18} className="text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Vérification KYC</p>
              <p className="text-xs text-gray-500">
                {currentUser?.kycStatus === 'verified' ? 'Vérifié' : 'Non vérifié'}
              </p>
            </div>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </section>
    </div>
  );

  // Render Wallet View
  const renderWalletView = () => (
    <div className="px-4 py-4 space-y-4">
      <section className="bg-gradient-to-r from-eveneo-violet to-eveneo-pink rounded-2xl p-6 text-white">
        <p className="text-white/80 text-sm">Solde disponible</p>
        <p className="text-3xl font-bold mt-1">{formatPrice(0)}</p>
        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => navigate('/wallet/deposit')}
            className="flex-1 py-3 bg-white/20 rounded-xl font-medium backdrop-blur-sm"
          >
            Recharger
          </button>
          <button 
            onClick={() => navigate('/wallet/withdraw')}
            className="flex-1 py-3 bg-white text-eveneo-violet rounded-xl font-medium"
          >
            Retirer
          </button>
        </div>
      </section>

      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <button 
          onClick={() => navigate('/wallet/cards')}
          className="w-full flex items-center gap-4 p-4 border-b border-gray-100"
        >
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <CreditCard size={22} className="text-blue-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900">Cartes bancaires</p>
            <p className="text-sm text-gray-500">Gérer vos cartes</p>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
        
        <button 
          onClick={() => navigate('/wallet/history')}
          className="w-full flex items-center gap-4 p-4"
        >
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <History size={22} className="text-green-600" />
          </div>
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-900">Historique</p>
            <p className="text-sm text-gray-500">Voir vos transactions</p>
          </div>
          <ChevronRight size={20} className="text-gray-400" />
        </button>
      </section>
    </div>
  );

  // Render Portfolio View (Provider only)
  const renderPortfolioView = () => (
    <div className="px-4 py-4">
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Mon portfolio</h3>
          <span className="text-sm text-gray-500">{portfolio.length} photo{portfolio.length !== 1 ? 's' : ''}</span>
        </div>
        
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingImage}
          className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center gap-2 text-gray-500 hover:border-eveneo-blue hover:text-eveneo-blue transition-colors mb-4"
        >
          {uploadingImage ? (
            <div className="w-5 h-5 border-2 border-gray-300 border-t-eveneo-blue rounded-full animate-spin" />
          ) : (
            <>
              <Plus size={20} />
              <span>Ajouter une photo</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Gallery */}
        {portfolio.length === 0 ? (
          <div className="text-center py-8">
            <ImageIcon size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune photo dans votre portfolio</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoutez des photos pour montrer votre travail
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {portfolio.map((image, index) => (
              <div key={image.id || index} className="relative aspect-square rounded-xl overflow-hidden group bg-gray-100">
                <img 
                  src={image.url} 
                  alt={`Portfolio ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x300?text=Image+non+disponible';
                  }}
                />
                <button
                  onClick={() => handleDeleteImage(image.id)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  // Render Add-ons View (Provider only)
  const renderAddOnsView = () => (
    <div className="px-4 py-4">
      <section className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-gray-900">Options supplémentaires</h3>
            <p className="text-sm text-gray-500">{addOns.length} option{addOns.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => {
              setEditingAddOn(null);
              setAddOnForm({ name: '', price: '', description: '' });
              setShowAddOnForm(true);
            }}
            className="w-10 h-10 bg-eveneo-blue text-white rounded-xl flex items-center justify-center shadow-lg"
          >
            <Plus size={20} />
          </button>
        </div>

        {/* Add-on Form */}
        {showAddOnForm && (
          <div className="bg-gray-50 rounded-xl p-4 mb-4 animate-in slide-in-from-top-2">
            <h4 className="font-medium text-gray-900 mb-3">
              {editingAddOn ? 'Modifier l\'option' : 'Nouvelle option'}
            </h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Nom</label>
                <input
                  type="text"
                  value={addOnForm.name}
                  onChange={(e) => setAddOnForm({...addOnForm, name: e.target.value})}
                  placeholder="Ex: Livraison express"
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Prix (€)</label>
                <input
                  type="number"
                  value={addOnForm.price}
                  onChange={(e) => setAddOnForm({...addOnForm, price: e.target.value})}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">Description (optionnel)</label>
                <textarea
                  value={addOnForm.description}
                  onChange={(e) => setAddOnForm({...addOnForm, description: e.target.value})}
                  placeholder="Décrivez cette option..."
                  rows={2}
                  className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20 resize-none"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddOnForm(false)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveAddOn}
                  disabled={!addOnForm.name || !addOnForm.price}
                  className="flex-1 py-2.5 bg-eveneo-blue text-white rounded-xl font-medium disabled:opacity-50"
                >
                  {editingAddOn ? 'Modifier' : 'Ajouter'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add-ons List */}
        {addOns.length === 0 ? (
          <div className="text-center py-8">
            <Package size={48} className="text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune option supplémentaire</p>
            <p className="text-sm text-gray-400 mt-1">
              Ajoutez des options pour proposer plus de services
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{addOn.name}</h4>
                    <p className="text-lg font-bold text-eveneo-violet mt-1">
                      {formatPrice(addOn.price)}
                    </p>
                    {addOn.description && (
                      <p className="text-sm text-gray-500 mt-1">{addOn.description}</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditAddOn(addOn)}
                      className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <Edit2 size={16} className="text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDeleteAddOn(addOn.id)}
                      className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );

  // Render Help View
  const renderHelpView = () => (
    <div className="px-4 py-4 space-y-4">
      <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {[
          { icon: HelpCircle, label: 'FAQ', desc: 'Questions fréquentes' },
          { icon: MessageSquare, label: 'Contactez-nous', desc: 'Support client' },
          { icon: Shield, label: 'Confidentialité', desc: 'Politique de confidentialité' },
          { icon: FileText, label: 'Conditions', desc: 'Conditions d\'utilisation' }
        ].map((item, index, arr) => (
          <button
            key={index}
            className={`w-full flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors ${
              index !== arr.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <item.icon size={22} className="text-gray-600" />
            </div>
            <div className="flex-1 text-left">
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </button>
        ))}
      </section>

      <div className="text-center py-6">
        <p className="text-sm text-gray-400">Version 1.0.0</p>
        <p className="text-xs text-gray-300 mt-1">© 2026 Événéo</p>
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
            onClick={() => activeSection === 'main' ? navigate(-1) : setActiveSection('main')}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            {activeSection === 'main' && 'Mon profil'}
            {activeSection === 'edit' && 'Modifier le profil'}
            {activeSection === 'settings' && 'Paramètres'}
            {activeSection === 'wallet' && 'Portefeuille'}
            {activeSection === 'portfolio' && 'Portfolio'}
            {activeSection === 'addons' && 'Options'}
            {activeSection === 'help' && 'Aide et support'}
          </h1>
          
          <div className="w-10" />
        </div>
      </header>

      {/* Content */}
      <main className="py-2">
        {activeSection === 'main' && renderMainView()}
        {activeSection === 'edit' && renderEditView()}
        {activeSection === 'settings' && renderSettingsView()}
        {activeSection === 'wallet' && renderWalletView()}
        {activeSection === 'portfolio' && renderPortfolioView()}
        {activeSection === 'addons' && renderAddOnsView()}
        {activeSection === 'help' && renderHelpView()}
      </main>

      {activeSection === 'main' && <MobileBottomNav />}
    </div>
  );
};
