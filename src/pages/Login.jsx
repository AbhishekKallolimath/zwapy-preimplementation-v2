import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./Auth.css";

const CURRENT_PROFILE_VERSION = 3;
const SUPER_ADMIN_UID = "MsCKd4jawaahdCaAGNN1LnticUE2";

export default function Login() {
  const navigate = useNavigate();
  const { devLoginAsMock } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [stats, setStats] = useState({ users: 0, exchanges: 0, certs: 0 });
  const [statsLoading, setStatsLoading] = useState(true);

  const handleMockLogin = (role) => {
    devLoginAsMock(role);

    let uid;
    if (role === "club_head") uid = "mock_club_head_uid";
    else if (role === "super_admin") uid = "MsCKd4jawaahdCaAGNN1LnticUE2";
    else if (role === "reva_student") uid = "mock-uid-studentrevaeduin";
    else uid = "MsCKd4jawaahdCaAGNN1LnticUE2_mock";

    const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
    const ud = localUsers[uid] || { role: "student" };

    if (uid === SUPER_ADMIN_UID) {
      navigate("/admin-dashboard");
    } else if (ud.role === "club_head") {
      if (!ud.clubName) navigate("/club-extra-details");
      else navigate("/club-dashboard");
    } else {
      if (!ud.name || (ud.profileVersion || 0) < CURRENT_PROFILE_VERSION) {
        navigate("/extra-details");
      } else {
        navigate("/dashboard");
      }
    }
  };

  // Floating background nodes particles
  const [particles, setParticles] = useState([]);
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

  // Fetch count-up statistics
  useEffect(() => {
    async function fetchStats() {
      try {
        const snap = await getDoc(doc(db, "stats", "platform"));
        if (snap.exists()) {
          const d = snap.data();
          animateCount("users", d.totalUsers || 0);
          animateCount("exchanges", d.totalExchanges || 0);
          animateCount("certs", d.totalCerts || 0);
        } else {
          setStats({ users: 0, exchanges: 0, certs: 0 });
        }
      } catch (err) {
        console.error("Error loading stats", err);
        setStats({ users: 0, exchanges: 0, certs: 0 });
      } finally {
        setStatsLoading(false);
      }
    }

    function animateCount(key, target) {
      if (!target) return;
      const steps = 40, dur = 1200;
      let step = 0;
      const iv = setInterval(() => {
        step++;
        setStats((prev) => ({
          ...prev,
          [key]: Math.min(Math.round((target / steps) * step), target)
        }));
        if (step >= steps) {
          clearInterval(iv);
          setStats((prev) => ({ ...prev, [key]: target }));
        }
      }, dur / steps);
    }

    fetchStats();
  }, []);

  // Routing check after login
  const afterLogin = async (user) => {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);

    if (user.uid === SUPER_ADMIN_UID) {
      if (!snap.exists()) {
        await setDoc(ref, {
          name: "Admin",
          email: user.email,
          role: "super_admin",
          createdAt: serverTimestamp()
        });
      } else if (snap.data().role !== "super_admin") {
        await setDoc(ref, { role: "super_admin" }, { merge: true });
      }
      navigate("/admin-dashboard");
      return;
    }

    if (!snap.exists()) {
      await setDoc(ref, {
        email: user.email,
        role: "student",
        profileVersion: 0,
        createdAt: serverTimestamp()
      });
      navigate("/extra-details");
      return;
    }

    const d = snap.data();
    const role = d.role || "student";

    if (role === "club_head") {
      if (!d.clubName) {
        navigate("/club-extra-details");
      } else {
        navigate("/club-dashboard");
      }
      return;
    }

    if (!d.name || (d.profileVersion || 0) < CURRENT_PROFILE_VERSION) {
      navigate("/extra-details");
      return;
    }

    navigate("/dashboard");
  };

  // Check persistent session on load
  useEffect(() => {
    const mockUserStr = localStorage.getItem("zwapy_mock_user");
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        const ud = localUsers[mockUser.uid] || { role: "student" };
        
        if (mockUser.uid === SUPER_ADMIN_UID) {
          navigate("/admin-dashboard");
        } else if (ud.role === "club_head") {
          if (!ud.clubName) {
            navigate("/club-extra-details");
          } else {
            navigate("/club-dashboard");
          }
        } else {
          if (!ud.name || (ud.profileVersion || 0) < CURRENT_PROFILE_VERSION) {
            navigate("/extra-details");
          } else {
            navigate("/dashboard");
          }
        }
        return;
      } catch (err) {
        console.error("Failed to parse mock user on load:", err);
      }
    }

    let authResolved = false;
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      authResolved = true;
      if (user) {
        await afterLogin(user);
      } else {
        setSessionChecking(false);
      }
    });

    const timer = setTimeout(() => {
      if (!authResolved) {
        console.warn("Firebase Auth session check timed out. Showing login screen.");
        setSessionChecking(false);
      }
    }, 2500);

    return () => {
      unsubscribe();
      clearTimeout(timer);
    };
  }, [navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setMsg({ text: "Please enter your email and password.", type: "error" });
      return;
    }
    setIsLoading(true);
    setMsg({ text: "", type: "" });

    // Intercept test credentials for offline mock login bypass
    if (
      trimmedEmail === "student@zwapy.com" ||
      trimmedEmail === "reva@zwapy.com" ||
      trimmedEmail === "club@zwapy.com" ||
      trimmedEmail === "admin@zwapy.com"
    ) {
      setTimeout(() => {
        let role = "student";
        if (trimmedEmail === "reva@zwapy.com") role = "reva_student";
        else if (trimmedEmail === "club@zwapy.com") role = "club_head";
        else if (trimmedEmail === "admin@zwapy.com") role = "super_admin";
        
        handleMockLogin(role);
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      setMsg({ text: "✅ Welcome back!", type: "success" });
      await afterLogin(cred.user);
    } catch (err) {
      console.error("Login error:", err);
      const msgs = {
        "auth/user-not-found": "No account found. Please sign up first.",
        "auth/wrong-password": "Incorrect password. Please try again.",
        "auth/invalid-email": "Please enter a valid email address.",
        "auth/too-many-requests": "Too many attempts. Please wait a moment.",
        "auth/invalid-credential": "Email or password is incorrect."
      };
      setMsg({
        text: `❌ ${msgs[err.code] || err.message || "Something went wrong."}`,
        type: "error"
      });
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setMsg({ text: "", type: "" });
    try {
      const result = await signInWithPopup(auth, provider);
      setMsg({ text: "✅ Signed in! Redirecting...", type: "success" });
      await afterLogin(result.user);
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google login error:", err);
        setMsg({ text: "❌ Google sign-in failed.", type: "error" });
      }
      setIsLoading(false);
    }
  };

  if (sessionChecking) {
    return (
      <div id="checkingScreen">
        <div className="cs-logo">ZWAPY</div>
        <div className="cs-bar">
          <div className="cs-fill"></div>
        </div>
        <div className="cs-text">Checking your session...</div>
      </div>
    );
  }

  return (
    <div className="auth-body">
      <div className="glow"></div>
      <div className="glow2"></div>
      <div className="nodes">
        {particles.map((p) => (
          <div
            key={p.id}
            className="node"
            style={{
              width: p.width,
              height: p.height,
              left: p.left,
              background: p.background,
              animationDuration: p.duration,
              animationDelay: p.delay
            }}
          />
        ))}
      </div>

      <div className="auth-container">
        {/* ============ LEFT PANEL ============ */}
        <div className="brand-showcase">
          <div className="brand-content-inner">
            <div className="brand-pill">
              <div className="bp-dot" />
              <span className="bp-text">Network Operational</span>
            </div>

            <h1 className="login-heading">
              You're Early.<br />
              Let's <span className="gradient-text">build together.</span>
            </h1>

            <p className="brand-desc">
              Join the next generation of neural engineers. Access the most
              advanced educational nodes and collaborate on the future of
              decentralized intelligence.
            </p>

            <div className="feature-cards">
              <div className="feature-card">
                <span className="fc-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <circle cx="5" cy="6" r="2" />
                    <circle cx="19" cy="6" r="2" />
                    <circle cx="5" cy="18" r="2" />
                    <circle cx="19" cy="18" r="2" />
                    <line x1="9.5" y1="10.5" x2="6.5" y2="7.5" />
                    <line x1="14.5" y1="10.5" x2="17.5" y2="7.5" />
                    <line x1="9.5" y1="13.5" x2="6.5" y2="16.5" />
                    <line x1="14.5" y1="13.5" x2="17.5" y2="16.5" />
                  </svg>
                </span>
                <div className="fc-title">Neural Nodes</div>
                <div className="fc-desc">
                  Scale your cognitive architecture through high-performance learning clusters.
                </div>
              </div>
              <div className="feature-card">
                <span className="fc-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                    <polyline points="7 8 10 11 7 14" />
                    <line x1="13" y1="14" x2="17" y2="14" />
                  </svg>
                </span>
                <div className="fc-title">Terminal Access</div>
                <div className="fc-desc">
                  Direct low-latency API hooks for engineering and research deployments.
                </div>
              </div>
            </div>

            <div className="brand-footer-wrap">
              <div className="brand-footer">
                © 2024 ZWAPY NEURAL NETWORK. ALL RIGHTS RESERVED.
              </div>
            </div>
          </div>
        </div>

        {/* ============ RIGHT PANEL ============ */}
        <div className="right-panel-flow">
          <div className="card">
            <div className="card-logo">
              <img src="/assets/zwapy-bglogo.png" alt="Zwapy" />
            </div>

            <h2>Welcome Back</h2>
            <p className="sub">Resume your neural session</p>

            <div className="stats-teaser">
              <div className="st-item">
                <div className={`st-val ${statsLoading ? "shimmer" : ""}`}>
                  {statsLoading ? "000" : stats.users}
                </div>
                <div className="st-label">Students</div>
              </div>
              <div className="st-item">
                <div className={`st-val ${statsLoading ? "shimmer" : ""}`}>
                  {statsLoading ? "000" : stats.exchanges}
                </div>
                <div className="st-label">Exchanges</div>
              </div>
              <div className="st-item">
                <div className={`st-val ${statsLoading ? "shimmer" : ""}`}>
                  {statsLoading ? "000" : stats.certs}
                </div>
                <div className="st-label">Certs Issued</div>
              </div>
            </div>

            {msg.text && (
              <div className={`msg ${msg.type}`}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleEmailLogin}>
              <div className="field">
                <label>Identity Endpoint</label>
                <div className="input-wrap">
                  <span className="field-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="4" />
                      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    placeholder="email@neural.network"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label>Security Token</label>
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
                    autoComplete="current-password"
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

              <div className="bypass-test-box">
                <div className="bypass-title">🔑 Testing Bypass Credentials:</div>
                <div className="bypass-list">
                  <div>Student (PU): <span>student@zwapy.com</span></div>
                  <div>Student (REVA): <span>reva@zwapy.com</span></div>
                  <div>Club Head: <span>club@zwapy.com</span></div>
                  <div>Super Admin: <span>admin@zwapy.com</span></div>
                </div>
                <div className="bypass-desc">(Use any password of your choice to authenticate)</div>
              </div>

              <div className="options-row">
                <label className="remember-me">
                  <input type="checkbox" />
                  <span>Keep Session Live</span>
                </label>
                <Link to="/change-password" className="forgot-link">Lost Token?</Link>
              </div>

              <button className="btn-login" type="submit" disabled={isLoading}>
                {isLoading ? "Authenticating..." : <>AUTHENTICATE <span className="btn-arrow">→</span></>}
              </button>
            </form>

            <button className="btn-google" onClick={handleGoogleLogin} style={{ marginTop: "20px" }}>
              Continue with Google
            </button>

            <div className="switch-row">
              New to the network?{" "}
              <Link to="/signup">Request Access</Link>
            </div>
          </div>

          <div className="status-badge">
            <div className="sb-dot" />
            <span className="sb-text">Uptime: 99.998%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
