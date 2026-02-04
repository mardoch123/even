import { supabase, supabaseConfigError } from './supabaseClient';
import { ServiceProvider } from '../types';

type SupabaseResult<T> = { data: T | null; error: any };

const withTimeout = async <T,>(promiseLike: any, ms: number): Promise<T> => {
    let timeoutId: any;
    const timeout = new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('timeout')), ms);
    });
    try {
        const p = Promise.resolve(promiseLike) as Promise<T>;
        return await Promise.race([p, timeout]);
    } finally {
        clearTimeout(timeoutId);
    }
};

const FALLBACK_PROVIDERS: ServiceProvider[] = [
    {
        id: 'demo-dj',
        name: 'DJ Nova',
        category: 'DJ',
        rating: 4.9,
        reviewCount: 42,
        priceRange: '700$ – 1500$',
        priceValue: 700,
        priceUnit: 'event',
        imageUrl: 'https://picsum.photos/800/600?random=210',
        portfolio: ['https://picsum.photos/400/300?random=211'],
        verified: true,
        location: 'Paris, Île-de-France',
        details: { subscriptionPlan: 'free' }
    },
    {
        id: 'demo-pastry',
        name: 'Atelier Sucré',
        category: 'Pâtissier',
        rating: 4.8,
        reviewCount: 28,
        priceRange: '80$ – 200$ par gâteau',
        priceValue: 80,
        priceUnit: 'item',
        imageUrl: 'https://picsum.photos/800/600?random=212',
        portfolio: ['https://picsum.photos/400/300?random=213'],
        verified: true,
        location: 'Lyon, Auvergne-Rhône-Alpes',
        details: { subscriptionPlan: 'free', pastrySpecialties: ['Wedding cake', 'Sans gluten'], pastryDelivery: true }
    },
    {
        id: 'demo-makeup',
        name: 'Sarah M.',
        category: 'Maquillage',
        rating: 4.7,
        reviewCount: 19,
        priceRange: '120$ – 250$',
        priceValue: 120,
        priceUnit: 'event',
        imageUrl: 'https://picsum.photos/800/600?random=214',
        portfolio: ['https://picsum.photos/400/300?random=215'],
        verified: true,
        location: 'Montréal, Québec',
        details: { subscriptionPlan: 'free' }
    },
    {
        id: 'demo-cater',
        name: 'Gourmet Studio',
        category: 'Traiteur',
        rating: 4.9,
        reviewCount: 85,
        priceRange: '50€ / pers',
        priceValue: 50,
        priceUnit: 'item',
        imageUrl: 'https://picsum.photos/800/600?random=216',
        portfolio: ['https://picsum.photos/400/300?random=217'],
        verified: true,
        location: 'Paris, Île-de-France',
        details: { subscriptionPlan: 'free' }
    }
];

const filterFallbackProviders = (query: string, category: string, location: string) => {
    const q = (query || '').trim().toLowerCase();
    const c = (category || '').trim().toLowerCase();
    const l = (location || '').trim().toLowerCase();

    return FALLBACK_PROVIDERS.filter(p => {
        const matchQuery = !q || String(p.name || '').toLowerCase().includes(q) || String(p.category || '').toLowerCase().includes(q);
        const matchCategory = !c || c === 'tous' || String(p.category || '').toLowerCase().includes(c);
        const matchLocation = !l || String(p.location || '').toLowerCase().includes(l);
        return matchQuery && matchCategory && matchLocation;
    });
};

// Helper to map Supabase result to ServiceProvider interface
const mapToServiceProvider = (data: any): ServiceProvider => ({
    id: data.id,
    name: data.name,
    category: data.category,
    rating: typeof data.rating === 'number' ? data.rating : Number(data.rating) || 0,
    reviewCount: typeof data.review_count === 'number' ? data.review_count : Number(data.review_count) || 0,
    priceRange: data.price_range,
    priceValue: typeof data.price_value === 'number' ? data.price_value : Number(data.price_value) || 0,
    priceUnit: data.price_unit,
    imageUrl: data.image_url,
    portfolio: data.portfolio,
    verified: Boolean(data.verified),
    location: data.location,
    description: data.description,
    details: data.details,
    capacity: data.capacity,
    cancellationPolicy: data.cancellation_policy, // Assuming this might be added to DB later or if it exists
    serviceArea: data.service_area,
    warrantyEnabled: data.warranty_enabled,
    availability: data.availability,
    bookedDates: data.booked_dates,
    includedItems: data.included_items,
    excludedItems: data.excluded_items,
    addOns: data.add_ons
});

export const providerService = {

    // Get all providers
    async getProviders(): Promise<ServiceProvider[]> {
        try {
            if (supabaseConfigError) {
                return FALLBACK_PROVIDERS;
            }
            const { data, error } = await withTimeout<SupabaseResult<any[]>>(
                supabase.from('service_providers').select('*'),
                6500
            );

            if (error) {
                console.error('Error fetching providers:', error);
                return FALLBACK_PROVIDERS;
            }

            const mapped = ((data as any[]) || []).map(mapToServiceProvider);
            return mapped.length > 0 ? mapped : FALLBACK_PROVIDERS;
        } catch (e) {
            console.error('Error fetching providers:', e);
            return FALLBACK_PROVIDERS;
        }
    },

    // Get a single provider by ID
    async getProviderById(id: string): Promise<ServiceProvider | null> {
        try {
            if (supabaseConfigError) {
                return FALLBACK_PROVIDERS.find(p => p.id === id) || null;
            }
            const { data, error } = await withTimeout<SupabaseResult<any>>(
                supabase
                    .from('service_providers')
                    .select('*')
                    .eq('id', id)
                    .single(),
                6500
            );

            if (error) {
                console.error('Error fetching provider:', error);
                return FALLBACK_PROVIDERS.find(p => p.id === id) || null;
            }

            if (!data) return FALLBACK_PROVIDERS.find(p => p.id === id) || null;
            return mapToServiceProvider(data);
        } catch (e) {
            console.error('Error fetching provider:', e);
            return FALLBACK_PROVIDERS.find(p => p.id === id) || null;
        }
    },

    // Search providers with filters
    async searchProviders(query: string = '', category: string = '', location: string = ''): Promise<ServiceProvider[]> {
        if (supabaseConfigError) {
            return filterFallbackProviders(query, category, location);
        }
        const q = (query || '').trim();
        const c = (category || '').trim();
        const l = (location || '').trim();

        let supabaseQuery = supabase.from('service_providers').select('*');

        if (q) {
            // Search across multiple fields to make Explorer usable even when users type a category or a city.
            const escaped = q.replace(/,/g, ' ');
            supabaseQuery = supabaseQuery.or(
                `name.ilike.%${escaped}%,category.ilike.%${escaped}%,location.ilike.%${escaped}%,description.ilike.%${escaped}%`
            );
        }

        if (c && c !== 'Tous') {
            // Use ilike instead of eq to tolerate slight category naming differences.
            supabaseQuery = supabaseQuery.ilike('category', `%${c}%`);
        }

        if (l) {
            supabaseQuery = supabaseQuery.ilike('location', `%${l}%`);
        }

        try {
            const { data, error } = await withTimeout<any>(supabaseQuery, 6500);

            if (error) {
                console.error('Error searching providers:', error);
                return filterFallbackProviders(query, category, location);
            }

            const mapped = (data || []).map(mapToServiceProvider);
            // If Supabase returns an empty list (e.g. empty DB), show fallback so Explorer isn't blank.
            return mapped.length > 0 ? mapped : filterFallbackProviders(query, category, location);
        } catch (e) {
            console.error('Error searching providers:', e);
            return filterFallbackProviders(query, category, location);
        }
    }
};
