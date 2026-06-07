import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, collection, getDocs, updateDoc, deleteDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { supabase } from "../supabase";
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

  const [creaRegistrations, setCreaRegistrations] = useState([]);
  const [creaFilterWorkshop, setCreaFilterWorkshop] = useState("all");
  const [creaFilterBatch, setCreaFilterBatch] = useState("all");
  const [creaLoading, setCreaLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(null);

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

  const [tracksheetModalOpen, setTracksheetModalOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState(null);
  const [studentTopics, setStudentTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

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

  useEffect(() => {
    if (activeTab === "creagenix" && currentUser) {
      fetchCreagenixRegistrations();
    }
  }, [activeTab, currentUser]);

  async function fetchCreagenixRegistrations() {
    setCreaLoading(true);
    try {
      const { data, error } = await supabase
        .from("workshop_registrations")
        .select("*")
        .order("registered_at", { ascending: false });
      if (error) throw error;
      setCreaRegistrations(data || []);
    } catch (err) {
      console.error(err);
      showToast("❌ Could not load workshop registrations", "#ef4444");
    } finally {
      setCreaLoading(false);
    }
  }

  async function updateCreaStatus(id, newStatus) {
    setUpdatingStatus(id);
    try {
      const { error } = await supabase
        .from("workshop_registrations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setCreaRegistrations(prev =>
        prev.map(r => (r.id === id ? { ...r, status: newStatus } : r))
      );
      showToast(`✅ Registration ${newStatus}`);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to update status", "#ef4444");
    } finally {
      setUpdatingStatus(null);
    }
  }

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

  const creaWorkshopOptions = [...new Set(creaRegistrations.map(r => r.workshop_id))];
  const creaBatchOptions = [...new Set(creaRegistrations.filter(r => r.batch_preference).map(r => r.batch_preference))];
  const filteredCrea = creaRegistrations.filter(r => {
    if (creaFilterWorkshop !== "all" && r.workshop_id !== creaFilterWorkshop) return false;
    if (creaFilterBatch !== "all" && r.batch_preference !== creaFilterBatch) return false;
    return true;
  });

  async function openTracksheetModal(registration) {
    setSelectedRegistration(registration);
    setTracksheetModalOpen(true);
    setLoadingTopics(true);
    try {
      const { data: topics, error } = await supabase
        .from("student_progress")
        .select(`
          id,
          completed,
          tracksheet_topics (id, module_name, topic_name, order_index)
        `)
        .eq("workshop_registration_id", registration.id)
        .order("tracksheet_topics(order_index)");
      if (error) throw error;
      setStudentTopics(topics || []);
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to load tracksheet", "#ef4444");
    } finally {
      setLoadingTopics(false);
    }
  }

  async function toggleTopicCompletion(progressId, currentStatus) {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from("student_progress")
      .update({ completed: newStatus, completed_at: newStatus ? new Date().toISOString() : null })
      .eq("id", progressId);
    if (error) {
      showToast("❌ Update failed", "#ef4444");
      return;
    }
    setStudentTopics(prev =>
      prev.map(t => t.id === progressId ? { ...t, completed: newStatus } : t)
    );
    showToast(`✅ Topic marked ${newStatus ? "complete" : "incomplete"}`);
  }

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
          <button className={`tab-btn ${activeTab === "creagenix" ? "active" : ""}`} onClick={() => setActiveTab("creagenix")}>🎬 Creagenix</button>
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

        {/* CREAGENIX TAB */}
        {activeTab === "creagenix" && (
          <div className="tab-content active">
            <div className="card">
              <div className="card-title">// Creagenix × Zwapy – Workshop Registrations</div>
              <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <select
                  value={creaFilterWorkshop}
                  onChange={(e) => setCreaFilterWorkshop(e.target.value)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#1e1e3a",
                    color: "white",
                    border: "1px solid #00D4FF",
                    borderRadius: "8px",
                    width: "auto",
                    minWidth: "180px",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">All Workshops</option>
                  {creaWorkshopOptions.map(ws => <option key={ws} value={ws}>{ws}</option>)}
                </select>
                <select
                  value={creaFilterBatch}
                  onChange={(e) => setCreaFilterBatch(e.target.value)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: "#1e1e3a",
                    color: "white",
                    border: "1px solid #00D4FF",
                    borderRadius: "8px",
                    width: "auto",
                    minWidth: "180px",
                    cursor: "pointer"
                  }}
                >
                  <option value="all">All Batches</option>
                  {creaBatchOptions.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {creaLoading ? (
                <div className="empty-state">Loading registrations...</div>
              ) : filteredCrea.length === 0 ? (
                <div className="empty-state">No workshop registrations found.</div>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table className="user-table">
                    <thead>
                      <tr>
                        <th>Name</th><th>Roll No</th><th>College</th><th>Workshop</th><th>Batch</th><th>PC Needed</th><th>UTR</th><th>Registered</th><th>Status</th>
                        <th>Action</th>
                        <th>Tracksheet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCrea.map(reg => (
                        <tr key={reg.id}>
                          <td><strong>{reg.name}</strong></td>
                          <td>{reg.roll_no}</td>
                          <td>{reg.college_name}</td>
                          <td>{reg.workshop_id}</td>
                          <td>{reg.batch_preference || "—"}</td>
                          <td>{reg.need_pc ? "Yes" : "No"}</td>
                          <td>{reg.payment_utr}</td>
                          <td>{new Date(reg.registered_at).toLocaleDateString()}</td>
                          <td><span style={{ color: reg.status === "pending" ? "#f59e0b" : "#10b981" }}>{reg.status}</span></td>
                          <td>
                            {reg.status === "pending" && (
                              <button
                                className="action-btn green"
                                onClick={() => updateCreaStatus(reg.id, "approved")}
                                disabled={updatingStatus === reg.id}
                              >
                                {updatingStatus === reg.id ? "..." : "Approve"}
                              </button>
                            )}
                          </td>
                          <td>
                            <button
                              className="action-btn"
                              onClick={() => openTracksheetModal(reg)}
                            >
                              📋 Tracksheet
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tracksheet Modal (placed outside the tabs to avoid nesting issues) */}
      {tracksheetModalOpen && selectedRegistration && (
        <div className="modal-bg open" onClick={() => setTracksheetModalOpen(false)}>
          <div className="modal" style={{ maxWidth: "600px", width: "90%" }} onClick={e => e.stopPropagation()}>
            <h3>Tracksheet: {selectedRegistration.name}</h3>
            <p><strong>Workshop:</strong> {selectedRegistration.workshop_id}</p>
            {loadingTopics ? (
              <div className="empty-state">Loading topics...</div>
            ) : studentTopics.length === 0 ? (
              <div className="empty-state">No topics found. Did you run the SQL to insert tracksheet_topics?</div>
            ) : (
              <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {studentTopics.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px", padding: "8px", background: "rgba(0,0,0,0.2)", borderRadius: "8px" }}>
                    <button
                      onClick={() => toggleTopicCompletion(t.id, t.completed)}
                      style={{
                        background: t.completed ? "#10b981" : "#2d3a5e",
                        border: "none",
                        borderRadius: "20px",
                        padding: "4px 12px",
                        color: "white",
                        cursor: "pointer",
                        minWidth: "80px"
                      }}
                    >
                      {t.completed ? "✅ Done" : "⏳ Mark"}
                    </button>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "#00D4FF" }}>{t.tracksheet_topics.module_name}</div>
                      <div>{t.tracksheet_topics.topic_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-cancel" onClick={() => setTracksheetModalOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}