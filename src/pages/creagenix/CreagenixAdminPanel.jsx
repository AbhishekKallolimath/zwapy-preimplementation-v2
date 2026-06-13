// src/pages/creagenix/AdminPanel.jsx
import { useState, useEffect } from "react";
import { supabase } from "../../supabase";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function CreagenixAdminPanel() {
  const { currentUser, userData, loading } = useAuth();
  const navigate = useNavigate();
  const [registrations, setRegistrations] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [editingLink, setEditingLink] = useState(null);
  const [tempLink, setTempLink] = useState("");
  const [placements, setPlacements] = useState([]);
const [placementsLoading, setPlacementsLoading] = useState(true);

useEffect(() => {
  fetchPlacements();
}, []);

async function fetchPlacements() {
  setPlacementsLoading(true);
  const { data, error } = await supabase.from("placements").select("*").order("created_at", { ascending: false });
  if (!error) setPlacements(data || []);
  setPlacementsLoading(false);
}

async function addPlacement() {
  const title = document.getElementById("placementTitle").value;
  const company = document.getElementById("placementCompany").value;
  const location = document.getElementById("placementLocation").value;
  const type = document.getElementById("placementType").value;
  const apply_url = document.getElementById("placementUrl").value;
  const description = document.getElementById("placementDesc").value;
  if (!title || !company || !apply_url) { alert("Title, Company and Apply URL are required"); return; }
  const { error } = await supabase.from("placements").insert({ title, company, location, type, apply_url, description });
  if (error) alert("Error: " + error.message);
  else {
    alert("Placement added");
    fetchPlacements();
    // clear form
    document.getElementById("placementTitle").value = "";
    document.getElementById("placementCompany").value = "";
    document.getElementById("placementLocation").value = "";
    document.getElementById("placementUrl").value = "";
    document.getElementById("placementDesc").value = "";
  }
}

async function togglePlacementStatus(id, is_active) {
  const { error } = await supabase.from("placements").update({ is_active }).eq("id", id);
  if (!error) fetchPlacements();
  else alert("Error updating status");
}

async function deletePlacement(id) {
  if (!confirm("Delete this placement?")) return;
  const { error } = await supabase.from("placements").delete().eq("id", id);
  if (!error) fetchPlacements();
  else alert("Error deleting");
}

const inputStyle = { padding: "8px", borderRadius: "6px", background: "#1e1e3a", color: "white", border: "1px solid #00D4FF", width: "100%" };
const buttonStyle = { background: "#00D4FF", color: "#000", border: "none", padding: "8px 16px", borderRadius: "40px", cursor: "pointer", marginTop: "8px", fontWeight: "bold" };
  const [winners, setWinners] = useState([]);

  useEffect(() => {
    if (!loading && (!currentUser || userData?.role !== "super_admin")) {
      navigate("/dashboard");
    }
  }, [currentUser, userData, loading, navigate]);

  useEffect(() => {
    fetchApprovedRegistrations();
    fetchWinners();
  }, []);

  async function fetchApprovedRegistrations() {
    setLoadingData(true);
    const { data, error } = await supabase
      .from("workshop_registrations")
      .select("*")
      .eq("status", "approved")
      .order("registered_at", { ascending: false });
    if (error) console.error(error);
    else setRegistrations(data || []);
    setLoadingData(false);
  }

  async function fetchWinners() {
    const { data, error } = await supabase
      .from("monthly_winners")
      .select("*")
      .order("year", { ascending: false })
      .order("month", { ascending: false });
    if (!error) setWinners(data || []);
  }

  async function updateMeetingLink(regId, link) {
    const { error } = await supabase
      .from("workshop_registrations")
      .update({ meeting_link: link })
      .eq("id", regId);
    if (error) {
      alert("Failed to update meeting link");
    } else {
      alert("Meeting link updated!");
      setEditingLink(null);
      fetchApprovedRegistrations();
    }
  }

  async function assignWinner() {
    const studentId = document.getElementById("winnerStudentSelect").value;
    const selectEl = document.getElementById("winnerStudentSelect");
    const studentName = selectEl.options[selectEl.selectedIndex]?.text.split(" (")[0];
    const month = parseInt(document.getElementById("winnerMonthSelect").value);
    const year = parseInt(document.getElementById("winnerYearInput").value);
    if (!studentId) {
      alert("Select a student");
      return;
    }
    const { error } = await supabase.from("monthly_winners").insert({
      student_id: studentId,
      student_name: studentName,
      workshop_id: registrations.find(r => r.student_id === studentId)?.workshop_id,
      month,
      year,
    });
    if (error) alert("Error: " + error.message);
    else {
      alert("🏆 Winner assigned!");
      fetchWinners();
    }
  }

  if (loading || loadingData) return <div style={{ padding: "2rem", color: "white", background: "#020024" }}>Loading...</div>;
  const [assetPackUrl, setAssetPackUrl] = useState("");

useEffect(() => {
  fetchAssetPackUrl();
}, []);

async function fetchAssetPackUrl() {
  const { data } = await supabase.from("creagenix_settings").select("value").eq("key", "asset_pack_url").single();
  if (data) setAssetPackUrl(data.value);
}

async function saveAssetPackUrl() {
  const url = document.getElementById("assetPackUrl").value;
  const { error } = await supabase.from("creagenix_settings").upsert({ key: "asset_pack_url", value: url });
  if (error) alert("Error saving URL");
  else {
    alert("Asset pack URL saved");
    setAssetPackUrl(url);
  }
}

  return (
    <div style={{ padding: "2rem", background: "#020024", minHeight: "100vh", color: "white" }}>
      <h1 style={{ color: "#00D4FF" }}>Creagenix Admin Panel</h1>
      {/* Placements Management Section */}
<div style={{ marginTop: "2rem", borderTop: "1px solid rgba(0,212,255,0.2)", paddingTop: "1.5rem" }}>
  <h3>💼 Manage Placements (Jobs & Internships)</h3>
  <div style={{ background: "rgba(0,212,255,0.05)", padding: "1rem", borderRadius: "12px", marginBottom: "1rem" }}>
    <h4>Add New Placement</h4>
    <div style={{ display: "grid", gap: "0.5rem", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))" }}>
      <input id="placementTitle" placeholder="Title" style={inputStyle} />
      <input id="placementCompany" placeholder="Company" style={inputStyle} />
      <input id="placementLocation" placeholder="Location" style={inputStyle} />
      <select id="placementType" style={inputStyle}>
        <option value="internship">Internship</option>
        <option value="fulltime">Full Time</option>
      </select>
      <input id="placementUrl" placeholder="Apply URL" style={inputStyle} />
      <textarea id="placementDesc" placeholder="Description" rows="2" style={inputStyle}></textarea>
    </div>
    <button onClick={addPlacement} style={buttonStyle}>➕ Add Placement</button>
  </div>
  <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(0,212,255,0.2)", paddingTop: "1.5rem" }}>
  <h3>📦 Asset Pack Download (₹22,999 value)</h3>
  <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
    <input id="assetPackUrl" type="url" placeholder="Asset pack download link (Google Drive, Dropbox, etc.)" style={{ flex: 1, ...inputStyle }} />
    <button onClick={saveAssetPackUrl} style={buttonStyle}>Save URL</button>
  </div>
  <p style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>Current URL: {assetPackUrl || "Not set"}</p>
</div>

  <h4>Existing Placements</h4>
  <div id="placementsList">
    {placementsLoading ? "Loading..." : placementsList.map(p => (
      <div key={p.id} style={{ background: "rgba(0,0,0,0.3)", padding: "0.75rem", borderRadius: "8px", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><strong>{p.title}</strong> – {p.company} ({p.type})</div>
        <div>
          <button onClick={() => togglePlacementStatus(p.id, !p.is_active)} style={{ background: p.is_active ? "#10b981" : "#ef4444", border: "none", borderRadius: "4px", padding: "4px 12px", marginRight: "8px", color: "white" }}>
            {p.is_active ? "Active" : "Inactive"}
          </button>
          <button onClick={() => deletePlacement(p.id)} style={{ background: "#ef4444", border: "none", borderRadius: "4px", padding: "4px 12px", color: "white" }}>Delete</button>
        </div>
      </div>
    ))}
  </div>
</div>

      {/* Meeting Links Section */}
      <h3>📅 Manage Workshop Meeting Links</h3>
      <div style={{ overflowX: "auto", marginTop: "1.5rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "rgba(0,212,255,0.05)" }}>
          <thead>
            <tr><th>Student</th><th>Workshop</th><th>Meeting Link</th><th>Action</th></tr>
          </thead>
          <tbody>
            {registrations.map(reg => (
              <tr key={reg.id}>
                <td style={{ padding: "8px" }}>{reg.name}</td>
                <td style={{ padding: "8px" }}>{reg.workshop_id}</td>
                <td style={{ padding: "8px" }}>
                  {editingLink === reg.id ? (
                    <input
                      type="url"
                      defaultValue={reg.meeting_link || ""}
                      onChange={e => setTempLink(e.target.value)}
                      style={{ width: "250px", padding: "4px", background: "#1e1e3a", color: "white", border: "1px solid #00D4FF", borderRadius: "4px" }}
                    />
                  ) : (
                    reg.meeting_link || "Not set"
                  )}
                </td>
                <td style={{ padding: "8px" }}>
                  {editingLink === reg.id ? (
                    <>
                      <button onClick={() => updateMeetingLink(reg.id, tempLink)} style={{ background: "#00D4FF", color: "#000", border: "none", padding: "4px 12px", borderRadius: "4px", marginRight: "8px" }}>Save</button>
                      <button onClick={() => setEditingLink(null)} style={{ background: "#ef4444", color: "#fff", border: "none", padding: "4px 12px", borderRadius: "4px" }}>Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingLink(reg.id); setTempLink(reg.meeting_link || ""); }} style={{ background: "#00D4FF", color: "#000", border: "none", padding: "4px 12px", borderRadius: "4px" }}>Edit Link</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Monthly Best Performer Section */}
      <div style={{ marginTop: "2rem", borderTop: "1px solid rgba(0,212,255,0.2)", paddingTop: "1.5rem" }}>
        <h3>🏆 Monthly Best Performer</h3>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label>Student</label>
            <select id="winnerStudentSelect" style={{ padding: "8px", borderRadius: "8px", background: "#1e1e3a", color: "white", border: "1px solid #00D4FF" }}>
              <option value="">Select student</option>
              {registrations.map(reg => (
                <option key={reg.id} value={reg.student_id}>{reg.name} ({reg.workshop_id})</option>
              ))}
            </select>
          </div>
          <div>
            <label>Month</label>
            <select id="winnerMonthSelect" style={{ padding: "8px", borderRadius: "8px", background: "#1e1e3a", color: "white", border: "1px solid #00D4FF" }}>
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Year</label>
            <input id="winnerYearInput" type="number" defaultValue={new Date().getFullYear()} style={{ padding: "8px", borderRadius: "8px", background: "#1e1e3a", color: "white", border: "1px solid #00D4FF", width: "80px" }} />
          </div>
          <button onClick={assignWinner} style={{ background: "#00D4FF", color: "#000", border: "none", padding: "8px 20px", borderRadius: "40px", cursor: "pointer", fontWeight: "bold" }}>Assign Winner</button>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <h4>Previous Winners</h4>
          {winners.length === 0 ? (
            <p>No winners assigned yet.</p>
          ) : (
            <ul>
              {winners.map(w => (
                <li key={w.id}>{w.student_name} – {new Date(0, w.month-1).toLocaleString('default', { month: 'long' })} {w.year} ({w.workshop_id})</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}