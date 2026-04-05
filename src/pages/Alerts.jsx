/**
 * Alerts — Performance threshold monitoring + daily digest email system
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Bell, Plus, Trash2, CheckCircle2, AlertTriangle,
  Mail, Sparkles, Loader2, ChevronLeft, X, Check, TrendingDown,
  TrendingUp, Activity, Clock, Send, ToggleLeft, ToggleRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CONDITIONS = [
  { value: 'below', label: 'drops below', icon: TrendingDown },
  { value: 'above', label: 'rises above', icon: TrendingUp },
  { value: 'changes_by', label: 'changes by ±', icon: Activity },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'realtime', label: 'On detection' },
];

// ── Alert form modal ──────────────────────────────────────────────
function AlertForm({ onSave, onClose, activeTable }) {
  const numericCols = activeTable?.columns?.filter(c => c.type === 'numeric') || [];
  const [label, setLabel] = useState('');
  const [metric, setMetric] = useState(numericCols[0]?.name || '');
  const [condition, setCondition] = useState('below');
  const [threshold, setThreshold] = useState('');
  const [unit, setUnit] = useState('%');
  const [email, setEmail] = useState('');
  const [frequency, setFrequency] = useState('daily');

  const handleSave = () => {
    if (!metric || !threshold || !email) return;
    onSave({ label: label || `${metric} ${condition} ${threshold}${unit}`, metric, condition, threshold: Number(threshold), unit, email, frequency });
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}>
      <motion.div initial={{ scale: 0.93, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.93, opacity: 0 }}
        className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-800 p-6 shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base">New Alert</h3>
          <button onClick={onClose} className="text-white/35 hover:text-white/70"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-white/45 mb-1.5 block">Alert Name (optional)</label>
            <input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Conversion rate alert"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground placeholder:text-white/25" />
          </div>

          <div>
            <label className="text-xs text-white/45 mb-1.5 block">Metric to Monitor</label>
            {numericCols.length > 0 ? (
              <select value={metric} onChange={e => setMetric(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground">
                {numericCols.map(c => <option key={c.name} value={c.name} className="bg-gray-900">{c.name}</option>)}
              </select>
            ) : (
              <input value={metric} onChange={e => setMetric(e.target.value)} placeholder="e.g. conversion_rate"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground" />
            )}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-white/45 mb-1.5 block">Condition</label>
              <select value={condition} onChange={e => setCondition(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground">
                {CONDITIONS.map(c => <option key={c.value} value={c.value} className="bg-gray-900">{c.label}</option>)}
              </select>
            </div>
            <div className="w-28">
              <label className="text-xs text-white/45 mb-1.5 block">Threshold</label>
              <input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="2"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground placeholder:text-white/25" />
            </div>
            <div className="w-20">
              <label className="text-xs text-white/45 mb-1.5 block">Unit</label>
              <select value={unit} onChange={e => setUnit(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground">
                {['%', 'K', 'M', 'units', '$', ''].map(u => <option key={u} value={u} className="bg-gray-900">{u || 'raw'}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-white/45 mb-1.5 block">Notify Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-cyan-400/40 text-foreground placeholder:text-white/25" />
          </div>

          <div>
            <label className="text-xs text-white/45 mb-1.5 block">Check Frequency</label>
            <div className="flex gap-2">
              {FREQUENCIES.map(f => (
                <button key={f.value} onClick={() => setFrequency(f.value)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${frequency === f.value ? 'bg-cyan-400/15 border-cyan-400/30 text-cyan-400' : 'border-white/10 text-white/40 hover:text-white/65'}`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/80 transition-all">Cancel</button>
          <button onClick={handleSave} disabled={!metric || !threshold || !email}
            className="flex-1 py-2.5 rounded-xl bg-cyan-400 text-sm font-bold hover:bg-cyan-300 transition-all disabled:opacity-40"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Check className="w-4 h-4 inline mr-1.5" />Create Alert
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Alert card ────────────────────────────────────────────────────
function AlertCard({ alert, onDelete, onToggle }) {
  const condLabel = CONDITIONS.find(c => c.value === alert.condition)?.label || alert.condition;
  const freqLabel = FREQUENCIES.find(f => f.value === alert.frequency)?.label || alert.frequency;
  const CondIcon = CONDITIONS.find(c => c.value === alert.condition)?.icon || Activity;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className={`rounded-2xl border p-4 transition-all ${alert.active ? 'border-amber-400/20 bg-amber-400/4' : 'border-white/8 bg-white/2 opacity-55'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.active ? 'bg-amber-400/10' : 'bg-white/8'}`}>
            <CondIcon className={`w-4 h-4 ${alert.active ? 'text-amber-400' : 'text-white/30'}`} />
          </div>
          <div>
            <div className="font-semibold text-sm mb-0.5">{alert.label}</div>
            <div className="text-xs text-white/40">
              Notify when <span className="text-white/60 font-mono">{alert.metric}</span>{' '}{condLabel}{' '}
              <span className="text-white/70 font-mono">{alert.threshold}{alert.unit}</span>
            </div>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-white/30">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{alert.email}</span>
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{freqLabel}</span>
              {alert.lastTriggered && <span className="text-amber-400">Last triggered {new Date(alert.lastTriggered).toLocaleDateString()}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onToggle(alert.id)} title={alert.active ? 'Disable' : 'Enable'}>
            {alert.active
              ? <ToggleRight className="w-6 h-6 text-green-400 hover:text-green-300 transition-colors" />
              : <ToggleLeft className="w-6 h-6 text-white/25 hover:text-white/50 transition-colors" />}
          </button>
          <button onClick={() => onDelete(alert.id)} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Daily Digest Panel ────────────────────────────────────────────
function DigestPanel({ analysisResults, activeTable, alerts }) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState('');
  const [sent, setSent] = useState(false);

  const buildDigestContext = () => {
    const r = analysisResults;
    const anomalyText = r?.anomalies?.length > 0
      ? r.anomalies.slice(0, 5).map(a => `- ${a.date || 'Row'}: value=${a.value} (expected ~${a.expected}, z-score=${a.zScore}, severity=${a.severity})`).join('\n')
      : 'No anomalies detected.';
    const alertsText = alerts.filter(a => a.active).map(a => `- ${a.label}: ${a.metric} ${a.condition} ${a.threshold}${a.unit}`).join('\n') || 'No active alerts.';
    return `
Dataset: ${activeTable?.name || 'Unknown'} (${activeTable?.rowCount || 0} rows)
Primary KPI: ${r?.primaryLabel || 'N/A'} = ${r?.totalValue || 'N/A'} (${r?.growthRate != null ? r.growthRate + '% trend' : 'trend N/A'})
Quality Score: ${activeTable?.qualityScore || 'N/A'}%
Anomalies:\n${anomalyText}
Active Alerts:\n${alertsText}
Top Correlations: ${r?.correlations?.slice(0,3).map(c=>`${c.colA}↔${c.colB}(r=${c.r})`).join(', ') || 'None'}
    `.trim();
  };

  const generatePreview = async () => {
    if (!analysisResults) return;
    setPreviewing(true);
    const ctx = buildDigestContext();
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a business data analyst. Write a concise, professional daily data digest email body based on this context:
${ctx}

Sections:
1. 📊 KPI Summary (2-3 sentences with numbers)
2. ⚠️ Anomalies & Alerts (list key issues, or note if none)
3. 💡 Key Insight (1 sentence)
4. ✅ Recommended Actions (2-3 bullet points)

Keep it under 200 words. Be specific and professional.`,
    });
    setPreview(result);
    setPreviewing(false);
  };

  const sendDigest = async () => {
    if (!email || !preview) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: `📊 Daily Data Digest — ${activeTable?.name || 'Analytics'} — ${new Date().toLocaleDateString()}`,
      body: `${preview}\n\n---\nSent by OmniData AI Analytics\nDataset: ${activeTable?.name || 'N/A'} · ${new Date().toLocaleString()}`,
    });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className="rounded-2xl border border-purple-400/20 bg-purple-400/4 p-5 space-y-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-xl bg-purple-400/15 border border-purple-400/20 flex items-center justify-center">
          <Mail className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <div className="font-semibold text-sm">Daily Digest Email</div>
          <div className="text-xs text-white/35">AI-generated anomaly + KPI summary · send to any recipient</div>
        </div>
      </div>

      {!analysisResults && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-400/8 border border-amber-400/20 text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Load and analyze a dataset in the Workspace first.
        </div>
      )}

      <div className="flex gap-2">
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="recipient@company.com"
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400/40 text-foreground placeholder:text-white/25" />
        <button onClick={generatePreview} disabled={previewing || !analysisResults}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-400/15 border border-purple-400/25 text-purple-400 text-sm hover:bg-purple-400/20 transition-all disabled:opacity-40">
          {previewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {previewing ? 'Generating…' : 'Preview'}
        </button>
      </div>

      <AnimatePresence>
        {preview && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            <div className="bg-black/30 border border-white/8 rounded-xl p-4 text-xs text-white/65 leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto">
              {preview}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={sendDigest} disabled={sending || !email || sent}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${sent ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-purple-400 text-white hover:bg-purple-300'}`}>
                {sent ? <><CheckCircle2 className="w-4 h-4" /> Sent!</> : sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</> : <><Send className="w-4 h-4" /> Send Digest</>}
              </button>
              <button onClick={() => { setPreview(''); }} className="text-xs text-white/30 hover:text-white/55 transition-colors">Discard</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Alerts page ──────────────────────────────────────────────
export default function Alerts() {
  const { alerts, addAlert, updateAlert, removeAlert, analysisResults, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [showForm, setShowForm] = useState(false);

  const handleToggle = (id) => {
    const alert = alerts.find(a => a.id === id);
    if (alert) updateAlert(id, { active: !alert.active });
  };

  const activeCount = alerts.filter(a => a.active).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboards" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Alerts</h1>
              <p className="text-xs text-muted-foreground">{activeCount} active · {alerts.length} total</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 text-sm font-semibold hover:bg-amber-400/15 transition-all">
            <Plus className="w-4 h-4" /> New Alert
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* Daily Digest */}
        <DigestPanel analysisResults={analysisResults} activeTable={activeTable} alerts={alerts} />

        {/* Alert list */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white/50 uppercase tracking-widest text-xs">Performance Thresholds</div>
            {alerts.length > 0 && <span className="text-xs text-white/25">{activeCount} of {alerts.length} active</span>}
          </div>

          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-white/8 rounded-2xl">
              <Bell className="w-10 h-10 text-white/15 mb-3" />
              <h2 className="text-sm font-semibold text-white/40 mb-1">No alerts configured</h2>
              <p className="text-xs text-white/25 max-w-xs mb-4">Set performance thresholds to get notified when key metrics drift outside acceptable ranges.</p>
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-sm font-semibold hover:bg-amber-400/15 transition-all">
                <Plus className="w-4 h-4" /> Create First Alert
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {alerts.map(alert => (
                  <AlertCard key={alert.id} alert={alert} onDelete={removeAlert} onToggle={handleToggle} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-white/8 bg-white/2 p-4 text-xs text-white/35 leading-relaxed">
          <div className="font-semibold text-white/45 mb-1">How alerts work</div>
          After each AI analysis run in the Workspace, the system evaluates your configured thresholds against the latest statistics.
          Use the Daily Digest to get a one-click AI-written email summarizing anomalies, KPI shifts, and recommendations.
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <AlertForm onSave={addAlert} onClose={() => setShowForm(false)} activeTable={activeTable} />
        )}
      </AnimatePresence>
    </div>
  );
}