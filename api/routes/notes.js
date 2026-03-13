const express = require('express');
const router = express.Router();
const { get, all, run } = require('../db');

// Autenticación de Origen 
const authMiddleware = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Refutado. Su sesión es inválida o inexistente.' });
    }
    next();
};

// GET /api/notes (Leer)
router.get('/', authMiddleware, async (req, res) => {
    try {
        const notas = await all(
            'SELECT id, ciphertext, iv, created_at FROM notas WHERE user_id = ? ORDER BY created_at DESC', 
            [req.session.userId]
        );
        res.json({ notas }); // Devuelve texto Zero-Knowledge, Frontend desencripta
    } catch (err) {
        console.error('Excepción al leer notas:', err.message);
        res.status(500).json({ error: 'Fallo logístico en la lectura local.' });
    }
});

// POST /api/notes (Crear)
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { ciphertext, iv } = req.body;
        
        if (!ciphertext || !iv) {
            return res.status(400).json({ error: 'Faltan parámetros de encriptado bloque GCM.' });
        }

        // Validación exhaustiva tipográfica
        if (typeof iv !== 'string' || typeof ciphertext !== 'string') {
            return res.status(400).json({ error: 'Payload incompatible.' });
        }
        
        // Bloqueo duro si el IV en formato es exageradamente largo 
        // 12 bytes puede representarse como Hex (24chars), b64 (~16chars), JSON Array (~x chars)
        // Impedimos inyección obvia de SQL/XSS al limite de chars
        if (iv.length > 100) {
            return res.status(400).json({ error: 'IV Vector Out-Of-Bounds Excedido.' });
        }

        const result = await run('INSERT INTO notas (user_id, ciphertext, iv) VALUES (?, ?, ?)', [
            req.session.userId,
            ciphertext,
            iv
        ]);

        res.status(201).json({ message: 'Payload Ininteligible almacenado en la Base de Datos con Éxito.', id: result.lastID });
    } catch (err) {
        console.error('Error insertando nota cifrada:', err.message);
        res.status(500).json({ error: 'Imposible inyectar Bloque SQLite.' });
    }
});

// DELETE /api/notes/:id (Eliminar)
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const noteId = req.params.id;
        
        // MITIGACION P0 IDOR (Insecure Direct Object Reference)
        // Exigiendo que coincida EXACTAMENTE el NoteID y el Propietario en la session actual.
        const result = await run('DELETE FROM notas WHERE id = ? AND user_id = ?', [noteId, req.session.userId]);
        
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Archivo inencontrable o Excepción de Propiedad de Privilegios Cruzados (Anti-IDOR).' });
        }

        res.json({ message: 'Bloque expurgado de base de datos.' });
    } catch (err) {
        res.status(500).json({ error: 'No se procesó DELETE local de memoria muerta.' });
    }
});

module.exports = router;
