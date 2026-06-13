// src/components/MeetingLinkButton.jsx
import { useState, useEffect } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export default function MeetingLinkButton() {
  const { currentUser } = useAuth();
  const [meetingLink, setMeetingLink] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    async function fetchLink() {
      const { data, error } = await supabase
        .from("workshop_registrations")
        .select("meeting_link, workshop_id")
        .eq("student_id", currentUser.id)
        .eq("status", "approved")
        .not("meeting_link", "is", null)
        .maybeSingle();
      if (!error && data) setMeetingLink(data.meeting_link);
      setLoading(false);
    }
    fetchLink();
  }, [currentUser]);

  if (loading || !meetingLink) return null;

  return (
    <div style={{ margin: "1rem 0", textAlign: "center" }}>
      <a href={meetingLink} target="_blank" rel="noopener noreferrer" style={{ background: "#00D4FF", color: "#000", padding: "12px 24px", borderRadius: "40px", textDecoration: "none", fontWeight: "bold", display: "inline-block" }}>
        🎥 Join Workshop Meeting
      </a>
    </div>
  );
}