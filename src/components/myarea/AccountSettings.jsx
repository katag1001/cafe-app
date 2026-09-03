import { useState } from "react";
import { useNavigate } from "react-router-dom";

function AccountSettings({ onAuthChange, onLogout }) {
  const navigate = useNavigate();

  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const handleDeleteAccount = async () => {
    await fetch("/api/me", { method: "DELETE", credentials: "include" });
    await onAuthChange?.();
    onLogout?.();
    navigate("/");
  };

  return (
    <div className="account-settings">
      <div className="account-settings-actions">
        <button type="button" onClick={() => navigate("/change-password")}>
          Change password
        </button>

        <button type="button" onClick={onLogout}>
          Logout
        </button>

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
    </div>
  );
}

export default AccountSettings;
