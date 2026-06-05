import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDocs, collection, query, orderBy, limit, doc, updateDoc, arrayUnion, addDoc, serverTimestamp, where } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import "./Dashboard.css";

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentUser, userData, portal, loading, refreshUserData } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);
  const [rank, setRank] = useState("—");
  const [lockedPanelVisible, setLockedPanelVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Security check: redirect to onboarding if incomplete
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate("/login");
        return;
      }
      if (!userData || !userData.name) {
        navigate("/extra-details");
        return;
      }
      if ((userData.profileVersion || 0) < 3) {
        navigate("/extra-details");
        return;
      }
    }
  }, [currentUser, userData, loading, navigate]);

  // Load Rank & recent activities
  useEffect(() => {
    if (!currentUser || !userData) return;

    async function loadStatsAndActivities() {
      try {
        // Compute Network Rank based on user coins count
        const allSnap = await getDocs(collection(db, "users"));
        const coins = userData.coins || 0;
        let computedRank = 1;
        allSnap.forEach((d) => {
          if (d.id !== currentUser.uid && (d.data().coins || 0) > coins) {
            computedRank++;
          }
        });
        setRank(computedRank);

        // Load recent activity from Firestore
        const q = query(
          collection(db, "users", currentUser.uid, "activity"),
          orderBy("createdAt", "desc"),
          limit(8)
        );
        const actSnap = await getDocs(q);
        const items = [];
        actSnap.forEach((d) => {
          items.push({ id: d.id, ...d.data() });
        });
        setRecentActivities(items);
      } catch (e) {
        console.error("Error loading dashboard data", e);
      } finally {
        setActivitiesLoading(false);
      }
    }

    loadStatsAndActivities();
  }, [currentUser, userData]);

  const handleCopyInvite = () => {
    const referralCode = userData?.referralCode || currentUser?.uid?.substring(0, 8).toUpperCase();
    const link = `https://zwapy.com/signup?ref=${referralCode}`;
    
    try {
      navigator.clipboard.writeText(link);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    alert("✅ Invite link copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShowLockedPanel = () => {
    setLockedPanelVisible(true);
    setTimeout(() => setLockedPanelVisible(false), 6000);
  };

  // Accept peer connection request
  const handleAcceptConnection = async (activityId, senderId, senderName) => {
    if (!currentUser || !userData) return;
    
    try {
      // 1. Mutually insert friends fields
      await updateDoc(doc(db, "users", currentUser.uid), {
        friends: arrayUnion(senderId)
      });
      await updateDoc(doc(db, "users", senderId), {
        friends: arrayUnion(currentUser.uid)
      });

      // 2. Resolve connections records to status 'connected'
      const connSnap = await getDocs(
        query(
          collection(db, "connections"),
          where("senderId", "==", senderId),
          where("receiverId", "==", currentUser.uid),
          where("status", "==", "pending")
        )
      );
      connSnap.forEach(async (d) => {
        await updateDoc(doc(db, "connections", d.id), { status: "connected" });
      });

      // 3. Mark the activity document as accepted
      await updateDoc(doc(db, "users", currentUser.uid, "activity", activityId), {
        status: "accepted",
        title: `Connected with ${senderName}`
      });

      // 4. Dispatch a success notice to the sender
      await addDoc(collection(db, "users", senderId, "activity"), {
        type: "connection_accepted",
        title: `${userData.name || "Someone"} accepted your request`,
        desc: "You are now connected on Zwapy!",
        createdAt: serverTimestamp()
      });

      alert(`✅ Connected with ${senderName}!`);
      
      // Refresh user details and activity stream
      await refreshUserData();
      const q = query(
        collection(db, "users", currentUser.uid, "activity"),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      const actSnap = await getDocs(q);
      const items = [];
      actSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setRecentActivities(items);
    } catch (e) {
      console.error(e);
      alert("❌ Error accepting connection");
    }
  };

  // Decline peer connection request
  const handleDeclineConnection = async (activityId, senderId) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser.uid, "activity", activityId), {
        status: "declined"
      });
      
      const connSnap = await getDocs(
        query(
          collection(db, "connections"),
          where("senderId", "==", senderId),
          where("receiverId", "==", currentUser.uid),
          where("status", "==", "pending")
        )
      );
      connSnap.forEach(async (d) => {
        await updateDoc(doc(db, "connections", d.id), { status: "declined" });
      });

      alert("Request declined");
      
      const q = query(
        collection(db, "users", currentUser.uid, "activity"),
        orderBy("createdAt", "desc"),
        limit(8)
      );
      const actSnap = await getDocs(q);
      const items = [];
      actSnap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      setRecentActivities(items);
    } catch (e) {
      console.error(e);
    }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning," : h < 17 ? "Good afternoon," : "Good evening,";
  };

  if (loading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar">
          <div className="ls-fill"></div>
        </div>
        <div className="ls-text">Loading dashboard...</div>
      </div>
    );
  }

  const isPremium = portal === "premium";
  const name = userData?.name || currentUser?.displayName || "Student";
  const coins = userData?.coins || 0;
  const exchanges = userData?.exchanges || 0;

  // Features list mapping
  const features = [
    {
      href: "/skill-exchange",
      icon: "🔄",
      label: "All Universities",
      name: "Skill Exchange",
      desc: "Trade skills with students from every university",
      badge: "Live",
      bc: "b-live",
      locked: false
    },
    {
      href: isPremium ? "/events" : "#",
      icon: "🎪",
      label: isPremium ? "Presidency" : "Locked",
      name: "Events",
      desc: isPremium
        ? "Hackathons, workshops and campus events"
        : "Unlocks when Zwapy collaborates with your university",
      badge: isPremium ? "Live" : "Locked",
      bc: isPremium ? "b-live" : "b-locked",
      locked: !isPremium
    },
    {
      href: isPremium ? "/clubs" : "#",
      icon: "🛡️",
      label: isPremium ? "Presidency" : "Locked",
      name: "Clubs",
      desc: isPremium
        ? "Join campus clubs and groups"
        : "Unlocks when Zwapy collaborates with your university",
      badge: isPremium ? "Live" : "Locked",
      bc: isPremium ? "b-live" : "b-locked",
      locked: !isPremium
    }
  ];

  return (
    <div className="dashboard-body">
      <div className="bg-glow"></div>
      
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onShowLocked={handleShowLockedPanel}
      />

      <div className="layout">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="hero-section fade-up d1 in">
          <div className="greeting-time">{getGreeting()}</div>
          <div className="greeting-name">
            <span>{name.split(" ")[0]}</span>
          </div>
          <div className="greeting-meta">
            <span className="gm-badge">{userData?.university || "Zwapy"}</span>
            <span className="gm-badge">{userData?.course || "Student"}</span>
            <span className={`gm-portal ${isPremium ? "premium" : "public"}`}>
              {isPremium ? "⭐ Premium Portal" : "🌐 Public Portal"}
            </span>
          </div>
        </div>

        <div className="stats-row fade-up d2 in">
          <div className="stat-card">
            <div className="sc-val c">{Number(coins).toLocaleString()}</div>
            <div className="sc-label">Skill Coins</div>
          </div>
          <div className="stat-card">
            <div className="sc-val g">{Number(exchanges).toLocaleString()}</div>
            <div className="sc-label">Exchanges</div>
          </div>
          <div className="stat-card">
            <div className="sc-val i">#{rank}</div>
            <div className="sc-label">Network Rank</div>
          </div>
          {userData?.examScores?.overall && (
            <div className="stat-card" id="statScoreCard">
              <div className="sc-val a">{userData.examScores.overall}%</div>
              <div className="sc-label">Exam Score</div>
            </div>
          )}
        </div>

        {!isPremium && (
          <div className="portal-notice fade-up d2 show pub-style in">
            <div className="pn-top">
              <div className="pn-icon">🌐</div>
              <div className="pn-title">Public Portal</div>
            </div>
            <div className="pn-body">
              You're on Zwapy's <strong>Public Portal</strong>. <strong>Skill Exchange</strong> is fully live — browse and trade skills with students from <strong>all universities including Presidency University</strong>.
              <br /><br />
              <strong>Clubs</strong> and <strong>Events</strong> are campus-specific and will unlock the moment Zwapy officially collaborates with <strong>{userData?.university || "your university"}</strong>. Ask your student council to <a href="mailto:partner@zwapy.com">partner with us →</a>
            </div>
            <div className="pn-chips">
              <span className="pn-chip chip-open">✅ Skill Exchange — open to all</span>
              <span className="pn-chip chip-locked">🔒 Clubs — your uni only (coming soon)</span>
              <span className="pn-chip chip-locked">🔒 Events — your uni only (coming soon)</span>
            </div>
          </div>
        )}

        {userData?.skillsKnown?.length > 0 && (
          <div className="skill-score-card show">
            <div className="ssc-title">// Your Verified Skill Scores</div>
            <div id="skillScoreList">
              {userData.skillsKnown.map((sk) => {
                const breakdown = userData?.examScores?.skillBreakdown || [];
                const sd = breakdown.find((b) => b.skill === sk.name);
                const pct = sd ? sd.pct : null;
                const barColor =
                  pct === null ? "rgba(255,255,255,0.1)" : pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={sk.name} className="skill-score-row">
                    <span className="ssr-name">{sk.name}</span>
                    <span className={`ssr-level level-${sk.level}`}>{sk.level}</span>
                    {pct !== null && (
                      <>
                        <div className="ssr-bar-wrap">
                          <div className="ssr-bar" style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                        <span className="ssr-pct">{pct}%</span>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            {userData.examTaken && (
              <Link to="/exam" className="exam-cta">
                🔄 Retake Exam to Improve Score
              </Link>
            )}
          </div>
        )}

        <div className="section-hd fade-up d3 in">
          <div className="section-label">// Features</div>
        </div>

        <div className="feature-grid fade-up d3 in" id="featureGrid">
          {features.map((f, i) => {
            const clickHandler = (e) => {
              if (f.locked) {
                e.preventDefault();
                handleShowLockedPanel();
              }
            };
            return (
              <Link
                key={i}
                to={f.href}
                className={`feat-card ${f.locked ? "locked" : ""}`}
                onClick={clickHandler}
              >
                <span className={`feat-badge ${f.bc}`}>{f.badge}</span>
                <span className="feat-icon">{f.icon}</span>
                <div className="feat-uni-label">{f.label}</div>
                <div className="feat-name">{f.name}</div>
                <div className="feat-desc">{f.desc}</div>
              </Link>
            );
          })}
        </div>

        <div className={`locked-panel ${lockedPanelVisible ? "show" : ""}`} id="lockedPanel">
          <div className="lp-icon">🔒</div>
          <div>
            <div className="lp-title">Not available for your university yet</div>
            <div className="lp-sub">
              Please wait until we collaborate with <strong>{userData?.university || "your university"}</strong> to unlock Clubs and Events.
              <br />
              <strong>Skill Exchange is open for everyone right now! 🎉</strong>
              <br />
              Ask your student council to <a href="mailto:partner@zwapy.com">partner with us →</a>
            </div>
          </div>
        </div>

       <Link to="/creagenix/workshops" className="crx-card fade-up d4 in">
          <div className="crx-top">
            <div className="crx-icon">🎬</div>
            <div>
              <div className="crx-suplabel">Coming Soon · Official Partnership</div>
              <div className="crx-name">Creagenix × Zwapy</div>
            </div>
            <div className="crx-soon">Coming Soon</div>
          </div>
          <div className="crx-desc">
            Professional video editing, photo editing and content creation — taught by Creagenix inside Zwapy. Earn real certificates. Build your personal brand.
          </div>
          <div className="crx-tags">
            <span className="crx-tag">🎬 Video Editing</span>
            <span className="crx-tag">📸 Photo Editing</span>
            <span className="crx-tag">🎨 Graphic Design</span>
            <span className="crx-tag">🚀 Personal Brand</span>
          </div>
        </Link>

        <div className="ref-strip fade-up d4 in">
          <div>
            <div className="ref-label">// Invite & Earn</div>
            <div className="ref-title">Invite friends, earn coins</div>
            <div className="ref-sub">+2 coins when a friend joins through your link</div>
          </div>
          <button className="ref-btn" id="refBtn" onClick={handleCopyInvite}>
            {copied ? "📋 Copied!" : "📋 Copy Invite Link"}
          </button>
        </div>

        <div className="section-hd fade-up d5 in">
          <div className="section-label">// Recent Activity</div>
          <Link to="/profile" className="section-link">
            See all →
          </Link>
        </div>

        <div className="activity-wrap fade-up d5 in" id="activityWrap">
          {activitiesLoading ? (
            <div className="activity-empty">Loading...</div>
          ) : recentActivities.length === 0 ? (
            <div className="activity-empty">
              <div className="ae-icon">⚡</div>
              <p className="ae-txt">
                No activity yet.
                <br />
                Do your first skill exchange to get started.
              </p>
            </div>
          ) : (
            recentActivities.map((item) => {
              if (item.type === "connection_request" && item.status === "pending") {
                return (
                  <div key={item.id} className="act-conn-req">
                    <div className="act-conn-dot"></div>
                    <div className="act-conn-body">
                      <div className="act-conn-title">{item.title || "Connection Request"}</div>
                      <div className="act-conn-sub">{item.desc || ""}</div>
                    </div>
                    <div className="act-conn-actions">
                      <button
                        className="act-accept-btn"
                        onClick={() => handleAcceptConnection(item.id, item.senderId, item.senderName)}
                      >
                        Accept
                      </button>
                      <button
                        className="act-decline-btn"
                        onClick={() => handleDeclineConnection(item.id, item.senderId)}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.id} className="activity-item">
                  <div className="act-dot"></div>
                  <div>
                    <div className="act-title">{item.title || "Activity"}</div>
                    <div className="act-sub">{item.desc || ""}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <BottomNav onShowLocked={handleShowLockedPanel} />
    </div>
  );
}
