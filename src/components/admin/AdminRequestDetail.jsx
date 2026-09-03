import { useEffect, useState } from "react";

const WEEK_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const buildDraft = (item) => {
  if (!item) return null;

  const hoursByDay = Object.fromEntries((item.openingHours || []).map((entry) => [entry.day, entry]));

  return {
    name: item.name || "",
    address: {
      street: item.address?.street || "",
      houseNumber: item.address?.houseNumber || "",
      city: item.address?.city || "",
      postcode: item.address?.postcode || "",
      country: item.address?.country || "",
    },
    latitude: item.location?.latitude != null ? String(item.location.latitude) : "",
    longitude: item.location?.longitude != null ? String(item.location.longitude) : "",
    phone: item.phone || "",
    website: item.website || "",
    openingHours: Object.fromEntries(
      WEEK_DAYS.map((day) => [
        day,
        {
          closed: !hoursByDay[day],
          open: hoursByDay[day]?.open || "",
          close: hoursByDay[day]?.close || "",
        },
      ]),
    ),
  };
};

function AdminRequestDetail({ queueType, item, onActionComplete }) {
  const [rejectionReasons, setRejectionReasons] = useState([]);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(() => buildDraft(item));

  useEffect(() => {
    if (queueType === "pending") {
      fetch("/api/reasons")
        .then((response) => response.json())
        .then((data) => setRejectionReasons(data.rejectionReasons || []))
        .catch(() => {});
    }
  }, [queueType]);

  if (!item) {
    return (
      <section className="admin-detail">
        <p>Select a request from the list to see its details.</p>
      </section>
    );
  }

  const handleApprove = async () => {
    if (!draft.latitude.trim() || !draft.longitude.trim()) {
      setError("Latitude and longitude are required.");
      return;
    }

    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setError("Latitude and longitude must be numbers.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/cafes/${item._id}/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name,
          address: draft.address,
          location: { latitude, longitude },
          phone: draft.phone,
          website: draft.website,
          openingHours: WEEK_DAYS.filter((day) => !draft.openingHours[day].closed).map((day) => ({
            day,
            open: draft.openingHours[day].open,
            close: draft.openingHours[day].close,
          })),
        }),
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

  const updateDraftField = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

  const updateAddressField = (field, value) =>
    setDraft((prev) => ({ ...prev, address: { ...prev.address, [field]: value } }));

  const updateOpeningHoursField = (day, field, value) =>
    setDraft((prev) => ({
      ...prev,
      openingHours: {
        ...prev.openingHours,
        [day]: { ...prev.openingHours[day], [field]: value },
      },
    }));

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
        <label>
          Name
          <input type="text" value={draft.name} onChange={(e) => updateDraftField("name", e.target.value)} />
        </label>

        <fieldset>
          <legend>Address</legend>
          <label>
            Street
            <input
              type="text"
              value={draft.address.street}
              onChange={(e) => updateAddressField("street", e.target.value)}
            />
          </label>
          <label>
            House number
            <input
              type="text"
              value={draft.address.houseNumber}
              onChange={(e) => updateAddressField("houseNumber", e.target.value)}
            />
          </label>
          <label>
            City
            <input
              type="text"
              value={draft.address.city}
              onChange={(e) => updateAddressField("city", e.target.value)}
            />
          </label>
          <label>
            Postcode
            <input
              type="text"
              value={draft.address.postcode}
              onChange={(e) => updateAddressField("postcode", e.target.value)}
            />
          </label>
          <label>
            Country
            <input
              type="text"
              value={draft.address.country}
              onChange={(e) => updateAddressField("country", e.target.value)}
            />
          </label>
        </fieldset>

        <p>Added by: {item.createdBy?.username}</p>

        <fieldset>
          <legend>Coordinates</legend>
          <label>
            Latitude
            <input
              type="text"
              value={draft.latitude}
              onChange={(e) => updateDraftField("latitude", e.target.value)}
            />
          </label>
          <label>
            Longitude
            <input
              type="text"
              value={draft.longitude}
              onChange={(e) => updateDraftField("longitude", e.target.value)}
            />
          </label>
        </fieldset>

        <label>
          Phone
          <input type="text" value={draft.phone} onChange={(e) => updateDraftField("phone", e.target.value)} />
        </label>

        <label>
          Website
          <input
            type="text"
            value={draft.website}
            onChange={(e) => updateDraftField("website", e.target.value)}
          />
        </label>

        <fieldset>
          <legend>Opening hours</legend>
          {WEEK_DAYS.map((day) => (
            <div key={day} className="admin-opening-hours-row">
              <span>{day}</span>
              <label>
                <input
                  type="checkbox"
                  checked={!draft.openingHours[day].closed}
                  onChange={(e) => updateOpeningHoursField(day, "closed", !e.target.checked)}
                />
                Open
              </label>
              {!draft.openingHours[day].closed && (
                <>
                  <input
                    type="time"
                    value={draft.openingHours[day].open}
                    onChange={(e) => updateOpeningHoursField(day, "open", e.target.value)}
                  />
                  <input
                    type="time"
                    value={draft.openingHours[day].close}
                    onChange={(e) => updateOpeningHoursField(day, "close", e.target.value)}
                  />
                </>
              )}
            </div>
          ))}
        </fieldset>

        <div className="admin-actions">
          <button type="button" onClick={handleApprove} disabled={busy}>
            Save & Approve
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
