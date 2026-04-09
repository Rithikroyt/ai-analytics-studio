import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, CheckCircle2, AlertTriangle, FileSpreadsheet,
  FileJson, FileText, Loader2, ChevronRight, Database,
  Trash2, Eye, ArrowRight, Info, File
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { processUploadedFile, buildTableSemanticModel } from '@/lib/dataParser';

const AcceptedTypes = ['.csv', '.xlsx', '.xls', '.json', '.txt'];

const FORMAT_INFO = [
  { ext: ['csv', 'tsv'], icon: FileSpreadsheet, color: 'text-cyan-400', bg: 'bg-cyan-400/10', label: 'CSV / TSV', desc: 'Auto-detect separator, headers, column types' },
  { ext: ['xlsx', 'xls'], icon: FileSpreadsheet, color: 'text-teal-400', bg: 'bg-teal-400/10', label: 'Excel XLSX', desc: 'Sheet selection, header cleaning, type inference' },
  { ext: ['json'], icon: FileJson, color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'JSON', desc: 'Flat or nested arrays, auto-flattening' },
  { ext: ['txt'], icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10', label: 'TXT / Docs', desc: 'Evidence context for AI Analyst grounding' },
];

function FileTypeIcon({ name, size = 5 }) {
  const ext = name?.split('.').pop()?.toLowerCase();
  const cls = `w-${size} h-${size}`;
  if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className={`${cls} text-teal-400`} />;
  if (ext === 'json') return <FileJson className={`${cls} text-blue-400`} />;
  if (ext === 'txt') return <FileText className={`${cls} text-purple-400`} />;
  return <FileSpreadsheet className={`${cls} text-cyan-400`} />;
}

function QualityBar({ score }) {
  const color = score >= 90 ? 'bg-green-400' : score >= 70 ? 'bg-amber-400' : 'bg-red-400';
  const textColor = score >= 90 ? 'text-green-400' : score >= 70 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-mono font-semibold ${textColor}`}>{score}%</span>
    </div>
  );
}

export default function IntakeSection() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');
  const [sheetModal, setSheetModal] = useState(null);
  const [docs, setDocs] = useState([]);
  const [previewTable, setPreviewTable] = useState(null);
  const { addTable, setSemanticModel, setActiveSection, tables, removeTable } = useWorkspaceStore();

  const handleFiles = useCallback(async (files) => {
    const fileArr = Array.from(files);
    setError('');
    for (const file of fileArr) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls', 'json', 'txt'].includes(ext)) {
        setError(`Unsupported file type: ${file.name}. Please upload CSV, XLSX, JSON, or TXT files.`);
        continue;
      }
      setProcessing(true);
      setProcessingFile(file.name);
      setProcessingStep('Reading file…');
      try {
        setProcessingStep('Parsing columns and rows…');
        const result = await processUploadedFile(file);

        if (result.type === 'multisheet') {
          setSheetModal({ file, sheets: result.sheets });
          setProcessing(false);
          return;
        }
        if (result.type === 'document') {
          setDocs(d => [...d, { name: file.name, content: result.content, size: file.size }]);
          setProcessing(false);
          setProcessingFile('');
          continue;
        }
        if (result.type === 'single') {
          setProcessingStep('Profiling data quality…');
          await new Promise(r => setTimeout(r, 200));
          setProcessingStep('Building semantic model…');
          addTable(result.table);
          const model = buildTableSemanticModel(result.table);
          setSemanticModel(model);
        }
      } catch (e) {
        setError(`Failed to parse "${file.name}": ${e.message}. Please check the file format and try again.`);
      }
      setProcessing(false);
      setProcessingFile('');
      setProcessingStep('');
    }
  }, [addTable, setSemanticModel]);

  const handleSheetSelect = async (sheetIdx) => {
    const { file } = sheetModal;
    setSheetModal(null);
    setProcessing(true);
    setProcessingFile(file.name);
    setProcessingStep(`Loading sheet ${sheetIdx + 1}…`);
    try {
      const result = await processUploadedFile(file, sheetIdx);
      if (result.type === 'single') {
        addTable(result.table);
        const model = buildTableSemanticModel(result.table);
        setSemanticModel(model);
      }
    } catch (e) {
      setError(`Error loading sheet: ${e.message}`);
    }
    setProcessing(false);
    setProcessingFile('');
    setProcessingStep('');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Data Intake</h1>
        <p className="text-sm text-muted-foreground">Upload structured data files or context documents. We auto-detect types, clean headers, and profile quality.</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all cursor-pointer ${
          dragging ? 'border-cyan-400 bg-cyan-400/8 scale-[1.01]' : 'border-white/15 hover:border-cyan-400/50 hover:bg-white/2'
        }`}
        onClick={() => { if (!processing) document.getElementById('file-input')?.click(); }}
      >
        <input id="file-input" type="file" multiple accept={AcceptedTypes.join(',')} className="hidden"
          onChange={e => handleFiles(e.target.files)} />

        {processing ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center mx-auto">
              <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            </div>
            <div>
              <div className="text-sm font-semibold mb-1">{processingFile}</div>
              <div className="text-xs text-cyan-400">{processingStep}</div>
            </div>
            <div className="flex gap-1 justify-center">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto transition-all ${dragging ? 'bg-cyan-400/20 border border-cyan-400/40' : 'bg-white/5 border border-white/10'}`}>
              <Upload className={`w-7 h-7 ${dragging ? 'text-cyan-400' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="text-base font-semibold mb-1">Drop files here or click to browse</div>
              <div className="text-sm text-muted-foreground">CSV, XLSX, JSON, TXT · Up to 50MB per file · Multiple files supported</div>
            </div>
            <div className="flex gap-2 justify-center flex-wrap">
              {AcceptedTypes.map(t => (
                <span key={t} className="px-2.5 py-1 bg-white/5 rounded-lg text-xs text-muted-foreground border border-white/8">{t}</span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Format info strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {FORMAT_INFO.map((f) => (
          <div key={f.label} className="glass rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <f.icon className={`w-3.5 h-3.5 ${f.color}`} />
              <span className={`text-xs font-semibold ${f.color}`}>{f.label}</span>
            </div>
            <div className="text-xs text-muted-foreground leading-relaxed">{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/25 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-400 flex-1">{error}</div>
            <button onClick={() => setError('')} className="text-white/30 hover:text-white/60 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded tables */}
      <AnimatePresence>
        {tables.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Uploaded Tables ({tables.length})</h2>
            </div>
            <div className="space-y-3">
              {tables.map((table) => (
                <div key={table.id} className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <FileTypeIcon name={table.name} size={4} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <div className="font-semibold text-sm truncate">{table.name}</div>
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                      </div>
                      <div className="text-xs text-muted-foreground mb-1.5">
                        {table.rowCount?.toLocaleString()} rows · {table.columns?.length} columns · {table.columns?.filter(c => c.type === 'numeric').length} numeric · {table.columns?.filter(c => c.type === 'category').length} category
                      </div>
                      <QualityBar score={table.qualityScore} />
                      {table.issues?.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {table.issues.slice(0, 2).map((issue, i) => (
                            <div key={i} className="flex items-start gap-1.5 text-xs text-amber-400">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                              {issue.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => setPreviewTable(previewTable?.id === table.id ? null : table)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all" title="Preview">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => removeTable(table.id)}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all" title="Remove">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Inline preview */}
                  <AnimatePresence>
                    {previewTable?.id === table.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-3 pt-3 border-t border-white/8">
                        <div className="text-xs text-muted-foreground mb-2">First 5 rows preview</div>
                        <div className="overflow-auto rounded-lg border border-white/8">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-white/5">
                                {table.columns?.slice(0, 6).map(col => (
                                  <th key={col.name} className="px-3 py-2 text-left font-mono text-white/50 whitespace-nowrap border-b border-white/5">{col.name}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {table.rows?.slice(0, 5).map((row, i) => (
                                <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                                  {table.columns?.slice(0, 6).map(col => (
                                    <td key={col.name} className="px-3 py-2 text-white/60 whitespace-nowrap max-w-32 truncate">{String(row[col.name] ?? '—')}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {table.columns?.length > 6 && (
                          <div className="text-xs text-white/30 mt-1.5">+{table.columns.length - 6} more columns not shown</div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>

            <button onClick={() => setActiveSection('prepare')}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              Continue to Prepare <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Context documents */}
      {docs.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Context Documents ({docs.length})</h2>
          <div className="flex items-start gap-2 p-3 bg-purple-400/5 border border-purple-400/20 rounded-xl mb-3 text-xs text-purple-300">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            These documents are used as evidence context for the AI Analyst — they ground answers with relevant information from your uploaded files.
          </div>
          <div className="space-y-2">
            {docs.map((doc) => (
              <div key={doc.name} className="flex items-center gap-3 p-3 glass rounded-xl border border-white/8">
                <FileText className="w-4 h-4 text-purple-400 flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{doc.name}</span>
                <span className="text-xs text-muted-foreground">{(doc.content?.length / 1000).toFixed(1)}k chars</span>
                <button onClick={() => setDocs(d => d.filter(x => x.name !== doc.name))}
                  className="p-1 rounded text-white/25 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Sheet selection modal */}
      <AnimatePresence>
        {sheetModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            onClick={() => setSheetModal(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-sm border border-white/12 m-4 shadow-2xl"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-teal-400/10 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Select a Sheet</h3>
                  <p className="text-xs text-muted-foreground">{sheetModal.file.name}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                This workbook has {sheetModal.sheets.length} sheet{sheetModal.sheets.length !== 1 ? 's' : ''}. Choose which one to analyze.
              </p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {sheetModal.sheets.map((s, i) => (
                  <button key={s.name} onClick={() => handleSheetSelect(i)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm transition-all border border-white/8 hover:border-teal-400/30 group">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded bg-teal-400/15 flex items-center justify-center text-xs font-mono text-teal-400">{i + 1}</div>
                      <span className="font-medium">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{s.rows?.length?.toLocaleString()} rows</span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-teal-400 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setSheetModal(null)} className="mt-4 w-full py-2 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 transition-all">
                Cancel
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}