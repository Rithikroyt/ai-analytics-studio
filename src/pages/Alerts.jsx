/**
 * Alerts — Metric threshold monitoring + AI daily digest
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Bell, Plus, Trash2, Activity, CheckCircle2, AlertTriangle, Loader2,
  Mail, ChevronLeft, TrendingUp, Sparkles, X, ToggleLeft, ToggleRight,
  Clock, Database, Info
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CONDITIONS = [
  { id: 'above', label: 'Goes above' },
  { id: 'below', label: 'Falls below' },
  { id: 'changes_by', label: 'Changes by more than' },
  { id: 'anomaly', label: 'Anomaly detected' },
];

const FREQUENCIES = [
  { id: 'realtime', label: 'Real-time' },
  { id: 'daily', label: 'Daily digest' },
  { id: 'weekly', label: 'Weekly summary' },
];

function AlertCard({ alert, onDelete, onToggle }) {
  const condLabel = CONDITIONS.find(c => c.id === alert.condition)?.label || alert.condition;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${alert.active ? 'border-white/10 bg-white/3' : 'border-white/5 bg-white/1 opacity-50'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${alert.active ? 'bg-amber-400/10' : 'bg-white/5'}`}>
        <Bell className={`w-4 h-4 ${alert.active ? 'text-amber-400' : 'text-white/30'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-sm">{alert.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {alert.metric} · {condLabel} {alert.threshold}{alert.unit} · {FREQUENCIES.find(f => f.id === alert.frequency)?.label || 'Daily'}
        </div>
        {alert.email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Mail className="w-2.5 h-2.5" /> {alert.email}
          </div>
        )}
      </div>
      {alert.lastTriggered && (
        <div className="text-xs text-amber-400/70 flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3" /> {new Date(alert.lastTriggered).toLocaleDateString()}
        </div>
      )}
      <button onClick={() => onToggle(alert.id, !alert.active)} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
        {alert.active ? <ToggleRight className="w-5 h-5 text-cyan-400" /> : <ToggleLeft className="w-5 h-5" />}
      </button>
      <button onClick={() => onDelete(alert.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
        <Trash2 className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function Alerts() {
  const { alerts, addAlert, removeAlert, updateAlert, analysisResults, getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', metric: '', condition: 'above', threshold: '', unit: '', email: '', frequency: 'daily' });
  const [digestEmail, setDigestEmail] = useState('');
  const [digestLoading, setDigestLoading] = useState(false);
  const [digestPreview, setDigestPreview] = useState('');
  const [digestSent, setDigestSent] = useState(false);

  const metrics = [
    ...(analysisResults?.primaryLabel ? [analysisResults.primaryLabel] : []),
    ...(analysisResults?.secondLabel ? [analysisResults.secondLabel] : []),
    ...(table?.columns?.filter(c => c.type === 'numeric').map(c => c.name) || []),
    'Data Quality Score', 'Anomaly Count', 'Row Count',
  ];

  const handleAddAlert = () => {
    if (!form.label || !form.metric) return;
    addAlert({ ...form });
    setForm({ label: '', metric: '', condition: 'above', threshold: '', unit: '', email: '', frequency: 'daily' });
    setShowForm(false);
  };

  const generateDigest = async () => {
    if (!analysisResults || !table) return;
    setDigestLoading(true);
    setDigestPreview('');
    try {
      const ctx = `Dataset: ${table.name} (${table.rowCount} rows)
Quality: ${table.qualityScore}%
Primary KPI: ${analysisResults.primaryLabel} = ${analysisResults.totalValue?.toLocaleString()}
Growth: ${analysisResults.growthRate != null ? `${analysisResults.growthRate}%` : 'N/A'}
Anomalies: ${analysisResults.anomalies?.length || 0}
Top finding: ${analysisResults.keyFindings?.[0] || 'N/A'}
Recommendations: ${analysisResults.recommendations?.slice(0, 2).map(r => r.action).join('; ') || 'None'}`;

      const content = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a concise professional daily data digest email (150-200 words) for this analytics summary:
${ctx}
Include: subject line, greeting, key metric snapshot, one risk, one opportunity, one recommended action, sign-off.
Format with clear sections. Use professional but friendly tone.`,
      });
      setDigestPreview(content);
    } catch {
      setDigestPreview('Could not generate digest. Ensure a dataset is loaded with AI analysis completed.');
    }
    setDigestLoading(false);
  };

  const sendDigest = async () => {
    if (!digestEmail || !digestPreview) return;
    setDigestLoading(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: digestEmail,
        subject: `AI Analytics Daily Digest — ${table?.name || 'Your Dataset'} — ${new Date().toLocaleDateString()}`,
        body: digestPreview,
      });
      setDigestSent(true);
      setTimeout(() => setDigestSent(false), 4000);
    } catch {
      // silently fail
    }
    setDigestLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/dashboards" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Alerts & Monitoring</h1>
              <p className="text-xs text-muted-foreground">{alerts.filter(a => a.active).length} active · {alerts.length} total</p>
            </div>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Alert
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {/* No data warning */}
        {!table && (
          <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-400/90">
              No dataset loaded. <Link to="/workspace" className="text-cyan-400 hover:underline">Upload data in the Workspace</Link> to configure data-driven alerts.
            </div>
          </div>
        )}

        {/* New alert form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass-card rounded-2xl p-5 border border-amber-400/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Create Alert</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Alert Name *</label>
                  <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                    placeholder="e.g. Revenue drops below target"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Metric *</label>
                  <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 text-foreground">
                    <option value="">Select metric…</option>
                    {metrics.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 text-foreground">
                    {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Threshold</label>
                    <input value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                      placeholder="e.g. 1000000" type="number"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                    <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                      placeholder="$, %, …"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Frequency</label>
                  <select value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 text-foreground">
                    {FREQUENCIES.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Notify Email (optional)</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="team@company.com" type="email"
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleAddAlert} disabled={!form.label || !form.metric}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-40">
                  <Bell className="w-3.5 h-3.5" /> Create Alert
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alerts list */}
        {alerts.length > 0 ? (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Active Alerts ({alerts.filter(a => a.active).length})</div>
            <AnimatePresence>
              {alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert}
                  onDelete={(id) => removeAlert(id)}
                  onToggle={(id, active) => updateAlert(id, { active })} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No alerts configured. Click <span className="text-amber-400">"New Alert"</span> to set up metric monitoring.</p>
          </div>
        )}

        {/* Daily Digest */}
        <div className="glass-card rounded-2xl p-5 border border-purple-400/15">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-400/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">AI Daily Digest</h3>
              <p className="text-xs text-muted-foreground">Generate and send an AI-written data summary email</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <input value={digestEmail} onChange={e => setDigestEmail(e.target.value)}
              placeholder="recipient@company.com"
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-400/30" />
            <button onClick={generateDigest} disabled={digestLoading || !table}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/15 transition-all disabled:opacity-40">
              {digestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              {digestLoading ? 'Generating…' : 'Generate'}
            </button>
          </div>

          <AnimatePresence>
            {digestPreview && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="space-y-3">
                <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                  <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Preview</div>
                  <pre className="text-xs text-white/65 whitespace-pre-wrap leading-relaxed font-sans">{digestPreview}</pre>
                </div>
                <div className="flex gap-2">
                  <button onClick={sendDigest} disabled={digestLoading || !digestEmail || digestSent}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all disabled:opacity-40">
                    {digestSent ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sent!</> : <><Mail className="w-3.5 h-3.5" /> Send Email</>}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!table && (
            <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Database className="w-3 h-3" /> Load a dataset first to generate a digest
            </div>
          )}
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground leading-relaxed p-4 glass rounded-xl border border-white/5">
          <strong className="text-white/50">How alerts work:</strong> Alerts are evaluated when you run new analysis. In production, connect a scheduled backend function to auto-evaluate thresholds and send notifications.
        </div>
      </div>
    </div>
  );
}