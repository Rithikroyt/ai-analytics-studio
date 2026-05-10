/**
 * VBBottomPanel — Professional: Explain / Business Meaning / View SQL / Data / ML Insights tabs
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles, Code2, Table2, Brain, Loader2, TrendingUp, ChevronRight, Copy, CheckCheck } from 'lucide-react';
import { fmtV } from './VBChartPreview';

const TABS = [
  { id: 'explain', label: 'AI Explain', icon: Sparkles },
  { id: 'meaning', label: 'Business', icon: Brain },
  { id: 'ml', label: 'ML Insights', icon: TrendingUp },
  { id: 'sql', label: 'SQL', icon: Code2 },
  { id: 'data', label: 'Data', icon: Table2 },
];

function buildSQL(shelves, aggFn, chartType, tableName) {
  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;
  const y2Field = shelves.y?.[1]?.name;
  const colorField = shelves.color?.[0]?.name;
  if (!yField || !tableName) return '-- Configure X and Y fields to generate SQL';
  const agg = (aggFn || 'SUM').toUpperCase();
  const selects = [`${agg}(${yField}) AS ${yField}_${agg.toLowerCase()}`];
  if (y2Field) selects.push(`${agg}(${y2Field}) AS ${y2Field}_${agg.toLowerCase()}`);
  const groupByCols = [xField, colorField].filter(Boolean);
  if (groupByCols.length) {
    return `SELECT\n  ${groupByCols.join(', ')},\n  ${selects.join(',\n  ')}\nFROM ${tableName}\n${colorField ? '' : ''}GROUP BY ${groupByCols.join(', ')}\nORDER BY ${agg}(${yField}) DESC\nLIMIT 50;`;
  }
  return `SELECT\n  ${selects.join(',\n  ')}\nFROM ${tableName};`;
}

function computeMLStats(data) {
  if (!data?.length) return null;
  const vals = data.map(d => d.value).filter(v => v != null && !isNaN(v));
  if (!vals.length) return null;
  const n = vals.length;
  const mean = vals.reduce((a, b) => a + b, 0) / n;
  const sorted = [...vals].sort((a, b) => a - b);
  const median = sorted[Math.floor(n / 2)];
  const std = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / n);
  const cv = std / (mean || 1);
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  const outliers = data.filter(d => d.value < q1 - 1.5 * iqr || d.value > q3 + 1.5 * iqr);
  const xVals = vals.map((_, i) => i);
  const xm = xVals.reduce((a, b) => a + b, 0) / n;
  const ym = mean;
  const slope = xVals.reduce((s, x, i) => s + (x - xm) * (vals[i] - ym), 0) / (xVals.reduce((s, x) => s + (x - xm) ** 2, 0) || 1);
  const trend = slope > std * 0.1 ? '↑ Upward' : slope < -std * 0.1 ? '↓ Downward' : '→ Flat';
  return { mean, median, std, cv, q1, q3, iqr, outliers, trend, slope, n };
}

export default function VBBottomPanel({ chartType, shelves, marks, data, aggFn, tableName, rows }) {
  const [tab, setTab] = useState('explain');
  const [explanation, setExplanation] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const xField = shelves.x?.[0]?.name;
  const yField = shelves.y?.[0]?.name;

  const explain = async (type) => {
    if (!yField || loading) return;
    setLoading(true);
    setTab(type);
    setExplanation('');
    try {
      const topVals = data?.slice(0, 5).map(d => `${d.name}: ${fmtV(d.value)}`).join(', ') || '';
      const prompt = type === 'explain'
        ? `Explain this data visualization clearly for a business user.\n\nChart type: ${chartType.replace(/_/g, ' ')}\nX-axis: ${xField || 'none'}, Y-axis: ${yField} (${aggFn})\nTop values: ${topVals}\n\nIn 5-6 sentences: what it shows, the axes meaning, the main pattern, the #1 insight, and one recommended action. Be specific and professional.`
        : `Provide strategic business analysis for this chart.\n\nChart: ${chartType.replace(/_/g, ' ')} of ${yField} by ${xField}\nTop 3: ${data?.slice(0, 3).map(d => `${d.name}=${fmtV(d.value)}`).join(', ')}\n\nProvide: business significance, competitive implication, financial impact, risk factor, and one prescriptive recommendation. Executive-level language, 4-5 sentences.`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gemini_3_flash' });
      setExplanation(res);
    } catch (e) { setExplanation('Failed to generate explanation. Ensure fields are configured.'); }
    setLoading(false);
  };

  const sql = buildSQL(shelves, aggFn, chartType, tableName);
  const mlStats = computeMLStats(data);

  const copySQL = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border-t border-white/8 flex flex-col flex-shrink-0" style={{ height: 210 }}>
      {/* Tab bar */}
      <div className="flex gap-0.5 px-4 pt-2 border-b border-white/5 flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id}
            onClick={() => (t.id === 'explain' || t.id === 'meaning') ? explain(t.id) : setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap border-b-2 ${tab === t.id ? 'text-cyan-400 border-cyan-400' : 'text-white/30 border-transparent hover:text-white/60 hover:bg-white/3'}`}>
            <t.icon className="w-3 h-3" /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            <span>Analyzing with AI…</span>
          </div>
        )}

        {!loading && (tab === 'explain' || tab === 'meaning') && (
          explanation
            ? <p className="text-sm text-white/65 leading-relaxed">{explanation}</p>
            : (
              <div className="flex items-center gap-2 text-xs text-white/25">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Click "{tab === 'explain' ? 'AI Explain' : 'Business'}" tab to generate analysis{!yField ? ' (configure Y field first)' : ''}.</span>
              </div>
            )
        )}

        {tab === 'ml' && (
          mlStats ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Trend</span>
                  <span className="font-semibold text-cyan-400">{mlStats.trend}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Mean</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.mean)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Median</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.median)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Std Dev</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.std)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Coeff. Var.</span>
                  <span className={`font-mono ${mlStats.cv > 0.5 ? 'text-red-400' : mlStats.cv > 0.2 ? 'text-amber-400' : 'text-green-400'}`}>{(mlStats.cv * 100).toFixed(0)}%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Q1</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.q1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Q3</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.q3)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">IQR</span>
                  <span className="font-mono text-white/60">{fmtV(mlStats.iqr)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Outliers</span>
                  <span className={`font-mono ${mlStats.outliers.length > 0 ? 'text-amber-400' : 'text-green-400'}`}>{mlStats.outliers.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/35">Data pts</span>
                  <span className="font-mono text-white/60">{mlStats.n}</span>
                </div>
              </div>
              {mlStats.outliers.length > 0 && (
                <div className="col-span-2 pt-1 border-t border-white/5">
                  <div className="text-white/25 mb-1">Outliers:</div>
                  <div className="flex flex-wrap gap-1">
                    {mlStats.outliers.slice(0, 6).map((o, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-mono">
                        {o.name}: {fmtV(o.value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : <p className="text-xs text-white/25">Configure Y field to see ML statistics.</p>
        )}

        {tab === 'sql' && (
          <div className="relative">
            <button onClick={copySQL} className="absolute right-0 top-0 flex items-center gap-1 px-2 py-1 text-xs text-white/30 hover:text-cyan-400 transition-colors">
              {copied ? <><CheckCheck className="w-3 h-3 text-green-400" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
            <pre className="text-xs font-mono text-cyan-300/75 leading-relaxed whitespace-pre-wrap pr-16">{sql}</pre>
          </div>
        )}

        {tab === 'data' && (
          data?.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="px-2 py-1.5 text-left text-white/30 font-semibold">#</th>
                  <th className="px-2 py-1.5 text-left text-white/30 font-semibold">Name</th>
                  <th className="px-2 py-1.5 text-right text-white/30 font-semibold">Value</th>
                  <th className="px-2 py-1.5 text-white/30 font-semibold w-20">%</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const total = data.reduce((s, d) => s + (d.value || 0), 0);
                  return data.slice(0, 25).map((d, i) => (
                    <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                      <td className="px-2 py-1 text-white/20 font-mono">{i + 1}</td>
                      <td className="px-2 py-1 text-white/55">{d.name}</td>
                      <td className="px-2 py-1 text-right font-mono text-white/70">{fmtV(d.value)}</td>
                      <td className="px-2 py-1">
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-cyan-400/50" style={{ width: `${total > 0 ? (d.value / total) * 100 : 0}%` }} />
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          ) : <p className="text-xs text-white/25">No chart data to display.</p>
        )}
      </div>
    </div>
  );
}