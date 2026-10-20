import React, { useState } from 'react';
import {
  ShieldCheck,
  FileCode,
  Database,
  Lock,
  Layers,
  CheckCircle2,
  XCircle,
  Terminal,
  Code,
  Download,
  Copy,
  Check,
} from 'lucide-react';
import { SECURITY_COMPARISONS } from '../../lib/constants.ts';

export const SecurityReportView: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const vulnerableUploadCode = `// ❌ INSECURE FILE VALIDATION (Extension-only or client MIME)
app.post('/upload', upload.single('file'), (req, res) => {
  const ext = path.extname(req.file.originalname).toLowerCase();
  
  // FLAW: Relies strictly on user-supplied filename!
  // If an attacker renames malicious.py -> document.pdf, it passes!
  if (['.pdf', '.png', '.jpg'].includes(ext)) {
    // FLAW: Saves directly with original name into web-accessible folder
    fs.writeFileSync(path.join(__dirname, 'public/uploads', req.file.originalname), req.file.buffer);
    return res.send("File saved!");
  }
  res.status(400).send("Invalid extension");
});`;

  const secureUploadCode = `// ✅ SECURE FILE VALIDATION (DocumentVault Magic-Byte Engine)
app.post('/upload', upload.single('file'), (req, res) => {
  const buffer = req.file.buffer;
  
  // 1. Read actual raw bytes / magic numbers in memory
  const report = inspectFileBytes(buffer, req.file.originalname, req.file.mimetype);
  
  if (!report.isValid) {
    // Halt immediately; never write spoofed bytes to disk
    return res.status(400).json({ error: "Discrepancy detected", report });
  }

  // 2. Generate random UUID; discard original filename as path
  const uuidFilename = \`\${crypto.randomUUID()}.bin\`;
  const storagePath = path.join(STORAGE_DIR, uuidFilename);

  // 3. Store outside webroot with non-executable permissions (0644)
  fs.writeFileSync(storagePath, buffer, { mode: 0o644 });

  // 4. Log metadata strictly via parameterized SQL
  db.run("INSERT INTO documents (id, original_name, stored_name) VALUES (?, ?, ?)",
    [uuid, req.file.originalname, uuidFilename]
  );
});`;

  const vulnerableSqlCode = `// ❌ INSECURE SQL QUERY (String Concatenation)
app.post('/search', (req, res) => {
  const userInput = req.body.query;
  
  // FLAW: Concatenates untrusted string into SQL grammar
  // Payload: ' OR '1'='1 -- alters query logic completely!
  const query = "SELECT * FROM docs WHERE title LIKE '%" + userInput + "%';";
  
  const results = db.raw(query); // Attacker controls SQL execution tree
  res.json(results);
});`;

  const secureSqlCode = `// ✅ SECURE SQL QUERY (Parameterized Prepared Statement)
app.post('/search', (req, res) => {
  const userInput = req.body.query;
  
  // 1. Fixed SQL template compiled BEFORE receiving user data
  const stmt = db.prepare("SELECT * FROM docs WHERE title LIKE ? OR category LIKE ?;");
  
  // 2. Bind parameter passed strictly as literal string data
  // Quotes or UNION inside userInput have zero syntactic effect
  const results = stmt.all(\`%\${userInput}%\`, \`%\${userInput}%\`);
  
  res.json(results);
});`;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-500" />
              <span>Comprehensive Security Audit & Architecture Report</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Complete technical documentation of vulnerabilities, defense mechanisms, and isolated sandbox boundaries
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 font-semibold">
              OWASP A03 / A01 MITIGATED
            </span>
          </div>
        </div>
      </div>

      {/* Section 8: Security Comparison Dashboard Cards */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-500" />
            <span>File Upload Security Principles (Section 8 Matrix)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Detailed contrast between vulnerable implementations and DocumentVault defenses
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SECURITY_COMPARISONS.fileUpload.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {item.principle}
                </h3>

                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
                    <span className="font-semibold block text-[11px] uppercase mb-0.5 text-rose-600 dark:text-rose-400">
                      Insecure Approach:
                    </span>
                    <span className="leading-relaxed">{item.insecure}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="font-semibold block text-[11px] uppercase mb-0.5 text-emerald-600 dark:text-emerald-400">
                      DocumentVault Defense:
                    </span>
                    <span className="leading-relaxed">{item.secure}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                Mitigation: {item.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SQL Security Matrix */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" />
            <span>SQL Injection Security Principles (Section 8 Matrix)</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Defending relational queries through structural separation of code and data
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {SECURITY_COMPARISONS.sqlSecurity.map((item, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
            >
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {item.principle}
                </h3>

                <div className="mt-2.5 space-y-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border border-rose-100 dark:border-rose-900/40">
                    <span className="font-semibold block text-[11px] uppercase mb-0.5 text-rose-600 dark:text-rose-400">
                      Insecure Approach:
                    </span>
                    <span className="leading-relaxed">{item.insecure}</span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/40">
                    <span className="font-semibold block text-[11px] uppercase mb-0.5 text-emerald-600 dark:text-emerald-400">
                      DocumentVault Defense:
                    </span>
                    <span className="leading-relaxed">{item.secure}</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800 font-mono">
                Mitigation: {item.mitigation}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Code Side-by-Side Reference */}
      <div className="space-y-6 pt-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-sky-500" />
            <span>Implementation Code Diffs</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Exact side-by-side code snippets highlighting insecure patterns vs production defenses
          </p>
        </div>

        {/* File Upload Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-950 rounded-xl overflow-hidden border border-rose-900/40 shadow-xs">
            <div className="p-3 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-rose-400">Insecure File Upload Handler</span>
              <button
                onClick={() => handleCopyCode(vulnerableUploadCode, 'vuln-up')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'vuln-up' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">Copy</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{vulnerableUploadCode}</code>
            </pre>
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden border border-emerald-900/40 shadow-xs">
            <div className="p-3 bg-emerald-950/40 border-b border-emerald-900/40 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-emerald-400">DocumentVault Secure Handler</span>
              <button
                onClick={() => handleCopyCode(secureUploadCode, 'sec-up')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'sec-up' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">Copy</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{secureUploadCode}</code>
            </pre>
          </div>
        </div>

        {/* SQL Injection Comparison */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-950 rounded-xl overflow-hidden border border-rose-900/40 shadow-xs">
            <div className="p-3 bg-rose-950/40 border-b border-rose-900/40 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-rose-400">Insecure Concatenated Query</span>
              <button
                onClick={() => handleCopyCode(vulnerableSqlCode, 'vuln-sql')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'vuln-sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">Copy</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-slate-300 overflow-x-auto leading-relaxed">
              <code>{vulnerableSqlCode}</code>
            </pre>
          </div>

          <div className="bg-slate-950 rounded-xl overflow-hidden border border-emerald-900/40 shadow-xs">
            <div className="p-3 bg-emerald-950/40 border-b border-emerald-900/40 flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-emerald-400">Secure Parameterized Statement</span>
              <button
                onClick={() => handleCopyCode(secureSqlCode, 'sec-sql')}
                className="text-slate-400 hover:text-white flex items-center gap-1"
              >
                {copiedSection === 'sec-sql' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="text-[10px]">Copy</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
              <code>{secureSqlCode}</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Architecture & Isolation Boundary Documentation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Layers className="w-5 h-5 text-purple-500" />
          <span>Architecture & Sandboxing Boundaries</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              1. Physical Database Segregation
            </h3>
            <p>
              The application instantiates two entirely independent SQLite databases:
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
              <li>
                <strong className="text-emerald-600">documentvault_production.sqlite:</strong> Holds authentic users and verified document records. Always parameterized.
              </li>
              <li>
                <strong className="text-amber-600">sql_lab_isolated.sqlite:</strong> Holds only synthetic mock tables (lab_documents, lab_users, lab_audit_logs). This database is the sole target of the vulnerable playground.
              </li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="font-semibold text-slate-900 dark:text-white">
              2. Non-Executable Storage Architecture
            </h3>
            <p>
              Uploaded files are never placed inside the web root, client assets, or source code directories.
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px]">
              <li>Storage directory: <code className="text-slate-900 dark:text-white font-bold">storage/uploads/</code></li>
              <li>Filename mapping: <code className="text-slate-900 dark:text-white font-bold">uuidv4().bin</code></li>
              <li>Permissions: <code className="text-slate-900 dark:text-white font-bold">0o644 (Non-executable)</code></li>
              <li>Serving header: <code className="text-slate-900 dark:text-white font-bold">Content-Disposition: attachment; X-Content-Type-Options: nosniff</code></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Setup & Local Deployment Guide */}
      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl p-6 text-xs text-slate-600 dark:text-slate-300 space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-500" />
          <span>Local Deployment & Single-Process Setup</span>
        </h3>
        <p>
          DocumentVault Security Lab is fully self-contained in Node.js/TypeScript using Express and WebAssembly SQLite.
        </p>
        <div className="p-3 bg-slate-950 text-emerald-400 font-mono rounded-lg border border-slate-800 text-xs">
          <div># 1. Install dependencies</div>
          <div className="text-white">npm install</div>
          <div className="mt-2 text-slate-500"># 2. Build frontend assets</div>
          <div className="text-white">npm run build</div>
          <div className="mt-2 text-slate-500"># 3. Start unified Express + SQLite server</div>
          <div className="text-white">npm start</div>
        </div>
      </div>
    </div>
  );
};
