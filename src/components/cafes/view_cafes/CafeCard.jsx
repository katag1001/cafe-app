import { useNavigate } from "react-router-dom";

function CafeCard({ cafe }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/cafes/${cafe._id}`);
  };

  return (
    <div className="cafe-card" onClick={handleClick}>
      <div className="cafe-card-main">
        <h3>{cafe.name}</h3>
        {cafe.address && (
          <p className="cafe-card-address">
            {cafe.address.street} {cafe.address.houseNumber}, {cafe.address.city}
          </p>
        )}
      </div>

      {cafe.displayScore != null && (
        <span className="cafe-card-score">{cafe.displayScore.toFixed(1)}</span>
      )}
    </div>
  );
}

export default CafeCard;
