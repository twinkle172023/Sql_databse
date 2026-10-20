export interface DocumentRecord {
  id: string;
  original_filename: string;
  stored_filename?: string;
  detected_mime_type: string;
  extension_claimed?: string;
  file_size: number;
  upload_timestamp: string;
  storage_path?: string;
  upload_status?: string;
  validation_details?: any;
  [key: string]: any;
}

export interface ValidationReport {
  isValid: boolean;
  verdict: 'ACCEPTED' | 'REJECTED';
  claimedExtension: string;
  claimedMime: string;
  detectedType: string;
  detectedMime: string;
  magicBytesHex: string;
  magicBytesAscii: string;
  expectedSignature: string;
  threatLevel: 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  securityReasons: string[];
  recommendation: string;
}

export interface SqlSearchResult {
  success: boolean;
  mode: 'VULNERABLE' | 'SECURE';
  executedSql?: string;
  preparedSqlTemplate?: string;
  boundParameters?: any[];
  userInput: string;
  durationMs: number;
  rowCount: number;
  columns: string[];
  results: Record<string, any>[];
  error?: string;
  injectionDetected?: boolean;
  analysis?: any;
  simulatedCompromise?: any;
}

export interface FilePreset {
  id: string;
  filename: string;
  claimedMime: string;
  size: number;
  description: string;
  expectedVerdict: 'ACCEPTED' | 'REJECTED';
}

export type NavPage =
  | 'dashboard'
  | 'upload'
  | 'documents'
  | 'file-lab'
  | 'sql-playground'
  | 'report';
