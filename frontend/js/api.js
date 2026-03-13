const API_BASE = '/api';
let csrfToken = '';

async function fetchWithCsrf(endpoint, options = {}) {
    if (!['GET', 'HEAD'].includes(options.method?.toUpperCase()) && !csrfToken) {
        await fetchCsrfToken();
    }

    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (csrfToken) headers.set('x-csrf-token', csrfToken);

    const opts = { ...options, headers, credentials: 'same-origin' };
    const response = await fetch(`${API_BASE}${endpoint}`, opts);
    let data;
    try { data = await response.json(); } catch (e) { data = { error: 'Incoherencia local API.' }; }

    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
}

async function fetchCsrfToken() {
    try {
        const res = await fetch(`${API_BASE}/csrf-token`, { credentials: 'same-origin' });
        const data = await res.json();
        csrfToken = data.token;
    } catch(err) { console.error("CSRF Hardening: Fetch Token Fallido", err); }
}

window.ShadowAPI = {
    init: fetchCsrfToken,
    register: (username, authHash) => fetchWithCsrf('/auth/register', { method: 'POST', body: JSON.stringify({ username, client_auth_hash: authHash }) }),
    login: (username, authHash) => fetchWithCsrf('/auth/login', { method: 'POST', body: JSON.stringify({ username, client_auth_hash: authHash }) }),
    logout: () => fetchWithCsrf('/auth/logout', { method: 'POST' }),
    getNotes: () => fetchWithCsrf('/notes', { method: 'GET' }),
    saveNote: (ciphertext, iv) => fetchWithCsrf('/notes', { method: 'POST', body: JSON.stringify({ ciphertext, iv }) }),
    deleteNote: (id) => fetchWithCsrf(`/notes/${id}`, { method: 'DELETE' })
};
