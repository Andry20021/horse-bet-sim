// src/lib/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAKf1CaiSKoOdDYr_-2ju276xSdXnlyjgY",
  authDomain: "horsebetsim.firebaseapp.com",
  projectId: "horsebetsim",
  storageBucket: "horsebetsim.appspot.com",
  messagingSenderId: "909661961910",
  appId: "1:909661961910:web:YOUR_APP_ID" // Optional: Add from Firebase settings if needed
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Export Firebase Auth instance
export const auth = getAuth(app);

export const db = getFirestore(app); 