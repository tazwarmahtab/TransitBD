import express from "express";
import OpenAI from "openai";
import { z } from "zod";

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Validate TTS request body
const ttsSchema = z.object({
  text: z.string(),
  language: z.string().default("en"),
});

// Validate transit suggestions request body
const transitSuggestionsSchema = z.object({
  query: z.string(),
  location: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  preferences: z.record(z.any()),
});

// Speech to text endpoint
router.post("/speech-to-text", async (req, res) => {
  try {
    if (!req.files?.file) {
      return res.status(400).json({ error: "No audio file provided" });
    }

    const audioFile = req.files.file;
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    res.json({
      text: transcription.text,
      language: transcription.language || 'en'
    });
  } catch (error) {
    console.error("STT Error:", error);
    res.status(500).json({ error: "Failed to process speech" });
  }
});

// Text to speech endpoint
router.post("/text-to-speech", async (req, res) => {
  try {
    const { text, language } = ttsSchema.parse(req.body);

    const speechFile = await openai.audio.speech.create({
      model: "tts-1",
      voice: language === "bn" ? "shimmer" : "alloy",
      input: text,
    });

    const buffer = Buffer.from(await speechFile.arrayBuffer());

    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': buffer.length,
    });

    res.send(buffer);
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).json({ error: "Failed to generate speech" });
  }
});

// Transit suggestions endpoint
router.post("/transit-suggestions", async (req, res) => {
  try {
    const { query, location, preferences } = transitSuggestionsSchema.parse(req.body);

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: 
            "You are TransitBD's AI assistant, specialized in Bangladesh transportation. " +
            "Analyze travel queries in both Bengali and English, providing optimal route suggestions " +
            "considering traffic, weather, and user preferences. Response should be in the same language as the query."
        },
        {
          role: "user",
          content: JSON.stringify({
            query,
            location,
            preferences,
          })
        }
      ],
      response_format: { type: "json_object" }
    });

    return res.json(JSON.parse(response.choices[0].message.content).suggestions);
  } catch (error) {
    console.error("Transit suggestions error:", error);
    res.status(500).json({ error: "Failed to get transit suggestions" });
  }
});

export default router;