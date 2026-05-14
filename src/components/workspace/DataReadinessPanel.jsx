/**
 * DataReadinessPanel — Data Contract validation + readiness score widget
 * Shown in the workspace when a table is active
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, AlertTriangle, AlertCircle, Loader2, RefreshCw, Shield, ChevronDown, ChevronUp } from 'lucide-react';

function ScoreRing({ score, color, size = 60 }) {
  const r = (size / 2) - 6;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 5} textAnchor="middle" fill={color} fontSize={size/5} fontWeight="900" fontFamily="monospace">{score}</text>
    </svg>
  );
}

function ScoreBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-white/40 w-24 truncate">{label}</span>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="font-mono text-white/40 w-8 text-right">{Math.round(value)}%</span>
    </div>
  );
}

export default function DataReadinessPanel({ table }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const validate = async () => {
    if (!table) return;
    setLoading(true);
    try {
      const res = await base44.functions.invoke('validateDataContract', {
        tableId: table.id,
        tableName: table.name,
        rows: table.rows?.slice(0, 500),
        columns: table.columns,
        numericColumns: (table.columns || []).filter(c => c.type === 'numeric').map(c => c.name),
        dateColumns: (table.columns || []).filter(c => c.type === 'date').map(c => c.name),
        categoryColumns: (table.columns || []).filter(c => c.type === 'category').map(c => c.name),
      });
      setResult(res.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { if (table) validate(); }, [table?.id]);

  if (!table) return null;

  const score = result?.dataReadinessScore || 0;
  const scoreColor = score >= 80 ? '#4caf50' : score >= 60 ? '#ffcc02' : '#ef4444';
  const statusLabel = score >= 80 ? 'Analysis Ready' : score >= 60 ? 'Conditionally Ready' : 'Needs Preparation';

  return (
    <div className="glass-card rounded-xl border border-white/8 overflow-hidden">
      <button onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors">
        <div className="flex items-center gap-3">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-xs font-bold text-white/60">Data Readiness</span>
          {result && (
            <span className="text-xs px-2 py-0.5 rounded-full border"
              style={{ color: scoreColor, borderColor: `${scoreColor}40`, background: `${scoreColor}12` }}>
              {statusLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-white/30" />}
          {result && <span className="font-mono text-xs font-bold" style={{ color: scoreColor }}>{score}%</span>}
          {expanded ? <ChevronUp className="w-3.5 h-3.5 text-white/25" /> : <ChevronDown className="w-3.5 h-3.5 text-white/25" />}
        </div>
      </button>

      {expanded && result && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/6">
          {/* Score rings */}
          <div className="flex items-center justify-around pt-3">
            {[
              { label: 'Readiness', value: result.dataReadinessScore, color: scoreColor },
              { label: 'Quality', value: result.qualityScore, color: '#00e5ff' },
              { label: 'Contract', value: result.contractPassRate, color: '#a855f7' },
              { label: 'KPI', value: result.kpiReadiness, color: '#ffcc02' },
            ].map(s => (
              <div key={s.label} className="flex flex-col items-center gap-1">
                <ScoreRing score={s.value} color={s.color} size={52} />
                <span className="text-xs text-white/30">{s.label}</span>
              </div>
            ))}
          </div>

          {/* Breakdown bars */}
          <div className="space-y-1.5 pt-1">
            <ScoreBar label="Completeness" value={result.completeness || 100} color="#4caf50" />
            <ScoreBar label="Uniqueness" value={result.uniqueness || 100} color="#00bfa5" />
            <ScoreBar label="Relationship" value={result.relationshipReadiness || 0} color="#60a5fa" />
          </div>

          {/* Issues */}
          {Object.values(result.validationResults || {}).some(r => r.failed > 0) && (
            <div className="space-y-1">
              <div className="text-xs text-white/25 font-semibold uppercase tracking-widest">Issues Found</div>
              {Object.entries(result.validationResults || {}).filter(([, r]) => r.failed > 0).map(([check, r]) => (
                <div key={check} className="flex items-center gap-2 text-xs text-amber-400">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {check.replace(/([A-Z])/g, ' $1').toLowerCase()}: {r.failed} failed
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <p className="text-xs text-white/35 leading-relaxed">{result.summary}</p>

          <button onClick={validate} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors">
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} /> Re-validate
          </button>
        </div>
      )}
    </div>
  );
}