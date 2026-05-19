/**
 * Benchmark Center — Phase 5: Verified Answers + SQL Benchmark Testing
 * Databricks Genie-style Inspect mode, regression tracking, accuracy trends
 * Admin only
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import {
  FlaskConical, Plus, Play, CheckCircle2, XCircle, Clock, Loader2,
  ChevronLeft, Lock, BarChart2, RefreshCw, AlertTriangle, Minus, TrendingUp
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const STATUS_CONFIG = {
  pass: { color: 'text-green-400', bg: 'bg-green-400/10 border-green-400/20', icon: CheckCircle2 },
  fail: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: XCircle },
  pending: { color: 'text-white/40', bg: 'bg-white/5 border-white/10', icon: Clock },
  regression: { color: 'text-amber-400', bg: 'bg-amber-400/10 border-amber-400/20', icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-semibold ${cfg.color} ${cfg.bg}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

export default function BenchmarkCenter() {
  const { user } = useAuth();
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState('benchmarks');
  const [form, setForm] = useState({ testQuestion: '', expectedSql: '', expectedOutputSummary: '', agentName: 'CFO Analyst', domain: 'finance' });

  const isAdmin = user?.role === 'admin' || ['rthati1@asu.edu', 'thatirithikroy@gmail.com'].includes(user?.email?.toLowerCase());

  useEffect(() => { load(); }, []);
  const load = async () => {
    setLoading(true);
    const data = await base44.entities.AgentBenchmark.list('-created_date', 50);
    setBenchmarks(data);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!form.testQuestion || !form.expectedSql) return;
    await base44.entities.AgentBenchmark.create({ ...form, regressionStatus: 'pending' });
    setForm({ testQuestion: '', expectedSql: '', expectedOutputSummary: '', agentName: 'CFO Analyst', domain: 'finance' });
    setShowForm(false);
    load();
  };

  const handleRunBenchmark = async (benchmark) => {
    setRunning(benchmark.id);
    const start = Date.now();
    try {
      // Run the agent orchestrator with the test question
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: benchmark.testQuestion,
        persona: benchmark.agentName,
      });
      const latencyMs = Date.now() - start;
      const actual = res.data;
      const actualSql = actual?.sql_generated || '';
      // Simple SQL similarity score (shared keywords)
      const expTokens = new Set(benchmark.expectedSql.toLowerCase().split(/\W+/).filter(t => t.length > 2));
      const actTokens = new Set(actualSql.toLowerCase().split(/\W+/).filter(t => t.length > 2));
      const intersection = [...expTokens].filter(t => actTokens.has(t));
      const sqlMatchScore = expTokens.size > 0 ? Math.round((intersection.length / expTokens.size) * 100) : 0;
      const passed = sqlMatchScore >= 60;
      await base44.entities.AgentBenchmark.update(benchmark.id, {
        actualSql,
        actualOutputSummary: actual?.executive_summary?.slice(0, 300) || '',
        sqlMatchScore,
        passed,
        regressionStatus: passed ? 'pass' : 'fail',
        latencyMs,
        runAt: new Date().toISOString(),
      });
    } catch (e) {
      await base44.entities.AgentBenchmark.update(benchmark.id, { regressionStatus: 'fail', passed: false, runAt: new Date().toISOString() });
    }
    setRunning(null);
    load();
  };

  const handleRunAll = async () => {
    for (const b of benchmarks) {
      await handleRunBenchmark(b);
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold">Admin Only</h2>
          <p className="text-sm text-muted-foreground">Benchmark Center is restricted to administrators.</p>
          <Link to="/admin" className="text-cyan-400 text-sm hover:underline">← Back to Admin</Link>
        </div>
      </div>
    );
  }

  const passCount = benchmarks.filter(b => b.regressionStatus === 'pass').length;
  const failCount = benchmarks.filter(b => b.regressionStatus === 'fail').length;
  const pendingCount = benchmarks.filter(b => b.regressionStatus === 'pending').length;
  const passRate = benchmarks.length > 0 ? Math.round((passCount / benchmarks.length) * 100) : 0;

  const domainData = ['finance','growth','operations','quality','general'].map(d => ({
    domain: d,
    total: benchmarks.filter(b => b.domain === d).length,
    passed: benchmarks.filter(b => b.domain === d && b.regressionStatus === 'pass').length,
  })).filter(d => d.total > 0);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Agent Benchmark Center</h1>
            <p className="text-xs text-muted-foreground">SQL accuracy tests · Regression tracking · Inspect mode · Pass/fail history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-white/70 transition-all">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleRunAll} disabled={benchmarks.length === 0 || running !== null}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-400/15 transition-all disabled:opacity-40">
            <Play className="w-3.5 h-3.5" /> Run All
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-400/10 border border-indigo-400/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> Add Test
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="px-8 py-4 border-b border-white/5 grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Tests', value: benchmarks.length, color: 'text-white/70' },
          { label: 'Pass Rate', value: `${passRate}%`, color: 'text-green-400' },
          { label: 'Passed', value: passCount, color: 'text-green-400' },
          { label: 'Failed', value: failCount, color: 'text-red-400' },
          { label: 'Pending', value: pendingCount, color: 'text-white/40' },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="p-8 space-y-6 max-w-6xl mx-auto">
        {/* Add form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-5 border border-indigo-400/20 space-y-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-bold">Add Benchmark Test</span>
              </div>
              <input placeholder="Test question (e.g. What is total revenue by region?)" value={form.testQuestion} onChange={e => setForm(f => ({...f, testQuestion: e.target.value}))}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              <textarea placeholder="Expected SQL query" value={form.expectedSql} onChange={e => setForm(f => ({...f, expectedSql: e.target.value}))}
                rows={3} className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono resize-none" />
              <div className="grid grid-cols-3 gap-3">
                <select value={form.agentName} onChange={e => setForm(f => ({...f, agentName: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  {['CFO Analyst','Growth Analyst','Operations Analyst','Principal Data Analyst','Principal Business Analyst'].map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={form.domain} onChange={e => setForm(f => ({...f, domain: e.target.value}))} className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  {['finance','growth','operations','quality','forecast','general'].map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input placeholder="Expected output summary" value={form.expectedOutputSummary} onChange={e => setForm(f => ({...f, expectedOutputSummary: e.target.value}))}
                  className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              </div>
              <div className="flex gap-2">
                <button onClick={handleCreate} className="px-4 py-2 bg-indigo-400/15 border border-indigo-400/25 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-400/20 transition-all">Save Test</button>
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs text-white/30 border border-white/8 rounded-xl">Cancel</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Domain chart */}
        {domainData.length > 0 && (
          <div className="glass-card rounded-2xl p-5 border border-white/8">
            <h3 className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-4">Pass Rate by Domain</h3>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={domainData}>
                <XAxis dataKey="domain" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }} />
                <Bar dataKey="total" name="Total" fill="rgba(255,255,255,0.08)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="passed" name="Passed" fill="#4ade80" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Benchmarks list */}
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-amber-400 animate-spin" /></div>
        ) : benchmarks.length === 0 ? (
          <div className="text-center py-16 border border-white/5 rounded-2xl">
            <FlaskConical className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <div className="font-semibold mb-1">No benchmark tests yet</div>
            <div className="text-sm text-white/30">Add test questions with expected SQL to track AI accuracy over time.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {benchmarks.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card rounded-2xl p-5 border border-white/8 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-semibold mb-1">{b.testQuestion}</div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatusBadge status={b.regressionStatus} />
                      <span className="text-xs text-white/30">{b.agentName}</span>
                      <span className="text-xs text-white/25 capitalize">{b.domain}</span>
                      {b.sqlMatchScore > 0 && <span className="text-xs text-white/30">SQL match: <span className={b.sqlMatchScore >= 60 ? 'text-green-400' : 'text-red-400'}>{b.sqlMatchScore}%</span></span>}
                      {b.latencyMs > 0 && <span className="text-xs text-white/25 font-mono">{b.latencyMs}ms</span>}
                    </div>
                  </div>
                  <button onClick={() => handleRunBenchmark(b)} disabled={running === b.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg text-xs font-semibold hover:bg-amber-400/15 transition-all disabled:opacity-50">
                    {running === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    Run
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <div className="text-xs text-white/30 mb-1">Expected SQL</div>
                    <code className="text-xs text-cyan-400/70 block bg-white/3 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap max-h-24 overflow-auto">{b.expectedSql}</code>
                  </div>
                  {b.actualSql && (
                    <div>
                      <div className="text-xs text-white/30 mb-1">Actual SQL Generated</div>
                      <code className={`text-xs block bg-white/3 rounded-lg px-3 py-2 font-mono whitespace-pre-wrap max-h-24 overflow-auto ${b.regressionStatus === 'pass' ? 'text-green-400/70' : 'text-red-400/70'}`}>{b.actualSql}</code>
                    </div>
                  )}
                </div>
                {b.actualOutputSummary && (
                  <div className="text-xs text-white/35 bg-white/2 rounded-lg px-3 py-2 border border-white/5">{b.actualOutputSummary}</div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}