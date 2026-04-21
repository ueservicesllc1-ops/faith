import { auth, googleProvider, db } from './firebase.js';
import { signInWithEmailAndPassword, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

const loginForm = document.getElementById('login-form');
const googleBtn = document.getElementById('google-login');
const errorMsg = document.getElementById('login-error');

// Redirect if already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'index.html';
    }
});

// Helper to save user to Firestore
const saveUserToFirestore = async (user) => {
    const userRef = doc(db, 'usuarios', user.uid);
    await setDoc(userRef, {
        nombre: user.displayName || user.email.split('@')[0],
        email: user.email,
        foto: user.photoURL || '',
        rol: 'Cliente', // Default role is now client
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp()
    }, { merge: true });
};

// Email/Password Login
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        errorMsg.innerText = '';
        
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await saveUserToFirestore(result.user);
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            errorMsg.innerText = 'Email o contraseña incorrectos.';
        }
    });
}

// Google Login
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        errorMsg.innerText = '';
        try {
            const result = await signInWithPopup(auth, googleProvider);
            await saveUserToFirestore(result.user);
            window.location.href = 'index.html';
        } catch (error) {
            console.error(error);
            errorMsg.innerText = 'Error al acceder con Google.';
        }
    });

