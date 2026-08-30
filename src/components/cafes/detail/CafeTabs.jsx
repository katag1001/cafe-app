function CafeTabs({ categories, activeTab, onTabChange }) {
  return (
    <div className="cafe-tabs">
      <button
        type="button"
        className={activeTab === "general" ? "active" : ""}
        onClick={() => onTabChange("general")}
      >
        General
      </button>

      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          className={activeTab === category.id ? "active" : ""}
          onClick={() => onTabChange(category.id)}
        >
          {category.label}
        </button>
      ))}
    </div>
  );
}

export default CafeTabs;
