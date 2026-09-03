import { useEffect, useState } from "react";
import TierBadge from "../../profile/TierBadge";

function TopComments({ cafeId, categoryId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const loadComments = () => {
    setLoading(true);

    return fetch(`/api/cafes/${cafeId}/categories/${categoryId}/comments`)
      .then((response) => response.json())
      .then((data) => setComments(data.comments || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();
    setShowForm(false);
    setComment("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafeId, categoryId]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmed = comment.trim();
    if (!trimmed) {
      setError("Please write a comment.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch(`/api/cafes/${cafeId}/categories/${categoryId}/comment`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: trimmed }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to add comment");

      setComment("");
      setShowForm(false);
      await loadComments();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="top-comments-wrapper">
      {currentUser && !showForm && (
        <button type="button" className="btn btn-ghost btn-sm add-comment-toggle" onClick={() => setShowForm(true)}>
          Add a comment
        </button>
      )}

      {currentUser && showForm && (
        <form className="add-comment-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor={`new-comment-${categoryId}`}>Add a comment</label>
            <textarea
              id={`new-comment-${categoryId}`}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your thoughts on this category"
            />
          </div>

          <div className="add-comment-actions">
            <button type="submit" className="btn btn-primary btn-sm" disabled={busy}>
              {busy ? "Posting..." : "Post comment"}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                setShowForm(false);
                setComment("");
                setError("");
              }}
            >
              Cancel
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </form>
      )}

      {loading ? (
        <p>Loading comments...</p>
      ) : !comments.length ? (
        <p>No comments yet.</p>
      ) : (
        <div className="top-comments">
          {comments.map((comment, index) => (
            <div className="comment" key={index}>
              <p className="comment-author">
                {comment.username}
                {comment.isLocal ? " · Local" : ""} <TierBadge tier={comment.tier} categoryId={categoryId} />
              </p>
              <p>{comment.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TopComments;
