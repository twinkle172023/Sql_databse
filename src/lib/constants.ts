export interface SqlPayloadPreset {
  name: string;
  category: 'Tautology' | 'UNION Extraction' | 'Schema Discovery' | 'Syntax Probe' | 'Benign';
  payload: string;
  description: string;
  intendedImpact: string;
}

export const SQL_PAYLOAD_PRESETS: SqlPayloadPreset[] = [
  {
    name: 'Benign Search (Legitimate)',
    category: 'Benign',
    payload: 'Audit',
    description: 'Searches for documents matching the keyword "Audit".',
    intendedImpact: 'Returns only records whose title or category contains "Audit".',
  },
  {
    name: 'Tautology (Bypass Filter)',
    category: 'Tautology',
    payload: "' OR '1'='1",
    description: 'Injects an always-true boolean condition to dump all table records.',
    intendedImpact: 'Forces the WHERE clause to evaluate to TRUE for every single row in lab_documents.',
  },
  {
    name: 'UNION User Credential Leak',
    category: 'UNION Extraction',
    payload: "' UNION SELECT id, username, email, fake_role, fake_password_hash, 1, fake_api_token, account_notes FROM lab_users --",
    description: 'Executes a secondary SELECT against the synthetic lab_users table to exfiltrate user hashes.',
    intendedImpact: 'Extracts simulated user credentials, fake password hashes, and tokens into document columns.',
  },
  {
    name: 'Schema Enumeration (sqlite_master)',
    category: 'Schema Discovery',
    payload: "' UNION SELECT 1, tbl_name, sql, 'INTERNAL_SCHEMA', 'SQLITE', 1, '2026-10-20', 'METADATA' FROM sqlite_master WHERE type='table' --",
    description: 'Queries SQLite internal metadata table to map all database table names and definitions.',
    intendedImpact: 'Reveals all table definitions and structure in the database.',
  },
  {
    name: 'Syntax Error Probe',
    category: 'Syntax Probe',
    payload: "'; SELECT * FROM non_existent_table WHERE '1'='1",
    description: 'Forces an intentional database syntax exception to test error handling.',
    intendedImpact: 'Triggers verbose error messages disclosing backend SQL dialect.',
  },
];

export const SUPPORTED_FILE_TYPES = [
  { ext: 'PDF', mime: 'application/pdf', magic: '%PDF- (25 50 44 46)', desc: 'Adobe Portable Document Format' },
  { ext: 'DOC / DOCX', mime: 'application/vnd.openxmlformats...', magic: 'PK.. or D0 CF 11 E0', desc: 'Microsoft Word Document' },
  { ext: 'PPT / PPTX', mime: 'application/vnd.openxmlformats...', magic: 'PK.. or D0 CF 11 E0', desc: 'Microsoft PowerPoint Presentation' },
  { ext: 'TXT', mime: 'text/plain', magic: 'Printable ASCII/UTF-8', desc: 'Plain Text' },
  { ext: 'JPG / JPEG', mime: 'image/jpeg', magic: 'FF D8 FF', desc: 'Joint Photographic Experts Group' },
  { ext: 'PNG', mime: 'image/png', magic: '89 50 4E 47 0D 0A 1A 0A', desc: 'Portable Network Graphics' },
];

export const SECURITY_COMPARISONS = {
  fileUpload: [
    {
      principle: 'Content-Based Inspection (Magic Bytes)',
      insecure: 'Relies on user-provided filename extension (.pdf) or client Content-Type header.',
      secure: 'Reads first binary bytes in memory to verify genuine magic signatures (%PDF-, PNG header, etc.).',
      mitigation: 'Inspect file buffer before writing to disk; reject any discrepancy immediately.',
    },
    {
      principle: 'Randomized UUID Filenames',
      insecure: 'Stores files using original_filename, enabling Path Traversal (e.g. ../../etc/cron.d/evil).',
      secure: 'Generates a random UUID (v4) for filesystem storage (e.g. 8a2f...-b4.bin) and logs original name strictly as database text.',
      mitigation: 'Never use original user filenames as filesystem paths or command arguments.',
    },
    {
      principle: 'Non-Executable Storage Directory',
      insecure: 'Saves files inside webroot or application directory where webserver can interpret them (.php, .py).',
      secure: 'Stores files in dedicated storage directory with non-executable permissions (chmod 0644) and CSP nosniff headers.',
      mitigation: 'Store uploads outside the executable tree; serve via streaming proxy with Content-Disposition: attachment.',
    },
    {
      principle: 'Executable & Script Blocking',
      insecure: 'Allows uploads containing scripts (Python, Bash, JS, PHP) or PE/ELF binaries disguised with document extensions.',
      secure: 'Scans for script code signatures, shebang markers, and binary executable headers even when disguised.',
      mitigation: 'Enforce strict binary whitelists; reject any file containing script interpreter directives.',
    },
    {
      principle: 'Strict File Size Quotas',
      insecure: 'No upload limits, allowing Denial of Service (DoS) via disk exhaustion or ZIP bombs.',
      secure: 'Hard limits enforced at reverse-proxy and application memory parser (e.g. 10MB per file).',
      mitigation: 'Configure multer / body-parser limits with streaming abort on limit exceed.',
    },
  ],
  sqlSecurity: [
    {
      principle: 'Parameterized Prepared Statements',
      insecure: 'Concatenates user strings directly into query: "SELECT * FROM docs WHERE title = \'" + input + "\'"',
      secure: 'Uses pre-compiled query templates with bind parameters: "SELECT * FROM docs WHERE title = ?" with [input].',
      mitigation: 'Input is strictly interpreted as literal data; syntactic quotes cannot alter execution logic.',
    },
    {
      principle: 'Isolated Demonstration Sandbox',
      insecure: 'Demonstrations run against production tables, exposing customer data and operational secrets.',
      secure: 'Completely separated laboratory database containing only synthetic mock records.',
      mitigation: 'Physically separated SQLite files (documentvault_production vs sql_lab_isolated).',
    },
    {
      principle: 'Principle of Least Privilege',
      insecure: 'Database connections run as superuser/root with GRANT ALL and filesystem access (LOAD_FILE).',
      secure: 'Application connection restricted to specific table read/write; dangerous administrative commands disabled.',
      mitigation: 'Never grant DROP, ALTER, or OS shell privileges to the web application connection.',
    },
    {
      principle: 'Error Message Sanitization',
      insecure: 'Raw database driver exceptions returned to frontend, leaking schema names, table structures, and DBMS type.',
      secure: 'Generic user-friendly error returned to client while detailed stack traces are safely logged server-side.',
      mitigation: 'Catch database errors in a centralized handler and return sanitized error codes.',
    },
  ],
};
