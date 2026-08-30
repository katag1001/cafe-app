const tiers = require('../config/tiers')

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

module.exports = { getTier }
