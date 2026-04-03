/**
 * CompareSection — Side-by-side dataset comparison with delta charts
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { processUploadedFile, buildTableSemanticModel } from '@/lib/dataParser';
import { runAIAnalysis } from '@/lib/aiAnalyzer';
import { Upload, Database, TrendingUp, TrendingDown, Minus, ArrowRight, Loader2, AlertTriangle, BarChart2, CheckCircle2 } from 'lucide-react';
import AdaptiveChart from '@/components/charts/AdaptiveChart';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const fmtV = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

function DeltaBadge({ delta, pct }) {
  if (delta == null) return null;
  const isPos = delta >= 0;
  const Icon = delta === 0 ? Minus : isPos ? TrendingUp : TrendingDown;
  const color = delta === 0 ? 'text-white/40' : isPos ? 'text-green-400' : 'text-red-400';
  return (
    <div className={`flex items-center gap-1 text-xs font-mono ${color}`}>
      <Icon className="w-3 h-3" />
      {isPos ? '+' : ''}{fmtV(delta)} {pct != null && `(${isPos ? '+' : ''}${pct?.toFixed(1)}%)`}
    </div>
  );
}

function UploadZone({ label, onUpload, table, loading }) {
  const onDrop = (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files[0]) onUpload(files[0]);
  };
  return (
    <div
      onDragOver={e => e.preventDefault()}
      onDrop={onDrop}
      onClick={() => !table && document.getElementById(`compare-input-${label}`)?.click()}
      className={`rounded-2xl border-2 border-dashed transition-all ${table ? 'border-cyan-400/30 cursor-default' : 'border-white/15 hover:border-cyan-400/40 cursor-pointer'} p-6 text-center`}
    >
      <input
        id={`compare-input-${label}`}
        type="file"
        accept=".csv,.xlsx,.xls,.json"
        className="hidden"
        onChange={e => e.target.files[0] && onUpload(e.target.files[0])}
      />
      {loading ? (
        <div className="space-y-2">
          <Loader2 className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
          <div className="text-xs text-muted-foreground">Analyzing…</div>
        </div>
      ) : table ? (
        <div className="space-y-1">
          <CheckCircle2 className="w-6 h-6 mx-auto text-cyan-400" />
          <div className="font-semibold text-sm">{table.name}</div>
          <div className="text-xs text-muted-foreground">{table.rowCount?.toLocaleString()} rows · {table.columns?.length} cols</div>
        </div>
      ) : (
        <div className="space-y-2">
          <Upload className="w-8 h-8 mx-auto text-muted-foreground" />
          <div className="text-sm font-medium">{label}</div>
          <div className="text-xs text-muted-foreground">CSV, XLSX, JSON</div>
        </div>
      )}
    </div>
  );
}

export default function CompareSection() {
  const { getActiveTable, addTable, setSemanticModel } = useWorkspaceStore();
  const tableA = getActiveTable();

  const [tableB, setTableB] = useState(null);
  const [analysisA, setAnalysisA] = useState(null);
  const [analysisB, setAnalysisB] = useState(null);
  const [loadingB, setLoadingB] = useState(false);
  const [error, setError] = useState('');

  const handleUploadB = async (file) => {
    setError('');
    setLoadingB(true);
    try {
      const result = await processUploadedFile(file);
      if (result.type === 'single') {
        setTableB(result.table);
        const [aRes, bRes] = await Promise.all([
          tableA ? runAIAnalysis(tableA) : Promise.resolve(null),
          runAIAnalysis(result.table),
        ]);
        setAnalysisA(aRes);
        setAnalysisB(bRes);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoadingB(false);
  };

  // Build delta metrics
  const buildDeltas = () => {
    if (!analysisA || !analysisB) return [];
    const pairs = [];

    // Total value
    if (analysisA.totalValue != null && analysisB.totalValue != null) {
      const delta = analysisB.totalValue - analysisA.totalValue;
      const pct = analysisA.totalValue !== 0 ? (delta / Math.abs(analysisA.totalValue) * 100) : 0;
      pairs.push({ label: 'Total ' + (analysisA.primaryLabel || 'KPI'), a: analysisA.totalValue, b: analysisB.totalValue, delta, pct });
    }
    // Growth rate
    if (analysisA.growthRate != null && analysisB.growthRate != null) {
      const delta = analysisB.growthRate - analysisA.growthRate;
      pairs.push({ label: 'Growth Rate (%)', a: analysisA.growthRate, b: analysisB.growthRate, delta, pct: null });
    }
    // Row count
    pairs.push({ label: 'Row Count', a: tableA?.rowCount, b: tableB?.rowCount, delta: (tableB?.rowCount || 0) - (tableA?.rowCount || 0), pct: null });
    // Quality score
    pairs.push({ label: 'Data Quality', a: tableA?.qualityScore, b: tableB?.qualityScore, delta: (tableB?.qualityScore || 0) - (tableA?.qualityScore || 0), pct: null });

    return pairs;
  };

  const deltas = buildDeltas();

  // Shared columns for delta chart
  const sharedNumericCols = tableA && tableB
    ? tableA.columns?.filter(ca => ca.type === 'numeric' && tableB.columns?.some(cb => cb.name.toLowerCase() === ca.name.toLowerCase()))
    : [];

  // Build side-by-side trend data
  const buildDeltaChartData = () => {
    if (!analysisA?.trendData?.length || !analysisB?.trendData?.length) return [];
    const mapA = Object.fromEntries(analysisA.trendData.map(d => [d.date, d.value]));
    const mapB = Object.fromEntries(analysisB.trendData.map(d => [d.date, d.value]));
    const allDates = [...new Set([...Object.keys(mapA), ...Object.keys(mapB)])].sort();
    return allDates.map(date => ({
      date,
      [tableA?.name || 'Dataset A']: mapA[date] || 0,
      [tableB?.name || 'Dataset B']: mapB[date] || 0,
      delta: (mapB[date] || 0) - (mapA[date] || 0),
    }));
  };

  const deltaChartData = buildDeltaChartData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-1">Compare Datasets</h1>
        <p className="text-sm text-muted-foreground">Upload a second dataset to compare side-by-side with delta metrics and charts.</p>
      </motion.div>

      {/* Upload row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Dataset A — current */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-cyan-400" /> Dataset A (Current)
          </div>
          <div className="rounded-2xl border border-cyan-400/25 p-6 bg-cyan-400/3 text-center">
            {tableA ? (
              <>
                <CheckCircle2 className="w-6 h-6 mx-auto text-cyan-400 mb-1" />
                <div className="font-semibold text-sm">{tableA.name}</div>
                <div className="text-xs text-muted-foreground">{tableA.rowCount?.toLocaleString()} rows · {tableA.columns?.length} cols · Quality {tableA.qualityScore}%</div>
              </>
            ) : (
              <>
                <Database className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <div className="text-sm text-muted-foreground">No active dataset — upload one first</div>
              </>
            )}
          </div>
        </div>
        {/* Dataset B — upload */}
        <div>
          <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-400" /> Dataset B (Compare)
          </div>
          <UploadZone label="Upload Dataset B" onUpload={handleUploadB} table={tableB} loading={loadingB} />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-400/5 border border-red-400/20 rounded-xl text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Delta Metrics */}
      {deltas.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Comparative Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {deltas.map((d, i) => (
              <div key={i} className="glass-card rounded-xl p-4 border border-white/5">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{d.label}</div>
                <div className="flex justify-between items-start mb-1">
                  <div className="text-xs text-cyan-400/70">A: <span className="font-mono font-semibold text-cyan-400">{fmtV(d.a)}</span></div>
                  <div className="text-xs text-purple-400/70">B: <span className="font-mono font-semibold text-purple-400">{fmtV(d.b)}</span></div>
                </div>
                <div className="border-t border-white/5 pt-2 mt-1">
                  <div className="text-xs text-muted-foreground mb-0.5">Delta (B − A)</div>
                  <DeltaBadge delta={d.delta} pct={d.pct} />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Delta Trend Chart */}
      {deltaChartData.length > 1 && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-sm">Trend Comparison Over Time</span>
            <div className="flex items-center gap-3 ml-auto text-xs">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />{tableA?.name}</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-400" />{tableB?.name}</div>
            </div>
          </div>
          {/* Custom dual-line chart using recharts */}
          <DeltaLineChart data={deltaChartData} labelA={tableA?.name} labelB={tableB?.name} />
        </motion.div>
      )}

      {/* Side-by-side AI charts */}
      {analysisA && analysisB && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">Side-by-Side Charts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Dataset A charts */}
            <div>
              <div className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-2">Dataset A — {tableA?.name}</div>
              {analysisA.chartPanels?.slice(0, 3).map((panel, i) => (
                <div key={i} className="glass-card rounded-xl p-4 border border-cyan-400/10 mb-3">
                  <div className="text-xs text-white/40 mb-2">{panel.title}</div>
                  <AdaptiveChart panel={panel} rows={tableA?.rows} columns={tableA?.columns} height={160} />
                </div>
              ))}
            </div>
            {/* Dataset B charts */}
            <div>
              <div className="text-xs text-purple-400 font-semibold uppercase tracking-widest mb-2">Dataset B — {tableB?.name}</div>
              {analysisB.chartPanels?.slice(0, 3).map((panel, i) => (
                <div key={i} className="glass-card rounded-xl p-4 border border-purple-400/10 mb-3">
                  <div className="text-xs text-white/40 mb-2">{panel.title}</div>
                  <AdaptiveChart panel={panel} rows={tableB?.rows} columns={tableB?.columns} height={160} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* AI Summary comparison */}
      {analysisA && analysisB && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-5 border border-cyan-400/10">
            <div className="text-xs text-cyan-400 font-semibold uppercase tracking-widest mb-2">AI Summary — A</div>
            <p className="text-xs text-white/60 leading-relaxed">{analysisA.executiveSummary}</p>
          </div>
          <div className="glass-card rounded-2xl p-5 border border-purple-400/10">
            <div className="text-xs text-purple-400 font-semibold uppercase tracking-widest mb-2">AI Summary — B</div>
            <p className="text-xs text-white/60 leading-relaxed">{analysisB.executiveSummary}</p>
          </div>
        </motion.div>
      )}

      {!tableA && (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Upload a primary dataset first via <span className="text-cyan-400">Data Intake</span>, then come back to compare.
        </div>
      )}
    </div>
  );
}

// Custom delta line chart
function DeltaLineChart({ data, labelA, labelB }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <defs>
          <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00e5ff" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00e5ff" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9c27b0" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} width={45} />
        <Tooltip contentStyle={{ backgroundColor: 'rgba(10,8,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} />
        <Legend wrapperStyle={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }} />
        <Area type="monotone" dataKey={labelA || 'Dataset A'} stroke="#00e5ff" fill="url(#gradA)" strokeWidth={2} dot={false} />
        <Area type="monotone" dataKey={labelB || 'Dataset B'} stroke="#9c27b0" fill="url(#gradB)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}