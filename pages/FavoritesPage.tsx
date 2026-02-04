
import React, { useState, useEffect } from 'react';
import { Heart, Search, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ServiceCard } from '../components/ServiceCard';
import { Button } from '../components/Button';
import { ServiceProvider } from '../types';

// Données factices pour simuler les providers disponibles sur la plateforme
// Dans une vraie app, on récupérerait les détails via l'API pour chaque ID stocké
const MOCK_PROVIDERS: ServiceProvider[] = [
  {
    id: '1',
    name: 'Gourmet Prestige',
    category: 'Traiteur',
    rating: 4.9,
    reviewCount: 124,
    priceRange: '50€ / pers',
    priceValue: 50,
    priceUnit: 'item',
    imageUrl: 'https://picsum.photos/400/300?random=101',
    verified: true,
    location: 'Paris, France'
  },
  {
    id: '2',
    name: 'DJ Snake Event',
    category: 'DJ',
    rating: 4.8,
    reviewCount: 89,
    priceRange: '800€ / soirée',
    priceValue: 800,
    priceUnit: 'event',
    imageUrl: 'https://picsum.photos/400/300?random=102',
    verified: true,
    location: 'Lyon, France'
  },
  {
    id: '4',
    name: 'Salle Les Pins',
    category: 'Lieu',
    rating: 4.2,
    reviewCount: 12,
    priceRange: '2000€',
    priceValue: 2000,
    priceUnit: 'event',
    imageUrl: 'https://picsum.photos/400/300?random=104',
    verified: false,
    location: 'Marseille, France'
  }
];

export const FavoritesPage: React.FC = () => {
  const [favorites, setFavorites] = useState<ServiceProvider[]>([]);

  useEffect(() => {
    const storedFavs = JSON.parse(localStorage.getItem('user_favorites') || '[]');
    // Filter mock providers to find the ones in favorites
    const favProviders = MOCK_PROVIDERS.filter(p => storedFavs.includes(p.id));
    setFavorites(favProviders);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
                <Heart size={24} fill="currentColor" />
            </div>
            <div>
                <h1 className="text-3xl font-bold text-eveneo-dark">Mes Favoris</h1>
                <p className="text-gray-500">Retrouvez tous vos coups de cœur enregistrés.</p>
            </div>
        </div>

        {favorites.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {favorites.map(provider => (
                    <ServiceCard key={provider.id} provider={provider} />
                ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-gray-200 shadow-sm">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                    <Heart size={32} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Aucun favori pour le moment</h3>
                <p className="text-gray-500 mb-8 max-w-md mx-auto">
                    Explorez nos prestataires et cliquez sur le cœur pour les retrouver ici facilement.
                </p>
                <Link to="/search">
                    <Button variant="primary" size="lg" className="shadow-glow">
                        <Search size={18} className="mr-2" /> Explorer les services
                    </Button>
                </Link>
            </div>
        )}
      </div>
    </div>
  );
};
