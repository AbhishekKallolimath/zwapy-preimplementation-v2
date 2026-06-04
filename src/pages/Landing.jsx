import { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import NeuralBackground from "../components/NeuralBackground";
import CustomCursor from "../components/CustomCursor";
import "./Landing.css";

export default function Landing() {
  const sphereRef = useRef(null);
  const navigate = useNavigate();

  // Route already-logged-in users straight to their dashboard
  useEffect(() => {
    const mockUserStr = localStorage.getItem("zwapy_mock_user");
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        const ud = localUsers[mockUser.uid] || { role: "student" };
        
        if (mockUser.uid === "MsCKd4jawaahdCaAGNN1LnticUE2") {
          navigate("/admin-dashboard");
        } else if (ud.role === "club_head") {
          navigate("/club-dashboard");
        } else {
          navigate("/dashboard");
        }
        return;
      } catch (err) {
        console.error("Failed to parse mock user on landing page load:", err);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          const role = snap.exists() ? snap.data().role || "student" : "student";
          if (role === "super_admin") {
            navigate("/admin-dashboard");
          } else if (role === "club_head") {
            navigate("/club-dashboard");
          } else {
            navigate("/dashboard");
          }
        } catch (e) {
          console.error(e);
        }
      }
    });
    return unsubscribe;
  }, [navigate]);

  // 3D Canvas Sphere Animation
  useEffect(() => {
    const canvas = sphereRef.current;
    if (!canvas) return;
    const sctx = canvas.getContext("2d");
    let sphereSize = window.innerWidth < 768 ? 280 : 700;

    const initSphere = () => {
      sphereSize = window.innerWidth < 768 ? 280 : 700;
      canvas.width = sphereSize;
      canvas.height = sphereSize;
      canvas.style.width = `${sphereSize}px`;
      canvas.style.height = `${sphereSize}px`;
    };
    initSphere();

    const SPHERE_DOTS = [];
    const NUM_DOTS = 320;

    const buildDots = () => {
      SPHERE_DOTS.length = 0;
      const r = window.innerWidth < 768 ? 110 : 280;
      for (let i = 0; i < NUM_DOTS; i++) {
        const theta = Math.acos(1 - (2 * (i + 0.5)) / NUM_DOTS);
        const phi = Math.PI * (1 + Math.sqrt(5)) * i;
        SPHERE_DOTS.push({
          ox: r * Math.sin(theta) * Math.cos(phi),
          oy: r * Math.sin(theta) * Math.sin(phi),
          oz: r * Math.cos(theta),
        });
      }
    };
    buildDots();

    const LINES = [];
    const buildLines = () => {
      LINES.length = 0;
      const r = window.innerWidth < 768 ? 110 : 280;
      const segs = 64;

      // Latitude rings
      for (let lat = -80; lat <= 80; lat += 20) {
        const pts2 = [];
        for (let i = 0; i <= segs; i++) {
          const lng = (i / segs) * 2 * Math.PI;
          const latR = (lat * Math.PI) / 180;
          pts2.push({
            ox: r * Math.cos(latR) * Math.cos(lng),
            oy: r * Math.cos(latR) * Math.sin(lng),
            oz: r * Math.sin(latR),
          });
        }
        LINES.push(pts2);
      }

      // Longitude meridians
      for (let lng = 0; lng < 360; lng += 30) {
        const pts2 = [];
        const lngR = (lng * Math.PI) / 180;
        for (let i = 0; i <= segs; i++) {
          const lat2 = ((i / segs) * 180 - 90 * Math.PI) / 180; // Fixed longitude mapping
          pts2.push({
            ox: r * Math.cos(lat2) * Math.cos(lngR),
            oy: r * Math.cos(lat2) * Math.sin(lngR),
            oz: r * Math.sin(lat2),
          });
        }
        LINES.push(pts2);
      }
    };
    buildLines();

    let rotY = 0, rotX = 0.3;
    let targetRotY = 0, targetRotX = 0.3;

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);
      targetRotY = dx * 0.8;
      targetRotX = 0.3 + dy * 0.4;
    };

    window.addEventListener("mousemove", handleMouseMove);

    const rotatePoint = (p, rx, ry) => {
      let y1 = p.oy * Math.cos(rx) - p.oz * Math.sin(rx);
      let z1 = p.oy * Math.sin(rx) + p.oz * Math.cos(rx);
      let x2 = p.ox * Math.cos(ry) + z1 * Math.sin(ry);
      let z2 = -p.ox * Math.sin(ry) + z1 * Math.cos(ry);
      return { x: x2, y: y1, z: z2 };
    };

    let animationId;
    const drawSphere = () => {
      const sz = window.innerWidth < 768 ? 280 : 700;
      const cx = sz / 2, cy = sz / 2;

      rotY += (targetRotY - rotY) * 0.04;
      rotX += (targetRotX - rotX) * 0.04;
      const autoRotY = performance.now() * 0.0003;
      const finalRotY = rotY + autoRotY;

      sctx.clearRect(0, 0, sz, sz);

      const grd = sctx.createRadialGradient(cx, cy, 0, cx, cy, sz * 0.48);
      grd.addColorStop(0, "rgba(0,212,255,0.04)");
      grd.addColorStop(0.6, "rgba(0,212,255,0.02)");
      grd.addColorStop(1, "rgba(0,212,255,0)");
      sctx.fillStyle = grd;
      sctx.beginPath();
      sctx.arc(cx, cy, sz * 0.48, 0, Math.PI * 2);
      sctx.fill();

      LINES.forEach((pts2) => {
        sctx.beginPath();
        let first = true;
        pts2.forEach((p) => {
          const rp = rotatePoint(p, rotX, finalRotY);
          const px = cx + rp.x;
          const py = cy + rp.y;
          if (rp.z > -50) {
            if (first) {
              sctx.moveTo(px, py);
              first = false;
            } else {
              sctx.lineTo(px, py);
            }
          } else {
            first = true;
          }
        });
        sctx.strokeStyle = `rgba(0,212,255,0.07)`;
        sctx.lineWidth = 0.6;
        sctx.stroke();
      });

      SPHERE_DOTS.forEach((p) => {
        const rp = rotatePoint(p, rotX, finalRotY);
        if (rp.z < -20) return;
        const depth = (rp.z + 300) / 600;
        const px = cx + rp.x;
        const py = cy + rp.y;
        const size = depth * 2.2 + 0.3;
        const alpha = depth * 0.7 + 0.1;

        sctx.beginPath();
        sctx.arc(px, py, size, 0, Math.PI * 2);
        sctx.fillStyle = `rgba(0,212,255,${alpha})`;
        sctx.fill();

        if (depth > 0.7) {
          sctx.beginPath();
          sctx.arc(px, py, size * 3, 0, Math.PI * 2);
          sctx.fillStyle = `rgba(0,212,255,${alpha * 0.08})`;
          sctx.fill();
        }
      });

      const ringGrd = sctx.createRadialGradient(cx, cy, sz * 0.36, cx, cy, sz * 0.5);
      ringGrd.addColorStop(0, "rgba(0,212,255,0)");
      ringGrd.addColorStop(0.7, "rgba(0,212,255,0.03)");
      ringGrd.addColorStop(1, "rgba(0,212,255,0.12)");
      sctx.fillStyle = ringGrd;
      sctx.beginPath();
      sctx.arc(cx, cy, sz * 0.5, 0, Math.PI * 2);
      sctx.fill();

      animationId = requestAnimationFrame(drawSphere);
    };
    drawSphere();

    const handleResize = () => {
      initSphere();
      buildDots();
      buildLines();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  // Handle CSS scroll glow and bento glows
  useEffect(() => {
    const handleScroll = () => {
      const nav = document.getElementById("nav");
      if (nav) {
        nav.classList.toggle("sc", window.scrollY > 40);
      }
    };
    window.addEventListener("scroll", handleScroll);

    const bentoCards = document.querySelectorAll(".bc");
    bentoCards.forEach((c) => {
      const handleCardGlow = (e) => {
        const r = c.getBoundingClientRect();
        c.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        c.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      };
      c.addEventListener("mousemove", handleCardGlow);
      return () => c.removeEventListener("mousemove", handleCardGlow);
    });

    // Reveal elements on scroll
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add("vi");
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll(".rv").forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener("scroll", handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      <CustomCursor />
      <NeuralBackground />

      {/* Navigation */}
      <nav id="nav" className="landing-nav" style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "20px 48px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        transition: "background 0.4s",
      }}>
        <Link to="/" className="nl" style={{ display: "flex", alignItems: "center", gap: "12px", textDecoration: "none" }}>
          <img src="assets/zwapy-bglogo.png" alt="Zwapy" className="logo-spin" style={{ width: "42px", height: "42px" }} />
          <span className="nw" style={{ fontSize: "1.55rem", fontWeight: 900, color: "white", fontStyle: "italic" }}>ZWAPY</span>
        </Link>
        <div className="nbs" style={{ display: "flex", gap: "10px" }}>
          <Link to="/login" className="nb">Login</Link>
          <Link to="/signup" className="nb">Start Sync</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="gr">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>

        <div className="sphere-wrap">
          <canvas ref={sphereRef} id="sphere" width="700" height="700"></canvas>
        </div>

        <div className="blob" style={{ width: "500px", height: "500px", top: "8%", left: "15%" }}></div>
        <div className="blob" style={{ width: "380px", height: "380px", bottom: "12%", right: "12%", animationDelay: "-5s" }}></div>

        <div className="hero-content">
          <h1 className="htitle">
            <span className="l1">THE STUDENT</span>
            <span className="l2">NERVE CENTER</span>
          </h1>
          <p className="hsub">The neural student network. Skill exchange, campus events, and real-world collaboration — pulsing through one central hub.</p>
          <div className="hbtns">
            <Link to="/signup" className="bp">JOIN THE NETWORK</Link>
            <a href="#vision" className="bg-btn">LEARN VISION</a>
            <a href="about.html" className="bg-btn">ABOUT US</a>
          </div>
        </div>

        <div className="sh">
          <span>Scroll</span>
          <div className="sl"></div>
        </div>
      </section>

      {/* Ticker */}
      <div className="tw">
        <div className="tk">
          <span className="ti">Skill Exchange <span className="xd"></span></span>
          <span className="ti">Campus Events <span className="xd"></span></span>
          <span className="ti">Real Collaboration <span className="xd"></span></span>
          <span className="ti">Neural Network <span className="xd"></span></span>
          <span className="ti">Student Synergy <span className="xd"></span></span>
          <span className="ti">Connect. Build. Grow. <span className="xd"></span></span>
          {/* Repeating for smooth ticker loop */}
          <span className="ti">Skill Exchange <span className="xd"></span></span>
          <span className="ti">Campus Events <span className="xd"></span></span>
          <span className="ti">Real Collaboration <span className="xd"></span></span>
          <span className="ti">Neural Network <span className="xd"></span></span>
          <span className="ti">Student Synergy <span className="xd"></span></span>
          <span className="ti">Connect. Build. Grow. <span className="xd"></span></span>
        </div>
      </div>

      {/* Image Section */}
      <div className="is rv">
        <div className="iw">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1600&q=80" alt="Students Connecting" />
          <div className="io"></div>
          <div className="ib">
            <h3>Neural Exchange</h3>
            <p>A world where skills are not just learned — they are traded, amplified, and connected across borders.</p>
          </div>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="bs">
        <p className="ey rv">// Core Capabilities</p>
        <h2 className="st rv">What Makes<br /><span>Zwapy Different</span></h2>
        <div className="bg2">
          <div className="bc rv">
            <span className="bi">🔗</span>
            <h3>Skill Liquidity</h3>
            <p>Trade your coding skills for design help. Move faster by collaborating with the best minds on campus — a living, breathing skill economy built for students.</p>
          </div>
          <div className="bc rv d1">
            <div className="bcs">∞</div>
            <h3>Potential Unlocked</h3>
            <p style={{ marginTop: "14px", fontSize: ".84rem", color: "var(--slate)" }}>The network effect compounds. Every new student makes the platform exponentially more valuable.</p>
          </div>
          <div className="bc rv d1"><span className="bi">⚡</span><h3>Event Pulsing</h3><p>Never miss a club event. From hackathons to workshops, the hub tracks every heartbeat of campus life.</p></div>
          <div className="bc rv d2"><span className="bi">🌐</span><h3>Cross-Campus</h3><p>Break out of your university bubble. Connect with students across institutions, cities, and disciplines.</p></div>
          <div className="bc rv d3"><span className="bi">🧠</span><h3>Neural Matching</h3><p>Smart connections that understand what you need and who can help — right now, not someday.</p></div>
        </div>
      </div>

      {/* Vision */}
      <section id="vision" className="vs">
        <div className="vg">
          <div className="vl rv">
            <h2>Empowering<br /><span>The Core</span></h2>
            <div className="fi"><div className="fic">🔄</div><div className="ft"><h4>Skill Liquidity</h4><p>Trade your coding skills for design help. Move faster by collaborating with the best minds on campus.</p></div></div>
            <div className="fi"><div className="fic">📡</div><div className="ft"><h4>Event Pulsing</h4><p>Never miss a club event. From hackathons to workshops, the hub tracks every heartbeat of campus life.</p></div></div>
            <div className="fi"><div className="fic">🤝</div><div className="ft"><h4>Real Collaboration</h4><p>Build projects, solve problems, and grow your portfolio with real peers who are as driven as you.</p></div></div>
            <div className="fi"><div className="fic">🚀</div><div className="ft"><h4>Career Launchpad</h4><p>Real-world connections that turn college projects into career opportunities before you even graduate.</p></div></div>
          </div>
          <div className="sc2 rv d2">
            <div className="sk"><div className="sn">149+</div><div className="slb">Early Access Spots</div></div>
            <div className="sk ac"><div className="sn">5</div><div className="slb">Ambassador Positions</div></div>
            <div className="sk"><div className="sn">1</div><div className="slb">University. Phase One.</div></div>
            <div className="sk"><div className="sn">∞</div><div className="slb">Potential</div></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cs">
        <div className="ci rv">
          <h2>Ready to join<br />the <span>Sync?</span></h2>
          <div style={{ display: "flex", gap: "14px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link to="/signup" className="bp" style={{ fontSize: ".95rem", padding: "18px 52px", cursor: "pointer" }}>CREATE ACCOUNT</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="fi2">
          <div className="fb">
            <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
              <img src="assets/zwapy-bglogo.png" alt="Zwapy" className="logo-spin" style={{ width: "34px", height: "34px" }} />
              <span style={{ fontSize: "1.4rem", fontWeight: 900, fontStyle: "italic", letterSpacing: "-.02em" }}>ZWAPY</span>
            </div>
            <p>Revolutionizing student synergy through skill exchange and connectivity.</p>
            <div className="socs">
              <a href="https://www.instagram.com/zwapy.official_?igsh=MThvaDJwbjJjaG11aA==" target="_blank" rel="noopener noreferrer" className="soc" aria-label="Instagram">
                <svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>
              </a>
              <a href="https://www.linkedin.com/company/zwapy-official/" target="_blank" rel="noopener noreferrer" className="soc" aria-label="LinkedIn">
                <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
              </a>
              <a href="https://x.com" target="_blank" rel="noopener noreferrer" className="soc" aria-label="X (Twitter)">
                <svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </div>
          <div className="fc">
            <h5>Zwapy</h5>
            <p>+91 6362053192</p>
            <p>zwapyteam@gmail.com</p>
          </div>
          <div className="fc">
            <h5>Location</h5>
            <p>Bangalore, Karnataka</p>
            <p>India</p>
          </div>
          <div className="fc">
            <h5>Legal</h5>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms of Service</Link>
          </div>
        </div>
        <div className="fb2">
          <p>© {new Date().getFullYear()} Zwapy Team. All rights reserved.</p>
          <p>Built in Bangalore 🇮🇳 <img src="https://m.media-amazon.com/images/I/31bS1xVlCQL._AC_UF1000,1000_QL80_.jpg" className="ka-flag" alt="Karnataka Flag" /></p>
        </div>
      </footer>
    </>
  );
}
