import React, { useState, useEffect } from 'react';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Play,
  Binary,
  Code,
  ShieldAlert,
  ArrowRight,
  RefreshCw,
  Info,
} from 'lucide-react';
import { FilePreset, ValidationReport } from '../../types/security.ts';

export const FileLabView: React.FC = () => {
  const [presets, setPresets] = useState<FilePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('python_as_pdf');
  const [loading, setLoading] = useState<boolean>(false);
  const [analysisReport, setAnalysisReport] = useState<{
    filename: string;
    description: string;
    fileSize: number;
    report: ValidationReport;
  } | null>(null);

  // Custom Payload Workbench state
  const [customFilename, setCustomFilename] = useState<string>('document.pdf');
  const [customContent, setCustomContent] = useState<string>(
    '#!/usr/bin/env python3\n# Simulated harmless payload\nprint("This is a simulated malicious file")\nimport sys\nimport os\n'
  );
  const [customMime, setCustomMime] = useState<string>('application/pdf');

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    try {
      const res = await fetch('/api/lab/presets');
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
        // Trigger initial test for the python_as_pdf preset
        runPresetTest('python_as_pdf');
      }
    } catch (err) {
      console.error('Failed to load presets:', err);
    }
  };

  const runPresetTest = async (presetId: string) => {
    setSelectedPresetId(presetId);
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/test-preset/${presetId}`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setAnalysisReport(data);
      }
    } catch (err) {
      console.error('Error running preset test:', err);
    } finally {
      setLoading(false);
    }
  };

  const runCustomTest = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lab/test-custom-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: customFilename,
          contentText: customContent,
          claimedMime: customMime,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysisReport({
          filename: data.filename,
          description: 'Custom user payload evaluated in live inspection engine',
          fileSize: data.fileSize,
          report: data.report,
        });
      }
    } catch (err) {
      console.error('Error testing custom content:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Malicious File Upload Lab
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Demonstrating extension spoofing attacks, magic-byte inspection, and the dangers of extension-only validation
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
              NON-EXECUTABLE ISOLATED SANDBOX
            </span>
          </div>
        </div>
      </div>

      {/* Preset Selector Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {presets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;
          const isRejectionExpected = preset.expectedVerdict === 'REJECTED';

          return (
            <button
              key={preset.id}
              onClick={() => runPresetTest(preset.id)}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                  {preset.filename}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    isRejectionExpected
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {isRejectionExpected ? 'Exploit Disguise' : 'Legitimate File'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                {preset.description}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="font-mono tabular-nums">{preset.size} bytes</span>
                <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-medium">
                  <Play className="w-3 h-3 fill-current" /> Run Test
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Primary Educational Demonstration Display (Directly addressing Section 3 requirement) */}
      {analysisReport && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
          {/* Top Banner Verdict */}
          <div
            className={`p-6 border-b ${
              analysisReport.report.verdict === 'ACCEPTED'
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40'
                : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    analysisReport.report.verdict === 'ACCEPTED'
                      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {analysisReport.report.verdict === 'ACCEPTED' ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <div className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Validation Decision
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">
                    {analysisReport.filename} — {analysisReport.report.verdict}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {analysisReport.report.recommendation}
                  </p>
                </div>
              </div>

              {/* Exact explicit 3-box requirement: "Extension: PDF", "Detected content: Python script", "Result: REJECTED" */}
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <div className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[110px]">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Claimed Extension</div>
                  <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                    {analysisReport.report.claimedExtension}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />

                <div className="px-3.5 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center min-w-[130px]">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Detected Content</div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate">
                    {analysisReport.report.detectedType}
                  </div>
                </div>

                <ArrowRight className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />

                <div
                  className={`px-3.5 py-2 rounded-lg border text-center min-w-[110px] ${
                    analysisReport.report.verdict === 'ACCEPTED'
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 font-bold'
                      : 'bg-rose-100 dark:bg-rose-900/60 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200 font-bold'
                  }`}
                >
                  <div className="text-[10px] uppercase">Final Result</div>
                  <div className="text-xs tracking-wider mt-0.5">
                    {analysisReport.report.verdict}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Forensic Deep Inspection Breakdown */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Magic Byte Hex & ASCII Inspection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Binary className="w-4 h-4 text-emerald-500" />
                  Binary Header & Magic Bytes Inspection
                </h4>
                <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  First 32 Bytes
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto space-y-2 border border-slate-800">
                <div>
                  <span className="text-slate-500 select-none">HEX: </span>
                  <span className="text-amber-300 font-semibold">{analysisReport.report.magicBytesHex}</span>
                </div>
                <div>
                  <span className="text-slate-500 select-none">ASCII: </span>
                  <span className="text-emerald-300">{analysisReport.report.magicBytesAscii}</span>
                </div>
                <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400">
                  <span>Expected Magic for {analysisReport.report.claimedExtension}: </span>
                  <span className="text-white font-semibold">{analysisReport.report.expectedSignature}</span>
                </div>
              </div>

              {/* Security Diagnostics & Reasons */}
              <div className="space-y-2">
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Security Engine Diagnostics:
                </h5>
                {analysisReport.report.securityReasons.length > 0 ? (
                  <ul className="space-y-1.5">
                    {analysisReport.report.securityReasons.map((reason, i) => (
                      <li
                        key={i}
                        className="text-xs flex items-start gap-2 p-2 rounded-md bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/40"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 mt-0.5 shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-xs p-2.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>No discrepancies found. Magic byte signature precisely matches claimed MIME type.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Insecure vs Secure Architecture Comparison */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Code className="w-4 h-4 text-sky-500" />
                Vulnerability vs Mitigation Mechanism
              </h4>

              <div className="space-y-3">
                <div className="p-3.5 rounded-lg border border-rose-200 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-xs">
                  <div className="font-semibold text-rose-800 dark:text-rose-300 mb-1 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" />
                    How an Insecure Server Behaves:
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    A naive backend checks only <code className="text-rose-600 font-mono">filename.endsWith('.pdf')</code>.
                    It saves <code className="font-mono">document.pdf</code> to disk. If the server or an admin later attempts to process, preview, or shell out to this file, the embedded Python script executes with full server privileges!
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs">
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    How DocumentVault Protects the System:
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    DocumentVault inspects the initial binary bytes in memory before touching disk. The lack of <code className="text-emerald-600 font-mono">%PDF-</code> triggers immediate rejection. The file is never written to disk, never executed, and never exposed to shell commands.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Custom Payload Workbench */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-indigo-500" />
            <div>
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                Interactive Custom Payload Tester
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Craft a custom file payload in browser and observe how the deep inspection engine evaluates it
              </p>
            </div>
          </div>
          <button
            onClick={runCustomTest}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            <span>Analyze Custom Payload</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Spoofed Filename
            </label>
            <input
              type="text"
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. document.pdf, invoice.png"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Browser Claimed MIME
            </label>
            <input
              type="text"
              value={customMime}
              onChange={(e) => setCustomMime(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. application/pdf"
            />
          </div>

          <div className="flex items-end">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCustomFilename('document.pdf');
                  setCustomContent('print("Simulated Python payload")\nimport os\n');
                  setCustomMime('application/pdf');
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Insert Python (.pdf)
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomFilename('invoice.png');
                  setCustomContent('#!/bin/bash\necho "Simulated bash payload"\n');
                  setCustomMime('image/png');
                }}
                className="px-2.5 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Insert Bash (.png)
              </button>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Raw File Content (Bytes / Text)
          </label>
          <textarea
            value={customContent}
            onChange={(e) => setCustomContent(e.target.value)}
            rows={5}
            className="w-full p-3 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Type script code or text here..."
          />
        </div>
      </div>
    </div>
  );
};
