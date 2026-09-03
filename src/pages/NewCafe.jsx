import { Navigate } from "react-router-dom";
import AddCafe from "../components/cafes/add_cafes/AddCafe";

function NewCafe({ currentUser, authLoading }) {
  if (authLoading) {
    return (
      <main className="container">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="container">
      <AddCafe currentUser={currentUser} />
    </main>
  )
}

export default NewCafe

