/**
 * SemanticSection — Reusable Semantic Layer
 * Business-friendly metric names, KPI definitions, relationship map,
 * date grain, metric descriptions, example natural-language questions.
 * Used across dashboards, SQL generation, AI answers, and reports.
 */
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import {
  Layers, Hash, Tag, Calendar, Key, TrendingUp, Database,
  GitBranch, ArrowRight, CheckCircle2, AlertTriangle, Info,
  Sparkles, Copy, Check, BookOpen, Target, Link2
} from 'lucide-react';

const TYPE_META = {
  numeric:  { color:'text-blue-400',   bg:'bg-blue-400/10',   border:'border-blue-400/20' },
  category: { color:'text-purple-400', bg:'bg-purple-400/10', border:'border-purple-400/20' },
  date:     { color:'text-teal-400',   bg:'bg-teal-400/10',   border:'border-teal-400/20' },
  id:       { color:'text-amber-400',  bg:'bg-amber-400/10',  border:'border-amber-400/20' },
};

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); }}
      className="p-1 rounded text-white/25 hover:text-white/60 transition-colors">
      {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

// Build enriched KPI definitions from table + semantic model
function buildKPIs(table, semanticModel, analysisResults) {
  if (!table) return [];
  const numCols = table.columns?.filter(c=>c.type==='numeric') || [];
  const dateCol = table.columns?.find(c=>c.type==='date');
  const catCols = table.columns?.filter(c=>c.type==='category') || [];
  const primaryMetric = analysisResults?.primaryMetric;

  return numCols.map(col => {
    const isPrimary = col.name === primaryMetric;
    const name = col.name;
    const label = name.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase());
    const n = name.toLowerCase();

    // Infer aggregation type
    const aggType = /rate|pct|percent|score|ratio|avg|average/.test(n) ? 'AVG'
      : /count|num|number|qty|quantity/.test(n) ? 'COUNT' : 'SUM';

    // Infer business description
    const desc = /revenue|sales/.test(n) ? `Total ${label} generated. Primary financial performance indicator.`
      : /cost|expense|spend/.test(n) ? `Total ${label} incurred. Monitor for cost efficiency.`
      : /profit|margin/.test(n) ? `Net ${label} after costs. Key profitability indicator.`
      : /score|rating|satisfaction/.test(n) ? `Average ${label} measuring quality or customer experience.`
      : /count|qty|quantity/.test(n) ? `Count of ${label}. Represents volume.`
      : `Aggregated ${label} across all records.`;

    // Date grain
    const grain = dateCol ? (
      /year|annual/.test(dateCol.name.toLowerCase()) ? 'Yearly'
      : /quarter/.test(dateCol.name.toLowerCase()) ? 'Quarterly'
      : /week/.test(dateCol.name.toLowerCase()) ? 'Weekly'
      : 'Monthly'
    ) : 'N/A — no date column';

    // Example questions
    const questions = [
      `What is the total ${label.toLowerCase()} this period?`,
      `Which ${catCols[0]?.name.replace(/_/g,' ') || 'segment'} has the highest ${label.toLowerCase()}?`,
      isPrimary && `What is the trend for ${label.toLowerCase()} over time?`,
      aggType === 'AVG' && `How does average ${label.toLowerCase()} compare across groups?`,
    ].filter(Boolean);

    // Confidence intervals note
    const ci95 = col.mean && col.std && table.rowCount
      ? `[${(col.mean - 1.96*col.std/Math.sqrt(table.rowCount)).toFixed(1)}, ${(col.mean + 1.96*col.std/Math.sqrt(table.rowCount)).toFixed(1)}]`
      : null;

    return {
      name, label, aggType, desc, grain, questions, isPrimary,
      mean: col.mean, std: col.std, min: col.min, max: col.max, ci95,
      formula: `${aggType}(${name})`,
      semanticName: `${aggType.toLowerCase()}_${name}`,
    };
  });
}

// Build relationship definitions
function buildRelationships(table, semanticModel) {
  const rels = semanticModel?.relationships || [];
  if (rels.length) return rels;
  // Infer from column names
  const idCols = table?.columns?.filter(c => c.type === 'id' || /id$|_id/.test(c.name)) || [];
  return idCols.slice(0,3).map(col => ({
    from: table.name, to: col.name.replace(/_id$/,'').replace(/_/g,' '), type: 'many-to-one',
    via: col.name, description: `${table.name} references ${col.name.replace(/_id$/,'').replace(/_/g,' ')} via ${col.name}`
  }));
}

export default function SemanticSection() {
  const { semanticModel, getActiveTable, setActiveSection, analysisResults } = useWorkspaceStore();
  const table = getActiveTable();
  const [activeTab, setActiveTab] = useState('model');

  const kpis = useMemo(() => buildKPIs(table, semanticModel, analysisResults), [table, semanticModel, analysisResults]);
  const relationships = useMemo(() => buildRelationships(table, semanticModel), [table, semanticModel]);

  if (!semanticModel || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center mx-auto mb-4">
          <Layers className="w-7 h-7 text-white/25" />
        </div>
        <h2 className="text-lg font-semibold mb-2">No Semantic Model</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-sm">Upload and prepare a dataset to auto-generate the semantic model.</p>
        <button onClick={()=>setActiveSection('intake')}
          className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-sm font-semibold hover:bg-cyan-400/15 transition-colors">
          Upload Data <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const tabs = [
    { id:'model',     label:'Overview' },
    { id:'kpis',      label:`KPI Definitions (${kpis.length})` },
    { id:'measures',  label:`Measures (${semanticModel.measures?.length||0})` },
    { id:'dimensions',label:`Dimensions (${semanticModel.dimensions?.length||0})` },
    { id:'relations', label:`Relationships` },
    { id:'queries',   label:'Example Queries' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-auto">
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }}>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-cyan-400" />
          <span className="text-xs text-muted-foreground font-mono uppercase tracking-widest">Auto-generated semantic layer</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">Semantic Model</h1>
        <p className="text-sm text-muted-foreground">Business-friendly labels, KPI definitions, dimensions, and metric descriptions for <span className="font-mono text-white/70">{table.name}</span>.</p>
      </motion.div>

      {/* Meta strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Table', value: semanticModel.tableName||table.name, icon:Database, color:'text-cyan-400', bg:'bg-cyan-400/10' },
          { label:'Primary Key', value: semanticModel.primaryKey||'None detected', icon:Key, color:'text-amber-400', bg:'bg-amber-400/10' },
          { label:'Date Field', value: semanticModel.dateField||'None detected', icon:Calendar, color:'text-teal-400', bg:'bg-teal-400/10' },
          { label:'Date Grain', value: kpis[0]?.grain || semanticModel.dateGrain || 'Monthly', icon:Calendar, color:'text-blue-400', bg:'bg-blue-400/10' },
        ].map(item => (
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

      {/* Confidence bar */}
      <div className="glass-card rounded-2xl p-5 border border-green-400/15 flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            <span className="text-sm font-semibold">Model Confidence</span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden mb-1">
            <div className="h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full transition-all duration-700"
              style={{ width:`${semanticModel.qualityScore||85}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">Used in AI Analyst, SQL Studio, Dashboards, and Reports</div>
        </div>
        <div className="text-4xl font-black text-green-400 font-mono flex-shrink-0">{semanticModel.qualityScore||85}%</div>
      </div>

      {/* Usage callout */}
      <div className="flex items-start gap-3 p-4 bg-blue-400/5 border border-blue-400/15 rounded-xl">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300/80 leading-relaxed">
          This semantic model is the <strong>single source of truth</strong> across the platform. Dashboard labels, AI Analyst answers, SQL Studio query generation, report narratives, and statistical explanations all reference these definitions for consistent business-friendly language.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 border-b border-white/5 overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 ${activeTab===t.id?'border-cyan-400 text-cyan-400':'border-transparent text-white/35 hover:text-white/60'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Model Overview ─────────────────────────────────────── */}
      {activeTab === 'model' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <div className="text-xs text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> Measures
              </div>
              <div className="space-y-2">
                {semanticModel.measures?.slice(0,5).map((m,i) => (
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
                <Tag className="w-3.5 h-3.5 text-purple-400" /> Dimensions
              </div>
              <div className="space-y-2">
                {semanticModel.dimensions?.slice(0,5).map((d,i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                    <span className="text-sm font-medium">{d.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{d.cardinality} values</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label:'KPIs Defined', value:kpis.length, color:'text-cyan-400' },
              { label:'Dimensions', value:semanticModel.dimensions?.length||0, color:'text-purple-400' },
              { label:'Relationships', value:relationships.length, color:'text-teal-400' },
              { label:'Example Queries', value:(semanticModel.exampleQueries?.length||0)+6, color:'text-amber-400' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 border border-white/8 bg-white/2 text-center">
                <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
                <div className="text-xs text-white/30 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ── KPI Definitions ──────────────────────────────────────── */}
      {activeTab === 'kpis' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
          {kpis.length === 0 ? (
            <p className="text-sm text-white/35 py-8 text-center">No numeric KPI columns detected. Upload a dataset with measurable metrics.</p>
          ) : kpis.map(kpi => (
            <div key={kpi.name} className={`rounded-2xl p-5 border ${kpi.isPrimary?'border-cyan-400/25 bg-cyan-400/4':'border-white/8 bg-white/1'}`}>
              <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">{kpi.label}</span>
                    {kpi.isPrimary && <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-400/15 text-cyan-400 border border-cyan-400/25">Primary KPI</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-white/35">{kpi.name}</span>
                    <CopyButton text={kpi.name} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-400/10 text-blue-400 border border-blue-400/20 font-mono">{kpi.formula}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-teal-400/10 text-teal-400 border border-teal-400/20">Grain: {kpi.grain}</span>
                </div>
              </div>
              <p className="text-xs text-white/50 leading-relaxed mb-3">{kpi.desc}</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
                {[
                  { label:'Mean', value: kpi.mean!=null?kpi.mean.toFixed(2):'—' },
                  { label:'Std Dev', value: kpi.std!=null?kpi.std.toFixed(2):'—' },
                  { label:'Min', value: kpi.min!=null?kpi.min.toLocaleString():'—' },
                  { label:'Max', value: kpi.max!=null?kpi.max.toLocaleString():'—' },
                ].map(s => (
                  <div key={s.label} className="flex justify-between bg-white/3 rounded-lg px-2 py-1.5">
                    <span className="text-white/30">{s.label}</span>
                    <span className="font-mono text-white/65">{s.value}</span>
                  </div>
                ))}
              </div>
              {kpi.ci95 && (
                <div className="text-xs text-white/30 mb-2">95% CI (population): <span className="font-mono text-white/50">{kpi.ci95}</span></div>
              )}
              {kpi.questions.length > 0 && (
                <div>
                  <div className="text-xs text-white/25 uppercase tracking-widest mb-1.5">Example Questions</div>
                  <div className="flex flex-wrap gap-1.5">
                    {kpi.questions.map((q,i) => (
                      <button key={i} onClick={()=>setActiveSection('analyst')}
                        className="text-xs px-2.5 py-1 rounded-lg bg-white/4 border border-white/8 text-white/40 hover:border-cyan-400/30 hover:text-cyan-400 transition-all">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Measures ─────────────────────────────────────────────── */}
      {activeTab === 'measures' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {semanticModel.measures?.map(m => {
              const meta = TYPE_META[m.columnType] || TYPE_META.numeric;
              return (
                <div key={m.name} className={`glass-card rounded-xl p-4 border ${meta.border}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="font-mono text-xs text-muted-foreground mt-0.5 flex items-center gap-1">{m.name} <CopyButton text={m.name} /></div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap justify-end">
                      <span className={`px-2 py-0.5 rounded text-xs ${meta.color} ${meta.bg}`}>{m.type}</span>
                      <span className="px-2 py-0.5 bg-teal-400/10 text-teal-400 text-xs rounded">{m.format}</span>
                    </div>
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-white/5 pt-2">{m.description}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Dimensions ───────────────────────────────────────────── */}
      {activeTab === 'dimensions' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {semanticModel.dimensions?.map(d => {
              const meta = TYPE_META[d.columnType] || TYPE_META.category;
              return (
                <div key={d.name} className={`glass-card rounded-xl p-4 border ${meta.border} ${meta.bg}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-sm">{d.label}</div>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${meta.color} bg-white/8`}>{d.cardinality}</span>
                  </div>
                  <div className={`font-mono text-xs flex items-center gap-1 ${meta.color}`}>{d.name} <CopyButton text={d.name} /></div>
                  {d.description && <p className="text-xs text-muted-foreground mt-2">{d.description}</p>}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ── Relationships ─────────────────────────────────────────── */}
      {activeTab === 'relations' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-3">
          {relationships.length === 0 ? (
            <div className="text-center py-12 text-white/25 text-sm">No relationships detected. Upload multiple related tables to see inferred joins.</div>
          ) : relationships.map((r, i) => (
            <div key={i} className="glass-card rounded-xl p-4 border border-white/8">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-sm text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-lg">{r.from}</span>
                <div className="flex items-center gap-1 text-white/30">
                  <Link2 className="w-4 h-4" />
                  <span className="text-xs">{r.type}</span>
                </div>
                <span className="font-mono text-sm text-purple-400 bg-purple-400/10 px-2 py-1 rounded-lg">{r.to}</span>
                {r.via && <span className="text-xs text-white/30">via <span className="font-mono text-teal-400">{r.via}</span></span>}
              </div>
              {r.description && <p className="text-xs text-white/35 mt-2">{r.description}</p>}
            </div>
          ))}
          <div className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/6 text-xs text-white/35">
            <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Upload multiple tables in Data Intake to auto-detect join relationships and enable cross-table analysis.
          </div>
        </motion.div>
      )}

      {/* ── Example Queries ───────────────────────────────────────── */}
      {activeTab === 'queries' && (
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-purple-400/5 border border-purple-400/15 rounded-xl text-xs text-purple-300">
            <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
            These queries are grounded in your semantic model. Click any to send to AI Analyst or SQL Studio.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              // Generic grounded queries
              `What is the total ${kpis[0]?.label.toLowerCase() || 'primary KPI'} across all records?`,
              `Which ${semanticModel.dimensions?.[0]?.label.toLowerCase() || 'segment'} has the highest ${kpis[0]?.label.toLowerCase() || 'value'}?`,
              `Show me the trend over time for ${kpis[0]?.label.toLowerCase() || 'the primary metric'}.`,
              `Are there any anomalies or outliers in the ${kpis[0]?.label.toLowerCase() || 'data'}?`,
              `Compare ${kpis[0]?.label.toLowerCase()} across different ${semanticModel.dimensions?.[0]?.label.toLowerCase() || 'segments'}.`,
              `What is the distribution of ${kpis[0]?.label.toLowerCase() || 'the primary metric'}?`,
              ...(kpis.length > 1 ? [`What is the correlation between ${kpis[0]?.label.toLowerCase()} and ${kpis[1]?.label.toLowerCase()}?`] : []),
              ...(semanticModel.exampleQueries || []),
            ].slice(0,10).map((q,i) => (
              <div key={i} className="flex items-start justify-between gap-3 p-4 glass-card rounded-xl border border-white/8 group hover:border-cyan-400/25 transition-all">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-mono text-cyan-400">{i+1}</div>
                  <p className="text-sm text-white/65 leading-relaxed">{q}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <CopyButton text={q} />
                  <button onClick={()=>setActiveSection('analyst')}
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