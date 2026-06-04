import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  increment,
  arrayUnion
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import "./SkillExchange.css";

const COIN_TABLE = {
  Beginner: { pass: 5, fail: -5 },
  Intermediate: { pass: 10, fail: -5 },
  Advanced: { pass: 15, fail: -5 }
};

const CODING_SKILLS = [
  "python", "javascript", "js", "java", "c++", "cpp", "c#", "html", "css",
  "react", "node", "sql", "kotlin", "swift", "typescript", "ruby", "go",
  "rust", "flutter", "php", "coding", "programming", "dev", "frontend", "backend"
];

function isCodingSkill(skill) {
  const s = (skill || "").toLowerCase();
  return CODING_SKILLS.some(k => s.includes(k));
}

function cleanDigits(raw) {
  return (raw || "").replace(/\D/g, "");
}

function displayZoomId(raw) {
  const d = cleanDigits(raw);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)} ${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 10)} ${d.slice(10)}`;
}

function buildZoomJoinUrl(id, pass) {
  const clean = cleanDigits(id);
  let url = `https://zoom.us/j/${clean}`;
  if (pass) {
    url += `?pwd=${encodeURIComponent(pass)}`;
  }
  return url;
}

function getTeacherCoins(level, stars) {
  const base = COIN_TABLE[level]?.pass || 10;
  return stars >= 4 ? base * 2 : base;
}

function getLearnerCoins(level, passed) {
  const t = COIN_TABLE[level] || COIN_TABLE.Intermediate;
  return passed ? t.pass : t.fail;
}

function timeAgo(createdAt) {
  if (!createdAt) return "just now";
  const millis = typeof createdAt.toMillis === "function" ? createdAt.toMillis() : Date.now();
  const m = Math.floor((Date.now() - millis) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function SkillExchange() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, refreshUserData } = useAuth();

  const [activeTab, setActiveTab] = useState("browse");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [exchanges, setExchanges] = useState([]);
  const [requests, setRequests] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");

  // Modals state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [connectTarget, setConnectTarget] = useState(null);
  const [connectMsg, setConnectMsg] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState(null);
  const [sessDate, setSessDate] = useState("");
  const [sessTime, setSessTime] = useState("");
  const [sessDuration, setSessDuration] = useState("1");
  const [zoomIdInput, setZoomIdInput] = useState("");
  const [zoomPassword, setZoomPassword] = useState("");
  const [zoomIdError, setZoomIdError] = useState("");
  const [zoomIdOk, setZoomIdOk] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);

  const [safetyModalOpen, setSafetyModalOpen] = useState(false);
  const [safetySession, setSafetySession] = useState(null);
  const [safetyIsTeacher, setSafetyIsTeacher] = useState(false);
  const [safetyAgree, setSafetyAgree] = useState(false);
  const [geminiSafetyTip, setGeminiSafetyTip] = useState("");

  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingSession, setRatingSession] = useState(null);
  const [currentStars, setCurrentStars] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Form Posting
  const [offerSkill, setOfferSkill] = useState("");
  const [needSkill, setNeedSkill] = useState("");
  const [skillLevel, setSkillLevel] = useState("Intermediate");
  const [duration, setDuration] = useState("1 Session");
  const [postDesc, setPostDesc] = useState("");
  const [postingRequest, setPostingRequest] = useState(false);

  // Verification statistics
  const [statTotal, setStatTotal] = useState(0);
  const [statMine, setStatMine] = useState(0);
  const [statSessions, setStatSessions] = useState(0);
  const [hasPendingRequests, setHasPendingRequests] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  // Fetch data
  const loadData = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch exchanges
      const exSnap = await getDocs(query(collection(db, "exchanges"), orderBy("createdAt", "desc")));
      const exItems = [];
      exSnap.forEach(d => {
        exItems.push({ id: d.id, ...d.data() });
      });
      
      setExchanges(exItems);
      setStatTotal(exItems.length);
      setStatMine(exItems.filter(e => e.uid === currentUser.uid).length);

      // 2. Fetch requests
      const reqSnap = await getDocs(query(collection(db, "exchange_requests"), orderBy("createdAt", "desc")));
      const reqItems = [];
      let pending = false;
      reqSnap.forEach(d => {
        const r = { id: d.id, ...d.data() };
        if (r.toUid === currentUser.uid) {
          reqItems.push(r);
          if (r.status === "pending") pending = true;
        }
      });
      setRequests(reqItems);
      setHasPendingRequests(pending);

      // 3. Fetch sessions
      const sessSnap = await getDocs(query(collection(db, "sessions"), orderBy("createdAt", "desc")));
      const sessItems = [];
      sessSnap.forEach(d => {
        const s = { id: d.id, ...d.data() };
        if (s.fromUid === currentUser.uid || s.toUid === currentUser.uid) {
          sessItems.push(s);
        }
      });
      setSessions(sessItems);
      setStatSessions(sessItems.length);
    } catch (e) {
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handle Post Submit
  const handlePostRequest = async (e) => {
    e.preventDefault();
    if (!offerSkill.trim() || !needSkill.trim()) {
      alert("⚠️ Please fill in both skill fields.");
      return;
    }
    setPostingRequest(true);
    try {
      await addDoc(collection(db, "exchanges"), {
        uid: currentUser.uid,
        name: userData?.name || "Student",
        university: userData?.university || "",
        photoURL: userData?.photoURL || "",
        offer: offerSkill.trim(),
        need: needSkill.trim(),
        level: skillLevel,
        duration: duration,
        desc: postDesc.trim(),
        createdAt: serverTimestamp()
      });
      setOfferSkill("");
      setNeedSkill("");
      setPostDesc("");
      alert("✅ Exchange request posted successfully!");
      await loadData();
      setActiveTab("browse");
    } catch (err) {
      console.error(err);
      alert("❌ Error posting request");
    } finally {
      setPostingRequest(false);
    }
  };

  // Delete Exchange Post
  const handleDeleteEx = async (id) => {
    if (!window.confirm("Are you sure you want to delete this exchange post?")) return;
    try {
      await deleteDoc(doc(db, "exchanges", id));
      alert("🗑️ Post deleted.");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Connect Modal
  const openConnect = (ex) => {
    setConnectTarget(ex);
    setConnectMsg("");
    setConnectModalOpen(true);
  };

  // Send Connect Request
  const handleSendConnectRequest = async () => {
    if (!connectMsg.trim()) {
      alert("⚠️ Please write a short message first.");
      return;
    }
    setSendingRequest(true);
    try {
      await addDoc(collection(db, "exchange_requests"), {
        fromUid: currentUser.uid,
        fromName: userData?.name || "Student",
        fromEmail: currentUser.email || "",
        fromPhoto: userData?.photoURL || "",
        fromUniversity: userData?.university || "",
        toUid: connectTarget.uid,
        toName: connectTarget.name || "Student",
        exchangeId: connectTarget.id,
        offer: connectTarget.offer,
        need: connectTarget.need,
        level: connectTarget.level || "Intermediate",
        message: connectMsg.trim(),
        status: "pending",
        createdAt: serverTimestamp()
      });
      setConnectModalOpen(false);
      alert("✈️ Connection request sent!");
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Failed to send request.");
    } finally {
      setSendingRequest(false);
    }
  };

  // Decline Exchange Request
  const handleDeclineRequest = async (reqId) => {
    try {
      await updateDoc(doc(db, "exchange_requests", reqId), { status: "rejected" });
      alert("Request declined.");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Schedule Modal
  const openSchedule = (req) => {
    setScheduleTarget({
      reqId: req.id,
      fromUid: req.fromUid,
      fromName: req.fromName || "Student",
      fromEmail: req.fromEmail || "",
      offer: req.offer,
      need: req.need,
      level: req.level || "Intermediate"
    });
    setSessDate("");
    setSessTime("");
    setSessDuration("1");
    setZoomIdInput("");
    setZoomPassword("");
    setZoomIdError("");
    setZoomIdOk("");
    setScheduleModalOpen(true);
  };

  // Validate Zoom Meeting ID input
  const handleZoomIdChange = (val) => {
    setZoomIdInput(val);
    const digits = cleanDigits(val);
    if (!digits) {
      setZoomIdError("");
      setZoomIdOk("");
      return;
    }
    if (digits.length < 9) {
      setZoomIdError("❌ Too short — Zoom Meeting ID is 9–11 digits");
      setZoomIdOk("");
    } else if (digits.length > 11) {
      setZoomIdError("❌ Too long — Zoom Meeting ID is 9–11 digits");
      setZoomIdOk("");
    } else {
      setZoomIdError("");
      setZoomIdOk(`✅ Valid — ${displayZoomId(digits)} · join link ready`);
    }
  };

  // Save Scheduled Session
  const handleSaveSchedule = async () => {
    if (!sessDate || !sessTime) {
      alert("⚠️ Please choose a date and time.");
      return;
    }
    const digits = cleanDigits(zoomIdInput);
    if (digits.length < 9 || digits.length > 11) {
      alert("⚠️ Please enter a valid Zoom Meeting ID (9–11 digits).");
      return;
    }
    setSavingSchedule(true);
    const zoomJoinLink = buildZoomJoinUrl(digits, zoomPassword);
    const desc = `${sessDate} at ${sessTime} · ${sessDuration}hr · Zoom ID: ${displayZoomId(digits)}${
      zoomPassword ? ` · Password: ${zoomPassword}` : ""
    }`;

    try {
      await addDoc(collection(db, "sessions"), {
        requestId: scheduleTarget.reqId,
        fromUid: scheduleTarget.fromUid,
        fromName: scheduleTarget.fromName,
        fromEmail: scheduleTarget.fromEmail,
        toUid: currentUser.uid,
        toName: userData?.name || "Student",
        toEmail: currentUser.email || "",
        offer: scheduleTarget.offer,
        need: scheduleTarget.need,
        level: scheduleTarget.level || "Intermediate",
        date: sessDate,
        time: sessTime,
        durationHours: parseFloat(sessDuration),
        zoomMeetingId: digits,
        zoomPassword: zoomPassword,
        zoomJoinLink: zoomJoinLink,
        status: "scheduled",
        sessionConfirmed: { [scheduleTarget.fromUid]: false, [currentUser.uid]: false },
        examDone: { [scheduleTarget.fromUid]: false, [currentUser.uid]: false },
        rated: { [scheduleTarget.fromUid]: false, [currentUser.uid]: false },
        createdAt: serverTimestamp()
      });

      await updateDoc(doc(db, "exchange_requests", scheduleTarget.reqId), { status: "accepted" });

      await Promise.all([
        addDoc(collection(db, "users", currentUser.uid, "activity"), {
          title: `📹 Session with ${scheduleTarget.fromName}`,
          desc,
          createdAt: serverTimestamp()
        }),
        addDoc(collection(db, "users", scheduleTarget.fromUid, "activity"), {
          title: `📹 Session confirmed with ${userData?.name || "Student"}`,
          desc,
          createdAt: serverTimestamp()
        })
      ]);

      setScheduleModalOpen(false);
      alert("✅ Zoom meeting saved! Both students can now join from Sessions tab.");
      await loadData();
      setActiveTab("sessions");
    } catch (err) {
      console.error(err);
      alert("❌ Error scheduling session");
    } finally {
      setSavingSchedule(false);
    }
  };

  // Open Safety Modal
  const openSafety = (sess, isTeacher) => {
    setSafetySession(sess);
    setSafetyIsTeacher(isTeacher);
    setSafetyAgree(false);
    setGeminiSafetyTip("Stay focused on the skill and keep the session professional. End the meeting immediately if anything inappropriate happens.");
    setSafetyModalOpen(true);
  };

  // Launch Zoom
  const launchZoom = () => {
    if (!safetySession) return;
    const url = safetySession.zoomJoinLink || buildZoomJoinUrl(safetySession.zoomMeetingId, safetySession.zoomPassword);
    window.open(url, "_blank", "noopener,noreferrer");
    setSafetyModalOpen(false);
  };

  // Confirm Session Completed
  const confirmSessionDone = async (sessId) => {
    try {
      await updateDoc(doc(db, "sessions", sessId), {
        [`sessionConfirmed.${currentUser.uid}`]: true
      });
      alert("✅ Session confirmed as completed!");
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  // Open Rating Modal
  const openRating = (sess) => {
    setRatingSession(sess);
    setCurrentStars(0);
    setRatingModalOpen(true);
  };

  // Submit Star Rating
  const handleSubmitRating = async () => {
    if (!ratingSession || currentStars === 0) return;
    setRatingSubmitting(true);
    const tc = getTeacherCoins(ratingSession.level || "Intermediate", currentStars);
    try {
      await updateDoc(doc(db, "sessions", ratingSession.id), {
        [`rated.${currentUser.uid}`]: true,
        [`stars.${currentUser.uid}`]: currentStars,
        teacherCoinsAwarded: tc
      });

      const tSnap = await getDoc(doc(db, "users", ratingSession.fromUid));
      if (tSnap.exists()) {
        await updateDoc(doc(db, "users", ratingSession.fromUid), {
          coins: (tSnap.data().coins || 0) + tc,
          exchanges: (tSnap.data().exchanges || 0) + 1
        });
      }

      await addDoc(collection(db, "users", ratingSession.fromUid, "activity"), {
        title: `⭐ Rated ${currentStars} stars by ${userData?.name || "Student"}`,
        desc: `+${tc} coins · ${ratingSession.offer}`,
        createdAt: serverTimestamp()
      });

      setRatingModalOpen(false);
      alert(`✅ Teacher earned +${tc} coins!`);
      await loadData();
    } catch (err) {
      console.error(err);
      alert("❌ Error submitting rating");
    } finally {
      setRatingSubmitting(false);
    }
  };

  // Filter exchanges list
  const filteredExchanges = exchanges.filter(ex => {
    const levelMatch = activeFilter === "all" || activeFilter === "mine" || ex.level === activeFilter;
    const userMatch = activeFilter !== "mine" || ex.uid === currentUser?.uid;
    const s = searchQ.toLowerCase().trim();
    const searchMatch =
      !s ||
      (ex.offer || "").toLowerCase().includes(s) ||
      (ex.need || "").toLowerCase().includes(s);
    return levelMatch && userMatch && searchMatch;
  });

  const levelColor = () => {
    return "#00D4FF";
  };

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading skill exchange...</div>
      </div>
    );
  }

  return (
    <div className="se-body">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout">
        <header className="topbar">
          <button className="topbar-logo" style={{ background: "none", border: "none", cursor: "pointer", textAlign: "left" }} onClick={() => navigate("/dashboard")}>
            <div className="logo-node">
              <img src="assets/zwapy-logo.png" style={{ width: "20px", height: "20px", objectFit: "contain" }} alt="" />
            </div>
            <span className="logo-text">Skill Exchange</span>
          </button>

          <nav className="navbar-tabs">
            <button className={`tab-btn${activeTab === "browse" ? " active" : ""}`} onClick={() => setActiveTab("browse")}>Browse</button>
            <button className={`tab-btn${activeTab === "requests" ? " active" : ""}`} onClick={() => setActiveTab("requests")}>
              Requests {hasPendingRequests && <span className="tab-dot show" />}
            </button>
            <button className={`tab-btn${activeTab === "sessions" ? " active" : ""}`} onClick={() => setActiveTab("sessions")}>Sessions</button>
            <button className={`tab-btn${activeTab === "post" ? " active" : ""}`} onClick={() => setActiveTab("post")}>+ Post</button>
          </nav>

          <div className="topbar-right">
            <div className="info-dropdown-wrapper">
              <button className={`info-toggle-btn${infoOpen ? " active" : ""}`} onClick={() => setInfoOpen(!infoOpen)} title="View Coin Rules & Info">
                ⓘ Rules
              </button>
              {infoOpen && (
                <div className="info-dropdown">
                  <div className="dropdown-section">
                    <div className="dropdown-title">// Level Coin Rules</div>
                    <div className="ci-row">
                      <span className="ci-badge ci-beg">Beginner</span> Pass → <strong>+5 coins</strong> · Fail → <strong>-5 coins</strong>
                    </div>
                    <div className="ci-row">
                      <span className="ci-badge ci-int">Intermediate</span> Pass → <strong>+10 coins</strong> · Fail → <strong>-5 coins</strong>
                    </div>
                    <div className="ci-row">
                      <span className="ci-badge ci-adv">Advanced</span> Pass → <strong>+15 coins</strong> · Fail → <strong>-5 coins</strong>
                    </div>
                    <div className="rules-subtext">Teacher: double coins if rated 4-5⭐ · Teacher never loses.</div>
                  </div>
                  <div className="dropdown-separator" />
                  <div className="dropdown-section">
                    <div className="dropdown-title">// Certificates & Exams</div>
                    <div className="cert-text">
                      🏆 <strong>Certificate:</strong> 5 exchanges on same skill<br />
                      📝 <strong>Exam:</strong> Learner only · 🤖 <strong>Questions:</strong> AI-powered
                    </div>
                  </div>
                </div>
              )}
            </div>
            <span className="coin-display">🪙 {userData?.coins || 0}</span>
            <button className="back-btn" onClick={() => navigate("/dashboard")}>← Back</button>
          </div>
        </header>



        <div className="stats-strip">
          <div className="sc"><div className="sc-val">{statTotal}</div><div className="sc-label">Requests</div></div>
          <div className="sc"><div className="sc-val">{statMine}</div><div className="sc-label">My Posts</div></div>
          <div className="sc"><div className="sc-val">{statSessions}</div><div className="sc-label">Sessions</div></div>
        </div>

        {/* Tab Browse */}
        {activeTab === "browse" && (
          <div className="tab-content active">
            <div className="filter-bar fade-up d2 in">
              <div className="sw">
                <span className="si">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search skills..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <div className="ftabs">
                <div className={`ftab${activeFilter === "all" ? " active" : ""}`} onClick={() => setActiveFilter("all")}>All</div>
                <div className={`ftab${activeFilter === "mine" ? " active" : ""}`} onClick={() => setActiveFilter("mine")}>Mine</div>
                <div className={`ftab${activeFilter === "Beginner" ? " active" : ""}`} onClick={() => setActiveFilter("Beginner")}>Beginner</div>
                <div className={`ftab${activeFilter === "Intermediate" ? " active" : ""}`} onClick={() => setActiveFilter("Intermediate")}>Inter.</div>
                <div className={`ftab${activeFilter === "Advanced" ? " active" : ""}`} onClick={() => setActiveFilter("Advanced")}>Advanced</div>
              </div>
            </div>

            <div className="ex-grid fade-up d3 in">
              {filteredExchanges.length === 0 ? (
                <div className="empty-state">
                  <div className="ei">🔄</div>
                  <p className="et">No exchanges found.</p>
                </div>
              ) : (
                filteredExchanges.map(ex => {
                  const isMe = ex.uid === currentUser?.uid;
                  const col = levelColor(ex.level);
                  const av = ex.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(ex.name || ex.uid)}`;
                  const isCoding = isCodingSkill(ex.offer);
                  return (
                    <div key={ex.id} className="ex-card">
                      <div className="ex-bar" />
                      <div className="ex-body">
                        <div className="ex-header">
                          <div className="ex-av"><img src={av} alt="" /></div>
                          <div className="ex-user">
                            <div className="ex-name">{ex.name || "Student"}</div>
                            <div className="ex-uni">{ex.university}</div>
                          </div>
                          <div className="ex-time">{timeAgo(ex.createdAt)}</div>
                        </div>
                        <div className="swap-box">
                          <div className="swap-side">
                            <div className="swap-lbl off">Offering</div>
                            <div className="swap-skill">{ex.offer} {isCoding && "💻"}</div>
                          </div>
                          <div className="swap-arr">⇄</div>
                          <div className="swap-side">
                            <div className="swap-lbl wan">Needs</div>
                            <div className="swap-skill">{ex.need}</div>
                          </div>
                        </div>
                        {ex.desc && <div className="ex-desc">{ex.desc}</div>}
                        <div className="ex-footer">
                          <div className="ex-tags">
                            <span className="ex-tag level">
                              {ex.level || "Inter."}
                            </span>
                            <span className="ex-tag dur">{ex.duration || "Flexible"}</span>
                            {isCoding && (
                              <span className="ex-tag level">
                                💻 Code
                              </span>
                            )}
                          </div>
                          {isMe ? (
                            <button className="connect-btn mine" onClick={() => handleDeleteEx(ex.id)}>Delete</button>
                          ) : (
                            <button className="connect-btn" onClick={() => openConnect(ex)}>Connect →</button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab Requests */}
        {activeTab === "requests" && (
          <div className="tab-content active">
            <div id="requestsList">
              {requests.length === 0 ? (
                <div className="empty-state">
                  <div className="ei">📬</div>
                  <p className="et">No requests yet.</p>
                </div>
              ) : (
                requests.map(r => (
                  <div key={r.id} className="request-card">
                    <div className="rc-top">
                      <div>
                        <div className="rc-title">From {r.fromName || "Student"}</div>
                        <div className="rc-from">{r.fromUniversity} · {timeAgo(r.createdAt)}</div>
                      </div>
                      <span className={`rc-status ${r.status}`}>{r.status}</span>
                    </div>
                    <div className="rc-skills">
                      <strong style={{ color: "white" }}>{r.offer}</strong> ↔ <strong style={{ color: "white" }}>{r.need}</strong>
                    </div>
                    <div className="rc-msg">"{r.message}"</div>
                    <div className="rc-actions">
                      {r.status === "pending" ? (
                        <>
                          <button className="btn-accept" onClick={() => openSchedule(r)}>✓ Accept &amp; Add Zoom</button>
                          <button className="btn-reject" onClick={() => handleDeclineRequest(r.id)}>Reject</button>
                        </>
                      ) : (
                        <span style={{ fontSize: "0.68rem", color: "var(--text-muted)" }}>Already {r.status}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab Sessions */}
        {activeTab === "sessions" && (
          <div className="tab-content active">
            <div id="sessionsList">
              {sessions.length === 0 ? (
                <div className="empty-state">
                  <div className="ei">📹</div>
                  <p className="et">No sessions yet.</p>
                </div>
              ) : (
                sessions.map(s => {
                  const iAmLearner = s.toUid === currentUser.uid;
                  const iAmTeacher = s.fromUid === currentUser.uid;
                  const withName = iAmLearner ? s.fromName : s.toName;
                  const now = new Date();
                  const sessStart = new Date(`${s.date}T${s.time}`);
                  const sessEnd = new Date(sessStart.getTime() + (s.durationHours || 1) * 3600000);
                  const upcoming = sessStart > now;
                  const ongoing = sessStart <= now && sessEnd > now;
                  const completed = sessEnd <= now;

                  const myConfirmed = s.sessionConfirmed?.[currentUser.uid];
                  const otherConfirmed = s.sessionConfirmed?.[iAmLearner ? s.fromUid : s.toUid];
                  const bothConfirmed = myConfirmed && otherConfirmed;
                  const myExamDone = s.examDone?.[currentUser.uid];
                  const myRated = s.rated?.[currentUser.uid];
                  const level = s.level || "Intermediate";

                  // count completed sessions of this skill for digital certificate
                  const skillExchangeCount = userData?.skillExchangeCounts?.[s.offer.toLowerCase().trim()] || 0;

                  return (
                    <div key={s.id} className="session-card">
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5, flexWrap: "wrap", gap: 5 }}>
                        <div className="session-title">{s.offer} ↔ {s.need}</div>
                        {upcoming ? (
                          <span style={{ fontSize: "0.6rem", color: "var(--cyan)", background: "rgba(0,212,255,0.12)", padding: "3px 8px", borderRadius: 3, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Upcoming</span>
                        ) : ongoing ? (
                          <span style={{ fontSize: "0.6rem", color: "#020024", background: "var(--cyan)", padding: "3px 8px", borderRadius: 3, fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>Live</span>
                        ) : (
                          <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Completed</span>
                        )}
                      </div>
                      <div className="session-with">with {withName} · <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.6rem", color: "var(--text-muted)" }}>{level}</span></div>
                      <div className="session-meta">
                        <div className="smr">📅 {s.date} at {s.time} ({s.durationHours}hr)</div>
                      </div>

                      {(upcoming || ongoing) && (
                        <div className="zoom-join-box">
                          <div className="zjb-header">
                            <div className="zjb-icon">🎥</div>
                            <div className="zjb-title">Zoom Meeting Ready</div>
                            <span className={`zjb-role ${iAmTeacher ? "teacher" : "learner"}`}>{iAmTeacher ? "YOU ARE TEACHER" : "YOU ARE LEARNER"}</span>
                          </div>
                          {iAmTeacher ? (
                            <div className="teacher-join-instruction">
                              <strong>Your steps as teacher:</strong>
                              <ol>
                                <li>Click the button below — it opens your Zoom meeting</li>
                                <li>Tap <strong>"Start Meeting"</strong> in Zoom</li>
                                <li>Wait for your learner to join — then begin teaching</li>
                              </ol>
                              <button className="zoom-open-btn teacher-start" onClick={() => openSafety(s, true)}>🎥 Start Zoom Meeting →</button>
                            </div>
                          ) : (
                            <div className="learner-join-instruction">
                              <strong>⚠️ Wait for teacher to start first!</strong> The teacher ({s.fromName || "your partner"}) must click "Start Meeting" in their Zoom app before you can join.<br /><br />
                              Once they've started, click the button below:
                              <button className="zoom-open-btn" onClick={() => openSafety(s, false)}>🎥 Join Zoom Meeting →</button>
                            </div>
                          )}
                          <div className="zoom-id-display">Meeting ID: <span>{displayZoomId(s.zoomMeetingId)}</span>{s.zoomPassword && <> · Password: <span>{s.zoomPassword}</span></>}</div>
                        </div>
                      )}

                      <div className="session-actions">
                        {completed && !myConfirmed && (
                          <button className="confirm-session-btn" onClick={() => confirmSessionDone(s.id)}>✅ Confirm Session Done</button>
                        )}
                        {completed && myConfirmed && !otherConfirmed && (
                          <span style={{ fontSize: "0.66rem", color: "var(--text-secondary)" }}>⏳ Waiting for {withName} to confirm...</span>
                        )}
                        {completed && bothConfirmed && iAmLearner && !myExamDone && (
                          <button className="take-exam-btn" onClick={() => navigate("/exam", { state: { sessionId: s.id, skill: s.offer, teacherName: s.fromName, level: s.level } })}>📝 Take Exam &amp; Earn Coins</button>
                        )}
                        {completed && bothConfirmed && iAmTeacher && !myExamDone && (
                          <span style={{ fontSize: "0.66rem", color: "var(--text-secondary)" }}>✓ Teacher — no exam. Waiting for learner to take exam + rate you for your bonus coins.</span>
                        )}
                        {myExamDone && iAmLearner && !myRated && (
                          <button className="rate-btn" onClick={() => openRating(s)}>⭐ Rate Your Teacher</button>
                        )}
                        {myExamDone && iAmLearner && myRated && (
                          <span style={{ fontSize: "0.66rem", color: "var(--cyan)" }}>✓ All done · Coins credited</span>
                        )}
                        {myExamDone && iAmLearner && (
                          <div className="cert-progress-bar">
                            <div className="cert-prog-label">🏆 "{s.offer}" Certificate: {Math.min(skillExchangeCount, 5)}/5 exchanges</div>
                            <div className="cert-prog-track"><div className="cert-prog-fill" style={{ width: `${Math.min((skillExchangeCount / 5) * 100, 100)}%` }} /></div>
                            {skillExchangeCount >= 5 ? (
                              <div style={{ color: "var(--cyan)", fontSize: "0.68rem", marginTop: 4 }}>✅ Certificate unlocked! Check your profile.</div>
                            ) : (
                              <div style={{ color: "var(--text-muted)", fontSize: "0.62rem", marginTop: 3 }}>{5 - skillExchangeCount} more exchange{5 - skillExchangeCount !== 1 ? "s" : ""} to unlock certificate</div>
                            )}
                          </div>
                        )}
                      </div>

                      {completed && (
                        <div className="confirm-status">
                          {myConfirmed ? "✅ You confirmed" : "⬜ You haven't confirmed"} · {otherConfirmed ? `✅ ${withName} confirmed` : `⬜ ${withName} hasn't confirmed`}
                          {!myConfirmed && <><br /><span style={{ color: "var(--text-secondary)", fontSize: "0.66rem" }}>Both must confirm before exam unlocks</span></>}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab Post */}
        {activeTab === "post" && (
          <div className="tab-content active">
            <form className="post-card fade-up d2 in" onSubmit={handlePostRequest}>

              <div className="field-row">
                <div className="field">
                  <label>I Can Teach *</label>
                  <input
                    type="text"
                    placeholder="e.g. Python, UI Design"
                    value={offerSkill}
                    onChange={e => setOfferSkill(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label>I Want to Learn *</label>
                  <input
                    type="text"
                    placeholder="e.g. Video Editing, SQL"
                    value={needSkill}
                    onChange={e => setNeedSkill(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label>My Level</label>
                  <select value={skillLevel} onChange={e => setSkillLevel(e.target.value)}>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="field">
                  <label>Duration</label>
                  <select value={duration} onChange={e => setDuration(e.target.value)}>
                    <option value="1 Session">1 Session (~1hr)</option>
                    <option value="1 Week">1 Week</option>
                    <option value="2 Weeks">2 Weeks</option>
                    <option value="1 Month">1 Month</option>
                  </select>
                </div>
              </div>
              <div className="field">
                <label>Description (optional)</label>
                <textarea
                  placeholder="Tell others what you'll teach and what you want to learn..."
                  value={postDesc}
                  onChange={e => setPostDesc(e.target.value)}
                />
              </div>
              <button type="submit" className="post-btn" disabled={postingRequest}>
                {postingRequest ? "Posting..." : "Post Request →"}
              </button>
            </form>
          </div>
        )}
      </div>

      <BottomNav />

      {/* CONNECT MODAL */}
      {connectModalOpen && connectTarget && (
        <div className="modal-bg open">
          <div className="modal">
            <div className="modal-stripe" />
            <div className="modal-in">
              <button className="mc" onClick={() => setConnectModalOpen(false)}>✕</button>
              <div className="modal-tag">🔄 Exchange Request</div>
              <div className="modal-title">Connect with {connectTarget.name || "Student"}</div>
              <div className="modal-sub">{connectTarget.offer} ↔ {connectTarget.need} · {connectTarget.level} · {connectTarget.duration}</div>

              <div id="cSwapBox" style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.08)", borderRadius: 4, padding: 13, marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", textTransform: "uppercase", color: "var(--cyan)", marginBottom: 3, letterSpacing: "0.08em" }}>They Offer</div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700 }}>{connectTarget.offer}</div>
                  </div>
                  <div style={{ opacity: 0.2, color: "var(--cyan)" }}>⇄</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", textTransform: "uppercase", color: "var(--text-secondary)", marginBottom: 3, letterSpacing: "0.08em" }}>They Need</div>
                    <div style={{ fontSize: "0.84rem", fontWeight: 700 }}>{connectTarget.need}</div>
                  </div>
                </div>
              </div>

              <div className="field">
                <label>Your Message *</label>
                <textarea
                  placeholder="Hi! I'm interested in this exchange..."
                  value={connectMsg}
                  onChange={e => setConnectMsg(e.target.value)}
                />
              </div>
              <button className="send-req-btn" disabled={sendingRequest} onClick={handleSendConnectRequest}>
                {sendingRequest ? "Sending..." : "Send Request →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SCHEDULE MODAL */}
      {scheduleModalOpen && scheduleTarget && (
        <div className="modal-bg open">
          <div className="modal">
            <div className="modal-stripe" />
            <div className="modal-in">
              <button className="mc" onClick={() => setScheduleModalOpen(false)}>✕</button>
              <div className="modal-tag">📅 Schedule Session</div>
              <div className="modal-title">Set Time + Add Zoom</div>
              <div className="modal-sub">With {scheduleTarget.fromName} — {scheduleTarget.offer} ↔ {scheduleTarget.need}</div>

              <div className="field"><label>Date *</label><input type="date" value={sessDate} onChange={e => setSessDate(e.target.value)} /></div>
              <div className="field"><label>Time *</label><input type="time" value={sessTime} onChange={e => setSessTime(e.target.value)} /></div>
              <div className="field">
                <label>Duration</label>
                <select value={sessDuration} onChange={e => setSessDuration(e.target.value)}>
                  <option value="1">1 Hour</option>
                  <option value="1.5">1.5 Hours</option>
                  <option value="2">2 Hours</option>
                </select>
              </div>

              <div className="zoom-step-box">
                <div className="zsb-title">🎥 Add Your Zoom Meeting ID</div>
                <div className="zsb-step"><div class="zsb-num">1</div><div>Open <strong>Zoom app</strong> → tap <strong>"New Meeting"</strong> → start it</div></div>
                <div className="zsb-step"><div class="zsb-num">2</div><div>You'll see your <strong>Meeting ID</strong> at the top (9–11 digits) — copy it</div></div>
                <div className="zsb-step"><div class="zsb-num">3</div><div>Paste below. Your partner gets a direct join link — <strong>no typing needed</strong></div></div>

                <div className="field" style={{ margin: "10px 0 8px" }}>
                  <label>Zoom Meeting ID * <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.56rem", color: "var(--muted)" }}>(digits only, 9–11 digits)</span></label>
                  <div className="zoom-id-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. 123 456 7890"
                      maxLength="15"
                      inputMode="numeric"
                      value={zoomIdInput}
                      onChange={e => handleZoomIdChange(e.target.value)}
                    />
                  </div>
                  {zoomIdError && <div className="zoom-id-status err">{zoomIdError}</div>}
                  {zoomIdOk && <div className="zoom-id-status ok">{zoomIdOk}</div>}
                </div>

                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Password <span style={{ fontWeight: 400, textTransform: "none", fontSize: "0.56rem", color: "var(--muted)" }}>(optional)</span></label>
                  <input
                    type="text"
                    placeholder="Leave blank if no password set"
                    value={zoomPassword}
                    onChange={e => setZoomPassword(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.08)", borderRadius: 4, padding: "10px 12px", marginBottom: 14, fontSize: "0.68rem", color: "var(--text-secondary)", lineHeight: "1.65" }}>
                📝 Only the <strong>learner</strong> takes the exam — not you as teacher.<br />
                🏆 Certificate after <strong>5 exchanges on same skill</strong>.
              </div>

              <button className="schedule-btn" disabled={savingSchedule || !!zoomIdError || !zoomIdInput} onClick={handleSaveSchedule}>
                {savingSchedule ? "Saving..." : "Confirm & Share Zoom Link →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAFETY MODAL */}
      {safetyModalOpen && safetySession && (
        <div className="modal-bg open">
          <div className="modal">
            <div className="modal-stripe" />
            <div className="modal-in">
              <button className="mc" onClick={() => setSafetyModalOpen(false)}>✕</button>
              <div className="modal-tag">🛡️ Safety · Zoom Session</div>
              <div className="modal-title">Before You Join</div>

              <div className="safety-item"><div className="safety-icon">🚫</div><div className="safety-text"><strong>18+ Content Strictly Prohibited</strong> — Immediate ban and account termination.</div></div>
              <div className="safety-item"><div className="safety-icon">🎓</div><div className="safety-text"><strong>Educational Only</strong> — Stay focused on the skill. Professional conduct always.</div></div>
              <div className="safety-item"><div className="safety-icon"></div><div className="safety-text"><strong>No Recording</strong> — Recording without consent is prohibited and reportable.</div></div>
              <div className="safety-item"><div className="safety-icon">⚠️</div><div className="safety-text"><strong>Report Violations</strong> — End the meeting and email <strong>zwapyteam@gmail.com</strong>.</div></div>

              <div style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.08)", borderRadius: 4, padding: 10, margin: "12px 0", fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.55rem", letterSpacing: "0.1em", color: "var(--cyan)", marginBottom: 4 }}>// PEER SAFETY TIP</div>
                <div>{geminiSafetyTip}</div>
              </div>

              <div className="zoom-info-box">
                <strong>🎥 Zoom Meeting</strong>
                <div className="zoom-room-id">{displayZoomId(safetySession.zoomMeetingId)}</div>
                {safetySession.zoomPassword && (
                  <div style={{ fontSize: "0.68rem", color: "var(--text-secondary)", marginBottom: 4 }}>Password: <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{safetySession.zoomPassword}</span></div>
                )}
                <div style={{ fontSize: "0.66rem", color: "var(--text-muted)" }}>Click the button below — it opens Zoom directly. No need to copy or type anything.</div>
              </div>

              {safetyIsTeacher ? (
                <div style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.15)", borderRadius: 4, padding: "10px 12px", marginBottom: 12, fontSize: "0.7rem", color: "var(--cyan)", lineHeight: "1.65" }}>
                  👨‍🏫 <strong>You are the TEACHER.</strong> Make sure you <strong>Start</strong> the meeting in Zoom first, then wait for your learner to join.
                </div>
              ) : (
                <div style={{ background: "transparent", border: "1px solid rgba(0,212,255,0.08)", borderRadius: 4, padding: "10px 12px", marginBottom: 12, fontSize: "0.7rem", color: "var(--text-secondary)", lineHeight: "1.65" }}>
                  📖 <strong>You are the LEARNER.</strong> The teacher must <strong>start the meeting first</strong>. Then click the button below to join.
                </div>
              )}

              <div className="safety-agree-row">
                <input type="checkbox" checked={safetyAgree} onChange={e => setSafetyAgree(e.target.checked)} />
                <div className="safety-agree-text">I agree to Zwapy's safety guidelines. This session is for educational purposes only.</div>
              </div>

              <button className={`safety-launch-btn${safetyIsTeacher ? " teacher" : ""}`} disabled={!safetyAgree} onClick={launchZoom}>
                {safetyIsTeacher ? "🎥 Start Zoom Meeting →" : "🎥 Join Zoom Meeting →"}
              </button>
              <p style={{ fontSize: "0.58rem", color: "var(--text-muted)", marginTop: 6, textAlign: "center" }}>Opens zoom.us directly. If Zoom app is installed it will launch automatically.</p>
            </div>
          </div>
        </div>
      )}

      {/* RATING MODAL */}
      {ratingModalOpen && ratingSession && (
        <div className="modal-bg open">
          <div className="modal">
            <div className="modal-stripe" />
            <div className="modal-in">
              <button className="mc" onClick={() => setRatingModalOpen(false)}>✕</button>
              <div className="modal-tag">⭐ Rate Your Teacher</div>
              <div className="modal-title">How was the session?</div>
              <div className="modal-sub">Rating {ratingSession.fromName}</div>

              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(v => (
                  <span
                    key={v}
                    className={`star${v <= currentStars ? " active" : ""}`}
                    onClick={() => setCurrentStars(v)}
                    style={{ fontSize: "1.8rem", cursor: "pointer", marginRight: "8px" }}
                  >
                    ⭐
                  </span>
                ))}
              </div>

              {currentStars > 0 && (
                <div style={{ fontSize: "0.76rem", color: "var(--cyan)", marginTop: 8, fontWeight: 700 }}>
                  Teacher will earn +{getTeacherCoins(ratingSession.level || "Intermediate", currentStars)} coins
                </div>
              )}

              <button className="rating-btn" disabled={currentStars === 0 || ratingSubmitting} onClick={handleSubmitRating}>
                {ratingSubmitting ? "Submitting..." : "Submit Rating →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
