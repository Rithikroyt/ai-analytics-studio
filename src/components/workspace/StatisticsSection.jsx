/**
 * StatisticsSection — Grounded Statistical Insights
 * Runs locally against uploaded data using statsEngine.
 * Tests applied only when data supports them.
 * All results include plain-English significance explanations.
 */
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  describe, pearson, linearRegression, tTest, chiSquaredGoodnessOfFit,
  detectAnomalies, fmtNum
} from '@/lib/statsEngine';
import {
  Activity, TrendingUp, FlaskConical, AlertTriangle, CheckCircle2,
  ArrowRight, Database, BarChart3, Info
} from 'lucide-react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';

const PALETTE = ['#00e5ff','#7b2fff','#ff6b35','#4caf50','#ff2d7a','#ffcc02','#00bfa5'];
const TOOLTIP_STYLE = { backgroundColor:'rgba(5,10,24,0.97)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, fontSize:11, color:'#e2e8f0' };
const axisStyle = { fontSize:9, fill:'rgba(255,255,255,0.3)' };

const fmt = (v) => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits:2 });
};

const pLabel = (p) => {
  if (p < 0.001) return 'p < 0.001 ★★★';
  if (p < 0.01)  return `p = ${p.toFixed(3)} ★★`;
  if (p < 0.05)  return `p = ${p.toFixed(3)} ★`;
  return `p = ${p.toFixed(3)} (not significant)`;
};

const sigColor = (p) => p < 0.05 ? 'text-green-400' : 'text-white/35';

// ── Confidence interval ───────────────────────────────────────────
function confInterval(vals, z = 1.96) {
  if (vals.length < 2) return null;
  const d = describe(vals);
  const se = d.std / Math.sqrt(d.count);
  return { mean: d.mean, lower: d.mean - z * se, upper: d.mean + z * se, se, n: d.count };
}

// ── Section header ────────────────────────────────────────────────
function SectionHeader({ icon: Icon, label, color = '#00e5ff', count }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background:`${color}18`, border:`1px solid ${color}30` }}>
        <Icon className="w-3.5 h-3.5" style={{ color }} />
      </div>
      <span className="font-semibold text-sm">{label}</span>
      {count != null && <span className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-white/35">{count}</span>}
    </div>
  );
}

// ── Plain-English correlation interpretation ──────────────────────
function corrInterpret(r) {
  const a = Math.abs(r);
  const dir = r > 0 ? 'positive' : 'negative';
  if (a > 0.8) return `Very strong ${dir} relationship — when one increases, the other ${r>0?'increases':'decreases'} dramatically.`;
  if (a > 0.6) return `Strong ${dir} relationship — a meaningful co-movement exists.`;
  if (a > 0.4) return `Moderate ${dir} relationship — some predictive value, other factors also at play.`;
  if (a > 0.2) return `Weak ${dir} relationship — slight tendency but mostly independent.`;
  return 'No meaningful linear relationship detected.';
}

// ── 1. Correlation Analysis ────────────────────────────────────────
function CorrelationSection({ table }) {
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const [sel, setSel] = useState(null);

  const pairs = useMemo(() => {
    const results = [];
    for (let i = 0; i < numCols.length; i++) {
      for (let j = i+1; j < numCols.length; j++) {
        const xs = (table.rows||[]).map(r=>Number(r[numCols[i].name])).filter(v=>!isNaN(v));
        const ys = (table.rows||[]).map(r=>Number(r[numCols[j].name])).filter(v=>!isNaN(v));
        if (xs.length < 4) continue;
        const res = pearson(xs, ys);
        results.push({ colA: numCols[i].name, colB: numCols[j].name, ...res, xs, ys });
      }
    }
    return results.sort((a,b) => Math.abs(b.r) - Math.abs(a.r));
  }, [table]);

  if (!pairs.length) return <p className="text-xs text-white/30 py-4">Need at least 2 numeric columns for correlation analysis.</p>;

  const selPair = sel != null ? pairs[sel] : null;
  const scatterData = selPair ? selPair.xs.slice(0,300).map((x,i) => ({ x, y: selPair.ys[i] })) : [];

  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} label="Pearson Correlation Analysis" color="#00e5ff" count={pairs.length} />
      <div className="overflow-auto rounded-xl border border-white/8">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/3 border-b border-white/8">
              {['Variable A','Variable B','r coefficient','p-value','Strength',''].map(h=>(
                <th key={h} className="px-3 py-2.5 text-left text-white/40 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pairs.slice(0,12).map((p,i) => {
              const a = Math.abs(p.r);
              const strength = a>0.7?'Strong':a>0.4?'Moderate':a>0.2?'Weak':'Negligible';
              const sColor = a>0.7?'text-green-400':a>0.4?'text-amber-400':a>0.2?'text-blue-400':'text-white/30';
              return (
                <tr key={i} onClick={()=>setSel(sel===i?null:i)}
                  className={`border-b border-white/5 cursor-pointer transition-colors ${sel===i?'bg-cyan-400/8':'hover:bg-white/2'}`}>
                  <td className="px-3 py-2.5 font-mono text-cyan-400/80">{p.colA.replace(/_/g,' ')}</td>
                  <td className="px-3 py-2.5 font-mono text-purple-400/80">{p.colB.replace(/_/g,' ')}</td>
                  <td className="px-3 py-2.5 font-mono font-bold" style={{ color: p.r>0?'#4caf50':'#ff2d7a' }}>{p.r>0?'+':''}{p.r}</td>
                  <td className={`px-3 py-2.5 font-mono ${sigColor(p.pValue)}`}>{pLabel(p.pValue)}</td>
                  <td className={`px-3 py-2.5 font-semibold ${sColor}`}>{strength}</td>
                  <td className="px-3 py-2.5 text-white/25 hover:text-cyan-400 transition-colors">→</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selPair && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl p-5 border border-cyan-400/15 bg-cyan-400/4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{selPair.colA.replace(/_/g,' ')} × {selPair.colB.replace(/_/g,' ')}</span>
            <span className="text-xs font-mono font-bold" style={{ color:selPair.r>0?'#4caf50':'#ff2d7a' }}>r = {selPair.r>0?'+':''}{selPair.r}</span>
          </div>
          <p className="text-xs text-white/55 leading-relaxed">{corrInterpret(selPair.r)} {selPair.significant ? '✓ Statistically significant at α=0.05.' : '✗ Not statistically significant — result could be random.'}</p>
          <ResponsiveContainer width="100%" height={180}>
            <ScatterChart margin={{ top:4, right:8, bottom:4, left:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" dataKey="x" name={selPair.colA} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmt} />
              <YAxis type="number" dataKey="y" name={selPair.colB} tick={axisStyle} tickLine={false} axisLine={false} tickFormatter={fmt} width={40} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v,n) => [fmt(v), n==='x'?selPair.colA:selPair.colB]} />
              <Scatter data={scatterData} fill="#00e5ff" fillOpacity={0.45} />
            </ScatterChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}

// ── 2. Linear Regression ──────────────────────────────────────────
function RegressionSection({ table }) {
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const [selX, setSelX] = useState(0);
  const [selY, setSelY] = useState(Math.min(1, numCols.length-1));

  const reg = useMemo(() => {
    if (numCols.length < 2) return null;
    const xCol = numCols[selX];
    const yCol = numCols[selY];
    if (!xCol || !yCol || xCol === yCol) return null;
    const xs = (table.rows||[]).map(r=>Number(r[xCol.name])).filter(v=>!isNaN(v));
    const ys = (table.rows||[]).map(r=>Number(r[yCol.name])).filter(v=>!isNaN(v));
    const n = Math.min(xs.length, ys.length);
    if (n < 4) return null;
    const res = linearRegression(xs.slice(0,n), ys.slice(0,n));
    const corr = pearson(xs.slice(0,n), ys.slice(0,n));
    const xName = xCol.name.replace(/_/g,' ');
    const yName = yCol.name.replace(/_/g,' ');
    return { ...res, xName, yName, n, pValue: corr.pValue, significant: corr.significant,
      equation: `${yName} = ${res.slope.toFixed(3)} × ${xName} + ${res.intercept.toFixed(1)}` };
  }, [table, selX, selY, numCols]);

  if (numCols.length < 2) return <p className="text-xs text-white/30 py-4">Need at least 2 numeric columns for regression.</p>;

  return (
    <div className="space-y-4">
      <SectionHeader icon={TrendingUp} label="Linear Regression" color="#7b2fff" />
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Predictor (X):</span>
          <select value={selX} onChange={e=>setSelX(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Outcome (Y):</span>
          <select value={selY} onChange={e=>setSelY(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>

      {reg ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border border-purple-400/15 bg-purple-400/4 space-y-3">
            <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold">Model Equation</div>
            <div className="font-mono text-sm text-white/80 bg-black/20 rounded-xl px-4 py-3">{reg.equation}</div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label:'R² (fit)', value: reg.r2.toFixed(4), color: reg.r2>0.7?'text-green-400':reg.r2>0.4?'text-amber-400':'text-white/50' },
                { label:'Slope', value: reg.slope.toFixed(4), color:'text-cyan-400' },
                { label:'Intercept', value: reg.intercept.toFixed(2), color:'text-white/60' },
                { label:'Std Error', value: reg.se?.toFixed(2) ?? '—', color:'text-white/40' },
                { label:'Sample n', value: reg.n, color:'text-white/40' },
                { label:'Significance', value: reg.significant?'p < 0.05 ✓':'Not sig.', color:reg.significant?'text-green-400':'text-white/30' },
              ].map(m => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-white/30">{m.label}</span>
                  <span className={`font-mono font-semibold ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-white/6 bg-white/1 space-y-2">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Plain-English Interpretation</div>
            <p className="text-sm text-white/65 leading-relaxed">
              For every 1-unit increase in <strong className="text-cyan-400">{reg.xName}</strong>, <strong className="text-purple-400">{reg.yName}</strong> {reg.slope>0?'increases':'decreases'} by approximately <strong>{Math.abs(reg.slope).toFixed(2)}</strong> units.
            </p>
            <p className="text-xs text-white/40 leading-relaxed mt-2">
              R² = {reg.r2.toFixed(3)} — this model explains <strong className="text-white/60">{(reg.r2*100).toFixed(1)}%</strong> of the variance in {reg.yName}.{' '}
              {reg.r2 > 0.7 ? 'This is a strong fit.' : reg.r2 > 0.4 ? 'Moderate fit — other factors contribute.' : 'Weak fit — this predictor alone is insufficient.'}
            </p>
            <p className={`text-xs leading-relaxed ${sigColor(reg.pValue)}`}>
              {pLabel(reg.pValue)} — {reg.significant ? 'the relationship is unlikely due to chance.' : 'insufficient evidence to confirm a real relationship.'}
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-white/30 py-4">Select two different numeric columns to run regression.</p>
      )}
    </div>
  );
}

// ── 3. T-Test ────────────────────────────────────────────────────
function TTestSection({ table }) {
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const catCols = table.columns?.filter(c=>c.type==='category') || [];
  const [metric, setMetric] = useState(0);
  const [groupCol, setGroupCol] = useState(0);

  const result = useMemo(() => {
    if (!numCols[metric] || !catCols[groupCol]) return null;
    const mName = numCols[metric].name;
    const gName = catCols[groupCol].name;
    const groups = {};
    (table.rows||[]).forEach(r => {
      const g = String(r[gName] ?? 'Unknown');
      const v = Number(r[mName]);
      if (!isNaN(v)) { if (!groups[g]) groups[g] = []; groups[g].push(v); }
    });
    const groupKeys = Object.keys(groups).filter(k => groups[k].length >= 3).slice(0,2);
    if (groupKeys.length < 2) return { error: `Need at least 2 groups with ≥3 observations in "${gName}". Found: ${Object.keys(groups).length} groups.` };
    const s1 = groups[groupKeys[0]], s2 = groups[groupKeys[1]];
    const res = tTest(s1, s2);
    const d1 = describe(s1), d2 = describe(s2);
    return { ...res, groupA: groupKeys[0], groupB: groupKeys[1], meanA: d1.mean, meanB: d2.mean,
      nA: s1.length, nB: s2.length, mName, gName };
  }, [table, metric, groupCol, numCols, catCols]);

  if (!numCols.length || !catCols.length) return <p className="text-xs text-white/30 py-4">T-test requires at least one numeric and one category column.</p>;

  return (
    <div className="space-y-4">
      <SectionHeader icon={FlaskConical} label="Two-Sample Welch's T-Test" color="#ff6b35" />
      <p className="text-xs text-white/35 leading-relaxed">Tests whether two groups have significantly different means. Uses Welch's correction for unequal variances.</p>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Metric:</span>
          <select value={metric} onChange={e=>setMetric(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {numCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/35">Group by:</span>
          <select value={groupCol} onChange={e=>setGroupCol(Number(e.target.value))}
            className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
            {catCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>

      {result?.error ? (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-400/5 border border-amber-400/20 text-xs text-amber-400"><AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />{result.error}</div>
      ) : result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border border-orange-400/15 bg-orange-400/4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="col-span-2 flex items-center gap-3 pb-2 border-b border-white/8">
                <div className="flex-1 text-center">
                  <div className="text-white/30 mb-1">Group A: <span className="text-white/65 font-semibold">{result.groupA}</span></div>
                  <div className="font-mono text-lg font-black text-orange-400">{fmtNum(result.meanA)}</div>
                  <div className="text-white/25">n = {result.nA}</div>
                </div>
                <div className="text-white/20 text-xl">vs</div>
                <div className="flex-1 text-center">
                  <div className="text-white/30 mb-1">Group B: <span className="text-white/65 font-semibold">{result.groupB}</span></div>
                  <div className="font-mono text-lg font-black text-blue-400">{fmtNum(result.meanB)}</div>
                  <div className="text-white/25">n = {result.nB}</div>
                </div>
              </div>
              {[
                { label:'t statistic', value:result.t.toFixed(4) },
                { label:'Degrees of freedom', value:result.df },
                { label:'p-value', value:result.pValue.toFixed(4) },
                { label:'Mean difference', value:fmtNum(result.meanDiff) },
              ].map(m => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-white/30">{m.label}</span>
                  <span className="font-mono text-white/65">{m.value}</span>
                </div>
              ))}
            </div>
            <div className={`text-center py-2 rounded-xl text-xs font-bold ${result.significant ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'bg-white/5 text-white/35 border border-white/8'}`}>
              {result.significant ? '✓ Statistically significant difference (p < 0.05)' : '✗ No significant difference detected'}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-white/6 bg-white/1 space-y-2">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">What This Means</div>
            <p className="text-sm text-white/65 leading-relaxed">
              {result.significant
                ? `The average <strong>${result.mName.replace(/_/g,' ')}</strong> is significantly different between "${result.groupA}" (${fmtNum(result.meanA)}) and "${result.groupB}" (${fmtNum(result.meanB)}). This difference is unlikely due to chance.`
                : `No statistically significant difference in <strong>${result.mName.replace(/_/g,' ')}</strong> between "${result.groupA}" and "${result.groupB}". The observed difference may be due to random variation.`
              }
            </p>
            <p className={`text-xs mt-2 ${sigColor(result.pValue)}`}>{pLabel(result.pValue)}</p>
            <p className="text-xs text-white/25 leading-relaxed mt-1">
              Mean difference: {fmtNum(result.meanDiff)} ({result.meanDiff>0?`${result.groupA} is higher`:`${result.groupB} is higher`})
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── 4. Chi-Squared Test ───────────────────────────────────────────
function ChiSquaredSection({ table }) {
  const catCols = table.columns?.filter(c=>c.type==='category') || [];
  const [selCol, setSelCol] = useState(0);

  const result = useMemo(() => {
    if (!catCols[selCol]) return null;
    const cName = catCols[selCol].name;
    const counts = {};
    (table.rows||[]).forEach(r => {
      const k = String(r[cName] ?? 'Unknown');
      counts[k] = (counts[k]||0) + 1;
    });
    const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,20);
    if (entries.length < 2) return { error: 'Need at least 2 distinct categories.' };
    const observed = entries.map(([,v]) => v);
    const res = chiSquaredGoodnessOfFit(observed);
    const total = observed.reduce((a,b)=>a+b,0);
    const expected = total / observed.length;
    return { ...res, entries, total, expected, cName };
  }, [table, selCol, catCols]);

  if (!catCols.length) return <p className="text-xs text-white/30 py-4">Chi-squared test requires at least one category column.</p>;

  return (
    <div className="space-y-4">
      <SectionHeader icon={FlaskConical} label="Chi-Squared Goodness-of-Fit Test" color="#4caf50" />
      <p className="text-xs text-white/35 leading-relaxed">Tests whether a category column's distribution deviates significantly from uniform distribution (equal frequencies expected).</p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-white/35">Column:</span>
        <select value={selCol} onChange={e=>setSelCol(Number(e.target.value))}
          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none">
          {catCols.map((c,i) => <option key={c.name} value={i}>{c.name.replace(/_/g,' ')}</option>)}
        </select>
      </div>

      {result?.error ? (
        <div className="text-xs text-amber-400 p-3 bg-amber-400/5 rounded-xl border border-amber-400/20">{result.error}</div>
      ) : result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-2xl p-5 border border-green-400/15 bg-green-400/4 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs">
              {[
                { label:'χ² statistic', value: result.chi2.toFixed(4) },
                { label:'Degrees of freedom', value: result.df },
                { label:'p-value', value: result.pValue.toFixed(4) },
                { label:'Categories tested', value: result.entries.length },
                { label:'Expected per category', value: Math.round(result.expected) },
                { label:'Total observations', value: result.total.toLocaleString() },
              ].map(m => (
                <div key={m.label} className="flex justify-between">
                  <span className="text-white/30">{m.label}</span>
                  <span className="font-mono text-white/65">{m.value}</span>
                </div>
              ))}
            </div>
            <div className={`text-center py-2 rounded-xl text-xs font-bold ${result.significant ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-green-400/10 text-green-400 border border-green-400/20'}`}>
              {result.significant ? '✓ Non-uniform distribution detected (p < 0.05)' : '✗ Distribution is consistent with uniform'}
            </div>
          </div>
          <div className="rounded-2xl p-5 border border-white/6 bg-white/1 space-y-3">
            <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Distribution Breakdown</div>
            {result.entries.slice(0,6).map(([name, count], i) => {
              const pct = (count/result.total*100).toFixed(1);
              const deviation = ((count - result.expected)/result.expected*100).toFixed(0);
              return (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:PALETTE[i%PALETTE.length] }} />
                  <span className="flex-1 text-white/55 truncate">{name}</span>
                  <span className="font-mono text-white/40">{count}</span>
                  <span className="font-mono text-white/25 w-10 text-right">{pct}%</span>
                  <span className={`font-mono text-xs w-12 text-right ${Number(deviation)>20?'text-red-400':Number(deviation)>5?'text-amber-400':'text-white/25'}`}>
                    {Number(deviation)>0?'+':''}{deviation}%
                  </span>
                </div>
              );
            })}
            <p className="text-xs text-white/35 mt-2 leading-relaxed">
              {result.significant
                ? `The distribution of "${result.cName.replace(/_/g,' ')}" is significantly non-uniform — some categories appear far more than expected.`
                : `The distribution of "${result.cName.replace(/_/g,' ')}" is approximately uniform — no dominant category bias detected.`
              }
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── 5. Confidence Intervals ────────────────────────────────────────
function ConfidenceIntervalSection({ table }) {
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];

  const intervals = useMemo(() => {
    return numCols.slice(0,8).map(col => {
      const vals = (table.rows||[]).map(r=>Number(r[col.name])).filter(v=>!isNaN(v));
      if (vals.length < 2) return null;
      const ci = confInterval(vals);
      const d = describe(vals);
      return { name: col.name, ...ci, d };
    }).filter(Boolean);
  }, [table, numCols]);

  if (!intervals.length) return <p className="text-xs text-white/30 py-4">No numeric columns available.</p>;

  return (
    <div className="space-y-4">
      <SectionHeader icon={Activity} label="95% Confidence Intervals" color="#00bfa5" />
      <p className="text-xs text-white/35 leading-relaxed">95% CI = mean ± 1.96 × (std / √n). If you collected the same data again, the true mean would fall in this range 95% of the time.</p>
      <div className="space-y-3">
        {intervals.map((ci, i) => {
          const range = ci.upper - ci.lower;
          const relWidth = ci.mean !== 0 ? (range / Math.abs(ci.mean) * 100).toFixed(1) : '—';
          const color = PALETTE[i % PALETTE.length];
          return (
            <div key={ci.name} className="rounded-xl p-4 border border-white/6 bg-white/1">
              <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                <span className="font-mono text-xs text-white/70 font-semibold">{ci.name.replace(/_/g,' ')}</span>
                <div className="flex items-center gap-3 text-xs text-white/40">
                  <span>n = {ci.n.toLocaleString()}</span>
                  <span>SE = {fmt(ci.se)}</span>
                  <span>CV = {relWidth}%</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-white/30 w-16 text-right">{fmt(ci.lower)}</span>
                <div className="flex-1 relative h-6 bg-white/5 rounded-full overflow-hidden">
                  <div className="absolute inset-y-0 rounded-full opacity-30" style={{
                    left:'10%', right:'10%', background: color
                  }} />
                  <div className="absolute inset-y-0 w-0.5 bg-white/60 rounded-full" style={{
                    left: `${Math.min(90, Math.max(10, 50 + (ci.mean - ci.lower) / (range || 1) * 80 - 40))}%`
                  }} />
                </div>
                <span className="text-xs font-mono text-white/30 w-16">{fmt(ci.upper)}</span>
                <div className="text-center w-24 flex-shrink-0">
                  <div className="text-sm font-black font-mono" style={{ color }}>{fmt(ci.mean)}</div>
                  <div className="text-xs text-white/25">mean</div>
                </div>
              </div>
              <div className="text-xs text-white/25 mt-1.5">
                95% CI: [{fmt(ci.lower)}, {fmt(ci.upper)}] — width {fmt(range)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
const STAT_TABS = [
  { id:'correlation', label:'Correlations', icon:Activity },
  { id:'regression',  label:'Regression',   icon:TrendingUp },
  { id:'ttest',       label:'T-Test',        icon:FlaskConical },
  { id:'chisquared',  label:'Chi-Squared',   icon:FlaskConical },
  { id:'ci',          label:'Confidence Intervals', icon:BarChart3 },
];

export default function StatisticsSection() {
  const { getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('correlation');

  if (!table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <FlaskConical className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">Statistical Analysis</h2>
        <p className="text-sm text-muted-foreground mb-6">Upload a dataset to run correlation analysis, t-tests, chi-squared tests, regression, and confidence intervals.</p>
        <button onClick={()=>setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/5 bg-white/1 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
          <span className="text-xs text-white/35 font-mono uppercase tracking-widest">Local computation · no LLM required</span>
        </div>
        <h1 className="text-xl font-bold">Statistical Insights</h1>
        <p className="text-xs text-white/35 mt-0.5">
          {table.name} · {table.rowCount?.toLocaleString()} rows ·{' '}
          {table.columns?.filter(c=>c.type==='numeric').length} numeric cols ·{' '}
          {table.columns?.filter(c=>c.type==='category').length} category cols
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0.5 px-5 py-2.5 border-b border-white/5 overflow-x-auto flex-shrink-0">
        {STAT_TABS.map(tab => (
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
              activeTab===tab.id ? 'bg-green-400/10 text-green-400 border border-green-400/20' : 'text-white/35 hover:text-white/65 hover:bg-white/4 border border-transparent'
            }`}>
            <tab.icon className="w-3.5 h-3.5" />{tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 mb-5 rounded-xl bg-blue-400/5 border border-blue-400/15 text-xs text-blue-400/70">
          <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          All statistics computed locally in-browser. Tests are applied only when data supports them. Significance threshold: α = 0.05. Correlation ≠ causation.
        </div>

        <motion.div key={activeTab} initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.15 }}>
          {activeTab === 'correlation' && <CorrelationSection table={table} />}
          {activeTab === 'regression'  && <RegressionSection table={table} />}
          {activeTab === 'ttest'       && <TTestSection table={table} />}
          {activeTab === 'chisquared'  && <ChiSquaredSection table={table} />}
          {activeTab === 'ci'          && <ConfidenceIntervalSection table={table} />}
        </motion.div>
      </div>
    </div>
  );
}