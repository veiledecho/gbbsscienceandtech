import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";

export const maxDuration = 30;

const requestSchema = z.object({
  application: z.string().trim().min(8).max(500),
  complexity: z.enum(["beginner", "intermediate", "advanced"]),
  components: z.array(z.string().trim().min(1).max(120)).max(20),
});

function isRetryable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED/i.test(message);
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Sign in to use the project architect." }, { status: 401 });
  if (!process.env.GOOGLE_API_KEY) return NextResponse.json({ error: "AI generation is not configured." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Provide a project idea, complexity, and up to 20 components." }, { status: 400 });

  const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });
  const prompt = [
    "Act as an embedded-systems project architect for a school STEM laboratory.",
    "Return a concise engineering dossier with: assumptions and safety notes, wiring table, bill of materials, and a complete Arduino-compatible C++ sketch.",
    "Do not claim hardware has been tested. Flag voltage-level and power-supply concerns. Keep code compilable and avoid invented library APIs.",
    `Application: ${parsed.data.application}`,
    `Complexity: ${parsed.data.complexity}`,
    `Available components: ${parsed.data.components.join(", ") || "not specified"}`,
  ].join("\n\n");

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
      return NextResponse.json({ text: response.text ?? "No output was returned." }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (attempt === 2 || !isRetryable(error)) {
        console.error("Gemini architect request failed", error);
        return NextResponse.json({ error: "The architect could not complete this request. Try again shortly." }, { status: 502 });
      }
      await delay(400 * 2 ** attempt + Math.floor(Math.random() * 200));
    }
  }

  return NextResponse.json({ error: "The architect could not complete this request." }, { status: 502 });
}