
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth, isSameUniversity } from "../context/AuthContext";
import Topbar from "../components/Topbar";
import BottomNav from "../components/BottomNav";
import Sidebar from "../components/Sidebar";
import "./Events.css";

// COIN DISCOUNT RULES
const COINS_PER_PCT = 10;   // 10 coins = 1% discount
const MAX_COIN_PCT = 50;   // max 50% discount
const MAX_COINS = 500;  // 500 coins max
const PLATFORM_FEE = 5;    // Zwapy 5% commission

function fmt(n) {
  return Number(n || 0).toLocaleString("en-IN");
}

function fmtDate(d) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function typeColor(t) {
  if (t === "hackathon") return "#f59e0b";
  if (t === "workshop") return "#818cf8";
  return "#00D4FF";
}

function typeEmoji(t) {
  if (t === "hackathon") return "💻";
  if (t === "workshop") return "🎓";
  return "🎪";
}

function genId() {
  return "ZWP-" + Math.random().toString(36).substr(2, 5).toUpperCase() + "-" + Date.now().toString(36).toUpperCase().slice(-4);
}

export default function Events() {
  const navigate = useNavigate();
  const { currentUser, userData, loading, refreshUserData } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [allEvents, setAllEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [userCoins, setUserCoins] = useState(0);
  const [pageLoading, setPageLoading] = useState(true);

  // Filters & Search
  const [activeTab, setActiveTab] = useState("browse");
  const [searchQ, setSearchQ] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Modal Booking
  const [modalOpen, setModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [coinSliderVal, setCoinSliderVal] = useState(0);
  const [bookingStep, setBookingStep] = useState(1); // 1 = pay/confirm, 2 = success ticket
  const [confirmedTicketId, setConfirmedTicketId] = useState("");
  const [confirmedQRUrl, setConfirmedQRUrl] = useState("");
  const [processingBooking, setProcessingBooking] = useState(false);

  // Auth Guard
  useEffect(() => {
    if (!loading && !currentUser) {
      navigate("/login");
    }
  }, [currentUser, loading, navigate]);

  // Fetch Data
  const loadEventsAndTickets = async () => {
    if (!currentUser) return;
    try {
      // 1. Fetch user coins
      let profile = null;
      try {
        const uSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (uSnap.exists()) {
          profile = uSnap.data();
        }
      } catch (err) {
        console.warn("Firestore user load failed, using local offline fallback:", err);
      }

      if (!profile) {
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        profile = localUsers[currentUser.uid] || userData || {};
      }

      setUserCoins(profile.coins || 0);
      const userUni = profile.university || "";

      // 2. Fetch Zwapy Events
      const eventsList = [];
      try {
        const evSnap = await getDocs(query(collection(db, "zwapy_events"), orderBy("createdAt", "desc")));
        if (evSnap && evSnap.forEach) {
          evSnap.forEach(d => {
            eventsList.push({ id: d.id, source: "zwapy", ...d.data() });
          });
        }
      } catch (err) {
        console.warn("Firestore zwapy_events load failed, using local database fallback:", err);
      }

      // Seeding fallback if empty
      if (eventsList.length === 0) {
        const localEvents = JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
        localEvents.forEach((ev, idx) => {
          eventsList.push({ id: `ev-${idx}`, source: "zwapy", ...ev });
        });
      }

      // 3. Fetch Club Events
      let clubsList = [];
      try {
        const clubsSnap = await getDocs(collection(db, "clubs"));
        if (clubsSnap && clubsSnap.docs) {
          clubsSnap.docs.forEach(cd => {
            clubsList.push({ id: cd.id, ...cd.data() });
          });
        }
      } catch (err) {
        console.warn("Firestore clubs fetch failed, checking local database offline fallback:", err);
        const localClubs = JSON.parse(localStorage.getItem("zwapy_local_clubs") || "{}");
        Object.keys(localClubs).forEach((cid) => {
          clubsList.push({ id: cid, ...localClubs[cid] });
        });
      }

      // Enforce university isolation
      const matchedClubs = clubsList.filter(club => isSameUniversity(userUni, club.university));

      const promises = matchedClubs.map(async club => {
        try {
          let psDocs = [];
          try {
            const ps = await getDocs(collection(db, "clubs", club.id, "posts"));
            psDocs = ps.docs || [];
          } catch (pe) {
            const localPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${club.id}`) || "[]");
            psDocs = localPosts.map((p, idx) => ({ id: p.id || `p-${idx}`, data: () => p }));
          }

          const clubEvts = [];
          psDocs.forEach(pd => {
            const p = pd.data();
            if ((p.price > 0) || (p.type === "hackathon") || (p.type === "workshop")) {
              clubEvts.push({
                id: pd.id,
                source: "club",
                clubId: club.id,
                organizer: club.name || club.clubName || "Club",
                ...p
              });
            }
          });
          return clubEvts;
        } catch {
          return [];
        }
      });

      const clubResults = await Promise.all(promises);
      clubResults.forEach(arr => arr.forEach(e => eventsList.push(e)));

      // Sort
      eventsList.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      });
      setAllEvents(eventsList);

      // 4. Fetch Tickets
      let ticketsList = [];
      try {
        const tSnap = await getDocs(collection(db, "users", currentUser.uid, "tickets"));
        if (tSnap && tSnap.forEach) {
          tSnap.forEach(d => {
            ticketsList.push({ id: d.id, ...d.data() });
          });
        }
      } catch (err) {
        console.warn("Firestore tickets load failed, checking offline fallback:", err);
      }

      if (ticketsList.length === 0) {
        ticketsList = JSON.parse(localStorage.getItem(`zwapy_tickets_${currentUser.uid}`) || "[]");
      }
      setMyTickets(ticketsList);
    } catch (e) {
      console.error(e);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    loadEventsAndTickets();
  }, [currentUser]);

  // Open Booking Modal
  const openBookingModal = (ev) => {
    if (myTickets.some(t => t.eventId === ev.id)) {
      alert("⚠️ You already have a ticket for this event!");
      return;
    }
    setCurrentEvent(ev);
    setCoinSliderVal(0);
    setBookingStep(1);
    setModalOpen(true);
  };

  // Calculations for dynamic pricing in breakdown
  const getPricingDetails = () => {
    if (!currentEvent) return { free: true, youPay: 0, discAmt: 0, discPct: 0 };
    const free = !currentEvent.price || currentEvent.price === 0;
    if (free) return { free: true, youPay: 0, discAmt: 0, discPct: 0 };

    const discPct = Math.min(coinSliderVal / COINS_PER_PCT, MAX_COIN_PCT);
    const discAmt = Math.round(currentEvent.price * (discPct / 100));
    const youPay = currentEvent.price - discAmt;
    const zwapyCommission = Math.round(youPay * (PLATFORM_FEE / 100));
    const orgReceives = youPay - zwapyCommission;

    return {
      free: false,
      youPay,
      discAmt,
      discPct,
      zwapyCommission,
      orgReceives
    };
  };

  const priceInfo = getPricingDetails();

  // Confirm Ticket Booking
  const handleConfirmBooking = async () => {
    if (!currentEvent) return;
    setProcessingBooking(true);

    const ticketId = genId();
    const qrText = `ZWAPY:${ticketId}:${currentEvent.id}:${currentUser.uid}`;
    // Using high-speed Google Charts QR API
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=250x250&chl=${encodeURIComponent(qrText)}`;

    const newTicket = {
      ticketId,
      eventId: currentEvent.id,
      eventTitle: currentEvent.title,
      eventDate: currentEvent.date || "",
      eventVenue: currentEvent.venue || "",
      organizer: currentEvent.organizer || "",
      type: currentEvent.type || "event",
      coinsUsed: coinSliderVal,
      discountPct: priceInfo.discPct,
      originalPrice: currentEvent.price || 0,
      youPaid: priceInfo.youPay,
      free: priceInfo.free,
      createdAt: new Date().toISOString()
    };

    try {
      // 1. Deduct coins if used
      if (coinSliderVal > 0) {
        try {
          await updateDoc(doc(db, "users", currentUser.uid), {
            coins: userCoins - coinSliderVal
          });
        } catch (err) {
          console.warn("Firestore coin deduct failed, updating localStorage database:", err);
        }

        // Always record locally in localStorage
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        if (localUsers[currentUser.uid]) {
          localUsers[currentUser.uid].coins = (localUsers[currentUser.uid].coins || 0) - coinSliderVal;
          localStorage.setItem("zwapy_local_users", JSON.stringify(localUsers));
        }
        setUserCoins(prev => prev - coinSliderVal);
      }

      // 2. Save ticket under user
      try {
        await addDoc(collection(db, "users", currentUser.uid, "tickets"), {
          ...newTicket,
          createdAt: serverTimestamp()
        });
      } catch (err) {
        console.warn("Firestore ticket add failed, storing locally offline:", err);
      }

      // Store ticket in local tickets database
      const localTickets = JSON.parse(localStorage.getItem(`zwapy_tickets_${currentUser.uid}`) || "[]");
      localTickets.push(newTicket);
      localStorage.setItem(`zwapy_tickets_${currentUser.uid}`, JSON.stringify(localTickets));

      // 3. Save commissions tracker (only if paid)
      if (priceInfo.youPay > 0) {
        try {
          await addDoc(collection(db, "commissions"), {
            eventId: currentEvent.id,
            eventTitle: currentEvent.title,
            buyerUid: currentUser.uid,
            buyerName: userData?.name || "Student",
            organizerUid: currentEvent.organizerUid || "",
            organizerName: currentEvent.organizer || "",
            organizerUpi: currentEvent.upiId || "",
            originalPrice: currentEvent.price,
            discountGiven: priceInfo.discAmt,
            studentPaid: priceInfo.youPay,
            zwapyCommission: priceInfo.zwapyCommission,
            orgReceives: priceInfo.orgReceives,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          console.warn("Firestore commission tracking failed:", err);
        }
      }

      // 4. Update sold count on event
      if (currentEvent.source === "zwapy") {
        try {
          await updateDoc(doc(db, "zwapy_events", currentEvent.id), {
            soldCount: (currentEvent.soldCount || 0) + 1
          });
        } catch {
          // Fallback update in zwapy_local_events
          const localEvents = JSON.parse(localStorage.getItem("zwapy_local_events") || "[]");
          const ev = localEvents.find(x => x.title === currentEvent.title);
          if (ev) {
            ev.soldCount = (ev.soldCount || 0) + 1;
            localStorage.setItem("zwapy_local_events", JSON.stringify(localEvents));
          }
        }
      } else if (currentEvent.source === "club" && currentEvent.clubId) {
        try {
          await updateDoc(doc(db, "clubs", currentEvent.clubId, "posts", currentEvent.id), {
            soldCount: (currentEvent.soldCount || 0) + 1
          });
        } catch {
          // Fallback update in zwapy_posts_{clubId}
          const localPosts = JSON.parse(localStorage.getItem(`zwapy_posts_${currentEvent.clubId}`) || "[]");
          const post = localPosts.find(x => x.title === currentEvent.title);
          if (post) {
            post.soldCount = (post.soldCount || 0) + 1;
            localStorage.setItem(`zwapy_posts_${currentEvent.clubId}`, JSON.stringify(localPosts));
          }
        }
      }

      // 5. Activity log
      try {
        await addDoc(collection(db, "users", currentUser.uid, "activity"), {
          title: `🎟️ Ticket: ${currentEvent.title}`,
          desc: `${priceInfo.free ? "Free ticket" : `₹${priceInfo.youPay} paid to ${currentEvent.organizer || "organizer"}`}${coinSliderVal > 0 ? ` · ${coinSliderVal} coins used` : ""}`,
          createdAt: serverTimestamp()
        });
      } catch { }

      setConfirmedTicketId(ticketId);
      setConfirmedQRUrl(qrUrl);

      // Refresh list
      await loadEventsAndTickets();
      setBookingStep(2);
      alert("🎉 Booking confirmed successfully!");
    } catch (err) {
      console.error(err);
      alert("❌ Booking failed: " + err.message);
    } finally {
      setProcessingBooking(false);
    }
  };

  // Filter events catalog
  const filteredEvents = allEvents.filter(ev => {
    let typeMatch = true;
    if (activeFilter === "free") {
      typeMatch = !ev.price || ev.price === 0;
    } else if (activeFilter !== "all") {
      typeMatch = ev.type === activeFilter;
    }

    const s = searchQ.toLowerCase().trim();
    const searchMatch =
      !s ||
      (ev.title || "").toLowerCase().includes(s) ||
      (ev.venue || "").toLowerCase().includes(s) ||
      (ev.organizer || "").toLowerCase().includes(s);

    return typeMatch && searchMatch;
  });

  if (loading || pageLoading) {
    return (
      <div id="loadScreen">
        <div className="ls-logo">ZWAPY</div>
        <div className="ls-bar"><div className="ls-fill" /></div>
        <div className="ls-text">Loading events...</div>
      </div>
    );
  }

  return (
    <div className="events-body">
      <div className="bg-glow" />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="layout">
        <header className="topbar">
          <button className="topbar-logo" style={{ background: "none", border: "none", cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
            <div className="logo-node">
              <img src="assets/zwapy-logo.png" style={{ width: "26px", height: "26px", objectFit: "contain" }} alt="" />
            </div>
            <span className="logo-text">ZWAPY</span>
          </button>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <div className="coins-display-badge">💰 {fmt(userCoins)}</div>
            <button className="back-btn" onClick={() => navigate("/dashboard")}>← Dashboard</button>
          </div>
        </header>

        <div className="page-head fade-up in">
          <div className="page-label">// Campus Events</div>
          <h1 className="page-title">Events <span>Portal</span></h1>
          <p className="page-sub">Events, hackathons and workshops from clubs across campus.</p>
        </div>

        <div className="coin-info fade-up in">
          💡 <strong>10 Skill Coins = 1% discount</strong> on ticket price · Max 500 coins = 50% off ·
          You pay the <strong>event organizer's UPI</strong> directly · Zwapy collects 5% from organizers monthly.
        </div>

        <div className="tab-row fade-up in">
          <button className={`tab-btn${activeTab === "browse" ? " active" : ""}`} onClick={() => setActiveTab("browse")}>🎪 Browse Events</button>
          <button className={`tab-btn${activeTab === "tickets" ? " active" : ""}`} onClick={() => setActiveTab("tickets")}>🎟️ My Tickets</button>
        </div>

        {/* Tab Browse */}
        {activeTab === "browse" && (
          <div className="tab-content active">
            <div className="filter-bar fade-up in">
              <div className="sw">
                <span className="si">🔍</span>
                <input
                  className="search-input"
                  placeholder="Search events..."
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                />
              </div>
              <div className="ftabs">
                <div className={`ftab${activeFilter === "all" ? " active" : ""}`} onClick={() => setActiveFilter("all")}>All</div>
                <div className={`ftab${activeFilter === "event" ? " active" : ""}`} onClick={() => setActiveFilter("event")}>Events</div>
                <div className={`ftab${activeFilter === "hackathon" ? " active" : ""}`} onClick={() => setActiveFilter("hackathon")}>Hackathons</div>
                <div className={`ftab${activeFilter === "free" ? " active" : ""}`} onClick={() => setActiveFilter("free")}>Free</div>
              </div>
            </div>

            <div className="events-grid fade-up in">
              {filteredEvents.length === 0 ? (
                <div className="empty-state">
                  <div className="ei">🎪</div>
                  <p className="et">No events found.</p>
                </div>
              ) : (
                filteredEvents.map(ev => {
                  const col = typeColor(ev.type);
                  const free = !ev.price || ev.price === 0;
                  const bought = myTickets.some(t => t.eventId === ev.id);
                  const soldOut = ev.totalSeats && (ev.soldCount || 0) >= ev.totalSeats;

                  let btnCls = "get-btn" + (free ? " free" : "");
                  let btnTxt = free ? "Free Ticket →" : "Get Ticket →";
                  if (bought) {
                    btnCls = "get-btn got";
                    btnTxt = "✓ Got Ticket";
                  } else if (soldOut) {
                    btnCls = "get-btn sold";
                    btnTxt = "Sold Out";
                  }

                  return (
                    <div key={ev.id} className="event-card">
                      {ev.posterUrl ? (
                        <img className="ev-poster" src={ev.posterUrl} loading="lazy" alt="" />
                      ) : (
                        <div className="ev-poster-ph" style={{ background: `linear-gradient(135deg, ${col}18, rgba(2,0,36,.8))` }}>
                          {typeEmoji(ev.type)}
                        </div>
                      )}
                      <div className="ev-body">
                        <div className="ev-top">
                          <span className="ev-pill" style={{ background: `${col}18`, border: `1px solid ${col}33`, color: col }}>
                            {ev.type || "event"}
                          </span>
                          {ev.totalSeats && !soldOut && (
                            <span style={{ fontSize: "0.58rem", color: "var(--muted)" }}>{ev.totalSeats - (ev.soldCount || 0)} left</span>
                          )}
                        </div>
                        <div className="ev-title">{ev.title}</div>
                        <div className="ev-org">🏛️ {ev.organizer || "Campus"}</div>
                        <div className="ev-meta">
                          {ev.date && <div className="emr">📅 {fmtDate(ev.date)}{ev.time ? ` · ${ev.time}` : ""}</div>}
                          {ev.venue && <div className="emr">📍 {ev.venue}</div>}
                          {ev.desc && (
                            <div className="emr" style={{ fontSize: "0.63rem" }}>
                              {ev.desc.substring(0, 70)}{ev.desc.length > 70 ? "..." : ""}
                            </div>
                          )}
                        </div>
                        <div className="ev-footer">
                          <div>
                            <div className={`ev-price ${free ? "free" : ""}`}>{free ? "FREE" : `₹${fmt(ev.price)}`}</div>
                            {!free ? (
                              <div className="ev-price-note">Pay organizer · 5% goes to Zwapy</div>
                            ) : (
                              <div className="ev-price-note">No charge</div>
                            )}
                          </div>
                          <button
                            className={btnCls}
                            disabled={bought || soldOut}
                            onClick={() => openBookingModal(ev)}
                          >
                            {btnTxt}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Tab My Tickets */}
        {activeTab === "tickets" && (
          <div className="tab-content active">
            <div id="ticketsList">
              {myTickets.length === 0 ? (
                <div className="empty-state">
                  <div className="ei">🎟️</div>
                  <p className="et">No tickets yet.</p>
                </div>
              ) : (
                myTickets.map(t => {
                  const col = typeColor(t.type);
                  // Generate checking QR code url dynamically
                  const qText = `ZWAPY:${t.ticketId}`;
                  const qUrl = `https://chart.googleapis.com/chart?cht=qr&chs=120x120&hl=en&chl=${encodeURIComponent(qText)}`;
                  return (
                    <div key={t.id} className="ticket-card">
                      <div className="tc-bar" style={{ background: `linear-gradient(90deg, ${col}, transparent)` }} />
                      <div className="tc-body">
                        <div className="tc-qr-wrap">
                          <img src={qUrl} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="Ticket QR" />
                        </div>
                        <div className="tc-info">
                          <div className="tc-title">{t.eventTitle}</div>
                          <div className="tc-meta">
                            {t.eventDate && <>📅 {fmtDate(t.eventDate)}<br /></>}
                            {t.eventVenue && <>📍 {t.eventVenue}<br /></>}
                            {t.coinsUsed > 0 && <>💰 {t.coinsUsed} coins </>}
                            {t.youPaid > 0 ? `· ₹${fmt(t.youPaid)} paid` : t.youPaid === 0 ? "· Free" : ""}
                          </div>
                          <div className="tc-id">{t.ticketId}</div>
                        </div>
                        <div className="tc-badge">✓ Valid</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <BottomNav />

      {/* TICKET BOOKING MODAL */}
      {modalOpen && currentEvent && (
        <div className="modal-bg open">
          <div className="modal">
            <div className="modal-stripe" style={{ height: "3px", background: "linear-gradient(90deg, var(--cyan), var(--green))" }} />
            <div className="modal-in">
              <button className="mc" onClick={() => setModalOpen(false)}>✕</button>

              {bookingStep === 1 ? (
                <div>
                  <div className="modal-tag">🎟️ Get Your Ticket</div>
                  <div className="modal-title">{currentEvent.title}</div>
                  <div className="modal-org">{currentEvent.organizer} {currentEvent.date && `· ${fmtDate(currentEvent.date)}`}</div>

                  {/* Price breakdown */}
                  <div className="price-box">
                    {priceInfo.free ? (
                      <>
                        <div className="pb-row"><span className="pb-label">Ticket Price</span><span className="pb-val pb-green">FREE</span></div>
                        <div className="pb-row"><span className="pb-label"><strong>You Pay</strong></span><span className="pb-val pb-green">₹0</span></div>
                      </>
                    ) : (
                      <>
                        <div className="pb-row"><span className="pb-label">Original Price</span><span className="pb-val">₹{fmt(currentEvent.price)}</span></div>
                        <div className="pb-row"><span className="pb-label">Coin Discount ({priceInfo.discPct.toFixed(0)}%)</span><span className="pb-val pb-green">−₹{fmt(priceInfo.discAmt)}</span></div>
                        <div className="pb-row"><span className="pb-label"><strong>You Pay Organizer</strong></span><span className="pb-val pb-white">₹{fmt(priceInfo.youPay)}</span></div>
                        <div className="pb-row" style={{ borderTop: "none", paddingTop: 4 }}>
                          <span className="pb-label pb-muted">Zwapy platform fee (5% from organizer)</span>
                          <span className="pb-val pb-muted">₹{fmt(priceInfo.zwapyCommission)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Coin Slider */}
                  {!priceInfo.free && (
                    <div className="slider-section">
                      <div className="sl-head">
                        Use Skill Coins for discount
                        <span className="sl-val">{coinSliderVal} coins = {priceInfo.discPct.toFixed(0)}% off</span>
                      </div>
                      <input
                        type="range"
                        className="coin-slider"
                        min="0"
                        max={Math.min(userCoins, MAX_COINS)}
                        step="10"
                        value={coinSliderVal}
                        onChange={e => setCoinSliderVal(parseInt(e.target.value))}
                      />
                      <div className="sl-range"><span>0</span><span>500 coins = 50% off</span></div>
                      <div className="your-bal">Your coins: <span>{fmt(userCoins)}</span> · After purchase: <span>{fmt(userCoins - coinSliderVal)}</span></div>
                    </div>
                  )}

                  {/* UPI QR Payment details */}
                  {!priceInfo.free && (
                    <div className="upi-box">
                      <div className="upi-header">💳 Pay Organizer via UPI</div>
                      <div className="upi-row">
                        <div className="upi-qr-el">
                          {currentEvent.upiId ? (
                            <img
                              src={`https://chart.googleapis.com/chart?cht=qr&chs=100x100&chl=${encodeURIComponent(
                                `upi://pay?pa=${currentEvent.upiId}&pn=${encodeURIComponent(currentEvent.organizer || "Org")}&am=${priceInfo.youPay}&cu=INR&tn=Ticket-${(currentEvent.title || "Event").substring(0, 18)}`
                              )}`}
                              style={{ width: "100%", height: "100%", borderRadius: 6 }}
                              alt="UPI QR Code"
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.6rem", color: "#666", textAlign: "center", padding: "4px" }}>UPI not set</div>
                          )}
                        </div>
                        <div className="upi-meta">
                          <div className="upi-id-text">{currentEvent.upiId || "UPI not set by organizer"}</div>
                          <div className="upi-name-text">{currentEvent.organizer}</div>
                          <div className="upi-pay-amount">Pay ₹{priceInfo.youPay}</div>
                        </div>
                      </div>
                      <div className="upi-note">Pay the organizer first via UPI, then click Confirm. Your ticket is generated instantly.</div>
                    </div>
                  )}

                  {!priceInfo.free && (
                    <div className="commission-notice">
                      <strong>ℹ️ Platform fee:</strong> Zwapy charges a 5% platform fee on paid events. The organizer settles this with Zwapy monthly. You pay the organizer's UPI directly.
                    </div>
                  )}

                  <button
                    className={`confirm-btn${priceInfo.free ? " free-btn" : ""}`}
                    disabled={processingBooking || (!priceInfo.free && !currentEvent.upiId)}
                    onClick={handleConfirmBooking}
                  >
                    {processingBooking ? "Processing..." : priceInfo.free ? "Get Free Ticket →" : "I've Paid — Confirm Ticket →"}
                  </button>
                </div>
              ) : (
                <div className="ticket-success">
                  <div className="ts-icon">🎉</div>
                  <div className="ts-title">You're In!</div>
                  <div className="ts-sub">Show this QR at the venue entrance. Also saved in My Tickets.</div>
                  <div className="ts-qr">
                    <img src={confirmedQRUrl} style={{ width: "100%", height: "100%", borderRadius: 8 }} alt="Ticket QR" />
                  </div>
                  <div className="ts-ev">{currentEvent.title}</div>
                  <div className="ts-meta">
                    {currentEvent.date && <>{fmtDate(currentEvent.date)}<br /></>}
                    {currentEvent.venue && <>{currentEvent.venue}<br /></>}
                    {coinSliderVal > 0 && <>{coinSliderVal} coins used<br /></>}
                    {priceInfo.youPay > 0 && <>₹{priceInfo.youPay} paid to organizer</>}
                  </div>
                  <div className="ts-id">{confirmedTicketId}</div>
                  <button
                    className="view-btn"
                    onClick={() => {
                      setModalOpen(false);
                      setActiveTab("tickets");
                    }}
                  >
                    View My Tickets →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
