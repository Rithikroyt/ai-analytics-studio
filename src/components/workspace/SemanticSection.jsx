import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Layers, Hash, Tag, Calendar, Key, TrendingUp, Database,
  GitBranch, ArrowRight, CheckCircle2, AlertTriangle, Info,
  Sparkles, Copy, Check
} from 'lucide-react';

const TYPE_META = {
  numeric: { color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20' },
  category: { color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20' },
  date: { color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20' },
  id: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20' },
};

const NL_QUERIES = [
  'What is the total revenue this month?',
  'Which region has the highest growth?',
  'Show me the trend for the primary KPI over time.',
  'What are the top 5 segments by value?',
  'Are there any anomalies in the data?',
  'Compare performance this period vs last period.',
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="p-1 rounded text-white/25 hover:text-white/60 transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

export default function SemanticSection() {
  const { semanticModel, getActiveTable, setActiveSection, analysisResults } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('model');

  if (!semanticModel || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Semantic Model</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Upload and prepare a dataset to auto-generate the semantic model with dimensions, measures, and KPI definitions.</p>
        <button onClick={() => setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'model', label: 'Model Overview' },
    { id: 'measures', label: `Measures (${semanticModel.measures?.length || 0})` },
    { id: 'dimensions', label: `Dimensions (${semanticModel.dimensions?.length || 0})` },
    { id: 'queries', label: 'Natural Language Queries' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Auto-generated</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Semantic Model</h1>
        <p className="text-sm text-muted-foreground">Business-friendly labels, dimensions, measures, and KPI definitions for <span className="font-mono text-white/70">{table.name}</span>.</p>
      </motion.div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Table', value: semanticModel.tableName || table.name, icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
          { label: 'Primary Key', value: semanticModel.primaryKey || 'None detected', icon: Key, color: 'text-amber-400', bg: 'bg-amber-400/10' },
          { label: 'Date Field', value: semanticModel.dateField || 'None detected', icon: Calendar, color: 'text-teal-400', bg: 'bg-teal-400/10' },
          { label: 'Date Grain', value: semanticModel.dateGrain || 'Monthly', icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-xl p-4 border border-white/8">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-6 h-6 rounded-lg ${item.bg} flex items-center justify-center`}>
                <item.icon className={`w-3 h-3 ${item.color}`} />
              </div>
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <div className={`font-mono text-sm truncate ${item.color}`}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Quality + usage bar */}
      <div className="glass-card rounded-2xl p-5 border border-green-400/15 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold">Model Confidence</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full transition-all duration-700"
              style={{ width: `${semanticModel.qualityScore || 85}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">Used in AI Analyst, SQL Studio, and Dashboard labels</div>
        </div>
        <div className="text-4xl font-black text-green-400 font-mono flex-shrink-0">{semanticModel.qualityScore || 85}%</div>
      </div>

      {/* Usage info */}
      <div className="flex items-start gap-3 p-4 bg-blue-400/5 border border-blue-400/15 rounded-xl">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300/80 leading-relaxed">
          This semantic model is automatically used across the entire platform — dashboard labels, AI Analyst answers, SQL Studio query generation, and report narratives all reference these definitions to ensure consistent, business-friendly language.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/5 pb-0 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab === t.id ? 'border-cyan-400 text-cyan-400' : 'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Model Overview */}
      {activeTab === 'model' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Measures Summary
              </div>
              <div className="space-y-2">
                {semanticModel.measures?.slice(0, 5).map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm font-medium">{m.label}</span>
                    <div className="flex gap-1.5">
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400">{m.type}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-teal-400/10 text-teal-400">{m.format}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-purple-400" /> Dimensions Summary
              </div>
              <div className="space-y-2">
                {semanticModel.dimensions?.slice(0, 5).map((d, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{d.cardinality} values</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Relationships */}
          {semanticModel.relationships?.length > 0 && (
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <GitBranch className="w-3.5 h-3.5 text-amber-400" /> Relationships
              </div>
              {semanticModel.relationships.map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-white/3 mb-2">
                  <span className="font-mono text-cyan-400">{r.from}</span>
                  <ArrowRight className="w-3 h-3 text-white/30" />
                  <span className="font-mono text-purple-400">{r.to}</span>
                  <span className="text-white/30 ml-auto">{r.type}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Measures tab */}
      {activeTab === 'measures' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {semanticModel.measures?.map((m) => {
              const meta = TYPE_META[m.columnType] || TYPE_META.numeric;
              return (
                <div key={m.name} className={`glass-card rounded-xl p-4 border ${meta.border}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                        {m.name} <CopyButton text={m.name} />
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded text-xs ${meta.color} ${meta.bg}`}>{m.type}</span>
                      <span className="px-2 py-0.5 bg-teal-400/10 text-teal-400 text-xs rounded">{m.format}</span>
                    </div>
                  </div>
                  {m.description && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-white/5 pt-2">{m.description}</p>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Dimensions tab */}
      {activeTab === 'dimensions' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {semanticModel.dimensions?.map((d) => {
              const meta = TYPE_META[d.columnType] || TYPE_META.category;
              return (
                <div key={d.name} className={`glass-card rounded-xl p-4 border ${meta.border} ${meta.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm">{d.label}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${meta.color} bg-white/8`}>{d.cardinality}</span>
                  </div>
                  <div className={`font-mono text-xs flex items-center gap-1 ${meta.color}`}>
                    {d.name} <CopyButton text={d.name} />
                  </div>
                  {d.description && <p className="text-xs text-muted-foreground mt-2">{d.description}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* NL Queries tab */}
      {activeTab === 'queries' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-purple-400/5 border border-purple-400/15 rounded-xl text-xs text-purple-300">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
            These example queries are grounded in the semantic model and can be asked directly in the AI Analyst. Copy any query to get started.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...NL_QUERIES, ...(semanticModel.exampleQueries || [])].slice(0, 8).map((q, i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-4 glass-card rounded-xl border border-white/8 group hover:border-cyan-400/25 transition-all">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono text-cyan-400">{i + 1}</div>
                  <p className="text-sm text-white/70 leading-relaxed">{q}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <CopyButton text={q} />
                  <button onClick={() => setActiveSection('analyst')}
                    className="p-1 rounded text-white/25 hover:text-cyan-400 transition-colors opacity-0 group-hover:opacity-100" title="Ask in AI Analyst">
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}