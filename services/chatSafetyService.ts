import { GoogleGenAI } from '@google/genai';
import { imageModerationService } from './imageModerationService';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

type ChatSafetyDecision = {
  action: 'allow' | 'mask' | 'block';
  safeText: string;
  reasons: string[];
};

export const NEUTRAL_MASK_MESSAGE =
  "Contenu masqué pour votre sécurité. Utilisez la messagerie Événéo pour échanger. (Coordonnées externes bloquées — passez en forfait Pro pour débloquer).";

const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const urlRegex = /(https?:\/\/\S+)|(www\.\S+)/i;
const igRegex = /(@[A-Z0-9._]{2,})|(instagram\.com\/\S+)|(insta\s*:)|(ig\s*:)/i;
const whatsappRegex = /(whatsapp)|(wa\.me\/\S+)|(wa\s*:)/i;
const telegramRegex = /(telegram)|(t\.me\/\S+)/i;
const linktreeRegex = /(linktr\.ee\/\S+)|(linktree)/i;

const phoneDigitsRegex = /(?:(?:\+|00)\s?\d{1,3})?[\s.-]*(?:\(?\d{1,4}\)?[\s.-]*)?(?:\d[\s.-]*){6,}/;

const numberWordsRegex = /(z[ée]ro|zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)(?:[\s,-]+(z[ée]ro|zero|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix)){2,}/i;

const isSystemCallLinkMessage = (text: string) => {
  const t = String(text || '');
  if (!t.startsWith('📞')) return false;
  return /https?:\/\/meet\.jit\.si\/eveneo-call-/i.test(t);
};

const localContainsIdentifiers = (text: string) => {
  const t = text || '';
  if (isSystemCallLinkMessage(t)) return false;
  return (
    emailRegex.test(t) ||
    urlRegex.test(t) ||
    igRegex.test(t) ||
    whatsappRegex.test(t) ||
    telegramRegex.test(t) ||
    linktreeRegex.test(t) ||
    phoneDigitsRegex.test(t) ||
    numberWordsRegex.test(t)
  );
};

export const chatSafetyService = {
  getNeutralMaskMessage(): string {
    return NEUTRAL_MASK_MESSAGE;
  },

  sanitizeTextLocal(text: string): string {
    if (!text) return text;
    if (!localContainsIdentifiers(text)) return text;
    return NEUTRAL_MASK_MESSAGE;
  },

  async moderateText(text: string): Promise<ChatSafetyDecision> {
    const raw = text || '';

    if (!raw.trim()) {
      return { action: 'block', safeText: '', reasons: ['empty'] };
    }

    if (localContainsIdentifiers(raw)) {
      return { action: 'mask', safeText: NEUTRAL_MASK_MESSAGE, reasons: ['local_identifier_detected'] };
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  "Tu es un filtre de sécurité pour une messagerie interne. Détecte toute tentative de partage de coordonnées externes: numéros de téléphone (y compris écrits en toutes lettres comme 'cinq un quatre'), emails, Instagram/@handle, WhatsApp, Telegram, liens web, Linktree. Retourne STRICTEMENT un JSON: {action:'allow'|'mask'|'block', reasons:string[]}. 'mask' si coordonnées détectées. 'block' uniquement si le message n'est pratiquement que des coordonnées." +
                  "\nMessage: " +
                  raw
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const json = JSON.parse(response.text || '{}');
      const action = (json.action === 'allow' || json.action === 'mask' || json.action === 'block') ? json.action : 'allow';
      const reasons = Array.isArray(json.reasons) ? json.reasons.map((r: any) => String(r)) : [];

      if (action === 'allow') {
        return { action: 'allow', safeText: raw, reasons };
      }

      return { action, safeText: NEUTRAL_MASK_MESSAGE, reasons: reasons.length ? reasons : ['ai_identifier_detected'] };
    } catch {
      return { action: 'allow', safeText: raw, reasons: ['ai_failed_open'] };
    }
  },

  async moderateImage(dataUrl: string): Promise<{ action: 'allow' | 'block'; reasons: string[] } > {
    const scan = await imageModerationService.scanForIdentifiers(dataUrl);
    if (scan.blocked) {
      return { action: 'block', reasons: scan.reasons };
    }
    return { action: 'allow', reasons: [] };
  }
};
