import { useState } from "react";
import AnswerYesNo from "./AnswerYesNo";
import AnswerSelect from "./AnswerSelect";
import AnswerScale from "./AnswerScale";
import AnswerTime from "./AnswerTime";

const ANSWER_COMPONENTS = {
  yesno: AnswerYesNo,
  select: AnswerSelect,
  scale: AnswerScale,
  time: AnswerTime,
};

function hasValue(value) {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Boolean(value.start || value.end);
  return true;
}

function CategoryRatingForm({ cafeId, categoryDef }) {
  const [score, setScore] = useState(null);
  const [answerValues, setAnswerValues] = useState({});
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleAnswerChange = (questionId, value) => {
    setAnswerValues((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!score) {
      setError("Please give a score from 1 to 5.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    const answers = Object.entries(answerValues)
      .filter(([, value]) => hasValue(value))
      .map(([questionId, value]) => ({ questionId, value }));

    try {
      const response = await fetch(`/api/cafes/${cafeId}/rating/${categoryDef.id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score, answers, comment }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to submit rating");

      setMessage("Rating submitted!");
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="category-rating-form" onSubmit={handleSubmit}>
      <h3>{categoryDef.label}</h3>

      <div className="answer-row">
        <p>Overall score for this category</p>
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
      </div>

      {categoryDef.questions.map((question) => {
        const AnswerComponent = ANSWER_COMPONENTS[question.type];
        if (!AnswerComponent) return null;

        return (
          <AnswerComponent
            key={question.id}
            question={question}
            value={answerValues[question.id]}
            onChange={(value) => handleAnswerChange(question.id, value)}
          />
        );
      })}

      <div className="form-group">
        <label htmlFor={`comment-${categoryDef.id}`}>Any other comments</label>
        <textarea
          id={`comment-${categoryDef.id}`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      <button type="submit" disabled={busy}>
        {busy ? "Submitting..." : `Submit ${categoryDef.label} rating`}
      </button>

      {message && <p className="message">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </form>
  );
}

export default CategoryRatingForm;
