import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Safe SQL Rules ─────────────────────────────────────────────────────────────
// These columns should NEVER be summed regardless of context
const UNSAFE_SUM_PATTERNS = [
  /_id$/, /^id$/, /^id_/, /uuid/, /rank$/, /ranking$/, /score$/, /index$/,
  /percentile$/, /quintile$/, /decile$/, /age$/, /zip$/, /postal$/, /phone/,
  /latitude/, /longitude/, /lat$/, /lng$/, /lon$/, /year_of_birth/, /birth_year/,
  /row_number/, /sequence/, /order_number_only/,
];

const SEMANTIC_TYPE_MAP = {
  currency_measure: ['revenue', 'sales', 'cost', 'price', 'amount', 'value', 'fee', 'charge', 'spend', 'budget', 'expense', 'income', 'profit', 'margin', 'payment', 'compensation', 'bonus', 'commission', 'salary', 'wage', 'payroll'],
  count_measure: ['count', 'num_', 'number_', 'qty', 'quantity', 'headcount', 'total_orders', 'total_users', 'total_sessions', 'frequency', 'visits', 'clicks', 'impressions', 'sessions'],
  rate_measure: ['rate', 'ratio', 'pct', 'percent', 'percentage', 'share', 'proportion', 'conversion', 'retention', 'churn'],
  date_dim: ['date', 'month', 'year', 'quarter', 'week', 'period', 'time', 'created_at', 'updated_at', 'timestamp', 'day'],
  category_dim: ['department', 'category', 'type', 'status', 'region', 'country', 'city', 'state', 'channel', 'product', 'segment', 'group', 'tier', 'plan', 'source', 'campaign', 'role', 'team'],
};

function classifySemanticType(colName) {
  const n = colName.toLowerCase();
  for (const [type, patterns] of Object.entries(SEMANTIC_TYPE_MAP)) {
    if (patterns.some(p => n.includes(p))) return type;
  }
  return 'unknown';
}

function isSafeToSum(colName) {
  const n = colName.toLowerCase();
  return !UNSAFE_SUM_PATTERNS.some(p => p.test(n));
}

const SQL_TEMPLATES = {
  top_by_revenue: (t, numCol, catCol) => ({
    sql: `SELECT ${catCol}, SUM(${numCol}) AS total_${numCol}\nFROM ${t}\nGROUP BY ${catCol}\nORDER BY total_${numCol} DESC\nLIMIT 10;`,
    explanation: `Finds the top 10 ${catCol} values ranked by total ${numCol}.`,
    businessMeaning: 'Identifies your highest-performing segments, customers, or products.',
    whyItMatters: 'Tells you where 80% of your value comes from (Pareto principle).',
  }),
  monthly_trend: (t, dateCol, numCol) => ({
    sql: `SELECT DATE_TRUNC('month', ${dateCol}) AS month,\n       SUM(${numCol}) AS monthly_${numCol}\nFROM ${t}\nGROUP BY 1\nORDER BY 1;`,
    explanation: `Aggregates ${numCol} by calendar month to show trends over time.`,
    businessMeaning: 'Reveals seasonality, growth momentum, and inflection points.',
    whyItMatters: 'Essential for forecasting and comparing period-over-period performance.',
  }),
  avg_by_segment: (t, catCol, numCol) => ({
    sql: `SELECT ${catCol},\n       AVG(${numCol}) AS avg_${numCol},\n       COUNT(*) AS record_count\nFROM ${t}\nGROUP BY ${catCol}\nORDER BY avg_${numCol} DESC;`,
    explanation: `Calculates the average ${numCol} for each ${catCol} group.`,
    businessMeaning: 'Shows which segments are most efficient or highest-value on average.',
    whyItMatters: 'Helps prioritize segments for investment or optimization.',
  }),
  variance_analysis: (t, numCol) => ({
    sql: `SELECT MAX(${numCol}) - MIN(${numCol}) AS variance_range,\n       AVG(${numCol}) AS mean,\n       MAX(${numCol}) AS max_val,\n       MIN(${numCol}) AS min_val,\n       COUNT(*) AS total_records\nFROM ${t};`,
    explanation: `Computes the statistical range and mean of ${numCol}.`,
    businessMeaning: 'Measures how spread out performance is — high variance = inconsistency.',
    whyItMatters: 'Large variance can signal operational inconsistency or data quality issues.',
  }),
  null_audit: (t, colName) => ({
    sql: `SELECT COUNT(*) AS total_rows,\n       COUNT(${colName}) AS non_null,\n       COUNT(*) - COUNT(${colName}) AS null_count,\n       ROUND(100.0 * (COUNT(*) - COUNT(${colName})) / COUNT(*), 2) AS null_pct\nFROM ${t};`,
    explanation: `Audits null/missing values in the ${colName} column.`,
    businessMeaning: 'Missing data reduces analysis accuracy and can bias results.',
    whyItMatters: 'A null rate above 10% should trigger a data quality investigation.',
  }),
  duplicate_check: (t, col) => ({
    sql: `SELECT ${col}, COUNT(*) AS occurrences\nFROM ${t}\nGROUP BY ${col}\nHAVING COUNT(*) > 1\nORDER BY occurrences DESC\nLIMIT 20;`,
    explanation: `Finds duplicate values in ${col}.`,
    businessMeaning: 'Duplicates inflate metrics, distort averages, and corrupt analysis.',
    whyItMatters: 'Must be resolved before using data for reporting or ML.',
  }),
  percentile_distribution: (t, numCol) => ({
    sql: `SELECT PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${numCol}) AS q1,\n       PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY ${numCol}) AS median,\n       PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${numCol}) AS q3,\n       PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${numCol}) AS p95\nFROM ${t};`,
    explanation: `Computes Q1, median, Q3, and 95th percentile of ${numCol}.`,
    businessMeaning: 'Reveals distribution shape — whether data is skewed or has heavy tails.',
    whyItMatters: 'Median vs mean gap indicates skew; P95 reveals outlier extremes.',
  }),
  contribution_by_segment: (t, catCol, numCol) => ({
    sql: `SELECT ${catCol},\n       SUM(${numCol}) AS segment_total,\n       ROUND(100.0 * SUM(${numCol}) / SUM(SUM(${numCol})) OVER (), 2) AS contribution_pct\nFROM ${t}\nGROUP BY ${catCol}\nORDER BY segment_total DESC\nLIMIT 15;`,
    explanation: `Shows each ${catCol}'s share of total ${numCol}.`,
    businessMeaning: 'Identifies which segments drive the most value.',
    whyItMatters: 'Essential for contribution analysis and budget allocation.',
  }),
  period_over_period: (t, dateCol, numCol) => ({
    sql: `WITH periods AS (\n  SELECT DATE_TRUNC('month', ${dateCol}) AS period,\n         SUM(${numCol}) AS total\n  FROM ${t}\n  GROUP BY 1\n)\nSELECT period,\n       total,\n       LAG(total) OVER (ORDER BY period) AS prev_period,\n       ROUND(100.0 * (total - LAG(total) OVER (ORDER BY period)) / NULLIF(LAG(total) OVER (ORDER BY period), 0), 2) AS pct_change\nFROM periods\nORDER BY period;`,
    explanation: `Compares ${numCol} month-over-month with percentage change.`,
    businessMeaning: 'Measures growth velocity and identifies acceleration or deceleration.',
    whyItMatters: 'Period-over-period is the standard BI benchmark for performance trending.',
  }),
  anomaly_z_score: (t, numCol, catCol) => ({
    sql: `WITH stats AS (\n  SELECT AVG(${numCol}) AS mean_val, STDDEV(${numCol}) AS std_val\n  FROM ${t}\n)\nSELECT ${catCol || 'rowid'}, ${numCol},\n       ROUND((${numCol} - s.mean_val) / NULLIF(s.std_val, 0), 2) AS z_score\nFROM ${t}, stats s\nWHERE ABS((${numCol} - s.mean_val) / NULLIF(s.std_val, 0)) > 2\nORDER BY ABS((${numCol} - s.mean_val) / NULLIF(s.std_val, 0)) DESC\nLIMIT 20;`,
    explanation: `Flags rows where ${numCol} is more than 2 standard deviations from the mean.`,
    businessMeaning: 'Detects outliers that may represent errors, fraud, or exceptional events.',
    whyItMatters: 'Z-score anomaly detection is the industry standard for KPI spike/drop analysis.',
  }),
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { question, tableName: rawTableName, columns: rawColumns, templateKey, rows, datasetName } = await req.json();
  const tableName = rawTableName || datasetName || 'data_table';

  // Normalize columns — accept string array or object array
  const columns = (rawColumns || []).map(c =>
    typeof c === 'string' ? { name: c, type: 'unknown' } : (c && c.name ? c : null)
  ).filter(Boolean);

  // ── Template shortcut ──────────────────────────────────────────────────────────
  if (templateKey && SQL_TEMPLATES[templateKey]) {
    const safeNumericCols = (columns || []).filter(c =>
      (c.type === 'numeric' || c.type === 'currency_measure' || c.type === 'count_measure') &&
      isSafeToSum(c.name)
    );
    const numCol = safeNumericCols[0]?.name || columns?.find(c => c.type === 'numeric')?.name || 'value';
    const catCol = columns?.find(c => c.type === 'category')?.name || 'category';
    const dateCol = columns?.find(c => c.type === 'date')?.name || 'date';
    const result = SQL_TEMPLATES[templateKey](tableName || 'data', numCol, catCol, dateCol);
    return Response.json({ ok: true, ...result, can_generate: true, safetyChecked: true });
  }

  if (!question || !columns?.length) return Response.json({ error: 'Missing question or columns' }, { status: 400 });

  // ── Classify all columns semantically ──────────────────────────────────────────
  const classifiedCols = columns.map(c => ({
    ...c,
    semanticType: classifySemanticType(c.name),
    safeToSum: isSafeToSum(c.name),
  }));

  // Build safe aggregation lists
  const safeNumericCols = classifiedCols.filter(c =>
    (c.type === 'numeric' || ['currency_measure','count_measure','rate_measure'].includes(c.semanticType)) &&
    c.safeToSum
  );
  const unsafeCols = classifiedCols.filter(c => !c.safeToSum).map(c => c.name);

  const cols = classifiedCols.map(c => `${c.name} (${c.type}${c.safeToSum === false ? ' — DO NOT SUM' : ''})`).join(', ');
  const numCols = safeNumericCols.map(c => c.name).join(', ');
  const catCols = classifiedCols.filter(c => c.type === 'category' || c.semanticType === 'category_dim').map(c => c.name).join(', ');
  const dateCols = classifiedCols.filter(c => c.type === 'date' || c.semanticType === 'date_dim').map(c => c.name).join(', ');

  const prompt = `You are a SQL expert generating DuckDB-compatible SQL for business analytics.

Table: "${tableName || 'data_table'}"
All columns (with type and safety flag): ${cols}

SAFE NUMERIC COLUMNS (OK to SUM/AVG): ${numCols || 'none'}
Category columns: ${catCols || 'none'}
Date columns: ${dateCols || 'none'}
⛔ UNSAFE COLUMNS — NEVER SUM THESE: ${unsafeCols.join(', ') || 'none'}

User question: "${question}"

STRICT SAFETY RULES — these override everything:
1. NEVER use SUM() or AVG() on ID columns, rank columns, score columns, age, zip, or any column flagged "DO NOT SUM"
2. NEVER use COUNT(DISTINCT id_col) as a revenue/cost metric
3. For revenue questions: ONLY use columns with names containing revenue/sales/cost/amount/value/price/fee/spend/profit/margin
4. For growth questions: ONLY use columns with user/customer/session/conversion/funnel signals
5. For operations: ONLY use cycle_time/duration/throughput/sla columns
6. If the question requires fields that don't exist in the dataset, set can_generate=false and explain what's missing
7. Always add LIMIT clause (max 50 rows for ranked queries)
8. Use exact column names from the list — no invented names

Generate SQL that uses ONLY safe columns. If required columns are missing, say so explicitly.

Return JSON only:
{
  "sql": "SELECT ... FROM ${tableName || 'data_table'} ...",
  "explanation": "step-by-step plain English explanation",
  "businessMeaning": "why this query matters to the business",
  "whyItMatters": "one sentence on business decision value",
  "can_generate": true,
  "chartType": "bar|line|area|table",
  "safetyNote": "any safety constraints applied",
  "missingFields": ["field1", "field2"]
}`;

  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt,
    model: 'claude_sonnet_4_6',
    response_json_schema: {
      type: 'object',
      properties: {
        sql: { type: ['string', 'null'] },
        explanation: { type: 'string' },
        businessMeaning: { type: 'string' },
        whyItMatters: { type: 'string' },
        can_generate: { type: 'boolean' },
        chartType: { type: 'string' },
        safetyNote: { type: 'string' },
        missingFields: { type: 'array', items: { type: 'string' } },
      },
    },
  });

  return Response.json({ ok: true, ...result, safetyChecked: true });
});