import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ExtraDetails from "./pages/ExtraDetails";
import ClubExtraDetails from "./pages/ClubExtraDetails";
import Dashboard from "./pages/Dashboard";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Network from "./pages/Network";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";

import SkillExchange from "./pages/SkillExchange";
import Events from "./pages/Events";
import Clubs from "./pages/Clubs";
import Exam from "./pages/Exam";

import Accounts from "./pages/Accounts";
import ChangePassword from "./pages/ChangePassword";
import ThankYou from "./pages/ThankYou";
import ClubDashboard from "./pages/ClubDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import CreagenixAdmin from "./pages/creagenix/AdminDashboard";
import Workshops from "./pages/creagenix/Workshops";
import MyWorkshops from "./pages/creagenix/MyWorkshops";
import AdminRegistrations from "./pages/creagenix/AdminRegistrations";

import CreagenixAdminPanel from "./pages/creagenix/AdminPanel";

import WorkshopRegistration from "./pages/WorkshopRegistration";
import EditXProgram from "./pages/creagenix/EditXProgram";
import Tracksheet from "./pages/creagenix/Tracksheet";
import Placements from "./pages/creagenix/Placements";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>

          {/* Public Routes */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />

          {/* User Setup */}
          <Route path="/extra-details" element={<ExtraDetails />} />
          <Route path="/club-extra-details" element={<ClubExtraDetails />} />

          {/* Main Dashboard */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/network" element={<Network />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/events" element={<Events />} />
          <Route path="/clubs" element={<Clubs />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/skill-exchange" element={<SkillExchange />} />
          <Route path="/exam" element={<Exam />} />

          {/* Account Pages */}
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/thank-you" element={<ThankYou />} />

          {/* Club & Admin */}
          <Route path="/club-dashboard" element={<ClubDashboard />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />

          {/* Creagenix */}
          <Route path="/creagenix/admin" element={<CreagenixAdmin />} />
          <Route path="/creagenix/workshops" element={<Workshops />} />
          <Route path="/creagenix/my-workshops" element={<MyWorkshops />} />
          <Route path="/creagenix/editx" element={<EditXProgram />} />
          <Route path="/creagenix/admin-registrations" element={<AdminRegistrations />} />
          <Route path="/creagenix/tracksheet/:registrationId" element={<Tracksheet />} />
          <Route path="/creagenix/admin" element={<CreagenixAdminPanel />} />
          <Route path="/creagenix/tracksheet/:registrationId" element={<Tracksheet />} />
          <Route path="/creagenix/placements" element={<Placements />} />

          

          {/* Workshop Registration */}
          <Route
            path="/workshop-register/:workshopId/:workshopTitle"
            element={<WorkshopRegistration />}
          />

          {/* 404 Redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;