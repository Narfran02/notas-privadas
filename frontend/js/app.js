let _sessionAESKey = null; // Efímera ZK Key (No sale de RAM)
let _currentUsername = null;

// Gestor de Modo Claro / Oscuro Inteligente (Preserva preferencia)
const htmlElement = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const moonIcon = document.getElementById('moonIcon');
const sunIcon = document.getElementById('sunIcon');

const setTheme = (theme) => {
    htmlElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('shadow_theme', theme);
    if (theme === 'dark') {
        moonIcon.classList.add('hidden');
        sunIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
};

const savedTheme = localStorage.getItem('shadow_theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
setTheme(savedTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-bs-theme');
    setTheme(currentTheme === 'dark' ? 'light' : 'dark');
});

const authModule = document.getElementById('authModule');
const notesModule = document.getElementById('notesModule');
const alertsContainer = document.getElementById('alertsContainer');
const authForm = document.getElementById('authForm');
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const usernameInput = document.getElementById('usernameInput');
const passwordInput = document.getElementById('passwordInput');
const btnLogout = document.getElementById('btnLogout');
const noteForm = document.getElementById('noteForm');
const noteInput = document.getElementById('noteInput');
const notesList = document.getElementById('notesList');
const emptyState = document.getElementById('emptyState');
const welcomeText = document.getElementById('welcomeText');
const btnSaveNote = document.getElementById('btnSaveNote');

window.addEventListener('DOMContentLoaded', async () => await window.ShadowAPI.init());

function showAlert(message, type = 'danger') {
    alertsContainer.textContent = ''; 
    const alertEl = document.createElement('div');
    alertEl.className = `alert alert-${type} alert-dismissible fade show`;
    alertEl.textContent = message; // ESTRICTO ZERO TRUST HTML
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn-close';
    closeBtn.onclick = () => alertEl.remove();
    alertEl.appendChild(closeBtn);
    alertsContainer.appendChild(alertEl);
    setTimeout(() => { if(alertEl.parentNode) alertEl.remove(); }, 4000);
}

function switchView(toNotes) {
    if (toNotes) {
        authModule.classList.add('hidden');
        notesModule.classList.remove('hidden');
        welcomeText.textContent = `Vault: ${_currentUsername}`;
        loadNotes();
    } else {
        authModule.classList.remove('hidden');
        notesModule.classList.add('hidden');
        _sessionAESKey = null; 
        _currentUsername = null;
        notesList.textContent = ''; 
    }
}

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleAuthFlow(false);
});

btnRegister.addEventListener('click', async () => {
    if (!authForm.checkValidity()) return authForm.reportValidity();
    await handleAuthFlow(true);
});

async function handleAuthFlow(isRegister) {
    const user = usernameInput.value.trim();
    const pass = passwordInput.value;
    if (!user || !pass) return showAlert("Faltan parámetros");

    try {
        btnLogin.disabled = true;
        btnRegister.disabled = true;
        
        const keys = await window.ShadowCrypto.deriveDoubleKeys(pass, user);
        
        if (isRegister) {
            await window.ShadowAPI.register(user, keys.authHash);
            showAlert("Cuenta cifrada estructurada con éxito.", "success");
        } else {
            await window.ShadowAPI.login(user, keys.authHash);
            showAlert("Canal seguro conectado.", "success");
        }

        _sessionAESKey = keys.aesKey;
        _currentUsername = user;
        passwordInput.value = '';
        
        switchView(true);
    } catch (err) {
        showAlert(err.message);
    } finally {
        btnLogin.disabled = false;
        btnRegister.disabled = false;
    }
}

btnLogout.addEventListener('click', async () => {
    try { await window.ShadowAPI.logout(); } catch (e) { }
    switchView(false);
});

noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = noteInput.value.trim();
    if (!text || !_sessionAESKey) return;

    try {
        btnSaveNote.disabled = true;
        
        // 1. Cifrar
        const { ciphertext, iv } = await window.ShadowCrypto.encryptNote(text, _sessionAESKey);
        
        // 2. Transmitir Ininteligible
        await window.ShadowAPI.saveNote(ciphertext, iv);
        
        noteInput.value = '';
        showAlert("Bloque inyectado a base local.", "success");
        loadNotes();
    } catch (err) {
        showAlert("Error de encubrimiento GCM: " + err.message);
    } finally {
        btnSaveNote.disabled = false;
    }
});

async function loadNotes() {
    try {
        notesList.textContent = ''; 
        emptyState.classList.add('hidden');
        
        const data = await window.ShadowAPI.getNotes();
        if (data.notas.length === 0) return emptyState.classList.remove('hidden');

        for (const nota of data.notas) {
            let plainText = "[Ininteligible]";
            try {
                plainText = await window.ShadowCrypto.decryptNote(nota.ciphertext, nota.iv, _sessionAESKey);
            } catch(e) { }

            const card = document.createElement('div');
            card.className = 'note-card';

            const pText = document.createElement('p');
            pText.className = 'note-text m-0';
            pText.textContent = plainText; // XSS PREVENCION
            
            const footer = document.createElement('div');
            footer.className = 'd-flex justify-content-between align-items-center mt-3 pt-3 border-top';
            
            const time = document.createElement('small');
            time.className = 'text-secondary fw-medium';
            time.textContent = new Date(nota.created_at + 'Z').toLocaleString();

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-outline-danger btn-sm px-3';
            delBtn.innerHTML = '<svg class="me-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg> Destruir';
            delBtn.onclick = () => deleteNote(nota.id);

            footer.appendChild(time);
            footer.appendChild(delBtn);
            card.appendChild(pText);
            card.appendChild(footer);
            notesList.appendChild(card);
        }
    } catch (err) { showAlert(err.message); }
}

async function deleteNote(id) {
    if (!confirm("Expurgar Nota Criptográfica de la Base?")) return;
    try {
        await window.ShadowAPI.deleteNote(id);
        loadNotes();
    } catch (err) { showAlert(err.message); }
}
