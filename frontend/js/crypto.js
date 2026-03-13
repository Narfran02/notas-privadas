const ITERATIONS = 100000;
const HASH_ALGO = 'SHA-256';
const AES_ALGO = 'AES-GCM';

// Derivación determinista basada en username (como Salt) para aislar llaves localmente por sesión
async function deriveDoubleKeys(password, username) {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        encoder.encode(password),
        { name: "PBKDF2" },
        false,
        ["deriveBits", "deriveKey"]
    );

    const salt = encoder.encode(username + "ShadowNotesZK-SALT");

    // Derivar doble longitud (512 bits)
    const derivedBits = await crypto.subtle.deriveBits(
        { name: "PBKDF2", salt: salt, iterations: ITERATIONS, hash: HASH_ALGO },
        keyMaterial,
        512
    );

    // Fragmentar 256 bits Auth + 256 bits AES Data Key
    const authBits = derivedBits.slice(0, 32);
    const aesBits = derivedBits.slice(32, 64);

    const authHashArray = Array.from(new Uint8Array(authBits));
    const authHashHex = authHashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const aesKey = await crypto.subtle.importKey(
        "raw", aesBits,
        { name: AES_ALGO, length: 256 },
        false, ["encrypt", "decrypt"]
    );

    return { authHash: authHashHex, aesKey: aesKey };
}

// Emite un Vector de Initializacion seguro de 12 bytes exigido estricamente junto con el texto cifrado
async function encryptNote(text, aesKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    
    // Vector de Inicialización seguro por operacion (Válido: 12 bytes = 96 bits)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertextBuffer = await crypto.subtle.encrypt(
        { name: AES_ALGO, iv: iv }, aesKey, data
    );

    return {
        ciphertext: arrayBufferToBase64(ciphertextBuffer),
        iv: arrayBufferToBase64(iv)
    };
}

async function decryptNote(ciphertextB64, ivB64, aesKey) {
    const ciphertext = base64ToArrayBuffer(ciphertextB64);
    const iv = base64ToArrayBuffer(ivB64);

    const decryptedBuffer = await crypto.subtle.decrypt(
        { name: AES_ALGO, iv: new Uint8Array(iv) }, aesKey, ciphertext
    );

    return new TextDecoder().decode(decryptedBuffer);
}

function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
}

function base64ToArrayBuffer(base64) {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) bytes[i] = binary_string.charCodeAt(i);
    return bytes.buffer;
}

window.ShadowCrypto = { deriveDoubleKeys, encryptNote, decryptNote };
