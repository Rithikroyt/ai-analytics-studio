import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, CheckCircle2, AlertTriangle, FileSpreadsheet, FileJson, FileText, Loader2, ChevronRight, Database } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';
import { processUploadedFile, buildTableSemanticModel, buildTableAnalysis } from '@/lib/dataParser';

const AcceptedTypes = ['.csv', '.xlsx', '.xls', '.json', '.txt'];

function FileIcon({ name }) {
  const ext = name?.split('.').pop()?.toLowerCase();
  if (ext === 'xlsx' || ext === 'xls') return <FileSpreadsheet className="w-5 h-5 text-teal-400" />;
  if (ext === 'json') return <FileJson className="w-5 h-5 text-blue-400" />;
  if (ext === 'txt') return <FileText className="w-5 h-5 text-muted-foreground" />;
  return <FileSpreadsheet className="w-5 h-5 text-cyan-400" />;
}

export default function IntakeSection() {
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processingFile, setProcessingFile] = useState('');
  const [error, setError] = useState('');
  const [sheetModal, setSheetModal] = useState(null); // { file, sheets }
  const [docs, setDocs] = useState([]);
  const { addTable, setSemanticModel, setAnalysisResults, setActiveSection, tables } = useWorkspaceStore();

  const handleFiles = useCallback(async (files) => {
    const fileArr = Array.from(files);
    setError('');
    for (const file of fileArr) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['csv','xlsx','xls','json','txt'].includes(ext)) {
        setError(`Unsupported file: ${file.name}`);
        continue;
      }
      setProcessing(true);
      setProcessingFile(file.name);
      try {
        const result = await processUploadedFile(file);
        if (result.type === 'multisheet') {
          setSheetModal({ file, sheets: result.sheets });
          setProcessing(false);
          return;
        }
        if (result.type === 'document') {
          setDocs(d => [...d, { name: file.name, content: result.content }]);
          setProcessing(false);
          continue;
        }
        if (result.type === 'single') {
          addTable(result.table);
          const model = buildTableSemanticModel(result.table);
          const analysis = buildTableAnalysis(result.table);
          setSemanticModel(model);
          setAnalysisResults(analysis);
        }
      } catch (e) {
        setError(`Error parsing ${file.name}: ${e.message}`);
      }
      setProcessing(false);
      setProcessingFile('');
    }
  }, [addTable, setSemanticModel, setAnalysisResults]);

  const handleSheetSelect = async (sheetIdx) => {
    const { file, sheets } = sheetModal;
    setSheetModal(null);
    setProcessing(true);
    setProcessingFile(file.name);
    try {
      const result = await processUploadedFile(file, sheetIdx);
      if (result.type === 'single') {
        addTable(result.table);
        const model = buildTableSemanticModel(result.table);
        const analysis = buildTableAnalysis(result.table);
        setSemanticModel(model);
        setAnalysisResults(analysis);
      }
    } catch (e) {
      setError(`Error: ${e.message}`);
    }
    setProcessing(false);
    setProcessingFile('');
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Upload Your Data</h1>
        <p className="text-muted-foreground text-sm">CSV, XLSX, JSON — or context documents (TXT). We handle the rest.</p>
      </motion.div>

      {/* Drop zone */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
          dragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/15 hover:border-cyan-400/40 hover:bg-white/2'
        }`}
        onClick={() => { if (!processing) document.getElementById('file-input')?.click(); }}
      >
        <input
          id="file-input"
          type="file"
          multiple
          accept={AcceptedTypes.join(',')}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
        {processing ? (
          <div className="space-y-3">
            <Loader2 className="w-10 h-10 mx-auto text-cyan-400 animate-spin" />
            <div className="text-sm font-medium">Processing {processingFile}…</div>
            <div className="text-xs text-muted-foreground">Parsing columns, inferring types, profiling quality…</div>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
            <div className="text-sm font-medium">Drop files here or click to browse</div>
            <div className="text-xs text-muted-foreground">Supports CSV, XLSX, JSON, TXT · Max 50MB</div>
            <div className="flex gap-2 justify-center flex-wrap mt-2">
              {AcceptedTypes.map(t => (
                <span key={t} className="px-2 py-0.5 bg-white/5 rounded text-xs text-muted-foreground">{t}</span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex items-start gap-3 p-4 bg-red-400/5 border border-red-400/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-red-400">{error}</div>
            <button onClick={() => setError('')} className="ml-auto text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Uploaded tables */}
      <AnimatePresence>
        {tables.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Uploaded Tables</h2>
            <div className="space-y-3">
              {tables.map((table) => (
                <div key={table.id} className="flex items-center gap-4 p-4 glass-card rounded-xl border border-white/5">
                  <Database className="w-5 h-5 text-cyan-400 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">{table.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{table.rowCount?.toLocaleString()} rows · {table.columns?.length} columns · Quality: {table.qualityScore}%</div>
                    {table.issues?.length > 0 && (
                      <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {table.issues.map(i => i.message).join(' · ')}
                      </div>
                    )}
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </div>
              ))}
            </div>
            <button
              onClick={() => setActiveSection('prepare')}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors"
            >
              Continue to Prepare <ChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Docs */}
      {docs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Context Documents</h2>
          {docs.map((doc) => (
            <div key={doc.name} className="flex items-center gap-3 p-3 glass rounded-lg border border-white/5 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{doc.name}</span>
              <span className="text-xs text-muted-foreground ml-auto">{(doc.content?.length / 1000).toFixed(1)}k chars</span>
            </div>
          ))}
        </div>
      )}

      {/* Sheet selection modal */}
      <AnimatePresence>
        {sheetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setSheetModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card rounded-2xl p-6 w-full max-w-md border border-white/10 m-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-bold mb-2">Select a Sheet</h3>
              <p className="text-sm text-muted-foreground mb-4">{sheetModal.file.name} contains {sheetModal.sheets.length} sheets.</p>
              <div className="space-y-2">
                {sheetModal.sheets.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => handleSheetSelect(i)}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 text-sm transition-colors border border-white/5"
                  >
                    <span>{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.rows.length} rows</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}