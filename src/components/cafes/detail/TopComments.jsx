import { useEffect, useState } from "react";
import TierBadge from "../../profile/TierBadge";

function TopComments({ cafeId, categoryId }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetch(`/api/cafes/${cafeId}/categories/${categoryId}/comments`)
      .then((response) => response.json())
      .then((data) => setComments(data.comments || []))
      .finally(() => setLoading(false));
  }, [cafeId, categoryId]);

  if (loading) return <p>Loading comments...</p>;
  if (!comments.length) return <p>No comments yet.</p>;

  return (
    <div className="top-comments">
      {comments.map((comment, index) => (
        <div className="comment" key={index}>
          <p className="comment-author">
            {comment.username}
            {comment.isLocal ? " · Local" : ""} <TierBadge tier={comment.tier} />
          </p>
          <p>{comment.comment}</p>
        </div>
      ))}
    </div>
  );
}

export default TopComments;
