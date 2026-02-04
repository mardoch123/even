
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Star, Filter, ChevronDown } from 'lucide-react';
import { Button } from '../components/Button';

const MOCK_REVIEWS = [
    { id: 1, user: 'Alice M.', rating: 5, text: 'Exceptionnel ! Le service était impeccable.', date: '2024-05-10', type: 'Mariage' },
    { id: 2, user: 'Thomas B.', rating: 4, text: 'Très bon, les invités ont adoré.', date: '2024-04-22', type: 'Anniversaire' },
    { id: 3, user: 'Sophie K.', rating: 5, text: 'Professionnel et à l\'écoute.', date: '2024-03-15', type: 'Séminaire' },
    { id: 4, user: 'Marc D.', rating: 3, text: 'Bon, mais un peu de retard.', date: '2024-02-01', type: 'Mariage' },
    { id: 5, user: 'Julie L.', rating: 5, text: 'Parfait du début à la fin.', date: '2024-01-20', type: 'Soirée Privée' },
];

export const ReviewsPage: React.FC = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [filterType, setFilterType] = useState<string>('Tous');
    const [sortBy, setSortBy] = useState<'date' | 'rating'>('date');

    const filteredReviews = MOCK_REVIEWS.filter(r => {
        const matchRating = filterRating ? r.rating === filterRating : true;
        const matchType = filterType === 'Tous' ? true : r.type === filterType;
        return matchRating && matchType;
    }).sort((a, b) => {
        if (sortBy === 'date') return new Date(b.date).getTime() - new Date(a.date).getTime();
        return b.rating - a.rating;
    });

    return (
        <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={() => navigate(-1)}
                        className="bg-white p-2 rounded-full shadow-sm hover:bg-gray-100"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-2xl font-bold text-eveneo-dark">Avis Clients</h1>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-bold mr-2">
                        <Filter size={16} /> Filtres :
                    </div>
                    
                    <select 
                        className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-violet/20"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="Tous">Tous les événements</option>
                        <option value="Mariage">Mariage</option>
                        <option value="Anniversaire">Anniversaire</option>
                        <option value="Séminaire">Séminaire</option>
                    </select>

                    <div className="flex gap-1">
                        {[5, 4, 3, 2, 1].map(star => (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center gap-1 ${
                                    filterRating === star 
                                    ? 'bg-amber-50 border-amber-200 text-amber-700' 
                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                }`}
                            >
                                {star} <Star size={12} fill="currentColor" className={filterRating === star ? "text-amber-500" : "text-gray-300"} />
                            </button>
                        ))}
                    </div>

                    <div className="ml-auto">
                         <select 
                            className="bg-transparent font-medium text-sm text-gray-600 focus:outline-none"
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as 'date' | 'rating')}
                        >
                            <option value="date">Les plus récents</option>
                            <option value="rating">Les mieux notés</option>
                        </select>
                    </div>
                </div>

                {/* Reviews List */}
                <div className="space-y-4">
                    {filteredReviews.length > 0 ? (
                        filteredReviews.map(review => (
                            <div key={review.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-eveneo-gradient flex items-center justify-center text-white font-bold">
                                            {(review.user || 'U').charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-900">{review.user}</h3>
                                            <p className="text-xs text-gray-400">{review.type} • {review.date}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1 text-amber-400">
                                        {[...Array(5)].map((_, k) => (
                                            <Star key={k} size={16} fill={k < review.rating ? "currentColor" : "none"} className={k >= review.rating ? "text-gray-200" : ""} />
                                        ))}
                                    </div>
                                </div>
                                <p className="text-gray-700 leading-relaxed pl-14">"{review.text}"</p>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-12 text-gray-500">Aucun avis ne correspond à vos critères.</div>
                    )}
                </div>
            </div>
        </div>
    );
};
