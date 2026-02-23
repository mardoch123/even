import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Mail,
  Phone,
  FileText,
  CreditCard,
  Shield,
  Star,
  Calendar,
  Image as ImageIcon
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  icon: React.ElementType;
}

const faqData: FAQItem[] = [
  {
    id: '1',
    question: 'Comment créer mon profil prestataire ?',
    answer: 'Pour créer votre profil, accédez à la section "Mon profil" et complétez vos informations : photo, description, coordonnées et catégorie de service. Un profil complet attire plus de clients !',
    category: 'Profil',
    icon: FileText
  },
  {
    id: '2',
    question: 'Comment ajouter des photos à mon portfolio ?',
    answer: 'Rendez-vous dans "Portfolio & Photos" depuis votre profil. Vous pouvez ajouter jusqu\'à 20 photos de vos réalisations. Des photos de qualité augmentent vos chances d\'être contacté.',
    category: 'Portfolio',
    icon: ImageIcon
  },
  {
    id: '3',
    question: 'Comment fonctionne la vérification KYC ?',
    answer: 'La vérification KYC (Know Your Customer) est obligatoire pour recevoir des paiements. Vous devez fournir une pièce d\'identité, un justificatif d\'adresse et vos informations bancaires. La validation prend 24 à 48h.',
    category: 'Vérification',
    icon: Shield
  },
  {
    id: '4',
    question: 'Comment définir mes disponibilités ?',
    answer: 'Dans la section "Disponibilités", vous pouvez indiquer vos jours et horaires de travail habituels. Les clients verront vos disponibilités lors de la réservation.',
    category: 'Réservations',
    icon: Calendar
  },
  {
    id: '5',
    question: 'Comment ajouter des options supplémentaires ?',
    answer: 'Depuis votre profil, accédez à "Options supplémentaires" pour créer des services additionnels (décorations spéciales, heures supplémentaires, etc.) avec leurs prix.',
    category: 'Services',
    icon: Star
  },
  {
    id: '6',
    question: 'Comment gérer une demande de réservation ?',
    answer: 'Les nouvelles réservations apparaissent dans "Réservations". Vous pouvez accepter, refuser ou demander plus d\'informations. Une fois acceptée, vous pouvez échanger avec le client via la messagerie.',
    category: 'Réservations',
    icon: Calendar
  },
  {
    id: '7',
    question: 'Quand et comment suis-je payé ?',
    answer: 'Le client paie lors de la réservation. Les fonds sont sécurisés et versés sur votre compte 48h après l\'événement. Vous pouvez consulter vos revenus dans la section "Finances".',
    category: 'Paiements',
    icon: CreditCard
  },
  {
    id: '8',
    question: 'Comment répondre aux avis des clients ?',
    answer: 'Dans "Mes avis", vous pouvez voir tous les avis reçus et y répondre. Une réponse professionnelle montre votre engagement envers la satisfaction client.',
    category: 'Avis',
    icon: Star
  },
  {
    id: '9',
    question: 'Puis-je modifier une réservation confirmée ?',
    answer: 'Oui, vous pouvez proposer des modifications (date, heure, options) via la messagerie. Le client doit accepter les changements pour qu\'ils prennent effet.',
    category: 'Réservations',
    icon: Calendar
  },
  {
    id: '10',
    question: 'Comment contacter le support ?',
    answer: 'Vous pouvez nous contacter par email à support@eveneo.ca ou par téléphone au +1 (514) 123-4567. Notre équipe est disponible du lundi au vendredi, 9h à 18h.',
    category: 'Support',
    icon: MessageCircle
  }
];

const categories = ['Tout', 'Profil', 'Portfolio', 'Réservations', 'Paiements', 'Vérification', 'Services', 'Avis', 'Support'];

export const MobileProviderFAQPage: React.FC = () => {
  const navigate = useNavigate();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('Tout');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFAQs = faqData.filter(faq => {
    const matchesCategory = selectedCategory === 'Tout' || faq.category === selectedCategory;
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-3 sticky top-0 z-40 safe-area-top border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          
          <h1 className="text-lg font-semibold text-gray-900">
            Centre d'aide
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4 space-y-4">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-eveneo-violet to-eveneo-pink rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <HelpCircle size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Comment pouvons-nous vous aider ?</h2>
              <p className="text-white/80 text-sm">Trouvez des réponses à vos questions</p>
            </div>
          </div>
        </section>

        {/* Search */}
        <section className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="relative">
            <input
              type="text"
              placeholder="Rechercher une question..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
            />
            <HelpCircle size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </section>

        {/* Categories */}
        <section className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-eveneo-violet text-white'
                    : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* FAQ List */}
        <section className="space-y-3">
          <h3 className="font-semibold text-gray-900 px-1">
            Questions fréquentes ({filteredFAQs.length})
          </h3>
          
          {filteredFAQs.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center">
              <HelpCircle size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">Aucune question trouvée</p>
              <p className="text-sm text-gray-400 mt-1">Essayez une autre recherche</p>
            </div>
          ) : (
            filteredFAQs.map((faq) => (
              <div
                key={faq.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleExpand(faq.id)}
                  className="w-full flex items-start gap-3 p-4 text-left"
                >
                  <div className="w-10 h-10 bg-eveneo-violet/10 rounded-xl flex items-center justify-center shrink-0">
                    <faq.icon size={18} className="text-eveneo-violet" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 pr-6">{faq.question}</p>
                    <span className="text-xs text-eveneo-violet bg-eveneo-violet/10 px-2 py-0.5 rounded-full mt-1 inline-block">
                      {faq.category}
                    </span>
                  </div>
                  {expandedId === faq.id ? (
                    <ChevronUp size={20} className="text-gray-400 shrink-0" />
                  ) : (
                    <ChevronDown size={20} className="text-gray-400 shrink-0" />
                  )}
                </button>
                
                {expandedId === faq.id && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="ml-12 pl-4 border-l-2 border-eveneo-violet/20">
                      <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </section>

        {/* Contact Support */}
        <section className="bg-white rounded-2xl p-5 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Besoin d'aide supplémentaire ?</h3>
          
          <div className="space-y-3">
            <a 
              href="mailto:support@eveneo.ca"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <Mail size={18} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Email</p>
                <p className="text-sm text-gray-500">support@eveneo.ca</p>
              </div>
            </a>
            
            <a 
              href="tel:+15141234567"
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <Phone size={18} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Téléphone</p>
                <p className="text-sm text-gray-500">+1 (514) 123-4567</p>
              </div>
            </a>
          </div>
          
          <p className="text-xs text-gray-400 text-center mt-4">
            Disponible du lundi au vendredi, 9h à 18h
          </p>
        </section>
      </main>

      <MobileBottomNav />
    </div>
  );
};
