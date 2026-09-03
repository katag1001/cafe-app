import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ChangePasswordPage({ currentUser, authLoading }) {
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  if (authLoading) {
    return (
      <main className="auth-app-shell">
        <p>Loading...</p>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="auth-app-shell">
        <p>
          Please <a href="/login">log in</a> to change your password.
        </p>
      </main>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to change password");

      setMessage("Password changed. Redirecting to My Area...");
      setTimeout(() => navigate("/my-area"), 1500);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-app-shell">
      <h1>Change password</h1>

      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label>
          New password
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Changing..." : "Change password"}
        </button>
      </form>

      {message && <p className="message">{message}</p>}
    </main>
  );
}

export default ChangePasswordPage;
