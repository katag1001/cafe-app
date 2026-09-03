import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useCategories } from "../../../hooks/useCategories";
import CafeTabs from "../detail/CafeTabs";
import CafeGeneralTab from "../detail/CafeGeneralTab";
import CategoryBreakdown from "../detail/CategoryBreakdown";
import TopComments from "../detail/TopComments";
import "./cafeDetail.css";

function ViewOneCafe({ currentUser, onAuthChange }) {
  const { id } = useParams();
  const { categories } = useCategories();

  const [cafe, setCafe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("general");

  const loadCafe = async () => {
    try {
      const response = await fetch(`/api/cafes/${id}`, { credentials: "include" });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch cafe");
      }

      setCafe(data.cafe);
    } catch (fetchError) {
      setError(fetchError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCafe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <main className="container page-status"><p>Loading cafe...</p></main>;
  if (error) return <main className="container page-status"><p>Error: {error}</p></main>;
  if (!cafe) return <main className="container page-status"><p>Cafe not found.</p></main>;

  const activeCategoryDef = categories.find((c) => c.id === activeTab);
  const categorySummary = cafe.ratingSummary?.categories?.find((c) => c.categoryId === activeTab);

  return (
    <div className="cafe-detail-page container">
      <div className="cafe-header">
        <h1>{cafe.name}</h1>

        {cafe.addressVerification?.status !== "verified" && (
          <span className="pill status-pill">
            Status: {cafe.addressVerification?.status}
          </span>
        )}
      </div>

      <CafeTabs categories={categories} activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "general" ? (
        <CafeGeneralTab cafe={cafe} currentUser={currentUser} onFavoriteChange={onAuthChange} />
      ) : (
        <div className="cafe-category-tab">
          <div className="category-breakdown-column">
            <CategoryBreakdown categoryDef={activeCategoryDef} categorySummary={categorySummary} />

            {currentUser && (
              <Link to={`/cafes/${cafe._id}/rate/${activeTab}`}>
                Rate {activeCategoryDef?.label}
              </Link>
            )}
          </div>

          <div className="top-comments-column">
            <TopComments cafeId={cafe._id} categoryId={activeTab} currentUser={currentUser} />
          </div>
        </div>
      )}
    </div>
  );
}

export default ViewOneCafe;
