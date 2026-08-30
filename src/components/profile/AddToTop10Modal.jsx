import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// The one place in this app allowed to be a lightweight popup rather than a
// full page — only the rating flow itself was required to avoid modals
// (PRD.md §8.5, build_plan.md Phase 8.5).
function AddToTop10Modal({ onClose, onAdded }) {
  const [ratedCafes, setRatedCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch("/api/users/me/rated-cafes", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setRatedCafes(data.ratedCafes || []))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (cafeId) => {
    const response = await fetch(`/api/users/me/favorites/${cafeId}`, {
      method: "POST",
      credentials: "include",
    });

    if (response.ok) {
      onAdded?.();
    }
  };

  return (
    <div className="add-to-top10-modal">
      <button type="button" onClick={onClose}>
        Close
      </button>

      {loading ? (
        <p>Loading...</p>
      ) : ratedCafes.length === 0 ? (
        <div>
          <p>You haven't rated any cafes yet.</p>
          <button type="button" onClick={() => navigate("/")}>
            Browse cafes
          </button>
        </div>
      ) : (
        <ul>
          {ratedCafes.map((cafe) => (
            <li key={cafe.cafeId}>
              {cafe.cafeName} — {cafe.ownScore != null ? cafe.ownScore.toFixed(1) : "—"} / 5
              <button type="button" onClick={() => handleAdd(cafe.cafeId)}>
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default AddToTop10Modal;
