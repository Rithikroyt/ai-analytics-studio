/**
 * AnalystEngine — Orchestrates 7-step reasoning workflow
 * Executes intent detection, tool selection, analysis, and structured responses
 */
import * as localTools from '@/lib/analystToolsLocal.js';
import { assessConfidence } from '@/lib/analystTools';

export async function executeAnalystWorkflow(question, store, analysisResultsArg, activeTableArg) {
  // Safely resolve active table and analysis from store or argument
  const activeTable = activeTableArg || store?.tables?.find(t => t.id === store?.activeTableId) || store?.tables?.[0] || null;
  const analysisResults = analysisResultsArg || store?.analysisResults || null;
  const steps = [];
  let response = {
    role: 'assistant',
    answer: '',
    insights: [],
    evidence: [],
    recommendations: [],
    charts: [],
    confidence: 50,
    limitations: [],
    methodology: 'Grounded analysis',
  };

  try {
    // STEP 1: Intent Detection
    steps.push('Detecting question intent...');
    const q = question.toLowerCase();
    const intents = [];
    if (q.includes('board') || q.includes('summary') || q.includes('overview')) intents.push('kpi_summary');
    if (q.includes('change') || q.includes('trend') || q.includes('drop') || q.includes('increase')) intents.push('trend');
    if (q.includes('anomal') || q.includes('unusual') || q.includes('unexpected')) intents.push('anomaly');
    if (q.includes('forecast') || q.includes('predict') || q.includes('next')) intents.push('forecast');
    if (q.includes('missing') || q.includes('quality') || q.includes('data') || q.includes('clean')) intents.push('quality');
    if (q.includes('correlation') || q.includes('significant') || q.includes('difference')) intents.push('statistics');
    if (q.includes('recommend') || q.includes('should') || q.includes('focus')) intents.push('recommendation');
    if (q.includes('chart') || q.includes('visual') || q.includes('show')) intents.push('chart');
    if (q.includes('memo') || q.includes('report') || q.includes('executive')) intents.push('report');
    if (intents.length === 0) intents.push('kpi_summary'); // fallback

    // STEP 2 & 3: Context + Tool Selection
    steps.push('Loading context and selecting tools...');
    const overview = await localTools.getWorkspaceOverview(store);
    const kpiSummary = await localTools.getKPISummary(store);
    
    // STEP 4: Analysis Retrieval
    steps.push('Executing analysis...');
    let answer = '';
    let insightsList = [];
    let evidenceList = [];
    let chartsList = [];

    // KPI Summary
    if (intents.includes('kpi_summary') || !intents.length) {
      const kpi = kpiSummary;
      answer = `Primary KPI: ${kpi?.primary_kpi} = ${kpi?.primary_value?.toLocaleString()} (${kpi?.primary_change}).`;
      insightsList.push(`Data quality: ${kpi?.quality_score}%`);
      if (kpi?.anomaly_count > 0) insightsList.push(`${kpi.anomaly_count} anomalies detected`);
    }

    // Trend Explanation
    if (intents.includes('trend')) {
      const story = await localTools.getDescriptiveStory(store);
      if (story) {
        answer = `${story.what_happened}`;
        insightsList.push(`Why: ${story.why_it_happened?.slice(0, 100)}`);
        if (story.where_risk_is?.length) insightsList.push(`Risk: ${story.where_risk_is[0]}`);
      }
    }

    // Anomalies
    if (intents.includes('anomaly')) {
      const anom = await localTools.getAnomalyResults(store);
      if (anom?.total_anomalies > 0) {
        answer = `${anom.total_anomalies} anomal${anom.total_anomalies === 1 ? 'y' : 'ies'} detected. ${anom.recommendation}`;
        Object.entries(anom.severity_breakdown).forEach(([sev, count]) => {
          insightsList.push(`${sev}: ${count}`);
        });
      } else {
        answer = 'No anomalies detected — data is within normal bounds.';
      }
    }

    // Data Quality
    if (intents.includes('quality')) {
      const quality = await localTools.getDataQualityAudit(store);
      answer = `Data quality score: ${quality?.overall_score}%. `;
      if (quality?.missing_value_columns?.length) {
        answer += `${quality.missing_value_columns.length} columns have missing values.`;
        insightsList.push(...quality.missing_value_columns.map(c => `${c.name}: ${c.missing_percent}% missing`));
      }
      if (quality?.recommended_actions?.length) {
        evidenceList.push(...quality.recommended_actions.slice(0, 2));
      }
    }

    // Forecast
    if (intents.includes('forecast')) {
      const fc = await localTools.getForecastResults(store);
      if (fc?.available) {
        answer = `Forecast shows ${fc.trend_direction} trend. ${fc.key_insight}`;
        if (fc.forecast_periods?.length) {
          insightsList.push(`Next period: ${fc.forecast_periods[0]?.forecasted_value?.toLocaleString()}`);
        }
      } else {
        answer = fc?.reason || 'Insufficient data for forecasting.';
      }
    }

    // Statistics
    if (intents.includes('statistics')) {
      const stat = await localTools.runStatisticalInsights(store);
      if (stat?.length > 0) {
        answer = `Found ${stat.length} statistical insight${stat.length > 1 ? 's' : ''}.`;
        if (stat[0]?.items) {
          insightsList.push(...stat[0].items.slice(0, 2).map(i => `${i.variables}: ${i.strength}`));
        }
      }
    }

    // Recommendations
    if (intents.includes('recommendation')) {
      const recs = await localTools.generateRecommendations(store);
      answer = `${recs?.length || 0} recommendations identified.`;
      if (recs?.length) {
        response.recommendations = recs.slice(0, 3);
        insightsList.push(...recs.slice(0, 2).map(r => `[${r.priority}] ${r.action}`));
      }
    }

    // STEP 5: Always attach a chart if breakdown data is available
    if (intents.includes('chart') || analysisResults?.breakdownData?.length) {
      steps.push('Generating chart...');
      const chartSpec = await localTools.getChartSpecForQuestion(store, question);
      if (chartSpec) {
        chartsList.push(chartSpec);
      }
    }

    // STEP 6: Fallback if empty
    if (!answer) {
      const fallback = await localTools.safeFallbackResponse(store, question);
      answer = fallback.answer;
      insightsList = fallback.insights || [];
      response.confidence = fallback.confidence || 50;
      response.limitations = fallback.limitations || [];
    }

    // STEP 7: Confidence Assessment
    steps.push('Assessing confidence...');
    const conf = assessConfidence(question, analysisResults, activeTable?.qualityScore || 0);
    response.confidence = conf.overall_confidence;
    response.limitations = conf.limitations;

    // Build final response
    response.steps = steps;
    response.answer = answer;
    response.insights = insightsList;
    response.evidence = evidenceList;
    response.charts = chartsList;

  } catch (e) {
    console.error('[AnalystEngine]', e);
    const fallback = await localTools.safeFallbackResponse(store, question);
    response.answer = fallback.answer;
    response.insights = fallback.insights || [];
    response.confidence = fallback.confidence || 40;
    response.limitations = ['Error in analysis — please try again'];
  }

  return response;
}