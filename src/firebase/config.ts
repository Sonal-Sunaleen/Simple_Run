import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyAbTF56zA6-A9bkXB1HntGv9ASTS3kUmuI",
  authDomain: "our-simple-run.firebaseapp.com",
  projectId: "our-simple-run",
  storageBucket: "our-simple-run.firebasestorage.app",
  messagingSenderId: "103179978738",
  appId: "1:103179978738:web:608d1eb11fa6ca3d738d6b",
  measurementId: "G-X265K8JSPN"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
