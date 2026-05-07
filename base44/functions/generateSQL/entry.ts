import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

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
  variance_last_period: (t, numCol) => ({
    sql: `SELECT MAX(${numCol}) - MIN(${numCol}) AS variance_range,\n       AVG(${numCol}) AS mean,\n       MAX(${numCol}) AS max_val,\n       MIN(${numCol}) AS min_val\nFROM ${t};`,
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
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { question, tableName, columns, templateKey } = await req.json();

  // If a template key is provided, return the template instantly
  if (templateKey && SQL_TEMPLATES[templateKey]) {
    const numCol = columns?.find(c => c.type === 'numeric')?.name || 'value';
    const catCol = columns?.find(c => c.type === 'category')?.name || 'category';
    const dateCol = columns?.find(c => c.type === 'date')?.name || 'date';
    const result = SQL_TEMPLATES[templateKey](tableName || 'data', numCol, catCol, dateCol);
    return Response.json({ ok: true, ...result, can_generate: true });
  }

  if (!question || !columns?.length) return Response.json({ error: 'Missing question or columns' }, { status: 400 });

  const cols = columns.map(c => `${c.name} (${c.type})`).join(', ');
  const numCols = columns.filter(c => c.type === 'numeric').map(c => c.name).join(', ');
  const catCols = columns.filter(c => c.type === 'category').map(c => c.name).join(', ');
  const dateCols = columns.filter(c => c.type === 'date').map(c => c.name).join(', ');

  const prompt = `You are a SQL expert generating DuckDB-compatible SQL.

Table: "${tableName || 'data_table'}"
All columns: ${cols}
Numeric columns: ${numCols || 'none'}
Category columns: ${catCols || 'none'}
Date columns: ${dateCols || 'none'}

User question: "${question}"

Generate SQL that:
- Uses EXACT column names from the list above
- Prefers GROUP BY + SUM/AVG/COUNT for aggregations
- Uses ORDER BY + LIMIT for rankings
- Adds clear column aliases
- Is DuckDB-compatible

If SQL is genuinely impossible (no suitable columns), set can_generate=false.

Return JSON only:
{
  "sql": "SELECT ... FROM ${tableName || 'data_table'} ...",
  "explanation": "plain English: what this query does step by step",
  "businessMeaning": "why this query matters to the business",
  "whyItMatters": "one sentence on business value",
  "can_generate": true,
  "chartType": "bar|line|area|table"
}`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        sql: { type: ['string', 'null'] },
        explanation: { type: 'string' },
        businessMeaning: { type: 'string' },
        whyItMatters: { type: 'string' },
        can_generate: { type: 'boolean' },
        chartType: { type: 'string' },
      },
    },
  });

  return Response.json({ ok: true, ...result });
});