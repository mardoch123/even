
import { ServiceProvider, User } from '../types';
import { notificationService } from './notificationService';

const REPLACEMENT_KEY = 'eveneo_replacements';

interface ReplacementRequest {
    eventId: string;
    eventName: string;
    originalProviderId: string;
    category: string;
    price: number;
    date: string; // Format YYYY-MM-DD
    slot: string; // Format HH:MM
    broadcastTime: number; // Timestamp
    status: 'seeking' | 'replaced' | 'expired';
}

export const replacementService = {
    // 1. Le prestataire annule -> Création de l'opportunité
    initiateCancellation: async (
        eventId: string, 
        eventName: string,
        provider: ServiceProvider, 
        price: number,
        slot: string
    ) => {
        const request: ReplacementRequest = {
            eventId,
            eventName,
            originalProviderId: provider.id,
            category: provider.category,
            price,
            date: new Date().toISOString().split('T')[0], // Simplifié pour la démo
            slot,
            broadcastTime: Date.now(),
            status: 'seeking'
        };

        // Sauvegarde locale
        const existing = JSON.parse(localStorage.getItem(REPLACEMENT_KEY) || '[]');
        localStorage.setItem(REPLACEMENT_KEY, JSON.stringify([...existing, request]));

        // Mise à jour statut événement
        localStorage.setItem(`event_status_${eventId}`, 'seeking_replacement');

        // Notification (Simulation d'envoi aux autres prestataires)
        console.log(`[BROADCAST] Opportunité envoyée aux prestataires de type ${provider.category} pour ${price}€`);
        
        // Alerte admin
        notificationService.send({
            userId: 'admin',
            template: 'admin_alert',
            data: { message: `URGENT: Annulation prestataire sur ${eventId}. Recherche remplaçant lancée.` },
            channels: ['push']
        });

        return true;
    },

    // 2. Récupérer les opportunités pour un prestataire donné (Dashboard)
    getOpportunitiesForProvider: (providerCategory: string, providerPrice: number): ReplacementRequest[] => {
        const allRequests: ReplacementRequest[] = JSON.parse(localStorage.getItem(REPLACEMENT_KEY) || '[]');
        const now = Date.now();
        const SIX_HOURS = 6 * 60 * 60 * 1000;

        return allRequests.filter(req => {
            // Vérifier si expiré
            if (req.status === 'seeking' && (now - req.broadcastTime > SIX_HOURS)) {
                replacementService.handleExpiration(req);
                return false;
            }

            // Critères stricts : Même catégorie, prix similaire (+/- 20%), statut 'seeking'
            const isCategoryMatch = req.category === providerCategory;
            const isPriceMatch = req.price >= providerPrice * 0.8 && req.price <= providerPrice * 1.5; // Marge acceptable
            
            return req.status === 'seeking' && isCategoryMatch && isPriceMatch;
        });
    },

    // 3. Un nouveau prestataire accepte
    acceptReplacement: async (req: ReplacementRequest, newProvider: ServiceProvider) => {
        // Update Request Status
        const allRequests: ReplacementRequest[] = JSON.parse(localStorage.getItem(REPLACEMENT_KEY) || '[]');
        const updatedRequests = allRequests.map(r => r.eventId === req.eventId ? { ...r, status: 'replaced' as const } : r);
        localStorage.setItem(REPLACEMENT_KEY, JSON.stringify(updatedRequests));

        // Update Event Status
        localStorage.setItem(`event_status_${req.eventId}`, 'confirmed');

        // Initier le Chat Automatique
        const chatKey = `chat_history_${newProvider.id}`; // Mock key logic
        // Dans une vraie app, on appellerait l'API de chat. Ici on simule un message système.
        console.log(`[SYSTEM] Chat démarré entre Client et ${newProvider.name}. Détails transmis.`);

        // Notifications
        await notificationService.send({
            userId: 'client_id_placeholder', // Devrait être l'ID du client de l'event
            template: 'booking_confirmed',
            data: { eventName: `${req.eventName} (Repris par ${newProvider.name})`, eventId: req.eventId },
            channels: ['email', 'sms']
        });

        return true;
    },

    // 4. Expiration (Personne n'a accepté en 6h) -> Remboursement Total
    handleExpiration: (req: ReplacementRequest) => {
        // Marquer comme expiré
        const allRequests: ReplacementRequest[] = JSON.parse(localStorage.getItem(REPLACEMENT_KEY) || '[]');
        const updatedRequests = allRequests.map(r => r.eventId === req.eventId ? { ...r, status: 'expired' as const } : r);
        localStorage.setItem(REPLACEMENT_KEY, JSON.stringify(updatedRequests));
        
        // Mettre à jour statut event
        localStorage.setItem(`event_status_${req.eventId}`, 'cancelled_refunded');

        // Calcul Remboursement (Montant + 5%)
        // Note: Dans la vraie app, le montant total payé (incluant les 5%) est stocké.
        // Ici on recalcule grossièrement base + 5%
        const totalRefund = req.price * 1.05; 

        // Créditer le wallet client
        const currentBalance = parseFloat(localStorage.getItem('client_wallet_balance') || '0');
        localStorage.setItem('client_wallet_balance', (currentBalance + totalRefund).toString());

        // Log Spécial pour permettre le remboursement sur carte
        localStorage.setItem(`refund_available_${req.eventId}`, JSON.stringify({
            amount: totalRefund,
            source: 'cancellation_no_replacement',
            date: new Date().toISOString()
        }));

        console.log(`[REFUND] Expiration délai 6h. Client remboursé intégralement : ${totalRefund}€`);
    }
};
