import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { supabase } from "../../supabase";
import { useParams } from "react-router-dom";
import jsPDF from "jspdf";

export default function Tracksheet() {
  const { registrationId } = useParams();
  const { currentUser } = useAuth();
  const [topics, setTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [allCompleted, setAllCompleted] = useState(false);
  const [workshopTitle, setWorkshopTitle] = useState("");

  useEffect(() => {
    if (!currentUser) return;
    async function loadTracksheet() {
      setLoading(true);
      // Get student's progress with topic details
      const { data: progress, error } = await supabase
        .from("student_progress")
        .select(`
          id,
          completed,
          tracksheet_topics (id, module_name, topic_name, order_index)
        `)
        .eq("student_id", currentUser.id)
        .eq("workshop_registration_id", registrationId);
      if (error) {
        console.error(error);
      } else {
        setTopics(progress || []);
        const total = progress.length;
        const completedCount = progress.filter(t => t.completed).length;
        setAllCompleted(total > 0 && completedCount === total);
      }
      // Also fetch workshop title from registration
      const { data: regData } = await supabase
        .from("workshop_registrations")
        .select("workshop_id")
        .eq("id", registrationId)
        .single();
      if (regData) setWorkshopTitle(regData.workshop_id);
      setLoading(false);
    }
    loadTracksheet();
  }, [registrationId, currentUser]);

  const generateCertificate = () => {
    const doc = new jsPDF("landscape", "mm", "a4");
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();

    // Border
    doc.setDrawColor(0, 212, 255);
    doc.setLineWidth(2);
    doc.rect(10, 10, width - 20, height - 20);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(40);
    doc.setTextColor(0, 212, 255);
    doc.text("Certificate of Completion", width / 2, 50, { align: "center" });

    // Subtitle
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text("This certificate is proudly presented to", width / 2, 80, { align: "center" });

    // Student Name
    doc.setFontSize(30);
    doc.setTextColor(0, 0, 0);
    doc.text(currentUser?.user_metadata?.name || currentUser?.email || "Student", width / 2, 110, { align: "center" });

    // Workshop
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`for successfully completing the "${workshopTitle}" program`, width / 2, 140, { align: "center" });

    // Date
    const date = new Date().toLocaleDateString();
    doc.setFontSize(12);
    doc.text(`Date: ${date}`, width / 2, 170, { align: "center" });

    // Logos (placeholder – you need actual images)
    // To add images, use doc.addImage(imageData, 'PNG', x, y, width, height)
    // For now, we'll add text placeholders
    doc.setFontSize(10);
    doc.setTextColor(0, 212, 255);
    doc.text("NSDC Certified", width / 4, 200, { align: "center" });
    doc.text("ISO Certified", width / 2, 200, { align: "center" });
    doc.text("IAO Accredited", 3 * width / 4, 200, { align: "center" });

    // Save
    doc.save(`certificate_${currentUser?.email || "student"}.pdf`);
  };

  if (loading) return <div style={styles.page}>Loading tracksheet...</div>;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📋 My Progress Tracksheet</h1>
        <p style={styles.subtitle}>Topics are marked by your mentor upon completion.</p>
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
        {allCompleted && (
          <div style={{ textAlign: "center", marginTop: "2rem" }}>
            <button
              onClick={generateCertificate}
              style={{
                background: "#00D4FF",
                color: "#000",
                padding: "12px 24px",
                borderRadius: "40px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: "1rem"
              }}
            >
              🎓 Download Certificate
            </button>
          </div>
        )}
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