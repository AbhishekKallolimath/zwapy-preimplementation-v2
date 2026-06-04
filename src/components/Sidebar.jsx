import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FeedbackModal from "./FeedbackModal";

export default function Sidebar({ isOpen, onClose, onShowLocked }) {
  const { currentUser, userData, portal, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const name = userData?.name || currentUser?.displayName || "Student";
  const avatarUrl = userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const role = userData?.role || "Student";
  const isPremium = portal === "premium";

  const handleLinkClick = (path, isLocked, e) => {
    if (isLocked) {
      e.preventDefault();
      onClose();
      if (onShowLocked) {
        setTimeout(onShowLocked, 260);
      }
      return;
    }
    onClose();
    navigate(path);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "show" : ""}`} onClick={onClose} />
      <aside className={`sidebar ${isOpen ? "open" : ""}`} id="sidebar">
        <div className="sb-head">
          <div className="sb-logo" onClick={() => { onClose(); navigate("/dashboard"); }}>
            <div className="sb-logo-icon">
              <img
                src="assets/zwapy-logo.png"
                style={{ width: "20px", height: "20px", objectFit: "contain" }}
                onError={(e) => { e.target.style.display = "none"; }}
                alt=""
              />
            </div>
            <span className="sb-logo-text">ZWAPY</span>
          </div>
          <button className="sb-close" onClick={onClose}>✕</button>
        </div>

        <div className="sb-user">
          <img src={avatarUrl} className="sb-avatar" alt="User Avatar" />
          <div>
            <div className="sb-user-name">{name}</div>
            <div className="sb-user-role">{role}</div>
          </div>
        </div>

        <div className="sb-portal-row">
          <span className={`sb-portal-pill ${isPremium ? "pill-premium" : "pill-public"}`}>
            {isPremium ? "⭐ Premium" : "🌐 Public"}
          </span>
          <span className="sb-portal-desc">
            {isPremium ? "All portals unlocked" : "Basic student services"}
          </span>
        </div>

        <div className="sb-coins">
          <div className="sb-coins-icon">💰</div>
          <div>
            <div className="sb-coins-val">{userData?.coins || 0}</div>
            <div className="sb-coins-label">Skill Coins</div>
          </div>
        </div>

        <nav className="sb-nav">
          <div className="sb-sec-label">Navigation</div>
          
          <Link
            to="/dashboard"
            className={`sb-link ${isActive("/dashboard") ? "active" : ""}`}
            onClick={(e) => handleLinkClick("/dashboard", false, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(0,212,255,0.08)" }}>🏠</div>
            <div>
              <div className="sb-link-name">Dashboard</div>
              <div className="sb-link-sub">Your home</div>
            </div>
          </Link>

          <Link
            to="/skill-exchange"
            className={`sb-link ${isActive("/skill-exchange") ? "active" : ""}`}
            onClick={(e) => handleLinkClick("/skill-exchange", false, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(0,212,255,0.08)" }}>🔄</div>
            <div>
              <div className="sb-link-name">Skill Exchange</div>
              <div className="sb-link-sub">All universities</div>
            </div>
          </Link>

          <Link
            to="/network"
            className={`sb-link ${isActive("/network") ? "active" : ""}`}
            onClick={(e) => handleLinkClick("/network", false, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(16,185,129,0.08)" }}>💬</div>
            <div>
              <div className="sb-link-name">Network</div>
              <div className="sb-link-sub">Connect with students</div>
            </div>
          </Link>

          <Link
            to="/discover"
            className={`sb-link ${isActive("/discover") ? "active" : ""}`}
            onClick={(e) => handleLinkClick("/discover", false, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(245,158,11,0.08)" }}>🔍</div>
            <div>
              <div className="sb-link-name">Discover</div>
              <div className="sb-link-sub">Find people & skills</div>
            </div>
          </Link>

          <Link
            to={isPremium ? "/events" : "#"}
            className={`sb-link ${isActive("/events") ? "active" : ""} ${!isPremium ? "sb-locked" : ""}`}
            onClick={(e) => handleLinkClick("/events", !isPremium, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(244,114,182,0.08)" }}>🎪</div>
            <div>
              <div className="sb-link-name">Events</div>
              <div className="sb-link-sub">
                {isPremium ? "Campus events" : "Coming to your uni"}
              </div>
            </div>
          </Link>

          <Link
            to={isPremium ? "/clubs" : "#"}
            className={`sb-link ${isActive("/clubs") ? "active" : ""} ${!isPremium ? "sb-locked" : ""}`}
            onClick={(e) => handleLinkClick("/clubs", !isPremium, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(129,140,248,0.08)" }}>🛡️</div>
            <div>
              <div className="sb-link-name">Clubs</div>
              <div className="sb-link-sub">
                {isPremium ? "Campus clubs" : "Coming to your uni"}
              </div>
            </div>
          </Link>

          <div className="sb-divider" />
          <div className="sb-sec-label">Account</div>

          <Link
            to="/profile"
            className={`sb-link ${isActive("/profile") ? "active" : ""}`}
            onClick={(e) => handleLinkClick("/profile", false, e)}
          >
            <div className="sb-link-icon" style={{ background: "rgba(255,255,255,0.04)" }}>👤</div>
            <div>
              <div className="sb-link-name">Profile</div>
              <div className="sb-link-sub">Your info & skills</div>
            </div>
          </Link>

          <button className="sb-link" onClick={() => { onClose(); setFeedbackOpen(true); }}>
            <div className="sb-link-icon" style={{ background: "rgba(0,212,255,0.06)" }}>💬</div>
            <div>
              <div className="sb-link-name">Give Feedback</div>
              <div className="sb-link-sub">Help us improve</div>
            </div>
          </button>
        </nav>

        <div className="sb-foot">
          <button
            className="sb-signout"
            onClick={async () => {
              onClose();
              await logout();
              navigate("/login");
            }}
          >
            <div className="sb-signout-icon">🚪</div>Sign Out
          </button>
        </div>
      </aside>

      <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
    </>
  );
}
