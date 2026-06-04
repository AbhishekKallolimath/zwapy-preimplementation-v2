import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, provider } from "../firebase";
import "./Auth.css";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
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
    
    const maxTilt = 12; // Premium balanced 3D tilt angle
    
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

  // Floating background particles
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

  // Save referral code in localStorage on mount if provided in query URL
  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("zwapyRef", ref);
  }, [searchParams]);

  // Session check on mount
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        const snap = await getDoc(doc(db, "users", user.uid));
        const currentRole = snap.exists() ? snap.data().role || "student" : "student";
        if (currentRole === "super_admin") {
          navigate("/admin-dashboard");
        } else if (currentRole === "club_head") {
          navigate("/club-dashboard");
        } else {
          navigate("/dashboard");
        }
      } else {
        setSessionChecking(false);
      }
    });
    return unsubscribe;
  }, [navigate]);

  const createUserDoc = async (user, displayName) => {
    await setDoc(
      doc(db, "users", user.uid),
      {
        name: displayName || user.displayName || "Student",
        email: user.email,
        role: "student",
        university: "",
        skills: [],
        coins: 0,
        exchanges: 0,
        clubs: 0,
        createdAt: serverTimestamp()
      },
      { merge: true }
    );
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();

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

    setIsLoading(true);
    setMsg({ text: "", type: "" });

    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await createUserDoc(cred.user, name.trim());
      setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
      setTimeout(() => navigate("/extra-details"), 900);
    } catch (err) {
      console.error(err);
      let errMsg = "Something went wrong. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "An account with this email already exists. Please log in instead.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "Please enter a valid email address.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "Password is too weak. Use at least 6 characters.";
      }
      setMsg({ text: `❌ ${errMsg}`, type: "error" });
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setMsg({ text: "", type: "" });
    try {
      const result = await signInWithPopup(auth, provider);
      const snap = await getDoc(doc(db, "users", result.user.uid));
      if (snap.exists()) {
        const currentRole = snap.data().role || "student";
        setMsg({ text: "✅ Welcome back! Redirecting...", type: "success" });
        setTimeout(() => {
          if (currentRole === "club_head") navigate("/club-dashboard");
          else navigate("/dashboard");
        }, 800);
        return;
      }
      await createUserDoc(result.user, result.user.displayName);
      setMsg({ text: "✅ Account created! Setting up your profile...", type: "success" });
      setTimeout(() => navigate("/extra-details"), 900);
    } catch (err) {
      console.error(err);
      if (err.code !== "auth/popup-closed-by-user") {
        setMsg({ text: "❌ Google sign-up failed. Please try again.", type: "error" });
      }
    }
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
            <Link to="/" className="logo-wrap">
              <div className="logo-box">
                <img src="/assets/zwapy-bglogo.png" alt="Zwapy" />
              </div>
            </Link>

            <div className="brand-label-line">
              <div className="bll-line" />
              <span className="bll-text">A Neural Vision</span>
            </div>

            <h1>
              Build the<br />
              Future of<br />
              Intelligence.
            </h1>

            <p className="brand-desc">
              Connect with a global grid of engineers, researchers, and
              creators. Deploy nodes, share neural patterns, and scale
              your cognitive architectures.
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
                <span className="hi-text">+2.4k Nodes Active</span>
                <div className="hi-dot" />
              </div>
            </div>
          </div>
        </div>

        {/* ============ RIGHT PANEL ============ */}
        <div className="auth-right-pane">
          <div className="signup-pane">
            <div className="signup-heading">Join the<br />Network</div>
          <p className="signup-sub">
            Initialize your node to begin collaborating across the neural grid.
          </p>

          {msg.text && (
            <div className={`msg ${msg.type}`}>
              {msg.text}
            </div>
          )}

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
                  placeholder="name@neural.net"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Secure Password</label>
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
                <Link to="/privacy">Privacy Policy</Link> regarding
                data transmission.
              </span>
            </div>

            <button className="btn-signup" type="submit" disabled={isLoading}>
              {isLoading ? "Creating Account..." : <>Create My Account <span className="btn-arrow">→</span></>}
            </button>
          </form>

          <div className="divider">
            <span>or connect via</span>
          </div>

          <button className="btn-google" onClick={handleGoogleSignup} type="button">
            Continue with Google
          </button>

          <div className="switch-row">
            Already part of the grid?{" "}
            <Link to="/login">Sign In</Link>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}
