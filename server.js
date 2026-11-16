
const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const isVercel = process.env.VERCEL === '1';
const DATABASE_URL = process.env.DATABASE_URL;

let db = null;
let sql = null;
let databaseReady;

if (isVercel && !DATABASE_URL) {
    throw new Error('DATABASE_URL is required for Vercel deployment.');
}

// ==========================================
// DATABASE CONNECTION
// ==========================================

if (DATABASE_URL) {
    // Production or explicitly configured Neon connection
    const { neon } = require('@neondatabase/serverless');

    sql = neon(DATABASE_URL);

    databaseReady = sql`
        CREATE TABLE IF NOT EXISTS contact_messages (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(80) NOT NULL,
            email VARCHAR(120) NOT NULL,
            subject VARCHAR(120) NOT NULL,
            message TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `;

    console.log('Using Neon PostgreSQL database.');

} else {
    // Local development: retain existing SQLite database
    const Database = require('better-sqlite3');

    const DATA_DIR = path.join(__dirname, 'data');
    const DB_PATH = path.join(DATA_DIR, 'portfolio.db');

    fs.mkdirSync(DATA_DIR, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS contact_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            subject TEXT NOT NULL,
            message TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    databaseReady = Promise.resolve();

    console.log(`Using local SQLite database: ${DB_PATH}`);
}


// ==========================================
// MIDDLEWARE
// ==========================================

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));

// Vercel serves public/ assets through its CDN.
// Locally, Express serves them directly.
if (!isVercel) {
    app.use(express.static(path.join(__dirname, 'public')));
}


// ==========================================
// HEALTH CHECK
// ==========================================

app.get('/api/health', async (_req, res) => {
    try {
        await databaseReady;

        if (sql) {
            await sql`SELECT 1`;
        } else if (!db || !db.open) {
            throw new Error('SQLite database is unavailable.');
        }

        return res.json({
            status: 'ok',
            database: sql ? 'Neon PostgreSQL' : 'SQLite',
            connected: true
        });

    } catch (error) {
        console.error('Database health check failed:', error.message);

        return res.status(500).json({
            status: 'error',
            connected: false
        });
    }
});


// ==========================================
// CONTACT FORM API
// ==========================================

app.post('/api/contact', async (req, res) => {

    const { name, email, subject, message, website } = req.body || {};

    // Honeypot spam protection
    if (typeof website === 'string' && website.trim() !== '') {
        return res.status(200).json({
            success: true,
            message: 'Thanks! Your message has been received.'
        });
    }

    const clean = {
        name: typeof name === 'string' ? name.trim() : '',
        email: typeof email === 'string' ? email.trim() : '',
        subject: typeof subject === 'string' && subject.trim()
            ? subject.trim()
            : 'Portfolio website inquiry',
        message: typeof message === 'string' ? message.trim() : ''
    };

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    // Validation
    if (!clean.name || !clean.email || !clean.message) {
        return res.status(400).json({
            success: false,
            message: 'Please complete every field.'
        });
    }

    if (
        clean.name.length > 80 ||
        clean.email.length > 120 ||
        clean.subject.length > 120 ||
        clean.message.length > 3000
    ) {
        return res.status(400).json({
            success: false,
            message: 'One or more fields are too long.'
        });
    }

    if (!emailPattern.test(clean.email)) {
        return res.status(400).json({
            success: false,
            message: 'Please enter a valid email address.'
        });
    }

    try {
        await databaseReady;

        if (sql) {
            // Neon PostgreSQL
            await sql`
                INSERT INTO contact_messages
                    (name, email, subject, message)
                VALUES
                    (
                        ${clean.name},
                        ${clean.email},
                        ${clean.subject},
                        ${clean.message}
                    )
            `;

        } else {
            // Local SQLite
            const insert = db.prepare(`
                INSERT INTO contact_messages
                    (name, email, subject, message)
                VALUES
                    (@name, @email, @subject, @message)
            `);

            insert.run(clean);
        }

        return res.status(201).json({
            success: true,
            message: 'Thanks! Your message has been saved.'
        });

    } catch (error) {
        console.error('Could not save contact message:', error.message);

        return res.status(500).json({
            success: false,
            message: 'We could not save your message. Please try again.'
        });
    }
});


// ==========================================
// ROUTE FALLBACK
// ==========================================

app.use((req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({
            success: false,
            message: 'API endpoint not found.'
        });
    }

    // Local development fallback
    if (!isVercel) {
        return res.sendFile(
            path.join(__dirname, 'public', 'index.html')
        );
    }

    return res.status(404).send('Page not found.');
});


// ==========================================
// ERROR HANDLING
// ==========================================

app.use((error, req, res, next) => {
    console.error('Server error:', error);

    if (res.headersSent) {
        return next(error);
    }

    return res.status(500).json({
        success: false,
        message: 'An unexpected server error occurred.'
    });
});


// ==========================================
// LOCAL SERVER / VERCEL EXPORT
// ==========================================

if (require.main === module) {

    const server = app.listen(PORT, () => {
        console.log(`Portfolio running at http://localhost:${PORT}`);
    });

    const shutdown = () => {
        server.close(() => {
            if (db && db.open) {
                db.close();
            }
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

module.exports = app;
