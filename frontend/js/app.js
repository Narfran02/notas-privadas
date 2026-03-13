let _sessionAESKey = null; // Efímera ZK Key (No sale de RAM)
let _currentUsername = null;

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
            footer.className = 'd-flex justify-content-between mt-2 pt-2 border-top border-secondary';
            
            const time = document.createElement('small');
            time.className = 'text-muted';
            time.textContent = new Date(nota.created_at + 'Z').toLocaleString();

            const delBtn = document.createElement('button');
            delBtn.className = 'btn btn-outline-danger btn-sm';
            delBtn.textContent = 'Destruir';
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
