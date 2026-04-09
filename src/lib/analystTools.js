/**
 * Analyst Tools Orchestration
 * Helpers to structure and load analysis outputs for the AI Analyst Agent
 * Maps raw analysis data into tool responses the agent can reason about
 */

// ── KPI Summary Tool ────────────────────────────────────────────
export function buildKPISummary(analysisResults, table) {
  if (!analysisResults || !table) return null;
  return {
    primary_kpi: analysisResults.primaryLabel || 'Unknown',
    primary_value: analysisResults.totalValue,
    primary_change: analysisResults.growthRate != null ? `${analysisResults.growthRate}%` : 'N/A',
    secondary_kpi: analysisResults.secondLabel || null,
    secondary_value: analysisResults.secondValue || null,
    top_segment: analysisResults.breakdownData?.[0]?.name || 'N/A',
    top_segment_value: analysisResults.breakdownData?.[0]?.value || 0,
    quality_score: table.qualityScore || 0,
    anomaly_count: analysisResults.anomalies?.length || 0,
    forecast_available: analysisResults.canForecast || false,
    key_findings: analysisResults.keyFindings || [],
  };
}

// ── Descriptive Story Tool ─────────────────────────────────────
export function buildDescriptiveStory(analysisResults) {
  if (!analysisResults) return null;
  return {
    what_happened: analysisResults.executiveSummary || 'Data has been prepared and profiled.',
    why_it_happened: analysisResults.correlations?.slice(0, 3).map(c => `${c.colA} and ${c.colB} are correlated (r=${c.r})`) || [],
    where_risk_is: analysisResults.anomalies?.slice(0, 3).map(a => `${a.date}: ${a.severity} anomaly (z=${a.zScore}σ)`) || [],
    what_to_do_next: analysisResults.recommendations?.slice(0, 3).map(r => r.action) || [],
  };
}

// ── Data Quality Audit Tool ────────────────────────────────────
export function buildQualityAudit(table) {
  if (!table) return null;
  const colStats = table.columns?.map(col => ({
    name: col.name,
    type: col.type,
    missing_percent: col.missingPct || 0,
    unique_count: col.uniqueCount || 0,
    high_cardinality: col.uniqueCount > table.rowCount * 0.5,
  })) || [];

  const issues = table.issues?.map(i => ({
    severity: i.severity || 'medium',
    message: i.message,
    affected_columns: i.affectedColumns || [],
  })) || [];

  return {
    overall_score: table.qualityScore || 0,
    row_count: table.rowCount || 0,
    duplicate_count: table.duplicateCount || 0,
    missing_value_columns: colStats.filter(c => c.missing_percent > 0),
    high_cardinality_columns: colStats.filter(c => c.high_cardinality),
    quality_issues: issues,
    recommended_actions: [
      ...colStats.filter(c => c.missing_percent > 20).map(c => `Investigate missing values in ${c.name} (${c.missing_percent}%)`),
      ...issues.slice(0, 2).map(i => `Address ${i.severity} issue: ${i.message}`),
    ],
  };
}

// ── Anomaly Results Tool ───────────────────────────────────────
export function buildAnomalyResults(analysisResults) {
  if (!analysisResults?.anomalies?.length) {
    return {
      total_anomalies: 0,
      severity_breakdown: {},
      anomaly_list: [],
      recommendation: 'No anomalies detected — data is within normal bounds.',
    };
  }

  const byseverity = {};
  analysisResults.anomalies.forEach(a => {
    byseverity[a.severity] = (byseverity[a.severity] || 0) + 1;
  });

  return {
    total_anomalies: analysisResults.anomalies.length,
    severity_breakdown: byseverity,
    anomaly_list: analysisResults.anomalies.slice(0, 10).map(a => ({
      date: a.date,
      value: a.value,
      expected: a.expected,
      z_score: a.zScore,
      severity: a.severity,
      deviation_pct: ((a.value - a.expected) / a.expected * 100).toFixed(1) + '%',
    })),
    high_severity_count: (byseverity.high || 0) + (byseverity.critical || 0),
    recommendation: (byseverity.critical || 0) > 0 ? 'Critical anomalies detected — investigate immediately.' : 'Anomalies detected — review and prioritize by severity.',
  };
}

// ── Forecast Results Tool ──────────────────────────────────────
export function buildForecastResults(analysisResults) {
  if (!analysisResults?.canForecast || !analysisResults?.forecastData?.length) {
    return {
      available: false,
      reason: 'No date column detected or insufficient historical data for forecasting.',
    };
  }

  const forecast = analysisResults.forecastData.slice(0, 6);
  const trend = forecast[forecast.length - 1]?.value > forecast[0]?.value ? 'upward' : 'downward';

  return {
    available: true,
    forecast_periods: forecast.map(f => ({
      date: f.date,
      forecasted_value: f.value,
      confidence: f.confidence || 'medium',
    })),
    trend_direction: trend,
    forecast_assumption: 'Based on historical trend and seasonality patterns.',
    key_insight: `Forecast suggests ${trend} trend. Use with caution — external factors not in data can affect actual outcomes.`,
  };
}

// ── Chart Spec Generator ───────────────────────────────────────
export function buildChartSpec(question, analysisResults, table) {
  if (!analysisResults) return null;

  const questionLower = question.toLowerCase();

  // Trend chart
  if (questionLower.includes('trend') && analysisResults.trendData?.length) {
    return {
      type: 'line',
      title: `${analysisResults.primaryLabel} Trend Over Time`,
      data: analysisResults.trendData.map(d => ({ date: d.date, value: d.value })),
      x_key: 'date',
      y_key: 'value',
      height: 280,
    };
  }

  // Segment/breakdown
  if ((questionLower.includes('segment') || questionLower.includes('breakdown')) && analysisResults.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${analysisResults.primaryLabel} by ${analysisResults.primaryDimension || 'Segment'}`,
      data: analysisResults.breakdownData.slice(0, 10),
      x_key: 'name',
      y_key: 'value',
      height: 240,
    };
  }

  // Default: KPI breakdown
  if (analysisResults.breakdownData?.length) {
    return {
      type: 'bar',
      title: `Top ${Math.min(8, analysisResults.breakdownData.length)} Segments`,
      data: analysisResults.breakdownData.slice(0, 8),
      x_key: 'name',
      y_key: 'value',
      height: 220,
    };
  }

  return null;
}

// ── Statistical Insights Tool ──────────────────────────────────
export function buildStatisticalInsights(analysisResults) {
  if (!analysisResults) return null;

  const insights = [];

  // Correlations
  if (analysisResults.correlations?.length) {
    insights.push({
      type: 'correlation',
      title: 'Key Relationships',
      items: analysisResults.correlations.slice(0, 5).map(c => ({
        variables: `${c.colA} ↔ ${c.colB}`,
        strength: `r = ${c.r}`,
        interpretation: Math.abs(c.r) > 0.7 ? 'strong' : Math.abs(c.r) > 0.5 ? 'moderate' : 'weak',
      })),
    });
  }

  // Top findings
  if (analysisResults.keyFindings?.length) {
    insights.push({
      type: 'findings',
      title: 'Key Findings',
      items: analysisResults.keyFindings.map(f => ({ finding: f })),
    });
  }

  return insights;
}

// ── Recommendations Generator ──────────────────────────────────
export function buildRecommendations(analysisResults, qualityScore) {
  const recommendations = [];

  // Based on anomalies
  if (analysisResults?.anomalies?.length > 0) {
    const highSev = analysisResults.anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length;
    if (highSev > 0) {
      recommendations.push({
        priority: 'critical',
        action: `Investigate ${highSev} high-severity anomal${highSev > 1 ? 'ies' : 'y'} immediately to identify root causes and impact.`,
        impact: 'high',
      });
    }
  }

  // Based on quality
  if (qualityScore < 70) {
    recommendations.push({
      priority: 'high',
      action: 'Address data quality issues (missing values, duplicates) before making strategic decisions.',
      impact: 'high',
    });
  }

  // Based on growth
  if (analysisResults?.growthRate != null && analysisResults.growthRate > 10) {
    recommendations.push({
      priority: 'medium',
      action: 'Capitalize on positive momentum — allocate resources to sustain growth.',
      impact: 'medium',
    });
  } else if (analysisResults?.growthRate != null && analysisResults.growthRate < -10) {
    recommendations.push({
      priority: 'high',
      action: 'Address negative trend urgently — conduct root-cause analysis and implement corrective measures.',
      impact: 'high',
    });
  }

  // Based on top performers
  if (analysisResults?.breakdownData?.length > 0) {
    const top = analysisResults.breakdownData[0];
    recommendations.push({
      priority: 'medium',
      action: `Study success factors in ${top.name} (top performer) and replicate best practices elsewhere.`,
      impact: 'medium',
    });
  }

  return recommendations.slice(0, 5);
}

// ── Confidence Assessment ──────────────────────────────────────
export function assessConfidence(question, analysisResults, qualityScore) {
  let confidence = 85;
  let factors = [];

  if (qualityScore < 70) {
    confidence -= 15;
    factors.push('Data quality is below 70% — conclusions may be affected by missing values or inconsistencies.');
  }

  if (!analysisResults?.anomalies) {
    confidence -= 5;
    factors.push('Anomaly detection not yet run.');
  }

  if (!analysisResults?.canForecast) {
    confidence -= 10;
    factors.push('No date column — forecasting not available.');
  }

  if (analysisResults?.keyFindings?.length === 0) {
    confidence -= 10;
    factors.push('Limited analysis outputs available.');
  }

  return {
    overall_confidence: Math.max(30, confidence),
    confidence_factors: factors,
    limitations: [
      qualityScore < 70 ? `Data quality (${qualityScore}%) may limit reliability` : null,
      !analysisResults?.canForecast ? 'No forecasting available without date column' : null,
    ].filter(Boolean),
  };
}