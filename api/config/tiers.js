// The contributor tier ladder (PRD.md §8.2). Applies identically to every
// category. `maxCount: null` means unbounded (101+). `weight` is the
// multiplier applied to a rater's category quick-score — frozen onto the
// CafeRating entry at submission time, never recalculated retroactively.
module.exports = [
  { tier: 1, name: 'Coffee Curious', minCount: 1, maxCount: 5, weight: 1 },
  { tier: 2, name: 'Café Regular', minCount: 6, maxCount: 20, weight: 1.2 },
  { tier: 3, name: 'Bean Scout', minCount: 21, maxCount: 50, weight: 1.4 },
  { tier: 4, name: 'Coffee Connoisseur', minCount: 51, maxCount: 100, weight: 1.7 },
  { tier: 5, name: 'Café Oracle', minCount: 101, maxCount: null, weight: 2 },
]
