import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./ClubDashboard.css";

export default function ClubDashboard() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, logout } = useAuth();

  const [clubName, setClubName] = useState("Your Club");
  const [university, setUniversity] = useState("");
  const [stats, setStats] = useState({ members: 0, events: 0, announcements: 0, hackathons: 0 });
  
  // Post Form State
  const [postType, setPostType] = useState("event");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [regLink, setRegLink] = useState("");
  const [price, setPrice] = useState("");
  const [seats, setSeats] = useState("");
  const [upiId, setUpiId] = useState("");
  
  const [publishing, setPublishing] = useState(false);
  const [posts, setPosts] = useState([]);
  const [members, setMembers] = useState([]);
  const [toastMsg, setToastMsg] = useState("");
  const [pageLoading, setPageLoading] = useState(true);

  // Helper: Show Toast
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Helper: Format Date
  const fmtDate = (d) => {
    if (!d) return "";
    return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
  };

  // Auth Guard & Role Check
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        navigate("/login");
      } else {
        // Double check role
        const activeRole = userData?.role || currentUser?.role;
        if (activeRole !== "club_head") {
          navigate("/dashboard");
        }
      }
    }
  }, [currentUser, userData, loading, navigate]);

  // Load Club Details, Posts and Members
  useEffect(() => {
    if (!currentUser) return;

    let unsubPosts = () => {};

    async function loadClubData() {
      try {
        const uid = currentUser.uid;
        let clubDetails = null;

        // Fetch User / Club metadata
        try {
          const userSnap = await getDoc(doc(db, "users", uid));
          if (userSnap.exists()) {
            clubDetails = userSnap.data();
          }
        } catch (e) {
          console.warn("Firestore fetch failed, checking local storage fallbacks:", e);
        }

        if (!clubDetails) {
          const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
          clubDetails = localUsers[uid] || userData || {};
        }

        setClubName(clubDetails.clubName || "Your Club");
        setUniversity(clubDetails.university || "");

        // Load Posts
        const isMock = uid.startsWith("mock-uid-");
        if (!isMock) {
          try {
            const postsRef = collection(db, "clubs", uid, "posts");
            const q = query(postsRef, orderBy("createdAt", "desc"));
            unsubPosts = onSnapshot(q, (snap) => {
              const postsArray = [];
              snap.forEach((d) => {
                postsArray.push({ id: d.id, ...d.data() });
              });
              setPosts(postsArray);
              updateStats(postsArray, members.length);
            }, (err) => {
              console.error("Firestore onSnapshot error:", err);
              // Fallback to local storage
              loadLocalPosts(uid);
            });
          } catch (e) {
            loadLocalPosts(uid);
          }
        } else {
          loadLocalPosts(uid);
        }

        // Load Members
        let membersArray = [];
        try {
          const clubSnap = await getDoc(doc(db, "clubs", uid));
          if (clubSnap.exists()) {
            membersArray = clubSnap.data().members || [];
          }
        } catch (e) {
          const localClubs = JSON.parse(localStorage.getItem("zwapy_local_clubs") || "{}");
          if (localClubs[uid]) {
            membersArray = localClubs[uid].members || [];
          }
        }

        // Fetch member details
        const loadedMembers = [];
        for (const mUid of membersArray) {
          let mData = null;
          try {
            const mSnap = await getDoc(doc(db, "users", mUid));
            if (mSnap.exists()) mData = mSnap.data();
          } catch (e) {}

          if (!mData) {
            const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
            mData = localUsers[mUid];
          }

          if (mData) {
            loadedMembers.push({ uid: mUid, ...mData });
          } else {
            loadedMembers.push({ uid: mUid, name: "Student Member", role: "student" });
          }
        }
        setMembers(loadedMembers);
        
        // Initial stats update
        const initialPosts = isMock ? JSON.parse(localStorage.getItem(`zwapy_posts_${uid}`) || "[]") : [];
        if (isMock) {
          updateStats(initialPosts, loadedMembers.length);
        } else {
          updateStats([], loadedMembers.length);
        }

      } catch (err) {
        console.error("Error loading club dashboard details:", err);
      } finally {
        setPageLoading(false);
      }
    }

    loadClubData();

    return () => unsubPosts();
  }, [currentUser, userData]);

  const loadLocalPosts = (uid) => {
    try {
      const localClubsPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${uid}`) || "[]");
      setPosts(localClubsPosts);
      updateStats(localClubsPosts, members.length);
    } catch (e) {
      console.error(e);
    }
  };

  const updateStats = (postsArray, membersCount) => {
    let events = 0, announcements = 0, hackathons = 0;
    postsArray.forEach((p) => {
      if (p.type === "event") events++;
      else if (p.type === "announcement") announcements++;
      else if (p.type === "hackathon") hackathons++;
    });
    setStats({
      members: membersCount,
      events,
      announcements,
      hackathons
    });
  };

  // Keep stats in sync when posts or members change
  useEffect(() => {
    updateStats(posts, members.length);
  }, [posts, members]);

  // Handle Logout
  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Post
  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    if (isMock) {
      const updated = posts.filter((p) => p.id !== postId);
      localStorage.setItem(`zwapy_posts_${uid}`, JSON.stringify(updated));
      setPosts(updated);
      showToast("🗑️ Post deleted!");
    } else {
      try {
        await deleteDoc(doc(db, "clubs", uid, "posts", postId));
        showToast("🗑️ Post deleted!");
      } catch (e) {
        console.error("Error deleting post:", e);
        showToast("❌ Delete failed!");
      }
    }
  };

  // Publish Post
  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast("❌ Please add a title");
      return;
    }

    setPublishing(true);
    const uid = currentUser.uid;
    const isMock = uid.startsWith("mock-uid-");

    const newPost = {
      title: title.trim(),
      desc: desc.trim(),
      type: postType,
      date,
      time,
      venue: venue.trim(),
      posterUrl: posterUrl.trim(),
      link: regLink.trim(),
      price: parseFloat(price) || 0,
      totalSeats: parseInt(seats) || 0,
      upiId: upiId.trim(),
      soldCount: 0,
      organizer: clubName,
      organizerUid: uid,
      clubName: clubName,
      university: university,
      createdAt: new Date().toISOString()
    };

    try {
      if (isMock) {
        newPost.id = "post-" + Date.now();
        const localPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${uid}`) || "[]");
        localPosts.unshift(newPost);
        localStorage.setItem(`zwapy_posts_${uid}`, JSON.stringify(localPosts));
        setPosts(localPosts);
      } else {
        const postsRef = collection(db, "clubs", uid, "posts");
        await addDoc(postsRef, {
          ...newPost,
          createdAt: serverTimestamp()
        });
      }

      // Reset fields
      setTitle("");
      setDesc("");
      setDate("");
      setTime("");
      setVenue("");
      setPosterUrl("");
      setRegLink("");
      setPrice("");
      setSeats("");
      setUpiId("");

      showToast("✅ Post published!");
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to publish post.");
    } finally {
      setPublishing(false);
    }
  };

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="load-logo">ZWAPY</div>
        <div className="load-bar"><div className="load-fill"></div></div>
        <div className="load-text">Loading club portal...</div>
      </div>
    );
  }

  const av = userData?.photoURL || currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(clubName)}`;

  return (
    <div className="club-body">
      <div className="bg-glow" />

      {toastMsg && <div className="toast show">{toastMsg}</div>}

      <div className="layout">
        <header className="topbar">
          <Link to="/dashboard" className="topbar-logo">
            <div className="logo-node">
              <img src="assets/zwapy-logo.png" style={{ width: "24px", height: "24px", objectFit: "contain" }} alt="" />
            </div>
            <span className="logo-text">ZWAPY</span>
          </Link>
          <div className="portal-badge">🛡️ Club Portal</div>
          <div className="topbar-right">
            <Link to="/dashboard" className="switch-btn">🎓 Student Portal</Link>
            <Link to="/skill-exchange" className="switch-btn green">🔄 Skill Exchange</Link>
            <span className="user-name">{userData?.name || "Club Head"}</span>
            <div className="avatar-ring">
              <img src={av} alt="" />
            </div>
            <button className="logout-btn" onClick={handleLogout}>Sign Out</button>
          </div>
        </header>

        {/* PAGE HEAD */}
        <div className="page-head fade-up in d1">
          <div className="page-label">// Club Head Portal</div>
          <h1 className="page-title"><span>{clubName}</span></h1>
          <p className="page-sub">{university || "Presidency University"}</p>
        </div>

        {/* STATS */}
        <div className="stats-row fade-up in d1">
          <div className="stat-card">
            <div className="stat-label">Members</div>
            <div className="stat-value sv-i">{stats.members}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Events</div>
            <div className="stat-value sv-c">{stats.events}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Announcements</div>
            <div className="stat-value sv-g">{stats.announcements}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hackathons</div>
            <div className="stat-value sv-a">{stats.hackathons}</div>
          </div>
        </div>

        <div className="main-grid">
          <div>
            {/* POST FORM */}
            <form className="card fade-up in d2" onSubmit={handlePublish}>
              <div className="card-title">// Create Post</div>
              <div className="field">
                <label>Post Type</label>
                <select value={postType} onChange={(e) => setPostType(e.target.value)}>
                  <option value="event">📅 Event</option>
                  <option value="hackathon">💻 Hackathon</option>
                  <option value="announcement">📢 Announcement</option>
                </select>
              </div>

              <div className="field">
                <label>Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Web Dev Workshop 2025"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label>Description</label>
                <textarea
                  placeholder="Tell students what this is about..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label>Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Time</label>
                  <input
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="field">
                <label>Venue / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Room 301, Block A"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Poster Image URL <span style={{ fontWeight: 400, textTransform: "none", fontSize: ".58rem", color: "var(--muted)" }}>(optional)</span></label>
                <input
                  type="url"
                  placeholder="https://... paste image URL"
                  value={posterUrl}
                  onChange={(e) => setPosterUrl(e.target.value)}
                />
              </div>

              <div className="field">
                <label>Registration / Info Link <span style={{ fontWeight: 400, textTransform: "none", fontSize: ".58rem", color: "var(--muted)" }}>(optional)</span></label>
                <input
                  type="url"
                  placeholder="https://forms.google.com/..."
                  value={regLink}
                  onChange={(e) => setRegLink(e.target.value)}
                />
              </div>

              {/* PRICING SECTION — only for paid events/hackathons */}
              <div className="pricing-section">
                <div className="pricing-title">// Pricing & Payment (leave blank for free events)</div>
                <div className="field-row">
                  <div className="field">
                    <label>Ticket Price (₹)</label>
                    <input
                      type="number"
                      placeholder="0 = Free"
                      min="0"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label>Total Seats</label>
                    <input
                      type="number"
                      placeholder="Leave blank = unlimited"
                      min="1"
                      value={seats}
                      onChange={(e) => setSeats(e.target.value)}
                    />
                  </div>
                </div>
                <div className="field">
                  <label>Your UPI ID * <span style={{ fontWeight: 400, textTransform: "none", fontSize: ".58rem", color: "var(--muted)" }}>(students pay directly to you)</span></label>
                  <input
                    type="text"
                    placeholder="yourname@upi or yourname@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                  />
                </div>
                <div className="pricing-hint">
                  💡 Students pay <strong>directly to your UPI</strong>. Zwapy automatically tracks a <strong style={{ color: "var(--green)" }}>5% platform fee</strong> which is settled with you monthly. Students can use Skill Coins for up to 50% discount.
                </div>
              </div>

              <button className="btn-indigo" type="submit" disabled={publishing}>
                {publishing ? "Publishing..." : "Publish Post →"}
              </button>
            </form>

            {/* POSTS LIST */}
            <div className="card fade-up in d3">
              <div className="card-title">// Your Posts</div>
              <div id="postsList">
                {posts.length === 0 ? (
                  <div className="empty-state">No posts yet — create your first one above</div>
                ) : (
                  posts.map((p) => (
                    <div key={p.id} className="post-item">
                      <div className={`post-dot ${p.type || "event"}`} />
                      <div className="post-info">
                        <div className="post-title">{p.title || "Untitled"}</div>
                        <div className="post-meta">
                          {p.type || "event"}
                          {p.date && ` · ${fmtDate(p.date)}`}
                          {p.venue && ` · ${p.venue}`}
                        </div>
                      </div>
                      <button className="post-del" onClick={() => handleDeletePost(p.id)}>✕</button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COL */}
          <div>
            <div className="card fade-up in d2">
              <div className="card-title">// Club Members</div>
              <div id="membersList">
                {members.length === 0 ? (
                  <div className="empty-state">No members yet</div>
                ) : (
                  members.map((m) => (
                    <div key={m.uid} className="member-item">
                      <div className="mem-av">
                        <img
                          src={m.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(m.name || m.uid)}`}
                          alt=""
                        />
                      </div>
                      <div>
                        <div className="mem-name">{m.name || "Student"}</div>
                        <div className="mem-role">
                          {m.role || "student"} · {m.university || ""}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
