import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

const dashPhoto = document.getElementById('dash-photo');
const dashName = document.getElementById('dash-name');
const dashEmail = document.getElementById('dash-email');
const dashRole = document.getElementById('dash-role');
const citasList = document.getElementById('citas-list');

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
        return;
    }

    // Populate user basic info
    const displayName = user.displayName || user.email.split('@')[0];
    dashName.innerText = displayName;
    dashEmail.innerText = user.email;
    dashPhoto.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(displayName) + '&background=1b3b5f&color=fff&size=120';

    // Fetch user role from 'usuarios' collection
    try {
        const userDoc = await getDoc(doc(db, 'usuarios', user.uid));
        if (userDoc.exists() && userDoc.data().rol) {
            dashRole.innerText = userDoc.data().rol;
        }
    } catch (e) {
        console.warn('No se pudo obtener el rol del usuario:', e);
    }

    // Fetch history from 'citas' and 'trabajos'
    await loadUserHistory(user.email);
});

async function loadUserHistory(email) {
    try {
        citasList.innerHTML = '';
        let historyData = [];

        // Fetch from 'citas' (pending or programmed)
        const qCitas = query(collection(db, 'citas'), where('email', '==', email));
        const snapCitas = await getDocs(qCitas);
        snapCitas.forEach(d => historyData.push({ id: d.id, ...d.data(), type: 'Cita' }));

        // Fetch from 'trabajos' (completed or cancelled)
        const qTrabajos = query(collection(db, 'trabajos'), where('email', '==', email));
        const snapTrabajos = await getDocs(qTrabajos);
        snapTrabajos.forEach(d => historyData.push({ id: d.id, ...d.data(), type: 'Trabajo' }));

        if (historyData.length === 0) {
            citasList.innerHTML = `
                <div style="text-align: center; color: #94a3b8; padding: 2rem;">
                    <i class="ph ph-calendar-blank" style="font-size: 3rem; margin-bottom: 1rem; color: #cbd5e1;"></i>
                    <p>Aún no tienes servicios solicitados.</p>
                    <a href="index.html#contacto" class="btn-primary" style="display: inline-block; margin-top: 1rem; padding: 0.6rem 1.5rem;">Solicitar una Cita</a>
                </div>
            `;
            return;
        }

        // Sort by date descending (rough sort by raw string if no proper timestamp available, though createdAt is usually best)
        historyData.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        historyData.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            
            // Determine status style
            const estado = item.estado || 'Programada';
            let statusClass = 'status-programada';
            if (estado.toLowerCase() === 'completado' || item.type === 'Trabajo') statusClass = 'status-completado';
            if (estado.toLowerCase() === 'cancelado') statusClass = 'status-cancelado';

            el.innerHTML = `
                <div>
                    <h3 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 0.2rem;">${item.servicio || 'Servicio de Limpieza'}</h3>
                    <p style="color: #64748b; font-size: 0.9rem;"><i class="ph ph-calendar-blank"></i> ${item.fecha} &nbsp;&nbsp; <i class="ph ph-clock"></i> ${item.hora || 'No especificada'}</p>
                </div>
                <div style="text-align: right;">
                    <span class="status-badge ${statusClass}">${estado}</span>
                    <p style="margin-top: 0.5rem; font-size: 0.9rem; font-weight: 600; color: #1e293b;">${item.monto ? '$' + item.monto : '-'}</p>
                </div>
            `;
            citasList.appendChild(el);
        });

    } catch (error) {
        console.error("Error al cargar historial:", error);
        citasList.innerHTML = '<p style="color: #ef4444;">Error al cargar el historial. Inténtalo de nuevo más tarde.</p>';
    }
}
