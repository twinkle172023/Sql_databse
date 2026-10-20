import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  AlertTriangle,
  Database,
  Code,
  Copy,
  Check,
  CheckCircle2,
  XCircle,
  FileDown,
  Layers,
  Terminal,
} from 'lucide-react';

interface DocumentRecord {
  id: number;
  filename: string;
  original_filename: string;
  file_extension: string;
  file_size: number;
  upload_date: string;
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'upload' | 'documents' | 'sql-lab' | 'compiler-demo'>('home');
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'success' | 'error' | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // SQL Lab state
  const [usernameInput, setUsernameInput] = useState<string>("' OR '1'='1");
  const [generatedSql, setGeneratedSql] = useState<string>("SELECT id, username, role FROM users WHERE username = '' OR '1'='1';");
  const [vulnResult, setVulnResult] = useState<any | null>(null);
  const [secureResult, setSecureResult] = useState<any | null>(null);
  const [loadingSql, setLoadingSql] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
    executeBothQueries("' OR '1'='1");
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    setUploading(true);
    setUploadMessage(null);
    setUploadStatus(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setUploadMessage(data.message || 'File uploaded successfully.');
        setUploadStatus('success');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchDocuments();
      } else {
        setUploadMessage(data.error || 'Upload rejected.');
        setUploadStatus('error');
      }
    } catch (err: any) {
      setUploadMessage(`Error: ${err.message}`);
      setUploadStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const executeBothQueries = async (query = usernameInput) => {
    setLoadingSql(true);
    try {
      const [vRes, sRes] = await Promise.all([
        fetch('/api/execute-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: query, mode: 'vulnerable' }),
        }).then((r) => r.json()),
        fetch('/api/execute-sql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: query, mode: 'secure' }),
        }).then((r) => r.json()),
      ]);

      setVulnResult(vRes);
      setSecureResult(sRes);
      if (vRes?.generated_sql) {
        setGeneratedSql(vRes.generated_sql);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSql(false);
    }
  };

  const handleCopyQuery = () => {
    navigator.clipboard.writeText(generatedSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatSize = (bytes: number) => {
    if (isNaN(bytes) || bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentPage('home')}>
            <span className="bg-slate-900 text-white text-xs font-bold px-2 py-1 rounded">SQL</span>
            <span className="font-bold text-slate-900 text-base">Document Vault - Compiler Lab</span>
          </div>

          <nav className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage('home')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                currentPage === 'home' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => setCurrentPage('upload')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                currentPage === 'upload' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Upload Documents
            </button>
            <button
              onClick={() => setCurrentPage('documents')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                currentPage === 'documents' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Documents ({documents.length})
            </button>
            <button
              onClick={() => setCurrentPage('sql-lab')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                currentPage === 'sql-lab' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              SQL Injection Lab
            </button>
            <button
              onClick={() => setCurrentPage('compiler-demo')}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                currentPage === 'compiler-demo' ? 'bg-slate-200 text-slate-900' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Compiler Demo
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content View */}
      <main className="max-w-5xl mx-auto px-4 py-8 flex-1 w-full space-y-6">
        {/* ============================================================== */}
        {/* 1. HOME VIEW                                                   */}
        {/* ============================================================== */}
        {currentPage === 'home' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-xs">
              <h1 className="text-2xl font-extrabold text-slate-900">
                Compiler Design Educational Lab
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-xl mx-auto leading-relaxed">
                A simple educational environment designed to provide controlled SQL Injection query patterns for compiler static analysis, token streams, and AST vulnerability detection.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <button
                  onClick={() => setCurrentPage('sql-lab')}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded shadow-xs"
                >
                  Open SQL Injection Lab &rarr;
                </button>
                <button
                  onClick={() => setCurrentPage('upload')}
                  className="px-5 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300"
                >
                  Upload Sample Documents
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
                <h2 className="text-sm font-bold text-slate-900">1. Document Upload Subsystem</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Demonstrates how document records are logged into SQLite (<code>database.db</code>). Files are stored inertly with random UUIDs and <strong>never executed</strong>.
                </p>
                <div className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded border">
                  Tables: documents (id, filename, file_size, upload_date)
                </div>
                <button
                  onClick={() => setCurrentPage('documents')}
                  className="text-xs font-semibold text-indigo-600 hover:underline block pt-1"
                >
                  View Document Library &rarr;
                </button>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
                <h2 className="text-sm font-bold text-slate-900">2. Compiler SQL Injection Lab</h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Generates raw interpolated SQL queries and secure parameterized queries. Provides a one-click <strong>Copy Query</strong> and <strong>Download Query</strong> button for compiler testing.
                </p>
                <div className="text-xs text-slate-500 font-mono bg-slate-50 p-3 rounded border">
                  Tables: users (alice, bob, charlie, admin)
                </div>
                <button
                  onClick={() => setCurrentPage('sql-lab')}
                  className="text-xs font-semibold text-indigo-600 hover:underline block pt-1"
                >
                  Launch SQL Query Workbench &rarr;
                </button>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <h2 className="text-sm font-bold text-slate-900 mb-2">Project Architecture Flow</h2>
              <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg overflow-x-auto leading-relaxed">
{`Upload File   ──>  Store File (uploads/)  ──>  Store Metadata (database.db)  ──>  Display Documents

User Input    ──>  SQL Query (Vulnerable) ──>  Altered Syntax Tree (AST)     ──>  Compiler Detects Vulnerable SQL
              ──>  SQL Query (Secure)     ──>  Parameterized Data Node       ──>  Compiler Verifies Safe Pattern`}
              </pre>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. UPLOAD VIEW                                                 */}
        {/* ============================================================== */}
        {currentPage === 'upload' && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Upload Documents</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Supported formats: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, JPEG, PNG.
              </p>
            </div>

            {uploadMessage && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  uploadStatus === 'success'
                    ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border border-rose-200 text-rose-800'
                }`}
              >
                {uploadStatus === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <XCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                <span>{uploadMessage}</span>
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center bg-slate-50">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setUploadMessage(null);
                    }
                  }}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white cursor-pointer"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  {selectedFile ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)` : 'No file chosen'}
                </span>

                <button
                  type="submit"
                  disabled={!selectedFile || uploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploading ? 'Storing...' : 'Upload Document'}</span>
                </button>
              </div>
            </form>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 leading-relaxed mt-4">
              <strong className="text-slate-900">Safety & Inert Storage Notice:</strong> Uploaded files are assigned a randomized UUID and saved in <code>uploads/</code> as inert binary data. The application <strong>never executes uploaded files</strong> or passes contents to system shells.
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 3. DOCUMENTS TABLE VIEW                                        */}
        {/* ============================================================== */}
        {currentPage === 'documents' && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Documents Table (database.db)</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pre-seeded dataset with 10 dummy academic documents.</p>
              </div>
              <button
                onClick={() => setCurrentPage('upload')}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded"
              >
                + Upload New File
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-2.5 pl-3">ID</th>
                    <th className="p-2.5">Original Filename</th>
                    <th className="p-2.5">Stored Filename</th>
                    <th className="p-2.5">Extension</th>
                    <th className="p-2.5">Size</th>
                    <th className="p-2.5">Upload Date</th>
                    <th className="p-2.5 pr-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-4 text-center text-slate-400 font-sans">
                        No documents logged yet.
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50">
                        <td className="p-2.5 pl-3 font-bold text-slate-700">#{doc.id}</td>
                        <td className="p-2.5 font-sans font-medium text-slate-900">{doc.original_filename}</td>
                        <td className="p-2.5 text-slate-500 truncate max-w-[150px]">{doc.filename}</td>
                        <td className="p-2.5 font-bold text-slate-600">{doc.file_extension}</td>
                        <td className="p-2.5">{formatSize(doc.file_size)}</td>
                        <td className="p-2.5 text-slate-500">{doc.upload_date}</td>
                        <td className="p-2.5 pr-3 text-right">
                          <a
                            href={`/api/download/${doc.id}`}
                            download
                            className="px-2 py-1 text-[11px] font-sans font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300 inline-flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 4. SQL INJECTION LAB VIEW                                      */}
        {/* ============================================================== */}
        {currentPage === 'sql-lab' && (
          <div className="space-y-6">
            {/* Warning Callout */}
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg text-xs text-amber-900 leading-relaxed">
              <strong>INTENTIONALLY VULNERABLE — EDUCATIONAL SQL INJECTION LAB</strong><br />
              This page demonstrates the conceptual difference between string concatenation and parameterized SQL queries using dummy credentials in <code>database.db</code>.
            </div>

            {/* Input & Preset Row */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Username Query Input:
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="Enter username or payload..."
                  className="flex-1 px-3 py-2 text-xs font-mono rounded border border-slate-300 focus:outline-none focus:border-slate-500"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => executeBothQueries(usernameInput)}
                    disabled={loadingSql}
                    className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Run Vulnerable Query
                  </button>
                  <button
                    onClick={() => executeBothQueries(usernameInput)}
                    disabled={loadingSql}
                    className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Run Secure Query
                  </button>
                </div>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-600 text-[11px]">Test Payloads:</span>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput("' OR '1'='1");
                    executeBothQueries("' OR '1'='1");
                  }}
                  className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  ' OR '1'='1 (Tautology)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput("alice");
                    executeBothQueries("alice");
                  }}
                  className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  alice (Literal)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const u = "' UNION SELECT id, username, password FROM users --";
                    setUsernameInput(u);
                    executeBothQueries(u);
                  }}
                  className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  ' UNION SELECT users --
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUsernameInput("'");
                    executeBothQueries("'");
                  }}
                  className="px-2 py-0.5 font-mono text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                >
                  ' (Syntax Error)
                </button>
              </div>
            </div>

            {/* Generated SQL & Compiler Export Box */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Generated SQL Query (Compiler Input)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Export or copy this query string to feed into your Compiler Design analyzer.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopyQuery}
                    className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Query'}</span>
                  </button>
                  <a
                    href={`/export-query?sql=${encodeURIComponent(generatedSql)}`}
                    download="generated_query.txt"
                    className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded border border-slate-300 flex items-center gap-1"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Download (.txt)</span>
                  </a>
                </div>
              </div>

              <div className="p-3 bg-slate-950 text-sky-400 font-mono text-xs rounded border border-slate-800 overflow-x-auto leading-relaxed">
                {generatedSql}
              </div>
            </div>

            {/* Side-by-Side Comparison Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* RED SECTION: VULNERABLE */}
              <div className="bg-rose-50/40 border border-rose-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                  <span className="text-[11px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    RED / WARNING SECTION
                  </span>
                  <span className="text-xs font-bold text-rose-700">Vulnerable SQL</span>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  <code>"SELECT ... WHERE username = '" + user_input + "';"</code>
                </div>

                <div className="text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Database Result ({vulnResult?.row_count ?? 0} rows):
                  </span>
                  {vulnResult?.error ? (
                    <div className="p-2.5 bg-rose-100 text-rose-800 font-mono text-[11px] rounded border border-rose-300">
                      Error: {vulnResult.error}
                    </div>
                  ) : (
                    <pre className="p-2.5 bg-white border border-rose-200 rounded text-[11px] font-mono max-h-40 overflow-y-auto">
                      {JSON.stringify(vulnResult?.results || [], null, 2)}
                    </pre>
                  )}
                </div>

                <div
                  className={`p-2.5 rounded text-xs font-semibold ${
                    vulnResult?.is_vulnerable
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {vulnResult?.status_message || 'Awaiting execution...'}
                </div>
              </div>

              {/* GREEN SECTION: SECURE */}
              <div className="bg-emerald-50/40 border border-emerald-200 rounded-lg p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                  <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                    GREEN / SECURE SECTION
                  </span>
                  <span className="text-xs font-bold text-emerald-700">Parameterized SQL</span>
                </div>

                <div className="text-xs text-slate-600 font-medium">
                  <code>cursor.execute("SELECT ... WHERE username = ?", (user_input,))</code>
                </div>

                <div className="text-xs">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Database Result ({secureResult?.row_count ?? 0} rows):
                  </span>
                  <pre className="p-2.5 bg-white border border-emerald-200 rounded text-[11px] font-mono max-h-40 overflow-y-auto">
                    {JSON.stringify(secureResult?.results || [], null, 2)}
                  </pre>
                </div>

                <div className="p-2.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {secureResult?.status_message || 'Parameterized Query — Secure'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 5. COMPILER DEMO VIEW                                          */}
        {/* ============================================================== */}
        {currentPage === 'compiler-demo' && (
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Compiler Design Project Integration Guide
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Theoretical foundation for your compiler viva and AST vulnerability detection demonstration.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-lg space-y-2">
                <h3 className="text-xs font-bold text-rose-800 uppercase">
                  Vulnerable Pattern (Concatenation)
                </h3>
                <div className="p-2 bg-slate-900 text-white font-mono text-xs rounded">
                  SELECT * FROM users WHERE username = '{'{user_input}'}';
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Problem:</strong> User input becomes part of the SQL syntax. When quotes are injected, the lexical analyzer generates new statement tokens, mutating the parser's Abstract Syntax Tree.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                <h3 className="text-xs font-bold text-emerald-800 uppercase">
                  Secure Pattern (Parameterized)
                </h3>
                <div className="p-2 bg-slate-900 text-white font-mono text-xs rounded">
                  SELECT * FROM users WHERE username = ?;
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">
                  <strong>Solution:</strong> The SQL AST structure is pre-compiled. User input is bound strictly as literal data, preventing syntax modification regardless of what characters are entered.
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
              <h3 className="font-bold text-slate-800">What Your Compiler Should Detect:</h3>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 leading-relaxed">
                <li>
                  <strong>Tainted Concatenation:</strong> Flags string additions or f-strings constructing SQL query strings.
                </li>
                <li>
                  <strong>AST Disjunction Injection:</strong> Identifies injected boolean operators (e.g., <code>OR</code>) altering query root logic.
                </li>
                <li>
                  <strong>Remediation Recommendation:</strong> Suggests transforming concatenated SQL into prepared statement placeholders (<code>?</code>).
                </li>
              </ul>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-xs text-slate-500 text-center">
        Document Vault - SQL Injection Compiler Lab · Local Educational Demonstration
      </footer>
    </div>
  );
}
