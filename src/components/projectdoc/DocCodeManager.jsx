import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, Eye, EyeOff, Loader2, Code2 } from 'lucide-react';

const DEFAULT_SNIPPETS = [
  {
    title: 'Data Quality Score Calculation',
    language: 'javascript',
    moduleName: 'Data Quality Studio',
    code: `function calculateQualityScore(profile) {
  const completeness = 1 - profile.missingCells / Math.max(profile.totalCells, 1);
  const uniqueness = 1 - profile.duplicateRows / Math.max(profile.totalRows, 1);
  const validity = profile.validCells / Math.max(profile.totalCells, 1);
  const consistency = profile.standardizedCells / Math.max(profile.totalCells, 1);
  const timeliness = profile.recentRows / Math.max(profile.totalRows, 1);

  return Number((
    0.30 * completeness +
    0.25 * validity +
    0.20 * uniqueness +
    0.15 * consistency +
    0.10 * timeliness
  ).toFixed(3));
}`,
    explanation: 'Computes a composite data quality score across five weighted dimensions: completeness, validity, uniqueness, consistency, and timeliness.',
  },
  {
    title: 'Top 10 Customers by Revenue',
    language: 'sql',
    moduleName: 'SQL Studio',
    code: `SELECT customer_id,
       customer_name,
       SUM(revenue) AS total_revenue,
       COUNT(*) AS order_count
FROM sales_data
GROUP BY customer_id, customer_name
ORDER BY total_revenue DESC
LIMIT 10;`,
    explanation: 'Returns the top 10 customers ranked by total revenue generated.',
  },
  {
    title: 'RFM Score Computation',
    language: 'javascript',
    moduleName: 'RFM Segments',
    code: `function computeRFMScore(customer, allCustomers, today) {
  const recency = Math.floor(
    (new Date(today) - new Date(customer.lastPurchaseDate)) / (1000 * 60 * 60 * 24)
  );
  const frequency = customer.purchaseCount;
  const monetary = customer.totalRevenue;

  // Quintile scoring (1=worst, 5=best)
  const rScore = getQuintileScore(recency, allCustomers.map(c => c.recency), true);
  const fScore = getQuintileScore(frequency, allCustomers.map(c => c.frequency), false);
  const mScore = getQuintileScore(monetary, allCustomers.map(c => c.monetary), false);

  return { recency, frequency, monetary, rScore, fScore, mScore,
           rfmScore: (rScore + fScore + mScore) / 3 };
}`,
    explanation: 'Computes RFM (Recency, Frequency, Monetary) scores and quintile rankings for customer segmentation.',
  },
  {
    title: 'IQR Anomaly Detection',
    language: 'javascript',
    moduleName: 'AI Analyst',
    code: `function detectAnomaliesIQR(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;

  return values.map((v, i) => ({
    index: i, value: v,
    isAnomaly: v < lowerFence || v > upperFence,
    direction: v < lowerFence ? 'low' : v > upperFence ? 'high' : 'normal'
  }));
}`,
    explanation: 'Detects statistical outliers using the IQR (Interquartile Range) method. Values outside Q1−1.5×IQR or Q3+1.5×IQR are flagged as anomalies.',
  },
];

export default function DocCodeManager({ config, user }) {
  const [snippets, setSnippets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => { if (config?.id) load(); }, [config?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.ProjectCodeSnippet.filter({ configId: config.id }, 'order');
      setSnippets(items);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addDefaults = async () => {
    if (!config?.id) return;
    setAdding(true);
    for (let i = 0; i < DEFAULT_SNIPPETS.length; i++) {
      const s = DEFAULT_SNIPPETS[i];
      const exists = snippets.find(x => x.title === s.title);
      if (!exists) {
        await base44.entities.ProjectCodeSnippet.create({ configId: config.id, ...s, order: snippets.length + i, includeInPdf: true });
      }
    }
    await load();
    setAdding(false);
  };

  const addNew = async () => {
    const created = await base44.entities.ProjectCodeSnippet.create({
      configId: config.id,
      title: 'New Code Snippet',
      language: 'javascript',
      moduleName: '',
      code: '// Your code here',
      explanation: '',
      order: snippets.length,
      includeInPdf: true,
    });
    setSnippets(prev => [...prev, created]);
  };

  const update = async (s) => {
    const updated = await base44.entities.ProjectCodeSnippet.update(s.id, s);
    setSnippets(prev => prev.map(x => x.id === s.id ? updated : x));
  };

  const remove = async (id) => {
    await base44.entities.ProjectCodeSnippet.delete(id);
    setSnippets(prev => prev.filter(x => x.id !== id));
  };

  const LANGS = ['javascript', 'python', 'sql', 'json', 'mermaid', 'text'];
  const LANG_COLORS = { javascript: 'text-yellow-400', python: 'text-blue-400', sql: 'text-green-400', json: 'text-orange-400', mermaid: 'text-pink-400', text: 'text-white/40' };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Code Snippet Manager</h2>
          <p className="text-sm text-white/40 mt-0.5">Add and manage code examples to be included in the PDF.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addDefaults} disabled={adding || !config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 transition-all disabled:opacity-40">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
            Add Default Snippets
          </button>
          <button onClick={addNew} disabled={!config?.id}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add Snippet
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : snippets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/5 rounded-2xl">
          <Code2 className="w-10 h-10 text-white/15 mb-3" />
          <p className="text-sm text-white/30 mb-4">No code snippets yet.</p>
          <button onClick={addDefaults} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm hover:bg-cyan-400/20 transition-all">
            Add Default Code Snippets
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {snippets.map((s, i) => (
            <div key={s.id} className={`glass-card rounded-2xl border p-5 space-y-4 ${s.includeInPdf ? 'border-white/8' : 'border-white/3 opacity-60'}`}>
              <div className="flex items-center gap-3">
                <input value={s.title} onChange={e => update({ ...s, title: e.target.value })}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-bold text-white/80 focus:outline-none focus:border-cyan-400/30" />
                <select value={s.language} onChange={e => update({ ...s, language: e.target.value })}
                  className={`bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs focus:outline-none ${LANG_COLORS[s.language] || 'text-white/60'}`}>
                  {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input value={s.moduleName || ''} onChange={e => update({ ...s, moduleName: e.target.value })}
                  placeholder="Module..." className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-xs text-white/60 focus:outline-none" />
                <button onClick={() => update({ ...s, includeInPdf: !s.includeInPdf })}
                  className={`p-2 rounded-lg transition-all ${s.includeInPdf ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/30'}`}>
                  {s.includeInPdf ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(s.id)} className="p-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <textarea value={s.code} onChange={e => update({ ...s, code: e.target.value })}
                rows={8}
                className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-green-400 font-mono focus:outline-none focus:border-cyan-400/30 resize-none" />
              <input value={s.explanation || ''} onChange={e => update({ ...s, explanation: e.target.value })}
                placeholder="Explanation of this code snippet..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/60 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/30" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}