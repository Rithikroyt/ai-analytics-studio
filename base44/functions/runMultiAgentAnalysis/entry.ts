import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { question, persona, tableContext } = await req.json();

    if (!question) return Response.json({ error: 'Missing question' }, { status: 400 });

    const personaPrompt = persona
      ? `You are a ${persona.role} in the ${persona.department} department. ${persona.systemInstructions || ''} Your tone is ${persona.personality || 'professional and data-driven'}. Focus on: ${(persona.focusMetrics || []).join(', ') || 'all key metrics'}.`
      : 'You are a senior data analyst with broad business expertise.';

    const colSummary = (tableContext?.columns || []).slice(0, 15).map(c => `${c.name}(${c.inferredType || c.type})`).join(', ');

    // Agent 1: SQL Generator
    const sqlAgent = base44.integrations.Core.InvokeLLM({
      prompt: `${personaPrompt}

ROLE: SQL Generator Agent
Generate the best SQL query to answer: "${question}"
Table: ${tableContext?.name || 'dataset'} with ${tableContext?.rowCount || 0} rows
Columns: ${colSummary}

Return JSON: {"sql": "...", "explanation": "...", "chartType": "bar|line|area|pie"}`,
      response_json_schema: {
        type: 'object',
        properties: {
          sql: { type: 'string' },
          explanation: { type: 'string' },
          chartType: { type: 'string' },
        },
      },
    });

    // Agent 2: Business Context Agent
    const contextAgent = base44.integrations.Core.InvokeLLM({
      prompt: `${personaPrompt}

ROLE: Business Context Agent
Provide deep business context for this question: "${question}"
Dataset: ${tableContext?.name || 'dataset'}

Return JSON: {
  "businessContext": "why this question matters",
  "keyRisks": ["risk1", "risk2"],
  "relatedKPIs": ["kpi1", "kpi2"],
  "industryBenchmark": "relevant benchmark if known"
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          businessContext: { type: 'string' },
          keyRisks: { type: 'array', items: { type: 'string' } },
          relatedKPIs: { type: 'array', items: { type: 'string' } },
          industryBenchmark: { type: 'string' },
        },
      },
    });

    // Agent 3: Recommendation Agent
    const recAgent = base44.integrations.Core.InvokeLLM({
      prompt: `${personaPrompt}

ROLE: Strategic Recommendation Agent
Based on the question: "${question}"
Dataset: ${tableContext?.name}, ${tableContext?.rowCount} rows

Generate 3 specific, actionable strategic recommendations.
Return JSON: {
  "recommendations": [{"action": "...", "expectedImpact": "...", "priority": "high|medium|low", "timeframe": "..."}],
  "quickWins": ["quick win 1", "quick win 2"],
  "longerTermStrategy": "..."
}`,
      response_json_schema: {
        type: 'object',
        properties: {
          recommendations: { type: 'array', items: { type: 'object' } },
          quickWins: { type: 'array', items: { type: 'string' } },
          longerTermStrategy: { type: 'string' },
        },
      },
    });

    // Run all 3 agents in parallel
    const [sqlResult, contextResult, recResult] = await Promise.all([sqlAgent, contextAgent, recAgent]);

    // Agent 4: Synthesizer Agent (depends on outputs of 1-3)
    const synthesis = await base44.integrations.Core.InvokeLLM({
      prompt: `${personaPrompt}

ROLE: Chief Synthesis Agent
Synthesize the outputs from 3 specialized agents into a unified executive answer.

Question: "${question}"
SQL Agent found: ${sqlResult?.explanation || ''}
Business Context: ${contextResult?.businessContext || ''}
Recommendations: ${JSON.stringify(recResult?.recommendations?.slice(0, 2) || [])}

Write a cohesive 4-6 sentence executive summary that integrates all findings. Be specific, data-driven, and actionable.`,
    });

    return Response.json({
      ok: true,
      question,
      persona: persona?.name || 'Default Analyst',
      agents: {
        sqlAgent: sqlResult,
        contextAgent: contextResult,
        recAgent: recResult,
      },
      synthesis,
      executedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});