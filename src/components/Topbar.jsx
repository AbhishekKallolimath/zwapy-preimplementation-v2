import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Topbar({ onOpenSidebar }) {
  const { currentUser, userData, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setTimeout(async () => {
      try {
        await logout();
        navigate("/login");
      } catch (e) {
        console.error("Sign out error", e);
        setIsLoggingOut(false);
      }
    }, 1100);
  };

  const name = userData?.name || currentUser?.displayName || "Student";
  const avatarUrl = userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  return (
    <header className="topbar">
      <div className="topbar-logo" onClick={onOpenSidebar}>
        <div className="logo-node">
          <img
            src="assets/zwapy-logo.png"
            style={{ width: "20px", height: "20px", objectFit: "contain" }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
            alt=""
          />
        </div>
        <span className="logo-text">ZWAPY</span>
      </div>
      <div className="topbar-right">
        <img
          id="topAvatar"
          src={avatarUrl}
          className="tb-avatar"
          alt="Profile Avatar"
          onClick={() => navigate("/profile")}
        />
        <button
          className={`tb-logout ${isLoggingOut ? "running" : ""}`}
          id="topLogoutBtn"
          onClick={handleLogout}
          disabled={isLoggingOut}
        >
          <span className="lo-scene">
            <span className="lo-man">🏃‍➡️</span>
            <span className="lo-door">🚪</span>
            <span className="lo-text">Logout</span>
          </span>
        </button>
      </div>
    </header>
  );
}
