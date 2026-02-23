import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  User,
  Camera,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  DollarSign,
  FileText,
  Shield,
  ChevronRight,
  LogOut,
  Edit3,
  CheckCircle,
  AlertCircle,
  Star,
  Award,
  Clock,
  Image as ImageIcon,
  HelpCircle
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { providerService } from '../../services/providerService';
import { supabase } from '../../services/supabaseClient';
import { ServiceProvider } from '../../types';

export const MobileProviderProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    phone: '',
    location: '',
    category: '',
    priceValue: 0,
    priceUnit: 'hour' as 'hour' | 'item' | 'event'
  });

  useEffect(() => {
    const fetchProvider = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        const data = await providerService.getProviderById(currentUser.id);
        setProvider(data);
        setFormData({
          name: data?.name || '',
          description: data?.description || '',
          phone: (data as any)?.phone || '',
          location: data?.location || '',
          category: data?.category || '',
          priceValue: data?.priceValue || 0,
          priceUnit: data?.priceUnit || 'hour'
        });
      } catch (error) {
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [currentUser]);

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      await supabase
        .from('providers')
        .update({
          name: formData.name,
          description: formData.description,
          phone: formData.phone,
          location: formData.location,
          category: formData.category,
          price_value: formData.priceValue,
          price_unit: formData.priceUnit
        })
        .eq('id', currentUser.id);
      
      setIsEditing(false);
      // Refresh data
      const updated = await providerService.getProviderById(currentUser.id);
      setProvider(updated);
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      icon: Shield,
      label: 'Vérification KYC',
      value: currentUser?.kycStatus === 'verified' ? 'Vérifié' : 'En attente',
      path: '/provider/kyc',
      color: currentUser?.kycStatus === 'verified' ? 'text-green-600' : 'text-orange-600',
      bgColor: currentUser?.kycStatus === 'verified' ? 'bg-green-100' : 'bg-orange-100'
    },
    {
      icon: ImageIcon,
      label: 'Portfolio & Photos',
      value: `${provider?.portfolio?.length || 0} photos`,
      path: '/portfolio',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      icon: Star,
      label: 'Mes avis',
      value: `${provider?.reviewCount || 0} avis`,
      path: `/provider/reviews`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      icon: Award,
      label: 'Abonnement',
      value: 'Gratuit',
      path: '/subscription',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      icon: Clock,
      label: 'Disponibilités',
      value: 'Configurer',
      path: '/provider/calendar',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100'
    },
    {
      icon: HelpCircle,
      label: 'Aide & FAQ',
      value: '10 questions',
      path: '/provider/faq',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100'
    }
  ];

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
            Mon profil
          </h1>
          
          <button 
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={saving}
            className="p-2 -mr-2 text-eveneo-blue font-medium text-sm"
          >
            {saving ? '...' : isEditing ? 'Enregistrer' : 'Modifier'}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Profile Card */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                {provider?.imageUrl ? (
                  <img src={provider.imageUrl} alt={provider.name} className="w-full h-full object-cover" />
                ) : (
                  formData.name.charAt(0).toUpperCase()
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-8 h-8 bg-eveneo-blue rounded-full flex items-center justify-center shadow-lg">
                <Camera size={14} className="text-white" />
              </button>
            </div>
            
            <div className="flex-1">
              {isEditing ? (
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full font-bold text-xl text-gray-900 border-b border-gray-300 focus:border-eveneo-blue focus:outline-none pb-1"
                  placeholder="Votre nom"
                />
              ) : (
                <h2 className="font-bold text-xl text-gray-900">{formData.name}</h2>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                {currentUser?.kycStatus === 'verified' ? (
                  <span className="flex items-center gap-1 text-green-600 text-sm">
                    <CheckCircle size={14} />
                    Vérifié
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-orange-600 text-sm">
                    <AlertCircle size={14} />
                    Non vérifié
                  </span>
                )}
              </div>
              
              <p className="text-gray-500 text-sm mt-1">{formData.category}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-around mt-5 pt-5 border-t border-gray-100">
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{provider?.rating || 0}</p>
              <p className="text-xs text-gray-500">Note</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{provider?.reviewCount || 0}</p>
              <p className="text-xs text-gray-500">Avis</p>
            </div>
            <div className="w-px h-10 bg-gray-200" />
            <div className="text-center">
              <p className="text-xl font-bold text-gray-900">{formatPrice(formData.priceValue)}</p>
              <p className="text-xs text-gray-500">/ {formData.priceUnit === 'hour' ? 'h' : 'pers.'}</p>
            </div>
          </div>
        </section>

        {/* Contact Info */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Informations de contact</h3>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Email</p>
                <p className="font-medium text-gray-900">{currentUser?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Téléphone</p>
                {isEditing ? (
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full font-medium text-gray-900 border-b border-gray-300 focus:border-eveneo-blue focus:outline-none"
                    placeholder="Votre téléphone"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{formData.phone || 'Non renseigné'}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                <MapPin size={18} className="text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Localisation</p>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full font-medium text-gray-900 border-b border-gray-300 focus:border-eveneo-blue focus:outline-none"
                    placeholder="Votre ville"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{formData.location || 'Non renseigné'}</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Description */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-3">À propos</h3>
          {isEditing ? (
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              className="w-full p-3 bg-gray-50 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20 resize-none"
              placeholder="Décrivez vos services..."
            />
          ) : (
            <p className="text-gray-600 leading-relaxed">
              {formData.description || 'Aucune description. Ajoutez une description pour attirer plus de clients.'}
            </p>
          )}
        </section>

        {/* Menu */}
        <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <button
              key={index}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors ${
                index !== menuItems.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <div className={`w-10 h-10 ${item.bgColor} rounded-xl flex items-center justify-center`}>
                <item.icon size={18} className={item.color} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{item.label}</p>
                <p className="text-xs text-gray-500">{item.value}</p>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          ))}
        </section>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 text-red-600 rounded-2xl font-medium hover:bg-red-100 transition-colors"
        >
          <LogOut size={18} />
          Se déconnecter
        </button>
      </main>

      <MobileBottomNav />
    </div>
  );
};
