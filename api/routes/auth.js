const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const { get, run } = require('../db');

// Registro de usuarios
router.post('/register', async (req, res) => {
    try {
        const { username, client_auth_hash } = req.body;

        if (!username || !client_auth_hash || typeof client_auth_hash !== 'string') {
            return res.status(400).json({ error: 'Datos criptográficos incompletos.' });
        }

        // Aplica capa de sal/hashing del lado del Servidor al Hash del Cliente
        const serverHash = await bcrypt.hash(client_auth_hash, 10);

        try {
            const result = await run('INSERT INTO usuarios (username, auth_hash) VALUES (?, ?)', [username, serverHash]);
            
            // Auto Login tras registro (Guardando ID en SQLite persistente session store)
            req.session.userId = result.lastID;
            res.status(201).json({ message: 'Usuario Registrado y Sesión local establecida.' });
            
        } catch (dbErr) {
            // Mitigación: evitar fuga de stack track si colisiona con username existente
            if (dbErr.message.includes('UNIQUE constraint failed')) {
                return res.status(409).json({ error: 'El nombre de usuario ya está reclamado.' });
            }
            throw dbErr;
        }

    } catch (err) {
        console.error('Excepción en /register:', err.message);
        res.status(500).json({ error: 'Fallo logístico en la gestión del registro.' });
    }
});

// Login y Mitigaciones
router.post('/login', async (req, res) => {
    try {
        const { username, client_auth_hash } = req.body;
        
        if (!username || !client_auth_hash) {
            return res.status(400).json({ error: 'Datos de autenticación vacíos.' });
        }

        const user = await get('SELECT id, auth_hash FROM usuarios WHERE username = ?', [username]);
        
        // Anti-User-Enumeration: Devolver genéricos sin pistas para evitar ataques iterativos
        if (!user) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        const match = await bcrypt.compare(client_auth_hash, user.auth_hash);
        if (!match) {
            return res.status(401).json({ error: 'Credenciales inválidas.' });
        }

        // Anti Session Fixation: Regenera ciclo del UUID al escalar privilegios (login)
        req.session.regenerate((err) => {
            if (err) throw err;
            req.session.userId = user.id;
            res.json({ message: 'Conexión Segura Establecida', uid: user.id });
        });

    } catch (err) {
        console.error('Excepción en /login:', err.message);
        res.status(500).json({ error: 'Fallo logístico en el proceso de autenticación.' });
    }
});

// Logout Destructivo Absoluto
router.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: 'Fallo en purga de sesión en la BD.' });
        }
        res.clearCookie('shadow_session_id');
        res.json({ message: 'Sesión local destruida y expurgada.' });
    });
});

module.exports = router;
