/**
 * VBBottomPanel — Explain Chart / Business Meaning / View SQL / Data tabs
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Code2, Table2, Brain, Loader2 } from 'lucide-react';
import { fmtV } from './VBChartPreview';

const TABS = [
  { id: 'explain', label: 'Explain Chart', icon: Sparkles },
  { id: 'meaning', label: 'Business Meaning', icon: Brain },
  { id: 'sql', label: 'View SQL', icon: Code2 },
  { id: 'data', label: 'Data', icon: Table2 },
];

function buildSQL(shelves, aggFn, chartType, tableName) {
  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;
  if (!yField || !tableName) return '-- Configure X and Y fields to generate SQL';
  const agg = (aggFn || 'SUM').toUpperCase();
  if (xField) {
    return `SELECT\n  ${xField},\n  ${agg}(${yField}) AS ${yField}_${agg.toLowerCase()}\nFROM ${tableName}\nGROUP BY ${xField}\nORDER BY 2 DESC\nLIMIT 20;`;
  }
  return `SELECT\n  ${agg}(${yField}) AS ${yField}_${agg.toLowerCase()}\nFROM ${tableName};`;
}

export default function VBBottomPanel({ chartType, shelves, marks, data, aggFn, tableName, rows }) {
  const [tab, setTab] = useState('explain');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);

  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;

  const explain = async (type) => {
    if (!yField) return;
    setLoading(true);
    setTab(type);
    try {
      const prompt = type === 'explain'
        ? `Explain this chart in simple terms for a business user:\nChart type: ${chartType}\nX axis: ${xField || 'none'}\nY axis: ${yField} (${aggFn})\nTop values: ${data?.slice(0, 5).map(d => `${d.name}: ${fmtV(d.value)}`).join(', ')}\n\nExplain: what it shows, what the axes mean, main pattern, key insight, anomaly/risk, and recommended action. Be concise (5-7 sentences).`
        : `Provide the business meaning and strategic implications for this chart:\nChart: ${chartType} of ${yField} by ${xField}\nTop 3: ${data?.slice(0, 3).map(d => `${d.name}=${fmtV(d.value)}`).join(', ')}\n\nExplain business significance, what it means for decision-making, risks, and recommended next steps. Keep it executive-level, 4-5 sentences.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setExplanation(res);
    } catch {}
    setLoading(false);
  };

  const sql = buildSQL(shelves, aggFn, chartType, tableName);

  return (
    <div className="border-t border-white/8 flex flex-col" style={{ height: 200 }}>
      <div className="flex gap-0.5 px-4 pt-2 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => t.id === 'explain' || t.id === 'meaning' ? explain(t.id) : setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all border-b-2 ${tab === t.id ? 'text-cyan-400 border-cyan-400' : 'text-white/30 border-transparent hover:text-white/60'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> Analyzing chart…
          </div>
        )}

        {!loading && (tab === 'explain' || tab === 'meaning') && (
          explanation
            ? <p className="text-sm text-white/65 leading-relaxed">{explanation}</p>
            : <p className="text-xs text-white/25">Click the tab to generate explanation.</p>
        )}

        {tab === 'sql' && (
          <pre className="text-xs font-mono text-cyan-300/80 leading-relaxed whitespace-pre-wrap">{sql}</pre>
        )}

        {tab === 'data' && (
          <div className="overflow-auto">
            {data?.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/8">
                    <th className="px-2 py-1.5 text-left text-white/35">Name</th>
                    <th className="px-2 py-1.5 text-right text-white/35">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 20).map((d, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="px-2 py-1 text-white/55">{d.name}</td>
                      <td className="px-2 py-1 text-right font-mono text-white/70">{fmtV(d.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <p className="text-xs text-white/25">No data to display.</p>}
          </div>
        )}
      </div>
    </div>
  );
}