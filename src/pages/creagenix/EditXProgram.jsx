import { Link } from "react-router-dom";

export default function EditXProgram() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* Hero Section */}
        <div style={styles.hero}>
          <h1 style={styles.title}>EDIT X <span style={styles.cyan}>PROGRAM</span></h1>
          <p style={styles.subtitle}>Online & Offline Creative Education · Video Editing · Videography · AI Tools</p>
          <div style={styles.ctaRow}>
            <Link to="/workshop-register/editx-online/Edit%20X%20Online%20Program" style={styles.registerBtn}>📌 Register for Online</Link>
            <Link to="/workshop-register/editx-offline/Edit%20X%20Offline%20Program" style={styles.registerBtn}>🏢 Register for Offline</Link>
          </div>
        </div>

        {/* Online Program */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🎬 1. ONLINE PROGRAM — EDIT X</h2>
          <p style={styles.sectionDesc}>Comprehensive curriculum from foundations to professional‑grade skills in video editing, motion graphics, and AI‑assisted content creation.</p>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Premiere Pro — 9 Weeks</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Editing fundamentals, workflow & advanced editing</li>
                <li style={styles.listItem}>Effects & animation, visual enhancement</li>
                <li style={styles.listItem}>Creative effects & audio, retention editing</li>
                <li style={styles.listItem}>AI tools: ElevenLabs, Runway, ChatGPT, Ideogram</li>
                <li style={styles.listItem}>Career & portfolio building</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>After Effects — 6 Modules</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Foundations, plugins (Sapphire, BCC), VFX & compositing</li>
                <li style={styles.listItem}>Tracking techniques, 3D & advanced editing</li>
                <li style={styles.listItem}>Professional editing, showreel creation</li>
                <li style={styles.listItem}>Freelancing & client handling, career guidance</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Online Program Inclusions</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>📌 Personal mentorship</li>
                <li style={styles.listItem}>📌 Weekly assignments</li>
                <li style={styles.listItem}>📌 Asset pack (worth ₹22,999)</li>
                <li style={styles.listItem}>📌 Portfolio building & placement support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Offline Program */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🏛️ 2. OFFLINE PROGRAM — EDIT X</h2>
          <div style={styles.badgeRow}>
            <span style={styles.badge}>2 Batch Timings</span>
            <span style={styles.badge}>3 Certifications</span>
            <span style={styles.badge}>100% Personalized</span>
            <span style={styles.badge}>4 Months Duration</span>
          </div>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Certifications</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>NSDC Certification — National Skill Development Corporation</li>
                <li style={styles.listItem}>ISO Certified Program</li>
                <li style={styles.listItem}>IAO Accreditation — International Accreditation Organization</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Batch Timings</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Afternoon batch: 12:20 PM – 2:20 PM (Weekdays)</li>
                <li style={styles.listItem}>Evening batch: 4:00 PM – 6:00 PM (Weekdays)</li>
                <li style={styles.listItem}>Video editing: 2 days/week | Videography: 1 day/week</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Why Choose Edit X Offline</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>🧑‍🏫 Personal mentorship – 1‑on‑1</li>
                <li style={styles.listItem}>📋 Tracksheet system – learn at your own pace</li>
                <li style={styles.listItem}>💻 PC provided in‑class (no laptop needed)</li>
                <li style={styles.listItem}>🌳 Outdoor shoots – real videography sessions</li>
                <li style={styles.listItem}>🏆 Monthly best performer – special rewards</li>
                <li style={styles.listItem}>🎯 Placement support – portfolio + job connections</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Curriculum */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📚 3. CURRICULUM (WEEK‑BY‑WEEK)</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Premiere Pro – Weekly Breakdown</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}><strong>Week 1</strong> – Interface, importing, timeline, cutting, audio basics</li>
                <li style={styles.listItem}><strong>Week 2</strong> – Export settings, picture‑in‑picture, speed ramping</li>
                <li style={styles.listItem}><strong>Week 3</strong> – Effects, text, keyframes, preview render</li>
                <li style={styles.listItem}><strong>Week 4</strong> – Masking, adjustment layer, green screen, color grading, 3D</li>
                <li style={styles.listItem}><strong>Week 5</strong> – Dream glow effect, advanced audio</li>
                <li style={styles.listItem}><strong>Week 6</strong> – Retention editing (hooks, CTA, pacing)</li>
                <li style={styles.listItem}><strong>Week 7‑8</strong> – AI tools (ElevenLabs, Runway, ChatGPT, Ideogram)</li>
                <li style={styles.listItem}><strong>Week 9</strong> – Portfolio building</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>After Effects – Module Breakdown</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}><strong>Module 1</strong> – Interface, keyframes, composition, export</li>
                <li style={styles.listItem}><strong>Module 2</strong> – Plugins: Sapphire, BCC</li>
                <li style={styles.listItem}><strong>Module 3</strong> – VFX: rotoscope, green screen, AI background removal</li>
                <li style={styles.listItem}><strong>Module 4</strong> – Motion tracking, camera tracking</li>
                <li style={styles.listItem}><strong>Module 5</strong> – 3D world: parallax, 3D text, null objects, models</li>
                <li style={styles.listItem}><strong>Module 6</strong> – Documentary edit, motion graphics, AI mastery</li>
                <li style={styles.listItem}><strong>Bonus</strong> – AI video platforms, Photoshop basics</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Photography & Videography */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>📷 4. PHOTOGRAPHY & VIDEOGRAPHY</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Phase 1 – Beginner Fundamentals</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Camera basics, exposure triangle, composition, visual storytelling</li>
                <li style={styles.listItem}>Frame rates, resolution, focus modes, basic camera movements</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Phase 2 – Advanced Storytelling</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Studio flash, light control, gimbal, professional audio</li>
                <li style={styles.listItem}>Portrait, landscape, macro, street photography</li>
              </ul>
            </div>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>Phase 3 – Professional Industry Ready</h3>
              <ul style={styles.list}>
                <li style={styles.listItem}>Product/fashion/advertisement photography, client shooting</li>
                <li style={styles.listItem}>Portfolio, pre‑shoot checklist, editing workflow, client handling</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Bonuses & Extras */}
        <section style={styles.section}>
          <h2 style={styles.sectionTitle}>🎁 5. BONUSES & EXTRAS</h2>
          <div style={styles.cardGrid}>
            <div style={styles.card}>
              <ul style={styles.list}>
                <li style={styles.listItem}>🎁 Monthly Best Performer Gift</li>
                <li style={styles.listItem}>📦 Asset Pack worth ₹22,999 (premium transitions, presets, sound packs)</li>
                <li style={styles.listItem}>🌳 Outdoor Videography Sessions</li>
                <li style={styles.listItem}>🤖 AI Tools Mastery (Runway, ElevenLabs, ChatGPT, Ideogram)</li>
                <li style={styles.listItem}>📂 Portfolio + Placement Support</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <div style={styles.ctaSection}>
          <h2 style={styles.ctaTitle}>START YOUR CREATIVE JOURNEY</h2>
          <p style={styles.ctaSub}>Limited seats per batch. Book your spot before it fills up.</p>
          <div style={styles.ctaRow}>
            <Link to="/workshop-register/editx-online/Edit%20X%20Online%20Program" style={styles.registerBtn}>📌 Register for Online</Link>
            <Link to="/workshop-register/editx-offline/Edit%20X%20Offline%20Program" style={styles.registerBtn}>🏢 Register for Offline</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline styles – exactly matching the dashboard's design language
const styles = {
  page: {
    minHeight: "100vh",
    background: "#020024",  // same as dashboard body
    padding: "2rem",
    fontFamily: "'Sora', sans-serif",
    color: "#fff",
    position: "relative",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    position: "relative",
    zIndex: 10,
  },
  hero: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  title: {
    fontSize: "clamp(2.2rem, 8vw, 3.5rem)",
    fontWeight: 900,
    fontStyle: "italic",
    letterSpacing: "-0.02em",
    marginBottom: "0.5rem",
  },
  cyan: {
    color: "#00D4FF",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#94a3b8",
    marginBottom: "1.5rem",
  },
  ctaRow: {
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  registerBtn: {
    display: "inline-block",
    background: "#00D4FF",
    color: "#000",
    padding: "0.75rem 1.8rem",
    borderRadius: "40px",
    fontWeight: "800",
    textDecoration: "none",
    transition: "transform 0.2s, box-shadow 0.2s",
    boxShadow: "0 0 12px rgba(0,212,255,0.3)",
    cursor: "pointer",
  },
  section: {
    marginBottom: "3rem",
  },
  sectionTitle: {
    fontSize: "1.4rem",
    fontWeight: 800,
    marginBottom: "1rem",
    borderLeft: "4px solid #00D4FF",
    paddingLeft: "1rem",
    fontStyle: "italic",
  },
  sectionDesc: {
    color: "#cbd5e1",
    marginBottom: "1.5rem",
    lineHeight: 1.6,
  },
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "rgba(0, 212, 255, 0.03)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(0, 212, 255, 0.1)",
    borderRadius: "18px",
    padding: "1.5rem",
    transition: "transform 0.25s, border-color 0.25s",
    textAlign: "left",
  },
  cardTitle: {
    fontSize: "1.2rem",
    fontWeight: 800,
    marginBottom: "1rem",
    color: "#00D4FF",
  },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  listItem: {
    marginBottom: "0.5rem",
    paddingLeft: "1rem",
    position: "relative",
    color: "#cbd5e1",
    fontSize: "0.85rem",
    lineHeight: 1.5,
  },
  badgeRow: {
    display: "flex",
    gap: "0.8rem",
    flexWrap: "wrap",
    marginBottom: "1.5rem",
  },
  badge: {
    background: "rgba(0, 212, 255, 0.08)",
    border: "1px solid rgba(0, 212, 255, 0.2)",
    padding: "0.3rem 0.9rem",
    borderRadius: "40px",
    fontSize: "0.7rem",
    fontWeight: "bold",
    color: "#00D4FF",
    fontFamily: "'Space Mono', monospace",
  },
  ctaSection: {
    textAlign: "center",
    marginTop: "3rem",
    padding: "2rem",
    background: "rgba(0, 212, 255, 0.02)",
    borderRadius: "28px",
    border: "1px solid rgba(0, 212, 255, 0.1)",
  },
  ctaTitle: {
    fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
    fontWeight: 900,
    fontStyle: "italic",
    marginBottom: "0.5rem",
  },
  ctaSub: {
    color: "#94a3b8",
    marginBottom: "1.5rem",
  },
};