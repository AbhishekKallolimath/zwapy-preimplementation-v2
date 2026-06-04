import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import "./Accounts.css";

export default function Accounts() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, logout } = useAuth();
  const [profileDetails, setProfileDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    async function fetchDetails() {
      try {
        let details = null;
        try {
          const docRef = doc(db, "users", currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            details = docSnap.data();
          }
        } catch (err) {
          console.warn("Firestore fetch failed in Accounts, reading local database fallback:", err);
        }

        if (!details) {
          const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
          details = localUsers[currentUser.uid] || userData || {};
        }

        setProfileDetails(details);
      } catch (error) {
        console.error("Error loading account profile details:", error);
      } finally {
        setDetailsLoading(false);
      }
    }
    fetchDetails();
  }, [currentUser, userData]);

  const handleLogout = async () => {
    try {
      await logout();
      alert("Logged out successfully!");
      navigate("/login");
    } catch (e) {
      console.error(e);
    }
  };

  if (loading || detailsLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading account...</div>
      </div>
    );
  }

  const av = profileDetails?.photoURL || currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profileDetails?.name || currentUser?.uid)}`;

  return (
    <div className="accounts-body">
      <div className="bg-glow" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout">
        <header className="topbar">
          <button className="topbar-logo" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
            <div className="logo-node">
              <img src="assets/zwapy-logo.png" style={{ width: "26px", height: "26px", objectFit: "contain" }} alt="" />
            </div>
            <span className="logo-text">ZWAPY</span>
          </button>
          <button className="back-btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
        </header>

        <div className="page-head fade-up in">
          <div className="page-label">// Student Profile</div>
          <h1 className="page-title">My <span>Account</span></h1>
          <p className="page-sub">Manage your security settings, university credentials and personal details.</p>
        </div>

        <div className="accounts-container fade-up in">
          {/* Basic Info Box */}
          <div className="account-box">
            <div className="profile-pic-container">
              <img src={av} alt="Profile Picture" className="profile-pic" />
              <div className="online-badge" />
            </div>
            <h2 className="user-name">{profileDetails?.name || "Loading..."}</h2>
            <p className="user-email">{profileDetails?.email || "Loading email..."}</p>
            
            <div className="acc-actions">
              <Link to="/change-password" className="change-password-link">Change Password</Link>
              <button className="logout-btn" onClick={handleLogout}>Log Out</button>
            </div>
          </div>

          {/* Extra Details Box */}
          <div className="account-box details-box">
            <h3 className="box-title">// Additional Details</h3>
            
            <div className="detail-item">
              <span className="detail-label">University / College</span>
              <span className="detail-val">{profileDetails?.university || "Not provided"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">University / College Email</span>
              <span className="detail-val">{profileDetails?.universityEmail || "Not provided"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Course / Major</span>
              <span className="detail-val">{profileDetails?.course || "Not provided"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Role Type</span>
              <span className="detail-val role-badge">{profileDetails?.role || "student"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Skills Known</span>
              <div className="skills-wrap">
                {(profileDetails?.skillsKnown || []).length > 0 ? (
                  profileDetails.skillsKnown.map((s, i) => (
                    <span key={i} className="skill-tag know">{typeof s === "string" ? s : s.name}</span>
                  ))
                ) : (
                  <span className="no-details">No skills listed yet</span>
                )}
              </div>
            </div>

            <div className="detail-item">
              <span className="detail-label">Skills to Learn</span>
              <div className="skills-wrap">
                {(profileDetails?.skillsLearn || []).length > 0 ? (
                  profileDetails.skillsLearn.map((s, i) => (
                    <span key={i} className="skill-tag learn">{s}</span>
                  ))
                ) : (
                  <span className="no-details">Nothing listed yet</span>
                )}
              </div>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Referral Code</span>
              <span className="detail-val code-val">{profileDetails?.referralCode || "—"}</span>
            </div>

            <div className="detail-item">
              <span className="detail-label">Coins Stacked</span>
              <span className="detail-val coin-val">💰 {profileDetails?.coins || 0} coins</span>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
