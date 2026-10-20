import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, XCircle, ShieldCheck, Database, FileText, Binary, Lock, AlertTriangle, Cpu } from 'lucide-react';

export const AttackFlowVisualizer: React.FC = () => {
  const [activeFlow, setActiveFlow] = useState<'upload' | 'sqli-vulnerable' | 'sqli-secure'>('upload');
  const [activeStep, setActiveStep] = useState<number>(0);

  const uploadSteps = [
    {
      title: '1. User Upload',
      subtitle: 'Client submits multipart file',
      icon: FileText,
      description: 'User submits a file with a claimed filename (e.g. document.pdf) and browser-provided Content-Type header.',
      securityInsight: 'The browser-provided MIME type and extension are untrusted user input that attackers can easily spoof.',
      status: 'neutral',
    },
    {
      title: '2. Filename Extraction',
      subtitle: 'Check extension & sanitize',
      icon: Cpu,
      description: 'System isolates the extension (.pdf), strips path traversal sequences (../), and queues buffer for inspection.',
      securityInsight: 'Crucial: Never trust the extension alone. A Python or Bash script can be renamed to document.pdf.',
      status: 'warning',
    },
    {
      title: '3. Content Inspection',
      subtitle: 'Read raw binary magic bytes',
      icon: Binary,
      description: 'The server reads the first 8-32 bytes in memory (e.g. looking for 25 50 44 46 for %PDF- or 89 50 4E 47 for PNG).',
      securityInsight: 'Deep inspection catches disguised scripts (Python, Bash, PHP, JS, PE32) regardless of file extension.',
      status: 'highlight',
    },
    {
      title: '4. Type Verification',
      subtitle: 'Compare claimed vs detected',
      icon: ShieldCheck,
      description: 'Cross-references detected MIME with claimed extension. If a discrepancy exists, execution halts immediately.',
      securityInsight: 'Discrepancy test: Claimed .pdf + detected Python script = REJECTED and blocked from disk.',
      status: 'secure',
    },
    {
      title: '5. Safe Storage',
      subtitle: 'UUID filename & non-executable',
      icon: Lock,
      description: 'File is renamed to a cryptographically random UUID (e.g. 8f9b...a1.bin) and saved outside webroot with 0644 mode.',
      securityInsight: 'Prevents Path Traversal, prevents overwriting system files, and ensures web server never executes uploaded bytes.',
      status: 'secure',
    },
    {
      title: '6. Database Record',
      subtitle: 'Parameterized metadata storage',
      icon: Database,
      description: 'Metadata (original name, detected MIME, UUID, size, timestamp) is logged via parameterized SQL insert.',
      securityInsight: 'User filename is kept strictly as text data in the database, never as an active filesystem path.',
      status: 'secure',
    },
  ];

  const sqliVulnerableSteps = [
    {
      title: '1. User Input',
      subtitle: "Attacker supplies payload: ' OR '1'='1",
      icon: FileText,
      description: 'User enters a malicious search string into a web input field.',
      securityInsight: "Contains special characters (quotes, dashes, UNION) intended to alter SQL parser logic.",
      status: 'warning',
    },
    {
      title: '2. Vulnerable SQL Query',
      subtitle: 'Unsanitized string concatenation',
      icon: AlertTriangle,
      description: 'Query is built with string concatenation: SELECT * FROM lab_documents WHERE title LIKE \'%\' + input + \'%\'',
      securityInsight: 'CRITICAL FLAW: User input becomes part of the executable SQL grammar rather than literal data.',
      status: 'danger',
    },
    {
      title: '3. SQL Injection',
      subtitle: 'Grammar tree hijacked',
      icon: Cpu,
      description: "The SQL parser sees: ...WHERE title LIKE '%' OR '1'='1'%' which evaluates to TRUE for all rows.",
      securityInsight: 'The query semantics are rewritten by untrusted user data, breaking authorization checks.',
      status: 'danger',
    },
    {
      title: '4. Isolated Demo Database',
      subtitle: 'Query executes in sandbox',
      icon: Database,
      description: 'The query executes strictly inside the isolated SQLite lab database (sql_lab_isolated.sqlite).',
      securityInsight: 'Controlled lab isolation prevents the exploit from reaching production database or operating system.',
      status: 'warning',
    },
    {
      title: '5. Synthetic Data Exposed',
      subtitle: 'Simulated breach demo',
      icon: XCircle,
      description: 'All synthetic records (or UNION-extracted demo user password hashes) are returned to the screen.',
      securityInsight: 'SIMULATED DATA — NOT PRODUCTION DATA. Real application records remain completely untouched.',
      status: 'danger',
    },
  ];

  const sqliSecureSteps = [
    {
      title: '1. User Input',
      subtitle: "Attacker supplies payload: ' OR '1'='1",
      icon: FileText,
      description: 'User enters the exact same malicious search string into the secure search interface.',
      securityInsight: "Payload contains SQL operators (' OR '1'='1), but backend handles it safely.",
      status: 'neutral',
    },
    {
      title: '2. Parameterized Query',
      subtitle: 'Pre-compiled query template',
      icon: ShieldCheck,
      description: 'Database prepares the query structure: SELECT * FROM lab_documents WHERE title LIKE ? OR category LIKE ?',
      securityInsight: 'The SQL grammar and execution plan are fixed BEFORE any user data is evaluated.',
      status: 'secure',
    },
    {
      title: '3. Parameter Binding',
      subtitle: 'Input treated strictly as data',
      icon: Binary,
      description: "Input is bound to parameter placeholders as a literal string value: '%\\' OR \\'1\\'=\\'1%'",
      securityInsight: 'Quotes and SQL keywords inside user input are treated purely as literal search characters.',
      status: 'secure',
    },
    {
      title: '4. Safe Execution',
      subtitle: 'Database searches for literal string',
      icon: Database,
      description: 'Database executes the pre-compiled plan, looking for rows containing the literal text "\' OR \'1\'=\'1".',
      securityInsight: 'Zero possibility of query logic alteration, regardless of what characters are supplied.',
      status: 'secure',
    },
    {
      title: '5. Intended Records Only',
      subtitle: 'Zero data leakage',
      icon: CheckCircle2,
      description: 'Only documents legitimately containing that literal phrase (typically 0 rows) are returned.',
      securityInsight: 'Confidential records and synthetic user tables remain completely protected.',
      status: 'secure',
    },
  ];

  const currentSteps =
    activeFlow === 'upload'
      ? uploadSteps
      : activeFlow === 'sqli-vulnerable'
      ? sqliVulnerableSteps
      : sqliSecureSteps;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            Security Attack Flow & Defense Visualization
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Step-by-step pipeline execution and comparison between insecure and defended flows
          </p>
        </div>

        {/* Flow Selector */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium self-start sm:self-auto">
          <button
            onClick={() => {
              setActiveFlow('upload');
              setActiveStep(0);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeFlow === 'upload'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            File Validation Pipeline
          </button>
          <button
            onClick={() => {
              setActiveFlow('sqli-vulnerable');
              setActiveStep(0);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeFlow === 'sqli-vulnerable'
                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Vulnerable SQL Flow
          </button>
          <button
            onClick={() => {
              setActiveFlow('sqli-secure');
              setActiveStep(0);
            }}
            className={`px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
              activeFlow === 'sqli-secure'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Secure Parameterized Flow
          </button>
        </div>
      </div>

      {/* Pipeline Node Diagram */}
      <div className="overflow-x-auto pb-4 pt-2">
        <div className="flex items-center min-w-max gap-2 sm:gap-3">
          {currentSteps.map((step, idx) => {
            const Icon = step.icon;
            const isSelected = activeStep === idx;

            let badgeColor = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
            if (step.status === 'danger') {
              badgeColor = 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
            } else if (step.status === 'secure') {
              badgeColor = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60';
            } else if (step.status === 'warning') {
              badgeColor = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/60';
            } else if (step.status === 'highlight') {
              badgeColor = 'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-900/60';
            }

            return (
              <React.Fragment key={idx}>
                <button
                  onClick={() => setActiveStep(idx)}
                  className={`flex flex-col text-left p-3 rounded-lg border transition-all w-44 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'ring-2 ring-emerald-500 border-emerald-500 shadow-sm bg-slate-50 dark:bg-slate-800/80'
                      : 'hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`p-1.5 rounded-md border text-xs ${badgeColor}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <span className="text-[10px] font-mono font-medium text-slate-600 dark:text-slate-300">
                      Step {idx + 1}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {step.title}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                    {step.subtitle}
                  </div>
                </button>

                {idx < currentSteps.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Step Detail Explanation Panel */}
      {currentSteps[activeStep] && (
        <div className="mt-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  Detailed Inspection:
                </span>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  {currentSteps[activeStep].title} — {currentSteps[activeStep].subtitle}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                {currentSteps[activeStep].description}
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[11px] font-mono text-slate-600 dark:text-slate-300">
                Step {activeStep + 1} of {currentSteps.length}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 flex items-start gap-2 text-xs">
            <span className="font-semibold text-slate-800 dark:text-slate-200 shrink-0">
              Security Rationale:
            </span>
            <span className="text-slate-600 dark:text-slate-400">
              {currentSteps[activeStep].securityInsight}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
