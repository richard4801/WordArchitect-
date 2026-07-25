import { AnthropicProvider } from "@/lib/ai/providers/anthropic";
import type { AiProvider } from "@/lib/ai/types";

export * from "@/lib/ai/types";

/**
 * Provider registry. Add new providers here and they become selectable via
 * the `AI_PROVIDER` environment variable — the rest of the app is unaffected.
 */
const registry: Record<string, () => AiProvider> = {
  anthropic: () => new AnthropicProvider(),
};

const DEFAULT_PROVIDER = "anthropic";

const cache = new Map<string, AiProvider>();

/**
 * Resolve an AI provider. Defaults to `AI_PROVIDER` (env) or Claude.
 * Pass an explicit id to force a particular provider.
 */
export function getAiProvider(id?: string): AiProvider {
  const key = id ?? process.env.AI_PROVIDER ?? DEFAULT_PROVIDER;
  const factory = registry[key];
  if (!factory) {
    throw new Error(
      `Unknown AI provider "${key}". Available: ${Object.keys(registry).join(", ")}.`,
    );
  }
  let provider = cache.get(key);
  if (!provider) {
    provider = factory();
    cache.set(key, provider);
  }
  return provider;
}

export const availableProviders = Object.keys(registry);
