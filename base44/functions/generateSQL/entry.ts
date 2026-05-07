import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const SQL_TEMPLATES = {
  top_n_revenue: (cols) => `-- Top 10 customers by revenue
SELECT ${cols.id || cols.category || 'id'},
       SUM(${cols.numeric}) AS total_revenue
FROM ${cols.table}
GROUP BY 1
ORDER BY total_revenue DESC
LIMIT 10;`,

  monthly_trend: (cols) => cols.date ? `-- Monthly revenue trend
SELECT DATE_TRUNC('month', ${cols.date}) AS month,
       SUM(${cols.numeric}) AS monthly_value
FROM ${cols.table}
GROUP BY 1
ORDER BY 1;` : null,

  by_segment: (cols) => cols.category ? `-- KPI by segment
SELECT ${cols.category},
       SUM(${cols.numeric}) AS total_value,
       AVG(${cols.numeric}) AS avg_value,
       COUNT(*) AS record_count
FROM ${cols.table}
GROUP BY ${cols.category}
ORDER BY total_value DESC;` : null,

  avg_by_segment: (cols) => cols.category ? `-- Average value by segment
SELECT ${cols.category},
       AVG(${cols.numeric}) AS avg_value,
       COUNT(*) AS count
FROM ${cols.table}
GROUP BY ${cols.category}
ORDER BY avg_value DESC;` : null,

  null_audit: (cols) => `-- Null-heavy columns audit
SELECT 
  COUNT(*) AS total_rows,
  ${cols.allCols.slice(0, 8).map(c => `SUM(CASE WHEN ${c} IS NULL THEN 1 ELSE 0 END) AS ${c}_nulls`).join(',\n  ')}
FROM ${cols.table};`,

  duplicate_detection: (cols) => `-- Duplicate detection
SELECT ${cols.allCols.slice(0, 4).join(', ')},
       COUNT(*) AS duplicate_count
FROM ${cols.table}
GROUP BY ${cols.allCols.slice(0, 4).join(', ')}
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;`,

  percentile_distribution: (cols) => `-- Distribution percentiles
SELECT 
  MIN(${cols.numeric}) AS min_value,
  MAX(${cols.numeric}) AS max_value,
  AVG(${cols.numeric}) AS mean,
  PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY ${cols.numeric}) AS p25,
  PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY ${cols.numeric}) AS p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${cols.numeric}) AS p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${cols.numeric}) AS p95
FROM ${cols.table};`,

  segment_comparison: (cols) => cols.category && cols.date ? `-- Segment comparison over time
SELECT ${cols.category},
       DATE_TRUNC('month', ${cols.date}) AS month,
       SUM(${cols.numeric}) AS value
FROM ${cols.table}
GROUP BY ${cols.category}, 2
ORDER BY ${cols.category}, month;` : null,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { question, tableName, columns, templateId, sampleData } = await req.json();

    // If template requested, return filled template
    if (templateId) {
      const colMeta = {
        table: tableName,
        numeric: columns.find(c => c.type === 'numeric')?.name || 'value',
        category: columns.find(c => c.type === 'category')?.name || null,
        date: columns.find(c => c.type === 'date')?.name || null,
        id: columns.find(c => c.type === 'id')?.name || null,
        allCols: columns.map(c => c.name),
      };
      const templateFn = SQL_TEMPLATES[templateId];
      const sql = templateFn ? templateFn(colMeta) : null;
      if (sql) return Response.json({ ok: true, sql, explanation: `Template: ${templateId.replace(/_/g, ' ')}`, can_generate: true });
    }

    // NL-to-SQL via LLM
    const colList = columns.map(c => `${c.name} (${c.type})`).join(', ');
    const numCols = columns.filter(c => c.type === 'numeric').map(c => c.name).join(', ');
    const catCols = columns.filter(c => c.type === 'category').map(c => c.name).join(', ');
    const dateCols = columns.filter(c => c.type === 'date').map(c => c.name).join(', ');
    const sampleStr = sampleData ? JSON.stringify(sampleData.slice(0, 3)) : '[]';

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are a DuckDB SQL expert. Generate a SQL query for the user's business question.

TABLE: "${tableName}"
COLUMNS: ${colList}
NUMERIC: ${numCols || 'none'}
CATEGORY: ${catCols || 'none'}
DATE: ${dateCols || 'none'}
SAMPLE DATA: ${sampleStr}

QUESTION: "${question}"

Rules:
- Use exact column names from the list above
- Use GROUP BY + SUM/COUNT/AVG for aggregations
- Use ORDER BY + LIMIT for rankings
- For time series: DATE_TRUNC('month', date_col)
- Return DuckDB-compatible SQL

Return JSON with:
- sql: the SQL query (or null if not possible)
- explanation: plain English description
- business_meaning: why this query matters for the business
- can_generate: boolean
- chart_type: suggested chart type (bar/line/table)`,
      response_json_schema: {
        type: 'object',
        properties: {
          sql: { type: ['string', 'null'] },
          explanation: { type: 'string' },
          business_meaning: { type: 'string' },
          can_generate: { type: 'boolean' },
          chart_type: { type: 'string' },
        },
        required: ['explanation', 'can_generate'],
      },
    });

    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});