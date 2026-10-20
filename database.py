"""
database.py - Database setup and connection helpers for Document Vault.
Uses standard Python sqlite3 with two main tables: 'documents' and 'users'.
"""

import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "database.db")
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

os.makedirs(UPLOADS_DIR, exist_ok=True)


def get_db_connection():
    """Returns a SQLite database connection with row dictionary access."""
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema if tables do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Documents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_extension TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            upload_date TEXT NOT NULL,
            file_path TEXT NOT NULL
        );
    """)

    # 2. Users table (fake demo accounts)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        );
    """)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    init_db()
    print("[*] database.db tables initialized successfully.")
