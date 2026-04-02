/**
 * StorySection — Adaptive AI Dashboard
 * Layout and charts are fully driven by LLM analysis output.
 * No hardcoded structure — adapts to ANY dataset.
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Database, ArrowRight, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Sparkles, RefreshCw, Info } from 'lucide-react';
import AdaptiveChart from '@/components/charts/AdaptiveChart';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const THEME = {
  cyan:   '#00e5ff',
  purple: '#9c27b0',
  orange: '#ff6b35',
  green:  '#4caf50',
  pink:   '#ff2d7a',
  yellow: '#ffcc02',
  teal:   '#00bfa5',
};

const CARD_THEMES = [
  'rgba(0,229,255,0.06)',
  'rgba(156,39,176,0.06)',
  'rgba(255,107,53,0.06)',
  'rgba(76,175,80,0.06)',
  'rgba(255,45,122,0.06)',
  'rgba(255,204,2,0.06)',
  'rgba(0,191,165,0.06)',
];

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// ── KPI summary strip ─────────────────────────────────────────────
function KPIStrip({ results, table }) {
  const metrics = [
    {
      label: results.primaryLabel || 'Total',
      value: fmtV(results.totalValue),
      sub: results.growthRate != null ? `${Number(results.growthRate) >= 0 ? '+' : ''}${results.growthRate}% trend` : null,
      color: THEME.cyan,
      icon: Number(results.growthRate) >= 0 ? TrendingUp : TrendingDown,
    },
    { label: 'Records', value: fmtV(table.rowCount), sub: `${table.columns?.length} columns`, color: THEME.teal },
    { label: 'Quality Score', value: `${table.qualityScore}%`, sub: table.qualityScore >= 90 ? 'Excellent' : table.qualityScore >= 70 ? 'Good' : 'Needs work', color: table.qualityScore >= 90 ? THEME.green : THEME.yellow },
    ...(results.secondLabel ? [{ label: results.secondLabel, value: fmtV(results.secondValue), sub: '', color: THEME.purple }] : []),
    ...(results.anomalies?.length > 0 ? [{ label: 'Anomalies', value: String(results.anomalies.length), sub: 'detected', color: THEME.orange }] : []),
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <motion.div key={m.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            className="rounded-2xl p-4"
            style={{ background: `${m.color}10`, border: `1px solid ${m.color}28` }}>
            <div className="text-xs text-white/40 uppercase tracking-widest flex items-center gap-1.5">
              {Icon && <Icon className="w-3 h-3" style={{ color: m.color }} />}
              {m.label}
            </div>
            <div className="font-black text-xl font-mono mt-1" style={{ color: m.color, textShadow: `0 0 16px ${m.color}44` }}>
              {m.value}
            </div>
            {m.sub && <div className="text-xs text-white/30 mt-0.5">{m.sub}</div>}
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Forecast chart (always shown when data has dates) ────────────
function ForecastPanel({ trendData, forecastData, primaryLabel, color = '#00e5ff' }) {
  const combined = [
    ...trendData.map(d => ({ ...d, actual: d.value })),
    ...forecastData.map(d => ({ ...d, forecast: d.value })),
  ];
  if (combined.length < 2) return null;
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={combined} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="fg-actual" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="fg-forecast" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} tickFormatter={fmtV} width={40} />
        <Tooltip
          contentStyle={{ backgroundColor: 'rgba(10,8,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11, color: '#e2e8f0' }}
          formatter={(v, name) => [fmtV(v), name === 'actual' ? primaryLabel : 'Forecast']}
        />
        <Area type="monotone" dataKey="actual" stroke={color} fill="url(#fg-actual)" strokeWidth={2} dot={false} connectNulls />
        <Area type="monotone" dataKey="forecast" stroke="#9c27b0" fill="url(#fg-forecast)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} connectNulls />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ── Anomaly list ──────────────────────────────────────────────────
function AnomalyList({ anomalies }) {
  if (!anomalies?.length) return (
    <div className="flex items-center gap-2 text-xs text-green-400">
      <CheckCircle2 className="w-3.5 h-3.5" /> No anomalies detected — data looks clean.
    </div>
  );
  return (
    <div className="space-y-2">
      {anomalies.slice(0, 5).map((a, i) => (
        <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg"
          style={{ background: a.severity === 'high' ? 'rgba(255,45,122,0.08)' : 'rgba(255,107,53,0.08)', border: `1px solid ${a.severity === 'high' ? 'rgba(255,45,122,0.2)' : 'rgba(255,107,53,0.2)'}` }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3" style={{ color: a.severity === 'high' ? '#ff2d7a' : '#ff6b35' }} />
            <span className="text-white/60 font-mono">{a.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-white/80">{fmtV(a.value)}</span>
            <span className="text-white/30">vs expected {fmtV(a.expected)}</span>
            <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
              style={{ background: a.severity === 'high' ? 'rgba(255,45,122,0.2)' : 'rgba(255,107,53,0.2)', color: a.severity === 'high' ? '#ff2d7a' : '#ff6b35' }}>
              {a.severity?.toUpperCase()} z={a.zScore}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Correlation badges ────────────────────────────────────────────
function CorrelationBadges({ correlations }) {
  if (!correlations?.length) return <div className="text-xs text-white/30">No strong correlations found.</div>;
  return (
    <div className="flex flex-wrap gap-2">
      {correlations.slice(0, 6).map((c, i) => {
        const strength = Math.abs(c.r);
        const color = strength > 0.7 ? '#4caf50' : strength > 0.5 ? '#ffcc02' : '#ff6b35';
        return (
          <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
            style={{ background: `${color}15`, border: `1px solid ${color}33`, color }}>
            <span className="font-mono">{c.colA.replace(/_/g, ' ')}</span>
            <span className="text-white/30">↔</span>
            <span className="font-mono">{c.colB.replace(/_/g, ' ')}</span>
            <span className="font-black">{c.r > 0 ? '+' : ''}{c.r}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Recommendations ───────────────────────────────────────────────
function Recommendations({ recs }) {
  if (!recs?.length) return null;
  const priorityColor = { high: '#ff2d7a', critical: '#ff0044', medium: '#ffcc02', low: '#4caf50' };
  return (
    <div className="space-y-2">
      {recs.map((r, i) => (
        <div key={i} className="flex items-start gap-3 text-sm p-3 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span className="px-2 py-0.5 rounded text-xs font-bold flex-shrink-0 mt-0.5 uppercase"
            style={{ background: `${priorityColor[r.priority] || '#888'}22`, color: priorityColor[r.priority] || '#888' }}>
            {r.priority}
          </span>
          <span className="text-white/60 text-xs leading-relaxed">{r.action}</span>
        </div>
      ))}
    </div>
  );
}

// ── Main StorySection ─────────────────────────────────────────────
export default function StorySection() {
  const { analysisResults, getActiveTable, setActiveSection } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!analysisResults || !activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Analysis Yet</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload data and run analysis to generate the AI dashboard.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  const r = analysisResults;
  const rows = activeTable.rows || [];
  const columns = activeTable.columns || [];
  const primaryColor = THEME[r.chartPanels?.[0]?.color_theme] || THEME.cyan;

  const tabs = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'trends', label: 'Trends & Forecast' },
    { id: 'anomalies', label: `Anomalies (${r.anomalies?.length || 0})` },
    { id: 'correlations', label: 'Correlations' },
    { id: 'insights', label: 'AI Insights' },
  ];

  return (
    <div className="overflow-auto min-h-full" style={{ background: 'linear-gradient(160deg, #080614 0%, #0d0a1e 50%, #060410 100%)' }}>
      <div className="p-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: primaryColor }} />
              <span className="text-xs font-mono tracking-widest text-white/40 uppercase">{r.domainLabel || r.tableName}</span>
            </div>
            <h1 className="text-2xl font-black text-white">{r.tableName}</h1>
            {r.dataStory && <p className="text-xs text-white/40 mt-1 max-w-xl">{r.dataStory}</p>}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveSection('workbook')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 transition-colors"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              Workbook <ArrowRight className="w-3 h-3" />
            </button>
            <button onClick={() => setActiveSection('analyst')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold"
              style={{ background: `linear-gradient(90deg,${primaryColor}cc,#9c27b0)`, color: '#fff' }}>
              <Sparkles className="w-3 h-3" /> Ask AI
            </button>
          </div>
        </motion.div>

        {/* KPI Strip */}
        <KPIStrip results={r} table={activeTable} />

        {/* Tabs */}
        <div className="flex gap-1 mb-5 border-b border-white/5 pb-0 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-xs font-semibold whitespace-nowrap transition-all rounded-t-lg ${activeTab === t.id ? 'text-white border-b-2' : 'text-white/40 hover:text-white/70'}`}
              style={activeTab === t.id ? { borderBottomColor: primaryColor, color: primaryColor } : {}}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Dashboard (Adaptive AI panels) ──────────────────── */}
        {activeTab === 'dashboard' && (
          <div>
            {r.chartPanels && r.chartPanels.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {r.chartPanels.map((panel, i) => {
                  const tc = THEME[panel.color_theme] || THEME.cyan;
                  return (
                    <motion.div key={panel.id || i}
                      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                      className="rounded-2xl p-4 flex flex-col"
                      style={{ background: CARD_THEMES[i % CARD_THEMES.length], border: `1px solid ${tc}22`, backdropFilter: 'blur(12px)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-0.5">
                            <span style={{ color: tc }}>{String(i + 1).padStart(2, '0')}</span> {panel.chart_type?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm font-semibold text-white/90">{panel.title}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-h-0">
                        <AdaptiveChart panel={panel} rows={rows} columns={columns} height={200} />
                      </div>
                      {panel.insight && (
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-white/35 leading-relaxed border-t border-white/5 pt-2">
                          <Info className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: tc }} />
                          {panel.insight}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              // Fallback: show generic charts based on detected columns
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {/* Breakdown */}
                {r.breakdownData?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-4 flex flex-col" style={{ background: CARD_THEMES[0], border: '1px solid rgba(0,229,255,0.2)' }}>
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">01 breakdown</div>
                    <div className="text-sm font-semibold text-white/90 mb-3">{r.primaryLabel} by {r.primaryDimension?.replace(/_/g, ' ')}</div>
                    <AdaptiveChart panel={{ chart_type: 'horizontal_bar', color_theme: 'cyan' }} data={r.breakdownData} rows={rows} columns={columns} height={200} />
                  </motion.div>
                )}
                {/* Trend */}
                {r.trendData?.length > 1 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                    className="rounded-2xl p-4 flex flex-col" style={{ background: CARD_THEMES[1], border: '1px solid rgba(156,39,176,0.2)' }}>
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">02 trend</div>
                    <div className="text-sm font-semibold text-white/90 mb-3">{r.primaryLabel} Over Time</div>
                    <AdaptiveChart panel={{ chart_type: 'line_area', color_theme: 'purple' }} data={r.trendData} rows={rows} columns={columns} height={200} />
                  </motion.div>
                )}
                {/* Second breakdown by another dim */}
                {r.breakdownData?.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                    className="rounded-2xl p-4 flex flex-col" style={{ background: CARD_THEMES[2], border: '1px solid rgba(255,107,53,0.2)' }}>
                    <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-1">03 share</div>
                    <div className="text-sm font-semibold text-white/90 mb-3">Segment Distribution</div>
                    <AdaptiveChart panel={{ chart_type: 'donut', color_theme: 'orange' }} data={r.breakdownData} rows={rows} columns={columns} height={200} />
                  </motion.div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Trends & Forecast ────────────────────────────────── */}
        {activeTab === 'trends' && (
          <div className="space-y-5">
            {r.trendData?.length > 1 ? (
              <>
                <div className="rounded-2xl p-5" style={{ background: 'rgba(0,229,255,0.05)', border: '1px solid rgba(0,229,255,0.15)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold">{r.primaryLabel} Trend</div>
                      <div className="text-xs text-white/40 mt-0.5">
                        {r.canForecast ? `Actual data + ${r.forecastData?.length}-period AI forecast (Exp. Smoothing + Linear Regression blend)` : 'Historical trend only'}
                      </div>
                    </div>
                    {r.growthRate != null && (
                      <div className="font-mono text-lg font-black" style={{ color: Number(r.growthRate) >= 0 ? THEME.green : THEME.pink }}>
                        {Number(r.growthRate) >= 0 ? '▲' : '▼'} {Math.abs(Number(r.growthRate))}%
                      </div>
                    )}
                  </div>
                  <ForecastPanel trendData={r.trendData} forecastData={r.forecastData || []} primaryLabel={r.primaryLabel} color={primaryColor} />
                </div>

                {/* All numeric metrics trends */}
                {r.allTrends && Object.keys(r.allTrends).length > 1 && (
                  <div>
                    <div className="text-sm font-semibold text-white/60 mb-3 uppercase tracking-widest text-xs">All Metrics Over Time</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(r.allTrends).slice(0, 6).map(([colName, trend], i) => (
                        <div key={colName} className="rounded-xl p-4" style={{ background: CARD_THEMES[i % CARD_THEMES.length], border: `1px solid ${Object.values(THEME)[i % 7]}22` }}>
                          <div className="text-xs font-semibold text-white/50 mb-2 font-mono">{colName.replace(/_/g, ' ')}</div>
                          <AdaptiveChart panel={{ chart_type: 'line_area', color_theme: Object.keys(THEME)[i % 7] }} data={trend} rows={rows} columns={columns} height={120} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(255,204,2,0.06)', border: '1px solid rgba(255,204,2,0.2)' }}>
                <Info className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <div className="text-sm text-yellow-400">No date column detected — time-series trends are unavailable for this dataset. Distribution and breakdown charts are active.</div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Anomalies ────────────────────────────────────────── */}
        {activeTab === 'anomalies' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(255,45,122,0.04)', border: '1px solid rgba(255,45,122,0.15)' }}>
              <div className="font-semibold mb-1">Statistical Anomaly Detection</div>
              <div className="text-xs text-white/40 mb-4">Z-score + IQR combined method. Flags data points beyond 2σ from the mean.</div>
              <AnomalyList anomalies={r.anomalies} />
            </div>
            {r.trendData?.length > 1 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)' }}>
                <div className="text-xs text-white/40 mb-3">Trend (anomalous periods highlighted above)</div>
                <ForecastPanel trendData={r.trendData} forecastData={[]} primaryLabel={r.primaryLabel} color={primaryColor} />
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Correlations ─────────────────────────────────────── */}
        {activeTab === 'correlations' && (
          <div className="space-y-5">
            <div className="rounded-2xl p-5" style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.15)' }}>
              <div className="font-semibold mb-1">Pearson Correlation Analysis</div>
              <div className="text-xs text-white/40 mb-4">Computed locally using Pearson r. Shows relationships between all numeric columns (|r| &gt; 0.3).</div>
              <CorrelationBadges correlations={r.correlations} />
            </div>
            {/* Scatter plots for top correlations */}
            {r.correlations?.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Scatter Plots</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {r.correlations.slice(0, 4).map((c, i) => (
                    <div key={i} className="rounded-xl p-4" style={{ background: CARD_THEMES[i], border: `1px solid ${Object.values(THEME)[i]}22` }}>
                      <div className="text-xs font-mono text-white/40 mb-2">{c.colA} × {c.colB} (r={c.r})</div>
                      <AdaptiveChart
                        panel={{ chart_type: 'scatter', x_column: c.colA, y_column: c.colB, color_theme: Object.keys(THEME)[i] }}
                        rows={rows} columns={columns} height={180} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: AI Insights ──────────────────────────────────────── */}
        {activeTab === 'insights' && (
          <div className="space-y-5">
            {r.executiveSummary && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.2)' }}>
                <div className="flex items-center gap-2 mb-3 text-xs font-mono text-white/40 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Executive Summary
                </div>
                <p className="text-sm text-white/70 leading-relaxed">{r.executiveSummary}</p>
              </div>
            )}
            {r.keyFindings?.length > 0 && (
              <div className="rounded-2xl p-5" style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.12)' }}>
                <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">Key Findings</div>
                <ul className="space-y-2">
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
              <div className="rounded-2xl p-5" style={{ background: 'rgba(76,175,80,0.04)', border: '1px solid rgba(76,175,80,0.12)' }}>
                <div className="text-xs font-mono text-white/40 uppercase tracking-widest mb-3">AI Recommendations</div>
                <Recommendations recs={r.recommendations} />
              </div>
            )}
            {!r.executiveSummary && !r.keyFindings?.length && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Sparkles className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-white/40">Run AI analysis to generate insights. Go to Prepare → Run Analysis.</p>
                <button onClick={() => setActiveSection('prepare')} className="mt-3 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-lg text-xs">
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