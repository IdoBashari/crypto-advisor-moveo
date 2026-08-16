// The closed list of crypto assets a user may select.
//
// The `id` values are CoinGecko coin IDs and are consumed directly by the
// CoinGecko API in phase 5. They are not derivable from the ticker — "ripple"
// is XRP, "avalanche-2" is AVAX, "binancecoin" is BNB — so changing one here
// silently breaks price lookups rather than failing loudly at compile time.
// Only `id` is persisted; `symbol` and `name` exist for display.

export interface SupportedAsset {
  readonly id: string;
  readonly symbol: string;
  readonly name: string;
}

export const SUPPORTED_ASSETS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "cardano", symbol: "ADA", name: "Cardano" },
  { id: "binancecoin", symbol: "BNB", name: "BNB" },
  { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
  { id: "chainlink", symbol: "LINK", name: "Chainlink" },
  { id: "polkadot", symbol: "DOT", name: "Polkadot" },
  { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
] as const satisfies readonly SupportedAsset[];

/** Union of the valid persisted values, e.g. "bitcoin" | "ethereum" | ... */
export type SupportedAssetId = (typeof SUPPORTED_ASSETS)[number]["id"];

// Derived, never a second hand-written list: adding an entry above is enough
// for validation to accept it.
export const SUPPORTED_ASSET_IDS: readonly SupportedAssetId[] =
  SUPPORTED_ASSETS.map((asset) => asset.id);

export const MIN_ASSETS = 1;
export const MAX_ASSETS = 5;
