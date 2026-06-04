import { Link } from "react-router-dom";
import "./Terms.css";

export default function Terms() {
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
        <h1>Terms of Service</h1>
        <div className="last-updated">Last updated: March 2025 · Effective immediately</div>

        <div className="highlight">
          <p>By accessing or using Zwapy, you agree to be bound by these Terms of Service. Please read them carefully before using our Platform.</p>
        </div>

        <div className="section">
          <h2>1. Acceptance of Terms</h2>
          <p>These Terms of Service ("Terms") govern your access to and use of Zwapy ("Platform"), operated by the Zwapy Team ("we", "us", or "our"). By registering for an account or using the Platform, you agree to be legally bound by these Terms.</p>
          <p>If you are under 16 years of age, you may not use this Platform. By using Zwapy, you represent that you are at least 16 years old.</p>
        </div>

        <div className="section">
          <h2>2. Description of Service</h2>
          <p>Zwapy is a campus-based skill exchange and networking platform that allows students to:</p>
          <ul>
            <li>Create profiles showcasing their skills and interests</li>
            <li>Post and browse skill exchange requests with other students</li>
            <li>Join campus clubs and view club events and announcements</li>
            <li>Connect and network with other students on their campus</li>
          </ul>
          <p>Zwapy is currently operating in Phase 1 at Presidency University, Bangalore, India.</p>
        </div>

        <div className="section">
          <h2>3. Account Registration</h2>
          <p>To use Zwapy, you must create an account with accurate and complete information. You are responsible for:</p>
          <ul>
            <li>Maintaining the confidentiality of your account credentials</li>
            <li>All activity that occurs under your account</li>
            <li>Notifying us immediately of any unauthorized use of your account</li>
            <li>Ensuring your profile information remains accurate and up to date</li>
          </ul>
          <p>You may not create multiple accounts or share your account with others.</p>
        </div>

        <div className="section">
          <h2>4. Acceptable Use</h2>
          <p>You agree to use Zwapy only for lawful purposes and in accordance with these Terms. You must not:</p>
          <ul>
            <li>Post false, misleading, or fraudulent information in your profile or skill exchange requests</li>
            <li>Harass, threaten, or intimidate other users</li>
            <li>Share inappropriate, offensive, or unlawful content</li>
            <li>Attempt to gain unauthorized access to other users' accounts or platform systems</li>
            <li>Use the Platform for commercial solicitation without prior written consent from Zwapy</li>
            <li>Impersonate another person or misrepresent your university affiliation</li>
            <li>Collect or harvest personal information of other users without their consent</li>
            <li>Use automated tools, bots, or scripts to access or interact with the Platform</li>
          </ul>
        </div>

        <div className="section">
          <h2>5. Skill Exchanges and Interactions</h2>
          <p>Zwapy facilitates connections between students but is not responsible for the actual exchange of skills or services that take place between users. You acknowledge that:</p>
          <ul>
            <li>Zwapy does not guarantee the quality or outcome of any skill exchange</li>
            <li>All arrangements made through the Platform are solely between the participating students</li>
            <li>Zwapy is not liable for any disputes arising from skill exchanges between users</li>
            <li>Skill Coins are a platform feature and have no monetary value outside of Zwapy</li>
          </ul>
        </div>

        <div className="section">
          <h2>6. User Content</h2>
          <p>You retain ownership of content you post on Zwapy. By posting content, you grant Zwapy a non-exclusive, royalty-free license to use, display, and distribute your content on the Platform for the purpose of providing our services.</p>
          <p>You are solely responsible for the content you post. Zwapy reserves the right to remove any content that violates these Terms or is otherwise deemed inappropriate.</p>
        </div>

        <div className="section">
          <h2>7. Club Head Portal</h2>
          <p>Club heads who access the Club Head Portal must use it solely for managing their official campus club. Club heads agree to:</p>
          <ul>
            <li>Only post accurate and genuine information about their club's events and activities</li>
            <li>Not misuse the portal to post spam or unrelated content</li>
            <li>Maintain the invite code provided by Zwapy confidentially</li>
            <li>Represent their club in a professional manner at all times</li>
          </ul>
          <p>Zwapy reserves the right to revoke Club Head access at any time for violations of these Terms.</p>
        </div>

        <div className="section">
          <h2>8. Termination</h2>
          <p>We reserve the right to suspend or terminate your account at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties, or for any other reason.</p>
          <p>You may delete your account at any time by contacting us at zwapyteam@gmail.com.</p>
        </div>

        <div className="section">
          <h2>9. Disclaimers</h2>
          <p>Zwapy is provided "as is" without warranties of any kind. We do not guarantee that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. We are not responsible for any loss or damage resulting from your use of the Platform.</p>
        </div>

        <div className="section">
          <h2>10. Limitation of Liability</h2>
          <p>To the fullest extent permitted by law, Zwapy and its team shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the Platform, even if advised of the possibility of such damages.</p>
        </div>

        <div className="section">
          <h2>11. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts located in Bangalore, Karnataka, India.</p>
        </div>

        <div className="section">
          <h2>12. Changes to Terms</h2>
          <p>We may modify these Terms at any time. We will provide notice of significant changes by posting an updated version on the Platform. Your continued use of Zwapy after changes are posted constitutes your acceptance of the revised Terms.</p>
        </div>

        <div className="section">
          <h2>13. Contact</h2>
          <div className="contact-box">
            <p><strong style={{ color: "white" }}>Zwapy Team</strong></p>
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
