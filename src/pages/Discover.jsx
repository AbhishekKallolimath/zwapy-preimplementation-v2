import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, doc, getDoc, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, isSameUniversity } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import "./Discover.css";

const TYPE_FILTERS = ["all", "people", "skills", "events", "exchanges"];

export default function Discover() {
  const navigate = useNavigate();
  const { currentUser, userData, loading } = useAuth();

  const [allPeople, setAllPeople] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [allExchanges, setAllExchanges] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const debounceRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (!loading && !currentUser) navigate("/login");
  }, [loading, currentUser, navigate]);

  // Load data
  useEffect(() => {
    if (!currentUser) return;
    async function load() {
      // 1. Resolve user profile and university
      let profile = null;
      try {
        const us = await getDoc(doc(db, "users", currentUser.uid));
        if (us.exists()) profile = us.data();
      } catch (e) {
        console.warn("Firestore profile fetch failed in Discover, checking local fallback:", e);
      }

      if (!profile) {
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        profile = localUsers[currentUser.uid] || userData || {};
      }

      const userUniName = profile.university || "";

      // 2. Load all people
      let peopleList = [];
      try {
        const usSnap = await getDocs(collection(db, "users"));
        usSnap.forEach(d => {
          const ud = d.data();
          if (ud.role !== "super_admin") peopleList.push({ uid: d.id, ...ud });
        });
      } catch (err) {
        console.warn("Firestore users fetch failed in Discover, using localStorage fallback:", err);
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        Object.keys(localUsers).forEach(uid => {
          const ud = localUsers[uid];
          if (ud.role !== "super_admin") peopleList.push({ uid, ...ud });
        });
      }
      setAllPeople(peopleList);

      // 3. Load exchanges
      let exchangesList = [];
      try {
        const es = await getDocs(query(collection(db, "exchanges"), orderBy("createdAt", "desc")));
        es.forEach(d => exchangesList.push({ id: d.id, ...d.data() }));
      } catch (err) {
        console.warn("Firestore exchanges fetch failed in Discover, using local exchanges:", err);
        exchangesList = JSON.parse(localStorage.getItem("zwapy_local_exchanges") || "[]");
      }
      setAllExchanges(exchangesList);

      // 4. Load events (Zwapy official events + Club posts)
      const eventsList = [];
      
      // Official events
      try {
        const evSnap = await getDocs(query(collection(db, "zwapy_events"), orderBy("createdAt", "desc")));
        if (evSnap && evSnap.forEach) {
          evSnap.forEach(d => eventsList.push({ id: d.id, source: "zwapy", clubName: "Zwapy Official", ...d.data() }));
        }
      } catch (e) {
        console.warn("Firestore zwapy_events load failed in Discover:", e);
      }

      if (eventsList.filter(e => e.source === "zwapy").length === 0) {
        const localEvents = JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
        localEvents.forEach((ev, idx) => {
          eventsList.push({ id: `ev-${idx}`, source: "zwapy", clubName: "Zwapy Official", ...ev });
        });
      }

      // Club events
      let clubsList = [];
      try {
        const cs = await getDocs(collection(db, "clubs"));
        if (cs && cs.docs) {
          clubsList = cs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      } catch (e) {
        console.warn("Firestore clubs load failed in Discover, checking local fallback:", e);
        const localClubs = JSON.parse(localStorage.getItem("zwapy_local_clubs") || "{}");
        clubsList = Object.keys(localClubs).map(id => ({ id, ...localClubs[id] }));
      }

      // Loop matched clubs
      for (const club of clubsList) {
        const clubUniName = club.university || "";
        if (!isSameUniversity(userUniName, clubUniName)) {
          continue;
        }

        try {
          let psDocs = [];
          try {
            const ps = await getDocs(collection(db, "clubs", club.id, "posts"));
            psDocs = ps.docs || [];
          } catch (pe) {
            const localPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${club.id}`) || "[]");
            psDocs = localPosts.map((p, idx) => ({ id: p.id || `p-${idx}`, data: () => p }));
          }

          psDocs.forEach(pd => {
            eventsList.push({
              id: pd.id,
              source: "club",
              clubId: club.id,
              clubName: club.name || club.clubName || "Club",
              ...pd.data()
            });
          });
        } catch {}
      }

      setAllEvents(eventsList);
      setPageLoading(false);
    }
    load();
  }, [currentUser]);

  // Debounce search
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(searchQ), 250);
  }, [searchQ]);

  // Build trending skills
  const trendingSkills = (() => {
    const map = {};
    allPeople.forEach(p => {
      const rawSkills = [...(p.skillsKnown || []), ...(p.skillsLearn || [])];
      rawSkills.forEach(s => {
        const k = (typeof s === "string" ? s : s.name || "").toLowerCase();
        if (k) map[k] = (map[k] || 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 12);
  })();

  // Search/filter results
  const q = debouncedQ.toLowerCase().trim();
  const hasQuery = q.length > 0;

  const results = [];
  if (hasQuery) {
    // People
    if (activeFilter === "all" || activeFilter === "people" || activeFilter === "skills") {
      allPeople.filter(p => p.uid !== currentUser?.uid).forEach(p => {
        const nameMatch = (p.name || "").toLowerCase().includes(q);
        const skillMatch = [
          ...(p.skillsKnown || []).map(s => typeof s === "string" ? s : s.name || ""),
          ...(p.skillsLearn || [])
        ].some(s => s.toLowerCase().includes(q));
        const bioMatch = (p.bio || "").toLowerCase().includes(q);
        if (nameMatch || skillMatch || bioMatch) {
          results.push({ ...p, _type: "person", _skillMatch: skillMatch });
        }
      });
    }
    // Events
    if (activeFilter === "all" || activeFilter === "events") {
      allEvents.forEach(e => {
        if ((e.title || "").toLowerCase().includes(q) || (e.desc || "").toLowerCase().includes(q) ||
            (e.clubName || "").toLowerCase().includes(q) || (e.venue || "").toLowerCase().includes(q)) {
          results.push({ ...e, _type: "event" });
        }
      });
    }
    // Exchanges
    if (activeFilter === "all" || activeFilter === "exchanges") {
      allExchanges.forEach(e => {
        if ((e.offer || "").toLowerCase().includes(q) || (e.need || "").toLowerCase().includes(q) ||
            (e.name || "").toLowerCase().includes(q)) {
          results.push({ ...e, _type: "exchange" });
        }
      });
    }
  }

  const typeColor = (t) => {
    if (t === "hackathon") return "#f59e0b";
    if (t === "announcement") return "#818cf8";
    return "#10b981";
  };

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading discover...</div>
      </div>
    );
  }

  return (
    <div className="disc-body">
      <div className="bg-glow-disc" />

      <div className="disc-layout">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="disc-page-head fade-up d1 in">
          <div className="disc-page-label">// Search Everything</div>
          <h1 className="disc-page-title">🔍 <span>Discover</span></h1>
          <p className="disc-page-sub">Search for students, skills, events, clubs and exchanges across the entire campus network.</p>
        </div>

        {/* Search */}
        <div className="disc-search-section fade-up d2 in">
          <div className="disc-big-search-wrap">
            <span className="disc-search-icon-big">🔍</span>
            <input
              className="disc-big-search"
              placeholder="Search skills, names, events, clubs..."
              autoComplete="off"
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="disc-filter-tabs">
            {TYPE_FILTERS.map(f => (
              <div
                key={f}
                className={`disc-ftab${activeFilter === f ? " active" : ""}`}
                onClick={() => { setActiveFilter(f); }}
              >
                {f === "all" ? "✦ All" : f === "people" ? "👤 People" : f === "skills" ? "🛠 Skills" : f === "events" ? "📅 Events" : "🔄 Exchanges"}
              </div>
            ))}
          </div>
        </div>

        {/* Trending / Initial / Results */}
        {!hasQuery ? (
          <>
            <div className="disc-trending-section fade-up d3 in">
              <div className="disc-ts-label">🔥 Trending Skills on Campus</div>
              <div className="disc-trending-skills">
                {trendingSkills.map(([skill, count]) => (
                  <div key={skill} className="disc-ts-pill" onClick={() => setSearchQ(skill)}>
                    {skill.charAt(0).toUpperCase() + skill.slice(1)}
                    <span className="disc-ts-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="disc-initial-state fade-up d3 in">
              <div className="disc-is-icon">✨</div>
              <p className="disc-is-text">
                Type anything above to search.<br /><br />
                Find <strong style={{ color: "white" }}>students</strong> by name or skill.<br />
                Find <strong style={{ color: "white" }}>events</strong> and hackathons.<br />
                Find <strong style={{ color: "white" }}>skill exchanges</strong> you can join.<br />
                Find <strong style={{ color: "white" }}>clubs</strong> to be part of.
              </p>
            </div>
          </>
        ) : (
          <div>
            <div className="disc-results-head">
              <div className="disc-results-title">Results for "{debouncedQ}"</div>
              <div className="disc-results-count">{results.length}</div>
            </div>

            {results.length === 0 ? (
              <div className="disc-empty-state">
                <div className="disc-empty-icon">🔍</div>
                <p className="disc-empty-text">No results found for "{debouncedQ}".<br />Try a different skill or name.</p>
              </div>
            ) : results.map((r, i) => {
              if (r._type === "person") {
                const av = r.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(r.name || r.uid)}`;
                const skills = [
                  ...(r.skillsKnown || []).map(s => typeof s === "string" ? s : s.name || ""),
                ].slice(0, 4);
                return (
                  <div key={i} className="disc-person-card" onClick={() => navigate("/network")}>
                    <div className="disc-pc-av"><img src={av} alt="" loading="lazy" /></div>
                    <div className="disc-pc-info">
                      <div className="disc-pc-name">{r.name || "Student"}</div>
                      <div className="disc-pc-role">{r.role || "Student"} · {r.university || ""}</div>
                      <div className="disc-pc-skills">
                        {skills.map((s, j) => (
                          <span key={j} className={`disc-pc-skill${s.toLowerCase().includes(q) ? " match" : ""}`}>{s}</span>
                        ))}
                      </div>
                    </div>
                    <div className="disc-pc-coins">💰 {r.coins || 0}</div>
                  </div>
                );
              }
              if (r._type === "event") {
                const col = typeColor(r.type);
                return (
                  <div key={i} className="disc-ex-card" style={{ borderColor: `${col}33`, cursor: "pointer" }} onClick={() => navigate("/clubs")}>
                    <div style={{ height: 3, background: `linear-gradient(90deg, ${col}, transparent)`, borderRadius: "8px 8px 0 0", margin: "-16px -18px 12px -18px" }} />
                    <span style={{ fontFamily: "'Space Mono',monospace", fontSize: ".5rem", letterSpacing: ".1em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 100, background: `${col}18`, border: `1px solid ${col}33`, color: col, display: "inline-block", marginBottom: 8 }}>{r.type || "event"}</span>
                    <div style={{ fontSize: ".9rem", fontWeight: 800, marginBottom: 4 }}>{r.title || "Untitled"}</div>
                    <div style={{ fontSize: ".66rem", color: "#64748b", marginBottom: 6 }}>🛡️ {r.clubName || "Club"}</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {r.date && <span style={{ fontSize: ".68rem", color: "#64748b" }}>📅 {r.date}</span>}
                      {r.venue && <span style={{ fontSize: ".68rem", color: "#64748b" }}>📍 {r.venue}</span>}
                    </div>
                  </div>
                );
              }
              if (r._type === "exchange") {
                return (
                  <div key={i} className="disc-ex-card" style={{ cursor: "pointer" }} onClick={() => navigate("/skill-exchange")}>
                    <div className="disc-ex-swap">
                      <div className="disc-ex-side"><div className="disc-ex-lbl">Offering</div><div className="disc-ex-skill">{r.offer || "—"}</div></div>
                      <div className="disc-ex-arr">⇄</div>
                      <div className="disc-ex-side"><div className="disc-ex-lbl">Needs</div><div className="disc-ex-skill">{r.need || "—"}</div></div>
                    </div>
                    <div className="disc-ex-by">by {r.name || "Student"} · {r.level || ""} · {r.duration || ""}</div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
