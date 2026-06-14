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

  useEffect(() => {
    if (!loading && (!currentUser || userData?.role !== "super_admin")) {
      navigate("/dashboard");
     }
   }, [currentUser, userData, loading, navigate]);

  useEffect(() => {
    fetchApprovedRegistrations();
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
      fetchApprovedRegistrations(); // refresh
    }
  }

  if (loading || loadingData) return <div style={{ padding: "2rem", color: "white", background: "#020024" }}>Loading...</div>;

  return (
    <div style={{ padding: "2rem", background: "#020024", minHeight: "100vh", color: "white" }}>
      <h1 style={{ color: "#00D4FF" }}>Creagenix Admin Panel</h1>
      <h3>Manage Workshop Meeting Links</h3>
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
                      style={{ width: "250px", padding: "4px" }}
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
    </div>
  );
}