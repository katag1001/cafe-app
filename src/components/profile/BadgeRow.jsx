import TierBadge from "./TierBadge";

function BadgeRow({ categoryTiers, localBadges }) {
  if (!categoryTiers?.length && !localBadges?.length) {
    return null;
  }

  return (
    <div className="badge-row">
      {categoryTiers.map((entry) => (
        <span className="badge-item" key={entry.categoryId}>
          <TierBadge tier={entry.tier} />
          <span className="badge-caption">{entry.categoryId}</span>
        </span>
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
