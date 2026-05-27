/**
 * Data Analyst Workspace — Phase 3
 * Auto-EDA · SQL Builder · Chart Recommendations · Dashboard QA · KPI Engine
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart2, ChevronLeft, FileText, Terminal, Target,
  Zap, Activity, Loader2, CheckCircle2, AlertTriangle, Download
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { toast } from 'sonner';
import ExportToPptx from '@/components/export/ExportToPptx';

// ── Algorithms ────────────────────────────────────────────────────
function calcMissingRate(col) { return col.nullCount && col.count ? ((col.nullCount / col.count) * 100).toFixed(1) : '0'; }
function calcDuplicateRate(rows) {
  if (!rows?.length) return '0';
  const seen = new Set();
  let dupes = 0;
  rows.forEach(r => { const k = JSON.stringify(r); if (seen.has(k)) dupes++; else seen.add(k); });
  return ((dupes / rows.length) * 100).toFixed(1);
}

function recommendChart(columns = []) {
  const names = columns.map(c => (c.name || '').toLowerCase());
  const types = columns.map(c => (c.type || c.dataType || '').toLowerCase());
  const hasDate = types.some(t => t === 'date') || names.some(n => n.includes('date') || n.includes('month') || n.includes('year'));
  const numericCount = types.filter(t => t === 'number' || t === 'numeric' || t === 'float' || t === 'int').length;
  const catCount = types.filter(t => t === 'string' || t === 'category').length;
  const hasGeo = names.some(n => ['latitude','longitude','lat','lon','country','state','city','zip','region'].includes(n));
  if (hasGeo) return { type: 'Map', reason: 'Geographic columns detected (lat/lon, country, state, city, region)', icon: '🗺️' };
  if (hasDate && numericCount >= 1) return { type: 'Line Chart', reason: 'Date + numeric column → trend over time', icon: '📈' };
  if (catCount >= 1 && numericCount >= 1) return { type: 'Bar Chart', reason: 'Category + numeric → comparison by group', icon: '📊' };
  if (numericCount >= 2) return { type: 'Scatter Plot', reason: 'Two numeric columns → correlation analysis', icon: '🔵' };
  if (numericCount === 1) return { type: 'Histogram', reason: 'Single numeric column → distribution', icon: '📉' };
  return { type: 'Table', reason: 'No numeric/date columns detected → display as table', icon: '📋' };
}

function detectGeoFields(columns = []) {
  const names = columns.map(c => (c.name || '').toLowerCase());
  return {
    hasLatLon: names.includes('latitude') && names.includes('longitude'),
    hasCountry: names.some(n => ['country', 'country_name'].includes(n)),
    hasState: names.some(n => ['state', 'province', 'region'].includes(n)),
    hasCity: names.includes('city'),
    hasZip: names.some(n => ['zip', 'zipcode', 'postal_code'].includes(n)),
  };
}

const SQL_TEMPLATES = [
  { name: 'Revenue by Category (Contribution %)', code: `SELECT\n    category,\n    SUM(revenue) AS total_revenue,\n    ROUND(SUM(revenue) * 100.0 / SUM(SUM(revenue)) OVER (), 2) AS contribution_pct\nFROM data\nGROUP BY category\nORDER BY contribution_pct DESC;` },
  { name: 'Month-over-Month Growth', code: `WITH monthly AS (\n    SELECT DATE_TRUNC('month', order_date) AS month,\n           SUM(revenue) AS revenue\n    FROM data GROUP BY 1\n)\nSELECT month, revenue,\n    LAG(revenue) OVER (ORDER BY month) AS prev_month,\n    ROUND((revenue - LAG(revenue) OVER (ORDER BY month)) * 100.0 /\n          NULLIF(LAG(revenue) OVER (ORDER BY month), 0), 2) AS mom_growth_pct\nFROM monthly;` },
  { name: 'Duplicate Detection', code: `SELECT order_id, COUNT(*) AS duplicate_count\nFROM data\nGROUP BY order_id\nHAVING COUNT(*) > 1\nORDER BY duplicate_count DESC;` },
  { name: 'Running / Cumulative Total', code: `SELECT\n    order_date,\n    SUM(revenue) AS daily_revenue,\n    SUM(SUM(revenue)) OVER (\n        ORDER BY order_date\n        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\n    ) AS cumulative_revenue\nFROM data\nGROUP BY order_date ORDER BY order_date;` },
  { name: 'Segment Ranking (Dense Rank)', code: `SELECT\n    region, category,\n    SUM(revenue) AS revenue,\n    DENSE_RANK() OVER (\n        PARTITION BY region\n        ORDER BY SUM(revenue) DESC\n    ) AS rank_in_region\nFROM data\nGROUP BY region, category;` },
  { name: 'Missing Value Analysis', code: `SELECT\n    column_name,\n    COUNT(*) AS total_rows,\n    SUM(CASE WHEN column_value IS NULL THEN 1 ELSE 0 END) AS missing_count,\n    ROUND(SUM(CASE WHEN column_value IS NULL THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS missing_rate_pct\nFROM data_profile\nGROUP BY column_name\nORDER BY missing_rate_pct DESC;` },
];

const TABS = [
  { id: 'eda', label: 'Auto-EDA Report', icon: FileText },
  { id: 'sql', label: 'SQL Builder', icon: Terminal },
  { id: 'chart', label: 'Chart Advisor', icon: BarChart2 },
  { id: 'kpi', label: 'KPI Engine', icon: Target },
  { id: 'qa', label: 'Dashboard QA', icon: CheckCircle2 },
];

// ── Auto-EDA ──────────────────────────────────────────────────────
function AutoEDATab() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    if (!table) { toast.error('Load a dataset in Workspace first'); return; }
    setLoading(true);
    try {
      const cols = table.columns?.slice(0, 20) || [];
      const rows = table.rows?.slice(0, 100) || [];
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Data Analyst. Generate a comprehensive Auto-EDA report for dataset "${table.name}".

Columns: ${JSON.stringify(cols)}
Sample rows (first 10): ${JSON.stringify(rows.slice(0, 10))}
Row count: ${table.rows?.length || 0}

Return detailed JSON:
{
  "dataset_name": "",
  "row_count": 0,
  "column_count": 0,
  "data_quality_score": 0,
  "completeness_score": 0,
  "uniqueness_score": 0,
  "validity_score": 0,
  "column_profiles": [{"name":"","type":"","missing_pct":0,"unique_count":0,"min":"","max":"","mean":"","top_values":[""],"recommended_action":""}],
  "duplicate_rate_pct": 0,
  "key_findings": ["finding1","finding2"],
  "outliers_detected": ["outlier1"],
  "correlations": [{"col1":"","col2":"","correlation":"strong positive/negative/weak"}],
  "recommended_kpis": [{"name":"","formula":"","business_meaning":""}],
  "recommended_chart": {"type":"","reason":""},
  "data_issues": [{"issue":"","severity":"High/Med/Low","fix":""}],
  "business_interpretation": "3-4 paragraph analysis",
  "next_analysis_steps": ["step1","step2"]
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            dataset_name: { type: 'string' },
            row_count: { type: 'number' },
            column_count: { type: 'number' },
            data_quality_score: { type: 'number' },
            completeness_score: { type: 'number' },
            uniqueness_score: { type: 'number' },
            validity_score: { type: 'number' },
            column_profiles: { type: 'array', items: { type: 'object' } },
            duplicate_rate_pct: { type: 'number' },
            key_findings: { type: 'array', items: { type: 'string' } },
            outliers_detected: { type: 'array', items: { type: 'string' } },
            correlations: { type: 'array', items: { type: 'object' } },
            recommended_kpis: { type: 'array', items: { type: 'object' } },
            recommended_chart: { type: 'object' },
            data_issues: { type: 'array', items: { type: 'object' } },
            business_interpretation: { type: 'string' },
            next_analysis_steps: { type: 'array', items: { type: 'string' } },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const geoInfo = table ? detectGeoFields(table.columns || []) : null;
  const chartRec = table ? recommendChart(table.columns || []) : null;

  return (
    <div className="space-y-4">
      {!table ? (
        <div className="p-4 rounded-xl bg-amber-400/8 border border-amber-400/20 text-sm text-amber-400">
          ⚠ No dataset loaded. <Link to="/workspace" className="underline">Go to Workspace</Link> → upload data → come back here.
        </div>
      ) : (
        <div className="p-3 rounded-xl bg-cyan-400/8 border border-cyan-400/20 text-xs text-cyan-400">
          ✓ Dataset loaded: <strong>{table.name}</strong> · {table.rows?.length?.toLocaleString()} rows · {table.columns?.length} columns
        </div>
      )}

      {table && chartRec && (
        <div className="flex flex-wrap gap-3">
          <div className="p-3 bg-white/3 border border-white/8 rounded-xl flex items-center gap-3">
            <span className="text-xl">{chartRec.icon}</span>
            <div><div className="text-xs font-bold text-white/70">Recommended Chart: <span className="text-cyan-400">{chartRec.type}</span></div>
              <div className="text-xs text-white/30">{chartRec.reason}</div></div>
          </div>
          {geoInfo && Object.values(geoInfo).some(Boolean) && (
            <div className="p-3 bg-white/3 border border-green-400/15 rounded-xl text-xs text-green-400">
              🗺️ Geo fields detected: {Object.entries(geoInfo).filter(([,v])=>v).map(([k])=>k).join(', ')}
            </div>
          )}
        </div>
      )}

      <button onClick={generate} disabled={loading || !table}
        className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-400/20 disabled:opacity-40 transition-all">
        {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileText className="w-4 h-4"/>}
        {loading ? 'Generating EDA…' : 'Generate Auto-EDA Report'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Quality Score" value={`${result.data_quality_score}/100`} color={(result.data_quality_score||0)>=80?'text-green-400':'text-amber-400'}/>
            <Kpi label="Completeness" value={`${result.completeness_score}%`} color="text-cyan-400"/>
            <Kpi label="Uniqueness" value={`${result.uniqueness_score}%`} color="text-purple-400"/>
            <Kpi label="Duplicate Rate" value={`${result.duplicate_rate_pct}%`} color={result.duplicate_rate_pct>5?'text-red-400':'text-green-400'}/>
          </div>
          <Section title="Key Findings" color="cyan">
            <ul>{result.key_findings?.map((f,i)=><li key={i} className="flex items-start gap-2 text-xs text-white/70 mb-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0 mt-0.5"/>{f}</li>)}</ul>
          </Section>
          <Section title="Column Profiles" color="cyan">
            <div className="overflow-auto"><table className="w-full text-xs border-collapse">
              <thead><tr className="border-b border-white/10">{['Column','Type','Missing %','Unique','Min','Max','Mean','Action'].map(h=><th key={h} className="text-left px-2 py-1.5 text-white/40 whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody>{result.column_profiles?.map((c,i)=><tr key={i} className="border-b border-white/5 hover:bg-white/2">
                <td className="px-2 py-2 font-semibold text-white/80">{c.name}</td>
                <td className="px-2 py-2 text-white/40">{c.type}</td>
                <td className={`px-2 py-2 ${Number(c.missing_pct)>10?'text-red-400':Number(c.missing_pct)>0?'text-amber-400':'text-green-400'}`}>{c.missing_pct}%</td>
                <td className="px-2 py-2 text-white/40">{c.unique_count}</td>
                <td className="px-2 py-2 text-white/40">{c.min}</td>
                <td className="px-2 py-2 text-white/40">{c.max}</td>
                <td className="px-2 py-2 text-white/40">{c.mean}</td>
                <td className="px-2 py-2 text-cyan-400/70 max-w-xs">{c.recommended_action}</td>
              </tr>)}</tbody>
            </table></div>
          </Section>
          {result.data_issues?.length > 0 && (
            <Section title="Data Issues" color="red">
              {result.data_issues.map((d,i)=><div key={i} className="flex items-start gap-2 mb-2 p-2 bg-red-400/5 rounded-lg border border-red-400/10">
                <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${d.severity==='High'?'text-red-400':'text-amber-400'}`}/>
                <div><div className="text-xs font-semibold text-white/70">{d.issue}</div><div className="text-xs text-white/40">Fix: {d.fix}</div></div>
                <span className={`ml-auto text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${d.severity==='High'?'bg-red-400/15 text-red-400':'bg-amber-400/15 text-amber-400'}`}>{d.severity}</span>
              </div>)}
            </Section>
          )}
          <Section title="Recommended KPIs" color="purple">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {result.recommended_kpis?.map((k,i)=><div key={i} className="p-2 bg-white/3 rounded-lg border border-white/8">
                <div className="text-xs font-bold text-purple-400">{k.name}</div>
                <div className="text-xs font-mono text-white/40 mt-0.5">{k.formula}</div>
                <div className="text-xs text-white/50 mt-0.5">{k.business_meaning}</div>
              </div>)}
            </div>
          </Section>
          <Section title="Business Interpretation" color="cyan">{result.business_interpretation}</Section>
          <div className="flex gap-3">
            <ExportToPptx title={`Auto-EDA: ${result.dataset_name}`} subtitle={`${result.row_count} rows · ${result.column_count} columns`}
              filename={`eda_${result.dataset_name?.replace(/\s+/g,'_')}`}
              slides={[
                { heading: 'Dataset Overview', bullets: [`Rows: ${result.row_count}`, `Columns: ${result.column_count}`, `Quality Score: ${result.data_quality_score}/100`, `Duplicate Rate: ${result.duplicate_rate_pct}%`] },
                { heading: 'Key Findings', bullets: result.key_findings || [] },
                { heading: 'Data Issues', bullets: result.data_issues?.map(d=>`[${d.severity}] ${d.issue} → ${d.fix}`) || [] },
                { heading: 'Business Interpretation', bullets: [result.business_interpretation] },
              ]}
            />
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── SQL Builder ───────────────────────────────────────────────────
function SQLBuilderTab() {
  const [nlQuery, setNlQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();

  const generateSQL = async () => {
    if (!nlQuery.trim()) return;
    setLoading(true);
    try {
      const cols = table?.columns?.map(c => typeof c === 'string' ? { name: c, type: 'unknown' } : c).slice(0, 20) || [{ name: 'revenue', type: 'numeric' }, { name: 'region', type: 'category' }, { name: 'order_date', type: 'date' }];
      const res = await base44.functions.invoke('generateSQL', {
        question: nlQuery,
        columns: cols,
        tableName: table?.name || 'data',
        rows: table?.rows?.slice(0, 5) || [],
      });
      setGeneratedSQL(res.data?.sql || res.data?.generatedSQL || '-- No SQL generated');
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  const copySQL = (sql) => { navigator.clipboard.writeText(sql); toast.success('SQL copied!'); };

  return (
    <div className="space-y-4">
      <div><label className="text-xs text-white/40 block mb-1">Natural Language → SQL</label>
        <div className="flex gap-2">
          <input value={nlQuery} onChange={e=>setNlQuery(e.target.value)} onKeyDown={e=>e.key==='Enter'&&generateSQL()}
            placeholder="e.g. Show me total revenue by region, ordered by highest first"
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/>
          <button onClick={generateSQL} disabled={loading||!nlQuery.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-400/20 disabled:opacity-40 transition-all">
            {loading?<Loader2 className="w-3.5 h-3.5 animate-spin"/>:<Zap className="w-3.5 h-3.5"/>}
            {loading?'Generating…':'Generate SQL'}
          </button>
        </div>
      </div>

      {generatedSQL && (
        <div className="relative">
          <div className="text-xs text-white/30 mb-1 uppercase tracking-widest font-semibold">Generated SQL</div>
          <pre className="text-xs text-green-400/80 font-mono bg-black/30 rounded-xl px-4 py-3 whitespace-pre-wrap border border-white/8 overflow-auto">{generatedSQL}</pre>
          <button onClick={()=>copySQL(generatedSQL)} className="absolute top-7 right-3 px-2 py-1 text-xs bg-white/10 border border-white/15 text-white/50 rounded hover:text-white/80 transition-all">Copy</button>
        </div>
      )}

      <div>
        <div className="text-xs text-white/30 mb-2 uppercase tracking-widest font-semibold">SQL Template Library</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {SQL_TEMPLATES.map((t, i) => (
            <div key={i} className={`p-3 bg-white/3 border rounded-xl cursor-pointer transition-all ${selectedTemplate===i?'border-cyan-400/30 bg-cyan-400/5':'border-white/8 hover:border-white/15'}`}
              onClick={() => setSelectedTemplate(selectedTemplate===i?null:i)}>
              <div className="text-xs font-semibold text-white/70 mb-2">{t.name}</div>
              {selectedTemplate === i && (
                <div className="relative">
                  <pre className="text-xs text-green-400/70 font-mono whitespace-pre-wrap leading-relaxed">{t.code}</pre>
                  <button onClick={(e)=>{e.stopPropagation();copySQL(t.code)}} className="mt-2 px-2 py-1 text-xs bg-white/10 text-white/50 rounded hover:text-white/80 transition-all">Copy SQL</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Chart Advisor ─────────────────────────────────────────────────
function ChartAdvisorTab() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [customCols, setCustomCols] = useState('');

  const cols = table?.columns || (customCols ? customCols.split(',').map((c, i) => ({ name: c.trim(), type: i % 3 === 0 ? 'number' : i % 3 === 1 ? 'date' : 'string' })) : []);
  const rec = recommendChart(cols);
  const geo = detectGeoFields(cols);

  const GEO_FALLBACK = [
    { condition: geo.hasLatLon, label: 'Lat/Lon → Point Map', color: 'text-green-400' },
    { condition: geo.hasCountry, label: 'Country → Choropleth', color: 'text-cyan-400' },
    { condition: geo.hasState, label: 'State/Province → Region Map', color: 'text-blue-400' },
    { condition: geo.hasCity, label: 'City → Geocoded Points', color: 'text-purple-400' },
    { condition: geo.hasZip, label: 'ZIP/Postal → Geocoded', color: 'text-teal-400' },
  ];

  return (
    <div className="space-y-4">
      {!table && (
        <div>
          <label className="text-xs text-white/40 block mb-1">Or enter column names manually (comma-separated)</label>
          <input value={customCols} onChange={e=>setCustomCols(e.target.value)} placeholder="e.g. order_date, revenue, region, customer_id"
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/>
        </div>
      )}

      {cols.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="p-5 bg-cyan-400/8 border border-cyan-400/20 rounded-2xl text-center">
            <div className="text-4xl mb-2">{rec.icon}</div>
            <div className="text-xl font-black text-cyan-400">{rec.type}</div>
            <div className="text-sm text-white/60 mt-1">{rec.reason}</div>
          </div>

          <Section title="Column-by-Column Chart Logic" color="cyan">
            <div className="space-y-2">
              {[
                { rule: 'Date column + Numeric → Line Chart (trend over time)', match: cols.some(c=>c.type==='date'||c.name?.toLowerCase().includes('date')) && cols.some(c=>c.type==='number') },
                { rule: 'Category + Numeric → Bar Chart (comparison by group)', match: cols.some(c=>c.type==='string') && cols.some(c=>c.type==='number') },
                { rule: 'Lat/Lon columns → Point Map', match: geo.hasLatLon },
                { rule: 'Country/State/City → Choropleth or Geocoded Map', match: geo.hasCountry||geo.hasState||geo.hasCity },
                { rule: '2+ Numeric columns → Scatter Plot (correlation)', match: cols.filter(c=>c.type==='number').length >= 2 },
                { rule: '1 Numeric column → Histogram (distribution)', match: cols.filter(c=>c.type==='number').length === 1 },
              ].map((r, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${r.match ? 'text-white/70' : 'text-white/25'}`}>
                  {r.match ? <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400"/> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"/>}
                  {r.rule}
                </div>
              ))}
            </div>
          </Section>

          <Section title="Geo Map Fallback Strategy" color="green">
            <div className="space-y-2">
              {GEO_FALLBACK.map((g, i) => (
                <div key={i} className={`flex items-center gap-2 text-xs ${g.condition ? g.color : 'text-white/20'}`}>
                  {g.condition ? '✓' : `${i+1}.`} {g.label}
                  {!g.condition && i === GEO_FALLBACK.findIndex(x=>!GEO_FALLBACK.slice(0,GEO_FALLBACK.indexOf(x)).some(y=>y.condition)) && <span className="text-white/25 ml-2">← try next fallback</span>}
                </div>
              ))}
              {!Object.values(geo).some(Boolean) && <div className="text-xs text-red-400/70">⚠ No geographic fields found — map not possible with current columns</div>}
            </div>
          </Section>
        </motion.div>
      )}
    </div>
  );
}

// ── KPI Engine ────────────────────────────────────────────────────
function KPIEngineTab() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const cols = table?.columns?.map(c => c.name || c).slice(0, 20) || ['revenue', 'cost', 'orders', 'customers', 'date'];
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Senior Data Analyst. Based on dataset "${table?.name||'Sample'}" with columns: ${cols.join(', ')}

Generate comprehensive KPI definitions:
{
  "kpis": [{
    "name": "",
    "category": "Financial/Growth/Operational/Quality",
    "formula": "exact formula with column names",
    "sql_expression": "SELECT ... AS kpi_name FROM data",
    "business_meaning": "",
    "healthy_range": "",
    "alert_threshold": "",
    "visualization": "bar/line/kpi_card"
  }],
  "kpi_tree": {"primary": "", "secondary": [""], "diagnostic": [""]}
}`,
        response_json_schema: {
          type: 'object',
          properties: {
            kpis: { type: 'array', items: { type: 'object' } },
            kpi_tree: { type: 'object' },
          },
        },
      });
      setResult(res);
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={generate} disabled={loading}
        className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400/15 border border-cyan-400/25 text-cyan-400 rounded-xl text-sm font-bold hover:bg-cyan-400/20 disabled:opacity-40 transition-all">
        {loading?<Loader2 className="w-4 h-4 animate-spin"/>:<Target className="w-4 h-4"/>}
        {loading?'Generating KPIs…':'Generate KPI Definitions'}
      </button>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.kpi_tree && (
            <Section title="KPI Tree" color="cyan">
              <div className="space-y-2">
                <div className="text-xs"><span className="text-cyan-400 font-bold">Primary: </span><span className="text-white/70">{result.kpi_tree.primary}</span></div>
                <div className="text-xs"><span className="text-purple-400 font-bold">Secondary: </span><span className="text-white/60">{result.kpi_tree.secondary?.join(' · ')}</span></div>
                <div className="text-xs"><span className="text-amber-400 font-bold">Diagnostic: </span><span className="text-white/50">{result.kpi_tree.diagnostic?.join(' · ')}</span></div>
              </div>
            </Section>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.kpis?.map((k,i)=>(
              <div key={i} className="p-3 bg-white/3 border border-white/8 rounded-xl">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-xs font-bold text-cyan-400">{k.name}</div>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-white/8 text-white/40">{k.category}</span>
                </div>
                <div className="text-xs font-mono text-white/50 mb-1.5">{k.formula}</div>
                <div className="text-xs text-white/60 mb-1.5">{k.business_meaning}</div>
                {k.sql_expression && <code className="text-xs text-green-400/60 font-mono bg-black/20 rounded px-2 py-1 block overflow-auto">{k.sql_expression}</code>}
                <div className="flex gap-2 mt-2">
                  {k.healthy_range && <span className="text-xs text-green-400/70">Healthy: {k.healthy_range}</span>}
                  {k.alert_threshold && <span className="text-xs text-red-400/70">Alert: {k.alert_threshold}</span>}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ── Dashboard QA ──────────────────────────────────────────────────
function DashboardQATab() {
  const [chartTitle, setChartTitle] = useState('');
  const [checks, setChecks] = useState({
    hasTitle: false,
    hasAxisLabels: false,
    hasAggregation: false,
    noMisleadingPie: false,
    hasKPIFormula: false,
    hasSourceCited: false,
    hasDateRange: false,
    hasLegend: false,
  });

  const toggle = k => setChecks(c => ({ ...c, [k]: !c[k] }));
  const score = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;

  const LABELS = {
    hasTitle: 'Chart has a clear descriptive title',
    hasAxisLabels: 'X and Y axis labels exist',
    hasAggregation: 'Aggregation method is correct (SUM/AVG/COUNT)',
    noMisleadingPie: 'No misleading pie chart (>6 slices or non-% data)',
    hasKPIFormula: 'KPI formula is displayed or documented',
    hasSourceCited: 'Source dataset and date range cited',
    hasDateRange: 'Date range / time period visible',
    hasLegend: 'Legend present for multi-series charts',
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div><label className="text-xs text-white/40 block mb-1">Chart / Dashboard Name</label>
        <input value={chartTitle} onChange={e=>setChartTitle(e.target.value)} placeholder="e.g. Revenue by Region - Q2 2026"
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none"/></div>

      <div className={`p-4 rounded-xl border text-center ${score===total?'border-green-400/25 bg-green-400/8':score>=6?'border-amber-400/25 bg-amber-400/8':'border-red-400/25 bg-red-400/8'}`}>
        <div className={`text-3xl font-black ${score===total?'text-green-400':score>=6?'text-amber-400':'text-red-400'}`}>{score}/{total}</div>
        <div className="text-xs text-white/60">Dashboard QA Score — {score===total?'PASS ✓':score>=6?'NEEDS FIXES':'FAIL ✗'}</div>
      </div>

      <div className="space-y-2">
        {Object.entries(LABELS).map(([k, label]) => (
          <div key={k} onClick={() => toggle(k)}
            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${checks[k] ? 'border-green-400/25 bg-green-400/8' : 'border-white/8 hover:border-white/15'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${checks[k] ? 'border-green-400 bg-green-400' : 'border-white/20'}`}>
              {checks[k] && <span className="text-black text-xs font-bold">✓</span>}
            </div>
            <span className={`text-xs ${checks[k] ? 'text-white/80' : 'text-white/50'}`}>{label}</span>
          </div>
        ))}
      </div>

      {score < total && (
        <div className="p-3 bg-amber-400/8 border border-amber-400/20 rounded-xl">
          <div className="text-xs font-bold text-amber-400 mb-1">Items to Fix:</div>
          <ul>{Object.entries(checks).filter(([,v])=>!v).map(([k])=><li key={k} className="text-xs text-white/60 mb-0.5">• {LABELS[k]}</li>)}</ul>
        </div>
      )}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Kpi({ label, value, color }) {
  return (
    <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
      <div className={`text-xl font-black ${color}`}>{value}</div>
      <div className="text-xs text-white/30 mt-0.5">{label}</div>
    </div>
  );
}
const CC = { cyan: 'border-cyan-400/20', purple: 'border-purple-400/20', red: 'border-red-400/20', green: 'border-green-400/20', amber: 'border-amber-400/20' };
function Section({ title, color = 'cyan', children }) {
  return (
    <div className={`rounded-xl border ${CC[color]||CC.cyan} overflow-hidden`}>
      <div className="px-4 py-2.5 text-xs font-bold text-white/70 uppercase tracking-widest">{title}</div>
      <div className="px-4 py-3">{typeof children === 'string' ? <p className="text-sm text-white/70 leading-relaxed">{children}</p> : children}</div>
    </div>
  );
}

const TAB_COMPONENTS = { eda: AutoEDATab, sql: SQLBuilderTab, chart: ChartAdvisorTab, kpi: KPIEngineTab, qa: DashboardQATab };

export default function DataAnalystWorkspace() {
  const [activeTab, setActiveTab] = useState('eda');
  const ActiveTab = TAB_COMPONENTS[activeTab];
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/role-select" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all"><ChevronLeft className="w-4 h-4"/></Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center"><BarChart2 className="w-4 h-4 text-cyan-400"/></div>
            <div><h1 className="text-lg font-bold">Data Analyst Workspace</h1>
              <p className="text-xs text-muted-foreground">Auto-EDA · SQL Builder · Chart Advisor · KPI Engine · Dashboard QA</p></div>
          </div>
          <Link to="/workspace" className="flex items-center gap-1.5 px-3 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15 transition-all"><Zap className="w-3.5 h-3.5"/> Full Workspace</Link>
        </div>
      </div>
      <div className="border-b border-white/8 px-6">
        <div className="max-w-6xl mx-auto flex gap-0 overflow-x-auto">
          {TABS.map(t=><button key={t.id} onClick={()=>setActiveTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-all ${activeTab===t.id?'border-cyan-400 text-cyan-400':'border-transparent text-white/35 hover:text-white/60'}`}>
            <t.icon className="w-3.5 h-3.5"/>{t.label}
          </button>)}
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
            <ActiveTab />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}