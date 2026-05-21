/**
 * validateSQL — Phase 3: SQL Safety + Semantic Risk Detection
 * Rules: never SUM id/rank/age/category, validate against SemanticMetric, block destructive ops
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const UNSAFE_SUM_PATTERNS = [
  /_id$/, /^id$/, /^id_/, /uuid/, /rank$/, /ranking$/, /score$/, /index$/,
  /percentile$/, /quintile$/, /decile$/, /age$/, /zip$/, /postal$/, /phone/,
  /latitude/, /longitude/, /lat$/, /lng$/, /lon$/, /year_of_birth/, /birth_year/,
  /row_number/, /sequence/,
];

const DESTRUCTIVE_KEYWORDS = ['insert ', 'update ', 'delete ', 'drop ', 'alter ', 'create ', 'truncate ', 'grant ', 'revoke '];

const SEMANTIC_TYPE_MAP = {
  id: ['_id', 'uuid', 'user_id', 'order_id', 'customer_id', 'record_id', 'row_id'],
  rank: ['rank', 'ranking', 'percentile', 'quintile', 'decile', 'score', 'index'],
  age: ['age', 'birth_year', 'year_of_birth'],
  geo: ['zip', 'postal', 'latitude', 'longitude', 'lat', 'lng', 'lon'],
  financial: ['revenue', 'cost', 'amount', 'price', 'salary', 'sales', 'profit', 'margin', 'fee', 'spend', 'budget', 'payroll'],
  count: ['count', 'num_', 'qty', 'quantity', 'headcount', 'sessions', 'visits', 'clicks'],
};

function classifySemanticType(colName) {
  if (!colName || typeof colName !== 'string') return 'unknown';
  const n = colName.toLowerCase();
  for (const [type, patterns] of Object.entries(SEMANTIC_TYPE_MAP)) {
    if (patterns.some(p => n.includes(p))) return type;
  }
  return 'unknown';
}

function isSafeToSum(colName) {
  if (!colName || typeof colName !== 'string') return false;
  const n = colName.toLowerCase();
  return !UNSAFE_SUM_PATTERNS.some(p => p.test(n));
}

function detectSQLRisks(sql, columns) {
  const issues = [];
  const lower = sql.toLowerCase();

  // Check for destructive operations
  const destructive = DESTRUCTIVE_KEYWORDS.find(k => lower.includes(k));
  if (destructive) {
    issues.push({ severity: 'critical', type: 'destructive_op', message: `Destructive SQL operation detected: ${destructive.trim()}. Only SELECT is allowed.` });
  }

  // Check for unsafe SUM/AVG on columns
  for (const col of (columns || [])) {
    const name = (col.name || '').toLowerCase();
    const semType = col.semantic_type || classifySemanticType(name);

    if ((lower.includes(`sum(${name})`) || lower.includes(`avg(${name})`)) && !isSafeToSum(name)) {
      issues.push({
        severity: 'high',
        type: 'unsafe_aggregation',
        column: col.name,
        message: `SUM/AVG on column "${col.name}" (semantic type: ${semType}) is unsafe. This field should not be aggregated as a financial metric.`,
      });
    }

    // Detect financial SQL on non-financial columns
    if (lower.includes(`sum(${name})`) && semType === 'id') {
      issues.push({
        severity: 'critical',
        type: 'id_as_metric',
        column: col.name,
        message: `Column "${col.name}" appears to be an ID field — never use as a financial metric.`,
      });
    }
  }

  // No columns selected
  if (lower.includes('select *') && !lower.includes('limit')) {
    issues.push({ severity: 'medium', type: 'no_limit', message: 'SELECT * without LIMIT may return too many rows. Consider adding LIMIT 50.' });
  }

  return {
    safe: !issues.some(i => i.severity === 'critical' || i.severity === 'high'),
    issues,
    riskScore: issues.reduce((s, i) => s + (i.severity === 'critical' ? 40 : i.severity === 'high' ? 25 : 10), 0),
  };
}

function generateInspectQueries(sql, columns) {
  // Databricks Genie-style Inspect mode: generate smaller validation queries
  const inspectQueries = [];
  const lower = sql.toLowerCase();

  // Check for date filters
  const dateCol = columns?.find(c => c.type === 'date' || c.name?.toLowerCase().includes('date'));
  if (dateCol && lower.includes(dateCol.name.toLowerCase())) {
    inspectQueries.push({
      purpose: 'Validate date range',
      sql: `SELECT MIN(${dateCol.name}), MAX(${dateCol.name}), COUNT(*) as total_rows FROM dataset`,
    });
  }

  // Check aggregation columns
  const sumMatch = sql.match(/SUM\((\w+)\)/gi) || [];
  for (const m of sumMatch.slice(0, 3)) {
    const col = m.replace(/SUM\(/i, '').replace(')', '');
    inspectQueries.push({
      purpose: `Validate SUM column "${col}"`,
      sql: `SELECT COUNT(*) as non_null, COUNT(${col}) as count_${col}, MIN(${col}), MAX(${col}), AVG(${col}) FROM dataset`,
    });
  }

  // Check GROUP BY columns
  const groupMatch = sql.match(/GROUP BY\s+([\w,\s]+)/i);
  if (groupMatch) {
    const groupCols = groupMatch[1].split(',').map(c => c.trim()).slice(0, 2);
    for (const col of groupCols) {
      inspectQueries.push({
        purpose: `Validate GROUP BY column "${col}"`,
        sql: `SELECT ${col}, COUNT(*) as count FROM dataset GROUP BY ${col} ORDER BY count DESC LIMIT 10`,
      });
    }
  }

  return inspectQueries;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { sql, columns, tableName } = await req.json();
    if (!sql) return Response.json({ error: 'SQL is required' }, { status: 400 });

    // Normalize columns — accept string array or object array
    const normalizedColumns = (columns || []).map(c =>
      typeof c === 'string' ? { name: c, type: 'unknown' } : (c && c.name ? c : null)
    ).filter(Boolean);

    // Classify all columns semantically
    const enrichedColumns = normalizedColumns.map(col => ({
      ...col,
      semantic_type: col.semantic_type || classifySemanticType(col.name || ''),
      safe_to_sum: isSafeToSum(col.name || ''),
    }));

    // Run risk detection
    const riskResult = detectSQLRisks(sql, enrichedColumns);

    // Generate Inspect-mode validation queries
    const inspectQueries = generateInspectQueries(sql, enrichedColumns);

    // Classify all columns
    const colClassifications = enrichedColumns.map(c => ({
      name: c.name,
      semantic_type: c.semantic_type,
      safe_to_sum: c.safe_to_sum,
    }));

    return Response.json({
      ok: true,
      valid: riskResult.safe,
      risk: riskResult,
      column_classifications: colClassifications,
      inspect_queries: inspectQueries,
      safe_numeric_columns: enrichedColumns.filter(c => c.safe_to_sum && (c.type === 'numeric' || ['financial','count'].includes(c.semantic_type))).map(c => c.name),
      unsafe_columns: enrichedColumns.filter(c => !c.safe_to_sum).map(c => c.name),
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});