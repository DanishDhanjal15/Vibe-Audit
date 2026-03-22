import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileJson, FileText, FileDown, Sheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function ExportModal({ data, onClose }) {
  const { report, issues } = data;
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const filename = `vibe-audit-report-${timestamp}`;

  const downloadFile = (content, name, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleJsonExport = () => {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `${filename}.json`, 'application/json');
  };

  const handleCsvExport = () => {
    const headers = ['Type', 'Severity', 'File', 'Line', 'Description', 'Remediation'];
    const rows = issues.map(i => [
      `"${(i.type || '').replace(/"/g, '""')}"`,
      `"${(i.severity || '').replace(/"/g, '""')}"`,
      `"${(i.file || '').replace(/"/g, '""')}"`,
      i.line || '',
      `"${(i.description || '').replace(/"/g, '""')}"`,
      `"${(i.remediation || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `${filename}.csv`, 'text/csv');
  };

  const handleHtmlExport = () => {
    const statusColor = report.status === 'Go' ? '#10b981' : '#f43f5e';
    const issueRows = issues.map(i => `
      <tr>
        <td>${i.type || ''}</td>
        <td style="color:${i.severity === 'CRITICAL' ? '#f43f5e' : i.severity === 'HIGH' ? '#f97316' : '#facc15'}"><b>${i.severity || ''}</b></td>
        <td><code>${i.file || ''}:${i.line || ''}</code></td>
        <td>${i.description || ''}</td>
        <td>${i.remediation || ''}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Vibe-Audit Report - ${timestamp}</title>
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; padding: 40px; }
    h1 { font-size: 2.5rem; font-weight: 900; color: #34d399; margin-bottom: 8px; }
    .score { font-size: 5rem; font-weight: 900; color: ${statusColor}; }
    .status { font-size: 1.5rem; margin-bottom: 40px; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th { background: #1e293b; padding: 12px 16px; text-align: left; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
    td { padding: 12px 16px; border-bottom: 1px solid #1e293b; font-size: 0.875rem; }
    tr:hover td { background: #1e293b; }
    code { background:#0d1117; color: #a5f3fc; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; }
    .summary { background: #1e293b; padding: 24px; border-radius: 16px; margin-bottom: 32px; border-left: 4px solid ${statusColor}; }
  </style>
</head>
<body>
  <h1>🛡️ Vibe-Audit Report</h1>
  <p style="color:#64748b;">Generated: ${new Date().toLocaleString()}</p>
  <div class="summary">
    <div class="score">${report.score}<span style="font-size:2rem;color:#475569">/100</span></div>
    <div class="status" style="color:${statusColor}">${report.status} — ${report.message}</div>
    <div>${issues.length} issue(s) found</div>
  </div>
  <h2 style="font-size:1.5rem;font-weight:800;margin-bottom:16px;">Audit Registry</h2>
  <table>
    <thead><tr><th>Type</th><th>Severity</th><th>Location</th><th>Description</th><th>Remediation</th></tr></thead>
    <tbody>${issueRows}</tbody>
  </table>
</body>
</html>`;
    downloadFile(html, `${filename}.html`, 'text/html');
  };

  const handlePdfExport = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const statusColor = report.status === 'Go' ? [16, 185, 129] : [244, 63, 94];

    // Header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 297, 297, 'F');
    doc.setTextColor(...statusColor);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('VIBE-AUDIT REPORT', 14, 22);

    doc.setTextColor(148, 163, 184);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 29);

    // Score Badge
    doc.setTextColor(...statusColor);
    doc.setFontSize(52);
    doc.text(`${report.score}`, 14, 55);
    doc.setFontSize(14);
    doc.text('/100', 46, 55);

    doc.setFontSize(13);
    doc.text(`${report.status}: ${report.message}`, 14, 63);
    doc.setFontSize(10);
    doc.setTextColor(148, 163, 184);
    doc.text(`${issues.length} issue(s) detected`, 14, 70);

    // Table
    autoTable(doc, {
      startY: 80,
      head: [['Type', 'Severity', 'File', 'Line', 'Description']],
      body: issues.map(i => [i.type, i.severity, i.file, i.line, i.description]),
      theme: 'grid',
      styles: { fillColor: [30, 41, 59], textColor: [226, 232, 240], fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 23, 42], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 7 },
      alternateRowStyles: { fillColor: [15, 23, 42] },
      columnStyles: {
        1: {
          fontStyle: 'bold',
          cellWidth: 20,
          textColor: (cell) => {
            const s = cell.raw;
            return s === 'CRITICAL' ? [244, 63, 94] : s === 'HIGH' ? [249, 115, 22] : [234, 179, 8];
          }
        }
      }
    });

    doc.save(`${filename}.pdf`);
  };

  const formats = [
    { label: 'JSON', desc: 'Raw machine-readable data for APIs', icon: <FileJson className="w-8 h-8" />, color: 'from-yellow-500 to-orange-500', handler: handleJsonExport, ext: '.json' },
    { label: 'CSV', desc: 'Spreadsheet-ready row/column data', icon: <Sheet className="w-8 h-8" />, color: 'from-emerald-500 to-teal-500', handler: handleCsvExport, ext: '.csv' },
    { label: 'HTML', desc: 'Styled web page report to share', icon: <FileText className="w-8 h-8" />, color: 'from-cyan-500 to-blue-500', handler: handleHtmlExport, ext: '.html' },
    { label: 'PDF', desc: 'Printable, professional document', icon: <FileDown className="w-8 h-8" />, color: 'from-indigo-500 to-purple-500', handler: handlePdfExport, ext: '.pdf' },
  ];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-3xl glass-panel p-10"
        >
          <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all">
            <X className="w-6 h-6" />
          </button>
          <h3 className="text-4xl font-black text-white mb-2 tracking-tight">Export Report</h3>
          <p className="text-slate-400 mb-10 text-lg">Choose your preferred format to download the full audit report.</p>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {formats.map((fmt) => (
              <motion.button
                key={fmt.label}
                whileHover={{ y: -5, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={fmt.handler}
                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-600 transition-all relative overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-br ${fmt.color} transition-opacity`} />
                <div className={`p-4 rounded-2xl bg-gradient-to-br ${fmt.color} text-white shadow-xl`}>
                  {fmt.icon}
                </div>
                <div className="text-center relative z-10">
                  <p className="text-xl font-black text-white">{fmt.label}</p>
                  <p className="text-xs text-slate-500 mt-1 leading-snug">{fmt.desc}</p>
                  <p className={`text-xs font-mono mt-2 font-bold text-transparent bg-clip-text bg-gradient-to-r ${fmt.color}`}>{fmt.ext}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
