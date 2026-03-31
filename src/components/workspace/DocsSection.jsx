import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DocsSection() {
  const [docs, setDocs] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [snippets, setSnippets] = useState([]);

  const handleFiles = async (files) => {
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'pdf', 'docx'].includes(ext)) continue;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target.result;
        const newDoc = { id: Date.now(), name: file.name, content, size: file.size };
        setDocs(d => [...d, newDoc]);
        setSelectedDoc(newDoc);
      };
      reader.readAsText(file);
    }
  };

  const extractEvidence = async (doc) => {
    setExtracting(true);
    setSnippets([]);
    try {
      const prompt = `Analyze this document and extract key evidence snippets, data definitions, and quality notes. 
Document: "${doc.name}"
Content (first 3000 chars): ${doc.content?.slice(0, 3000)}

Respond with JSON:
{
  "snippets": [
    {"type": "insight", "text": "...", "relevance": "high|medium|low"},
    ...
  ]
}`;
      const resp = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: 'object',
          properties: {
            snippets: {
              type: 'array',
              items: {
                type: 'object',
                properties: { type: { type: 'string' }, text: { type: 'string' }, relevance: { type: 'string' } },
              },
            },
          },
        },
      });
      setSnippets(resp.snippets || []);
    } catch {
      setSnippets([{ type: 'info', text: 'Could not extract snippets automatically. The document is available for reference.', relevance: 'low' }]);
    }
    setExtracting(false);
  };

  const removeDoc = (id) => {
    setDocs(d => d.filter(doc => doc.id !== id));
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  const relevanceColors = { high: 'border-cyan-400/20 bg-cyan-400/5', medium: 'border-teal-400/15 bg-teal-400/3', low: 'border-white/5' };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Docs & Evidence</h1>
        <p className="text-muted-foreground text-sm">Upload context documents (TXT, PDF, DOCX) to ground the AI Analyst with domain knowledge.</p>
      </motion.div>

      {/* Drop zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => document.getElementById('doc-input')?.click()}
        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${dragging ? 'border-cyan-400 bg-cyan-400/5' : 'border-white/15 hover:border-cyan-400/30'}`}
      >
        <input id="doc-input" type="file" multiple accept=".txt,.pdf,.docx" className="hidden" onChange={e => handleFiles(e.target.files)} />
        <FileText className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
        <div className="text-sm font-medium mb-1">Drop context documents here</div>
        <div className="text-xs text-muted-foreground">TXT, PDF, DOCX — used to ground AI answers with domain knowledge</div>
      </div>

      {/* Docs list */}
      {docs.length > 0 && (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div
              key={doc.id}
              className={`flex items-center gap-3 p-3 glass-card rounded-xl border cursor-pointer transition-all ${selectedDoc?.id === doc.id ? 'border-cyan-400/30' : 'border-white/5'}`}
              onClick={() => setSelectedDoc(doc)}
            >
              <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium">{doc.name}</div>
                <div className="text-xs text-muted-foreground">{(doc.size / 1024).toFixed(1)} KB · {(doc.content?.length / 1000).toFixed(1)}k chars</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); removeDoc(doc.id); }}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Selected doc evidence */}
      {selectedDoc && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{selectedDoc.name}</h3>
            <button
              onClick={() => extractEvidence(selectedDoc)}
              disabled={extracting}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-400/15 transition-colors"
            >
              {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Extract Evidence
            </button>
          </div>

          {/* Raw content preview */}
          <div className="glass-card rounded-xl border border-white/5 p-4">
            <div className="text-xs text-muted-foreground mb-2">Content Preview</div>
            <pre className="text-xs text-foreground/70 whitespace-pre-wrap line-clamp-6 max-h-32 overflow-auto">{selectedDoc.content?.slice(0, 800)}</pre>
          </div>

          {/* Evidence snippets */}
          <AnimatePresence>
            {snippets.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Extracted Evidence</h4>
                {snippets.map((s, i) => (
                  <div key={i} className={`p-4 rounded-xl border ${relevanceColors[s.relevance] || 'border-white/5'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs uppercase font-semibold text-muted-foreground">{s.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${s.relevance === 'high' ? 'bg-cyan-400/10 text-cyan-400' : s.relevance === 'medium' ? 'bg-teal-400/10 text-teal-400' : 'bg-white/5 text-muted-foreground'}`}>
                        {s.relevance}
                      </span>
                    </div>
                    <p className="text-sm">{s.text}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {!docs.length && (
        <div className="text-center py-12 text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No documents uploaded yet. Context docs improve AI analyst grounding.</p>
        </div>
      )}
    </div>
  );
}