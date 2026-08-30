function AdminQueueList({ queueType, onQueueTypeChange, items, loading, selectedItem, onSelect }) {
  return (
    <aside className="admin-queue-list">
      <div className="admin-queue-toggle">
        <button
          type="button"
          className={queueType === "pending" ? "active" : ""}
          onClick={() => onQueueTypeChange("pending")}
        >
          Pending Cafes
        </button>
        <button
          type="button"
          className={queueType === "flags" ? "active" : ""}
          onClick={() => onQueueTypeChange("flags")}
        >
          Flagged Cafes
        </button>
      </div>

      {loading && <p>Loading...</p>}

      <ul>
        {items.map((item) => (
          <li
            key={item._id}
            className={selectedItem?._id === item._id ? "selected" : ""}
            onClick={() => onSelect(item)}
          >
            {queueType === "pending"
              ? item.name
              : `${item.cafeId?.name || "Unknown cafe"} — ${item.reason}`}
          </li>
        ))}
      </ul>

      {!loading && items.length === 0 && <p>Nothing here.</p>}
    </aside>
  );
}

export default AdminQueueList;
