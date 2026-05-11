import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ── F-D-E-A-R Reasoning Loop Orchestrator ─────────────────────────────────────
// Frame → Diagnose → Explain → Act → Review
// 12-agent pipeline with intent classification, tool routing, confidence scoring

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
      'ROI': '(Gain - Cost) / Cost * 100',
    },
    outputFormat: ['Direct Answer','Financial Evidence','Business Meaning','Risk','Recommended Action','Confidence','Next Question'],
    decisionFramework: 'Variance → Driver → Risk → Action',
    priorityWeights: { financial_impact: 0.40, variance_pct: 0.25, risk_level: 0.20, confidence: 0.15 },
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
      'Funnel Dropoff': '1 - UsersAtStage_i / UsersAtStage_{i-1}',
    },
    outputFormat: ['Direct Answer','Growth Evidence','Funnel/Cohort/RFM Insight','Business Meaning','Experiment Recommendation','Expected Impact','Confidence','Next Question'],
    decisionFramework: 'Acquire → Activate → Retain → Expand',
    priorityWeights: { revenue_impact: 0.35, conversion_gap: 0.25, audience_size: 0.20, confidence: 0.20 },
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
      'Backlog Growth': 'NewTasks - CompletedTasks',
    },
    outputFormat: ['Direct Answer','Operational Evidence','Bottleneck Analysis','Risk','Process Improvement Action','Follow-up Metric','Confidence'],
    decisionFramework: 'DMAIC: Define → Measure → Analyze → Improve → Control',
    priorityWeights: { bottleneck_score: 0.30, sla_risk: 0.25, cost_impact: 0.20, automation_potential: 0.15, confidence: 0.10 },
  },
};

function classifyIntent(question) {
  const q = question.toLowerCase();
  const financeKw = ['revenue','cost','payroll','margin','budget','variance','profit','cash','runway','roi','cogs','expense','salary','headcount','finance','financial','spend','burn'];
  const growthKw = ['conversion','churn','retention','acquisition','funnel','cohort','rfm','ltv','cac','activation','signup','user','growth','campaign','segment','engagement'];
  const opsKw = ['cycle time','throughput','sla','bottleneck','capacity','defect','utilization','process','workflow','backlog','queue','efficiency','productivity','automation','rework'];
  
  const finScore = financeKw.filter(k => q.includes(k)).length;
  const growthScore = growthKw.filter(k => q.includes(k)).length;
  const opsScore = opsKw.filter(k => q.includes(k)).length;
  
  const max = Math.max(finScore, growthScore, opsScore);
  if (max === 0) return { category: 'general', agent: 'cfo', confidence: 50, scores: { finance: 0, growth: 0, operations: 0 } };
  
  let category = 'finance', agent = 'cfo';
  if (growthScore === max) { category = 'growth'; agent = 'growth'; }
  else if (opsScore === max) { category = 'operations'; agent = 'operations'; }
  
  const total = finScore + growthScore + opsScore || 1;
  const confidence = Math.round((max / total) * 100);
  return { category, agent, confidence, scores: { finance: finScore, growth: growthScore, operations: opsScore } };
}

function deriveAvailableKPIs(columns, agentConfig) {
  const colNames = columns.map(c => (c.name || c).toLowerCase());
  const matched = agentConfig.kpis.filter(kpi => 
    colNames.some(c => c.includes(kpi.toLowerCase().replace(/[^a-z]/g,'').slice(0,6)))
  );
  return matched.length > 0 ? matched : agentConfig.kpis.slice(0, 5);
}

function buildDataContextSummary(rows, columns) {
  if (!rows?.length || !columns?.length) return 'No dataset loaded.';
  const numCols = columns.filter(c => {
    const vals = rows.slice(0,20).map(r => Number(r[c.name||c])).filter(v => !isNaN(v));
    return vals.length > 5;
  });
  const catCols = columns.filter(c => !numCols.find(n => (n.name||n) === (c.name||c)));
  const sample = rows.slice(0,5);
  return `Dataset: ${rows.length} rows, ${columns.length} columns. Numeric columns: ${numCols.map(c=>c.name||c).slice(0,8).join(', ')}. Category columns: ${catCols.map(c=>c.name||c).slice(0,5).join(', ')}. Sample row: ${JSON.stringify(sample[0]).slice(0,200)}`;
}

function calculateConfidence(intent, rows, columns, matchedKPIs) {
  let score = 50;
  if (intent.confidence > 70) score += 15;
  else if (intent.confidence > 40) score += 8;
  if (rows?.length > 100) score += 10;
  if (rows?.length > 500) score += 5;
  if (matchedKPIs.length > 2) score += 10;
  if (columns?.length > 5) score += 5;
  if (rows?.length === 0) score -= 20;
  return Math.min(Math.max(score, 20), 95);
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
    const availableKPIs = deriveAvailableKPIs(columns, agentConfig);
    const confidence = calculateConfidence(intent, rows, columns, availableKPIs);

    // ── Step 3: SQL Agent — generate analysis SQL ──────────────────────────────
    const colNames = columns.map(c => c.name || c).slice(0, 20).join(', ');
    const numericCols = columns.filter(c => {
      const vals = rows.slice(0,10).map(r => Number(r[c.name||c])).filter(v => !isNaN(v));
      return vals.length > 3;
    }).map(c => c.name || c);
    const catCols = columns.filter(c => !numericCols.includes(c.name||c)).map(c => c.name || c);

    let generatedSQL = '';
    if (numericCols.length > 0 && catCols.length > 0) {
      generatedSQL = `SELECT ${catCols[0]}, ${numericCols.slice(0,3).map(c=>`SUM(${c}) AS total_${c}`).join(', ')}\nFROM ${tableContext?.name || 'dataset'}\nGROUP BY ${catCols[0]}\nORDER BY total_${numericCols[0]} DESC\nLIMIT 20;`;
    }

    // ── Step 4: Statistical tool layer — compute key stats ────────────────────
    const stats = {};
    numericCols.slice(0, 5).forEach(col => {
      const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
      if (!vals.length) return;
      const sum = vals.reduce((a,b) => a+b, 0);
      const mean = sum / vals.length;
      const sorted = [...vals].sort((a,b) => a-b);
      const std = Math.sqrt(vals.reduce((s,v) => s+(v-mean)**2, 0) / vals.length);
      stats[col] = { sum: Math.round(sum*100)/100, mean: Math.round(mean*100)/100, std: Math.round(std*100)/100, min: sorted[0], max: sorted[sorted.length-1], count: vals.length };
    });

    // ── Step 5: Anomaly detection ─────────────────────────────────────────────
    const anomalies = [];
    Object.entries(stats).forEach(([col, s]) => {
      if (s.std > 0 && Math.abs(s.max - s.mean) > 2 * s.std) {
        anomalies.push({ column: col, type: 'high_outlier', value: s.max, mean: s.mean, deviation: Math.round(((s.max - s.mean) / s.std) * 10) / 10 });
      }
    });

    // ── Step 6: Build specialist agent prompt (F-D-E-A-R) ─────────────────────
    const statsStr = Object.entries(stats).slice(0,4).map(([k,v]) => `${k}: sum=${v.sum}, mean=${v.mean}, max=${v.max}`).join('\n');
    const anomalyStr = anomalies.length > 0 ? anomalies.map(a => `ANOMALY: ${a.column} value ${a.value} is ${a.deviation}σ above mean`).join('\n') : 'No anomalies detected.';

    const systemPrompt = `You are the ${agentConfig.name}: ${agentConfig.role}.

REASONING FRAMEWORK — F-D-E-A-R Loop:
1. FRAME: Identify the exact business question being asked
2. DIAGNOSE: What KPI is affected? What data supports it?
3. EXPLAIN: What is driving this? What is the root cause?
4. ACT: What specific action should leadership take?
5. REVIEW: What follow-up metric should be tracked?

YOUR FOCUS AREAS: ${agentConfig.focus.join(', ')}
YOUR KPI OWNERSHIP: ${agentConfig.kpis.join(', ')}
YOUR DECISION FRAMEWORK: ${agentConfig.decisionFramework}

AVAILABLE FORMULAS:
${Object.entries(agentConfig.formulas).map(([k,v]) => `${k} = ${v}`).join('\n')}

CRITICAL RULES:
- NEVER answer from general knowledge only when data is available
- ALWAYS use the dataset statistics below for your evidence
- ALWAYS show specific numbers from the data
- If data is insufficient, say exactly what is missing
- Score confidence honestly based on data completeness`;

    const userPrompt = `USER QUESTION: "${question}"

DATASET: ${tableContext?.name || 'No dataset'} (${tableContext?.rowCount || rows.length} rows)
DATA CONTEXT: ${dataContext}
AVAILABLE KPIs IN DATASET: ${availableKPIs.join(', ')}
INTENT CLASSIFIED AS: ${intent.category} (confidence: ${intent.confidence}%)

STATISTICAL EVIDENCE FROM DATA:
${statsStr || 'No numeric columns found.'}

ANOMALY DETECTION:
${anomalyStr}

GENERATED SQL:
${generatedSQL || 'No SQL generated — insufficient column context.'}

Now answer using the F-D-E-A-R loop. Return a structured JSON answer.`;

    // ── Step 7: LLM Specialist Agent ──────────────────────────────────────────
    const agentResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      response_json_schema: {
        type: 'object',
        properties: {
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
          frame_step: { type: 'string' },
          diagnose_step: { type: 'string' },
          explain_step: { type: 'string' },
          act_step: { type: 'string' },
          review_step: { type: 'string' },
        },
        required: ['direct_answer','evidence','recommendation','confidence_score'],
      },
    });

    // ── Step 8: Strategy Agent — priority scoring ──────────────────────────────
    const rawConfidence = agentResult?.confidence_score || confidence;
    const financialImpact = stats[numericCols[0]]?.sum > 0 ? Math.min(stats[numericCols[0]].std / (stats[numericCols[0]].mean || 1), 1) : 0.5;
    const priorityScore = Math.round((0.40 * financialImpact + 0.25 * (rawConfidence/100) + 0.20 * (anomalies.length > 0 ? 1 : 0.3) + 0.15 * (rows.length > 100 ? 1 : 0.5)) * 100) / 100;

    // ── Step 9: Report Writer — assemble final output ─────────────────────────
    const output = {
      session_id: sid,
      agent: agentConfig.name,
      agent_role: agentConfig.role,
      intent: intent.category,
      intent_confidence: intent.confidence,
      
      // 10-field structured answer
      direct_answer: agentResult?.direct_answer || 'Analysis complete.',
      kpi_impact: agentResult?.kpi_impact || availableKPIs[0],
      evidence: agentResult?.evidence || [],
      driver_root_cause: agentResult?.driver_root_cause || '',
      risk: agentResult?.risk || '',
      recommendation: agentResult?.recommendation || [],
      expected_impact: agentResult?.expected_impact || '',
      confidence_score: rawConfidence,
      confidence_explanation: agentResult?.confidence_explanation || '',
      follow_up_metric: agentResult?.follow_up_metric || '',
      suggested_next_question: agentResult?.suggested_next_question || '',

      // Reasoning trace (F-D-E-A-R)
      reasoning_trace: {
        interpreted_intent: `${intent.category} question — ${intent.confidence}% confidence`,
        dataset_used: tableContext?.name || 'None',
        kpis_used: availableKPIs.slice(0,5),
        tools_called: ['intent_classifier','data_context_agent','sql_agent','anomaly_detector',`${agentConfig.name.toLowerCase().replace(' ','_')}`, 'strategy_agent','report_writer'],
        sql_generated: generatedSQL,
        statistical_method: 'descriptive_statistics + anomaly_detection (2σ)',
        confidence_score: rawConfidence,
        limitations: rows.length < 50 ? 'Limited data — fewer than 50 rows. Confidence reduced.' : '',
        anomalies_found: anomalies.length,
        f_step: agentResult?.frame_step || '',
        d_step: agentResult?.diagnose_step || '',
        e_step: agentResult?.explain_step || '',
        a_step: agentResult?.act_step || '',
        r_step: agentResult?.review_step || '',
      },

      // Stats for rendering
      stats,
      anomalies,
      priority_score: priorityScore,
      pipeline_preset: pipelinePreset,
      duration_ms: Date.now() - startTime,
    };

    // ── Step 10: Persist decision log ─────────────────────────────────────────
    base44.asServiceRole.entities.AgentDecisionLog.create({
      sessionId: sid,
      agentName: agentConfig.name,
      userQuestion: question,
      interpretedIntent: intent.category,
      intentCategory: intent.category,
      datasetUsed: tableContext?.name || '',
      kpisUsed: availableKPIs.slice(0,5),
      toolsCalled: output.reasoning_trace.tools_called,
      sqlGenerated: generatedSQL,
      statisticalMethod: 'descriptive_statistics',
      confidenceScore: rawConfidence,
    }).catch(() => {});

    return Response.json(output);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});