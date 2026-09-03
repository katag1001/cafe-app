import { Link, Navigate } from "react-router-dom";
import MySubmissions from "../components/myarea/MySubmissions";
import MyRatings from "../components/myarea/MyRatings";
import MyFavorites from "../components/myarea/MyFavorites";
import AccountSettings from "../components/myarea/AccountSettings";
import "./MyAreaPage.css";

// Everything on one page, layout deliberately simple — PRD.md §13.3.
function MyAreaPage({ currentUser, authLoading, onAuthChange, onLogout }) {
  if (authLoading) {
    return (
      <main className="container my-area-page">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="my-area-page container">
      <h1>My Area</h1>

      <p>
        <Link to={`/users/${currentUser.username}`}>View my profile</Link>
      </p>

      <section>
        <h2>My Submissions</h2>
        <MySubmissions />
      </section>

      <section>
        <h2>My Ratings</h2>
        <MyRatings />
      </section>

      <section>
        <h2>My Favorites</h2>
        <MyFavorites onFavoritesChange={onAuthChange} />
      </section>

      <section>
        <h2>Account Settings</h2>
        <AccountSettings onAuthChange={onAuthChange} onLogout={onLogout} />
      </section>
    </div>
  );
}

export default MyAreaPage;
