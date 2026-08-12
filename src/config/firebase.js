import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";

// Web app's Firebase configuration provided by user
const firebaseConfig = {
  apiKey: "AIzaSyDeJDirad72q-7wOdIN6PF-IRYclwc9yzM",
  authDomain: "kindsynapse-c5938.firebaseapp.com",
  projectId: "kindsynapse-c5938",
  storageBucket: "kindsynapse-c5938.firebasestorage.app",
  messagingSenderId: "455194257592",
  appId: "1:455194257592:web:c5ac87291540071b82ac4d",
  measurementId: "G-7X57L81ZMX"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export const db = getFirestore(app);

export let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((yes) => {
    if (yes) analytics = getAnalytics(app);
  });
}

export default app;
