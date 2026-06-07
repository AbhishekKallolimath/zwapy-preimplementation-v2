import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import { useParams } from "react-router-dom";

export default function Tracksheet() {
  const { registrationId } = useParams(); // workshop_registration id
  const { currentUser } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    async function loadTracksheet() {
      setLoading(true);
      // Get student's progress for this registration
      const { data: progress, error } = await supabase
        .from("student_progress")
        .select(`*, tracksheet_topics(*)`)
        .eq("student_id", currentUser.id)
        .eq("workshop_registration_id", registrationId);
      if (error) console.error(error);
      else setTopics(progress || []);
      setLoading(false);
    }
    loadTracksheet();
  }, [registrationId, currentUser]);

  if (loading) return <div style={styles.page}>Loading tracksheet...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📋 My Progress Tracksheet</h1>
        <p style={styles.subtitle}>Personalised learning journey – topics are ticked off by your mentor after mastery.</p>
        <div style={styles.grid}>
          {topics.map(t => (
            <div key={t.id} style={styles.card}>
              <div style={styles.icon}>{t.completed ? "✅" : "⏳"}</div>
              <div>
                <div style={styles.module}>{t.tracksheet_topics.module_name}</div>
                <div style={styles.topic}>{t.tracksheet_topics.topic_name}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#020024", minHeight: "100vh", padding: "2rem", fontFamily: "'Sora', sans-serif", color: "white" },
  container: { maxWidth: "800px", margin: "0 auto" },
  title: { fontSize: "2rem", marginBottom: "0.5rem", color: "#00D4FF" },
  subtitle: { color: "#94a3b8", marginBottom: "2rem" },
  grid: { display: "flex", flexDirection: "column", gap: "0.75rem" },
  card: { background: "rgba(0,212,255,0.05)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: "16px", padding: "1rem", display: "flex", gap: "1rem", alignItems: "center" },
  icon: { fontSize: "1.5rem" },
  module: { fontSize: "0.7rem", color: "#00D4FF", textTransform: "uppercase" },
  topic: { fontSize: "0.9rem" },
};