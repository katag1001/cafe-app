import { useParams } from "react-router-dom";
import { useCategories } from "../hooks/useCategories";
import QuickReviewForm from "../components/cafes/rate/QuickReviewForm";
import CategoryRatingForm from "../components/cafes/rate/CategoryRatingForm";

// Arriving with a :categoryId shows only that category's form (its own
// submit button); arriving without one shows Quick Review + every category
// section stacked, each independently submittable (PRD.md §8.1). Not a modal.
function RateCafePage({ currentUser, authLoading }) {
  const { id, categoryId } = useParams();
  const { categories, loading } = useCategories();

  if (authLoading) {
    return <p>Loading...</p>;
  }

  if (!currentUser) {
    return (
      <main className="container rate-page">
        <p>
          Please <a href="/login">log in</a> to rate a cafe.
        </p>
      </main>
    );
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (categoryId) {
    const categoryDef = categories.find((c) => c.id === categoryId);

    if (!categoryDef) {
      return <p>Unknown category.</p>;
    }

    return (
      <main className="container rate-page">
        <h1>Rate this cafe</h1>
        <CategoryRatingForm cafeId={id} categoryDef={categoryDef} />
      </main>
    );
  }

  return (
    <main className="container rate-page">
      <h1>Rate this cafe</h1>
      <QuickReviewForm cafeId={id} />
      {categories.map((categoryDef) => (
        <CategoryRatingForm key={categoryDef.id} cafeId={id} categoryDef={categoryDef} />
      ))}
    </main>
  );
}

export default RateCafePage;
