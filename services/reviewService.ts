
export interface Review {
  id: string;
  providerId: string;
  userId: string;
  userName: string;
  eventId: string; // 11. Avis: Preuve de booking
  rating: number;
  comment: string;
  date: string;
  photos?: string[];
  reply?: {
    text: string;
    date: string;
  };
  reportCount: number;
  status: 'published' | 'hidden';
}

const MOCK_REVIEWS: Review[] = [
    { 
        id: 'rev-1', providerId: '1', userId: 'u-alice', userName: 'Alice M.', eventId: 'evt-old-1', 
        rating: 5, comment: 'Exceptionnel ! Le service était impeccable.', date: '2024-05-10', reportCount: 0, status: 'published' 
    },
    { 
        id: 'rev-2', providerId: '1', userId: 'u-tom', userName: 'Thomas B.', eventId: 'evt-old-2', 
        rating: 4, comment: 'Très bon, les invités ont adoré.', date: '2024-04-22', reportCount: 0, status: 'published',
        reply: { text: 'Merci Thomas ! Ce fut un plaisir.', date: '2024-04-23' }
    },
];

const STORAGE_KEY = 'eveneo_reviews';

export const reviewService = {
    getReviewsByProvider(providerId: string): Review[] {
        const all = this.getAllReviews();
        return all.filter(r => r.providerId === providerId && r.status === 'published');
    },

    getAllReviews(): Review[] {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : MOCK_REVIEWS;
    },

    addReview(review: Omit<Review, 'id' | 'date' | 'reportCount' | 'status'>) {
        const newReview: Review = {
            ...review,
            id: `rev-${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            reportCount: 0,
            status: 'published'
        };
        const reviews = this.getAllReviews();
        localStorage.setItem(STORAGE_KEY, JSON.stringify([newReview, ...reviews]));
        return newReview;
    },

    // 11. Avis: Possibilité de réponse du prestataire
    replyToReview(reviewId: string, replyText: string) {
        const reviews = this.getAllReviews();
        const updated = reviews.map(r => {
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
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },

    // 12. Modération: Masquer contenu
    hideReview(reviewId: string) {
        const reviews = this.getAllReviews();
        const updated = reviews.map(r => r.id === reviewId ? { ...r, status: 'hidden' as const } : r);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
};
