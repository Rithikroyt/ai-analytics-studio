/**
 * analystToolsLocal — Local implementations of analyst tools
 * Derives structured results directly from the workspace store's analysisResults
 */

export async function getWorkspaceOverview(store) {
  const { tables, analysisResults } = store;
  return {
    table_count: tables?.length || 0,
    has_analysis: !!analysisResults,
    primary_kpi: analysisResults?.primaryLabel || null,
  };
}

export async function getKPISummary(store) {
  const r = store?.analysisResults;
  if (!r) return null;
  return {
    primary_kpi: r.primaryLabel || 'N/A',
    primary_value: r.totalValue || 0,
    primary_change: r.growthRate != null ? `${r.growthRate > 0 ? '+' : ''}${r.growthRate}%` : 'N/A',
    secondary_kpi: r.secondLabel || null,
    secondary_value: r.secondValue || null,
    quality_score: store?.getActiveTable?.()?.qualityScore || 0,
    anomaly_count: r.anomalies?.length || 0,
    top_segments: r.breakdownData?.slice(0, 3).map(b => ({ name: b.name, value: b.value })) || [],
  };
}

export async function getDescriptiveStory(store) {
  const r = store?.analysisResults;
  if (!r) return null;
  const findings = r.keyFindings || [];
  return {
    what_happened: r.executiveSummary || findings[0] || 'No summary available.',
    why_it_happened: findings[1] || r.correlations?.[0] ? `Correlation: ${r.correlations[0]?.colA} ↔ ${r.correlations[0]?.colB} (r=${r.correlations[0]?.r})` : 'No correlation data.',
    where_risk_is: r.anomalies?.slice(0, 2).map(a => `${a.date}: z=${a.zScore}σ (${a.severity})`) || [],
    what_to_do: r.recommendations?.slice(0, 2).map(rec => rec.action) || [],
  };
}

export async function getAnomalyResults(store) {
  const r = store?.analysisResults;
  if (!r) return { total_anomalies: 0 };
  const anomalies = r.anomalies || [];
  const high = anomalies.filter(a => a.severity === 'high').length;
  const medium = anomalies.filter(a => a.severity === 'medium').length;
  return {
    total_anomalies: anomalies.length,
    severity_breakdown: { high, medium, low: anomalies.length - high - medium },
    top_anomalies: anomalies.slice(0, 3).map(a => ({ date: a.date, value: a.value, expected: a.expected, z_score: a.zScore, severity: a.severity })),
    recommendation: anomalies.length > 0
      ? `Investigate ${high} high-severity anomalies immediately.`
      : 'No anomalies — data is clean.',
  };
}

export async function getDataQualityAudit(store) {
  const table = store?.getActiveTable?.();
  if (!table) return null;
  const missingCols = (table.columns || [])
    .filter(c => c.missingPct > 0)
    .map(c => ({ name: c.name, missing_percent: c.missingPct }));
  return {
    overall_score: table.qualityScore || 0,
    row_count: table.rowCount || 0,
    column_count: table.columns?.length || 0,
    missing_value_columns: missingCols,
    issues: table.issues?.map(i => i.message) || [],
    recommended_actions: [
      ...(missingCols.length ? [`Fill or impute missing values in: ${missingCols.map(c => c.name).join(', ')}`] : []),
      ...(table.issues?.slice(0, 2).map(i => i.message) || []),
    ],
  };
}

export async function getForecastResults(store) {
  const r = store?.analysisResults;
  if (!r) return { available: false, reason: 'No analysis results.' };
  if (!r.canForecast || !r.forecastData?.length) {
    return { available: false, reason: 'No date column detected — forecasting requires a time dimension.' };
  }
  const trend = r.growthRate != null ? (r.growthRate > 0 ? 'upward' : 'downward') : 'neutral';
  return {
    available: true,
    trend_direction: trend,
    key_insight: `${r.primaryLabel} shows a ${trend} trend of ${Math.abs(r.growthRate || 0)}%.`,
    forecast_periods: r.forecastData.slice(0, 3).map(f => ({ date: f.date, forecasted_value: f.value })),
  };
}

export async function runStatisticalInsights(store) {
  const r = store?.analysisResults;
  if (!r?.correlations?.length) return [];
  return [
    {
      type: 'correlations',
      items: r.correlations.slice(0, 5).map(c => ({
        variables: `${c.colA} ↔ ${c.colB}`,
        strength: Math.abs(c.r) > 0.7 ? 'Strong' : Math.abs(c.r) > 0.5 ? 'Moderate' : 'Weak',
        r: c.r,
      })),
    },
  ];
}

export async function generateRecommendations(store) {
  const r = store?.analysisResults;
  if (!r?.recommendations?.length) return [];
  return r.recommendations.map(rec => ({ priority: rec.priority, action: rec.action }));
}

export async function getChartSpecForQuestion(store, question) {
  const r = store?.analysisResults;
  if (!r) return null;
  const q = question.toLowerCase();

  if ((q.includes('segment') || q.includes('breakdown') || q.includes('region') || q.includes('category')) && r.breakdownData?.length) {
    return {
      type: 'bar',
      title: `${r.primaryLabel} by Segment`,
      data: r.breakdownData.slice(0, 8).map(b => ({ name: b.name, value: b.value })),
      x_key: 'name',
      y_key: 'value',
    };
  }

  if ((q.includes('trend') || q.includes('over time') || q.includes('history')) && r.trendData?.length) {
    return {
      type: 'area',
      title: `${r.primaryLabel} Over Time`,
      data: r.trendData.map(d => ({ name: d.date, value: d.value })),
      x_key: 'name',
      y_key: 'value',
    };
  }

  if (q.includes('forecast') && r.forecastData?.length) {
    return {
      type: 'line',
      title: `${r.primaryLabel} Forecast`,
      data: [...(r.trendData || []).map(d => ({ name: d.date, actual: d.value })),
             ...(r.forecastData || []).map(d => ({ name: d.date, forecast: d.value }))],
      x_key: 'name',
      y_key: 'actual',
    };
  }

  return null;
}

export async function safeFallbackResponse(store, question) {
  const r = store?.analysisResults;
  const table = store?.getActiveTable?.();

  if (!r || !table) {
    return {
      answer: 'No dataset loaded. Please upload data in the Intake section and run analysis first.',
      insights: [],
      confidence: 20,
      limitations: ['No data available'],
    };
  }

  return {
    answer: `Based on your dataset "${table.name}" (${table.rowCount?.toLocaleString()} rows): ${r.executiveSummary || 'Analysis complete. Ask a more specific question to get targeted insights.'}`,
    insights: r.keyFindings?.slice(0, 3) || [],
    confidence: 55,
    limitations: ['Generic response — try a more specific question'],
  };
}