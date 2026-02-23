import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  ChevronRight, 
  Users, 
  Calendar, 
  Clock, 
  MapPin,
  Star,
  Shield,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Minus,
  Plus,
  Info
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { useCurrency } from '../../contexts/CurrencyContext';
import { providerService, ServiceProvider } from '../../services/providerService';
import { eventService } from '../../services/eventService';
import { supabase } from '../../services/supabaseClient';

interface BookingStep {
  id: number;
  title: string;
}

const steps: BookingStep[] = [
  { id: 1, title: 'Dates' },
  { id: 2, title: 'Détails' },
  { id: 3, title: 'Paiement' },
];

export const MobileBookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { providerId } = useParams<{ providerId: string }>();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();

  const [currentStep, setCurrentStep] = useState(1);
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Booking data
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState('14:00');
  const [endTime, setEndTime] = useState('18:00');
  const [guestCount, setGuestCount] = useState(50);
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wallet'>('card');

  // Calendar data
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  useEffect(() => {
    const fetchProvider = async () => {
      if (!providerId) return;
      setLoading(true);
      try {
        const data = await providerService.getProviderById(providerId);
        setProvider(data);
        
        // Generate available dates (next 60 days)
        const dates: Date[] = [];
        const today = new Date();
        for (let i = 1; i <= 60; i++) {
          const date = new Date(today);
          date.setDate(today.getDate() + i);
          // Randomly make some dates unavailable
          if (Math.random() > 0.3) {
            dates.push(date);
          }
        }
        setAvailableDates(dates);
      } catch (error) {
        console.error('Error fetching provider:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProvider();
  }, [providerId]);

  const getProviderPrice = () => {
    return provider?.priceValue || provider?.price || 0;
  };

  const calculateTotal = () => {
    if (!provider) return 0;
    const price = getProviderPrice();
    const hours = parseInt(endTime.split(':')[0]) - parseInt(startTime.split(':')[0]);
    const duration = hours > 0 ? hours : 4;
    
    if (provider.priceUnit === 'hour') {
      return price * duration;
    } else if (provider.priceUnit === 'item') {
      return price * guestCount;
    }
    return price;
  };

  const calculateFees = () => {
    return Math.round(calculateTotal() * 0.05); // 5% service fee
  };

  const calculateTotalWithFees = () => {
    return calculateTotal() + calculateFees();
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const isDateAvailable = (date: Date) => {
    return availableDates.some(d => 
      d.getDate() === date.getDate() &&
      d.getMonth() === date.getMonth() &&
      d.getFullYear() === date.getFullYear()
    );
  };

  const renderCalendar = () => {
    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const days: JSX.Element[] = [];

    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isAvailable = isDateAvailable(date);
      const isSelected = selectedDate && 
        date.getDate() === selectedDate.getDate() &&
        date.getMonth() === selectedDate.getMonth();

      days.push(
        <button
          key={day}
          onClick={() => isAvailable && handleDateSelect(date)}
          disabled={!isAvailable}
          className={`
            h-10 w-10 rounded-full text-sm font-medium mx-auto flex items-center justify-center
            ${isSelected 
              ? 'bg-black text-white' 
              : isAvailable 
                ? 'hover:bg-gray-100 text-gray-900' 
                : 'text-gray-300 cursor-not-allowed line-through'
            }
          `}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  const handleNextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
  };

  const handleSubmit = async () => {
    if (!provider || !selectedDate || !currentUser) return;
    
    setIsSubmitting(true);
    try {
      // Create event
      const event = await eventService.createEvent({
        client_id: currentUser.id,
        name: `Réservation - ${provider.name}`,
        date: selectedDate.toISOString().split('T')[0],
        status: 'draft',
        total_cost: calculateTotalWithFees()
      });

      if (event) {
        // Create event item
        await eventService.createEventItem({
          event_id: event.id,
          provider_id: provider.id,
          price: calculateTotalWithFees(),
          status: 'pending',
          selected_add_ons: [],
          paid_to_provider: false,
          service_start_at: `${selectedDate.toISOString().split('T')[0]}T${startTime}:00`,
          service_end_at: `${selectedDate.toISOString().split('T')[0]}T${endTime}:00`
        });

        // Navigate to payment
        navigate(`/checkout/${event.id}`);
      }
    } catch (error) {
      console.error('Error creating booking:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <AlertCircle size={48} className="text-gray-400 mb-4" />
        <p className="text-gray-500">Prestataire non trouvé</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header avec étapes */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="flex items-center px-4 py-3">
          <button 
            onClick={handlePrevStep}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-900" />
          </button>
          <div className="flex-1 flex justify-center gap-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  step.id <= currentStep ? 'bg-black' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>
      </header>

      {/* Contenu selon l'étape */}
      <main className="px-4 py-6">
        {currentStep === 1 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Quand avez-vous besoin de {provider.name} ?
            </h1>
            <p className="text-gray-500 mb-6">
              Sélectionnez une date disponible
            </p>

            {/* Calendar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => {
                    const prev = new Date(currentMonth);
                    prev.setMonth(prev.getMonth() - 1);
                    setCurrentMonth(prev);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <span className="font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </span>
                <button 
                  onClick={() => {
                    const next = new Date(currentMonth);
                    next.setMonth(next.getMonth() + 1);
                    setCurrentMonth(next);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa'].map(day => (
                  <span key={day} className="text-xs font-medium text-gray-500 py-2">
                    {day}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {renderCalendar()}
              </div>
            </div>

            {/* Time selection */}
            {selectedDate && (
              <div className="space-y-4 animate-in slide-in-from-bottom-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Clock size={20} className="text-gray-600" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Heure de début</label>
                    <select 
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full mt-1 bg-transparent font-semibold text-gray-900 focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <Clock size={20} className="text-gray-600" />
                  <div className="flex-1">
                    <label className="text-sm font-medium text-gray-700">Heure de fin</label>
                    <select 
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full mt-1 bg-transparent font-semibold text-gray-900 focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={`${i.toString().padStart(2, '0')}:00`}>
                          {i.toString().padStart(2, '0')}:00
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Détails de votre événement
            </h1>
            <p className="text-gray-500 mb-6">
              Personnalisez votre réservation
            </p>

            {/* Guest count */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-xl mb-4">
              <div className="flex items-center gap-3">
                <Users size={20} className="text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Nombre d'invités</p>
                  <p className="text-sm text-gray-500">Personnes attendues</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setGuestCount(Math.max(1, guestCount - 10))}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400"
                >
                  <Minus size={16} />
                </button>
                <span className="w-12 text-center font-semibold">{guestCount}</span>
                <button 
                  onClick={() => setGuestCount(guestCount + 10)}
                  className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-gray-400"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            {/* Special requests */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Demandes spéciales (optionnel)
              </label>
              <textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Décrivez vos besoins spécifiques..."
                rows={4}
                className="w-full p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 resize-none"
              />
            </div>

            {/* Provider preview */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="flex gap-3">
                <img 
                  src={provider.imageUrl} 
                  alt={provider.name}
                  className="w-16 h-16 rounded-xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{provider.name}</h3>
                  <p className="text-sm text-gray-500">{provider.category}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="fill-black text-black" />
                    <span className="text-sm font-medium">{provider.rating}</span>
                    <span className="text-sm text-gray-400">({provider.reviewCount} avis)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Confirmez et payez
            </h1>
            <p className="text-gray-500 mb-6">
              Votre réservation est sécurisée
            </p>

            {/* Payment methods */}
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                  paymentMethod === 'card' ? 'border-black bg-gray-50' : 'border-gray-200'
                }`}
              >
                <CreditCard size={24} className="text-gray-600" />
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">Carte bancaire</p>
                  <p className="text-sm text-gray-500">Visa, Mastercard, etc.</p>
                </div>
                {paymentMethod === 'card' && <CheckCircle size={20} className="text-black" />}
              </button>

              <button
                onClick={() => setPaymentMethod('wallet')}
                className={`w-full flex items-center gap-3 p-4 border rounded-xl transition-colors ${
                  paymentMethod === 'wallet' ? 'border-black bg-gray-50' : 'border-gray-200'
                }`}
              >
                <div className="w-6 h-6 rounded-full bg-eveneo-violet flex items-center justify-center">
                  <span className="text-white text-xs font-bold">€</span>
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gray-900">Portefeuille</p>
                  <p className="text-sm text-gray-500">Payer avec votre solde</p>
                </div>
                {paymentMethod === 'wallet' && <CheckCircle size={20} className="text-black" />}
              </button>
            </div>

            {/* Price breakdown */}
            <div className="border-t border-gray-200 pt-4 mb-6">
              <h3 className="font-semibold text-gray-900 mb-4">Détails du prix</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    {formatPrice(getProviderPrice())} x {provider.priceUnit === 'hour' 
                      ? `${parseInt(endTime) - parseInt(startTime)}h` 
                      : `${guestCount} pers.`}
                  </span>
                  <span className="text-gray-900">{formatPrice(calculateTotal())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Frais de service</span>
                  <span className="text-gray-900">{formatPrice(calculateFees())}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 font-semibold text-base">
                  <span>Total</span>
                  <span>{formatPrice(calculateTotalWithFees())}</span>
                </div>
              </div>
            </div>

            {/* Security badge */}
            <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <Shield size={20} className="text-gray-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-gray-900 text-sm">Paiement sécurisé</p>
                <p className="text-xs text-gray-500 mt-1">
                  Vos données sont chiffrées. Le paiement n'est débité qu'après confirmation du prestataire.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom bar with price and action */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-bottom">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-xl font-bold text-gray-900">
              {formatPrice(calculateTotalWithFees())}
            </p>
            {currentStep === 1 && selectedDate && (
              <p className="text-xs text-gray-400">
                {selectedDate.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            )}
          </div>
          
          {currentStep < 3 ? (
            <button
              onClick={handleNextStep}
              disabled={currentStep === 1 && !selectedDate}
              className="flex-1 max-w-xs bg-black text-white font-semibold py-3.5 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-transform"
            >
              Continuer
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 max-w-xs bg-black text-white font-semibold py-3.5 px-6 rounded-xl disabled:opacity-50 active:scale-95 transition-transform flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Confirmer'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
