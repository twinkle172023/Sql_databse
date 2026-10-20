import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import {
  getLabDb,
  getProdDb,
  initDatabases,
  saveLabDb,
  saveProdDb,
  UPLOADS_DIR,
} from './server/db.ts';
import { inspectFileBytes } from './server/fileValidator.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Setup in-memory multer so uploaded files are analyzed before disk storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Preset files for Educational Malicious File Upload Lab
const SAMPLE_PRESETS: Record<
  string,
  { filename: string; mime: string; content: Buffer; description: string; expectedVerdict: 'ACCEPTED' | 'REJECTED' }
> = {
  python_as_pdf: {
    filename: 'document.pdf',
    mime: 'application/pdf',
    content: Buffer.from(
      `#!/usr/bin/env python3\n# Simulated harmless payload\nimport sys\nimport os\n\nprint("This is a simulated malicious file")\nprint("Security risk: Server executed untrusted Python script masquerading as PDF!")\n`
    ),
    description: 'Python script disguised with .pdf extension. Fails magic byte check.',
    expectedVerdict: 'REJECTED',
  },
  bash_as_png: {
    filename: 'invoice_receipt.png',
    mime: 'image/png',
    content: Buffer.from(
      `#!/bin/bash\n# Simulated bash reverse shell\necho "Simulated Malicious Payload: Executing /bin/bash"\necho "Insecure system attempted to execute uploaded image via shell!"\n`
    ),
    description: 'Unix shell script disguised with .png extension. Fails PNG header signature.',
    expectedVerdict: 'REJECTED',
  },
  php_as_jpg: {
    filename: 'user_avatar.jpg',
    mime: 'image/jpeg',
    content: Buffer.from(
      `<?php\n// Simulated webshell\necho "Simulated Webshell: phpinfo();";\n$cmd = $_GET['cmd'] ?? 'id';\nsystem($cmd);\n?>`
    ),
    description: 'PHP webshell script disguised as a JPEG image. Fails JPEG SOI marker.',
    expectedVerdict: 'REJECTED',
  },
  windows_pe_as_txt: {
    filename: 'confidential_notes.txt',
    mime: 'text/plain',
    content: Buffer.concat([
      Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0xff, 0xff]),
      Buffer.from('This program cannot be run in DOS mode. Simulated PE32 binary payload.'),
    ]),
    description: 'Windows PE32 executable binary disguised as a text file.',
    expectedVerdict: 'REJECTED',
  },
  genuine_pdf: {
    filename: 'quarterly_report_2026.pdf',
    mime: 'application/pdf',
    content: Buffer.from(
      `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 18 Tf 50 700 Td (DocumentVault Verified Safe PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000204 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n310\n%%EOF`
    ),
    description: 'Authentic PDF file starting with valid %PDF- magic bytes and valid PDF catalog stream.',
    expectedVerdict: 'ACCEPTED',
  },
  genuine_png: {
    filename: 'company_logo.png',
    mime: 'image/png',
    content: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
      0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
      0x42, 0x60, 0x82,
    ]),
    description: 'Authentic 1x1 PNG image with standard 8-byte PNG header and IHDR/IDAT/IEND chunks.',
    expectedVerdict: 'ACCEPTED',
  },
  genuine_txt: {
    filename: 'project_notes.txt',
    mime: 'text/plain',
    content: Buffer.from(
      `DocumentVault Security Lab System Documentation\n\nSecurity Architecture:\n- Strict magic-byte file signature validation.\n- Isolated synthetic SQLite database for educational SQLi tests.\n- Non-executable storage outside webroot.\n`
    ),
    description: 'Clean UTF-8 plain text file without binary control codes or executable scripts.',
    expectedVerdict: 'ACCEPTED',
  },
};

// =========================================================================
// 1. HEALTH & METRICS API
// =========================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    environment: 'DocumentVault Security Lab (Full-Stack Express + SQLite)',
    activeProtections: [
      'Magic-Byte Deep Content Inspection',
      'UUID Randomized Non-Executable Storage',
      'Strict Type Discrepancy Gate',
      'Isolated Synthetic SQL Injection Sandbox',
      'Parameterized Database Layer',
    ],
  });
});

// =========================================================================
// 2. PRODUCTION DOCUMENT MANAGEMENT APIS
// =========================================================================

// List uploaded production documents
app.get('/api/documents', (_req: Request, res: Response) => {
  try {
    const prodDb = getProdDb();
    const result = prodDb.exec(`
      SELECT 
        id, original_filename, stored_filename, detected_mime_type, 
        extension_claimed, file_size, upload_timestamp, storage_path, 
        upload_status, validation_details
      FROM documents 
      ORDER BY upload_timestamp DESC
    `);

    if (result.length === 0) {
      return res.json({ documents: [] });
    }

    const columns = result[0].columns;
    const documents = result[0].values.map((row) => {
      const doc: Record<string, any> = {};
      columns.forEach((col, idx) => {
        if (col === 'validation_details') {
          try {
            doc[col] = JSON.parse(row[idx] as string);
          } catch {
            doc[col] = row[idx];
          }
        } else {
          doc[col] = row[idx];
        }
      });
      return doc;
    });

    res.json({ documents });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch documents', details: error.message });
  }
});

// Secure Document Upload Endpoint
app.post('/api/documents/upload', upload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided in multipart request' });
    }

    const originalFilename = file.originalname || 'unnamed_upload';
    const clientMime = file.mimetype || 'application/octet-stream';
    const buffer = file.buffer;

    // 1. Run Deep Content / Magic Byte Inspection
    const report = inspectFileBytes(buffer, originalFilename, clientMime);

    const docId = crypto.randomUUID();
    const uploadTimestamp = new Date().toISOString();
    const prodDb = getProdDb();

    if (!report.isValid) {
      // Security Failure: File failed magic-byte / content inspection!
      // Do NOT save to disk. Record the attempted rejection for security audit.
      prodDb.run(
        `INSERT INTO documents (
          id, original_filename, stored_filename, detected_mime_type,
          extension_claimed, file_size, upload_timestamp, storage_path,
          upload_status, validation_details
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          docId,
          originalFilename,
          'NOT_STORED_REJECTED',
          report.detectedMime,
          report.claimedExtension,
          file.size,
          uploadTimestamp,
          'NONE (BLOCKED_BEFORE_STORAGE)',
          'REJECTED',
          JSON.stringify(report),
        ]
      );
      saveProdDb();

      return res.status(400).json({
        success: false,
        message: `File rejected: Content discrepancy detected (${report.claimedExtension} claims vs ${report.detectedType} detected).`,
        report,
        documentRecord: {
          id: docId,
          original_filename: originalFilename,
          stored_filename: 'NOT_STORED_REJECTED',
          detected_mime_type: report.detectedMime,
          extension_claimed: report.claimedExtension,
          file_size: file.size,
          upload_timestamp: uploadTimestamp,
          storage_path: 'BLOCKED',
          upload_status: 'REJECTED',
          validation_details: report,
        },
      });
    }

    // 2. File is Valid & Genuine!
    // Store in designated non-executable storage outside webroot with UUID filename.
    const safeStoredFilename = `${docId}.bin`;
    const safeStoragePath = path.join(UPLOADS_DIR, safeStoredFilename);

    // Write file with non-executable permissions (0o644)
    fs.writeFileSync(safeStoragePath, buffer, { mode: 0o644 });

    // Store in production database using parameterized query
    prodDb.run(
      `INSERT INTO documents (
        id, original_filename, stored_filename, detected_mime_type,
        extension_claimed, file_size, upload_timestamp, storage_path,
        upload_status, validation_details
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        docId,
        originalFilename,
        safeStoredFilename,
        report.detectedMime,
        report.claimedExtension,
        file.size,
        uploadTimestamp,
        safeStoragePath,
        'ACCEPTED',
        JSON.stringify(report),
      ]
    );
    saveProdDb();

    res.status(201).json({
      success: true,
      message: 'File successfully inspected, verified, and stored with UUID in safe storage.',
      report,
      document: {
        id: docId,
        original_filename: originalFilename,
        stored_filename: safeStoredFilename,
        detected_mime_type: report.detectedMime,
        extension_claimed: report.claimedExtension,
        file_size: file.size,
        upload_timestamp: uploadTimestamp,
        storage_path: safeStoragePath,
        upload_status: 'ACCEPTED',
        validation_details: report,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Upload failed', details: error.message });
  }
});

// Delete uploaded demo document
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const prodDb = getProdDb();

    // Check document
    const stmt = prodDb.prepare('SELECT stored_filename, storage_path FROM documents WHERE id = ?');
    stmt.bind([docId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      const storagePath = row.storage_path as string;

      // Remove physical file if it exists
      if (storagePath && fs.existsSync(storagePath)) {
        try {
          fs.unlinkSync(storagePath);
        } catch (e) {
          console.error('Failed to delete file from disk:', e);
        }
      }

      prodDb.run('DELETE FROM documents WHERE id = ?', [docId]);
      saveProdDb();
      stmt.free();

      return res.json({ success: true, message: `Document ${docId} deleted successfully.` });
    }
    stmt.free();

    res.status(404).json({ error: 'Document not found' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete document', details: error.message });
  }
});

// Safe download document (Forces attachment, nosniff, non-executable content-type)
app.get('/api/documents/:id/download', (req: Request, res: Response) => {
  try {
    const docId = req.params.id;
    const prodDb = getProdDb();

    const stmt = prodDb.prepare('SELECT original_filename, stored_filename, storage_path, detected_mime_type FROM documents WHERE id = ?');
    stmt.bind([docId]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();

      const storagePath = row.storage_path as string;
      const originalFilename = row.original_filename as string;
      const detectedMime = row.detected_mime_type as string;

      if (!storagePath || !fs.existsSync(storagePath)) {
        return res.status(404).json({ error: 'Physical file not found on disk (may have been rejected or cleaned).' });
      }

      const fileBuffer = fs.readFileSync(storagePath);

      // Enforce secure download headers
      res.setHeader('Content-Type', detectedMime || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'");

      return res.send(fileBuffer);
    }
    stmt.free();
    res.status(404).json({ error: 'Document record not found' });
  } catch (error: any) {
    res.status(500).json({ error: 'Download failed', details: error.message });
  }
});

// =========================================================================
// 3. MALICIOUS FILE UPLOAD LAB & INSPECT-ONLY APIS
// =========================================================================

// Educational inspection endpoint (inspects file buffer without persisting)
app.post('/api/lab/inspect-file', upload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided for inspection' });
    }

    const report = inspectFileBytes(file.buffer, file.originalname, file.mimetype);
    res.json({
      originalFilename: file.originalname,
      fileSize: file.size,
      report,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Inspection failed', details: error.message });
  }
});

// Get preset demo files for quick simulation testing
app.get('/api/lab/presets', (_req: Request, res: Response) => {
  const presets = Object.entries(SAMPLE_PRESETS).map(([key, val]) => ({
    id: key,
    filename: val.filename,
    claimedMime: val.mime,
    size: val.content.length,
    description: val.description,
    expectedVerdict: val.expectedVerdict,
  }));
  res.json({ presets });
});

// Run inspection on a preset sample
app.post('/api/lab/test-preset/:id', (req: Request, res: Response) => {
  const presetKey = req.params.id;
  const sample = SAMPLE_PRESETS[presetKey];

  if (!sample) {
    return res.status(404).json({ error: `Preset "${presetKey}" not found.` });
  }

  const report = inspectFileBytes(sample.content, sample.filename, sample.mime);
  res.json({
    presetId: presetKey,
    filename: sample.filename,
    description: sample.description,
    fileSize: sample.content.length,
    report,
  });
});

// Custom raw text payload tester
app.post('/api/lab/test-custom-content', (req: Request, res: Response) => {
  const { filename, contentText, claimedMime } = req.body;
  if (!filename || contentText === undefined) {
    return res.status(400).json({ error: 'filename and contentText are required' });
  }

  const buffer = Buffer.from(contentText, 'utf8');
  const report = inspectFileBytes(buffer, filename, claimedMime || 'application/octet-stream');

  res.json({
    filename,
    fileSize: buffer.length,
    report,
  });
});

// =========================================================================
// 4. SQL INJECTION PLAYGROUND (ISOLATED LAB DATABASE ONLY)
// =========================================================================

/**
 * Endpoint A: Intentionally Vulnerable SQL Endpoint
 *
 * CRITICAL EDUCATIONAL SECURITY BOUNDARY:
 * - This endpoint connects ONLY to the isolated SQL Injection Lab Database (sql_lab_isolated.sqlite).
 * - Contains ONLY synthetic records (lab_documents, lab_users, lab_audit_logs).
 * - Has ZERO access to the real production database, real uploaded documents,
 *   environment variables, or filesystem.
 * - Concatenates user input directly into SQL statement for educational demonstration.
 */
app.post('/api/sql-lab/vulnerable-search', (req: Request, res: Response) => {
  const startTime = performance.now();
  const userInput = req.body.query !== undefined ? String(req.body.query) : '';
  const labDb = getLabDb();

  // Intentionally vulnerable string concatenation:
  // e.g.: SELECT * FROM lab_documents WHERE title LIKE '%input%' OR category LIKE '%input%';
  const vulnerableSql = `SELECT id, title, author, category, file_type, security_classification, is_confidential, upload_date FROM lab_documents WHERE title LIKE '%${userInput}%' OR category LIKE '%${userInput}%';`;

  try {
    const rawResult = labDb.exec(vulnerableSql);
    const duration = Math.round((performance.now() - startTime) * 100) / 100;

    let rows: Record<string, any>[] = [];
    let columns: string[] = [];

    if (rawResult.length > 0) {
      columns = rawResult[0].columns;
      rows = rawResult[0].values.map((valArr) => {
        const obj: Record<string, any> = {};
        columns.forEach((c, idx) => {
          obj[c] = valArr[idx];
        });
        return obj;
      });
    }

    // Detect if SQL Injection succeeded
    // Indications:
    // 1. Returned more records than normal search / all records when search should have been specific.
    // 2. Columns or data from other synthetic tables leaked (e.g. lab_users fake password hashes or tokens).
    // 3. User entered standard injection patterns (OR 1=1, UNION SELECT, etc.)
    const hasUnion = /union\s+select/i.test(userInput);
    const hasTautology = /(or\s+['"]?1['"]?\s*=\s*['"]?1|or\s+true\b)/i.test(userInput);
    const leakedUserAccounts = rows.filter(
      (r) =>
        r.fake_password_hash !== undefined ||
        r.fake_api_token !== undefined ||
        (r.author && String(r.author).includes('$2b$')) ||
        (r.category && String(r.category).includes('$2b$')) ||
        (r.title && String(r.title).includes('SuperAdmin'))
    );

    const isInjectionSuccessful = hasUnion || hasTautology || leakedUserAccounts.length > 0 || (rows.length >= 8 && userInput.length > 0);

    res.json({
      success: true,
      mode: 'VULNERABLE',
      executedSql: vulnerableSql,
      userInput,
      durationMs: duration,
      rowCount: rows.length,
      columns,
      results: rows,
      injectionDetected: isInjectionSuccessful,
      analysis: {
        vulnerability: 'SQL Injection via Unsanitized String Concatenation',
        explanation: 'User input was concatenated directly into the SQL query string. The database parser interpreted payload tokens as SQL control syntax rather than literal data.',
        risk: 'HIGH (In a production system, this allows authentication bypass, full table dumping, and data destruction).',
      },
      simulatedCompromise: isInjectionSuccessful
        ? {
            status: 'SQL injection demonstrated successfully.',
            banner: 'SIMULATED DATA — NOT PRODUCTION DATA',
            message: 'Attacker payload successfully altered SQL execution logic in the isolated lab database.',
            leakedSyntheticTables: hasUnion ? ['lab_users (Synthetic)', 'lab_documents (Synthetic)'] : ['lab_documents (Synthetic - all records dumped)'],
            exposedSyntheticCount: rows.length,
            notExposedNotice: [
              'Production Application Database (Untouched & Isolated)',
              'Real Uploaded Documents (Stored in separate secure filesystem with UUID)',
              'Application Environment Variables & Cloud Secrets (Completely inlined/isolated)',
              'Server Operating System & Shell (No OS command execution)',
            ],
          }
        : null,
    });
  } catch (error: any) {
    const duration = Math.round((performance.now() - startTime) * 100) / 100;
    // Verbose database error returned - demonstrating error-based SQL injection!
    res.status(200).json({
      success: false,
      mode: 'VULNERABLE',
      executedSql: vulnerableSql,
      userInput,
      durationMs: duration,
      error: error.message,
      analysis: {
        vulnerability: 'SQL Error Disclosure / Syntax Error',
        explanation: `The raw SQLite parser threw an unhandled syntax error: "${error.message}". In a vulnerable application, this leaks database dialect and schema information to attackers.`,
      },
      simulatedCompromise: null,
    });
  }
});

/**
 * Endpoint B: Secure Parameterized SQL Endpoint
 *
 * SECURE IMPLEMENTATION:
 * - Uses parameterized SQL prepared statement with bind parameters (`?`).
 * - Treats user input strictly as literal data, never as executable SQL commands.
 * - Even if input is `' OR '1'='1` or `' UNION SELECT ...`, it is treated as a plain literal string.
 */
app.post('/api/sql-lab/secure-search', (req: Request, res: Response) => {
  const startTime = performance.now();
  const userInput = req.body.query !== undefined ? String(req.body.query) : '';
  const labDb = getLabDb();

  const preparedSql = `SELECT id, title, author, category, file_type, security_classification, is_confidential, upload_date FROM lab_documents WHERE title LIKE ? OR category LIKE ?;`;
  const paramBinding = `%${userInput}%`;

  try {
    const stmt = labDb.prepare(preparedSql);
    stmt.bind([paramBinding, paramBinding]);

    const rows: Record<string, any>[] = [];
    let columns: string[] = [];

    while (stmt.step()) {
      const row = stmt.getAsObject();
      if (columns.length === 0) {
        columns = Object.keys(row);
      }
      rows.push(row);
    }
    stmt.free();

    const duration = Math.round((performance.now() - startTime) * 100) / 100;

    res.json({
      success: true,
      mode: 'SECURE',
      preparedSqlTemplate: preparedSql,
      boundParameters: [paramBinding, paramBinding],
      userInput,
      durationMs: duration,
      rowCount: rows.length,
      columns,
      results: rows,
      injectionDetected: false,
      analysis: {
        defense: 'Parameterized Prepared Statements',
        explanation: 'User input was supplied strictly as a bound parameter. The database pre-compiles the query tree first, so payload characters are treated strictly as literal string values.',
        result: 'IMMUNE to SQL Injection. Quotes and UNION operators have no syntactic effect.',
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Secure query execution error', details: error.message });
  }
});

// View all synthetic lab database tables for educational inspection
app.get('/api/sql-lab/schema', (_req: Request, res: Response) => {
  try {
    const labDb = getLabDb();

    // Query lab tables
    const docs = labDb.exec('SELECT * FROM lab_documents');
    const users = labDb.exec('SELECT id, username, email, fake_role, fake_password_hash, fake_api_token, account_notes FROM lab_users');
    const logs = labDb.exec('SELECT * FROM lab_audit_logs');

    const formatResult = (resArr: any[]) => {
      if (resArr.length === 0) return [];
      const cols = resArr[0].columns;
      return resArr[0].values.map((v: any[]) => {
        const obj: any = {};
        cols.forEach((c: string, idx: number) => {
          obj[c] = v[idx];
        });
        return obj;
      });
    };

    res.json({
      labNotice: 'SIMULATED DATA — NOT PRODUCTION DATA',
      tables: {
        lab_documents: formatResult(docs),
        lab_users: formatResult(users),
        lab_audit_logs: formatResult(logs),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to inspect lab schema', details: error.message });
  }
});

// Reset synthetic lab database back to pristine initial state
app.post('/api/sql-lab/reset', async (_req: Request, res: Response) => {
  try {
    const LAB_DB_FILE = path.resolve(process.cwd(), 'storage', 'sql_lab_isolated.sqlite');
    if (fs.existsSync(LAB_DB_FILE)) {
      fs.unlinkSync(LAB_DB_FILE);
    }
    await initDatabases();
    res.json({ success: true, message: 'Isolated SQL Injection Lab database reset to initial synthetic state.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to reset lab database', details: error.message });
  }
});

// =========================================================================
// 5. SERVER BOOTSTRAP & VITE MIDDLEWARE INTEGRATION
// =========================================================================
async function startServer() {
  await initDatabases();
  console.log('[DocumentVault] SQLite databases initialized (Production & Isolated Lab).');

  if (process.env.NODE_ENV === 'production') {
    // In production, serve built frontend from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  } else {
    // In development, mount Vite dev server middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DocumentVault Security Lab] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[DocumentVault] Server initialization failed:', err);
  process.exit(1);
});
