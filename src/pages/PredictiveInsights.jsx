import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import ForecastChart from '@/components/predictive/ForecastChart.jsx';
import TrendCard from '@/components/predictive/TrendCard.jsx';
import AnomalyFeed from '@/components/predictive/AnomalyFeed.jsx';
import ScenarioPanel from '@/components/predictive/ScenarioPanel.jsx';
import InsightNarrative from '@/components/predictive/InsightNarrative.jsx';
import PredictiveFilters from '@/components/predictive/PredictiveFilters.jsx';
import ExportMenu from '@/components/export/ExportMenu.jsx';
import AlertsCenter from '@/components/alerts/AlertsCenter.jsx';
import ChartSummaryDropdown from '@/components/charts/ChartSummaryDropdown.jsx';
import { useWorkspaceStore } from '@/lib/store';
import {
  TrendingUp, Brain, Zap, AlertTriangle, RefreshCw,
  Loader2, BarChart3, Target, Activity,
  Sparkles, Database, Clock, Bell, History
} from 'lucide-react';
import { Link } from 'react-router-dom';

const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

export default function PredictiveInsights() {
  const { analysisResults, tables } = useWorkspaceStore();
  const table = tables?.[0] || null;
  const r = analysisResults;

  const [generating, setGenerating] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [activeScenario, setActiveScenario] = useState('base');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filters, setFilters] = useState({});
  const [showAlerts, setShowAlerts] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const hasData = !!r && !!table;

  useEffect(() => {
    if (hasData && !narrative) generateNarrative();
  }, [hasData]);

  const generateNarrative = async () => {
    if (!r || !table) return;
    setGenerating(true);
    try {
      const ctx = buildContext();
      const text = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior forecasting analyst. Based on the following dataset analytics, generate a concise PREDICTIVE INSIGHTS narrative (200-250 words) structured as:
1. Current trajectory (1 sentence)
2. Key growth drivers (2-3 bullets)
3. Risk factors to watch (2 bullets)
4. 90-day outlook (1-2 sentences)

Be specific with numbers. Use professional forecasting language. No markdown headers.

DATA:
${ctx}`,
      });
      setNarrative(text);
      setLastUpdated(new Date());
    } catch {
      setNarrative('Predictive narrative unavailable. Upload data in the Workspace to generate AI forecasts.');
    }
    setGenerating(false);
  };

  const buildContext = () => {
    if (!r || !table) return 'No data loaded.';
    return `Dataset: ${table.name} | Rows: ${table.rowCount} | Quality: ${table.qualityScore}%
Primary KPI: ${r.primaryLabel} = ${fmtV(r.totalValue)} | Growth Rate: ${r.growthRate ?? 'N/A'}%
Forecast: ${r.canForecast ? 'Yes' : 'No'} | Anomalies: ${r.anomalies?.length ?? 0}
Top Segments: ${r.breakdownData?.slice(0, 3).map(b => `${b.name}: ${fmtV(b.value)}`).join(', ') || 'N/A'}
Correlations: ${r.correlations?.slice(0, 2).map(c => `${c.colA}↔${c.colB} r=${c.r}`).join(', ') || 'N/A'}
Trend Periods: ${r.trendData?.length ?? 0} | Forecast Periods: ${r.forecastData?.length ?? 0}`;
  };

  const scenarios = buildScenarios(r);

  // Apply date/segment filters to trend data
  const filteredTrend = applyFilters(r?.trendData || [], filters);
  const filteredForecast = filters.showAnomaliesOnly ? [] : (r?.forecastData || []);
  const filteredAnomalies = filters.showAnomaliesOnly
    ? (r?.anomalies || [])
    : (r?.anomalies || []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 bg-white/[0.01] px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
                <Brain className="w-4 h-4 text-purple-400" />
              </div>
              <h1 className="text-xl font-bold">Predictive Insights</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20 font-mono">AI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasData ? `Forecasts & trend projections — ${table.name}` : 'AI-powered business trend forecasting'}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-xs text-white/25">
                <Clock className="w-3 h-3" /> {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            {hasData && (
              <>
                <PredictiveFilters
                  columns={table?.columns || []}
                  segments={r?.breakdownData?.map(b => b.name) || []}
                  onFilter={setFilters}
                  activeFilters={filters}
                  onReset={() => setFilters({})}
                />
                <ExportMenu
                  mode="predictive"
                  analysisResults={r}
                  table={table}
                  narrative={narrative}
                  scenarios={scenarios}
                  trendData={r?.trendData}
                />
                <button onClick={() => setShowAlerts(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${showAlerts ? 'bg-amber-400/10 border-amber-400/25 text-amber-400' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/80'}`}>
                  <Bell className="w-3.5 h-3.5" /> Alerts
                </button>
                <button onClick={generateNarrative} disabled={generating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/15 transition-all disabled:opacity-50">
                  {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Refresh
                </button>
              </>
            )}
            <Link to="/forecast-hub"
              className="flex items-center gap-2 px-4 py-2 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-xl text-sm font-semibold hover:bg-teal-400/15 transition-all">
              <History className="w-3.5 h-3.5" /> History
            </Link>
            <Link to="/workspace"
              className="flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 text-white/40 rounded-xl text-sm hover:bg-white/8 transition-all">
              <Database className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {!hasData ? (
        <NoDataState />
      ) : (
        <div className="max-w-7xl mx-auto px-8 py-6 space-y-6">

          {/* Alerts panel */}
          <AnimatePresence>
            {showAlerts && (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                className="glass-card rounded-2xl p-5 border border-amber-400/15 bg-amber-400/[0.02]">
                <AlertsCenter analysisResults={r} table={table} currentUser={user} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TrendCard label={r.primaryLabel || 'Primary KPI'} value={fmtV(r.totalValue)} growth={r.growthRate}
              sub={r.canForecast ? `${r.forecastData?.length || 0}-period forecast` : 'No date data'} color="#a855f7" icon={Target} />
            <TrendCard label="Trend Direction" value={r.growthRate != null ? (r.growthRate >= 0 ? 'Upward' : 'Downward') : 'Flat'}
              growth={r.growthRate} sub={r.growthRate != null ? `${Math.abs(r.growthRate)}% rate` : 'No time-series'}
              color={r.growthRate >= 0 ? '#4ade80' : '#f87171'} icon={TrendingUp} />
            <TrendCard label="Forecast Confidence" value={r.canForecast ? (Math.abs(r.growthRate || 0) < 30 ? 'High' : 'Medium') : 'Low'}
              sub={r.canForecast ? 'Exp. smoothing + regression' : 'Requires date column'}
              color={r.canForecast ? '#00e5ff' : '#fbbf24'} icon={Activity} />
            <TrendCard label="Risk Signals" value={r.anomalies?.length || 0} growth={r.anomalies?.length > 0 ? -1 : 0}
              sub={r.anomalies?.length > 0 ? `${r.anomalies.filter(a => a.severity === 'high').length} high severity` : 'No anomalies'}
              color={r.anomalies?.length > 0 ? '#fb923c' : '#4ade80'} icon={AlertTriangle} />
          </div>

          {/* Forecast chart + narrative */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="xl:col-span-2">
              <ForecastChart
                trendData={filteredTrend}
                forecastData={filteredForecast}
                primaryLabel={r.primaryLabel}
                growthRate={r.growthRate}
                scenarios={scenarios}
                activeScenario={activeScenario}
              />
              <ChartSummaryDropdown
                title={`${r.primaryLabel || 'KPI'} — Trend & Forecast`}
                chartType="area + line composed chart"
                data={[...(filteredTrend.map(d => ({ name: d.date, value: d.value }))), ...(filteredForecast.map(d => ({ name: d.date, value: d.value })))]}
                xKey="name"
                yKey="value"
                description={`Historical trend with AI forecast projection. Growth rate: ${r.growthRate ?? 'N/A'}%. ${r.trendData?.length} historical periods.`}
              />
            </div>
            <div>
              <InsightNarrative narrative={narrative} generating={generating} onRefresh={generateNarrative}
                tableName={table.name} growthRate={r.growthRate} canForecast={r.canForecast} />
            </div>
          </div>

          {/* Scenario panel */}
          <ScenarioPanel scenarios={scenarios} activeScenario={activeScenario} onSelect={setActiveScenario}
            primaryLabel={r.primaryLabel} baseValue={r.totalValue} />

          {/* Bottom row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <div className="glass-card rounded-2xl overflow-hidden border border-white/8">
              <div className="p-5"><SegmentForecast results={r} /></div>
              <ChartSummaryDropdown
                title="Segment Growth Forecast"
                chartType="horizontal bar chart"
                data={r.breakdownData || []}
                xKey="name"
                yKey="value"
                description="Segment contribution breakdown with projected growth rates applied uniformly"
              />
            </div>
            <div className="glass-card rounded-2xl overflow-hidden border border-white/8">
              <div className="p-5"><AnomalyFeed anomalies={filteredAnomalies} trendData={filteredTrend} /></div>
              <ChartSummaryDropdown
                title="Anomaly & Risk Signals"
                chartType="anomaly detection feed"
                data={filteredAnomalies.map(a => ({ name: a.date || 'period', value: a.value }))}
                xKey="name"
                yKey="value"
                description="Statistical deviations detected using Z-score analysis (threshold: |z| > 2σ)"
              />
            </div>
          </div>

          {/* Correlations */}
          {r.correlations?.length > 0 && (
            <div className="glass-card rounded-2xl overflow-hidden border border-white/8">
              <div className="p-5"><CorrelationPredictors correlations={r.correlations} /></div>
              <ChartSummaryDropdown
                title="Leading Indicators & Predictors"
                chartType="Pearson correlation matrix"
                data={r.correlations.map(c => ({ name: `${c.colA} ↔ ${c.colB}`, value: Math.abs(c.r) }))}
                xKey="name"
                yKey="value"
                description="Pearson correlation coefficients identifying variable relationships predictive of the primary KPI"
              />
            </div>
          )}

        </div>
      )}
    </div>
  );
}

// ── Filter helper ────────────────────────────────────────────────
function applyFilters(trendData, filters) {
  let data = [...trendData];
  if (filters.dateFrom) data = data.filter(d => d.date >= filters.dateFrom);
  if (filters.dateTo) data = data.filter(d => d.date <= filters.dateTo);
  if (filters.datePreset && filters.datePreset !== 'all' && filters.datePreset !== 'custom') {
    const now = new Date();
    const cutoffs = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
    const days = cutoffs[filters.datePreset];
    if (days) {
      const cutoff = new Date(now - days * 86400000).toISOString().slice(0, 10);
      data = data.filter(d => d.date >= cutoff);
    }
  }
  return data;
}

// ── Scenario builder ─────────────────────────────────────────────
function buildScenarios(r) {
  if (!r?.forecastData?.length) return null;
  const base = r.forecastData.map(d => ({ date: d.date, value: d.value }));
  return {
    base,
    bull: base.map(d => ({ ...d, value: Math.round(d.value * 1.20) })),
    bear: base.map(d => ({ ...d, value: Math.round(d.value * 0.80) })),
  };
}

// ── Segment Forecast ─────────────────────────────────────────────
function SegmentForecast({ results }) {
  const segments = results.breakdownData?.slice(0, 6) || [];
  const total = segments.reduce((s, d) => s + (d.value || 0), 0);
  const growth = results.growthRate;
  if (!segments.length) return <div className="text-sm text-white/25 text-center py-8">No segment data.</div>;
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Segment Growth Forecast</h3>
        <p className="text-xs text-white/35 mt-0.5">Projected contribution based on trend rate</p>
      </div>
      <div className="space-y-3">
        {segments.map((seg, i) => {
          const share = total > 0 ? (seg.value / total) * 100 : 0;
          const color = ['#a855f7','#00e5ff','#4ade80','#fbbf24','#f87171','#6b7280'][i] || '#6b7280';
          return (
            <motion.div key={seg.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
              <div className="flex items-center justify-between mb-1 text-xs">
                <span className="font-medium text-white/75 truncate max-w-32">{seg.name}</span>
                <div className="flex items-center gap-2 text-white/40">
                  <span className="font-mono">{share.toFixed(1)}%</span>
                  {growth != null && (
                    <span className={`font-mono text-xs px-1.5 py-0.5 rounded ${growth >= 0 ? 'text-green-400 bg-green-400/8' : 'text-red-400 bg-red-400/8'}`}>
                      {growth >= 0 ? '+' : ''}{growth?.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${share}%` }} transition={{ duration: 0.6, delay: i * 0.06 }}
                  className="h-full rounded-full" style={{ background: color }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── Correlation predictors ────────────────────────────────────────
function CorrelationPredictors({ correlations }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Leading Indicators & Predictors</h3>
        <p className="text-xs text-white/35 mt-0.5">Pearson correlations — variables most predictive of your KPI</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {correlations.slice(0, 6).map((c, i) => {
          const strength = Math.abs(c.r);
          const label = strength > 0.7 ? 'Strong' : strength > 0.4 ? 'Moderate' : 'Weak';
          const color = strength > 0.7 ? '#4ade80' : strength > 0.4 ? '#fbbf24' : '#6b7280';
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl p-3 border border-white/8 bg-white/2">
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color }}>{label}</span>
                <span className="font-mono text-xs font-bold" style={{ color }}>{c.r > 0 ? '+' : ''}{c.r}</span>
              </div>
              <div className="text-xs text-white/60 font-mono truncate">{c.colA.replace(/_/g, ' ')}</div>
              <div className="text-xs text-white/25 my-0.5">↕ {c.r > 0 ? 'positive' : 'negative'}</div>
              <div className="text-xs text-white/60 font-mono truncate">{c.colB.replace(/_/g, ' ')}</div>
              <div className="mt-2 h-1 rounded-full bg-white/5 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${strength * 100}%`, background: color }} />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ── No data state ─────────────────────────────────────────────────
function NoDataState() {
  return (
    <div className="max-w-7xl mx-auto px-8 py-20 flex flex-col items-center text-center">
      <div className="w-20 h-20 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mb-5">
        <Brain className="w-9 h-9 text-purple-400/60" />
      </div>
      <h2 className="text-xl font-bold mb-2">No Predictive Data Yet</h2>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        Upload a dataset and run AI analysis in the Workspace to unlock forecasting, trend projections, and anomaly predictions.
      </p>
      <Link to="/workspace"
        className="flex items-center gap-2 px-5 py-2.5 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-all">
        <Zap className="w-4 h-4" /> Open Workspace
      </Link>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-2xl opacity-30 pointer-events-none select-none">
        {['Revenue Forecast', 'Anomaly Detection', 'Trend Projection'].map(label => (
          <div key={label} className="glass-card rounded-2xl p-5 border border-white/8">
            <Sparkles className="w-5 h-5 text-purple-400 mb-3" />
            <div className="font-semibold text-sm mb-1">{label}</div>
            <div className="text-xs text-white/35">Run AI Analysis to unlock</div>
          </div>
        ))}
      </div>
    </div>
  );
}