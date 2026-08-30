import { useState } from "react";

function FavoriteButton({ cafeId, currentUser, onFavoriteChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!currentUser) return null;

  const isFavorited = (currentUser.favorites || []).includes(cafeId);

  const handleClick = async () => {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/users/me/favorites/${cafeId}`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update favorites");

      await onFavoriteChange?.();
    } catch (favoriteError) {
      setError(favoriteError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <span>
      <button type="button" onClick={handleClick} disabled={busy}>
        {isFavorited ? "★ Favorited" : "☆ Favorite"}
      </button>
      {error && <span className="error-message"> {error}</span>}
    </span>
  );
}

export default FavoriteButton;
