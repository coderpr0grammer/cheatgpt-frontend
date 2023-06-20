// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from 'firebase/firestore'
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDNRV4orlsnQurg7viyA03LtrfT8NEsmxc",
  authDomain: "cheatgpt-extesnion.firebaseapp.com",
  projectId: "cheatgpt-extesnion",
  storageBucket: "cheatgpt-extesnion.appspot.com",
  messagingSenderId: "1026525039448",
  appId: "1:1026525039448:web:1140f5b73f11e9b1fdf32d",
  measurementId: "G-C6CER09F8C"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const db = getFirestore(app);