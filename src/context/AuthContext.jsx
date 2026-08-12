import React, { createContext, useContext, useState, useEffect } from "react";
import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { auth, googleProvider } from "../config/firebase.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customDisplayName, setCustomDisplayName] = useState(() => {
    return localStorage.getItem("chatgemma_custom_name") || "";
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      return res.user;
    } catch (err) {
      console.error("Google Sign-In Error:", err);
      throw err;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign Out Error:", err);
    }
  };

  const updateDisplayName = (name) => {
    setCustomDisplayName(name);
    if (name) {
      localStorage.setItem("chatgemma_custom_name", name);
    } else {
      localStorage.removeItem("chatgemma_custom_name");
    }
  };

  const effectiveDisplayName =
    customDisplayName.trim() || user?.displayName || "User";

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        displayName: effectiveDisplayName,
        customDisplayName,
        updateDisplayName,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
