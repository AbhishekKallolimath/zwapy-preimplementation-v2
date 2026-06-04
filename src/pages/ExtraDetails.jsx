import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, getDocs, collection, query, where, increment } from "firebase/firestore";
import { auth, db } from "../firebase";
import "./ExtraDetails.css";

const CURRENT_PROFILE_VERSION = 3;

export default function ExtraDetails() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [university, setUniversity] = useState("");
  const [otherUniversityName, setOtherUniversityName] = useState("");
  const [uniEmail, setUniEmail] = useState("");
  const [uniEmailValid, setUniEmailValid] = useState(false);
  const [uniStatus, setUniStatus] = useState({ text: "", type: "" });
  
  const [progress, setProgress] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);
  const [existingData, setExistingData] = useState({});

  // Check auth session
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        navigate("/signup");
        return;
      }
      setCurrentUser(user);
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) {
        const ud = snap.data();
        setExistingData(ud);
        // Pre-fill
        if (ud.name) setFullName(ud.name);
        if (ud.phone) setPhone(ud.phone);
        if (ud.university) {
          if (ud.university === "Presidency University, Bangalore") {
            setUniversity("Presidency University, Bangalore");
          } else {
            setUniversity("other");
            setOtherUniversityName(ud.university);
          }
        }
        if (ud.universityEmail) {
          setUniEmail(ud.universityEmail);
          validateUniEmail(ud.universityEmail);
        }
      }
    });
    return unsubscribe;
  }, [navigate]);

  // Update Progress Indicator
  useEffect(() => {
    const checks = [
      fullName,
      phone,
      university,
      uniEmailValid ? "ok" : ""
    ];
    const filled = checks.filter(v => (v || "").trim()).length;
    setProgress(Math.round((filled / checks.length) * 100));
  }, [fullName, phone, university, uniEmailValid]);

  // Email format validation (matching the vanilla code exactly)
  const validateUniEmail = (raw) => {
    if (!raw || !raw.includes("@")) {
      setUniEmailValid(false);
      setUniStatus({ text: "❌ Invalid email format", type: "err" });
      return;
    }
    const loc = (raw.split("@")[0] || "").toUpperCase();
    const dom = (raw.split("@")[1] || "").toLowerCase().trim();
    
    const badDomains = [
      "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
      "rediffmail.com", "ymail.com", "live.com", "yopmail.com", "tempmail.com",
      "mailinator.com", "10minutemail.com", "aol.com"
    ];
    const presidencyDomains = ["presidencyuniversity.in", "presidency.edu.in", "presidency.ac.in"];

    if (badDomains.includes(dom)) {
      setUniEmailValid(false);
      setUniStatus({ text: "❌ Use your official college email, not personal email", type: "err" });
      return;
    }

    const isPresidency = presidencyDomains.some(d => dom === d || dom.endsWith("." + d));
    if (isPresidency) {
      const presidencyPattern = /^[A-Z]+(\.[A-Z]+)*\.20(2[0-9]|3[0-2])[0-9][A-Z]{2,6}[0-9]{3,6}$/;
      if (!presidencyPattern.test(loc)) {
        setUniEmailValid(false);
        setUniStatus({ text: "❌ Presidency format: FIRSTNAME.20241CIT0056@presidencyuniversity.in", type: "err" });
        return;
      }
      setUniEmailValid(true);
      setUniStatus({ text: "✅ Valid Presidency University email verified", type: "ok" });
      return;
    }

    const isEdu = /\.(edu\.in|ac\.in|edu)$/.test(dom);
    if (!isEdu) {
      setUniEmailValid(false);
      setUniStatus({ text: "❌ Must end in .edu.in, .ac.in or .edu — use your official college email", type: "err" });
      return;
    }

    if (loc.length < 3) {
      setUniEmailValid(false);
      setUniStatus({ text: "❌ Email username too short", type: "err" });
      return;
    }

    setUniEmailValid(true);
    setUniStatus({ text: "✅ College email accepted", type: "ok" });
  };

  const handleUniEmailChange = (val) => {
    setUniEmail(val);
    if (!val.trim()) {
      setUniEmailValid(false);
      setUniStatus({ text: "", type: "" });
      return;
    }
    validateUniEmail(val.trim());
  };

  const handleSubmit = async () => {
    if (!currentUser) return;

    const uniName = university === "other" ? otherUniversityName.trim() : university;

    /* Validation checks matching vanilla exactly */
    if (!fullName || fullName.trim().length < 2) {
      alert("❌ Enter your full name");
      return;
    }
    if (!/^[A-Za-z\s.'\-]{2,}$/.test(fullName.trim())) {
      alert("❌ Name should only have letters");
      return;
    }
    const nameLower = fullName.toLowerCase().replace(/\s/g, "");
    if (/(.{2,})\1{2,}/.test(nameLower) || /(.)\1{4,}/.test(nameLower)) {
      alert("❌ Enter your real name");
      return;
    }
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      alert("❌ Enter a valid 10-digit phone number");
      return;
    }
    if (!uniName) {
      alert("❌ Select your university");
      return;
    }
    if (!uniEmail) {
      alert("❌ Enter your college email");
      return;
    }
    if (!uniEmailValid) {
      alert("❌ Enter a valid college email");
      return;
    }

    setIsSaving(true);
    setSaveProgress(40);

    try {
      const profileData = {
        name: fullName.trim(),
        phone: phone.trim(),
        email: currentUser.email,
        universityEmail: uniEmail.trim(),
        universityEmailVerified: true,
        personalEmailVerified: true,
        university: uniName,
        course: existingData.course || "",
        yearOfPassout: existingData.yearOfPassout || "",
        linkedin: existingData.linkedin || "",
        skillsKnown: existingData.skillsKnown || [],
        skillsLearn: existingData.skillsLearn || [],
        startupInterest: existingData.startupInterest || "",
        bio: existingData.bio || "",
        dob: existingData.dob || "",
        role: existingData.role || "Student",
        photoURL: existingData.photoURL || "",
        coins: existingData.coins !== undefined ? existingData.coins : 0,
        coinDebt: existingData.coinDebt || 0,
        exchanges: existingData.exchanges || 0,
        referrals: existingData.referrals || 0,
        referralCode: existingData.referralCode || currentUser.uid.substring(0, 8).toUpperCase(),
        profileVersion: CURRENT_PROFILE_VERSION,
        profileComplete: false,
        updatedAt: serverTimestamp(),
      };
      if (!existingData.createdAt) {
        profileData.createdAt = serverTimestamp();
      }

      setSaveProgress(65);
      await setDoc(doc(db, "users", currentUser.uid), profileData, { merge: true });
      setSaveProgress(85);

      const isNewUser = !existingData.name;
      if (isNewUser) {
        try {
          await updateDoc(doc(db, "stats", "platform"), {
            totalUsers: increment(1),
            updatedAt: serverTimestamp(),
          });
        } catch (e) {
          try {
            await setDoc(doc(db, "stats", "platform"), {
              totalUsers: 1,
              totalExchanges: 0,
              totalCerts: 0,
              updatedAt: serverTimestamp(),
            });
          } catch (e2) {}
        }
      }

      // Referral awards
      const storedRef = localStorage.getItem("zwapyRef");
      if (storedRef) {
        try {
          const freshSnap = await getDoc(doc(db, "users", currentUser.uid));
          const alreadyReferred = freshSnap.exists() && freshSnap.data().referredBy;

          if (!alreadyReferred) {
            const refQ = await getDocs(query(collection(db, "users"), where("referralCode", "==", storedRef)));
            if (!refQ.empty) {
              const rDoc = refQ.docs[0];
              if (rDoc.id !== currentUser.uid) {
                await updateDoc(doc(db, "users", rDoc.id), {
                  coins: increment(2),
                  referrals: increment(1),
                });
                await updateDoc(doc(db, "users", currentUser.uid), {
                  coins: increment(1),
                  referredBy: rDoc.id,
                });
              }
            }
          }
        } catch (refErr) {
          console.error("Referral awards failed", refErr);
        }
        localStorage.removeItem("zwapyRef");
      }

      setSaveProgress(100);
      await new Promise(r => setTimeout(r, 400));
      setIsSaving(false);
      alert("✅ Welcome to Zwapy!");
      navigate(isNewUser ? "/thankyou" : "/dashboard");
    } catch (err) {
      console.error(err);
      setIsSaving(false);
      alert("❌ Setup failed: " + err.message);
    }
  };

  return (
    <div className="setup-body">
      <div className="bg-glow"></div>

      {isSaving && (
        <div className="save-overlay show">
          <div className="save-icon">⚡</div>
          <div className="save-label">Setting up your account...</div>
          <div className="save-bar-wrap">
            <div className="save-bar" style={{ width: `${saveProgress}%` }}></div>
          </div>
        </div>
      )}

      <div className="wrap">
        <div className="logo">
          <div className="logo-text">ZWAPY</div>
          <div className="logo-sub">Campus Skill Network</div>
        </div>

        <div className="welcome">
          <div className="welcome-emoji">👋</div>
          <div className="welcome-title">Welcome to Zwapy!</div>
          <div className="welcome-sub">Just 4 quick things and you're in. Takes under 60 seconds.</div>
          <div className="welcome-email">{currentUser?.email || "—"}</div>
        </div>

        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>

        <div className="form-card">
          <div className="field">
            <label>Your Full Name <span className="req">*</span></label>
            <input
              type="text"
              placeholder="Full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

          <div className="field">
            <label>Phone Number <span className="req">*</span></label>
            <input
              type="tel"
              placeholder="+91"
              maxLength={13}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <div className="field-hint">Your own mobile number</div>
          </div>

          <div className="field">
            <label>University <span className="req">*</span></label>
            <select value={university} onChange={(e) => setUniversity(e.target.value)}>
              <option value="">Select your university</option>
              <option value="Presidency University, Bangalore">Presidency University, Bangalore</option>
              <option value="other">Other University</option>
            </select>
          </div>

          {university === "other" && (
            <div className="field">
              <label>University Name <span className="req">*</span></label>
              <input
                type="text"
                placeholder="e.g. Reva University, Bangalore"
                value={otherUniversityName}
                onChange={(e) => setOtherUniversityName(e.target.value)}
              />
            </div>
          )}

          <div className="field">
            <label>University / College Email <span className="req">*</span></label>
            <input
              type="email"
              className={uniEmail ? (uniEmailValid ? "valid" : "invalid") : ""}
              placeholder="official uni mail id"
              value={uniEmail}
              onChange={(e) => handleUniEmailChange(e.target.value)}
              autoComplete="off"
            />
            {uniStatus.text && (
              <div className={`uni-status show ${uniStatus.type === "ok" ? "ok" : "err"}`}>
                {uniStatus.text}
              </div>
            )}
            <div className="field-hint">Your official college email ID. Not Gmail or personal email.</div>
          </div>
        </div>

        <div className="profile-notice">
          <strong>📝 More details later!</strong> Skills, LinkedIn, course, bio and more can be added from your <strong>Profile</strong> inside Zwapy after you're in.
        </div>

        <button className="submit-btn" type="button" onClick={handleSubmit}>
          Enter Zwapy →
        </button>
      </div>
    </div>
  );
}
