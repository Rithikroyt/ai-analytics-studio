/**
 * Demo Responses — Sample analyst responses for demo/testing
 */

export const demoResponses = {
  kpi_summary: {
    answer: `**Primary KPI Summary:** Total Revenue = $1.24M (↑ 12% vs last month). 
    
Breaking down: 
- Online channel: $890K (72%, ↑ 18%)
- Retail: $350K (28%, ↓ 2%)

Data quality: 98% (excellent). No missing values. 4 quarters of history.`,
    insights: [
      'Online channel driving growth — 18% month-over-month increase',
      'Retail sales stabilizing after Q3 dip',
      'Top segment: Enterprise (42% of revenue)',
      'Growth concentrated in North America (65%)',
    ],
    evidence: [
      'Q1: $1.10M | Q2: $1.18M | Q3: $1.11M | Q4: $1.24M',
      'Online YoY: +28% | Retail YoY: +3%',
      'Segment breakdown: Enterprise $520K, Mid-market $450K, SMB $270K',
    ],
    recommendations: [
      { priority: 'high', action: 'Scale digital marketing in Q2 — ROI at 4.2x, highest of all channels' },
      { priority: 'high', action: 'Investigate retail Q3 dip — lost 2 large accounts, focus on retention' },
      { priority: 'medium', action: 'Expand Enterprise segment with 1 new sales rep (pipeline shows 20% upside)' },
    ],
    confidence: 92,
    limitations: ['Forecast data only includes 4 quarters', 'Doesn't account for seasonal holidays'],
    charts: [
      {
        type: 'area',
        title: 'Revenue Trend (Q1-Q4) + Growth Rate',
        data: [
          { name: 'Q1', value: 1100, growth: 0 },
          { name: 'Q2', value: 1180, growth: 7 },
          { name: 'Q3', value: 1110, growth: -6 },
          { name: 'Q4', value: 1240, growth: 12 },
        ],
        x_key: 'name',
        y_key: 'value',
        reference_value: 1158,
        reference_label: 'Average',
      },
      {
        type: 'horizontal_bar',
        title: 'Revenue by Channel',
        data: [
          { name: 'Online', value: 890 },
          { name: 'Retail', value: 350 },
        ],
        x_key: 'name',
        y_key: 'value',
      },
    ],
  },

  anomaly_investigation: {
    answer: `**Anomaly Detection Summary:** 3 significant outliers identified.

1. **Q3 Retail Drop (CRITICAL):** Revenue fell 6% despite overall growth. Root cause: Lost 2 enterprise clients (combined $45K/quarter) due to competitor price war. Impact: -$27K immediate revenue.

2. **Week 12 Support Spike (HIGH):** Response time jumped to 8.2 hours (avg 4.1h, ±2σ). Root cause: Team absence + unplanned holiday. Impact: 3% customer satisfaction dip.

3. **North America Growth Slowdown (MEDIUM):** Week 10-11 showed flat growth. Root cause: Marketing campaign delayed. Impact: Estimated $12K lost opportunity.`,
    insights: [
      'Q3 retail loss is structural (lost accounts), not seasonal',
      'Support degradation had cascading effect on NPS',
      'Marketing timing issues costing ~$50K/quarter in opportunity cost',
      'Enterprise segment is highest-churn risk (2/8 accounts at risk)',
    ],
    evidence: [
      'Anomalies detected using Z-score method (threshold: |z| > 2)',
      'Q3 retail: z = -2.8σ (p < 0.01, highly significant)',
      'Support spike: z = 2.1σ (p < 0.05, significant)',
      'Weekly growth: 3.2% ± 0.8% normal band; Week 10-11 = 1.1% (outlier)',
    ],
    recommendations: [
      { priority: 'critical', action: 'Immediate: Price-match 2 lost retail accounts OR win them back with product differentiation' },
      { priority: 'critical', action: 'Staffing: Hire 1 support agent + 1 contract overflow capacity for peak hours' },
      { priority: 'high', action: 'Marketing: Lock in 90-day campaign calendar to prevent future timing gaps' },
    ],
    confidence: 85,
    limitations: [
      'Root causes are hypothesized from anomaly patterns — recommend verifying with stakeholders',
      'Retail churn may have other factors not captured in data',
    ],
    charts: [
      {
        type: 'line',
        title: 'Revenue with Anomaly Markers (±2σ band)',
        data: [
          { period: 'Q1', value: 1100, expected: 1150 },
          { period: 'Q2', value: 1180, expected: 1145 },
          { period: 'Q3', value: 1110, expected: 1155 },
          { period: 'Q4', value: 1240, expected: 1160 },
        ],
        x_key: 'period',
        y_key: 'value',
        reference_value: 1155,
        reference_label: 'Mean ± 2σ',
      },
    ],
  },

  forecast_prediction: {
    answer: `**Forecast Summary:** Revenue expected to reach **$1.38M in Q1 (next quarter)** with 85% confidence.

**Scenarios:**
- **Base Case:** +11% from Q4 → $1.38M (most likely)
- **Bull Case:** +18% from Q4 → $1.46M (if Enterprise segment stays strong + Online continues 18% growth)
- **Bear Case:** +2% from Q4 → $1.27M (if retail continues to decline + marketing delays persist)

Model: Exponential smoothing (α=0.3) + linear trend. Based on 4 quarters of historical data.`,
    insights: [
      'Upward trend momentum suggests continued growth through Q1',
      'Online channel driving 70%+ of forecast growth',
      'Retail remains flat or declining unless turnaround actions taken',
      'Confidence band: $1.27M - $1.46M (wide range reflects current volatility)',
    ],
    evidence: [
      'Historical growth rate: 2.8% average quarterly',
      'Exponential smoothing fit: R² = 0.94 (excellent)',
      'Forecast assumes Online continues 18% YoY growth',
      'Retail scenario assumes -2% decline continues',
    ],
    recommendations: [
      { priority: 'critical', action: 'Activate bull case plan: Enterprise expansion + online scaling = +$80K potential' },
      { priority: 'high', action: 'Retail recovery plan: Reduce bear case impact from -$130K to -$30K via price adjustments' },
      { priority: 'medium', action: 'Monthly tracking: If Jan trend < $300K (26% of forecast), escalate to leadership' },
    ],
    confidence: 78,
    limitations: [
      'Forecast assumes no major market disruption or competitive changes',
      'Based on historical patterns — external shocks (holidays, PR, etc.) not modeled',
      'Confidence decreases beyond Q1',
    ],
    charts: [
      {
        type: 'composed',
        title: 'Historical + Forecast with Confidence Bands',
        data: [
          { period: 'Q1', actual: 1100, forecast: null, bull: null, bear: null },
          { period: 'Q2', actual: 1180, forecast: null, bull: null, bear: null },
          { period: 'Q3', actual: 1110, forecast: null, bull: null, bear: null },
          { period: 'Q4', actual: 1240, forecast: null, bull: null, bear: null },
          { period: 'Q1F', actual: null, forecast: 1380, bull: 1460, bear: 1270 },
        ],
        x_key: 'period',
        y_key: 'forecast',
        series: [
          { key: 'actual', type: 'line', color: '#00e5ff' },
          { key: 'forecast', type: 'line', color: '#9c27b0' },
          { key: 'bull', type: 'area', color: '#4caf50' },
          { key: 'bear', type: 'area', color: '#ff2d7a' },
        ],
      },
    ],
  },

  quality_audit: {
    answer: `**Data Quality Audit:** Overall Score = **92%**

Your dataset is in **excellent condition** for analysis. 

**Summary:**
- 98% complete (only 2% missing values)
- 1 duplicate record identified (0.01% of 4,800 rows)
- All critical columns present and valid
- No data type inconsistencies detected

**Action Required:** None. Data is production-ready for analytics.`,
    insights: [
      '98% completeness across all numeric columns',
      'Only 1 duplicate entry (negligible impact)',
      'Date column has no gaps (daily granularity)',
      'No negative values in revenue/cost columns (data validation passed)',
    ],
    evidence: [
      'Completeness by column: Revenue 100%, Region 100%, Channel 99.8%, Segment 100%',
      'Missing data: Only in optional "Notes" field (2%), excluded from calculations',
      'Duplicate check: 1 exact row match, automatically deduplicated',
      'Type validation: All numeric columns parse as numbers, dates are ISO format',
    ],
    recommendations: [
      { priority: 'low', action: 'Optional: Document missing value reason for 50 rows in Notes field' },
    ],
    confidence: 95,
    limitations: [
      'Audit is structural (format/completeness), not semantic (business logic validity)',
      'No external data validation performed (e.g., pricing sanity checks)',
    ],
  },
};