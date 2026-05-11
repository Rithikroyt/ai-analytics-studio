/**
 * ExecutiveDashboard — Auto-populated KPI command center from saved AI charts.
 * Shows variance, growth trends, and executive-grade summaries.
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { fmtV } from '@/components/visualbuilder/VBChartPreview.jsx';
import {
  TrendingUp, TrendingDown, Minus, BarChart2, Sparkles, ArrowRight,
  Download, RefreshCw, Loader2, Target, AlertTriangle, CheckCircle2,
  Star, FileText
} from 'lucide-react';
import AnalystChart from '@/components/workspace/analyst/AnalystChart';

// Derive KPI stats from chart data
function deriveKPI(item) {
  const data = item.chart?.data || [];
  if (!data.length) return null;
  const vals = data.map(d => d.value || 0).filter(v => !isNaN(v));
  if (!vals.length) return null;
  const total = vals.reduce((a, b) => a + b, 0);
  const avg = total / vals.length;
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const top = data[0];
  // Simulate period-over-period: compare first half vs second half as a proxy for "change"
  const mid = Math.floor(vals.length / 2);
  const firstHalf = vals.slice(0, mid).reduce((a, b) => a + b, 0) || 0;
  const secondHalf = vals.slice(mid).reduce((a, b) => a + b, 0) || 0;
  const changeRaw = firstHalf > 0 ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
  const change = Math.round(changeRaw * 10) / 10;
  return { total, avg, max, min, top, change, count: vals.length };
}

function KPICard({ item, rank }) {
  const kpi = useMemo(() => deriveKPI(item), [item]);
  if (!kpi) return null;

  const isPositive = kpi.change > 0;
  const isFlat = Math.abs(kpi.change) < 1;
  const TrendIcon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;
  const trendColor = isFlat ? 'text-white/30' : isPositive ? 'text-green-400' : 'text-red-400';
  const trendBg = isFlat ? 'bg-white/5' : isPositive ? 'bg-green-400/10' : 'bg-red-400/10';

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: rank * 0.05 }}
      className="glass-card rounded-2xl border border-white/8 p-5 flex flex-col gap-4 hover:border-white/15 transition-all">

      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-0.5">{item.datasetName || 'Dataset'}</div>
          <div className="font-bold text-sm truncate">{item.label || item.chart?.title || 'KPI'}</div>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${trendBg} ${trendColor}`}>
          <TrendIcon className="w-3 h-3" />
          {isFlat ? '—' : `${isPositive ? '+' : ''}${kpi.change}%`}
        </div>
      </div>

      {/* Big number */}
      <div>
        <div className="text-3xl font-black font-mono" style={{ color: item.chart?.color_theme || '#00e5ff' }}>
          {fmtV(kpi.total)}
        </div>
        <div className="text-xs text-white/25 mt-1 flex items-center gap-3 flex-wrap">
          <span>Avg {fmtV(Math.round(kpi.avg))}</span>
          <span>Max {fmtV(kpi.max)}</span>
          <span>{kpi.count} points</span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="h-[100px]">
        <AnalystChart chart={item.chart} height={100} />
      </div>

      {/* Top value */}
      {kpi.top && (
        <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-white/3 border border-white/6 text-xs">
          <Star className="w-3 h-3 text-yellow-400 flex-shrink-0" />
          <span className="flex-1 truncate text-white/50"># 1: {kpi.top.name}</span>
          <span className="font-mono font-bold" style={{ color: item.chart?.color_theme || '#00e5ff' }}>{fmtV(kpi.top.value)}</span>
        </div>
      )}

      {/* Insight */}
      {item.insight && (
        <p className="text-xs text-white/30 leading-relaxed italic line-clamp-2 border-t border-white/5 pt-2">{item.insight}</p>
      )}
    </motion.div>
  );
}

function ExecutiveSummaryBanner({ charts, analysisResults }) {
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const kpiLines = charts.slice(0, 8).map(c => {
        const kpi = deriveKPI(c);
        return kpi ? `${c.label}: total=${fmtV(kpi.total)}, change=${kpi.change > 0 ? '+' : ''}${kpi.change}%` : null;
      }).filter(Boolean).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        model: 'claude_sonnet_4_6',
        prompt: `Write a 3-sentence executive briefing for a CEO based on these KPIs.
Use specific numbers. Focus on: (1) top performance driver, (2) biggest concern, (3) recommended priority action.
Be direct, no filler words.

KPIs:
${kpiLines}

Analysis context: ${analysisResults?.executiveSummary || 'none'}`,
      });
      setSummary(result);
    } catch { setSummary('Generate KPI summary by clicking Refresh.'); }
    setLoading(false);
  };

  return (
    <div className="glass-card rounded-2xl border border-cyan-400/15 p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-sm">CEO Briefing</span>
        </div>
        <button onClick={generate} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {loading ? 'Generating…' : summary ? 'Refresh' : 'Generate Summary'}
        </button>
      </div>
      {summary ? (
        <p className="text-sm text-white/65 leading-relaxed">{summary}</p>
      ) : (
        <p className="text-sm text-white/25 italic">Click "Generate Summary" for an AI-written CEO briefing based on all your KPIs.</p>
      )}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const { savedCharts, analysisResults, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [sortBy, setSortBy] = useState('recent');

  const sortedCharts = useMemo(() => {
    const c = [...savedCharts];
    if (sortBy === 'value') {
      return c.sort((a, b) => {
        const kA = deriveKPI(a)?.total || 0;
        const kB = deriveKPI(b)?.total || 0;
        return kB - kA;
      });
    }
    if (sortBy === 'growth') {
      return c.sort((a, b) => {
        const kA = deriveKPI(a)?.change || 0;
        const kB = deriveKPI(b)?.change || 0;
        return kB - kA;
      });
    }
    return c; // recent
  }, [savedCharts, sortBy]);

  // Aggregate stats
  const totalKPIs = savedCharts.length;
  const growingKPIs = savedCharts.filter(c => (deriveKPI(c)?.change || 0) > 0).length;
  const decliningKPIs = savedCharts.filter(c => (deriveKPI(c)?.change || 0) < -1).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-5 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Executive Dashboard</h1>
              <p className="text-xs text-muted-foreground">Auto-populated from AI-generated charts · {totalKPIs} KPIs</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* KPI status pills */}
            <div className="flex items-center gap-2 text-xs">
              {growingKPIs > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-400/10 border border-green-400/20 text-green-400">
                  <TrendingUp className="w-3 h-3" /> {growingKPIs} growing
                </span>
              )}
              {decliningKPIs > 0 && (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-400/10 border border-red-400/20 text-red-400">
                  <TrendingDown className="w-3 h-3" /> {decliningKPIs} declining
                </span>
              )}
            </div>

            {/* Sort */}
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-muted-foreground focus:outline-none focus:border-cyan-400/30">
              <option value="recent">Most Recent</option>
              <option value="value">Highest Value</option>
              <option value="growth">Highest Growth</option>
            </select>

            <Link to="/workspace" className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <BarChart2 className="w-3.5 h-3.5" /> Add Charts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {savedCharts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Target className="w-14 h-14 text-white/10 mb-4" />
            <h2 className="text-xl font-bold mb-2">No KPIs Yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
              Use the AI Visual Builder to generate charts, then click "Save to Dashboard." They'll auto-populate here with growth trends.
            </p>
            <Link to="/workspace"
              className="flex items-center gap-2 px-6 py-3 bg-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Sparkles className="w-4 h-4" /> Open Visual Builder <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <>
            {/* CEO Briefing */}
            <ExecutiveSummaryBanner charts={savedCharts} analysisResults={analysisResults} />

            {/* Summary stats row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total KPIs', value: totalKPIs, icon: BarChart2, color: '#00e5ff', bg: 'rgba(0,229,255,0.1)' },
                { label: 'Growing', value: growingKPIs, icon: TrendingUp, color: '#4caf50', bg: 'rgba(76,175,80,0.1)' },
                { label: 'Need Attention', value: decliningKPIs, icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
              ].map((s, i) => (
                <div key={i} className="glass-card rounded-2xl border border-white/8 p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: s.bg }}>
                    <s.icon className="w-5 h-5" style={{ color: s.color }} />
                  </div>
                  <div>
                    <div className="text-2xl font-black font-mono" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-xs text-white/35">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {sortedCharts.map((item, i) => (
                <KPICard key={item.id} item={item} rank={i} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}