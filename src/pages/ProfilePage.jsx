import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BadgeRow from "../components/profile/BadgeRow";
import FavoritesColumn from "../components/profile/FavoritesColumn";
import { getCategoryDisplayLabel } from "../config/categoryDisplayLabels";
import "./ProfilePage.css";

function ProfilePage({ currentUser }) {
  const { username } = useParams();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProfile = () => {
    setLoading(true);

    fetch(`/api/users/${username}/profile`)
      .then((response) => response.json())
      .then((data) => {
        if (!data.success) throw new Error(data.message);
        setProfile(data.profile);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  if (loading) return <main className="container page-status"><p>Loading profile...</p></main>;
  if (error) return <main className="container page-status"><p>Error: {error}</p></main>;
  if (!profile) return <main className="container page-status"><p>Profile not found.</p></main>;

  const isOwner = currentUser?.username === profile.username;

  return (
    <div className="profile-page">
      <div className="profile-hero">
        <div className="container">
          <div className="profile-avatar">{profile.username.charAt(0).toUpperCase()}</div>

          <div className="profile-heading">
            <h1>{profile.username}</h1>
            <BadgeRow categoryTiers={profile.categoryTiers} localBadges={profile.localBadges} />
          </div>
        </div>
      </div>

      <div className="profile-body container">
        <FavoritesColumn
          username={profile.username}
          favorites={profile.favorites}
          isOwner={isOwner}
          onFavoritesChange={loadProfile}
        />

        <div className="profile-main">
          <h3>Cafes added</h3>
          {profile.cafesCreated.length === 0 ? (
            <p>No cafes added yet.</p>
          ) : (
            <ul>
              {profile.cafesCreated.map((cafe) => (
                <li key={cafe._id}>{cafe.name}</li>
              ))}
            </ul>
          )}

          <h3>Cafes rated</h3>
          {profile.cafesRated.length === 0 ? (
            <p>No ratings yet.</p>
          ) : (
            <ul>
              {profile.cafesRated.map((rated) => (
                <li key={rated.cafeId}>
                  {rated.cafeName}
                  {rated.overallScore != null && <> — Overall: {rated.overallScore}/5</>}
                  {rated.categories.map((category) => (
                    <span key={category.categoryId}>
                      {" "}
                      · {getCategoryDisplayLabel(category.categoryId)}: {category.score}/5
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
