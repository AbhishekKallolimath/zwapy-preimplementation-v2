import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection, getDocs, doc, addDoc, setDoc, arrayUnion, serverTimestamp
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import BottomNav from "../components/BottomNav";
import "./Network.css";

const FILTER_MAP = [
  { id: "all", label: "All" },
  { id: "Founder", label: "Founders" },
  { id: "Developer", label: "Developers" },
  { id: "Designer", label: "Designers" },
  { id: "Marketer", label: "Marketers" },
  { id: "Creator", label: "Creators" }
];

export default function Network() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, logout } = useAuth();

  const [allPeople, setAllPeople] = useState([]);
  const [myFriends, setMyFriends] = useState([]);
  const [pendingSent, setPendingSent] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "ok", show: false });
  const [modal, setModal] = useState(null); // person object or null
  const [filterOpen, setFilterOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const statsRef = useRef(null);
  const toastTimer = useRef(null);
  const dropdownRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  const currentUserName = userData?.name || currentUser?.displayName || "Student";
  const currentUserAvatar = userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUserName)}`;

  const showToast = (msg, type = "ok") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setFilterOpen(false);
      if (statsRef.current && !statsRef.current.contains(event.target)) setStatsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Auth guard
  useEffect(() => {
    if (!loading && !currentUser) navigate("/login");
  }, [loading, currentUser, navigate]);

  // Load data
  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      // 1. Resolve user profile for friends
      let profile = userData;
      if (!profile) {
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        profile = localUsers[currentUser.uid] || {};
      }

      const friends = profile.friends || profile.connections || [];
      const pending = profile.pendingRequestsSent || [];
      setMyFriends(friends);
      setPendingSent(pending);

      let peopleList = [];
      try {
        const snap = await getDocs(collection(db, "users"));
        snap.forEach(d => {
          const ud = d.data();
          if (ud.role === "super_admin") return;
          peopleList.push({ uid: d.id, ...ud });
        });
      } catch (err) {
        console.warn("Firestore users fetch failed in Network, checking offline database fallback:", err);
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        Object.keys(localUsers).forEach(uid => {
          const ud = localUsers[uid];
          if (ud.role === "super_admin") return;
          peopleList.push({ uid, ...ud });
        });
      }

      // Sort: connected first, then by coins
      peopleList.sort((a, b) => {
        const aC = friends.includes(a.uid) ? 1 : 0;
        const bC = friends.includes(b.uid) ? 1 : 0;
        if (bC !== aC) return bC - aC;
        return (b.coins || 0) - (a.coins || 0);
      });
      setAllPeople(peopleList);
      setPageLoading(false);
    }
    load();
  }, [currentUser, userData]);

  const connStatus = (uid) => {
    if (myFriends.includes(uid)) return "connected";
    if (pendingSent.includes(uid)) return "pending";
    return "none";
  };

  const handleConnect = async (uid) => {
    if (!currentUser) return;
    const st = connStatus(uid);
    if (st === "connected") { showToast("Already connected!"); return; }
    if (st === "pending") { showToast("Request already sent", "err"); return; }

    const myName = userData?.name || "Someone";

    try {
      try {
        const actRef = await addDoc(collection(db, "users", uid, "activity"), {
          type: "connection_request",
          title: `${myName} sent you a connection request`,
          desc: "Accept or decline from your dashboard activity feed",
          senderId: currentUser.uid,
          senderName: myName,
          status: "pending",
          createdAt: serverTimestamp()
        });
        await addDoc(collection(db, "connections"), {
          senderId: currentUser.uid,
          senderName: myName,
          receiverId: uid,
          status: "pending",
          activityDocId: actRef.id,
          createdAt: serverTimestamp()
        });
        await setDoc(doc(db, "users", currentUser.uid), {
          pendingRequestsSent: arrayUnion(uid)
        }, { merge: true });
      } catch (err) {
        console.warn("Firestore connection requests failed, recording offline locally:", err);
      }

      // Always update locally in localStorage to keep dev workflow fully functional
      const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
      if (localUsers[currentUser.uid]) {
        const pendingList = localUsers[currentUser.uid].pendingRequestsSent || [];
        if (!pendingList.includes(uid)) pendingList.push(uid);
        localUsers[currentUser.uid].pendingRequestsSent = pendingList;
        localStorage.setItem("zwapy_local_users", JSON.stringify(localUsers));
      }

      setPendingSent(prev => [...prev, uid]);
      showToast("✅ Connection request sent!");
    } catch (e) {
      showToast("Error: " + e.message, "err");
    }
  };

  // Filtered list
  const filteredPeople = allPeople.filter(p => {
    if (p.uid === currentUser?.uid) return false;
    if (activeFilter !== "all" && (p.role || "Student") !== activeFilter) return false;
    if (searchQ) {
      const q = searchQ.toLowerCase();
      const nameMatch = (p.name || "").toLowerCase().includes(q);
      const uniMatch = (p.university || "").toLowerCase().includes(q);
      const bioMatch = (p.bio || "").toLowerCase().includes(q);
      const skillMatch = (p.skillsKnown || []).some(s =>
        (typeof s === "string" ? s : s.name || "").toLowerCase().includes(q)
      ) || (p.skillsLearn || []).some(s => s.toLowerCase().includes(q));
      return nameMatch || uniMatch || bioMatch || skillMatch;
    }
    return true;
  });

  // Stats
  const otherPeople = allPeople.filter(p => p.uid !== currentUser?.uid);
  const totalConnected = myFriends.length;
  const totalSkills = allPeople.reduce((acc, p) => acc + (p.skillsKnown || []).length + (p.skillsLearn || []).length, 0);
  const totalCerts = allPeople.reduce((acc, p) => acc + (p.skillsKnown || []).filter(s => typeof s === "object" && s.certUrl).length, 0);

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading network...</div>
      </div>
    );
  }

  return (
    <div className="network-body">
      <div className="bg-glow-net" />

      {/* Toast */}
      <div className={`net-toast${toast.show ? " show" : ""}${toast.type === "err" ? " err" : ""}`}>
        {toast.msg}
      </div>

      {/* Profile Modal */}
      {modal && (
        <div className={`net-modal-bg open`} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="net-modal">
            <div className="net-modal-accent" />
            <div className="net-modal-scroll">
              <button className="net-modal-close" onClick={() => setModal(null)}>✕</button>
              <div className="net-modal-profile-top">
                <div className="net-modal-av">
                  <img src={modal.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(modal.name || modal.uid)}`} alt="" />
                </div>
                <div style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
                  <div className="net-modal-name">{modal.name || "Student"}</div>
                  <div className="net-modal-role">{modal.role || "Student"}</div>
                  <div className="net-modal-uni">{modal.university || "—"}</div>
                </div>
              </div>

              <div className="net-modal-sec-label">About</div>
              <div className="net-modal-bio">{modal.bio || "No bio added yet."}</div>

              <div className="net-modal-sec-label">Skills I Know</div>
              <div className="net-modal-skills-group">
                {(modal.skillsKnown || []).length > 0
                  ? (modal.skillsKnown || []).map((s, i) => (
                      <span key={i} className="net-modal-skill know">{typeof s === "string" ? s : s.name}</span>
                    ))
                  : <span className="net-modal-skill empty">No skills listed yet</span>}
              </div>

              <div className="net-modal-sec-label">Skills I Want to Learn</div>
              <div className="net-modal-skills-group">
                {(modal.skillsLearn || []).length > 0
                  ? (modal.skillsLearn || []).map((s, i) => (
                      <span key={i} className="net-modal-skill learn">{s}</span>
                    ))
                  : <span className="net-modal-skill empty">Nothing listed yet</span>}
              </div>

              <div className="net-modal-sec-label">Certificates</div>
              <div className="net-cert-list">
                {(modal.skillsKnown || []).filter(s => typeof s === "object" && s.certUrl).length > 0
                  ? (modal.skillsKnown || []).filter(s => typeof s === "object" && s.certUrl).map((c, i) => (
                      <div key={i} className="net-cert-item">
                        <div className="net-cert-icon">🏅</div>
                        <div className="net-cert-info"><div className="net-cert-name">{c.name || "Certificate"}</div></div>
                        <a className="net-cert-link" href={c.certUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>View →</a>
                      </div>
                    ))
                  : <p style={{ fontSize: ".74rem", color: "#64748b", fontStyle: "italic" }}>No certificates added yet</p>}
              </div>

              <div className="net-modal-sec-label">Activity</div>
              <div className="net-modal-stats-row">
                <div className="net-msr"><div className="net-msr-val">{modal.coins || 0}</div><div className="net-msr-label">Coins</div></div>
                <div className="net-msr"><div className="net-msr-val">{modal.exchanges || 0}</div><div className="net-msr-label">Exchanges</div></div>
                <div className="net-msr"><div className="net-msr-val">{modal.clubs || 0}</div><div className="net-msr-label">Clubs</div></div>
              </div>

              <div className="net-modal-actions">
                {modal.uid === currentUser?.uid ? (
                  <button className="net-modal-connect-btn self-btn" onClick={() => navigate("/profile")}>Edit Your Profile</button>
                ) : connStatus(modal.uid) === "connected" ? (
                  <button className="net-modal-connect-btn connected">✓ Connected</button>
                ) : connStatus(modal.uid) === "pending" ? (
                  <button className="net-modal-connect-btn pending">⏳ Request Sent</button>
                ) : (
                  <button className="net-modal-connect-btn" onClick={() => handleConnect(modal.uid)}>+ Connect</button>
                )}
                {modal.linkedin && (
                  <a className="net-modal-linkedin" href={modal.linkedin.startsWith("http") ? modal.linkedin : "https://" + modal.linkedin} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="#0a66c2" style={{ width: 16, height: 16, flexShrink: 0 }}>
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                    </svg>
                    View LinkedIn Profile
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="net-layout">
        {/* Navbar */}
        <nav className="net-navbar">
          <div className="net-navbar-logo" onClick={() => navigate("/dashboard")}>
            <div className="net-logo-node">
              <img
                src="assets/zwapy-logo.png"
                style={{ width: "20px", height: "20px", objectFit: "contain" }}
                onError={(e) => { e.target.style.display = "none"; }}
                alt=""
              />
            </div>
            <div className="net-logo-group">
              <span className="net-logo-text">The Network</span>
              <span className="net-logo-tagline">Your people are out there. Find them.</span>
            </div>
          </div>
          <div className="net-navbar-right">
            <div className="net-stats-dropdown-container" ref={statsRef}>
              <button className="net-stats-btn" onClick={() => setStatsOpen(!statsOpen)}>
                <span>📊 Stats</span>
                <span className="net-filter-arrow" style={{ transform: statsOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
              </button>
              {statsOpen && (
                <div className="net-stats-dropdown-menu">
                  <div className="net-stats-item"><span className="net-stats-num">{otherPeople.length}</span><span className="net-stats-lbl">Connect</span></div>
                  <div className="net-stats-item"><span className="net-stats-num">{totalConnected}</span><span className="net-stats-lbl">Connected</span></div>
                  <div className="net-stats-item"><span className="net-stats-num">{totalSkills}</span><span className="net-stats-lbl">Skills</span></div>
                  <div className="net-stats-item"><span className="net-stats-num">{totalCerts}</span><span className="net-stats-lbl">Certs</span></div>
                </div>
              )}
            </div>
            <img
              src={currentUserAvatar}
              className="net-navbar-avatar"
              onClick={() => navigate("/profile")}
              alt="My Avatar"
            />
            <button className="net-navbar-logout" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </nav>

        {/* Hero Section */}
        <div className="net-hero">
          <div className="net-hero-content">
          </div>
        </div>

        {/* Search & Filter Row */}
        <div className="net-search-row">
          <div className="net-search-container">
            <span className="net-search-icon">🔍</span>
            <input
              type="text"
              className="net-search-bar"
              placeholder="Search by name, skill, or university..."
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
            />
          </div>

          <div className="net-filter-dropdown-container" ref={dropdownRef}>
            <button className="net-filter-btn" onClick={() => setFilterOpen(!filterOpen)}>
              <span>Role: {FILTER_MAP.find(f => f.id === activeFilter)?.label || "All"}</span>
              <span className="net-filter-arrow" style={{ transform: filterOpen ? 'rotate(180deg)' : 'none', display: 'inline-block' }}>▼</span>
            </button>
            {filterOpen && (
              <div className="net-filter-dropdown-menu">
                {FILTER_MAP.map(f => (
                  <button
                    key={f.id}
                    className={`net-filter-dropdown-item${activeFilter === f.id ? " active" : ""}`}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setFilterOpen(false);
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section Header */}
        <div className="net-section-header">
          <span className="net-section-label">CONNECT</span>
          <span className="net-count-badge">{filteredPeople.length}</span>
        </div>

        {/* Grid */}
        <div className="net-people-grid">
          {filteredPeople.length === 0 ? (
            <div className="net-empty-state">
              <div className="net-empty-icon">👥</div>
              <p className="net-empty-text">No students found.</p>
            </div>
          ) : (
            filteredPeople.map(p => {
              const st = connStatus(p.uid);
              const isMe = p.uid === currentUser?.uid;
              const av = p.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.name || p.uid)}`;
              const rawKnown = p.skillsKnown || [];
              const knowSkills = rawKnown.slice(0, 3).map(s => typeof s === "string" ? s : (s.name || ""));
              const learnSkills = (p.skillsLearn || []).slice(0, 2);

              return (
                <div key={p.uid} className="net-person-card" onClick={() => setModal(p)}>
                  <div className="net-card-avatar-wrap">
                    <img src={av} className="net-card-avatar" alt="" loading="lazy" />
                  </div>
                  <h3 className="net-card-name">
                    {p.name || "Student"}
                    {isMe && <span className="net-you-badge">You</span>}
                  </h3>
                  <div className="net-card-role">{p.role ? p.role.toUpperCase() : "STUDENT"}</div>
                  <div className="net-card-uni">{p.university || "—"}</div>
                  
                  <div className="net-card-skills">
                    {knowSkills.map((s, i) => <span key={i} className="net-card-skill">{s}</span>)}
                    {learnSkills.map((s, i) => <span key={i} className="net-card-skill learn">↑ {s}</span>)}
                  </div>

                  <div className="net-card-footer">
                    <div className="net-card-stats">
                      <span className="net-card-stat">🪙 {p.coins || 0}</span>
                      <span className="net-card-stat">🔄 {p.exchanges || 0}</span>
                    </div>
                    <div className="net-card-action">
                      {!isMe && (
                        st === "connected" ? (
                          <button className="net-card-connect-btn connected" disabled onClick={e => e.stopPropagation()}>✓ Connected</button>
                        ) : st === "pending" ? (
                          <button className="net-card-connect-btn pending" disabled onClick={e => e.stopPropagation()}>⏳ Pending</button>
                        ) : (
                          <button
                            className="net-card-connect-btn"
                            onClick={e => { e.stopPropagation(); handleConnect(p.uid); }}
                          >Connect</button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
