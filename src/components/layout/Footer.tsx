import React from 'react';
import { ShieldCheck, Database, Terminal, FileCode } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 mt-auto transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              DocumentVault Lab
            </h4>
            <p className="leading-relaxed">
              Controlled educational cybersecurity sandbox demonstrating secure file validation and SQL injection defense.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <FileCode className="w-4 h-4 text-sky-500" />
              File Security Engine
            </h4>
            <p className="leading-relaxed">
              Deep magic-byte inspection (%PDF-, PNG, JPEG, OpenXML) and script detection (Python, Bash, PHP, JS, PE32) prior to storage.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-amber-500" />
              Isolated Lab Boundary
            </h4>
            <p className="leading-relaxed">
              SQL Injection playground queries execute strictly against a segregated SQLite database containing synthetic demo records.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-200 mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-purple-500" />
              Zero-Execution Policy
            </h4>
            <p className="leading-relaxed">
              Uploaded files are stored outside webroot with UUID filenames and 0644 non-executable permissions.
            </p>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>DocumentVault Security Lab</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              EDUCATIONAL DEMO ENVIRONMENT
            </span>
          </div>

          <div>
            <span>Synthetically Isolated Sandbox</span>
            <span aria-hidden="true" className="mx-2">·</span>
            <span>Zero Production Data Exposure</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
