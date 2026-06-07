import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminRegistrations() {
  const { currentUser, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [filterWorkshop, setFilterWorkshop] = useState("all");
  const [filterBatch, setFilterBatch] = useState("all");
  const [updating, setUpdating] = useState(null);

  // Check if user is admin (you can adjust logic based on your role)
  useEffect(() => {
    if (!loading && (!currentUser || userData?.role !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [currentUser, userData, loading, navigate]);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("workshop_registrations")
      .select("*")
      .order("registered_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setRegistrations(data);
      setFiltered(data);
    }
    setLoadingData(false);
  }

  useEffect(() => {
    let filteredData = [...registrations];
    if (filterWorkshop !== "all") {
      filteredData = filteredData.filter(r => r.workshop_id === filterWorkshop);
    }
    if (filterBatch !== "all") {
      filteredData = filteredData.filter(r => r.batch_preference === filterBatch);
    }
    setFiltered(filteredData);
  }, [filterWorkshop, filterBatch, registrations]);

  async function updateStatus(id, newStatus) {
    setUpdating(id);
    const { error } = await supabase
      .from("workshop_registrations")
      .update({ status: newStatus })
      .eq("id", id);
    if (error) {
      console.error(error);
    } else {
      setRegistrations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    }
    setUpdating(null);
  }

  const workshopOptions = [...new Set(registrations.map(r => r.workshop_id))];
  const batchOptions = [...new Set(registrations.filter(r => r.batch_preference).map(r => r.batch_preference))];

  if (loading || loadingData) {
    return (
      <div style={{ background: "#020024", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
        Loading...
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📋 Creagenix Workshop Registrations</h1>
        <p style={styles.subtitle}>Manage all student applications</p>

        {/* Filters */}
        <div style={styles.filterBar}>
          <select value={filterWorkshop} onChange={(e) => setFilterWorkshop(e.target.value)} style={styles.select}>
            <option value="all">All Workshops</option>
            {workshopOptions.map(ws => (
              <option key={ws} value={ws}>{ws}</option>
            ))}
          </select>
          <select value={filterBatch} onChange={(e) => setFilterBatch(e.target.value)} style={styles.select}>
            <option value="all">All Batches</option>
            {batchOptions.map(batch => (
              <option key={batch} value={batch}>{batch}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Name</th><th>Roll No</th><th>College</th><th>Workshop</th><th>Batch</th><th>PC Needed</th><th>UTR</th><th>Reg. Date</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(reg => (
                <tr key={reg.id}>
                  <td>{reg.name}</td><td>{reg.roll_no}</td><td>{reg.college_name}</td>
                  <td>{reg.workshop_id}</td>
                  <td>{reg.batch_preference || "—"}</td>
                  <td>{reg.need_pc ? "Yes" : "No"}</td>
                  <td>{reg.payment_utr}</td>
                  <td>{new Date(reg.registered_at).toLocaleDateString()}</td>
                  <td style={{ color: reg.status === "pending" ? "#f59e0b" : "#10b981" }}>{reg.status}</td>
                  <td>
                    {reg.status === "pending" && (
                      <button onClick={() => updateStatus(reg.id, "approved")} disabled={updating === reg.id} style={styles.approveBtn}>
                        {updating === reg.id ? "..." : "Approve"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#020024", minHeight: "100vh", padding: "2rem", fontFamily: "'Sora', sans-serif" },
  container: { maxWidth: "1200px", margin: "0 auto" },
  title: { fontSize: "2rem", color: "#00D4FF", marginBottom: "0.5rem" },
  subtitle: { color: "#94a3b8", marginBottom: "2rem" },
  filterBar: { display: "flex", gap: "1rem", marginBottom: "2rem", flexWrap: "wrap" },
  select: { padding: "0.5rem 1rem", background: "#1e1e3a", border: "1px solid #00D4FF", borderRadius: "8px", color: "white" },
  tableWrapper: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", background: "rgba(0,212,255,0.03)", borderRadius: "16px", overflow: "hidden" },
  approveBtn: { background: "#00D4FF", color: "#000", border: "none", padding: "0.3rem 0.8rem", borderRadius: "20px", cursor: "pointer", fontWeight: "bold" }
};