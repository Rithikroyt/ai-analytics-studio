/**
 * SemanticMetricStore — Phase 3: Semantic Metrics Layer
 * Define, certify, and manage business metrics, dimensions, and relationships
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Plus, CheckCircle2, Shield, AlertTriangle, Loader2,
  Tag, Hash, TrendingUp, Trash2, RefreshCw, Edit2, Star, Code2, Database
} from 'lucide-react';

const DOMAIN_COLORS = {
  finance: 'text-green-400 bg-green-400/10 border-green-400/20',
  growth: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  operations: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  quality: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  forecast: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  strategy: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  general: 'text-white/40 bg-white/5 border-white/10',
};

const DEFAULT_METRICS = [
  { metricName: 'revenue', displayName: 'Total Revenue', businessDefinition: 'Sum of all recognized revenue', formula: 'SUM(revenue)', aggregationType: 'sum', domain: 'finance', sourceColumns: ['revenue', 'sales', 'gross_revenue'], synonyms: ['sales', 'income', 'top line'] },
  { metricName: 'gross_profit', displayName: 'Gross Profit', businessDefinition: 'Revenue minus cost of goods sold', formula: 'SUM(revenue) - SUM(cost)', aggregationType: 'custom', domain: 'finance', sourceColumns: ['revenue', 'cost'], synonyms: ['gross margin dollars'] },
  { metricName: 'gross_margin_pct', displayName: 'Gross Margin %', businessDefinition: 'Gross profit as a percentage of revenue', formula: '(SUM(revenue) - SUM(cost)) / SUM(revenue) * 100', aggregationType: 'ratio', domain: 'finance', sourceColumns: ['revenue', 'cost'], synonyms: ['margin %', 'gm%'], nonAdditive: true },
  { metricName: 'aov', displayName: 'Average Order Value', businessDefinition: 'Average revenue per order', formula: 'SUM(revenue) / COUNT(order_id)', aggregationType: 'ratio', domain: 'growth', sourceColumns: ['revenue', 'order_id'], synonyms: ['avg order value', 'basket size'], nonAdditive: true },
  { metricName: 'conversion_rate', displayName: 'Conversion Rate', businessDefinition: 'Percentage of users completing desired action', formula: 'completed_users / started_users * 100', aggregationType: 'ratio', domain: 'growth', sourceColumns: ['completed_users', 'started_users'], synonyms: ['cvr', 'conv rate'], nonAdditive: true },
  { metricName: 'churn_rate', displayName: 'Churn Rate', businessDefinition: 'Percentage of customers lost in period', formula: 'lost_customers / starting_customers * 100', aggregationType: 'ratio', domain: 'growth', sourceColumns: ['lost_customers', 'starting_customers'], synonyms: ['attrition rate', 'customer churn'], nonAdditive: true },
  { metricName: 'payroll_cost', displayName: 'Payroll Cost', businessDefinition: 'Total payroll and labor costs', formula: 'SUM(payroll_cost)', aggregationType: 'sum', domain: 'finance', sourceColumns: ['payroll_cost', 'salary', 'wage', 'labor_cost'], synonyms: ['labor cost', 'compensation', 'total payroll'] },
  { metricName: 'ltv_cac_ratio', displayName: 'LTV/CAC Ratio', businessDefinition: 'Customer lifetime value vs acquisition cost', formula: 'customer_lifetime_value / customer_acquisition_cost', aggregationType: 'ratio', domain: 'growth', sourceColumns: ['customer_lifetime_value', 'customer_acquisition_cost'], synonyms: ['ltv to cac', 'payback ratio'], nonAdditive: true },
];

function MetricCard({ metric, onCertify, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const integrityColor = (metric.integrityScore || 0) >= 70 ? 'text-green-400' : (metric.integrityScore || 0) >= 40 ? 'text-amber-400' : 'text-red-400';

  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden">
      <div className="p-4 cursor-pointer hover:bg-white/2 transition-all" onClick={() => setExpanded(v => !v)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-white/85">{metric.displayName || metric.metricName}</span>
              {metric.certified && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
              {metric.nonAdditive && <span className="text-xs px-1.5 py-0.5 bg-red-400/10 border border-red-400/20 text-red-400 rounded">non-additive</span>}
              <span className={`text-xs px-1.5 py-0.5 rounded border ${DOMAIN_COLORS[metric.domain] || DOMAIN_COLORS.general}`}>{metric.domain}</span>
            </div>
            <div className="text-xs text-white/35 mt-0.5 font-mono">{metric.formula}</div>
            {metric.businessDefinition && <div className="text-xs text-white/40 mt-1">{metric.businessDefinition}</div>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {metric.integrityScore > 0 && (
              <span className={`text-sm font-black ${integrityColor}`}>{metric.integrityScore}%</span>
            )}
            <button onClick={e => { e.stopPropagation(); onEdit?.(metric); }} className="p-1.5 rounded-lg text-white/25 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"><Edit2 className="w-3 h-3" /></button>
            <button onClick={e => { e.stopPropagation(); onDelete?.(metric.id); }} className="p-1.5 rounded-lg text-white/25 hover:text-red-400 hover:bg-red-400/10 transition-all"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-white/5">
          <div className="grid grid-cols-2 gap-3 text-xs mt-3">
            <div><span className="text-white/30">Source Columns:</span> <span className="text-cyan-400/80 font-mono">{(metric.sourceColumns || []).join(', ') || '—'}</span></div>
            <div><span className="text-white/30">Aggregation:</span> <span className="text-white/60">{metric.aggregationType}</span></div>
            <div><span className="text-white/30">Synonyms:</span> <span className="text-white/50">{(metric.synonyms || []).join(', ') || '—'}</span></div>
            <div><span className="text-white/30">Certified By:</span> <span className="text-white/50">{metric.certifiedBy || '—'}</span></div>
          </div>
          {!metric.certified && (
            <button onClick={() => onCertify?.(metric)} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
              <Shield className="w-3 h-3" /> Certify Metric
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

function MetricForm({ metric, onSave, onCancel }) {
  const [form, setForm] = useState(metric || {
    metricName: '', displayName: '', businessDefinition: '',
    formula: '', aggregationType: 'sum', domain: 'finance',
    sourceColumns: [], synonyms: [], nonAdditive: false,
  });
  const [saving, setSaving] = useState(false);
  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.metricName || !form.formula) return;
    setSaving(true);
    // Compute integrity score
    const integrityScore = Math.round(
      (form.formula ? 30 : 0) + (form.sourceColumns?.length > 0 ? 25 : 0) +
      (form.aggregationType ? 20 : 0) + (form.businessDefinition ? 15 : 0) + (form.certified ? 10 : 0)
    );
    await onSave({ ...form, integrityScore, sourceColumns: typeof form.sourceColumns === 'string' ? form.sourceColumns.split(',').map(s => s.trim()) : form.sourceColumns, synonyms: typeof form.synonyms === 'string' ? form.synonyms.split(',').map(s => s.trim()) : form.synonyms });
    setSaving(false);
  };

  return (
    <div className="space-y-4 p-5 rounded-2xl border border-white/10 bg-white/2">
      <h3 className="font-bold text-sm text-white/70">{metric ? 'Edit' : 'New'} Semantic Metric</h3>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Metric Name (snake_case)', key: 'metricName', placeholder: 'e.g. gross_margin_pct' },
          { label: 'Display Name', key: 'displayName', placeholder: 'e.g. Gross Margin %' },
        ].map(f => (
          <div key={f.key}>
            <label className="text-xs text-white/35 mb-1 block">{f.label}</label>
            <input value={form[f.key] || ''} onChange={e => up(f.key, e.target.value)} placeholder={f.placeholder}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
          </div>
        ))}
      </div>
      <div>
        <label className="text-xs text-white/35 mb-1 block">Formula</label>
        <input value={form.formula || ''} onChange={e => up('formula', e.target.value)} placeholder="e.g. SUM(revenue) / COUNT(order_id)"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none" />
      </div>
      <div>
        <label className="text-xs text-white/35 mb-1 block">Business Definition</label>
        <textarea value={form.businessDefinition || ''} onChange={e => up('businessDefinition', e.target.value)} rows={2}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/35 mb-1 block">Domain</label>
          <select value={form.domain || 'finance'} onChange={e => up('domain', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            {['finance', 'growth', 'operations', 'quality', 'forecast', 'strategy', 'general'].map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">Aggregation Type</label>
          <select value={form.aggregationType || 'sum'} onChange={e => up('aggregationType', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            {['sum', 'average', 'ratio', 'count', 'min', 'max', 'custom'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-white/35 mb-1 block">Source Columns (comma-separated)</label>
          <input value={Array.isArray(form.sourceColumns) ? form.sourceColumns.join(', ') : (form.sourceColumns || '')}
            onChange={e => up('sourceColumns', e.target.value)} placeholder="revenue, cost"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-mono focus:outline-none" />
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">Synonyms (comma-separated)</label>
          <input value={Array.isArray(form.synonyms) ? form.synonyms.join(', ') : (form.synonyms || '')}
            onChange={e => up('synonyms', e.target.value)} placeholder="sales, income"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
          <input type="checkbox" checked={!!form.nonAdditive} onChange={e => up('nonAdditive', e.target.checked)} className="rounded" />
          Non-additive (cannot SUM across dimensions — rates, percentages, averages)
        </label>
      </div>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving || !form.metricName || !form.formula}
          className="flex-1 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/20 transition-all disabled:opacity-40">
          {saving ? 'Saving…' : metric ? 'Update Metric' : 'Create Metric'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-white/30 border border-white/10 rounded-xl text-sm hover:text-white/60 transition-all">Cancel</button>
      </div>
    </div>
  );
}

export default function SemanticMetricStore() {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editMetric, setEditMetric] = useState(null);
  const [filter, setFilter] = useState('all');
  const [seeding, setSeeding] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setMetrics(await base44.entities.SemanticMetric.list('-created_date', 50)); } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const seedDefaults = async () => {
    setSeeding(true);
    for (const m of DEFAULT_METRICS) {
      const integrityScore = Math.round(
        (m.formula ? 30 : 0) + (m.sourceColumns?.length > 0 ? 25 : 0) +
        (m.aggregationType ? 20 : 0) + (m.businessDefinition ? 15 : 0) + 0
      );
      await base44.entities.SemanticMetric.create({ ...m, integrityScore, certified: false });
    }
    await load();
    setSeeding(false);
  };

  const handleSave = async (data) => {
    if (editMetric) {
      await base44.entities.SemanticMetric.update(editMetric.id, data);
    } else {
      await base44.entities.SemanticMetric.create(data);
    }
    setShowForm(false); setEditMetric(null);
    await load();
  };

  const handleCertify = async (metric) => {
    const user = await base44.auth.me();
    await base44.entities.SemanticMetric.update(metric.id, {
      certified: true, certifiedBy: user.email, certifiedAt: new Date().toISOString(),
    });
    await load();
  };

  const handleDelete = async (id) => {
    await base44.entities.SemanticMetric.delete(id);
    setMetrics(m => m.filter(x => x.id !== id));
  };

  const domains = ['all', 'finance', 'growth', 'operations', 'quality', 'forecast', 'strategy'];
  const filtered = metrics.filter(m => filter === 'all' || m.domain === filter);
  const certifiedCount = metrics.filter(m => m.certified).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-black">Semantic Metric Store</h1>
              <p className="text-xs text-muted-foreground">Define · Certify · Govern · Power SQL, AI, Reports</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-center px-4 py-2 rounded-xl bg-white/3 border border-white/8">
              <div className="text-lg font-black text-purple-400">{metrics.length}</div>
              <div className="text-xs text-white/30">Total</div>
            </div>
            <div className="text-center px-4 py-2 rounded-xl bg-white/3 border border-white/8">
              <div className="text-lg font-black text-green-400">{certifiedCount}</div>
              <div className="text-xs text-white/30">Certified</div>
            </div>
            {metrics.length === 0 && (
              <button onClick={seedDefaults} disabled={seeding}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-400/15 border border-amber-400/25 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/20 transition-all disabled:opacity-50">
                {seeding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Seed Default Metrics
              </button>
            )}
            <button onClick={() => { setShowForm(true); setEditMetric(null); }}
              className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/20 transition-all">
              <Plus className="w-3 h-3" /> Add Metric
            </button>
          </div>
        </div>
      </div>

      <div className="px-8 py-4 border-b border-white/8">
        <div className="flex gap-1 flex-wrap">
          {domains.map(d => (
            <button key={d} onClick={() => setFilter(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${filter === d ? 'bg-purple-400/20 text-purple-400' : 'text-white/30 hover:text-white/60'}`}>{d}</button>
          ))}
        </div>
      </div>

      <div className="p-8 space-y-4">
        <AnimatePresence>
          {(showForm || editMetric) && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <MetricForm metric={editMetric} onSave={handleSave} onCancel={() => { setShowForm(false); setEditMetric(null); }} />
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-white/30">
            {metrics.length === 0 ? 'No metrics yet. Seed default metrics or add your own.' : 'No metrics match this filter.'}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(m => (
              <MetricCard key={m.id} metric={m} onCertify={handleCertify} onDelete={handleDelete}
                onEdit={(m) => { setEditMetric(m); setShowForm(true); }} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}