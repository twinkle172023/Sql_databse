import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  Database,
  ArrowRight,
  UploadCloud,
  Terminal,
  Binary,
  Layers,
  FileCode,
  Lock,
} from 'lucide-react';
import { DocumentRecord, NavPage } from '../../types/security.ts';
import { SUPPORTED_FILE_TYPES } from '../../lib/constants.ts';
import { AttackFlowVisualizer } from '../visualization/AttackFlowVisualizer.tsx';

interface DashboardViewProps {
  onNavigate: (page: NavPage) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/documents')
      .then((r) => r.json())
      .then((data) => {
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load dashboard metrics:', err);
        setLoading(false);
      });
  }, []);

  const totalUploaded = documents.length;
  const acceptedFiles = documents.filter((d) => d.upload_status === 'ACCEPTED').length;
  const blockedThreats = documents.filter((d) => d.upload_status === 'REJECTED').length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero / Header Section */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <span>Zero-Trust File & Database Defense</span>
              <span aria-hidden="true">·</span>
              <span>Educational Sandbox</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              DocumentVault Security Lab
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              An educational platform demonstrating why client-side file extension checking fails, how deep magic-byte inspection blocks stealth payloads, and how parameterized queries prevent SQL injection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('file-lab')}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg shadow-sm transition-colors whitespace-nowrap cursor-pointer"
            >
              Launch Malicious File Lab
            </button>
            <button
              onClick={() => onNavigate('sql-playground')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              Test SQL Injection
            </button>
          </div>
        </div>
      </div>

      {/* KPI Telemetry Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Vault Documents Stored
            </span>
            <FileCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {loading ? '...' : acceptedFiles}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Stored with randomized UUIDs
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Disguised Threats Blocked
            </span>
            <ShieldAlert className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-600 dark:text-rose-400 mt-2">
            {loading ? '...' : blockedThreats}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Extension spoofing attempts stopped
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Supported MIME Standards
            </span>
            <Layers className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            6 Core Types
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            PDF, DOCX, PPTX, TXT, JPG, PNG
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Isolation Boundary
            </span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-2">
            Dual SQLite
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Prod DB ↔ Isolated Lab Sandbox
          </div>
        </div>
      </div>

      {/* Interactive Visual Educational Flow Diagram */}
      <AttackFlowVisualizer />

      {/* Quick Interactive Security Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Scenario 1: File Upload Spoofing */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                ATTACK VECTOR 01
              </span>
              <span className="text-xs text-slate-400">Extension Spoofing</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Malicious Script Disguised as Document
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              An attacker renames a malicious executable or script (e.g. <code className="font-mono text-rose-600">malicious.py</code>) to <code className="font-mono text-rose-600">document.pdf</code> to bypass naive file extension filters. See how our content inspector analyzes the first 32 bytes and halts execution.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono mb-4">
              <div className="text-slate-500">Claimed: <span className="text-slate-900 dark:text-white font-bold">document.pdf</span></div>
              <div className="text-slate-500">Binary Magic: <span className="text-rose-600 font-bold">Python script (print(...))</span></div>
              <div className="text-slate-500">Security Gate: <span className="text-emerald-600 font-bold">BLOCKED BEFORE DISK</span></div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('file-lab')}
            className="w-full py-2.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Open Malicious Upload Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scenario 2: SQL Injection & Synthetic Sandbox */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/60">
                ATTACK VECTOR 02
              </span>
              <span className="text-xs text-slate-400">SQL Injection</span>
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
              Concatenation vs Parameterized Queries
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
              Compare an intentionally vulnerable endpoint that builds raw queries against a parameterized endpoint that pre-compiles the query tree. Test payloads like <code className="font-mono text-amber-600">' OR '1'='1</code> and observe simulated breach results safely.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono mb-4">
              <div className="text-slate-500">Vulnerable: <span className="text-rose-600 font-bold">Query structure manipulated</span></div>
              <div className="text-slate-500">Secure: <span className="text-emerald-600 font-bold">Input treated strictly as data</span></div>
              <div className="text-slate-500">Sandbox Boundary: <span className="text-purple-600 font-bold">SIMULATED DATA ONLY</span></div>
            </div>
          </div>

          <button
            onClick={() => onNavigate('sql-playground')}
            className="w-full py-2.5 text-xs font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Open SQL Injection Lab</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Supported File Types Reference Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-1.5">
          <Binary className="w-4 h-4 text-emerald-500" />
          Supported Upload Formats & Magic Byte Signatures
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SUPPORTED_FILE_TYPES.map((type, i) => (
            <div
              key={i}
              className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-xs font-mono"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900 dark:text-white font-sans text-xs">
                  {type.ext}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                  {type.magic}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {type.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
