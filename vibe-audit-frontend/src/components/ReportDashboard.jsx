import React, { useRef, useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, CheckCircle, RefreshCw, Terminal, AlertTriangle, Lock, Network, Download, TrendingUp, Zap, Copy, Check, Dna, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import ForceGraph2D from 'react-force-graph-2d';
import ExportModal from './ExportModal';
import PatchModal from './PatchModal';

export default function ReportDashboard({ data, onReset }) {
  const { report, issues, graph, ai_dna } = data;
  const isGo = report.status === 'Go';
  const fgRef = useRef();
  const graphContainerRef = useRef();
  const [showExport, setShowExport] = useState(false);
  const [patchIssue, setPatchIssue] = useState(null);
  const [copiedBadge, setCopiedBadge] = useState(false);
  const [graphWidth, setGraphWidth] = useState(890);

  const badgeUrl = `http://127.0.0.1:8000/api/badge?score=${report.score}`;
  const badgeMarkdown = `[![Vibe-Audit Score](${badgeUrl})](http://localhost:5173)`;

  const copyBadge = () => {
    navigator.clipboard.writeText(badgeMarkdown);
    setCopiedBadge(true);
    setTimeout(() => setCopiedBadge(false), 2000);
  };

  useEffect(() => {
    if (fgRef.current && graph) {
      fgRef.current.d3Force('charge').strength(-1500);
      fgRef.current.d3Force('link').distance(120);
      setTimeout(() => fgRef.current.zoomToFit(800, 80), 800);
    }
  }, [graph]);

  // Responsive graph width
  useEffect(() => {
    const measure = () => {
      if (graphContainerRef.current) {
        setGraphWidth(graphContainerRef.current.offsetWidth);
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const getSeverityColor = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-50 text-red-700 border-red-300';
      case 'HIGH': return 'bg-orange-50 text-orange-700 border-orange-300';
      default: return 'bg-yellow-50 text-yellow-700 border-yellow-300';
    }
  };

  const getSeverityLeftBg = (severity) => {
    switch(severity) {
      case 'CRITICAL': return 'bg-red-50 border-red-100';
      case 'HIGH': return 'bg-orange-50 border-orange-100';
      default: return 'bg-yellow-50 border-yellow-100';
    }
  };

  const getSeverityIcon = (severity) => {
    switch(severity) {
      case 'CRITICAL': return <Lock className="w-5 h-5" />;
      case 'HIGH': return <Cpu className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  const scoreGradient = isGo
    ? 'from-green-500 to-emerald-400'
    : 'from-red-500 to-rose-400';
  const accentBorder = isGo ? 'border-t-green-500' : 'border-t-red-500';

  return (
    <div className="w-full">
      {/* Hero Score Banner */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
        className={`glass-panel p-10 mb-10 overflow-hidden relative border-t-4 ${accentBorder} shadow-sm`}
      >
        <div className={`absolute top-0 right-0 w-64 h-64 blur-[80px] rounded-full opacity-10 pointer-events-none ${isGo ? 'bg-green-400' : 'bg-red-400'}`}></div>

        <div className="flex flex-col md:flex-row items-center justify-between relative z-10">
          <div className="flex items-center gap-8 mb-8 md:mb-0">
            <div className={`flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br ${scoreGradient} shadow-xl`}>
              <div className="text-white">
                {isGo ? <ShieldCheck className="w-12 h-12" /> : <ShieldAlert className="w-12 h-12" />}
              </div>
            </div>
            <div>
              <p className="text-gray-400 font-semibold tracking-widest uppercase text-sm mb-2">Vibe-To-Value Score</p>
              <div className="flex items-baseline gap-2">
                <h2 className={`text-7xl font-black tracking-tighter ${isGo ? 'text-green-600' : 'text-red-500'}`}>
                  {report.score}
                </h2>
                <span className="text-3xl font-bold text-gray-300">/100</span>
              </div>
              <p className={`text-2xl font-black tracking-tight mt-2 uppercase ${isGo ? 'text-gray-800' : 'text-red-600'}`}>
                Result: {report.message}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <motion.button
              whileHover={{ y: -2 }}
              onClick={() => setShowExport(true)}
              className="flex items-center gap-2 px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all font-black shadow-sm border border-gray-200"
            >
              <Download className="w-5 h-5 text-green-600" />
              EXPORT
            </motion.button>
            <button
              onClick={onReset}
              className="flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-2xl transition-all font-black shadow-lg hover:shadow-green-200 hover:-translate-y-1"
            >
              <RefreshCw className="w-5 h-5" />
              NEW AUDIT
            </button>
          </div>
        </div>
      </motion.div>

      {showExport && <ExportModal data={data} onClose={() => setShowExport(false)} />}
      {patchIssue && <PatchModal issue={patchIssue} onClose={() => setPatchIssue(null)} />}

      {/* 🧬 AI Code DNA Panel */}
      {ai_dna && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-10">
          <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
            <Dna className="w-8 h-8 text-violet-500" />
            AI Code DNA Analysis
          </h3>
          <div className="glass-panel p-8 border border-violet-100 bg-gradient-to-br from-white to-violet-50/30">
            <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
              {/* Confidence Gauge */}
              <div className="relative flex-shrink-0">
                <svg className="w-36 h-36" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#f3e8ff" strokeWidth="10"/>
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#8b5cf6" strokeWidth="10"
                    strokeDasharray={`${(ai_dna.overall_confidence / 100) * 314} 314`}
                    strokeLinecap="round" transform="rotate(-90 60 60)"/>
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-black text-violet-700">{ai_dna.overall_confidence}%</span>
                  <span className="text-xs text-violet-400 font-bold">AI Score</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-2xl font-black text-gray-800 mb-2">{ai_dna.verdict}</p>
                <p className="text-gray-500 leading-relaxed mb-4">Analyzed using 6 statistical signals: comment density, boilerplate phrases, try-catch ratio, variable naming entropy, function uniformity, and TODO absence rate.</p>
                <div className="flex flex-wrap gap-2">
                  {['Comment Density', 'TODO Absence', 'Try-Catch Rate', 'Var Name Length', 'Boilerplate Phrases'].map(tag => (
                    <span key={tag} className="px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold border border-violet-200">{tag}</span>
                  ))}
                </div>
              </div>
            </div>
            {/* Top AI-looking files */}
            {ai_dna.files?.length > 0 && (
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Most AI-like Files</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {ai_dna.files.slice(0, 6).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-violet-100">
                      <div className="w-2 h-2 rounded-full bg-violet-500 shrink-0"></div>
                      <span className="text-sm text-gray-600 font-mono truncate flex-1">{f.file.split('/').pop()}</span>
                      <span className="text-xs font-black text-violet-600 shrink-0">{f.confidence}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ⚡ Priority Fix Engine */}
      {issues.some(i => i.priority_rank) && (

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-10">
          <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
            <Zap className="w-8 h-8 text-amber-500" />
            Priority Fix Engine
            <span className="text-sm px-3 py-1 bg-amber-50 text-amber-700 rounded-full font-bold border border-amber-200">Greedy Mode — Max Impact First</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {issues.filter(i => i.priority_rank).slice(0, 3).map((issue, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.08 }}
                className="glass-panel p-6 border border-amber-100 relative overflow-hidden bg-gradient-to-br from-white to-amber-50/40"
              >
                <div className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-amber-100 border-2 border-amber-300 font-black text-amber-700 text-lg">#{idx + 1}</div>
                <div className="mb-4">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-widest mb-1">Fix This First</p>
                  <h4 className="text-lg font-black text-gray-800 leading-tight pr-10">{issue.type}</h4>
                  <p className="text-sm text-gray-500 font-mono mt-1 truncate">{issue.file}</p>
                </div>
                <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-green-100">
                  <TrendingUp className="w-5 h-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-semibold">Score after fix</p>
                    <p className="font-black text-green-700 text-lg">{report.score} → <span className="text-emerald-600">{issue.score_after_fix}</span></p>
                  </div>
                  <div className="ml-auto text-right">
                    <p className="text-xs text-gray-400 font-semibold">Impact</p>
                    <p className="font-black text-emerald-600 text-lg">+{issue.fix_impact} pts</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* 🛡 GitHub Badge */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
        <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
          <ShieldCheck className="w-8 h-8 text-indigo-500" />
          GitHub Security Badge
        </h3>
        <div className="glass-panel p-8 bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
            <div className="shrink-0">
              <p className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Live Preview</p>
              <img src={badgeUrl} alt="Vibe-Audit Badge" className="h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-400 font-semibold mb-3 uppercase tracking-wider">Embed in your README.md</p>
              <div className="bg-gray-900 rounded-xl p-4 font-mono text-sm text-green-400 flex items-center gap-4 overflow-x-auto">
                <span className="text-gray-300 whitespace-nowrap flex-1">{badgeMarkdown}</span>
                <button onClick={copyBadge} className="shrink-0 p-2 hover:bg-gray-700 rounded-lg transition-colors">
                  {copiedBadge ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-gray-400" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-3">📌 Paste this in your GitHub README to show a live security score badge. Developers flex their score — it shows code reliability at a glance.</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Vibe Map */}
      {graph && graph.nodes && graph.nodes.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
          <h3 className="text-3xl font-black text-gray-800 mb-6 flex items-center gap-4 border-b border-gray-100 pb-4">
            <Network className="w-8 h-8 text-green-600" />
            Codebase Vibe Map
          </h3>
          <div ref={graphContainerRef} className="glass-panel overflow-hidden border-green-100 shadow-sm h-[400px] sm:h-[500px] lg:h-[650px] w-full relative rounded-3xl cursor-crosshair bg-gray-50">
            <div className="absolute top-4 left-4 z-10 bg-white/90 p-3 rounded-xl border border-gray-100 backdrop-blur-md text-sm text-gray-600 shadow-md">
              <div className="flex items-center gap-3 mb-2 font-mono"><span className="w-4 h-4 rounded-full bg-emerald-500"></span> Safe Component</div>
              <div className="flex items-center gap-3 mb-2 font-mono"><span className="w-4 h-4 rounded-full bg-red-500"></span> Vulnerability</div>
              <div className="flex items-center gap-3 font-mono"><span className="w-4 h-4 rounded-full bg-blue-400"></span> Architecture Node</div>
            </div>
            <ForceGraph2D
              ref={fgRef}
              width={graphWidth}
              height={window.innerWidth < 640 ? 400 : window.innerWidth < 1024 ? 500 : 650}
              graphData={graph}
              nodeLabel=""
              linkColor={() => 'rgba(0,0,0,0.08)'}
              linkWidth={1.2}
              linkDirectionalParticles={2}
              linkDirectionalParticleWidth={2}
              linkDirectionalParticleSpeed={0.006}
              linkDirectionalParticleColor={link => '#10b981'}
              backgroundColor="transparent"
              enableNodeDrag={true}
              enableZoomInteraction={true}
              nodeCanvasObject={(node, ctx, globalScale) => {
                const radius = Math.sqrt(node.val || 2) * 2.5;
                const isVulnerable = node.val >= 8;

                // Animated pulsing ring for vulnerable nodes
                if (isVulnerable) {
                  const t = (Date.now() % 1800) / 1800; // 0 → 1 loop
                  const pulseRadius = radius + 4 + t * 8;
                  const pulseAlpha = (1 - t) * 0.5;
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, pulseRadius, 0, 2 * Math.PI, false);
                  ctx.strokeStyle = `rgba(220,38,38,${pulseAlpha})`;
                  ctx.lineWidth = 2;
                  ctx.stroke();
                }

                // Main node circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color || '#10b981';
                ctx.fill();

                // White border
                ctx.strokeStyle = 'rgba(255,255,255,0.7)';
                ctx.lineWidth = 1;
                ctx.stroke();

                // Label: show only short filename, not full path
                const label = node.name.split('/').pop().split('\\').pop();
                // Only draw labels when user is sufficiently zoomed in
                if (globalScale >= 0.7) {
                  const fontSize = Math.min(14, Math.max(9, 11 / globalScale));
                  ctx.font = `700 ${fontSize}px Inter, sans-serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'top';
                  const textWidth = ctx.measureText(label).width;
                  const bx = node.x - textWidth / 2 - 6;
                  const by = node.y + radius + 6;
                  ctx.fillStyle = 'rgba(255,255,255,0.95)';
                  ctx.strokeStyle = isVulnerable ? 'rgba(220,38,38,0.3)' : 'rgba(16,185,129,0.2)';
                  ctx.lineWidth = 1;
                  ctx.beginPath();
                  ctx.roundRect(bx, by, textWidth + 12, fontSize + 8, 6);
                  ctx.fill();
                  ctx.stroke();
                  ctx.fillStyle = isVulnerable ? '#dc2626' : '#1f2937';
                  ctx.fillText(label, node.x, by + 4);
                }

              }}
              nodePointerAreaPaint={(node, color, ctx) => {
                const radius = Math.sqrt(node.val || 2) * 2.5;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fill();
              }}
              onEngineStop={() => fgRef.current && fgRef.current.zoomToFit(600, 60)}
            />


          </div>
        </motion.div>
      )}

      {/* Issues Section */}
      <h3 className="text-3xl font-black text-gray-800 mb-8 flex items-center gap-4 border-b border-gray-100 pb-4">
        Audit Registry
        <span className={`text-sm px-4 py-1.5 rounded-full font-bold ${issues.length === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {issues.length} Threat{issues.length !== 1 ? 's' : ''} Detected
        </span>
      </h3>

      {issues.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-16 text-center border-green-200">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 opacity-80" />
          <h4 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">Impeccable Codebase</h4>
          <p className="text-xl text-green-600/80 font-medium">No hardcoded secrets, hallucinations, or PII violations detected. Perfect Vibe Code.</p>
        </motion.div>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6">
          {issues.map((issue, idx) => (
            <motion.div key={idx} variants={item} className="glass-card overflow-hidden relative group border border-gray-100 hover:border-green-100">
              <div className="flex flex-col md:flex-row">

                {/* Left Severity */}
                <div className={`md:w-44 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-gray-100 ${getSeverityLeftBg(issue.severity)}`}>
                  <div className={`px-4 py-2 rounded-xl flex items-center gap-2 text-sm font-black tracking-widest uppercase border ${getSeverityColor(issue.severity)}`}>
                    {getSeverityIcon(issue.severity)}
                    {issue.severity}
                  </div>
                </div>

                {/* Right Content */}
                <div className="p-8 flex-1">
                  <h4 className="text-2xl font-black text-gray-800 mb-3 tracking-wide">{issue.type}</h4>
                  <p className="text-lg text-gray-500 mb-6 leading-relaxed">{issue.description}</p>

                  {/* File Trace */}
                  <div className="bg-gray-50 rounded-xl overflow-hidden mb-6 border border-gray-200">
                    <div className="bg-gray-100 px-4 py-2 flex items-center gap-2 border-b border-gray-200">
                      <Terminal className="w-4 h-4 text-gray-400" />
                      <span className="text-xs font-mono text-gray-400 tracking-wider">TRACE VECTORS</span>
                    </div>
                    <div className="p-4 font-mono text-sm overflow-x-auto">
                      <div className="flex items-center gap-4 text-gray-600 whitespace-nowrap">
                        <span className="text-gray-300 select-none">1 |</span>
                        <span>
                          <span className="text-green-700 font-bold">File:</span> <span className="text-gray-700">"{issue.file}"</span>
                          {issue.line && <span className="ml-4"><span className="text-green-700 font-bold">Line:</span> <span className="text-purple-600">{issue.line}</span></span>}
                          {issue.package && <span className="ml-4"><span className="text-green-700 font-bold">Target:</span> <span className="text-red-500">{issue.package}</span></span>}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Remediation Block */}
                  {issue.remediation && (
                    <div className="bg-green-50 border border-green-200 p-6 rounded-2xl relative overflow-hidden">
                      <div className="flex items-start gap-4 relative z-10">
                        <div className="p-3 bg-green-100 rounded-xl border border-green-200">
                          <Cpu className="w-6 h-6 text-green-700" />
                        </div>
                        <div>
                          <h5 className="font-black text-green-800 uppercase tracking-widest text-sm mb-2 flex items-center gap-2">
                            Auto-Remediation Protocol
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[10px] border border-green-200 animate-pulse">ACTIVE</span>
                          </h5>
                          <p className="text-gray-600 leading-relaxed font-medium">{issue.remediation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* One-Click Patch Button */}
                  {issue.has_patch && (
                    <motion.button
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPatchIssue(issue)}
                      className="mt-5 flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white font-black rounded-xl shadow-md hover:shadow-green-200 transition-all text-sm"
                    >
                      <Wand2 className="w-4 h-4" />
                      🪄 Generate One-Click Fix
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
