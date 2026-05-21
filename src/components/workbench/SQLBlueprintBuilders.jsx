/**
 * SQLBlueprintBuilders — Visual SQL generator panels
 * CTE, Window Function, Duplicate Detection, Contribution %, Running Total,
 * Rolling Average, Dense Rank, Top-N, Date Trend, Pivot builders
 */
import { useState } from 'react';
import { Code2, Copy, CheckCircle2, ChevronDown, ChevronRight, Play } from 'lucide-react';

const BUILDERS = [
  { id: 'cte',          label: 'CTE Builder',               color: 'text-cyan-400',   bg: 'border-cyan-400/20' },
  { id: 'window',       label: 'Window Function',            color: 'text-purple-400', bg: 'border-purple-400/20' },
  { id: 'duplicate',    label: 'Duplicate Detection',        color: 'text-red-400',    bg: 'border-red-400/20' },
  { id: 'contribution', label: 'Contribution %',             color: 'text-green-400',  bg: 'border-green-400/20' },
  { id: 'running',      label: 'Running Total',              color: 'text-amber-400',  bg: 'border-amber-400/20' },
  { id: 'rolling',      label: 'Rolling Average',            color: 'text-blue-400',   bg: 'border-blue-400/20' },
  { id: 'rank',         label: 'Dense Rank',                 color: 'text-pink-400',   bg: 'border-pink-400/20' },
  { id: 'topn',         label: 'Top-N by Group',             color: 'text-orange-400', bg: 'border-orange-400/20' },
  { id: 'datetrend',    label: 'Date Trend',                 color: 'text-teal-400',   bg: 'border-teal-400/20' },
  { id: 'pivot',        label: 'Pivot Query',                color: 'text-indigo-400', bg: 'border-indigo-400/20' },
];

function generateSQL(builderId, p) {
  const t = p.table || 'dataset';
  const m = p.metric || 'revenue';
  const d = p.dimension || 'region';
  const dt = p.dateField || 'order_date';
  const pk = p.partitionKey || d;
  const ord = p.orderField || dt;
  const n = p.topN || '10';
  const w = p.windowSize || '30';
  const pv1 = p.pivotVal1 || 'East';
  const pv2 = p.pivotVal2 || 'West';
  const outName = p.outputName || 'result';

  switch (builderId) {
    case 'cte':
      return `WITH ${outName} AS (
    SELECT
        ${d},
        SUM(${m}) AS total_${m},
        COUNT(*) AS record_count
    FROM ${t}
    WHERE ${dt} IS NOT NULL
    GROUP BY ${d}
)
SELECT *
FROM ${outName}
ORDER BY total_${m} DESC;`;

    case 'window':
      return `SELECT
    ${d},
    ${dt},
    ${m},
    SUM(${m}) OVER (
        PARTITION BY ${pk}
        ORDER BY ${ord}
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS cumulative_${m},
    AVG(${m}) OVER (
        PARTITION BY ${pk}
        ORDER BY ${ord}
        ROWS BETWEEN ${w} PRECEDING AND CURRENT ROW
    ) AS rolling_${w}d_avg_${m}
FROM ${t}
ORDER BY ${d}, ${dt};`;

    case 'duplicate':
      return `WITH ranked AS (
    SELECT *,
           ROW_NUMBER() OVER (
               PARTITION BY ${d}, ${m}
               ORDER BY ${dt}
           ) AS duplicate_rank
    FROM ${t}
)
SELECT *
FROM ranked
WHERE duplicate_rank > 1
ORDER BY ${d};

-- To remove duplicates, use:
-- DELETE FROM ranked WHERE duplicate_rank > 1;`;

    case 'contribution':
      return `SELECT
    ${d},
    SUM(${m}) AS ${m}_total,
    ROUND(
        100.0 * SUM(${m}) / SUM(SUM(${m})) OVER (),
        2
    ) AS contribution_pct,
    RANK() OVER (ORDER BY SUM(${m}) DESC) AS rank_by_${m}
FROM ${t}
GROUP BY ${d}
ORDER BY contribution_pct DESC;`;

    case 'running':
      return `WITH daily AS (
    SELECT
        ${dt},
        ${d},
        SUM(${m}) AS daily_total
    FROM ${t}
    GROUP BY ${dt}, ${d}
)
SELECT
    ${dt},
    ${d},
    daily_total,
    SUM(daily_total) OVER (
        PARTITION BY ${d}
        ORDER BY ${dt}
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total_${m}
FROM daily
ORDER BY ${d}, ${dt};`;

    case 'rolling':
      return `SELECT
    ${dt},
    ${d},
    SUM(${m}) AS daily_${m},
    AVG(SUM(${m})) OVER (
        PARTITION BY ${d}
        ORDER BY ${dt}
        ROWS BETWEEN ${w} PRECEDING AND CURRENT ROW
    ) AS rolling_${w}d_avg
FROM ${t}
GROUP BY ${dt}, ${d}
ORDER BY ${d}, ${dt};`;

    case 'rank':
      return `SELECT
    ${d},
    SUM(${m}) AS total_${m},
    DENSE_RANK() OVER (
        ORDER BY SUM(${m}) DESC
    ) AS dense_rank,
    RANK() OVER (
        ORDER BY SUM(${m}) DESC
    ) AS rank,
    ROW_NUMBER() OVER (
        ORDER BY SUM(${m}) DESC
    ) AS row_num
FROM ${t}
GROUP BY ${d}
ORDER BY dense_rank;`;

    case 'topn':
      return `WITH ranked AS (
    SELECT
        ${pk} AS group_key,
        ${d},
        SUM(${m}) AS total_${m},
        ROW_NUMBER() OVER (
            PARTITION BY ${pk}
            ORDER BY SUM(${m}) DESC
        ) AS rn
    FROM ${t}
    GROUP BY ${pk}, ${d}
)
SELECT *
FROM ranked
WHERE rn <= ${n}
ORDER BY group_key, rn;`;

    case 'datetrend':
      return `SELECT
    DATE_TRUNC('month', ${dt}) AS month,
    COUNT(*) AS record_count,
    SUM(${m}) AS total_${m},
    AVG(${m}) AS avg_${m},
    SUM(${m}) - LAG(SUM(${m})) OVER (ORDER BY DATE_TRUNC('month', ${dt})) AS mom_change,
    ROUND(
        100.0 * (SUM(${m}) - LAG(SUM(${m})) OVER (ORDER BY DATE_TRUNC('month', ${dt})))
        / NULLIF(LAG(SUM(${m})) OVER (ORDER BY DATE_TRUNC('month', ${dt})), 0),
        2
    ) AS mom_growth_pct
FROM ${t}
WHERE ${dt} IS NOT NULL
GROUP BY DATE_TRUNC('month', ${dt})
ORDER BY month;`;

    case 'pivot':
      return `SELECT
    ${d},
    SUM(CASE WHEN ${pk} = '${pv1}' THEN ${m} ELSE 0 END) AS ${pv1}_${m},
    SUM(CASE WHEN ${pk} = '${pv2}' THEN ${m} ELSE 0 END) AS ${pv2}_${m},
    SUM(${m}) AS total_${m},
    ROUND(
        100.0 * SUM(CASE WHEN ${pk} = '${pv1}' THEN ${m} ELSE 0 END) / NULLIF(SUM(${m}),0),
        1
    ) AS ${pv1}_pct
FROM ${t}
GROUP BY ${d}
ORDER BY total_${m} DESC;`;

    default:
      return '-- Select a builder to generate SQL';
  }
}

function getExplanation(builderId) {
  const map = {
    cte: 'Creates a named temporary result set (CTE) for cleaner query structure. Computes dimension totals and returns them ordered by metric descending.',
    window: 'Uses OVER() with PARTITION BY and ORDER BY to compute cumulative sums and rolling averages without collapsing rows — every row keeps its original values.',
    duplicate: 'Uses ROW_NUMBER() with PARTITION BY on business keys to flag duplicate rows. Rows with rank > 1 are duplicates. Safe to review before deleting.',
    contribution: 'Computes each dimension\'s share of the total metric using a window SUM() OVER (). Shows rank and percentage contribution for Pareto/80-20 analysis.',
    running: 'Computes the cumulative total at each date point, partitioned by dimension. Useful for budget-to-date, sales-to-date, and inventory tracking.',
    rolling: 'Computes a moving average over N preceding rows. Smooths time-series volatility and reveals underlying trends without seasonal noise.',
    rank: 'Compares DENSE_RANK (no gaps), RANK (with gaps), and ROW_NUMBER side-by-side. Dense rank is correct for leaderboards; row_number is unique per row.',
    topn: 'Returns the top N rows within each group using ROW_NUMBER() OVER (PARTITION BY group). Essential for "top products per region" or "top customers per segment".',
    datetrend: 'Aggregates metrics by calendar month and computes Month-over-Month change and growth %. Uses LAG() to access the previous month\'s value.',
    pivot: 'Transforms row values into columns using conditional SUM(CASE WHEN). Creates a pivot table without a native PIVOT operator — compatible with all SQL engines.',
  };
  return map[builderId] || '';
}

function BuilderField({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      <label className="text-xs text-white/35 mb-1 block">{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        type={type}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none font-mono" />
    </div>
  );
}

function BuilderPanel({ builder, colNames, onRunSQL }) {
  const [open, setOpen] = useState(false);
  const [params, setParams] = useState({});
  const [copied, setCopied] = useState(false);
  const set = (k, v) => setParams(p => ({ ...p, [k]: v }));

  const sql = generateSQL(builder.id, params);
  const explanation = getExplanation(builder.id);

  const copy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const fieldFor = (key, label, placeholder) => (
    colNames.length > 0 ? (
      <div key={key}>
        <label className="text-xs text-white/35 mb-1 block">{label}</label>
        <select value={params[key] || ''} onChange={e => set(key, e.target.value)}
          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none">
          <option value="">{placeholder}</option>
          {colNames.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
    ) : (
      <BuilderField key={key} label={label} value={params[key] || ''} onChange={v => set(key, v)} placeholder={placeholder} />
    )
  );

  const fields = {
    cte: [fieldFor('table', 'Table Name', 'dataset'), fieldFor('dimension', 'Dimension', 'region'), fieldFor('metric', 'Metric', 'revenue'), fieldFor('dateField', 'Date Field', 'order_date'), <BuilderField key="outputName" label="CTE Name" value={params.outputName || ''} onChange={v => set('outputName', v)} placeholder="base_cte" />],
    window: [fieldFor('table', 'Table', 'dataset'), fieldFor('dimension', 'Dimension', 'region'), fieldFor('metric', 'Metric', 'revenue'), fieldFor('dateField', 'Order By (Date)', 'order_date'), fieldFor('partitionKey', 'Partition By', 'region'), <BuilderField key="windowSize" label="Window Size (rows)" value={params.windowSize || ''} onChange={v => set('windowSize', v)} placeholder="30" type="number" />],
    duplicate: [fieldFor('table', 'Table', 'dataset'), fieldFor('dimension', 'Partition Key 1', 'customer_id'), fieldFor('metric', 'Partition Key 2', 'order_date'), fieldFor('dateField', 'Order By', 'record_id')],
    contribution: [fieldFor('table', 'Table', 'dataset'), fieldFor('dimension', 'Dimension', 'region'), fieldFor('metric', 'Metric', 'revenue')],
    running: [fieldFor('table', 'Table', 'dataset'), fieldFor('dateField', 'Date Field', 'order_date'), fieldFor('dimension', 'Partition By', 'region'), fieldFor('metric', 'Metric', 'revenue')],
    rolling: [fieldFor('table', 'Table', 'dataset'), fieldFor('dateField', 'Date Field', 'order_date'), fieldFor('dimension', 'Partition By', 'region'), fieldFor('metric', 'Metric', 'revenue'), <BuilderField key="windowSize" label="Rolling Window (rows)" value={params.windowSize || ''} onChange={v => set('windowSize', v)} placeholder="30" type="number" />],
    rank: [fieldFor('table', 'Table', 'dataset'), fieldFor('dimension', 'Dimension', 'region'), fieldFor('metric', 'Metric', 'revenue')],
    topn: [fieldFor('table', 'Table', 'dataset'), fieldFor('partitionKey', 'Group By', 'region'), fieldFor('dimension', 'Ranked Column', 'product'), fieldFor('metric', 'Metric', 'revenue'), <BuilderField key="topN" label="Top N" value={params.topN || ''} onChange={v => set('topN', v)} placeholder="10" type="number" />],
    datetrend: [fieldFor('table', 'Table', 'dataset'), fieldFor('dateField', 'Date Field', 'order_date'), fieldFor('metric', 'Metric', 'revenue')],
    pivot: [fieldFor('table', 'Table', 'dataset'), fieldFor('dimension', 'Row Dimension', 'product_category'), fieldFor('partitionKey', 'Pivot Column', 'region'), fieldFor('metric', 'Metric', 'revenue'), <BuilderField key="pivotVal1" label="Value 1" value={params.pivotVal1 || ''} onChange={v => set('pivotVal1', v)} placeholder="East" />, <BuilderField key="pivotVal2" label="Value 2" value={params.pivotVal2 || ''} onChange={v => set('pivotVal2', v)} placeholder="West" />],
  };

  return (
    <div className={`rounded-2xl border ${open ? builder.bg : 'border-white/8'} overflow-hidden transition-all`}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/2 hover:bg-white/4 transition-all text-left">
        <div className="flex items-center gap-2.5">
          <Code2 className={`w-4 h-4 ${open ? builder.color : 'text-white/30'}`} />
          <span className={`text-sm font-semibold ${open ? builder.color : 'text-white/60'}`}>{builder.label}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4">
          {explanation && (
            <p className="text-xs text-white/45 leading-relaxed bg-white/3 rounded-xl px-3 py-2">{explanation}</p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(fields[builder.id] || []).map((f, i) => <div key={i}>{f}</div>)}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/30 font-mono">Generated SQL</span>
              <div className="flex gap-2">
                <button onClick={copy}
                  className="flex items-center gap-1 text-xs text-white/35 hover:text-cyan-400 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
                {onRunSQL && (
                  <button onClick={() => onRunSQL(sql)}
                    className="flex items-center gap-1 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-lg hover:bg-green-400/15 transition-all">
                    <Play className="w-3 h-3" /> Run
                  </button>
                )}
              </div>
            </div>
            <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-green-400/85 font-mono overflow-x-auto whitespace-pre-wrap max-h-64">{sql}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SQLBlueprintBuilders({ colNames = [], onRunSQL }) {
  return (
    <div className="space-y-2">
      <div className="text-xs text-white/30 mb-3 px-1">
        Click any builder to configure and generate validated SQL. Use "Run" to execute directly in the SQL editor.
      </div>
      {BUILDERS.map(b => (
        <BuilderPanel key={b.id} builder={b} colNames={colNames} onRunSQL={onRunSQL} />
      ))}
    </div>
  );
}