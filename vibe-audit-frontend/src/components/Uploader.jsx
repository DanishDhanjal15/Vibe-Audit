import React, { useState } from 'react';
import { UploadCloud, FileArchive, ArrowRight, Github, Link } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Uploader({ onUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [repoUrl, setRepoUrl] = useState('');

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault(); setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.name.endsWith('.zip')) setFile(droppedFile);
    else alert('Please upload a .zip file containing your repository.');
  };
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.name.endsWith('.zip')) setFile(selectedFile);
  };
  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (repoUrl.includes('github.com')) onUpload(null, repoUrl);
    else alert("Please enter a valid GitHub URL. Example: https://github.com/user/repo");
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-4">

      {/* Option 1: GitHub URL */}
      <div className="glass-panel p-10 flex flex-col justify-between border border-green-100 hover:border-green-300 transition-colors bg-gradient-to-br from-white to-green-50/50 shadow-sm">
        <div>
          <div className="p-4 bg-green-100 rounded-2xl w-fit mb-8 border border-green-200">
            <Github className="w-12 h-12 text-green-700" />
          </div>
          <h3 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">Audit via URL</h3>
          <p className="text-lg text-gray-500 mb-8 leading-relaxed">
            Paste any public GitHub repository link. The Gatekeeper will securely clone and analyze it instantly.
          </p>
        </div>
        <form onSubmit={handleUrlSubmit} className="mt-auto">
          <div className="relative flex items-center mb-6">
            <Link className="w-5 h-5 text-gray-400 absolute left-4" />
            <input
              type="url"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/..."
              required
              className="w-full bg-white border border-gray-200 text-gray-800 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent transition-all text-lg shadow-sm placeholder-gray-300"
            />
          </div>
          <motion.button
            whileHover={{ y: -2 }}
            type="submit"
            className="w-full group flex items-center justify-center gap-3 px-8 py-5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-green-200/60 text-lg"
          >
            PULL & AUDIT
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
          </motion.button>
        </form>
      </div>

      {/* Option 2: Zip Upload */}
      <div
        className={`glass-panel p-10 text-center transition-all duration-300 border-2 ${isDragging ? 'border-green-400 bg-green-50/80' : 'border-dashed border-gray-200 hover:border-green-300 hover:bg-green-50/30'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center h-full">
          <motion.div
            animate={isDragging ? { y: -10, scale: 1.1 } : { y: 0, scale: 1 }}
            className="p-6 bg-green-50 rounded-full mb-8 relative border-2 border-green-100"
          >
            <UploadCloud className="w-12 h-12 text-green-600" />
            {isDragging && <span className="absolute inset-0 rounded-full animate-ping bg-green-300/40"></span>}
          </motion.div>

          <h3 className="text-3xl font-black text-gray-800 mb-4 tracking-tight">Audit via Zip</h3>
          <p className="text-lg text-gray-500 mb-10 max-w-sm mx-auto leading-relaxed">
            Drag and drop your AI-generated codebase <code className="text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md text-sm">.zip</code> file here.
          </p>

          {file && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-4 bg-green-50 border border-green-200 px-6 py-4 rounded-2xl mb-8 w-full"
            >
              <div className="p-2 bg-green-100 rounded-xl"><FileArchive className="w-6 h-6 text-green-700" /></div>
              <div className="text-left flex-1 truncate">
                <p className="font-bold text-gray-700 truncate">{file.name}</p>
                <p className="text-xs text-green-600 font-medium">Ready for audit</p>
              </div>
            </motion.div>
          )}

          <div className="flex flex-col gap-4 w-full mt-auto">
            <input type="file" id="file-upload" accept=".zip" className="hidden" onChange={handleFileChange} />
            {file ? (
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <label htmlFor="file-upload" className="cursor-pointer px-6 py-4 rounded-2xl font-bold transition-all text-center bg-gray-100 text-gray-600 hover:bg-gray-200 block">
                  Change File
                </label>
                <motion.button
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  onClick={() => onUpload(file)}
                  className="group flex items-center justify-center gap-2 px-8 py-4 w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-500 hover:to-emerald-400 text-white font-black rounded-2xl transition-all shadow-lg hover:shadow-green-200 transform hover:-translate-y-1"
                >
                  INITIATE AUDIT
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </motion.button>
              </div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer px-8 py-5 rounded-2xl transition-all w-full md:w-3/4 mx-auto text-lg font-black bg-gray-100 text-gray-700 hover:bg-gray-200 shadow-sm">
                Browse Local Files
              </label>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
