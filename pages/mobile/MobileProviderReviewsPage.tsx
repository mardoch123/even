import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Star,
  MessageCircle,
  Filter,
  ChevronDown,
  ThumbsUp,
  Flag,
  Send,
  X,
  MoreVertical,
  User
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { reviewService, Review } from '../../services/reviewService';
import { providerService } from '../../services/providerService';

export const MobileProviderReviewsPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest' | 'lowest'>('newest');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [providerStats, setProviderStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    fiveStar: 0,
    fourStar: 0,
    threeStar: 0,
    twoStar: 0,
    oneStar: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch provider data for stats
        const providerData = await providerService.getProviderById(currentUser.id);
        
        // Fetch reviews
        const providerReviews = reviewService.getReviewsByProvider(currentUser.id);
        setReviews(providerReviews);
        
        // Calculate stats
        const total = providerReviews.length;
        const avg = total > 0 
          ? providerReviews.reduce((sum, r) => sum + r.rating, 0) / total 
          : 0;
        
        setProviderStats({
          averageRating: Math.round(avg * 10) / 10,
          totalReviews: total,
          fiveStar: providerReviews.filter(r => r.rating === 5).length,
          fourStar: providerReviews.filter(r => r.rating === 4).length,
          threeStar: providerReviews.filter(r => r.rating === 3).length,
          twoStar: providerReviews.filter(r => r.rating === 2).length,
          oneStar: providerReviews.filter(r => r.rating === 1).length
        });
      } catch (error) {
        console.error('Error fetching reviews:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [currentUser]);

  const getFilteredAndSortedReviews = () => {
    let filtered = reviews;
    
    if (filterRating) {
      filtered = filtered.filter(r => r.rating === filterRating);
    }
    
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'highest':
          return b.rating - a.rating;
        case 'lowest':
          return a.rating - b.rating;
        default:
          return 0;
      }
    });
  };

  const handleReply = (reviewId: string) => {
    if (!replyText.trim()) return;
    
    reviewService.replyToReview(reviewId, replyText);
    
    // Update local state
    setReviews(prev => prev.map(r => {
      if (r.id === reviewId) {
        return {
          ...r,
          reply: {
            text: replyText,
            date: new Date().toISOString().split('T')[0]
          }
        };
      }
      return r;
    }));
    
    setReplyingTo(null);
    setReplyText('');
  };

  const handleReport = (reviewId: string) => {
    // In a real app, this would send a report to admin
    alert('Avis signalé. Notre équipe va examiner ce contenu.');
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={14}
            className={star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}
          />
        ))}
      </div>
    );
  };

  const sortOptions = [
    { value: 'newest', label: 'Plus récents' },
    { value: 'oldest', label: 'Plus anciens' },
    { value: 'highest', label: 'Meilleures notes' },
    { value: 'lowest', label: 'Moins bonnes notes' }
  ];

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
            Mes avis
          </h1>
          
          <div className="w-10" />
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
                <div className="h-24 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Stats Card */}
            <section className="bg-white rounded-2xl p-5 shadow-sm mb-4">
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gray-900">
                    {providerStats.averageRating.toFixed(1)}
                  </div>
                  <div className="flex justify-center mt-1">
                    {renderStars(Math.round(providerStats.averageRating))}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {providerStats.totalReviews} avis
                  </div>
                </div>
                
                <div className="flex-1 space-y-1">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = providerStats[`${rating}Star` as keyof typeof providerStats] as number;
                    const percentage = providerStats.totalReviews > 0 
                      ? (count / providerStats.totalReviews) * 100 
                      : 0;
                    
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-3">{rating}</span>
                        <Star size={10} className="text-gray-300" />
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* Filters */}
            <section className="bg-white rounded-2xl p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Filtrer par note</h3>
                {filterRating && (
                  <button 
                    onClick={() => setFilterRating(null)}
                    className="text-sm text-eveneo-blue"
                  >
                    Réinitialiser
                  </button>
                )}
              </div>
              
              <div className="flex gap-2 flex-wrap">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilterRating(filterRating === rating ? null : rating)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      filterRating === rating
                        ? 'bg-amber-100 text-amber-700 border-2 border-amber-300'
                        : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                  >
                    {rating} <Star size={12} className={filterRating === rating ? 'fill-amber-500 text-amber-500' : ''} />
                  </button>
                ))}
              </div>
            </section>

            {/* Sort */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">
                {getFilteredAndSortedReviews().length} avis
              </span>
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu(!showSortMenu)}
                  className="flex items-center gap-1 text-sm font-medium text-gray-700 bg-white px-3 py-2 rounded-xl shadow-sm"
                >
                  {sortOptions.find(o => o.value === sortBy)?.label}
                  <ChevronDown size={16} />
                </button>
                
                {showSortMenu && (
                  <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-10 min-w-[160px]">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value as any);
                          setShowSortMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm ${
                          sortBy === option.value 
                            ? 'text-eveneo-blue bg-blue-50' 
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
              {getFilteredAndSortedReviews().length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Star size={32} className="text-gray-400" />
                  </div>
                  <p className="text-gray-500">Aucun avis</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Les avis de vos clients apparaîtront ici
                  </p>
                </div>
              ) : (
                getFilteredAndSortedReviews().map((review) => (
                  <div key={review.id} className="bg-white rounded-2xl p-4 shadow-sm">
                    {/* Review Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-eveneo-violet to-eveneo-pink flex items-center justify-center text-white font-bold">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{review.userName}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(review.date).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-lg">
                        <Star size={12} className="fill-amber-400 text-amber-400" />
                        <span className="text-sm font-semibold text-amber-700">{review.rating}</span>
                      </div>
                    </div>

                    {/* Review Content */}
                    <p className="text-gray-700 leading-relaxed mb-3">
                      "{review.comment}"
                    </p>

                    {/* Review Photos */}
                    {review.photos && review.photos.length > 0 && (
                      <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                        {review.photos.map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Photo ${index + 1}`}
                            className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* Provider Reply */}
                    {review.reply && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-3 ml-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded-full bg-eveneo-blue flex items-center justify-center">
                            <User size={12} className="text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-700">Votre réponse</span>
                          <span className="text-xs text-gray-400">
                            {new Date(review.reply.date).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm pl-8">{review.reply.text}</p>
                      </div>
                    )}

                    {/* Reply Form */}
                    {replyingTo === review.id && !review.reply && (
                      <div className="bg-gray-50 rounded-xl p-3 mb-3">
                        <textarea
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="Votre réponse..."
                          rows={3}
                          className="w-full p-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20 resize-none text-sm"
                        />
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyText('');
                            }}
                            className="flex-1 py-2 border border-gray-300 rounded-xl text-sm font-medium text-gray-700"
                          >
                            Annuler
                          </button>
                          <button
                            onClick={() => handleReply(review.id)}
                            disabled={!replyText.trim()}
                            className="flex-1 py-2 bg-eveneo-blue text-white rounded-xl text-sm font-medium disabled:opacity-50"
                          >
                            Répondre
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                      {!review.reply && replyingTo !== review.id && (
                        <button
                          onClick={() => setReplyingTo(review.id)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MessageCircle size={16} />
                          Répondre
                        </button>
                      )}
                      <button
                        onClick={() => handleReport(review.id)}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-auto"
                      >
                        <Flag size={16} />
                        Signaler
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
