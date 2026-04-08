import React, { useState, useEffect } from 'react';
import Uploader from './components/Uploader';
import ReportDashboard from './components/ReportDashboard';
import HistoryPanel from './components/HistoryPanel';
import { Zap, ShieldCheck, Clock, ArrowLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const HISTORY_KEY = 'vibe_audit_history';
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

function loadHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
}

function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))); // keep last 20
}

function App() {
  const [reportData, setReportData] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState(loadHistory);

  useEffect(() => { saveHistory(history); }, [history]);

  const handleUpload = async (file, url = null) => {
    setIsScanning(true);
    try {
      let response;
      if (url) {
        response = await fetch(`${API_BASE}/api/audit-url`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'bypass-tunnel-reminder': 'true'
          },
          body: JSON.stringify({ url })
        });
      } else {
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch(`${API_BASE}/api/audit`, {
          method: 'POST',
          headers: { 'bypass-tunnel-reminder': 'true' },
          body: formData,
        });
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Network response was not ok');
      }
      const data = await response.json();
      setTimeout(() => {
        setReportData(data);
        setIsScanning(false);
        // Save to history
        const entry = {
          timestamp: new Date().toISOString(),
          source: url || file?.name || 'Unknown',
          data
        };
        setHistory(prev => [entry, ...prev]);
      }, 1500);
    } catch (error) {
      console.error('Error during scan:', error);
      alert(`Failed to scan: ${error.message}`);
      setIsScanning(false);
    }
  };

  const handleReset = () => { setReportData(null); setShowHistory(false); };
  const handleViewAudit = (data) => { setReportData(data); setShowHistory(false); };
  const handleClearHistory = () => { setHistory([]); };

  return (
    <div className="min-h-screen flex flex-col items-center py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden bg-gradient-to-br from-white via-green-50/60 to-emerald-50/80">
      
      {/* Ambient Background */}
      <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[50%] bg-green-300/20 blur-[150px] rounded-full pointer-events-none animate-float"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[40%] h-[50%] bg-emerald-300/20 blur-[150px] rounded-full pointer-events-none animate-float-delayed"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_rgba(187,247,208,0.3)_0%,_transparent_60%)] pointer-events-none"></div>

      {/* Header */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="z-10 text-center mb-12 mt-8"
      >
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-3 px-6 py-3 bg-green-50 border border-green-200 rounded-full shadow-sm">
            <div className="p-1.5 bg-green-600 rounded-full">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <span className="font-black text-green-800 tracking-tight text-lg">Vibe-Audit</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-green-100 text-green-700 rounded-full border border-green-200">BETA</span>
          </div>
        </div>

        <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-green-600 via-emerald-500 to-teal-400 drop-shadow-sm p-2 mb-4">
          Vibe-Audit
        </h1>
        <p className="text-2xl text-gray-500 max-w-3xl mx-auto font-light leading-relaxed mb-6">
          The ultimate <span className="text-green-600 font-semibold">Production-Ready Gatekeeper</span>.
        </p>

        {/* Navigation Tabs */}
        {!isScanning && (
          <div className="flex justify-center gap-3">
            <button
              onClick={() => { setShowHistory(false); setReportData(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${!showHistory ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
            >
              <ShieldCheck className="w-4 h-4" /> New Audit
            </button>
            <button
              onClick={() => { setShowHistory(true); setReportData(null); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${showHistory ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'}`}
            >
              <Clock className="w-4 h-4" /> History
              {history.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${showHistory ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>{history.length}</span>
              )}
            </button>
          </div>
        )}
      </motion.div>

      {/* Main Content */}
      <div className="z-10 w-full max-w-6xl relative">
        <AnimatePresence mode="wait">
          {isScanning ? (
            <motion.div
              key="scanning"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.1, opacity: 0, filter: "blur(10px)" }}
              transition={{ duration: 0.4 }}
              className="glass-panel p-24 flex flex-col items-center justify-center text-center border-green-200 shadow-[0_0_50px_rgba(22,163,74,0.1)] relative overflow-hidden max-w-4xl mx-auto"
            >
              <div className="relative mb-8">
                <div className="absolute inset-0 bg-green-400/20 blur-xl rounded-full"></div>
                <Zap className="w-20 h-20 text-green-500 animate-pulse relative z-10" />
              </div>
              <h2 className="text-4xl font-black text-gray-800 tracking-tight mb-4 animate-pulse">Auditing Target Codebase</h2>
              <p className="text-xl text-gray-500 max-w-md">Scanning for hallucinatory dependencies, hardcoded secrets, and GDPR compliance...</p>
            </motion.div>
          ) : showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <HistoryPanel
                history={history}
                onClear={handleClearHistory}
                onViewAudit={handleViewAudit}
              />
            </motion.div>
          ) : reportData ? (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, type: "spring" }}
            >
              <ReportDashboard data={reportData} apiBase={API_BASE} onReset={handleReset} />
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Uploader onUpload={handleUpload} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default App;
