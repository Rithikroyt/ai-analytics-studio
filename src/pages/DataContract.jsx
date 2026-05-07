import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { base44 } from '@/api/base44Client';
import {
  ShieldCheck, Plus, Trash2, Eye, Loader2, CheckCircle2, AlertTriangle,
  ChevronLeft, FileText, Save, X, Edit2, Zap, Shield, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';

function DataReadinessGauge({ score }) {
  const color = score >= 85 ? '#4caf50' : score >= 70 ? '#ffcc02' : '#ff6b35';
  const label = score >= 85 ? 'Ready' : score >= 70 ? 'Caution' : 'Not Ready';
  return (
    <div className="text-center">
      <svg width={120} height={120} viewBox="0 0 120 120" className="mx-auto mb-2">
        <circle cx={60} cy={60} r={55} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={8} />
        <circle
          cx={60} cy={60} r={55} fill="none" stroke={color} strokeWidth={8}
          strokeDasharray={`${(score / 100) * 345} 345`}
          style={{ transform: 'rotate(-90deg)', transformOrigin: '60px 60px', transition: 'stroke-dasharray 0.6s' }}
        />
        <text x={60} y={65} textAnchor="middle" fontSize={28} fontWeight="bold" fill={color}>{score}</text>
      </svg>
      <div className="text-sm font-semibold" style={{ color }}>{label}</div>
    </div>
  );
}

function ContractCard({ contract, onDelete, onValidate, validating }) {
  const statusColors = {
    draft: 'border-white/10 bg-white/2',
    active: 'border-yellow-400/25 bg-yellow-400/5',
    passed: 'border-green-400/25 bg-green-400/5',
    failed: 'border-red-400/25 bg-red-400/5',
  };

  const statusBadgeColor = {
    draft: 'bg-white/10 text-white/60',
    active: 'bg-yellow-400/15 text-yellow-400',
    passed: 'bg-green-400/15 text-green-400',
    failed: 'bg-red-400/15 text-red-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}
      className={`rounded-2xl p-5 border transition-all ${statusColors[contract.status]}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="font-bold text-sm">{contract.tableName}</div>
          <div className="text-xs text-white/40 mt-0.5">{contract.requiredColumns?.length || 0} required columns</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusBadgeColor[contract.status]}`}>
          {contract.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {contract.dataReadinessScore != null && (
          <div className="text-center p-2 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-cyan-400">{contract.dataReadinessScore}</div>
            <div className="text-xs text-white/40">Readiness Score</div>
          </div>
        )}
        {contract.contractPassRate != null && (
          <div className="text-center p-2 rounded-lg bg-white/5">
            <div className="text-2xl font-bold text-teal-400">{contract.contractPassRate}%</div>
            <div className="text-xs text-white/40">Pass Rate</div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => onValidate(contract)}
          disabled={validating === contract.id}
          className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 hover:bg-cyan-400/15 transition-all disabled:opacity-50">
          {validating === contract.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
          {validating === contract.id ? 'Validating...' : 'Validate'}
        </button>
        <button onClick={() => onDelete(contract.id)}
          className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function DataContract() {
  const { tables, getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selectedContract, setSelectedContract] = useState(null);
  const [form, setForm] = useState({
    requiredColumns: [],
    numericColumns: [],
    dateColumns: [],
    categoryColumns: [],
    allowedMissingRate: 5,
    duplicateThreshold: 1,
    businessRules: [],
  });

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    setLoading(true);
    const data = await base44.entities.DataContract.list('-created_date', 50);
    setContracts(data);
    setLoading(false);
  };

  const handleValidate = async (contract) => {
    setValidating(contract.id);
    try {
      const result = await base44.functions.invoke('validateDataContract', {
        tableId: contract.tableId,
        tableName: contract.tableName,
        requiredColumns: contract.requiredColumns,
        numericColumns: contract.numericColumns,
        dateColumns: contract.dateColumns,
        categoryColumns: contract.categoryColumns,
        allowedMissingRate: contract.allowedMissingRate,
        duplicateThreshold: contract.duplicateThreshold,
        businessRules: contract.businessRules,
      });
      await base44.entities.DataContract.update(contract.id, result.data);
      fetchContracts();
    } catch (e) {
      console.error('Validation failed:', e);
    }
    setValidating('');
  };

  const handleCreate = async () => {
    if (!activeTable) return;
    const newContract = {
      tableId: activeTable.id,
      tableName: activeTable.name,
      ...form,
      status: 'draft',
    };
    await base44.entities.DataContract.create(newContract);
    setForm({
      requiredColumns: [],
      numericColumns: [],
      dateColumns: [],
      categoryColumns: [],
      allowedMissingRate: 5,
      duplicateThreshold: 1,
      businessRules: [],
    });
    setShowForm(false);
    fetchContracts();
  };

  const handleDelete = async (id) => {
    await base44.entities.DataContract.delete(id);
    fetchContracts();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Data Contracts</h1>
              <p className="text-xs text-muted-foreground">Define, validate, and monitor data quality rules</p>
            </div>
          </div>
          {activeTable && (
            <button onClick={() => setShowForm(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/15 transition-all">
              <Plus className="w-3.5 h-3.5" /> New Contract
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
        {/* Create form */}
        <AnimatePresence>
          {showForm && activeTable && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="glass-card rounded-2xl p-5 border border-green-400/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Create Contract for {activeTable.name}</h3>
                <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white/70"><X className="w-4 h-4" /></button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Required Columns</label>
                  <select multiple value={form.requiredColumns} onChange={e => setForm(f => ({ ...f, requiredColumns: Array.from(e.target.selectedOptions, o => o.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    {activeTable.columns?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Numeric Columns</label>
                  <select multiple value={form.numericColumns} onChange={e => setForm(f => ({ ...f, numericColumns: Array.from(e.target.selectedOptions, o => o.value) }))}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground">
                    {activeTable.columns?.filter(c => c.type === 'numeric').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Date Columns</label>
                  <input type="number" min="0" max="100" value={form.allowedMissingRate} onChange={e => setForm(f => ({ ...f, allowedMissingRate: Number(e.target.value) }))}
                    placeholder="Allowed missing %" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Duplicate Threshold (%)</label>
                  <input type="number" min="0" max="100" value={form.duplicateThreshold} onChange={e => setForm(f => ({ ...f, duplicateThreshold: Number(e.target.value) }))}
                    placeholder="Duplicate %" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none text-foreground" />
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={handleCreate}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-xs font-semibold hover:bg-green-400/20 transition-all">
                  <Save className="w-3.5 h-3.5" /> Create Contract
                </button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-white/40 hover:text-white/70 text-xs rounded-xl border border-white/8 hover:bg-white/5 transition-all">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contracts grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-green-400 animate-spin" /></div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center border border-white/5 rounded-2xl">
            <ShieldCheck className="w-12 h-12 text-white/15 mb-4" />
            <h3 className="font-semibold mb-1">No contracts yet</h3>
            <p className="text-sm text-muted-foreground max-w-xs mb-5">Define your first data contract to validate dataset quality and readiness.</p>
            {activeTable && (
              <button onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 rounded-xl text-sm font-semibold hover:bg-green-400/15 transition-all">
                <Plus className="w-3.5 h-3.5" /> Create Contract
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {contracts.map(contract => (
                <ContractCard key={contract.id} contract={contract}
                  onDelete={handleDelete} onValidate={handleValidate} validating={validating} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Formula info */}
        <div className="p-4 glass rounded-xl border border-white/5 text-xs text-muted-foreground space-y-2">
          <div className="font-semibold text-white/60">Data Readiness Score Formula</div>
          <code className="font-mono text-white/40 block">
            DataReadinessScore = 0.40 × ContractPassRate + 0.30 × QualityScore + 0.20 × KPIReadiness + 0.10 × RelationshipReadiness
          </code>
        </div>
      </div>
    </div>
  );
}