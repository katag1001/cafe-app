import { useCategories } from "../../../hooks/useCategories";

function CategoryFilterBar({ selectedCategories, onToggleCategory, openNow, onToggleOpenNow }) {
  const { categories } = useCategories();

  return (
    <div className="category-filter-bar">
      <div className="category-filter-group">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={selectedCategories.includes(category.id) ? "active" : ""}
            onClick={() => onToggleCategory(category.id)}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div className="open-now-filter-group">
        <button type="button" className={openNow ? "active" : ""} onClick={onToggleOpenNow}>
          Open now
        </button>
      </div>
    </div>
  );
}

export default CategoryFilterBar;
