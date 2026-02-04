
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Calendar, ArrowLeft, CheckCircle, Play, AlertTriangle } from 'lucide-react';
import { Button } from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import { useCurrency } from '../contexts/CurrencyContext';
import { UserRole, EventItem } from '../types';
import { eventService } from '../services/eventService';
import { providerService } from '../services/providerService';

type EventStatus = 'pending' | 'confirmed' | 'started' | 'ended' | 'completed' | 'seeking_replacement' | 'cancelled_refunded';

export const EventDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser } = useAuth();
  const { formatPrice } = useCurrency();
  
  const [eventName, setEventName] = useState('Nouvel Événement');
  const [eventStatus, setEventStatus] = useState<EventStatus>('pending');
  
  const [items, setItems] = useState<EventItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Date simulée pour l'événement (dans le futur pour tester le cas < 24h, changez la date si besoin)
  // Pour la démo, considérons que l'événement est prévu pour "Demain" si on veut tester la limite, ou "Dans 1 mois" pour le remboursement total.
  // Ici on garde la date fixe mockée.
  const eventDateStr = "2024-06-24"; 

  useEffect(() => {
    const fetch = async () => {
      if (!id) return;

      setIsSyncing(true);
      try {
        const evt = await eventService.getEventById(id);
        if (evt) {
          setEventName(evt.name);
          setEventStatus(evt.status as EventStatus);

          const rows = await eventService.getEventItemsByEventId(id);
          const mapped: EventItem[] = [];
          for (const row of rows) {
            const provider = await providerService.getProviderById(row.provider_id);
            if (!provider) continue;

            mapped.push({
              id: row.id,
              provider,
              price: row.price,
              status: row.status,
              selectedAddOns: row.selected_add_ons || undefined,
              serviceStartAt: row.service_start_at || undefined,
              serviceEndAt: row.service_end_at || undefined,
              paidToProvider: row.paid_to_provider
            });
          }
          setItems(mapped);
          return;
        }
      } catch (e) {
        console.error('Failed to fetch event:', e);
      } finally {
        setIsSyncing(false);
      }

      // Fallback demo mode: allow preview from query params
      const initialItems: EventItem[] = [];
      const newProviderId = searchParams.get('providerId');
      const newProviderName = searchParams.get('providerName');
      const newPrice = searchParams.get('price');
      const serviceStartAt = searchParams.get('serviceStartAt');
      const serviceEndAt = searchParams.get('serviceEndAt');
      if (newProviderId && newProviderName) {
        initialItems.push({
          id: `item-${Date.now()}`,
          provider: { id: newProviderId, name: newProviderName, category: 'Service', rating: 5, reviewCount: 0, priceRange: '', priceValue: Number(newPrice), priceUnit: 'event', imageUrl: 'https://picsum.photos/50/50?random=99', verified: false, location: '' },
          price: Number(newPrice) || 0,
          status: 'pending',
          serviceStartAt: serviceStartAt || undefined,
          serviceEndAt: serviceEndAt || undefined,
          paidToProvider: false
        });
      }
      setItems(initialItems);
    };

    void fetch();
  }, [id, searchParams, currentUser]);

  // Calculate Total
  const totalCost = items.reduce((sum, item) => sum + item.price, 0);
  const isPaid = eventStatus !== 'pending';

  const handleGlobalValidate = () => navigate(`/checkout/${id}`);

  const handleProviderComplete = async (itemId: string) => {
    setIsSyncing(true);
    try {
      const ok = await eventService.updateEventItem(itemId, { status: 'completed_by_provider' });
      if (ok) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'completed_by_provider' } : i));
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClientApproveAndRelease = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const confirmOk = window.confirm(`Confirmer la validation ? Le paiement sera libéré au prestataire.`);
    if (!confirmOk) return;

    setIsSyncing(true);
    try {
      const ok = await eventService.updateEventItem(itemId, { status: 'validated_by_client', paid_to_provider: true });
      if (ok) {
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: 'validated_by_client', paidToProvider: true } : i));

        const currentBalance = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
        localStorage.setItem('provider_wallet_balance', (currentBalance + item.price).toString());
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCancelAnytime = async () => {
    if (!id) return;
    const penaltyRate = 0.15;
    const providerPenalty = Math.round(totalCost * penaltyRate * 100) / 100;
    const refundAmount = Math.round((totalCost - providerPenalty) * 100) / 100;
    const confirmOk = window.confirm(
      `Annuler la réservation ?\n\nPénalité: ${Math.round(penaltyRate * 100)}% reversée au prestataire (${formatPrice(providerPenalty)}).\nRemboursement sur votre portefeuille: ${formatPrice(refundAmount)}.`
    );
    if (!confirmOk) return;

    setIsSyncing(true);
    try {
      const ok = await eventService.updateEventStatus(id, 'cancelled_refunded');
      if (ok) {
        setEventStatus('cancelled_refunded');
        const currentClientBalance = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
        localStorage.setItem('client_wallet_balance', (currentClientBalance + refundAmount).toString());

        // Credit provider(s) with penalty
        const providerWalletGlobal = parseFloat(localStorage.getItem('provider_wallet_balance') || '0');
        localStorage.setItem('provider_wallet_balance', (providerWalletGlobal + providerPenalty).toString());

        // Optional per-provider breakdown (works even for multi-provider events)
        for (const it of items) {
          const part = Math.round(it.price * penaltyRate * 100) / 100;
          const key = `provider_wallet_balance_${it.provider.id}`;
          const curr = parseFloat(localStorage.getItem(key) || '0');
          localStorage.setItem(key, (curr + part).toString());
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="max-w-5xl mx-auto">
        <Link to="/orders" className="inline-flex items-center text-gray-500 hover:text-eveneo-violet mb-6">
          <ArrowLeft size={18} className="mr-2" /> Retour aux commandes
        </Link>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Event Details */}
          <div className="flex-grow">
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                      <p className="text-xs font-bold text-eveneo-violet uppercase tracking-wider">Statut Global</p>
                      {eventStatus === 'confirmed' && <span className="bg-green-100 text-green-700 px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle size={10} /> CONFIRMÉ</span>}
                      {eventStatus === 'started' && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1"><Play size={10} /> EN COURS</span>}
                      {eventStatus === 'completed' && <span className="bg-gray-800 text-white px-2 py-0.5 text-xs font-bold rounded-full flex items-center gap-1"><CheckCircle size={10} /> TERMINÉ</span>}
                      {eventStatus === 'cancelled_refunded' && <span className="bg-gray-200 text-gray-600 px-2 py-0.5 text-xs font-bold rounded-full">ANNULÉ</span>}
                  </div>
                  <h1 className="text-3xl font-bold text-gray-900">{eventName}</h1>
                </div>
                <div className="flex gap-2">
                    <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                        <Calendar size={14} /> {new Date(eventDateStr).toLocaleDateString()}
                    </span>
                </div>
              </div>

              {/* ITEMS LIST (Granular Validation) */}
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-800">Détail des prestations</h2>
                
                {items.length > 0 ? (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div key={item.id} className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border transition-all ${item.status === 'validated_by_client' ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                        
                        <div className="flex items-center gap-4 mb-4 md:mb-0">
                          <img src={item.provider.imageUrl} className="w-12 h-12 rounded-xl object-cover" alt="" />
                          <div>
                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                {item.provider.name}
                                {item.status === 'validated_by_client' && <CheckCircle size={16} className="text-green-600" />}
                            </h3>
                            <span className="text-sm text-gray-500">
                              {item.provider.category} • {formatPrice(item.price)}
                              {item.serviceStartAt && item.serviceEndAt && (
                                <>
                                  {' '}•{' '}
                                  {new Date(item.serviceStartAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  {' - '}
                                  {new Date(item.serviceEndAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {item.status === 'pending' && (
                            <span className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1 rounded-full">En attente</span>
                          )}
                          {item.status === 'confirmed' && (
                            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">Confirmé</span>
                          )}
                          {item.status === 'completed_by_provider' && (
                            <span className="text-xs font-bold text-orange-700 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">À approuver</span>
                          )}
                          {item.status === 'validated_by_client' && (
                            <span className="text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200">Payé</span>
                          )}

                          {currentUser?.role === UserRole.PROVIDER && currentUser.id === item.provider.id && item.status === 'confirmed' && (
                            <Button size="sm" variant="secondary" disabled={isSyncing} onClick={() => handleProviderComplete(item.id)}>
                              Marquer terminée
                            </Button>
                          )}

                          {currentUser?.role === UserRole.CLIENT && item.status === 'completed_by_provider' && (
                            <Button size="sm" variant="primary" disabled={isSyncing} onClick={() => handleClientApproveAndRelease(item.id)}>
                              Approuver & Payer
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500">Aucun prestataire.</p>
                  </div>
                )}
              </div>

              {currentUser?.role === UserRole.CLIENT && eventStatus !== 'cancelled_refunded' && (
                <div className="mt-8">
                  <Button variant="outline" onClick={handleCancelAnytime} disabled={isSyncing} className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300">
                    <AlertTriangle size={16} className="mr-2" /> Annuler la réservation
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Right: Summary (Only before payment) */}
          {!isPaid && (
              <div className="w-full lg:w-1/3">
                <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 sticky top-24">
                  <h3 className="text-xl font-bold text-gray-900 mb-6">Récapitulatif</h3>
                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between text-gray-600"><span>Prestataires</span><span>{formatPrice(totalCost)}</span></div>
                    <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-lg text-eveneo-dark"><span>Total</span><span>{formatPrice(totalCost)}</span></div>
                  </div>
                  <Button variant="primary" fullWidth size="lg" onClick={handleGlobalValidate} disabled={items.length === 0}>
                      <CheckCircle size={18} className="mr-2" /> Payer la réservation
                  </Button>
                </div>
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
