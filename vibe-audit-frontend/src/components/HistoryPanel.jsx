import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Trash2, Download, FileJson, FileText, FileDown, Sheet, ChevronRight, ShieldCheck, ShieldAlert, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function HistoryPanel({ history, onClear, onViewAudit }) {
  const [exportIdx, setExportIdx] = useState(null);

  const downloadFile = (content, name, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAs = (entry, format) => {
    const ts = entry.timestamp.replace(/:/g, '-').split('.')[0];
    const filename = `vibe-audit-${ts}`;

    if (format === 'json') {
      downloadFile(JSON.stringify(entry.data, null, 2), `${filename}.json`, 'application/json');
    } else if (format === 'csv') {
      const headers = ['Type', 'Severity', 'File', 'Line', 'Description'];
      const rows = (entry.data.issues || []).map(i => [
        `"${(i.type || '').replace(/"/g, '""')}"`,
        `"${(i.severity || '').replace(/"/g, '""')}"`,
        `"${(i.file || '').replace(/"/g, '""')}"`,
        i.line || '',
        `"${(i.description || '').replace(/"/g, '""')}"`
      ]);
      downloadFile([headers.join(','), ...rows.map(r => r.join(','))].join('\n'), `${filename}.csv`, 'text/csv');
    } else if (format === 'html') {
      const r = entry.data.report;
      const color = r.status === 'Go' ? '#10b981' : '#ef4444';
      const issueRows = (entry.data.issues || []).map(i =>
        `<tr><td>${i.type}</td><td style="color:${i.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b'}"><b>${i.severity}</b></td><td><code>${i.file}:${i.line || ''}</code></td><td>${i.description}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><title>Vibe-Audit ${ts}</title><style>body{background:#fff;color:#111;font-family:Inter,sans-serif;padding:40px}h1{color:${color}}table{width:100%;border-collapse:collapse;margin-top:24px}th{background:#f0fdf4;padding:12px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280}td{padding:12px;border-bottom:1px solid #e5e7eb;font-size:14px}code{background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px}.score{font-size:64px;font-weight:900;color:${color}}</style></head><body><h1>Vibe-Audit Report</h1><p style="color:#9ca3af">${new Date(entry.timestamp).toLocaleString()}</p><div class="score">${r.score}/100</div><p><b>${r.status}</b> — ${r.message}</p><table><thead><tr><th>Type</th><th>Severity</th><th>Location</th><th>Description</th></tr></thead><tbody>${issueRows}</tbody></table></body></html>`;
      downloadFile(html, `${filename}.html`, 'text/html');
    } else if (format === 'pdf') {
      const doc = new jsPDF({ orientation: 'landscape' });
      const r = entry.data.report;
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('VIBE-AUDIT REPORT', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(`Date: ${new Date(entry.timestamp).toLocaleString()}`, 14, 28);
      doc.setFontSize(40);
      doc.setTextColor(r.status === 'Go' ? 16 : 239, r.status === 'Go' ? 185 : 68, r.status === 'Go' ? 129 : 68);
      doc.text(`${r.score}/100`, 14, 50);
      doc.setFontSize(14);
      doc.text(`${r.status}: ${r.message}`, 14, 60);
      autoTable(doc, {
        startY: 70,
        head: [['Type', 'Severity', 'File', 'Line', 'Description']],
        body: (entry.data.issues || []).map(i => [i.type, i.severity, i.file, i.line, i.description]),
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [240, 253, 244], textColor: [55, 65, 81], fontStyle: 'bold' },
      });
      doc.save(`${filename}.pdf`);
    }
    setExportIdx(null);
  };

  if (!history || history.length === 0) {
    return (
      <div className="glass-panel p-16 text-center border-gray-200">
        <Clock className="w-16 h-16 text-gray-300 mx-auto mb-6" />
        <h4 className="text-2xl font-black text-gray-600 mb-2">No Audit History</h4>
        <p className="text-gray-400">Run your first audit to start building your history timeline.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-3xl font-black text-gray-800 flex items-center gap-4">
          <Clock className="w-8 h-8 text-green-600" />
          Audit History
          <span className="text-sm px-3 py-1 bg-green-50 text-green-700 rounded-full font-bold border border-green-200">{history.length} audits</span>
        </h3>
        <button onClick={onClear} className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl border border-red-200 transition-all">
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="space-y-4">
        {history.map((entry, idx) => {
          const r = entry.data.report;
          const isGo = r.status === 'Go';
          const issueCount = (entry.data.issues || []).length;
          const dateStr = new Date(entry.timestamp).toLocaleString();
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="glass-panel p-6 flex flex-col md:flex-row items-center gap-6 border border-gray-100 hover:border-green-200 transition-all relative"
            >
              {/* Score Badge */}
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-md ${isGo ? 'bg-gradient-to-br from-green-500 to-emerald-500' : 'bg-gradient-to-br from-red-500 to-rose-500'}`}>
                {r.score}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  {isGo ? <ShieldCheck className="w-5 h-5 text-green-600" /> : <ShieldAlert className="w-5 h-5 text-red-500" />}
                  <span className={`text-lg font-black ${isGo ? 'text-green-700' : 'text-red-600'}`}>{r.status} — {r.message}</span>
                </div>
                <p className="text-sm text-gray-400">{dateStr} · {issueCount} issue{issueCount !== 1 ? 's' : ''} detected</p>
                {entry.source && <p className="text-xs text-gray-400 font-mono mt-1 truncate">{entry.source}</p>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Export dropdown */}
                <div className="relative">
                  <button onClick={() => setExportIdx(exportIdx === idx ? null : idx)} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-bold text-sm border border-gray-200 transition-all">
                    <Download className="w-4 h-4" /> Export
                  </button>
                  <AnimatePresence>
                    {exportIdx === idx && (
                      <motion.div
                        initial={{ opacity: 0, y: -5, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -5, scale: 0.95 }}
                        className="absolute right-0 top-12 z-20 bg-white rounded-xl shadow-xl border border-gray-100 p-2 min-w-[160px]"
                      >
                        {[
                          { label: 'JSON', icon: <FileJson className="w-4 h-4" />, key: 'json' },
                          { label: 'CSV', icon: <Sheet className="w-4 h-4" />, key: 'csv' },
                          { label: 'HTML', icon: <FileText className="w-4 h-4" />, key: 'html' },
                          { label: 'PDF', icon: <FileDown className="w-4 h-4" />, key: 'pdf' },
                        ].map(f => (
                          <button key={f.key} onClick={() => exportAs(entry, f.key)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-green-50 rounded-lg transition-all">
                            {f.icon} {f.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* View Report */}
                <button onClick={() => onViewAudit(entry.data)} className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-black text-sm shadow-md hover:shadow-green-200 transition-all">
                  View <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
