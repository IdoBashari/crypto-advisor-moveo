// The investor types, and how they are written for a reader.
//
// Shared because two screens need it: onboarding offers the choice, and the
// dashboard names it back. A second copy would drift, and the drift would be
// invisible — both would still render something plausible.
//
// The values mirror the server's InvestorType enum and are the contract; the
// labels are display only. A typo in a value is a 400 from the server rather
// than a silent mismatch.

export const INVESTOR_TYPES = [
  { value: "HODLER", label: "HODLer" },
  { value: "DAY_TRADER", label: "Day Trader" },
  { value: "NFT_COLLECTOR", label: "NFT Collector" },
] as const;

/**
 * The label for a stored investor type, or null if it is not one we know.
 *
 * Null rather than the raw value: "NFT_COLLECTOR" on screen is worse than
 * nothing, and the caller can leave the segment out entirely.
 */
export function investorTypeLabel(value: string): string | null {
  return INVESTOR_TYPES.find((type) => type.value === value)?.label ?? null;
}
