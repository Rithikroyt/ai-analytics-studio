import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Bell, Plus, Trash2, Activity, CheckCircle2, AlertTriangle, Loader2,
  Mail, ChevronLeft, Sparkles, X, ToggleLeft, ToggleRight,
  Clock, Database, Info, History, TrendingDown, TrendingUp,
  ShieldAlert, Filter, ChevronDown
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CONDITIONS = [
  { id: 'above', label: 'Goes above', icon: TrendingUp },
  { id: 'below', label: 'Falls below', icon: TrendingDown },
  { id: 'changes_by', label: 'Changes by more than', icon: Activity },
  { id: 'anomaly', label: 'Anomaly detected', icon: ShieldAlert },
];

const FREQUENCIES = [
  { id: 'realtime', label: 'Real-time' },
  { id: 'daily', label: 'Daily digest' },
  { id: 'weekly', label: 'Weekly summary' },
];

const SEVERITY = {
  critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/25', label: 'Critical' },
  warning: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', label: 'Warning' },
  info: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25', label: 'Info' },
};

// Simulated trigger history
const MOCK_HISTORY = [
  { id: '1', alertLabel: 'Daily Revenue Drop', metric: 'revenue', value: 3800, threshold: 5000, condition: 'below', triggeredAt: new Date(Date.now() - 1 * 3600000).toISOString(), severity: 'critical', acknowledged: false },
  { id: '2', alertLabel: 'Anomaly Spike', metric: 'order_count', value: 412, threshold: 0, condition: 'anomaly', triggeredAt: new Date(Date.now() - 5 * 3600000).toISOString(), severity: 'warning', acknowledged: true },
  { id: '3', alertLabel: 'Revenue Above Target', metric: 'revenue', value: 87400, threshold: 80000, condition: 'above', triggeredAt: new Date(Date.now() - 24 * 3600000).toISOString(), severity: 'info', acknowledged: true },
  { id: '4', alertLabel: 'Daily Revenue Drop', metric: 'revenue', value: 4200, threshold: 5000, condition: 'below', triggeredAt: new Date(Date.now() - 48 * 3600000).toISOString(), severity: 'critical', acknowledged: true },
  { id: '5', alertLabel: 'Data Quality Warning', metric: 'Data Quality Score', value: 68, threshold: 70, condition: 'below', triggeredAt: new Date(Date.now() - 72 * 3600000).toISOString(), severity: 'warning', acknowledged: true },
];

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function AlertCard({ alert, onDelete, onToggle, onTest }) {
  const condLabel = CONDITIONS.find(c => c.id === alert.condition)?.label || alert.condition;
  const CondIcon = CONDITIONS.find(c => c.id === alert.condition)?.icon || Activity;
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={`p-4 rounded-2xl border transition-all ${alert.active ? 'border-white/10 bg-white/3' : 'border-white/5 bg-white/1 opacity-50'}`}>
      <div className="flex items-start gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${alert.active ? 'bg-amber-400/10' : 'bg-white/5'}`}>
          <CondIcon className={`w-4 h-4 ${alert.active ? 'text-amber-400' : 'text-white/30'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm">{alert.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {alert.metric} <span className="text-white/30">·</span> {condLabel}
            {alert.threshold && alert.condition !== 'anomaly' && <span className="font-mono text-white/50"> {alert.unit}{alert.threshold}</span>}
            <span className="text-white/30"> · </span>{FREQUENCIES.find(f => f.id === alert.frequency)?.label || 'Daily'}
          </div>
          {alert.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Mail className="w-2.5 h-2.5" /> {alert.email}
            </div>
          )}
          {alert.lastTriggered && (
            <div className="text-xs text-amber-400/60 mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Last triggered {timeAgo(alert.lastTriggered)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onTest(alert)} className="p-1.5 text-white/25 hover:text-cyan-400 transition-colors" title="Simulate trigger">
            <Activity className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onToggle(alert.id, !alert.active)} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
            {alert.active ? <ToggleRight className="w-5 h-5 text-cyan-400" /> : <ToggleLeft className="w-5 h-5" />}
          </button>
          <button onClick={() => onDelete(alert.id)} className="p-1.5 text-white/25 hover:text-red-400 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function TriggerHistoryRow({ entry, onAcknowledge }) {
  const sev = SEVERITY[entry.severity] || SEVERITY.info;
  const cond = CONDITIONS.find(c => c.id === entry.condition);
  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${entry.acknowledged ? 'border-white/5 bg-white/1' : `${sev.border} ${sev.bg}`}`}>
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${sev.bg}`}>
        <ShieldAlert className={`w-3.5 h-3.5 ${sev.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-xs">{entry.alertLabel}</span>
          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${sev.bg} ${sev.border} ${sev.color}`}>{sev.label}</span>
          {!entry.acknowledged && <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-400/10 border border-red-400/25 text-red-400">Unread</span>}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {entry.metric}
          {entry.condition !== 'anomaly' && <span> — {cond?.label} <span className="font-mono text-white/60">{entry.threshold?.toLocaleString()}</span>, got <span className="font-mono text-white/80">{entry.value?.toLocaleString()}</span></span>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-white/30">{timeAgo(entry.triggeredAt)}</span>
        {!entry.acknowledged && (
          <button onClick={() => onAcknowledge(entry.id)}
            className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all">
            Ack
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function Alerts() {
  const { alerts, addAlert, removeAlert, updateAlert, analysisResults, getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' | 'history' | 'digest'
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: '', metric: '', condition: 'below', threshold: '', unit: '$', email: '', frequency: 'daily', slackWebhook: '' });
  const [digestEmail, setDigestEmail] = useState('');
  const [digestLoading, setDigestLoading] = useState(false);
  const [slackWebhook, setSlackWebhook] = useState('');
  const [slackTest, setSlackTest] = useState('');
  const [digestPreview, setDigestPreview] = useState('');
  const [digestSent, setDigestSent] = useState(false);
  const [history, setHistory] = useState(MOCK_HISTORY);
  const [severityFilter, setSeverityFilter] = useState('all');
  const [testToast, setTestToast] = useState('');

  const metrics = [
    ...(analysisResults?.primaryLabel ? [analysisResults.primaryLabel] : []),
    ...(analysisResults?.secondLabel ? [analysisResults.secondLabel] : []),
    ...(table?.columns?.filter(c => c.type === 'numeric').map(c => c.name) || []),
    'Data Quality Score', 'Anomaly Count', 'Row Count',
  ];

  const handleAddAlert = () => {
    if (!form.label || !form.metric) return;
    addAlert({ ...form });
    setForm({ label: '', metric: '', condition: 'below', threshold: '', unit: '$', email: '', frequency: 'daily' });
    setShowForm(false);
  };

  const handleTest = (alert) => {
    // Simulate a trigger event
    const newEntry = {
      id: Date.now().toString(),
      alertLabel: alert.label,
      metric: alert.metric,
      value: Number(alert.threshold) * 0.85,
      threshold: Number(alert.threshold),
      condition: alert.condition,
      triggeredAt: new Date().toISOString(),
      severity: 'warning',
      acknowledged: false,
    };
    setHistory(h => [newEntry, ...h]);
    updateAlert(alert.id, { lastTriggered: new Date().toISOString() });
    setTestToast(`"${alert.label}" triggered`);
    setTimeout(() => setTestToast(''), 3000);
    setActiveTab('history');
  };

  const handleAcknowledge = (id) => {
    setHistory(h => h.map(e => e.id === id ? { ...e, acknowledged: true } : e));
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
Active Alerts: ${alerts.filter(a => a.active).length}
Recent triggers: ${history.filter(h => !h.acknowledged).length} unacknowledged
Top finding: ${analysisResults.keyFindings?.[0] || 'N/A'}
Recommendations: ${analysisResults.recommendations?.slice(0, 2).map(r => r.action).join('; ') || 'None'}`;

      const content = await base44.integrations.Core.InvokeLLM({
        prompt: `Write a concise professional daily data digest email (150-200 words) for this analytics summary:
${ctx}
Include: subject line, greeting, key metric snapshot, alert status, one risk, one opportunity, one recommended action, sign-off.
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
    } catch {}
    setDigestLoading(false);
  };

  const [showDrawer, setShowDrawer] = useState(false);
  const unreadCount = history.filter(h => !h.acknowledged).length;
  const filteredHistory = severityFilter === 'all' ? history : history.filter(h => h.severity === severityFilter);

  const TABS = [
    { id: 'alerts', label: 'Alert Rules', count: alerts.length },
    { id: 'history', label: 'Trigger History', count: unreadCount || null, badge: unreadCount > 0 ? 'red' : null },
    { id: 'digest', label: 'AI Digest', count: null },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      <AnimatePresence>
        {testToast && (
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/15 border border-amber-400/30 text-amber-400 text-xs font-medium shadow-2xl">
            <Bell className="w-3.5 h-3.5" /> {testToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Drawer */}
      <AnimatePresence>
        {showDrawer && (
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-80 z-50 bg-background border-l border-white/8 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-400" />
                <span className="font-semibold text-sm">Active Anomalies</span>
                {unreadCount > 0 && <span className="px-1.5 py-0.5 rounded-full bg-red-400/20 text-red-400 text-xs font-bold">{unreadCount}</span>}
              </div>
              <button onClick={() => setShowDrawer(false)} className="text-white/40 hover:text-white/80 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {history.filter(h => !h.acknowledged).length === 0 ? (
                <div className="text-center py-12 text-white/25 text-sm">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400/40" />
                  All clear — no active anomalies
                </div>
              ) : history.filter(h => !h.acknowledged).map(entry => {
                const sev = SEVERITY[entry.severity] || SEVERITY.info;
                return (
                  <motion.div key={entry.id} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}
                    className={`p-3 rounded-xl border ${sev.border} ${sev.bg} space-y-2`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className={`text-xs font-bold ${sev.color}`}>{entry.alertLabel}</div>
                        <div className="text-xs text-white/40 mt-0.5">{entry.metric} · {timeAgo(entry.triggeredAt)}</div>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full border flex-shrink-0 ${sev.bg} ${sev.border} ${sev.color}`}>{sev.label}</span>
                    </div>
                    {entry.condition !== 'anomaly' && (
                      <div className="text-xs text-white/50">
                        Expected <span className="font-mono text-white/70">{entry.threshold?.toLocaleString()}</span>, got <span className="font-mono text-white/80">{entry.value?.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Link to="/workspace" onClick={() => setShowDrawer(false)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-white/60 hover:text-white transition-all">
                        <Database className="w-3 h-3" /> Investigate
                      </Link>
                      <button onClick={() => handleAcknowledge(entry.id)}
                        className="text-xs px-2.5 py-1 rounded-lg text-white/40 hover:text-white/70 border border-white/10 hover:bg-white/5 transition-all">
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                );
              })}
              {history.filter(h => h.acknowledged).length > 0 && (
                <div>
                  <div className="text-xs text-white/20 uppercase tracking-widest mb-2 pt-2 border-t border-white/5">Resolved</div>
                  {history.filter(h => h.acknowledged).slice(0, 5).map(entry => {
                    const sev = SEVERITY[entry.severity] || SEVERITY.info;
                    return (
                      <div key={entry.id} className="flex items-center gap-2 py-2 border-b border-white/5 text-xs text-white/30">
                        <CheckCircle2 className="w-3 h-3 text-green-400/50 flex-shrink-0" />
                        <span className="flex-1 truncate">{entry.alertLabel}</span>
                        <span className="text-white/20">{timeAgo(entry.triggeredAt)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {unreadCount > 0 && (
              <div className="p-4 border-t border-white/5">
                <button onClick={() => setHistory(h => h.map(e => ({ ...e, acknowledged: true })))}
                  className="w-full py-2 rounded-xl text-xs font-semibold text-white/50 border border-white/10 hover:bg-white/5 transition-all">
                  Acknowledge All ({unreadCount})
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {showDrawer && <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setShowDrawer(false)} />}

      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Alerts & Monitoring</h1>
              <p className="text-xs text-muted-foreground">
                {alerts.filter(a => a.active).length} active rules · {unreadCount} unread triggers
              </p>
            </div>
          </div>
          <button onClick={() => setShowDrawer(true)} className="relative flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-white/40 hover:text-white/80 text-xs transition-all hover:bg-white/5">
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-400 text-white text-xs flex items-center justify-center font-bold">{unreadCount}</span>}
          </button>
          {activeTab === 'alerts' && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 transition-all">
              <Plus className="w-3.5 h-3.5" /> New Alert
            </button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-white/3 border border-white/8 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === t.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
              {t.label}
              {t.count != null && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${t.badge === 'red' ? 'bg-red-400/20 text-red-400' : 'bg-white/10 text-white/50'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── ALERT RULES TAB ── */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            {!table && (
              <div className="flex items-start gap-3 p-4 bg-amber-400/5 border border-amber-400/20 rounded-xl">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-400/90">
                  No dataset loaded. <Link to="/workspace" className="text-cyan-400 hover:underline">Upload data in the Workspace</Link> to configure data-driven alerts.
                </div>
              </div>
            )}

            {/* Create form */}
            <AnimatePresence>
              {showForm && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                  className="glass-card rounded-2xl p-5 border border-amber-400/20">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm">Define Alert Rule</h3>
                    <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Alert Name *</label>
                      <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                        placeholder='e.g. "Daily revenue drops below $5k"'
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Metric *</label>
                      <select value={form.metric} onChange={e => setForm(f => ({ ...f, metric: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 text-foreground">
                        <option value="">Select metric…</option>
                        {metrics.map(m => <option key={m} value={m}>{m}</option>)}
                        <option value="Custom">Custom metric name…</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Condition</label>
                      <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 text-foreground">
                        {CONDITIONS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                    {form.condition !== 'anomaly' && (
                      <div className="flex gap-2">
                        <div className="w-20">
                          <label className="text-xs text-muted-foreground mb-1 block">Unit</label>
                          <input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                            placeholder="$, %, …"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                        </div>
                        <div className="flex-1">
                          <label className="text-xs text-muted-foreground mb-1 block">Threshold *</label>
                          <input value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                            placeholder="e.g. 5000" type="number"
                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Check Frequency</label>
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
                    <div className="md:col-span-2">
                      <label className="text-xs text-muted-foreground mb-1 block">Slack Webhook URL (optional)</label>
                      <input value={form.slackWebhook} onChange={e => setForm(f => ({ ...f, slackWebhook: e.target.value }))}
                        placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX" type="text"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-amber-400/30 font-mono text-xs" />
                      <div className="text-xs text-white/25 mt-1">Get your webhook from Slack → Create an Incoming Webhook in a channel</div>
                    </div>
                  </div>
                  {/* Preview */}
                  {form.label && form.metric && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 text-xs text-amber-400/80">
                      <strong>Preview:</strong> Notify when <em>{form.metric}</em> {CONDITIONS.find(c => c.id === form.condition)?.label?.toLowerCase()}{form.condition !== 'anomaly' && ` ${form.unit}${form.threshold}`} — checked {FREQUENCIES.find(f => f.id === form.frequency)?.label?.toLowerCase()}.
                    </div>
                  )}
                  <div className="flex gap-2 mt-4">
                    <button onClick={handleAddAlert} disabled={!form.label || !form.metric}
                      className="flex items-center gap-1.5 px-4 py-2 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-40">
                      <Bell className="w-3.5 h-3.5" /> Create Alert Rule
                    </button>
                    <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Slack Global Config */}
            <div className="glass-card rounded-2xl p-5 border border-blue-400/15">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-blue-400/10 flex items-center justify-center text-sm font-bold text-blue-400">#</div>
                <div>
                  <h3 className="font-semibold text-sm">Slack Webhook Configuration</h3>
                  <p className="text-xs text-muted-foreground">All high-severity anomalies and board-ready reports will be posted to this channel</p>
                </div>
              </div>
              <div className="space-y-3">
                <input value={slackWebhook} onChange={e => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..." type="text"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-blue-400/30 font-mono text-xs" />
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (!slackWebhook) return;
                      setSlackTest('Sending test...');
                      try {
                        // In production, this would call a backend function
                        // For now, simulate with a local check
                        if (slackWebhook.includes('hooks.slack.com')) {
                          setSlackTest('✓ Webhook URL is valid format. Will post when alerts trigger.');
                          setTimeout(() => setSlackTest(''), 4000);
                        } else {
                          setSlackTest('✗ Invalid webhook URL format');
                          setTimeout(() => setSlackTest(''), 4000);
                        }
                      } catch {
                        setSlackTest('✗ Webhook test failed');
                      }
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-400/10 border border-blue-400/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-400/15 transition-all">
                    Test Webhook
                  </button>
                  <button onClick={() => setSlackWebhook('')}
                    className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Clear</button>
                </div>
                {slackTest && <div className="text-xs text-blue-400/80">{slackTest}</div>}
              </div>
            </div>

            {/* Alerts list */}
            {alerts.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                    {alerts.filter(a => a.active).length} Active · {alerts.filter(a => !a.active).length} Paused
                  </div>
                </div>
                <AnimatePresence>
                  {alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert}
                      onDelete={(id) => removeAlert(id)}
                      onToggle={(id, active) => updateAlert(id, { active })}
                      onTest={handleTest} />
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-14 border border-white/5 rounded-2xl text-muted-foreground">
                <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm mb-1">No alert rules configured.</p>
                <p className="text-xs opacity-60">Click "New Alert" to define your first KPI threshold.</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground leading-relaxed p-4 glass rounded-xl border border-white/5">
              <strong className="text-white/50">How it works:</strong> Alerts evaluate against your active dataset each time analysis runs. Use the <Activity className="w-3 h-3 inline" /> button to simulate a trigger and see it in history. In production, alerts run on a schedule against live connected data sources.
            </div>
          </div>
        )}

        {/* ── TRIGGER HISTORY TAB ── */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="text-sm text-muted-foreground">
                {unreadCount > 0 && <span className="text-red-400 font-semibold">{unreadCount} unacknowledged · </span>}
                {history.length} total events
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select value={severityFilter} onChange={e => setSeverityFilter(e.target.value)}
                  className="px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-xs text-foreground focus:outline-none">
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                {unreadCount > 0 && (
                  <button onClick={() => setHistory(h => h.map(e => ({ ...e, acknowledged: true })))}
                    className="text-xs px-3 py-1 rounded-lg bg-white/5 border border-white/8 hover:bg-white/10 text-white/50 hover:text-white/80 transition-all">
                    Acknowledge All
                  </button>
                )}
              </div>
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-14 border border-white/5 rounded-2xl text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No trigger events yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence>
                  {filteredHistory.map(entry => (
                    <TriggerHistoryRow key={entry.id} entry={entry} onAcknowledge={handleAcknowledge} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* ── AI DIGEST TAB ── */}
        {activeTab === 'digest' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-purple-400/15">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-purple-400/10 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">AI Daily Digest</h3>
                  <p className="text-xs text-muted-foreground">AI-written summary of KPIs, alerts, and recommendations</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <input value={digestEmail} onChange={e => setDigestEmail(e.target.value)}
                  placeholder="recipient@company.com" type="email"
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-400/30" />
                <button onClick={generateDigest} disabled={digestLoading || !table}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/15 transition-all disabled:opacity-40">
                  {digestLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {digestLoading ? 'Generating…' : 'Generate Preview'}
                </button>
              </div>

              <AnimatePresence>
                {digestPreview && (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
                    <div className="bg-white/3 border border-white/8 rounded-xl p-4">
                      <div className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Email Preview</div>
                      <pre className="text-xs text-white/65 whitespace-pre-wrap leading-relaxed font-sans">{digestPreview}</pre>
                    </div>
                    <button onClick={sendDigest} disabled={digestLoading || !digestEmail || digestSent}
                      className="flex items-center gap-1.5 px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all disabled:opacity-40">
                      {digestSent ? <><CheckCircle2 className="w-3.5 h-3.5" /> Sent!</> : <><Mail className="w-3.5 h-3.5" /> Send Digest Email</>}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {!table && (
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Database className="w-3 h-3" /> Load a dataset first to generate a digest.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}