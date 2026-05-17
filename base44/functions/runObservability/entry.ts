import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Observability & Evaluation Engine
 * Tracks: agent traces, tool calls, answer quality, latency, cost, SQL success rate
 * Answer Quality = 0.25*Relevance + 0.25*Evidence + 0.20*Completeness + 0.15*Actionability + 0.15*Clarity
 */

function scoreAnswerQuality(answer, evidence, recommendations) {
  if (!answer) return { total: 0, breakdown: {} };

  const hasNumbers = /\$[\d,]+|\d+%|\d+\.\d+|\d{3,}/.test(answer);
  const hasActionable = /recommend|action|increase|decrease|focus|invest|reduce|improve|implement|prioritize/.test(answer?.toLowerCase() || '');
  const hasCause = /because|due to|driven by|caused by|results from|explains/.test(answer?.toLowerCase() || '');

  const relevance = Math.min(100, (answer?.length > 100 ? 60 : 30) + (hasNumbers ? 40 : 0));
  const evidenceScore = evidence?.length > 3 ? 80 : evidence?.length > 1 ? 60 : evidence?.length > 0 ? 40 : 20;
  const completeness = Math.min(100, (answer?.length || 0) / 5);
  const actionability = hasActionable ? (recommendations?.length > 2 ? 90 : 70) : (recommendations?.length > 0 ? 50 : 20);
  const clarity = hasCause ? 80 : 60;

  const total = Math.round(0.25*relevance + 0.25*evidenceScore + 0.20*completeness + 0.15*actionability + 0.15*clarity);

  return { total, breakdown: { relevance, evidence: evidenceScore, completeness: Math.round(completeness), actionability, clarity } };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { action } = body;

    // ── Log agent trace ────────────────────────────────────────────────────────
    if (action === 'log_trace') {
      const { sessionId, agentName, question, answer, evidence, recommendations, toolsCalled, durationMs, sqlSuccess, confidenceScore } = body;
      const quality = scoreAnswerQuality(answer, evidence, recommendations);

      await base44.asServiceRole.entities.AgentTrace.create({
        sessionId: sessionId || `trace_${Date.now()}`,
        agentName: agentName || 'Unknown',
        userQuestion: question || '',
        finalAnswer: answer || '',
        toolsCalled: toolsCalled || [],
        durationMs: durationMs || 0,
        sqlSuccess: sqlSuccess ?? true,
        confidenceScore: confidenceScore || 0,
        answerQualityScore: quality.total,
        qualityBreakdown: quality.breakdown,
        userEmail: user.email,
        timestamp: new Date().toISOString(),
      });

      return Response.json({ success: true, qualityScore: quality.total, breakdown: quality.breakdown });
    }

    // ── Get observability dashboard ────────────────────────────────────────────
    if (action === 'dashboard') {
      if (user.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

      const [traces, pipelineRuns, errors] = await Promise.all([
        base44.asServiceRole.entities.AgentTrace.list('-created_date', 100),
        base44.asServiceRole.entities.PipelineRun.list('-created_date', 50),
        base44.asServiceRole.entities.AppErrorLog.list('-created_date', 50),
      ]);

      const avgQuality = traces.length > 0 ? Math.round(traces.reduce((a,t) => a + (t.answerQualityScore||0), 0) / traces.length) : 0;
      const avgLatency = traces.length > 0 ? Math.round(traces.reduce((a,t) => a + (t.durationMs||0), 0) / traces.length) : 0;
      const sqlSuccessRate = traces.length > 0 ? Math.round(traces.filter(t => t.sqlSuccess).length / traces.length * 100) : 0;
      const highConfidence = traces.filter(t => (t.confidenceScore||0) >= 70).length;
      const lowConfidence = traces.filter(t => (t.confidenceScore||0) < 50).length;

      // By agent
      const byAgent = {};
      traces.forEach(t => {
        if (!byAgent[t.agentName]) byAgent[t.agentName] = { count: 0, totalQuality: 0, totalLatency: 0 };
        byAgent[t.agentName].count++;
        byAgent[t.agentName].totalQuality += t.answerQualityScore||0;
        byAgent[t.agentName].totalLatency += t.durationMs||0;
      });
      const agentMetrics = Object.entries(byAgent).map(([name, d]) => ({
        agent: name, count: d.count,
        avgQuality: Math.round(d.totalQuality / d.count),
        avgLatencyMs: Math.round(d.totalLatency / d.count),
      }));

      // Daily trends (last 7 days)
      const dailyMap = {};
      traces.forEach(t => {
        const day = (t.created_date || t.timestamp || '').slice(0,10);
        if (!dailyMap[day]) dailyMap[day] = { count: 0, totalQuality: 0 };
        dailyMap[day].count++;
        dailyMap[day].totalQuality += t.answerQualityScore||0;
      });
      const dailyTrends = Object.entries(dailyMap).sort().slice(-7).map(([date, d]) => ({ date, count: d.count, avgQuality: Math.round(d.totalQuality/d.count) }));

      // Pipeline success rate
      const pipelineSuccessRate = pipelineRuns.length > 0 ? Math.round(pipelineRuns.filter(r => r.status === 'success').length / pipelineRuns.length * 100) : 100;

      return Response.json({
        summary: {
          totalTraces: traces.length,
          avgAnswerQuality: avgQuality,
          avgLatencyMs: avgLatency,
          sqlSuccessRate,
          highConfidenceAnswers: highConfidence,
          lowConfidenceAnswers: lowConfidence,
          pipelineSuccessRate,
          recentErrors: errors.filter(e => !e.resolved).length,
        },
        agentMetrics,
        dailyTrends,
        recentTraces: traces.slice(0, 20).map(t => ({
          id: t.id, agent: t.agentName, question: t.userQuestion?.slice(0,80),
          quality: t.answerQualityScore, latency: t.durationMs,
          confidence: t.confidenceScore, timestamp: t.created_date || t.timestamp,
        })),
        pipelineRuns: pipelineRuns.slice(0, 10),
      });
    }

    // ── Score a single answer ──────────────────────────────────────────────────
    if (action === 'score') {
      const { answer, evidence, recommendations } = body;
      const quality = scoreAnswerQuality(answer, evidence, recommendations);
      return Response.json(quality);
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});