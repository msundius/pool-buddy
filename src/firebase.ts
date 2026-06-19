import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0417068791",
  appId: "1:1055517737052:web:a04952f69a7197c172e699",
  apiKey: "AIzaSyATRKzTUwSJfs8sEKvxZ3HXzLMjDIAn_L8",
  authDomain: "gen-lang-client-0417068791.firebaseapp.com",
  storageBucket: "gen-lang-client-0417068791.firebasestorage.app",
  messagingSenderId: "1055517737052"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID from config
const db = getFirestore(app, "ai-studio-85f93c72-d72b-49a4-84fa-1006f4c369a0");

export { app, db };
