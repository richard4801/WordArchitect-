import Anthropic from "@anthropic-ai/sdk";
import {
  AiConfigError,
  type AiProvider,
  type GenerateParams,
  type GenerateResult,
} from "@/lib/ai/types";

/**
 * Claude (Anthropic) provider — the default backing model for WordArchitect.
 *
 * Reads `ANTHROPIC_API_KEY` from the environment. The model can be overridden
 * per-call, or globally via `AI_MODEL`; it defaults to the latest Opus.
 */
const DEFAULT_MODEL = process.env.AI_MODEL ?? "claude-opus-5";
const DEFAULT_MAX_TOKENS = 4096;

export class AnthropicProvider implements AiProvider {
  readonly id = "anthropic";

  private client: Anthropic | null = null;

  isConfigured(): boolean {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  }

  private getClient(): Anthropic {
    if (!this.isConfigured()) {
      throw new AiConfigError(
        "ANTHROPIC_API_KEY is not set. Add it to your environment to use the Claude provider.",
      );
    }
    // Lazily instantiate so importing this module never requires a key.
    this.client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    return this.client;
  }

  async generate(params: GenerateParams): Promise<GenerateResult> {
    const client = this.getClient();
    const model = params.model ?? DEFAULT_MODEL;

    const response = await client.messages.create({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: params.system,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");

    return { text, model: response.model };
  }
}
