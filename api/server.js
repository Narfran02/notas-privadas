const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const { doubleCsrf } = require('csrf-csrf');
const path = require('path');
const { dbDir } = require('./db');

const app = express();
app.set('trust proxy', 1); // Confiar en el proxy reverso Nginx 
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// 1. Hardening Global con Helmet
app.use(helmet());

// 2. Body Parsers limitados
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// 3. Prevenir ataques de fuerza bruta (Rate Limiting)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: { error: 'Demasiadas peticiones. Por favor, intente de nuevo más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// 4. Configurar Sesiones SQLite No-Volátiles (connect-sqlite3)
app.use(session({
    store: new SQLiteStore({
        db: 'sessions.sqlite',
        dir: dbDir,
        concurrentDB: true
    }),
    secret: process.env.SESSION_SECRET || 'fallback_secret_zero_knowledge_shadow_notes_dev',
    resave: false,
    saveUninitialized: false, // Importante para no spamear UUIDs
    name: 'shadow_session_id', 
    cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 60 * 24 
    }
}));

// 5. Protección CSRF
// A. Defensa Primaria: Fetch Metadata nativo (Sec-Fetch-Site)
app.use((req, res, next) => {
    const site = req.get('Sec-Fetch-Site');
    if (site && site !== 'same-origin' && site !== 'none') {
        return res.status(403).json({ error: 'Operación denegada. Origen ajeno bloqueado (Fetch Metadata Strict Mode).' });
    }
    
    // Fallback de cabecera Origen en mutaciones (en caso navegador antiguo)
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const origin = req.get('origin') || req.get('referer');
        if (origin) {
            const host = req.get('host');
            if (!origin.includes(host)) {
                return res.status(403).json({ error: 'CSRF estricto detectado (Validación de Origen fallida).' });
            }
        }
    }
    next();
});

// B. Defensa Secundaria: Tokens de Doble Envío (csrf-csrf)
const { doubleCsrfProtection, generateToken } = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET || 'csrf_super_secret_fallback',
    cookieName: isProd ? '__Host-psgo.x-csrf-token' : 'psgo.x-csrf-token', 
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        path: '/',
        secure: isProd
    },
    getTokenFromRequest: (req) => req.headers['x-csrf-token']
});

// Tokenizer a nivel global tras pasar validación nativa (Salvo GET permitidos p/ getToken)
app.use(doubleCsrfProtection);

// Inversión de módulos de API Endpoints
const authRoutes = require('./routes/auth');
const notesRoutes = require('./routes/notes');

app.use('/api/auth', authRoutes);
app.use('/api/notes', notesRoutes);

// Endpoint estricto para repartir el token al arranque del cliente
app.get('/api/csrf-token', (req, res) => {
    res.json({ token: generateToken(req, res) });
});

// 6. Servidor Estático Fallback (Para equipos sin Docker/Nginx)
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/health', (req, res) => res.json({ status: 'ok', secure: true }));

// Manejador de Errores Cero-Fuga (Stack Trace Zero Knowledge)
app.use((err, req, res, next) => {
    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Token CSRF inválido o ausente.' });
    }
    console.error('[Error Crítico Servidor]', err.message); 
    res.status(500).json({ error: 'Excepción del Servidor Interno. (Detalles Ocultados por Seguridad)' });
});

app.listen(PORT, () => console.log(`[API] Guardián Backend arrancado y auditando tráfico local en el puerto ${PORT}`));
