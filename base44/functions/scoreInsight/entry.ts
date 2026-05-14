import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// InsightScore = 0.25×DataQuality + 0.20×MetricConfidence + 0.20×StatisticalStrength + 0.15×SemanticFit + 0.10×SampleSize + 0.10×Freshness
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const {
      answer, tableId, dataQuality = 85, sampleSize = 1000, method = 'statistical',
      metricConfidence, semanticFit, freshnessDays = 0, rowCount, columnCount,
      hasSufficientData = true, hasAnomalies = false,
    } = await req.json();

    if (!answer) return Response.json({ error: 'Missing answer' }, { status: 400 });

    // Component scores (0-100 each)
    const dataQualityScore = Math.min(100, Math.max(0, dataQuality));
    const sampleStrength = Math.min(100, ((rowCount || sampleSize) / 1000) * 100);
    const statisticalStrength = method === 'statistical' ? (hasSufficientData ? 85 : 40) : method === 'ml' ? 90 : 60;
    const metricConfidenceScore = metricConfidence != null ? metricConfidence : (hasSufficientData ? 75 : 35);
    const semanticFitScore = semanticFit != null ? semanticFit : (hasSufficientData ? 80 : 40);
    const freshnessScore = freshnessDays <= 1 ? 95 : freshnessDays <= 7 ? 85 : freshnessDays <= 30 ? 70 : freshnessDays <= 90 ? 55 : 40;

    // Weighted formula
    const overallScore =
      (dataQualityScore    * 0.25) +
      (metricConfidenceScore * 0.20) +
      (statisticalStrength * 0.20) +
      (semanticFitScore    * 0.15) +
      (sampleStrength      * 0.10) +
      (freshnessScore      * 0.10);

    const rounded = Math.round(overallScore);
    const confidence = rounded >= 80 ? 'high' : rounded >= 60 ? 'medium' : rounded >= 40 ? 'low' : 'very_low';

    // Limitations
    const limitations = [];
    if (dataQualityScore < 70) limitations.push(`Data quality is low (${dataQualityScore}%) — results may be biased`);
    if (sampleStrength < 50) limitations.push(`Small sample size (${rowCount || sampleSize} rows) — findings may not generalize`);
    if (!hasSufficientData) limitations.push('Dataset may be missing required fields for this analysis type');
    if (hasAnomalies) limitations.push('Anomalies detected in data — outliers may affect averages');
    if (freshnessDays > 30) limitations.push(`Data is ${freshnessDays} days old — may not reflect current state`);

    // Recommendations to improve score
    const improvements = [];
    if (dataQualityScore < 80) improvements.push('Run Data Quality Studio to clean missing values and fix format issues');
    if (sampleStrength < 60) improvements.push('Upload more data rows to improve statistical confidence');
    if (!hasSufficientData) improvements.push('Add required domain-specific fields (revenue, cost, or user-related columns)');

    return Response.json({
      answer,
      overallScore: rounded,
      confidence,
      breakdown: {
        dataQuality: Math.round(dataQualityScore),
        metricConfidence: Math.round(metricConfidenceScore),
        statisticalStrength: Math.round(statisticalStrength),
        semanticFit: Math.round(semanticFitScore),
        sampleStrength: Math.round(sampleStrength),
        freshness: Math.round(freshnessScore),
      },
      method,
      limitations,
      improvements,
      readyForExecutive: rounded >= 70 && hasSufficientData,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});