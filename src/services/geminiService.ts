import { GoogleGenAI, Type } from "@google/genai";
import type { GameState } from "../types";

// Lazy initialize so it doesn't crash on module load if key is missing
let aiClient: GoogleGenAI | null = null;
function getAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found in environment");
      return null;
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface AIContent {
  headlines: string[];
  advice: string;
}

export async function getCombinedAIContent(state: GameState): Promise<AIContent | null> {
  const ai = getAI();
  if (!ai) return null;

  const prompt = `
    You are the AI brain for "EcoCity: Balance".
    Stats: Money $${state.money}, Eco-Health ${state.ecoHealth.toFixed(1)}, Pollution ${state.pollution.toFixed(1)}, Pop ${state.population}.
    
    Tasks:
    1. Generate 3 news headlines (Indonesian/English mix) based on stats.
    2. Give one short advice sentence (slangy, "bro" style).
    
    Return ONLY JSON:
    {
      "headlines": ["string", "string", "string"],
      "advice": "string"
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch (error: any) {
    if (error?.status === 429 || error?.message?.includes('429')) {
      console.warn("AI Quota Exceeded (429). Throttling...");
    } else {
      console.error("AI Combined Fetch Error:", error);
    }
    return null;
  }
}

export async function generateNewsTicker(state: GameState): Promise<string[]> {
  const ai = getAI();
  if (!ai) return ["Connecting to satellite...", "Establishing city link..."];

  const prompt = `
    You are an AI city news ticker for a game called "EcoCity: Balance".
    Current City Stats:
    - Money: $${state.money}
    - Eco-Health: ${state.ecoHealth.toFixed(1)}/100
    - Pollution: ${state.pollution.toFixed(1)}/100
    - Population: ${state.population}
    
    Generate 3 short, catchy news headlines in a mix of English and Indonesian (to give a local city vibe) based on these stats.
    - If Eco-Health is high, be positive (e.g. Birds returning).
    - If Pollution is high, be concerned (e.g. Asma meningkat).
    - If Money is low, mention economic struggle.
    - If Population is high, mention urban sprawl.
    
    Format: Return a JSON array of strings.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) return ["City is expanding.", "Warga menanti kebijakan baru."];
    return JSON.parse(text);
  } catch (error) {
    console.error("AI Ticker Error:", error);
    return ["City is expanding.", "Warga menanti kebijakan baru."];
  }
}

export async function getSmartAdvisor(state: GameState): Promise<string> {
  const ai = getAI();
  if (!ai) return "Manager, we need budget for the AI server!";

  const prompt = `
    You are "Eco-AI", a smart budget advisor for a city manager.
    Current Stats: Money $${state.money}, Eco-Health ${state.ecoHealth.toFixed(1)}, Pollution ${state.pollution.toFixed(1)}.
    
    Give one short, punchy advice sentence (slangy, "bro" style) on what the player should do next.
    - If money is high and eco is low: Suggest planting trees or solar.
    - If money is low: Suggest building high-income factories but warn about pollution.
    - If both are good: Keep it cool.
    Example: "Bro, duitmu banyak tapi kotamu gersang, mending bangun Taman Kota sekarang."
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt
    });

    return response.text?.trim() || "Stay balanced, Manager!";
  } catch (error) {
    console.error("AI Advisor Error:", error);
    return "Optimize the balance, Manager!";
  }
}
