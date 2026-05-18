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
If data is insufficient, you explain exactly what is missing and what partial analysis is still possible.`,
  },
  'Principal Business Analyst': {
    iqLevel: 5,
    domain: 'business',
    kpis: ['ROI', 'Decision Confidence', 'Stakeholder Impact Score', 'Business Risk Score', 'Recommendation Priority Score'],
    sqlFocus: ['segment', 'comparison', 'trend', 'ranking', 'distribution'],
    systemPrompt: `You are a Principal Business Analyst at a Fortune 500 company with 15+ years of experience.
You specialize in: business problem framing, KPI-to-strategy mapping, ROI estimation, stakeholder impact analysis, change management, decision feasibility, executive storytelling, and recommendation prioritization.
You always frame the business question before answering. You think about the decision, not just the data.`,
  },
  'CFO Analyst': {
    iqLevel: 5,
    domain: 'finance',
    kpis: ['Revenue Growth %', 'Gross Margin %', 'Operating Expense Ratio', 'Cost Variance', 'Budget Variance', 'EBITDA Proxy', 'Payroll-to-Revenue Ratio', 'Contribution Margin'],
    sqlFocus: ['revenue trend', 'cost variance', 'margin', 'profitability', 'segment contribution'],
    systemPrompt: `You are a CFO-level Financial Analyst with deep expertise in P&L analysis, cost management, financial modeling, and strategic finance.
You answer: Is revenue growing profitably? Are costs rising faster than revenue? Which segment creates margin risk? What is the forecasted financial trajectory?
You always distinguish revenue growth from profitable growth. You detect cost anomalies. You quantify financial risk.`,
  },
  'Growth Analyst': {
    iqLevel: 5,
    domain: 'growth',
    kpis: ['Customer Acquisition Cost', 'Customer Lifetime Value', 'LTV/CAC Ratio', 'Conversion Rate', 'Churn Rate', 'Retention Rate', 'Monthly Active Users', 'RFM Score', 'Funnel Conversion'],
    sqlFocus: ['funnel', 'retention', 'cohort', 'rfm', 'segment comparison', 'campaign roi'],
    systemPrompt: `You are a Principal Growth Analyst with deep expertise in acquisition, activation, retention, revenue, and referral analytics (AARRR framework).
You answer: Where is growth coming from? Which funnel stage is leaking? Which customers are highest value? What is the retention risk?
You use RFM segmentation, cohort analysis, LTV/CAC ratios, and funnel conversion analysis. You always identify the highest-ROI growth lever.`,
  },
  'Operations Analyst': {
    iqLevel: 5,
    domain: 'operations',
    kpis: ['Cycle Time', 'Throughput Rate', 'SLA Compliance %', 'Utilization Rate', 'Defect Rate', 'Backlog Count', 'Capacity Gap', 'Process Efficiency Index'],
    sqlFocus: ['cycle time', 'sla', 'throughput', 'utilization', 'bottleneck', 'delay'],
    systemPrompt: `You are a Principal Operations Analyst with expertise in process optimization, lean operations, SLA management, and operational excellence.
You answer: Where is the bottleneck? Which process is slowing down? What is the SLA risk? Where is capacity misaligned?
You use cycle time analysis, throughput measurement, SLA tracking, utilization rates, and delay root cause analysis.`,
  },
};

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
  const requiredScore = required.length === 0 ? 1 :
    required.filter(f => available.some(a => a.includes(f) || f.includes(a))).length / required.length;

  const sampleScore = rowCount >= 10000 ? 1.0 : rowCount >= 1000 ? 0.85 : rowCount >= 100 ? 0.65 : 0.35;
  const timeCoverage = hasDateColumn ? 0.85 : 0.40;
  const lineageScore = 0.70; // default when no explicit lineage

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
    if (lower.includes(`sum(${name})`) && ['id', 'rank', 'age', 'category', 'code', 'zip'].some(t => type.includes(t))) {
      issues.push({ column: name, issue: `SUM used on non-additive field type: ${type}` });
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
      if (name.includes('id') || name.includes('code') || name.includes('zip') || name.includes('rank')) {
        semanticType = 'id';
      } else if (name.includes('age') || name.includes('year')) {
        semanticType = 'age';
      } else if (name.includes('revenue') || name.includes('cost') || name.includes('amount') || name.includes('price') || name.includes('salary') || name.includes('sales') || name.includes('profit') || name.includes('margin')) {
        semanticType = 'financial_measure';
      } else if (name.includes('count') || name.includes('qty') || name.includes('quantity') || name.includes('volume')) {
        semanticType = 'count_measure';
      } else {
        semanticType = 'numeric_measure';
      }
    } else if (name.includes('date') || name.includes('time') || name.includes('month') || name.includes('year')) {
      semanticType = 'date';
    }
    return { ...col, semantic_type: semanticType };
  });
}

function generateDomainSQL(intent, columns, tableName = 'dataset') {
  const cols = columns.map(c => c.name);
  const numericCols = columns.filter(c => ['financial_measure', 'count_measure', 'numeric_measure'].includes(c.semantic_type)).map(c => c.name);
  const dateCols = columns.filter(c => c.semantic_type === 'date').map(c => c.name);
  const catCols = columns.filter(c => c.semantic_type === 'categorical').map(c => c.name);
  const financialCols = columns.filter(c => c.semantic_type === 'financial_measure').map(c => c.name);

  const mainMetric = financialCols[0] || numericCols[0] || cols[0];
  const mainDim = catCols[0];
  const mainDate = dateCols[0];

  const queries = [];

  if (mainMetric) {
    if (mainDate) {
      queries.push({
        title: 'Trend Over Time',
        sql: `SELECT ${mainDate}, SUM(${mainMetric}) AS total_${mainMetric}\nFROM ${tableName}\nGROUP BY ${mainDate}\nORDER BY ${mainDate}`,
      });
    }
    if (mainDim) {
      queries.push({
        title: `${mainMetric} by ${mainDim}`,
        sql: `SELECT ${mainDim}, SUM(${mainMetric}) AS total_${mainMetric}, COUNT(*) AS record_count\nFROM ${tableName}\nGROUP BY ${mainDim}\nORDER BY total_${mainMetric} DESC\nLIMIT 10`,
      });
    }
    queries.push({
      title: 'Summary Statistics',
      sql: `SELECT COUNT(*) AS total_records, SUM(${mainMetric}) AS total, AVG(${mainMetric}) AS average, MIN(${mainMetric}) AS minimum, MAX(${mainMetric}) AS maximum\nFROM ${tableName}`,
    });
  }

  if (queries.length === 0) {
    queries.push({ title: 'Dataset Overview', sql: `SELECT * FROM ${tableName} LIMIT 20` });
  }

  return queries;
}

function computeStatsSummary(rows, columns) {
  const numericCols = columns.filter(c => ['financial_measure', 'count_measure', 'numeric_measure'].includes(c.semantic_type));
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
    };
  }
  return stats;
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

    // ── Step 2: Column classification ─────────────────────────────────────────
    const rawColumns = tableData?.columns || [];
    const rows = tableData?.rows || [];
    const enrichedColumns = semanticColumnClassify(rawColumns, rows);
    const hasDateColumn = enrichedColumns.some(c => c.semantic_type === 'date');
    const colNames = enrichedColumns.map(c => c.name);

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

    // ── Step 4: Check verified answers ───────────────────────────────────────
    let verifiedAnswerUsed = null;
    try {
      const verified = await base44.asServiceRole.entities.VerifiedAnswer.list('-created_date', 50);
      const match = verified.find(v =>
        v.status === 'certified' &&
        question.toLowerCase().includes((v.question || '').toLowerCase().substring(0, 20))
      );
      if (match) verifiedAnswerUsed = match;
    } catch (_) {}

    // ── Step 5: Check governed metrics ───────────────────────────────────────
    let governedMetrics = [];
    try {
      governedMetrics = await base44.asServiceRole.entities.GovernedMetric.filter({ certified: true });
    } catch (_) {}

    const relevantMetrics = governedMetrics.filter(m => {
      const cols = (m.sourceColumns || []).map(c => c.toLowerCase());
      return cols.some(c => colNames.some(cn => cn.toLowerCase().includes(c)));
    });

    // ── Step 6: SQL generation ────────────────────────────────────────────────
    const domainQueries = generateDomainSQL(intent, enrichedColumns, tableData?.name || 'dataset');
    const primarySQL = domainQueries[0]?.sql || '';
    const sqlRisk = detectSQLRisk(primarySQL, enrichedColumns);

    // ── Step 7: Statistical evidence ─────────────────────────────────────────
    const statsEvidence = computeStatsSummary(rows, enrichedColumns);

    // ── Step 8: Sufficiency guard ─────────────────────────────────────────────
    if (dataSufficiency.status === 'insufficient' && !tableData) {
      const result = {
        executive_summary: `Insufficient data to answer: "${question}". No dataset is loaded.`,
        business_question: question,
        decision_context: 'No active dataset detected in the workspace.',
        data_sufficiency: dataSufficiency,
        metrics_used: [],
        evidence: [],
        root_cause: 'No dataset available for analysis.',
        business_impact: 'Cannot assess without data.',
        risk_assessment: 'High risk of incorrect conclusions without data.',
        recommendations: [{ action: 'Upload a dataset to the workspace first.', priority: 'High', expected_impact: 'Enables full analysis', effort: 'Low', owner: 'User', next_metric_to_monitor: 'Data Quality Score' }],
        confidence_score: 0,
        limitations: ['No dataset provided'],
        next_questions: ['What dataset do you want to analyze?'],
        tools_used: ['DataSufficiencyChecker'],
        sql_generated: '',
        persona: personaName,
        iq_level: persona.iqLevel,
        intent_classified: intent,
        duration_ms: Date.now() - startTime,
      };
      return Response.json(result);
    }

    // ── Step 9: Build rich LLM prompt ─────────────────────────────────────────
    const colSummary = enrichedColumns.slice(0, 25).map(c =>
      `${c.name} (${c.semantic_type || c.type || 'unknown'})`
    ).join(', ');

    const statsSummaryText = Object.entries(statsEvidence).map(([col, s]) =>
      `${col}: sum=${s.sum}, mean=${s.mean}, min=${s.min}, max=${s.max}, stdDev=${s.stdDev}, anomalies=${s.anomalyCount}`
    ).join('\n');

    const metricsContext = relevantMetrics.length > 0
      ? relevantMetrics.map(m => `• ${m.metricName}: ${m.formula} (${m.businessDefinition})`).join('\n')
      : persona.kpis.map(k => `• ${k}`).join('\n');

    const verifiedContext = verifiedAnswerUsed
      ? `\nVERIFIED ANSWER AVAILABLE:\nQuestion: ${verifiedAnswerUsed.question}\nSQL: ${verifiedAnswerUsed.verifiedSql}\nAnswer: ${verifiedAnswerUsed.expectedAnswer}\n`
      : '';

    const prompt = `${persona.systemPrompt}

You are answering as a ${personaName} using the F-D-E-A-R framework:
F = Frame the business question
D = Diagnose data and root cause
E = Evaluate business impact and risk
A = Act with prioritized recommendations
R = Review success metrics and next questions

DATASET: "${tableData?.name || 'Uploaded Dataset'}" 
Rows: ${rows.length} | Columns: ${enrichedColumns.length}
Columns: ${colSummary}
Intent classified: ${intent}
Data Sufficiency: ${dataSufficiency.score}% (${dataSufficiency.status})
${verifiedContext}

STATISTICAL EVIDENCE:
${statsSummaryText || 'No numeric columns available.'}

SQL EVIDENCE:
${domainQueries.map(q => `[${q.title}]\n${q.sql}`).join('\n\n')}

RELEVANT METRICS:
${metricsContext}

USER QUESTION: "${question}"

AGENT IQ LEVEL: ${persona.iqLevel} — Principal Analyst

Respond with a complete principal-analyst-level answer. DO NOT say "analysis complete." DO NOT hallucinate numbers. 
If data is insufficient, explain exactly what fields are missing and what partial analysis is still possible.
Reference the actual column names and statistical evidence above in your answer.
Provide specific, evidence-backed recommendations with estimated impact.`;

    // ── Step 10: LLM call ─────────────────────────────────────────────────────
    const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          executive_summary: { type: 'string' },
          business_question: { type: 'string' },
          decision_context: { type: 'string' },
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
              }
            }
          },
          confidence_score: { type: 'number' },
          limitations: { type: 'array', items: { type: 'string' } },
          next_questions: { type: 'array', items: { type: 'string' } },
          missing_fields: { type: 'array', items: { type: 'string' } },
        }
      }
    });

    // ── Step 11: Enrich and validate output ───────────────────────────────────
    const recs = llmResponse.recommendations || [];
    const enrichedRecs = recs.map(r => ({
      ...r,
      priority_score: computeRecommendationPriority(
        r.expected_impact?.toLowerCase().includes('high') ? 0.85 : r.expected_impact?.toLowerCase().includes('medium') ? 0.60 : 0.35,
        (llmResponse.confidence_score || 70) / 100,
        r.priority === 'High' ? 0.9 : r.priority === 'Medium' ? 0.65 : 0.35,
        r.effort === 'Low' ? 0.2 : r.effort === 'Medium' ? 0.5 : 0.8,
      ),
    })).sort((a, b) => b.priority_score - a.priority_score);

    const decisionConfidence = computeDecisionConfidence(
      dataSufficiency.score / 100,
      Math.min(llmResponse.evidence?.length || 0, 5) / 5,
      0.75,
      intent !== 'general' ? 0.85 : 0.60,
      0.80
    );

    const duration = Date.now() - startTime;
    const tools = ['IntentClassifier', 'DataSufficiencyChecker', 'SemanticMetricLookup', 'SQLGenerator', 'StatisticsEngine', 'PrincipalAnalystReasoner'];
    if (sqlRisk.issues.length > 0) tools.push('SQLRiskDetector');
    if (verifiedAnswerUsed) tools.push('VerifiedAnswerLibrary');

    const finalResult = {
      ...llmResponse,
      recommendations: enrichedRecs,
      data_sufficiency: { ...dataSufficiency, score: dataSufficiency.score },
      confidence_score: decisionConfidence,
      decision_confidence: decisionConfidence,
      tools_used: tools,
      sql_generated: primarySQL,
      sql_queries: domainQueries,
      sql_risk: sqlRisk,
      stats_evidence: statsEvidence,
      persona: personaName,
      iq_level: persona.iqLevel,
      intent_classified: intent,
      duration_ms: duration,
      verified_answer_used: verifiedAnswerUsed ? verifiedAnswerUsed.question : null,
      governed_metrics_used: relevantMetrics.map(m => m.metricName),
    };

    // ── Step 12: Log trace ────────────────────────────────────────────────────
    try {
      const qualityScore = Math.min(
        (finalResult.evidence?.length || 0) * 10 +
        (finalResult.recommendations?.length || 0) * 8 +
        (finalResult.executive_summary?.length > 100 ? 20 : 0) +
        (finalResult.metrics_used?.length || 0) * 5,
        100
      );
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
        fallbackReason: dataSufficiency.status === 'insufficient' ? 'Insufficient data' : '',
        finalAnswer: {
          executive_summary: finalResult.executive_summary,
          evidence_count: finalResult.evidence?.length || 0,
          recs_count: enrichedRecs.length,
        },
        qualityBreakdown: {
          evidence_count: finalResult.evidence?.length || 0,
          recs_count: enrichedRecs.length,
          data_sufficiency: dataSufficiency.status,
          sql_risk: sqlRisk.issues,
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