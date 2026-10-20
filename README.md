# Document Vault - SQL Injection Compiler Lab

A local educational web application designed for a **Compiler Design Project** demonstrating how SQL Injection occurs in web applications and providing controlled SQL query patterns for compiler static analysis and Abstract Syntax Tree (AST) detection.

---

## Safety & Educational Boundary Notice

> **IMPORTANT:** This application is for **LOCAL EDUCATIONAL LAB DEMONSTRATIONS ONLY**. It runs locally on SQLite using completely synthetic dummy users and documents. It must never be connected to real production databases, real user credentials, or exposed to the public internet. Uploaded files are stored strictly as inert data with generated UUIDs and are **never executed**.

---

## 1. Project Directory Structure

```text
sql_injection_compiler_lab/
│
├── app.py              # Main Flask application and API endpoints
├── database.py         # SQLite connection setup and table definitions
├── seed.py             # Database seeder (dummy users & 10 documents)
├── requirements.txt    # Python dependencies (Flask)
├── README.md           # Setup, testing, and Compiler viva guide
│
├── database.db         # SQLite database file (auto-generated)
├── uploads/            # Local inert file storage directory
│
├── templates/          # HTML templates
│   ├── index.html      # Landing page & architecture
│   ├── upload.html     # File upload form (PDF, DOCX, TXT, PNG, etc.)
│   ├── documents.html  # Document library table & safe download
│   ├── sql_lab.html    # Red/Green SQL Injection Lab & Compiler Export
│   └── compiler_demo.html # Compiler Design AST & token explanation
│
└── static/
    └── style.css       # Clean, lightweight CSS stylesheet
```

---

## 2. Windows VS Code Step-by-Step Setup Instructions

Follow these exact steps in **Visual Studio Code**:

### Step 1: Open Terminal in VS Code
Open VS Code, press <kbd>Ctrl</kbd> + <kbd>`</kbd> (or go to **Terminal &rarr; New Terminal**). Ensure you are in the project folder:
```powershell
pwd
```

### Step 2: Create a Virtual Environment
```powershell
python -m venv venv
```

### Step 3: Activate the Virtual Environment
On Windows PowerShell:
```powershell
.\venv\Scripts\Activate.ps1
```
*(If PowerShell displays an execution policy error, run `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process` first, or activate via Command Prompt using `venv\Scripts\activate.bat`)*

On macOS / Linux:
```bash
source venv/bin/activate
```

### Step 4: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 5: Run the Dataset Seeder
```bash
python seed.py
```
*Output: `[*] Successfully seeded database.db with 4 users and 10 dummy documents.`*

### Step 6: Start the Flask Application
```bash
python app.py
```
*Output: `Running on http://127.0.0.1:5000`*

### Step 7: Open the Website in Your Browser
Open your browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 3. Demonstration Walkthrough

### Step 8: Upload Sample Documents
1. Click **Upload Documents** in the navigation bar.
2. Select any sample file (`.pdf`, `.docx`, `.pptx`, `.txt`, `.jpg`, `.png`).
3. Click **Upload Document**.
4. The file is saved as inert binary data with a generated UUID in `uploads/` and logged in `database.db`.

### Step 9: Open the SQL Injection Lab
1. Click **SQL Injection Lab** in the navigation bar (`/sql-lab`).
2. Notice the two color-coded comparison cards:
   - **RED / WARNING SECTION**: Vulnerable SQL (string concatenation).
   - **GREEN / SECURE SECTION**: Parameterized SQL (prepared statement).

### Step 10: Run the Controlled Vulnerable Demonstration
1. In the username input, enter the standard compiler test payload:
   ```text
   ' OR '1'='1
   ```
2. Click **Run Vulnerable Query**.
3. **Observation:**
   - The generated query becomes:
     ```sql
     SELECT id, username, role FROM users WHERE username = '' OR '1'='1';
     ```
   - Because `'1'='1'` evaluates to true for every row, all 4 user accounts (`alice`, `bob`, `charlie`, `admin`) are dumped!
   - Status message displays: `"SQL Injection vulnerability demonstrated."`

### Step 11: Export the Query for Your Compiler
1. Click **Copy Query** to copy the generated SQL directly to your clipboard.
2. OR click **Download Query (.txt)** to save it as `generated_query.txt`.

### Step 12: Pass the SQL into Your Compiler Project
Pass the copied string or `generated_query.txt` into your compiler analyzer:
```bash
# Example running your compiler:
python your_compiler.py generated_query.txt
```

### Step 13: Show the Compiler's Detection
Your compiler analyzes the lexical tokens and AST, identifying that user input modified the grammar tree into an unexpected binary expression.

### Step 14: Run the Secure Parameterized Version
1. Back on the website, with the exact same input `' OR '1'='1`, click **Run Secure Query**.
2. **Observation:**
   - The database compiles the template:
     ```sql
     SELECT id, username, role FROM users WHERE username = ?;
     ```
   - The value `' OR '1'='1` is passed strictly as literal string data.
   - Zero unintended user records are returned.
   - Status displays: `"Parameterized Query — Secure. Input is treated strictly as literal data."`

### Step 15: Compare the Results
Review the side-by-side output:
- **Vulnerable:** User input &rarr; SQL string interpolation &rarr; altered query grammar &rarr; data leak.
- **Secure:** User input &rarr; parameter binding &rarr; query grammar unchanged &rarr; safe execution.

---

## 4. Key Code Locations in the Project

| Component | Exact File & Location | Description |
|-----------|------------------------|-------------|
| **SQLite Database** | `database.db` (root directory) | Local SQLite file containing `documents` and `users` tables. |
| **Uploaded Files** | `uploads/` (root directory) | Stores uploaded documents with UUID filenames (`<uuid>_<original_name>`). |
| **Vulnerable SQL Code** | `app.py` in `execute_sql()` line 125 | `generated_sql = f"SELECT id, username, role FROM users WHERE username = '{user_input}';"` |
| **Secure SQL Code** | `app.py` in `execute_sql()` line 160 | `cursor.execute("SELECT id, username, role FROM users WHERE username = ?;", (user_input,))` |
| **Database Dataset** | `seed.py` lines 20–45 | Populates 4 demo users and 10 dummy academic documents. |

---

## 5. Compiler Design Viva / Presentation Guide

When presenting this project to your professor or evaluator during your **Compiler Design Viva**, highlight the following compiler concepts:

### 1. Lexical Analysis (Scanning)
- In a secure query, the tokenizer analyzes fixed SQL code:
  `[SELECT], [IDENT: id], [FROM], [IDENT: users], [WHERE], [IDENT: username], [OPERATOR: =], [PLACEHOLDER: ?]`
- In the vulnerable query with `' OR '1'='1`:
  The scanner encounters unexpected quote characters inside the input and generates new tokens:
  `[IDENT: username], [OPERATOR: =], [LITERAL: ''], [KEYWORD: OR], [LITERAL: '1'], [OPERATOR: =], [LITERAL: '1']`

### 2. Syntax Analysis (Parsing & AST)
- Explain that the **Abstract Syntax Tree (AST)** is mutated:
  - Intended AST: An equality comparison node (`BinaryOp: Equals(username, ?)`)
  - Injected AST: A root disjunction node (`BinaryOp: OR(Equals(username, ''), Equals('1', '1'))`)
- Point out that your compiler detects this anomaly by identifying dynamic syntax tree node additions derived from untrusted input streams.

### 3. Static Code Analysis & Taint Tracking
- Your compiler flags string concatenation patterns (`+`, `.format()`, f-strings) on database execution methods as a **Taint Sink**.
- It recommends remediation: Replacing concatenation with prepared statement placeholders (`?`).
