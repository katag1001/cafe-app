// Renders nothing for a null tier — 0 ratings in a category means no
// badge at all, not a "Coffee Curious" placeholder (PRD.md §8.2).
function TierBadge({ tier }) {
  if (!tier) return null;

  return <span className="tier-badge">{tier.name}</span>;
}

export default TierBadge;
