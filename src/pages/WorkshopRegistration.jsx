import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../supabase";

export default function WorkshopRegistration() {
  const { workshopId, workshopTitle } = useParams();
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();

  const isOffline = workshopId?.toLowerCase().includes("offline");

  const [formData, setFormData] = useState({
    name: !isOffline ? (userData?.name || "") : "",
    rollNo: "",
    dob: "",
    age: "",
    collegeName: !isOffline ? (userData?.university || "") : "",
    queries: "",
    paymentUTR: "",
    batchPreference: "",
    needPc: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
    if (name === "dob") {
      const birthDate = new Date(value);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
      setFormData(prev => ({ ...prev, age: age.toString() }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    if (!formData.name || !formData.rollNo || !formData.dob || !formData.collegeName || !formData.paymentUTR) {
      setError("Please fill all required fields.");
      setSubmitting(false);
      return;
    }

    if (isOffline && !formData.batchPreference) {
      setError("Please select a batch preference.");
      setSubmitting(false);
      return;
    }

    try {
      const insertData = {
        workshop_id: workshopId,
        student_id: currentUser?.id || null,
        name: formData.name,
        roll_no: formData.rollNo,
        dob: formData.dob,
        age: parseInt(formData.age) || null,
        college_name: formData.collegeName,
        queries: formData.queries,
        payment_utr: formData.paymentUTR,
        payment_screenshot_url: null,
        payment_status: "pending",
        status: "pending",
        registered_at: new Date().toISOString(),
      };

      if (isOffline) {
        insertData.batch_preference = formData.batchPreference;
        insertData.need_pc = formData.needPc;
      }

      const { error: insertError } = await supabase
        .from("workshop_registrations")
        .insert(insertData);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.successBox}>
            <div style={{ fontSize: "3rem" }}>✅</div>
            <h2>Registration Successful!</h2>
            <p>Redirecting to dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const decodedTitle = decodeURIComponent(workshopTitle || "Workshop");

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>Register for <span style={styles.cyan}>"{decodedTitle}"</span></h1>
        <p style={styles.subtitle}>Fill in your details to confirm your spot.</p>

        <form onSubmit={handleSubmit}>
          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Full Name *</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Roll Number *</label>
              <input type="text" name="rollNo" value={formData.rollNo} onChange={handleChange} style={styles.input} required />
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.field}>
              <label style={styles.label}>Date of Birth *</label>
              <input type="date" name="dob" value={formData.dob} onChange={handleChange} style={styles.input} required />
            </div>
            <div style={styles.field}>
              <label style={styles.label}>Age</label>
              <input type="number" name="age" value={formData.age} disabled style={{ ...styles.input, opacity: 0.7 }} />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>College Name *</label>
            <input type="text" name="collegeName" value={formData.collegeName} onChange={handleChange} style={styles.input} required />
          </div>

          {isOffline && (
            <>
              <div style={styles.field}>
                <label style={styles.label}>Batch Preference *</label>
                <select name="batchPreference" value={formData.batchPreference} onChange={handleChange} style={styles.select} required>
                  <option value="">Select batch</option>
                  <option value="Afternoon (12:20 PM - 2:20 PM)">Afternoon (12:20 PM - 2:20 PM)</option>
                  <option value="Evening (4:00 PM - 6:00 PM)">Evening (4:00 PM - 6:00 PM)</option>
                </select>
              </div>

              <div style={styles.field}>
                <label style={styles.label}>
                  <input type="checkbox" name="needPc" checked={formData.needPc} onChange={handleChange} style={{ marginRight: "8px" }} />
                  Do you need a PC? (We provide high‑performance PCs in‑class)
                </label>
              </div>
            </>
          )}

          <div style={styles.field}>
            <label style={styles.label}>Any Queries / Questions</label>
            <textarea name="queries" rows="3" value={formData.queries} onChange={handleChange} style={styles.textarea} placeholder="Let us know if you have any questions..."></textarea>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>PhonePe UTR Number *</label>
            <input type="text" name="paymentUTR" value={formData.paymentUTR} onChange={handleChange} style={styles.input} placeholder="Enter UTR from PhonePe transaction" required />
          </div>

          <div style={styles.paymentBox}>
            <p>📱 Payment is to be made via PhonePe:</p>
            <a href="https://phonepe.com/pay/...your-link..." target="_blank" rel="noopener noreferrer" style={styles.link}>
              🔗 Click here to make payment (₹499)
            </a>
            <p style={styles.smallText}>After payment, enter the UTR number above.</p>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button type="submit" style={styles.button} disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#020024", padding: "2rem", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Sora', sans-serif" },
  container: { maxWidth: "700px", width: "100%", background: "rgba(0,212,255,0.03)", border: "1px solid rgba(0,212,255,0.1)", borderRadius: "24px", padding: "2rem", color: "white" },
  title: { fontSize: "1.8rem", marginBottom: "0.5rem" },
  cyan: { color: "#00D4FF" },
  subtitle: { color: "#94a3b8", marginBottom: "2rem" },
  row: { display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" },
  field: { flex: "1", marginBottom: "1rem" },
  label: { display: "block", marginBottom: "0.3rem", fontSize: "0.85rem", color: "#cbd5e1" },
  input: { width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid #2d3a5e", borderRadius: "12px", color: "white" },
  select: { width: "100%", padding: "0.75rem", background: "#1e1e3a", border: "1px solid #00D4FF", borderRadius: "12px", color: "white", cursor: "pointer" },
  textarea: { width: "100%", padding: "0.75rem", background: "rgba(255,255,255,0.05)", border: "1px solid #2d3a5e", borderRadius: "12px", color: "white", resize: "vertical" },
  paymentBox: { background: "rgba(0,212,255,0.1)", borderRadius: "16px", padding: "1rem", margin: "1rem 0", textAlign: "center" },
  link: { color: "#00D4FF", textDecoration: "none", fontWeight: "bold" },
  smallText: { fontSize: "0.75rem", color: "#94a3b8", marginTop: "0.5rem" },
  error: { background: "rgba(255,50,50,0.2)", border: "1px solid #ff6b6b", borderRadius: "12px", padding: "0.75rem", margin: "1rem 0", color: "#ff6b6b" },
  button: { background: "#00D4FF", color: "#000", border: "none", padding: "1rem", borderRadius: "40px", fontWeight: "bold", width: "100%", cursor: "pointer", marginTop: "1rem" },
  successBox: { textAlign: "center", padding: "2rem", background: "rgba(0,255,0,0.1)", borderRadius: "20px" }
};