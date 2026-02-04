import { supabase } from './supabaseClient';

export interface Event {
    id: string;
    client_id: string;
    name: string;
    date: string;
    status: 'draft' | 'confirmed' | 'started' | 'ended' | 'completed' | 'cancelled_refunded';
    total_cost: number;
    created_at?: string;
}

const LS_EVENTS_KEY = 'eveneo_events';
const LS_EVENT_ITEMS_KEY = 'eveneo_event_items';
const LS_DELETED_EVENTS_KEY = 'eveneo_deleted_events';
const LS_DELETED_EVENT_ITEMS_KEY = 'eveneo_deleted_event_items';

const readLocalEvents = (): Event[] => {
    try {
        return JSON.parse(localStorage.getItem(LS_EVENTS_KEY) || '[]') as Event[];
    } catch {
        return [];
    }
};

const writeLocalEvents = (events: Event[]) => {
    localStorage.setItem(LS_EVENTS_KEY, JSON.stringify(events));
};

const readLocalEventItems = (): EventItemRow[] => {
    try {
        return JSON.parse(localStorage.getItem(LS_EVENT_ITEMS_KEY) || '[]') as EventItemRow[];
    } catch {
        return [];
    }
};

const writeLocalEventItems = (items: EventItemRow[]) => {
    localStorage.setItem(LS_EVENT_ITEMS_KEY, JSON.stringify(items));
};

const readDeletedIds = (key: string): string[] => {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as any) : [];
        return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
        return [];
    }
};

const addDeletedId = (key: string, id: string) => {
    try {
        const prev = readDeletedIds(key);
        const next = [String(id), ...prev.filter(x => String(x) !== String(id))].slice(0, 200);
        localStorage.setItem(key, JSON.stringify(next));
    } catch {
        // ignore
    }
};

export interface EventItemRow {
    id: string;
    event_id: string;
    provider_id: string;
    price: number;
    status: 'pending' | 'confirmed' | 'completed_by_provider' | 'validated_by_client';
    selected_add_ons: string[] | null;
    paid_to_provider: boolean;
    service_start_at: string | null;
    service_end_at: string | null;
    created_at?: string;
}

export const eventService = {
    async getEventsByClientId(clientId: string): Promise<Event[]> {
        try {
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENTS_KEY));
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('client_id', clientId)
                .order('date', { ascending: true });

            if (error) throw error;

            const remote = ((data || []) as Event[]).filter(e => !deleted.has(String(e.id)));
            const local = readLocalEvents().filter(e => e.client_id === clientId);
            const merged = [...remote];
            const seen = new Set(remote.map(e => e.id));
            for (const e of local) {
                if (!seen.has(e.id)) merged.push(e);
            }
            return merged.sort((a, b) => a.date.localeCompare(b.date));
        } catch (error) {
            console.error('Error fetching events:', error);
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENTS_KEY));
            return readLocalEvents().filter(e => e.client_id === clientId && !deleted.has(String(e.id))).sort((a, b) => a.date.localeCompare(b.date));
        }
    },

    async createEvent(event: Omit<Event, 'id' | 'created_at'>): Promise<Event | null> {
        try {
            const { data, error } = await supabase
                .from('events')
                .insert([event])
                .select()
                .single();

            if (error) throw error;
            const created = data as Event;
            const existing = readLocalEvents();
            if (!existing.some(e => e.id === created.id)) {
                writeLocalEvents([created, ...existing]);
            }
            return created;
        } catch (error) {
            console.error('Error creating event:', error);
            const local: Event = {
                id: `evt-${Date.now()}`,
                client_id: event.client_id,
                name: event.name,
                date: event.date,
                status: event.status,
                total_cost: event.total_cost,
                created_at: new Date().toISOString()
            };
            const existing = readLocalEvents();
            writeLocalEvents([local, ...existing]);
            return local;
        }
    },

    async getEventById(eventId: string): Promise<Event | null> {
        try {
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENTS_KEY));
            if (deleted.has(String(eventId))) return null;
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching event:', error);
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENTS_KEY));
            if (deleted.has(String(eventId))) return null;
            return readLocalEvents().find(e => e.id === eventId) || null;
        }
    },

    async getEventItemsByEventId(eventId: string): Promise<EventItemRow[]> {
        try {
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENT_ITEMS_KEY));
            const { data, error } = await supabase
                .from('event_items')
                .select('id,event_id,provider_id,price,status,selected_add_ons,paid_to_provider,service_start_at,service_end_at,created_at')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return ((data || []) as EventItemRow[]).filter(i => !deleted.has(String(i.id)));
        } catch (error) {
            console.error('Error fetching event items:', error);
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENT_ITEMS_KEY));
            return readLocalEventItems().filter(i => i.event_id === eventId && !deleted.has(String(i.id))).sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
        }
    },

    async getEventItemsByProviderId(providerId: string): Promise<EventItemRow[]> {
        try {
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENT_ITEMS_KEY));
            const { data, error } = await supabase
                .from('event_items')
                .select('id,event_id,provider_id,price,status,selected_add_ons,paid_to_provider,service_start_at,service_end_at,created_at')
                .eq('provider_id', providerId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return ((data || []) as EventItemRow[]).filter(i => !deleted.has(String(i.id)));
        } catch (error) {
            console.error('Error fetching provider event items:', error);
            const deleted = new Set(readDeletedIds(LS_DELETED_EVENT_ITEMS_KEY));
            return readLocalEventItems().filter(i => i.provider_id === providerId && !deleted.has(String(i.id))).sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
        }
    },

    async createEventItem(item: Omit<EventItemRow, 'id' | 'created_at'>): Promise<EventItemRow | null> {
        try {
            const { data, error } = await supabase
                .from('event_items')
                .insert([item])
                .select()
                .single();

            if (error) throw error;
            const created = data as EventItemRow;
            const existing = readLocalEventItems();
            if (!existing.some(i => i.id === created.id)) {
                writeLocalEventItems([created, ...existing]);
            }
            return created;
        } catch (error) {
            console.error('Error creating event item:', error);
            const local: EventItemRow = {
                id: `item-${Date.now()}`,
                event_id: item.event_id,
                provider_id: item.provider_id,
                price: item.price,
                status: item.status,
                selected_add_ons: item.selected_add_ons,
                paid_to_provider: item.paid_to_provider,
                service_start_at: item.service_start_at,
                service_end_at: item.service_end_at,
                created_at: new Date().toISOString()
            };
            const existing = readLocalEventItems();
            writeLocalEventItems([local, ...existing]);
            return local;
        }
    },

    async getProviderBookedRanges(providerId: string, date: string): Promise<{ service_start_at: string; service_end_at: string }[]> {
        try {
            const start = new Date(`${date}T00:00:00`);
            const end = new Date(`${date}T23:59:59.999`);

            const { data, error } = await supabase
                .from('event_items')
                .select('service_start_at,service_end_at')
                .eq('provider_id', providerId)
                .not('service_start_at', 'is', null)
                .not('service_end_at', 'is', null)
                .lt('service_start_at', end.toISOString())
                .gt('service_end_at', start.toISOString());

            if (error) {
                console.error('Error fetching provider booked ranges:', error);
                return [];
            }

            return (data || []) as { service_start_at: string; service_end_at: string }[];
        } catch (e) {
            return [];
        }
    }
    ,
    async updateEventStatus(eventId: string, status: Event['status']): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('events')
                .update({ status })
                .eq('id', eventId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating event status:', error);
            const events = readLocalEvents();
            const idx = events.findIndex(e => e.id === eventId);
            if (idx >= 0) {
                events[idx] = { ...events[idx], status };
                writeLocalEvents(events);
                return true;
            }
            return false;
        }
    },

    async updateEventItem(itemId: string, patch: Partial<Pick<EventItemRow, 'status' | 'paid_to_provider'>>): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('event_items')
                .update(patch)
                .eq('id', itemId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error updating event item:', error);
            const items = readLocalEventItems();
            const idx = items.findIndex(i => i.id === itemId);
            if (idx >= 0) {
                items[idx] = { ...items[idx], ...patch } as EventItemRow;
                writeLocalEventItems(items);
                return true;
            }
            return false;
        }
    },

    async deleteEventItem(itemId: string): Promise<boolean> {
        try {
            const { error } = await supabase
                .from('event_items')
                .delete()
                .eq('id', itemId);

            if (error) throw error;
            addDeletedId(LS_DELETED_EVENT_ITEMS_KEY, itemId);
            const items = readLocalEventItems().filter(i => i.id !== itemId);
            writeLocalEventItems(items);
            return true;
        } catch (error) {
            console.error('Error deleting event item:', error);
            addDeletedId(LS_DELETED_EVENT_ITEMS_KEY, itemId);
            const items = readLocalEventItems();
            const next = items.filter(i => i.id !== itemId);
            if (next.length !== items.length) {
                writeLocalEventItems(next);
                return true;
            }
            return false;
        }
    }
};
