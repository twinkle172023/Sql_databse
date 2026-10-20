import express, { Request, Response } from 'express';
import multer from 'multer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { getDb, initDatabases, saveDb, UPLOADS_DIR } from './server/db.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.doc', '.docx', '.ppt', '.pptx',
  '.txt', '.jpg', '.jpeg', '.png'
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

// Enable CORS
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  if (_req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static templates folder directly if accessed
app.use('/static', express.static(path.resolve(__dirname, 'static')));

// Upload endpoint
app.post('/api/upload', upload.single('file'), (req: Request, res: Response) => {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ success: false, error: 'No file provided' });
  }

  const originalFilename = file.originalname || 'document.bin';
  const ext = path.extname(originalFilename).toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return res.status(400).json({
      success: false,
      error: `File type not permitted. Allowed: ${Array.from(ALLOWED_EXTENSIONS).join(', ')}`
    });
  }

  const storedFilename = `${crypto.randomUUID().slice(0, 12)}_${originalFilename}`;
  const filePath = path.join(UPLOADS_DIR, storedFilename);

  // Store file inertly (never execute)
  fs.writeFileSync(filePath, file.buffer, { mode: 0o644 });

  const db = getDb();
  const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

  db.run(
    `INSERT INTO documents (filename, original_filename, file_extension, file_size, upload_date, file_path)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [storedFilename, originalFilename, ext, file.size, timestamp, filePath]
  );
  saveDb();

  const idRes = db.exec('SELECT last_insert_rowid() as id');
  const docId = idRes.length > 0 ? idRes[0].values[0][0] : 1;

  res.status(201).json({
    success: true,
    message: `File '${originalFilename}' successfully stored in database. Stored safely as inert data.`,
    document: {
      id: docId,
      filename: storedFilename,
      original_filename: originalFilename,
      file_extension: ext,
      file_size: file.size,
      upload_date: timestamp
    }
  });
});

// List documents endpoint
app.get('/api/documents', (_req: Request, res: Response) => {
  const db = getDb();
  const result = db.exec(`
    SELECT id, filename, original_filename, file_extension, file_size, upload_date
    FROM documents ORDER BY id DESC;
  `);

  if (result.length === 0) {
    return res.json({ documents: [] });
  }

  const cols = result[0].columns;
  const documents = result[0].values.map((row) => {
    const doc: Record<string, any> = {};
    cols.forEach((c, idx) => {
      doc[c] = row[idx];
    });
    return doc;
  });

  res.json({ documents });
});

// Download endpoint
app.get('/api/download/:id', (req: Request, res: Response) => {
  const docId = parseInt(req.params.id, 10);
  const db = getDb();

  const stmt = db.prepare('SELECT filename, original_filename, file_path FROM documents WHERE id = ?;');
  stmt.bind([docId]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();

    const filePath = row.file_path as string;
    const originalFilename = row.original_filename as string;

    if (filePath && fs.existsSync(filePath)) {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);
      return res.sendFile(filePath);
    }
  } else {
    stmt.free();
  }

  res.status(404).send('File not found');
});

// SQL Execution endpoint (Vulnerable vs Secure)
app.post('/api/execute-sql', (req: Request, res: Response) => {
  const userInput = req.body.username !== undefined ? String(req.body.username) : '';
  const mode = req.body.mode || 'vulnerable';
  const db = getDb();

  if (mode === 'vulnerable') {
    // INTENTIONALLY VULNERABLE: Direct string concatenation
    const generatedSql = `SELECT id, username, role FROM users WHERE username = '${userInput}';`;

    try {
      const rawResult = db.exec(generatedSql);
      let rows: Record<string, any>[] = [];

      if (rawResult.length > 0) {
        const cols = rawResult[0].columns;
        rows = rawResult[0].values.map((valArr) => {
          const obj: Record<string, any> = {};
          cols.forEach((c, idx) => {
            obj[c] = valArr[idx];
          });
          return obj;
        });
      }

      const isVulnerable = rows.length > 1 || userInput.toUpperCase().includes("' OR") || userInput.toUpperCase().includes("' UNION");

      res.json({
        success: true,
        mode: 'Vulnerable (String Concatenation)',
        generated_sql: generatedSql,
        user_input: userInput,
        results: rows,
        row_count: rows.length,
        is_vulnerable: isVulnerable,
        status_message: isVulnerable
          ? 'SQL Injection vulnerability demonstrated.'
          : 'Normal query execution.'
      });
    } catch (error: any) {
      res.json({
        success: false,
        mode: 'Vulnerable (String Concatenation)',
        generated_sql: generatedSql,
        user_input: userInput,
        error: error.message,
        status_message: `SQL Syntax Error: ${error.message} (Compiler can analyze this syntax mutation)`
      });
    }
  } else {
    // SECURE: Parameterized prepared statement with ?
    const generatedSql = 'SELECT id, username, role FROM users WHERE username = ?;';

    try {
      const stmt = db.prepare(generatedSql);
      stmt.bind([userInput]);

      const rows: Record<string, any>[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();

      res.json({
        success: true,
        mode: 'Parameterized Query — Secure',
        generated_sql: generatedSql,
        bound_parameter: userInput,
        user_input: userInput,
        results: rows,
        row_count: rows.length,
        is_vulnerable: false,
        status_message: 'Parameterized Query — Secure. Input is treated strictly as literal data.'
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Export query text endpoint
app.get('/export-query', (req: Request, res: Response) => {
  const sql = req.query.sql ? String(req.query.sql) : "SELECT id, username, role FROM users WHERE username = '' OR '1'='1';";
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', 'attachment; filename="generated_query.txt"');
  res.send(sql);
});

async function startServer() {
  await initDatabases();
  console.log('[Document Vault] SQLite database.db initialized.');

  if (process.env.NODE_ENV === 'production') {
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Document Vault] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Document Vault] Server error:', err);
  process.exit(1);
});
