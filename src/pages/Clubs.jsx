import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, isSameUniversity } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import "./Clubs.css";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function typeColor(t) {
  if (t === "hackathon") return "#f59e0b";
  if (t === "announcement") return "#818cf8";
  return "#00D4FF";
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function fmtFull(s) {
  if (!s) return "";
  return new Date(s + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
}

function fmtShort(s) {
  if (!s) return { day: "", month: "" };
  const d = new Date(s + "T00:00:00");
  return {
    day: d.getDate(),
    month: d.toLocaleString("en-IN", { month: "short" })
  };
}

export default function Clubs() {
  const navigate = useNavigate();
  const { currentUser, userData, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allPosts, setAllPosts] = useState([]);
  const [joinedEvents, setJoinedEvents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(toDateStr(new Date()));
  const [pageLoading, setPageLoading] = useState(true);
  const [notifBannerOpen, setNotifBannerOpen] = useState(true);

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  // Load Data
  const loadClubsAndPosts = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch user data for joined events
      let profile = null;
      try {
        const uSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (uSnap.exists()) {
          profile = uSnap.data();
        }
      } catch (err) {
        console.warn("Firestore user load failed, using local offline fallback:", err);
      }

      if (!profile) {
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        profile = localUsers[currentUser.uid] || userData || {};
      }

      setJoinedEvents(profile.joinedEvents || []);
      if (profile.fcmToken) {
        setNotifBannerOpen(false);
      }

      const userUni = profile.university || "";

      // 2. Fetch clubs
      let clubsList = [];
      try {
        const clubsSnap = await getDocs(collection(db, "clubs"));
        if (clubsSnap && clubsSnap.docs) {
          clubsSnap.docs.forEach((cd) => {
            clubsList.push({ id: cd.id, ...cd.data() });
          });
        }
      } catch (err) {
        console.warn("Firestore clubs fetch failed, checking local database offline fallback:", err);
        const localClubs = JSON.parse(localStorage.getItem("zwapy_local_clubs") || "{}");
        Object.keys(localClubs).forEach((cid) => {
          clubsList.push({ id: cid, ...localClubs[cid] });
        });
      }

      // Filter clubs matching student university
      const matchedClubs = clubsList.filter((club) => isSameUniversity(userUni, club.university));

      // 3. Fetch club posts in parallel
      const postsList = [];
      const promises = matchedClubs.map(async (club) => {
        try {
          let psDocs = [];
          try {
            const ps = await getDocs(collection(db, "clubs", club.id, "posts"));
            psDocs = ps.docs || [];
          } catch (pe) {
            // Fallback to local posts
            const localPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${club.id}`) || "[]");
            psDocs = localPosts.map((p, idx) => ({ id: p.id || `p-${idx}`, data: () => p }));
          }

          const clubPosts = [];
          psDocs.forEach((pd) => {
            clubPosts.push({
              id: pd.id,
              clubId: club.id,
              clubName: club.name || club.clubName || "Club",
              ...pd.data()
            });
          });
          return clubPosts;
        } catch {
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach((arr) => arr.forEach((p) => postsList.push(p)));

      // Sort posts by date
      postsList.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });

      setAllPosts(postsList);
    } catch (e) {
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadClubsAndPosts();
  }, [currentUser]);

  // Handle Month Switch
  const prevMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() - 1);
    setCurrentDate(d);
  };

  const nextMonth = () => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + 1);
    setCurrentDate(d);
  };

  // Join Event
  const handleJoinEvent = async (postId) => {
    if (!currentUser) return;
    if (joinedEvents.includes(postId)) {
      alert("⚠️ Already joined this event.");
      return;
    }
    const p = allPosts.find(x => x.id === postId);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        joinedEvents: arrayUnion(postId)
      });
      await addDoc(collection(db, "users", currentUser.uid, "activity"), {
        title: "Joined an event",
        desc: `— ${p?.title || ""}`,
        createdAt: serverTimestamp()
      });
      setJoinedEvents(prev => [...prev, postId]);
      alert("🎉 Joined successfully! You will be notified of updates.");
    } catch (err) {
      console.error(err);
    }
  };

  // FCM dynamic import & push register
  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) {
      alert("⚠️ Notifications are not supported in your browser.");
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm !== "granted") {
      alert("⚠️ Notification permission was denied.");
      return;
    }
    try {
      const { getMessaging, getToken } = await import("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging.js");
      const messaging = getMessaging();
      const token = await getToken(messaging, { vapidKey: "YOUR_VAPID_KEY_HERE" });
      if (token) {
        await updateDoc(doc(db, "users", currentUser.uid), { fcmToken: token });
        alert("🔔 Notifications enabled!");
        setNotifBannerOpen(false);
      }
    } catch (err) {
      alert("❌ Could not enable notifications: " + err.message);
    }
  };

  // Build Calendar grid cells
  const buildCalendarCells = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();

    const firstDayIndex = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const prevLastDate = new Date(y, m, 0).getDate();
    const today = new Date();

    const postsMap = {};
    allPosts.forEach(p => {
      if (p.date) {
        if (!postsMap[p.date]) postsMap[p.date] = [];
        postsMap[p.date].push(p);
      }
    });

    const cells = [];

    // Previous month cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: prevLastDate - i,
        isCurrentMonth: false,
        dateStr: "",
        posts: []
      });
    }

    // Current month cells
    for (let d = 1; d <= lastDate; d++) {
      const dateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isToday = d === today.getDate() && m === today.getMonth() && y === today.getFullYear();
      const posts = postsMap[dateStr] || [];

      cells.push({
        dayNum: d,
        isCurrentMonth: true,
        dateStr,
        isToday,
        posts
      });
    }

    // Next month cells
    const totalCells = cells.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      cells.push({
        dayNum: i,
        isCurrentMonth: false,
        dateStr: "",
        posts: []
      });
    }

    return cells;
  };

  const cells = buildCalendarCells();
  const selectedDayPosts = allPosts.filter(p => p.date === selectedDate);

  // Filter future upcoming events
  const todayStr = toDateStr(new Date());
  const upcomingEvents = allPosts
    .filter(p => p.date && p.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 8);

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading club calendar...</div>
      </div>
    );
  }

  return (
    <div className="clubs-body">
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

        <div className="page-head fade-up d1 in">
          <div className="page-label">// Campus Events</div>
          <h1 className="page-title">Club <span>Calendar</span></h1>
          <p className="page-sub">All events, hackathons and announcements from your campus clubs.</p>
        </div>

        {/* NOTIF BANNER */}
        {notifBannerOpen && (
          <div className="notif-banner fade-up d1 in">
            <div className="notif-text"><strong>🔔 Get notified</strong> when clubs post new events and hackathons.</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button className="notif-allow" onClick={handleEnableNotifications}>Enable</button>
              <button className="notif-dismiss" onClick={() => setNotifBannerOpen(false)}>✕</button>
            </div>
          </div>
        )}

        {/* CALENDAR */}
        <div className="cal-card fade-up d2 in">
          <div className="month-nav">
            <div className="month-arrow" onClick={prevMonth}>‹</div>
            <div className="month-label">
              <div className="month-name">{MONTHS[currentDate.getMonth()]}</div>
              <div className="month-year">{currentDate.getFullYear()}</div>
            </div>
            <div className="month-arrow" onClick={nextMonth}>›</div>
          </div>
          <div className="day-headers">
            <div className="day-hdr">Sun</div><div className="day-hdr">Mon</div><div className="day-hdr">Tue</div>
            <div className="day-hdr">Wed</div><div className="day-hdr">Thu</div><div className="day-hdr">Fri</div>
            <div className="day-hdr">Sat</div>
          </div>
          <div className="cal-grid">
            {cells.map((cell, index) => {
              if (!cell.isCurrentMonth) {
                return (
                  <div key={index} className="cal-cell other-month">
                    <span className="cnum">{cell.dayNum}</span>
                  </div>
                );
              }

              const isSel = cell.dateStr === selectedDate;
              return (
                <div
                  key={index}
                  className={`cal-cell${cell.isToday ? " today" : ""}${isSel ? " selected" : ""}${cell.posts.length ? " has-events" : ""}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                >
                  <span className="cnum">{cell.dayNum}</span>
                  {cell.posts.length > 0 && (
                    <div className="cdots">
                      {cell.posts.slice(0, 3).map((p, pidx) => (
                        <div key={pidx} className="cdot" style={{ background: typeColor(p.type) }} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* EVENTS FOR SELECTED DAY */}
        <div className="events-panel fade-up d3 in">
          <div className="panel-head">
            <div className="panel-title">Events</div>
            <div className="panel-date">{selectedDate ? fmtFull(selectedDate) : "Tap a date"}</div>
          </div>
          <div id="eventsList">
            {selectedDayPosts.length === 0 ? (
              <div className="empty">
                <div className="empty-i">📭</div>
                <p>No events on this day.</p>
              </div>
            ) : (
              selectedDayPosts.map(p => {
                const col = typeColor(p.type);
                const jned = joinedEvents.includes(p.id);
                return (
                  <div key={p.id} className="event-item">
                    <div className="event-bar" style={{ background: `linear-gradient(90deg, ${col}, transparent)` }} />
                    <div className="event-body">
                      <span className="event-pill" style={{ background: `${col}18`, border: `1px solid ${col}33`, color: col }}>
                        {p.type || "event"}
                      </span>
                      {p.posterUrl && (
                        <img className="event-poster" src={p.posterUrl} alt="poster" />
                      )}
                      <div className="event-title">{p.title || "Untitled"}</div>
                      <div className="event-club">🛡️ {p.clubName || "Club"}</div>
                      {p.desc && <div className="event-desc">{p.desc}</div>}
                      <div className="event-meta">
                        {p.time && <div className="emr">🕐 {p.time}</div>}
                        {p.venue && <div className="emr">📍 {p.venue}</div>}
                      </div>
                      <div className="event-actions">
                        <button
                          className={`join-btn${jned ? " joined" : ""}`}
                          onClick={() => handleJoinEvent(p.id)}
                          disabled={jned}
                        >
                          {jned ? "✓ Joined" : "Join Event"}
                        </button>
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noopener noreferrer" className="link-btn">Details →</a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* UPCOMING */}
        <div className="upcoming-card fade-up d4 in">
          <div className="upcoming-head">
            <div className="upcoming-title">Upcoming Events</div>
            <div className="upcoming-badge" id="upCount">{upcomingEvents.length}</div>
          </div>
          <div id="upList">
            {upcomingEvents.length === 0 ? (
              <div className="empty">
                <div className="empty-i">🗓️</div>
                <p>No upcoming events yet.</p>
              </div>
            ) : (
              upcomingEvents.map(p => {
                const col = typeColor(p.type);
                const s = fmtShort(p.date);
                return (
                  <div key={p.id} className="up-item" onClick={() => setSelectedDate(p.date)}>
                    <div className="up-date">
                      <div className="up-day">{s.day}</div>
                      <div className="up-month">{s.month}</div>
                    </div>
                    <div className="up-info">
                      <div className="up-title">{p.title || "Untitled"}</div>
                      <div className="up-club">{p.clubName || "Club"}{p.time ? ` · ${p.time}` : ""}</div>
                    </div>
                    <span className="up-pill" style={{ background: `${col}18`, border: `1px solid ${col}33`, color: col }}>
                      {p.type || "event"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
