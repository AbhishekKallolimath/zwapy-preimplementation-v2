import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { db, auth } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import "./Profile.css";

const EDIT_COOLDOWN_HOURS = 24;
const LI_PAT = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[a-zA-Z0-9][a-zA-Z0-9_.-]{2,99}\/?$/;
const LI_BLOCK = ["profile", "yourprofile", "username", "yourname", "test", "demo", "admin", "fake", "null", "me"];

const fmt = n => Number(n || 0).toLocaleString();

function SkillChipInput({ chips, setChips, placeholder, chipClass = "" }) {
  const [val, setVal] = useState("");
  const inputRef = useRef(null);

  const add = (v) => {
    const s = v.trim().replace(/,$/, "").trim();
    if (!s || chips.includes(s)) return;
    setChips(prev => [...prev, s]);
    setVal("");
  };

  const remove = (s) => setChips(prev => prev.filter(x => x !== s));

  return (
    <div className="prof-skills-wrap" onClick={() => inputRef.current?.focus()}>
      {chips.map(s => (
        <div key={s} className={`prof-skill-chip${chipClass ? " " + chipClass : ""}`}>
          {s}
          <button type="button" onClick={() => remove(s)}>✕</button>
        </div>
      ))}
      <input
        ref={inputRef}
        className="prof-skill-input-el"
        placeholder={placeholder}
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === "Enter") { e.preventDefault(); add(val); }
          if (e.key === ",") { e.preventDefault(); add(val); }
          if (e.key === "Backspace" && !val && chips.length) { setChips(prev => prev.slice(0, -1)); }
        }}
        onBlur={() => { if (val.trim()) add(val); }}
      />
    </div>
  );
}

export default function Profile() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, refreshUserData } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [toast, setToast] = useState({ msg: "", type: "s", show: false });
  const toastTimer = useRef(null);

  // Form state
  const [role, setRole] = useState("Student");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [dob, setDob] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [liHint, setLiHint] = useState({ text: "e.g. linkedin.com/in/yourname", ok: null });
  const [bio, setBio] = useState("");
  const [startupInterest, setStartupInterest] = useState("");
  const [skillsKnown, setSkillsKnown] = useState([]);
  const [skillsLearn, setSkillsLearn] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [lockCountdown, setLockCountdown] = useState("");
  const [saving, setSaving] = useState(false);
  const [rank, setRank] = useState("—");

  const showToast = (msg, type = "s") => {
    clearTimeout(toastTimer.current);
    setToast({ msg, type, show: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 3200);
  };

  // Auth guard
  useEffect(() => {
    if (!loading && !currentUser) navigate("/login");
  }, [loading, currentUser, navigate]);

  // Populate from userData
  useEffect(() => {
    if (!userData) return;
    setRole(userData.role || "Student");
    setCourse(userData.course || "");
    setYear(userData.yearOfPassout || "");
    setDob(userData.dob || "");
    setLinkedin(userData.linkedin || "");
    setBio(userData.bio || "");
    setStartupInterest(userData.startupInterest || "");

    const rawSkills = userData.skillsKnown || [];
    setSkillsKnown(rawSkills.map(s => typeof s === "string" ? s : s.name || ""));
    setSkillsLearn([...(userData.skillsLearn || [])]);

    // Check 24hr lock
    const lastEdit = userData.lastProfileEdit?.toMillis ? userData.lastProfileEdit.toMillis() : null;
    if (lastEdit) {
      const hoursAgo = (Date.now() - lastEdit) / (1000 * 60 * 60);
      if (hoursAgo < EDIT_COOLDOWN_HOURS) {
        setIsLocked(true);
        const unlockAt = lastEdit + EDIT_COOLDOWN_HOURS * 60 * 60 * 1000;
        const tick = () => {
          const remaining = unlockAt - Date.now();
          if (remaining <= 0) { setLockCountdown("Unlocked! Refresh to edit."); return; }
          const h = Math.floor(remaining / 3600000);
          const m = Math.floor((remaining % 3600000) / 60000);
          const s = Math.floor((remaining % 60000) / 1000);
          setLockCountdown(`Unlocks in: ${h}h ${m}m ${s}s`);
          setTimeout(tick, 1000);
        };
        tick();
      }
    }
    setPageLoading(false);
  }, [userData]);

  const checkLI = (v) => {
    if (!v) { setLiHint({ text: "e.g. linkedin.com/in/yourname", ok: null }); return; }
    const ok = LI_PAT.test(v) && !LI_BLOCK.some(b => v.toLowerCase().includes("/in/" + b));
    setLiHint({ text: ok ? "✅ Valid LinkedIn URL" : "❌ Must be linkedin.com/in/your-real-username", ok });
  };

  const saveProfile = async () => {
    if (!currentUser) { showToast("Not logged in", "e"); return; }
    if (isLocked) { showToast("Profile editing is locked for 24 hours", "e"); return; }
    if (linkedin && !LI_PAT.test(linkedin)) { showToast("Enter a valid LinkedIn URL", "e"); return; }

    setSaving(true);
    try {
      const updates = {
        role: role || "Student",
        course: course || "",
        yearOfPassout: year ? parseInt(year) : 0,
        dob: dob || "",
        linkedin: linkedin || "",
        bio: bio.trim(),
        startupInterest: startupInterest || "",
        skillsKnown: skillsKnown.map(name => ({ name, level: "beginner", certUrl: "" })),
        skillsLearn,
        profileComplete: true,
        lastProfileEdit: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, "users", currentUser.uid), updates);
      await refreshUserData();
      showToast("✅ Profile saved!");
      setIsLocked(true);
    } catch (err) {
      showToast("Error: " + err.message, "e");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading profile...</div>
      </div>
    );
  }

  const name = userData?.name || currentUser?.displayName || "Student";
  const coins = userData?.coins || 0;
  const exchanges = userData?.exchanges || 0;
  const photo = userData?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
  const refCode = userData?.referralCode || currentUser?.uid?.substring(0, 8).toUpperCase();
  const refLink = `https://zwapy.com/signup?ref=${refCode}`;
  const referrals = userData?.referrals || 0;

  const copyRefLink = () => {
    try { navigator.clipboard.writeText(refLink); } catch {
      const ta = document.createElement("textarea");
      ta.value = refLink;
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
    }
    showToast("✅ Invite link copied!");
  };

  const hasExamScores = userData?.examTaken && (userData?.skillsKnown || []).length > 0;

  return (
    <div className="profile-body">
      <div className="bg-glow-prof" />
      <div className={`prof-toast${toast.show ? " show" : ""} ${toast.type}`}>{toast.msg}</div>

      <div className="prof-layout">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <div className="page-head fade-up d1 in">
          <div className="page-label">// Your Identity</div>
          <h1 className="page-title">Profile</h1>
        </div>

        {/* Hero Card */}
        <div className="prof-hero-card fade-up d1 in">
          <div className="prof-av-wrap">
            <img src={photo} className="prof-av-img" alt={name} />
            <span className="prof-av-badge">Photo · App</span>
          </div>
          <div className="prof-hero-info">
            <div className="prof-hero-name">{name}</div>
            <div className="prof-hero-role">{role} · Zwapy</div>
            <div className="prof-hero-tags">
              <span className="prof-htag prof-htag-cyan">{currentUser?.email}</span>
              {userData?.university && <span className="prof-htag prof-htag-green">{userData.university}</span>}
              {userData?.course && <span className="prof-htag prof-htag-indigo">{userData.course}</span>}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="prof-stats-row fade-up d2 in">
          <div className="prof-stat-card"><div className="prof-sv c">{fmt(coins)}</div><div className="prof-sl">Coins</div></div>
          <div className="prof-stat-card"><div className="prof-sv g">{fmt(exchanges)}</div><div className="prof-sl">Exchanges</div></div>
          <div className="prof-stat-card"><div className="prof-sv i">#—</div><div className="prof-sl">Rank</div></div>
          {userData?.examScores?.overall && (
            <div className="prof-stat-card"><div className="prof-sv a">{userData.examScores.overall}%</div><div className="prof-sl">Exam Score</div></div>
          )}
        </div>

        {/* Lock Banner */}
        {isLocked && (
          <div className="prof-lock-banner fade-up d2 in">
            <div className="prof-lock-icon">🔒</div>
            <div className="prof-lock-text">
              <h4>Profile editing is locked</h4>
              <p>You can edit your profile once every 24 hours to keep information accurate.</p>
              <div className="prof-lock-countdown">{lockCountdown}</div>
            </div>
          </div>
        )}

        <div className="prof-two-col">
          {/* Left col */}
          <div>
            {/* Read-only info */}
            <div className="prof-card fade-up d2 in">
              <div className="prof-card-title">// Account Info <div className="prof-card-title-line" /></div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">Name</div><div className="prof-ro-val">{name}</div>
              </div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">Email</div>
                <div><div className="prof-ro-val">{currentUser?.email}</div><div className="prof-ro-note">Login email — cannot change</div></div>
              </div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">Uni Email</div>
                <div>
                  <div className="prof-ro-val">{userData?.universityEmail || "Not set"}</div>
                  <div className="prof-ro-note">{userData?.universityEmailVerified ? "✅ Verified" : "—"}</div>
                </div>
              </div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">University</div><div className="prof-ro-val">{userData?.university || "Not set"}</div>
              </div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">Phone</div><div className="prof-ro-val">{userData?.phone || "Not set"}</div>
              </div>
              <div className="prof-ro-row">
                <div className="prof-ro-label">Version</div>
                <div><div className="prof-ro-val">v{userData?.profileVersion || 1}</div><div className="prof-ro-note">Auto-updates with Zwapy</div></div>
              </div>
            </div>

            {/* Edit Profile */}
            <div className="prof-card fade-up d3 in">
              <div className="prof-card-title">// Edit Profile <div className="prof-card-title-line" /></div>

              <div className="prof-field">
                <label>Role / Title</label>
                <select value={role} onChange={e => setRole(e.target.value)} disabled={isLocked}>
                  {["Student", "Founder", "Designer", "Developer", "Marketer", "Creator", "Researcher", "Entrepreneur"].map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              <div className="prof-field-row">
                <div className="prof-field">
                  <label>Course</label>
                  <select value={course} onChange={e => setCourse(e.target.value)} disabled={isLocked}>
                    <option value="">Select</option>
                    <optgroup label="Engineering">
                      {["B.Tech CSE", "B.Tech CSE (IoT)", "B.Tech CSE (AI & ML)", "B.Tech CSE (Data Science)", "B.Tech CSE (Cyber Security)", "B.Tech ECE", "B.Tech Mechanical", "B.Tech Civil", "B.Tech EEE", "B.Tech ISE", "M.Tech CSE"].map(c => (
                        <option key={c}>{c}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Management">
                      {["BBA", "BBA Finance", "MBA", "MBA Finance"].map(c => <option key={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Commerce & Arts">
                      {["B.Com", "BCA", "MCA", "B.Sc Computer Science", "BA Economics"].map(c => <option key={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Law">
                      {["BA LLB", "BBA LLB", "LLM"].map(c => <option key={c}>{c}</option>)}
                    </optgroup>
                    <optgroup label="Other">
                      {["B.Arch", "B.Des", "PhD", "Other"].map(c => <option key={c}>{c}</option>)}
                    </optgroup>
                  </select>
                </div>
                <div className="prof-field">
                  <label>Passout Year</label>
                  <select value={year} onChange={e => setYear(e.target.value)} disabled={isLocked}>
                    <option value="">Year</option>
                    {[2025, 2026, 2027, 2028, 2029, 2030, 2031, 2032].map(y => <option key={y}>{y}</option>)}
                  </select>
                </div>
              </div>

              <div className="prof-field">
                <label>Date of Birth <span className="prof-field-optional">(optional)</span></label>
                <input type="date" value={dob} onChange={e => setDob(e.target.value)} disabled={isLocked} />
              </div>

              <div className="prof-field">
                <label>LinkedIn <span className="prof-field-optional">(mandatory on Zwapy)</span></label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, background: "rgba(0,119,181,0.12)", border: "1px solid rgba(0,119,181,0.25)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".9rem", flexShrink: 0 }}>in</div>
                  <input
                    type="url"
                    value={linkedin}
                    placeholder="https://linkedin.com/in/yourname"
                    onChange={e => { setLinkedin(e.target.value); checkLI(e.target.value); }}
                    disabled={isLocked}
                    style={{ flex: 1 }}
                  />
                </div>
                <div className={`prof-field-hint${liHint.ok === true ? " ok" : liHint.ok === false ? " err" : ""}`}>{liHint.text}</div>
              </div>

              <div className="prof-field">
                <label>Bio <span className="prof-field-optional">(optional)</span></label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} disabled={isLocked} placeholder="Tell others what you're building, learning or interested in..." />
              </div>

              <div className="prof-field">
                <label>Startup / Project Interest</label>
                <select value={startupInterest} onChange={e => setStartupInterest(e.target.value)} disabled={isLocked}>
                  <option value="">Select</option>
                  <option value="startup">🚀 Building a startup</option>
                  <option value="project">⚙️ Open source / College projects</option>
                  <option value="both">💡 Both startups and projects</option>
                  <option value="none">📚 Just learning and exchanging skills</option>
                </select>
              </div>

              <div className="prof-field">
                <label>Skills I Know <span className="prof-field-optional">(Enter or comma)</span></label>
                {isLocked
                  ? <div className="prof-skills-wrap disabled">{skillsKnown.map(s => <div key={s} className="prof-skill-chip">{s}</div>)}</div>
                  : <SkillChipInput chips={skillsKnown} setChips={setSkillsKnown} placeholder="Add skill..." />}
              </div>

              <div className="prof-field">
                <label>Skills I Want to Learn <span className="prof-field-optional">(Enter or comma)</span></label>
                {isLocked
                  ? <div className="prof-skills-wrap disabled">{skillsLearn.map(s => <div key={s} className="prof-skill-chip learn">{s}</div>)}</div>
                  : <SkillChipInput chips={skillsLearn} setChips={setSkillsLearn} placeholder="Add skill..." chipClass="learn" />}
              </div>

              <button
                className="prof-save-btn"
                onClick={saveProfile}
                disabled={isLocked || saving}
              >
                {saving ? "Saving..." : isLocked ? "Editing locked (24hr cooldown)" : "Save Profile Changes"}
              </button>
            </div>
          </div>

          {/* Right col */}
          <div>
            {/* Referral */}
            <div className="prof-ref-card fade-up d4 in">
              <div className="prof-ref-head">
                <div className="prof-ref-title">// Invite & Earn</div>
                <div className="prof-ref-badge">+2 for you · +1 for friend</div>
              </div>
              <p className="prof-ref-desc">Share your invite link. When someone new joins Zwapy through your link, <strong style={{ color: "white" }}>you earn +2 coins</strong> and <strong style={{ color: "white" }}>they get +1 coin</strong>.</p>
              <div className="prof-ref-link-box">
                <span className="prof-ref-link-txt">{refLink}</span>
                <button className="prof-copy-btn" onClick={copyRefLink}>📋 Copy</button>
              </div>
              <div className="prof-ref-stats">
                <div className="prof-rsb"><div className="prof-rsb-val">{referrals}</div><div className="prof-rsb-label">Invited</div></div>
                <div className="prof-rsb"><div className="prof-rsb-val">+{referrals * 2}</div><div className="prof-rsb-label">Coins Earned</div></div>
              </div>
            </div>

            {/* Exam Scores */}
            {hasExamScores && (
              <div className="prof-card fade-up d4 in">
                <div className="prof-card-title">// Verified Skill Scores <div className="prof-card-title-line" /></div>
                {(userData.skillsKnown || []).map((sk, i) => {
                  const bd = userData?.examScores?.skillBreakdown || [];
                  const sd = bd.find(b => b.skill === (sk.name || sk));
                  const pct = sd ? sd.pct : null;
                  const color = pct == null ? "rgba(255,255,255,0.1)" : pct >= 70 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444";
                  return (
                    <div key={i} className="prof-skill-score-row">
                      <span style={{ fontSize: ".78rem", fontWeight: 700, flex: 1 }}>{sk.name || sk}</span>
                      {pct != null && (
                        <>
                          <div className="prof-ssr-bar-wrap"><div className="prof-ssr-bar" style={{ width: `${pct}%`, background: color }} /></div>
                          <span className="prof-ssr-pct">{pct}%</span>
                        </>
                      )}
                    </div>
                  );
                })}
                <Link to="/exam" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12, background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.18)", borderRadius: 9, padding: 8, fontSize: ".7rem", fontWeight: 800, color: "#00D4FF", textDecoration: "none" }}>
                  🔄 Retake Exam
                </Link>
              </div>
            )}

            {/* Sign Out */}
            <div className="prof-signout-card fade-up d5 in">
              <div className="prof-so-row">
                <div className="prof-so-text">
                  <h4>Sign Out</h4>
                  <p>Your coins and data are saved. Sign back in anytime with the same Google account.</p>
                </div>
                <button className="prof-so-btn" onClick={handleSignOut}>🚪 Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
