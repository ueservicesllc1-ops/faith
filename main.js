import { db, auth } from './firebase.js';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";

const LANGUAGE_STORAGE_KEY = 'faithlife-language';
const i18n = {
    es: {
        pageLang: 'es',
        nav: { home: 'Inicio', services: 'Servicios', about: 'Nosotros', gallery: 'Galeria', login: 'Acceder', appointment: 'Solicitar Cita' },
        hero: {
            title: 'Limpieza Profesional en <span class="accent">Cada Rincon</span>',
            subtitle: 'Deja tu hogar o negocio en manos expertas y disfruta espacios realmente impecables.',
            viewServices: 'Ver Servicios',
            contact: 'Contactanos'
        },
        stats: { years: 'Anos de Experiencia', clients: 'Clientes Felices', guarantee: 'Garantia de Brillo' },
        services: {
            title: 'Servicios Especializados',
            subtitle: 'Ofrecemos soluciones integrales de limpieza adaptadas a cada necesidad.',
            residential: { title: 'Limpieza Residencial', desc: 'Planes personalizados para mantener tu hogar siempre impecable y libre de alergenos.' },
            commercial: { title: 'Limpieza Comercial', desc: 'Mantenimiento especializado para oficinas y locales comerciales que proyectan profesionalismo.' },
            deep: { desc: 'Servicios de limpieza profunda para mudanzas (move in/out) o renovaciones estacionales.' }
        },
        about: {
            title: 'Comprometidos con la Perfeccion',
            desc: 'En Faithlife Cleaning Services, no solo limpiamos superficies; creamos ambientes donde la vida y el trabajo fluyen con armonia.',
            feature1: 'Personal calificado y confiable',
            feature2: 'Productos eco-friendly de alta gama',
            feature3: 'Flexibilidad total de horarios',
            more: 'Conocenos mas'
        },
        gallery: { title: 'Galeria de Excelencia', subtitle: 'Una muestra de la transformacion que Faithlife lleva a cada rincon.', viewAll: 'Ver Galeria Completa' },
        contact: { title: 'Listo para ver tu espacio brillar?', subtitle: 'Dejanos tus datos y nos pondremos en contacto contigo en menos de 24 horas.' },
        form: {
            name: 'Nombre', email: 'Email', service: 'Servicio', message: 'Mensaje',
            namePlaceholder: 'Tu nombre', emailPlaceholder: 'tu@email.com', messagePlaceholder: 'Cuentanos un poco mas sobre lo que necesitas...',
            selectService: 'Selecciona un servicio', serviceResidential: 'Limpieza Residencial', serviceCommercial: 'Limpieza Comercial',
            submit: 'Solicitar Informacion', sending: 'Enviando...', sendError: 'Error al enviar'
        },
        footer: {
            brandDesc: 'Servicios de limpieza premium con fe en la excelencia.', links: 'Enlaces', legal: 'Legal',
            privacy: 'Privacidad', terms: 'Terminos',
            copy: '&copy; 2026 Faithlife Cleaning Services. Desarrollado por Freedom Labs.'
        },
        logoutTitle: 'Cerrar Sesion',
        switchTitle: 'Cambiar idioma'
    },
    en: {
        pageLang: 'en',
        nav: { home: 'Home', services: 'Services', about: 'About', gallery: 'Gallery', login: 'Login', appointment: 'Book Appointment' },
        hero: {
            title: 'Professional Cleaning in <span class="accent">Every Corner</span>',
            subtitle: 'Leave your home or business in expert hands and enjoy truly spotless spaces.',
            viewServices: 'View Services',
            contact: 'Contact Us'
        },
        stats: { years: 'Years of Experience', clients: 'Happy Clients', guarantee: 'Shine Guarantee' },
        services: {
            title: 'Specialized Services',
            subtitle: 'We provide complete cleaning solutions tailored to every need.',
            residential: { title: 'Residential Cleaning', desc: 'Personalized plans to keep your home spotless and allergen-free.' },
            commercial: { title: 'Commercial Cleaning', desc: 'Specialized maintenance for offices and commercial spaces that project professionalism.' },
            deep: { desc: 'Deep cleaning services for move in/out and seasonal renewals.' }
        },
        about: {
            title: 'Committed to Perfection',
            desc: 'At Faithlife Cleaning Services, we do more than clean surfaces; we create spaces where life and work flow in harmony.',
            feature1: 'Qualified and trustworthy staff',
            feature2: 'High-end eco-friendly products',
            feature3: 'Total schedule flexibility',
            more: 'Learn More'
        },
        gallery: { title: 'Excellence Gallery', subtitle: 'A glimpse of the transformation Faithlife brings to every corner.', viewAll: 'View Full Gallery' },
        contact: { title: 'Ready to make your space shine?', subtitle: 'Leave your information and we will contact you within 24 hours.' },
        form: {
            name: 'Name', email: 'Email', service: 'Service', message: 'Message',
            namePlaceholder: 'Your name', emailPlaceholder: 'you@email.com', messagePlaceholder: 'Tell us a bit more about what you need...',
            selectService: 'Select a service', serviceResidential: 'Residential Cleaning', serviceCommercial: 'Commercial Cleaning',
            submit: 'Request Information', sending: 'Sending...', sendError: 'Error sending'
        },
        footer: {
            brandDesc: 'Premium cleaning services with faith in excellence.', links: 'Links', legal: 'Legal',
            privacy: 'Privacy', terms: 'Terms',
            copy: '&copy; 2026 Faithlife Cleaning Services. Developed by Freedom Labs.'
        },
        logoutTitle: 'Sign Out',
        switchTitle: 'Switch language'
    }
};

const getTranslation = (lang, key) => key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), i18n[lang]);
const getCurrentLanguage = () => localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'es';
let currentLanguage = getCurrentLanguage();

const applyTranslations = (lang) => {
    currentLanguage = i18n[lang] ? lang : 'es';
    localStorage.setItem(LANGUAGE_STORAGE_KEY, currentLanguage);
    document.documentElement.lang = i18n[currentLanguage].pageLang;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
        const value = getTranslation(currentLanguage, el.dataset.i18n);
        if (value) el.textContent = value;
    });
    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
        const value = getTranslation(currentLanguage, el.dataset.i18nHtml);
        if (value) el.innerHTML = value;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
        const value = getTranslation(currentLanguage, el.dataset.i18nPlaceholder);
        if (value) el.setAttribute('placeholder', value);
    });

    const switchBtn = document.getElementById('lang-switch');
    if (switchBtn) {
        switchBtn.classList.toggle('is-en', currentLanguage === 'en');
        switchBtn.title = i18n[currentLanguage].switchTitle;
        switchBtn.setAttribute('aria-label', i18n[currentLanguage].switchTitle);
    }

    const logoutBtn = document.getElementById('logout-btn-nav');
    if (logoutBtn) logoutBtn.title = i18n[currentLanguage].logoutTitle;
};

const languageSwitchBtn = document.getElementById('lang-switch');
if (languageSwitchBtn) {
    languageSwitchBtn.addEventListener('click', () => {
        applyTranslations(currentLanguage === 'es' ? 'en' : 'es');
    });
}

applyTranslations(currentLanguage);

// Show logged-in user in navbar
onAuthStateChanged(auth, (user) => {
    const badge = document.getElementById('user-badge');
    const photo = document.getElementById('user-photo');
    const nameEl = document.getElementById('user-name');
    const navLoginBtn = document.querySelector('.nav-login');
    
    if (user && badge) {
        nameEl.innerText = user.displayName || user.email.split('@')[0];
        photo.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email) + '&background=1b3b5f&color=fff';
        badge.style.display = 'flex';
        if (navLoginBtn) navLoginBtn.style.display = 'none'; // Hide login button
        
        // Setup logout button
        const logoutBtn = document.getElementById('logout-btn-nav');
        if (logoutBtn) {
            logoutBtn.onclick = () => {
                signOut(auth).then(() => {
                    window.location.reload();
                });
            };
        }
    } else if (badge) {
        badge.style.display = 'none';
        if (navLoginBtn) navLoginBtn.style.display = 'inline-block';
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

        btn.innerHTML = `<i class="ph ph-circle-notch ph-spin"></i> ${i18n[currentLanguage].form.sending}`;
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
            btn.innerHTML = `<i class="ph ph-warning"></i> ${i18n[currentLanguage].form.sendError}`;
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
