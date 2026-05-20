import { Shield, CheckCircle2, AlertTriangle, XCircle, TrendingUp, Calendar, Hash, Layers } from 'lucide-react';

const SCORE_DIMS = [
  { key: 'completeness', label: 'Completeness', desc: '1 - Missing / Total', weight: '30%', color: 'cyan', formula: '1 - MissingCells / TotalCells' },
  { key: 'validity', label: 'Validity', desc: 'Valid / Total cells', weight: '25%', color: 'purple', formula: 'ValidCells / TotalCells' },
  { key: 'uniqueness', label: 'Uniqueness', desc: '1 - Duplicates / Rows', weight: '20%', color: 'green', formula: '1 - DuplicateRows / TotalRows' },
  { key: 'consistency', label: 'Consistency', desc: 'Standardized / Total', weight: '15%', color: 'amber', formula: 'StandardizedCells / TotalCells' },
  { key: 'timeliness', label: 'Timeliness', desc: 'Recent / Total rows', weight: '10%', color: 'teal', formula: 'RecentRows / TotalRows' },
];

const COLOR_MAP = {
  cyan: { bar: 'bg-cyan-400', text: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/8' },
  purple: { bar: 'bg-purple-400', text: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8' },
  green: { bar: 'bg-green-400', text: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8' },
  amber: { bar: 'bg-amber-400', text: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/8' },
  teal: { bar: 'bg-teal-400', text: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/8' },
};

function scoreColor(s) {
  return s >= 80 ? 'text-green-400' : s >= 60 ? 'text-amber-400' : 'text-red-400';
}
function scoreBg(s) {
  return s >= 80 ? 'bg-green-400/10 border-green-400/20' : s >= 60 ? 'bg-amber-400/10 border-amber-400/20' : 'bg-red-400/10 border-red-400/20';
}

export default function QualityScoreCard({ scores, columns = [], warnings = [] }) {
  if (!scores) return (
    <div className="flex items-center justify-center py-20 text-sm text-white/30">
      Upload a dataset to see quality scores
    </div>
  );

  const kpiCols = columns.filter(c => c.isKpiCandidate);
  const dateCols = columns.filter(c => c.isDateCandidate);
  const dimCols = columns.filter(c => c.isDimensionCandidate);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Master scores */}
      <div className="grid grid-cols-2 gap-4">
        <div className={`p-6 rounded-2xl border ${scoreBg(scores.qualityScore)}`}>
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Overall Quality Score</div>
          <div className={`text-5xl font-black ${scoreColor(scores.qualityScore)}`}>{scores.qualityScore}<span className="text-2xl">%</span></div>
          <div className="text-xs text-white/30 mt-2 font-mono">0.30×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.15×Consistency + 0.10×Timeliness</div>
        </div>
        <div className={`p-6 rounded-2xl border ${scoreBg(scores.readinessScore)}`}>
          <div className="text-xs text-white/40 uppercase tracking-widest mb-2">Data Readiness Score</div>
          <div className={`text-5xl font-black ${scoreColor(scores.readinessScore)}`}>{scores.readinessScore}<span className="text-2xl">%</span></div>
          <div className="text-xs text-white/30 mt-2 font-mono">0.40×ContractPass + 0.30×Quality + 0.20×KPIReadiness + 0.10×Relationships</div>
        </div>
      </div>

      {/* Dimension scores */}
      <div className="rounded-2xl border border-white/8 bg-white/2 p-5 space-y-4">
        <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest">Quality Dimensions</h3>
        {SCORE_DIMS.map(dim => {
          const val = scores[dim.key] ?? 0;
          const pct = Math.round(val * 100);
          const c = COLOR_MAP[dim.color];
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${c.text}`}>{dim.label}</span>
                  <span className="text-xs text-white/25">{dim.weight}</span>
                  <span className="text-xs text-white/20 font-mono">{dim.formula}</span>
                </div>
                <span className={`text-sm font-black ${c.text}`}>{pct}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/8 overflow-hidden">
                <div className={`h-full rounded-full ${c.bar} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics readiness */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white/60">KPI Candidates</span>
          </div>
          {kpiCols.length > 0 ? kpiCols.map(c => (
            <div key={c.columnName} className="text-xs text-cyan-400 font-mono py-0.5">{c.columnName}</div>
          )) : <div className="text-xs text-white/25">None detected</div>}
        </div>
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-semibold text-white/60">Date Dimensions</span>
          </div>
          {dateCols.length > 0 ? dateCols.map(c => (
            <div key={c.columnName} className="text-xs text-purple-400 font-mono py-0.5">{c.columnName}</div>
          )) : <div className="text-xs text-white/25">None detected</div>}
        </div>
        <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
          <div className="flex items-center gap-2 mb-3">
            <Layers className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-white/60">Dimension Columns</span>
          </div>
          {dimCols.length > 0 ? dimCols.map(c => (
            <div key={c.columnName} className="text-xs text-amber-400 font-mono py-0.5">{c.columnName}</div>
          )) : <div className="text-xs text-white/25">None detected</div>}
        </div>
      </div>

      {/* Warnings */}
      {warnings?.length > 0 && (
        <div className="rounded-2xl border border-amber-400/15 bg-amber-400/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4" /> Data Quality Warnings ({warnings.length})
          </div>
          {warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-400/70 font-mono">{w}</div>
          ))}
        </div>
      )}
    </div>
  );
}