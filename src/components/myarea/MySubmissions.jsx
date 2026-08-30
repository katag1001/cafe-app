import { useEffect, useState } from "react";

const ADDRESS_FIELDS = ["street", "houseNumber", "city", "postcode", "country"];
const emptyAddress = { street: "", houseNumber: "", city: "", postcode: "", country: "" };

function MySubmissions() {
  const [cafes, setCafes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [addressDraft, setAddressDraft] = useState(emptyAddress);
  const [message, setMessage] = useState("");

  const loadCafes = () => {
    setLoading(true);
    fetch("/api/cafes/mine", { credentials: "include" })
      .then((response) => response.json())
      .then((data) => setCafes(data.cafes || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCafes();
  }, []);

  const startResubmit = (cafe) => {
    setEditingId(cafe._id);
    setAddressDraft(cafe.address);
    setMessage("");
  };

  const handleResubmit = async (cafeId) => {
    try {
      const response = await fetch(`/api/cafes/${cafeId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressDraft }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to resubmit");

      setMessage(`Resubmitted — status: ${data.cafe.addressVerification.status}`);
      setEditingId(null);
      loadCafes();
    } catch (error) {
      setMessage(error.message);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!cafes.length) return <p>You haven't added any cafes yet.</p>;

  return (
    <div className="my-submissions">
      {message && <p className="message">{message}</p>}

      {cafes.map((cafe) => (
        <div className="submission-row" key={cafe._id}>
          <strong>{cafe.name}</strong> — status: {cafe.addressVerification.status}

          {cafe.addressVerification.status === "rejected" && (
            <>
              {cafe.addressVerification.rejectionReason && (
                <p>
                  Reason:{" "}
                  {cafe.addressVerification.rejectionOtherText || cafe.addressVerification.rejectionReason}
                </p>
              )}

              {editingId === cafe._id ? (
                <div className="resubmit-form">
                  {ADDRESS_FIELDS.map((field) => (
                    <input
                      key={field}
                      placeholder={field}
                      value={addressDraft[field]}
                      onChange={(e) =>
                        setAddressDraft((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                    />
                  ))}
                  <button type="button" onClick={() => handleResubmit(cafe._id)}>
                    Submit
                  </button>
                  <button type="button" onClick={() => setEditingId(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => startResubmit(cafe)}>
                  Resubmit
                </button>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

export default MySubmissions;
