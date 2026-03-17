import { CHAIN_LABELS } from "@/lib/constants";
import type { Chain } from "@/lib/types";

export function ChainBadge({ chain }: { chain: Chain }) {
  return (
    <span className="chain-badge" style={{ backgroundColor: `var(--chain-${chain})` }}>
      {CHAIN_LABELS[chain]}
    </span>
  );
}
