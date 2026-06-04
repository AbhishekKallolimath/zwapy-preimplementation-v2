import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./ClubExtraDetails.css";

export default function ClubExtraDetails() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [clubName, setClubName] = useState("");
  const [clubCategory, setClubCategory] = useState("Technology");
  const [clubDesc, setClubDesc] = useState("");
  const [university, setUniversity] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  // Auth session check
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        navigate("/login");
      } else {
        setCurrentUser(user);
      }
    });
    return unsubscribe;
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clubName.trim() || !university.trim()) {
      setMsg({ text: "❌ Please fill in all required fields", type: "error" });
      return;
    }

    setIsLoading(true);
    setMsg({ text: "", type: "" });

    try {
      // 1. Update user document
      await updateDoc(doc(db, "users", currentUser.uid), {
        clubName: clubName.trim(),
        clubCategory,
        clubDesc: clubDesc.trim(),
        university: university.trim()
      });

      // 2. Create club record on Firestore
      await setDoc(doc(db, "clubs", currentUser.uid), {
        name: clubName.trim(),
        category: clubCategory,
        desc: clubDesc.trim(),
        university: university.trim(),
        headUid: currentUser.uid,
        headName: currentUser.displayName || "Club Head",
        members: [],
        createdAt: serverTimestamp()
      });

      setMsg({ text: "✅ Club created! Loading your portal...", type: "success" });
      setTimeout(() => navigate("/club-dashboard"), 900);
    } catch (err) {
      console.error(err);
      setMsg({ text: "❌ Setup failed: " + err.message, type: "error" });
      setIsLoading(false);
    }
  };

  return (
    <div className="club-setup-body">
      <div className="glow"></div>
      <div className="card">
        <Link to="/" className="logo">
          <img src="assets/zwapy-logo.png" style={{ width: "30px", height: "30px", objectFit: "contain" }} alt="" />
          <span>ZWAPY</span>
        </Link>
        <div className="badge">🛡️ Club Head Setup</div>
        <h2>Set Up Your Club</h2>
        <p className="sub">Tell us about your club so students can find and join it</p>

        {msg.text && <div className={`msg ${msg.type}`}>{msg.text}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>Club Name</label>
            <input
              type="text"
              placeholder="e.g. Tech Builders Club"
              value={clubName}
              onChange={(e) => setClubName(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label>Club Category</label>
            <select value={clubCategory} onChange={(e) => setClubCategory(e.target.value)}>
              <option value="Technology">Technology</option>
              <option value="Design">Design</option>
              <option value="Business">Business</option>
              <option value="Arts">Arts & Culture</option>
              <option value="Sports">Sports</option>
              <option value="Science">Science</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="field">
            <label>Club Description</label>
            <textarea
              placeholder="What does your club do? What can members expect?"
              value={clubDesc}
              onChange={(e) => setClubDesc(e.target.value)}
            />
          </div>

          <div className="field">
            <label>University</label>
            <input
              type="text"
              placeholder="e.g. Presidency University"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn" disabled={isLoading}>
            {isLoading ? "Saving..." : "Launch My Club →"}
          </button>
        </form>
      </div>
    </div>
  );
}
