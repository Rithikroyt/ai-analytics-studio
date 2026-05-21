import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── Domain keyword maps ───────────────────────────────────────────────────────
const DOMAIN_KEYWORDS = {
  finance: ['revenue', 'cost', 'margin', 'profit', 'budget', 'payroll', 'expense', 'cash', 'ebitda', 'salary', 'wage', 'labor', 'financial', 'roi', 'spend'],
  growth: ['customer', 'acquisition', 'conversion', 'retention', 'churn', 'funnel', 'ltv', 'cac', 'campaign', 'segment', 'cohort', 'rfm', 'activation'],
  operations: ['cycle time', 'throughput', 'sla', 'utilization', 'backlog', 'delay', 'bottleneck', 'capacity', 'defect', 'fulfillment', 'process', 'efficiency'],
  quality: ['missing', 'duplicate', 'null', 'outlier', 'format', 'validation', 'schema', 'invalid'],
  forecast: ['future', 'predict', 'forecast', 'next month', 'trend', 'seasonality', 'projection'],
  strategy: ['recommendation', 'decision', 'action', 'risk', 'invest', 'prioritize', 'opportunity'],
};

// ── Persona configs ───────────────────────────────────────────────────────────
const PERSONAS = {
  'Principal Data Analyst': {
    iqLevel: 5,
    domain: 'technical',
    kpis: ['Data Quality Score', 'Schema Coverage', 'SQL Accuracy', 'Anomaly Rate', 'Forecast MAPE', 'Metric Integrity Score', 'Lineage Completeness'],
    sqlFocus: ['completeness', 'uniqueness', 'validity', 'trend', 'anomaly', 'distribution'],
    systemPrompt: `You are a Principal Data Analyst at a Fortune 500 company with 15+ years of experience. 
You specialize in: data quality validation, schema governance, SQL correctness, metric integrity, anomaly detection, forecast evaluation, ML model selection, dashboard architecture, and analytics reliability.
You NEVER hallucinate numbers. You NEVER sum ID, rank, or age fields. You NEVER return "analysis complete."
You ALWAYS provide: executive summary, data sufficiency explanation, metrics used with formulas, statistical evidence with specific values, root cause analysis, business impact quantification, risk assessment, prioritized recommendations with owners, decision confidence score, known limitations, and 3-5 follow-up questions.
If data is insufficient, you explain exactly what is missing and what partial analysis is still possible.`,
  },
  'Principal Business Analyst': {
    iqLevel: 5,
    domain: 'business',
    kpis: ['ROI', 'Decision Confidence', 'Stakeholder Impact Score', 'Business Risk Score', 'Recommendation Priority Score'],
    sqlFocus: ['segment', 'comparison', 'trend', 'ranking', 'distribution'],
    systemPrompt: `You are a Principal Business Analyst at a Fortune 500 company with 15+ years of experience.
You specialize in: business problem framing, KPI-to-strategy mapping, ROI estimation, stakeholder impact analysis, change management, decision feasibility, executive storytelling, and recommendation prioritization.
You ALWAYS provide: executive summary, data sufficiency explanation, metrics used with definitions, evidence with specific numbers, root cause analysis, business impact with estimated dollar/% values, risk assessment with likelihood and severity, prioritized recommendations with expected ROI and owners, decision confidence score, known limitations, and next questions.
You always frame the business question before answering. You think about the decision, not just the data.`,
  },
  'CFO Analyst': {
    iqLevel: 5,
    domain: 'finance',
    kpis: ['Revenue Growth %', 'Gross Margin %', 'Operating Expense Ratio', 'Cost Variance', 'Budget Variance', 'EBITDA Proxy', 'Payroll-to-Revenue Ratio', 'Contribution Margin'],
    sqlFocus: ['revenue trend', 'cost variance', 'margin', 'profitability', 'segment contribution'],
    systemPrompt: `You are a CFO-level Financial Analyst with deep expertise in P&L analysis, cost management, financial modeling, and strategic finance.
You answer: Is revenue growing profitably? Are costs rising faster than revenue? Which segment creates margin risk? What is the forecasted financial trajectory?
You ALWAYS provide ALL of these sections — never skip any:
1. EXECUTIVE SUMMARY: 2-3 sentences with specific numbers from the data
2. DATA SUFFICIENCY: Score and explanation of what data is available and what is missing
3. METRICS USED: List each metric with formula and source columns
4. EVIDENCE: Minimum 3 specific data points with values (SUM, AVG, trend direction, % change)
5. ROOT CAUSE: Specific causal chain explaining the financial pattern
6. BUSINESS IMPACT: Quantified impact in revenue/margin/cost terms with estimates
7. RISK ASSESSMENT: Financial risk severity, likelihood, and time horizon
8. RECOMMENDATIONS: 3+ prioritized actions with owner, effort, and expected financial impact
9. CONFIDENCE SCORE: 0-100 based on data quality and evidence strength
10. LIMITATIONS: What this analysis cannot tell you and why
11. NEXT QUESTIONS: 3-5 follow-up financial questions to deepen the analysis
You always distinguish revenue growth from profitable growth. You detect cost anomalies. You quantify financial risk.
You NEVER return "analysis complete." You NEVER hallucinate numbers. You use ONLY columns present in the dataset.`,
  },
  'Growth Analyst': {
    iqLevel: 5,
    domain: 'growth',
    kpis: ['Customer Acquisition Cost', 'Customer Lifetime Value', 'LTV/CAC Ratio', 'Conversion Rate', 'Churn Rate', 'Retention Rate', 'Monthly Active Users', 'RFM Score', 'Funnel Conversion'],
    sqlFocus: ['funnel', 'retention', 'cohort', 'rfm', 'segment comparison', 'campaign roi'],
    systemPrompt: `You are a Principal Growth Analyst with deep expertise in acquisition, activation, retention, revenue, and referral analytics (AARRR framework).
You answer: Where is growth coming from? Which funnel stage is leaking? Which customers are highest value? What is the retention risk?
You ALWAYS provide ALL of these sections — never skip any:
1. EXECUTIVE SUMMARY: 2-3 sentences with specific numbers from the data
2. DATA SUFFICIENCY: Score and what customer/growth fields are available vs missing
3. METRICS USED: List each metric (CAC, LTV, churn rate, etc.) with formula and source columns
4. EVIDENCE: Minimum 3 specific data points from RFM/funnel/cohort analysis with actual values
5. ROOT CAUSE: Why growth is accelerating or decelerating based on the data
6. BUSINESS IMPACT: Revenue impact of fixing the top growth issue (estimated %)
7. RISK ASSESSMENT: Churn risk, funnel leakage severity, retention trajectory
8. RECOMMENDATIONS: 3+ prioritized growth levers with owner, effort, and expected % improvement
9. CONFIDENCE SCORE: 0-100 based on data quality and coverage
10. LIMITATIONS: What customer/funnel data is missing that would improve the analysis
11. NEXT QUESTIONS: 3-5 follow-up questions about growth, retention, or LTV
You use RFM segmentation, cohort analysis, LTV/CAC ratios, and funnel conversion analysis. You always identify the highest-ROI growth lever.
You NEVER return "analysis complete." You NEVER hallucinate numbers. You use ONLY columns present in the dataset.`,
  },
  'Operations Analyst': {
    iqLevel: 5,
    domain: 'operations',
    kpis: ['Cycle Time', 'Throughput Rate', 'SLA Compliance %', 'Utilization Rate', 'Defect Rate', 'Backlog Count', 'Capacity Gap', 'Process Efficiency Index'],
    sqlFocus: ['cycle time', 'sla', 'throughput', 'utilization', 'bottleneck', 'delay'],
    systemPrompt: `You are a Principal Operations Analyst with expertise in process optimization, lean operations, SLA management, and operational excellence.
You answer: Where is the bottleneck? Which process is slowing down? What is the SLA risk? Where is capacity misaligned?
You ALWAYS provide ALL of these sections — never skip any:
1. EXECUTIVE SUMMARY: 2-3 sentences with specific operational numbers from the data
2. DATA SUFFICIENCY: Score and what process/operational fields are available vs missing
3. METRICS USED: List each metric (cycle time, SLA compliance, throughput, etc.) with formula and source columns
4. EVIDENCE: Minimum 3 specific data points — cycle times, SLA breaches, utilization rates with actual values
5. ROOT CAUSE: Specific process bottleneck or inefficiency identified from the data
6. BUSINESS IMPACT: Cost of the bottleneck in time, money, or customer impact (estimated)
7. RISK ASSESSMENT: SLA breach risk, capacity risk, operational failure risk
8. RECOMMENDATIONS: 3+ prioritized process improvements with owner, effort, and expected efficiency gain
9. CONFIDENCE SCORE: 0-100 based on data quality and operational coverage
10. LIMITATIONS: What process/time data is missing that would improve the analysis
11. NEXT QUESTIONS: 3-5 follow-up questions about process efficiency or SLA performance
You use cycle time analysis, throughput measurement, SLA tracking, utilization rates, and delay root cause analysis.
You NEVER return "analysis complete." You NEVER hallucinate numbers. You use ONLY columns present in the dataset.`,
  },
};

// ── Payroll / cost field requirements ────────────────────────────────────────
const PAYROLL_REQUIRED_FIELDS = [
  'payroll_cost', 'salary', 'wage', 'labor_cost', 'hours_worked',
  'employee_id', 'department', 'pay_period', 'gross_pay', 'net_pay',
  'compensation', 'payroll', 'headcount',
];

const COST_REQUIRED_FIELDS = [
  'cost', 'expense', 'spend', 'cogs', 'opex', 'capex', 'budget',
  'overhead', 'direct_cost', 'indirect_cost',
];

// Fields that MUST NEVER be used as revenue/cost/payroll metrics
const FORBIDDEN_AS_METRICS = [
  /_id$/, /^id$/, /^id_/, /uuid/, /rank$/, /ranking$/, /income_rank/,
  /age$/, /zip$/, /postal$/, /row_number/, /sequence$/, /record_id/,
  /^index$/, /percentile$/, /quintile$/, /decile$/, /year_of_birth/,
  /birth_year/, /phone/, /latitude/, /longitude/, /lat$/, /lng$/, /lon$/,
];

function checkPayrollAvailability(columns) {
  const colNames = columns.map(c => (c.name || '').toLowerCase());
  const available = PAYROLL_REQUIRED_FIELDS.filter(f =>
    colNames.some(c => c.includes(f) || f.includes(c))
  );
  const missing = PAYROLL_REQUIRED_FIELDS.filter(f =>
    !colNames.some(c => c.includes(f) || f.includes(c))
  );
  return { available, missing, hasPayrollData: available.length >= 2 };
}

function checkCostAvailability(columns) {
  const colNames = columns.map(c => (c.name || '').toLowerCase());
  const available = COST_REQUIRED_FIELDS.filter(f =>
    colNames.some(c => c.includes(f) || f.includes(c))
  );
  return { available, hasCostData: available.length >= 1 };
}

// ── SQL safety rules ──────────────────────────────────────────────────────────
const UNSAFE_SUM_PATTERNS = [
  /_id$/, /^id$/, /^id_/, /uuid/, /rank$/, /ranking$/, /score$/, /index$/,
  /percentile$/, /quintile$/, /decile$/, /age$/, /zip$/, /postal$/, /phone/,
  /latitude/, /longitude/, /lat$/, /lng$/, /lon$/, /year_of_birth/, /birth_year/,
  /row_number/, /sequence/, /income_rank/, /record_id/,
];

function isSafeToSum(colName) {
  const n = (colName || '').toLowerCase();
  return !UNSAFE_SUM_PATTERNS.some(p => p.test(n));
}

// ── Scoring algorithms ────────────────────────────────────────────────────────
function classifyIntent(question) {
  const q = question.toLowerCase();
  const scores = {};
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    scores[domain] = keywords.filter(k => q.includes(k)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return top[0][1] > 0 ? top[0][0] : 'general';
}

function computeDataSufficiency(availableColumns, requiredFields, qualityScore, rowCount, hasDateColumn, metricCoverage) {
  const available = availableColumns.map(c => c.name?.toLowerCase() || '');
  const required = requiredFields.map(f => f.toLowerCase());
  const missingRequired = required.filter(f => !available.some(a => a.includes(f) || f.includes(a)));
  const requiredScore = required.length === 0 ? 1 :
    (required.length - missingRequired.length) / required.length;

  const sampleScore = rowCount >= 10000 ? 1.0 : rowCount >= 1000 ? 0.85 : rowCount >= 100 ? 0.65 : 0.35;
  const timeCoverage = hasDateColumn ? 0.85 : 0.40;
  const lineageScore = 0.70;

  const score = Math.round((
    0.25 * requiredScore +
    0.20 * (qualityScore || 0.75) +
    0.15 * sampleScore +
    0.15 * timeCoverage +
    0.15 * (metricCoverage || 0.70) +
    0.10 * lineageScore
  ) * 100);

  return {
    score,
    status: score >= 85 ? 'strong' : score >= 65 ? 'partial' : score >= 40 ? 'limited' : 'insufficient',
    label: score >= 85 ? 'Strong — full analysis supported' : score >= 65 ? 'Partial — analysis with caveats' : score >= 40 ? 'Limited — partial analysis only' : 'Insufficient — cannot reliably answer',
    missingRequiredFields: missingRequired,
  };
}

function computeRecommendationPriority(impact, confidence, urgency, effort) {
  return Math.round(((impact * confidence * urgency) / Math.max(effort, 0.1)) * 100) / 100;
}

function computeDecisionConfidence(dataQuality, evidenceStrength, modelAccuracy, businessFit, analystReview) {
  return Math.round((
    0.30 * dataQuality +
    0.25 * evidenceStrength +
    0.20 * modelAccuracy +
    0.15 * businessFit +
    0.10 * analystReview
  ) * 100);
}

function detectSQLRisk(sql, columns) {
  const issues = [];
  const lower = (sql || '').toLowerCase();
  for (const col of columns) {
    const name = (col.name || '').toLowerCase();
    const type = (col.semantic_type || col.type || '').toLowerCase();
    if ((lower.includes(`sum(${name})`) || lower.includes(`avg(${name})`)) && !isSafeToSum(name)) {
      issues.push({ column: name, issue: `SUM/AVG on unsafe field type: ${type || name}. Never aggregate ID, rank, age, or categorical fields as metrics.` });
    }
  }
  return { safe: issues.length === 0, issues };
}

function semanticColumnClassify(columns, rows) {
  return columns.map(col => {
    const values = (rows || []).slice(0, 100).map(r => r[col.name]).filter(v => v != null);
    const numericCount = values.filter(v => !isNaN(parseFloat(v))).length;
    const numericRatio = values.length ? numericCount / values.length : 0;
    const name = (col.name || '').toLowerCase();

    let semanticType = 'categorical';
    if (numericRatio > 0.85) {
      if (name.match(/_id$|^id$|^id_|uuid|rank$|ranking$|score$|index$|percentile$|quintile$|decile$/)) {
        semanticType = 'id';
      } else if (name.match(/age$|birth_year|year_of_birth/)) {
        semanticType = 'age';
      } else if (name.match(/zip$|postal$|latitude|longitude|lat$|lng$|lon$/)) {
        semanticType = 'geo';
      } else if (name.match(/revenue|cost|amount|price|salary|sales|profit|margin|spend|budget|fee|payment|wage|bonus|commission/)) {
        semanticType = 'financial_measure';
      } else if (name.match(/count|qty|quantity|volume|headcount|sessions|visits|clicks|impressions/)) {
        semanticType = 'count_measure';
      } else {
        semanticType = 'numeric_measure';
      }
    } else if (name.match(/date|time|month|year|quarter|week|period|created_at|updated_at/)) {
      semanticType = 'date';
    }
    return { ...col, semantic_type: semanticType, safe_to_sum: isSafeToSum(name) };
  });
}

function generateDomainSQL(intent, columns, tableName = 'dataset') {
  const financialCols = columns.filter(c => c.semantic_type === 'financial_measure' && c.safe_to_sum).map(c => c.name);
  const countCols = columns.filter(c => c.semantic_type === 'count_measure' && c.safe_to_sum).map(c => c.name);
  const numericCols = columns.filter(c => c.semantic_type === 'numeric_measure' && c.safe_to_sum).map(c => c.name);
  const dateCols = columns.filter(c => c.semantic_type === 'date').map(c => c.name);
  const catCols = columns.filter(c => c.semantic_type === 'categorical').map(c => c.name);
  const unsafeCols = columns.filter(c => !c.safe_to_sum).map(c => c.name);

  const mainMetric = financialCols[0] || countCols[0] || numericCols[0];
  const mainDim = catCols[0];
  const mainDate = dateCols[0];
  const queries = [];

  const safetyComment = unsafeCols.length > 0 ? `-- UNSAFE COLUMNS (never SUM): ${unsafeCols.slice(0, 5).join(', ')}\n` : '';

  if (mainMetric && mainDate) {
    queries.push({
      title: 'Trend Over Time',
      sql: `${safetyComment}SELECT ${mainDate}, SUM(${mainMetric}) AS total_${mainMetric}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${mainDate}\nORDER BY ${mainDate}`,
    });
  }
  if (mainMetric && mainDim) {
    queries.push({
      title: `${mainMetric} by ${mainDim}`,
      sql: `${safetyComment}SELECT ${mainDim}, SUM(${mainMetric}) AS total_${mainMetric}, COUNT(*) AS record_count,\n       ROUND(100.0 * SUM(${mainMetric}) / SUM(SUM(${mainMetric})) OVER (), 2) AS pct_of_total\nFROM ${tableName}\nGROUP BY ${mainDim}\nORDER BY total_${mainMetric} DESC\nLIMIT 10`,
    });
  }
  if (mainMetric) {
    queries.push({
      title: 'Summary Statistics',
      sql: `${safetyComment}SELECT COUNT(*) AS total_records, SUM(${mainMetric}) AS total, AVG(${mainMetric}) AS average,\n       MIN(${mainMetric}) AS minimum, MAX(${mainMetric}) AS maximum,\n       STDDEV(${mainMetric}) AS std_dev\nFROM ${tableName}`,
    });
  }
  if (queries.length === 0) {
    queries.push({ title: 'Dataset Overview', sql: `SELECT * FROM ${tableName} LIMIT 20` });
  }
  return queries;
}

function computeStatsSummary(rows, columns) {
  const numericCols = columns.filter(c => ['financial_measure', 'count_measure', 'numeric_measure'].includes(c.semantic_type) && c.safe_to_sum);
  const stats = {};

  for (const col of numericCols.slice(0, 5)) {
    const vals = rows.map(r => parseFloat(r[col.name])).filter(v => !isNaN(v));
    if (vals.length === 0) continue;
    vals.sort((a, b) => a - b);
    const sum = vals.reduce((s, v) => s + v, 0);
    const mean = sum / vals.length;
    const variance = vals.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / vals.length;
    const q1 = vals[Math.floor(vals.length * 0.25)];
    const q3 = vals[Math.floor(vals.length * 0.75)];
    const iqr = q3 - q1;
    const anomalies = vals.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);

    stats[col.name] = {
      sum: Math.round(sum * 100) / 100,
      mean: Math.round(mean * 100) / 100,
      min: vals[0],
      max: vals[vals.length - 1],
      stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      anomalyCount: anomalies.length,
      anomalyRate: Math.round((anomalies.length / vals.length) * 100) + '%',
      q1: Math.round(q1 * 100) / 100,
      q3: Math.round(q3 * 100) / 100,
    };
  }
  return stats;
}

function buildMissingFieldsExplanation(intent, enrichedColumns, dataSufficiency) {
  const colNames = enrichedColumns.map(c => c.name.toLowerCase());
  const domainRequiredFields = {
    finance: { revenue: ['revenue', 'sales', 'income'], cost: ['cost', 'expense', 'spend'], date: ['date', 'month', 'period'] },
    growth: { customer_id: ['customer_id', 'user_id', 'client_id'], date: ['date', 'month'], revenue: ['revenue', 'sales'] },
    operations: { start_time: ['start_time', 'created_at', 'opened_at'], end_time: ['end_time', 'closed_at', 'resolved_at'], status: ['status', 'state'] },
    forecast: { date: ['date', 'month', 'period'], metric: ['revenue', 'sales', 'value'] },
    general: {},
  };

  const required = domainRequiredFields[intent] || {};
  const missing = [];
  const present = [];
  for (const [fieldName, variants] of Object.entries(required)) {
    const found = variants.some(v => colNames.some(c => c.includes(v)));
    if (found) present.push(fieldName);
    else missing.push(fieldName);
  }

  const partialAnalysis = present.length > 0 ?
    `Partial analysis IS possible using: ${present.join(', ')}.` : 'No required fields present for this analysis type.';
  const missingExplanation = missing.length > 0 ?
    `Missing required fields for full ${intent} analysis: ${missing.join(', ')}. ${partialAnalysis}` :
    `All required fields for ${intent} analysis are present.`;

  return { missing, present, explanation: missingExplanation };
}

// ── Main handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json().catch(() => ({}));
    const { question, persona: personaName = 'CFO Analyst', tableData, sessionId } = payload;

    if (!question) return Response.json({ error: 'Question is required' }, { status: 400 });

    const persona = PERSONAS[personaName] || PERSONAS['CFO Analyst'];
    const startTime = Date.now();

    // ── Step 1: Intent + domain classification ────────────────────────────────
    const intent = classifyIntent(question);

    // ── Step 2: Column classification with safety checks ──────────────────────
    const rawColumns = (tableData?.columns || []).map(c =>
      typeof c === 'string' ? { name: c, type: 'unknown' } : (c && c.name ? c : null)
    ).filter(Boolean);
    const rows = tableData?.rows || [];
    const enrichedColumns = semanticColumnClassify(rawColumns, rows);
    const hasDateColumn = enrichedColumns.some(c => c.semantic_type === 'date');
    const colNames = enrichedColumns.map(c => c.name);
    const unsafeColumns = enrichedColumns.filter(c => !c.safe_to_sum).map(c => c.name);
    const safeFinancialCols = enrichedColumns.filter(c => c.semantic_type === 'financial_measure' && c.safe_to_sum).map(c => c.name);

    // ── Step 3: Data sufficiency check ────────────────────────────────────────
    const domainRequiredFields = {
      finance: ['revenue', 'cost', 'date'],
      growth: ['customer_id', 'date', 'revenue'],
      operations: ['start_time', 'end_time', 'status'],
      forecast: ['date', 'revenue'],
      general: [],
    };
    const requiredFields = domainRequiredFields[intent] || [];
    const dataSufficiency = computeDataSufficiency(
      enrichedColumns, requiredFields, 0.78,
      rows.length, hasDateColumn, 0.72
    );

    // ── Step 4: Missing fields analysis ───────────────────────────────────────
    const missingFieldsAnalysis = buildMissingFieldsExplanation(intent, enrichedColumns, dataSufficiency);

    // ── Step 5: Check verified answers ───────────────────────────────────────
    let verifiedAnswerUsed = null;
    try {
      const verified = await base44.asServiceRole.entities.VerifiedAnswer.list('-created_date', 50);
      const match = verified.find(v =>
        v.status === 'certified' &&
        question.toLowerCase().includes((v.question || '').toLowerCase().substring(0, 20))
      );
      if (match) verifiedAnswerUsed = match;
    } catch (_) {}

    // ── Step 6: Check governed metrics ───────────────────────────────────────
    let governedMetrics = [];
    try {
      governedMetrics = await base44.asServiceRole.entities.GovernedMetric.filter({ certified: true });
    } catch (_) {}

    const relevantMetrics = governedMetrics.filter(m => {
      const cols = (m.sourceColumns || []).map(c => c.toLowerCase());
      return cols.some(c => colNames.some(cn => cn.toLowerCase().includes(c)));
    });

    // ── Step 6b: CFO payroll / cost field safety check ───────────────────────
    const isPayrollQuestion = /payroll|salary|wage|labor cost|headcount|compensation|pay|employee cost/i.test(question);
    const isCostQuestion = /cost|expense|spend|budget|overhead|opex|capex/i.test(question);
    const payrollCheck = checkPayrollAvailability(enrichedColumns);
    const costCheck = checkCostAvailability(enrichedColumns);

    // Build forbidden-as-metric column list (IDs, ranks, age, zip etc.)
    const forbiddenMetricColumns = enrichedColumns
      .filter(c => FORBIDDEN_AS_METRICS.some(p => p.test((c.name || '').toLowerCase())))
      .map(c => c.name);

    // If CFO asks about payroll but no payroll fields exist — create a clear notice
    let payrollWarning = null;
    if (personaName === 'CFO Analyst' && isPayrollQuestion && !payrollCheck.hasPayrollData) {
      payrollWarning = `⚠️ PAYROLL ANALYSIS NOT POSSIBLE: The dataset "${tableData?.name || 'uploaded dataset'}" does not contain payroll/labor fields. ` +
        `Required fields for payroll analysis: ${PAYROLL_REQUIRED_FIELDS.slice(0, 8).join(', ')}. ` +
        `Available in dataset: none detected. ` +
        `Do NOT synthesize payroll numbers from non-payroll columns such as: ${forbiddenMetricColumns.slice(0, 5).join(', ') || 'ID fields, rank fields, age fields'}. ` +
        `Instead, explain what is missing and what partial financial analysis IS possible with the available data.`;
    }

    // ── Step 7: SQL generation with safety ────────────────────────────────────
    const domainQueries = generateDomainSQL(intent, enrichedColumns, tableData?.name || 'dataset');
    const primarySQL = domainQueries[0]?.sql || '';
    const sqlRisk = detectSQLRisk(primarySQL, enrichedColumns);

    // ── Step 8: Statistical evidence ─────────────────────────────────────────
    const statsEvidence = computeStatsSummary(rows, enrichedColumns);

    // ── Step 9: Handle insufficient data with partial analysis ────────────────
    if (dataSufficiency.status === 'insufficient' && !tableData) {
      const result = {
        executive_summary: `Insufficient data to answer: "${question}". No dataset is loaded. To perform ${personaName} analysis, please upload a dataset containing relevant fields.`,
        business_question: question,
        decision_context: 'No active dataset detected in the workspace.',
        data_sufficiency: { ...dataSufficiency, explanation: 'No dataset provided. Upload data to enable analysis.' },
        metrics_used: [],
        evidence: [],
        root_cause: 'No dataset available for analysis.',
        business_impact: 'Cannot assess without data.',
        risk_assessment: 'High risk of incorrect conclusions without data.',
        recommendations: [{ action: 'Upload a dataset to the workspace first.', priority: 'High', expected_impact: 'Enables full analysis', effort: 'Low', owner: 'User', next_metric_to_monitor: 'Data Quality Score' }],
        confidence_score: 0,
        limitations: ['No dataset provided', 'Upload CSV or connect a data source'],
        next_questions: ['What dataset do you want to analyze?', `What ${intent} metrics are most important to you?`],
        tools_used: ['DataSufficiencyChecker'],
        sql_generated: '',
        persona: personaName,
        iq_level: persona.iqLevel,
        intent_classified: intent,
        duration_ms: Date.now() - startTime,
        missing_fields: missingFieldsAnalysis.missing,
      };
      return Response.json(result);
    }

    // ── Step 10: Build rich LLM prompt ────────────────────────────────────────
    const colSummary = enrichedColumns.slice(0, 30).map(c =>
      `${c.name} (${c.semantic_type || c.type || 'unknown'}${!c.safe_to_sum ? ' — ⛔ DO NOT SUM' : ''})`
    ).join(', ');

    const statsSummaryText = Object.entries(statsEvidence).map(([col, s]) =>
      `${col}: sum=${s.sum}, mean=${s.mean}, min=${s.min}, max=${s.max}, stdDev=${s.stdDev}, q1=${s.q1}, q3=${s.q3}, anomalies=${s.anomalyCount}`
    ).join('\n');

    const metricsContext = relevantMetrics.length > 0
      ? relevantMetrics.map(m => `• ${m.metricName}: ${m.formula} (${m.businessDefinition})`).join('\n')
      : persona.kpis.map(k => `• ${k}`).join('\n');

    const verifiedContext = verifiedAnswerUsed
      ? `\nVERIFIED ANSWER AVAILABLE:\nQuestion: ${verifiedAnswerUsed.question}\nSQL: ${verifiedAnswerUsed.verifiedSql}\nAnswer: ${verifiedAnswerUsed.expectedAnswer}\n`
      : '';

    const sqlContext = sqlRisk.issues.length > 0
      ? `\n⚠️ SQL SAFETY ISSUES: ${sqlRisk.issues.map(i => i.issue).join('; ')}`
      : '';

    const missingFieldsContext = missingFieldsAnalysis.missing.length > 0
      ? `\n⚠️ MISSING REQUIRED FIELDS: ${missingFieldsAnalysis.explanation}`
      : '';

    const payrollContext = payrollWarning
      ? `\n\n${payrollWarning}`
      : (personaName === 'CFO Analyst' && isPayrollQuestion && payrollCheck.hasPayrollData)
        ? `\nPayroll fields available: ${payrollCheck.available.join(', ')}. Use ONLY these for payroll analysis.`
        : '';

    const forbiddenMetricContext = forbiddenMetricColumns.length > 0
      ? `\n🚫 FORBIDDEN AS METRICS (never use as revenue/cost/payroll): ${forbiddenMetricColumns.join(', ')}`
      : '';

    const prompt = `${persona.systemPrompt}

You are answering as a ${personaName} using the F-D-E-A-R framework:
F = Frame the business question
D = Diagnose data and root cause  
E = Evaluate business impact and risk
A = Act with prioritized recommendations
R = Review success metrics and next questions

CRITICAL INSTRUCTIONS:
- You MUST populate ALL 11 required fields. Do NOT return empty arrays for evidence, metrics_used, recommendations, or next_questions.
- NEVER say "analysis complete" as your executive_summary. Write 2-3 specific sentences with actual numbers.
- NEVER sum or aggregate: ${unsafeColumns.join(', ') || 'none flagged'}
- ONLY use safe financial columns for revenue/cost metrics: ${safeFinancialCols.join(', ') || 'none available'}
- If required fields are missing, explain in data_sufficiency what is missing AND what partial analysis you can still do
- Reference actual column names and statistical values in your evidence
${payrollContext}
${forbiddenMetricContext}

DATASET: "${tableData?.name || 'Uploaded Dataset'}" 
Rows: ${rows.length} | Columns: ${enrichedColumns.length}
Columns with semantic types: ${colSummary}
Intent classified: ${intent}
Data Sufficiency: ${dataSufficiency.score}% (${dataSufficiency.status}) — ${dataSufficiency.label}
${missingFieldsContext}
${sqlContext}
${verifiedContext}

STATISTICAL EVIDENCE FROM DATA:
${statsSummaryText || 'No safe numeric columns detected for aggregation.'}

SQL EVIDENCE (verified safe):
${domainQueries.map(q => `[${q.title}]\n${q.sql}`).join('\n\n')}

CERTIFIED METRICS AVAILABLE:
${metricsContext}

USER QUESTION: "${question}"

AGENT: ${personaName} | IQ LEVEL: ${persona.iqLevel} — Principal Analyst

Now produce a complete, structured answer with ALL required fields populated. Use the actual statistical evidence above. Cite specific values (e.g., "Revenue SUM = ${Object.values(statsEvidence)[0]?.sum || 'N/A'}"). Include partial analysis even if data is limited.`;

    // ── Step 11: LLM call ─────────────────────────────────────────────────────
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          business_question: { type: 'string' },
          decision_context: { type: 'string' },
          data_sufficiency_explanation: { type: 'string' },
          fdear: {
            type: 'object',
            properties: {
              frame: { type: 'string' },
              diagnose: { type: 'string' },
              evaluate: { type: 'string' },
              act: { type: 'string' },
              review: { type: 'string' },
            }
          },
          metrics_used: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                metric: { type: 'string' },
                definition: { type: 'string' },
                formula: { type: 'string' },
                source_columns: { type: 'array', items: { type: 'string' } },
                value_observed: { type: 'string' },
              }
            }
          },
          evidence: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                finding: { type: 'string' },
                sql_or_method: { type: 'string' },
                value: { type: 'string' },
                significance: { type: 'string' },
              }
            }
          },
          root_cause: { type: 'string' },
          business_impact: { type: 'string' },
          risk_assessment: { type: 'string' },
          recommendations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                priority: { type: 'string' },
                expected_impact: { type: 'string' },
                effort: { type: 'string' },
                owner: { type: 'string' },
                next_metric_to_monitor: { type: 'string' },
                rationale: { type: 'string' },
              }
            }
          },
          confidence_score: { type: 'number' },
          limitations: { type: 'array', items: { type: 'string' } },
          next_questions: { type: 'array', items: { type: 'string' } },
          missing_fields: { type: 'array', items: { type: 'string' } },
          sql_safety_notes: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // ── Step 12: Post-process and enforce minimum quality ─────────────────────
    // Guarantee all required sections are populated
    const ensuredResponse = {
      ...llmResponse,
      executive_summary: llmResponse.executive_summary && llmResponse.executive_summary.length > 30 && !llmResponse.executive_summary.toLowerCase().includes('analysis complete')
        ? llmResponse.executive_summary
        : `${personaName} analysis of "${tableData?.name || 'dataset'}" (${rows.length} records, ${enrichedColumns.length} columns): Data sufficiency is ${dataSufficiency.status} at ${dataSufficiency.score}%. ${statsSummaryText ? 'Statistical evidence available — see Evidence section.' : 'No numeric columns detected for aggregation.'}`,
      metrics_used: llmResponse.metrics_used?.length > 0 ? llmResponse.metrics_used :
        persona.kpis.slice(0, 3).map(k => ({ metric: k, definition: `${k} as defined by ${personaName}`, formula: 'Derived from available data', source_columns: safeFinancialCols.slice(0, 2), value_observed: 'See statistical evidence' })),
      evidence: llmResponse.evidence?.length > 0 ? llmResponse.evidence :
        Object.entries(statsEvidence).slice(0, 3).map(([col, s]) => ({
          finding: `${col} statistical profile`,
          sql_or_method: `SELECT SUM(${col}), AVG(${col}), MIN(${col}), MAX(${col}) FROM ${tableData?.name || 'dataset'}`,
          value: `SUM=${s.sum}, AVG=${s.mean}, MIN=${s.min}, MAX=${s.max}`,
          significance: `${s.anomalyCount} anomalies detected (${s.anomalyRate})`,
        })),
      recommendations: llmResponse.recommendations?.length > 0 ? llmResponse.recommendations :
        [{ action: `Review ${missingFieldsAnalysis.missing.length > 0 ? 'missing fields: ' + missingFieldsAnalysis.missing.join(', ') : 'data quality and completeness'}`, priority: 'High', expected_impact: 'Enables deeper analysis', effort: 'Medium', owner: 'Data Team', next_metric_to_monitor: persona.kpis[0], rationale: dataSufficiency.label }],
      limitations: llmResponse.limitations?.length > 0 ? llmResponse.limitations :
        [dataSufficiency.label, ...missingFieldsAnalysis.missing.map(f => `Missing field: ${f}`), ...unsafeColumns.slice(0, 3).map(c => `Column "${c}" is not safe to aggregate as a metric`)],
      next_questions: llmResponse.next_questions?.length > 0 ? llmResponse.next_questions :
        [`What time period should this ${intent} analysis cover?`, `Which ${persona.kpis[0]} threshold triggers an alert?`, `How does this compare to the previous period?`],
      missing_fields: llmResponse.missing_fields?.length > 0 ? llmResponse.missing_fields : missingFieldsAnalysis.missing,
    };

    // ── Step 13: Enrich recommendations with priority scores ──────────────────
    const enrichedRecs = (ensuredResponse.recommendations || []).map(r => ({
      ...r,
      priority_score: computeRecommendationPriority(
        r.expected_impact?.toLowerCase().includes('high') ? 0.85 : r.expected_impact?.toLowerCase().includes('medium') ? 0.60 : 0.35,
        (ensuredResponse.confidence_score || 70) / 100,
        r.priority === 'High' ? 0.9 : r.priority === 'Medium' ? 0.65 : 0.35,
        r.effort === 'Low' ? 0.2 : r.effort === 'Medium' ? 0.5 : 0.8,
      ),
    })).sort((a, b) => b.priority_score - a.priority_score);

    const decisionConfidence = computeDecisionConfidence(
      dataSufficiency.score / 100,
      Math.min(ensuredResponse.evidence?.length || 0, 5) / 5,
      0.75,
      intent !== 'general' ? 0.85 : 0.60,
      0.80
    );

    const duration = Date.now() - startTime;
    const tools = ['IntentClassifier', 'DataSufficiencyChecker', 'SemanticColumnClassifier', 'SQLSafetyValidator', 'SemanticMetricLookup', 'SQLGenerator', 'StatisticsEngine', 'PrincipalAnalystReasoner', 'QualityEnforcer'];
    if (sqlRisk.issues.length > 0) tools.push('SQLRiskDetector');
    if (verifiedAnswerUsed) tools.push('VerifiedAnswerLibrary');
    if (missingFieldsAnalysis.missing.length > 0) tools.push('MissingFieldsAnalyzer');
    if (payrollWarning) tools.push('PayrollSafetyGuard');
    if (forbiddenMetricColumns.length > 0) tools.push('ForbiddenMetricBlocker');

    const finalResult = {
      ...ensuredResponse,
      recommendations: enrichedRecs,
      data_sufficiency: {
        ...dataSufficiency,
        explanation: ensuredResponse.data_sufficiency_explanation || dataSufficiency.label,
        missing_required: missingFieldsAnalysis.missing,
        partial_analysis_possible: missingFieldsAnalysis.explanation,
      },
      confidence_score: decisionConfidence,
      decision_confidence: decisionConfidence,
      tools_used: tools,
      sql_generated: primarySQL,
      sql_queries: domainQueries,
      sql_risk: sqlRisk,
      unsafe_columns: unsafeColumns,
      safe_financial_columns: safeFinancialCols,
      stats_evidence: statsEvidence,
      persona: personaName,
      iq_level: persona.iqLevel,
      intent_classified: intent,
      duration_ms: duration,
      verified_answer_used: verifiedAnswerUsed ? verifiedAnswerUsed.question : null,
      governed_metrics_used: relevantMetrics.map(m => m.metricName),
    };

    // ── Step 14: Quality score calculation ────────────────────────────────────
    const qualityScore = Math.min(
      (finalResult.evidence?.length >= 3 ? 25 : (finalResult.evidence?.length || 0) * 8) +
      (finalResult.recommendations?.length >= 3 ? 25 : (finalResult.recommendations?.length || 0) * 8) +
      (finalResult.executive_summary?.length > 100 ? 20 : 10) +
      (finalResult.metrics_used?.length > 0 ? 15 : 0) +
      (finalResult.next_questions?.length >= 3 ? 10 : 5) +
      (finalResult.limitations?.length > 0 ? 5 : 0),
      100
    );

    // ── Step 15: Log trace ────────────────────────────────────────────────────
    try {
      await base44.asServiceRole.entities.AgentTrace.create({
        sessionId: sessionId || `session_${Date.now()}`,
        agentName: personaName,
        userEmail: user.email,
        datasetName: tableData?.name || '',
        userQuestion: question,
        intent: intent,
        domain: intent,
        toolsCalled: tools,
        sqlGenerated: primarySQL,
        sqlSuccess: sqlRisk.safe,
        dataSufficiencyScore: dataSufficiency.score,
        dataSufficiencyStatus: dataSufficiency.status,
        missingFields: finalResult.missing_fields || [],
        confidenceScore: decisionConfidence,
        answerQualityScore: qualityScore,
        fallbackReason: dataSufficiency.status === 'insufficient' ? 'Insufficient data' : sqlRisk.safe ? '' : 'SQL safety risk detected',
        finalAnswer: {
          executive_summary: finalResult.executive_summary,
          evidence_count: finalResult.evidence?.length || 0,
          recs_count: enrichedRecs.length,
          metrics_count: finalResult.metrics_used?.length || 0,
          has_root_cause: !!finalResult.root_cause,
          has_business_impact: !!finalResult.business_impact,
          has_risk_assessment: !!finalResult.risk_assessment,
          has_limitations: (finalResult.limitations?.length || 0) > 0,
          has_next_questions: (finalResult.next_questions?.length || 0) > 0,
        },
        qualityBreakdown: {
          evidence_count: finalResult.evidence?.length || 0,
          recs_count: enrichedRecs.length,
          metrics_count: finalResult.metrics_used?.length || 0,
          data_sufficiency: dataSufficiency.status,
          sql_risk: sqlRisk.issues,
          unsafe_columns: unsafeColumns,
          missing_fields: missingFieldsAnalysis.missing,
          quality_score: qualityScore,
        },
        feedbackRating: '',
        durationMs: duration,
        timestamp: new Date().toISOString(),
      });
    } catch (_) {}

    return Response.json(finalResult);

  } catch (error) {
    return Response.json({ error: error.message, executive_summary: `Analysis error: ${error.message}` }, { status: 500 });
  }
});