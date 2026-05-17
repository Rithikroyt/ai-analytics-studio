/**
 * RAG + Evidence Hub
 * Upload documents → chunk → search → inject evidence into AI answers
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Upload, FileText, Search, CheckCircle2, Loader2, Trash2,
  Brain, ChevronLeft, Database, BookOpen, Zap, AlertCircle,
  File, FileType, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function RAGEvidenceHub() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [evidence, setEvidence] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const fileRef = useRef(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('processDocumentRAG', { action: 'list' });
      setDocuments(res.data?.documents || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMsg('Uploading file...');
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setUploadMsg('Extracting & chunking text...');
      const res = await base44.functions.invoke('processDocumentRAG', {
        action: 'process',
        fileUrl: file_url,
        fileName: file.name,
        fileType: file.name.split('.').pop(),
      });
      if (res.data?.success) {
        setUploadMsg(`✓ Processed ${res.data.chunksCreated} chunks from "${file.name}"`);
        await loadDocuments();
      } else {
        setUploadMsg(`Error: ${res.data?.error || 'Processing failed'}`);
      }
    } catch (err) {
      setUploadMsg(`Error: ${err.message}`);
    }
    setUploading(false);
    setTimeout(() => setUploadMsg(''), 5000);
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setEvidence(null);
    try {
      const res = await base44.functions.invoke('processDocumentRAG', { action: 'retrieve', query });
      setEvidence(res.data);
    } catch (e) {
      setEvidence({ error: e.message });
    }
    setSearching(false);
  };

  const handleDelete = async (docId) => {
    try {
      await base44.functions.invoke('processDocumentRAG', { action: 'delete', documentIds: [docId] });
      await loadDocuments();
    } catch (e) {}
  };

  const fileTypeIcon = (type) => {
    const t = (type || '').toLowerCase();
    if (t === 'pdf') return '📄';
    if (['xlsx','csv','xls'].includes(t)) return '📊';
    if (['doc','docx'].includes(t)) return '📝';
    return '📃';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">RAG Evidence Hub</h1>
              <p className="text-xs text-muted-foreground">Upload business docs · Search evidence · Inject into AI answers</p>
            </div>
          </div>
          <button onClick={loadDocuments} className="p-2 rounded-xl text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel: upload + docs */}
        <div className="lg:col-span-2 space-y-4">
          {/* Upload */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Upload Document</h2>
            <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-green-400/30 hover:bg-green-400/3 transition-all cursor-pointer"
              onClick={() => fileRef.current?.click()}>
              <Upload className="w-8 h-8 text-white/20 mx-auto mb-2" />
              <p className="text-sm text-white/40">Click to upload PDF, XLSX, CSV, DOCX</p>
              <p className="text-xs text-white/25 mt-1">Text will be extracted, chunked, and indexed</p>
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.xlsx,.csv,.docx,.txt,.json" className="hidden" onChange={handleUpload} />
            {uploading && (
              <div className="mt-3 flex items-center gap-2 text-xs text-green-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {uploadMsg}
              </div>
            )}
            {!uploading && uploadMsg && (
              <div className="mt-3 text-xs text-green-400">{uploadMsg}</div>
            )}
          </div>

          {/* Documents list */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3 flex items-center justify-between">
              <span>Documents ({documents.length})</span>
            </h2>
            {loading ? (
              <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-white/20 mx-auto" /></div>
            ) : documents.length === 0 ? (
              <div className="py-8 text-center text-xs text-white/25">No documents uploaded yet</div>
            ) : (
              <div className="space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-start gap-2.5 p-3 rounded-xl bg-white/2 border border-white/6 group hover:border-white/12 transition-all">
                    <span className="text-lg">{fileTypeIcon(doc.fileType)}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-white/80 truncate">{doc.name}</div>
                      <div className="text-xs text-white/30 mt-0.5">{doc.chunkCount} chunks · {doc.fileType?.toUpperCase()}</div>
                      {doc.summary && <div className="text-xs text-white/40 mt-1 leading-relaxed line-clamp-2">{doc.summary}</div>}
                    </div>
                    <button onClick={() => handleDelete(doc.id)}
                      className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: search + evidence */}
        <div className="lg:col-span-3 space-y-4">
          {/* Search */}
          <div className="rounded-2xl border border-white/8 bg-white/2 p-4">
            <h2 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Evidence Search</h2>
            <div className="flex gap-2">
              <input value={query} onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="What evidence do you need? E.g. 'KPI definition for churn rate'"
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-green-400/30" />
              <button onClick={handleSearch} disabled={!query.trim() || searching || documents.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-green-400/25 transition-all">
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Search
              </button>
            </div>
            {documents.length === 0 && (
              <p className="text-xs text-white/25 mt-2">Upload documents above to enable evidence search</p>
            )}
          </div>

          {/* Evidence results */}
          <AnimatePresence>
            {evidence && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                {evidence.error ? (
                  <div className="p-3 rounded-xl bg-red-400/8 border border-red-400/20 text-sm text-red-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> {evidence.error}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Search className="w-3.5 h-3.5" />
                      Found {evidence.evidence?.length} relevant chunks from {evidence.totalDocuments} document{evidence.totalDocuments !== 1 ? 's' : ''}
                    </div>
                    {evidence.evidence?.length === 0 && (
                      <div className="text-center py-8 text-sm text-white/30 border border-white/5 rounded-2xl">
                        No relevant evidence found. Try different search terms.
                      </div>
                    )}
                    {evidence.evidence?.map((e, i) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                        className="p-4 rounded-2xl border border-green-400/10 bg-green-400/3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-green-400" />
                            <span className="text-xs font-semibold text-green-400">{e.documentName}</span>
                            <span className="text-xs text-white/25">· chunk {(e.chunkIndex || 0) + 1}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-white/40">
                            <Zap className="w-3 h-3" />
                            {e.score}% match
                          </div>
                        </div>
                        <p className="text-sm text-white/65 leading-relaxed">{e.chunk}</p>
                      </motion.div>
                    ))}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* How it works */}
          {!evidence && (
            <div className="rounded-2xl border border-white/5 bg-white/1 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white/40">How RAG Evidence Works</h3>
              {[
                { step: '1', text: 'Upload business documents (KPI definitions, business rules, data dictionaries, reports)', color: 'text-cyan-400' },
                { step: '2', text: 'Text is extracted, split into semantic chunks, and indexed for fast retrieval', color: 'text-green-400' },
                { step: '3', text: 'Search for evidence relevant to any business question', color: 'text-purple-400' },
                { step: '4', text: 'Evidence is cited inside AI-generated reports and answers', color: 'text-amber-400' },
              ].map(s => (
                <div key={s.step} className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5 ${s.color} bg-white/5`}>{s.step}</div>
                  <p className="text-xs text-white/40 leading-relaxed">{s.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}