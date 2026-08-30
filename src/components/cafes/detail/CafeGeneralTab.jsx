import { Link } from "react-router-dom";
import CafeMiniMap from "./CafeMiniMap";
import FavoriteButton from "./FavoriteButton";
import FlagCafeButton from "./FlagCafeButton";

function CafeGeneralTab({ cafe, currentUser, onFavoriteChange }) {
  return (
    <div className="cafe-general-tab">
      {cafe.location && (
        <CafeMiniMap latitude={cafe.location.latitude} longitude={cafe.location.longitude} />
      )}

      <p>
        {cafe.address.street} {cafe.address.houseNumber}
        <br />
        {cafe.address.postcode} {cafe.address.city}
        <br />
        {cafe.address.country}
      </p>

      {cafe.phone && <p>Phone: {cafe.phone}</p>}
      {cafe.website && <p>Website: {cafe.website}</p>}

      {cafe.openingHours?.length > 0 && (
        <div>
          <h3>Opening hours</h3>
          {cafe.openingHours.map((hours) => (
            <p key={hours.day}>
              {hours.day}: {hours.open}–{hours.close}
            </p>
          ))}
        </div>
      )}

      <p>
        Overall: {(cafe.ratingSummary?.overall?.average ?? 0).toFixed(1)} / 5{" "}
        ({cafe.ratingSummary?.overall?.count ?? 0} ratings)
      </p>

      <p>Added by: {cafe.createdBy?.username}</p>

      <div className="cafe-actions">
        {currentUser ? (
          <>
            <Link to={`/cafes/${cafe._id}/rate`}>Rate this cafe</Link>
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
  );
}

export default CafeGeneralTab;
