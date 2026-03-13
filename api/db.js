const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Carpeta resuelta mediante Variable de entorno (Para Docker) o fallback a desarrollo local
const dbDir = process.env.DB_DIR || path.join(__dirname, 'data');

if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'shadownotes.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error al conectar a SQLite:', err.message);
        process.exit(1);
    }
    console.log('Conectado a la base de datos SQLite (' + dbPath + ').');
});

// Forzar WAL mode y validación de claves foráneas
db.exec(`
    PRAGMA journal_mode=WAL;
    PRAGMA synchronous=NORMAL;
    PRAGMA foreign_keys=ON;
`, (err) => {
    if (err) {
        console.error('Error al configurar PRAGMAs:', err.message);
    } else {
        console.log('Modo WAL y Foreign Keys habilitados.');
    }
});

db.serialize(() => {
    // 1. Tabla Usuarios
    db.run(`CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        auth_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 2. Tabla Notas (+ Foreign Key ligada al ID usuario para mitigar IDOR)
    db.run(`CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES usuarios(id) ON DELETE CASCADE
    )`);
});

// Promisificación de utilidades SQLite
const run = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
};

const get = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

const all = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

module.exports = {
    db,
    run,
    get,
    all,
    dbPath,
    dbDir
};
