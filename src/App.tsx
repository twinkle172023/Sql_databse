/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { NavPage } from './types/security.ts';
import { Navbar } from './components/layout/Navbar.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { DashboardView } from './components/dashboard/DashboardView.tsx';
import { UploadView } from './components/upload/UploadView.tsx';
import { DocumentsView } from './components/documents/DocumentsView.tsx';
import { FileLabView } from './components/file-lab/FileLabView.tsx';
import { SqlPlaygroundView } from './components/sql-playground/SqlPlaygroundView.tsx';
import { SecurityReportView } from './components/report/SecurityReportView.tsx';

export default function App() {
  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('docvault_theme');
      if (saved) return saved === 'dark';
      return true; // Default to sleek dark cyber-security theme
    }
    return true;
  });
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('docvault_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('docvault_theme', 'light');
    }
  }, [isDark]);

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 pb-16">
        {currentPage === 'dashboard' && (
          <DashboardView onNavigate={setCurrentPage} />
        )}
        {currentPage === 'upload' && (
          <UploadView
            onNavigate={setCurrentPage}
            onUploadSuccess={handleUploadSuccess}
          />
        )}
        {currentPage === 'documents' && (
          <DocumentsView
            onNavigate={setCurrentPage}
            refreshTrigger={refreshTrigger}
          />
        )}
        {currentPage === 'file-lab' && <FileLabView />}
        {currentPage === 'sql-playground' && <SqlPlaygroundView />}
        {currentPage === 'report' && <SecurityReportView />}
      </main>

      <Footer />
    </div>
  );
}
