import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wand2, CheckCircle, Copy, Check, Loader2 } from 'lucide-react';

export default function PatchModal({ issue, onClose }) {
  const [patch, setPatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generatePatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/patch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issue })
      });
      if (!res.ok) throw new Error('No patch available for this issue type.');
      const data = await res.json();
      setPatch(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyPatch = () => {
    navigator.clipboard.writeText(patch?.after || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-md" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 30 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-6 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl"><Wand2 className="w-6 h-6 text-white" /></div>
              <div>
                <h3 className="text-xl font-black text-white">One-Click Patch Generator</h3>
                <p className="text-green-100 text-sm font-medium">{issue.type}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/20 transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-8">
            {!patch && !loading && !error && (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-6 leading-relaxed">
                  Vibe-Audit will generate a safe, ready-to-use code fix for this issue.<br/>
                  <span className="text-xs text-gray-400">⚡ Secrets are masked — actual values never leave your machine.</span>
                </p>
                <motion.button
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={generatePatch}
                  className="px-10 py-4 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black rounded-2xl shadow-lg hover:shadow-green-200 transition-all text-lg"
                >
                  🪄 Generate Fix
                </motion.button>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center py-10 gap-4">
                <Loader2 className="w-10 h-10 text-green-500 animate-spin" />
                <p className="text-gray-500 font-medium">Generating patch...</p>
              </div>
            )}

            {error && (
              <div className="text-center py-6">
                <p className="text-red-500 font-semibold">{error}</p>
                <p className="text-gray-400 text-sm mt-2">No automatic patch is available for this issue type yet.</p>
              </div>
            )}

            {patch && (
              <div className="space-y-6">
                {/* Before */}
                <div>
                  <p className="text-xs font-black text-red-500 uppercase tracking-widest mb-2">❌ Before</p>
                  <pre className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm font-mono text-red-700 overflow-x-auto whitespace-pre-wrap">{patch.before}</pre>
                </div>

                {/* After */}
                <div>
                  <p className="text-xs font-black text-green-600 uppercase tracking-widest mb-2">✅ After</p>
                  <div className="relative">
                    <pre className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm font-mono text-green-800 overflow-x-auto whitespace-pre-wrap pr-14">{patch.after}</pre>
                    <button onClick={copyPatch} className="absolute top-3 right-3 p-2 bg-white rounded-xl border border-green-200 hover:bg-green-50 transition-all shadow-sm">
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-green-400" />}
                    </button>
                  </div>
                </div>

                {/* Steps */}
                {patch.steps && (
                  <div className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Fix Steps</p>
                    <ul className="space-y-2">
                      {patch.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                          <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
