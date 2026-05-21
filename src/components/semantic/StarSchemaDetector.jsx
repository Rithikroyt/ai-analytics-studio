/**
 * StarSchemaDetector — Automatically detect fact/dimension/measure candidates
 * Grain detection, relationship suggestions, metric safety rules
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Database, Target, Hash, Calendar, Tag, Shield,
  CheckCircle2, AlertTriangle, Loader2, Zap, TrendingUp
} from 'lucide-react';

const UNSAFE_AGG_PATTERNS = [
  { pattern: /_id$|^id$|^id_|uuid/, reason: 'ID field — never SUM' },
  { pattern: /rank$|ranking$|percentile$|quintile$|decile$/, reason: 'Rank/ordinal — never SUM' },
  { pattern: /age$|birth_year|year_of_birth/, reason: 'Age — never SUM as business metric' },
  { pattern: /zip$|postal$|latitude|longitude|lat$|lng$|lon$/, reason: 'Geographic code — never SUM' },
  { pattern: /phone|email|address|name$/, reason: 'PII/text — never aggregate' },
  { pattern: /row_number|sequence|index$/, reason: 'Row identifier — never SUM' },
];

function detectRole(colName, values) {
  const name = (colName || '').toLowerCase();
  const numericCount = values.filter(v => !isNaN(parseFloat(v)) && v !== null && v !== '').length;
  const numericRatio = values.length > 0 ? numericCount / values.length : 0;
  const unique = new Set(values.map(String)).size;
  const uniqueRatio = values.length > 0 ? unique / values.length : 0;

  // Check unsafe patterns first
  const unsafeRule = UNSAFE_AGG_PATTERNS.find(r => r.pattern.test(name));
  if (unsafeRule) return { role: 'id', safe: false, reason: unsafeRule.reason };

  // Date detection
  if (name.match(/date|time|month|year|quarter|week|period|created_at|updated_at/)) {
    return { role: 'date_dimension', safe: false, reason: 'Date dimension — use for time slicing' };
  }

  // Financial measures
  if (numericRatio > 0.85 && name.match(/revenue|cost|amount|price|salary|sales|profit|margin|spend|budget|fee|payment|wage|bonus|commission/)) {
    return { role: 'financial_measure', safe: true, reason: 'Financial metric — safe to SUM' };
  }

  // Count measures
  if (numericRatio > 0.85 && name.match(/count|qty|quantity|volume|headcount|sessions|visits|clicks|impressions/)) {
    return { role: 'count_measure', safe: true, reason: 'Count metric — safe to SUM' };
  }

  // Generic numeric
  if (numericRatio > 0.85) {
    return { role: 'numeric_measure', safe: true, reason: 'Numeric measure — safe to SUM' };
  }

  // Categorical dimension
  if (uniqueRatio < 0.5 || unique < 50) {
    return { role: 'dimension', safe: false, reason: 'Categorical dimension — use for slicing/filtering' };
  }

  return { role: 'text', safe: false, reason: 'High-cardinality text — may be ID or description' };
}

const ROLE_CONFIG = {
  financial_measure: { label: 'Financial Measure', color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/20', icon: TrendingUp },
  count_measure: { label: 'Count Measure', color: 'text-cyan-400', bg: 'bg-cyan-400/8 border-cyan-400/20', icon: Hash },
  numeric_measure: { label: 'Numeric Measure', color: 'text-blue-400', bg: 'bg-blue-400/8 border-blue-400/20', icon: Hash },
  dimension: { label: 'Dimension', color: 'text-purple-400', bg: 'bg-purple-400/8 border-purple-400/20', icon: Tag },
  date_dimension: { label: 'Date Dimension', color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20', icon: Calendar },
  id: { label: 'ID / Non-Additive', color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/20', icon: AlertTriangle },
  text: { label: 'Text / Description', color: 'text-white/40', bg: 'bg-white/5 border-white/10', icon: Tag },
};

export default function StarSchemaDetector({ rows = [], columns = [] }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!columns.length) {
    return (
      <div className="text-center py-10 text-white/30 text-sm">
        <Database className="w-10 h-10 mx-auto mb-3 text-white/15" />
        Load a dataset to detect semantic roles
      </div>
    );
  }

  const colAnalysis = columns.map(col => {
    const name = String(col.name || col || '');
    const values = rows.slice(0, 100).map(r => r[name]).filter(v => v != null);
    const detection = detectRole(name, values);
    const unique = new Set(values.map(String)).size;
    const missing = rows.length - rows.filter(r => r[name] != null && r[name] !== '').length;
    return { name, ...detection, unique, missing, total: rows.length };
  });

  const measures = colAnalysis.filter(c => ['financial_measure', 'count_measure', 'numeric_measure'].includes(c.role));
  const dimensions = colAnalysis.filter(c => ['dimension', 'date_dimension'].includes(c.role));
  const ids = colAnalysis.filter(c => c.role === 'id');
  const unsafeCols = colAnalysis.filter(c => !c.safe && c.role !== 'dimension' && c.role !== 'date_dimension' && c.role !== 'text');

  const grainDescription = (() => {
    if (ids.length > 0 && dimensions.length > 0) return `One row per ${ids[0].name} × ${dimensions[0].name}`;
    if (measures.length > 0) return `One row per ${measures.length > 0 ? measures[0].name : 'record'}`;
    return 'Grain unclear — add a primary key or unique identifier';
  })();

  const suggestedFact = measures.length > 0 ? `The main fact table contains: ${measures.map(m => m.name).join(', ')}` : 'No clear numeric measures detected';
  const suggestedDims = dimensions.length > 0 ? dimensions.map(d => d.name).join(', ') : 'No clear dimensions detected';

  const saveToMetricStore = async () => {
    setSaving(true);
    const defaultMetrics = measures.map(m => ({
      metricName: m.name,
      displayName: m.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      businessDefinition: `${m.role === 'financial_measure' ? 'Financial metric' : 'Count/volume metric'}: ${m.name}`,
      formula: `SUM(${m.name})`,
      aggregationType: 'sum',
      sourceColumns: [m.name],
      domain: m.role === 'financial_measure' ? 'finance' : 'general',
      certified: false,
      nonAdditive: false,
      integrityScore: 70,
    }));
    for (const metric of defaultMetrics) {
      await base44.entities.SemanticMetric.create(metric).catch(() => {});
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Measures', count: measures.length, color: 'text-green-400', bg: 'bg-green-400/8 border-green-400/20' },
          { label: 'Dimensions', count: dimensions.length, color: 'text-purple-400', bg: 'bg-purple-400/8 border-purple-400/20' },
          { label: 'ID Columns', count: ids.length, color: 'text-red-400', bg: 'bg-red-400/8 border-red-400/20' },
          { label: 'Unsafe to SUM', count: unsafeCols.length, color: 'text-amber-400', bg: 'bg-amber-400/8 border-amber-400/20' },
        ].map(s => (
          <div key={s.label} className={`p-4 rounded-2xl border ${s.bg} text-center`}>
            <div className={`text-3xl font-black ${s.color}`}>{s.count}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Star schema summary */}
      <div className="p-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold text-cyan-400">🌟 Star Schema Detection</div>
          <button onClick={saveToMetricStore} disabled={saving || measures.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 hover:bg-cyan-400/20'}`}>
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : saved ? <CheckCircle2 className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
            {saved ? 'Saved to Metric Store' : 'Save Measures to Metric Store'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div>
            <div className="text-white/30 mb-1 font-semibold uppercase tracking-widest">Grain</div>
            <div className="text-white/60">{grainDescription}</div>
          </div>
          <div>
            <div className="text-green-400 mb-1 font-semibold uppercase tracking-widest">Fact Table Candidates</div>
            <div className="text-white/60">{suggestedFact}</div>
          </div>
          <div>
            <div className="text-purple-400 mb-1 font-semibold uppercase tracking-widest">Dimension Candidates</div>
            <div className="text-white/60">{suggestedDims}</div>
          </div>
        </div>
      </div>

      {/* Safety rules */}
      {unsafeCols.length > 0 && (
        <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-red-400">
            <Shield className="w-4 h-4" /> SQL Safety Rules — Never Aggregate These
          </div>
          {unsafeCols.map(c => (
            <div key={c.name} className="flex items-start gap-2 text-xs">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="font-mono text-red-400/80">{c.name}</span>
              <span className="text-white/40">— {c.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Column analysis table */}
      <div className="rounded-xl border border-white/8 overflow-auto">
        <table className="w-full text-xs min-w-max">
          <thead>
            <tr className="border-b border-white/8 bg-white/3">
              {['Column', 'Detected Role', 'Safe to SUM?', 'Unique Values', 'Missing', 'Reason'].map(h => (
                <th key={h} className="text-left px-3 py-2 text-white/30 font-mono">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {colAnalysis.map((col, i) => {
              const cfg = ROLE_CONFIG[col.role] || ROLE_CONFIG.text;
              const Icon = cfg.icon;
              return (
                <motion.tr key={col.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/2">
                  <td className="px-3 py-2 font-mono text-white/80">{col.name}</td>
                  <td className="px-3 py-2">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-xs font-semibold w-fit ${cfg.bg} ${cfg.color}`}>
                      <Icon className="w-3 h-3" /> {cfg.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {col.safe ? (
                      <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" /> Yes</span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400"><AlertTriangle className="w-3 h-3" /> No</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-white/50">{col.unique}</td>
                  <td className={`px-3 py-2 font-mono ${col.missing > 0 ? 'text-amber-400' : 'text-green-400'}`}>{col.missing}</td>
                  <td className="px-3 py-2 text-white/35 max-w-xs truncate">{col.reason}</td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}