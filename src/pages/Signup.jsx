import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDevMode } = useAuth();
  const [name, setName] = useState("");
  const [isExiting, setIsExiting] = useState(false);

  const handleNavigate = (path) => {
    setIsExiting(true);
    setTimeout(() => navigate(path), 400);
  };

  // Registration flow states
  const [regStep, setRegStep] = useState("choose"); // 'choose', 'student', 'adminType', 'adminCode'
  const [selectedAdminType, setSelectedAdminType] = useState(""); // 'zwapy', 'clubhead', 'creagenix'
  const [adminCode, setAdminCode] = useState("");
  const [verifiedRole, setVerifiedRole] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  
  const cardRef = useRef(null);
  const [tiltStyle, setTiltStyle] = useState({});

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xc = rect.width / 2;
    const yc = rect.height / 2;
    const dx = (x - xc) / xc;
    const dy = (y - yc) / yc;
    const maxTilt = 12;
    setTiltStyle({
      transform: `perspective(1000px) rotateX(${-dy * maxTilt}deg) rotateY(${dx * maxTilt}deg) scale3d(1.02, 1.02, 1.02)`,
      transition: "transform 0.1s ease",
      "--mx": `${(x / rect.width) * 100}%`,
      "--my": `${(y / rect.height) * 100}%`
    });
  };

  const handleMouseLeave = () => {
    setTiltStyle({
      transform: "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "all 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
      "--mx": "50%",
      "--my": "50%"
    });
  };

  const [msg, setMsg] = useState({ text: "", type: "" });
  const [particles, setParticles] = useState([]);
  const [stats, setStats] = useState({ users: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchPlatformStats() {
      try {
        const snap = await getDoc(doc(db, "stats", "platform"));
        if (snap.exists()) {
          setStats({ users: snap.data().totalUsers || 0 });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchPlatformStats();
  }, []);

  useEffect(() => {
    const pts = [];
    for (let i = 0; i < 15; i++) {
      const s = Math.random() * 3 + 1;
      pts.push({
        id: i,
        width: `${s}px`,
        height: `${s}px`,
        left: `${Math.random() * 100}%`,
        background: `rgba(0, 212, 255, ${(Math.random() * 0.15 + 0.05).toFixed(2)})`,
        duration: `${Math.random() * 15 + 15}s`,
        delay: `-${Math.random() * 10}s`
      });
    }
    setParticles(pts);
  }, []);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("zwapyRef", ref);
  }, [searchParams]);

  // Session check – redirect if already logged in (based on Firebase or mock)
  useEffect(() => {
    const mockUserStr = localStorage.getItem("zwapy_mock_user");
    const isMockBypassEnabled = import.meta.env.VITE_USE_EMULATORS === "true";
    
    if (mockUserStr && isMockBypassEnabled) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        const ud = localUsers[mockUser.uid] || { role: "student" };
        if (ud.role === "super_admin") navigate("/admin-dashboard");
        else if (ud.role === "club_head") navigate("/club-dashboard");
        else if (ud.role === "creagenix_admin") navigate("/creagenix/admin");
        else navigate("/dashboard");
        return;
      } catch (err) {}
    }

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const ud = snap.data();
          const role = ud.role || "student";
          if (role === "super_admin") navigate("/admin-dashboard");
          else if (role === "club_head") navigate("/club-dashboard");
          else if (role === "creagenix_admin") navigate("/creagenix/admin");
          else if (!ud.name || (ud.profileVersion || 0) < 3) navigate("/extra-details");
          else navigate("/dashboard");
        } else {
          navigate("/extra-details");
        }
      } else {
        setSessionChecking(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

  const createUserDoc = async (user, displayName, role = "student") => {
    const profile = {
      name: displayName || user.displayName || "Student",
      email: user.email,
      role,
      university: "",
      skills: [],
      coins: 0,
      exchanges: 0,
      clubs: 0,
      createdAt: serverTimestamp()
    };
    const publicProfile = {
      name: profile.name,
      photoURL: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(profile.name)}`,
      role,
      university: "",
      course: "",
      yearOfPassout: 0,
      skillsKnown: [],
      skillsLearn: [],
      bio: "",
      exchanges: 0,
      clubs: 0,
      linkedin: "",
      github: "",
      createdAt: serverTimestamp()
    };
    await setDoc(doc(db, "users", user.uid), profile, { merge: true });
    await setDoc(doc(db, "public_profiles", user.uid), publicProfile, { merge: true });
  };

  // Admin code verification – tries Firestore first, then falls back to hardcoded
  const verifyAdminCode = async () => {
    if (!adminCode.trim()) {
      setMsg({ text: "Please enter the admin code.", type: "error" });
      return false;
    }
    let roleMap = "";
    if (selectedAdminType === "zwapy") roleMap = "super_admin";
    else if (selectedAdminType === "clubhead") roleMap = "club_head";
    else if (selectedAdminType === "creagenix") roleMap = "creagenix_admin";
    else return false;

    try {
      const codeDoc = await getDoc(doc(db, "admin_codes", selectedAdminType));
      let isValid = false;
      if (codeDoc.exists() && codeDoc.data().code === adminCode) {
        isValid = true;
      } else {
        // Fallback hardcoded codes (in case Firestore collection not set up)
        const hardcoded = {
          zwapy: "ZWAPY2026",
          clubhead: "CLUB2026",
          creagenix: "CREA2026"
        };
        if (adminCode === hardcoded[selectedAdminType]) isValid = true;
      }
      if (isValid) {
        setVerifiedRole(roleMap);
        setRegStep("student");
        setMsg({ text: "", type: "" });
        return true;
      } else {
        setMsg({ text: "Invalid admin code. Please check and try again.", type: "error" });
        return false;
      }
    } catch (err) {
      console.error(err);
      setMsg({ text: "Error verifying admin code. Try again.", type: "error" });
      return false;
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();

    if (regStep === "choose" || regStep === "adminType" || regStep === "adminCode") return;

    if (!name.trim()) {
      setMsg({ text: "Please enter your full name.", type: "error" });
      return;
    }
    if (!email.trim()) {
      setMsg({ text: "Please enter your email address.", type: "error" });
      return;
    }
    if (!password) {
      setMsg({ text: "Please create a password.", type: "error" });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: "Password must be at least 6 characters.", type: "error" });
      return;
    }
    if (!agreedTerms) {
      setMsg({ text: "Please agree to the Terms of Service and Privacy Policy.", type: "error" });
      return;
    }

    setIsLoading(true);
    setMsg({ text: "", type: "" });

    const isDevMode = import.meta.env.VITE_USE_EMULATORS === "true";
    const trimmedEmail = email.trim().toLowerCase();

    // Dev mode mock (offline testing)
    if (isDevMode && trimmedEmail.endsWith("@zwapy.com")) {
      setTimeout(() => {
        const mockUid = `mock_user_${Date.now()}`;
        const finalRole = verifiedRole || "student";
        const newUser = {
          uid: mockUid,
          name: name.trim(),
          email: trimmedEmail,
          role: finalRole,
          university: "",
          skills: [],
          coins: 0,
          exchanges: 0,
          clubs: 0,
          profileVersion: 0
        };
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        localUsers[mockUid] = newUser;
        localStorage.setItem("zwapy_local_users", JSON.stringify(localUsers));
        localStorage.setItem("zwapy_mock_user", JSON.stringify({
          uid: mockUid,
          email: newUser.email,
          displayName: newUser.name
        }));
        setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
        setIsExiting(true);
        setTimeout(() => window.location.reload(), 800);
      }, 500);
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      const finalRole = verifiedRole || "student";
      await createUserDoc(cred.user, name.trim(), finalRole);
      setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
      setIsExiting(true);
      if (finalRole === "super_admin") setTimeout(() => navigate("/admin-dashboard"), 800);
      else if (finalRole === "club_head") setTimeout(() => navigate("/club-dashboard"), 800);
      else if (finalRole === "creagenix_admin") setTimeout(() => navigate("/creagenix/admin"), 800);
      else setTimeout(() => navigate("/extra-details"), 800);
    } catch (err) {
      console.error(err);
      let errMsg = "Something went wrong. Please try again.";
      if (err.code === "auth/email-already-in-use") errMsg = "An account with this email already exists. Please log in instead.";
      else if (err.code === "auth/invalid-email") errMsg = "Please enter a valid email address.";
      else if (err.code === "auth/weak-password") errMsg = "Password is too weak. Use at least 6 characters.";
      setMsg({ text: `❌ ${errMsg}`, type: "error" });
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!agreedTerms) {
      setMsg({ text: "Please agree to the Terms of Service and Privacy Policy.", type: "error" });
      return;
    }
    setIsLoading(true);
    setMsg({ text: "", type: "" });
    const isDevMode = import.meta.env.VITE_USE_EMULATORS === "true";

    if (isDevMode) {
      setTimeout(() => {
        const mockUid = `mock_google_user_${Date.now()}`;
        const finalRole = verifiedRole || "student";
        const newUser = {
          uid: mockUid,
          name: "Mock Google Student",
          email: `google.student_${Date.now()}@zwapy.com`,
          role: finalRole,
          university: "",
          skills: [],
          coins: 0,
          exchanges: 0,
          clubs: 0,
          profileVersion: 0
        };
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        localUsers[mockUid] = newUser;
        localStorage.setItem("zwapy_local_users", JSON.stringify(localUsers));
        localStorage.setItem("zwapy_mock_user", JSON.stringify({
          uid: mockUid,
          email: newUser.email,
          displayName: newUser.name
        }));
        setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
        setIsExiting(true);
        setTimeout(() => window.location.reload(), 800);
      }, 500);
      return;
    }

    try {
      const result = await signInWithPopup(auth, provider);
      const snap = await getDoc(doc(db, "users", result.user.uid));
      if (snap.exists()) {
        const currentRole = snap.data().role || "student";
        setMsg({ text: "✅ Welcome back! Redirecting...", type: "success" });
        setIsExiting(true);
        setTimeout(() => {
          if (currentRole === "club_head") navigate("/club-dashboard");
          else if (currentRole === "super_admin") navigate("/admin-dashboard");
          else if (currentRole === "creagenix_admin") navigate("/creagenix/admin");
          else navigate("/dashboard");
        }, 800);
        return;
      }
      const finalRole = verifiedRole || "student";
      await createUserDoc(result.user, result.user.displayName, finalRole);
      setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
      setIsExiting(true);
      if (finalRole === "super_admin") setTimeout(() => navigate("/admin-dashboard"), 800);
      else if (finalRole === "club_head") setTimeout(() => navigate("/club-dashboard"), 800);
      else if (finalRole === "creagenix_admin") setTimeout(() => navigate("/creagenix/admin"), 800);
      else setTimeout(() => navigate("/extra-details"), 800);
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setMsg({ text: "❌ Google sign-up failed. Please try again.", type: "error" });
      }
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    if (regStep === "choose") {
      return (
        <div className="signup-pane">
          <div className="signup-heading">Join Zwapy</div>
          <p className="signup-sub">Choose how you want to register</p>
          <button className="btn-signup" onClick={() => setRegStep("student")} style={{ marginBottom: "1rem" }}>
            Register as Student
          </button>
          <button className="btn-google" onClick={() => setRegStep("adminType")}>
            Register as Admin
          </button>
          <div className="switch-row" style={{ marginTop: "1.5rem" }}>
            Already have an account?{" "}
            <Link to="/login" onClick={(e) => { e.preventDefault(); handleNavigate("/login"); }}>Login</Link>
          </div>
        </div>
      );
    }

    if (regStep === "adminType") {
      return (
        <div className="signup-pane">
          <div className="signup-heading">Select Admin Type</div>
          <p className="signup-sub">Choose your admin role</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
            <button className="btn-signup" onClick={() => { setSelectedAdminType("zwapy"); setRegStep("adminCode"); }} style={{ background: selectedAdminType === "zwapy" ? "#00D4FF" : "rgba(0,212,255,0.2)" }}>
              Zwapy Admin
            </button>
            <button className="btn-signup" onClick={() => { setSelectedAdminType("clubhead"); setRegStep("adminCode"); }} style={{ background: selectedAdminType === "clubhead" ? "#00D4FF" : "rgba(0,212,255,0.2)" }}>
              Club Head
            </button>
            <button className="btn-signup" onClick={() => { setSelectedAdminType("creagenix"); setRegStep("adminCode"); }} style={{ background: selectedAdminType === "creagenix" ? "#00D4FF" : "rgba(0,212,255,0.2)" }}>
              Creagenix Admin
            </button>
          </div>
          <button className="btn-google" onClick={() => setRegStep("choose")}>Back</button>
        </div>
      );
    }

    if (regStep === "adminCode") {
      return (
        <div className="signup-pane">
          <div className="signup-heading">Admin Code Required</div>
          <p className="signup-sub">Enter the code provided to you</p>
          <div className="field">
            <label>Admin Code</label>
            <div className="input-wrap">
              <span className="field-icon">🔑</span>
              <input
                type="text"
                placeholder="Enter code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
              />
            </div>
          </div>
          {msg.text && <div className={`msg ${msg.type}`}>{msg.text}</div>}
          <button className="btn-signup" onClick={verifyAdminCode} disabled={isLoading}>Verify Code</button>
          <button className="btn-google" onClick={() => setRegStep("adminType")} style={{ marginTop: "1rem" }}>Back</button>
        </div>
      );
    }

    // Final signup form (student or verified admin)
    return (
      <div className="signup-pane">
        <div className="signup-heading">Sign Up</div>
        <p className="signup-sub">Create an account to collaborate across the campus network.</p>
        {msg.text && <div className={`msg ${msg.type}`}>{msg.text}</div>}
        <form onSubmit={handleEmailSignup}>
          <div className="field">
            <label>Full Name</label>
            <div className="input-wrap">
              <span className="field-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Email Address</label>
            <div className="input-wrap">
              <span className="field-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                </svg>
              </span>
              <input
                type="email"
                placeholder="yourname@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>
          <div className="field">
            <label>Password</label>
            <div className="input-wrap">
              <span className="field-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="terms-row">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              required
            />
            <span>
              I agree to the <Link to="/terms">Terms of Service</Link> and{" "}
              <Link to="/privacy">Privacy Policy</Link>.
            </span>
          </div>
          <button className="btn-signup" type="submit" disabled={isLoading || !agreedTerms}>
            {isLoading ? "Creating Account..." : <>Create My Account <span className="btn-arrow">→</span></>}
          </button>
        </form>
        <div className="divider">
          <span>or connect via</span>
        </div>
        <button className="btn-google" onClick={handleGoogleSignup} type="button" disabled={isLoading || !agreedTerms}>
          {isLoading ? "Connecting..." : "Continue with Google"}
        </button>
        <div className="switch-row">
          Already have an account?{" "}
          <Link to="/login" onClick={(e) => { e.preventDefault(); handleNavigate("/login"); }}>Login</Link>
        </div>
      </div>
    );
  };

  if (sessionChecking) {
    return (
      <div id="checkingScreen">
        <div className="cs-logo">ZWAPY</div>
        <div className="cs-bar">
          <div className="cs-fill"></div>
        </div>
        <div className="cs-text">Checking session...</div>
      </div>
    );
  }

  return (
    <div className="auth-body signup-flow">
      <div className="glow"></div>
      <div className="glow2"></div>
      <div className="nodes">
        {particles.map((p) => (
          <div key={p.id} className="node" style={{ width: p.width, height: p.height, left: p.left, background: p.background, animationDuration: p.duration, animationDelay: p.delay }} />
        ))}
      </div>

      <div className="auth-container">
        {/* LEFT PANEL */}
        <div className={`brand-showcase ${isExiting ? "exiting" : ""}`}>
          <div className="brand-content-inner">
            <Link to="/" className="logo-wrap">
              <div className="logo-box">
                <img src="/assets/zwapy-bglogo.png" alt="Zwapy" className="logo-spin" />
              </div>
            </Link>
            <div className="brand-label-line">
              <div className="bll-line" />
              <span className="bll-text">Campus Student Network</span>
            </div>
            <h1>
              Connect.<br />
              Collaborate.<br />
              Grow.
            </h1>
            <p className="brand-desc">
              Connect with your campus community. Share skills, join student clubs,
              verify your expertise, and unlock career opportunities.
            </p>
            <div
              ref={cardRef}
              className="hero-image-block"
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={tiltStyle}
            >
              <img src="/assets/neural-hero.png" alt="Neural Network" />
              <div className="hi-badge">
                <div className="hi-avatars">
                  <img className="avatar-node" src="/assets/avatar1.png" alt="Node User 1" />
                  <img className="avatar-node" src="/assets/avatar2.png" alt="Node User 2" />
                  <img className="avatar-node" src="/assets/avatar3.png" alt="Node User 3" />
                </div>
                <span className="hi-text">{statsLoading ? "..." : `+${stats.users}`} Students Online</span>
                <div className="hi-dot" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL – dynamic step */}
        <div className={`auth-right-pane ${isExiting ? "exiting" : ""}`}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}