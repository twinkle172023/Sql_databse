import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic;
let db: Database;

const BASE_DIR = process.cwd();
const UPLOADS_DIR = path.resolve(BASE_DIR, 'uploads');
const DB_FILE = path.resolve(BASE_DIR, 'database.db');

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_FILE, Buffer.from(data));
  }
}

export async function initDatabases() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // 1. Documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_date TEXT NOT NULL,
      file_path TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL
    );
  `);

  // 2. Seed dummy users
  const userCount = db.exec('SELECT COUNT(*) as count FROM users');
  if (userCount.length === 0 || userCount[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO users (username, password, role) VALUES 
      ('alice', 'demo123', 'student'),
      ('bob', 'test123', 'student'),
      ('charlie', 'teach123', 'faculty'),
      ('admin', 'admin123', 'administrator');
    `);
  }

  // 3. Seed 10 dummy documents
  const docCount = db.exec('SELECT COUNT(*) as count FROM documents');
  if (docCount.length === 0 || docCount[0].values[0][0] === 0) {
    const dummyDocs = [
      ['project_report.pdf', '.pdf', 145280, '%PDF-1.4 dummy report content'],
      ['compiler_design.pdf', '.pdf', 218400, '%PDF-1.4 compiler design notes'],
      ['dbms_notes.pdf', '.pdf', 98300, '%PDF-1.4 relational dbms notes'],
      ['sql_injection_notes.txt', '.txt', 12400, 'SQL injection occurs via untrusted concatenation'],
      ['os_assignment.docx', '.docx', 84900, 'PK\x03\x04 dummy word content'],
      ['cn_assignment.pptx', '.pptx', 312000, 'PK\x03\x04 dummy presentation content'],
      ['research_paper.pdf', '.pdf', 194000, '%PDF-1.4 AST static analysis paper'],
      ['architecture.jpg', '.jpg', 52100, '\xFF\xD8\xFF dummy jpeg content'],
      ['network_diagram.png', '.png', 48600, '\x89PNG dummy png content'],
      ['final_presentation.pptx', '.pptx', 450000, 'PK\x03\x04 final compiler presentation'],
    ];

    dummyDocs.forEach(([origName, ext, size, content]) => {
      const storedName = `${origName}`;
      const filePath = path.join(UPLOADS_DIR, storedName);
      if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, String(content));
      }
      db.run(
        `INSERT INTO documents (filename, original_filename, file_extension, file_size, upload_date, file_path)
         VALUES (?, ?, ?, ?, datetime('now'), ?);`,
        [storedName, origName, ext, size, filePath]
      );
    });
  }

  saveDb();
  return { db };
}

export function getDb(): Database {
  if (!db) throw new Error('database.db not initialized');
  return db;
}

export { UPLOADS_DIR };
