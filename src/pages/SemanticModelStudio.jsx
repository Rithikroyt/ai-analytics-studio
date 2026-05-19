/**
 * Semantic Model Studio — Phase 1
 * Manage SemanticMetrics, Dimensions, Relationships, and Verified Answers
 * Powers SQL Studio, Visual Builder, AI Analyst, Agent Studio, Reports
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Layers, Plus, CheckCircle2, AlertTriangle, Trash2, X,
  ChevronLeft, Sparkles, Search, Shield, Link2, BarChart3,
  Lock, Star, RefreshCw, Loader2, Eye, Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';

// MetricIntegrityScore = 0.30*FormulaValidity + 0.25*SourceColumnFit + 0.20*AggregationCorrectness + 0.15*BusinessDefinition + 0.10*Certification
function computeIntegrityScore(metric) {
  const fv = metric.formula?.length > 3 ? 90 : 40;
  const scf = (metric.sourceColumns?.length || 0) > 0 ? 85 : 30;
  const ac = metric.aggregationType ? 90 : 20;
  const bd = (metric.businessDefinition?.length || 0) > 20 ? 85 : 30;
  const cert = metric.certified ? 100 : 0;
  return Math.round(0.30 * fv + 0.25 * scf + 0.20 * ac + 0.15 * bd + 0.10 * cert);
}

const DOMAIN_COLORS = {
  finance: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  growth: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  operations: 'text-green-400 bg-green-400/10 border-green-400/20',
  quality: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  forecast: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  strategy: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  general: 'text-white/50 bg-white/5 border-white/10',
};

const TABS = [
  { id: 'metrics', label: 'Metrics', icon: BarChart3 },
  { id: 'dimensions', label: 'Dimensions', icon: Tag },
  { id: 'relationships', label: 'Relationships', icon: Link2 },
  { id: 'verified', label: 'Verified Answers', icon: Shield },
];

const SAMPLE_METRICS = [
  { metricName: 'Total Revenue', formula: 'SUM(revenue)', aggregationType: 'sum', businessDefinition: 'Sum of all revenue recognized in the period', domain: 'finance', sourceColumns: ['revenue'], synonyms: ['sales', 'top line'], certified: false },
  { metricName: 'Gross Margin %', formula: '(SUM(revenue) - SUM(cost)) / SUM(revenue) * 100', aggregationType: 'ratio', businessDefinition: 'Percentage of revenue remaining after deducting cost of goods sold', domain: 'finance', sourceColumns: ['revenue', 'cost'], synonyms: ['margin', 'gross profit rate'], certified: false, nonAdditive: true },
  { metricName: 'Average Order Value', formula: 'SUM(revenue) / COUNT(order_id)', aggregationType: 'ratio', businessDefinition: 'Average revenue generated per order', domain: 'growth', sourceColumns: ['revenue', 'order_id'], synonyms: ['AOV', 'avg order'], certified: false },
  { metricName: 'Customer Retention Rate', formula: '(customers_end - new_customers) / customers_start * 100', aggregationType: 'ratio', businessDefinition: 'Percentage of customers retained from prior period', domain: 'growth', sourceColumns: ['customers_end', 'new_customers', 'customers_start'], synonyms: ['retention', 'loyalty rate'], certified: false, nonAdditive: true },
  { metricName: 'Conversion Rate', formula: 'COUNT(completed) / COUNT(started) * 100', aggregationType: 'ratio', businessDefinition: 'Percentage of users who completed a target action', domain: 'growth', sourceColumns: ['completed', 'started'], synonyms: ['CVR', 'conversion'], certified: false, nonAdditive: true },
];

export default function SemanticModelStudio() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [tab, setTab] = useState('metrics');
  const [metrics, setMetrics] = useState([]);
  const [dimensions, setDimensions] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [verifiedAnswers, setVerifiedAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [domainFilter, setDomainFilter] = useState('all');
  const [autoBuilding, setAutoBuilding] = useState(false);
  const [form, setForm] = useState({ metricName: '', formula: '', aggregationType: 'sum', businessDefinition: '', domain: 'finance', sourceColumns: [], synonyms: [] });

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [m, d, r, v] = await Promise.all([
        base44.entities.SemanticMetric.list('-created_date', 50),
        base44.entities.SemanticDimension.list('-created_date', 50),
        base44.entities.MetricRelationship.list('-created_date', 50),
        base44.entities.VerifiedAnswer.list('-created_date', 50),
      ]);
      setMetrics(m); setDimensions(d); setRelationships(r); setVerifiedAnswers(v);
    } catch (e) {}
    setLoading(false);
  };

  const handleAutoPopulate = async () => {
    setAutoBuilding(true);
    const user = await base44.auth.me();
    for (const m of SAMPLE_METRICS) {
      const score = computeIntegrityScore(m);
      await base44.entities.SemanticMetric.create({ ...m, integrityScore: score, owner: user?.email || '' });
    }
    await loadAll();
    setAutoBuilding(false);
  };

  const handleCreateMetric = async () => {
    if (!form.metricName || !form.formula) return;
    const score = computeIntegrityScore(form);
    await base44.entities.SemanticMetric.create({ ...form, integrityScore: score });
    setForm({ metricName: '', formula: '', aggregationType: 'sum', businessDefinition: '', domain: 'finance', sourceColumns: [], synonyms: [] });
    setShowForm(false);
    loadAll();
  };

  const handleCertify = async (metric) => {
    const user = await base44.auth.me();
    const score = computeIntegrityScore({ ...metric, certified: true });
    await base44.entities.SemanticMetric.update(metric.id, { certified: true, certifiedBy: user?.email, certifiedAt: new Date().toISOString(), integrityScore: score });
    loadAll();
  };

  const handleDelete = async (entity, id) => {
    await base44.entities[entity].delete(id);
    loadAll();
  };

  const filteredMetrics = metrics.filter(m =>
    (search === '' || m.metricName?.toLowerCase().includes(search.toLowerCase()) || m.businessDefinition?.toLowerCase().includes(search.toLowerCase())) &&
    (domainFilter === 'all' || m.domain === domainFilter)
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between sticky top-0 z-20 bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link to="/workspace" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-indigo-400/10 border border-indigo-400/20 flex items-center justify-center">
            <Layers className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Semantic Model Studio</h1>
            <p className="text-xs text-muted-foreground">Governed metrics · Dimensions · Relationships · Verified Answers — powers AI, SQL, and dashboards</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleAutoPopulate} disabled={autoBuilding}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/15 transition-all disabled:opacity-50">
            {autoBuilding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            Auto-Populate Samples
          </button>
          <button onClick={loadAll} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="px-8 py-3 border-b border-white/5 flex items-center gap-6 text-xs text-white/40">
        <span><span className="text-white/70 font-bold">{metrics.length}</span> Metrics</span>
        <span><span className="text-white/70 font-bold">{metrics.filter(m => m.certified).length}</span> Certified</span>
        <span><span className="text-white/70 font-bold">{dimensions.length}</span> Dimensions</span>
        <span><span className="text-white/70 font-bold">{relationships.length}</span> Relationships</span>
        <span><span className="text-white/70 font-bold">{verifiedAnswers.filter(v => v.status === 'certified').length}</span> Verified Answers</span>
      </div>

      {/* Tabs */}
      <div className="px-8 border-b border-white/5 flex gap-0.5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${tab === t.id ? 'border-indigo-400 text-indigo-400' : 'border-transparent text-white/35 hover:text-white/65'}`}>
            <t.icon className="w-3.5 h-3.5" />{t.label}
          </button>
        ))}
      </div>

      <div className="px-8 py-6 max-w-7xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
        ) : (
          <>
            {/* METRICS TAB */}
            {tab === 'metrics' && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search metrics…"
                      className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-indigo-400/30" />
                  </div>
                  <div className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
                    {['all','finance','growth','operations','quality','forecast'].map(d => (
                      <button key={d} onClick={() => setDomainFilter(d)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all capitalize ${domainFilter === d ? 'bg-indigo-400/20 text-indigo-400' : 'text-white/35 hover:text-white/65'}`}>{d}</button>
                    ))}
                  </div>
                  <button onClick={() => setShowForm(v => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/15 transition-all">
                    <Plus className="w-3.5 h-3.5" /> New Metric
                  </button>
                </div>

                <AnimatePresence>
                  {showForm && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                      className="glass-card rounded-2xl p-5 border border-indigo-400/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold">Define Semantic Metric</span>
                        <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-white/40" /></button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        <input placeholder="Metric Name (e.g. Total Revenue)" value={form.metricName} onChange={e => setForm(f => ({...f, metricName: e.target.value}))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none col-span-2 md:col-span-1" />
                        <input placeholder="Formula (e.g. SUM(revenue))" value={form.formula} onChange={e => setForm(f => ({...f, formula: e.target.value}))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
                        <select value={form.aggregationType} onChange={e => setForm(f => ({...f, aggregationType: e.target.value}))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                          {['sum','average','ratio','count','min','max','custom'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <select value={form.domain} onChange={e => setForm(f => ({...f, domain: e.target.value}))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                          {['finance','growth','operations','quality','forecast','strategy','general'].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                        <input placeholder="Source columns (comma separated)" value={form.sourceColumns?.join(', ')} onChange={e => setForm(f => ({...f, sourceColumns: e.target.value.split(',').map(s => s.trim()).filter(Boolean)}))}
                          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
                      </div>
                      <textarea placeholder="Business definition — what does this metric mean to stakeholders?" value={form.businessDefinition} onChange={e => setForm(f => ({...f, businessDefinition: e.target.value}))}
                        rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
                      <div className="flex gap-2">
                        <button onClick={handleCreateMetric}
                          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-400/15 border border-indigo-400/25 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/20 transition-all">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Create
                        </button>
                        <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 hover:text-white/60 border border-white/8 rounded-xl">Cancel</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {filteredMetrics.length === 0 ? (
                  <div className="text-center py-16 border border-white/5 rounded-2xl">
                    <Layers className="w-12 h-12 text-white/10 mx-auto mb-4" />
                    <div className="font-semibold mb-1">No metrics yet</div>
                    <div className="text-sm text-white/30">Click "Auto-Populate Samples" to seed enterprise metrics or create your own.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredMetrics.map((m, i) => {
                      const score = m.integrityScore || computeIntegrityScore(m);
                      const scoreColor = score >= 80 ? 'text-green-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
                      const domainClass = DOMAIN_COLORS[m.domain] || DOMAIN_COLORS.general;
                      return (
                        <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                          className="glass-card rounded-2xl p-5 border border-white/8 hover:border-indigo-400/25 transition-all space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="font-bold text-sm flex items-center gap-1.5">
                                {m.certified && <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />}
                                {m.metricName}
                              </div>
                              <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full border mt-1 ${domainClass}`}>{m.domain}</span>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className={`text-lg font-black ${scoreColor}`}>{score}</div>
                              <div className="text-xs text-white/25">integrity</div>
                            </div>
                          </div>
                          <code className="text-xs text-cyan-400/80 block bg-white/3 rounded-lg px-3 py-2 font-mono">{m.formula}</code>
                          {m.businessDefinition && <p className="text-xs text-white/40 line-clamp-2">{m.businessDefinition}</p>}
                          {m.sourceColumns?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {m.sourceColumns.map(c => <span key={c} className="text-xs px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-white/40 font-mono">{c}</span>)}
                            </div>
                          )}
                          {m.nonAdditive && (
                            <div className="flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/15 rounded-lg px-2.5 py-1.5">
                              <AlertTriangle className="w-3 h-3" /> Non-additive — do NOT SUM across dimensions
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-1 border-t border-white/5">
                            {!m.certified ? (
                              <button onClick={() => handleCertify(m)}
                                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
                                <Star className="w-3 h-3" /> Certify
                              </button>
                            ) : (
                              <span className="text-xs text-green-400/60">Certified by {m.certifiedBy?.split('@')[0]}</span>
                            )}
                            <button onClick={() => handleDelete('SemanticMetric', m.id)} className="text-xs text-white/20 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* DIMENSIONS TAB */}
            {tab === 'dimensions' && (
              <div className="space-y-4">
                <DimensionsManager dimensions={dimensions} onRefresh={loadAll} onDelete={(id) => handleDelete('SemanticDimension', id)} />
              </div>
            )}

            {/* RELATIONSHIPS TAB */}
            {tab === 'relationships' && (
              <div className="space-y-4">
                <RelationshipsManager relationships={relationships} onRefresh={loadAll} onDelete={(id) => handleDelete('MetricRelationship', id)} />
              </div>
            )}

            {/* VERIFIED ANSWERS TAB */}
            {tab === 'verified' && (
              <div className="space-y-4">
                <VerifiedAnswersManager answers={verifiedAnswers} onRefresh={loadAll} onDelete={(id) => handleDelete('VerifiedAnswer', id)} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function DimensionsManager({ dimensions, onRefresh, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', sourceColumn: '', dataType: 'string', businessDefinition: '', domain: 'other' });
  const create = async () => {
    if (!form.name || !form.sourceColumn) return;
    await base44.entities.SemanticDimension.create(form);
    setForm({ name: '', sourceColumn: '', dataType: 'string', businessDefinition: '', domain: 'other' });
    setShowForm(false);
    onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/40">{dimensions.length} dimensions defined</span>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/15 transition-all">
          <Plus className="w-3.5 h-3.5" /> New Dimension
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card rounded-2xl p-5 border border-indigo-400/20 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Dimension Name" value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              <input placeholder="Source Column" value={form.sourceColumn} onChange={e => setForm(f => ({...f, sourceColumn: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
              <select value={form.dataType} onChange={e => setForm(f => ({...f, dataType: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                {['date','string','number','boolean','category'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <input placeholder="Business definition" value={form.businessDefinition} onChange={e => setForm(f => ({...f, businessDefinition: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={create} className="px-4 py-2 bg-indigo-400/15 border border-indigo-400/25 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/20 transition-all">Create</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 border border-white/8 rounded-xl">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {dimensions.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl text-white/30 text-sm">No dimensions yet. Add dimensions like region, month, product category.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {dimensions.map((d, i) => (
            <motion.div key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="glass-card rounded-xl p-4 border border-white/8 flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="font-semibold text-sm">{d.name}</div>
                <code className="text-xs text-white/40 font-mono">{d.sourceColumn}</code>
                <div className="text-xs text-white/30 mt-1">{d.dataType} · {d.domain}</div>
                {d.businessDefinition && <p className="text-xs text-white/40 mt-1 line-clamp-1">{d.businessDefinition}</p>}
              </div>
              <button onClick={() => onDelete(d.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function RelationshipsManager({ relationships, onRefresh, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leftTable: '', rightTable: '', joinKey: '', relationshipType: 'one_to_many', businessReason: '', joinType: 'inner' });
  const create = async () => {
    if (!form.leftTable || !form.rightTable || !form.joinKey || !form.businessReason) return;
    await base44.entities.MetricRelationship.create(form);
    setForm({ leftTable: '', rightTable: '', joinKey: '', relationshipType: 'one_to_many', businessReason: '', joinType: 'inner' });
    setShowForm(false);
    onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/40">{relationships.length} table relationships</span>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/15 transition-all">
          <Plus className="w-3.5 h-3.5" /> New Relationship
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card rounded-2xl p-5 border border-indigo-400/20 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <input placeholder="Left Table" value={form.leftTable} onChange={e => setForm(f => ({...f, leftTable: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
              <input placeholder="Right Table" value={form.rightTable} onChange={e => setForm(f => ({...f, rightTable: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
              <input placeholder="Join Key (e.g. user_id)" value={form.joinKey} onChange={e => setForm(f => ({...f, joinKey: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
              <select value={form.joinType} onChange={e => setForm(f => ({...f, joinType: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                {['inner','left','right','full'].map(v => <option key={v} value={v}>{v} join</option>)}
              </select>
              <select value={form.relationshipType} onChange={e => setForm(f => ({...f, relationshipType: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                {['one_to_one','one_to_many','many_to_one','many_to_many'].map(v => <option key={v} value={v}>{v.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <input placeholder="Business reason — why does this join exist?" value={form.businessReason} onChange={e => setForm(f => ({...f, businessReason: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
            <div className="flex gap-2">
              <button onClick={create} className="px-4 py-2 bg-indigo-400/15 border border-indigo-400/25 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/20 transition-all">Create</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 border border-white/8 rounded-xl">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {relationships.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl text-white/30 text-sm">No relationships yet. Define how your tables join for multi-table analysis.</div>
      ) : (
        <div className="space-y-3">
          {relationships.map((r, i) => (
            <motion.div key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="glass-card rounded-xl p-4 border border-white/8 flex items-center gap-4">
              <div className="flex items-center gap-2 font-mono text-sm flex-1">
                <span className="text-cyan-400/80">{r.leftTable}</span>
                <Link2 className="w-3.5 h-3.5 text-white/20" />
                <span className="text-indigo-400/80">{r.rightTable}</span>
                <span className="text-white/25">on</span>
                <span className="text-amber-400/70">{r.joinKey}</span>
                <span className="text-xs text-white/25 px-1.5 py-0.5 bg-white/5 rounded">{r.joinType} join</span>
              </div>
              <div className="text-xs text-white/35 max-w-48 truncate">{r.businessReason}</div>
              <button onClick={() => onDelete(r.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerifiedAnswersManager({ answers, onRefresh, onDelete }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ question: '', verifiedSql: '', expectedAnswer: '', metricUsed: '', domain: 'general', status: 'draft' });
  const create = async () => {
    if (!form.question || !form.metricUsed) return;
    const user = await base44.auth.me();
    await base44.entities.VerifiedAnswer.create({ ...form, owner: user?.email, lastReviewed: new Date().toISOString().split('T')[0] });
    setForm({ question: '', verifiedSql: '', expectedAnswer: '', metricUsed: '', domain: 'general', status: 'draft' });
    setShowForm(false);
    onRefresh();
  };
  const certify = async (a) => {
    const user = await base44.auth.me();
    await base44.entities.VerifiedAnswer.update(a.id, { status: 'certified', reviewedBy: user?.email, lastReviewed: new Date().toISOString().split('T')[0] });
    onRefresh();
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-white/40">{answers.length} verified answers · {answers.filter(a => a.status === 'certified').length} certified</span>
        <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
          <Plus className="w-3.5 h-3.5" /> Add Verified Answer
        </button>
      </div>
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="glass-card rounded-2xl p-5 border border-green-400/20 space-y-3">
            <input placeholder="Question (e.g. What is total revenue by region?)" value={form.question} onChange={e => setForm(f => ({...f, question: e.target.value}))} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
            <textarea placeholder="Verified SQL query" value={form.verifiedSql} onChange={e => setForm(f => ({...f, verifiedSql: e.target.value}))} rows={3} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono resize-none" />
            <div className="grid grid-cols-3 gap-3">
              <input placeholder="Primary metric used" value={form.metricUsed} onChange={e => setForm(f => ({...f, metricUsed: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              <select value={form.domain} onChange={e => setForm(f => ({...f, domain: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                {['finance','growth','operations','quality','forecast','general'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <select value={form.status} onChange={e => setForm(f => ({...f, status: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                {['draft','certified','deprecated'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <textarea placeholder="Expected answer summary" value={form.expectedAnswer} onChange={e => setForm(f => ({...f, expectedAnswer: e.target.value}))} rows={2} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none resize-none" />
            <div className="flex gap-2">
              <button onClick={create} className="px-4 py-2 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/20 transition-all">Save Verified Answer</button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 border border-white/8 rounded-xl">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {answers.length === 0 ? (
        <div className="text-center py-16 border border-white/5 rounded-2xl text-white/30 text-sm">No verified answers yet. Add gold-standard SQL queries that the AI should always use for known questions.</div>
      ) : (
        <div className="space-y-3">
          {answers.map((a, i) => (
            <motion.div key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="glass-card rounded-xl p-5 border border-white/8 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-sm font-semibold">{a.question}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${a.status === 'certified' ? 'text-green-400 bg-green-400/10 border-green-400/20' : a.status === 'deprecated' ? 'text-red-400 bg-red-400/10 border-red-400/20' : 'text-white/40 bg-white/5 border-white/10'}`}>{a.status}</span>
                    <span className="text-xs text-white/30">{a.domain} · {a.metricUsed}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.status !== 'certified' && (
                    <button onClick={() => certify(a)} className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"><Star className="w-3 h-3" /> Certify</button>
                  )}
                  <button onClick={() => onDelete(a.id)} className="text-white/20 hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
              {a.verifiedSql && <code className="text-xs text-cyan-400/70 block bg-white/3 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap">{a.verifiedSql}</code>}
              {a.expectedAnswer && <p className="text-xs text-white/40">{a.expectedAnswer}</p>}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}