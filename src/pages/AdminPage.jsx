import { useEffect, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import AdminQueueList from "../components/admin/AdminQueueList";
import AdminRequestDetail from "../components/admin/AdminRequestDetail";
import "./AdminPage.css";

function AdminPage({ currentUser, authLoading }) {
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-linked from admin notification emails (?type=pending|flags&id=...)
  // so approving/rejecting/resolving a specific item is one click from inbox.
  const initialType = searchParams.get("type") === "flags" ? "flags" : "pending";
  const linkedId = searchParams.get("id");

  const [queueType, setQueueType] = useState(initialType);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    setSelectedItem(null);

    const url = queueType === "pending" ? "/api/admin/cafes/pending" : "/api/admin/flags";

    try {
      const response = await fetch(url, { credentials: "include" });
      const data = await response.json();
      const fetchedItems = queueType === "pending" ? data.cafes || [] : data.flags || [];
      setItems(fetchedItems);

      if (linkedId) {
        const linkedItem = fetchedItems.find((item) => item._id === linkedId);
        if (linkedItem) setSelectedItem(linkedItem);
        setSearchParams({}, { replace: true });
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser?.isAdmin) {
      loadItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueType, currentUser]);

  // Frontend gating here is UX only — every /api/admin/* endpoint re-checks
  // ADMIN_EMAILS itself (CLAUDE.md §4.5), so this redirect isn't the real
  // security boundary, just a nicer experience than a 403 screen.
  if (authLoading) {
    return (
      <main className="container admin-page">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page container">
      <AdminRequestDetail queueType={queueType} item={selectedItem} onActionComplete={loadItems} />

      <AdminQueueList
        queueType={queueType}
        onQueueTypeChange={setQueueType}
        items={items}
        loading={loading}
        selectedItem={selectedItem}
        onSelect={setSelectedItem}
      />
    </div>
  );
}

export default AdminPage;
