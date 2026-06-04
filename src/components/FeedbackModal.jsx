import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import { useAuth } from "../context/AuthContext";

export default function FeedbackModal({ isOpen, onClose }) {
  const { userData } = useAuth();
  const [rating, setRating] = useState(0);
  const [like, setLike] = useState("");
  const [improve, setImprove] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!rating) {
      alert("❌ Give a star rating first");
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        rating,
        like,
        improve,
        userId: auth.currentUser ? auth.currentUser.uid : "anonymous",
        university: userData?.university || "unknown",
        createdAt: serverTimestamp(),
      });
      alert("✅ Thanks for your feedback!");
      onClose();
      // Reset state
      setRating(0);
      setLike("");
      setImprove("");
    } catch (e) {
      alert("❌ Error: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fb-overlay open" id="fbOverlay">
      <div className="fb-modal">
        <div className="fb-stripe"></div>
        <div className="fb-body">
          <button className="fb-close-btn" onClick={onClose}>
            ✕
          </button>
          <div className="fb-title">Quick Feedback 💬</div>
          <p className="fb-sub">Help us build Zwapy better. 30 seconds. Anonymous.</p>
          <div className="fb-stars" id="fbStars">
            {[1, 2, 3, 4, 5].map((star) => (
              <span
                key={star}
                className={`fb-star ${star <= rating ? "on" : ""}`}
                onClick={() => setRating(star)}
                style={{ cursor: "pointer" }}
              >
                ⭐
              </span>
            ))}
          </div>
          <div className="fb-field">
            <label>What do you like most?</label>
            <textarea
              id="fbLike"
              value={like}
              onChange={(e) => setLike(e.target.value)}
              placeholder="e.g. Skill exchange idea is great..."
            ></textarea>
          </div>
          <div className="fb-field">
            <label>What should we improve?</label>
            <textarea
              id="fbImprove"
              value={improve}
              onChange={(e) => setImprove(e.target.value)}
              placeholder="e.g. Make it easier to find people..."
            ></textarea>
          </div>
          <button className="fb-submit" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Feedback →"}
          </button>
          <button className="fb-skip-btn" onClick={onClose}>
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
