import { Link } from "react-router-dom";
import "./Privacy.css";

export default function Privacy() {
  return (
    <div className="legal-body">
      <div className="glow"></div>
      <div className="wrap">
        <Link to="/" className="logo">
          <img src="assets/zwapy-logo.png" style={{ width: "28px", height: "28px", objectFit: "contain" }} alt="" />
          <span>ZWAPY</span>
        </Link>
        <Link to="/" className="back">← Back to Home</Link>
        <div className="doc-label">Legal Document</div>
        <h1>Privacy Policy</h1>
        <div className="last-updated">Last updated: March 2025 · Effective immediately</div>

        <div className="section">
          <h2>1. Introduction</h2>
          <p>Zwapy ("we", "our", or "us") is a campus skill exchange and networking platform. This Privacy Policy explains how we collect, use, disclose, and protect information about you when you use our website at zwapy.com and related services (collectively, the "Platform").</p>
          <p>By creating an account or using Zwapy, you agree to the collection and use of information in accordance with this policy. If you do not agree, please do not use our Platform.</p>
        </div>

        <div className="section">
          <h2>2. Information We Collect</h2>
          <p><strong style={{ color: "white" }}>Information you provide directly:</strong></p>
          <ul>
            <li>Full name, email address, and password when you register</li>
            <li>University name, course, year of passout, and date of birth</li>
            <li>Phone number (collected but not verified via OTP in current version)</li>
            <li>Skills, bio, LinkedIn profile URL, and profile photo</li>
            <li>Content you post including skill exchange requests, messages, and activity</li>
          </ul>
          <p><strong style={{ color: "white" }}>Information collected automatically:</strong></p>
          <ul>
            <li>Log data including your IP address, browser type, and pages visited</li>
            <li>Device information including device type and operating system</li>
            <li>Firebase Analytics data including usage patterns and feature interactions</li>
          </ul>
        </div>

        <div className="section">
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account on the Platform</li>
            <li>Display your profile to other students for skill exchange and networking</li>
            <li>Connect you with students who have complementary skills</li>
            <li>Send platform announcements and important updates</li>
            <li>Improve and develop the Platform's features and functionality</li>
            <li>Prevent fraud, abuse, and ensure platform security</li>
            <li>Comply with legal obligations</li>
          </ul>
        </div>

        <div className="section">
          <h2>4. Information Sharing</h2>
          <p>We do not sell your personal information to third parties. We may share your information in the following limited circumstances:</p>
          <ul>
            <li><strong style={{ color: "white" }}>With other users:</strong> Your profile including name, skills, bio, university, and profile photo are visible to other registered students on the Platform as part of its core networking functionality.</li>
            <li><strong style={{ color: "white" }}>Service providers:</strong> We use Firebase (Google) for authentication, database, and storage. Google's privacy policy applies to data processed through Firebase.</li>
            <li><strong style={{ color: "white" }}>Legal requirements:</strong> We may disclose information if required by law or to protect our rights and the safety of users.</li>
          </ul>
        </div>

        <div className="section">
          <h2>5. Data Storage and Security</h2>
          <p>Your data is stored securely using Google Firebase's cloud infrastructure. We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          <p>However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.</p>
        </div>

        <div className="section">
          <h2>6. Your Rights</h2>
          <p>You have the following rights regarding your personal information:</p>
          <ul>
            <li><strong style={{ color: "white" }}>Access:</strong> Request a copy of the personal data we hold about you</li>
            <li><strong style={{ color: "white" }}>Correction:</strong> Update or correct inaccurate information through your profile settings</li>
            <li><strong style={{ color: "white" }}>Deletion:</strong> Request deletion of your account and associated data by contacting us</li>
            <li><strong style={{ color: "white" }}>Withdrawal:</strong> Withdraw consent for data processing at any time by deleting your account</li>
          </ul>
          <p>To exercise these rights, contact us at zwapyteam@gmail.com.</p>
        </div>

        <div className="section">
          <h2>7. Cookies and Tracking</h2>
          <p>Zwapy uses browser local storage to maintain your login session so you stay signed in between visits. We do not use advertising cookies or track you across other websites.</p>
          <p>Firebase Analytics may use anonymous identifiers to understand how users interact with the Platform. This data is aggregated and cannot be used to personally identify you.</p>
        </div>

        <div className="section">
          <h2>8. Children's Privacy</h2>
          <p>Zwapy is intended for users who are 16 years of age or older. We do not knowingly collect personal information from children under 16. If you believe a child under 16 has provided us with personal information, please contact us immediately and we will delete such information.</p>
        </div>

        <div className="section">
          <h2>9. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time. We will notify registered users of any significant changes by posting a notice on the Platform. Your continued use of Zwapy after changes are posted constitutes your acceptance of the updated policy.</p>
        </div>

        <div className="section">
          <h2>10. Contact Us</h2>
          <div className="contact-box">
            <p><strong style={{ color: "white" }}>Zwapy</strong></p>
            <p>Bangalore, Karnataka, India</p>
            <p>Email: zwapyteam@gmail.com</p>
            <p>Phone: +91 6362053192</p>
            <p>Website: https://zwapy.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
