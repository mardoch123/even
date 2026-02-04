import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

// Initialize the client
// The API key is injected automatically into process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are 'Éva', the intelligent assistant for Événéo, an event planning platform.
Your goal is to help users find service providers (DJs, Caterers, Photographers) and organize their events.
Tone: Professional, warm, enthusiastic, and helpful. 
Language: French.
Key Features to mention if asked: Verified identity, secure payments, smart booking, premium providers.

If a user asks for recommendations, suggest categories like "Traiteur" (Catering), "Photographe" (Photographer), "DJ", "Animation", or "Location de matériel".
Keep responses concise (under 100 words) unless asked for details.
`;

export const generateAssistantResponse = async (
  history: { role: string; text: string }[],
  userMessage: string
): Promise<string> => {
  try {
    const modelId = 'gemini-2.5-flash';
    
    // Construct the prompt with history context
    // In a real app with @google/genai, we would use the ChatSession API (ai.chats.create)
    // For this stateless function example, we construct a simplified flow or use chat.
    
    const chat = ai.chats.create({
        model: modelId,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        }
    });

    // Replay history to set state (simplified for this implementation)
    // In production, you'd keep the chat instance alive in a React Context/Hook
    for (const msg of history) {
        // We skip adding history here to save tokens/latency in this specific demo usage pattern
        // where we might re-instantiate. Ideally, use a persistent chat object.
        // For this code, we will just send the user message directly for simplicity,
        // or if we had a persistent chat object, we'd use it.
        // Let's assume single-turn context for simplicity in this specific helper function
        // OR reconstruct if needed. 
    }

    // Since we are stateless here, let's just generate content with the instruction + last message
    // A better approach for a persistent chat is used in the component.
    // We will allow the component to manage the chat instance, but here is a helper for a single-shot answer 
    // if needed, or we can export a class.
    
    // Let's stick to a simple generateContent for "quick answers" or use the chat inside the component.
    // Here is a helper that takes a simple prompt.
    
    const result: GenerateContentResponse = await ai.models.generateContent({
        model: modelId,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION,
        },
        contents: [
            ...history.map(h => ({
                role: h.role,
                parts: [{ text: h.text }]
            })),
            { role: 'user', parts: [{ text: userMessage }]}
        ]
    });

    return result.text || "Désolé, je n'ai pas pu traiter votre demande pour le moment.";

  } catch (error) {
    console.error("Error querying Gemini:", error);
    return "Je rencontre des difficultés techniques momentanées. Veuillez réessayer plus tard.";
  }
};