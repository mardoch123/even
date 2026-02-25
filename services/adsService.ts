
import { ServiceProvider } from '../types';
import { GoogleGenAI } from "@google/genai";

// Initialize AI
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface AdSettings {
    enabled: boolean;
    allowedCountries: string[];
    baseCPM: number;
    clickMultiplier: number; // Cost per click base
    durationMultipliers: Record<string, number>;
}

export interface AdCreative {
    headline: string;
    tagline: string;
    tags: string[];
    customImage?: string;
}

export interface AdEvent {
    type: 'impression' | 'click' | 'conversion';
    timestamp: number;
    cost: number;
}

export interface AdAuditResult {
    safetyScore: number; // 0-100
    qualityScore: number; // 0-100
    isSafe: boolean;
    issues: string[];
    suggestions: string[];
}

export interface AdCampaign {
    id: string;
    providerId: string;
    providerName: string;
    providerCategory: string; // Added for relevance algo
    targetCountry: string;
    type: 'local' | 'region' | 'retarget';
    creative: AdCreative; // New customization
    duration: string;
    startDate: string;
    endDate: string;
    budgetTotal: number;
    budgetSpent: number; // Track spending
    status: 'active' | 'paused' | 'stopped' | 'completed' | 'pending_review' | 'rejected';
    aiAnalysis?: {
        safe: boolean;
        reason: string;
    };
    stats: {
        impressions: number;
        clicks: number;
        reservations: number;
        revenueGenerated: number;
        ctr: number; // Click Through Rate (Computed)
        score: number; // Relevance Score (Computed)
    };
    events: AdEvent[]; // Detailed logs
}

const DEFAULT_SETTINGS: AdSettings = {
    enabled: true,
    allowedCountries: ['France', 'Canada', 'Belgique', 'Suisse'],
    baseCPM: 2.00, 
    clickMultiplier: 0.50,
    durationMultipliers: {
        '24h': 1,
        '3d': 2.5,
        '7d': 5,
        '30d': 15
    }
};

const STORAGE_KEY_SETTINGS = 'admin_ads_settings';
const STORAGE_KEY_CAMPAIGNS = 'admin_ads_campaigns';
const SESSION_ATTRIBUTION_KEY = 'ad_attribution_id';

export const adsService = {
    // --- ADMIN CONFIGURATION ---
    getSettings: (): AdSettings => {
        const stored = localStorage.getItem(STORAGE_KEY_SETTINGS);
        return stored ? JSON.parse(stored) : DEFAULT_SETTINGS;
    },

    saveSettings: (settings: AdSettings) => {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
    },

    // --- AI ANALYSIS & AUDIT ---
    
    // Detailed audit for User Feedback (Pre-submission)
    auditAdContent: async (creative: AdCreative): Promise<AdAuditResult> => {
        try {
            const prompt = `
            You are an expert marketing consultant and safety compliance officer for an event platform.
            Analyze the following ad content:
            Headline: "${creative.headline}"
            Tagline: "${creative.tagline}"
            Tags: "${creative.tags.join(', ')}"

            1. Assess Safety (0-100): Check for profanity, scams, prohibited items, or aggressive language. 100 is perfectly safe.
            2. Assess Quality (0-100): Check for catchiness, clarity, spelling, and marketing impact. 100 is excellent.
            3. Provide a list of issues (if any safety concerns).
            4. Provide specific suggestions to improve the ad (better wording, more relevant tags).

            Return ONLY valid JSON in this format:
            {
                "safetyScore": number,
                "qualityScore": number,
                "isSafe": boolean,
                "issues": ["string"],
                "suggestions": ["string"]
            }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const jsonText = response.text;
            if (!jsonText) throw new Error("No response from AI");
            
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Ad Audit Error", error);
            // Fallback
            return {
                safetyScore: 100,
                qualityScore: 50,
                isSafe: true,
                issues: [],
                suggestions: ["Impossible d'analyser le contenu pour le moment."]
            };
        }
    },

    // Basic check for Backend/Admin (Post-submission)
    analyzeAdContent: async (creative: AdCreative): Promise<{ safe: boolean, reason: string }> => {
        try {
            const prompt = `
            You are a content moderation AI for an event planning platform.
            Analyze the following advertisement content:
            Headline: "${creative.headline}"
            Tagline: "${creative.tagline}"
            Tags: "${creative.tags.join(', ')}"

            Determine if this content contains prohibited material such as:
            - Hate speech, violence, or harassment.
            - Explicit sexual content.
            - Illegal drugs or substances.
            - Scams, fraud, or misleading claims.
            - Weapons or dangerous goods.

            Return a JSON object strictly in this format: { "safe": boolean, "reason": string }.
            If safe is true, reason can be "Safe". If safe is false, provide a short reason (max 10 words).
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: 'application/json' }
            });

            const jsonText = response.text;
            if (!jsonText) return { safe: true, reason: "AI Check Skipped" };
            
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Ad Moderation Error", error);
            // Fail safe: mark as pending review if AI fails
            return { safe: false, reason: "AI Verification Failed - Manual Review Required" }; 
        }
    },

    // --- CAMPAIGN MANAGEMENT ---
    createCampaign: async (
        provider: ServiceProvider, 
        durationId: string, 
        audienceType: any, 
        price: number,
        creative: AdCreative
    ) => {
        const campaigns = adsService.getCampaigns();
        
        const now = new Date();
        const end = new Date();
        const days = durationId === '30d' ? 30 : durationId === '7d' ? 7 : durationId === '3d' ? 3 : 1;
        end.setDate(end.getDate() + days);

        const country = (provider.location || '').split(',').pop()?.trim() || 'Canada';

        // AI MODERATION CHECK
        const analysis = await adsService.analyzeAdContent(creative);
        const initialStatus = analysis.safe ? 'active' : 'pending_review';

        const newCampaign: AdCampaign = {
            id: `camp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            providerId: provider.id,
            providerName: provider.name,
            providerCategory: provider.category,
            targetCountry: country,
            type: audienceType,
            duration: durationId,
            creative: creative,
            startDate: now.toISOString(),
            endDate: end.toISOString(),
            budgetTotal: price,
            budgetSpent: 0,
            status: initialStatus,
            aiAnalysis: analysis,
            stats: {
                impressions: 0,
                clicks: 0,
                reservations: 0,
                revenueGenerated: 0,
                ctr: 0,
                score: 100 // Initial boost score
            },
            events: []
        };

        // Get fresh list again to avoid race conditions in local storage simulated env
        const freshCampaigns = adsService.getCampaigns();
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify([newCampaign, ...freshCampaigns]));
        return newCampaign;
    },

    getCampaigns: (): AdCampaign[] => {
        const stored = localStorage.getItem(STORAGE_KEY_CAMPAIGNS);
        return stored ? JSON.parse(stored) : [];
    },

    getProviderCampaigns: (providerId: string): AdCampaign[] => {
        return adsService.getCampaigns().filter(c => c.providerId === providerId);
    },

    updateCampaignStatus: (campaignId: string, status: AdCampaign['status']) => {
        const campaigns = adsService.getCampaigns();
        const updated = campaigns.map(c => {
            if (c.id === campaignId) {
                return { ...c, status };
            }
            return c;
        });
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
    },

    deleteCampaign: (campaignId: string) => {
        const campaigns = adsService.getCampaigns();
        const updated = campaigns.filter(c => c.id !== campaignId);
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
    },

    // --- THE "POWERFUL" ALGORITHM (Ad Server Logic) ---
    
    getRelevantAds: (searchQuery: string = '', categoryFilter: string = '', locationFilter: string = ''): AdCampaign[] => {
        const settings = adsService.getSettings();
        if (!settings.enabled) return [];

        const allCampaigns = adsService.getCampaigns();
        const activeCampaigns = allCampaigns.filter(c => 
            c.status === 'active' && 
            c.budgetSpent < c.budgetTotal && 
            new Date(c.endDate) > new Date()
        );

        const scoredCampaigns = activeCampaigns.map(c => {
            let score = 0;

            // 1. Category Relevance (High weight)
            if (categoryFilter && categoryFilter !== 'Tous') {
                if (c.providerCategory === categoryFilter) score += 50;
            } else {
                score += 10; // Base score for visibility in "All"
            }

            // 2. Keyword Relevance (Tags & Headline)
            const query = searchQuery.toLowerCase();
            if (query) {
                if (c.creative.headline.toLowerCase().includes(query)) score += 30;
                if (c.creative.tags.some(t => t.toLowerCase().includes(query))) score += 20;
                if (c.providerName.toLowerCase().includes(query)) score += 15;
            }

            // 3. Location Relevance
            if (locationFilter && c.targetCountry.toLowerCase().includes(locationFilter.toLowerCase())) {
                score += 20;
            }

            // 4. Performance Weight (CTR) - Promote good ads
            const ctr = c.stats.impressions > 0 ? (c.stats.clicks / c.stats.impressions) : 0;
            score += (ctr * 100); 

            // 5. Budget Pacing (If budget is high, show more)
            const budgetLeft = c.budgetTotal - c.budgetSpent;
            if (budgetLeft > (c.budgetTotal * 0.5)) score += 10;

            return { ...c, _tempScore: score };
        });

        // Filter out low relevance if a search is active, otherwise show top budget
        const threshold = searchQuery ? 10 : 0;
        
        return scoredCampaigns
            .filter(c => c._tempScore > threshold)
            .sort((a, b) => b._tempScore - a._tempScore)
            .map(({ _tempScore, ...c }) => c as AdCampaign);
    },

    // --- REAL TRACKING ---

    trackImpression: (campaignId: string) => {
        const campaigns = adsService.getCampaigns();
        const updated = campaigns.map(c => {
            if (c.id === campaignId && c.status === 'active') {
                // Cost per impression (micro-transaction)
                const cost = 0.002; // e.g. 2€ CPM -> 0.002€ per view
                
                // Check budget
                if (c.budgetSpent + cost >= c.budgetTotal) {
                    return { ...c, status: 'completed' as const, budgetSpent: c.budgetTotal };
                }

                // Update Stats
                const newStats = { ...c.stats, impressions: c.stats.impressions + 1 };
                // Recompute CTR
                newStats.ctr = newStats.clicks / newStats.impressions;

                return {
                    ...c,
                    budgetSpent: c.budgetSpent + cost,
                    stats: newStats
                    // Note: We avoid pushing to 'events' array on every impression to save localStorage space
                };
            }
            return c;
        });
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
    },

    trackClick: (campaignId: string) => {
        const campaigns = adsService.getCampaigns();
        const settings = adsService.getSettings();
        
        const updated = campaigns.map(c => {
            if (c.id === campaignId && c.status === 'active') {
                // Cost per click
                const cost = settings.clickMultiplier; // e.g. 0.50€

                // Store attribution token for conversion tracking
                sessionStorage.setItem(SESSION_ATTRIBUTION_KEY, JSON.stringify({
                    id: campaignId,
                    timestamp: Date.now()
                }));

                const newStats = { ...c.stats, clicks: c.stats.clicks + 1 };
                newStats.ctr = newStats.clicks / newStats.impressions;

                return {
                    ...c,
                    budgetSpent: c.budgetSpent + cost,
                    stats: newStats,
                    events: [...c.events, { type: 'click' as const, timestamp: Date.now(), cost }]
                };
            }
            return c;
        });
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
    },

    trackConversion: (amount: number) => {
        // Check if user came from an ad
        const attribution = sessionStorage.getItem(SESSION_ATTRIBUTION_KEY);
        if (!attribution) return;

        const { id, timestamp } = JSON.parse(attribution);
        // Attribution window: 24h
        if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
            sessionStorage.removeItem(SESSION_ATTRIBUTION_KEY);
            return;
        }

        const campaigns = adsService.getCampaigns();
        const updated = campaigns.map(c => {
            if (c.id === id) {
                return {
                    ...c,
                    stats: {
                        ...c.stats,
                        reservations: c.stats.reservations + 1,
                        revenueGenerated: c.stats.revenueGenerated + amount
                    },
                    events: [...c.events, { type: 'conversion' as const, timestamp: Date.now(), cost: 0 }]
                };
            }
            return c;
        });
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
        
        // Consume attribution
        sessionStorage.removeItem(SESSION_ATTRIBUTION_KEY);
    },

    // --- SIMULATION FOR DEMO PURPOSES ---
    // Keeps old simulation logic for background noise, but scaled down
    simulateTraffic: () => {
        // Only run occasionally for background "noise" on other users' campaigns
        if (Math.random() > 0.3) return; 

        const campaigns = adsService.getCampaigns();
        const updated = campaigns.map(c => {
            if (c.status === 'active') {
                if (new Date(c.endDate) < new Date()) {
                    return { ...c, status: 'completed' as const };
                }
                // Only simulate passive views, real clicks come from user
                const newImpressions = c.stats.impressions + Math.floor(Math.random() * 3);
                return { ...c, stats: { ...c.stats, impressions: newImpressions } };
            }
            return c;
        });
        localStorage.setItem(STORAGE_KEY_CAMPAIGNS, JSON.stringify(updated));
    },

    getGlobalStats: () => {
        const campaigns = adsService.getCampaigns();
        return {
            totalRevenue: campaigns.reduce((acc, c) => acc + c.budgetTotal, 0),
            totalImpressions: campaigns.reduce((acc, c) => acc + c.stats.impressions, 0),
            totalClicks: campaigns.reduce((acc, c) => acc + c.stats.clicks, 0),
            activeCampaignsCount: campaigns.filter(c => c.status === 'active').length
        };
    }
};
