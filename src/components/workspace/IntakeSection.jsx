import { useState, useCallback } from 'react';
import SheetPreview from '@/components/workspace/SheetPreview';
import ConnectorsPanel from '@/components/workspace/ConnectorsPanel';
import { inferRelationships } from '@/lib/relationshipInference';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { processUploadedFile } from '@/lib/dataParser';
import { buildSemanticModel } from '@/lib/sampleData';
import {
  Upload, FileSpreadsheet, FileJson, FileText, X, CheckCircle2,
  AlertTriangle, Database, Loader2, ChevronRight, Eye, Trash2,
  Plus, Layers, Info, Link2
} from 'lucide-react';

const ACCEPTED = '.csv,.tsv,.xlsx,.xls,.json,.txt,.md,.pdf,.docx';
const MAX_MB = 25;

function FileIcon({ ext }) {
  if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
  if (ext === 'json') return <FileJson className="w-5 h-5 text-blue-400" />;
  if (ext === 'csv' || ext === 'tsv') return <FileSpreadsheet className="w-5 h-5 text-cyan-400" />;
  return <FileText className="w-5 h-5 text-purple-400" />;
}

function QualityDot({ score }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400';
  return <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />;
}

function TableCard({ table, isActive, onSelect, onRemove, onAnalyze }) {
  const numCols = table.columns?.filter(c => c.type === 'numeric').length || 0;
  const catCols = table.columns?.filter(c => c.type === 'category').length || 0;
  const dateCols = table.columns?.filter(c => c.type === 'date').length || 0;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      onClick={onSelect}
      className={`glass-card rounded-2xl p-4 border cursor-pointer transition-all hover:scale-[1.01] ${isActive ? 'border-cyan-400/30 bg-cyan-400/5' : 'border-white/8 hover:border-white/15'}`}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center flex-shrink-0">
          <Database className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-white/40'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm truncate">{table.name}</span>
            {isActive && <span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-400/15 text-cyan-400 border border-cyan-400/20 flex-shrink-0">Active</span>}
          </div>
          <div className="text-xs text-muted-foreground mb-2">
            {table.rowCount?.toLocaleString()} rows · {table.columns?.length} cols
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {numCols > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-400/10 text-blue-400">{numCols} numeric</span>}
            {catCols > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">{catCols} category</span>}
            {dateCols > 0 && <span className="text-xs px-1.5 py-0.5 rounded bg-teal-400/10 text-teal-400">{dateCols} date</span>}
          </div>
          {table.issues?.length > 0 && (
            <div className="flex items-center gap-1 mt-2 text-xs text-amber-400">
              <AlertTriangle className="w-3 h-3" /> {table.issues.length} issue{table.issues.length > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <QualityDot score={table.qualityScore} />
            <span className="text-xs text-muted-foreground">{table.qualityScore}%</span>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-1 text-white/25 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {isActive && (
        <button onClick={(e) => { e.stopPropagation(); onAnalyze(); }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-400/15 transition-colors">
          Prepare & Analyze <ChevronRight className="w-3 h-3" />
        </button>
      )}
    </motion.div>
  );
}

export default function IntakeSection() {
  const { tables, addTable, removeTable, setActiveTable, setSemanticModel, setActiveSection, addDocument } = useWorkspaceStore();
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [error, setError] = useState('');
  const [multisheet, setMultisheet] = useState(null);
  const [previewSheet, setPreviewSheet] = useState(null);

  const handleFiles = useCallback(async (files) => {
    const fileArr = Array.from(files);
    setError('');
    for (const file of fileArr) {
      const sizeMB = file.size / 1024 / 1024;
      if (sizeMB > MAX_MB) { setError(`"${file.name}" exceeds ${MAX_MB}MB limit.`); continue; }
      setProcessing(true);
      setProcessingFile(file.name);
      try {
        const result = await processUploadedFile(file);
        if (result.type === 'single') {
          addTable(result.table);
          const sem = buildSemanticModel(result.table.id, result.table.columns, result.table.name);
          setSemanticModel(sem);
          setActiveTable(result.table.id);
        } else if (result.type === 'multisheet') {
          setMultisheet({ ...result, _file: file });
        } else if (result.type === 'document') {
          // Store as context document — addDocument added via store
          const doc = { id: `doc-${Date.now()}`, name: result.name, fileName: result.fileName, content: result.content, addedAt: new Date().toISOString() };
          try { addDocument(doc); } catch {}
        }
      } catch (e) {
        setError(e.message || `Failed to process "${file.name}". Please check the file format.`);
      } finally {
        setProcessing(false);
        setProcessingFile('');
      }
    }
  }, [addTable, setSemanticModel, setActiveTable]);

  const handleSheetSelect = async (sheetIdx) => {
    if (!multisheet) return;
    const savedMultisheet = { ...multisheet };
    setProcessing(true);
    setProcessingFile(savedMultisheet.fileName);
    setMultisheet(null);
    try {
      // Use pre-parsed sheet data (already parsed during initial XLSX read)
      const sheet = savedMultisheet.sheets[sheetIdx];
      const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const { computeQualityScore, detectIssues } = await import('@/lib/dataParser');
      const table = {
        id, name: sheet.name, fileName: savedMultisheet.fileName,
        rows: sheet.rows, columns: sheet.columns,
        rowCount: sheet.rows.length,
        qualityScore: computeQualityScore(sheet.rows, sheet.columns),
        issues: detectIssues(sheet.rows, sheet.columns),
      };
      addTable(table);
      const sem = buildSemanticModel(table.id, table.columns, table.name);
      setSemanticModel(sem);
      setActiveTable(table.id);
    } catch (e) {
      setError(e.message || 'Failed to load sheet.');
    } finally {
      setProcessing(false);
      setProcessingFile('');
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const onDragOver = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  const { activeTableId } = useWorkspaceStore();

  const [intakeTab, setIntakeTab] = useState('upload');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Data Intake</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Load Data</h1>
        <p className="text-sm text-muted-foreground">Upload files or connect directly to a live data source.</p>
      </motion.div>

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-white/3 border border-white/8 rounded-xl w-fit">
        {[
          { id: 'upload', label: 'File Upload', icon: Upload },
          { id: 'connectors', label: 'Live Connectors', icon: Link2 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setIntakeTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              intakeTab === tab.id ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20' : 'text-white/40 hover:text-white/70'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {intakeTab === 'connectors' && <ConnectorsPanel />}

      {intakeTab === 'upload' && <>
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`relative rounded-2xl border-2 border-dashed transition-all duration-200 ${dragging ? 'border-cyan-400 bg-cyan-400/5 scale-[1.01]' : 'border-white/15 hover:border-white/30 bg-white/2 hover:bg-white/3'}`}
      >
        <input type="file" multiple accept={ACCEPTED} className="absolute inset-0 opacity-0 cursor-pointer z-10"
          onChange={(e) => handleFiles(e.target.files)} />
        <div className="flex flex-col items-center justify-center py-14 px-6 text-center pointer-events-none">
          {processing ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mb-4">
                <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-cyan-400 mb-1">Processing {processingFile}…</p>
              <p className="text-xs text-muted-foreground">Parsing, profiling, and inferring schema…</p>
            </>
          ) : (
            <>
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center mb-4 transition-all ${dragging ? 'bg-cyan-400/15 border-cyan-400/40' : 'bg-white/5 border-white/10'}`}>
                <Upload className={`w-7 h-7 ${dragging ? 'text-cyan-400' : 'text-white/35'}`} />
              </div>
              <p className="text-base font-semibold mb-1">{dragging ? 'Drop files to upload' : 'Drag & drop or click to upload'}</p>
              <p className="text-sm text-muted-foreground mb-3">CSV, XLSX, XLS, JSON, TXT — up to {MAX_MB}MB per file</p>
              <div className="flex flex-wrap gap-2 justify-center text-xs text-muted-foreground">
                {[{ ext: 'CSV', icon: '📄', color: 'text-cyan-400' }, { ext: 'XLSX', icon: '📊', color: 'text-teal-400' }, { ext: 'JSON', icon: '{ }', color: 'text-blue-400' }, { ext: 'TXT', icon: '📝', color: 'text-purple-400' }].map(f => (
                  <span key={f.ext} className={`px-2 py-1 rounded-lg bg-white/5 border border-white/8 ${f.color} font-mono`}>{f.ext}</span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-400 leading-relaxed">{error}</div>
            <button onClick={() => setError('')} className="text-red-400/60 hover:text-red-400"><X className="w-3.5 h-3.5" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Multisheet picker */}
      <AnimatePresence>
        {multisheet && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card rounded-2xl p-5 border border-amber-400/20">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-semibold text-sm mb-0.5">Select Sheet to Import</div>
                <div className="text-xs text-muted-foreground">{multisheet.fileName} has {multisheet.sheets.length} sheets with data</div>
              </div>
              <button onClick={() => setMultisheet(null)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {multisheet.sheets.map((sheet, i) => (
                <button key={sheet.name} onClick={() => setPreviewSheet({ idx: i, sheet })}
                  className="flex items-start gap-3 p-3 rounded-xl border border-white/8 bg-white/3 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition-all text-left">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold">{sheet.name}</div>
                    <div className="text-xs text-muted-foreground">{sheet.rowCount?.toLocaleString()} rows · {sheet.columns?.length} cols</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5">
              <Info className="w-3 h-3" /> You can import multiple sheets by repeating the upload for each.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sheet Preview */}
      <AnimatePresence>
        {previewSheet && (
          <SheetPreview
            sheet={previewSheet.sheet}
            onConfirm={() => { handleSheetSelect(previewSheet.idx); setPreviewSheet(null); }}
            onCancel={() => setPreviewSheet(null)}
          />
        )}
      </AnimatePresence>

      {/* Uploaded tables */}
      {tables.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest">
              Loaded Datasets ({tables.length})
            </div>
            {tables.length > 1 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Layers className="w-3 h-3" /> Multi-table workspace
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <AnimatePresence>
              {tables.map(table => (
                <TableCard
                  key={table.id}
                  table={table}
                  isActive={table.id === activeTableId}
                  onSelect={() => setActiveTable(table.id)}
                  onRemove={() => removeTable(table.id)}
                  onAnalyze={() => setActiveSection('prepare')}
                />
              ))}
            </AnimatePresence>
          </div>

          {tables.length >= 2 && inferRelationships(tables).length > 0 && (
            <div className="mt-3 p-4 rounded-xl border border-blue-400/15 bg-blue-400/5">
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-2">Detected Table Relationships</div>
              {inferRelationships(tables).map((rel, i) => (
                <div key={i} className="flex items-center gap-2 text-xs mb-1 flex-wrap">
                  <span className="font-mono text-white/65">{rel.tableA}</span>
                  <span className="text-white/30">↔</span>
                  <span className="font-mono text-white/65">{rel.tableB}</span>
                  <span className="text-blue-400 font-mono">via {rel.suggestedJoinKey}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    rel.confidence === 'high' ? 'bg-green-400/15 text-green-400' : rel.confidence === 'medium' ? 'bg-amber-400/15 text-amber-400' : 'bg-white/5 text-white/35'
                  }`}>{rel.confidence}</span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button onClick={() => setActiveSection('prepare')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-colors">
              <ChevronRight className="w-3.5 h-3.5" /> Continue to Prepare & Analyze
            </button>
          </div>
        </div>
      )}

      {/* Format guide */}
      {tables.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { ext: 'CSV / TSV', icon: '📄', color: 'text-cyan-400', border: 'border-cyan-400/15', features: ['Auto-detect separator', 'Header detection', 'Type inference', 'Quality scoring'] },
            { ext: 'Excel XLSX', icon: '📊', color: 'text-teal-400', border: 'border-teal-400/15', features: ['Multi-sheet picker', 'Clean blank rows', 'Date cell support', 'Merged header fix'] },
            { ext: 'JSON', icon: '{ }', color: 'text-blue-400', border: 'border-blue-400/15', features: ['Array unwrapping', 'Object flattening', 'Schema detection', 'Nested key support'] },
            { ext: 'TXT / MD', icon: '📝', color: 'text-purple-400', border: 'border-purple-400/15', features: ['Context document', 'AI analyst grounding', 'Evidence retrieval', 'Semantic enrichment'] },
          ].map(f => (
            <div key={f.ext} className={`glass-card rounded-xl p-4 border ${f.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{f.icon}</span>
                <span className={`font-bold text-sm ${f.color}`}>{f.ext}</span>
              </div>
              <ul className="space-y-1.5">
                {f.features.map(feat => (
                  <li key={feat} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" /> {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      </>
      }
    </div>
  );
}