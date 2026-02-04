import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export type ImageModerationResult = {
  blocked: boolean;
  reasons: string[];
  extractedText?: string;
};

const parseDataUrl = (dataUrl: string) => {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mimeType: m[1], data: m[2] };
};

export const imageModerationService = {
  async scanForIdentifiers(dataUrl: string): Promise<ImageModerationResult> {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed) return { blocked: false, reasons: ['invalid_data_url'] };

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text:
                  "Analyse cette image et détecte tout élément d'identification visible (logo, filigrane, @handle, nom d'entreprise, email, téléphone, QR code, URL, lien vers réseaux sociaux). Retourne STRICTEMENT un JSON avec: {blocked:boolean, reasons:string[], extractedText?:string}. blocked=true si au moins un élément d'identification est présent."
              },
              {
                inlineData: {
                  mimeType: parsed.mimeType,
                  data: parsed.data
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const raw = response.text || '';
      const json = JSON.parse(raw);
      return {
        blocked: !!json.blocked,
        reasons: Array.isArray(json.reasons) ? json.reasons.map((r: any) => String(r)) : [],
        extractedText: json.extractedText ? String(json.extractedText) : undefined
      };
    } catch {
      return { blocked: false, reasons: ['scan_failed'] };
    }
  }
};
