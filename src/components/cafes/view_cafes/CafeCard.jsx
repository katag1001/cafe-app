import { useNavigate } from "react-router-dom";

function CafeCard({ cafe }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/cafes/${cafe._id}`);
  };

  return (
    <div
      className="cafe-card"
      onClick={handleClick}
    >
      <h3>{cafe.name}</h3>
    </div>
  );
}

export default CafeCard;

