import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

function MyFavorites({ onFavoritesChange }) {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/users/me/favorites", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setFavorites(data.favorites || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleRemove = async (cafeId) => {
    await fetch(`/api/users/me/favorites/${cafeId}`, { method: "POST", credentials: "include" });
    load();
    onFavoritesChange?.();
  };

  if (loading) return <p>Loading...</p>;
  if (!favorites.length) return <p>No favorites yet.</p>;

  return (
    <ul className="my-favorites">
      {favorites.map((cafe) => (
        <li key={cafe._id}>
          <Link to={`/cafes/${cafe._id}`}>{cafe.name}</Link>{" "}
          <button type="button" onClick={() => handleRemove(cafe._id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

export default MyFavorites;
