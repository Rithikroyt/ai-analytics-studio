import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { TrendingUp, TrendingDown, AlertTriangle, Target, Lightbulb, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import SimpleChart from '@/components/charts/SimpleChart';
import SimpleBar from '@/components/charts/SimpleBar';

function KPICard({ label, value, change, color, format }) {
  const formatted = format === 'currency' 
    ? (value >= 1e6 ? `$${(value/1e6).toFixed(1)}M` : value >= 1e3 ? `$${(value/1e3).toFixed(0)}K` : `$${value}`)
    : value?.toLocaleString?.() ?? value;
  const isPositive = typeof change === 'string' && change.startsWith('+');
  
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/5 hover:border-white/10 transition-all">
      <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-black font-mono ${color}`}>{formatted}</div>
      {change && (
        <div className={`text-xs mt-2 flex items-center gap-1 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
          {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {change} vs prior period
        </div>
      )}
    </div>
  );
}

function InsightCard({ icon: IconComp, label, color, bg, children }) {
  const Icon = IconComp;
  return (
    <div className={`glass-card rounded-2xl p-5 border border-white/5`}>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      {children}
    </div>
  );
}

export default function StorySection() {
  const { analysisResults, getActiveTable, setActiveSection } = useWorkspaceStore();
  const activeTable = getActiveTable();

  if (!analysisResults || !activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Analysis Yet</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload data and run analysis to generate the story dashboard.</p>
        <div className="flex gap-3">
          <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
        </div>
      </div>
    );
  }

  const {
    tableName, primaryLabel, secondLabel, totalValue, secondValue,
    trendData, forecastData, breakdownData, anomalies, growthRate,
    executiveSummary, recommendations, canForecast, primaryMetric
  } = analysisResults;

  const formatValue = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v?.toLocaleString();
  const growthStr = growthRate != null ? `${growthRate > 0 ? '+' : ''}${growthRate}%` : null;

  const combinedTrend = [
    ...trendData.map(d => ({ ...d, isForecast: false })),
    ...forecastData.map(d => ({ ...d, isForecast: true })),
  ];

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Executive Dashboard</span>
              <span className="px-2 py-0.5 bg-green-400/10 border border-green-400/20 rounded-full text-xs text-green-400">Live</span>
            </div>
            <h1 className="text-2xl font-black">{tableName}</h1>
          </div>
          <button
            onClick={() => setActiveSection('workbook')}
            className="flex items-center gap-2 text-xs px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            Open Workbook <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* Executive insight */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-6 border border-cyan-400/15 bg-cyan-400/3"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Target className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-2">Executive Summary</div>
            <p className="text-sm leading-relaxed text-foreground/90">{executiveSummary}</p>
          </div>
        </div>
      </motion.div>

      {/* KPI Strip */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <KPICard label={primaryLabel || 'Total'} value={totalValue} change={growthStr} color="text-cyan-400" format="currency" />
        {secondLabel && <KPICard label={secondLabel} value={secondValue} color="text-teal-400" />}
        <KPICard label="Records Analyzed" value={activeTable.rowCount} color="text-blue-400" />
        <KPICard label="Quality Score" value={`${activeTable.qualityScore}%`} color={activeTable.qualityScore >= 90 ? 'text-green-400' : 'text-amber-400'} />
      </motion.div>

      {/* Main charts — What Happened */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-semibold">① What Happened</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {trendData.length > 1 && (
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <div className="text-sm font-semibold mb-1">{primaryLabel} Over Time</div>
              <div className="text-xs text-muted-foreground mb-4">
                {canForecast ? 'Historical trend + 6-month AI forecast' : 'Historical trend'}
                {growthStr && ` · ${growthStr} overall growth`}
              </div>
              <SimpleChart data={combinedTrend} height={200} />
            </div>
          )}
          {breakdownData.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/5">
              <div className="text-sm font-semibold mb-1">Breakdown by Segment</div>
              <div className="text-xs text-muted-foreground mb-4">Top contributors to total {primaryLabel?.toLowerCase()}</div>
              <SimpleBar data={breakdownData} height={200} />
            </div>
          )}
        </div>
      </motion.div>

      {/* Anomalies — Where the Risk Is */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-semibold">② Where the Risk Is</div>
        {anomalies.length > 0 ? (
          <InsightCard icon={AlertTriangle} label="Anomaly Detection" color="text-amber-400" bg="bg-amber-400/10">
            <div className="space-y-2">
              {anomalies.slice(0, 4).map((a, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                  <div>
                    <span className="text-sm font-mono">{a.date}</span>
                    <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${a.severity === 'high' ? 'bg-red-400/10 text-red-400' : 'bg-amber-400/10 text-amber-400'}`}>{a.severity}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{formatValue(a.value)}</div>
                    <div className="text-xs text-muted-foreground">expected {formatValue(a.expected)}</div>
                  </div>
                </div>
              ))}
            </div>
          </InsightCard>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-green-400/5 border border-green-400/20 rounded-xl">
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
            <span className="text-sm text-green-400">No significant anomalies detected. Data follows expected patterns.</span>
          </div>
        )}
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 font-semibold">③ What To Do Next</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations?.map((rec, i) => (
            <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${
              rec.priority === 'critical' ? 'bg-red-400/5 border-red-400/20' :
              rec.priority === 'high' ? 'bg-amber-400/5 border-amber-400/20' :
              rec.priority === 'medium' ? 'bg-blue-400/5 border-blue-400/20' :
              'bg-white/2 border-white/5'
            }`}>
              <Lightbulb className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                rec.priority === 'critical' ? 'text-red-400' :
                rec.priority === 'high' ? 'text-amber-400' :
                rec.priority === 'medium' ? 'text-blue-400' :
                'text-muted-foreground'
              }`} />
              <div>
                <span className={`text-xs font-semibold uppercase mr-2 ${
                  rec.priority === 'critical' ? 'text-red-400' :
                  rec.priority === 'high' ? 'text-amber-400' :
                  rec.priority === 'medium' ? 'text-blue-400' :
                  'text-muted-foreground'
                }`}>{rec.priority}</span>
                <span className="text-sm">{rec.action}</span>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* CTA to AI Analyst */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass-card rounded-2xl p-6 border border-purple-400/15 bg-purple-400/3 flex items-center justify-between"
      >
        <div>
          <div className="font-semibold mb-1">Have a specific question?</div>
          <div className="text-sm text-muted-foreground">Ask the AI Analyst — grounded answers from your data.</div>
        </div>
        <button onClick={() => setActiveSection('analyst')} className="flex items-center gap-2 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-sm font-semibold hover:bg-purple-400/20 transition-colors">
          Ask AI <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>
  );
}