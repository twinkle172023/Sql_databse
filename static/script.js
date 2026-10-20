// Document Upload Security Lab - Client Script

document.addEventListener("DOMContentLoaded", () => {
  // Navigation tabs
  const navBtns = document.querySelectorAll(".nav-btn");
  const tabContents = document.querySelectorAll(".tab-content");

  navBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      navBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.remove("active"));

      btn.classList.add("active");
      const target = document.getElementById(btn.getAttribute("data-tab"));
      if (target) target.classList.add("active");
    });
  });

  // Load uploaded documents on start
  loadDocuments();

  // Handle Document Upload
  const uploadForm = document.getElementById("upload-form");
  const fileInput = document.getElementById("file-input");
  const uploadResult = document.getElementById("upload-result");

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!fileInput.files || fileInput.files.length === 0) return;

    const file = fileInput.files[0];
    const formData = new FormData();
    formData.append("file", file);

    uploadResult.className = "notice-box hidden";

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const demo = data.demonstration_notice;
        uploadResult.className = "notice-box success";
        uploadResult.innerHTML = `
          <strong>Upload Successful (Accepted by Extension Check):</strong><br/>
          Original filename: <code>${demo.original_filename}</code><br/>
          Extension accepted: <code>${demo.extension_accepted}</code><br/>
          Stored successfully: <strong>${demo.stored_successfully}</strong> (as UUID: <code>${data.document.stored_filename}</code>)<br/>
          Execution: <strong>${demo.execution}</strong><br/>
          <p style="margin-top: 8px; font-size: 12px; color: #1e3a1f;">
            <em>"${demo.explanation}"</em>
          </p>
        `;
        fileInput.value = "";
        loadDocuments();
      } else {
        uploadResult.className = "notice-box error";
        uploadResult.innerText = data.error || "Upload rejected.";
      }
    } catch (err) {
      uploadResult.className = "notice-box error";
      uploadResult.innerText = "Network error: " + err.message;
    }
  });

  // SQL Injection Lab handlers
  const sqlInput = document.getElementById("sql-input");
  const runVulnBtn = document.getElementById("run-vuln-btn");
  const runSecureBtn = document.getElementById("run-secure-btn");

  const vulnSqlCode = document.getElementById("vuln-sql-code");
  const secureSqlCode = document.getElementById("secure-sql-code");

  const vulnOutput = document.getElementById("vuln-output");
  const secureOutput = document.getElementById("secure-output");

  runVulnBtn.addEventListener("click", () => runVulnSearch(sqlInput.value));
  runSecureBtn.addEventListener("click", () => runSecureSearch(sqlInput.value));

  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const val = btn.getAttribute("data-val");
      sqlInput.value = val;
      runVulnSearch(val);
      runSecureSearch(val);
    });
  });

  async function runVulnSearch(query) {
    vulnOutput.innerText = "Executing vulnerable query against sql_lab.db...";
    try {
      const res = await fetch(`/api/sql-lab/vulnerable-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      vulnSqlCode.innerText = data.executed_sql || `SELECT * FROM demo_documents WHERE filename = '${query}';`;

      if (data.error) {
        vulnOutput.innerText = `DATABASE ERROR: ${data.error}\n(Verbose error message leaked to client!)`;
      } else {
        vulnOutput.innerText = `Records Returned (${data.count}):\n` + JSON.stringify(data.results, null, 2);
      }
    } catch (err) {
      vulnOutput.innerText = "Error: " + err.message;
    }
  }

  async function runSecureSearch(query) {
    secureOutput.innerText = "Executing parameterized query against sql_lab.db...";
    try {
      const res = await fetch(`/api/sql-lab/secure-search?query=${encodeURIComponent(query)}`);
      const data = await res.json();

      secureSqlCode.innerText = data.parameterized_template || "SELECT * FROM demo_documents WHERE filename = ?;";

      secureOutput.innerText = `Bound parameter: "${query}"\nRecords Returned (${data.count}):\n` + JSON.stringify(data.results, null, 2);
    } catch (err) {
      secureOutput.innerText = "Error: " + err.message;
    }
  }

  async function loadDocuments() {
    const tableBody = document.querySelector("#documents-table tbody");
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();

      if (!data.documents || data.documents.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="text-center" style="color: #94a3b8;">No documents uploaded yet.</td></tr>';
        return;
      }

      tableBody.innerHTML = data.documents.map((doc) => `
        <tr>
          <td>#${doc.id}</td>
          <td><strong>${escapeHtml(doc.original_filename)}</strong></td>
          <td><code>${escapeHtml(doc.extension)}</code></td>
          <td>${formatSize(doc.file_size)}</td>
          <td>${doc.upload_timestamp}</td>
          <td>
            <a href="/api/download/${encodeURIComponent(doc.stored_filename)}" class="btn-download" download>
              Download
            </a>
          </td>
        </tr>
      `).join("");
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="6" style="color: #ef4444;">Failed to load documents: ${err.message}</td></tr>`;
    }
  }

  function formatSize(bytes) {
    if (isNaN(bytes) || bytes === 0) return "0 B";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function escapeHtml(text) {
    const div = document.createElement("div");
    div.innerText = text;
    return div.innerHTML;
  }
});
