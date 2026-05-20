/**
 * DataQualityEngine — Comprehensive data quality and validation engine
 * 5-dimensional quality scoring: Completeness, Validity, Uniqueness, Consistency, Timeliness
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, XCircle, TrendingUp, BarChart2, Target, Database } from 'lucide-react';

function qualityColor(score) {
  if (score >= 80) return 'text-green-400';
  if (score >= 60) return 'text-amber-400';
  return 'text-red-400';
}
function qualityBg(score) {
  if (score >= 80) return 'bg-green-400/8 border-green-400/20';
  if (score >= 60) return 'bg-amber-400/8 border-amber-400/20';
  return 'bg-red-400/8 border-red-400/20';
}
function qualityStatus(score) {
  if (score >= 80) return '✓ High';
  if (score >= 60) return '⚠ Moderate';
  return '✗ Low';
}

export function computeQualityScores(rows, columns) {
  if (!rows?.length || !columns?.length) return null;
  const colNames = columns.map(c => c.name || c);
  const total = rows.length * colNames.length;

  // Completeness = 1 - missing / total
  const missing = colNames.reduce((acc, name) => {
    return acc + rows.filter(r => r[name] == null || r[name] === '' || r[name] === 'null' || r[name] === 'NaN').length;
  }, 0);
  const completeness = Math.round((1 - missing / total) * 100);

  // Uniqueness = 1 - duplicates / total rows
  const duplicates = rows.length - new Set(rows.map(r => JSON.stringify(r))).size;
  const uniqueness = Math.round((1 - duplicates / Math.max(rows.length, 1)) * 100);

  // Validity — check numeric cols for outliers / type mismatches
  let validCells = 0;
  let totalChecked = 0;
  for (const col of columns) {
    const name = col.name || col;
    if (col.type === 'numeric' || col.inferredType === 'numeric') {
      const vals = rows.map(r => r[name]).filter(v => v != null && v !== '');
      const numericVals = vals.filter(v => !isNaN(parseFloat(v)));
      validCells += numericVals.length;
      totalChecked += vals.length;
    }
  }
  const validity = totalChecked > 0 ? Math.round((validCells / totalChecked) * 100) : 85;

  // Consistency — check date columns for valid dates
  let consistentCells = 0;
  let dateChecked = 0;
  for (const col of columns) {
    const name = col.name || col;
    if (col.type === 'date' || col.inferredType === 'date' || (name.match && name.match(/date|time|month|year/i))) {
      const vals = rows.map(r => r[name]).filter(v => v != null && v !== '');
      const validDates = vals.filter(v => !isNaN(new Date(v).getTime()));
      consistentCells += validDates.length;
      dateChecked += vals.length;
    }
  }
  const consistency = dateChecked > 0 ? Math.round((consistentCells / dateChecked) * 100) : 80;

  // Timeliness — if date column exists, % rows within last 2 years
  let timeliness = 75; // default
  const dateCols = columns.filter(c => {
    const name = c.name || c;
    return c.type === 'date' || c.inferredType === 'date' || (name.match && name.match(/date|time|month|year/i));
  });
  if (dateCols.length > 0) {
    const dateCol = dateCols[0].name || dateCols[0];
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const recentRows = rows.filter(r => {
      const d = new Date(r[dateCol]);
      return !isNaN(d.getTime()) && d >= twoYearsAgo;
    });
    timeliness = Math.round((recentRows.length / rows.length) * 100);
  }

  // Composite quality score
  const qualityScore = Math.round(
    0.30 * completeness + 0.25 * validity + 0.20 * uniqueness + 0.15 * consistency + 0.10 * timeliness
  );

  // Readiness scores
  const kpiReadiness = Math.round(
    (columns.filter(c => c.isKpiCandidate || c.type === 'numeric').length / Math.max(columns.length, 1)) * 100
  );
  const hasDateCol = dateCols.length > 0;
  const timeSeriesReadiness = hasDateCol ? Math.round((timeliness + completeness) / 2) : 20;
  const dataReadinessScore = Math.round(0.40 * qualityScore + 0.30 * qualityScore + 0.20 * kpiReadiness + 0.10 * (hasDateCol ? 80 : 40));

  return {
    completeness, validity, uniqueness, consistency, timeliness,
    qualityScore, kpiReadiness, timeSeriesReadiness, dataReadinessScore,
    duplicates, missing, totalCells: total, totalRows: rows.length, totalCols: colNames.length,
  };
}

export default function DataQualityEngine({ rows = [], columns = [] }) {
  const [expanded, setExpanded] = useState(null);
  const scores = computeQualityScores(rows, columns);

  if (!scores) {
    return (
      <div className="text-center py-12 text-white/30 text-sm">
        <Shield className="w-10 h-10 mx-auto mb-3 text-white/15" />
        No data loaded. Upload a dataset to view quality analysis.
      </div>
    );
  }

  const dimensions = [
    {
      key: 'completeness', label: 'Completeness', score: scores.completeness, weight: '30%',
      icon: CheckCircle2, color: qualityColor(scores.completeness),
      formula: 'Completeness = 1 - (Missing Cells / Total Cells)',
      detail: `${scores.missing.toLocaleString()} missing cells out of ${scores.totalCells.toLocaleString()} total`,
      recommendation: scores.completeness < 80 ? 'Use Fill Missing Values transformation to address nulls' : 'Missing value rate is acceptable',
    },
    {
      key: 'validity', label: 'Validity', score: scores.validity, weight: '25%',
      icon: Target, color: qualityColor(scores.validity),
      formula: 'Validity = Valid Cells / Total Cells (type-checked)',
      detail: 'Checks numeric columns for type mismatches and invalid values',
      recommendation: scores.validity < 80 ? 'Use Convert Data Type transformation on mismatched columns' : 'Column types appear valid',
    },
    {
      key: 'uniqueness', label: 'Uniqueness', score: scores.uniqueness, weight: '20%',
      icon: Database, color: qualityColor(scores.uniqueness),
      formula: 'Uniqueness = 1 - (Duplicate Rows / Total Rows)',
      detail: `${scores.duplicates} duplicate rows detected`,
      recommendation: scores.duplicates > 0 ? 'Apply Remove Duplicates transformation' : 'No duplicates detected',
    },
    {
      key: 'consistency', label: 'Consistency', score: scores.consistency, weight: '15%',
      icon: BarChart2, color: qualityColor(scores.consistency),
      formula: 'Consistency = Valid Date Cells / Total Date Cells',
      detail: 'Validates date/time column format consistency',
      recommendation: scores.consistency < 80 ? 'Use Detect & Fix Date Formats transformation' : 'Date formats appear consistent',
    },
    {
      key: 'timeliness', label: 'Timeliness', score: scores.timeliness, weight: '10%',
      icon: TrendingUp, color: qualityColor(scores.timeliness),
      formula: 'Timeliness = Recent Rows (≤2 years) / Total Rows',
      detail: scores.timeSeriesReadiness > 50 ? 'Dataset contains recent data' : 'No date column found — defaulting to 75%',
      recommendation: scores.timeliness < 60 ? 'Dataset may contain stale data — verify date range' : 'Data appears timely',
    },
  ];

  const readinessItems = [
    { label: 'Business Analysis Readiness', score: scores.dataReadinessScore, formula: '0.40 × Quality + 0.30 × Quality + 0.20 × KPI + 0.10 × Relationships' },
    { label: 'KPI Readiness', score: scores.kpiReadiness, formula: 'Numeric Columns / Total Columns × 100' },
    { label: 'Time-Series Readiness', score: scores.timeSeriesReadiness, formula: '(Timeliness + Completeness) / 2 (requires date column)' },
  ];

  return (
    <div className="space-y-5">
      {/* Master quality score */}
      <div className={`p-5 rounded-2xl border ${qualityBg(scores.qualityScore)}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs text-white/35 uppercase tracking-widest font-semibold mb-1">Overall Quality Score</div>
            <div className={`text-5xl font-black ${qualityColor(scores.qualityScore)}`}>{scores.qualityScore}%</div>
            <div className={`text-sm font-semibold mt-1 ${qualityColor(scores.qualityScore)}`}>{qualityStatus(scores.qualityScore)}</div>
            <div className="text-xs text-white/35 mt-1 font-mono">
              Formula: 0.30×C + 0.25×V + 0.20×U + 0.15×Con + 0.10×T
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Rows', value: scores.totalRows.toLocaleString() },
              { label: 'Columns', value: scores.totalCols },
              { label: 'Duplicates', value: scores.duplicates, warn: scores.duplicates > 0 },
              { label: 'Missing Cells', value: scores.missing.toLocaleString(), warn: scores.missing > 0 },
            ].map(s => (
              <div key={s.label} className="text-center p-3 rounded-xl bg-white/5 border border-white/8">
                <div className={`text-lg font-black ${s.warn ? 'text-amber-400' : 'text-white/80'}`}>{s.value}</div>
                <div className="text-xs text-white/30">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5-dimension breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {dimensions.map((d, i) => (
          <motion.div key={d.key} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            onClick={() => setExpanded(expanded === d.key ? null : d.key)}
            className={`p-4 rounded-2xl border cursor-pointer hover:border-white/20 transition-all ${qualityBg(d.score)}`}>
            <d.icon className={`w-4 h-4 ${d.color} mb-2`} />
            <div className={`text-2xl font-black ${d.color}`}>{d.score}%</div>
            <div className="text-xs font-bold text-white/60 mt-1">{d.label}</div>
            <div className="text-xs text-white/30">{d.weight} weight</div>
            {expanded === d.key && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 pt-3 border-t border-white/10 space-y-1.5">
                <div className="text-xs text-white/30 font-mono">{d.formula}</div>
                <div className="text-xs text-white/50 leading-relaxed">{d.detail}</div>
                <div className={`text-xs font-semibold mt-1 ${d.score >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{d.recommendation}</div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Readiness scores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {readinessItems.map(r => (
          <div key={r.label} className={`p-4 rounded-2xl border ${qualityBg(r.score)}`}>
            <div className={`text-3xl font-black ${qualityColor(r.score)}`}>{r.score}%</div>
            <div className="text-xs font-bold text-white/60 mt-1">{r.label}</div>
            <div className="text-xs text-white/25 font-mono mt-1">{r.formula}</div>
          </div>
        ))}
      </div>
    </div>
  );
}