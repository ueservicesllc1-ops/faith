import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

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

