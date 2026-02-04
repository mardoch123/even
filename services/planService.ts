
import { PricingPlan, UserRole } from '../types';

const DEFAULT_PLANS: PricingPlan[] = [
    {
        id: 'free',
        name: 'Découverte',
        price: 0,
        period: 'month',
        role: UserRole.PROVIDER,
        features: ['Profil basique', '3 photos max', 'Commission 15%', 'Support email']
    },
    {
        id: 'pro',
        name: 'Professionnel',
        price: 29,
        period: 'month',
        role: UserRole.PROVIDER,
        recommended: true,
        features: ['Profil vérifié (Badge)', 'Photos illimitées', 'Commission 5%', 'Support prioritaire', 'Statistiques avancées']
    },
    {
        id: 'agency',
        name: 'Agence / Lieu',
        price: 99,
        period: 'month',
        role: UserRole.PROVIDER,
        features: ['Multi-utilisateurs', 'API Access', '0% Commission', 'Account Manager dédié', 'Mise en avant en tête de liste']
    }
];

const STORAGE_KEY = 'eveneo_subscription_plans';

export const planService = {
    getPlans: (): PricingPlan[] => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
        return DEFAULT_PLANS;
    },

    savePlans: (plans: PricingPlan[]) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
        // Dispatch event to notify listeners (like SubscriptionPage)
        window.dispatchEvent(new Event('plans-updated'));
    },

    resetDefaults: () => {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event('plans-updated'));
        return DEFAULT_PLANS;
    }
};
