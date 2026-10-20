"""
seed.py - Seeds database.db with dummy users and 10 dummy document records.
Also generates inert placeholder files in the uploads/ folder.
"""

import os
import uuid
from datetime import datetime
from database import get_db_connection, init_db, UPLOADS_DIR


def seed():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Clear existing demo data to ensure a fresh baseline
    cursor.execute("DELETE FROM users;")
    cursor.execute("DELETE FROM documents;")

    # 1. Seed dummy users
    users_data = [
        ("alice", "demo123", "student"),
        ("bob", "test123", "student"),
        ("charlie", "teach123", "faculty"),
        ("admin", "admin123", "administrator"),
    ]

    cursor.executemany("""
        INSERT INTO users (username, password, role) VALUES (?, ?, ?);
    """, users_data)

    # 2. Seed 10 dummy documents
    dummy_docs = [
        ("project_report.pdf", ".pdf", b"%PDF-1.4\n% Dummy compiler project report text"),
        ("compiler_design.pdf", ".pdf", b"%PDF-1.4\n% Lexical analysis and AST parsing notes"),
        ("dbms_notes.pdf", ".pdf", b"%PDF-1.4\n% Relational algebra and query planning"),
        ("sql_injection_notes.txt", ".txt", b"SQL Injection occurs when untrusted input is interpolated into query grammar."),
        ("os_assignment.docx", ".docx", b"PK\x03\x04 Operating Systems Process Scheduling Homework"),
        ("cn_assignment.pptx", ".pptx", b"PK\x03\x04 Computer Networks TCP/IP Presentation"),
        ("research_paper.pdf", ".pdf", b"%PDF-1.4\n% Research paper on static analysis for query vulnerabilities"),
        ("architecture.jpg", ".jpg", b"\xFF\xD8\xFF Dummy JPEG architectural diagram binary stream"),
        ("network_diagram.png", ".png", b"\x89PNG\r\n\x1a\n Dummy PNG network topology image"),
        ("final_presentation.pptx", ".pptx", b"PK\x03\x04 Final Compiler Design Project Defense Slides"),
    ]

    for original_name, ext, dummy_bytes in dummy_docs:
        stored_name = f"{uuid.uuid4().hex[:12]}_{original_name}"
        stored_path = os.path.join(UPLOADS_DIR, stored_name)

        # Write dummy inert file to uploads/
        with open(stored_path, "wb") as f:
            f.write(dummy_bytes)

        file_size = len(dummy_bytes)
        upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cursor.execute("""
            INSERT INTO documents (
                filename, original_filename, file_extension,
                file_size, upload_date, file_path
            ) VALUES (?, ?, ?, ?, ?, ?);
        """, (stored_name, original_name, ext, file_size, upload_date, stored_path))

    conn.commit()
    conn.close()
    print("[*] Successfully seeded database.db with 4 users and 10 dummy documents.")


if __name__ == "__main__":
    seed()
