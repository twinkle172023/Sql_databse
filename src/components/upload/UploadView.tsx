import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileCheck,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Binary,
  ArrowRight,
  RefreshCw,
  FolderOpen,
  Info,
} from 'lucide-react';
import { ValidationReport, DocumentRecord, NavPage } from '../../types/security.ts';
import { SUPPORTED_FILE_TYPES } from '../../lib/constants.ts';

interface UploadViewProps {
  onNavigate: (page: NavPage) => void;
  onUploadSuccess: () => void;
}

export const UploadView: React.FC<UploadViewProps> = ({ onNavigate, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [uploadResponse, setUploadResponse] = useState<{
    success: boolean;
    message: string;
    report?: ValidationReport;
    document?: DocumentRecord;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadResponse(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadResponse(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(20);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploadProgress(60);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(90);
      const data = await res.json();
      setUploadProgress(100);

      setUploadResponse({
        success: data.success ?? false,
        message: data.message || (data.success ? 'Upload verified and accepted' : 'Upload rejected by security filter'),
        report: data.report,
        document: data.document || data.documentRecord,
      });

      if (data.success) {
        onUploadSuccess();
      }
    } catch (err: any) {
      setUploadResponse({
        success: false,
        message: `Network or server error during upload: ${err.message}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const loadSimulatedSpoofedFile = () => {
    const maliciousPythonCode = `#!/usr/bin/env python3\nprint("This is a simulated malicious file")\nimport sys\nimport os\n`;
    const blob = new Blob([maliciousPythonCode], { type: 'application/pdf' });
    const file = new File([blob], 'document.pdf', { type: 'application/pdf' });
    setSelectedFile(file);
    setUploadResponse(null);
  };

  const loadGenuineTextFile = () => {
    const genuineText = `DocumentVault Verified Safe File\nTimestamp: ${new Date().toISOString()}\nStatus: Compliant\n`;
    const blob = new Blob([genuineText], { type: 'text/plain' });
    const file = new File([blob], 'audit_compliance_notes.txt', { type: 'text/plain' });
    setSelectedFile(file);
    setUploadResponse(null);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Secure Document Upload Gateway
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Zero-Trust file ingestion pipeline with raw byte inspection, UUID isolation, and non-executable storage
            </p>
          </div>
          <button
            onClick={() => onNavigate('documents')}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>View All Uploaded Files</span>
          </button>
        </div>
      </div>

      {/* Main Upload Dropzone & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center min-h-[260px] ${
              dragActive
                ? 'border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/20'
                : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-white dark:bg-slate-900'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              className="hidden"
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
            />

            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4 shadow-xs">
              <UploadCloud className="w-6 h-6 text-emerald-500" />
            </div>

            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              {selectedFile ? selectedFile.name : 'Choose a document or drag & drop here'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Supported formats: PDF, DOC/DOCX, PPT/PPTX, TXT, JPG, PNG (Max size: 10MB)
            </p>

            {selectedFile && (
              <div className="mt-4 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-mono text-slate-700 dark:text-slate-300 flex items-center gap-3">
                <span>Selected: <strong>{selectedFile.name}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{(selectedFile.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>Running Magic Byte Inspection...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Button & Preset Triggers */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Quick Test:</span>
              <button
                type="button"
                onClick={loadSimulatedSpoofedFile}
                className="px-2.5 py-1.5 rounded-md bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 font-mono text-[11px] hover:bg-rose-100 transition-colors"
              >
                Load Spoofed "document.pdf" (Python)
              </button>
              <button
                type="button"
                onClick={loadGenuineTextFile}
                className="px-2.5 py-1.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 font-mono text-[11px] hover:bg-emerald-100 transition-colors"
              >
                Load Genuine TXT
              </button>
            </div>

            <button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Inspecting Bytes...</span>
                </>
              ) : (
                <>
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Inspect & Store Securely</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Security Safeguards Checklist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-500" />
            Active Upload Safeguards
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                1. Binary Magic Number Check
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Inspects first raw bytes (%PDF-, PNG header, JFIF marker). Rejects disguised scripts immediately.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                2. Non-Executable Storage (UUID)
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Original filename discarded. Stored with random UUID in <code className="font-mono">storage/uploads/</code> with 0644 mode.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-slate-900 dark:text-white mb-1">
                3. Zero Execution Policy
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Uploaded files are never passed to shell interpreters, eval, or native compilers.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Response & Diagnostic Card */}
      {uploadResponse && (
        <div
          className={`rounded-xl border p-6 transition-all ${
            uploadResponse.success
              ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/60'
              : 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60'
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg mt-0.5 ${
                  uploadResponse.success
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300'
                }`}
              >
                {uploadResponse.success ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {uploadResponse.success ? 'File Accepted & Securely Isolated' : 'File Rejected by Content Inspection'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {uploadResponse.message}
                </p>
              </div>
            </div>

            {uploadResponse.success && (
              <button
                onClick={() => onNavigate('documents')}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-xs"
              >
                <span>View in Library</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Diagnostic Details */}
          {uploadResponse.report && (
            <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-sans">Claimed Extension</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {uploadResponse.report.claimedExtension}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-sans">Detected Binary Type</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                  {uploadResponse.report.detectedType}
                </span>
              </div>

              <div className="p-3 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] uppercase text-slate-400 block font-sans">Magic Bytes Signature</span>
                <span className="font-bold text-slate-900 dark:text-white mt-0.5 block truncate">
                  {uploadResponse.report.magicBytesHex.slice(0, 20)}...
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
