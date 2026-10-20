"""
app.py - Flask Web Application for Compiler Design SQL Injection Lab
Author: College Compiler Design Courseware
Run locally:
    python seed.py
    python app.py
"""

import os
import uuid
from datetime import datetime
from flask import (
    Flask,
    render_to_response,
    request,
    redirect,
    url_for,
    send_file,
    jsonify,
    Response,
    render_template
)
from database import get_db_connection, init_db, UPLOADS_DIR

app = Flask(__name__)
app.config["SECRET_KEY"] = "compiler-lab-secret-key-123"
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024  # 16 MB max

ALLOWED_EXTENSIONS = {
    "pdf", "doc", "docx", "ppt", "pptx",
    "txt", "jpg", "jpeg", "png"
}


def allowed_file(filename):
    """Checks if the file extension is in the permitted whitelist."""
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/")
def index():
    """Home landing page with project overview."""
    return render_template("index.html")


@app.route("/upload", methods=["GET", "POST"])
def upload():
    """
    File Upload Page:
    Accepts PDF, DOC, DOCX, PPT, PPTX, TXT, JPG, PNG.
    Stores as inert binary data with UUID to prevent path traversal.
    Never executes the uploaded file.
    """
    message = None
    status = None

    if request.method == "POST":
        if "file" not in request.files:
            message = "No file selected."
            status = "error"
        else:
            file = request.files["file"]
            if file.filename == "":
                message = "No file selected."
                status = "error"
            elif not allowed_file(file.filename):
                message = f"File type not permitted. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
                status = "error"
            else:
                original_filename = file.filename
                ext = "." + original_filename.rsplit(".", 1)[1].lower()
                stored_filename = f"{uuid.uuid4().hex[:12]}_{original_filename}"
                file_path = os.path.join(UPLOADS_DIR, stored_filename)

                # Save file inertly (never execute!)
                file.save(file_path)
                file_size = os.path.getsize(file_path)
                upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                # Insert into documents table
                conn = get_db_connection()
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO documents (
                        filename, original_filename, file_extension,
                        file_size, upload_date, file_path
                    ) VALUES (?, ?, ?, ?, ?, ?);
                """, (stored_filename, original_filename, ext, file_size, upload_date, file_path))
                conn.commit()
                conn.close()

                message = f"File '{original_filename}' successfully stored in database. Stored safely as inert data."
                status = "success"

    return render_template("upload.html", message=message, status=status)


@app.route("/documents")
def documents():
    """Displays all uploaded document records from SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, filename, original_filename, file_extension, file_size, upload_date
        FROM documents ORDER BY id DESC;
    """)
    docs = cursor.fetchall()
    conn.close()
    return render_template("documents.html", documents=docs)


@app.route("/download/<int:doc_id>")
def download(doc_id):
    """Safely downloads a file by database ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT filename, original_filename, file_path FROM documents WHERE id = ?;", (doc_id,))
    doc = cursor.fetchone()
    conn.close()

    if not doc or not os.path.exists(doc["file_path"]):
        return "File not found.", 404

    return send_file(
        doc["file_path"],
        as_attachment=True,
        download_name=doc["original_filename"]
    )


@app.route("/sql-lab")
def sql_lab():
    """SQL Injection Demonstration Page."""
    return render_template("sql_lab.html")


@app.route("/api/execute-sql", methods=["POST"])
def execute_sql():
    """
    Executes either Vulnerable (string concatenation) or Secure (parameterized) query.
    Returns executed SQL string and result rows for compiler testing.
    """
    data = request.get_json() or {}
    user_input = data.get("username", "")
    mode = data.get("mode", "vulnerable")  # 'vulnerable' or 'secure'

    conn = get_db_connection()
    cursor = conn.cursor()

    if mode == "vulnerable":
        # INTENTIONALLY VULNERABLE: Direct string interpolation
        # Query grammar is modified if user_input contains SQL syntax like ' OR '1'='1
        generated_sql = f"SELECT id, username, role FROM users WHERE username = '{user_input}';"
        try:
            cursor.execute(generated_sql)
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()

            # Check if injection altered logic (e.g. multiple users returned or tautology)
            is_vulnerable = len(rows) > 1 or ("' OR" in user_input.upper()) or ("' UNION" in user_input.upper())

            return jsonify({
                "success": True,
                "mode": "Vulnerable (String Concatenation)",
                "generated_sql": generated_sql,
                "user_input": user_input,
                "results": rows,
                "row_count": len(rows),
                "is_vulnerable": is_vulnerable,
                "status_message": "SQL Injection vulnerability demonstrated." if is_vulnerable else "Normal query execution."
            })
        except Exception as e:
            conn.close()
            return jsonify({
                "success": False,
                "mode": "Vulnerable (String Concatenation)",
                "generated_sql": generated_sql,
                "user_input": user_input,
                "error": str(e),
                "status_message": f"SQL Syntax Error: {str(e)} (Compiler can analyze this syntax mutation)"
            })

    else:
        # SECURE: Parameterized prepared statement with '?' placeholder
        generated_sql = "SELECT id, username, role FROM users WHERE username = ?;"
        try:
            cursor.execute(generated_sql, (user_input,))
            rows = [dict(r) for r in cursor.fetchall()]
            conn.close()

            return jsonify({
                "success": True,
                "mode": "Parameterized Query — Secure",
                "generated_sql": generated_sql,
                "bound_parameter": user_input,
                "user_input": user_input,
                "results": rows,
                "row_count": len(rows),
                "is_vulnerable": False,
                "status_message": "Parameterized Query — Secure. Input is treated strictly as literal data."
            })
        except Exception as e:
            conn.close()
            return jsonify({
                "success": False,
                "mode": "Parameterized Query — Secure",
                "generated_sql": generated_sql,
                "error": str(e)
            })


@app.route("/export-query")
def export_query():
    """Exports generated SQL query as a plain text file for compiler input."""
    sql = request.args.get("sql", "SELECT id, username, role FROM users WHERE username = '' OR '1'='1';")
    return Response(
        sql,
        mimetype="text/plain",
        headers={"Content-Disposition": "attachment;filename=generated_query.txt"}
    )


@app.route("/compiler-demo")
def compiler_demo():
    """Compiler analysis guide and syntax comparison."""
    return render_template("compiler_demo.html")


if __name__ == "__main__":
    init_db()
    # Runs locally on port 5000 (or specified port)
    app.run(host="0.0.0.0", port=5000, debug=True)
