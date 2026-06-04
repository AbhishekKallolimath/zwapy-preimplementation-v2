import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp, query, orderBy, limit } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./AdminDashboard.css";

const SUPER_ADMIN_UID = "MsCKd4jawaahdCaAGNN1LnticUE2";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, logout } = useAuth();

  const [activeTab, setActiveTab] = useState("users");
  const [userFilter, setUserFilter] = useState("all");
  const [userSearch, setUserSearch] = useState("");
  const [exSearch, setExSearch] = useState("");

  const [allUsers, setAllUsers] = useState([]);
  const [allExchanges, setAllExchanges] = useState([]);
  const [allClubs, setAllClubs] = useState([]);
  const [officialEvents, setOfficialEvents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  // Post Event Form State
  const [evType, setEvType] = useState("event");
  const [evTitle, setEvTitle] = useState("");
  const [evDesc, setEvDesc] = useState("");
  const [evDate, setEvDate] = useState("");
  const [evTime, setEvTime] = useState("");
  const [evVenue, setEvVenue] = useState("");
  const [evLink, setEvLink] = useState("");
  const [evPoster, setEvPoster] = useState("");
  const [evPrice, setEvPrice] = useState("");
  const [evSeats, setEvSeats] = useState("");
  const [evUpiId, setEvUpiId] = useState("");
  const [postingEvent, setPostingEvent] = useState(false);

  // Broadcast Announcement Form State
  const [annTitle, setAnnTitle] = useState("");
  const [annDesc, setAnnDesc] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);

  // Modal Editing User Role State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null); // { uid, name, role }
  const [modalRole, setModalRole] = useState("student");

  const [stats, setStats] = useState({ total: 0, students: 0, clubHeads: 0, coins: 0 });
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("#10b981");
  const [pageLoading, setPageLoading] = useState(true);

  // Show Toast
  const showToast = (msg, col = "#10b981") => {
    setToastMsg(msg);
    setToastColor(col);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Auth & Guard Checks
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate("/login");
      } else {
        const activeRole = userData?.role || currentUser?.role;
        const uid = currentUser.uid;
        if (activeRole !== "super_admin" && uid !== SUPER_ADMIN_UID) {
          navigate("/dashboard");
        }
      }
    }
  }, [currentUser, userData, loading, navigate]);

  // Load all dashboard records
  useEffect(() => {
    if (!currentUser) return;

    async function loadData() {
      try {
        const uid = currentUser.uid;
        const isMock = uid.startsWith("mock-uid-");

        // 1. Users
        let loadedUsers = [];
        if (!isMock) {
          try {
            const snap = await getDocs(collection(db, "users"));
            snap.forEach((d) => loadedUsers.push({ uid: d.id, ...d.data() }));
          } catch (e) {
            console.warn("Firestore user fetch failed, checking local database fallback:", e);
            loadedUsers = fetchLocalUsers();
          }
        } else {
          loadedUsers = fetchLocalUsers();
        }
        loadedUsers.sort((a, b) => {
          const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setAllUsers(loadedUsers);
        calculateStats(loadedUsers);

        // 2. Exchanges
        let loadedExchanges = [];
        if (!isMock) {
          try {
            const es = await getDocs(collection(db, "exchanges"));
            es.forEach((d) => loadedExchanges.push({ id: d.id, ...d.data() }));
          } catch (e) {
            loadedExchanges = fetchLocalExchanges();
          }
        } else {
          loadedExchanges = fetchLocalExchanges();
        }
        setAllExchanges(loadedExchanges);

        // 3. Clubs
        let loadedClubs = [];
        if (!isMock) {
          try {
            const cs = await getDocs(collection(db, "clubs"));
            cs.forEach((d) => loadedClubs.push({ id: d.id, ...d.data() }));
          } catch (e) {
            loadedClubs = fetchLocalClubs();
          }
        } else {
          loadedClubs = fetchLocalClubs();
        }
        setAllClubs(loadedClubs);

        // 4. Official Events
        let loadedEvents = [];
        if (!isMock) {
          try {
            const evs = await getDocs(collection(db, "zwapy_events"));
            evs.forEach((d) => loadedEvents.push({ id: d.id, ...d.data() }));
          } catch (e) {
            loadedEvents = fetchLocalEventsList();
          }
        } else {
          loadedEvents = fetchLocalEventsList();
        }
        loadedEvents.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOfficialEvents(loadedEvents);

        // 5. Announcements
        let loadedAnnouncements = [];
        if (!isMock) {
          try {
            const snap = await getDocs(collection(db, "announcements"));
            snap.forEach((d) => loadedAnnouncements.push({ id: d.id, ...d.data() }));
          } catch (e) {
            loadedAnnouncements = fetchLocalAnnouncements();
          }
        } else {
          loadedAnnouncements = fetchLocalAnnouncements();
        }
        loadedAnnouncements.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAnnouncements(loadedAnnouncements);

      } catch (err) {
        console.error("Error loading admin dashboard records:", err);
      } finally {
        setPageLoading(false);
      }
    }

    loadData();
  }, [currentUser]);

  // Local Storage Fetch Fallbacks
  const fetchLocalUsers = () => {
    const local = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
    return Object.keys(local).map((k) => ({ uid: k, ...local[k] }));
  };

  const fetchLocalExchanges = () => {
    return JSON.parse(localStorage.getItem("zwapy_local_exchanges") || "[]");
  };

  const fetchLocalClubs = () => {
    const local = JSON.parse(localStorage.getItem("zwapy_local_clubs") || "{}");
    return Object.keys(local).map((k) => ({ id: k, ...local[k] }));
  };

  const fetchLocalEventsList = () => {
    return JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
  };

  const fetchLocalAnnouncements = () => {
    return JSON.parse(localStorage.getItem("zwapy_local_announcements") || "[]");
  };

  // Stats Calculation
  const calculateStats = (users) => {
    let total = 0, students = 0, clubHeads = 0, coins = 0;
    users.forEach((u) => {
      total++;
      if ((u.role || "student") === "student") students++;
      else if (u.role === "club_head") clubHeads++;
      coins += (u.coins || 0);
    });
    setStats({ total, students, clubHeads, coins });
  };

  // Date Formatting
  const fmtDate = (ts) => {
    if (!ts) return "—";
    if (ts.seconds) {
      return new Date(ts.seconds * 1000).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
    return new Date(ts).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  };

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  // User Actions
  const openRoleModal = (user) => {
    setEditingUser(user);
    setModalRole(user.role || "student");
    setRoleModalOpen(true);
  };

  const saveUserRole = async () => {
    if (!editingUser) return;
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    try {
      if (isMock) {
        const local = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        if (local[editingUser.uid]) {
          local[editingUser.uid].role = modalRole;
          localStorage.setItem("zwapy_local_users", JSON.stringify(local));
        }
      } else {
        await updateDoc(doc(db, "users", editingUser.uid), { role: modalRole });
      }

      // Update local state
      const updated = allUsers.map((u) => u.uid === editingUser.uid ? { ...u, role: modalRole } : u);
      setAllUsers(updated);
      calculateStats(updated);
      setRoleModalOpen(false);
      showToast("✅ Role updated successfully!");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to update role");
    }
  };

  const deleteUser = async (uId) => {
    if (!window.confirm("Are you sure you want to delete this user permanently?")) return;
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    try {
      if (isMock) {
        const local = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        delete local[uId];
        localStorage.setItem("zwapy_local_users", JSON.stringify(local));
      } else {
        await deleteDoc(doc(db, "users", uId));
      }

      const updated = allUsers.filter((u) => u.uid !== uId);
      setAllUsers(updated);
      calculateStats(updated);
      showToast("🗑️ User deleted", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to delete user");
    }
  };

  // Official Event Publisher
  const handlePostEvent = async (e) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      showToast("❌ Please add a title", "#ef4444");
      return;
    }

    setPostingEvent(true);
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    const newEvent = {
      title: evTitle.trim(),
      desc: evDesc.trim(),
      type: evType,
      date: evDate,
      time: evTime,
      venue: evVenue.trim(),
      link: evLink.trim(),
      posterUrl: evPoster.trim(),
      price: parseFloat(evPrice) || 0,
      totalSeats: parseInt(evSeats) || 0,
      upiId: evUpiId.trim() || "zwapyteam@upi",
      soldCount: 0,
      organizer: "Zwapy Team",
      organizerUid: "zwapy_official",
      postedBy: "Zwapy Team",
      createdAt: new Date().toISOString()
    };

    try {
      if (isMock) {
        newEvent.id = "ev-" + Date.now();
        const localEv = JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
        localEv.unshift(newEvent);
        localStorage.setItem("zwapy_local_events", JSON.stringify(localEv));
        setOfficialEvents(localEv);
      } else {
        await addDoc(collection(db, "zwapy_events"), {
          ...newEvent,
          createdAt: serverTimestamp()
        });
        // Reload events
        const snap = await getDocs(collection(db, "zwapy_events"));
        const evArray = [];
        snap.forEach((d) => evArray.push({ id: d.id, ...d.data() }));
        evArray.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOfficialEvents(evArray);
      }

      setEvTitle("");
      setEvDesc("");
      setEvDate("");
      setEvTime("");
      setEvVenue("");
      setEvLink("");
      setEvPoster("");
      setEvPrice("");
      setEvSeats("");
      setEvUpiId("");
      showToast("✅ Official event posted successfully!");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to post event");
    } finally {
      setPostingEvent(false);
    }
  };

  const deleteOfficialEvent = async (evId) => {
    if (!window.confirm("Are you sure you want to delete this event?")) return;
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    try {
      if (isMock) {
        const localEv = JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
        const updated = localEv.filter((e) => e.id !== evId);
        localStorage.setItem("zwapy_local_events", JSON.stringify(updated));
        setOfficialEvents(updated);
      } else {
        await deleteDoc(doc(db, "zwapy_events", evId));
        setOfficialEvents(officialEvents.filter((e) => e.id !== evId));
      }
      showToast("🗑️ Deleted official event", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to delete event");
    }
  };

  // Exchanges Actions
  const deleteExchange = async (exId) => {
    if (!window.confirm("Are you sure you want to remove this exchange offer?")) return;
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    try {
      if (isMock) {
        const local = JSON.parse(localStorage.getItem("zwapy_local_exchanges") || "[]");
        const updated = local.filter((x) => x.id !== exId);
        localStorage.setItem("zwapy_local_exchanges", JSON.stringify(updated));
        setAllExchanges(updated);
      } else {
        await deleteDoc(doc(db, "exchanges", exId));
        setAllExchanges(allExchanges.filter((x) => x.id !== exId));
      }
      showToast("🗑️ Exchange removed", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to remove exchange");
    }
  };

  // Broadcast Broadcast Announcements
  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annDesc.trim()) {
      showToast("❌ Please fill in both fields", "#ef4444");
      return;
    }

    setPostingAnn(true);
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    try {
      const newAnn = {
        title: annTitle.trim(),
        desc: annDesc.trim(),
        createdAt: new Date().toISOString()
      };

      const students = allUsers.filter((u) => (u.role || "student") === "student");

      if (isMock) {
        // Broad cast locally inside activity collections
        newAnn.id = "ann-" + Date.now();
        const localAnn = JSON.parse(localStorage.getItem("zwapy_local_announcements") || "[]");
        localAnn.unshift(newAnn);
        localStorage.setItem("zwapy_local_announcements", JSON.stringify(localAnn));
        setAnnouncements(localAnn);

        // Seed mock student alerts
        students.forEach((s) => {
          const userActivity = JSON.parse(localStorage.getItem(`zwapy_activity_${s.uid}`) || "[]");
          userActivity.unshift({
            id: "act-" + Date.now(),
            title: `📢 Zwapy: ${annTitle.trim()}`,
            desc: `— ${annDesc.trim()}`,
            createdAt: new Date().toISOString()
          });
          localStorage.setItem(`zwapy_activity_${s.uid}`, JSON.stringify(userActivity));
        });

      } else {
        // Save to Firebase Database
        await addDoc(collection(db, "announcements"), {
          ...newAnn,
          createdAt: serverTimestamp()
        });

        // Broadcast Firestore subcollections
        for (const s of students) {
          try {
            await addDoc(collection(db, "users", s.uid, "activity"), {
              title: `📢 Zwapy: ${annTitle.trim()}`,
              desc: `— ${annDesc.trim()}`,
              createdAt: serverTimestamp()
            });
          } catch (e) {}
        }

        // Reload
        const snap = await getDocs(collection(db, "announcements"));
        const annArray = [];
        snap.forEach((d) => annArray.push({ id: d.id, ...d.data() }));
        annArray.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAnnouncements(annArray);
      }

      setAnnTitle("");
      setAnnDesc("");
      showToast(`📢 Sent announcement to ${students.length} students!`);
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to broadcast announcement");
    } finally {
      setPostingAnn(false);
    }
  };

  // Rendering filters & queries
  const filteredUsers = allUsers.filter((u) => {
    const roleMatch = userFilter === "all" || (u.role || "student") === userFilter;
    const searchMatch = !userSearch.trim() || 
      (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) || 
      (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    return roleMatch && searchMatch;
  });

  const filteredExchanges = allExchanges.filter((e) => {
    const q = exSearch.toLowerCase();
    return !q ||
      (e.offer || "").toLowerCase().includes(q) ||
      (e.need || "").toLowerCase().includes(q) ||
      (e.name || "").toLowerCase().includes(q);
  });

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="load-logo">ZWAPY ADMIN</div>
        <div className="load-bar"><div className="load-fill"></div></div>
        <div className="load-text">Loading command center...</div>
      </div>
    );
  }

  return (
    <div className="admin-body">
      <div className="bg-glow" />

      {toastMsg && <div className="toast show" style={{ color: toastColor }}>{toastMsg}</div>}

      {/* Role Edit Modal */}
      {roleModalOpen && (
        <div className="modal-bg open" onClick={() => setRoleModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit User Role</h3>
            <p id="modalUserName">{editingUser?.name || "Student"}</p>
            <select value={modalRole} onChange={(e) => setModalRole(e.target.value)}>
              <option value="student">Student</option>
              <option value="club_head">Club Head</option>
              <option value="super_admin">Super Admin</option>
            </select>
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setRoleModalOpen(false)}>Cancel</button>
              <button className="modal-save" onClick={saveUserRole}>Save Role</button>
            </div>
          </div>
        </div>
      )}

      <div className="layout">
        <header className="topbar">
          <Link to="/dashboard" className="topbar-logo">
            <div className="logo-node">
              <img src="assets/zwapy-logo.png" style={{ width: "24px", height: "24px", objectFit: "contain" }} alt="" />
            </div>
            <span className="logo-text">ZWAPY</span>
          </Link>
          <div className="admin-badge">⚡ Super Admin</div>
          <div className="topbar-right">
            <Link to="/dashboard" className="switch-btn">🎓 Student Portal</Link>
            <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        <div className="page-head fade-up in d1">
          <div className="page-label">// Super Admin — Zwapy Command Center</div>
          <h1 className="page-title">Command <span>Center</span></h1>
        </div>

        {/* STATS */}
        <div className="stats-row fade-up in d1">
          <div className="stat-card">
            <div className="stat-label">Total Users</div>
            <div className="stat-value sv-r">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Students</div>
            <div className="stat-value sv-c">{stats.students}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Club Heads</div>
            <div className="stat-value sv-g">{stats.clubHeads}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Coins</div>
            <div className="stat-value sv-a">💰 {stats.coins.toLocaleString()}</div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="tab-nav fade-up in d2">
          <button className={`tab-btn ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>👥 Users</button>
          <button className={`tab-btn ${activeTab === "events" ? "active" : ""}`} onClick={() => setActiveTab("events")}>📅 Post Events</button>
          <button className={`tab-btn ${activeTab === "clubs" ? "active" : ""}`} onClick={() => setActiveTab("clubs")}>🛡️ Clubs</button>
          <button className={`tab-btn ${activeTab === "exchanges" ? "active" : ""}`} onClick={() => setActiveTab("exchanges")}>🔄 Exchanges</button>
          <button className={`tab-btn ${activeTab === "announce" ? "active" : ""}`} onClick={() => setActiveTab("announce")}>📢 Announcements</button>
        </div>

        {/* TAB: USERS */}
        {activeTab === "users" && (
          <div className="tab-content active fade-up in d3">
            <div className="card">
              <div className="card-title">// All Users</div>
              <div className="filter-row">
                <div className={`ftab ${userFilter === "all" ? "active" : ""}`} onClick={() => setUserFilter("all")}>All</div>
                <div className={`ftab ${userFilter === "student" ? "active" : ""}`} onClick={() => setUserFilter("student")}>Students</div>
                <div className={`ftab ${userFilter === "club_head" ? "active" : ""}`} onClick={() => setUserFilter("club_head")}>Club Heads</div>
                <div className={`ftab ${userFilter === "super_admin" ? "active" : ""}`} onClick={() => setUserFilter("super_admin")}>Admins</div>
              </div>
              <input
                className="search-bar"
                placeholder="Search by name or email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
              <div style={{ overflowX: "auto" }}>
                <table className="user-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Name</th>
                      <th>Email</th>
                      <th>University</th>
                      <th>Role</th>
                      <th>Coins</th>
                      <th>Joined</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="8">
                          <div className="empty-state">No users found</div>
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((u) => {
                        const av = u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || u.uid)}`;
                        const role = u.role || "student";
                        return (
                          <tr key={u.uid}>
                            <td>
                              <div className="user-av">
                                <img src={av} alt="" />
                              </div>
                            </td>
                            <td>
                              <strong>{u.name || "—"}</strong>
                            </td>
                            <td style={{ color: "var(--dim)", fontSize: ".72rem" }}>{u.email || "—"}</td>
                            <td style={{ color: "var(--dim)", fontSize: ".72rem" }}>{u.university || "—"}</td>
                            <td>
                              <span className={`role-pill rp-${role}`}>{role}</span>
                            </td>
                            <td style={{ fontFamily: "'Space Mono', monospace" }}>{u.coins || 0}</td>
                            <td style={{ fontSize: ".68rem", color: "var(--muted)" }}>{fmtDate(u.createdAt)}</td>
                            <td>
                              <button className="action-btn green" onClick={() => openRoleModal(u)}>Role</button>
                              {u.uid !== SUPER_ADMIN_UID && (
                                <button className="action-btn" onClick={() => deleteUser(u.uid)}>Delete</button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: POST EVENTS */}
        {activeTab === "events" && (
          <div className="tab-content active">
            <form className="card" onSubmit={handlePostEvent}>
              <div className="card-title">// Post Official Zwapy Event</div>
              <p style={{ fontSize: ".76rem", color: "var(--dim)", marginBottom: "18px" }}>
                These events appear on the campus calendar for all students — posted by Zwapy team directly.
              </p>
              
              <div className="field-row">
                <div className="field">
                  <label>Event Type</label>
                  <select value={evType} onChange={(e) => setEvType(e.target.value)}>
                    <option value="event">📅 Event</option>
                    <option value="hackathon">💻 Hackathon</option>
                    <option value="announcement">📢 Announcement</option>
                  </select>
                </div>
                <div className="field">
                  <label>Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Zwapy Launch Party"
                    value={evTitle}
                    onChange={(e) => setEvTitle(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  placeholder="Tell students about this event..."
                  value={evDesc}
                  onChange={(e) => setEvDesc(e.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={evDate}
                    onChange={(e) => setEvDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Time</label>
                  <input
                    type="time"
                    value={evTime}
                    onChange={(e) => setEvTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Main Auditorium"
                    value={evVenue}
                    onChange={(e) => setEvVenue(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Registration Link</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={evLink}
                    onChange={(e) => setEvLink(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Poster Image URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://... paste image link"
                  value={evPoster}
                  onChange={(e) => setEvPoster(e.target.value)}
                />
              </div>

              {/* Pricing */}
              <div className="pricing-section">
                <div className="pricing-title">// Pricing (leave blank for free)</div>
                <div className="field-row">
                  <div className="field">
                    <label>Ticket Price (₹)</label>
                    <input
                      type="number"
                      placeholder="0 = Free"
                      min="0"
                      value={evPrice}
                      onChange={(e) => setEvPrice(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Total Seats</label>
                    <input
                      type="number"
                      placeholder="Unlimited"
                      min="1"
                      value={evSeats}
                      onChange={(e) => setEvSeats(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Zwapy UPI ID <span style={{ fontWeight: 400, textTransform: "none", fontSize: ".58rem", color: "var(--muted)" }}>(students pay Zwapy for official events)</span></label>
                  <input
                    type="text"
                    placeholder="zwapyteam@upi"
                    value={evUpiId}
                    onChange={(e) => setEvUpiId(e.target.value)}
                  />
                </div>
                <div className="pricing-hint">
                  Students pay your UPI directly. 5% platform fee tracked automatically per ticket sold.
                </div>
              </div>

              <button className="btn-red" type="submit" disabled={postingEvent}>
                {postingEvent ? "Posting..." : "Post Event to Campus →"}
              </button>
            </form>

            <div className="card">
              <div className="card-title">// Zwapy Official Events</div>
              <div id="officialEvents">
                {officialEvents.length === 0 ? (
                  <div className="empty-state">No official events posted yet.</div>
                ) : (
                  officialEvents.map((e) => {
                    const col = e.type === "hackathon" ? "#f59e0b" : e.type === "announcement" ? "#818cf8" : "#00D4FF";
                    return (
                      <div key={e.id} className="event-item">
                        <div className="ei-dot" style={{ backgroundColor: col }} />
                        <div className="ei-info">
                          <div className="ei-title">{e.title}</div>
                          <div className="ei-meta">
                            {e.type} {e.date && `· ${e.date}`} {e.venue && `· ${e.venue}`}
                          </div>
                        </div>
                        <button className="ei-del" onClick={() => deleteOfficialEvent(e.id)}>✕</button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: CLUBS */}
        {activeTab === "clubs" && (
          <div className="tab-content active">
            <div className="card">
              <div className="card-title">// All Clubs on Platform</div>
              <div id="allClubsList">
                {allClubs.length === 0 ? (
                  <div className="empty-state">No clubs created yet.</div>
                ) : (
                  allClubs.map((c) => (
                    <div key={c.id} className="event-item">
                      <div className="ei-dot" style={{ backgroundColor: "var(--indigo)" }} />
                      <div className="ei-info">
                        <div className="ei-title">{c.name || "Unnamed Club"}</div>
                        <div className="ei-meta">
                          {c.category || ""} · {(c.members || []).length} members · {c.university || ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: EXCHANGES */}
        {activeTab === "exchanges" && (
          <div className="tab-content active">
            <div className="card">
              <div className="card-title">// All Skill Exchanges</div>
              <input
                className="search-bar"
                placeholder="Search exchanges..."
                value={exSearch}
                onChange={(e) => setExSearch(e.target.value)}
              />
              <div id="exchangesList">
                {filteredExchanges.length === 0 ? (
                  <div className="empty-state">No exchanges found.</div>
                ) : (
                  filteredExchanges.map((e) => (
                    <div key={e.id} className="event-item">
                      <div className="ei-dot" style={{ backgroundColor: "var(--cyan)" }} />
                      <div className="ei-info">
                        <div className="ei-title">{e.offer || "?"} ↔ {e.need || "?"}</div>
                        <div className="ei-meta">
                          by {e.name || "Student"} · {e.level || ""} · {e.duration || ""}
                        </div>
                      </div>
                      <button className="ei-del" onClick={() => deleteExchange(e.id)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB: ANNOUNCEMENTS */}
        {activeTab === "announce" && (
          <div className="tab-content active">
            <form className="card" onSubmit={handlePostAnnouncement}>
              <div className="card-title">// Send Platform Announcement</div>
              <p style={{ fontSize: ".76rem", color: "var(--dim)", marginBottom: "18px" }}>
                This will appear in every student's activity feed immediately.
              </p>
              
              <div className="field">
                <label>Announcement Title</label>
                <input
                  type="text"
                  placeholder="e.g. New Feature: Skill Exchange is Live!"
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Message</label>
                <textarea
                  placeholder="Write your announcement..."
                  value={annDesc}
                  onChange={(e) => setAnnDesc(e.target.value)}
                  required
                />
              </div>

              <button className="btn-red" type="submit" disabled={postingAnn}>
                {postingAnn ? "Sending..." : "Send to All Students →"}
              </button>
            </form>

            <div className="card">
              <div className="card-title">// Past Announcements</div>
              <div id="annList">
                {announcements.length === 0 ? (
                  <div className="empty-state">No announcements yet.</div>
                ) : (
                  announcements.map((a) => (
                    <div key={a.id} className="event-item">
                      <div className="ei-dot" style={{ backgroundColor: "var(--indigo)" }} />
                      <div className="ei-info">
                        <div className="ei-title">{a.title}</div>
                        <div className="ei-meta">{a.desc}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
