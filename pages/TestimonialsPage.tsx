
import React from 'react';
import { Star, Quote } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Marie Dupont',
    role: 'Mariée (Juin 2024)',
    content: "Événéo m'a sauvé la vie ! J'ai trouvé mon traiteur et mon DJ en une soirée. Le paiement sécurisé rassure vraiment. L'interface est fluide et le support est très réactif.",
    avatarUrl: 'https://picsum.photos/100/100?random=10'
  },
  {
    id: 't2',
    name: 'Thomas Leroy',
    role: 'Organisateur Corporate',
    content: "L'outil de gestion et la facturation centralisée sont parfaits pour les événements d'entreprise. Gain de temps énorme sur l'administratif. Je recommande pour tous les event planners.",
    avatarUrl: 'https://picsum.photos/100/100?random=11'
  },
  {
    id: 't3',
    name: 'Sophie Martin',
    role: 'Anniversaire',
    content: "J'adore l'assistant intelligent Éva, elle m'a suggéré des idées d'animation auxquelles je n'aurais jamais pensé ! Une expérience utilisateur au top.",
    avatarUrl: 'https://picsum.photos/100/100?random=12'
  },
  {
    id: 't4',
    name: 'Lucas V.',
    role: 'DJ Professionnel',
    content: "En tant que prestataire, Événéo m'apporte une visibilité incroyable. Le système de paiement garanti m'évite les impayés. C'est devenu ma source principale de clients.",
    avatarUrl: 'https://picsum.photos/100/100?random=13'
  },
  {
    id: 't5',
    name: 'Camille R.',
    role: 'Wedding Planner',
    content: "Une plateforme sérieuse avec des prestataires de qualité. La vérification KYC est un vrai gage de confiance pour mes clients.",
    avatarUrl: 'https://picsum.photos/100/100?random=14'
  },
  {
    id: 't6',
    name: 'Marc D.',
    role: 'Chef d\'entreprise',
    content: "Nous avons organisé notre séminaire annuel via Événéo. Tout était centralisé, simple et efficace. Merci à l'équipe.",
    avatarUrl: 'https://picsum.photos/100/100?random=15'
  }
];

export const TestimonialsPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="bg-white min-h-screen pt-32 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-eveneo-dark mb-4">{t('testimonials.title')}</h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">Découvrez les retours d'expérience de notre communauté de clients et prestataires.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {TESTIMONIALS.map(t => (
            <div key={t.id} className="bg-gray-50 p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
              <div className="absolute top-6 right-8 text-eveneo-violet/20">
                  <Quote size={48} />
              </div>
              <div className="flex gap-1 text-amber-400 mb-6">
                {[1,2,3,4,5].map(s => <Star key={s} size={18} fill="currentColor" />)}
              </div>
              <p className="text-gray-600 mb-8 italic leading-relaxed relative z-10">"{t.content}"</p>
              <div className="flex items-center gap-4">
                <img src={t.avatarUrl} alt={t.name} className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-sm" />
                <div>
                  <div className="font-bold text-eveneo-dark text-lg">{t.name}</div>
                  <div className="text-sm text-eveneo-violet font-medium">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
