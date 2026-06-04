import { auth, provider } from './firebase.js';
import { signInWithEmailAndPassword, signInWithPopup } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";

window.addEventListener("DOMContentLoaded", () => {
  const emailLoginBtn = document.getElementById("email-login");
  const googleLoginBtn = document.getElementById("google-login");

  emailLoginBtn.addEventListener("click", () => {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    signInWithEmailAndPassword(auth, email, password)
      .then((userCredential) => {
        alert("✅ Logged in as " + userCredential.user.email);
        window.location.href = "/dashboard.html"; // or dynamically set
      })
      .catch((error) => {
        alert("❌ " + error.message);
      });
  });

  googleLoginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then((result) => {
        alert("✅ Logged in as " + result.user.displayName);
        window.location.href = "/dashboard.html"; // or university one
      })
      .catch((error) => {
        alert("❌ " + error.message);
      });
  });
});
