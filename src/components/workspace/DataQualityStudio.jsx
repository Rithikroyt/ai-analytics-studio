/**
 * DataQualityStudio — Phase 2: Comprehensive Data Quality Analysis
 * Missing values, duplicates, format issues, type mismatches, cleaning recommendations
 */
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Shield, AlertTriangle, CheckCircle2, Info, Loader2, Wand2,
  Database, Eye, TrendingUp, TrendingDown, Minus, BarChart3,
  ArrowRight, Download, RefreshCw, Zap
} from 'lucide-react';

const fmtPct = v => `${Math.round(v)}%`;
const fmtN = v => Number(v).toLocaleString();

function QualityGauge({ score }) {
  const color = score >= 90 ? '#4ade80' : score >= 75 ? '#00e5ff' : score >= 60 ? '#fbbf24' : '#f87171';
  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Poor';
  return (
    <div className="flex flex-col items-center">
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="50" cy="50" r="40" fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${2 * Math.PI * 40 * score / 100} ${2 * Math.PI * 40}`}
          strokeLinecap="round" transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1s ease' }} />
        <text x="50" y="46" textAnchor="middle" fontSize="18" fontWeight="bold" fill={color}>{score}</text>
        <text x="50" y="60" textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)">{label}</text>
      </svg>
    </div>
  );
}

function DimensionBar({ label, value, color }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/50">{label}</span>
        <span className="font-mono font-bold" style={{ color }}>{value}%</span>
      </div>
      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 0.8 }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  );
}

function IssueRow({ col, nullPct, type, rows }) {
  const severity = nullPct > 30 ? 'high' : nullPct > 10 ? 'medium' : 'low';
  const sevColor = { high: 'text-red-400', medium: 'text-amber-400', low: 'text-blue-400' }[severity];
  const sevBg = { high: 'bg-red-400/5 border-red-400/20', medium: 'bg-amber-400/5 border-amber-400/20', low: 'bg-blue-400/5 border-blue-400/20' }[severity];

  // Count invalid values for numeric cols
  let invalidCount = 0;
  if (type === 'numeric') {
    invalidCount = rows.filter(r => r[col] != null && r[col] !== '' && isNaN(Number(r[col]))).length;
  }

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border ${sevBg} text-xs`}>
      <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 ${sevColor}`} />
      <div className="flex-1 min-w-0">
        <div className="font-mono font-semibold text-white/80 truncate">{col}</div>
        <div className="text-white/40 mt-0.5">
          {nullPct > 0 && <span>{fmtPct(nullPct)} missing</span>}
          {invalidCount > 0 && <span className="ml-2">{fmtN(invalidCount)} invalid format</span>}
        </div>
      </div>
      <span className={`px-2 py-0.5 rounded-full font-semibold uppercase text-xs ${sevColor} bg-white/5`}>{severity}</span>
    </div>
  );
}

export default function DataQualityStudio() {
  const { getActiveTable, updateTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const analysis = useMemo(() => {
    if (!table?.rows?.length || !table?.columns?.length) return null;
    const { rows, columns } = table;
    const totalCells = rows.length * columns.length;

    // Missing analysis
    let totalMissing = 0;
    const colMissing = {};
    columns.forEach(col => {
      const nulls = rows.filter(r => r[col.name] == null || r[col.name] === '' || String(r[col.name]).toLowerCase() === 'null').length;
      colMissing[col.name] = { count: nulls, pct: (nulls / rows.length) * 100, type: col.type };
      totalMissing += nulls;
    });

    // Duplicate analysis
    const rowHashes = rows.map(r => JSON.stringify(r));
    const uniqueSet = new Set(rowHashes);
    const duplicateCount = rows.length - uniqueSet.size;

    // Type mismatch for numeric cols
    let typeMismatches = 0;
    const numericCols = columns.filter(c => c.type === 'numeric');
    numericCols.forEach(col => {
      rows.forEach(r => {
        if (r[col.name] != null && r[col.name] !== '' && isNaN(Number(r[col.name]))) typeMismatches++;
      });
    });

    // Quality dimensions
    const completeness = Math.round((1 - totalMissing / totalCells) * 100);
    const validity = Math.round(Math.max(0, (1 - typeMismatches / Math.max(totalCells, 1)) * 100));
    const uniqueness = Math.round((1 - duplicateCount / rows.length) * 100);

    // Consistency: check casing/format for category cols
    let consistentCols = 0;
    columns.forEach(col => {
      if (col.type === 'category') {
        const vals = rows.map(r => String(r[col.name] || '')).filter(Boolean);
        const mixed = vals.some(v => /[A-Z]/.test(v)) && vals.some(v => /[a-z]/.test(v));
        if (!mixed) consistentCols += 1; else consistentCols += 0.5;
      } else {
        consistentCols++;
      }
    });
    const consistency = Math.round((consistentCols / columns.length) * 100);

    // Timeliness
    const dateCol = columns.find(c => c.type === 'date');
    let timeliness = 80;
    if (dateCol) {
      const twoYrs = Date.now() - 2 * 365 * 86400000;
      const recent = rows.filter(r => {
        const d = Date.parse(String(r[dateCol.name] || ''));
        return !isNaN(d) && d >= twoYrs;
      }).length;
      timeliness = Math.round((recent / rows.length) * 100);
    }

    const score = Math.round(
      0.30 * completeness + 0.25 * validity + 0.20 * uniqueness + 0.15 * consistency + 0.10 * timeliness
    );

    // Columns with issues sorted by severity
    const issueColumns = Object.entries(colMissing)
      .filter(([col, v]) => v.pct > 5)
      .sort(([, a], [, b]) => b.pct - a.pct)
      .slice(0, 10);

    // Cleaning recommendations
    const recommendations = [];
    if (duplicateCount > 0) recommendations.push({ type: 'duplicates', action: `Remove ${fmtN(duplicateCount)} duplicate rows`, impact: 'high', fixed: duplicateCount });
    Object.entries(colMissing).filter(([, v]) => v.pct > 5).forEach(([col, info]) => {
      const strategy = info.type === 'numeric' ? (Math.abs(info.pct - 50) < 20 ? 'median imputation' : 'mean imputation') : 'mode imputation';
      recommendations.push({ type: 'missing', action: `Impute "${col}" — ${fmtPct(info.pct)} missing using ${strategy}`, impact: info.pct > 30 ? 'high' : 'medium', col });
    });
    if (typeMismatches > 0) recommendations.push({ type: 'format', action: `Fix ${fmtN(typeMismatches)} type-mismatched values in numeric columns`, impact: 'medium' });

    return {
      score, completeness, validity, uniqueness, consistency, timeliness,
      totalMissing, totalCells, duplicateCount, typeMismatches,
      colMissing, issueColumns, recommendations,
      rowCount: rows.length, colCount: columns.length,
    };
  }, [table]);

  const handleAutoClean = async () => {
    if (!table) return;
    setCleaning(true);
    await new Promise(r => setTimeout(r, 800));

    const { rows, columns } = table;
    // 1. Remove duplicates
    const seen = new Set();
    let cleanRows = rows.filter(row => {
      const h = JSON.stringify(row);
      if (seen.has(h)) return false;
      seen.add(h); return true;
    });

    // 2. Impute missing values
    const numericCols = columns.filter(c => c.type === 'numeric');
    const catCols = columns.filter(c => c.type === 'category');

    const medians = {};
    const means = {};
    const modes = {};

    numericCols.forEach(col => {
      const vals = cleanRows.map(r => Number(r[col.name])).filter(v => !isNaN(v)).sort((a, b) => a - b);
      if (!vals.length) return;
      medians[col.name] = vals[Math.floor(vals.length / 2)];
      means[col.name] = vals.reduce((a, b) => a + b, 0) / vals.length;
      // Use median for skewed, mean for normal
      const mean = means[col.name];
      const skew = (vals[Math.floor(vals.length * 0.75)] - mean) / (vals[vals.length - 1] - vals[0] + 1);
      medians[col.name] = Math.abs(skew) > 0.3 ? medians[col.name] : means[col.name];
    });

    catCols.forEach(col => {
      const freq = {};
      cleanRows.forEach(r => { const v = r[col.name]; if (v != null && v !== '') freq[v] = (freq[v] || 0) + 1; });
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      modes[col.name] = sorted[0]?.[0];
    });

    cleanRows = cleanRows.map(row => {
      const clean = { ...row };
      numericCols.forEach(col => {
        if (clean[col.name] == null || clean[col.name] === '' || isNaN(Number(clean[col.name]))) {
          clean[col.name] = medians[col.name] ?? 0;
        }
      });
      catCols.forEach(col => {
        if (clean[col.name] == null || clean[col.name] === '') {
          clean[col.name] = modes[col.name] ?? 'Unknown';
        }
      });
      return clean;
    });

    // 3. Update table
    const { computeQualityScore, detectIssues } = await import('@/lib/dataParser');
    updateTable(table.id, {
      rows: cleanRows,
      rowCount: cleanRows.length,
      qualityScore: computeQualityScore(cleanRows, columns),
      issues: detectIssues(cleanRows, columns),
      cleaned: true,
      cleanedAt: new Date().toISOString(),
    });

    setCleaning(false);
    setCleaned(true);
  };

  const exportQualityReport = () => {
    if (!analysis) return;
    const lines = [
      `DATA QUALITY REPORT — ${table.name}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      `OVERALL QUALITY SCORE: ${analysis.score}%`,
      '',
      'QUALITY DIMENSIONS:',
      `  Completeness:  ${analysis.completeness}%`,
      `  Validity:      ${analysis.validity}%`,
      `  Uniqueness:    ${analysis.uniqueness}%`,
      `  Consistency:   ${analysis.consistency}%`,
      `  Timeliness:    ${analysis.timeliness}%`,
      '',
      `DATASET: ${analysis.rowCount.toLocaleString()} rows × ${analysis.colCount} columns`,
      `Missing Cells: ${analysis.totalMissing.toLocaleString()} of ${analysis.totalCells.toLocaleString()}`,
      `Duplicate Rows: ${analysis.duplicateCount.toLocaleString()}`,
      `Type Mismatches: ${analysis.typeMismatches.toLocaleString()}`,
      '',
      'COLUMN-LEVEL MISSING VALUES:',
      ...Object.entries(analysis.colMissing)
        .filter(([, v]) => v.pct > 0)
        .sort(([, a], [, b]) => b.pct - a.pct)
        .map(([col, v]) => `  ${col}: ${fmtPct(v.pct)} (${v.count} cells)`),
      '',
      'RECOMMENDATIONS:',
      ...analysis.recommendations.map(r => `  [${r.impact.toUpperCase()}] ${r.action}`),
    ].join('\n');

    const blob = new Blob([lines], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${table.name}_quality_report.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-white/15 mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Data Loaded</h2>
        <p className="text-sm text-muted-foreground mb-5">Upload a dataset first.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  if (!analysis) return <div className="p-8 text-center text-white/30 text-sm">Computing quality profile…</div>;

  const TABS = ['overview', 'columns', 'recommendations'];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono text-white/40 uppercase tracking-widest">Data Quality Studio</span>
            </div>
            <h1 className="text-2xl font-bold">{table.name}</h1>
            <p className="text-sm text-muted-foreground">{fmtN(analysis.rowCount)} rows · {analysis.colCount} columns · Quality: {analysis.score}%</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportQualityReport}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-white/50 rounded-xl text-xs font-medium hover:text-white/80 transition-all">
              <Download className="w-3.5 h-3.5" /> Report
            </button>
            <button onClick={handleAutoClean} disabled={cleaning || cleaned}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${cleaned ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400 hover:bg-cyan-300'}`}
              style={!cleaned ? { color: 'hsl(222,47%,6%)' } : {}}>
              {cleaning ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Cleaning…</> : cleaned ? <><CheckCircle2 className="w-3.5 h-3.5" /> Cleaned!</> : <><Wand2 className="w-3.5 h-3.5" /> Auto-Clean</>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* Score + dimensions */}
      <div className="glass-card rounded-2xl p-6 border border-white/8">
        <div className="flex items-center gap-8 flex-wrap">
          <QualityGauge score={analysis.score} />
          <div className="flex-1 min-w-48 space-y-3">
            <DimensionBar label="Completeness (30%)" value={analysis.completeness} color="#00e5ff" />
            <DimensionBar label="Validity (25%)" value={analysis.validity} color="#a855f7" />
            <DimensionBar label="Uniqueness (20%)" value={analysis.uniqueness} color="#4ade80" />
            <DimensionBar label="Consistency (15%)" value={analysis.consistency} color="#fbbf24" />
            <DimensionBar label="Timeliness (10%)" value={analysis.timeliness} color="#f87171" />
          </div>
          <div className="grid grid-cols-2 gap-3 text-center">
            {[
              { label: 'Missing Cells', value: fmtN(analysis.totalMissing), color: analysis.totalMissing > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Duplicates', value: fmtN(analysis.duplicateCount), color: analysis.duplicateCount > 0 ? 'text-red-400' : 'text-green-400' },
              { label: 'Type Errors', value: fmtN(analysis.typeMismatches), color: analysis.typeMismatches > 0 ? 'text-amber-400' : 'text-green-400' },
              { label: 'Issues Found', value: analysis.recommendations.length, color: analysis.recommendations.length > 0 ? 'text-amber-400' : 'text-green-400' },
            ].map(s => (
              <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/6">
                <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold rounded-t-xl transition-all capitalize ${activeTab === tab ? 'bg-white/8 text-cyan-400 border-t border-x border-white/10' : 'text-white/35 hover:text-white/65'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Missing value heat map */}
          <div className="glass-card rounded-2xl p-5 border border-white/8">
            <h3 className="font-semibold text-sm mb-3">Missing Values by Column</h3>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {Object.entries(analysis.colMissing).sort(([,a],[,b]) => b.pct - a.pct).slice(0, 15).map(([col, v]) => (
                <div key={col} className="flex items-center gap-2 text-xs">
                  <span className="font-mono text-white/60 w-32 truncate flex-shrink-0">{col}</span>
                  <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${v.pct}%`,
                      background: v.pct > 30 ? '#f87171' : v.pct > 10 ? '#fbbf24' : '#4ade80'
                    }} />
                  </div>
                  <span className={`w-10 text-right font-mono font-bold flex-shrink-0 ${v.pct > 30 ? 'text-red-400' : v.pct > 10 ? 'text-amber-400' : 'text-green-400'}`}>
                    {fmtPct(v.pct)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Summary stats */}
          <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
            <h3 className="font-semibold text-sm">Dataset Summary</h3>
            <div className="space-y-2.5 text-xs">
              {[
                ['Total Rows', fmtN(analysis.rowCount), 'text-cyan-400'],
                ['Total Columns', analysis.colCount, 'text-cyan-400'],
                ['Total Cells', fmtN(analysis.totalCells), 'text-white/60'],
                ['Missing Cells', fmtN(analysis.totalMissing), analysis.totalMissing > 0 ? 'text-amber-400' : 'text-green-400'],
                ['Duplicate Rows', fmtN(analysis.duplicateCount), analysis.duplicateCount > 0 ? 'text-red-400' : 'text-green-400'],
                ['Type Mismatches', fmtN(analysis.typeMismatches), analysis.typeMismatches > 0 ? 'text-amber-400' : 'text-green-400'],
                ['Overall Score', `${analysis.score}%`, analysis.score >= 80 ? 'text-green-400' : 'text-amber-400'],
              ].map(([label, value, color]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <span className="text-white/40">{label}</span>
                  <span className={`font-mono font-bold ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'columns' && (
        <div className="space-y-2">
          <div className="text-xs text-white/30 mb-3">Columns with &gt;5% missing values or format issues</div>
          {Object.entries(analysis.colMissing)
            .filter(([, v]) => v.pct > 0)
            .sort(([, a], [, b]) => b.pct - a.pct)
            .map(([col, v]) => (
              <IssueRow key={col} col={col} nullPct={v.pct} type={v.type} rows={table.rows} />
            ))}
          {Object.values(analysis.colMissing).every(v => v.pct === 0) && (
            <div className="flex items-center gap-2 p-4 bg-green-400/5 border border-green-400/20 rounded-xl text-sm text-green-400">
              <CheckCircle2 className="w-4 h-4" /> No missing values detected — dataset is complete.
            </div>
          )}
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="space-y-3">
          {analysis.recommendations.length === 0 ? (
            <div className="flex items-center gap-3 p-5 bg-green-400/5 border border-green-400/20 rounded-2xl text-sm text-green-400">
              <CheckCircle2 className="w-5 h-5" />
              <div>
                <div className="font-semibold">Dataset is clean</div>
                <div className="text-green-400/70 mt-0.5">No cleaning actions required. Ready for AI analysis.</div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="text-xs text-white/30">{analysis.recommendations.length} cleaning action{analysis.recommendations.length !== 1 ? 's' : ''} recommended</div>
                <button onClick={handleAutoClean} disabled={cleaning || cleaned}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/15 transition-all disabled:opacity-40">
                  <Zap className="w-3 h-3" /> Apply All
                </button>
              </div>
              {analysis.recommendations.map((rec, i) => {
                const impColor = { high: 'text-red-400 bg-red-400/10 border-red-400/20', medium: 'text-amber-400 bg-amber-400/10 border-amber-400/20', low: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }[rec.impact];
                return (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-4 rounded-xl border border-white/8 bg-white/2">
                    <div className={`px-2 py-0.5 rounded-full text-xs font-bold border flex-shrink-0 ${impColor}`}>{rec.impact}</div>
                    <div className="flex-1 text-sm text-white/70">{rec.action}</div>
                    <CheckCircle2 className="w-4 h-4 text-white/15 flex-shrink-0" />
                  </motion.div>
                );
              })}
            </>
          )}
          <div className="mt-4 p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-cyan-400/70 leading-relaxed">
            <strong className="text-cyan-400">Auto-Clean</strong> applies: duplicate removal, median/mode imputation for missing values, and type coercion for numeric columns. A before/after comparison is saved.
          </div>
        </div>
      )}
    </div>
  );
}