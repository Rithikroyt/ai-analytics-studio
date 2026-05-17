import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Loader2, BookOpen } from 'lucide-react';

const DEFAULT_REFS = [
  { title: 'The Data Warehouse Toolkit', author: 'Kimball, R. & Ross, M.', year: '2013', source: 'Wiley', url: '', type: 'book' },
  { title: 'Data Science for Business', author: 'Provost, F. & Fawcett, T.', year: '2013', source: "O'Reilly Media", url: '', type: 'book' },
  { title: 'What is Decision Intelligence?', author: 'Kozyrkov, C.', year: '2019', source: 'Towards Data Science', url: 'https://towardsdatascience.com', type: 'website' },
  { title: 'Power BI Documentation', author: 'Microsoft Corporation', year: '2024', source: 'Microsoft Learn', url: 'https://docs.microsoft.com/power-bi', type: 'website' },
  { title: 'GPT-4 Technical Report', author: 'OpenAI', year: '2024', source: 'arXiv:2303.08774', url: 'https://arxiv.org/abs/2303.08774', type: 'report' },
  { title: 'ReAct: Synergizing Reasoning and Acting in Language Models', author: 'Yao, S. et al.', year: '2022', source: 'arXiv:2210.03629', url: 'https://arxiv.org/abs/2210.03629', type: 'journal_article' },
  { title: 'Base44 Platform Documentation', author: 'Base44', year: '2024', source: 'Base44', url: 'https://base44.com/docs', type: 'website' },
  { title: 'React Documentation', author: 'React Team', year: '2024', source: 'React.dev', url: 'https://react.dev', type: 'website' },
];

export default function DocReferenceManager({ config, user }) {
  const [refs, setRefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (config?.id) load(); }, [config?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.ProjectReference.filter({ configId: config.id }, 'order');
      setRefs(items);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addDefaults = async () => {
    if (!config?.id) return;
    setAdding(true);
    for (let i = 0; i < DEFAULT_REFS.length; i++) {
      const r = DEFAULT_REFS[i];
      const exists = refs.find(x => x.title === r.title);
      if (!exists) await base44.entities.ProjectReference.create({ configId: config.id, ...r, order: refs.length + i });
    }
    await load();
    setAdding(false);
  };

  const addNew = async () => {
    const created = await base44.entities.ProjectReference.create({
      configId: config.id, title: 'New Reference', author: '', year: new Date().getFullYear().toString(),
      source: '', url: '', type: 'website', order: refs.length,
    });
    setRefs(prev => [...prev, created]);
  };

  const update = async (r) => {
    const updated = await base44.entities.ProjectReference.update(r.id, r);
    setRefs(prev => prev.map(x => x.id === r.id ? updated : x));
  };

  const remove = async (id) => {
    await base44.entities.ProjectReference.delete(id);
    setRefs(prev => prev.filter(x => x.id !== id));
  };

  const TYPES = ['book', 'journal_article', 'website', 'report', 'other'];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Reference Manager</h2>
          <p className="text-sm text-white/40 mt-0.5">Manage bibliography references for Chapter 21. APA-style formatting.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addDefaults} disabled={adding || !config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-40">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
            Add Default References
          </button>
          <button onClick={addNew} disabled={!config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Reference
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : refs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/5 rounded-2xl">
          <BookOpen className="w-10 h-10 text-white/15 mb-3" />
          <p className="text-sm text-white/30 mb-4">No references yet.</p>
          <button onClick={addDefaults} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-400/20 transition-all">
            Add Default References
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {refs.map((r, i) => (
            <div key={r.id} className="glass-card rounded-2xl border border-white/8 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-white/30 w-7 text-center">[{i + 1}]</span>
                <select value={r.type || 'website'} onChange={e => update({ ...r, type: e.target.value })}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white/60 focus:outline-none">
                  {TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                <button onClick={() => remove(r.id)} className="ml-auto p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input value={r.title} onChange={e => update({ ...r, title: e.target.value })}
                  placeholder="Title *" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
                <input value={r.author || ''} onChange={e => update({ ...r, author: e.target.value })}
                  placeholder="Author(s)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
                <input value={r.source || ''} onChange={e => update({ ...r, source: e.target.value })}
                  placeholder="Source (Journal/Book/Website)" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
                <input value={r.year || ''} onChange={e => update({ ...r, year: e.target.value })}
                  placeholder="Year" className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
                <input value={r.url || ''} onChange={e => update({ ...r, url: e.target.value })}
                  placeholder="URL (optional)" className="md:col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
              </div>
              <div className="text-xs text-white/25 italic pl-2">
                APA: {r.author} ({r.year}). <em>{r.title}</em>. {r.source}.{r.url ? ` ${r.url}` : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}