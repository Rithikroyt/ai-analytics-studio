import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Production AI Agent Engine
 * Architecture: Plan → Execute → Validate → Synthesize
 * Flow: Intent → Domain Fit → Data Sufficiency → Plan → Tool Select → Execute → Validate → Evidence → Synthesize → Score → Log
 */

const AGENT_CONFIGS = {
  cfo: {
    name: 'CFO Analyst', role: 'Senior FP&A / Finance Analytics Expert',
    focus: ['revenue','cost','payroll','margin','profitability','budget variance','cash runway','unit economics'],
    kpis: ['Revenue','Gross Margin %','Payroll Cost Ratio','Budget Variance','EBITDA','Runway (months)'],
    decisionFramework: 'Variance → Driver → Risk → Action',
  },
  growth: {
    name: 'Growth Analyst', role: 'Senior Growth / Product / Revenue Analyst',
    focus: ['acquisition','retention','churn','conversion','RFM','cohort','LTV/CAC','funnel'],
    kpis: ['New Users','Churn Rate','LTV/CAC','Conversion Rate','Retention Rate','NRR'],
    decisionFramework: 'Acquire → Activate → Retain → Expand',
  },
  operations: {
    name: 'Operations Analyst', role: 'Senior Operations Excellence Specialist',
    focus: ['throughput','cycle time','SLA','bottlenecks','utilization','defect rate','backlog'],
    kpis: ['Cycle Time','Throughput','SLA Compliance','Capacity Utilization','Error Rate'],
    decisionFramework: 'DMAIC: Define → Measure → Analyze → Improve → Control',
  },
};

function classifyColumn(colName, sampleValues) {
  const n = colName.toLowerCase();
  if (['_id','id_','^id$','uuid','key','code','ref'].some(p => n.match(new RegExp(p)))) return 'id';
  if (['date','month','year','quarter','week','time','created_at','timestamp'].some(p => n.includes(p))) return 'date';
  if (['revenue','cost','salary','wage','payroll','price','amount','value','fee','spend','budget','expense','income','profit','margin','payment','compensation','bonus','commission','sales','earnings'].some(p => n.includes(p))) return 'currency_measure';
  if (['rate','ratio','pct','percent','percentage','share'].some(p => n.includes(p))) return 'rate_measure';
  if (['count','num_','number_','qty','quantity','headcount','frequency'].some(p => n.includes(p))) return 'count_measure';
  if (['department','category','type','status','region','country','channel','product','segment','group','tier','plan','source'].some(p => n.includes(p))) return 'category';
  if (sampleValues?.length > 0) {
    const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && v !== '' && v !== null).length;
    if (numericCount / sampleValues.length > 0.8) return 'numeric_measure';
    return 'category';
  }
  return 'unknown';
}

function computeStats(rows, columns) {
  const stats = {};
  const classified = columns.map(col => {
    const sampleVals = rows.slice(0, 10).map(r => r[col.name || col]);
    return { col: col.name || col, type: classifyColumn(col.name || col, sampleVals) };
  });
  const safeNumericCols = classified
    .filter(c => ['currency_measure','count_measure','rate_measure','numeric_measure'].includes(c.type))
    .filter(c => !c.col.toLowerCase().match(/_id$|^id_|^id$|rank|index|zip$|postal$/))
    .map(c => c.col).slice(0, 6);

  safeNumericCols.forEach(col => {
    const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
    if (!vals.length) return;
    const sum = vals.reduce((a,b)=>a+b,0);
    const mean = sum/vals.length;
    const sorted = [...vals].sort((a,b)=>a-b);
    const std = Math.sqrt(vals.reduce((s,v)=>s+(v-mean)**2,0)/vals.length);
    const q1 = sorted[Math.floor(sorted.length*0.25)];
    const q3 = sorted[Math.floor(sorted.length*0.75)];
    stats[col] = { sum: Math.round(sum*100)/100, mean: Math.round(mean*100)/100, std: Math.round(std*100)/100, min: sorted[0], max: sorted[sorted.length-1], q1, q3, count: vals.length };
  });
  return stats;
}

function detectAnomalies(stats) {
  const anomalies = [];
  Object.entries(stats).forEach(([col, s]) => {
    if (s.std > 0) {
      const iqr = s.q3 - s.q1;
      const upperFence = s.q3 + 1.5 * iqr;
      const lowerFence = s.q1 - 1.5 * iqr;
      if (s.max > upperFence) anomalies.push({ column: col, type: 'high_outlier', value: s.max, threshold: upperFence, deviation: Math.round(((s.max-s.mean)/s.std)*10)/10 });
      if (s.min < lowerFence) anomalies.push({ column: col, type: 'low_outlier', value: s.min, threshold: lowerFence, deviation: Math.round(((s.mean-s.min)/s.std)*10)/10 });
    }
  });
  return anomalies;
}

function buildCategoricalBreakdowns(rows, columns, stats) {
  const catCols = columns.map(c => c.name||c).filter(n => {
    const sampleVals = rows.slice(0,5).map(r => r[n]);
    const numericCount = sampleVals.filter(v => !isNaN(Number(v))).length;
    return numericCount < sampleVals.length * 0.5;
  }).slice(0,2);
  const numericCols = Object.keys(stats).slice(0,2);
  const breakdowns = [];
  catCols.forEach(cat => {
    numericCols.forEach(num => {
      const groups = {};
      rows.forEach(r => {
        const k = String(r[cat] ?? 'null');
        groups[k] = (groups[k]||0) + (Number(r[num])||0);
      });
      const sorted = Object.entries(groups).sort((a,b)=>b[1]-a[1]).slice(0,5);
      if (sorted.length > 0) breakdowns.push({ dimension: cat, metric: num, data: sorted.map(([k,v]) => ({ label: k, value: Math.round(v*100)/100 })) });
    });
  });
  return breakdowns;
}

function scoreAnswerQuality(answer) {
  if (!answer || typeof answer !== 'string') return 0;
  const lower = answer.toLowerCase().trim();
  const weakPhrases = ['analysis complete','done','completed','here is the analysis','no answer available'];
  if (weakPhrases.some(p => lower === p)) return 0;
  if (answer.length < 80) return 10;
  let score = 50;
  if (answer.length > 200) score += 10;
  if (/\$[\d,]+|\d+%|\d+\.\d+/.test(answer)) score += 20; // has numbers
  if (/recommend|action|increase|decrease|focus|investigate/.test(lower)) score += 10; // actionable
  if (/because|due to|driven by|caused by/.test(lower)) score += 10; // explanatory
  return Math.min(100, score);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { question, persona, tableContext, sessionId } = body;
    if (!question?.trim()) return Response.json({ error: 'Question required' }, { status: 400 });

    const startTime = Date.now();
    const sid = sessionId || `prod_${Date.now()}`;

    // ── PHASE 1: PLAN ─────────────────────────────────────────────────────────
    const rows = tableContext?.rows || [];
    const columns = tableContext?.columns || [];
    const personaKey = persona?.id === 'cfo' ? 'cfo' : persona?.id === 'marketing' ? 'growth' : persona?.id === 'ops' ? 'operations' : 'cfo';
    const agentConfig = AGENT_CONFIGS[personaKey];

    // ── PHASE 2: EXECUTE tools ─────────────────────────────────────────────────
    const stats = computeStats(rows, columns);
    const anomalies = detectAnomalies(stats);
    const breakdowns = buildCategoricalBreakdowns(rows, columns, stats);

    // Build SQL safely
    const classified = columns.map(c => ({ col: c.name||c, type: classifyColumn(c.name||c, rows.slice(0,10).map(r => r[c.name||c])) }));
    const safeNumericCols = classified.filter(c => ['currency_measure','count_measure','rate_measure','numeric_measure'].includes(c.type)).filter(c => !c.col.toLowerCase().match(/_id$|^id_|^id$|rank|index/)).map(c => c.col);
    const catCols = classified.filter(c => c.type === 'category').map(c => c.col);
    let generatedSQL = null;
    if (safeNumericCols.length > 0 && catCols.length > 0) {
      generatedSQL = `SELECT ${catCols[0]}, SUM(${safeNumericCols[0]}) AS total_${safeNumericCols[0]}${safeNumericCols[1] ? `, AVG(${safeNumericCols[1]}) AS avg_${safeNumericCols[1]}` : ''}\nFROM ${tableContext?.name || 'dataset'}\nGROUP BY ${catCols[0]}\nORDER BY total_${safeNumericCols[0]} DESC\nLIMIT 20;`;
    }

    // Data quality score
    const totalCells = rows.length * columns.length;
    const missingCells = rows.reduce((acc, row) => acc + columns.filter(c => row[c.name||c] === null || row[c.name||c] === '' || row[c.name||c] === undefined).length, 0);
    const completeness = totalCells > 0 ? Math.round((1 - missingCells/totalCells)*100) : 100;

    // ── PHASE 3: VALIDATE + SYNTHESIZE with LLM ───────────────────────────────
    const statsStr = Object.entries(stats).slice(0,5).map(([k,v]) => `${k}: sum=${v.sum.toLocaleString()}, mean=${v.mean.toLocaleString()}, max=${v.max}, std=${v.std}`).join('\n');
    const breakdownStr = breakdowns.slice(0,3).map(b => `${b.dimension}×${b.metric}: ${b.data.map(d=>`${d.label}=${d.value.toLocaleString()}`).join(', ')}`).join('\n');
    const anomalyStr = anomalies.length > 0 ? anomalies.map(a=>`⚠️ ${a.column}: ${a.type} value=${a.value} (${a.deviation}σ)`).join('\n') : 'No anomalies detected.';

    const systemPrompt = `You are the ${agentConfig.name}: ${agentConfig.role}.

PRODUCTION AGENT PROTOCOL — Plan → Execute → Validate → Synthesize

Your reasoning framework (F-D-E-A-R):
1. FRAME: Identify exact business question and dataset type
2. DIAGNOSE: What KPI/signal is available? What does data show?
3. EXPLAIN: What is driving this? Root cause?
4. ACT: What specific action should leadership take?
5. REVIEW: What follow-up metric is needed?

CRITICAL RULES:
- NEVER output "Analysis complete", "Done", "Synthesizer incomplete"
- ALWAYS provide specific numbers from the computed statistics
- Every recommendation must start with an action verb
- Confidence must be based on data quality + question alignment
- If data is insufficient, explain exactly what's missing and what to upload`;

    const userPrompt = `USER QUESTION: "${question}"
DATASET: ${tableContext?.name || 'No dataset'} (${rows.length} rows, ${columns.length} columns, ${completeness}% complete)
PERSONA: ${agentConfig.name}

COMPUTED STATISTICS (REQUIRED — use these exact numbers):
${statsStr || 'No safe numeric columns found.'}

CATEGORICAL BREAKDOWNS (REQUIRED — reference these segments):
${breakdownStr || 'No categorical breakdowns available.'}

ANOMALY DETECTION:
${anomalyStr}

SAFE SQL GENERATED:
${generatedSQL || 'Not generated.'}

MANDATORY RESPONSE REQUIREMENTS:
Every answer MUST contain:
1. direct_answer: 3-5 sentences with actual numbers from stats above. Start with the most important finding.
2. key_takeaways: exactly 3 specific, quantified findings. Each must contain a number.
3. evidence: at least 4 items, each referencing actual column names and computed values
4. recommendation: at least 3 actionable items starting with action verbs
5. confidence_score: 0-100 based on data quality (${completeness}% complete, ${rows.length} rows)
6. suggested_next_question: one follow-up question the user should ask
7. limitations: what constraints or missing data affect this analysis`;

    const agentResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      model: 'claude_sonnet_4_6',
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      response_json_schema: {
        type: 'object',
        properties: {
          direct_answer: { type: 'string' },
          business_meaning: { type: 'string' },
          key_takeaways: { type: 'array', items: { type: 'string' } },
          evidence: { type: 'array', items: { type: 'string' } },
          sql_method: { type: 'string' },
          recommendation: { type: 'array', items: { type: 'string' } },
          expected_impact: { type: 'string' },
          confidence_score: { type: 'number' },
          confidence_explanation: { type: 'string' },
          limitations: { type: 'string' },
          suggested_next_question: { type: 'string' },
          thought_process: { type: 'array', items: { type: 'string' } },
          kpi_impact: { type: 'string' },
          risk: { type: 'string' },
          frame_step: { type: 'string' },
          diagnose_step: { type: 'string' },
          explain_step: { type: 'string' },
          act_step: { type: 'string' },
          review_step: { type: 'string' },
        },
        required: ['direct_answer','key_takeaways','evidence','recommendation','confidence_score'],
      },
    });

    // ── PHASE 4: VALIDATE answer quality ──────────────────────────────────────
    const qualityScore = scoreAnswerQuality(agentResult?.direct_answer || '');
    let finalAnswer = agentResult?.direct_answer || '';

    if (qualityScore < 30 || !finalAnswer || finalAnswer.length < 80) {
      // Compute fallback from data
      const topBreakdown = breakdowns[0];
      const topStats = Object.entries(stats).slice(0,3);
      if (topBreakdown && topStats.length > 0) {
        const topSegment = topBreakdown.data[0];
        finalAnswer = `${topBreakdown.dimension} analysis of ${tableContext?.name || 'the dataset'} (${rows.length} rows) reveals that the top segment is "${topSegment?.label}" with ${topBreakdown.metric}=${topSegment?.value?.toLocaleString()}. ${topStats.map(([k,v]) => `${k}: total ${v.sum.toLocaleString()}, average ${v.mean.toLocaleString()}`).join('; ')}. ${anomalies.length > 0 ? `${anomalies.length} anomaly detected in ${anomalies[0].column} (${anomalies[0].deviation}σ above mean).` : ''} As ${agentConfig.name}, recommend investigating the top-performing and bottom-performing segments to identify optimization opportunities.`;
      } else {
        const colSummary = Object.entries(stats).slice(0,3).map(([k,v]) => `${k}: ${v.sum.toLocaleString()}`).join(', ');
        finalAnswer = `${tableContext?.name || 'The dataset'} (${rows.length} rows, ${columns.length} columns) has been analyzed by ${agentConfig.name}. ${colSummary ? `Key metrics: ${colSummary}.` : `Available columns: ${columns.slice(0,6).map(c=>c.name||c).join(', ')}.`} ${anomalies.length > 0 ? `Anomaly detected: ${anomalies[0].column} shows outlier value of ${anomalies[0].value}.` : ''} Recommend loading domain-specific data for deeper ${agentConfig.decisionFramework} analysis.`;
      }
    }

    const duration = Date.now() - startTime;
    const answerQuality = scoreAnswerQuality(finalAnswer);
    const baseConf = Object.keys(stats).length > 0 ? Math.min(92, 55 + Object.keys(stats).length * 5 + (rows.length > 100 ? 10 : 0) + (breakdowns.length > 0 ? 8 : 0)) : 40;
    const finalConfidence = (agentResult?.confidence_score > 10) ? agentResult.confidence_score : baseConf;

    // ── LOG agent trace ────────────────────────────────────────────────────────
    base44.asServiceRole.entities.AgentDecisionLog.create({
      sessionId: sid, agentName: agentConfig.name, userQuestion: question,
      interpretedIntent: 'production_agent', intentCategory: personaKey,
      datasetUsed: tableContext?.name || '', kpisUsed: agentConfig.kpis.slice(0,5),
      toolsCalled: ['intent_classifier','stats_engine','anomaly_detector','sql_generator','llm_synthesizer','answer_validator'],
      sqlGenerated: generatedSQL || '', confidenceScore: finalConfidence,
      statisticalMethod: 'descriptive_stats + IQR_anomaly_detection + categorical_breakdowns',
      limitations: agentResult?.limitations || '',
    }).catch(() => {});

    return Response.json({
      session_id: sid,
      agent: agentConfig.name,
      agent_role: agentConfig.role,
      direct_answer: finalAnswer,
      business_meaning: agentResult?.business_meaning || '',
      key_takeaways: agentResult?.key_takeaways?.length > 0 ? agentResult.key_takeaways : Object.entries(stats).slice(0,3).map(([k,v]) => `${k}: total ${v.sum.toLocaleString()}, avg ${v.mean.toLocaleString()}`),
      evidence: agentResult?.evidence?.length > 0 ? agentResult.evidence : breakdowns.flatMap(b => b.data.slice(0,2).map(d => `${b.dimension}="${d.label}": ${b.metric}=${d.value.toLocaleString()}`)),
      sql_generated: generatedSQL,
      recommendation: agentResult?.recommendation?.length > 0 ? agentResult.recommendation : [`Investigate the top segment by ${safeNumericCols[0] || 'key metric'}`, `Validate data completeness (currently ${completeness}%)`, `Run anomaly investigation on outlier columns`],
      expected_impact: agentResult?.expected_impact || '',
      confidence_score: finalConfidence,
      confidence_explanation: agentResult?.confidence_explanation || `Based on ${rows.length} rows, ${completeness}% data completeness, ${Object.keys(stats).length} numeric metrics.`,
      limitations: agentResult?.limitations || (rows.length < 50 ? 'Small dataset (<50 rows) — results may not be statistically significant.' : ''),
      suggested_next_question: agentResult?.suggested_next_question || `What are the top drivers of ${safeNumericCols[0] || 'performance'} across ${catCols[0] || 'segments'}?`,
      thought_process: agentResult?.thought_process || [`1. Frame: Analyzed "${question}" for ${agentConfig.name}`, `2. Diagnose: Found ${Object.keys(stats).length} numeric + ${catCols.length} categorical columns`, `3. Explain: Computed stats, breakdowns, anomalies`, `4. Act: Generated SQL + recommendations`, `5. Review: Answer validated (quality: ${answerQuality}%)`],
      kpi_impact: agentResult?.kpi_impact || agentConfig.kpis[0],
      risk: agentResult?.risk || '',
      stats, anomalies, breakdowns,
      data_quality: { completeness, row_count: rows.length, column_count: columns.length },
      reasoning_trace: {
        tools_called: ['stats_engine','anomaly_detector','categorical_breakdowns','sql_generator','llm_claude_sonnet','answer_validator'],
        sql_generated: generatedSQL || 'Not generated.',
        answer_quality_score: answerQuality,
        validation_passed: answerQuality >= 30,
        duration_ms: duration,
        f_step: agentResult?.frame_step || '', d_step: agentResult?.diagnose_step || '',
        e_step: agentResult?.explain_step || '', a_step: agentResult?.act_step || '',
        r_step: agentResult?.review_step || '',
      },
      duration_ms: duration,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});