import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Heart, 
  Share,
  Star,
  MapPin,
  ShieldCheck,
  Check,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  Award,
  MessageCircle
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { providerService } from '../../services/providerService';
import { ServiceProvider } from '../../types';
import { reviewService, Review } from '../../services/reviewService';

export const MobileProviderProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const [providerData, reviewsData] = await Promise.all([
          providerService.getProviderById(id),
          reviewService.getReviewsByProvider(id)
        ]);
        setProvider(providerData);
        setReviews(reviewsData);
      } catch (error) {
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleBook = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate(`/booking/${id}`);
  };

  const handleContact = () => {
    if (!currentUser) {
      navigate('/login');
      return;
    }
    navigate(`/messages?provider=${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Skeleton loader */}
        <div className="h-72 bg-gray-200 animate-pulse" />
        <div className="px-4 py-4 space-y-4">
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse" />
          <div className="h-20 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Prestataire non trouvé</p>
      </div>
    );
  }

  const mainImage = provider.imageUrl || provider.portfolio?.[0] || 'https://picsum.photos/800/600';
  const otherImages = provider.portfolio?.slice(0, 4) || [];

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Image Gallery Header - Style Airbnb */}
      <div className="relative">
        {/* Main Image */}
        <div className="h-72 relative">
          <img 
            src={mainImage} 
            alt={provider.name}
            className="w-full h-full object-cover"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
        </div>

        {/* Top Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          >
            <ArrowLeft size={20} className="text-gray-900" />
          </button>
          
          <div className="flex gap-2">
            <button 
              onClick={() => setIsLiked(!isLiked)}
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Heart 
                size={20} 
                className={isLiked ? 'fill-red-500 text-red-500' : 'text-gray-900'} 
              />
            </button>
            <button 
              className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <Share size={20} className="text-gray-900" />
            </button>
          </div>
        </div>

        {/* Photo Grid Indicator */}
        {otherImages.length > 0 && (
          <button 
            onClick={() => setShowAllPhotos(true)}
            className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg text-sm font-medium shadow-lg flex items-center gap-2"
          >
            <div className="flex -space-x-1">
              {otherImages.slice(0, 3).map((_, i) => (
                <div key={i} className="w-6 h-6 rounded border-2 border-white bg-gray-300" />
              ))}
            </div>
            1/{(provider.portfolio?.length || 0) + 1}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {/* Title & Rating */}
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{provider.name}</h1>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex items-center gap-1">
              <Star size={16} className="fill-black text-black" />
              <span className="font-semibold">{provider.rating}</span>
            </div>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600 underline">{provider.reviewCount} avis</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-600">{provider.category}</span>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-gray-600 mb-6">
          <MapPin size={18} />
          <span>{provider.location}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Host Info - Style Airbnb */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white font-bold text-xl">
            {provider.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">Prestataire vérifié</h3>
            <p className="text-sm text-gray-500">{provider.category} · Membre depuis 2023</p>
            {provider.verified && (
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-600">
                <ShieldCheck size={14} className="text-green-600" />
                <span>Identité vérifiée</span>
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Description */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">À propos</h2>
          <p className="text-gray-600 leading-relaxed">
            {provider.description || `Professionnel ${provider.category.toLowerCase()} basé à ${provider.location}. 
            Spécialisé dans les événements de prestige avec ${provider.reviewCount} clients satisfaits.`}
          </p>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* What's Included */}
        {provider.includedItems && provider.includedItems.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Ce qui est inclus</h2>
            <div className="space-y-3">
              {provider.includedItems.slice(0, 4).map((item, index) => (
                <div key={index} className="flex items-start gap-3">
                  <Check size={18} className="text-gray-900 mt-0.5 shrink-0" />
                  <span className="text-gray-600">{item}</span>
                </div>
              ))}
            </div>
            {provider.includedItems.length > 4 && (
              <button className="mt-4 text-gray-900 font-semibold underline">
                Afficher les {provider.includedItems.length - 4} autres
              </button>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Reviews Preview */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Star size={20} className="fill-black text-black" />
            <span className="text-xl font-semibold">{provider.rating}</span>
            <span className="text-gray-600">· {provider.reviewCount} commentaires</span>
          </div>

          {reviews.slice(0, 2).map((review) => (
            <div key={review.id} className="mb-4 pb-4 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold">
                  {review.clientName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{review.clientName}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString('fr-FR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <p className="text-gray-600 text-sm line-clamp-3">{review.comment}</p>
            </div>
          ))}

          {reviews.length > 2 && (
            <button className="w-full py-3 border border-gray-900 rounded-xl font-semibold text-gray-900 active:scale-95 transition-transform">
              Afficher les {reviews.length} commentaires
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200 my-6" />

        {/* Cancellation Policy */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Politique d'annulation</h2>
          <p className="text-gray-600">
            {provider.cancellationPolicy || "Annulation gratuite jusqu'à 72h avant l'événement."}
          </p>
          <button className="mt-2 text-gray-900 font-semibold underline text-sm">
            En savoir plus
          </button>
        </div>
      </div>

      {/* Bottom Booking Bar - Style Airbnb */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 safe-area-bottom z-40">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(provider.priceValue || provider.price || 0)}
              </span>
              <span className="text-gray-600">/ {provider.priceUnit === 'hour' ? 'heure' : provider.priceUnit === 'item' ? 'personne' : 'prestation'}</span>
            </div>
            <div className="flex items-center gap-1 text-sm">
              <Star size={14} className="fill-black text-black" />
              <span className="font-semibold">{provider.rating}</span>
              <span className="text-gray-500">· {provider.reviewCount} avis</span>
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={handleContact}
              className="px-4 py-3 border border-gray-900 rounded-xl font-semibold text-gray-900 active:scale-95 transition-transform"
            >
              <MessageCircle size={20} />
            </button>
            <button
              onClick={handleBook}
              className="px-6 py-3 bg-gradient-to-r from-eveneo-violet to-eveneo-pink text-white font-semibold rounded-xl active:scale-95 transition-transform"
            >
              Réserver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
