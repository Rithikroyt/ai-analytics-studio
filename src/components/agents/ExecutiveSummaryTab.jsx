/**
 * ExecutiveSummaryTab — Aggregates top findings from all 3 analysts into one dashboard.
 * Shows critical risks, top findings, and recommended actions across CFO, Growth, Ops.
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  AlertTriangle, TrendingUp, Zap, BarChart2, Loader2, RefreshCw,
  CheckCircle2, Target, Brain, ChevronRight, Sparkles,
} from 'lucide-react';

const PERSONAS = [
  { id: 'cfo',       name: 'CFO Analyst',       color: '#00e5ff', question: 'What are the top financial risks and KPI anomalies in this dataset?' },
  { id: 'marketing', name: 'Growth Analyst',     color: '#ff2d7a', question: 'What are the top growth risks and customer behavior patterns in this dataset?' },
  { id: 'ops',       name: 'Operations Analyst', color: '#4caf50', question: 'What are the top operational bottlenecks and process risks in this dataset?' },
];

function RiskBadge({ level }) {
  const cfg = {
    critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'Critical' },
    high:     { color: '#ff6b35', bg: 'rgba(255,107,53,0.1)', label: 'High' },
    medium:   { color: '#ffcc02', bg: 'rgba(255,204,2,0.1)', label: 'Medium' },
    low:      { color: '#4caf50', bg: 'rgba(76,175,80,0.1)', label: 'Low' },
  }[level] || { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', label: 'Info' };

  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: cfg.color, background: cfg.bg }}>
      {cfg.label}
    </span>
  );
}

function AnalystCard({ persona, result, loading, error }) {
  const [expanded, setExpanded] = useState(false);
  const color = persona.color;

  if (loading) return (
    <div className="glass-card rounded-2xl border border-white/8 p-4 flex items-center gap-3"
      style={{ borderColor: `${color}20` }}>
      <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color }} />
      <div>
        <div className="text-xs font-bold" style={{ color }}>{persona.name}</div>
        <div className="text-xs text-white/30 mt-0.5">Running deep analysis…</div>
      </div>
    </div>
  );

  if (error || !result) return (
    <div className="glass-card rounded-2xl border border-white/8 p-4"
      style={{ borderColor: `${color}20` }}>
      <div className="text-xs font-bold mb-1" style={{ color }}>{persona.name}</div>
      <div className="text-xs text-white/30">{error || 'No analysis yet — click Run All to start.'}</div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border overflow-hidden"
      style={{ borderColor: `${color}25` }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ background: `${color}08`, borderBottom: `1px solid ${color}15` }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black"
            style={{ background: `${color}20`, color }}>{persona.name[0]}</div>
          <span className="text-xs font-bold" style={{ color }}>{persona.name}</span>
          {result.domain_fit && (
            <span className="text-xs text-white/25">· Domain fit: {result.domain_fit}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-white/30">{result.confidence_score}% conf.</span>
          <button onClick={() => setExpanded(v => !v)}
            className="text-xs text-white/30 hover:text-white/60 transition-colors">
            {expanded ? 'less' : 'more'}
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Key takeaways */}
        {result.key_takeaways?.length > 0 && (
          <div className="space-y-1.5">
            {result.key_takeaways.map((t, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5"
                  style={{ background: `${color}20`, color }}>{i + 1}</span>
                <p className="text-xs text-white/75 leading-relaxed">{t}</p>
              </div>
            ))}
          </div>
        )}

        {/* Risk row */}
        {result.risk && (
          <div className="flex items-start gap-2 px-3 py-2 rounded-lg border border-red-400/15 bg-red-400/5">
            <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-white/65 leading-relaxed">{result.risk}</p>
          </div>
        )}

        {/* Expanded: Deep analysis + recommendations */}
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
              {result.deep_analysis && (
                <div className="p-3 rounded-xl border border-indigo-400/15 bg-indigo-400/5">
                  <div className="text-xs font-bold text-indigo-400 mb-1">Deep Analysis</div>
                  <p className="text-xs text-white/60 leading-relaxed">{result.deep_analysis}</p>
                </div>
              )}
              {result.recommendation?.length > 0 && (
                <div className="p-3 rounded-xl border border-green-400/15 bg-green-400/5">
                  <div className="text-xs font-bold text-green-400 mb-2">Recommendations</div>
                  <ol className="space-y-1">
                    {result.recommendation.slice(0, 3).map((r, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-white/65">
                        <ChevronRight className="w-3 h-3 text-green-400/60 flex-shrink-0 mt-0.5" />{r}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function CriticalRisksPanel({ results }) {
  const allRisks = results
    .filter(r => r.result?.risk)
    .map(r => ({ risk: r.result.risk, persona: r.persona, color: r.persona.color }));

  const allActions = results
    .filter(r => r.result?.recommendation?.length > 0)
    .flatMap(r => r.result.recommendation.slice(0, 2).map(rec => ({ rec, persona: r.persona, color: r.persona.color })));

  if (!allRisks.length && !allActions.length) return null;

  return (
    <div className="grid grid-cols-2 gap-4">
      {allRisks.length > 0 && (
        <div className="glass-card rounded-2xl border border-red-400/15 bg-red-400/4 p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs font-black uppercase tracking-wide text-red-400">Critical Risks</span>
          </div>
          <div className="space-y-2">
            {allRisks.map((r, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: r.color }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: r.color }}>{r.persona.name}: </span>
                  <span className="text-xs text-white/60">{r.risk}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {allActions.length > 0 && (
        <div className="glass-card rounded-2xl border border-green-400/15 bg-green-400/4 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-green-400" />
            <span className="text-xs font-black uppercase tracking-wide text-green-400">Priority Actions</span>
          </div>
          <div className="space-y-2">
            {allActions.slice(0, 4).map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: a.color }} />
                <div>
                  <span className="text-xs font-semibold" style={{ color: a.color }}>{a.persona.name}: </span>
                  <span className="text-xs text-white/60">{a.rec}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KPISummaryRow({ results }) {
  const kpis = results
    .filter(r => r.result?.kpi_impact)
    .map(r => ({ label: r.result.kpi_impact, persona: r.persona }));

  if (!kpis.length) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {kpis.map((k, i) => (
        <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs"
          style={{ borderColor: `${k.persona.color}30`, background: `${k.persona.color}0a`, color: k.persona.color }}>
          <BarChart2 className="w-3 h-3" />
          <span className="font-semibold">{k.persona.name}:</span>
          <span className="text-white/60">{k.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ExecutiveSummaryTab({ activeTable }) {
  const [results, setResults] = useState([]);
  const [running, setRunning] = useState(false);
  const [ran, setRan] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  const runAll = async () => {
    setRunning(true);
    setRan(false);
    setAiSummary('');

    // Init all as loading
    setResults(PERSONAS.map(p => ({ persona: p, loading: true, result: null, error: null })));

    const tableContext = activeTable ? {
      name: activeTable.name,
      rowCount: activeTable.rowCount || activeTable.rows?.length,
      columns: activeTable.columns?.slice(0, 25),
      rows: activeTable.rows?.slice(0, 50),
    } : null;

    // Run all 3 analysts in parallel
    const settled = await Promise.allSettled(
      PERSONAS.map(p =>
        base44.functions.invoke('runAgentOrchestrator', {
          question: p.question,
          persona: p,
          tableContext,
          pipelinePreset: 'executive_brief',
        })
      )
    );

    const newResults = PERSONAS.map((p, i) => {
      const s = settled[i];
      if (s.status === 'fulfilled') {
        return { persona: p, loading: false, result: s.value.data, error: null };
      } else {
        return { persona: p, loading: false, result: null, error: 'Analysis failed — retrying is available.' };
      }
    });

    setResults(newResults);
    setRan(true);
    setRunning(false);

    // Generate AI executive brief
    const successful = newResults.filter(r => r.result?.direct_answer);
    if (successful.length > 0) {
      setSummaryLoading(true);
      try {
        const combined = successful.map(r =>
          `${r.persona.name}: ${r.result.key_takeaways?.join(' | ') || r.result.direct_answer}`
        ).join('\n\n');

        const brief = await base44.integrations.Core.InvokeLLM({
          model: 'claude_sonnet_4_6',
          prompt: `You are an executive assistant. Write a 3-sentence board-level executive briefing from these analyst reports. Be concrete, data-grounded, and focused on decisions needed.

ANALYST REPORTS:
${combined}

Rules: 1 sentence per analyst max, 1 sentence cross-domain synthesis. Start with the most critical finding.`,
        });
        if (brief && typeof brief === 'string' && brief.length > 20) setAiSummary(brief);
      } catch {}
      setSummaryLoading(false);
    }
  };

  const retryOne = async (personaId) => {
    const p = PERSONAS.find(x => x.id === personaId);
    if (!p) return;
    setResults(prev => prev.map(r => r.persona.id === personaId ? { ...r, loading: true, error: null } : r));

    const tableContext = activeTable ? {
      name: activeTable.name,
      rowCount: activeTable.rowCount || activeTable.rows?.length,
      columns: activeTable.columns?.slice(0, 25),
      rows: activeTable.rows?.slice(0, 50),
    } : null;

    try {
      const res = await base44.functions.invoke('runAgentOrchestrator', {
        question: p.question,
        persona: p,
        tableContext,
        pipelinePreset: 'executive_brief',
      });
      setResults(prev => prev.map(r => r.persona.id === personaId ? { ...r, loading: false, result: res.data, error: null } : r));
    } catch (e) {
      setResults(prev => prev.map(r => r.persona.id === personaId ? { ...r, loading: false, error: e.message } : r));
    }
  };

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-black">Executive Summary Dashboard</h2>
          <p className="text-xs text-white/35 mt-0.5">
            Aggregated findings from CFO, Growth, and Operations analysts
            {activeTable ? ` · ${activeTable.name}` : ' · No dataset loaded'}
          </p>
        </div>
        <button onClick={runAll} disabled={running}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          style={{ background: 'rgba(0,229,255,0.12)', border: '1px solid rgba(0,229,255,0.25)', color: '#00e5ff' }}>
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {running ? 'Running 3 Analysts…' : ran ? 'Re-run All' : 'Run All Analysts'}
        </button>
      </div>

      {/* AI Executive Brief */}
      {(summaryLoading || aiSummary) && (
        <div className="p-4 rounded-2xl border border-purple-400/20 bg-purple-400/6 space-y-2">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-xs font-black text-purple-400 uppercase tracking-wide">AI Executive Brief</span>
            {summaryLoading && <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />}
          </div>
          {summaryLoading ? (
            <div className="space-y-1.5">
              {[1,2,3].map(i => <div key={i} className="h-3 bg-white/5 rounded-full shimmer" style={{ width: `${60+i*15}%` }} />)}
            </div>
          ) : (
            <p className="text-sm text-white/80 leading-relaxed">{aiSummary}</p>
          )}
        </div>
      )}

      {/* KPI strip */}
      {ran && <KPISummaryRow results={results} />}

      {/* Critical risks + priority actions */}
      {ran && <CriticalRisksPanel results={results.filter(r => r.result)} />}

      {/* 3 analyst cards */}
      {!ran && !running && (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-white/20">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400/8 border border-cyan-400/15 flex items-center justify-center">
            <Target className="w-7 h-7 text-cyan-400/40" />
          </div>
          <div className="text-center">
            <div className="font-semibold text-white/40 text-sm">Run all 3 analysts simultaneously</div>
            <div className="text-xs mt-1">CFO · Growth · Operations — aggregated in one view</div>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {results.map(r => (
            <div key={r.persona.id}>
              <AnalystCard persona={r.persona} result={r.result} loading={r.loading} error={r.error} />
              {r.error && (
                <button onClick={() => retryOne(r.persona.id)}
                  className="mt-1.5 flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 px-2 py-1 transition-colors">
                  <RefreshCw className="w-3 h-3" /> Retry {r.persona.name}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}