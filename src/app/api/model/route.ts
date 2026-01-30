import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const MODEL_CANDIDATES = [
  "gemini-2.0-flash-001",
  "gemini-2.0-flash",
  "gemini-1.5-flash-002",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
  "gemini-1.0-pro",
  "gemini-pro",
  "text-bison-001",
  "chat-bison-001",
];

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "Missing GEMINI_API_KEY on the server." },
      { status: 500 },
    );
  }

  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: "v1beta",
  });

  let picked: string | null = null;
  let lastError: string | null = null;

  for (const model of MODEL_CANDIDATES) {
    try {
      await ai.models.generateContent({
        model,
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        config: { maxOutputTokens: 1 },
      });
      picked = model;
      break;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("404") || message.includes("NOT_FOUND")) {
        lastError = message;
        continue;
      }
      if (message.includes("RESOURCE_EXHAUSTED")) {
        lastError = message;
        continue;
      }
      lastError = message;
    }
  }

  if (!picked) {
    return NextResponse.json({ error: lastError ?? "No model available." }, { status: 500 });
  }

  return NextResponse.json({ model: picked });
}
