import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setMessage("Password reset. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1500);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <main className="auth-app-shell">
        <p>Missing reset token. Request a new link from the forgot-password page.</p>
      </main>
    );
  }

  return (
    <main className="auth-app-shell">
      <h1>Reset password</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          New password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Resetting..." : "Reset password"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default ResetPasswordPage;
