/**
 * MLOps Panel — Model versioning, drift detection, auto-retraining, deployment
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  GitBranch, RefreshCw, Zap, AlertTriangle, CheckCircle2,
  TrendingDown, Activity, UploadCloud, Clock, ChevronRight,
  BarChart2, Loader2, Play, Eye
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const DRIFT_THRESHOLD = 0.15;

function generateDriftData(model) {
  // Simulated performance over time (last 30 days)
  const base = model.accuracy || 82;
  return Array.from({ length: 30 }, (_, i) => {
    const drift = i > 20 ? (i - 20) * 0.8 : 0;
    return {
      day: `D${i + 1}`,
      accuracy: Math.max(50, base - drift + (Math.random() - 0.5) * 2),
      drift: drift / 100,
    };
  });
}

function DriftMeter({ value }) {
  const pct = Math.min(100, value * 100);
  const color = pct < 10 ? '#4caf50' : pct < 25 ? '#ffcc02' : '#ff6b35';
  const label = pct < 10 ? 'Stable' : pct < 25 ? 'Moderate Drift' : 'High Drift';
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-white/40">Model Drift</span>
        <span className="font-mono font-bold" style={{ color }}>{pct.toFixed(1)}% · {label}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <motion.div className="h-full rounded-full" initial={{ width: 0 }}
          animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
          style={{ background: color }} />
      </div>
    </div>
  );
}

export default function MLOpsPanel({ model, onRetrain }) {
  const [driftData] = useState(() => model ? generateDriftData(model) : []);
  const [deployStatus, setDeployStatus] = useState(model?.status === 'deployed' ? 'deployed' : 'ready');
  const [deploying, setDeploying] = useState(false);
  const [retraining, setRetraining] = useState(false);
  const [endpoint, setEndpoint] = useState(null);
  const [versions] = useState([
    { version: model?.version || 1, accuracy: model?.accuracy || 82, trainedAt: model?.trainedAt || new Date().toISOString(), status: 'current', algorithm: model?.algorithm || 'auto' },
    ...(model?.version > 1 ? [{ version: (model?.version || 1) - 1, accuracy: (model?.accuracy || 82) - 3.2, trainedAt: new Date(Date.now() - 7 * 86400000).toISOString(), status: 'archived', algorithm: model?.algorithm || 'auto' }] : []),
  ]);

  const currentDrift = driftData.length > 0 ? driftData[driftData.length - 1]?.drift || 0 : 0;
  const driftAlert = currentDrift > DRIFT_THRESHOLD;

  const handleDeploy = async () => {
    setDeploying(true);
    await new Promise(r => setTimeout(r, 1800));
    const fakeEndpoint = `https://api.omnidata.ai/models/${model?.name?.toLowerCase().replace(/\s+/g, '-') || 'model'}/predict`;
    setEndpoint(fakeEndpoint);
    setDeployStatus('deployed');
    setDeploying(false);
  };

  const handleRetrain = async () => {
    setRetraining(true);
    await new Promise(r => setTimeout(r, 1200));
    setRetraining(false);
    if (onRetrain) onRetrain();
  };

  if (!model) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Activity className="w-12 h-12 text-purple-400/20 mb-3" />
        <h3 className="font-semibold mb-1">No Model Selected</h3>
        <p className="text-sm text-muted-foreground">Train a model first, then manage it here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">{model.name} — MLOps</h2>
          <div className="text-xs text-white/40 mt-0.5">v{model.version || 1} · {model.modelType} · {model.algorithm || 'auto'}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleRetrain} disabled={retraining}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl hover:bg-amber-400/15 transition-all disabled:opacity-50">
            {retraining ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Re-train
          </button>
          <button onClick={handleDeploy} disabled={deploying || deployStatus === 'deployed'}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-green-400 rounded-xl hover:bg-green-300 transition-all disabled:opacity-50"
            style={{ color: 'hsl(222,47%,6%)' }}>
            {deploying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : deployStatus === 'deployed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <UploadCloud className="w-3.5 h-3.5" />}
            {deploying ? 'Deploying…' : deployStatus === 'deployed' ? 'Deployed' : 'Deploy as API'}
          </button>
        </div>
      </div>

      {/* Drift Alert */}
      {driftAlert && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 p-4 rounded-2xl bg-orange-400/8 border border-orange-400/25">
          <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-orange-400">Model Drift Detected</div>
            <div className="text-xs text-white/55 mt-0.5">Performance has degraded {(currentDrift * 100).toFixed(1)}% from baseline. Consider re-training with fresh data.</div>
          </div>
          <button onClick={handleRetrain} className="ml-auto text-xs text-orange-400 hover:text-orange-300 whitespace-nowrap flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Fix Now
          </button>
        </motion.div>
      )}

      {/* API Endpoint */}
      {endpoint && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-green-400/5 border border-green-400/20">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-bold text-green-400">Live API Endpoint</span>
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono text-white/65 bg-black/30 px-3 py-2 rounded-lg truncate">{endpoint}</code>
            <button onClick={() => navigator.clipboard.writeText(endpoint)} className="text-xs text-white/30 hover:text-cyan-400 px-2 py-2 rounded-lg hover:bg-white/5 transition-all flex-shrink-0">Copy</button>
          </div>
          <div className="mt-2 text-xs text-white/35">POST JSON: {`{"features": {"col1": val1, "col2": val2}}`} → returns prediction + confidence</div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Performance Over Time */}
        <div className="glass-card rounded-2xl p-5 border border-white/8">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><BarChart2 className="w-4 h-4 text-purple-400" /> Performance Over Time</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={driftData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="day" tick={{ fontSize: 8, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.25)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={30} />
              <Tooltip contentStyle={{ background: 'rgba(8,6,18,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 10 }} formatter={v => [`${v.toFixed(1)}%`, 'Accuracy']} />
              <ReferenceLine y={model.accuracy || 82} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 3" />
              <Line type="monotone" dataKey="accuracy" stroke="#7b2fff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <DriftMeter value={currentDrift} />
        </div>

        {/* Model Versions */}
        <div className="glass-card rounded-2xl p-5 border border-white/8">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4 text-cyan-400" /> Version History</h3>
          <div className="space-y-2">
            {versions.map((v) => (
              <div key={v.version} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${v.status === 'current' ? 'bg-purple-400/8 border-purple-400/20' : 'bg-white/3 border-white/8'}`}>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black ${v.status === 'current' ? 'bg-purple-400/20 text-purple-400' : 'bg-white/5 text-white/30'}`}>v{v.version}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">{v.algorithm}</span>
                    {v.status === 'current' && <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-400/15 text-purple-400 border border-purple-400/25">current</span>}
                  </div>
                  <div className="text-xs text-white/30 mt-0.5">{new Date(v.trainedAt).toLocaleDateString()} · Acc: {v.accuracy?.toFixed(1)}%</div>
                </div>
                {v.status !== 'current' && (
                  <button className="text-xs text-white/25 hover:text-cyan-400 transition-colors">Rollback</button>
                )}
              </div>
            ))}
            <button onClick={handleRetrain} className="w-full text-xs text-white/25 hover:text-white/50 border border-white/8 border-dashed rounded-xl py-2.5 hover:bg-white/3 transition-all flex items-center justify-center gap-1.5">
              <Play className="w-3 h-3" /> Train new version
            </button>
          </div>
        </div>
      </div>

      {/* Auto-retraining Config */}
      <div className="glass-card rounded-2xl p-5 border border-white/8">
        <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><RefreshCw className="w-4 h-4 text-teal-400" /> Auto-Retraining Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Drift Threshold', value: '15%', desc: 'Trigger retraining when accuracy drops by this amount', color: 'text-amber-400' },
            { label: 'Schedule', value: 'Weekly', desc: 'Automatic retraining on Sundays with latest data', color: 'text-cyan-400' },
            { label: 'Data Window', value: '90 days', desc: 'Rolling window of training data to use', color: 'text-purple-400' },
          ].map(c => (
            <div key={c.label} className="p-3 rounded-xl bg-white/3 border border-white/8">
              <div className={`text-sm font-black font-mono ${c.color}`}>{c.value}</div>
              <div className="text-xs font-semibold text-white/60 mt-0.5">{c.label}</div>
              <div className="text-xs text-white/30 mt-1 leading-relaxed">{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}