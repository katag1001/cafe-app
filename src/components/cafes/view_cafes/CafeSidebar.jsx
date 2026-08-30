import CafeCard from "./CafeCard";

// Numbered pagination, not infinite scroll (PRD.md §10.3).
function CafeSidebar({ cafes, loading, pagination, page, onPageChange }) {
  return (
    <aside className="cafe-sidebar">
      {loading && <p>Loading...</p>}

      {!loading && !cafes.length && <p>No cafes found in this area.</p>}

      {cafes.map((cafe) => (
        <CafeCard key={cafe._id} cafe={cafe} />
      ))}

      {pagination && pagination.totalPages > 1 && (
        <div className="pagination">
          <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
            Previous
          </button>
          <span>
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= pagination.totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      )}
    </aside>
  );
}

export default CafeSidebar;
