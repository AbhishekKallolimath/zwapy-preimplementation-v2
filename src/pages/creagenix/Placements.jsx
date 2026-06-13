import { useState, useEffect } from "react";
import { supabase } from "../../supabase";

export default function Placements() {
  const [placements, setPlacements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivePlacements() {
      const { data, error } = await supabase
        .from("placements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (!error) setPlacements(data || []);
      setLoading(false);
    }
    fetchActivePlacements();
  }, []);

  if (loading) return <div style={styles.page}>Loading opportunities...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>💼 Placement & Internship Opportunities</h1>
        <p style={styles.subtitle}>Exclusive for Creagenix students – apply directly.</p>
        <div style={styles.grid}>
          {placements.length === 0 ? (
            <div style={styles.empty}>No active placements at the moment. Check back soon!</div>
          ) : (
            placements.map(p => (
              <div key={p.id} style={styles.card}>
                <div style={styles.cardHeader}>
                  <h3>{p.title}</h3>
                  <span style={styles.badge}>{p.type === "internship" ? "Internship" : "Full Time"}</span>
                </div>
                <div style={styles.company}>{p.company} {p.location && `· ${p.location}`}</div>
                <p style={styles.description}>{p.description || "No description provided."}</p>
                <a href={p.apply_url} target="_blank" rel="noopener noreferrer" style={styles.applyBtn}>Apply Now →</a>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#020024", minHeight: "100vh", padding: "2rem", fontFamily: "'Sora', sans-serif", color: "white" },
  container: { maxWidth: "1000px", margin: "0 auto" },
  title: { fontSize: "2rem", marginBottom: "0.5rem", color: "#00D4FF" },
  subtitle: { color: "#94a3b8", marginBottom: "2rem" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" },
  empty: { background: "rgba(0,212,255,0.05)", padding: "2rem", borderRadius: "24px", textAlign: "center" },
  card: { background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: "24px", padding: "1.5rem" },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" },
  badge: { background: "#00D4FF20", border: "1px solid #00D4FF", borderRadius: "40px", padding: "2px 10px", fontSize: "0.7rem", color: "#00D4FF" },
  company: { color: "#94a3b8", marginBottom: "0.75rem" },
  description: { fontSize: "0.85rem", lineHeight: 1.5, marginBottom: "1.25rem" },
  applyBtn: { background: "#00D4FF", color: "#000", padding: "8px 16px", borderRadius: "40px", textDecoration: "none", fontWeight: "bold", display: "inline-block" }
};