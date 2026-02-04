import { supabase, supabaseConfigError } from './supabaseClient';

export interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    read: boolean;
    created_at: string;
    attachment_data?: any;
    offer_details?: any;
}

export type ConversationPreview = {
    partnerId: string;
    lastMessage: ChatMessage;
    unreadCount: number;
};

export const messageService = {
    async getUnreadCount(userId: string): Promise<number> {
        if (supabaseConfigError) return 0;
        const { count, error } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('receiver_id', userId)
            .eq('read', false);

        if (error) {
            console.error('Error fetching unread count:', error);
            return 0;
        }

        return count || 0;
    },

    async getRecentMessages(userId: string, limit: number = 5): Promise<ChatMessage[]> {
        if (supabaseConfigError) return [];
        // This is a simplified query. For a real chat app, you'd want distinct conversations.
        // Here we just get the last received messages.
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('receiver_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching recent messages:', error);
            return [];
        }

        return data || [];
    },

    async listConversations(userId: string, fetchLimit: number = 150): Promise<ConversationPreview[]> {
        if (supabaseConfigError) return [];
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(fetchLimit);

        if (error) {
            console.error('Error listing conversations:', error);
            return [];
        }

        const messages = (data || []) as ChatMessage[];
        const byPartner = new Map<string, { last: ChatMessage; unread: number }>();

        for (const m of messages) {
            const partnerId = m.sender_id === userId ? m.receiver_id : m.sender_id;
            if (!byPartner.has(partnerId)) {
                byPartner.set(partnerId, { last: m, unread: 0 });
            }
            const entry = byPartner.get(partnerId)!;
            if (m.receiver_id === userId && !m.read) {
                entry.unread += 1;
            }
        }

        return Array.from(byPartner.entries()).map(([partnerId, v]) => ({
            partnerId,
            lastMessage: v.last,
            unreadCount: v.unread
        }));
    },

    async getConversationMessages(userId: string, partnerId: string, limit: number = 200): Promise<ChatMessage[]> {
        if (supabaseConfigError) return [];
        const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .or(`and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) {
            console.error('Error fetching conversation messages:', error);
            return [];
        }

        return (data || []) as ChatMessage[];
    },

    async sendMessage(input: {
        senderId: string;
        receiverId: string;
        content: string;
        attachmentData?: any;
        offerDetails?: any;
    }): Promise<ChatMessage | null> {
        if (supabaseConfigError) return null;
        const payload: any = {
            sender_id: input.senderId,
            receiver_id: input.receiverId,
            content: input.content,
            read: false
        };
        if (typeof input.attachmentData !== 'undefined') payload.attachment_data = input.attachmentData;
        if (typeof input.offerDetails !== 'undefined') payload.offer_details = input.offerDetails;

        const { data, error } = await supabase
            .from('chat_messages')
            .insert(payload)
            .select('*')
            .single();

        if (error) {
            console.error('Error sending message:', error);
            return null;
        }

        return data as ChatMessage;
    },

    async markConversationRead(userId: string, partnerId: string): Promise<boolean> {
        if (supabaseConfigError) return false;
        const { error } = await supabase
            .from('chat_messages')
            .update({ read: true })
            .eq('receiver_id', userId)
            .eq('sender_id', partnerId)
            .eq('read', false);

        if (error) {
            console.error('Error marking conversation read:', error);
            return false;
        }
        return true;
    },

    subscribeToMessages(userId: string, onMessage: (msg: ChatMessage) => void) {
        if (supabaseConfigError) {
            return { unsubscribe: () => {} };
        }
        const channel = supabase
            .channel(`chat_messages:${userId}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'chat_messages' },
                (payload) => {
                    const msg = payload.new as ChatMessage;
                    if (msg.sender_id === userId || msg.receiver_id === userId) {
                        onMessage(msg);
                    }
                }
            )
            .subscribe();

        return {
            unsubscribe: () => {
                supabase.removeChannel(channel);
            }
        };
    }
};
