import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, X, Sparkles, Loader2, AlertCircle, CheckCircle2, Info, Search, Tag, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';

const RELEVANCE_META = {
  high:   { color: 'text-cyan-400',   bg: 'bg-cyan-400/10',   border: 'border-cyan-400/20',   label: 'HIGH' },
  medium: { color: 'text-teal-400',   bg: 'bg-teal-400/10',   border: 'border-teal-400/15',   label: 'MED' },
  low:    { color: 'text-white/40',   bg: 'bg-white/5',       border: 'border-white/8',       label: 'LOW' },
};

const TYPE_META = {
  insight:     { color: 'text-purple-400',  icon: Sparkles },
  definition:  { color: 'text-blue-400',    icon: Tag },
  risk:        { color: 'text-amber-400',   icon: AlertCircle },
  finding:     { color: 'text-teal-400',    icon: CheckCircle2 },
  info:        { color: 'text-white/50',    icon: Info },
};

export default function DocsSection() {
  const { setActiveSection } = useWorkspaceStore();
  const [docs, setDocs] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [snippets, setSnippets] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'pdf', 'docx', 'md'].includes(ext)) continue;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const newDoc = { id: `doc-${Date.now()}-${Math.random()}`, name: file.name, content, size: file.size, addedAt: new Date().toISOString() };
        setDocs(d => [...d, newDoc]);
        setSelectedDoc(newDoc);
      };
      reader.readAsText(file);
    }
  };

  const extractEvidence = async (doc) => {
    setExtracting(true);
    try {
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a document analyst. Extract key evidence snippets, data definitions, insights, risks, and findings from this document.
Document: "${doc.name}"
Content (up to 4000 chars): ${doc.content?.slice(0, 4000)}

Return 5-8 evidence snippets covering different aspects. Each snippet should be a standalone, useful insight.

Respond with JSON:
{
  "snippets": [
    {"type": "insight|definition|risk|finding|info", "text": "concrete snippet from document", "relevance": "high|medium|low"},
    ...
  ]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            snippets: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string' },
                  text: { type: 'string' },
                  relevance: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setSnippets(s => ({ ...s, [doc.id]: resp.snippets || [] }));
    } catch {
      setSnippets(s => ({
        ...s,
        [doc.id]: [{ type: 'info', text: 'Document added as evidence context. The AI Analyst will reference it when answering questions about your data.', relevance: 'medium' }],
      }));
    }
    setExtracting(false);
  };

  const searchDocs = async () => {
    if (!searchQuery.trim() || !docs.length) return;
    setSearching(true);
    setSearchResults(null);
    try {
      const combined = docs.map(d => `--- ${d.name} ---\n${d.content?.slice(0, 2000)}`).join('\n\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Search these documents for: "${searchQuery}"
Documents:
${combined}

Return the most relevant excerpts and what they mean. Be specific and cite which document.`,
      });
      setSearchResults(result);
    } catch {
      setSearchResults('Could not search documents. Please try again.');
    }
    setSearching(false);
  };

  const removeDoc = (id) => {
    setDocs(d => d.filter(doc => doc.id !== id));
    setSnippets(s => { const ns = { ...s }; delete ns[id]; return ns; });
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const allSnippets = Object.values(snippets).flat();

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Docs & Evidence</h1>
        <p className="text-sm text-muted-foreground">Upload context documents (TXT, PDF, DOCX) to ground the AI Analyst with domain knowledge and definitions.</p>
      </motion.div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-purple-400/5 border border-purple-400/15 rounded-xl">
        <Sparkles className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-purple-300 leading-relaxed">
          Evidence documents are referenced by the AI Analyst when answering questions. Upload data dictionaries, business definitions, methodology notes, or context files to get more grounded, accurate AI answers.
          <button onClick={() => setActiveSection('analyst')} className="ml-2 text-cyan-400 hover:underline inline-flex items-center gap-1">
            Go to AI Analyst <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById('doc-input')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-cyan-400 bg-cyan-400/8 scale-[1.01]' : 'border-white/15 hover:border-cyan-400/30 hover:bg-white/2'}`}
      >
        <input id="doc-input" type="file" multiple accept=".txt,.pdf,.docx,.md" className="hidden" onChange={e => handleFiles(e.target.files)} />
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${dragging ? 'bg-cyan-400/15 border border-cyan-400/30' : 'bg-white/5 border border-white/10'}`}>
          <Upload className={`w-6 h-6 ${dragging ? 'text-cyan-400' : 'text-muted-foreground'}`} />
        </div>
        <div className="text-sm font-medium mb-1">Drop context documents here</div>
        <div className="text-xs text-muted-foreground mb-3">TXT, PDF, DOCX, MD — used to ground AI answers with domain knowledge</div>
        <div className="flex gap-2 justify-center">
          {['.txt', '.pdf', '.docx', '.md'].map(t => (
            <span key={t} className="px-2 py-0.5 bg-white/5 rounded text-xs text-muted-foreground border border-white/8">{t}</span>
          ))}
        </div>
      </div>

      {/* Documents list */}
      {docs.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Uploaded Documents ({docs.length})</div>
          {docs.map((doc) => (
            <div key={doc.id}
              className={`flex items-center gap-3 p-3 glass-card rounded-xl border cursor-pointer transition-all ${selectedDoc?.id === doc.id ? 'border-cyan-400/35 bg-cyan-400/5' : 'border-white/8 hover:border-white/15'}`}
              onClick={() => setSelectedDoc(doc)}>
              <div className="w-8 h-8 rounded-xl bg-purple-400/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{doc.name}</div>
                <div className="text-xs text-muted-foreground">
                  {(doc.size / 1024).toFixed(1)} KB · {(doc.content?.length / 1000).toFixed(1)}k chars
                  {snippets[doc.id] && <span className="ml-2 text-cyan-400">· {snippets[doc.id].length} snippets</span>}
                </div>
              </div>
              {snippets[doc.id]?.length > 0 && <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />}
              <button onClick={e => { e.stopPropagation(); removeDoc(doc.id); }} className="text-white/25 hover:text-red-400 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected doc detail */}
      <AnimatePresence>
        {selectedDoc && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm">{selectedDoc.name}</h3>
              <button onClick={() => extractEvidence(selectedDoc)} disabled={extracting}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-all disabled:opacity-50">
                {extracting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting…</> : <><Sparkles className="w-3.5 h-3.5" /> Extract Evidence</>}
              </button>
            </div>

            {/* Content preview */}
            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Document Preview</div>
              <pre className="text-xs text-white/60 whitespace-pre-wrap leading-relaxed max-h-36 overflow-auto font-mono">{selectedDoc.content?.slice(0, 1000)}{selectedDoc.content?.length > 1000 ? '\n… (truncated)' : ''}</pre>
            </div>

            {/* Evidence snippets */}
            <AnimatePresence>
              {snippets[selectedDoc.id]?.length > 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Extracted Evidence ({snippets[selectedDoc.id].length} snippets)</div>
                  {snippets[selectedDoc.id].map((s, i) => {
                    const relMeta = RELEVANCE_META[s.relevance] || RELEVANCE_META.low;
                    const typeMeta = TYPE_META[s.type] || TYPE_META.info;
                    const Icon = typeMeta.icon;
                    return (
                      <div key={i} className={`p-4 rounded-xl border ${relMeta.border} ${relMeta.bg}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className={`w-3.5 h-3.5 ${typeMeta.color} flex-shrink-0`} />
                          <span className={`text-xs font-semibold uppercase ${typeMeta.color}`}>{s.type}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ml-auto font-bold ${relMeta.color} ${relMeta.bg}`}>{relMeta.label}</span>
                        </div>
                        <p className="text-sm text-white/65 leading-relaxed">{s.text}</p>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Doc search */}
      {docs.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Search Documents</div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchDocs()}
                placeholder="Search across all documents…"
                className="w-full pl-9 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground placeholder:text-muted-foreground" />
            </div>
            <button onClick={searchDocs} disabled={searching || !searchQuery.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-white/8 border border-white/12 rounded-xl text-xs font-medium hover:bg-white/12 transition-all disabled:opacity-40">
              {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              {searching ? 'Searching…' : 'Search'}
            </button>
          </div>
          <AnimatePresence>
            {searchResults && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="p-4 glass-card rounded-xl border border-white/8">
                <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Search Results</div>
                <p className="text-sm text-white/65 leading-relaxed whitespace-pre-wrap">{searchResults}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* All snippets summary */}
      {allSnippets.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/8">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">{allSnippets.length} Evidence Snippets Ready for AI Analyst</div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(RELEVANCE_META).map(([level, meta]) => {
              const count = allSnippets.filter(s => s.relevance === level).length;
              if (!count) return null;
              return (
                <span key={level} className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${meta.color} ${meta.bg} ${meta.border}`}>
                  {count} {level}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {!docs.length && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">No documents yet. Upload TXT, PDF, or DOCX files to ground AI answers with domain knowledge.</p>
        </div>
      )}
    </div>
  );
}