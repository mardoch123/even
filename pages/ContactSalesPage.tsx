
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Building2, Users, Zap, Send, Check } from 'lucide-react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useToast } from '../contexts/ToastContext';

export const ContactSalesPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    message: '',
    employees: '1-10'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulation API Call & Store in "Admin DB"
    setTimeout(() => {
        // Create a lead object
        const newLead = {
            id: `lead-${Date.now()}`,
            ...formData,
            status: 'pending',
            date: new Date().toISOString()
        };

        // Store in local storage so Admin could hypothetically see it
        const existingLeads = JSON.parse(localStorage.getItem('admin_sales_leads') || '[]');
        localStorage.setItem('admin_sales_leads', JSON.stringify([newLead, ...existingLeads]));

        setIsSubmitting(false);
        setIsSuccess(true);
        addToast('success', 'Votre demande a bien été envoyée !');
    }, 1500);
  };

  if (isSuccess) {
      return (
          <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-8 animate-in zoom-in duration-500">
                  <Check size={48} />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-4 text-center">Message reçu !</h1>
              <p className="text-xl text-gray-500 mb-8 text-center max-w-lg">
                  Merci de votre intérêt pour l'offre Agence. Un de nos experts prendra contact avec vous sous 24h pour discuter de vos besoins.
              </p>
              <div className="flex gap-4">
                  <Button variant="outline" onClick={() => navigate('/')}>Retour à l'accueil</Button>
                  <Button variant="primary" onClick={() => navigate('/dashboard/provider')}>Mon Tableau de Bord</Button>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-6xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row min-h-[700px]">
        
        {/* Left Side: Value Prop */}
        <div className="lg:w-5/12 bg-eveneo-gradient text-white p-12 flex flex-col justify-between relative overflow-hidden">
            {/* Decorative Circles */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full blur-3xl translate-x-1/3 translate-y-1/3"></div>

            <div className="relative z-10">
                <Link to="/pricing" className="inline-flex items-center text-white/80 hover:text-white mb-8 transition-colors">
                    <ArrowLeft size={20} className="mr-2" /> Retour aux tarifs
                </Link>
                
                <h1 className="text-4xl font-bold mb-6 leading-tight">Passez à la vitesse supérieure</h1>
                <p className="text-lg text-white/90 mb-12 leading-relaxed">
                    Vous gérez une agence ou plusieurs lieux ? Notre offre Enterprise est conçue pour scaler votre activité avec des outils dédiés.
                </p>

                <div className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Gestion Multi-Comptes</h3>
                            <p className="text-sm text-white/80">Centralisez la gestion de vos équipes et de vos lieux.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Users size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">Account Manager Dédié</h3>
                            <p className="text-sm text-white/80">Un expert vous accompagne pour optimiser vos performances.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                            <Zap size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">API & Intégrations</h3>
                            <p className="text-sm text-white/80">Connectez Événéo à vos outils CRM existants.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-12 pt-8 border-t border-white/20 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="flex -space-x-4">
                        <img src="https://picsum.photos/50/50?random=10" className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                        <img src="https://picsum.photos/50/50?random=11" className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                        <img src="https://picsum.photos/50/50?random=12" className="w-10 h-10 rounded-full border-2 border-white" alt="" />
                    </div>
                    <p className="text-sm font-medium">
                        Rejoignez +500 agences partenaires
                    </p>
                </div>
            </div>
        </div>

        {/* Right Side: Form */}
        <div className="lg:w-7/12 p-12 bg-white">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Contactez notre équipe vente</h2>
            <p className="text-gray-500 mb-8">Remplissez ce formulaire et nous vous recontacterons très vite.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Nom complet" 
                        name="name"
                        placeholder="Jean Dupont" 
                        required 
                        value={formData.name}
                        onChange={handleChange}
                    />
                    <Input 
                        label="Nom de l'entreprise" 
                        name="company"
                        placeholder="Event Agency Paris" 
                        required 
                        value={formData.company}
                        onChange={handleChange}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input 
                        label="Email professionnel" 
                        type="email"
                        name="email"
                        placeholder="jean@agence.com" 
                        required 
                        value={formData.email}
                        onChange={handleChange}
                    />
                    <Input 
                        label="Téléphone" 
                        type="tel"
                        name="phone"
                        placeholder="+33 6 00 00 00 00" 
                        required 
                        value={formData.phone}
                        onChange={handleChange}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Taille de l'entreprise</label>
                    <select 
                        name="employees"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-eveneo-violet/20 focus:border-eveneo-violet focus:outline-none block p-3"
                        value={formData.employees}
                        onChange={handleChange}
                    >
                        <option value="1-10">1-10 employés</option>
                        <option value="11-50">11-50 employés</option>
                        <option value="51-200">51-200 employés</option>
                        <option value="200+">200+ employés</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Comment pouvons-nous vous aider ?</label>
                    <textarea 
                        name="message"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-2 focus:ring-eveneo-violet/20 focus:border-eveneo-violet focus:outline-none block p-3 h-32 resize-none"
                        placeholder="Décrivez vos besoins spécifiques..."
                        value={formData.message}
                        onChange={handleChange}
                        required
                    ></textarea>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CheckCircle size={16} className="text-green-500" />
                    <span>Vos données sont sécurisées et ne seront jamais partagées.</span>
                </div>

                <Button 
                    type="submit" 
                    variant="primary" 
                    size="lg" 
                    fullWidth 
                    disabled={isSubmitting}
                    className="shadow-lg hover:shadow-xl transform transition-all hover:-translate-y-1"
                >
                    {isSubmitting ? 'Envoi en cours...' : (
                        <span className="flex items-center justify-center gap-2">
                            Envoyer la demande <Send size={18} />
                        </span>
                    )}
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
};
