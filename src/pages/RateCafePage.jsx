import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import QuickReviewForm from "../components/cafes/rate/QuickReviewForm";
import CategoryRatingForm from "../components/cafes/rate/CategoryRatingForm";
import { getCategoryDisplayLabel } from "../config/categoryDisplayLabels";

function RateCafePage({ currentUser, authLoading }) {
  const { id, categoryId } = useParams();
  const navigate = useNavigate();
  const { categories, loading } = useCategories();
  const [activeCategoryId, setActiveCategoryId] = useState(categoryId || null);

  useEffect(() => {
    if (!activeCategoryId && categories.length > 0) {
      setActiveCategoryId(categoryId || categories[0].id);
    }
  }, [categories, categoryId, activeCategoryId]);

  const handleSelectCategory = (nextCategoryId) => {
    setActiveCategoryId(nextCategoryId);
    navigate(`/cafes/${id}/rate/${nextCategoryId}`, { replace: true });
  };

  if (authLoading) {
    return (
      <main className="container page-status">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="rate-page">
        <p>
          Please <a href="/login">log in</a> to rate a cafe.
        </p>
      </main>
    );
  }

  if (loading || !activeCategoryId) {
    return (
      <main className="container page-status">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="container rate-page">
      <div className="rate-page-sticky">
        <h1>Rate this cafe</h1>
        <QuickReviewForm cafeId={id} />
        <div className="category-tabs" role="tablist">
          {categories.map((categoryDef) => (
            <button
              key={categoryDef.id}
              type="button"
              role="tab"
              aria-selected={activeCategoryId === categoryDef.id}
              className={activeCategoryId === categoryDef.id ? "active" : ""}
              onClick={() => handleSelectCategory(categoryDef.id)}
            >
              {getCategoryDisplayLabel(categoryDef.id, categoryDef.label)}
            </button>
          ))}
        </div>
      </div>

      <div className="rate-page-content">
        {categories.map((categoryDef) => (
          <div key={categoryDef.id} hidden={activeCategoryId !== categoryDef.id}>
            <CategoryRatingForm
              cafeId={id}
              categoryDef={categoryDef}
              onSubmitted={() => navigate(`/cafes/${id}`)}
            />
          </div>
        ))}
      </div>
    </main>
  );
}

export default RateCafePage;
