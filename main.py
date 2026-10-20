"""
Document Upload Security Lab - FastAPI Educational Backend
Author: College Cybersecurity Lab Courseware
Purpose: Demonstrates extension-only file validation risks and SQL injection vs parameterization.

Run locally:
    pip install -r requirements.txt
    uvicorn main:app --reload
"""

import os
import sqlite3
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

# Initialize FastAPI app
app = FastAPI(title="Document Upload Security Lab")

# Enable CORS for local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Base directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")
STATIC_DIR = os.path.join(BASE_DIR, "static")

DOCS_DB_FILE = os.path.join(BASE_DIR, "documents.db")
SQL_LAB_DB_FILE = os.path.join(BASE_DIR, "sql_lab.db")

# Ensure uploads directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)

# Permitted extensions whitelist (demonstrating extension-only validation)
ALLOWED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx",
    ".txt", ".jpg", ".jpeg", ".png"
}


# =====================================================================
# Database Setup Functions
# =====================================================================

def init_databases():
    """Initializes the two separate SQLite databases on startup."""

    # 1. documents.db - Stores real application upload metadata
    with sqlite3.connect(DOCS_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                original_filename TEXT NOT NULL,
                stored_filename TEXT NOT NULL,
                extension TEXT NOT NULL,
                file_size INTEGER NOT NULL,
                upload_timestamp TEXT NOT NULL,
                storage_path TEXT NOT NULL
            );
        """)
        conn.commit()

    # 2. sql_lab.db - Contains ONLY synthetic demonstration data
    with sqlite3.connect(SQL_LAB_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS demo_documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                filename TEXT NOT NULL,
                author TEXT NOT NULL,
                category TEXT NOT NULL
            );
        """)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS demo_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL,
                role TEXT NOT NULL
            );
        """)

        # Seed synthetic records if empty
        cursor.execute("SELECT COUNT(*) FROM demo_documents;")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("""
                INSERT INTO demo_documents (filename, author, category) VALUES (?, ?, ?);
            """, [
                ("report.pdf", "Alice", "Finance"),
                ("assignment.docx", "Bob", "Academics"),
                ("presentation.pptx", "Carol", "Marketing"),
                ("sample.txt", "Dave", "Notes"),
                ("photo.png", "Eve", "Images"),
            ])

        cursor.execute("SELECT COUNT(*) FROM demo_users;")
        if cursor.fetchone()[0] == 0:
            cursor.executemany("""
                INSERT INTO demo_users (username, role) VALUES (?, ?);
            """, [
                ("alice", "student"),
                ("bob", "researcher"),
                ("admin_demo", "administrator"),
            ])
        conn.commit()


# Run initialization on module load
init_databases()


# =====================================================================
# 1. File Upload & Document Management Endpoints
# =====================================================================

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Educational Upload Endpoint:
    Demonstrates extension-only validation. Does NOT inspect binary magic bytes.
    A python file renamed to .pdf will be accepted.
    Generates a random UUID so user input never becomes a filesystem path.
    NEVER executes the uploaded file.
    """
    original_filename = file.filename or "unknown.bin"
    _, ext = os.path.splitext(original_filename.lower())

    # Check extension against permitted whitelist
    if ext not in ALLOWED_EXTENSIONS:
        return JSONResponse(
            status_code=400,
            content={
                "success": False,
                "error": f"Extension '{ext}' not allowed. Permitted: PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG."
            }
        )

    # Read file content safely into memory
    content = await file.read()
    file_size = len(content)

    # Generate a random UUID for safe storage (prevents Path Traversal)
    stored_filename = f"{uuid.uuid4()}{ext}"
    storage_path = os.path.join(UPLOADS_DIR, stored_filename)

    # Save file as inert data with non-executable permissions
    with open(storage_path, "wb") as f:
        f.write(content)

    # Store metadata in documents.db
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with sqlite3.connect(DOCS_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO documents (
                original_filename, stored_filename, extension,
                file_size, upload_timestamp, storage_path
            ) VALUES (?, ?, ?, ?, ?, ?);
        """, (original_filename, stored_filename, ext, file_size, timestamp, storage_path))
        doc_id = cursor.lastrowid
        conn.commit()

    return {
        "success": True,
        "message": "File uploaded successfully.",
        "demonstration_notice": {
            "original_filename": original_filename,
            "extension_accepted": ext,
            "stored_successfully": "YES",
            "execution": "NEVER",
            "explanation": "The application accepted the file because it trusted the extension. In a real vulnerable application, unsafe processing of such a file could create serious security problems. This laboratory intentionally does not execute the uploaded content."
        },
        "document": {
            "id": doc_id,
            "original_filename": original_filename,
            "stored_filename": stored_filename,
            "extension": ext,
            "file_size": file_size,
            "upload_timestamp": timestamp
        }
    }


@app.get("/api/documents")
def get_documents():
    """Returns all metadata records from documents.db."""
    with sqlite3.connect(DOCS_DB_FILE) as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, original_filename, extension, file_size, upload_timestamp, stored_filename
            FROM documents ORDER BY id DESC;
        """)
        rows = cursor.fetchall()

    documents = [
        {
            "id": r[0],
            "original_filename": r[1],
            "extension": r[2],
            "file_size": r[3],
            "upload_timestamp": r[4],
            "stored_filename": r[5]
        }
        for r in rows
    ]
    return {"documents": documents}


@app.get("/api/download/{stored_filename}")
def download_file(stored_filename: str):
    """
    Safely downloads a file by stored UUID.
    Validates filename to prevent path traversal (e.g. ../../etc/passwd).
    """
    # Sanitize: ensure no path separators in parameter
    safe_filename = os.path.basename(stored_filename)
    file_path = os.path.join(UPLOADS_DIR, safe_filename)

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/octet-stream"
    )


# =====================================================================
# 2. SQL Injection Lab Endpoints (OPERATES ONLY ON sql_lab.db)
# =====================================================================

@app.get("/api/sql-lab/vulnerable-search")
def vulnerable_search(query: str = ""):
    """
    INTENTIONALLY VULNERABLE ENDPOINT - FOR EDUCATIONAL USE ONLY.
    Constructs raw SQL via string concatenation against the isolated sql_lab.db.
    """
    # Vulnerable query construction:
    raw_sql = f"SELECT id, filename, author, category FROM demo_documents WHERE filename = '{query}';"

    try:
        with sqlite3.connect(SQL_LAB_DB_FILE) as conn:
            cursor = conn.cursor()
            cursor.execute(raw_sql)
            rows = cursor.fetchall()

        results = [
            {"id": r[0], "filename": r[1], "author": r[2], "category": r[3]}
            for r in rows
        ]

        return {
            "success": True,
            "mode": "VULNERABLE QUERY",
            "executed_sql": raw_sql,
            "user_input": query,
            "concept_flow": "User input → SQL string → unintended query behavior",
            "results": results,
            "count": len(results)
        }
    except Exception as e:
        return {
            "success": False,
            "mode": "VULNERABLE QUERY",
            "executed_sql": raw_sql,
            "user_input": query,
            "error": str(e),
            "results": []
        }


@app.get("/api/sql-lab/secure-search")
def secure_search(query: str = ""):
    """
    SECURE ENDPOINT - Uses parameterized query (prepared statement).
    Treats user input strictly as literal data.
    """
    with sqlite3.connect(SQL_LAB_DB_FILE) as conn:
        cursor = conn.cursor()
        # Parameterized query with ? placeholder
        cursor.execute(
            "SELECT id, filename, author, category FROM demo_documents WHERE filename = ?;",
            (query,)
        )
        rows = cursor.fetchall()

    results = [
        {"id": r[0], "filename": r[1], "author": r[2], "category": r[3]}
        for r in rows
    ]

    return {
        "success": True,
        "mode": "SECURE QUERY",
        "parameterized_template": "SELECT id, filename, author, category FROM demo_documents WHERE filename = ?;",
        "bound_value": query,
        "concept_flow": "User input → parameterized value → treated as data",
        "results": results,
        "count": len(results)
    }


# Mount static assets if static directory exists
if os.path.exists(STATIC_DIR):
    app.mount("/", StaticFiles(directory=STATIC_DIR, html=True), name="static")
