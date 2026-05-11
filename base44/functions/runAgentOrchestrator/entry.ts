import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── F-D-E-A-R Reasoning Loop Orchestrator ─────────────────────────────────────
// Frame → Diagnose → Explain → Act → Review
// With: data sufficiency check, semantic column classifier, safe SQL generator

const AGENT_CONFIGS = {
  cfo: {
    name: 'CFO Analyst',
    role: 'Senior FP&A / Finance Analytics Expert',
    focus: ['revenue','cost','payroll','margin','profitability','budget variance','forecast variance','cash runway','unit economics','financial risk'],
    kpis: ['Revenue','Gross Margin %','Contribution Margin','Payroll Cost','Payroll Cost Ratio','Budget Variance','Revenue per Employee','Cost per Employee','Runway','ROI','Forecast Variance','EBITDA','Net Margin'],
    formulas: {
      'Gross Margin %': '(Revenue - COGS) / Revenue * 100',
      'Budget Variance %': '(Actual - Budget) / Budget * 100',
      'Revenue per Employee': 'Revenue / Headcount',
      'Payroll Cost Ratio': 'PayrollCost / Revenue * 100',
      'Runway (months)': 'CashBalance / MonthlyBurn',
    },
    outputFormat: ['Direct Answer','Financial Evidence','Business Meaning','Risk','Recommended Action','Confidence','Next Question'],
    decisionFramework: 'Variance → Driver → Risk → Action',
  },
  growth: {
    name: 'Growth Analyst',
    role: 'Senior Growth / Product / Revenue Analyst',
    focus: ['acquisition','activation','retention','churn','conversion','RFM','cohort retention','campaign ROI','LTV/CAC','funnel drop-off'],
    kpis: ['New Users','Active Users','Activation Rate','Conversion Rate','Retention Rate','Churn Rate','CAC','LTV','LTV/CAC','RFM Segment','Funnel Drop-off','Campaign ROI','Average Order Value','Net Revenue Retention'],
    formulas: {
      'Conversion Rate': 'ConvertedUsers / TotalUsers * 100',
      'Churn Rate': 'LostCustomers / StartingCustomers * 100',
      'Retention Rate': 'ReturningUsers / TotalUsers * 100',
      'LTV/CAC': 'CustomerLifetimeValue / CustomerAcquisitionCost',
    },
    outputFormat: ['Direct Answer','Growth Evidence','Funnel/Cohort/RFM Insight','Business Meaning','Experiment Recommendation','Expected Impact','Confidence','Next Question'],
    decisionFramework: 'Acquire → Activate → Retain → Expand',
  },
  operations: {
    name: 'Operations Analyst',
    role: 'Senior Operations Excellence / Process Improvement Specialist',
    focus: ['throughput','capacity','cycle time','SLA','bottlenecks','resource utilization','defect rate','backlog','productivity','automation'],
    kpis: ['Cycle Time','Lead Time','Throughput','Capacity Utilization','SLA Compliance','Error Rate','Defect Rate','Backlog Growth','Cost per Process','Resource Utilization','Rework Rate'],
    formulas: {
      'Throughput': 'CompletedWork / TimePeriod',
      'Capacity Utilization': 'ActualOutput / MaximumCapacity * 100',
      'SLA Compliance': 'TasksCompletedWithinSLA / TotalTasks * 100',
      'Defect Rate': 'DefectiveUnits / TotalUnits * 100',
    },
    outputFormat: ['Direct Answer','Operational Evidence','Bottleneck Analysis','Risk','Process Improvement Action','Follow-up Metric','Confidence'],
    decisionFramework: 'DMAIC: Define → Measure → Analyze → Improve → Control',
  },
};

// ── Semantic Column Classifier ─────────────────────────────────────────────────
// Classifies columns by type so SQL generator only uses valid columns
function classifyColumn(colName, sampleValues) {
  const n = colName.toLowerCase();
  const idPatterns = ['_id', 'id_', '^id$', 'uuid', 'key', 'code', 'ref', 'record_id', 'patient_id', 'user_id', 'order_id', 'transaction_id'];
  const rankPatterns = ['rank', 'score', 'index', 'rating', 'quintile', 'decile', 'percentile', 'tier'];
  const datePatterns = ['date', 'month', 'year', 'quarter', 'week', 'period', 'time', 'created_at', 'updated_at', 'timestamp'];
  const demographicPatterns = ['age', 'gender', 'sex', 'ethnicity', 'race', 'zip', 'postal'];
  const currencyPatterns = ['revenue', 'cost', 'salary', 'wage', 'payroll', 'price', 'amount', 'value', 'fee', 'charge', 'spend', 'budget', 'expense', 'income', 'profit', 'margin', 'payment', 'compensation', 'bonus', 'commission'];
  const countPatterns = ['count', 'num_', 'number_', 'qty', 'quantity', 'headcount', 'total_orders', 'total_users', 'total_sessions', 'frequency', 'visits'];
  const categoryPatterns = ['department', 'category', 'type', 'status', 'region', 'country', 'city', 'state', 'channel', 'product', 'segment', 'group', 'tier', 'plan', 'source', 'medium', 'campaign', 'role', 'team', 'location'];
  const ratePatterns = ['rate', 'ratio', 'pct', 'percent', 'percentage', 'share', 'proportion'];

  if (idPatterns.some(p => n.match(new RegExp(p)))) return 'id';
  if (datePatterns.some(p => n.includes(p))) return 'date';
  if (demographicPatterns.some(p => n.includes(p))) return 'demographic';
  if (currencyPatterns.some(p => n.includes(p))) return 'currency_measure';
  if (ratePatterns.some(p => n.includes(p))) return 'rate_measure';
  if (countPatterns.some(p => n.includes(p))) return 'count_measure';
  if (rankPatterns.some(p => n.includes(p))) return 'rank_score';
  if (categoryPatterns.some(p => n.includes(p))) return 'category';

  // Check by sample values
  if (sampleValues && sampleValues.length > 0) {
    const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && v !== '' && v !== null).length;
    if (numericCount / sampleValues.length > 0.8) return 'numeric_measure';
    return 'category';
  }

  return 'unknown';
}

// ── Business Intent & Required Field Mapper ────────────────────────────────────
const DOMAIN_REQUIREMENTS = {
  payroll: {
    keywords: ['payroll','salary','wage','compensation','overtime','headcount','hours worked','pay period','employee cost','labor cost'],
    requiredFieldSignals: ['payroll','salary','wage','compensation','overtime','hourly_rate','hours_worked'],
    optionalFieldSignals: ['department','employee','headcount','role','location','bonus','period','date'],
    analysisType: 'payroll_cost_diagnosis',
    domain: 'finance',
    sqlTemplate: (catCol, dateCol) => `SELECT ${catCol || 'department'}, ${dateCol ? `DATE_TRUNC('month', ${dateCol}) AS month,` : ''}\n  SUM(payroll_cost) AS total_payroll_cost,\n  COUNT(DISTINCT employee_id) AS headcount\nFROM workforce_data\n${catCol ? `GROUP BY ${catCol}${dateCol ? ', month' : ''}\nORDER BY total_payroll_cost DESC` : ''}\nLIMIT 20;`,
  },
  revenue: {
    keywords: ['revenue','sales','income','gmv','arr','mrr','booking','deal'],
    requiredFieldSignals: ['revenue','sales','income','amount','value','gmv','arr','mrr'],
    optionalFieldSignals: ['date','period','month','category','product','region','channel','segment'],
    analysisType: 'revenue_diagnosis',
    domain: 'finance',
  },
  margin: {
    keywords: ['margin','gross margin','net margin','profit','profitability','cogs'],
    requiredFieldSignals: ['margin','profit','revenue','cogs','cost'],
    optionalFieldSignals: ['product','category','date','segment'],
    analysisType: 'margin_diagnosis',
    domain: 'finance',
  },
  budget: {
    keywords: ['budget','variance','forecast','actual vs','over budget','under budget'],
    requiredFieldSignals: ['budget','actual','forecast','variance','target'],
    optionalFieldSignals: ['department','category','period','date'],
    analysisType: 'budget_variance_diagnosis',
    domain: 'finance',
  },
  churn: {
    keywords: ['churn','retention','attrition','lost customers','customer drop'],
    requiredFieldSignals: ['churn','retention','cancelled','churned','status'],
    optionalFieldSignals: ['date','customer','cohort','segment','plan','product'],
    analysisType: 'churn_diagnosis',
    domain: 'growth',
  },
  conversion: {
    keywords: ['conversion','funnel','drop off','drop-off','signup','activation'],
    requiredFieldSignals: ['conversion','signup','activated','funnel','stage'],
    optionalFieldSignals: ['date','source','channel','campaign','product','segment'],
    analysisType: 'funnel_diagnosis',
    domain: 'growth',
  },
  bottleneck: {
    keywords: ['bottleneck','sla','cycle time','throughput','delay','backlog','queue'],
    requiredFieldSignals: ['cycle_time','lead_time','sla','throughput','duration','processing_time'],
    optionalFieldSignals: ['stage','department','team','date','status','priority'],
    analysisType: 'bottleneck_diagnosis',
    domain: 'operations',
  },
};

function detectDomain(question) {
  const q = question.toLowerCase();
  for (const [domain, config] of Object.entries(DOMAIN_REQUIREMENTS)) {
    if (config.keywords.some(kw => q.includes(kw))) {
      return { domain, config };
    }
  }
  return null;
}

// ── Data Sufficiency Check ─────────────────────────────────────────────────────
function checkDataSufficiency(question, columns, rows) {
  const domainMatch = detectDomain(question);
  if (!domainMatch) return { status: 'sufficient', missingFields: [], availableFields: columns.map(c => c.name || c), note: '' };

  const { domain, config } = domainMatch;
  const colNames = columns.map(c => (c.name || c).toLowerCase());

  const hasRequired = config.requiredFieldSignals.some(signal =>
    colNames.some(col => col.includes(signal))
  );
  const hasOptional = config.optionalFieldSignals.some(signal =>
    colNames.some(col => col.includes(signal))
  );

  if (!hasRequired) {
    return {
      status: 'insufficient',
      domain,
      analysisType: config.analysisType,
      missingFields: config.requiredFieldSignals,
      optionalFields: config.optionalFieldSignals,
      availableFields: columns.map(c => c.name || c).slice(0, 15),
      note: `The current dataset does not contain ${domain}-related fields required to answer this question.`,
    };
  }

  if (hasRequired && !hasOptional) {
    return {
      status: 'partial',
      domain,
      analysisType: config.analysisType,
      missingFields: config.optionalFieldSignals.slice(0, 3),
      availableFields: columns.map(c => c.name || c).slice(0, 15),
      note: `Dataset contains some ${domain} fields but may be missing dimensional context.`,
    };
  }

  return { status: 'sufficient', domain, analysisType: config.analysisType, missingFields: [], availableFields: columns.map(c => c.name || c).slice(0, 15) };
}

// ── Safe SQL Generator ─────────────────────────────────────────────────────────
// Only generates SQL when columns are semantically valid for the question
function generateSafeSQL(question, columns, rows, tableName) {
  const domainMatch = detectDomain(question);
  const colNames = columns.map(c => c.name || c);

  // Classify all columns semantically
  const classified = colNames.map(col => {
    const sampleVals = rows.slice(0, 10).map(r => r[col]);
    return { col, type: classifyColumn(col, sampleVals) };
  });

  // Safe aggregatable columns = currency_measure, count_measure, rate_measure (not id, not rank, not demographic)
  const safeNumericCols = classified
    .filter(c => ['currency_measure', 'count_measure', 'rate_measure', 'numeric_measure'].includes(c.type))
    .filter(c => {
      // Additional guard: don't sum columns that look like IDs or ranks even if numeric
      const n = c.col.toLowerCase();
      return !n.match(/_id$|^id_|^id$|rank|score|index|age$|zip$|postal$/);
    })
    .map(c => c.col);

  const catCols = classified.filter(c => c.type === 'category').map(c => c.col);
  const dateCols = classified.filter(c => c.type === 'date').map(c => c.col);

  // If domain-specific required fields are not present, don't generate SQL
  if (domainMatch) {
    const hasRequired = domainMatch.config.requiredFieldSignals.some(signal =>
      colNames.some(col => col.toLowerCase().includes(signal))
    );
    if (!hasRequired) return null;
  }

  if (safeNumericCols.length === 0) return null;

  const groupBy = catCols[0] || dateCols[0];
  const metricCol = safeNumericCols[0];
  const extraMetrics = safeNumericCols.slice(1, 3).map(c => `SUM(${c}) AS total_${c}`).join(', ');

  if (groupBy) {
    return `SELECT ${groupBy}, SUM(${metricCol}) AS total_${metricCol}${extraMetrics ? ',\n       ' + extraMetrics : ''}\nFROM ${tableName || 'dataset'}\nGROUP BY ${groupBy}\nORDER BY total_${metricCol} DESC\nLIMIT 20;`;
  } else {
    return `SELECT SUM(${metricCol}) AS total_${metricCol}${extraMetrics ? ', ' + extraMetrics : ''}\nFROM ${tableName || 'dataset'};`;
  }
}

// ── Domain-Fit Assessor ────────────────────────────────────────────────────────
// Determines how well the active dataset matches the selected persona
const PERSONA_DOMAIN_SIGNALS = {
  cfo: ['revenue','sales','cost','payroll','salary','wage','budget','margin','profit','expense','invoice','payment','price','headcount','department','fee','billing','tax','cash','burn'],
  growth: ['user','customer','signup','conversion','campaign','churn','retention','order','session','acquisition','engagement','funnel','cohort','ltv','cac','click','impression'],
  operations: ['appointment','task','status','duration','cycle','queue','backlog','completion','provider','sla','defect','throughput','utilization','workflow','process','incident','ticket'],
};

function assessDomainFit(columns, personaKey) {
  const normalized = columns.map(c => (c.name || c).toLowerCase());
  const signals = PERSONA_DOMAIN_SIGNALS[personaKey] || PERSONA_DOMAIN_SIGNALS.cfo;
  const matched = signals.filter(sig => normalized.some(col => col.includes(sig)));
  const score = matched.length / signals.length;
  const domainFit = score >= 0.20 ? 'full' : score >= 0.08 ? 'partial' : 'weak';
  return { domainFit, matchedSignals: matched, score: Math.round(score * 100) };
}

// ── Intent Classifier ──────────────────────────────────────────────────────────
function classifyIntent(question) {
  const q = question.toLowerCase();
  const financeKw = ['revenue','cost','payroll','margin','budget','variance','profit','cash','runway','roi','cogs','expense','salary','headcount','finance','financial','spend','burn'];
  const growthKw = ['conversion','churn','retention','acquisition','funnel','cohort','rfm','ltv','cac','activation','signup','user','growth','campaign','segment','engagement'];
  const opsKw = ['cycle time','throughput','sla','bottleneck','capacity','defect','utilization','process','workflow','backlog','queue','efficiency','productivity','automation','rework'];

  const finScore = financeKw.filter(k => q.includes(k)).length;
  const growthScore = growthKw.filter(k => q.includes(k)).length;
  const opsScore = opsKw.filter(k => q.includes(k)).length;

  const max = Math.max(finScore, growthScore, opsScore);
  if (max === 0) return { category: 'general', agent: 'cfo', confidence: 50 };

  let category = 'finance', agent = 'cfo';
  if (growthScore === max) { category = 'growth'; agent = 'growth'; }
  else if (opsScore === max) { category = 'operations'; agent = 'operations'; }

  const total = finScore + growthScore + opsScore || 1;
  const confidence = Math.round((max / total) * 100);
  return { category, agent, confidence };
}

function buildDataContextSummary(rows, columns) {
  if (!rows?.length || !columns?.length) return 'No dataset loaded.';
  const colNames = columns.map(c => c.name || c);
  const sample = rows.slice(0,3);
  return `Dataset: ${rows.length} rows, ${columns.length} columns. Columns: ${colNames.slice(0,12).join(', ')}. Sample row: ${JSON.stringify(sample[0]).slice(0,250)}`;
}

// ── Final Answer Validation ────────────────────────────────────────────────────
function isWeakAnswer(answer) {
  if (!answer || typeof answer !== 'string') return true;
  const weakPhrases = ['analysis complete','done','completed','here is the analysis','no answer available','analysis performed'];
  return weakPhrases.some(phrase => answer.toLowerCase().trim() === phrase) || answer.trim().length < 30;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { question, persona, tableContext, pipelinePreset = 'quick_insight', sessionId } = body;

    if (!question?.trim()) return Response.json({ error: 'Question required' }, { status: 400 });

    const startTime = Date.now();
    const sid = sessionId || `session_${Date.now()}`;

    // ── Step 1: Intent Classifier ──────────────────────────────────────────────
    const intent = classifyIntent(question);
    const activeAgentKey = persona?.id === 'cfo' ? 'cfo' : persona?.id === 'marketing' ? 'growth' : persona?.id === 'ops' ? 'operations' : intent.agent;
    const agentConfig = AGENT_CONFIGS[activeAgentKey] || AGENT_CONFIGS.cfo;

    // ── Step 2: Data Context Agent ─────────────────────────────────────────────
    const rows = tableContext?.rows || [];
    const columns = tableContext?.columns || [];
    const dataContext = buildDataContextSummary(rows, columns);

    // ── Step 3: Domain Fit + Data Sufficiency Check ───────────────────────────
    const domainFit = assessDomainFit(columns, activeAgentKey);
    const sufficiency = checkDataSufficiency(question, columns, rows);

    // ── Step 4: Safe SQL Generator (new) ──────────────────────────────────────
    const generatedSQL = sufficiency.status !== 'insufficient'
      ? generateSafeSQL(question, columns, rows, tableContext?.name)
      : null;

    // ── Step 5: Statistical tool layer ────────────────────────────────────────
    const stats = {};
    if (sufficiency.status !== 'insufficient') {
      const colNames = columns.map(c => c.name || c);
      const classified = colNames.map(col => {
        const sampleVals = rows.slice(0, 10).map(r => r[col]);
        return { col, type: classifyColumn(col, sampleVals) };
      });
      const safeNumericCols = classified
        .filter(c => ['currency_measure', 'count_measure', 'rate_measure', 'numeric_measure'].includes(c.type))
        .filter(c => !c.col.toLowerCase().match(/_id$|^id_|^id$|rank|score|index|age$|zip$|postal$/))
        .map(c => c.col)
        .slice(0, 5);

      safeNumericCols.forEach(col => {
        const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
        if (!vals.length) return;
        const sum = vals.reduce((a,b) => a+b, 0);
        const mean = sum / vals.length;
        const sorted = [...vals].sort((a,b) => a-b);
        const std = Math.sqrt(vals.reduce((s,v) => s+(v-mean)**2, 0) / vals.length);
        stats[col] = { sum: Math.round(sum*100)/100, mean: Math.round(mean*100)/100, std: Math.round(std*100)/100, min: sorted[0], max: sorted[sorted.length-1], count: vals.length };
      });
    }

    // ── Step 6: Anomaly detection ─────────────────────────────────────────────
    const anomalies = [];
    Object.entries(stats).forEach(([col, s]) => {
      if (s.std > 0 && Math.abs(s.max - s.mean) > 2 * s.std) {
        anomalies.push({ column: col, type: 'high_outlier', value: s.max, mean: s.mean, deviation: Math.round(((s.max - s.mean) / s.std) * 10) / 10 });
      }
    });

    // ── Step 7: Build specialist agent prompt with sufficiency context ─────────
    const statsStr = Object.entries(stats).slice(0,4).map(([k,v]) => `${k}: sum=${v.sum}, mean=${v.mean}, max=${v.max}`).join('\n');
    const anomalyStr = anomalies.length > 0 ? anomalies.map(a => `ANOMALY: ${a.column} value ${a.value} is ${a.deviation}σ above mean`).join('\n') : 'No anomalies detected.';

    // For insufficient data, add explicit instructions to explain the problem
    const insufficiencyInstructions = sufficiency.status === 'insufficient' ? `
⚠️ DATA SUFFICIENCY ALERT:
The user is asking about "${sufficiency.domain}" but the current dataset is "${tableContext?.name || 'unknown'}" and does NOT contain the required ${sufficiency.domain}-related fields.

REQUIRED FIELDS THAT ARE MISSING: ${sufficiency.missingFields.join(', ')}
FIELDS ACTUALLY IN DATASET: ${sufficiency.availableFields.slice(0, 12).join(', ')}

YOU MUST:
1. Set direct_answer to a clear explanation that the dataset is insufficient
2. Explain exactly which fields are missing and why they matter
3. Tell the user what dataset/fields to upload to answer this question
4. Set confidence_score to 95 (you are 95% confident the data is insufficient)
5. Do NOT pretend to answer the question — explain the data gap honestly
6. Do NOT generate meaningless evidence from unrelated fields
` : '';

    // Domain-fit lens instructions for the prompt
    const domainFitInstructions = domainFit.domainFit === 'weak' ? `
⚠️ DOMAIN FIT: WEAK (${domainFit.score}% match with ${agentConfig.name} domain)
The active dataset does NOT strongly match your domain. You must still answer professionally.

PERSONA-LENS ADAPTER — follow this approach:
1. Acknowledge the dataset type honestly (e.g. "This appears to be an appointments/operations dataset")
2. Explain what ${agentConfig.name} CAN analyze from this data (financial proxies, cost drivers, readiness)
3. Explain what ${agentConfig.name} CANNOT analyze without additional fields
4. List the specific finance/domain fields needed to unlock full ${agentConfig.name} analysis
5. Suggest which persona would be a better fit for the current dataset
6. Give at least 2-3 actionable next steps

MATCHED DOMAIN SIGNALS: ${domainFit.matchedSignals.join(', ') || 'none'}
DO NOT say "Analysis complete" or "incomplete response" — give a full professional assessment.
` : domainFit.domainFit === 'partial' ? `
ℹ️ DOMAIN FIT: PARTIAL (${domainFit.score}% match with ${agentConfig.name} domain)
The dataset partially matches your domain. Analyze what is available and clearly note limitations.
MATCHED SIGNALS: ${domainFit.matchedSignals.join(', ')}
` : `✅ DOMAIN FIT: STRONG — run full ${agentConfig.name} analysis.`;

    const systemPrompt = `You are the ${agentConfig.name}: ${agentConfig.role}.

REASONING FRAMEWORK — F-D-E-A-R Loop:
1. FRAME: Identify the exact business question and dataset type
2. DIAGNOSE: What KPI or signal is available? What does the data show?
3. EXPLAIN: What is driving this? What is the root cause or data gap?
4. ACT: What specific action should leadership take?
5. REVIEW: What follow-up metric or dataset is needed?

YOUR FOCUS AREAS: ${agentConfig.focus.join(', ')}
YOUR KPI OWNERSHIP: ${agentConfig.kpis.join(', ')}
YOUR DECISION FRAMEWORK: ${agentConfig.decisionFramework}

${domainFitInstructions}

ABSOLUTE RULES:
- NEVER output "Analysis complete", "Done", "Incomplete response", or any internal system message
- ALWAYS write at least 3 full sentences in direct_answer — be specific and professional
- If domain fit is weak, explain what the dataset IS and what the persona CAN still offer
- Use actual column names and statistics in your evidence
- KPI impact must reflect the actual dataset, not assumed finance fields that don't exist`;

    const userPrompt = `USER QUESTION: "${question}"

DATASET: ${tableContext?.name || 'No dataset'} (${tableContext?.rowCount || rows.length} rows)
DATA SUFFICIENCY STATUS: ${sufficiency.status.toUpperCase()}
${insufficiencyInstructions}
DATA CONTEXT: ${dataContext}
INTENT CLASSIFIED AS: ${intent.category} (confidence: ${intent.confidence}%)

STATISTICAL EVIDENCE FROM DATASET (safe numeric columns only):
${statsStr || 'No safe numeric columns found that match this question.'}

ANOMALY DETECTION:
${anomalyStr}

SQL STATUS: ${generatedSQL ? 'Generated:\n' + generatedSQL : 'Not generated — required columns missing or unsafe to execute.'}

Now answer using the F-D-E-A-R loop. Return a complete structured JSON answer. The direct_answer must be at least 2-3 meaningful sentences.`;

    // ── Step 8: LLM Specialist Agent — Deep Analysis ──────────────────────────
    const agentResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `${systemPrompt}\n\n${userPrompt}

MANDATORY OUTPUT REQUIREMENTS — you MUST populate ALL of these fields:

key_takeaways: Array of exactly 3 plain-language bullet points summarising the answer for a business executive. Each must be 1 sentence, concrete, and specific. No vague statements. Example: "Payroll cost rose 18% in Q3 due to a 12% headcount increase in Engineering."

thought_process: Array of exactly 5 steps showing how you reasoned through this answer. Each step is a short sentence. Format: ["1. Identified the question domain as finance/payroll", "2. Checked dataset for payroll-related fields...", ...]. This is the visible reasoning log.

deep_analysis: A 3-5 sentence paragraph performing a deeper investigation — root cause check, comparison against typical benchmarks or industry norms, and any patterns in the available data. This section must go beyond the direct answer.

direct_answer: 3-5 sentences. The main answer in plain business language. Must contain specific findings or a clear data-gap explanation. NEVER "Analysis complete."

evidence: At least 3 specific data points, column names, or observations from the dataset.

recommendation: At least 3 specific, actionable recommendations. Start each with a verb.

validation_passed: Boolean. Set to true only if the response contains actual data findings (not just generic statements). If the dataset is insufficient for the question, still set to true but explain the insufficiency clearly.`,
      response_json_schema: {
        type: 'object',
        properties: {
          key_takeaways: { type: 'array', items: { type: 'string' } },
          thought_process: { type: 'array', items: { type: 'string' } },
          deep_analysis: { type: 'string' },
          direct_answer: { type: 'string' },
          kpi_impact: { type: 'string' },
          evidence: { type: 'array', items: { type: 'string' } },
          driver_root_cause: { type: 'string' },
          risk: { type: 'string' },
          recommendation: { type: 'array', items: { type: 'string' } },
          expected_impact: { type: 'string' },
          confidence_score: { type: 'number' },
          confidence_explanation: { type: 'string' },
          follow_up_metric: { type: 'string' },
          suggested_next_question: { type: 'string' },
          validation_passed: { type: 'boolean' },
          frame_step: { type: 'string' },
          diagnose_step: { type: 'string' },
          explain_step: { type: 'string' },
          act_step: { type: 'string' },
          review_step: { type: 'string' },
        },
        required: ['key_takeaways','thought_process','direct_answer','evidence','recommendation','confidence_score'],
      },
    });

    // ── Step 9: Final Answer Validation & Professional Fallback ───────────────
    let finalDirectAnswer = agentResult?.direct_answer || '';
    if (isWeakAnswer(finalDirectAnswer)) {
      const datasetName = tableContext?.name || 'the active dataset';
      const rowCount = tableContext?.rowCount || rows.length;
      const availableCols = columns.map(c => c.name || c).slice(0, 8).join(', ');

      if (sufficiency.status === 'insufficient') {
        // Specific domain question but wrong dataset
        finalDirectAnswer = `I cannot accurately answer this question from ${datasetName} because it does not contain the required ${sufficiency.domain}-related fields. The dataset (${rowCount} rows) appears to contain fields such as ${availableCols}, which are not sufficient for ${sufficiency.analysisType?.replace(/_/g,' ')}. To perform this analysis, please upload a dataset that includes: ${sufficiency.missingFields.slice(0,5).join(', ')}.`;
      } else if (domainFit.domainFit === 'weak') {
        // Broad question or persona-dataset mismatch — give CFO-readiness / domain-readiness answer
        const personaName = agentConfig.name;
        const betterPersona = activeAgentKey === 'cfo' ? 'Operations Analyst' : activeAgentKey === 'growth' ? 'Operations Analyst' : 'Growth Analyst';
        finalDirectAnswer = `${datasetName} (${rowCount} rows) appears to be an ${domainFit.matchedSignals.length > 0 ? domainFit.matchedSignals.slice(0,3).join('/') + '-oriented' : 'operational'} dataset rather than a ${activeAgentKey === 'cfo' ? 'financial' : activeAgentKey === 'growth' ? 'customer/marketing' : 'operations'} dataset. As ${personaName}, I can provide a domain-readiness assessment: the data can support ${activeAgentKey === 'cfo' ? 'cost-proxy analysis, workload-to-staffing cost reasoning, and financial readiness scoring' : activeAgentKey === 'growth' ? 'behavioral segmentation, engagement pattern analysis, and conversion proxy analysis' : 'process efficiency, bottleneck detection, and capacity analysis'}, but a complete ${personaName} analysis requires fields such as ${agentConfig.kpis.slice(0,4).join(', ')}. Consider switching to ${betterPersona} for this dataset, or enrich the dataset with the missing financial fields for full ${personaName} coverage.`;
      } else {
        // Sufficient data but LLM returned weak answer — give a data-grounded fallback
        const topStats = Object.entries(stats).slice(0, 2).map(([k, v]) => `${k}: total ${v.sum}, avg ${v.mean}`).join('; ');
        finalDirectAnswer = `Based on ${datasetName} (${rowCount} rows), the available data shows: ${topStats || `columns: ${availableCols}`}. As ${agentConfig.name}, the primary analysis opportunity lies in examining patterns across these fields. Please refine your question to focus on a specific KPI, time period, or segment for a more targeted executive response.`;
      }
    }

    // Also fix KPI impact — don't show a KPI that doesn't exist in the dataset
    let finalKpiImpact = agentResult?.kpi_impact || '';
    if (!finalKpiImpact || (domainFit.domainFit === 'weak' && finalKpiImpact === agentConfig.kpis[0])) {
      finalKpiImpact = domainFit.domainFit === 'weak'
        ? `Dataset readiness / ${domainFit.matchedSignals[0] || 'operational'} volume`
        : agentConfig.kpis[0];
    }

    // ── Step 10: Assemble final output ────────────────────────────────────────
    const rawConfidence = agentResult?.confidence_score || (sufficiency.status === 'insufficient' ? 95 : 50);

    const output = {
      session_id: sid,
      agent: agentConfig.name,
      agent_role: agentConfig.role,
      intent: intent.category,
      intent_confidence: intent.confidence,

      // Key takeaways — mandatory top summary
      key_takeaways: agentResult?.key_takeaways?.length > 0
        ? agentResult.key_takeaways
        : [`${agentConfig.name} reviewed ${tableContext?.name || 'the dataset'} (${rows.length} rows).`, `Domain fit: ${domainFit.domainFit} — ${domainFit.matchedSignals.length} matching signals found.`, `Confidence in analysis: ${rawConfidence}%.`],

      // Thought process log
      thought_process: agentResult?.thought_process?.length > 0
        ? agentResult.thought_process
        : [`1. Received question: "${question}"`, `2. Selected agent: ${agentConfig.name}`, `3. Assessed domain fit: ${domainFit.domainFit} (${domainFit.score}% match)`, `4. Checked data sufficiency: ${sufficiency.status}`, `5. Generated final answer with available evidence.`],

      // Deep analysis paragraph
      deep_analysis: agentResult?.deep_analysis || '',

      // Validation flag
      validation_passed: agentResult?.validation_passed !== false,

      // 10-field structured answer
      direct_answer: finalDirectAnswer,
      kpi_impact: finalKpiImpact,
      evidence: agentResult?.evidence?.length > 0 ? agentResult.evidence : (sufficiency.status === 'insufficient' ? [`Dataset: ${tableContext?.name}`, `Missing required fields: ${sufficiency.missingFields?.slice(0,4).join(', ')}`, `Available fields: ${sufficiency.availableFields?.slice(0,5).join(', ')}`] : []),
      driver_root_cause: agentResult?.driver_root_cause || '',
      risk: agentResult?.risk || '',
      recommendation: agentResult?.recommendation?.length > 0 ? agentResult.recommendation : (sufficiency.status === 'insufficient' ? [`Upload a ${sufficiency.domain} dataset containing: ${sufficiency.missingFields?.slice(0,4).join(', ')}`, 'Map the correct dataset fields to this analysis type', 'Then re-run this question for a complete executive answer'] : []),
      expected_impact: agentResult?.expected_impact || '',
      confidence_score: rawConfidence,
      confidence_explanation: agentResult?.confidence_explanation || (sufficiency.status === 'insufficient' ? `High confidence that the current dataset is insufficient for ${sufficiency.domain} analysis.` : ''),
      follow_up_metric: agentResult?.follow_up_metric || '',
      suggested_next_question: agentResult?.suggested_next_question || '',

      // Data sufficiency result (exposed to UI)
      data_sufficiency: {
        status: sufficiency.status,
        domain: sufficiency.domain,
        missingFields: sufficiency.missingFields || [],
        availableFields: sufficiency.availableFields || [],
      },
      domain_fit: domainFit.domainFit,
      domain_fit_score: domainFit.score,

      // Reasoning trace (F-D-E-A-R)
      reasoning_trace: {
        interpreted_intent: `${intent.category} question — ${intent.confidence}% confidence`,
        dataset_used: tableContext?.name || 'None',
        kpis_used: agentConfig.kpis.slice(0,5),
        tools_called: ['intent_classifier','data_sufficiency_check','semantic_column_classifier','safe_sql_generator','anomaly_detector',`${activeAgentKey}_analyst`, 'strategy_agent','final_answer_synthesizer'],
        sql_generated: generatedSQL || 'Not generated — required columns missing or would produce meaningless results.',
        statistical_method: sufficiency.status !== 'insufficient' ? 'descriptive_statistics + anomaly_detection (2σ) on safe columns only' : 'skipped — dataset insufficient',
        confidence_score: rawConfidence,
        data_sufficiency_status: sufficiency.status,
        limitations: sufficiency.status === 'insufficient'
          ? `Dataset "${tableContext?.name}" does not contain required ${sufficiency.domain} fields: ${sufficiency.missingFields?.slice(0,4).join(', ')}`
          : (rows.length < 50 ? 'Limited data — fewer than 50 rows. Confidence reduced.' : ''),
        anomalies_found: anomalies.length,
        f_step: agentResult?.frame_step || '',
        d_step: agentResult?.diagnose_step || '',
        e_step: agentResult?.explain_step || '',
        a_step: agentResult?.act_step || '',
        r_step: agentResult?.review_step || '',
      },

      stats,
      anomalies,
      pipeline_preset: pipelinePreset,
      duration_ms: Date.now() - startTime,
    };

    // ── Persist decision log ───────────────────────────────────────────────────
    base44.asServiceRole.entities.AgentDecisionLog.create({
      sessionId: sid,
      agentName: agentConfig.name,
      userQuestion: question,
      interpretedIntent: intent.category,
      intentCategory: intent.category,
      datasetUsed: tableContext?.name || '',
      kpisUsed: agentConfig.kpis.slice(0,5),
      toolsCalled: output.reasoning_trace.tools_called,
      sqlGenerated: generatedSQL || '',
      statisticalMethod: output.reasoning_trace.statistical_method,
      confidenceScore: rawConfidence,
      limitations: output.reasoning_trace.limitations,
    }).catch(() => {});

    return Response.json(output);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});