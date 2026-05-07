/**
 * AlertsCenter — Metric deviation notification system
 * Configure thresholds, auto-checks on analysis, shows triggered alerts
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Bell, BellRing, Plus, Trash2, CheckCircle2, AlertTriangle, XCircle, Info, Loader2, X } from 'lucide-react';

const SEV_META = {
  info: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', icon: Info },
  warning: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: AlertTriangle },
  critical: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle },
};

const COND_LABELS = { above: 'goes above', below: 'falls below', change_pct: 'changes by more than' };

export default function AlertsCenter({ analysisResults, table, currentUser }) {
  const [alerts, setAlerts] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ metricName: '', condition: 'above', threshold: '', severity: 'warning' });

  const numericCols = table?.columns?.filter(c => c.type === 'numeric') || [];

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Auto-check on analysis results change
  useEffect(() => {
    if (analysisResults && alerts.length) checkAlerts();
  }, [analysisResults]);

  const fetchAlerts = async () => {
    const data = await base44.entities.MetricAlert.list('-created_date', 50);
    setAlerts(data);
  };

  const checkAlerts = async () => {
    if (!analysisResults || !table) return;
    setChecking(true);
    const r = analysisResults;

    for (const alert of alerts) {
      if (alert.status !== 'active') continue;
      let currentValue = null;

      // Find metric value
      if (alert.metricName === r.primaryLabel) currentValue = r.totalValue;
      else {
        const col = table.columns?.find(c => c.name === alert.metricName);
        if (col) {
          const vals = (table.rows || []).map(row => Number(row[col.name])).filter(v => !isNaN(v));
          if (vals.length) currentValue = vals.reduce((a, b) => a + b, 0) / vals.length;
        }
      }

      if (currentValue == null) continue;
      const baseline = alert.baselineValue || alert.threshold;
      const deviation = baseline ? ((currentValue - baseline) / Math.abs(baseline)) * 100 : 0;
      let triggered = false;

      if (alert.condition === 'above' && currentValue > alert.threshold) triggered = true;
      else if (alert.condition === 'below' && currentValue < alert.threshold) triggered = true;
      else if (alert.condition === 'change_pct' && Math.abs(deviation) > alert.threshold) triggered = true;

      if (triggered) {
        await base44.entities.MetricAlert.update(alert.id, {
          status: 'triggered',
          currentValue,
          deviation: Math.round(deviation * 10) / 10,
          triggeredAt: new Date().toISOString(),
          message: `${alert.metricName} is ${currentValue?.toLocaleString()} — ${COND_LABELS[alert.condition]} ${alert.threshold}`,
        });
      }
    }
    setChecking(false);
    fetchAlerts();
  };

  const createAlert = async () => {
    if (!form.metricName || !form.threshold) return;
    const currentVal = (() => {
      const r = analysisResults;
      if (!r || !table) return null;
      if (form.metricName === r.primaryLabel) return r.totalValue;
      const col = table.columns?.find(c => c.name === form.metricName);
      if (col) {
        const vals = (table.rows || []).map(row => Number(row[col.name])).filter(v => !isNaN(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      }
      return null;
    })();

    await base44.entities.MetricAlert.create({
      ...form,
      threshold: Number(form.threshold),
      baselineValue: currentVal,
      tableName: table?.name,
      userEmail: currentUser?.email,
      status: 'active',
    });
    setForm({ metricName: '', condition: 'above', threshold: '', severity: 'warning' });
    setShowCreate(false);
    fetchAlerts();
  };

  const triggered = alerts.filter(a => a.status === 'triggered');
  const active = alerts.filter(a => a.status === 'active');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${triggered.length ? 'bg-red-400/15 border border-red-400/20' : 'bg-white/5 border border-white/8'}`}>
            {triggered.length ? <BellRing className="w-4 h-4 text-red-400" /> : <Bell className="w-4 h-4 text-white/30" />}
          </div>
          <div>
            <h3 className="font-semibold text-sm">Metric Alerts</h3>
            <p className="text-xs text-white/35">{triggered.length > 0 ? `${triggered.length} triggered` : `${active.length} active monitors`}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analysisResults && (
            <button onClick={checkAlerts} disabled={checking}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/50 hover:text-white/80 transition-all disabled:opacity-40">
              {checking ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />} Check Now
            </button>
          )}
          <button onClick={() => setShowCreate(v => !v)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all">
            <Plus className="w-3 h-3" /> New Alert
          </button>
        </div>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="p-4 rounded-xl bg-white/3 border border-white/8 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/35 mb-1 block">Metric</label>
                  <select value={form.metricName} onChange={e => setForm(f => ({ ...f, metricName: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none text-foreground">
                    <option value="">— Select metric —</option>
                    {analysisResults?.primaryLabel && <option value={analysisResults.primaryLabel}>{analysisResults.primaryLabel}</option>}
                    {numericCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/35 mb-1 block">Condition</label>
                  <select value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none text-foreground">
                    <option value="above">Goes above</option>
                    <option value="below">Falls below</option>
                    <option value="change_pct">Changes by % more than</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-white/35 mb-1 block">Threshold {form.condition === 'change_pct' ? '(%)' : '(value)'}</label>
                  <input type="number" value={form.threshold} onChange={e => setForm(f => ({ ...f, threshold: e.target.value }))}
                    placeholder="e.g. 100000"
                    className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30 text-foreground" />
                </div>
                <div>
                  <label className="text-xs text-white/35 mb-1 block">Severity</label>
                  <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                    className="w-full px-2.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none text-foreground">
                    <option value="info">Info</option>
                    <option value="warning">Warning</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowCreate(false)} className="text-xs px-3 py-2 rounded-lg border border-white/10 text-white/40 hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={createAlert} disabled={!form.metricName || !form.threshold}
                  className="flex-1 text-xs px-3 py-2 rounded-lg bg-cyan-400 font-bold disabled:opacity-40 hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
                  Create Alert
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert list */}
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-white/25 text-xs">No alerts configured. Create one to monitor key metrics.</div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {[...triggered, ...active, ...alerts.filter(a => a.status === 'resolved' || a.status === 'snoozed')].map((alert, i) => {
            const sev = SEV_META[alert.severity] || SEV_META.warning;
            const SIcon = sev.icon;
            return (
              <motion.div key={alert.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border text-xs ${alert.status === 'triggered' ? `${sev.bg} ${sev.border}` : 'bg-white/2 border-white/6'}`}>
                <SIcon className={`w-3.5 h-3.5 flex-shrink-0 ${alert.status === 'triggered' ? sev.color : 'text-white/25'}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-white/70 truncate">{alert.metricName}</div>
                  <div className="text-white/35 mt-0.5">{COND_LABELS[alert.condition]} {alert.threshold?.toLocaleString()}</div>
                  {alert.message && <div className={`mt-0.5 font-medium ${sev.color}`}>{alert.message}</div>}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${alert.status === 'triggered' ? `${sev.bg} ${sev.color}` : 'bg-white/5 text-white/30'}`}>
                    {alert.status}
                  </span>
                  {alert.status === 'triggered' && (
                    <button onClick={async () => { await base44.entities.MetricAlert.update(alert.id, { status: 'resolved' }); fetchAlerts(); }}
                      className="p-1 rounded-lg hover:bg-green-400/10 text-green-400/50 hover:text-green-400 transition-colors">
                      <CheckCircle2 className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={async () => { await base44.entities.MetricAlert.delete(alert.id); fetchAlerts(); }}
                    className="p-1 rounded-lg hover:bg-red-400/10 text-white/20 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}