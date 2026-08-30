import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    fetch(`/api/verify-email?token=${encodeURIComponent(token)}`)
      .then((response) => response.json())
      .then((data) => {
        setStatus(data.success ? "success" : "error");
        setMessage(data.message);
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong.");
      });
  }, [token]);

  return (
    <main className="auth-app-shell">
      <h1>Email verification</h1>

      {status === "loading" && <p>Verifying...</p>}
      {status !== "loading" && <p className="message">{message}</p>}
      {status === "success" && (
        <p>
          <Link to="/login">Log in</Link>
        </p>
      )}
      {status === "error" && (
        <p>
          Need a new link? <Link to="/resend-verification">Resend verification email</Link>
        </p>
      )}
    </main>
  );
}

export default VerifyEmailPage;
