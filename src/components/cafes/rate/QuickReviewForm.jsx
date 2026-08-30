import { useState } from "react";

function QuickReviewForm({ cafeId }) {
  const [score, setScore] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!score) {
      setError("Please give a score from 1 to 5.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/cafes/${cafeId}/rating/overall`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit rating");

      setMessage("Quick review submitted!");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="quick-review-form" onSubmit={handleSubmit}>
      <h3>Quick Review</h3>

      <div className="answer-options">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={score === n ? "active" : ""}
            onClick={() => setScore(n)}
          >
            {n}
          </button>
        ))}
      </div>

      <button type="submit" disabled={busy}>
        {busy ? "Submitting..." : "Submit Quick Review"}
      </button>

      {message && <p className="message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </form>
  );
}

export default QuickReviewForm;
