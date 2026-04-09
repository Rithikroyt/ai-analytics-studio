/**
 * StorySection — Executive Storytelling Dashboard
 * Full hierarchy: What happened → Why → Where risk is → What to do next
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Database, ArrowRight, AlertTriangle, CheckCircle2, TrendingUp,
  TrendingDown, Sparkles, Info, Download, BarChart3, Activity,
  Target, Lightbulb, Shield, Eye
} from 'lucide-react';
import ExportPanel from '@/components/workspace/ExportPanel';
import AdaptiveChart from '@/components/charts/AdaptiveChart';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const THEME = { cyan: '#00e5ff', purple: '#9c27b0', orange: '#ff6b35', green: '#4caf50', pink: '#ff2d7a', yellow: '#ffcc02', teal: '#00bfa5' };
const PALETTE = ['#00e5ff', '#7b2fff', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#e91e63'];

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const TOOLTIP_STYLE = { backgroundColor: 'rgba(8,6,18,0.96)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 11, color: '#e2e8f0' };
const axisStyle = { fontSize: 9, fill: 'rgba(255,255,255,0.3)' };

// ── KPI Card strip ──────────────────────────────────────────────
function KPIStrip({ results, table }) {
  const kpis = [
    {
      label: results.primaryLabel || 'Total',
      value: fmtV(results.totalValue),
      sub: results.growthRate != null ? `${Number(results.growthRate) >= 0 ? '+' : ''}${results.growthRate}% overall trend` : 'No time data',
      color: '#00e5ff', up: Number(results.growthRate) >= 0,
    },
    { label: 'Records Analyzed', value: fmtV(table.rowCount), sub: `${table.columns?.length} columns`, color: '#00bfa5', up: null },
    { label: 'Data Quality', value: `${table.qualityScore}%`, sub: table.qualityScore >= 90 ? 'Excellent' : table.qualityScore >= 70 ? 'Good' : 'Needs work', color: table.qualityScore >= 90 ? '#4caf50' : '#ffcc02', up: null },
    ...(results.secondLabel ? [{ label: results.secondLabel, value: fmtV(results.secondValue), sub: '', color: '#9c27b0', up: null }] : []),
    ...(results.anomalies?.length > 0 ? [{ label: 'Anomalies', value: String(results.anomalies.length), sub: 'statistical outliers', color: '#ff6b35', up: false }] : [{ label: 'Anomalies', value: '0', sub: 'All data looks clean', color: '#4caf50', up: null }]),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {kpis.slice(0, 5).map((m, i) => (
        <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
          className="rounded-2xl p-4" style={{ background: `${m.color}0d`, border: `1px solid ${m.color}28` }}>
          <div className="text-xs text-white/35 uppercase tracking-widest mb-1.5 flex items-center gap-1">
            {m.up !== null && (m.up ? <TrendingUp className="w-3 h-3" style={{ color: m.color }} /> : <TrendingDown className="w-3 h-3" style={{ color: m.color }} />)}
            {m.label}
          </div>
          <div className="font-black text-2xl font-mono" style={{ color: m.color, textShadow: `0 0 20px ${m.color}44` }}>{m.value}</div>
          {m.sub && <div className="text-xs text-white/30 mt-1 leading-tight">{m.sub}</div>}
        </motion.div>
      ))}
    </div>
  );
}

// ── Main trend chart (hero chart) ──────────────────────────────
function HeroTrendChart({ trendData, forecastData, primaryLabel, color = '#00e5ff' }) {
  const combined = [
    ...(trendData || []).map(d => ({ ...d, actual: d.value })),
    ...(forecastData || []).map(d => ({ ...d, forecast: d.value })),
  ];
  if (combined.length < 2) return (
    <div className="flex items-center justify-center h-48 text-xs text-white/30">No time-series data available.</div>
  );
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={combined} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="heroActual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.35} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="heroForecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmtV} width={44} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v, name) => [fmtV(v), name === 'actual' ? primaryLabel : '6-Period Forecast']} />
        <Area type="monotone" dataKey="actual" stroke={color} fill="url(#heroActual)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: color }} />
        <Area type="monotone" dataKey="forecast" stroke="#9c27b0" fill="url(#heroForecast)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Segment breakdown bar ──────────────────────────────────────
function SegmentBar({ data, primaryLabel, color = '#00e5ff' }) {
  if (!data?.length) return <div className="text-xs text-white/30 py-8 text-center">No segment data available.</div>;
  const top = data.slice(0, 8);
  return (
    <ResponsiveContainer width="100%" height={Math.max(160, top.length * 28)}>
      <BarChart data={top} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis type="number" tick={axisStyle} tickFormatter={fmtV} tickLine={false} axisLine={false} />
        <YAxis dataKey="name" type="category" tick={{ ...axisStyle, fontSize: 10 }} tickLine={false} axisLine={false} width={88} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [fmtV(v), primaryLabel]} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
          {top.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.85} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Anomaly panel ─────────────────────────────────────────────
function AnomalyPanel({ anomalies }) {
  if (!anomalies?.length) return (
    <div className="flex items-center gap-3 p-4 rounded-xl bg-green-400/5 border border-green-400/20">
      <CheckCircle2 className="w-5 h-5 text-green-400 flex-shrink-0" />
      <div>
        <div className="text-sm font-semibold text-green-400">All Clear</div>
        <div className="text-xs text-white/40">No anomalies detected — data is within normal statistical bounds.</div>
      </div>
    </div>
  );
  return (
    <div className="space-y-2">
      {anomalies.slice(0, 6).map((a, i) => (
        <div key={i} className="flex items-center justify-between text-xs p-3 rounded-xl transition-all"
          style={{ background: a.severity === 'high' ? 'rgba(255,45,122,0.07)' : 'rgba(255,107,53,0.07)', border: `1px solid ${a.severity === 'high' ? 'rgba(255,45,122,0.2)' : 'rgba(255,107,53,0.2)'}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: a.severity === 'high' ? '#ff2d7a' : '#ff6b35' }} />
            <span className="font-mono text-white/60">{a.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-semibold">{fmtV(a.value)}</span>
            <span className="text-white/30 hidden sm:inline">vs ~{fmtV(a.expected)}</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: a.severity === 'high' ? 'rgba(255,45,122,0.2)' : 'rgba(255,107,53,0.2)', color: a.severity === 'high' ? '#ff2d7a' : '#ff6b35' }}>
              {a.severity?.toUpperCase()} z={a.zScore}σ
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Recommendations ──────────────────────────────────────────
function RecommendationsPanel({ recs, keyFindings }) {
  const priorityMeta = {
    high: { color: '#ff2d7a', bg: 'rgba(255,45,122,0.12)', label: 'HIGH' },
    critical: { color: '#ff0044', bg: 'rgba(255,0,68,0.12)', label: 'CRITICAL' },
    medium: { color: '#ffcc02', bg: 'rgba(255,204,2,0.12)', label: 'MEDIUM' },
    low: { color: '#4caf50', bg: 'rgba(76,175,80,0.12)', label: 'LOW' },
  };
  return (
    <div className="space-y-2">
      {recs?.slice(0, 5).map((r, i) => {
        const meta = priorityMeta[r.priority] || priorityMeta.low;
        return (
          <div key={i} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <span className="px-2 py-0.5 rounded text-xs font-black flex-shrink-0 mt-0.5"
              style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
            <span className="text-xs text-white/60 leading-relaxed">{r.action}</span>
          </div>
        );
      })}
      {keyFindings?.slice(0, 3).map((f, i) => (
        <div key={`kf-${i}`} className="flex items-start gap-2.5 text-xs text-white/50 p-2.5 rounded-lg bg-white/2">
          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-cyan-400" />
          {f}
        </div>
      ))}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function StorySection() {
  const { analysisResults, getActiveTable, setActiveSection, saveToDashboard } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showExport, setShowExport] = useState(false);
  const [savedToast, setSavedToast] = useState('');

  if (!analysisResults || !activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Dashboard Yet</h2>
        <p className="text-sm text-muted-foreground mb-6">Upload data and run AI analysis to generate your executive storytelling dashboard.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const r = analysisResults;
  const rows = activeTable.rows || [];
  const columns = activeTable.columns || [];
  const primaryColor = THEME[r.chartPanels?.[0]?.color_theme] || THEME.cyan;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'trends', label: 'Trends', icon: TrendingUp },
    { id: 'anomalies', label: `Anomalies (${r.anomalies?.length || 0})`, icon: AlertTriangle },
    { id: 'correlations', label: 'Correlations', icon: Activity },
    { id: 'insights', label: 'AI Insights', icon: Sparkles },
  ];

  return (
    <div className="overflow-auto min-h-full" style={{ background: 'linear-gradient(160deg, hsl(222,47%,5%) 0%, hsl(222,44%,7%) 100%)' }}>
      <AnimatePresence>
        {savedToast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 text-xs font-medium shadow-2xl">
            <CheckCircle2 className="w-3.5 h-3.5" /> "{savedToast}" saved to Dashboard
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5 gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
              <span className="text-xs font-mono tracking-widest text-white/35 uppercase">{r.domainLabel || r.tableName}</span>
            </div>
            <h1 className="text-2xl font-black">{r.tableName}</h1>
            {r.dataStory && <p className="text-xs text-white/35 mt-1 max-w-lg leading-relaxed">{r.dataStory}</p>}
          </div>
          <div className="flex gap-2 flex-shrink-0 relative">
            <button onClick={() => setActiveSection('workbook')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 transition-all bg-white/5 border border-white/8">
              Workbook <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => setShowExport(v => !v)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/60 hover:text-white transition-all bg-white/5 border border-white/8">
              <Download className="w-3 h-3" /> Export
            </button>
            <button onClick={() => setActiveSection('analyst')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold text-white"
              style={{ background: `linear-gradient(90deg, ${primaryColor}cc, #9c27b0)` }}>
              <Sparkles className="w-3 h-3" /> Ask AI
            </button>
            <AnimatePresence>
              {showExport && <ExportPanel analysisResults={analysisResults} table={activeTable} onClose={() => setShowExport(false)} />}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* KPI Strip */}
        <div className="mb-5">
          <KPIStrip results={r} table={activeTable} />
        </div>

        {/* Headline insight callout */}
        {r.executiveSummary && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mb-5 p-4 rounded-2xl flex items-start gap-3"
            style={{ background: `${primaryColor}08`, border: `1px solid ${primaryColor}22` }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${primaryColor}18` }}>
              <Lightbulb className="w-4 h-4" style={{ color: primaryColor }} />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: primaryColor }}>AI Executive Summary</div>
              <p className="text-sm text-white/65 leading-relaxed">{r.executiveSummary}</p>
            </div>
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-0.5 mb-5 border-b border-white/5 pb-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab === t.id ? 'border-current text-white' : 'border-transparent text-white/35 hover:text-white/60'}`}
              style={activeTab === t.id ? { borderBottomColor: primaryColor, color: primaryColor } : {}}>
              <t.icon className="w-3 h-3" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── DASHBOARD ─────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="space-y-5">
            {/* Hero trend + breakdown row */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Trend chart — larger */}
              <div className="xl:col-span-2 rounded-2xl p-5" style={{ background: `${primaryColor}07`, border: `1px solid ${primaryColor}1a` }}>
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <div className="text-xs text-white/35 uppercase tracking-widest mb-0.5">What happened</div>
                    <div className="font-semibold text-sm">{r.primaryLabel} — Historical Trend {r.canForecast ? '+ Forecast' : ''}</div>
                  </div>
                  {r.growthRate != null && (
                    <div className="font-mono text-xl font-black" style={{ color: Number(r.growthRate) >= 0 ? THEME.green : THEME.pink }}>
                      {Number(r.growthRate) >= 0 ? '▲' : '▼'} {Math.abs(r.growthRate)}%
                    </div>
                  )}
                </div>
                {r.canForecast && <div className="text-xs text-white/25 mb-3">Purple dashed = 6-period AI forecast (Exp. Smoothing + Linear Regression blend)</div>}
                <HeroTrendChart trendData={r.trendData} forecastData={r.forecastData} primaryLabel={r.primaryLabel} color={primaryColor} />
              </div>

              {/* Breakdown chart */}
              <div className="rounded-2xl p-5" style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.2)' }}>
                <div className="text-xs text-white/35 uppercase tracking-widest mb-0.5">Why it happened</div>
                <div className="font-semibold text-sm mb-4">{r.primaryLabel} by {r.primaryDimension?.replace(/_/g, ' ') || 'Segment'}</div>
                <SegmentBar data={r.breakdownData} primaryLabel={r.primaryLabel} color={THEME.purple} />
              </div>
            </div>

            {/* Anomaly + Recommendations row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl p-5" style={{ background: 'rgba(255,107,53,0.05)', border: '1px solid rgba(255,107,53,0.18)' }}>
                <div className="text-xs text-white/35 uppercase tracking-widest mb-1">Where the risk is</div>
                <div className="flex items-center justify-between mb-4">
                  <div className="font-semibold text-sm">Anomaly Detection</div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-mono"
                    style={{ background: r.anomalies?.length ? 'rgba(255,107,53,0.2)' : 'rgba(76,175,80,0.2)', color: r.anomalies?.length ? '#ff6b35' : '#4caf50' }}>
                    {r.anomalies?.length || 0} detected
                  </span>
                </div>
                <AnomalyPanel anomalies={r.anomalies} />
              </div>

              <div className="rounded-2xl p-5" style={{ background: 'rgba(76,175,80,0.05)', border: '1px solid rgba(76,175,80,0.18)' }}>
                <div className="text-xs text-white/35 uppercase tracking-widest mb-1">What to do next</div>
                <div className="font-semibold text-sm mb-4">AI Recommendations</div>
                <RecommendationsPanel recs={r.recommendations} keyFindings={r.keyFindings} />
              </div>
            </div>

            {/* Adaptive AI chart panels */}
            {r.chartPanels?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-white/30 uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> AI-Generated Chart Panels
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {r.chartPanels.slice(0, 6).map((panel, i) => {
                    const tc = THEME[panel.color_theme] || THEME.cyan;
                    return (
                      <motion.div key={panel.id || i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
                        className="rounded-2xl p-4 flex flex-col group"
                        style={{ background: `${tc}08`, border: `1px solid ${tc}20`, backdropFilter: 'blur(12px)' }}>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="text-xs font-mono text-white/25 uppercase tracking-widest mb-0.5">
                              <span style={{ color: tc }}>{String(i + 1).padStart(2, '0')}</span> {panel.chart_type?.replace(/_/g, ' ')}
                            </div>
                            <div className="text-sm font-semibold text-white/90">{panel.title}</div>
                          </div>
                          <button
                            onClick={() => {
                              const chart = { type: panel.chart_type, title: panel.title, data: [], x_key: 'name', y_key: 'value' };
                              saveToDashboard({ chart, insight: panel.insight, datasetName: activeTable.name, label: panel.title });
                              setSavedToast(panel.title || 'Chart');
                              setTimeout(() => setSavedToast(''), 2500);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-400/8 text-xs"
                            title="Save to Dashboard">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex-1 min-h-0">
                          <AdaptiveChart panel={panel} rows={rows} columns={columns} height={180} />
                        </div>
                        {panel.insight && (
                          <div className="mt-3 flex items-start gap-1.5 text-xs text-white/30 leading-relaxed border-t border-white/5 pt-2.5">
                            <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: tc }} />
                            {panel.insight}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TRENDS ────────────────────────────────────────────── */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            {r.trendData?.length > 1 ? (
              <>
                <div className="rounded-2xl p-5" style={{ background: `${primaryColor}07`, border: `1px solid ${primaryColor}1a` }}>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-semibold">{r.primaryLabel} Trend</div>
                      <div className="text-xs text-white/35 mt-0.5">{r.canForecast ? `Historical + ${r.forecastData?.length}-period AI forecast` : 'Historical data only (no date column for forecasting)'}</div>
                    </div>
                    {r.growthRate != null && (
                      <div className="font-mono text-xl font-black" style={{ color: Number(r.growthRate) >= 0 ? THEME.green : THEME.pink }}>
                        {Number(r.growthRate) >= 0 ? '▲' : '▼'} {Math.abs(r.growthRate)}%
                      </div>
                    )}
                  </div>
                  <HeroTrendChart trendData={r.trendData} forecastData={r.forecastData || []} primaryLabel={r.primaryLabel} color={primaryColor} />
                </div>

                {r.allTrends && Object.keys(r.allTrends).length > 1 && (
                  <div>
                    <div className="text-xs font-semibold text-white/35 uppercase tracking-widest mb-3">All Numeric Metrics Over Time</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(r.allTrends).slice(0, 6).map(([colName, trend], i) => {
                        const color = PALETTE[i % PALETTE.length];
                        return (
                          <div key={colName} className="rounded-xl p-4" style={{ background: `${color}08`, border: `1px solid ${color}20` }}>
                            <div className="text-xs font-mono text-white/45 mb-3">{colName.replace(/_/g, ' ')}</div>
                            <AdaptiveChart panel={{ chart_type: 'line_area', color_theme: Object.keys(THEME)[i % 7] }} data={trend} rows={rows} columns={columns} height={120} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-start gap-3 p-5 rounded-2xl" style={{ background: 'rgba(255,204,2,0.06)', border: '1px solid rgba(255,204,2,0.2)' }}>
                <Info className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-yellow-400 mb-1">No Time-Series Data</div>
                  <div className="text-sm text-white/50">No date column was detected in your dataset, so time-series trends and forecasting are unavailable. Distribution, breakdown, and correlation charts remain active.</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ANOMALIES ─────────────────────────────────────────── */}
        {activeTab === 'anomalies' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,45,122,0.04)', border: '1px solid rgba(255,45,122,0.15)' }}>
              <div className="flex items-center gap-2 mb-1">
                <Shield className="w-4 h-4 text-red-400" />
                <div className="font-semibold">Statistical Anomaly Detection</div>
              </div>
              <div className="text-xs text-white/35 mb-4">Z-score + IQR combined method. Points beyond 2σ from rolling mean are flagged. Higher z-score = more extreme outlier.</div>
              <AnomalyPanel anomalies={r.anomalies} />
            </div>
            {r.trendData?.length > 1 && (
              <div className="rounded-2xl p-5" style={{ background: `${primaryColor}06`, border: `1px solid ${primaryColor}15` }}>
                <div className="text-xs text-white/35 mb-3">Trend view — anomalous periods marked above</div>
                <HeroTrendChart trendData={r.trendData} forecastData={[]} primaryLabel={r.primaryLabel} color={primaryColor} />
              </div>
            )}
          </div>
        )}

        {/* ── CORRELATIONS ──────────────────────────────────────── */}
        {activeTab === 'correlations' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)' }}>
              <div className="font-semibold mb-1">Pearson Correlation Analysis</div>
              <div className="text-xs text-white/35 mb-4">Computed locally. Shows relationship strength between all numeric column pairs (|r| {'>'} 0.3). r closer to ±1 = stronger correlation.</div>
              {r.correlations?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {r.correlations.map((c, i) => {
                    const strength = Math.abs(c.r);
                    const color = strength > 0.7 ? '#4caf50' : strength > 0.5 ? '#ffcc02' : '#ff6b35';
                    return (
                      <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs"
                        style={{ background: `${color}15`, border: `1px solid ${color}33`, color }}>
                        <span className="font-mono">{c.colA.replace(/_/g, ' ')}</span>
                        <span className="text-white/30">↔</span>
                        <span className="font-mono">{c.colB.replace(/_/g, ' ')}</span>
                        <span className="font-black ml-1">{c.r > 0 ? '+' : ''}{c.r}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-xs text-white/30">No significant correlations found (all |r| &lt; 0.3).</div>
              )}
            </div>

            {r.correlations?.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {r.correlations.slice(0, 4).map((c, i) => (
                  <div key={i} className="rounded-xl p-4" style={{ background: `${PALETTE[i]}08`, border: `1px solid ${PALETTE[i]}22` }}>
                    <div className="text-xs font-mono text-white/40 mb-2">{c.colA.replace(/_/g, ' ')} × {c.colB.replace(/_/g, ' ')} (r={c.r})</div>
                    <AdaptiveChart panel={{ chart_type: 'scatter', x_column: c.colA, y_column: c.colB, color_theme: Object.keys(THEME)[i] }} rows={rows} columns={columns} height={180} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── AI INSIGHTS ───────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            {r.executiveSummary && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.2)' }}>
                <div className="flex items-center gap-2 mb-3 text-xs font-mono text-purple-400 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> Executive Summary
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{r.executiveSummary}</p>
              </div>
            )}
            {r.keyFindings?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: `${primaryColor}06`, border: `1px solid ${primaryColor}1a` }}>
                <div className="text-xs font-mono text-white/35 uppercase tracking-widest mb-3">Key Findings ({r.keyFindings.length})</div>
                <ul className="space-y-2.5">
                  {r.keyFindings.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-white/60">
                      <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: primaryColor }} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {r.recommendations?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)' }}>
                <div className="text-xs font-mono text-white/35 uppercase tracking-widest mb-3">AI Recommendations ({r.recommendations.length})</div>
                <RecommendationsPanel recs={r.recommendations} keyFindings={[]} />
              </div>
            )}
            {!r.executiveSummary && !r.keyFindings?.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-10 h-10 text-white/15 mb-3" />
                <p className="text-sm text-white/35">Run AI analysis to generate insights.</p>
                <button onClick={() => setActiveSection('prepare')} className="mt-3 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg text-xs hover:bg-purple-400/15 transition-colors">
                  Go to Prepare
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}