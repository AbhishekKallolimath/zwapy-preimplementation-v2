import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { updatePassword, sendEmailVerification } from "firebase/auth";
import { auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./ChangePassword.css";

export default function ChangePassword() {
  const navigate = useNavigate();
  const { currentUser, loading } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      setMsg({ text: "Please fill in all fields.", type: "error" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMsg({ text: "Passwords do not match!", type: "error" });
      return;
    }
    if (newPassword.length < 6) {
      setMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }

    setUpdating(true);
    setMsg({ text: "", type: "" });

    // Mock bypass local check
    const isMock = currentUser?.uid?.includes("mock") || localStorage.getItem("zwapy_mock_user");
    if (isMock) {
      setTimeout(() => {
        setMsg({ text: "✅ Password changed successfully (Mock Mode Sandbox Bypass)!", type: "success" });
        setUpdating(false);
        setTimeout(() => navigate("/accounts"), 1500);
      }, 1000);
      return;
    }

    try {
      await updatePassword(auth.currentUser, newPassword);
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (err) {
        console.warn("Verification email could not be sent:", err);
      }

      setMsg({ text: "✅ Password changed successfully! An email verification has been sent.", type: "success" });
      setUpdating(false);
      setTimeout(() => navigate("/accounts"), 2000);
    } catch (err) {
      console.error(err);
      const msgs = {
        "auth/requires-recent-login": "⚠️ This operation is sensitive and requires recent authentication. Please log out and log back in to retry.",
        "auth/weak-password": "Password is too weak. Choose a stronger password."
      };
      setMsg({ text: `❌ ${msgs[err.code] || err.message}`, type: "error" });
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="pwd-body">
      <div className="pwd-glow" />
      <div className="pwd-glow2" />

      <div className="pwd-card">
        <button className="pwd-back" onClick={() => navigate("/accounts")}>← Back</button>
        
        <h2>Change Password</h2>
        <p className="pwd-sub">Update your account credentials to keep your profile secure.</p>

        {msg.text && <div className={`pwd-msg ${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleChangePassword}>
          <div className="pwd-field">
            <label>New Password</label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={updating}
            />
          </div>
          
          <div className="pwd-field">
            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={updating}
            />
          </div>

          <button className="btn-pwd-save" type="submit" disabled={updating}>
            {updating ? "Saving..." : "Change Password →"}
          </button>
        </form>
      </div>
    </div>
  );
}
