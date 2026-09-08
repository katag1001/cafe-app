import { getCategoryDisplayLabel } from "../../config/categoryDisplayLabels";

// Renders nothing for a null tier — 0 ratings in a category means no
// badge at all, not a "Coffee Curious" placeholder (PRD.md §8.2).
function TierBadge({ tier, categoryId }) {
  if (!tier) return null;

  const categoryLabel = getCategoryDisplayLabel(categoryId);

  return (
    <span className="tier-badge">
      {tier.name} {categoryLabel}
    </span>
  );
}

export default TierBadge;
