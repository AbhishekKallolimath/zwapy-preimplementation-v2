import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function BottomNav({ onShowLocked }) {
  const { currentUser, userData, portal } = useAuth();
  const location = useLocation();

  const name = userData?.name || currentUser?.displayName || "Student";
  const avatarUrl = userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const isPremium = portal === "premium";
  
  const isActive = (path) => location.pathname === path;

  const handleClubsClick = (e) => {
    if (!isPremium) {
      e.preventDefault();
      if (onShowLocked) {
        onShowLocked();
      }
    }
  };

  return (
    <nav className="bottom-nav">
      <Link to="/dashboard" className={`nav-item ${isActive("/dashboard") ? "active" : ""}`}>
        🏠
      </Link>
      <Link
        id="navClubs"
        to={isPremium ? "/clubs" : "#"}
        onClick={handleClubsClick}
        className={`nav-item ${isActive("/clubs") ? "active" : ""}`}
        style={!isPremium ? { opacity: 0.32 } : {}}
      >
        🏛️
      </Link>
      <Link to="/network" className={`nav-item ${isActive("/network") ? "active" : ""}`}>
        🧑‍🤝‍🧑
      </Link>
      <Link to="/discover" className={`nav-item ${isActive("/discover") ? "active" : ""}`}>
        🔍
      </Link>
      <Link to="/profile" className={`nav-item ${isActive("/profile") ? "active" : ""}`}>
        <div className="nav-av">
          <img id="navAvatar" src={avatarUrl} alt="Avatar" />
        </div>
      </Link>
    </nav>
  );
}
