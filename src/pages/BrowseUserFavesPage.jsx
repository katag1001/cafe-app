import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BadgeRow from "../components/profile/BadgeRow";
import "./BrowseUserFavesPage.css";

// Users who've crossed the "Local" badge threshold (PRD.md §8.4) in the
// visitor's current city, resolved from one-time browser geolocation.
function BrowseUserFavesPage() {
  const [status, setStatus] = useState("locating"); // locating | loading | error | ready
  const [errorMessage, setErrorMessage] = useState("");
  const [city, setCity] = useState("");
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setStatus("error");
      setErrorMessage("Your browser doesn't support location detection.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStatus("loading");

        fetch(`/api/users/local?lat=${position.coords.latitude}&lng=${position.coords.longitude}`)
          .then((response) => response.json())
          .then((data) => {
            if (!data.success) throw new Error(data.message);
            setCity(data.city);
            setUsers(data.users);
            setStatus("ready");
          })
          .catch((error) => {
            setErrorMessage(error.message);
            setStatus("error");
          });
      },
      () => {
        setStatus("error");
        setErrorMessage("Location permission was denied, so we can't tell which city to browse.");
      },
    );
  }, []);

  return (
    <div className="browse-user-faves-page container">
      <h1>Browse user faves</h1>

      {status === "locating" && <p>Finding your location...</p>}
      {status === "loading" && <p>Looking for local users...</p>}
      {status === "error" && <p>{errorMessage}</p>}

      {status === "ready" && (
        <>
          {users.length === 0 ? (
            <p>
              No star users in {city} yet. Start rating some cafes and become {city}'s first star user.{" "}
              <Link to="/">Browse cafes</Link>
            </p>
          ) : (
            <ul className="local-user-list">
              {users.map((user) => (
                <li key={user.username} className="local-user-item">
                  <Link to={`/users/${user.username}`}>{user.username}</Link>
                  <BadgeRow categoryTiers={user.categoryTiers} localBadges={user.localBadges} />
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default BrowseUserFavesPage;
