import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import AdminQueueList from "../components/admin/AdminQueueList";
import AdminRequestDetail from "../components/admin/AdminRequestDetail";
import "./AdminPage.css";

function AdminPage({ currentUser, authLoading }) {
  const [queueType, setQueueType] = useState("pending");
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
      setItems(queueType === "pending" ? data.cafes || [] : data.flags || []);
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
    return <p>Loading...</p>;
  }

  if (!currentUser?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page">
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
