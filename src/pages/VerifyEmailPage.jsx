import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";

function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState("loading"); // loading | success | error
  const [message, setMessage] = useState("");
  const requestedTokenRef = useRef(null);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    // The token is single-use server-side, so StrictMode's dev-only double
    // effect invocation must not send this request twice.
    if (requestedTokenRef.current === token) {
      return;
    }
    requestedTokenRef.current = token;

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
