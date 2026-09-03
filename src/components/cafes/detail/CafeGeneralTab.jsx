import { Link } from "react-router-dom";
import CafeMiniMap from "./CafeMiniMap";
import FavoriteButton from "./FavoriteButton";
import FlagCafeButton from "./FlagCafeButton";

function CafeGeneralTab({ cafe, currentUser, onFavoriteChange }) {
  return (
    <div className="cafe-general-tab">
      <div className="cafe-info-main">
        <div className="info-block">
          <h3>Address</h3>
          <p>
            {cafe.address.street} {cafe.address.houseNumber}
            <br />
            {cafe.address.postcode} {cafe.address.city}
            <br />
            {cafe.address.country}
          </p>
        </div>

        {(cafe.phone || cafe.website) && (
          <div className="info-block">
            <h3>Contact</h3>
            {cafe.phone && <p>Phone: {cafe.phone}</p>}
            {cafe.website && <p>Website: {cafe.website}</p>}
          </div>
        )}

        {cafe.openingHours?.length > 0 && (
          <div className="info-block">
            <h3>Opening hours</h3>
            {cafe.openingHours.map((hours) => (
              <p key={hours.day} className="hours-line">
                <span className="hours-day">{hours.day}</span>
                <span>
                  {hours.open}–{hours.close}
                </span>
              </p>
            ))}
          </div>
        )}

        <p className="cafe-meta">Added by {cafe.createdBy?.username}</p>
      </div>

      <div className="cafe-info-side">
        {cafe.location && (
          <CafeMiniMap latitude={cafe.location.latitude} longitude={cafe.location.longitude} />
        )}

        <div className="cafe-score-card">
          <span className="cafe-score-value">
            {(cafe.ratingSummary?.overall?.average ?? 0).toFixed(1)}
          </span>
          <span className="cafe-score-label">
            out of 5 · {cafe.ratingSummary?.overall?.count ?? 0} ratings
          </span>
        </div>

        <div className="cafe-actions">
          {currentUser ? (
            <>
              <Link to={`/cafes/${cafe._id}/rate`} className="btn btn-primary">
                Rate this cafe
              </Link>
              <FavoriteButton cafeId={cafe._id} currentUser={currentUser} onFavoriteChange={onFavoriteChange} />
              <FlagCafeButton cafeId={cafe._id} currentUser={currentUser} />
            </>
          ) : (
            <p>
              Please <a href="/login">log in</a> to rate, favorite, or flag this cafe.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default CafeGeneralTab;
