/**
 * Firestore Service for Cloud Sync of user state.
 */

import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../config/firebase.js";

export class CloudSyncService {
  /**
   * Save user data to Firestore under users/{userId}
   */
  static async saveUserData(userId, data) {
    if (!userId) return false;
    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        synapseData: data,
        lastUpdated: new Date().toISOString(),
      }, { merge: true });
      return true;
    } catch (err) {
      console.warn("Cloud sync save error:", err);
      return false;
    }
  }

  /**
   * Load user data from Firestore
   */
  static async loadUserData(userId) {
    if (!userId) return null;
    try {
      const userDocRef = doc(db, "users", userId);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const docData = snap.data();
        return docData.synapseData || null;
      }
    } catch (err) {
      console.warn("Cloud sync load error:", err);
    }
    return null;
  }
}
