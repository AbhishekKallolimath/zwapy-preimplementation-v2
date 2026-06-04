import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const AuthContext = createContext(null);

const checkDevMode = () => {
  if (typeof window === "undefined") return false;
  return (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.") ||
    window.location.search.includes("dev") ||
    window.location.search.includes("mock") ||
    (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV)
  );
};

const PREMIUM_UNIVERSITIES = [
  {
    name: "Presidency University",
    domains: ["presidencyuniversity.in", "presidency.edu.in", "presidency.ac.in"],
    isPremium: true
  },
  {
    name: "REVA University",
    domains: ["reva.edu.in", "revauniversity.in"],
    isPremium: true
  },
  {
    name: "Christ University",
    domains: ["christuniversity.in", "christ.edu"],
    isPremium: true
  }
];

export function resolvePortal(ud) {
  if (!ud) return "public";
  const rawEmail = (ud.universityEmail || "").toLowerCase().trim();
  const uniName = (ud.university || "").toLowerCase().trim();
  const atIdx = rawEmail.lastIndexOf("@");
  const domain = atIdx >= 0 ? rawEmail.slice(atIdx + 1) : "";

  let matchedUni = null;
  PREMIUM_UNIVERSITIES.forEach((uni) => {
    const emailMatch = domain && uni.domains.some((d) => domain === d || domain.endsWith("." + d));
    const nameMatch = uniName === uni.name.toLowerCase() || uniName.startsWith(uni.name.toLowerCase());
    if (emailMatch || nameMatch) {
      matchedUni = uni;
    }
  });

  return matchedUni && matchedUni.isPremium ? "premium" : "public";
}

export function isSameUniversity(userUni, clubUni) {
  if (!userUni || !clubUni) return false;
  const u = userUni.toLowerCase().replace(/[^a-z0-9]/g, "");
  const c = clubUni.toLowerCase().replace(/[^a-z0-9]/g, "");
  return u.includes(c) || c.includes(u);
}

// Seed mock database offline tables into localStorage
export function seedDemoDatabase() {
  if (!checkDevMode()) return;

  // 1. Seed Mock Users
  if (!localStorage.getItem("zwapy_local_users")) {
    const demoUsers = {
      "mock_club_head_uid": {
        uid: "mock_club_head_uid",
        name: "Club Head (Dev Mode)",
        email: "media.club@presidency.edu.in",
        universityEmail: "media.club@presidency.edu.in",
        university: "Presidency University",
        clubName: "Creagenix Media Club",
        role: "club_head",
        profileVersion: 3,
        coins: 1000,
        exchanges: 15,
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=clubhead"
      },
      "MsCKd4jawaahdCaAGNN1LnticUE2_mock": {
        uid: "MsCKd4jawaahdCaAGNN1LnticUE2_mock",
        name: "Developer Intern (Dev Mode)",
        email: "intern.developer@presidency.edu.in",
        universityEmail: "intern.developer@presidency.edu.in",
        university: "Presidency University",
        course: "Computer Science",
        role: "student",
        profileVersion: 3,
        coins: 450,
        exchanges: 4,
        skillsKnown: [
          { name: "Python", level: "Beginner" },
          { name: "JavaScript", level: "Intermediate" }
        ],
        skillsLearn: ["UI Design", "Video Editing"],
        referralCode: "DEVINTERN",
        joinedEvents: [],
        skillExchangeCounts: { javascript: 4, python: 2 },
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=devintern"
      },
      "MsCKd4jawaahdCaAGNN1LnticUE2": {
        uid: "MsCKd4jawaahdCaAGNN1LnticUE2",
        name: "Super Admin (Dev Mode)",
        email: "admin@presidency.edu.in",
        universityEmail: "admin@presidency.edu.in",
        university: "Presidency University",
        role: "super_admin",
        profileVersion: 3,
        coins: 9999,
        exchanges: 99,
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=superadmin"
      },
      "mock-uid-studentrevaeduin": {
        uid: "mock-uid-studentrevaeduin",
        name: "Aman Sen",
        email: "student@reva.edu.in",
        universityEmail: "student@reva.edu.in",
        university: "REVA University",
        course: "Mechanical Engineering",
        role: "student",
        profileVersion: 3,
        coins: 120,
        exchanges: 1,
        skillsKnown: [{ name: "CAD Modelling", level: "Intermediate" }],
        skillsLearn: ["3D Printing"],
        referralCode: "REVAAMIS",
        joinedEvents: [],
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=amansen"
      },
      "mock-uid-allanpresidencyuniversityin": {
        uid: "mock-uid-allanpresidencyuniversityin",
        name: "Allan Joseph",
        email: "allan@presidencyuniversity.in",
        universityEmail: "allan@presidencyuniversity.in",
        university: "Presidency University",
        course: "Data Science",
        role: "student",
        profileVersion: 3,
        coins: 300,
        exchanges: 3,
        skillsKnown: [{ name: "Machine Learning", level: "Expert" }],
        skillsLearn: ["Web Development"],
        referralCode: "ALLANDATS",
        joinedEvents: [],
        photoURL: "https://api.dicebear.com/7.x/avataaars/svg?seed=allanjoseph"
      }
    };
    localStorage.setItem("zwapy_local_users", JSON.stringify(demoUsers));
  }

  // 2. Seed Mock Clubs
  if (!localStorage.getItem("zwapy_local_clubs")) {
    const demoClubs = {
      "mock-club-1": {
        name: "Presidency Coding Club",
        university: "Presidency University",
        description: "The official coding and algorithm community at Presidency University.",
        members: ["MsCKd4jawaahdCaAGNN1LnticUE2_mock", "mock-uid-allanpresidencyuniversityin"]
      },
      "mock-club-2": {
        name: "REVA AI Association",
        university: "REVA University",
        description: "Pioneering AI research and project-building at REVA University.",
        members: ["mock-uid-studentrevaeduin"]
      },
      "mock_club_head_uid": {
        name: "Creagenix Media Club",
        university: "Presidency University",
        description: "The premier design, photography, and videography circle at Presidency.",
        members: []
      }
    };
    localStorage.setItem("zwapy_local_clubs", JSON.stringify(demoClubs));
  }

  // 3. Seed Mock Club Posts
  if (!localStorage.getItem("zwapy_posts_mock-club-1")) {
    const demoPostsPresidency = [
      {
        id: "mock-post-1",
        title: "Presidency Hack-a-Thon 2026",
        type: "hackathon",
        price: 150,
        date: "2026-06-15",
        time: "10:00 AM",
        venue: "Presidency Audi-1",
        upiId: "prescodingclub@upi",
        desc: "Compete for top honors and cool prizes! Build outstanding projects in 24 hours.",
        createdAt: new Date().toISOString()
      },
      {
        id: "mock-post-2",
        title: "Web3 & Smart Contracts",
        type: "workshop",
        price: 50,
        date: "2026-06-20",
        time: "02:00 PM",
        venue: "Lab 3",
        upiId: "prescodingclub@upi",
        desc: "Learn Solidity and deploy your very first smart contract.",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("zwapy_posts_mock-club-1", JSON.stringify(demoPostsPresidency));
  }

  if (!localStorage.getItem("zwapy_posts_mock-club-2")) {
    const demoPostsReva = [
      {
        id: "mock-post-3",
        title: "REVA AI Innovate Hack",
        type: "hackathon",
        price: 200,
        date: "2026-06-18",
        time: "09:00 AM",
        venue: "REVA Seminar Hall",
        upiId: "revaaiassoc@upi",
        desc: "Build innovative AI agents using modern LLM frameworks.",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("zwapy_posts_mock-club-2", JSON.stringify(demoPostsReva));
  }

  // 4. Seed Mock Events
  if (!localStorage.getItem("zwapy_local_events")) {
    const demoEvents = [
      {
        title: "Zwapy Global Inter-College Summit",
        type: "event",
        price: 0,
        date: "2026-06-25",
        time: "11:00 AM",
        venue: "Bangalore Innovation Center (Global)",
        desc: "Join students from Presidency, REVA, Christ, and other universities at the grand Zwapy yearly meet!",
        createdAt: new Date().toISOString()
      },
      {
        title: "Zwapy P2P Skills Kickoff",
        type: "workshop",
        price: 0,
        date: "2026-06-05",
        time: "04:00 PM",
        venue: "Online (Global Zoom)",
        desc: "Unlock the secrets of skill exchange liquidity on the Zwapy network.",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("zwapy_local_events", JSON.stringify(demoEvents));
  }

  // 5. Seed Mock Exchanges
  if (!localStorage.getItem("zwapy_local_exchanges")) {
    const demoExchanges = [
      {
        id: "ex-1",
        name: "Allan Joseph",
        offer: "Machine Learning basics",
        need: "React Native UI details",
        level: "Expert",
        duration: "3 weeks",
        createdAt: new Date().toISOString()
      },
      {
        id: "ex-2",
        name: "Aman Sen",
        offer: "SolidWorks CAD Modelling",
        need: "Python Scripting for calculations",
        level: "Intermediate",
        duration: "1 week",
        createdAt: new Date().toISOString()
      }
    ];
    localStorage.setItem("zwapy_local_exchanges", JSON.stringify(demoExchanges));
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portal, setPortal] = useState("public");

  // Run database seeding on start
  useEffect(() => {
    seedDemoDatabase();
  }, []);

  useEffect(() => {
    // 1. Check persistent mock session first (Dev Mode bypass)
    const mockUserStr = localStorage.getItem("zwapy_mock_user");
    if (mockUserStr) {
      try {
        const mockUser = JSON.parse(mockUserStr);
        setCurrentUser(mockUser);
        
        // Load custom offline user profile
        const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
        const ud = localUsers[mockUser.uid] || {
          name: mockUser.displayName || "Mock User",
          email: mockUser.email,
          role: "student",
          profileVersion: 3
        };
        setUserData(ud);
        setPortal(resolvePortal(ud));
        setLoading(false);
        return; // Skip normal firebase check since mock session overrides
      } catch (err) {
        console.error("Failed to parse mock user, reverting to Firebase Auth", err);
        localStorage.removeItem("zwapy_mock_user");
      }
    }

    // 2. Normal Firebase Authentication checker
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        try {
          const snap = await getDoc(doc(db, "users", user.uid));
          if (snap.exists()) {
            const ud = snap.data();
            setUserData(ud);
            setPortal(resolvePortal(ud));
          } else {
            // Local user check fallback for when firestore is restricted
            const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
            if (localUsers[user.uid]) {
              const ud = localUsers[user.uid];
              setUserData(ud);
              setPortal(resolvePortal(ud));
            } else {
              setUserData(null);
              setPortal("public");
            }
          }
        } catch (e) {
          console.warn("Firestore fetch failed, checking offline users:", e);
          const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
          if (localUsers[user.uid]) {
            const ud = localUsers[user.uid];
            setUserData(ud);
            setPortal(resolvePortal(ud));
          } else {
            setUserData(null);
            setPortal("public");
          }
        }
      } else {
        setCurrentUser(null);
        setUserData(null);
        setPortal("public");
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    localStorage.removeItem("zwapy_mock_user");
    setCurrentUser(null);
    setUserData(null);
    setPortal("public");
    await signOut(auth);
  };

  const refreshUserData = async () => {
    if (!currentUser) return null;
    
    // Check mock offline user first
    if (currentUser.uid.includes("mock") || localStorage.getItem("zwapy_mock_user")) {
      const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
      if (localUsers[currentUser.uid]) {
        const ud = localUsers[currentUser.uid];
        setUserData(ud);
        setPortal(resolvePortal(ud));
        return ud;
      }
    }

    try {
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        const ud = snap.data();
        setUserData(ud);
        setPortal(resolvePortal(ud));
        return ud;
      }
    } catch (e) {
      console.warn("Firestore user refresh failed, reading offline:", e);
      const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
      if (localUsers[currentUser.uid]) {
        const ud = localUsers[currentUser.uid];
        setUserData(ud);
        setPortal(resolvePortal(ud));
        return ud;
      }
    }
    return null;
  };

  const devLoginAsMock = (role = "student") => {
    if (!checkDevMode()) return;

    let mockUser;
    let mockProfile;

    if (role === "club_head") {
      mockUser = { uid: "mock_club_head_uid", email: "media.club@presidency.edu.in", displayName: "Creagenix Media Club" };
    } else if (role === "super_admin") {
      mockUser = { uid: "MsCKd4jawaahdCaAGNN1LnticUE2", email: "admin@presidency.edu.in", displayName: "Super Admin" };
    } else if (role === "reva_student") {
      mockUser = { uid: "mock-uid-studentrevaeduin", email: "student@reva.edu.in", displayName: "Aman Sen" };
    } else {
      mockUser = { uid: "MsCKd4jawaahdCaAGNN1LnticUE2_mock", email: "intern.developer@presidency.edu.in", displayName: "Developer Intern" };
    }

    const localUsers = JSON.parse(localStorage.getItem("zwapy_local_users") || "{}");
    mockProfile = localUsers[mockUser.uid];

    localStorage.setItem("zwapy_mock_user", JSON.stringify(mockUser));
    setCurrentUser(mockUser);
    setUserData(mockProfile);
    setPortal(resolvePortal(mockProfile));
  };

  const value = {
    currentUser,
    userData,
    loading,
    portal,
    logout,
    refreshUserData,
    devLoginAsMock
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
