import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic;
let prodDb: Database;
let labDb: Database;

const STORAGE_DIR = path.resolve(process.cwd(), 'storage');
const UPLOADS_DIR = path.resolve(STORAGE_DIR, 'uploads');
const PROD_DB_FILE = path.resolve(STORAGE_DIR, 'documentvault_production.sqlite');
const LAB_DB_FILE = path.resolve(STORAGE_DIR, 'sql_lab_isolated.sqlite');

// Ensure directories exist
if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export function saveProdDb() {
  if (prodDb) {
    const data = prodDb.export();
    fs.writeFileSync(PROD_DB_FILE, Buffer.from(data));
  }
}

export function saveLabDb() {
  if (labDb) {
    const data = labDb.export();
    fs.writeFileSync(LAB_DB_FILE, Buffer.from(data));
  }
}

export async function initDatabases() {
  if (!SQL) {
    SQL = await initSqlJs();
  }

  // 1. REAL PRODUCTION APPLICATION DATABASE
  // Stores real application users and legitimate metadata of uploaded documents.
  // CRITICAL SECURITY NOTE:
  // This database is strictly isolated from the educational SQL injection lab.
  // It uses parameterized queries exclusively.
  if (fs.existsSync(PROD_DB_FILE)) {
    const fileBuffer = fs.readFileSync(PROD_DB_FILE);
    prodDb = new SQL.Database(fileBuffer);
  } else {
    prodDb = new SQL.Database();
  }

  prodDb.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      original_filename TEXT NOT NULL,
      stored_filename TEXT NOT NULL,
      detected_mime_type TEXT NOT NULL,
      extension_claimed TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      upload_timestamp TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      upload_status TEXT NOT NULL,
      validation_details TEXT NOT NULL
    );
  `);

  // Seed default production users if empty
  const userCount = prodDb.exec('SELECT COUNT(*) as count FROM users');
  if (userCount.length === 0 || userCount[0].values[0][0] === 0) {
    prodDb.run(
      `INSERT INTO users (username, email, role, created_at) VALUES 
      ('sec_admin', 'security.admin@documentvault.internal', 'Lead Security Architect', datetime('now')),
      ('auditor_mike', 'm.vance@documentvault.internal', 'Senior Compliance Auditor', datetime('now')),
      ('dev_sarah', 's.chen@documentvault.internal', 'Backend Engineer', datetime('now'));`
    );
  }
  saveProdDb();

  // 2. ISOLATED SQL INJECTION LAB DATABASE
  // Contains ONLY synthetic, simulated educational records.
  // CRITICAL SECURITY BOUNDARY:
  // - This database has NO access to production tables, files, or environment secrets.
  // - Intentionally exposed only to the educational playground.
  if (fs.existsSync(LAB_DB_FILE)) {
    const fileBuffer = fs.readFileSync(LAB_DB_FILE);
    labDb = new SQL.Database(fileBuffer);
  } else {
    labDb = new SQL.Database();
  }

  labDb.run(`
    CREATE TABLE IF NOT EXISTS lab_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      category TEXT NOT NULL,
      file_type TEXT NOT NULL,
      security_classification TEXT NOT NULL,
      is_confidential INTEGER NOT NULL,
      upload_date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lab_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      fake_role TEXT NOT NULL,
      fake_password_hash TEXT NOT NULL,
      fake_api_token TEXT NOT NULL,
      account_notes TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS lab_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      performed_by TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      ip_address TEXT NOT NULL
    );
  `);

  // Reset & seed lab database with rich synthetic records if empty
  const labDocCount = labDb.exec('SELECT COUNT(*) as count FROM lab_documents');
  if (labDocCount.length === 0 || labDocCount[0].values[0][0] === 0) {
    labDb.run(`
      INSERT INTO lab_documents (title, author, category, file_type, security_classification, is_confidential, upload_date) VALUES 
      ('Q3_Financial_Audit_Report.pdf', 'Alice Smith', 'Finance', 'PDF', 'CONFIDENTIAL', 1, '2026-09-15 14:22:00'),
      ('Employee_Handbook_2026.docx', 'HR Department', 'Internal', 'DOCX', 'INTERNAL', 0, '2026-09-18 09:10:00'),
      ('Zero_Trust_Architecture_Roadmap.pptx', 'SecOps Core', 'Architecture', 'PPTX', 'RESTRICTED', 1, '2026-10-01 16:45:00'),
      ('Incident_Response_Playbook.txt', 'SOC Team', 'Security', 'TXT', 'INTERNAL', 0, '2026-10-05 11:30:00'),
      ('Data_Center_Topology_Diagram.png', 'Network Ops', 'Infrastructure', 'PNG', 'RESTRICTED', 1, '2026-10-10 13:15:00'),
      ('Executive_Compensation_Review.pdf', 'Board of Directors', 'Executive', 'PDF', 'TOP_SECRET', 1, '2026-10-12 18:00:00'),
      ('Vendor_Security_Assessment.docx', 'Risk Committee', 'Compliance', 'DOCX', 'CONFIDENTIAL', 1, '2026-10-14 10:20:00'),
      ('Customer_Privacy_Notice.pdf', 'Legal Council', 'Legal', 'PDF', 'PUBLIC', 0, '2026-10-15 08:30:00');

      INSERT INTO lab_users (username, email, fake_role, fake_password_hash, fake_api_token, account_notes) VALUES
      ('admin_synthetic', 'root@democorp.internal', 'SuperAdmin', '$2b$12$sYnThEt1cHaShDoNotUseInProd99482', 'demo_tok_admin_884920', 'Simulated lab administrator account'),
      ('alice_researcher', 'alice@cyberlab.synthetic', 'Security Researcher', '$2b$12$f4k3H4shStUd3nt411c398712345', 'demo_tok_user_772183', 'Authorized red-team test account'),
      ('bob_auditor', 'bob@auditcorp.synthetic', 'Compliance Officer', '$2b$12$b0b4n4lystF4k3H4sh456891234', 'demo_tok_user_339102', 'External simulated compliance auditor'),
      ('charlie_guest', 'charlie@guest.synthetic', 'Guest Viewer', '$2b$12$c4r0lAud1t0rF4k3H4sh7890123', 'demo_tok_user_112094', 'Restricted readonly lab user');

      INSERT INTO lab_audit_logs (action, performed_by, timestamp, ip_address) VALUES
      ('SIMULATED_LOGIN_SUCCESS', 'alice_researcher', '2026-10-20 10:00:12', '192.168.1.104'),
      ('DOCUMENT_VIEW', 'bob_auditor', '2026-10-20 10:14:55', '192.168.1.155'),
      ('QUERY_EXECUTE', 'admin_synthetic', '2026-10-20 10:45:20', '127.0.0.1');
    `);
    saveLabDb();
  }

  return { prodDb, labDb };
}

export function getProdDb(): Database {
  if (!prodDb) throw new Error('Production database not initialized');
  return prodDb;
}

export function getLabDb(): Database {
  if (!labDb) throw new Error('Lab database not initialized');
  return labDb;
}

export { STORAGE_DIR, UPLOADS_DIR };
