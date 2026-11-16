const express = require('express');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'portfolio.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(DB_PATH);
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

app.use(express.json({ limit: '20kb' }));
app.use(express.urlencoded({ extended: false, limit: '20kb' }));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', database: 'connected' });
});

app.post('/api/contact', (req, res) => {
  const { name, email, subject, message, website } = req.body || {};

  // Honeypot: bots may fill this hidden field; quietly accept without storing.
  if (typeof website === 'string' && website.trim() !== '') {
    return res.status(200).json({ success: true, message: 'Thanks! Your message has been received.' });
  }

  const clean = {
    name: typeof name === 'string' ? name.trim() : '',
    email: typeof email === 'string' ? email.trim() : '',
    subject: typeof subject === 'string' ? subject.trim() : '',
    message: typeof message === 'string' ? message.trim() : ''
  };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!clean.name || !clean.email || !clean.subject || !clean.message) {
    return res.status(400).json({ success: false, message: 'Please complete every field.' });
  }
  if (clean.name.length > 80 || clean.email.length > 120 || clean.subject.length > 120 || clean.message.length > 3000) {
    return res.status(400).json({ success: false, message: 'One or more fields are too long.' });
  }
  if (!emailPattern.test(clean.email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const insert = db.prepare(`
      INSERT INTO contact_messages (name, email, subject, message)
      VALUES (@name, @email, @subject, @message)
    `);
    insert.run(clean);
    return res.status(201).json({ success: true, message: 'Thanks! Your message has been saved.' });
  } catch (error) {
    console.error('Could not save contact message:', error.message);
    return res.status(500).json({ success: false, message: 'We could not save your message. Please try again.' });
  }
});

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'API endpoint not found.' });
  }
  return res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  console.log(`SQLite database: ${DB_PATH}`);
});

function closeDatabase() {
  if (db.open) db.close();
}
process.on('SIGINT', () => { closeDatabase(); process.exit(0); });
process.on('SIGTERM', () => { closeDatabase(); process.exit(0); });
