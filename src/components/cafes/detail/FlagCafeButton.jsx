import { useEffect, useState } from "react";

function FlagCafeButton({ cafeId, currentUser }) {
  const [reasons, setReasons] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [selectedReason, setSelectedReason] = useState("");
  const [otherText, setOtherText] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/reasons")
      .then((response) => response.json())
      .then((data) => setReasons(data.flagReasons || []))
      .catch(() => {});
  }, []);

  if (!currentUser) return null;

  const submitFlag = async (reason, otherTextValue) => {
    setMessage("");

    try {
      const response = await fetch(`/api/cafes/${cafeId}/flags`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, otherText: otherTextValue }),
      });

      const data = await response.json();
      setMessage(response.ok ? "Report submitted, thank you." : data.message);
      setShowPicker(false);
    } catch (flagError) {
      setMessage(flagError.message);
    }
  };

  return (
    <div className="flag-cafe">
      <button type="button" onClick={() => submitFlag("permanently_closed")}>
        Report as permanently closed
      </button>

      <button type="button" onClick={() => setShowPicker((s) => !s)}>
        Flag this cafe
      </button>

      {showPicker && (
        <div className="flag-picker">
          <select value={selectedReason} onChange={(e) => setSelectedReason(e.target.value)}>
            <option value="">Select a reason...</option>
            {reasons.map((reason) => (
              <option key={reason.id} value={reason.id}>
                {reason.label}
              </option>
            ))}
          </select>

          {selectedReason === "other" && (
            <input
              type="text"
              placeholder="Describe the issue"
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
            />
          )}

          <button
            type="button"
            onClick={() => submitFlag(selectedReason, otherText)}
            disabled={!selectedReason}
          >
            Submit report
          </button>
        </div>
      )}

      {message && <p className="message">{message}</p>}
    </div>
  );
}

export default FlagCafeButton;
