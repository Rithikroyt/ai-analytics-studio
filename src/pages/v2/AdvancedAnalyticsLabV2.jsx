import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, Loader2, BarChart2, TrendingUp, Brain, Target, Zap, Activity, Copy, CheckCircle2 } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';
import { profileDataset, calculateQualityScore, calculateKPIs, simpleLinearForecast } from '@/lib/analyticsEngine';

const ANALYSIS_TABS = [
  { id: 'descriptive', label: '📊 Descriptive', desc: 'What happened?' },
  { id: 'diagnostic', label: '🔍 Diagnostic', desc: 'Why did it happen?' },
  { id: 'predictive', label: '📈 Predictive', desc: 'What may happen?' },
  { id: 'prescriptive', label: '💊 Prescriptive', desc: 'What should we do?' },
  { id: 'eda', label: '🧪 EDA', desc: 'Data exploration' },
  { id: 'causal', label: '🔬 Causal', desc: 'Does X cause Y?' },
];

const COLORS = ['#00f5ff', '#a855f7', '#ec4899', '#f59e0b', '#22c55e', '#3b82f6', '#f97316', '#14b8a6'];

function StatCard({ label, value, sub, color = 'text-cyan-400' }) {
  return (
    <div className="glass-card rounded-xl border border-white/8 p-3">
      <div className="text-xs text-white/40 mb-0.5">{label}</div>
      <div className={`text-xl font-black font-mono ${color}`}>{value}</div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function AdvancedAnalyticsLabV2() {
  const [activeTab, setActiveTab] = useState('descriptive');
  const [activeDataset, setActiveDataset] = useState(null);
  const [rows, setRows] = useState([]);
  const [columnProfiles, setColumnProfiles] = useState([]);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);

  const loadDataset = (ds) => {
    const data = generateDemoData(ds.id);
    const cols = Object.keys(data[0] || {});
    const profiles = profileDataset(data, cols);
    setActiveDataset(ds);
    setRows(data);
    setColumnProfiles(profiles);
    setAiAnalysis(null);
  };

  const kpis = useMemo(() => rows.length ? calculateKPIs(rows, columnProfiles) : null, [rows, columnProfiles]);
  const qs = useMemo(() => rows.length ? calculateQualityScore(rows, columnProfiles) : null, [rows, columnProfiles]);

  const metricCols = columnProfiles.filter(cp => cp.isKpiCandidate);
  const dimCols = columnProfiles.filter(cp => cp.semanticRole === 'dimension');
  const dateCols = columnProfiles.filter(cp => cp.isDateCandidate);

  // Descriptive stats
  const descriptiveStats = useMemo(() => {
    if (!metricCols.length || !rows.length) return [];
    return metricCols.slice(0, 5).map(col => {
      const vals = rows.map(r => Number(r[col.columnName])).filter(v => !isNaN(v));
      if (!vals.length) return null;
      const sorted = [...vals].sort((a, b) => a - b);
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / vals.length;
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      return {
        name: col.columnName,
        count: vals.length,
        sum: Math.round(vals.reduce((a, b) => a + b, 0)),
        mean: Math.round(mean * 100) / 100,
        median: col.median,
        stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        q1: Math.round(q1 * 100) / 100,
        q3: Math.round(q3 * 100) / 100,
        cv: mean > 0 ? Math.round((Math.sqrt(variance) / mean) * 100) : 0,
      };
    }).filter(Boolean);
  }, [metricCols, rows]);

  // Dimension breakdown
  const dimBreakdown = useMemo(() => {
    if (!dimCols.length || !metricCols.length || !rows.length) return [];
    const dim = dimCols[0].columnName;
    const metric = metricCols[0].columnName;
    const grouped = {};
    rows.forEach(r => {
      const key = String(r[dim] || 'Unknown');
      if (!grouped[key]) grouped[key] = { name: key, total: 0, count: 0 };
      const v = Number(r[metric]);
      if (!isNaN(v)) { grouped[key].total += v; grouped[key].count++; }
    });
    return Object.values(grouped)
      .map(g => ({ name: g.name, value: Math.round(g.total), avg: Math.round(g.total / Math.max(g.count, 1)), count: g.count }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [dimCols, metricCols, rows]);

  // Correlations
  const correlations = useMemo(() => {
    if (metricCols.length < 2 || !rows.length) return [];
    const pairs = [];
    for (let i = 0; i < Math.min(metricCols.length, 4); i++) {
      for (let j = i + 1; j < Math.min(metricCols.length, 4); j++) {
        const a = metricCols[i].columnName;
        const b = metricCols[j].columnName;
        const pairs_vals = rows.map(r => [Number(r[a]), Number(r[b])]).filter(([x, y]) => !isNaN(x) && !isNaN(y));
        if (pairs_vals.length < 5) continue;
        const n = pairs_vals.length;
        const sumX = pairs_vals.reduce((s, [x]) => s + x, 0);
        const sumY = pairs_vals.reduce((s, [, y]) => s + y, 0);
        const sumXY = pairs_vals.reduce((s, [x, y]) => s + x * y, 0);
        const sumX2 = pairs_vals.reduce((s, [x]) => s + x * x, 0);
        const sumY2 = pairs_vals.reduce((s, [, y]) => s + y * y, 0);
        const num = n * sumXY - sumX * sumY;
        const den = Math.sqrt((n * sumX2 - sumX ** 2) * (n * sumY2 - sumY ** 2));
        const r = den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
        pairs.push({ a, b, r, strength: Math.abs(r) >= 0.7 ? 'Strong' : Math.abs(r) >= 0.4 ? 'Moderate' : 'Weak', direction: r > 0 ? 'Positive' : 'Negative' });
      }
    }
    return pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  }, [metricCols, rows]);

  // Forecast data
  const forecastData = useMemo(() => {
    if (!metricCols.length || !rows.length) return [];
    const metric = metricCols[0].columnName;
    const vals = rows.slice(-24).map(r => Number(r[metric])).filter(v => !isNaN(v));
    if (vals.length < 4) return [];
    const historical = vals.map((v, i) => ({ period: `P${i + 1}`, actual: v }));
    const forecast = simpleLinearForecast(vals, 3);
    const forecastPts = forecast.map((v, i) => ({ period: `F${i + 1}`, forecast: v }));
    return [...historical.slice(-10), ...forecastPts];
  }, [metricCols, rows]);

  const runAIAnalysis = async (analysisType) => {
    if (!rows.length) return;
    setLoadingAI(true);
    const kpiStr = Object.entries(kpis || {}).slice(0, 6).map(([k, v]) => `${k}: sum=${v.sum}, avg=${v.avg}`).join('\n');
    const analysisGuides = {
      descriptive: 'Describe what happened: key summary statistics, distributions, top/bottom performers, and factual observations.',
      diagnostic: 'Explain why it happened: correlations, root causes, segment comparisons, variance decomposition.',
      predictive: 'Predict what may happen: forecast trends, identify risk factors, predict likely outcomes.',
      prescriptive: 'Recommend what to do: specific actions, trade-offs, decision matrix, prioritized recommendations.',
      eda: 'Run exploratory data analysis: distributions, outliers, missing patterns, anomalies, key relationships.',
      causal: 'Analyze causality: does changing X cause Y to change? Use controlled comparisons and difference-in-differences logic.',
    };
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Data Analyst performing ${analysisType} analytics. ${analysisGuides[analysisType]}

Dataset: ${activeDataset?.name} | Rows: ${rows.length} | Quality: ${qs?.score}/100
Columns: ${columnProfiles.slice(0, 15).map(c => `${c.columnName}(${c.detectedType}/${c.semanticRole})`).join(', ')}
KPIs:
${kpiStr}
Correlations: ${correlations.slice(0, 3).map(c => `${c.a}↔${c.b}=${c.r}(${c.strength})`).join(', ')}

Provide a structured analysis with:
- executiveSummary: 3 paragraphs with specific numbers
- keyFindings: 5-8 specific findings
- formula: Key formula used in this analysis
- recommendations: 4 specific actions with expected outcomes
- limitations: 2-3 honest caveats`,
        response_json_schema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            keyFindings: { type: 'array', items: { type: 'string' } },
            formula: { type: 'string' },
            recommendations: { type: 'array', items: { type: 'string' } },
            limitations: { type: 'array', items: { type: 'string' } },
          }
        }
      });
      setAiAnalysis({ ...res, type: analysisType });
    } catch (e) {
      setAiAnalysis({ executiveSummary: `Error: ${e.message}`, type: analysisType });
    }
    setLoadingAI(false);
  };

  const noData = <div className="text-center py-16 text-white/25"><FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-20" /><div>Load a dataset to start analysis</div></div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center">
              <FlaskConical className="w-4.5 h-4.5 text-teal-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Advanced Analytics Lab</h1>
              <p className="text-xs text-white/40">Descriptive · Diagnostic · Predictive · Prescriptive · EDA · Causal</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {DEMO_DATASETS.slice(0, 5).map(ds => (
              <button key={ds.id} onClick={() => loadDataset(ds)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${activeDataset?.id === ds.id ? 'border-teal-400/30 bg-teal-400/10 text-teal-400' : 'border-white/10 text-white/40 hover:text-white/70'}`}>
                {ds.icon} {ds.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
          {ANALYSIS_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-teal-400/15 text-teal-400 border border-teal-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── DESCRIPTIVE ── */}
        {activeTab === 'descriptive' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-teal-400" /> What happened? — Summary statistics and factual observations</div>
            {!rows.length ? noData : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Total Rows" value={rows.length.toLocaleString()} color="text-cyan-400" />
                  <StatCard label="Columns" value={columnProfiles.length} color="text-purple-400" />
                  <StatCard label="Quality Score" value={`${qs?.score}/100`} sub={qs?.label} color={qs?.score >= 80 ? 'text-green-400' : qs?.score >= 60 ? 'text-yellow-400' : 'text-red-400'} />
                  <StatCard label="Metric Columns" value={metricCols.length} color="text-teal-400" />
                </div>

                {descriptiveStats.length > 0 && (
                  <div className="overflow-x-auto">
                    <div className="text-sm font-bold mb-2">Numeric Statistics by Column</div>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-white/8">
                          {['Column', 'Count', 'Sum', 'Mean', 'Median', 'Std Dev', 'Min', 'Max', 'CV%'].map(h => (
                            <th key={h} className="text-left py-2.5 px-2 text-white/40 font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {descriptiveStats.map((s, i) => (
                          <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                            <td className="py-2 px-2 font-mono font-semibold text-cyan-400 max-w-[120px] truncate">{s.name}</td>
                            <td className="py-2 px-2 text-white/60">{s.count.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/60">{s.sum.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/70 font-semibold">{s.mean.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/60">{s.median?.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/60">{s.stdDev.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/50">{s.min?.toLocaleString()}</td>
                            <td className="py-2 px-2 text-white/50">{s.max?.toLocaleString()}</td>
                            <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded text-xs ${s.cv > 80 ? 'bg-red-400/10 text-red-400' : s.cv > 40 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-green-400/10 text-green-400'}`}>{s.cv}%</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {dimBreakdown.length > 0 && (
                  <div className="glass-card rounded-2xl border border-white/8 p-5">
                    <div className="text-sm font-bold mb-4">{dimCols[0]?.columnName} Breakdown by {metricCols[0]?.columnName}</div>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dimBreakdown}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="value" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <button onClick={() => runAIAnalysis('descriptive')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/25 text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI Descriptive Analysis
                </button>
              </>
            )}
          </div>
        )}

        {/* ── DIAGNOSTIC ── */}
        {activeTab === 'diagnostic' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><Activity className="w-4 h-4 text-blue-400" /> Why did it happen? — Correlations, root causes, segment comparisons</div>
            {!rows.length ? noData : (
              <>
                {correlations.length > 0 && (
                  <div className="glass-card rounded-2xl border border-white/8 p-5">
                    <div className="text-sm font-bold mb-4">Pearson Correlation Matrix</div>
                    <div className="space-y-3">
                      {correlations.map((c, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="text-xs text-white/60 w-48 flex-shrink-0">{c.a} ↔ {c.b}</div>
                          <div className="flex-1 bg-white/5 rounded-full h-3 relative overflow-hidden">
                            <div className={`h-3 rounded-full ${c.r > 0 ? 'bg-cyan-400' : 'bg-red-400'} absolute right-1/2`}
                              style={{ width: `${Math.abs(c.r) * 50}%`, [c.r > 0 ? 'left' : 'right']: '50%', [c.r > 0 ? 'right' : 'left']: 'auto' }} />
                          </div>
                          <div className="text-xs font-mono font-bold w-16 text-right">{c.r}</div>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${Math.abs(c.r) >= 0.7 ? 'bg-green-400/10 text-green-400' : Math.abs(c.r) >= 0.4 ? 'bg-yellow-400/10 text-yellow-400' : 'bg-white/5 text-white/40'}`}>
                            {c.direction} {c.strength}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-white/25 font-mono">Pearson r: |r| ≥ 0.7 = Strong | 0.4–0.7 = Moderate | &lt; 0.4 = Weak</div>
                  </div>
                )}

                <button onClick={() => runAIAnalysis('diagnostic')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-400/10 border border-blue-400/25 text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI Root Cause Analysis
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PREDICTIVE ── */}
        {activeTab === 'predictive' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> What may happen? — Forecasting and trend prediction</div>
            {!rows.length ? noData : (
              <>
                {forecastData.length > 0 && (
                  <div className="glass-card rounded-2xl border border-white/8 p-5">
                    <div className="text-sm font-bold mb-1">Linear Trend Forecast — {metricCols[0]?.columnName}</div>
                    <div className="text-xs text-white/40 mb-4">Blue = Historical | Orange = Forecast (3 periods, simple linear regression)</div>
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={forecastData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
                        <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
                        <Line type="monotone" dataKey="actual" stroke="#00f5ff" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="forecast" stroke="#f97316" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4, fill: '#f97316' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-2">FORECAST FORMULA</div>
                  <div className="font-mono text-xs text-purple-400/80 leading-relaxed">
                    ŷ = β₀ + β₁x (Linear Regression Forecast)<br />
                    slope = Σ[(x - x̄)(y - ȳ)] / Σ[(x - x̄)²]<br />
                    intercept = ȳ - slope × x̄<br />
                    {'For Holt-Winters: F(t+m) = (L_t + m·T_t) × S_{t-s+m}'}
                  </div>
                </div>

                <button onClick={() => runAIAnalysis('predictive')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI Predictive Analysis
                </button>
              </>
            )}
          </div>
        )}

        {/* ── PRESCRIPTIVE ── */}
        {activeTab === 'prescriptive' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><Target className="w-4 h-4 text-amber-400" /> What should we do? — Decision recommendations and scenario analysis</div>
            {!rows.length ? noData : (
              <>
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-3">DECISION MATRIX FORMULA</div>
                  <div className="font-mono text-xs text-amber-400/80 leading-relaxed">
                    Decision Score = 0.30 × Impact + 0.25 × Feasibility + 0.20 × Cost Efficiency + 0.15 × Speed + 0.10 × Risk Reduction<br />
                    Prioritize options with Decision Score &gt; 0.7
                  </div>
                </div>

                <button onClick={() => runAIAnalysis('prescriptive')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-bold hover:bg-amber-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI Prescriptive Recommendations
                </button>
              </>
            )}
          </div>
        )}

        {/* ── EDA ── */}
        {activeTab === 'eda' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><FlaskConical className="w-4 h-4 text-teal-400" /> Exploratory Data Analysis — Distributions, outliers, anomalies</div>
            {!rows.length ? noData : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {columnProfiles.slice(0, 6).map((cp, i) => (
                    <div key={i} className={`glass-card rounded-xl border p-4 ${cp.warnings.length > 0 ? 'border-orange-400/20' : 'border-green-400/15'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold truncate">{cp.columnName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${cp.detectedType === 'number' ? 'bg-cyan-400/10 text-cyan-400' : cp.detectedType === 'date' ? 'bg-pink-400/10 text-pink-400' : cp.detectedType === 'category' ? 'bg-purple-400/10 text-purple-400' : 'bg-white/5 text-white/40'}`}>{cp.detectedType}</span>
                      </div>
                      <div className="text-xs space-y-1 text-white/50">
                        <div>Missing: <span className={cp.missingRate > 0.1 ? 'text-red-400' : 'text-green-400'}>{(cp.missingRate * 100).toFixed(1)}%</span></div>
                        <div>Unique: {cp.uniqueCount}</div>
                        {cp.min && <div>Range: {cp.min} → {cp.max}</div>}
                        {cp.outlierCount > 0 && <div className="text-orange-400">⚠ {cp.outlierCount} outliers</div>}
                      </div>
                      {cp.sampleValues?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {cp.sampleValues.slice(0, 3).map(v => <span key={v} className="text-xs px-1 py-0.5 bg-white/5 rounded text-white/30 font-mono">{String(v).slice(0, 12)}</span>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <button onClick={() => runAIAnalysis('eda')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/25 text-teal-400 rounded-xl text-xs font-bold hover:bg-teal-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI EDA Report
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CAUSAL ── */}
        {activeTab === 'causal' && (
          <div className="space-y-5">
            <div className="text-xs text-white/40 flex items-center gap-2"><Zap className="w-4 h-4 text-green-400" /> Causal Analytics — Does X cause Y? DiD and controlled comparisons</div>
            {!rows.length ? noData : (
              <>
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-3">CAUSAL INFERENCE METHODS</div>
                  <div className="space-y-2 text-xs">
                    {[
                      { method: 'Difference-in-Differences (DiD)', desc: 'Compare treatment vs control group before/after an intervention', formula: 'DiD = (Post_Treat - Pre_Treat) - (Post_Control - Pre_Control)' },
                      { method: 'Propensity Score Matching', desc: 'Match treated and control units with similar observable characteristics', formula: 'P(T=1|X) = logistic regression on confounders' },
                      { method: 'A/B Test (RCT)', desc: 'Randomized controlled experiment — gold standard for causality', formula: 'ATE = E[Y(1)] - E[Y(0)]' },
                      { method: 'Instrumental Variables', desc: 'Use instrument Z that affects X but not Y directly', formula: 'β_IV = Cov(Z,Y) / Cov(Z,X)' },
                    ].map(m => (
                      <div key={m.method} className="p-3 bg-white/3 rounded-xl border border-white/6">
                        <div className="font-semibold text-green-400 mb-0.5">{m.method}</div>
                        <div className="text-white/50">{m.desc}</div>
                        <code className="text-xs font-mono text-white/30 mt-1 block">{m.formula}</code>
                      </div>
                    ))}
                  </div>
                </div>

                <button onClick={() => runAIAnalysis('causal')} disabled={loadingAI}
                  className="flex items-center gap-2 px-4 py-2 bg-green-400/10 border border-green-400/25 text-green-400 rounded-xl text-xs font-bold hover:bg-green-400/15 disabled:opacity-50">
                  {loadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                  Generate AI Causal Analysis
                </button>
              </>
            )}
          </div>
        )}

        {/* ── AI ANALYSIS RESULT (shared) ── */}
        {aiAnalysis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 space-y-4">
            <div className="glass-card rounded-2xl border border-teal-400/20 p-5">
              <div className="text-xs font-bold text-teal-400 mb-3 uppercase">AI {aiAnalysis.type} Analysis Results</div>
              {aiAnalysis.executiveSummary && <p className="text-sm text-white/70 leading-relaxed whitespace-pre-line mb-4">{aiAnalysis.executiveSummary}</p>}
              {aiAnalysis.formula && <div className="bg-white/3 rounded-xl p-3 mb-4"><div className="text-xs text-white/40 mb-1">KEY FORMULA</div><code className="font-mono text-xs text-teal-400/80">{aiAnalysis.formula}</code></div>}
              {aiAnalysis.keyFindings?.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs font-bold text-white/50 mb-2">KEY FINDINGS</div>
                  <ul className="space-y-1.5">
                    {aiAnalysis.keyFindings.map((f, i) => <li key={i} className="flex items-start gap-2 text-sm text-white/65"><span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />{f}</li>)}
                  </ul>
                </div>
              )}
              {aiAnalysis.recommendations?.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-white/50 mb-2">RECOMMENDATIONS</div>
                  <ol className="space-y-2">
                    {aiAnalysis.recommendations.map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <span className="w-5 h-5 rounded-full bg-teal-400/10 border border-teal-400/25 text-teal-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                        <span className="text-white/70">{r}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}