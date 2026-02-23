import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft,
  Calendar,
  Clock,
  Plus,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  AlertCircle,
  Save
} from 'lucide-react';
import { MobileBottomNav } from '../../components/mobile/MobileBottomNav';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

interface BlockedDate {
  id: string;
  date: string;
  reason?: string;
}

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const SHORT_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export const MobileProviderAvailabilityPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'blocked'>('weekly');
  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    const fetchAvailability = async () => {
      if (!currentUser) return;
      setLoading(true);
      try {
        // Fetch weekly availability
        const { data: availData } = await supabase
          .from('provider_availability')
          .select('*')
          .eq('provider_id', currentUser.id);

        if (availData && availData.length > 0) {
          setAvailability(availData.map(a => ({
            id: a.id,
            dayOfWeek: a.day_of_week,
            startTime: a.start_time,
            endTime: a.end_time,
            isAvailable: a.is_available
          })));
        } else {
          // Default availability (all days, 9h-18h)
          const defaultAvail = Array.from({ length: 7 }, (_, i) => ({
            id: `temp-${i}`,
            dayOfWeek: i,
            startTime: '09:00',
            endTime: '18:00',
            isAvailable: i !== 0 // Sunday off by default
          }));
          setAvailability(defaultAvail);
        }

        // Fetch blocked dates
        const { data: blockedData } = await supabase
          .from('provider_blocked_dates')
          .select('*')
          .eq('provider_id', currentUser.id)
          .gte('date', new Date().toISOString().split('T')[0]);

        if (blockedData) {
          setBlockedDates(blockedData.map(b => ({
            id: b.id,
            date: b.date,
            reason: b.reason
          })));
        }
      } catch (error) {
        console.error('Error fetching availability:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAvailability();
  }, [currentUser]);

  const handleSaveAvailability = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      // Delete existing availability
      await supabase
        .from('provider_availability')
        .delete()
        .eq('provider_id', currentUser.id);

      // Insert new availability
      const availToInsert = availability
        .filter(a => a.isAvailable)
        .map(a => ({
          provider_id: currentUser.id,
          day_of_week: a.dayOfWeek,
          start_time: a.startTime,
          end_time: a.endTime,
          is_available: true
        }));

      if (availToInsert.length > 0) {
        await supabase.from('provider_availability').insert(availToInsert);
      }

      alert('Disponibilités enregistrées !');
    } catch (error) {
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDay = (dayIndex: number) => {
    setAvailability(prev => prev.map(a => 
      a.dayOfWeek === dayIndex 
        ? { ...a, isAvailable: !a.isAvailable }
        : a
    ));
  };

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    setAvailability(prev => prev.map(a => 
      a.dayOfWeek === dayIndex 
        ? { ...a, [field]: value }
        : a
    ));
  };

  const handleBlockDate = async () => {
    if (!selectedDate || !currentUser) return;
    
    try {
      const { data } = await supabase
        .from('provider_blocked_dates')
        .insert({
          provider_id: currentUser.id,
          date: selectedDate,
          reason: blockReason || 'Indisponible'
        })
        .select()
        .single();

      if (data) {
        setBlockedDates(prev => [...prev, {
          id: data.id,
          date: data.date,
          reason: data.reason
        }]);
        setSelectedDate(null);
        setBlockReason('');
      }
    } catch (error) {
      console.error('Error blocking date:', error);
    }
  };

  const handleUnblockDate = async (id: string) => {
    try {
      await supabase
        .from('provider_blocked_dates')
        .delete()
        .eq('id', id);

      setBlockedDates(prev => prev.filter(d => d.id !== id));
    } catch (error) {
      console.error('Error unblocking date:', error);
    }
  };

  // Generate calendar days
  const getDaysInMonth = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    return days;
  };

  const isDateBlocked = (day: number) => {
    const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return blockedDates.some(b => b.date === dateStr);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-eveneo-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            Mes disponibilités
          </h1>
          
          <button 
            onClick={handleSaveAvailability}
            disabled={saving || activeTab !== 'weekly'}
            className="p-2 -mr-2 text-eveneo-blue font-medium text-sm disabled:opacity-50"
          >
            {saving ? '...' : 'Enregistrer'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white px-4 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'weekly'
                ? 'border-eveneo-blue text-eveneo-blue'
                : 'border-transparent text-gray-500'
            }`}
          >
            Horaires hebdo
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'blocked'
                ? 'border-eveneo-blue text-eveneo-blue'
                : 'border-transparent text-gray-500'
            }`}
          >
            Dates bloquées
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-4 py-4">
        {activeTab === 'weekly' ? (
          <div className="space-y-3">
            {availability.map((slot) => (
              <div 
                key={slot.dayOfWeek}
                className={`bg-white rounded-2xl p-4 shadow-sm ${
                  slot.isAvailable ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      slot.isAvailable ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <span className={`text-sm font-bold ${
                        slot.isAvailable ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {SHORT_DAYS[slot.dayOfWeek]}
                      </span>
                    </div>
                    <span className="font-medium text-gray-900">{DAYS[slot.dayOfWeek]}</span>
                  </div>
                  
                  <button
                    onClick={() => handleToggleDay(slot.dayOfWeek)}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      slot.isAvailable ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                      slot.isAvailable ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {slot.isAvailable && (
                  <div className="flex items-center gap-3 pl-13">
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Début</label>
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => handleTimeChange(slot.dayOfWeek, 'startTime', e.target.value)}
                        className="w-full p-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
                      />
                    </div>
                    <span className="text-gray-400 pt-5">→</span>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500 block mb-1">Fin</label>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => handleTimeChange(slot.dayOfWeek, 'endTime', e.target.value)}
                        className="w-full p-2 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Calendar */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronLeft size={20} />
                </button>
                <h3 className="font-semibold text-gray-900">
                  {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </h3>
                <button 
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center mb-2">
                {SHORT_DAYS.map(d => (
                  <span key={d} className="text-xs text-gray-500 py-2">{d}</span>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {getDaysInMonth().map((day, index) => (
                  <button
                    key={index}
                    disabled={!day}
                    onClick={() => day && setSelectedDate(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
                    className={`aspect-square rounded-lg flex items-center justify-center text-sm ${
                      !day ? '' :
                      isDateBlocked(day) ? 'bg-red-100 text-red-700' :
                      selectedDate?.includes(`-${String(day).padStart(2, '0')}`) ? 'bg-eveneo-blue text-white' :
                      'hover:bg-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Block date form */}
            {selectedDate && (
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <h4 className="font-medium text-gray-900 mb-3">
                  Bloquer le {new Date(selectedDate).toLocaleDateString('fr-FR')}
                </h4>
                <input
                  type="text"
                  value={blockReason}
                  onChange={(e) => setBlockReason(e.target.value)}
                  placeholder="Raison (optionnel)"
                  className="w-full p-3 bg-gray-50 rounded-xl mb-3 focus:outline-none focus:ring-2 focus:ring-eveneo-blue/20"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedDate(null)}
                    className="flex-1 py-2.5 border border-gray-300 rounded-xl font-medium text-gray-700"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleBlockDate}
                    className="flex-1 py-2.5 bg-red-500 text-white rounded-xl font-medium"
                  >
                    Bloquer
                  </button>
                </div>
              </div>
            )}

            {/* Blocked dates list */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h4 className="font-medium text-gray-900 mb-3">Dates bloquées</h4>
              {blockedDates.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">
                  Aucune date bloquée
                </p>
              ) : (
                <div className="space-y-2">
                  {blockedDates
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((blocked) => (
                    <div 
                      key={blocked.id}
                      className="flex items-center justify-between p-3 bg-red-50 rounded-xl"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {new Date(blocked.date).toLocaleDateString('fr-FR', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                        </p>
                        {blocked.reason && (
                          <p className="text-sm text-red-600">{blocked.reason}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnblockDate(blocked.id)}
                        className="p-2 hover:bg-red-100 rounded-full transition-colors"
                      >
                        <X size={18} className="text-red-600" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <MobileBottomNav />
    </div>
  );
};
