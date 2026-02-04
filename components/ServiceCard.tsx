
import React, { useState, MouseEvent } from 'react';
import { Star, MapPin, CheckCircle, ChevronLeft, ChevronRight, Rocket, Play } from 'lucide-react';
import { ServiceProvider } from '../types';
import { Link } from 'react-router-dom';
import { adsService } from '../services/adsService';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatCityAndRadius, maskProviderDisplayName } from '../utils/providerPrivacy';
import { getIndicativePriceRange } from '../utils/providerPricing';

interface ServiceCardProps {
  provider: ServiceProvider;
  isSponsored?: boolean; 
  className?: string;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ provider, isSponsored, className = "h-full" }) => {
  const { formatPrice } = useCurrency();
  const providerPlan = (provider.details as any)?.subscriptionPlan as string | undefined;
  const identityUnlocked = (providerPlan || 'free') !== 'free';
  const displayName = identityUnlocked ? provider.name : maskProviderDisplayName(provider.name);
  const displayLocation = identityUnlocked ? provider.location : formatCityAndRadius(provider.location, provider.serviceArea);
  const images = provider.portfolio && provider.portfolio.length > 0 
    ? provider.portfolio 
    : [
        provider.imageUrl,
        `https://picsum.photos/400/300?random=${provider.id}1`,
        `https://picsum.photos/400/300?random=${provider.id}2`
      ];

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleClick = () => {
      const campaignId = (provider as any)._campaignId;
      if (isSponsored && campaignId) {
          adsService.trackClick(campaignId);
      }
  };

  const currentMedia = images[currentImageIndex];
  const isVideo = currentMedia?.match(/\.(mp4|webm)$/i);

  const displayPrice = provider.priceUnit === 'item'
    ? `${formatPrice(provider.priceValue)} /pers`
    : provider.priceUnit === 'hour'
      ? `${formatPrice(provider.priceValue)} /h`
      : `${formatPrice(provider.priceValue)} /événement`;

  const indicative = getIndicativePriceRange(provider);
  const indicativeLabel = indicative
    ? `${formatPrice(indicative.min)} – ${formatPrice(indicative.max)}${indicative.suffix ? ` ${indicative.suffix}` : ''}`
    : displayPrice;

  return (
    <Link 
      to={`/provider/${provider.id}`} 
      state={{ providerData: provider }} 
      className={`block ${className}`}
      onClick={handleClick}
    >
      <div className={`bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border group flex flex-col relative ${className === 'h-full' ? 'h-full' : ''} ${isSponsored ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-100 hover:shadow-eveneo-violet/10'}`}>
        
        <div className="relative h-48 overflow-hidden group/carousel bg-gray-100 shrink-0">
          {isVideo ? (
             <div className="relative w-full h-full">
                <video 
                    src={currentMedia} 
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    preload="none"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/10">
                    <Play size={24} className="text-white opacity-50" fill="currentColor" />
                </div>
             </div>
          ) : (
              <img 
                src={currentMedia} 
                alt={`${displayName} portfolio`} 
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
          )}
          
          {isSponsored && (
              <div className="absolute top-0 left-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-br-xl z-20 flex items-center gap-1 shadow-md">
                  <Rocket size={10} /> SPONSORISÉ
              </div>
          )}

          {images.length > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 z-10">
               <button onClick={prevImage} className="p-1 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"><ChevronLeft size={20} /></button>
               <button onClick={nextImage} className="p-1 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"><ChevronRight size={20} /></button>
            </div>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10">
               {images.map((_, idx) => (
                   <div key={idx} className={`w-1.5 h-1.5 rounded-full shadow-sm ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`} />
               ))}
            </div>
          )}

          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-xs font-semibold text-eveneo-dark shadow-sm z-10">
            {provider.category}
          </div>
        </div>
        
        <div className="p-5 flex flex-col flex-grow">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-bold text-eveneo-dark line-clamp-1 group-hover:text-eveneo-violet transition-colors">{displayName}</h3>
            <div className="flex items-center gap-1 text-amber-400 font-bold text-sm">
              <Star size={16} fill="currentColor" />
              <span>{provider.rating}</span>
              <span className="text-gray-400 font-normal text-xs">({provider.reviewCount})</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-gray-500 text-sm mb-4">
            <MapPin size={14} />
            <span className="truncate">{displayLocation}</span>
          </div>
          
          <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-50">
            <div className="flex flex-col">
              <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">Prix indicatif</span>
              <span className="text-eveneo-violet font-bold text-lg">{indicativeLabel}</span>
            </div>
            {provider.verified && (
                <div className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                    <CheckCircle size={12} /> Vérifié
                </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};
