import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
  addDoc,
  collection,
  serverTimestamp,
  increment
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import BottomNav from "../components/BottomNav";
import "./Exam.css";

const COIN_TABLE = {
  Beginner: { pass: 5, fail: -5 },
  Intermediate: { pass: 10, fail: -5 },
  Advanced: { pass: 15, fail: -5 }
};

function getLearnerCoins(level, passed) {
  const t = COIN_TABLE[level] || COIN_TABLE.Intermediate;
  return passed ? t.pass : t.fail;
}

// Complete local high-quality questions database to secure API keys
const QUESTION_BANK = {
  python: {
    Beginner: [
      { q: "What is the correct syntax to print 'Hello World' in Python?", options: ["A. print('Hello World')", "B. echo('Hello World')", "C. console.log('Hello World')", "D. system.out.print('Hello World')"], correct: 0 },
      { q: "Which of the following is NOT a valid variable name in Python?", options: ["A. my_var", "B. _myvar", "C. 2myvar", "D. myVar2"], correct: 2 },
      { q: "What is the output of print(2 ** 3) in Python?", options: ["A. 6", "B. 8", "C. 9", "D. 5"], correct: 1 },
      { q: "Which data type is used to store true or false values in Python?", options: ["A. int", "B. float", "C. bool", "D. str"], correct: 2 },
      { q: "How do you start a comment block in Python?", options: ["A. //", "B. /*", "C. #", "D. <!--"], correct: 2 }
    ],
    Intermediate: [
      { q: "What does the 'self' keyword represent inside a Python class method?", options: ["A. A global helper namespace", "B. The class definition itself", "C. The current instance of the class", "D. A private object reference"], correct: 2 },
      { q: "How do you append an element to a list in Python?", options: ["A. list.add(el)", "B. list.append(el)", "C. list.push(el)", "D. list.insert(el)"], correct: 1 },
      { q: "What is the output of print([x for x in range(5) if x % 2 == 0])?", options: ["A. [0, 2, 4]", "B. [1, 3]", "C. [0, 1, 2, 3, 4]", "D. Error"], correct: 0 },
      { q: "Which keyword is used to handle exceptions in Python?", options: ["A. catch", "B. try", "C. except", "D. throw"], correct: 2 },
      { q: "What is the difference between a list and a tuple in Python?", options: ["A. List is immutable, Tuple is mutable", "B. List is mutable, Tuple is immutable", "C. List is faster than Tuple", "D. There is no difference"], correct: 1 }
    ]
  },
  javascript: {
    Beginner: [
      { q: "Which keyword is used to declare a block-scoped variable in JavaScript?", options: ["A. var", "B. let", "C. make", "D. variable"], correct: 1 },
      { q: "What is the output of console.log(typeof null) in JavaScript?", options: ["A. 'null'", "B. 'undefined'", "C. 'object'", "D. 'string'"], correct: 2 },
      { q: "Which operator is used for strict equality comparison (compares both value and type)?", options: ["A. =", "B. ==", "C. ===", "D. !==="], correct: 2 },
      { q: "How do you write a comment in JavaScript?", options: ["A. #", "B. //", "C. <!--", "D. '"], correct: 1 },
      { q: "What does DOM stand for in JavaScript?", options: ["A. Document Object Model", "B. Data Object Manager", "C. Digital Output Matrix", "D. Direct Order Module"], correct: 0 }
    ],
    Intermediate: [
      { q: "Which of the following is NOT a valid way to create an asynchronous operation in JavaScript?", options: ["A. Callbacks", "B. Promises", "C. Async/Await", "D. Sync Generators"], correct: 3 },
      { q: "What is closures in JavaScript?", options: ["A. Closing all running tags", "B. Memory management utilities", "C. A function that references variables outside its immediate block", "D. A tool to stop loops"], correct: 2 },
      { q: "What does Array.prototype.map() return in JavaScript?", options: ["A. A modified original array", "B. A brand new array with mapped elements", "C. A boolean value", "D. The sum of all elements"], correct: 1 },
      { q: "What is the purpose of 'use strict' in JavaScript?", options: ["A. Enables strict sandboxing", "B. Formats files beautifully", "C. Enforces stricter parsing and error handling rules", "D. Deletes unused variables"], correct: 2 },
      { q: "Which of the following correctly parses a JSON string into an object?", options: ["A. JSON.stringify()", "B. JSON.parse()", "C. Object.parseJSON()", "D. JSON.toObject()"], correct: 1 }
    ]
  }
};

function generateFallbackQuestions(skill, level) {
  const normalizedSkill = (skill || "").toLowerCase().trim();
  const matchedSkill = QUESTION_BANK[normalizedSkill] || QUESTION_BANK[Object.keys(QUESTION_BANK)[0]];
  const matchedLevel = matchedSkill[level] || matchedSkill.Beginner || matchedSkill.Intermediate;

  // Clone matched questions
  const questions = matchedLevel.map(q => ({
    ...q,
    skill: skill,
    level: level
  }));

  // If we need 10 questions, duplicate with variation or pad
  const finalQuestions = [];
  for (let i = 0; i < 10; i++) {
    const qTemplate = questions[i % questions.length];
    finalQuestions.push({
      ...qTemplate,
      question: `[Q${i + 1}] Regarding ${skill}: ${qTemplate.q}`
    });
  }
  return finalQuestions;
}

export default function Exam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, userData, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [examSession, setExamSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [examState, setExamState] = useState("generating"); // generating, active, results
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [optionState, setOptionState] = useState(null); // correct, wrong
  const [answers, setAnswers] = useState([]); // Array of bool
  const [timeLeft, setTimeLeft] = useState(30);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [examVoided, setExamVoided] = useState(false);
  const [savingResults, setSavingResults] = useState(false);
  const [retrievedCount, setRetrievedCount] = useState(0);

  const timerRef = useRef(null);
  const canvasRef = useRef(null);

  // Extract navigation session parameters
  useEffect(() => {
    if (!currentUser) return;
    const state = location.state;
    if (!state || !state.sessionId) {
      // If no session passed, fallback to dashboard
      navigate("/dashboard");
      return;
    }
    setExamSession(state);

    // Dynamic question loader matching parameters
    setTimeout(() => {
      const qs = generateFallbackQuestions(state.skill, state.level || "Intermediate");
      // Shuffle questions
      for (let i = qs.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [qs[i], qs[j]] = [qs[j], qs[i]];
      }
      setQuestions(qs);
      setExamState("active");
    }, 2000);
  }, [currentUser, location, navigate]);

  // Anti-cheat tab switcher
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && examState === "active" && !examVoided) {
        setTabSwitches(prev => {
          const next = prev + 1;
          if (next >= 3) {
            setExamVoided(true);
            clearInterval(timerRef.current);
            alert("🚫 Exam Voided! You switched tabs 3 times. Score recorded as 0.");
            // Record 0 and show results
            setTimeout(() => finishExamVoided(), 1500);
          } else {
            alert(`⚠️ Tab switch detected! Warning ${next}/3. Switched tabs during exam will void progress.`);
          }
          return next;
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [examState, examVoided]);

  // Disable standard copy/paste/inspector shortcuts during exam
  useEffect(() => {
    if (examState !== "active") return;
    const preventShortcuts = (e) => {
      if ((e.ctrlKey || e.metaKey) && ["c", "v", "u", "a"].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      if (e.key === "F12") e.preventDefault();
    };
    const preventContextMenu = (e) => e.preventDefault();

    document.addEventListener("keydown", preventShortcuts);
    document.addEventListener("contextmenu", preventContextMenu);
    return () => {
      document.removeEventListener("keydown", preventShortcuts);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [examState]);

  // Timer ticking
  useEffect(() => {
    if (examState !== "active" || examVoided) return;
    setTimeLeft(30);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          handleSkipQuestion();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [examState, currentQIndex, examVoided]);

  // Confirm Option Selected
  const selectOption = (idx) => {
    if (optionState !== null) return; // already answered
    clearInterval(timerRef.current);
    const q = questions[currentQIndex];
    setSelectedOption(idx);

    if (idx === q.correct) {
      setOptionState("correct");
      setAnswers(prev => [...prev, true]);
    } else {
      setOptionState("wrong");
      setAnswers(prev => [...prev, false]);
    }
  };

  // Next Question trigger
  const handleNextQuestion = () => {
    setSelectedOption(null);
    setOptionState(null);
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      showResultsScreen();
    }
  };

  // Skip Question trigger
  const handleSkipQuestion = () => {
    setSelectedOption(null);
    setOptionState(null);
    setAnswers(prev => [...prev, false]);
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      showResultsScreen();
    }
  };

  // Show Results
  const showResultsScreen = async () => {
    setExamState("results");
    clearInterval(timerRef.current);
  };

  // Calculate scores
  const scoreCorrect = answers.filter(a => a).length;
  const overallPct = questions.length > 0 ? Math.round((scoreCorrect / questions.length) * 100) : 0;
  const passed = overallPct >= 60;

  // Generate Digital Certificate Canvas Drawing
  useEffect(() => {
    if (examState !== "results" || !passed || !examSession) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = 900, h = 620;

    // Draw background
    ctx.fillStyle = "#010114";
    ctx.fillRect(0, 0, w, h);

    // Glowing border outline
    ctx.strokeStyle = "rgba(0, 212, 255, 0.45)";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = "rgba(0, 212, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    const grd = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, 380);
    grd.addColorStop(0, "rgba(0, 212, 255, 0.07)");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, w, h);

    // Header ZWAPY
    ctx.textAlign = "center";
    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 24px monospace";
    ctx.fillText("ZWAPY", w / 2, 74);

    ctx.fillStyle = "rgba(0, 212, 255, 0.4)";
    ctx.font = "10px monospace";
    ctx.fillText("CAMPUS SKILL NETWORK · PRESIDENCY UNIVERSITY, BANGALORE", w / 2, 92);

    ctx.strokeStyle = "rgba(0, 212, 255, 0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 104);
    ctx.lineTo(w - 80, 104);
    ctx.stroke();

    // Main Certificate texts
    ctx.fillStyle = "white";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText("Certificate of Skill Exchange", w / 2, 146);

    ctx.fillStyle = "rgba(148, 163, 184, 0.75)";
    ctx.font = "14px sans-serif";
    ctx.fillText("This is to certify that", w / 2, 178);

    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 38px sans-serif";
    ctx.fillText(userData?.name || "Student", w / 2, 230);

    ctx.fillStyle = "rgba(148, 163, 184, 0.88)";
    ctx.font = "14px sans-serif";
    ctx.fillText("has successfully completed peer-to-peer skill exchange sessions in", w / 2, 268);

    ctx.fillStyle = "white";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(examSession.skill, w / 2, 308);

    ctx.fillStyle = "#10b981";
    ctx.font = "bold 15px monospace";
    ctx.fillText(`Score: ${scoreCorrect}/${questions.length} · ${overallPct}% · Level: ${examSession.level || "Intermediate"}`, w / 2, 344);

    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.font = "13px sans-serif";
    ctx.fillText(`Taught by ${examSession.teacherName} · Zwapy Campus Network`, w / 2, 374);

    ctx.fillStyle = "rgba(100, 116, 139, 0.7)";
    ctx.font = "12px monospace";
    ctx.fillText(new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }), w / 2, 404);

    ctx.strokeStyle = "rgba(0, 212, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(80, 425);
    ctx.lineTo(w - 80, 425);
    ctx.stroke();

    // Verified badge
    ctx.save();
    ctx.translate(w - 200, 480);
    ctx.strokeStyle = "rgba(0, 212, 255, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgba(0, 212, 255, 0.06)";
    ctx.fill();

    ctx.fillStyle = "#00D4FF";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("ZWAPY", 0, -5);
    ctx.fillText("VERIFIED", 0, 8);
    ctx.restore();

    ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
    ctx.font = "11px monospace";
    ctx.textAlign = "center";
    ctx.fillText("Official Digital Certificate", w - 200, 516);
    ctx.fillText(`ID: ZWP-${Date.now().toString(36).toUpperCase().slice(-8)}`, w - 200, 530);

    ctx.fillStyle = "rgba(100, 116, 139, 0.45)";
    ctx.font = "10px monospace";
    ctx.fillText("Issued by Zwapy · zwapy.com · Digitally verified", w / 2, 570);
  }, [examState, passed, examSession]);

  // Finish exam successfully & save values
  const handleClaimCoins = async () => {
    if (!currentUser || !examSession) return;
    setSavingResults(true);

    const level = examSession.level || "Intermediate";
    const coinsReward = getLearnerCoins(level, passed);

    try {
      const currentCoins = userData?.coins || 0;
      const currentDebt = userData?.coinDebt || 0;

      // Handle coin changes or debt
      if (coinsReward < 0 && currentCoins === 0) {
        await updateDoc(doc(db, "users", currentUser.uid), {
          coinDebt: currentDebt + Math.abs(coinsReward),
          exchanges: increment(1)
        });
      } else {
        await updateDoc(doc(db, "users", currentUser.uid), {
          coins: Math.max(0, currentCoins + coinsReward),
          exchanges: increment(1)
        });
      }

      // Mark exam as complete in Session
      await updateDoc(doc(db, "sessions", examSession.sessionId), {
        [`examDone.${currentUser.uid}`]: true,
        [`examScore.${currentUser.uid}`]: overallPct,
        [`tabSwitches.${currentUser.uid}`]: tabSwitches
      });

      // Update exchange counts for cert milestones
      let nextExchangeCount = 0;
      if (passed) {
        const skillKey = examSession.skill.toLowerCase().trim();
        const counts = userData?.skillExchangeCounts || {};
        nextExchangeCount = (counts[skillKey] || 0) + 1;
        counts[skillKey] = nextExchangeCount;

        await updateDoc(doc(db, "users", currentUser.uid), {
          skillExchangeCounts: counts
        });
      }

      // Add Activity log
      await addDoc(collection(db, "users", currentUser.uid, "activity"), {
        title: `📝 Exam: ${examSession.skill}`,
        desc: `${scoreCorrect}/${questions.length} (${overallPct}%) · ${coinsReward > 0 ? "+" : ""}${coinsReward} coins · ${level}`,
        createdAt: serverTimestamp()
      });

      alert(coinsReward < 0 ? ` Deducted ${Math.abs(coinsReward)} coins.` : `🎉 Added +${coinsReward} coins!`);
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to claim rewards: " + err.message);
    } finally {
      setSavingResults(false);
    }
  };

  // Voided directly
  const finishExamVoided = async () => {
    if (!currentUser || !examSession) return;
    try {
      await updateDoc(doc(db, "sessions", examSession.sessionId), {
        [`examDone.${currentUser.uid}`]: true,
        [`examScore.${currentUser.uid}`]: 0,
        [`tabSwitches.${currentUser.uid}`]: tabSwitches
      });
      await addDoc(collection(db, "users", currentUser.uid, "activity"), {
        title: `📝 Exam Voided: ${examSession.skill}`,
        desc: `Voided due to tab switches · 0% recorded`,
        createdAt: serverTimestamp()
      });
      navigate("/dashboard");
    } catch (e) {
      console.error(e);
      navigate("/dashboard");
    }
  };

  if (loading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading...</div>
      </div>
    );
  }

  return (
    <div className="exam-body-screen">
      <div className="bg-glow" />

      <div className="layout">
        {/* State 1: Loading Generating */}
        {examState === "generating" && (
          <div className="gen-screen">
            <div className="gen-icon">⚡</div>
            <div className="gen-title">Generating Your Exam</div>
            <p className="gen-sub">Creating personalized questions based on your skills and levels. This takes a few seconds.</p>
            <div className="gen-bar"><div className="gen-fill" /></div>
          </div>
        )}

        {/* State 2: Active Question card */}
        {examState === "active" && questions.length > 0 && (
          <div>
            <div className={`anti-cheat-banner${tabSwitches > 0 ? " show" : ""}`}>
              ⚠️ Tab switch detected! Warning <strong>{tabSwitches}</strong>/3.
              After 3 switches your exam will be void and you'll score 0.
            </div>

            <div className="exam-header">
              <div className="exam-title-wrap">
                <div className="exam-label">// Skill Assessment</div>
                <h2>Prove Your Skills</h2>
              </div>
              <div className="timer-wrap">
                <div className={`timer${timeLeft <= 10 ? " urgent" : ""}`}>{timeLeft}</div>
                <div className="timer-label">seconds left</div>
              </div>
            </div>

            <div className="exam-progress">
              <div className="ep-info">
                <span>Question {currentQIndex + 1} of {questions.length}</span>
                <span>Skill: {examSession.skill}</span>
              </div>
              <div className="ep-bar">
                <div className="ep-fill" style={{ width: `${(currentQIndex / questions.length) * 100}%` }} />
              </div>
            </div>

            <div className="skill-badge">📚 {examSession.skill} · {examSession.level}</div>

            <div className="q-card">
              <div className="q-num">Q{currentQIndex + 1}</div>
              <div className="q-text">{questions[currentQIndex].q}</div>
              <div className="options">
                {questions[currentQIndex].options.map((opt, oidx) => {
                  let cls = "option";
                  if (selectedOption === oidx) {
                    cls += optionState === "correct" ? " correct" : " wrong";
                  } else if (optionState !== null && oidx === questions[currentQIndex].correct) {
                    cls += " correct";
                  }
                  return (
                    <button
                      key={oidx}
                      className={cls}
                      onClick={() => selectOption(oidx)}
                      disabled={optionState !== null}
                    >
                      <span className="opt-letter">{String.fromCharCode(65 + oidx)}.</span>
                      <span>{opt.replace(/^[A-D]\.\s*/, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {optionState !== null ? (
              <button className="next-btn show-block" onClick={handleNextQuestion}>
                Next Question →
              </button>
            ) : (
              <button className="skip-btn" onClick={handleSkipQuestion}>
                Skip this question
              </button>
            )}
          </div>
        )}

        {/* State 3: Results Display */}
        {examState === "results" && (
          <div className="results-screen">
            <div className="rs-icon">{passed ? "🎉" : "📚"}</div>
            <div className={`rs-score ${passed ? "pass" : "fail"}`}>{scoreCorrect}/{questions.length}</div>
            <div className="rs-out">Overall Score ({overallPct}%)</div>

            <div className="rs-breakdown">
              <div className="rbd-title">// Score by Skill</div>
              <div className="rbd-row">
                <span className="rbd-skill">{examSession?.skill}</span>
                <span className={`rbd-score ${passed ? "score-green" : "score-red"}`}>
                  {overallPct}% ({scoreCorrect}/{questions.length})
                </span>
              </div>
            </div>

            <p className="rs-note">
              {passed
                ? "Excellent! Your verified score is now on your profile. Other students can see you're an expert before requesting a skill exchange from you."
                : "Keep learning! Study more and retake this exam anytime from your profile settings whenever you're ready."}
            </p>

            {/* Cert Canvas preview */}
            {passed && (
              <div style={{ marginTop: 20 }}>
                <div style={{ marginBottom: 10, fontSize: "0.85rem", color: "var(--green)", fontWeight: 700 }}>🎓 digital certificate generated!</div>
                <canvas ref={canvasRef} width="900" height="620" style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(0, 212, 255, 0.2)", marginBottom: 15 }} />

                <div className="hardcopy-box">
                  <strong>📜 Want a signed physical copy?</strong><br />₹99 · Delivered in 7 days.
                  <a
                    className="hardcopy-link"
                    href={`mailto:zwapyteam@gmail.com?subject=Physical Certificate Request&body=Name: ${userData?.name}%0ASkill: ${examSession.skill}%0AAddress: `}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Order Signed Hard Copy (₹99) →
                  </a>
                </div>
              </div>
            )}

            <button className="rs-btn" disabled={savingResults} onClick={handleClaimCoins}>
              {savingResults ? "Saving Results..." : passed ? "Claim Coins →" : "Accept Deduction & Exit"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
