import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { answer, tableId, dataQuality = 85, sampleSize = 1000, method = 'statistical' } = await req.json();

    if (!answer) {
      return Response.json({ error: 'Missing answer' }, { status: 400 });
    }

    // Scoring formula:
    // InsightScore = 0.30 × DataQuality + 0.25 × SampleStrength + 0.20 × StatisticalStrength + 0.15 × BusinessRelevance + 0.10 × Freshness

    const sampleStrength = Math.min(100, (sampleSize / 1000) * 100);
    const statisticalStrength = method === 'statistical' ? 85 : 60;
    const businessRelevance = 80; // Would be computed from NLP on answer
    const freshness = 90; // Would check data age

    const overallScore = 
      (dataQuality * 0.30) +
      (sampleStrength * 0.25) +
      (statisticalStrength * 0.20) +
      (businessRelevance * 0.15) +
      (freshness * 0.10);

    return Response.json({
      answer,
      overallScore: Math.round(overallScore),
      dataQuality,
      sampleStrength: Math.round(sampleStrength),
      statisticalStrength,
      businessRelevance,
      freshness,
      method,
      confidence: overallScore >= 80 ? 'high' : overallScore >= 60 ? 'medium' : 'low',
      limitations: [
        `Sample size: ${sampleSize} records`,
        `Data quality: ${dataQuality}%`,
        `Method: ${method}`,
      ],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});