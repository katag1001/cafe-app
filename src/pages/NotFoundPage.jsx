import { Link } from "react-router-dom";

function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>
        <Link to="/">Back to the homepage</Link>
      </p>
    </main>
  );
}

export default NotFoundPage;
