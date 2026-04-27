/**
 * Anthropic model pricing — used to attribute spend per chat turn.
 *
 * Prices in USD per million tokens. Update when Anthropic changes pricing.
 * Cents are rounded UP, so a 1-token call always costs at least 1 cent
 * (avoids accumulated under-counting).
 */

type Price = { inputPerMTok: number; outputPerMTok: number };

const PRICING: Record<string, Price> = {
  // Sonnet 4.6
  "claude-sonnet-4-6": { inputPerMTok: 3.0, outputPerMTok: 15.0 },
  // Opus 4.6
  "claude-opus-4-6": { inputPerMTok: 15.0, outputPerMTok: 75.0 },
  // Haiku 4.5
  "claude-haiku-4-5-20251001": { inputPerMTok: 0.8, outputPerMTok: 4.0 },
};

const FALLBACK_PRICE: Price = { inputPerMTok: 3.0, outputPerMTok: 15.0 };

export function priceForModel(model: string): Price {
  return PRICING[model] ?? FALLBACK_PRICE;
}

export function costCents(model: string, tokensIn: number, tokensOut: number): number {
  const p = priceForModel(model);
  const usd =
    (tokensIn / 1_000_000) * p.inputPerMTok +
    (tokensOut / 1_000_000) * p.outputPerMTok;
  // round up to nearest cent
  return Math.max(1, Math.ceil(usd * 100));
}
