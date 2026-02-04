
import { createClient } from '@supabase/supabase-js';

// Use environment variables for configuration
// NOTE: In a real React app, these should be in a .env file as REACT_APP_SUPABASE_URL, etc.
// We provide placeholders to prevent the app from crashing immediately if env vars are missing.
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://sxagnqjfxrztnumibfdc.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY || 'sb_publishable_AyQyGBO9p-uZj5_Ott7MhQ_p2LveqT2';

const looksLikeSupabaseUrl = (url: string) => {
    const u = String(url || '').trim();
    return /^https?:\/\/.+\.supabase\.co\/?$/i.test(u);
};

const looksLikePublicSupabaseKey = (key: string) => {
    const k = String(key || '').trim();
    if (!k) return false;
    if (k.startsWith('eyJ') && k.split('.').length >= 2) return true;
    if (/^sb_[A-Za-z0-9_-]+$/.test(k)) return true;
    return false;
};

export const supabaseConfigError: string | null = (() => {
    if (!supabaseUrl || supabaseUrl.includes('placeholder') || !looksLikeSupabaseUrl(supabaseUrl)) {
        return 'Configuration Supabase invalide: définis VITE_SUPABASE_URL (ex: https://xxxx.supabase.co)';
    }
    if (!supabaseAnonKey || supabaseAnonKey.includes('placeholder') || !looksLikePublicSupabaseKey(supabaseAnonKey)) {
        return 'Configuration Supabase invalide: définis VITE_SUPABASE_ANON_KEY (clé publique Supabase)';
    }
    return null;
})();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to check connection
export const checkConnection = async () => {
    try {
        // Return false immediately if we are using placeholders
        if (supabaseUrl.includes('placeholder') || supabaseConfigError) return false;

        const { data, error } = await supabase.from('profiles').select('count').single();
        if (error) throw error;
        return true;
    } catch (e) {
        console.error("Supabase connection failed", e);
        return false;
    }
};
