import { Link } from "react-router-dom";

const workshops = [
  {
    id: "video-editing",
    title: "Professional Video Editing",
    instructor: "Creagenix Pro Team",
    duration: "6 weeks",
    level: "Beginner to Advanced",
    description: "Learn industry-standard video editing using Premiere Pro & DaVinci Resolve. Create cinematic videos, transitions, color grading, and export for social media.",
    image: "🎬",
    tags: ["Premiere Pro", "DaVinci Resolve", "Color Grading"],
  },
  {
    id: "photo-editing",
    title: "Photo Editing & Retouching",
    instructor: "Creagenix Studio",
    duration: "4 weeks",
    level: "Intermediate",
    description: "Master Photoshop and Lightroom. Retouch portraits, manipulate images, create thumbnails, and build a professional portfolio.",
    image: "📸",
    tags: ["Photoshop", "Lightroom", "Retouching"],
  },
  {
    id: "graphic-design",
    title: "Graphic Design for Social Media",
    instructor: "Creagenix Design Lab",
    duration: "4 weeks",
    level: "Beginner",
    description: "Create stunning social media graphics, banners, logos, and branding materials using Canva and Illustrator.",
    image: "🎨",
    tags: ["Canva", "Illustrator", "Branding"],
  },
];

export default function Workshops() {
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎬 Creagenix x Zwapy</h1>
          <p style={styles.subtitle}>Professional creative courses — earn certificates, build your personal brand.</p>
        </div>

        <div style={styles.grid}>
          {workshops.map((ws) => (
            <div key={ws.id} style={styles.card}>
              <div style={styles.icon}>{ws.image}</div>
              <div style={styles.cardTitle}>{ws.title}</div>
              <div style={styles.meta}>
                <span>👨‍🏫 {ws.instructor}</span>
                <span>⏱️ {ws.duration}</span>
                <span>📊 {ws.level}</span>
              </div>
              <p style={styles.description}>{ws.description}</p>
              <div style={styles.tags}>
                {ws.tags.map((tag) => (
                  <span key={tag} style={styles.tag}>{tag}</span>
                ))}
              </div>
              <Link
                to={`/workshop-register/${ws.id}/${encodeURIComponent(ws.title)}`}
                style={styles.registerBtn}
              >
                Register Now →
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#020024",
    padding: "2rem",
    fontFamily: "'Sora', sans-serif",
    color: "#fff",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  header: {
    textAlign: "center",
    marginBottom: "3rem",
  },
  title: {
    fontSize: "clamp(2rem, 6vw, 2.8rem)",
    fontWeight: 900,
    fontStyle: "italic",
    letterSpacing: "-0.02em",
    marginBottom: "0.5rem",
    background: "linear-gradient(135deg, #00D4FF, #0066ff)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1rem",
    color: "#94a3b8",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    background: "rgba(0, 212, 255, 0.03)",
    backdropFilter: "blur(4px)",
    border: "1px solid rgba(0, 212, 255, 0.1)",
    borderRadius: "24px",
    padding: "1.5rem",
    transition: "transform 0.25s, border-color 0.25s",
    textAlign: "left",
    cursor: "pointer",
  },
  icon: {
    fontSize: "2.5rem",
    marginBottom: "0.75rem",
  },
  cardTitle: {
    fontSize: "1.3rem",
    fontWeight: 800,
    marginBottom: "0.5rem",
  },
  meta: {
    display: "flex",
    gap: "0.8rem",
    fontSize: "0.7rem",
    color: "#00D4FF",
    marginBottom: "0.8rem",
    flexWrap: "wrap",
  },
  description: {
    fontSize: "0.85rem",
    color: "#cbd5e1",
    lineHeight: 1.5,
    marginBottom: "1rem",
  },
  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "1.2rem",
  },
  tag: {
    background: "rgba(0, 212, 255, 0.1)",
    border: "1px solid rgba(0, 212, 255, 0.2)",
    padding: "4px 10px",
    borderRadius: "40px",
    fontSize: "0.7rem",
    color: "#00D4FF",
  },
  registerBtn: {
    display: "inline-block",
    background: "#00D4FF",
    color: "#000",
    padding: "0.6rem 1.2rem",
    borderRadius: "40px",
    fontWeight: "bold",
    textDecoration: "none",
    textAlign: "center",
    width: "100%",
    transition: "0.2s",
    cursor: "pointer",
  },
};

// Add hover effect for cards (optional – inline styles don't support :hover, but browser will still apply because it's CSS-in-JS? Actually no, hover won't work with inline styles. To get hover, you'd need CSS. But the card will still be clickable and functional.)