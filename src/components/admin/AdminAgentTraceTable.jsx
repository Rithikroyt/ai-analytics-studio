/**
 * AdminAgentTraceTable — Phase 1 observability: recent AgentTrace monitoring
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Brain, Loader2, RefreshCw, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Clock, Database, Search, Filter
} from 'lucide-react';

const STATUS_COLORS = {
  strong:       'text-green-400 bg-green-400/10 border-green-400/25',
  partial:      'text-amber-400 bg-amber-400/10 border-amber-400/25',
  limited:      'text-orange-400 bg-orange-400/10 border-orange-400/25',
  insufficient: 'text-red-400 bg-red-400/10 border-red-400/25',
};

const DOMAIN_COLORS = {
  finance:    'text-cyan-400',
  growth:     'text-pink-400',
  operations: 'text-green-400',
  quality:    'text-purple-400',
  forecast:   'text-amber-400',
  strategy:   'text-blue-400',
  general:    'text-white/40',
};

function TraceRow({ trace }) {
  const [expanded, setExpanded] = useState(false);
  const conf = trace.confidenceScore || 0;
  const confColor = conf >= 75 ? 'text-green-400' : conf >= 50 ? 'text-amber-400' : 'text-red-400';
  const suf = STATUS_COLORS[trace.dataSufficiencyStatus] || STATUS_COLORS.partial;
  const hasMissing = (trace.missingFields || []).length > 0;
  const hasSqlRisk = trace.sqlSuccess === false;

  return (
    <>
      <tr
        onClick={() => setExpanded(e => !e)}
        className="border-b border-white/5 hover:bg-white/2 cursor-pointer transition-all"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {expanded ? <ChevronDown className="w-3 h-3 text-white/30 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/30 flex-shrink-0" />}
            <div>
              <div className="text-xs text-white/75 font-medium leading-snug max-w-xs truncate">{trace.userQuestion}</div>
              <div className="text-xs text-white/25 mt-0.5">{trace.userEmail}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs font-semibold ${DOMAIN_COLORS[trace.domain] || 'text-white/40'}`}>{trace.agentName}</span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${suf}`}>
            {trace.dataSufficiencyStatus || '—'}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`text-sm font-black ${confColor}`}>{conf}%</span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1.5">
            {hasMissing && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" title="Missing fields" />}
            {hasSqlRisk && <AlertTriangle className="w-3.5 h-3.5 text-red-400" title="SQL risk" />}
            {!hasMissing && !hasSqlRisk && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
            {(trace.missingFields || []).slice(0, 2).map(f => (
              <span key={f} className="text-xs px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 font-mono">{f}</span>
            ))}
          </div>
        </td>
        <td className="px-4 py-3 text-xs text-white/30 font-mono">
          {trace.durationMs ? `${(trace.durationMs / 1000).toFixed(1)}s` : '—'}
        </td>
        <td className="px-4 py-3 text-xs text-white/25">
          {trace.timestamp ? new Date(trace.timestamp).toLocaleString() : '—'}
        </td>
      </tr>

      {expanded && (
        <tr className="border-b border-white/5 bg-white/[0.015]">
          <td colSpan={7} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">

              {/* Tools used */}
              <div>
                <div className="text-white/30 font-semibold mb-1.5 uppercase tracking-widest text-[10px]">Tools Called</div>
                <div className="flex flex-wrap gap-1">
                  {(trace.toolsCalled || []).map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40">{t}</span>
                  ))}
                </div>
              </div>

              {/* Missing fields */}
              <div>
                <div className="text-white/30 font-semibold mb-1.5 uppercase tracking-widest text-[10px]">Missing Fields</div>
                {(trace.missingFields || []).length === 0
                  ? <span className="text-green-400">None — all required fields present</span>
                  : (trace.missingFields || []).map(f => (
                    <div key={f} className="text-amber-400 font-mono">• {f}</div>
                  ))
                }
              </div>

              {/* Final answer snapshot */}
              <div>
                <div className="text-white/30 font-semibold mb-1.5 uppercase tracking-widest text-[10px]">Answer Quality</div>
                {trace.finalAnswer && (
                  <div className="space-y-0.5 text-white/50">
                    <div>Evidence: <span className="text-cyan-400 font-mono">{trace.finalAnswer.evidence_count}</span></div>
                    <div>Recommendations: <span className="text-cyan-400 font-mono">{trace.finalAnswer.recs_count}</span></div>
                    <div>Metrics: <span className="text-cyan-400 font-mono">{trace.finalAnswer.metrics_count}</span></div>
                    <div>Quality Score: <span className="text-cyan-400 font-mono">{trace.answerQualityScore}%</span></div>
                    {trace.fallbackReason && <div className="text-amber-400">⚠ {trace.fallbackReason}</div>}
                  </div>
                )}
              </div>

              {/* SQL */}
              {trace.sqlGenerated && (
                <div className="md:col-span-3">
                  <div className="text-white/30 font-semibold mb-1.5 uppercase tracking-widest text-[10px]">SQL Generated</div>
                  <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-green-400/75 font-mono text-xs overflow-x-auto whitespace-pre-wrap max-h-32">
                    {trace.sqlGenerated}
                  </pre>
                </div>
              )}

              {/* Executive summary */}
              {trace.finalAnswer?.executive_summary && (
                <div className="md:col-span-3">
                  <div className="text-white/30 font-semibold mb-1.5 uppercase tracking-widest text-[10px]">Executive Summary</div>
                  <p className="text-white/55 leading-relaxed">{trace.finalAnswer.executive_summary}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AdminAgentTraceTable() {
  const [traces, setTraces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.AgentTrace.list('-timestamp', 100);
      setTraces(data || []);
    } catch (e) {
      console.error('Failed to load agent traces', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const agents = [...new Set(traces.map(t => t.agentName).filter(Boolean))];

  const filtered = traces.filter(t => {
    const matchSearch = !search || (t.userQuestion || '').toLowerCase().includes(search.toLowerCase()) || (t.userEmail || '').toLowerCase().includes(search.toLowerCase());
    const matchAgent = filterAgent === 'all' || t.agentName === filterAgent;
    const matchStatus = filterStatus === 'all' || t.dataSufficiencyStatus === filterStatus;
    return matchSearch && matchAgent && matchStatus;
  });

  // Aggregate stats
  const avgConf = traces.length ? Math.round(traces.reduce((s, t) => s + (t.confidenceScore || 0), 0) / traces.length) : 0;
  const insufficientCount = traces.filter(t => t.dataSufficiencyStatus === 'insufficient').length;
  const missingFieldTraces = traces.filter(t => (t.missingFields || []).length > 0).length;
  const sqlFailures = traces.filter(t => t.sqlSuccess === false).length;

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Traces', value: traces.length, color: 'text-cyan-400' },
          { label: 'Avg Confidence', value: `${avgConf}%`, color: avgConf >= 70 ? 'text-green-400' : 'text-amber-400' },
          { label: 'Missing Field Queries', value: missingFieldTraces, color: missingFieldTraces > 0 ? 'text-amber-400' : 'text-green-400' },
          { label: 'SQL Safety Failures', value: sqlFailures, color: sqlFailures > 0 ? 'text-red-400' : 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="flex-1 min-w-48 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-white/25" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search question or user…"
            className="w-full pl-8 pr-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none"
          />
        </div>
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
          <option value="all">All Agents</option>
          {agents.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
          <option value="all">All Sufficiency</option>
          <option value="strong">Strong</option>
          <option value="partial">Partial</option>
          <option value="limited">Limited</option>
          <option value="insufficient">Insufficient</option>
        </select>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/5 border border-white/10 text-white/40 rounded-xl text-xs hover:text-white/70 transition-all disabled:opacity-40">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </button>
      </div>

      {/* Table */}
      {loading && traces.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/25 text-sm">
          {traces.length === 0 ? 'No agent traces yet. Ask a question in Agent Studio to generate traces.' : 'No traces match your filters.'}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/8 overflow-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/8 bg-white/3">
                {['Question / User', 'Agent', 'Data Sufficiency', 'Confidence', 'Field Warnings', 'Duration', 'Timestamp'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-white/30 font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(trace => (
                <TraceRow key={trace.id} trace={trace} />
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 border-t border-white/5 text-xs text-white/20">
            Showing {filtered.length} of {traces.length} traces · Click any row to expand details
          </div>
        </div>
      )}
    </div>
  );
}