import React, { useState, useEffect } from 'react';
import {
  FileText,
  Trash2,
  Download,
  Eye,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  FolderOpen,
  Binary,
  ShieldCheck,
  ShieldAlert,
  X,
} from 'lucide-react';
import { DocumentRecord, NavPage } from '../../types/security.ts';

interface DocumentsViewProps {
  onNavigate: (page: NavPage) => void;
  refreshTrigger: number;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({ onNavigate, refreshTrigger }) => {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACCEPTED' | 'REJECTED'>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, [refreshTrigger]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this file record from database and safe storage?')) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (selectedDoc?.id === id) {
          setSelectedDoc(null);
        }
      }
    } catch (err) {
      console.error('Error deleting document:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.original_filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.detected_mime_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.id.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || doc.upload_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Document Library & Audit Vault
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Production database records of uploaded documents and rejected spoofing attempts
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            <button
              onClick={fetchDocuments}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors"
              title="Refresh library"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => onNavigate('upload')}
              className="px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer"
            >
              Upload Document
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by filename, MIME type, or UUID..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Status Segmented Control */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            All ({documents.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACCEPTED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === 'ACCEPTED'
                ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Accepted ({documents.filter((d) => d.upload_status === 'ACCEPTED').length})
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              statusFilter === 'REJECTED'
                ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Rejected ({documents.filter((d) => d.upload_status === 'REJECTED').length})
          </button>
        </div>
      </div>

      {/* Documents Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {loading && documents.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
            <span>Loading document vault records...</span>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <FolderOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
              No document records found
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Upload a genuine or disguised test document to view raw forensic records here.
            </p>
            <button
              onClick={() => onNavigate('upload')}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors"
            >
              Upload First File
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800 font-medium">
                <tr>
                  <th className="p-3.5 pl-4">Filename</th>
                  <th className="p-3.5">Detected Type</th>
                  <th className="p-3.5">Size</th>
                  <th className="p-3.5">Stored Filename (UUID)</th>
                  <th className="p-3.5">Upload Time</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredDocs.map((doc) => {
                  const isAccepted = doc.upload_status === 'ACCEPTED';

                  return (
                    <tr
                      key={doc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Original Filename */}
                      <td className="p-3.5 pl-4 font-medium text-slate-900 dark:text-white max-w-[200px] truncate">
                        <div className="flex items-center gap-2">
                          <FileText className={`w-4 h-4 shrink-0 ${isAccepted ? 'text-slate-400' : 'text-rose-500'}`} />
                          <span className="truncate">{doc.original_filename}</span>
                        </div>
                      </td>

                      {/* Detected MIME Type */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-[160px] truncate">
                        {doc.detected_mime_type}
                      </td>

                      {/* File Size */}
                      <td className="p-3.5 font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {(doc.file_size / 1024).toFixed(1)} KB
                      </td>

                      {/* Stored Filename UUID */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 max-w-[160px] truncate">
                        {doc.stored_filename}
                      </td>

                      {/* Upload Time */}
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(doc.upload_timestamp).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-[11px] ${
                            isAccepted
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isAccepted ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          <span>{doc.upload_status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                            title="Inspect forensic metadata"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAccepted && (
                            <a
                              href={`/api/documents/${doc.id}/download`}
                              download
                              className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 transition-colors"
                              title="Safe download"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="p-1.5 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Forensic Inspection Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-2xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-mono uppercase text-slate-400">
                  Forensic Document Audit
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                  {selectedDoc.original_filename}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Attributes */}
            <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Document ID</span>
                <span className="text-slate-900 dark:text-white truncate block">{selectedDoc.id}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Storage Filename</span>
                <span className="text-slate-900 dark:text-white truncate block">{selectedDoc.stored_filename}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Claimed Extension</span>
                <span className="text-slate-900 dark:text-white">{selectedDoc.extension_claimed}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans">Detected MIME</span>
                <span className="text-slate-900 dark:text-white">{selectedDoc.detected_mime_type}</span>
              </div>
            </div>

            {/* Magic Bytes Hex View if present in validation details */}
            {selectedDoc.validation_details && (
              <div className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Binary className="w-4 h-4 text-emerald-500" />
                  Recorded Magic Number Hex Dump
                </h4>
                <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-xs overflow-x-auto space-y-1.5 border border-slate-800">
                  <div>
                    <span className="text-slate-500">HEX: </span>
                    <span className="text-amber-300">{selectedDoc.validation_details.magicBytesHex}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">ASCII: </span>
                    <span>{selectedDoc.validation_details.magicBytesAscii}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Expected: </span>
                    <span className="text-white">{selectedDoc.validation_details.expectedSignature}</span>
                  </div>
                </div>

                {selectedDoc.validation_details.securityReasons?.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-xs font-semibold text-rose-600">Discrepancy Details:</span>
                    <ul className="space-y-1 text-xs text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                      {selectedDoc.validation_details.securityReasons.map((r, i) => (
                        <li key={i}>• {r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
