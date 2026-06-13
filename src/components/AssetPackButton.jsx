import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export default function AssetPackButton() {
  const { currentUser } = useAuth();
  const [url, setUrl] = useState(null);
  const [hasRegistration, setHasRegistration] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    // Check if user has approved registration (any workshop)
    supabase
      .from("workshop_registrations")
      .select("id")
      .eq("student_id", currentUser.id)
      .eq("status", "approved")
      .limit(1)
      .then(({ data }) => setHasRegistration(data && data.length > 0));
    // Fetch asset pack URL from settings
    supabase
      .from("creagenix_settings")
      .select("value")
      .eq("key", "asset_pack_url")
      .single()
      .then(({ data }) => setUrl(data?.value));
  }, [currentUser]);

  if (!hasRegistration || !url) return null;
  return (
    <div style={{ textAlign: "center", margin: "1rem 0" }}>
      <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: "#10b981", color: "#000", padding: "12px 24px", borderRadius: "40px", textDecoration: "none", fontWeight: "bold", display: "inline-block" }}>
        📦 Download Asset Pack (₹22,999 value)
      </a>
    </div>
  );
}