import { useEffect, useState } from "react";

function AdminRequestDetail({ queueType, item, onActionComplete }) {
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (queueType === "pending") {
      fetch("/api/reasons")
        .then((response) => response.json())
        .then((data) => setRejectionReasons(data.rejectionReasons || []))
        .catch(() => {});
    }
  }, [queueType]);

  useEffect(() => {
    setSelectedReason("");
    setOtherText("");
    setError("");
  }, [item]);

  if (!item) {
    return (
      <section className="admin-detail">
        <p>Select a request from the list to see its details.</p>
      </section>
    );
  }

  const handleApprove = async () => {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/cafes/${item._id}/approve`, {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to approve");

      onActionComplete();
    } catch (approveError) {
      setError(approveError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReason) {
      setError("Please select a reason.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/cafes/${item._id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: selectedReason, otherText }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to reject");

      onActionComplete();
    } catch (rejectError) {
      setError(rejectError.message);
    } finally {
      setBusy(false);
    }
  };

  const handleFlagAction = async (action) => {
    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/flags/${item._id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update flag");

      onActionComplete();
    } catch (flagError) {
      setError(flagError.message);
    } finally {
      setBusy(false);
    }
  };

  if (queueType === "pending") {
    return (
      <section className="admin-detail">
        <h2>{item.name}</h2>
        <p>
          {item.address.street} {item.address.houseNumber}, {item.address.postcode}{" "}
          {item.address.city}, {item.address.country}
        </p>
        <p>Added by: {item.createdBy?.username}</p>

        <div className="admin-actions">
          <button type="button" onClick={handleApprove} disabled={busy}>
            Approve
          </button>
        </div>

        <div className="admin-actions">
          <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
            <option value="">Select a rejection reason...</option>
            {rejectionReasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>

          {selectedReason === "other" && (
            <input
              type="text"
              placeholder="Describe the reason"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          )}

          <button type="button" onClick={handleReject} disabled={busy}>
            Reject
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}
      </section>
    );
  }

  return (
    <section className="admin-detail">
      <h2>{item.cafeId?.name || "Unknown cafe"}</h2>
      <p>
        Reason: {item.reason}
        {item.otherText ? ` — ${item.otherText}` : ""}
      </p>
      <p>Reported by: {item.reportedBy?.username}</p>

      <div className="admin-actions">
        <button type="button" onClick={() => handleFlagAction("resolve")} disabled={busy}>
          Resolve{item.reason === "permanently_closed" ? " (confirm closed — deletes cafe)" : ""}
        </button>
        <button type="button" onClick={() => handleFlagAction("dismiss")} disabled={busy}>
          Dismiss
        </button>
      </div>

      {error && <p className="error-message">{error}</p>}
    </section>
  );
}

export default AdminRequestDetail;
