/**
 * DataReadinessPanel — Real-time quality scoring using the spec formula
 * QualityScore = 0.30*Completeness + 0.25*Validity + 0.20*Uniqueness + 0.15*Consistency + 0.10*Timeliness
 * ReadinessScore = 0.25*QualityScore + 0.20*KPIFieldAvailability + 0.20*DateFieldAvailability
 *                + 0.15*DimensionAvailability + 0.10*SampleSizeStrength + 0.10*SemanticMetricCoverage
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Calendar, Layers, BarChart2 } from 'lucide-react';

const METRIC_PATTERNS = ['revenue', 'sales', 'cost', 'profit', 'margin', 'amount', 'value', 'budget', 'actual', 'spend', 'income', 'count', 'qty', 'quantity', 'score', 'rate'];
const DATE_PATTERNS = ['date', 'time', 'month', 'year', 'quarter', 'week', 'period', 'created_at', 'updated_at', 'timestamp'];
const DIM_PATTERNS = ['region', 'country', 'city', 'department', 'category', 'channel', 'segment', 'type', 'status', 'group', 'tier'];

function computeQualityBreakdown(rows, columns) {
  if (!rows?.length || !columns?.length) return { overall: 0, completeness: 0, validity: 0, uniqueness: 0, consistency: 0, timeliness: 0 };

  const total = rows.length * columns.length;

  // Completeness
  let nullCount = 0;
  columns.forEach(col => {
    rows.forEach(row => {
      const v = row[col.name];
      if (v == null || v === '' || v === 'N/A' || v === 'null') nullCount++;
    });
  });
  const completeness = Math.max(0, 1 - nullCount / total);

  // Validity — numeric cols that parse correctly
  const numericCols = columns.filter(c => c.type === 'numeric');
  let validCount = 0, numericTotal = 0;
  numericCols.forEach(col => {
    rows.forEach(row => {
      const v = row[col.name];
      if (v != null && v !== '') {
        numericTotal++;
        if (!isNaN(parseFloat(v))) validCount++;
      }
    });
  });
  const validity = numericTotal > 0 ? validCount / numericTotal : 0.9;

  // Uniqueness
  const serialized = rows.slice(0, 500).map(r => JSON.stringify(r));
  const uniqueRate = new Set(serialized).size / serialized.length;
  const uniqueness = uniqueRate;

  // Consistency — check categorical columns for mixed casing
  const catCols = columns.filter(c => c.type === 'category' || c.type === 'string').slice(0, 5);
  let consistentCount = 0, catTotal = 0;
  catCols.forEach(col => {
    const values = rows.map(r => String(r[col.name] || '')).filter(v => v);
    const unique = new Set(values.map(v => v.toLowerCase())).size;
    const displayed = new Set(values).size;
    catTotal++;
    if (displayed <= unique * 1.3) consistentCount++; // tolerance for slight variance
  });
  const consistency = catTotal > 0 ? consistentCount / catTotal : 0.85;

  // Timeliness — check if date column has recent records
  const dateCols = columns.filter(c => DATE_PATTERNS.some(p => c.name.toLowerCase().includes(p)));
  let timeliness = 0.7;
  if (dateCols.length > 0) {
    const dateVals = rows.map(r => new Date(r[dateCols[0].name])).filter(d => !isNaN(d));
    if (dateVals.length > 0) {
      const maxDate = new Date(Math.max(...dateVals));
      const monthsOld = (Date.now() - maxDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
      timeliness = monthsOld < 6 ? 1.0 : monthsOld < 12 ? 0.85 : monthsOld < 24 ? 0.70 : 0.50;
    }
  }

  const overall = 0.30 * completeness + 0.25 * validity + 0.20 * uniqueness + 0.15 * consistency + 0.10 * timeliness;

  return {
    overall: Math.round(overall * 100),
    completeness: Math.round(completeness * 100),
    validity: Math.round(validity * 100),
    uniqueness: Math.round(uniqueness * 100),
    consistency: Math.round(consistency * 100),
    timeliness: Math.round(timeliness * 100),
  };
}

function computeReadinessBreakdown(rows, columns, qualityScore) {
  const colNames = columns.map(c => c.name.toLowerCase());

  // KPI Field Availability
  const kpiCols = colNames.filter(n => METRIC_PATTERNS.some(p => n.includes(p)));
  const kpiAvail = Math.min(kpiCols.length / 2, 1.0);

  // Date Field Availability
  const dateCols = colNames.filter(n => DATE_PATTERNS.some(p => n.includes(p)));
  const dateAvail = dateCols.length > 0 ? 1.0 : 0.0;

  // Dimension Availability
  const dimCols = colNames.filter(n => DIM_PATTERNS.some(p => n.includes(p)));
  const dimAvail = Math.min(dimCols.length / 2, 1.0);

  // Sample Size
  const sampleStrength = rows.length >= 10000 ? 1.0 : rows.length >= 1000 ? 0.85 : rows.length >= 100 ? 0.65 : 0.35;

  // Semantic metric coverage (approx)
  const semanticCoverage = (kpiCols.length > 0 ? 0.6 : 0) + (dateCols.length > 0 ? 0.2 : 0) + (dimCols.length > 0 ? 0.2 : 0);

  const overall = 0.25 * (qualityScore / 100) + 0.20 * kpiAvail + 0.20 * dateAvail + 0.15 * dimAvail + 0.10 * sampleStrength + 0.10 * semanticCoverage;

  return {
    overall: Math.round(overall * 100),
    kpiAvail: Math.round(kpiAvail * 100),
    dateAvail: Math.round(dateAvail * 100),
    dimAvail: Math.round(dimAvail * 100),
    sampleStrength: Math.round(sampleStrength * 100),
    semanticCoverage: Math.round(semanticCoverage * 100),
    kpiCols: kpiCols.slice(0, 4),
    dateCols: dateCols.slice(0, 3),
    dimCols: dimCols.slice(0, 4),
  };
}

function ScoreBar({ value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const barColor = color || (value >= 80 ? '#4ade80' : value >= 60 ? '#fbbf24' : '#f87171');
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1 bg-white/8 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ background: barColor }} />
      </div>
      <span className="text-xs font-mono w-6 text-right" style={{ color: barColor }}>{value}</span>
    </div>
  );
}

export default function DataReadinessPanel({ table }) {
  const quality = useMemo(() => computeQualityBreakdown(table?.rows, table?.columns), [table?.id]);
  const readiness = useMemo(() => computeReadinessBreakdown(table?.rows, table?.columns, quality.overall), [table?.id, quality.overall]);

  if (!table) return null;

  const readinessStatus = readiness.overall >= 80 ? 'Ready for Full Analysis' : readiness.overall >= 60 ? 'Partial Analysis Ready' : 'Data Preparation Required';
  const readinessColor = readiness.overall >= 80 ? 'text-green-400' : readiness.overall >= 60 ? 'text-amber-400' : 'text-red-400';

  return (
    <div className="glass rounded-xl border border-white/8 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-bold">Data Readiness</span>
        </div>
        <span className={`text-xs font-semibold ${readinessColor}`}>{readinessStatus}</span>
      </div>

      {/* Dual Score Display */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
          <div className="text-2xl font-black text-cyan-400 mb-1">{quality.overall}</div>
          <div className="text-xs text-white/40">Quality Score</div>
        </div>
        <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
          <div className={`text-2xl font-black mb-1 ${readinessColor}`}>{readiness.overall}</div>
          <div className="text-xs text-white/40">Analysis Readiness</div>
        </div>
      </div>

      {/* Quality Breakdown */}
      <div className="space-y-2">
        <div className="text-xs text-white/30 uppercase tracking-widest">Quality Dimensions</div>
        {[
          ['Completeness', quality.completeness, '30%'],
          ['Validity', quality.validity, '25%'],
          ['Uniqueness', quality.uniqueness, '20%'],
          ['Consistency', quality.consistency, '15%'],
          ['Timeliness', quality.timeliness, '10%'],
        ].map(([label, val, weight]) => (
          <div key={label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">{label} <span className="text-white/25">({weight})</span></span>
            </div>
            <ScoreBar value={val} />
          </div>
        ))}
      </div>

      {/* Readiness Drivers */}
      <div className="space-y-2 border-t border-white/8 pt-3">
        <div className="text-xs text-white/30 uppercase tracking-widest">Readiness Drivers</div>
        {[
          ['KPI Fields Available', readiness.kpiAvail, readiness.kpiCols],
          ['Date Fields Available', readiness.dateAvail, readiness.dateCols],
          ['Dimension Fields', readiness.dimAvail, readiness.dimCols],
          ['Sample Size', readiness.sampleStrength, [`${table.rowCount?.toLocaleString()} rows`]],
        ].map(([label, val, cols]) => (
          <div key={label} className="space-y-0.5">
            <div className="flex justify-between text-xs">
              <span className="text-white/50">{label}</span>
            </div>
            <ScoreBar value={val} />
            {cols?.length > 0 && <div className="text-xs text-white/25 truncate">{cols.join(', ')}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}