// src/firebase.js — Zwapy central Firebase configuration

import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBazCIc5vdQInSwvqvohIcbPToTjnw7KJI",
  authDomain: "zwapy-25.firebaseapp.com",
  projectId: "zwapy-25",
  storageBucket: "zwapy-25.firebasestorage.app",
  messagingSenderId: "30612332450",
  appId: "1:30612332450:web:9e23f36a69f89dbb325cfb",
  measurementId: "G-THCGY8NH1Z"
};

const app = initializeApp(firebaseConfig);

// Authentication
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// Firestore Database
export const db = getFirestore(app);

// Firebase Storage
export const storage = getStorage(app);

// Analytics (disabled on localhost)
export const analytics = (() => {
  if (typeof window === "undefined") return null;

  const isLocalhost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname.startsWith("192.168.");

  if (isLocalhost) return null;

  import("firebase/analytics")
    .then(({ getAnalytics }) => getAnalytics(app))
    .catch(console.error);

  return null;
})();

export default app;