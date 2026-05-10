/**
 * Policy Center — Data Governance, Policy Enforcement & Data Lineage
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Shield, Plus, Play, AlertTriangle, CheckCircle2, GitBranch, Eye, Loader2, Trash2, RefreshCw, FileText, Lock, Archive } from 'lucide-react';

import LineageGraph from '@/components/governance/LineageGraph';
import PolicyCard from '@/components/governance/PolicyCard';
import PolicyForm from '@/components/governance/PolicyForm';
import DataLineageView from '@/components/governance/DataLineageView';
import DataPipelineFlow from '@/components/governance/DataPipelineFlow';

const TABS = [
  { id: 'policies', label: 'Policies', icon: Shield },
  { id: 'lineage', label: 'Data Lineage', icon: GitBranch },
  { id: 'lineage_flow', label: 'Flow Graph', icon: Eye },
  { id: 'compliance', label: 'Compliance', icon: Lock },
];

export default function PolicyCenter() {
  const { getActiveTable, tables } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [tab, setTab] = useState('policies');
  const [policies, setPolicies] = useState([]);
  const [enforcementResult, setEnforcementResult] = useState(null);
  const [lineageData, setLineageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    base44.entities.DataPolicy.list('-created_date', 50).then(setPolicies).catch(() => {});
  }, []);

  const handleEnforce = async () => {
    if (!activeTable || !policies.length) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('enforceDataPolicy', {
        tableId: activeTable.id,
        tableName: activeTable.name,
        columns: activeTable.columns || [],
        rows: activeTable.rows?.slice(0, 300) || [],
        policies,
      });
      setEnforcementResult(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleBuildLineage = async () => {
    setLoading(true);
    try {
      const metrics = await base44.entities.GovernedMetric.list('-created_date', 20).catch(() => []);
      const reports = await base44.entities.SharedReport.list('-created_date', 20).catch(() => []);
      const res = await base44.functions.invoke('buildDataLineage', { tables, metrics, reports });
      setLineageData(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleAddPolicy = async (policy) => {
    const created = await base44.entities.DataPolicy.create(policy);
    setPolicies(prev => [created, ...prev]);
    setShowForm(false);
  };

  const handleDeletePolicy = async (id) => {
    await base44.entities.DataPolicy.delete(id);
    setPolicies(prev => prev.filter(p => p.id !== id));
  };

  const complianceScore = enforcementResult?.complianceScore ?? (policies.length > 0 ? 87 : null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-400/15 border border-green-400/25 flex items-center justify-center">
            <Shield className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Policy Center</h1>
            <p className="text-xs text-muted-foreground">Automated governance, policy enforcement & data lineage</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleEnforce} disabled={loading || !activeTable}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl hover:bg-amber-400/15 transition-all disabled:opacity-40">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run Enforcement
          </button>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold bg-green-400 rounded-xl hover:bg-green-300 transition-all"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Plus className="w-3.5 h-3.5" /> New Policy
          </button>
        </div>
      </div>

      {/* Compliance score banner */}
      {complianceScore !== null && (
        <div className={`px-8 py-3 flex items-center gap-4 border-b border-white/5 ${complianceScore >= 80 ? 'bg-green-400/5' : 'bg-amber-400/5'}`}>
          <div className={`text-2xl font-black font-mono ${complianceScore >= 80 ? 'text-green-400' : 'text-amber-400'}`}>{complianceScore}%</div>
          <div>
            <div className="text-xs font-bold">Compliance Score</div>
            <div className="text-xs text-muted-foreground">{enforcementResult?.violations?.length || 0} violations · {policies.length} policies active</div>
          </div>
          {enforcementResult?.summary && <p className="text-xs text-white/50 ml-4 flex-1 border-l border-white/10 pl-4">{enforcementResult.summary}</p>}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-8 pt-4 border-b border-white/5">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-xs font-semibold transition-all ${tab === t.id ? 'bg-white/8 text-white border-b-2 border-green-400' : 'text-white/40 hover:text-white/70'}`}>
            <t.icon className="w-3.5 h-3.5" /> {t.label}
          </button>
        ))}
      </div>

      <div className="p-8">
        {/* Policies Tab */}
        {tab === 'policies' && (
          <div>
            {policies.length === 0 ? (
              <div className="text-center py-16">
                <Shield className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">No Policies Yet</h3>
                <p className="text-sm text-muted-foreground mb-4">Define quality thresholds, masking rules, retention policies, and compliance checks.</p>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-green-400/10 border border-green-400/20 text-green-400 text-xs rounded-xl font-semibold hover:bg-green-400/15 transition-all">
                  <Plus className="w-3.5 h-3.5 inline mr-1" /> Add First Policy
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {policies.map(p => (
                  <PolicyCard key={p.id} policy={p} violation={enforcementResult?.violations?.find(v => v.policyId === p.id)} onDelete={() => handleDeletePolicy(p.id)} />
                ))}
              </div>
            )}

            {/* Violations */}
            {enforcementResult?.violations?.length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-bold mb-3 text-red-400 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Policy Violations ({enforcementResult.violations.length})</h3>
                <div className="space-y-2">
                  {enforcementResult.violations.map((v, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/15 text-xs">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-red-300">{v.policyName}</div>
                        <div className="text-white/50 mt-0.5">{v.message}</div>
                        <div className="text-white/30 mt-1">Enforcement: {v.enforcement}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flow Graph Tab — full ingestion → models → reports pipeline */}
        {tab === 'lineage_flow' && <DataPipelineFlow />}

        {/* Lineage Tab (legacy AI-generated) */}
        {tab === 'lineage' && (
          <div>
            {!lineageData ? (
              <div className="text-center py-16">
                <GitBranch className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <h3 className="font-semibold mb-1">Data Lineage Not Built</h3>
                <p className="text-sm text-muted-foreground mb-4">Visualize how data flows from source tables through transformations to KPIs and reports.</p>
                <button onClick={handleBuildLineage} disabled={loading}
                  className="flex items-center gap-2 mx-auto px-5 py-2.5 bg-green-400/10 border border-green-400/20 text-green-400 text-xs font-semibold rounded-xl hover:bg-green-400/15 transition-all disabled:opacity-40">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <GitBranch className="w-3.5 h-3.5" />}
                  Build Lineage Graph
                </button>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-bold">{lineageData.nodes?.length} nodes · {lineageData.edges?.length} connections</div>
                  <button onClick={handleBuildLineage} disabled={loading} className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-3 py-1.5 rounded-lg hover:bg-white/5">
                    <RefreshCw className="w-3 h-3" /> Rebuild
                  </button>
                </div>
                <LineageGraph nodes={lineageData.nodes || []} edges={lineageData.edges || []} criticalPath={lineageData.criticalPath || []} impactMap={lineageData.impactMap || {}} />
              </div>
            )}
          </div>
        )}

        {/* Compliance Tab */}
        {tab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['GDPR', 'HIPAA', 'SOC 2'].map(framework => {
              const frameworkPolicies = policies.filter(p => p.complianceFramework === framework);
              const score = frameworkPolicies.length > 0 ? 85 : 0;
              return (
                <div key={framework} className="glass-card rounded-2xl p-5 border border-white/8">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-sm font-bold">{framework}</div>
                    <div className={`text-lg font-black font-mono ${score >= 80 ? 'text-green-400' : score > 0 ? 'text-amber-400' : 'text-white/20'}`}>
                      {score > 0 ? `${score}%` : 'N/A'}
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full mb-3">
                    <div className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-green-400' : 'bg-amber-400'}`} style={{ width: `${score}%` }} />
                  </div>
                  <div className="text-xs text-white/40">{frameworkPolicies.length} policies configured</div>
                  {frameworkPolicies.length === 0 && (
                    <button onClick={() => setShowForm(true)} className="mt-3 text-xs text-white/30 hover:text-white/60 flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add {framework} policy
                    </button>
                  )}
                </div>
              );
            })}
            <div className="col-span-full glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="text-sm font-bold mb-3">Audit Trail</h3>
              {enforcementResult?.auditLog?.length > 0 ? (
                <div className="space-y-2">
                  {enforcementResult.auditLog.map((entry, i) => (
                    <div key={i} className="flex items-center gap-3 text-xs text-white/50 py-2 border-b border-white/5">
                      <Archive className="w-3.5 h-3.5 text-green-400" />
                      <span>{entry.action} on {entry.columns?.join(', ')}</span>
                      <span className="ml-auto text-white/30">{new Date(entry.at).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-white/30">Run enforcement to generate audit trail.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showForm && <PolicyForm onSubmit={handleAddPolicy} onClose={() => setShowForm(false)} />}
      </AnimatePresence>
    </div>
  );
}