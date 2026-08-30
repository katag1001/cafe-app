import { useEffect, useState } from "react";

// Backed by the same /users/me/rated-cafes endpoint Phase 8's "Add to Top
// 10" picker uses — one source of truth, two consumers.
function MyRatings() {
  const [ratedCafes, setRatedCafes] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/users/me/rated-cafes", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setRatedCafes(data.ratedCafes || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (cafeId, categoryId) => {
    await fetch(`/api/cafes/${cafeId}/rating/${categoryId}`, {
      method: "DELETE",
      credentials: "include",
    });
    load();
  };

  if (loading) return <p>Loading...</p>;
  if (!ratedCafes.length) return <p>You haven't rated any cafes yet.</p>;

  return (
    <div className="my-ratings">
      {ratedCafes.map((cafe) => (
        <div className="rating-row" key={cafe.cafeId}>
          <strong>{cafe.cafeName}</strong>

          {cafe.overallScore != null && (
            <span>
              {" "}
              — Overall: {cafe.overallScore}/5{" "}
              <button type="button" onClick={() => handleDelete(cafe.cafeId, "overall")}>
                Delete
              </button>
            </span>
          )}

          {cafe.categories.map((category) => (
            <span key={category.categoryId}>
              {" "}
              · {category.categoryId}: {category.score}/5{" "}
              <button type="button" onClick={() => handleDelete(cafe.cafeId, category.categoryId)}>
                Delete
              </button>
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

export default MyRatings;
