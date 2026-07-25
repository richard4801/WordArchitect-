/**
 * Provider-agnostic AI contract.
 *
 * Every provider (Claude by default, others later) implements `AiProvider`.
 * Application code depends only on these types, never on a vendor SDK, so the
 * backing model can be swapped via configuration without touching callers.
 */

export type AiRole = "user" | "assistant";

export interface AiMessage {
  role: AiRole;
  content: string;
}

export interface GenerateParams {
  /** System prompt / instructions. */
  system?: string;
  /** Conversation so far. Must start with a `user` message. */
  messages: AiMessage[];
  /** Max output tokens. Providers apply a sane default when omitted. */
  maxTokens?: number;
  /** Optional model override; otherwise the provider's configured default. */
  model?: string;
}

export interface GenerateResult {
  /** The generated text. */
  text: string;
  /** The model that actually produced the response. */
  model: string;
}

export interface AiProvider {
  /** Stable identifier, e.g. "anthropic". */
  readonly id: string;
  /** Whether the provider has the credentials it needs to run. */
  isConfigured(): boolean;
  /** Single-shot text generation. */
  generate(params: GenerateParams): Promise<GenerateResult>;
}

/** Thrown when a provider is asked to run without required configuration. */
export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}
