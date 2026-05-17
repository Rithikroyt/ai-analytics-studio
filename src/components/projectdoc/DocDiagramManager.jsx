import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Save, Eye, EyeOff, Loader2, GitBranch } from 'lucide-react';

const DEFAULT_DIAGRAMS = [
  {
    title: 'High-Level System Architecture',
    diagramType: 'flowchart',
    mermaidCode: `flowchart TD
    A[User Login] --> B[Upload Data]
    B --> C[Data Quality Studio]
    C --> D[Data Prep and Profiling]
    D --> E[Semantic Metrics Layer]
    E --> F[SQL Studio]
    E --> G[Visual Builder]
    E --> H[AI Analyst / Agent Studio]
    H --> I[Reports and Decision Intelligence]
    I --> J[PDF Export]
    K[Admin Portal] --> L[User Analytics]
    K --> M[Project Documentation Center]
    M --> J`,
    explanation: 'This diagram shows the high-level data flow from user login through the analytics pipeline to final PDF export and admin governance.',
  },
  {
    title: 'AI Agent Workflow',
    diagramType: 'flowchart',
    mermaidCode: `flowchart TD
    Q[User Question] --> I[Intent Classifier]
    I --> S[Data Sufficiency Check]
    S --> M[Semantic Metric Lookup]
    M --> P[Tool Planner]
    P --> T[Tool Execution]
    T --> V[Result Validator]
    V --> A[Answer Synthesizer]
    A --> R[Recommendation + Confidence Score]
    R --> L[Log Agent Trace]`,
    explanation: 'This diagram illustrates the F-D-E-A-R reasoning pipeline used by AI agents to process business questions.',
  },
  {
    title: 'PDF Export Sequence',
    diagramType: 'sequence',
    mermaidCode: `sequenceDiagram
    participant Admin
    participant UI as Admin Portal
    participant Backend as Base44 Backend
    participant Data as App Data Store
    participant PDF as PDF Generator
    Admin->>UI: Click Generate Project PDF
    UI->>Backend: Request live project metadata
    Backend->>Data: Fetch modules screenshots diagrams reports
    Data-->>Backend: Return document payload
    Backend->>PDF: Generate structured PDF
    PDF-->>Backend: Return PDF URL
    Backend-->>UI: Show download link`,
    explanation: 'Sequence diagram showing the interaction between the admin, frontend, backend, and PDF generator during document export.',
  },
  {
    title: 'Entity Relationship Diagram',
    diagramType: 'er',
    mermaidCode: `erDiagram
    USER ||--o{ PROJECT_DOCUMENT_SNAPSHOT : generates
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_DOCUMENT_SNAPSHOT : creates
    PROJECT_DOCUMENT_CONFIG ||--o{ APPLICATION_SCREENSHOT : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_CODE_SNIPPET : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_DIAGRAM : includes
    PROJECT_DOCUMENT_CONFIG ||--o{ PROJECT_REFERENCE : includes`,
    explanation: 'ER diagram showing relationships between project documentation entities.',
  },
];

function MermaidPreview({ code }) {
  const ref = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!ref.current || !code) return;
    setError('');
    const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
    ref.current.innerHTML = '';
    if (window.mermaid) {
      window.mermaid.render(id, code)
        .then(({ svg }) => { if (ref.current) ref.current.innerHTML = svg; })
        .catch(e => setError(e.message || 'Mermaid render error'));
    } else {
      ref.current.innerHTML = `<pre style="font-size:11px;color:#94a3b8;white-space:pre-wrap">${code}</pre>`;
    }
  }, [code]);

  return (
    <div className="rounded-xl bg-white/3 border border-white/8 p-4 min-h-24">
      {error ? <p className="text-xs text-red-400">{error}</p> : <div ref={ref} className="overflow-auto" />}
    </div>
  );
}

export default function DocDiagramManager({ config, user }) {
  const [diagrams, setDiagrams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!document.getElementById('mermaid-script')) {
      const script = document.createElement('script');
      script.id = 'mermaid-script';
      script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
      script.onload = () => window.mermaid?.initialize({ startOnLoad: false, theme: 'dark' });
      document.head.appendChild(script);
    } else if (window.mermaid) {
      window.mermaid.initialize({ startOnLoad: false, theme: 'dark' });
    }
  }, []);

  useEffect(() => { if (config?.id) load(); }, [config?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.ProjectDiagram.filter({ configId: config.id }, 'order');
      setDiagrams(items);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addDefault = async () => {
    if (!config?.id) return;
    setSaving(true);
    for (let i = 0; i < DEFAULT_DIAGRAMS.length; i++) {
      const d = DEFAULT_DIAGRAMS[i];
      const exists = diagrams.find(x => x.title === d.title);
      if (!exists) {
        await base44.entities.ProjectDiagram.create({ configId: config.id, ...d, order: diagrams.length + i, includeInPdf: true });
      }
    }
    await load();
    setSaving(false);
  };

  const addNew = async () => {
    if (!config?.id) return;
    const created = await base44.entities.ProjectDiagram.create({
      configId: config.id,
      title: 'New Diagram',
      diagramType: 'flowchart',
      mermaidCode: 'flowchart TD\n    A --> B',
      explanation: '',
      order: diagrams.length,
      includeInPdf: true,
    });
    setDiagrams(prev => [...prev, created]);
    setEditing(created.id);
  };

  const update = async (d) => {
    const updated = await base44.entities.ProjectDiagram.update(d.id, d);
    setDiagrams(prev => prev.map(x => x.id === d.id ? updated : x));
  };

  const remove = async (id) => {
    await base44.entities.ProjectDiagram.delete(id);
    setDiagrams(prev => prev.filter(x => x.id !== id));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Diagram Manager</h2>
          <p className="text-sm text-white/40 mt-0.5">Create and manage Mermaid diagrams to be included in the PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addDefault} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
            Add Default Diagrams
          </button>
          <button onClick={addNew} disabled={!config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Diagram
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : diagrams.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/5 rounded-2xl">
          <GitBranch className="w-10 h-10 text-white/15 mb-3" />
          <p className="text-sm text-white/30 mb-4">No diagrams yet.</p>
          <button onClick={addDefault} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-400/20 transition-all">
            Add Default Architecture Diagrams
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {diagrams.map(d => (
            <div key={d.id} className={`glass-card rounded-2xl border p-5 space-y-4 transition-all ${d.includeInPdf ? 'border-white/8' : 'border-white/3 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <input value={d.title} onChange={e => update({ ...d, title: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white/80 focus:outline-none focus:border-cyan-400/30" />
                <select value={d.diagramType} onChange={e => update({ ...d, diagramType: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white/60 focus:outline-none">
                  {['flowchart','sequence','er','class','activity','component','deployment','state','user_journey'].map(t =>
                    <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={() => update({ ...d, includeInPdf: !d.includeInPdf })}
                  className={`p-2 rounded-lg transition-all ${d.includeInPdf ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/30 hover:text-white/60'}`}>
                  {d.includeInPdf ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(d.id)} className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Mermaid Code</label>
                  <textarea value={d.mermaidCode}
                    onChange={e => update({ ...d, mermaidCode: e.target.value })}
                    rows={8}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-green-400 font-mono placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30 resize-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-wider">Preview</label>
                  <MermaidPreview code={d.mermaidCode} />
                </div>
              </div>

              <input value={d.explanation || ''} onChange={e => update({ ...d, explanation: e.target.value })}
                placeholder="Explanation of this diagram (shown below the diagram in the PDF)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}