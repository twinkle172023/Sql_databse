import React, { useState } from 'react';
import {
  Database,
  AlertTriangle,
  ShieldCheck,
  Play,
  RotateCcw,
  Terminal,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Eye,
  FileCode,
  Layers,
} from 'lucide-react';
import { SqlSearchResult } from '../../types/security.ts';
import { SQL_PAYLOAD_PRESETS, SqlPayloadPreset } from '../../lib/constants.ts';

export const SqlPlaygroundView: React.FC = () => {
  const [queryInput, setQueryInput] = useState<string>("' OR '1'='1");
  const [loading, setLoading] = useState<boolean>(false);
  const [vulnerableResult, setVulnerableResult] = useState<SqlSearchResult | null>(null);
  const [secureResult, setSecureResult] = useState<SqlSearchResult | null>(null);
  const [viewTab, setViewTab] = useState<'comparison' | 'schema' | 'details'>('comparison');
  const [schemaData, setSchemaData] = useState<any | null>(null);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const executeBothQueries = async (customQuery?: string) => {
    const q = customQuery !== undefined ? customQuery : queryInput;
    setLoading(true);
    setResetMessage(null);

    try {
      // 1. Run against Intentionally Vulnerable Lab Endpoint
      const vulnPromise = fetch('/api/sql-lab/vulnerable-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      }).then((r) => r.json());

      // 2. Run against Secure Parameterized Lab Endpoint
      const secPromise = fetch('/api/sql-lab/secure-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      }).then((r) => r.json());

      const [vulnData, secData] = await Promise.all([vulnPromise, secPromise]);
      setVulnerableResult(vulnData);
      setSecureResult(secData);
    } catch (err) {
      console.error('Failed to execute search queries:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (preset: SqlPayloadPreset) => {
    setQueryInput(preset.payload);
    executeBothQueries(preset.payload);
  };

  const handleResetLabDb = async () => {
    try {
      const res = await fetch('/api/sql-lab/reset', { method: 'POST' });
      if (res.ok) {
        setResetMessage('Isolated lab database has been reset to initial synthetic state.');
        setTimeout(() => setResetMessage(null), 4000);
        executeBothQueries("' OR '1'='1");
      }
    } catch (err) {
      console.error('Failed to reset lab db:', err);
    }
  };

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/sql-lab/schema');
      if (res.ok) {
        const data = await res.json();
        setSchemaData(data);
      }
    } catch (err) {
      console.error('Failed to fetch schema:', err);
    }
  };

  // Run initial test if empty
  React.useEffect(() => {
    executeBothQueries("' OR '1'='1");
    fetchSchema();
  }, []);

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Title & Warning Banner */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <span>SQL Injection Playground</span>
              <span className="text-xs px-2 py-0.5 rounded-md font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-800">
                EDUCATIONAL DEMO MODE
              </span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Side-by-side comparison of vulnerable string concatenation vs secure parameterized prepared statements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetLabDb}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Lab DB</span>
            </button>
          </div>
        </div>

        {resetMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{resetMessage}</span>
          </div>
        )}

        {/* Security Warning Callout */}
        <div className="mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-semibold">Security Boundary Notice: </strong>
            This educational endpoint connects <strong className="underline">ONLY</strong> to an isolated SQL Injection Lab Database (<code className="font-mono text-amber-900 dark:text-amber-200">sql_lab_isolated.sqlite</code>) populated solely with synthetic demonstration records. It has <strong className="underline">ZERO ACCESS</strong> to the application's real production database, user credentials, cloud secrets, filesystem execution, or server operating system.
          </div>
        </div>
      </div>

      {/* Payload Selector Presets */}
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Educational Attack Payloads & Test Scenarios:
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {SQL_PAYLOAD_PRESETS.map((preset, idx) => {
            const isCurrent = queryInput === preset.payload;
            return (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isCurrent
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-slate-50 dark:bg-slate-800/80 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {preset.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate mt-1">
                  {preset.payload}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && executeBothQueries()}
              placeholder="Enter search keyword or SQL injection payload (e.g. ' OR '1'='1)..."
              className="w-full px-3.5 py-2.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => executeBothQueries()}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Execute Both Models</span>
          </button>
        </div>

        {/* View Switcher */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewTab('comparison')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewTab === 'comparison'
                  ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Side-by-Side Execution
            </button>
            <button
              onClick={() => setViewTab('schema')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                viewTab === 'schema'
                  ? 'bg-slate-900 text-white dark:bg-slate-700 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              View Isolated Lab Schema
            </button>
          </div>

          <div className="text-slate-400 text-[11px]">
            Input evaluates in parallel against both architectures
          </div>
        </div>
      </div>

      {/* Simulated Database Compromise Panel (Directly addressing Section 6 requirement) */}
      {vulnerableResult?.simulatedCompromise && (
        <div className="rounded-xl border-2 border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-rose-600 text-white">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  Simulation Result
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {vulnerableResult.simulatedCompromise.status}
                </h3>
              </div>
            </div>

            {/* Exactly Required Label: "SIMULATED DATA — NOT PRODUCTION DATA" */}
            <div className="px-3.5 py-1.5 rounded-lg font-mono font-bold text-xs bg-rose-600 text-white border border-rose-700 uppercase tracking-wider self-start sm:self-auto shadow-sm">
              {vulnerableResult.simulatedCompromise.banner}
            </div>
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {vulnerableResult.simulatedCompromise.message} The payload successfully manipulated the query structure, dumping {vulnerableResult.rowCount} synthetic records from the isolated sandbox database.
          </p>

          {/* Boundaries Checklist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-semibold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                <Unlock className="w-4 h-4" />
                Exposed Synthetic Demo Information:
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {vulnerableResult.simulatedCompromise.leakedSyntheticTables.map((tbl, i) => (
                  <li key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-rose-500">✗</span>
                    <span>{tbl}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
              <div className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                What Was Protected & NOT Exposed:
              </div>
              <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                {vulnerableResult.simulatedCompromise.notExposedNotice.map((notice, i) => (
                  <li key={i} className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-emerald-500">✓</span>
                    <span>{notice}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Grid (Addressing Section 5 requirement) */}
      {viewTab === 'comparison' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* A. VULNERABLE IMPLEMENTATION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 bg-rose-50/70 dark:bg-rose-950/30 border-b border-rose-100 dark:border-rose-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Unlock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                  A. Vulnerable Implementation (Concatenated SQL)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-rose-700 dark:text-rose-300 font-semibold px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900/50">
                INSECURE
              </span>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-rose-600 dark:text-rose-400 font-semibold">Core flaw: </strong>
                "Vulnerable implementation: user input becomes part of the SQL statement."
              </div>

              {/* Generated Query Inspection */}
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                  Constructed SQL Query String:
                </label>
                <div className="p-3 rounded-lg bg-slate-950 text-rose-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                  {vulnerableResult?.executedSql || 'Awaiting execution...'}
                </div>
              </div>

              {/* Execution Diagnostics */}
              {vulnerableResult && (
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                  <span>Execution Time: <strong className="font-mono tabular-nums">{vulnerableResult.durationMs}ms</strong></span>
                  <span>Records Returned: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{vulnerableResult.rowCount}</strong></span>
                  <span>Injection Flag: <strong className={vulnerableResult.injectionDetected ? 'text-rose-600' : 'text-slate-500'}>{vulnerableResult.injectionDetected ? 'EXPLOITED' : 'BENIGN'}</strong></span>
                </div>
              )}

              {/* Results Table */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Database Output:
                </label>
                {vulnerableResult?.error ? (
                  <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-mono border border-rose-200 dark:border-rose-900">
                    <strong>Error Disclosure: </strong> {vulnerableResult.error}
                  </div>
                ) : vulnerableResult && vulnerableResult.results.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                        <tr>
                          {vulnerableResult.columns.slice(0, 4).map((c, i) => (
                            <th key={i} className="p-2 font-mono text-[11px]">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {vulnerableResult.results.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {vulnerableResult.columns.slice(0, 4).map((c, ci) => (
                              <td key={ci} className="p-2 truncate max-w-[140px]">
                                {String(r[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 border border-dashed rounded-lg">
                    No records matched query.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* B. SECURE IMPLEMENTATION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
            <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 border-b border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  B. Secure Implementation (Parameterized Query)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50">
                PROTECTED
              </span>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">Defense mechanism: </strong>
                "Secure implementation: user input is treated strictly as data."
              </div>

              {/* Prepared Template Inspection */}
              <div>
                <label className="text-[11px] font-mono uppercase text-slate-500 block mb-1">
                  Pre-Compiled Statement Template:
                </label>
                <div className="p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                  {secureResult?.preparedSqlTemplate || 'SELECT * FROM lab_documents WHERE title LIKE ? OR category LIKE ?;'}
                </div>
                <div className="mt-1 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  Bound Parameter: <span className="text-emerald-600 dark:text-emerald-400">"%{queryInput}%"</span> (Evaluated strictly as literal text)
                </div>
              </div>

              {/* Execution Diagnostics */}
              {secureResult && (
                <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400">
                  <span>Execution Time: <strong className="font-mono tabular-nums">{secureResult.durationMs}ms</strong></span>
                  <span>Records Returned: <strong className="font-mono tabular-nums text-slate-900 dark:text-white">{secureResult.rowCount}</strong></span>
                  <span>Exploitation: <strong className="text-emerald-600 font-semibold">BLOCKED (0 Leak)</strong></span>
                </div>
              )}

              {/* Results Table */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Database Output:
                </label>
                {secureResult && secureResult.results.length > 0 ? (
                  <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 sticky top-0">
                        <tr>
                          {secureResult.columns.slice(0, 4).map((c, i) => (
                            <th key={i} className="p-2 font-mono text-[11px]">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                        {secureResult.results.map((r, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            {secureResult.columns.slice(0, 4).map((c, ci) => (
                              <td key={ci} className="p-2 truncate max-w-[140px]">
                                {String(r[c])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
                    No documents contain the literal phrase <code className="font-mono font-bold text-slate-700 dark:text-slate-200">"{queryInput}"</code>.
                    <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Parameterization successfully neutralized the SQL injection payload!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schema View Tab */}
      {viewTab === 'schema' && schemaData && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-mono font-bold text-amber-600 dark:text-amber-400 uppercase">
              {schemaData.labNotice}
            </span>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Below are the synthetic tables inside <code className="font-mono">sql_lab_isolated.sqlite</code> created solely for attack payload demonstrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Synthetic Documents Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-emerald-500" />
                Table: lab_documents (Synthetic)
              </h4>
              <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">title</th>
                      <th className="p-2">category</th>
                      <th className="p-2">classification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schemaData.tables.lab_documents.map((d: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2 truncate max-w-[150px]">{d.title}</td>
                        <td className="p-2">{d.category}</td>
                        <td className="p-2 font-bold text-amber-600">{d.security_classification}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Synthetic Users Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-rose-500" />
                Table: lab_users (Synthetic Credentials)
              </h4>
              <div className="max-h-60 overflow-y-auto border border-slate-100 dark:border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs font-mono text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 sticky top-0">
                    <tr>
                      <th className="p-2">username</th>
                      <th className="p-2">role</th>
                      <th className="p-2">fake_password_hash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {schemaData.tables.lab_users.map((u: any, i: number) => (
                      <tr key={i}>
                        <td className="p-2">{u.username}</td>
                        <td className="p-2 font-semibold">{u.fake_role}</td>
                        <td className="p-2 text-rose-600 truncate max-w-[120px]">{u.fake_password_hash}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
