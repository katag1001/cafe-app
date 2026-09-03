import TierBadge from "./TierBadge";

function BadgeRow({ categoryTiers, localBadges }) {
  if (!categoryTiers?.length && !localBadges?.length) {
    return null;
  }

  return (
    <div className="badge-row">
      {categoryTiers.map((entry) => (
        <TierBadge key={entry.categoryId} tier={entry.tier} categoryId={entry.categoryId} />
      ))}

      {localBadges.map((badge) => (
        <span className="badge-item local-badge" key={`${badge.city}-${badge.country}`}>
          {badge.city} Local
        </span>
      ))}
    </div>
  );
}

export default BadgeRow;
