import { useState } from "react";
import { Link } from "react-router-dom";
import AddToTop10Modal from "./AddToTop10Modal";

function FavoritesColumn({ username, favorites, isOwner, onFavoritesChange }) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="favorites-column">
      <h3>{username} loves...</h3>

      {favorites.length === 0 ? (
        isOwner ? (
          <button type="button" onClick={() => setShowPicker(true)}>
            Add to Top 10
          </button>
        ) : (
          <p>No favorites yet.</p>
        )
      ) : (
        <ul>
          {favorites.map((cafe) => (
            <li key={cafe._id}>
              <Link to={`/cafes/${cafe._id}`}>{cafe.name}</Link>
            </li>
          ))}
        </ul>
      )}

      {showPicker && (
        <AddToTop10Modal
          onClose={() => setShowPicker(false)}
          onAdded={() => {
            setShowPicker(false);
            onFavoritesChange?.();
          }}
        />
      )}
    </div>
  );
}

export default FavoritesColumn;
