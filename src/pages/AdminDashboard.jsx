import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, collection, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
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

  const [annTitle, setAnnTitle] = useState("");
  const [annDesc, setAnnDesc] = useState("");
  const [postingAnn, setPostingAnn] = useState(false);

  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [modalRole, setModalRole] = useState("student");

  const [stats, setStats] = useState({ total: 0, students: 0, clubHeads: 0, coins: 0 });
  const [toastMsg, setToastMsg] = useState("");
  const [toastColor, setToastColor] = useState("#10b981");
  const [pageLoading, setPageLoading] = useState(true);

  const showToast = (msg, col = "#10b981") => {
    setToastMsg(msg);
    setToastColor(col);
    setTimeout(() => setToastMsg(""), 3000);
  };

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

  useEffect(() => {
    if (!currentUser) return;
    async function loadData() {
      try {
        const usersSnap = await getDocs(collection(db, "users"));
        const loadedUsers = [];
        usersSnap.forEach(d => loadedUsers.push({ uid: d.id, ...d.data() }));
        loadedUsers.sort((a, b) => {
          const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : new Date(a.createdAt || 0).getTime();
          const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : new Date(b.createdAt || 0).getTime();
          return bTime - aTime;
        });
        setAllUsers(loadedUsers);
        calculateStats(loadedUsers);

        const exSnap = await getDocs(collection(db, "exchanges"));
        const exchanges = [];
        exSnap.forEach(d => exchanges.push({ id: d.id, ...d.data() }));
        setAllExchanges(exchanges);

        const clubsSnap = await getDocs(collection(db, "clubs"));
        const clubs = [];
        clubsSnap.forEach(d => clubs.push({ id: d.id, ...d.data() }));
        setAllClubs(clubs);

        const evSnap = await getDocs(collection(db, "zwapy_events"));
        const events = [];
        evSnap.forEach(d => events.push({ id: d.id, ...d.data() }));
        events.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setOfficialEvents(events);

        const annSnap = await getDocs(collection(db, "announcements"));
        const anns = [];
        annSnap.forEach(d => anns.push({ id: d.id, ...d.data() }));
        anns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setAnnouncements(anns);
      } catch (err) {
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    }
    loadData();
  }, [currentUser]);

  const calculateStats = (users) => {
    let total = 0, students = 0, clubHeads = 0, coins = 0;
    users.forEach(u => {
      total++;
      if ((u.role || "student") === "student") students++;
      else if (u.role === "club_head") clubHeads++;
      coins += (u.coins || 0);
    });
    setStats({ total, students, clubHeads, coins });
  };

  const fmtDate = (ts) => {
    if (!ts) return "—";
    if (ts.seconds) return new Date(ts.seconds * 1000).toLocaleDateString();
    return new Date(ts).toLocaleDateString();
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const openRoleModal = (user) => {
    setEditingUser(user);
    setModalRole(user.role || "student");
    setRoleModalOpen(true);
  };

  const saveUserRole = async () => {
    if (!editingUser) return;
    try {
      await updateDoc(doc(db, "users", editingUser.uid), { role: modalRole });
      const updated = allUsers.map(u => u.uid === editingUser.uid ? { ...u, role: modalRole } : u);
      setAllUsers(updated);
      calculateStats(updated);
      setRoleModalOpen(false);
      showToast("✅ Role updated");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to update role");
    }
  };

  const deleteUser = async (uId) => {
    if (!window.confirm("Delete user permanently?")) return;
    try {
      await deleteDoc(doc(db, "users", uId));
      const updated = allUsers.filter(u => u.uid !== uId);
      setAllUsers(updated);
      calculateStats(updated);
      showToast("🗑️ User deleted", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to delete user");
    }
  };

  const handlePostEvent = async (e) => {
    e.preventDefault();
    if (!evTitle.trim()) {
      showToast("❌ Please add a title", "#ef4444");
      return;
    }
    setPostingEvent(true);
    try {
      await addDoc(collection(db, "zwapy_events"), {
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
        createdAt: serverTimestamp(),
      });
      const evSnap = await getDocs(collection(db, "zwapy_events"));
      const events = [];
      evSnap.forEach(d => events.push({ id: d.id, ...d.data() }));
      events.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setOfficialEvents(events);
      setEvTitle(""); setEvDesc(""); setEvDate(""); setEvTime(""); setEvVenue(""); setEvLink(""); setEvPoster(""); setEvPrice(""); setEvSeats(""); setEvUpiId("");
      showToast("✅ Event posted");
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to post event");
    } finally {
      setPostingEvent(false);
    }
  };

  const deleteOfficialEvent = async (evId) => {
    if (!window.confirm("Delete this event?")) return;
    try {
      await deleteDoc(doc(db, "zwapy_events", evId));
      setOfficialEvents(officialEvents.filter(e => e.id !== evId));
      showToast("🗑️ Deleted", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to delete");
    }
  };

  const deleteExchange = async (exId) => {
    if (!window.confirm("Remove this exchange?")) return;
    try {
      await deleteDoc(doc(db, "exchanges", exId));
      setAllExchanges(allExchanges.filter(x => x.id !== exId));
      showToast("🗑️ Removed", "#ef4444");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to remove");
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!annTitle.trim() || !annDesc.trim()) {
      showToast("❌ Please fill both fields", "#ef4444");
      return;
    }
    setPostingAnn(true);
    try {
      await addDoc(collection(db, "announcements"), {
        title: annTitle.trim(),
        desc: annDesc.trim(),
        createdAt: serverTimestamp(),
      });
      const students = allUsers.filter(u => (u.role || "student") === "student");
      for (const s of students) {
        try {
          await addDoc(collection(db, "users", s.uid, "activity"), {
            title: `📢 Zwapy: ${annTitle.trim()}`,
            desc: `— ${annDesc.trim()}`,
            createdAt: serverTimestamp(),
          });
        } catch (err) {}
      }
      const annSnap = await getDocs(collection(db, "announcements"));
      const anns = [];
      annSnap.forEach(d => anns.push({ id: d.id, ...d.data() }));
      anns.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      setAnnouncements(anns);
      setAnnTitle(""); setAnnDesc("");
      showToast(`📢 Sent to ${students.length} students`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to send");
    } finally {
      setPostingAnn(false);
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const roleMatch = userFilter === "all" || (u.role || "student") === userFilter;
    const searchMatch = !userSearch.trim() || (u.name || "").toLowerCase().includes(userSearch.toLowerCase()) || (u.email || "").toLowerCase().includes(userSearch.toLowerCase());
    return roleMatch && searchMatch;
  });

  const filteredExchanges = allExchanges.filter(e => {
    const q = exSearch.toLowerCase();
    return !q || (e.offer || "").toLowerCase().includes(q) || (e.need || "").toLowerCase().includes(q) || (e.name || "").toLowerCase().includes(q);
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

      {roleModalOpen && (
        <div className="modal-bg open" onClick={() => setRoleModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Edit User Role</h3>
            <p>{editingUser?.name || "Student"}</p>
            <select value={modalRole} onChange={e => setModalRole(e.target.value)}>
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
            <div className="logo-node"><img src="assets/zwapy-logo.png" style={{ width: "24px", height: "24px", objectFit: "contain" }} alt="" /></div>
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

        <div className="stats-row fade-up in d1">
          <div className="stat-card"><div className="stat-label">Total Users</div><div className="stat-value sv-r">{stats.total}</div></div>
          <div className="stat-card"><div className="stat-label">Students</div><div className="stat-value sv-c">{stats.students}</div></div>
          <div className="stat-card"><div className="stat-label">Club Heads</div><div className="stat-value sv-g">{stats.clubHeads}</div></div>
          <div className="stat-card"><div className="stat-label">Total Coins</div><div className="stat-value sv-a">💰 {stats.coins.toLocaleString()}</div></div>
        </div>

        <div className="tab-nav fade-up in d2">
          <button className={`tab-btn ${activeTab === "users" ? "active" : ""}`} onClick={() => setActiveTab("users")}>👥 Users</button>
          <button className={`tab-btn ${activeTab === "events" ? "active" : ""}`} onClick={() => setActiveTab("events")}>📅 Post Events</button>
          <button className={`tab-btn ${activeTab === "clubs" ? "active" : ""}`} onClick={() => setActiveTab("clubs")}>🛡️ Clubs</button>
          <button className={`tab-btn ${activeTab === "exchanges" ? "active" : ""}`} onClick={() => setActiveTab("exchanges")}>🔄 Exchanges</button>
          <button className={`tab-btn ${activeTab === "announce" ? "active" : ""}`} onClick={() => setActiveTab("announce")}>📢 Announcements</button>
        </div>

        {/* USERS TAB */}
        {activeTab === "users" && (
          <div className="tab-content active">
            <div className="card">
              <div className="card-title">// All Users</div>
              <div className="filter-row">
                <div className={`ftab ${userFilter === "all" ? "active" : ""}`} onClick={() => setUserFilter("all")}>All</div>
                <div className={`ftab ${userFilter === "student" ? "active" : ""}`} onClick={() => setUserFilter("student")}>Students</div>
                <div className={`ftab ${userFilter === "club_head" ? "active" : ""}`} onClick={() => setUserFilter("club_head")}>Club Heads</div>
                <div className={`ftab ${userFilter === "super_admin" ? "active" : ""}`} onClick={() => setUserFilter("super_admin")}>Admins</div>
              </div>
              <input className="search-bar" placeholder="Search by name or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} />
              <div style={{ overflowX: "auto" }}>
                <table className="user-table">
                  <thead><tr><th></th><th>Name</th><th>Email</th><th>University</th><th>Role</th><th>Coins</th><th>Joined</th><th>Actions</th></tr></thead>
                  <tbody>
                    {filteredUsers.map(u => {
                      const av = u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.name || u.uid)}`;
                      return (
                        <tr key={u.uid}>
                          <td><div className="user-av"><img src={av} alt="" /></div></td>
                          <td><strong>{u.name || "—"}</strong></td>
                          <td>{u.email || "—"}</td>
                          <td>{u.university || "—"}</td>
                          <td><span className={`role-pill rp-${u.role || "student"}`}>{u.role || "student"}</span></td>
                          <td>{u.coins || 0}</td>
                          <td>{fmtDate(u.createdAt)}</td>
                          <td>
                            <button className="action-btn green" onClick={() => openRoleModal(u)}>Role</button>
                            {u.uid !== SUPER_ADMIN_UID && <button className="action-btn" onClick={() => deleteUser(u.uid)}>Delete</button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* EVENTS TAB */}
        {activeTab === "events" && (
          <div className="tab-content active">
            <form className="card" onSubmit={handlePostEvent}>
              <div className="card-title">// Post Official Zwapy Event</div>
              <div className="field-row">
                <div className="field"><label>Event Type</label><select value={evType} onChange={e => setEvType(e.target.value)}><option value="event">📅 Event</option><option value="hackathon">💻 Hackathon</option><option value="announcement">📢 Announcement</option></select></div>
                <div className="field"><label>Title</label><input type="text" placeholder="Title" value={evTitle} onChange={e => setEvTitle(e.target.value)} required /></div>
              </div>
              <div className="field"><label>Description</label><textarea placeholder="Description" value={evDesc} onChange={e => setEvDesc(e.target.value)} /></div>
              <div className="field-row"><div className="field"><label>Date</label><input type="date" value={evDate} onChange={e => setEvDate(e.target.value)} /></div><div className="field"><label>Time</label><input type="time" value={evTime} onChange={e => setEvTime(e.target.value)} /></div></div>
              <div className="field-row"><div className="field"><label>Venue</label><input type="text" placeholder="Venue" value={evVenue} onChange={e => setEvVenue(e.target.value)} /></div><div className="field"><label>Link</label><input type="url" placeholder="https://..." value={evLink} onChange={e => setEvLink(e.target.value)} /></div></div>
              <div className="field"><label>Poster URL</label><input type="url" placeholder="Image URL" value={evPoster} onChange={e => setEvPoster(e.target.value)} /></div>
              <div className="pricing-section">
                <div className="pricing-title">// Pricing</div>
                <div className="field-row"><div className="field"><label>Price (₹)</label><input type="number" min="0" value={evPrice} onChange={e => setEvPrice(e.target.value)} /></div><div className="field"><label>Total Seats</label><input type="number" min="1" value={evSeats} onChange={e => setEvSeats(e.target.value)} /></div></div>
                <div className="field"><label>UPI ID</label><input type="text" placeholder="zwapyteam@upi" value={evUpiId} onChange={e => setEvUpiId(e.target.value)} /></div>
              </div>
              <button className="btn-red" type="submit" disabled={postingEvent}>{postingEvent ? "Posting..." : "Post Event →"}</button>
            </form>
            <div className="card"><div className="card-title">// Official Events</div>
              {officialEvents.length === 0 ? <div className="empty-state">No events.</div> : officialEvents.map(ev => (
                <div key={ev.id} className="event-item"><div className="ei-dot" style={{ backgroundColor: "#00D4FF" }} /><div className="ei-info"><div className="ei-title">{ev.title}</div><div className="ei-meta">{ev.type} · {ev.date} · {ev.venue}</div></div><button className="ei-del" onClick={() => deleteOfficialEvent(ev.id)}>✕</button></div>
              ))}
            </div>
          </div>
        )}

        {/* CLUBS TAB */}
        {activeTab === "clubs" && (
          <div className="tab-content active">
            <div className="card"><div className="card-title">// All Clubs</div>
              {allClubs.length === 0 ? <div className="empty-state">No clubs.</div> : allClubs.map(c => (
                <div key={c.id} className="event-item"><div className="ei-dot" style={{ backgroundColor: "#818cf8" }} /><div className="ei-info"><div className="ei-title">{c.name}</div><div className="ei-meta">{c.category || ""} · {(c.members || []).length} members · {c.university || ""}</div></div></div>
              ))}
            </div>
          </div>
        )}

        {/* EXCHANGES TAB */}
        {activeTab === "exchanges" && (
          <div className="tab-content active">
            <div className="card"><div className="card-title">// Skill Exchanges</div>
              <input className="search-bar" placeholder="Search exchanges..." value={exSearch} onChange={e => setExSearch(e.target.value)} />
              {filteredExchanges.length === 0 ? <div className="empty-state">No exchanges.</div> : filteredExchanges.map(ex => (
                <div key={ex.id} className="event-item"><div className="ei-dot" style={{ backgroundColor: "#00D4FF" }} /><div className="ei-info"><div className="ei-title">{ex.offer} ↔ {ex.need}</div><div className="ei-meta">by {ex.name} · {ex.level} · {ex.duration}</div></div><button className="ei-del" onClick={() => deleteExchange(ex.id)}>✕</button></div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB */}
        {activeTab === "announce" && (
          <div className="tab-content active">
            <form className="card" onSubmit={handlePostAnnouncement}>
              <div className="card-title">// Send Platform Announcement</div>
              <div className="field"><label>Title</label><input type="text" placeholder="Announcement title" value={annTitle} onChange={e => setAnnTitle(e.target.value)} required /></div>
              <div className="field"><label>Message</label><textarea placeholder="Your message" value={annDesc} onChange={e => setAnnDesc(e.target.value)} required /></div>
              <button className="btn-red" type="submit" disabled={postingAnn}>{postingAnn ? "Sending..." : "Send to All Students →"}</button>
            </form>
            <div className="card"><div className="card-title">// Past Announcements</div>
              {announcements.length === 0 ? <div className="empty-state">No announcements.</div> : announcements.map(a => (
                <div key={a.id} className="event-item"><div className="ei-dot" style={{ backgroundColor: "#818cf8" }} /><div className="ei-info"><div className="ei-title">{a.title}</div><div className="ei-meta">{a.desc}</div></div></div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}