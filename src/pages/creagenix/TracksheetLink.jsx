import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";

export default function TracksheetLink() {
  const { currentUser } = useAuth();
  const [regId, setRegId] = useState(null);

  useEffect(() => {
    if (!currentUser) return;
    supabase
      .from("workshop_registrations")
      .select("id")
      .eq("student_id", currentUser.id)
      .eq("workshop_id", "editx-offline")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setRegId(data.id);
      });
  }, [currentUser]);

  if (!regId) return null;
  return (
    <Link to={`/creagenix/tracksheet/${regId}`} style={{ display: "block", textAlign: "center", background: "rgba(0,212,255,0.1)", padding: "12px", borderRadius: "16px", marginBottom: "1rem", textDecoration: "none", color: "#00D4FF", fontWeight: "bold" }}>
      📋 View My Progress Tracksheet
    </Link>
  );
}