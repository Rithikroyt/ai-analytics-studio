/**
 * A/B Testing Studio — Statistical Experimentation Module
 * Z-test for proportions, lift calculation, confidence intervals
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { FlaskConical, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, Info, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

// Z-table lookup for two-tailed test
function zToP(z) {
  const absZ = Math.abs(z);
  if (absZ >= 3.09) return 0.002;
  if (absZ >= 2.58) return 0.01;
  if (absZ >= 2.33) return 0.02;
  if (absZ >= 1.96) return 0.05;
  if (absZ >= 1.65) return 0.10;
  if (absZ >= 1.28) return 0.20;
  return 0.30 + (1.28 - absZ) * 0.5;
}

function runABTest({ controlConversions, controlTotal, treatmentConversions, treatmentTotal }) {
  const controlRate = controlConversions / controlTotal;
  const treatmentRate = treatmentConversions / treatmentTotal;
  const pooled = (controlConversions + treatmentConversions) / (controlTotal + treatmentTotal);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / controlTotal + 1 / treatmentTotal));
  const z = se > 0 ? (treatmentRate - controlRate) / se : 0;
  const pValue = zToP(z);
  const lift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;
  const ci95 = 1.96 * se;
  return {
    controlRate: (controlRate * 100).toFixed(2),
    treatmentRate: (treatmentRate * 100).toFixed(2),
    lift: lift.toFixed(2),
    zStat: z.toFixed(3),
    pValue: pValue.toFixed(4),
    significant: pValue < 0.05,
    ciLow: ((treatmentRate - controlRate - ci95) * 100).toFixed(2),
    ciHigh: ((treatmentRate - controlRate + ci95) * 100).toFixed(2),
  };
}

const Field = ({ label, value, onChange, type = 'number' }) => (
  <div className="flex flex-col gap-1">
    <label className="text-xs text-white/40 uppercase tracking-widest">{label}</label>
    <input type={type} value={value} onChange={e => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
      className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-foreground focus:outline-none focus:border-cyan-400/30 font-mono" />
  </div>
);

export default function ABTestingStudio() {
  const [form, setForm] = useState({
    metricName: 'Conversion Rate',
    controlTotal: 1000,
    controlConversions: 120,
    treatmentTotal: 1000,
    treatmentConversions: 145,
  });
  const [result, setResult] = useState(null);

  const f = (k) => (v) => setForm(p => ({ ...p, [k]: v }));

  const run = () => {
    if (!form.controlTotal || !form.treatmentTotal) return;
    setResult(runABTest(form));
  };

  const chartData = result ? [
    { group: 'Control', rate: parseFloat(result.controlRate) },
    { group: 'Treatment', rate: parseFloat(result.treatmentRate) },
  ] : [];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
          <FlaskConical className="w-5 h-5 text-purple-400" />
        </div>
        <div>
          <h2 className="text-xl font-black">A/B Testing Studio</h2>
          <p className="text-xs text-muted-foreground">Statistical significance · Lift calculation · Confidence intervals</p>
        </div>
      </div>

      {/* Formula banner */}
      <div className="px-4 py-2.5 rounded-xl bg-purple-400/5 border border-purple-400/15 text-xs text-purple-300 font-mono">
        Lift % = ((Treatment Rate − Control Rate) / Control Rate) × 100 &nbsp;·&nbsp; Z-test for proportions &nbsp;·&nbsp; α = 0.05
      </div>

      {/* Input grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 rounded-2xl border border-white/8 bg-white/2">
        <div className="space-y-4">
          <div className="text-xs font-semibold text-white/50 uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-white/30" /> Control Group
          </div>
          <Field label="Total Visitors" value={form.controlTotal} onChange={f('controlTotal')} />
          <Field label="Conversions" value={form.controlConversions} onChange={f('controlConversions')} />
        </div>
        <div className="space-y-4">
          <div className="text-xs font-semibold text-cyan-400/70 uppercase tracking-widest mb-2 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-cyan-400" /> Treatment Group
          </div>
          <Field label="Total Visitors" value={form.treatmentTotal} onChange={f('treatmentTotal')} />
          <Field label="Conversions" value={form.treatmentConversions} onChange={f('treatmentConversions')} />
        </div>
        <div className="md:col-span-2">
          <Field label="Metric Name" value={form.metricName} onChange={f('metricName')} type="text" />
        </div>
        <div className="md:col-span-2">
          <button onClick={run}
            className="w-full py-3 rounded-xl bg-purple-400/15 border border-purple-400/25 text-purple-300 font-bold text-sm hover:bg-purple-400/20 transition-all">
            Run Statistical Test
          </button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Significance banner */}
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${result.significant ? 'bg-green-400/8 border-green-400/20 text-green-400' : 'bg-amber-400/8 border-amber-400/20 text-amber-400'}`}>
            {result.significant ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
            <div>
              <div className="font-bold text-sm">
                {result.significant ? `Statistically Significant (p=${result.pValue})` : `Not Significant Yet (p=${result.pValue})`}
              </div>
              <div className="text-xs opacity-70 mt-0.5">
                {result.significant
                  ? `Treatment ${parseFloat(result.lift) > 0 ? 'outperforms' : 'underperforms'} control by ${Math.abs(result.lift)}% lift. Ship it.`
                  : 'Collect more data before making a decision. Insufficient evidence.'}
              </div>
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Control Rate', value: `${result.controlRate}%`, color: 'text-white/70' },
              { label: 'Treatment Rate', value: `${result.treatmentRate}%`, color: 'text-cyan-400' },
              { label: 'Lift', value: `${result.lift > 0 ? '+' : ''}${result.lift}%`, color: parseFloat(result.lift) > 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'p-value', value: result.pValue, color: result.significant ? 'text-green-400' : 'text-amber-400' },
            ].map(k => (
              <div key={k.label} className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="text-xs text-white/35 uppercase tracking-widest mb-1">{k.label}</div>
                <div className={`text-xl font-black ${k.color}`}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Chart + details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2">
              <div className="text-xs text-white/35 uppercase tracking-widest mb-3">Conversion Rate Comparison</div>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <XAxis dataKey="group" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 10 }} unit="%" />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} formatter={(v) => [`${v}%`, 'Rate']} />
                  <Bar dataKey="rate" fill="#a855f7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="p-4 rounded-2xl border border-white/8 bg-white/2 space-y-3">
              <div className="text-xs text-white/35 uppercase tracking-widest mb-3">Statistical Details</div>
              {[
                { label: 'Z-Statistic', value: result.zStat },
                { label: '95% CI (Diff)', value: `[${result.ciLow}%, ${result.ciHigh}%]` },
                { label: 'Significance Level', value: 'α = 0.05' },
                { label: 'Test Type', value: 'Two-tailed Z-test' },
              ].map(d => (
                <div key={d.label} className="flex items-center justify-between text-sm border-b border-white/5 pb-2">
                  <span className="text-white/40">{d.label}</span>
                  <span className="font-mono text-white/80">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation */}
          <div className="p-4 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-1.5">Business Recommendation</div>
            <p className="text-sm text-white/70">
              {result.significant && parseFloat(result.lift) > 0
                ? `✅ Roll out the treatment variant. It improves ${form.metricName} by ${result.lift}% (p=${result.pValue}). At current scale, this represents a meaningful and statistically reliable improvement.`
                : result.significant && parseFloat(result.lift) < 0
                  ? `❌ Do not ship the treatment. It reduces ${form.metricName} by ${Math.abs(result.lift)}%. Revert to control.`
                  : `⏳ The experiment is inconclusive. Continue running until you have enough statistical power. Typical recommendation: collect ~${Math.round(Math.max(form.controlTotal, form.treatmentTotal) * 1.5).toLocaleString()} samples per group.`}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
}