const tiers = require('../_config/tiers')

// Pure lookup, no DB access — used both when freezing a weight onto a new
// rating and anywhere a tier badge needs displaying (Phase 8).
// Returns null for 0 (no tier/badge at all, per PRD.md §8.2).
function getTier(count) {
  if (!count || count < 1) {
    return null
  }

  const tier = tiers.find(
    (t) => count >= t.minCount && (t.maxCount === null || count <= t.maxCount),
  )

  return tier ? { tier: tier.tier, name: tier.name, weight: tier.weight } : null
}

// The top two rungs of the ladder (currently "Coffee Connoisseur" and "Café
// Oracle") — derived from the tiers list length rather than a hardcoded tier
// number, so it stays correct if the ladder gains/loses tiers. Used by
// surfaces (e.g. "Browse user faves") that only want to highlight a user's
// highest-tier badges, not every tier they've ever crossed.
const TOP_TIER_CUTOFF = tiers.length - 1

function isTopTier(tier) {
  return !!tier && tier.tier >= TOP_TIER_CUTOFF
}

module.exports = { getTier, isTopTier }
