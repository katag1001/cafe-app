import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AccountSettings({ currentUser, onAuthChange, onLogout }) {
  const navigate = useNavigate();

  const [username, setUsername] = useState(currentUser.username);
  const [usernameMessage, setUsernameMessage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const [resendMessage, setResendMessage] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleUsernameSubmit = async (e) => {
    e.preventDefault();
    setUsernameMessage("");

    try {
      const response = await fetch("/api/me/username", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update username");

      setUsernameMessage("Username updated.");
      await onAuthChange?.();
    } catch (error) {
      setUsernameMessage(error.message);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage("");

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to change password");

      setPasswordMessage("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (error) {
      setPasswordMessage(error.message);
    }
  };

  // Edge case only — an unverified account can't reach My Area at all, but
  // this stays available for support scenarios (build_plan.md Phase 9.5).
  const handleResendVerification = async () => {
    setResendMessage("");

    try {
      const response = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: currentUser.email }),
      });

      const data = await response.json();
      setResendMessage(data.message || "Sent.");
    } catch (error) {
      setResendMessage(error.message);
    }
  };

  const handleDeleteAccount = async () => {
    await fetch("/api/me", { method: "DELETE", credentials: "include" });
    await onAuthChange?.();
    onLogout?.();
    navigate("/");
  };

  return (
    <div className="account-settings">
      <form onSubmit={handleUsernameSubmit}>
        <label>
          Username
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <button type="submit">Update username</button>
        {usernameMessage && <p className="message">{usernameMessage}</p>}
      </form>

      <form onSubmit={handlePasswordSubmit}>
        <label>
          Current password
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
        </label>
        <label>
          New password
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <button type="submit">Change password</button>
        {passwordMessage && <p className="message">{passwordMessage}</p>}
      </form>

      <div>
        <button type="button" onClick={handleResendVerification}>
          Resend verification email
        </button>
        {resendMessage && <p className="message">{resendMessage}</p>}
      </div>

      {deleteConfirm ? (
        <div className="delete-confirm">
          <p>Are you sure? This cannot be undone.</p>
          <button type="button" onClick={handleDeleteAccount}>
            Yes, delete my account
          </button>
          <button type="button" onClick={() => setDeleteConfirm(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setDeleteConfirm(true)}>
          Delete account
        </button>
      )}
    </div>
  );
}

export default AccountSettings;
