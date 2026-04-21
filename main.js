import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

// Show logged-in user in navbar
onAuthStateChanged(auth, (user) => {
    const badge = document.getElementById('user-badge');
    const photo = document.getElementById('user-photo');
    const nameEl = document.getElementById('user-name');
    if (user && badge) {
        nameEl.innerText = user.displayName || user.email.split('@')[0];
        photo.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=1b3b5f&color=fff';
        badge.style.display = 'flex';
    }
});


// Mobile Menu Toggle
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const navLinks = document.querySelector('.nav-links');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        const icon = mobileMenuBtn.querySelector('i');
        if (navLinks.classList.contains('active')) {
            icon.classList.replace('ph-list', 'ph-x');
        } else {
            icon.classList.replace('ph-x', 'ph-list');
        }
    });
}

// Navbar Scroll Effect
const navbar = document.querySelector('.navbar');
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.style.height = '70px';
        navbar.style.background = '#14345C';
        navbar.style.boxShadow = '0 5px 20px rgba(0,0,0,0.2)';
    } else {
        navbar.style.height = '90px';
        navbar.style.background = '#14345C';
        navbar.style.boxShadow = 'none';
    }

});

// Smooth Scroll for local links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            window.scrollTo({
                top: target.offsetTop - 70,
                behavior: 'smooth'
            });
            // Close mobile menu if open
            if (navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
                mobileMenuBtn.querySelector('i').classList.replace('ph-x', 'ph-list');
            }
        }
    });
});


// Simple Form Submission with Firebase
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = contactForm.querySelector('button');
        const originalText = btn.innerHTML;
        
        // Get form data
        const formData = {
            nombre: contactForm.querySelector('input[type="text"]').value,
            email: contactForm.querySelector('input[type="email"]').value,
            servicio: contactForm.querySelector('select').value,
            mensaje: contactForm.querySelector('textarea').value,
            createdAt: serverTimestamp()
        };

        btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Enviando...';
        btn.style.opacity = '0.7';
        btn.disabled = true;
        
        try {
            // Save to Firestore
            await addDoc(collection(db, "solicitudes"), formData);
            
            // Show Success Modal
            const successModal = document.getElementById('success-modal');
            const closeModal = document.getElementById('close-modal');
            
            if (successModal) {
                successModal.classList.add('active');
                
                closeModal.addEventListener('click', () => {
                    successModal.classList.remove('active');
                });
                
                // Also close on background click
                successModal.addEventListener('click', (e) => {
                    if (e.target === successModal) {
                        successModal.classList.remove('active');
                    }
                });
            }

            btn.innerHTML = originalText;
            btn.style.opacity = '1';
            btn.disabled = false;
            contactForm.reset();
            
        } catch (error) {

            console.error("Error al enviar:", error);
            btn.innerHTML = '<i class="ph ph-warning"></i> Error al enviar';
            btn.style.background = '#f44336';
            btn.style.color = 'white';
            
            setTimeout(() => {
                btn.innerHTML = originalText;
                btn.style.background = '';
                btn.style.color = '';
                btn.style.opacity = '1';
                btn.disabled = false;
            }, 3000);
        }
    });
}


// Reveal animations on scroll
const observerOptions = {
    threshold: 0.1
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card, .about-content, .contact-card').forEach(el => {
    el.classList.add('reveal');
    observer.observe(el);
});
