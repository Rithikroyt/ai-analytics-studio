import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  Target, Plus, Trash2, CheckCircle2, AlertTriangle, Loader2,
  ChevronLeft, Sparkles, Search, Filter, X, Edit2, Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function MetricStore() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();

  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({
    metricId: '',
    displayName: '',
    formula: '',
    businessDefinition: '',
    aggregation: 'sum',
    sourceTable: '',
    sourceColumn: '',
    validDimensions: [],
    exampleQuestions: [],
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    const data = await base44.entities.GovernedMetric.list('-created_date', 50);
    setMetrics(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.metricId || !form.displayName) return;
    await base44.entities.GovernedMetric.create({
      ...form,
      owner: (await base44.auth.me())?.email || 'unknown',
    });
    setForm({
      metricId: '', displayName: '', formula: '', businessDefinition: '',
      aggregation: 'sum', sourceTable: '', sourceColumn: '',
      validDimensions: [], exampleQuestions: [],
    });
    setShowForm(false);
    fetchMetrics();
  };

  const handleDelete = async (id) => {
    await base44.entities.GovernedMetric.delete(id);
    fetchMetrics();
  };

  const handleBuildSemantic = async () => {
    if (!activeTable) return;
    try {
      const result = await base44.functions.invoke('buildSemanticLayer', {
        tableId: activeTable.id,
        tableName: activeTable.name,
      });
      if (result.data?.metrics) {
        for (const m of result.data.metrics) {
          await base44.entities.GovernedMetric.create(m);
        }
        fetchMetrics();
      }
    } catch (e) {
      console.error('Build semantic layer failed:', e);
    }
  };

  const filtered = metrics.filter(m =>
    (search === '' || m.displayName?.toLowerCase().includes(search.toLowerCase())) &&
    (filter === 'all' || m.certificationStatus === filter)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Metric Store</h1>
              <p className="text-xs text-muted-foreground">Governed KPI definitions and business metrics</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeTable && (
              <button onClick={handleBuildSemantic}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/15 transition-all">
                <Sparkles className="w-3.5 h-3.5" /> Auto-Build
              </button>
            )}
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-400/10 border border-purple-400/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/15 transition-all">
              <Plus className="w-3.5 h-3.5" /> New Metric
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Create form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass-card rounded-2xl p-5 border border-purple-400/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Create New Metric</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="text" value={form.metricId} onChange={e => setForm(f => ({ ...f, metricId: e.target.value }))}
                  placeholder="e.g., revenue" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                <input type="text" value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="e.g., Total Revenue" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                <input type="text" value={form.formula} onChange={e => setForm(f => ({ ...f, formula: e.target.value }))}
                  placeholder="e.g., SUM(revenue)" className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                <select value={form.aggregation} onChange={e => setForm(f => ({ ...f, aggregation: e.target.value }))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                  <option value="sum">Sum</option>
                  <option value="avg">Average</option>
                  <option value="count">Count</option>
                  <option value="min">Min</option>
                  <option value="max">Max</option>
                </select>
              </div>

              <textarea value={form.businessDefinition} onChange={e => setForm(f => ({ ...f, businessDefinition: e.target.value }))}
                placeholder="Business definition..." rows={2}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground resize-none mb-4" />

              <div className="flex gap-2">
                <button onClick={handleCreate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-purple-400/15 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-400/20 transition-all">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Create Metric
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search metrics..." className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-purple-400/30 text-foreground" />
          </div>
          <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg p-1">
            {['all', 'draft', 'verified', 'deprecated'].map(s => (
              <button key={s} onClick={() => setFilter(s)}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-all capitalize ${filter === s ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Metrics grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <Target className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">No metrics found</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Create your first KPI or auto-build from dataset.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {filtered.map((metric, i) => (
                <motion.div key={metric.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.05 }}
                  className="glass-card rounded-2xl p-5 border border-white/8 hover:border-purple-400/25 transition-all">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="font-bold text-sm">{metric.displayName}</div>
                      <code className="text-xs text-white/30 font-mono">{metric.metricId}</code>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${metric.certificationStatus === 'verified' ? 'bg-green-400/15 text-green-400' : metric.certificationStatus === 'deprecated' ? 'bg-red-400/15 text-red-400' : 'bg-white/10 text-white/60'}`}>
                      {metric.certificationStatus}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 mb-3 line-clamp-2">{metric.businessDefinition}</p>
                  <code className="text-xs text-cyan-400/70 block mb-3">{metric.formula}</code>
                  <div className="text-xs text-white/30 mb-3">From: {metric.sourceTable}</div>
                  <button onClick={() => handleDelete(metric.id)}
                    className="text-xs text-white/30 hover:text-red-400 transition-colors">Delete</button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}