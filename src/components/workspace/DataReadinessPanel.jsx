/**
 * DataReadinessPanel — Phase 2/4: Dataset readiness for AI, KPI, and time-series analysis
 * DataReadinessScore = 0.4*contractPassRate + 0.3*qualityScore + 0.2*kpiReadiness + 0.1*relationshipReadiness
 */
import { useState, useMemo } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { CheckCircle2, AlertTriangle, XCircle, TrendingUp, Target, Calendar, Database } from 'lucide-react';

// Helper: Icon wrapper used in ReadinessBar
function IconWrapper({ icon: IconComp, style }) {
  return IconComp ? <IconComp className="w-3 h-3" style={style} /> : null;
}
import { motion } from 'framer-motion';

function ReadinessBar({ label, value, color, icon: IconComp }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-white/50">
          {IconComp && <IconComp className="w-3 h-3" style={{ color }} />}
          {label}
        </div>
        <span className="font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

function ReadinessCheck({ label, passed, note }) {
  return (
    <div className="flex items-start gap-2 text-xs py-1.5 border-b border-white/5">
      {passed === true ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0 mt-0.5" />
        : passed === false ? <XCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
        : <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />}
      <div>
        <div className="text-white/65">{label}</div>
        {note && <div className="text-white/30 mt-0.5">{note}</div>}
      </div>
    </div>
  );
}

export default function DataReadinessPanelComponent() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();

  const readiness = useMemo(() => {
    if (!table?.columns?.length) return null;
    const cols = table.columns;
    const rows = table.rows || [];

    // KPI readiness: has numeric cols that are safe to aggregate
    const numericCols = cols.filter(c => c.type === 'numeric' || c.inferredType === 'numeric');
    const hasRevenueCols = numericCols.some(c => /revenue|sales|amount|cost|price|profit|margin/.test(c.name.toLowerCase()));
    const hasCountCols = numericCols.some(c => /count|qty|quantity|num_|total/.test(c.name.toLowerCase()));
    const kpiReadiness = Math.min(100, numericCols.length * 20 + (hasRevenueCols ? 30 : 0) + (hasCountCols ? 20 : 0));

    // Time-series readiness: has date column + enough rows
    const dateCols = cols.filter(c => c.type === 'date' || c.inferredType === 'date' || c.name.toLowerCase().includes('date'));
    const tsReadiness = dateCols.length > 0 ? Math.min(100, 50 + (rows.length >= 100 ? 30 : rows.length / 100 * 30) + 20) : 10;

    // AI readiness: quality score + sufficient rows
    const qualityScore = table.qualityScore || 75;
    const aiReadiness = Math.round(0.5 * qualityScore + 0.3 * Math.min(100, rows.length / 10) + 0.2 * (dateCols.length > 0 ? 90 : 50));

    // Overall DataReadinessScore
    const overallScore = Math.round(0.4 * Math.min(100, aiReadiness) + 0.3 * qualityScore + 0.2 * kpiReadiness + 0.1 * tsReadiness);

    const checks = [
      { label: 'Numeric/financial columns present', passed: numericCols.length > 0, note: numericCols.length === 0 ? 'No numeric columns detected' : `${numericCols.length} found: ${numericCols.slice(0,3).map(c=>c.name).join(', ')}` },
      { label: 'Revenue/financial metrics detected', passed: hasRevenueCols, note: hasRevenueCols ? 'Revenue-type columns found' : 'No revenue/cost columns found — add financial data for CFO analysis' },
      { label: 'Date column available for trending', passed: dateCols.length > 0, note: dateCols.length > 0 ? `Date column: ${dateCols[0].name}` : 'No date column — time-series forecasting not available' },
      { label: 'Sufficient rows for analysis', passed: rows.length >= 100 ? true : rows.length >= 20 ? null : false, note: `${rows.length.toLocaleString()} rows — recommend 100+ for reliable AI answers` },
      { label: 'Category dimensions for segmentation', passed: cols.some(c => c.type === 'category' || c.inferredType === 'category'), note: cols.filter(c => c.type === 'category').slice(0,2).map(c=>c.name).join(', ') || 'No category columns' },
      { label: 'Data quality acceptable (≥70%)', passed: qualityScore >= 70 ? true : qualityScore >= 50 ? null : false, note: `Quality score: ${qualityScore}%` },
    ];

    return { overallScore, kpiReadiness, tsReadiness, aiReadiness, qualityScore, checks, numericCols, dateCols };
  }, [table]);

  if (!table || !readiness) return null;

  const scoreColor = readiness.overallScore >= 80 ? '#4ade80' : readiness.overallScore >= 60 ? '#fbbf24' : '#f87171';
  const scoreLabel = readiness.overallScore >= 80 ? 'Analysis-Ready' : readiness.overallScore >= 60 ? 'Partially Ready' : 'Needs Improvement';

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold">Data Readiness</span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: scoreColor }}>{readiness.overallScore}%</div>
          <div className="text-xs" style={{ color: scoreColor }}>{scoreLabel}</div>
        </div>
      </div>

      <div className="space-y-2.5">
        <ReadinessBar label="AI Analysis Readiness" value={readiness.aiReadiness} color="#00e5ff" icon={Target} />
        <ReadinessBar label="KPI / Financial Metrics" value={readiness.kpiReadiness} color="#a855f7" icon={TrendingUp} />
        <ReadinessBar label="Time-Series Readiness" value={readiness.tsReadiness} color="#4ade80" icon={Calendar} />
        <ReadinessBar label="Data Quality Score" value={readiness.qualityScore} color="#fbbf24" icon={CheckCircle2} />
      </div>

      <div className="space-y-0 border-t border-white/8 pt-3">
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Readiness Checks</div>
        {readiness.checks.map((c, i) => <ReadinessCheck key={i} {...c} />)}
      </div>

      <div className="text-xs text-white/25 pt-1 font-mono">
        Score = 0.40×AIReadiness + 0.30×QualityScore + 0.20×KPIReadiness + 0.10×TimeSeriesReadiness
      </div>
    </div>
  );
}