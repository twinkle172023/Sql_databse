# DocumentVault Security Lab

**DocumentVault Security Lab** is an interactive, full-stack educational cybersecurity platform built to demonstrate the critical dangers of insecure file-upload handling and SQL injection vulnerabilities within a safe, isolated, and controlled laboratory environment.

---

## 1. Architecture Overview

DocumentVault is architected around a strict **Dual-Database and Zero-Trust Ingestion** pattern:

```
                            [ User Request ]
                                   |
         +-------------------------+-------------------------+
         |                                                   |
   [ Document Upload ]                             [ SQL Playground ]
         |                                                   |
   [ Memory Buffer ]                               +---------+---------+
         |                                         |                   |
[ Magic-Byte Inspector ]                 [ Vulnerable Model ]   [ Secure Model ]
         |                                         |                   |
 +-------+-------+                           (Concatenation)   (Parameterized)
 |               |                                 |                   |
[REJECTED]   [ACCEPTED]                            \                  /
 (Halt)          |                                  \                /
        [UUID Rename]                                [ Isolated Lab DB ]
                 |                                  (sql_lab_isolated)
        [Non-Executable Dir]                                 |
                 |                                  (Synthetic Data Only)
        [Production DB Record]
     (documentvault_production)
```

### Physical Database Segregation
1. **Production Database (`storage/documentvault_production.sqlite`)**:
   - Stores real application metadata for genuine uploaded documents and legitimate administrative users.
   - All operations are strictly parameterized.
   - Completely inaccessible to the educational SQL injection testing interface.

2. **Isolated SQL Injection Lab Database (`storage/sql_lab_isolated.sqlite`)**:
   - Contains **only synthetic demonstration data** (`lab_documents`, `lab_users`, `lab_audit_logs`).
   - Specifically provisioned with fake password hashes (`$2b$12$...`), fake API tokens, and dummy confidential documents.
   - Has zero connection to production records, environment secrets, host operating system, or uploaded files.
   - Can be reset at any time with one click.

---

## 2. Secure File Validation Pipeline

### Why Extension-Only Validation Fails
Relying solely on `file.name.endsWith('.pdf')` or the browser-sent `Content-Type: application/pdf` header is completely insecure:
- The filename and Content-Type are client-controlled strings easily modified by attackers.
- An attacker can rename an executable script (e.g. `malicious.py` or `webshell.php`) to `document.pdf`.
- When an insecure server stores the file with its original name in the webroot or passes it to backend processing utilities, the script executes with server privileges.

### The DocumentVault Mitigation
For every incoming file:
1. **In-Memory Streaming**: File buffer is received via Multer memory storage; no bytes touch disk before validation.
2. **Magic-Byte Signature Verification**: The server inspects the first 8–32 raw bytes:
   - PDF: Must begin with `%PDF-` (`0x25 0x50 0x44 0x46`).
   - PNG: Must begin with `\x89PNG\r\n\x1a\n` (`0x89 0x50 0x4E 0x47 0x0D 0x0A 0x1A 0x0A`).
   - JPEG: Must begin with `0xFF 0xD8 0xFF`.
   - DOCX / PPTX: Must begin with `PK\x03\x04` and contain the OpenXML relationship directory.
   - TXT: Must contain valid printable UTF-8/ASCII without executable interpreter markers.
3. **Script Code Scanning**: Even if disguised with `.pdf` or `.png`, the scanner inspects for script signatures:
   - Python: `#!/usr/bin/env python`, `print(`, `import os`, `def `
   - Shell: `#!/bin/bash`, `chmod +x`, `curl `
   - PHP: `<?php`, `eval(`, `system(`
   - PE32 Executables: `0x4D 0x5A` (`MZ` header)
   - ELF Executables: `0x7F 0x45 0x4C 0x46`
4. **UUID Randomization**: Files are stored with a cryptographically random UUID (`crypto.randomUUID() + ".bin"`).
5. **Non-Executable Storage**: Stored outside the webroot in `storage/uploads/` with `0644` read-only permissions.
6. **Safe Download Proxy**: Downloads enforce `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.

---

## 3. SQL Injection Playground (Vulnerable vs Secure)

### Vulnerability Explanation
In the **Vulnerable Example**, query strings are constructed using direct string concatenation:
```sql
SELECT * FROM lab_documents WHERE title LIKE '%" + userInput + "%';
```
When a user submits:
```sql
' OR '1'='1
```
The database parser evaluates the query tree as:
```sql
WHERE title LIKE '%' OR '1'='1'%'
```
Since `'1'='1'` is always true, every document in the table is returned, completely bypassing search filters and authorization logic.

Furthermore, with UNION injection:
```sql
' UNION SELECT id, username, email, fake_role, fake_password_hash, 1, fake_api_token, account_notes FROM lab_users --
```
An attacker extracts user credentials and password hashes directly into the search results.

### Parameterized Mitigation
In the **Secure Example**, the database pre-compiles the query template:
```typescript
const stmt = labDb.prepare("SELECT * FROM lab_documents WHERE title LIKE ? OR category LIKE ?;");
stmt.bind([`%${userInput}%`, `%${userInput}%`]);
```
- The query syntax tree is compiled **before** user input is introduced.
- User input is treated strictly as literal data.
- Quotes, hyphens, and `UNION` statements are treated merely as search characters, rendering SQL injection mathematically impossible.

---

## 4. Database Schema

### Production Database (`storage/documentvault_production.sqlite`)
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE documents (
  id TEXT PRIMARY KEY,
  original_filename TEXT NOT NULL,
  stored_filename TEXT NOT NULL,
  detected_mime_type TEXT NOT NULL,
  extension_claimed TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  upload_timestamp TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  upload_status TEXT NOT NULL,
  validation_details TEXT NOT NULL
);
```

### Isolated Lab Database (`storage/sql_lab_isolated.sqlite`)
```sql
CREATE TABLE lab_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  file_type TEXT NOT NULL,
  security_classification TEXT NOT NULL,
  is_confidential INTEGER NOT NULL,
  upload_date TEXT NOT NULL
);

CREATE TABLE lab_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  fake_role TEXT NOT NULL,
  fake_password_hash TEXT NOT NULL,
  fake_api_token TEXT NOT NULL,
  account_notes TEXT NOT NULL
);

CREATE TABLE lab_audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  ip_address TEXT NOT NULL
);
```

---

## 5. Local Setup & Execution Guide

The application runs as a unified full-stack Node.js process using Express and Vite.

### Prerequisites
- Node.js (v18.x or later)
- npm (v9.x or later)

### Single Documented Setup Process

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Run in Development Mode** (Hot-compiling Vite + Express backend):
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

3. **Production Build & Launch**:
   ```bash
   npm run build
   npm start
   ```

---

## 6. Educational Safety Boundaries

This lab is strictly intended for educational training and defensive security engineering:
- All intentionally vulnerable endpoints query **exclusively** the synthetic SQLite sandbox.
- No real credentials, production tables, host filesystem commands, or cloud API keys are exposed.
- All simulated breach records are explicitly tagged: `SIMULATED DATA — NOT PRODUCTION DATA`.
- Uploaded test payloads are never executed on the host system.
