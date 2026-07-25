import { NextResponse } from "next/server";
import { AiConfigError, getAiProvider } from "@/lib/ai";
import type { AiMessage } from "@/lib/ai";

export const runtime = "nodejs";

type Body = {
  system?: string;
  messages?: AiMessage[];
  prompt?: string;
  provider?: string;
  model?: string;
  maxTokens?: number;
};

/**
 * Example generation endpoint. Accepts either a `prompt` string or a full
 * `messages` array. Provider-agnostic — swap the backing model with the
 * `AI_PROVIDER` / `AI_MODEL` env vars, no changes here.
 *
 *   POST /api/ai  { "prompt": "Suggest a title for a dark fantasy novel." }
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages: AiMessage[] = body.messages?.length
    ? body.messages
    : body.prompt
      ? [{ role: "user", content: body.prompt }]
      : [];

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Provide a `prompt` string or a non-empty `messages` array." },
      { status: 400 },
    );
  }

  try {
    const provider = getAiProvider(body.provider);
    const result = await provider.generate({
      system: body.system,
      messages,
      model: body.model,
      maxTokens: body.maxTokens,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AiConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    console.error("AI generation failed:", error);
    return NextResponse.json(
      { error: "Generation failed. Check server logs." },
      { status: 500 },
    );
  }
}
