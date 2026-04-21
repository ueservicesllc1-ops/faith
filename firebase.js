import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCo6CsB9_I_Bxlp4VXDchU-ft0X6q3otRk",
  authDomain: "faith-59ba8.firebaseapp.com",
  projectId: "faith-59ba8",
  storageBucket: "faith-59ba8.firebasestorage.app",
  messagingSenderId: "670282072464",
  appId: "1:670282072464:web:403b5bb6225d8aae20b315"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { db, auth, googleProvider };

