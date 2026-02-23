import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { providerService } from '../../services/providerService';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasOffer?: boolean;
  offerText?: string;
}

// Mapping des catégories avec leurs icônes emoji et couleurs
const categoryConfig: Record<string, { icon: string; color: string }> = {
  'Traiteur': { icon: '🍽️', color: 'bg-orange-50' },
  'Photographe': { icon: '📸', color: 'bg-purple-50' },
  'DJ': { icon: '🎵', color: 'bg-blue-50' },
  'Décoration': { icon: '🎨', color: 'bg-pink-50' },
  'Lieu': { icon: '🏛️', color: 'bg-amber-50' },
  'Animation': { icon: '🎭', color: 'bg-green-50' },
  'Transport': { icon: '🚗', color: 'bg-indigo-50' },
  'Fleuriste': { icon: '💐', color: 'bg-rose-50' },
  'Maquillage': { icon: '💄', color: 'bg-fuchsia-50' },
  'Coiffure': { icon: '💇', color: 'bg-cyan-50' },
  'Sécurité': { icon: '🛡️', color: 'bg-gray-50' },
  'Nettoyage': { icon: '✨', color: 'bg-teal-50' },
  'Sonorisation': { icon: '🔊', color: 'bg-violet-50' },
  'Éclairage': { icon: '💡', color: 'bg-yellow-50' },
  'Vidéaste': { icon: '🎥', color: 'bg-red-50' },
  'Catering': { icon: '🍱', color: 'bg-lime-50' },
  'Barman': { icon: '🍸', color: 'bg-emerald-50' },
  'Serveur': { icon: '🤵', color: 'bg-slate-50' },
  'Salle': { icon: '🏢', color: 'bg-stone-50' },
  'Jardin': { icon: '🌳', color: 'bg-green-50' },
};

const defaultConfig = { icon: '✨', color: 'bg-gray-50' };

export const MobileCategoriesPage: React.FC = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setLoading(true);
      try {
        const uniqueCategories = await providerService.getUniqueCategories();
        
        const mappedCategories: Category[] = uniqueCategories.map((cat, index) => {
          const config = categoryConfig[cat] || defaultConfig;
          return {
            id: `cat-${index}`,
            name: cat,
            icon: config.icon,
            color: config.color,
            hasOffer: index === 0, // Première catégorie a une offre
            offerText: 'Offre'
          };
        });

        setCategories(mappedCategories);
      } catch (error) {
        console.error('Error fetching categories:', error);
        // Fallback avec catégories par défaut
        setCategories([
          { id: '1', name: 'Traiteur', icon: '🍽️', color: 'bg-orange-50', hasOffer: true, offerText: 'Offre' },
          { id: '2', name: 'Photographe', icon: '📸', color: 'bg-purple-50' },
          { id: '3', name: 'DJ', icon: '🎵', color: 'bg-blue-50' },
          { id: '4', name: 'Décoration', icon: '🎨', color: 'bg-pink-50' },
          { id: '5', name: 'Lieu', icon: '🏛️', color: 'bg-amber-50' },
          { id: '6', name: 'Animation', icon: '🎭', color: 'bg-green-50' },
          { id: '7', name: 'Transport', icon: '🚗', color: 'bg-indigo-50' },
          { id: '8', name: 'Fleuriste', icon: '💐', color: 'bg-rose-50' },
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Diviser les catégories en sections
  const featuredCategories = categories.slice(0, 4);
  const otherCategories = categories.slice(4);

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <header className="bg-white px-4 py-4 sticky top-0 z-40 safe-area-top border-b border-gray-100">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">Services</h1>
        </div>
      </header>

      <main className="px-4 pt-4">
        {loading ? (
          // Skeleton loader
          <div className="space-y-6">
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-200 animate-pulse mb-2" />
                  <div className="w-16 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-full aspect-square rounded-2xl bg-gray-200 animate-pulse mb-2" />
                  <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Section en vedette (4 premières catégories) */}
            {featuredCategories.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mb-8">
                {featuredCategories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/search?category=${encodeURIComponent(cat.name)}`}
                    className="flex flex-col items-center group"
                  >
                    <div className={`relative w-16 h-16 rounded-2xl ${cat.color} flex items-center justify-center mb-2 group-active:scale-95 transition-transform`}>
                      {cat.hasOffer && (
                        <div className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {cat.offerText}
                        </div>
                      )}
                      <span className="text-2xl">{cat.icon}</span>
                    </div>
                    <span className="text-xs text-gray-700 text-center font-medium leading-tight">
                      {cat.name}
                    </span>
                  </Link>
                ))}
              </div>
            )}

            {/* Section principale avec titre */}
            {otherCategories.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="text-eveneo-violet" size={20} />
                  <h2 className="text-lg font-bold text-gray-900">
                    Faites-vous livrer tout ce dont vous avez besoin
                  </h2>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {otherCategories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/search?category=${encodeURIComponent(cat.name)}`}
                      className="flex flex-col items-center group"
                    >
                      <div className={`relative w-full aspect-square rounded-2xl ${cat.color} flex items-center justify-center mb-2 group-active:scale-95 transition-transform`}>
                        {cat.hasOffer && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Sparkles size={8} />
                            50%
                          </div>
                        )}
                        <span className="text-3xl">{cat.icon}</span>
                      </div>
                      <span className="text-xs text-gray-700 text-center font-medium leading-tight px-1 line-clamp-2">
                        {cat.name}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Message si aucune catégorie */}
            {categories.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">📂</span>
                </div>
                <p className="text-gray-500">Aucune catégorie disponible</p>
              </div>
            )}
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
