import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import "./ThankYou.css";

export default function ThankYou() {
  const navigate = useNavigate();
  const { currentUser, userData, loading } = useAuth();
  const [refCode, setRefCode] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [stars, setStars] = useState([]);

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  // Generate twinkling stars background
  useEffect(() => {
    const starArr = [];
    for (let i = 0; i < 50; i++) {
      const sz = Math.random() * 2 + 0.5;
      starArr.push({
        id: i,
        width: `${sz}px`,
        height: `${sz}px`,
        top: `${Math.random() * 100}%`,
        left: `${Math.random() * 100}%`,
        duration: `${Math.random() * 4 + 2}s`,
        delay: `-${Math.random() * 4}s`
      });
    }
    setStars(starArr);
  }, []);

  // Fetch Referral Code
  useEffect(() => {
    if (!currentUser) return;
    async function fetchRefCode() {
      let code = currentUser.uid.substring(0, 8).toUpperCase();
      try {
        let details = null;
        try {
          const snap = await getDoc(doc(db, "users", currentUser.uid));
          if (snap.exists()) details = snap.data();
        } catch (e) {
          console.warn("Firestore fetch failed in ThankYou, checking local DB:", e);
        }

        if (!details) {
          const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
          details = localUsers[currentUser.uid] || userData || {};
        }

        if (details.referralCode) {
          code = details.referralCode;
        }
      } catch (e) {
        console.error("Error fetching referral code", e);
      }
      setRefCode(code);
    }
    fetchRefCode();
  }, [currentUser, userData]);

  const copyRefLink = () => {
    const link = `https://zwapy.com/signup.html?ref=${refCode}`;
    try {
      navigator.clipboard.writeText(link).then(() => {
        setToastMsg("✅ Invite link copied!");
        setTimeout(() => setToastMsg(""), 3000);
      });
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = link;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setToastMsg("✅ Invite link copied!");
      setTimeout(() => setToastMsg(""), 3000);
    }
  };

  if (loading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Setting off rocket...</div>
      </div>
    );
  }

  const referralLink = `https://zwapy.com/signup.html?ref=${refCode}`;

  return (
    <div className="ty-body">
      <div className="ty-bg-glow" />
      <div className="ty-stars">
        {stars.map((s) => (
          <div
            key={s.id}
            className="ty-star"
            style={{
              width: s.width,
              height: s.height,
              top: s.top,
              left: s.left,
              animationDuration: s.duration,
              animationDelay: s.delay
            }}
          />
        ))}
      </div>

      {toastMsg && <div className="ty-toast show">{toastMsg}</div>}

      <div className="ty-layout">
        {/* TOP BADGE */}
        <div className="ty-top-badge fade-up in d1">
          <div className="ty-badge-pill">
            <div className="ty-badge-dot" />
            <span className="ty-badge-text">You're now part of Zwapy</span>
          </div>
        </div>

        {/* HERO */}
        <div className="ty-hero fade-up in d1">
          <span className="ty-rocket">🚀</span>
          <h1>You're <span>Early.</span><br />That matters.</h1>
          <p className="ty-sub">
            You're one of the <strong>first students</strong> on Zwapy at Presidency University.<br />
            The people who join first build the campus culture. That's you now.
          </p>
        </div>

        {/* WHAT'S NEXT */}
        <div className="ty-what-next fade-up in d2">
          <div className="ty-wn-title">// What happens next</div>
          <div className="ty-steps">
            <div className="ty-step">
              <div className="ty-step-num">1</div>
              <div className="ty-step-info">
                <h4>Join the WhatsApp group</h4>
                <p>Stay updated, meet other early members, and get announcements directly from the Zwapy team.</p>
              </div>
            </div>
            <div className="ty-step">
              <div className="ty-step-num">2</div>
              <div className="ty-step-info">
                <h4>Follow us on Instagram</h4>
                <p>We post platform updates, skill exchange highlights, and early member shoutouts.</p>
              </div>
            </div>
            <div className="ty-step">
              <div className="ty-step-num">3</div>
              <div className="ty-step-info">
                <h4>Invite your friends</h4>
                <p>Share your referral link. You get +2 Skill Coins for every person who joins through you.</p>
              </div>
            </div>
            <div className="ty-step">
              <div className="ty-step-num">4</div>
              <div className="ty-step-info">
                <h4>Do your first skill exchange</h4>
                <p>Go to the dashboard, post a skill, and connect with someone. That's how you earn coins and certificates.</p>
              </div>
            </div>
          </div>
        </div>

        {/* COMMUNITY — WhatsApp + Instagram */}
        <div className="ty-community-grid fade-up in d3">
          {/* WhatsApp */}
          <a href="https://chat.whatsapp.com/CWKXSgQGGTlFIAPNWph4YE" target="_blank" rel="noopener noreferrer" className="ty-comm-card whatsapp">
            <span className="ty-comm-icon">💬</span>
            <div className="ty-comm-label">WhatsApp Group</div>
            <div className="ty-comm-name">ZWAPY 🚀</div>
            <div className="ty-qr-wrap">
              <img
                src="assets/whatsapp-qr.png"
                alt="WhatsApp QR"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML =
                    "<div style='font-size:.5rem;color:#25d366;text-align:center;padding:4px;word-break:break-all;font-family:monospace;'>Scan QR in WhatsApp</div>";
                }}
              />
            </div>
            <span className="ty-comm-btn">Join Group →</span>
          </a>

          {/* Instagram */}
          <a href="https://www.instagram.com/zwapy.official_?igsh=MThvaDJwbjJjaG11aA==" target="_blank" rel="noopener noreferrer" className="ty-comm-card instagram">
            <span className="ty-comm-icon">📸</span>
            <div className="ty-comm-label">Instagram</div>
            <div className="ty-comm-name">@zwapy.official_</div>
            <div className="ty-qr-wrap">
              <img
                src="assets/instagram-qr.png"
                alt="Instagram QR"
                onError={(e) => {
                  e.target.style.display = "none";
                  e.target.parentElement.innerHTML =
                    "<div style='font-size:.55rem;color:#e1306c;text-align:center;padding:6px;font-family:monospace;'>@zwapy.official_</div>";
                }}
              />
            </div>
            <span className="ty-comm-btn">Follow Us →</span>
          </a>
        </div>

        {/* AMBASSADOR PROGRAM */}
        <div className="ty-ambassador-card fade-up in d4">
          <div className="ty-amb-top">
            <div className="ty-amb-icon">⚡</div>
            <div className="ty-amb-title-wrap">
              <div className="ty-amb-label">Limited Positions</div>
              <div className="ty-amb-title">Become a Campus Ambassador</div>
            </div>
          </div>
          <div className="ty-amb-perks">
            <div className="ty-perk"><div className="ty-perk-val">5</div><div className="ty-perk-label">Open positions</div></div>
            <div className="ty-perk"><div className="ty-perk-val">20%</div><div className="ty-perk-label">Subscription discount</div></div>
            <div className="ty-perk"><div className="ty-perk-val">+20</div><div className="ty-perk-label">Skill Coins bonus</div></div>
            <div className="ty-perk"><div className="ty-perk-val">1st</div><div className="ty-perk-label">Access to new features</div></div>
          </div>
          <p className="ty-amb-desc">
            We're looking for <strong>5 students</strong> at Presidency who want to be the face of Zwapy on campus.
            Ambassadors spread the word, help onboard new students, and get exclusive perks in return.
            You don't need experience — you just need to believe in what Zwapy is building.
          </p>
          <a href="https://chat.whatsapp.com/LjWMyKWBunFGK4PeoottAP?mode=gi_t" target="_blank" rel="noopener noreferrer" className="ty-amb-btn">
            🙋 Apply via WhatsApp →
          </a>
        </div>

        {/* REFERRAL */}
        <div className="ty-referral-card fade-up in d5">
          <div className="ty-ref-top">
            <div className="ty-ref-title">// Invite & Earn</div>
            <div className="ty-ref-badge">💰 You get +2 coins per invite</div>
          </div>
          <p className="ty-ref-desc">
            Share your personal invite link. When a friend signs up using your link,
            <strong> you get +2 Skill Coins</strong> and they get +1 as a welcome bonus.
            The more people you bring, the more coins you stack.
          </p>
          <div className="ty-ref-link-box">
            <span className="ty-ref-link-text">{referralLink}</span>
            <button className="ty-copy-btn" onClick={copyRefLink}>📋 Copy</button>
          </div>
        </div>

        {/* DASHBOARD CTA */}
        <Link to="/dashboard" className="ty-dashboard-btn fade-up in d6">
          🏠 &nbsp; Go to My Dashboard →
        </Link>

        <p className="ty-footer-note fade-up in d6">
          Questions? Message us on <strong>WhatsApp</strong> or DM <strong>@zwapy.official_</strong> on Instagram.<br />
          We read every message. Welcome to Zwapy 🚀
        </p>
      </div>
    </div>
  );
}
