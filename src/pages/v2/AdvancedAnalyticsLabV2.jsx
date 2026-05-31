import { useState } from 'react';
import { Microscope, TrendingUp, Zap, Brain, BarChart2, Activity, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateDemoData } from '@/lib/demoDatasets';
import { profileDataset, calculateQualityScore, calculateKPIs, simpleLinearForecast } from '@/lib/analyticsEngine';
import { base44 } from '@/api/base44Client';

const LAB_TABS = [
  { id: 'descriptive', label: 'Descriptive', desc: 'What happened?' },
  { id: 'diagnostic', label: 'Diagnostic', desc: 'Why did it happen?' },
  { id: 'predictive', label: 'Predictive', desc: 'What may happen?' },
  { id: 'prescriptive', label: 'Prescriptive', desc: 'What should we do?' },
  { id: 'eda', label: 'EDA', desc: 'Explore data' },
  { id: 'causal', label: 'Causal', desc: 'Root causes' },
];

export default function AdvancedAnalyticsLabV2() {
  const [activeTab, setActiveTab] = useState('descriptive');
  const [selectedDataset, setSelectedDataset] = useState('sales_revenue');
  const [data, setData] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [kpis, setKpis] = useState({});
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadData = () => {
    const rows = generateDemoData(selectedDataset);
    const cols = Object.keys(rows[0] || {});
    const profs = profileDataset(rows, cols);
    setData(rows);
    setProfiles(profs);
    setKpis(calculateKPIs(rows, profs));
    setLoaded(true);
  };

  const runAI = async (analyticsType) => {
    setLoading(true);
    setAiResponse('');
    try {
      const metricSummary = Object.entries(kpis).map(([k, v]) => `${k}: sum=${v.sum}, avg=${v.avg}, min=${v.min}, max=${v.max}`).join('\n');
      const colSummary = profiles.map(p => `${p.columnName}: ${p.detectedType}, role=${p.semanticRole}, missing=${(p.missingRate * 100).toFixed(1)}%`).join('\n');

      const prompts = {
        descriptive: `Act as a Data Analyst. Perform descriptive analytics on this ${selectedDataset} dataset (${data.length} rows).
Column profiles:\n${colSummary}\nKPI values:\n${metricSummary}
Provide: 1 summary paragraph, 5 key metric bullets with exact numbers, 3 chart recommendations, 2 key takeaways.`,
        diagnostic: `Act as a Diagnostic Analyst. Explain WHY patterns occur in this ${selectedDataset} dataset (${data.length} rows).
Columns: ${colSummary}\nKPIs: ${metricSummary}
Identify root causes of trends, correlations, and anomalies. Use breakdown analysis and correlation logic.`,
        predictive: `Act as a Predictive Analytics expert. For this ${selectedDataset} dataset (${data.length} rows):
Columns: ${colSummary}\nKPIs: ${metricSummary}
Recommend ML models, predict trends using historical patterns, and provide 3-period forecasts.`,
        prescriptive: `Act as a Prescriptive Analytics consultant. Recommend what actions to take based on this ${selectedDataset} dataset (${data.length} rows).
KPIs: ${metricSummary}
Provide: decision matrix, 5 specific action recommendations, expected impact of each action, and optimization opportunities.`,
        eda: `Act as a Senior Data Analyst performing EDA on ${selectedDataset} (${data.length} rows, ${profiles.length} columns).
Profiles: ${colSummary}
Provide: data quality assessment, distribution insights, correlation observations, outlier notes, and recommended next analysis steps.`,
        causal: `Act as a Causal Inference expert. Analyze the causal structure of this ${selectedDataset} dataset.
Columns: ${colSummary}\nKPIs: ${metricSummary}
Identify: key cause-effect relationships, confounding variables, intervention points, and A/B test recommendations.`,
      };

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: prompts[analyticsType] || prompts.descriptive,
        model: 'claude_sonnet_4_6'
      });
      setAiResponse(res);
    } catch (e) {
      setAiResponse(`Error: ${e.message}`);
    }
    setLoading(false);
  };

  // Descriptive stats
  const metricProfiles = profiles.filter(p => p.isKpiCandidate);
  const forecast = metricProfiles.length > 0 && data.length > 10
    ? simpleLinearForecast(data.slice(-20).map(r => Number(r[metricProfiles[0].columnName]) || 0), 3)
    : [];

  // Correlation hint
  const correlationHints = [];
  for (let i = 0; i < Math.min(metricProfiles.length, 5); i++) {
    for (let j = i + 1; j < Math.min(metricProfiles.length, 5); j++) {
      const a = metricProfiles[i], b = metricProfiles[j];
      const vals = data.map(r => ({ x: Number(r[a.columnName]) || 0, y: Number(r[b.columnName]) || 0 })).filter(v => v.x && v.y);
      if (vals.length < 10) continue;
      const n = vals.length;
      const xm = vals.reduce((s, v) => s + v.x, 0) / n;
      const ym = vals.reduce((s, v) => s + v.y, 0) / n;
      const num = vals.reduce((s, v) => s + (v.x - xm) * (v.y - ym), 0);
      const den = Math.sqrt(vals.reduce((s, v) => s + (v.x - xm) ** 2, 0) * vals.reduce((s, v) => s + (v.y - ym) ** 2, 0));
      const r = den > 0 ? num / den : 0;
      if (Math.abs(r) > 0.3) correlationHints.push({ a: a.columnName, b: b.columnName, r: Math.round(r * 100) / 100, vals: vals.slice(0, 50) });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
            <Microscope className="w-4.5 h-4.5 text-teal-400" />
          </div>
          <div>
            <h1 className="text-base font-bold">Advanced Analytics Lab</h1>
            <p className="text-xs text-white/40">Descriptive · Diagnostic · Predictive · Prescriptive · EDA · Causal</p>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 flex-wrap">
          {LAB_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-start px-3 py-1.5 rounded-lg transition-all ${activeTab === tab.id ? 'bg-teal-400/15 text-teal-400 border border-teal-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              <span className="text-xs font-semibold">{tab.label}</span>
              <span className="text-xs opacity-50">{tab.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-5">
        {/* Dataset selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedDataset} onChange={e => setSelectedDataset(e.target.value)}
            className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-white">
            <option value="sales_revenue">Sales & Revenue</option>
            <option value="marketing_campaigns">Marketing Campaigns</option>
            <option value="supply_chain">Supply Chain</option>
            <option value="hr_workforce">HR Workforce</option>
            <option value="ecommerce">E-commerce</option>
            <option value="finance_costs">Finance & Costs</option>
          </select>
          <button onClick={loadData} className="px-4 py-2 bg-teal-400/10 border border-teal-400/25 text-teal-400 rounded-xl text-xs font-semibold hover:bg-teal-400/15">
            Load Dataset
          </button>
          {loaded && <button onClick={() => runAI(activeTab)} disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-400 text-navy-900 rounded-xl text-xs font-bold hover:bg-teal-300 disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
            Run AI {LAB_TABS.find(t => t.id === activeTab)?.label} Analysis
          </button>}
          {loaded && <span className="text-xs text-white/40">{data.length.toLocaleString()} rows · {profiles.length} columns</span>}
        </div>

        {!loaded && (
          <div className="text-center py-20 text-white/20">
            <Microscope className="w-12 h-12 mx-auto mb-3 opacity-20" />
            Select a dataset and click Load Dataset to begin
          </div>
        )}

        {loaded && (
          <>
            {/* Stats overview */}
            {activeTab === 'descriptive' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
                    <div className="text-2xl font-black font-mono text-cyan-400">{data.length.toLocaleString()}</div>
                    <div className="text-xs text-white/40 mt-1">Total Records</div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
                    <div className="text-2xl font-black font-mono text-purple-400">{profiles.length}</div>
                    <div className="text-xs text-white/40 mt-1">Columns</div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
                    <div className="text-2xl font-black font-mono text-green-400">{metricProfiles.length}</div>
                    <div className="text-xs text-white/40 mt-1">Metric Fields</div>
                  </div>
                  <div className="glass-card rounded-xl border border-white/8 p-3 text-center">
                    <div className="text-2xl font-black font-mono text-amber-400">{profiles.filter(p => p.isDateCandidate).length}</div>
                    <div className="text-xs text-white/40 mt-1">Date Fields</div>
                  </div>
                </div>

                {/* Metric summaries */}
                {metricProfiles.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="text-xs font-bold text-white/50 mb-2">NUMERIC COLUMN STATISTICS</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Column', 'Sum', 'Mean', 'Median', 'Min', 'Max', 'Std Dev', 'Outliers'].map(h => (
                            <th key={h} className="text-left py-2 px-2 text-white/40">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {metricProfiles.map((p, i) => {
                          const k = kpis[p.columnName];
                          return (
                            <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                              <td className="py-2 px-2 font-mono font-semibold text-cyan-400">{p.columnName}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{k?.sum?.toLocaleString() || '–'}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{p.mean?.toLocaleString() || '–'}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{p.median?.toLocaleString() || '–'}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{p.min || '–'}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{p.max || '–'}</td>
                              <td className="py-2 px-2 font-mono text-white/60">{p.stdDev?.toLocaleString() || '–'}</td>
                              <td className="py-2 px-2">{p.outlierCount > 0 ? <span className="text-red-400">{p.outlierCount}</span> : <span className="text-green-400">0</span>}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'predictive' && forecast.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-bold">Linear Trend Forecast — Next 3 Periods</div>
                <div className="grid grid-cols-3 gap-3">
                  {forecast.map((f, i) => (
                    <div key={i} className="glass-card rounded-xl border border-cyan-400/25 p-4 text-center">
                      <div className="text-xs text-white/40 mb-1">Period +{i + 1}</div>
                      <div className="text-xl font-black font-mono text-cyan-400">{f.toLocaleString()}</div>
                      <div className="text-xs text-white/30">forecast</div>
                    </div>
                  ))}
                </div>
                <div className="font-mono text-xs text-white/25">Forecast = slope × x + intercept (Linear Regression)</div>
              </div>
            )}

            {activeTab === 'diagnostic' && correlationHints.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-bold">Correlation Analysis</div>
                {correlationHints.slice(0, 3).map((hint, i) => (
                  <div key={i} className="glass-card rounded-xl border border-white/8 p-4">
                    <div className="text-xs font-bold mb-2">
                      {hint.a} vs {hint.b}: <span className={Math.abs(hint.r) > 0.6 ? 'text-green-400' : 'text-amber-400'}>r = {hint.r}</span>
                      <span className="text-white/30 ml-2">({Math.abs(hint.r) > 0.7 ? 'Strong' : Math.abs(hint.r) > 0.4 ? 'Moderate' : 'Weak'} {hint.r > 0 ? 'positive' : 'negative'} correlation)</span>
                    </div>
                    <ResponsiveContainer width="100%" height={150}>
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="x" name={hint.a} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                        <YAxis dataKey="y" name={hint.b} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} />
                        <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} cursor={{ strokeDasharray: '3 3' }} />
                        <Scatter data={hint.vals} fill="#00f5ff" opacity={0.6} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                ))}
              </div>
            )}

            {/* AI Response */}
            {aiResponse && (
              <div className="glass-card rounded-2xl border border-teal-400/20 p-5">
                <div className="text-xs font-bold text-teal-400 mb-3 uppercase tracking-wider">AI {LAB_TABS.find(t => t.id === activeTab)?.label} Analysis</div>
                <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line">{aiResponse}</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-2" />
                <div className="text-sm text-teal-400">Running AI analysis…</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}