import { db, auth } from './firebase.js';
import { collection, query, orderBy, onSnapshot, addDoc, doc, setDoc, serverTimestamp, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { S3Client, ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "https://cdn.jsdelivr.net/npm/@aws-sdk/client-s3@3.451.0/+esm";

// Backblaze B2 Configuration
const B2_CONFIG = {
    region: "us-east-005",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    credentials: {
        accessKeyId: "005c2b526be0baa0000000032",
        secretAccessKey: "K005KJq+jjzp9+PwkqW7YGmoX3uooVY"
    },
    bucketName: "SAMPLER"
};

const s3Client = new S3Client({
    region: B2_CONFIG.region,
    endpoint: B2_CONFIG.endpoint,
    credentials: B2_CONFIG.credentials,
});

// Auth Guard & Auto-Register
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = 'login.html';
    } else {
        const userRef = doc(db, 'usuarios', user.uid);
        await setDoc(userRef, {
            nombre: user.displayName || user.email.split('@')[0],
            email: user.email,
            foto: user.photoURL || '',
            rol: 'Admin',
            lastLogin: serverTimestamp(),
            createdAt: serverTimestamp()
        }, { merge: true });
    }
});

const contentArea = document.getElementById('content-area');
const sectionTitle = document.getElementById('section-title');
const navItems = document.querySelectorAll('.nav-item');

const inputStyle = `style="width: 100%; padding: 14px; border: 1.5px solid #e2e8f0; border-radius: 12px; font-size: 1rem; margin-top: 6px; box-sizing: border-box; outline: none; transition: border-color 0.2s;"`;
const labelStyle = `style="color: #334155; font-weight: 600; font-size: 0.9rem; display: block; margin-left: 4px;"`;


// --- Modals Logic ---
const openCitaModal = () => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-card" style="max-width: 550px; text-align: left; padding: 2.5rem; border-radius: 24px;">
        <h2 style="margin-bottom: 2rem; color: #1e293b; font-size: 1.7rem; font-weight: 800;">📅 Programar Nueva Cita</h2>
        <form id="new-cita-form">
            <div style="margin-bottom: 1.5rem;"><label ${labelStyle}>Cliente</label><input type="text" id="cita-cliente" required ${inputStyle}></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                <div><label ${labelStyle}>Fecha</label><input type="date" id="cita-fecha" required ${inputStyle}></div>
                <div><label ${labelStyle}>Hora</label><input type="time" id="cita-hora" required ${inputStyle}></div>
            </div>
            <div style="margin-bottom: 2.5rem;"><label ${labelStyle}>Dirección</label><input type="text" id="cita-direccion" required ${inputStyle}></div>
            <div style="display: flex; gap: 1rem;"><button type="submit" class="btn-metallic" style="flex: 2;">AGENDAR</button><button type="button" class="btn-outline" style="flex: 1;" onclick="this.closest('.modal-overlay').remove()">Cerrar</button></div>
        </form></div>`;
    document.body.appendChild(modal);
    document.getElementById('new-cita-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = { cliente: document.getElementById('cita-cliente').value, fecha: document.getElementById('cita-fecha').value, hora: document.getElementById('cita-hora').value, direccion: document.getElementById('cita-direccion').value, estado: 'Programada', createdAt: serverTimestamp() };
        await addDoc(collection(db, 'citas'), data); modal.remove();
    };
};

const openCompletarCitaModal = async (citaData, docId) => {
    const empSnap = await getDocs(collection(db, 'empleados'));
    const empleados = []; empSnap.forEach(d => empleados.push({id: d.id, ...d.data()}));
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-card" style="max-width: 600px; text-align: left; padding: 2.5rem; border-radius: 24px;">
        <h2 style="margin-bottom: 1.5rem; color: #166534; font-size: 1.7rem; font-weight: 800;">✅ Finalizar Trabajo</h2>
        <form id="complete-work-form">
            <div style="margin-bottom: 1.5rem;"><label ${labelStyle}>Monto Cobrado ($)</label><input type="number" id="monto-final" step="0.01" required ${inputStyle}></div>
            <label ${labelStyle}>Personal:</label>
            <div style="max-height:180px; overflow-y:auto; background:#f8fafc; padding:10px; border-radius:12px; margin-bottom:2rem;">
                ${empleados.map(e => `<div class="emp-row" style="display:flex; align-items:center; gap:8px; margin-bottom:8px;"><input type="checkbox" class="e-chk" data-nombre="${e.nombre}" data-pago="${e.pagoHora}"><span style="flex:1;">${e.nombre}</span><input type="number" class="e-hrs" placeholder="Hrs" style="width:60px;"></div>`).join('')}
            </div>
            <button type="submit" class="btn-metallic" style="width:100%;">GUARDAR</button>
        </form></div>`;
    document.body.appendChild(modal);
    document.getElementById('complete-work-form').onsubmit = async (e) => {
        e.preventDefault();
        const asig = []; let totalP = 0;
        document.querySelectorAll('.emp-row').forEach(row => {
            const chk = row.querySelector('.e-chk'), hrs = row.querySelector('.e-hrs').value;
            if (chk.checked && hrs > 0) {
                const sub = (parseFloat(chk.dataset.pago) || 0) * parseFloat(hrs);
                asig.push({ nombre: chk.dataset.nombre, horas: hrs, pago: sub.toFixed(2) });
                totalP += sub;
            }
        });
        const totalC = parseFloat(document.getElementById('monto-final').value) || 0;
        const result = { estado: 'Completado', monto: totalC.toFixed(2), pagoStaff: totalP.toFixed(2), ganancia: (totalC - totalP).toFixed(2), asignaciones: asig, completedAt: serverTimestamp() };
        await updateDoc(doc(db, 'citas', docId), result);
        await addDoc(collection(db, 'trabajos'), { ...citaData, ...result, createdAt: serverTimestamp() });
        modal.remove();
    };
};

const openCancelarCitaModal = (citaData, docId) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-card" style="max-width: 500px; text-align: left; padding: 2.5rem; border-radius: 24px;">
        <h2 style="margin-bottom:1.5rem; color:#ef4444;">🚫 Cancelar</h2>
        <form id="cancel-form">
            <label ${labelStyle}>Motivo:</label><textarea id="m-cancel" required style="width:100%; height:100px; padding:12px; margin-top:8px;"></textarea>
            <button type="submit" class="btn-metallic" style="width:100%; margin-top:1.5rem; background:#ef4444;">CANCELAR CITA</button>
        </form></div>`;
    document.body.appendChild(modal);
    document.getElementById('cancel-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = { estado: 'Cancelado', motivo: document.getElementById('m-cancel').value, canceledAt: serverTimestamp() };
        await updateDoc(doc(db, 'citas', docId), data);
        await addDoc(collection(db, 'trabajos'), { ...citaData, ...data, createdAt: serverTimestamp() });
        modal.remove();
    };
};

const openEmpleadoModal = (editData = null, docId = null) => {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay active';
    modal.innerHTML = `<div class="modal-card" style="max-width: 550px; text-align: left; padding: 2.5rem; border-radius: 24px;">
        <h2 style="margin-bottom: 2rem;">${editData ? '✏️ Editar Empleado' : '👤 Nuevo Empleado'}</h2>
        <form id="e-form">
            <label ${labelStyle}>Nombre</label><input type="text" id="e-nom" value="${editData ? editData.nombre : ''}" required ${inputStyle}>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:1rem;">
                <div><label ${labelStyle}>Cargo</label><input type="text" id="e-car" value="${editData ? editData.cargo : ''}" required ${inputStyle}></div>
                <div><label ${labelStyle}>$/Hora</label><input type="number" id="e-pag" step="0.01" value="${editData ? editData.pagoHora : ''}" required ${inputStyle}></div>
            </div>
            <label ${labelStyle} style="margin-top:1rem;">Teléfono</label><input type="tel" id="e-tel" value="${editData ? editData.telefono : ''}" required ${inputStyle}>
            <button type="submit" class="btn-metallic" style="width:100%; margin-top:2rem;">GUARDAR</button>
        </form></div>`;
    document.body.appendChild(modal);
    document.getElementById('e-form').onsubmit = async (e) => {
        e.preventDefault();
        const data = { nombre: document.getElementById('e-nom').value, cargo: document.getElementById('e-car').value, pagoHora: document.getElementById('e-pag').value, telefono: document.getElementById('e-tel').value, estatus: editData ? editData.estatus : 'Activo', updatedAt: serverTimestamp() };
        if (editData) await updateDoc(doc(db, 'empleados', docId), data);
        else { data.createdAt = serverTimestamp(); await addDoc(collection(db, 'empleados'), data); }
        modal.remove();
    };
};

// --- View Rendering ---
const renderCitasSection = () => {
    contentArea.innerHTML = `
        <div class="header-actions" style="margin-bottom:2.5rem; display:flex; justify-content:flex-end;">
            <button class="btn-metallic" id="add-cita-btn"><i class="ph ph-plus"></i> AGREGAR CITA</button>
        </div>
        <div style="display:grid; gap:3rem;">
            <div class="data-card" style="border-radius: 24px;">
                <h3 style="margin-bottom:1.5rem;"><i class="ph ph-calendar"></i> Próximas Citas</h3>
                <table class="admin-table">
                    <thead><tr><th>Cliente</th><th>Fecha</th><th>Hora</th><th>Dirección</th><th>Acciones</th></tr></thead>
                    <tbody id="citas-pending-body"></tbody>
                </table>
            </div>
            <div class="data-card" style="opacity: 0.8; border-radius: 24px;">
                <h3 style="margin-bottom:1.5rem;"><i class="ph ph-clock-counter-clockwise"></i> Historial</h3>
                <table class="admin-table">
                    <thead><tr><th>Cliente</th><th>Fecha</th><th>Estatus</th><th>Monto</th><th>Restablecer</th></tr></thead>
                    <tbody id="citas-history-body"></tbody>
                </table>
            </div>
        </div>`;
    document.getElementById('add-cita-btn').onclick = openCitaModal;
    onSnapshot(query(collection(db, 'citas'), orderBy("createdAt", "desc")), (snap) => {
        const pBody = document.getElementById('citas-pending-body'), hBody = document.getElementById('citas-history-body');
        if (!pBody || !hBody) return;
        pBody.innerHTML = ''; hBody.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data(), tr = document.createElement('tr');
            if (data.estado === 'Programada') {
                tr.innerHTML = `<td><strong>${data.cliente}</strong></td><td>${data.fecha}</td><td>${data.hora}</td><td>${data.direccion}</td>
                    <td style="display:flex; gap:8px;">
                        <button class="action-btn compl-btn" style="background:#dcfce7;color:#166534;"><i class="ph ph-check"></i> Completar</button>
                        <button class="action-btn canc-btn" style="background:#fee2e2;color:#b91c1c;"><i class="ph ph-x"></i> Cancelar</button>
                    </td>`;
                pBody.appendChild(tr);
                tr.querySelector('.compl-btn').onclick = () => openCompletarCitaModal(data, docSnap.id);
                tr.querySelector('.canc-btn').onclick = () => openCancelarCitaModal(data, docSnap.id);
            } else {
                tr.innerHTML = `<td><strong>${data.cliente}</strong></td><td>${data.fecha}</td><td style="font-weight:bold; color:${data.estado==='Cancelado'?'#b91c1c':'#166534'}">${data.estado}</td><td>$${data.monto || '-'}</td><td><button class="action-btn del-btn"><i class="ph ph-trash"></i></button></td>`;
                hBody.appendChild(tr);
                tr.querySelector('.del-btn').onclick = () => deleteDoc(doc(db, 'citas', docSnap.id));
            }
        });
    });
};

const renderDataList = (col, headers) => {
    contentArea.innerHTML = `
        <div class="header-actions" style="margin-bottom:2.5rem; display:flex; justify-content:flex-end;">
            <button class="btn-metallic" id="add-btn-${col}"><i class="ph ph-plus"></i> AGREGAR ${col.toUpperCase().slice(0,-1)}</button>
        </div>
        <div class="data-card" style="border-radius: 24px;"><table class="admin-table">
            <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}<th>Acciones</th></tr></thead>
            <tbody id="data-body"></tbody>
        </table></div>`;
    const addBtn = document.getElementById(`add-btn-${col}`);
    if (addBtn) col === 'empleados' ? addBtn.onclick = () => openEmpleadoModal() : addBtn.style.display = 'none';

    const q = (col==='usuarios'||col==='trabajos'||col==='empleados') ? query(collection(db, col)) : query(collection(db, col), orderBy("createdAt", "desc"));
    onSnapshot(q, (snap) => {
        const body = document.getElementById('data-body'); if (!body) return;
        body.innerHTML = '';
        snap.forEach(docSnap => {
            const data = docSnap.data(), tr = document.createElement('tr'); tr.className = 'data-row';
            let html = '';
            if (col==='solicitudes') html = `<td>${data.createdAt ? new Date(data.createdAt.seconds*1000).toLocaleDateString() : ''}</td><td><strong>${data.nombre}</strong></td><td>${data.email}</td><td>${data.servicio}</td><td>Nuevo</td>`;
            else if (col==='usuarios') html = `<td><strong>${data.nombre}</strong></td><td>${data.email}</td><td>${data.rol}</td><td>${data.lastLogin ? new Date(data.lastLogin.seconds*1000).toLocaleString() : ''}</td>`;
            else if (col==='trabajos') html = `<td><strong>${data.cliente}</strong></td><td>$${data.monto || '0.00'}</td><td>${data.fecha}</td><td style="font-weight:bold; color:${data.estatus==='Cancelado'?'#ef4444':'#166534'}">${data.estatus}</td>`;
            else if (col==='empleados') html = `<td><strong>${data.nombre}</strong></td><td>${data.cargo}</td><td>$${data.pagoHora}/h</td><td>${data.telefono}</td><td>Active</td>`;

            let acts = col === 'solicitudes' ? `<button class="action-btn view-btn"><i class="ph ph-eye"></i> Ver</button>` :
                       col === 'empleados' ? `<button class="action-btn edit-btn"><i class="ph ph-pencil"></i></button> <button class="action-btn del-btn"><i class="ph ph-trash"></i></button>` :
                       col === 'trabajos' ? `<button class="action-btn det-btn"><i class="ph ph-eye"></i> Detalle</button> <button class="action-btn del-btn"><i class="ph ph-trash"></i></button>` :
                       `<button class="action-btn del-btn"><i class="ph ph-trash"></i></button>`;

            tr.innerHTML = `${html}<td style="display:flex; gap:8px;">${acts}</td>`;
            body.appendChild(tr);

            if (col==='solicitudes'||col==='trabajos') {
                const detTr = document.createElement('tr'); detTr.className = 'detail-row hidden';
                let detHtml = col==='solicitudes' ? `<div style="padding:15px; background:#f8fafc; border-radius:12px;"><strong>Mensaje:</strong><p>${data.mensaje}</p></div>` :
                    `<div style="padding:15px; background:#f8fafc; border-radius:12px;">
                        <strong>📍 Dirección:</strong> ${data.direccion || 'N/A'}<br>
                        ${data.estatus==='Cancelado' ? `<strong style="color:#ef4444;">❌ Motivo:</strong> ${data.motivo}` : `<strong>💰 Ganancia:</strong> <span style="color:#166534;">+$${data.ganancia}</span> (Nómina: $${data.pagoStaff})`}
                    </div>`;
                detTr.innerHTML = `<td colspan="${headers.length + 1}">${detHtml}</td>`;
                body.appendChild(detTr);
                tr.querySelector(col==='solicitudes' ? '.view-btn' : '.det-btn').onclick = () => detTr.classList.toggle('hidden');
            }
            if (col==='empleados') {
                tr.querySelector('.edit-btn').onclick = () => openEmpleadoModal(data, docSnap.id);
                tr.querySelector('.del-btn').onclick = () => { if(confirm('¿Eliminar?')) deleteDoc(doc(db, col, docSnap.id)); };
            } else if (col!=='solicitudes' && col!=='trabajos') {
                tr.querySelector('.del-btn').onclick = () => { if(confirm('¿Eliminar?')) deleteDoc(doc(db, col, docSnap.id)); };
            }
        });
    });
};

const renderContabilidadSection = async () => {
    const filterInput = `style="padding: 8px 12px; border: 1.5px solid #cbd5e1; border-radius: 10px; font-size: 0.85rem; width: 140px; height: 38px; box-sizing: border-box;"`;
    contentArea.innerHTML = `
        <!-- Filtros Tight -->
        <div id="filter-bar" class="data-card" style="margin-bottom:1rem; padding:0.8rem 1.2rem; display:flex; align-items:center; gap:12px; border-radius:16px; background:#fff; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.8rem; font-weight:600; color:#64748b;">Reporte:</span>
                <input type="date" id="filter-from" ${filterInput}>
                <span style="color:#cbd5e1;">-</span>
                <input type="date" id="filter-to" ${filterInput}>
            </div>
            <button id="btn-filter" class="btn-metallic" style="padding:0 15px; height:38px; font-size:0.85rem; margin:0;">Filtrar</button>
            <button id="btn-pdf" class="btn-metallic" style="margin-left:auto; background: #e11d48; padding:0 15px; height:38px; font-size:0.85rem; margin:0;">
                <i class="ph ph-file-pdf"></i> Reporte PDF
            </button>
        </div>

        <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:1rem; margin-bottom:1.2rem;">
            <div id="c-rev" class="data-card" style="border-left:4px solid #10b981; padding:1.2rem; cursor:pointer;"><p style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">INGRESOS</p><h2 id="t-rev" style="margin:0; font-size:1.4rem;">$0</h2></div>
            <div id="c-pay" class="data-card" style="border-left:4px solid #ef4444; padding:1.2rem; cursor:pointer;"><p style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">NÓMADA</p><h2 id="t-pay" style="margin:0; font-size:1.4rem;">$0</h2></div>
            <div class="data-card" style="border-left:4px solid #3b82f6; padding:1.2rem;"><p style="font-size:0.75rem; color:#64748b; margin-bottom:4px;">GANANCIA</p><h2 id="t-prof" style="margin:0; font-size:1.4rem;">$0</h2></div>
        </div>
        <div style="display:grid; grid-template-columns: 1.5fr 1fr; gap:1.5rem; margin-bottom:1.5rem;">
            <div class="data-card" style="padding:1.5rem; height:220px;"><canvas id="revenueChart"></canvas></div>
            <div class="data-card" style="padding:1.5rem; height:220px;"><canvas id="pieChart"></canvas></div>
        </div>
        <div class="data-card" style="padding:1.5rem;"><table class="admin-table"><thead><tr><th>Fecha</th><th>Cliente</th><th>Monto</th><th>Staff</th><th>Profit</th></tr></thead><tbody id="cont-body"></tbody></table></div>
    `;

    let revC = null, pieC = null, lastSnap = null;
    const update = (docs) => {
        let rT = 0, pT = 0, nT = 0; const body = document.getElementById('cont-body'); if(!body) return;
        body.innerHTML = ''; const labels = [], rD = [], pD = [];
        docs.forEach(d => {
            const data = d.data();
            if (data.estado==='Completado'||data.estatus==='Completado') {
                const r = parseFloat(data.monto||0), p = parseFloat(data.pagoStaff||0), n = parseFloat(data.ganancia||0);
                rT+=r; pT+=p; nT+=n;
                body.innerHTML += `<tr><td>${data.fecha}</td><td><strong>${data.cliente}</strong></td><td style="color:#10b981;">+$${r}</td><td style="color:#ef4444;">-$${p}</td><td>$${n}</td></tr>`;
                labels.unshift(data.fecha); rD.unshift(r); pD.unshift(p);
            }
        });
        document.getElementById('t-rev').innerText = `$${rT.toFixed(2)}`;
        document.getElementById('t-pay').innerText = `$${pT.toFixed(2)}`;
        document.getElementById('t-prof').innerText = `$${nT.toFixed(2)}`;
        if(revC) revC.destroy(); if(pieC) pieC.destroy();
        const cfg = { responsive:true, maintainAspectRatio:false, plugins:{legend:{position:'bottom', labels:{boxWidth:10}}} };
        revC = new Chart(document.getElementById('revenueChart'), { type:'bar', data:{labels:labels.slice(-10), datasets:[{label:'Ingresos', data:rD.slice(-10), backgroundColor:'#10b981'},{label:'Nómina', data:pD.slice(-10), backgroundColor:'#ef4444'}]}, options:cfg });
        pieC = new Chart(document.getElementById('pieChart'), { type:'doughnut', data:{labels:['Pagos','Ganancia'], datasets:[{data:[pT, nT], backgroundColor:['#ef4444','#3b82f6']}]}, options:cfg });
    };

    onSnapshot(query(collection(db, 'trabajos'), orderBy("createdAt", "desc")), (snap) => { lastSnap = snap; apply(); });
    const apply = () => {
        const from = document.getElementById('filter-from').value, to = document.getElementById('filter-to').value;
        let filtered = lastSnap.docs;
        if(from) filtered = filtered.filter(d => d.data().fecha >= from);
        if(to) filtered = filtered.filter(d => d.data().fecha <= to);
        update(filtered);
    };
    document.getElementById('btn-filter').onclick = apply;
    document.getElementById('btn-pdf').onclick = () => {
        // Create a hidden container for the PDF
        const printContainer = document.createElement('div');
        printContainer.style.cssText = 'padding: 40px; font-family: Montserrat, sans-serif; color: #1e293b; background: white;';
        
        const currentFrom = document.getElementById('filter-from').value || 'Inicio';
        const currentTo = document.getElementById('filter-to').value || 'Hoy';

        printContainer.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom: 3px solid #1e293b; padding-bottom: 20px; margin-bottom: 30px;">
                <div>
                    <h1 style="margin:0; font-family: Playfair Display; font-size: 2.5rem; letter-spacing: 2px;">FAITHLIFE</h1>
                    <p style="margin:0; font-size: 0.9rem; color: #64748b; text-transform: uppercase; font-weight: 600;">Cleaning Services - Reporte Contable</p>
                </div>
                <div style="text-align:right;">
                    <p style="margin:0; font-size: 0.8rem; color: #64748b;">Periodo: <strong>${currentFrom}</strong> al <strong>${currentTo}</strong></p>
                    <p style="margin:0; font-size: 0.8rem; color: #64748b;">Generado: ${new Date().toLocaleDateString()}</p>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: repeat(3, 1fr); gap:20px; margin-bottom:40px;">
                <div style="padding:15px; border: 1px solid #e2e8f0; border-radius:12px; text-align:center;">
                    <p style="margin:0 0 5px; font-size:0.8rem; color:#64748b;">INGRESOS TOTALES</p>
                    <h2 style="margin:0; color:#10b981;">${document.getElementById('t-rev').innerText}</h2>
                </div>
                <div style="padding:15px; border: 1px solid #e2e8f0; border-radius:12px; text-align:center;">
                    <p style="margin:0 0 5px; font-size:0.8rem; color:#64748b;">NÓMINA TOTAL</p>
                    <h2 style="margin:0; color:#ef4444;">${document.getElementById('t-pay').innerText}</h2>
                </div>
                <div style="padding:15px; border: 1px solid #e2e8f0; border-radius:12px; text-align:center; background:#f8fafc;">
                    <p style="margin:0 0 5px; font-size:0.8rem; color:#64748b;">GANANCIA NETA</p>
                    <h2 style="margin:0; color:#3b82f6;">${document.getElementById('t-prof').innerText}</h2>
                </div>
            </div>

            <div style="margin-bottom:40px;">
                <h3 style="border-bottom: 1px solid #e2e8f0; padding-bottom:10px; margin-bottom:20px;">Análisis de Rendimiento</h3>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:30px;">
                    <div><p style="text-align:center; font-size:0.7rem; color:#94a3b8;">Crecimiento Temporal</p><img src="${document.getElementById('revenueChart').toDataURL()}" style="width:100%;"></div>
                    <div><p style="text-align:center; font-size:0.7rem; color:#94a3b8;">Distribución de Capital</p><img src="${document.getElementById('pieChart').toDataURL()}" style="width:100%;"></div>
                </div>
            </div>

            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom:40px;">

            <div>
                <h3 style="margin-bottom:20px;">Listado de Operaciones</h3>
                <table style="width:100%; border-collapse: collapse; font-size:0.85rem;">
                    <thead>
                        <tr style="background:#f1f5f9; text-align:left;">
                            <th style="padding:10px; border: 1px solid #e2e8f0;">Fecha</th>
                            <th style="padding:10px; border: 1px solid #e2e8f0;">Cliente</th>
                            <th style="padding:10px; border: 1px solid #e2e8f0;">Ingreso</th>
                            <th style="padding:10px; border: 1px solid #e2e8f0;">Nómina</th>
                            <th style="padding:10px; border: 1px solid #e2e8f0;">Neto</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Array.from(document.getElementById('cont-body').rows).map(row => `
                            <tr>
                                <td style="padding:10px; border: 1px solid #e2e8f0;">${row.cells[0].innerText}</td>
                                <td style="padding:10px; border: 1px solid #e2e8f0;">${row.cells[1].innerText}</td>
                                <td style="padding:10px; border: 1px solid #e2e8f0; color:#10b981;">${row.cells[2].innerText}</td>
                                <td style="padding:10px; border: 1px solid #e2e8f0; color:#ef4444;">${row.cells[3].innerText}</td>
                                <td style="padding:10px; border: 1px solid #e2e8f0; font-weight:bold;">${row.cells[4].innerText}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div style="margin-top:50px; text-align:center; border-top: 1px solid #e2e8f0; padding-top:20px;">
                <p style="font-size:0.75rem; color:#94a3b8;">Reporte Certificado por Faithlife Cleaning Services &copy; ${new Date().getFullYear()}</p>
            </div>
        `;
        
        const opt = { 
            margin: 0, 
            filename: `Reporte_Faithlife_${currentFrom}_${currentTo}.pdf`, 
            image: { type: 'jpeg', quality: 1 }, 
            html2canvas: { scale: 3, useCORS: true }, 
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } 
        };
        
        html2pdf().from(printContainer).set(opt).save();
    };
};

// --- Gallery Management ---
const renderGaleriaSection = async () => {
    const listContainer = document.getElementById('list-container');
    listContainer.innerHTML = `
        <div style="background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
                <h2 style="font-size: 1.5rem; font-weight: 700; color: #1e293b;">🖼️ Gestión de Galería</h2>
                <div>
                    <label for="b2-upload" class="btn-primary" style="cursor: pointer; padding: 10px 20px; font-size: 0.9rem;">
                        <i class="ph ph-upload-simple"></i> Subir Foto
                    </label>
                    <input type="file" id="b2-upload" accept="image/*" style="display: none;">
                </div>
            </div>
            
            <div id="b2-gallery-list" class="gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem;">
                <p>Cargando archivos de Backblaze...</p>
            </div>
        </div>
    `;

    const fetchPhotos = async () => {
        const galleryList = document.getElementById('b2-gallery-list');
        try {
            const command = new ListObjectsV2Command({ Bucket: B2_CONFIG.bucketName });
            const response = await s3Client.send(command);
            const files = (response.Contents || []).filter(f => f.Key.match(/\.(jpg|jpeg|png|gif|webp)$/i));
            
            galleryList.innerHTML = '';
            if (files.length === 0) {
                galleryList.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #94a3b8; padding: 2rem;">No hay fotos en el bucket.</p>';
                return;
            }

            files.forEach(file => {
                const url = `${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${file.Key}`;
                const card = document.createElement('div');
                card.style = "position: relative; border-radius: 8px; overflow: hidden; height: 150px; background: #f1f5f9; box-shadow: 0 2px 4px rgba(0,0,0,0.05); group";
                card.innerHTML = `
                    <img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">
                    <button class="delete-photo" data-key="${file.Key}" style="position: absolute; top: 5px; right: 5px; background: rgba(239, 68, 68, 0.9); color: white; border: none; padding: 5px; border-radius: 4px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                        <i class="ph ph-trash" style="font-size: 1.2rem;"></i>
                    </button>
                `;
                galleryList.appendChild(card);
            });

            // Delete Logic
            document.querySelectorAll('.delete-photo').forEach(btn => {
                btn.onclick = async () => {
                    if (!confirm("¿Seguro que quieres eliminar esta foto?")) return;
                    btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i>';
                    try {
                        await s3Client.send(new DeleteObjectCommand({ 
                            Bucket: B2_CONFIG.bucketName, 
                            Key: btn.dataset.key 
                        }));
                        fetchPhotos();
                    } catch (err) {
                        alert("Error al eliminar");
                        btn.innerHTML = '<i class="ph ph-trash"></i>';
                    }
                };
            });

        } catch (err) {
            galleryList.innerHTML = '<p style="color: red;">Error al conectar con Backblaze B2.</p>';
        }
    };

    fetchPhotos();

    // Upload Logic
    document.getElementById('b2-upload').onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const btnLabel = document.querySelector('label[for="b2-upload"]');
        const originalHtml = btnLabel.innerHTML;
        btnLabel.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Subiendo...';
        btnLabel.style.opacity = '0.7';

        const fileName = `gallery_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        
        try {
            await s3Client.send(new PutObjectCommand({
                Bucket: B2_CONFIG.bucketName,
                Key: fileName,
                Body: file,
                ContentType: file.type
            }));
            fetchPhotos();
        } catch (err) {
            console.error(err);
            alert("Error al subir archivo");
        } finally {
            btnLabel.innerHTML = originalHtml;
            btnLabel.style.opacity = '1';
        }
    };
};

// Update navigation mapping
const renderSection = async (section) => {
    sectionTitle.innerText = section.charAt(0).toUpperCase() + section.slice(1);
    navItems.forEach(item => item.classList.toggle('active', item.dataset.section === section));
    
    if (section === 'citas') {
        renderCitasSection();
    } else if (section === 'contabilidad') {
        renderContabilidadSection();
    } else if (section === 'galeria') {
        renderGaleriaSection();
    } else {
        switch (section) {
            case 'mensajes': 
                renderDataList('solicitudes', ['Fecha', 'Cliente', 'Email', 'Servicio', 'Estado']); 
                break;
            case 'usuarios': 
                renderDataList('usuarios', ['Nombre', 'Email', 'Rol', 'Último Acceso']); 
                break;
            case 'trabajos': 
                renderDataList('trabajos', ['Cliente', 'Monto', 'Fecha', 'Estatus']); 
                break;
            case 'empleados': 
                renderDataList('empleados', ['Nombre', 'Cargo', '$/Hora', 'Teléfono', 'Estatus']); 
                break;
        }
    }
};

navItems.forEach(item => item.onclick = () => renderSection(item.dataset.section));
renderSection('mensajes');
document.getElementById('logout-btn').onclick = () => signOut(auth);
