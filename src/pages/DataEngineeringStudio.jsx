/**
 * DataEngineeringStudio — Phase 1: Data Engineering Layer
 * Upload CSV/XLSX, profile columns, version datasets, view quality scores
 */
import { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, FileText, Database, CheckCircle2, AlertTriangle, XCircle,
  Loader2, ChevronRight, BarChart2, Calendar, Hash, Tag, RefreshCw,
  Download, Eye, Zap, Shield, TrendingUp, Layers, Clock, Info
} from 'lucide-react';
import DataSourceList from '@/components/dataengineering/DataSourceList.jsx';
import ColumnProfileTable from '@/components/dataengineering/ColumnProfileTable.jsx';
import QualityScoreCard from '@/components/dataengineering/QualityScoreCard.jsx';
import DataPreviewTable from '@/components/dataengineering/DataPreviewTable.jsx';
import CleaningLogPanel from '@/components/dataengineering/CleaningLogPanel.jsx';

export default function DataEngineeringStudio() {
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [activeDataSource, setActiveDataSource] = useState(null);
  const [tab, setTab] = useState('upload');
  const [sheetName, setSheetName] = useState('');
  const [action, setAction] = useState('full');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setError('');
    setResult(null);
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(ext)) {
      setError('Only CSV and XLSX files are supported.');
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploading(false);
      setProcessing(true);

      // Create DataSource record
      const ds = await base44.entities.DataSource.create({
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        fileType: ext === 'xls' ? 'xlsx' : ext,
        rawFileUrl: file_url,
        status: 'processing',
        uploadedAt: new Date().toISOString(),
      });

      // Process dataset
      const res = await base44.functions.invoke('processDataset', {
        fileUrl: file_url,
        fileName: file.name,
        fileType: ext === 'xls' ? 'xlsx' : ext,
        dataSourceId: ds.id,
        sheetName: sheetName || null,
        action,
      });

      setResult({ ...res.data, dataSourceId: ds.id, fileName: file.name });
      setActiveDataSource(ds);
      setTab('profile');
    } catch (e) {
      setError(e.message || 'Processing failed');
    }
    setUploading(false);
    setProcessing(false);
  }, [sheetName, action]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const qualityColor = (score) => score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  const qualityBg = (score) => score >= 80 ? 'bg-green-400/10 border-green-400/20' : score >= 60 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20';

  const TABS = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'profile', label: 'Column Profiles', icon: BarChart2 },
    { id: 'quality', label: 'Quality Scores', icon: Shield },
    { id: 'preview', label: 'Data Preview', icon: Eye },
    { id: 'cleaning', label: 'Cleaning Report', icon: Zap },
    { id: 'sources', label: 'My Datasets', icon: Database },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/25 flex items-center justify-center">
            <Layers className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Data Engineering Studio</h1>
            <p className="text-xs text-muted-foreground">Upload · Profile · Clean · Version · Validate</p>
          </div>
          {result?.qualityScores && (
            <div className={`ml-auto px-4 py-2 rounded-xl border text-sm font-bold ${qualityBg(result.qualityScores.qualityScore)}`}>
              <span className={qualityColor(result.qualityScores.qualityScore)}>
                Quality: {result.qualityScores.qualityScore}%
              </span>
              <span className="text-white/30 ml-3">
                Readiness: {result.qualityScores.readinessScore}%
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/8 px-8">
        <div className="flex gap-0">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-all ${
                tab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/60'
              }`}>
              <t.icon className="w-3.5 h-3.5" />{t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-8">
        {/* Upload Tab */}
        {tab === 'upload' && (
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Options */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Processing Mode</label>
                <select value={action} onChange={e => setAction(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="profile">Profile Only (fast preview)</option>
                  <option value="clean">Clean + Profile (recommended)</option>
                  <option value="full">Full Pipeline (clean + version)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Excel Sheet Name (optional)</label>
                <input value={sheetName} onChange={e => setSheetName(e.target.value)}
                  placeholder="Leave blank for first sheet"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${
                dragOver ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/15 hover:border-white/30 hover:bg-white/2'
              }`}>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => handleFile(e.target.files[0])} />
              {uploading || processing ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto" />
                  <p className="text-sm text-white/60">{uploading ? 'Uploading file…' : 'Profiling dataset…'}</p>
                  <div className="flex justify-center gap-2 flex-wrap text-xs text-white/30">
                    {['Schema Inference', 'Type Detection', 'Column Profiling', 'Quality Scoring', 'Cleaning'].map((s, i) => (
                      <motion.span key={s} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.3 }}
                        className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8">{s}</motion.span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <Upload className="w-10 h-10 text-white/25 mx-auto" />
                  <div>
                    <p className="text-base font-semibold text-white/70">Drop your CSV or Excel file here</p>
                    <p className="text-sm text-white/30 mt-1">Supports CSV, XLSX — up to 50MB — 10,000+ rows</p>
                  </div>
                  <div className="flex justify-center gap-3">
                    {['CSV', 'XLSX', 'XLS'].map(f => (
                      <span key={f} className="px-2 py-0.5 rounded-lg bg-white/5 border border-white/8 text-xs text-white/40">{f}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400">
                <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            {result && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-2xl border border-green-400/20 bg-green-400/5 space-y-3">
                <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4" /> Dataset processed successfully
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Rows', value: result.rowCount?.toLocaleString() },
                    { label: 'Columns', value: result.columnCount },
                    { label: 'Quality Score', value: `${result.qualityScores?.qualityScore || 0}%` },
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-xl font-black text-cyan-400">{stat.value}</div>
                      <div className="text-xs text-white/30">{stat.label}</div>
                    </div>
                  ))}
                </div>
                {result.warnings?.length > 0 && (
                  <div className="space-y-1">
                    {result.warnings.slice(0, 3).map((w, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-xs text-amber-400">
                        <AlertTriangle className="w-3 h-3" /> {w}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={() => setTab('profile')} className="flex-1 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all">
                    View Column Profiles →
                  </button>
                  <button onClick={() => setTab('quality')} className="flex-1 py-2 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/20 transition-all">
                    View Quality Scores →
                  </button>
                </div>
              </motion.div>
            )}

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: Hash, label: 'Schema Inference', desc: 'Auto-detects column types and semantic roles' },
                { icon: Shield, label: 'Quality Scoring', desc: 'Completeness, Validity, Uniqueness, Consistency' },
                { icon: Zap, label: 'Data Cleaning', desc: 'Dedup, imputation, standardization, type coercion' },
                { icon: Layers, label: 'Version Control', desc: 'Raw + cleaned + transformed dataset versions' },
              ].map(f => (
                <div key={f.label} className="p-3 rounded-xl bg-white/2 border border-white/6">
                  <div className="flex items-center gap-2 mb-1">
                    <f.icon className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-xs font-semibold text-white/70">{f.label}</span>
                  </div>
                  <p className="text-xs text-white/30">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Column Profile Tab */}
        {tab === 'profile' && (
          <ColumnProfileTable columns={result?.columns || []} />
        )}

        {/* Quality Scores Tab */}
        {tab === 'quality' && (
          <QualityScoreCard scores={result?.qualityScores} columns={result?.columns} warnings={result?.warnings} />
        )}

        {/* Data Preview Tab */}
        {tab === 'preview' && (
          <DataPreviewTable rows={result?.sampleRows || []} columns={result?.columns || []} />
        )}

        {/* Cleaning Report Tab */}
        {tab === 'cleaning' && (
          <CleaningLogPanel summary={result?.cleaningSummary} columns={result?.columns} dataSourceId={result?.dataSourceId} />
        )}

        {/* My Datasets Tab */}
        {tab === 'sources' && (
          <DataSourceList onSelect={(ds) => { setActiveDataSource(ds); }} />
        )}
      </div>
    </div>
  );
}