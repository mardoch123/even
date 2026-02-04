import { supabase } from './supabaseClient';

export interface ChatMessage {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    read: boolean;
    created_at: string;
}

export const messageService = {
    async getUnreadCount(userId: string): Promise<number> {
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
    }
};
