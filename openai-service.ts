import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
// We use the backend API endpoints instead of direct OpenAI access from frontend for security
const BASE_URL = '';

interface TransitSuggestion {
  route: string;
  modes: string[];
  estimatedTime: number;
  cost: number;
  trafficLevel: string;
}

export async function getTransitSuggestions(
  prompt: string,
  currentLocation: { lat: number; lng: number },
  userPreferences: Record<string, any>
): Promise<TransitSuggestion[]> {
  try {
    const response = await fetch('/api/transit-suggestions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: prompt,
        location: currentLocation,
        preferences: userPreferences,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to get transit suggestions');
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to get transit suggestions:", error);
    throw error;
  }
}

export async function processVoiceCommand(
  audioBlob: Blob
): Promise<{ text: string; language: string }> {
  try {
    const formData = new FormData();
    formData.append("file", audioBlob);

    const response = await fetch('/api/speech-to-text', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to process voice command');
    }

    return await response.json();
  } catch (error) {
    console.error("Failed to process voice command:", error);
    throw error;
  }
}

export async function generateVoiceResponse(
  text: string,
  language: string
): Promise<ArrayBuffer> {
  try {
    const response = await fetch("/api/text-to-speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });

    if (!response.ok) throw new Error("Failed to generate speech");
    return await response.arrayBuffer();
  } catch (error) {
    console.error("Failed to generate voice response:", error);
    throw error;
  }
}