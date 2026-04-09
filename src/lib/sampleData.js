// ── Sample data bundles with richer, analyst-grade data ──────────

const generateSalesData = () => {
  const regions = ['North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East'];
  const products = ['Enterprise Suite', 'Pro Plan', 'Starter', 'Add-ons', 'Professional Services'];
  const channels = ['Direct', 'Partner', 'Online', 'Reseller'];
  const rows = [];
  let id = 1;
  for (let year of [2023, 2024]) {
    for (let m = 0; m < 12; m++) {
      for (const region of regions) {
        for (const product of products) {
          const base = product === 'Enterprise Suite' ? 180000 : product === 'Pro Plan' ? 95000 : product === 'Starter' ? 35000 : product === 'Professional Services' ? 65000 : 22000;
          const regionMult = region === 'North America' ? 1.4 : region === 'Europe' ? 1.1 : region === 'Asia Pacific' ? 0.9 : region === 'Middle East' ? 0.75 : 0.6;
          const trend = year === 2024 ? 1.18 : 1;
          const seasonal = 1 + 0.12 * Math.sin((m / 12) * 2 * Math.PI);
          const noise = 0.87 + Math.random() * 0.26;
          const revenue = Math.round(base * regionMult * trend * seasonal * noise);
          const units = Math.round(revenue / (product === 'Enterprise Suite' ? 4500 : product === 'Pro Plan' ? 950 : product === 'Professional Services' ? 3200 : 350));
          const cogs = Math.round(revenue * (0.28 + Math.random() * 0.08));
          const gross_profit = revenue - cogs;
          const channel = channels[Math.floor(Math.random() * channels.length)];
          rows.push({
            id: id++,
            date: `${year}-${String(m + 1).padStart(2, '0')}-01`,
            year,
            quarter: `Q${Math.floor(m / 3) + 1}`,
            region,
            product,
            channel,
            revenue,
            units_sold: units,
            cogs,
            gross_profit,
            gross_margin_pct: parseFloat(((gross_profit / revenue) * 100).toFixed(1)),
            avg_deal_size: Math.round(revenue / Math.max(units, 1)),
          });
        }
      }
    }
  }
  return rows;
};

const generateWorkforceData = () => {
  const depts = ['Engineering', 'Sales', 'Marketing', 'Finance', 'Operations', 'HR', 'Legal', 'Product'];
  const levels = ['IC1', 'IC2', 'IC3', 'Senior', 'Staff', 'Principal', 'Manager', 'Director'];
  const statuses = ['Active', 'Active', 'Active', 'Active', 'Active', 'Terminated', 'Leave'];
  const locations = ['New York', 'San Francisco', 'London', 'Singapore', 'Remote', 'Austin', 'Berlin'];
  const rows = [];
  let id = 1;
  for (const dept of depts) {
    const headcount = { Engineering: 42, Sales: 28, Marketing: 16, Finance: 12, Operations: 20, HR: 8, Legal: 5, Product: 18 }[dept] || 10;
    for (let i = 0; i < headcount; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const basesal = level.includes('Director') ? 210000 : level.includes('Principal') ? 185000 : level.includes('Staff') ? 165000 : level.includes('Senior') ? 140000 : level.includes('Manager') ? 155000 : level.includes('IC3') ? 120000 : level.includes('IC2') ? 98000 : 78000;
      const sal = Math.round(basesal * (0.9 + Math.random() * 0.2));
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const tenure = Math.round(Math.random() * 84);
      const perf = parseFloat((2.0 + Math.random() * 3.0).toFixed(1));
      rows.push({
        employee_id: `EMP${String(id).padStart(4, '0')}`,
        department: dept,
        level,
        status,
        location: locations[Math.floor(Math.random() * locations.length)],
        hire_date: new Date(Date.now() - tenure * 30 * 24 * 3600000).toISOString().split('T')[0],
        salary: sal,
        bonus_pct: Math.round(8 + Math.random() * 28),
        tenure_months: tenure,
        performance_score: perf,
        engagement_score: parseFloat((2.5 + Math.random() * 2.5).toFixed(1)),
        training_hours: Math.round(10 + Math.random() * 80),
      });
      id++;
    }
  }
  return rows;
};

const generateHealthcareData = () => {
  const departments = ['Emergency', 'Cardiology', 'Oncology', 'Orthopedics', 'Neurology', 'Pediatrics', 'General Medicine', 'ICU'];
  const rows = [];
  let id = 1;
  for (const dept of departments) {
    for (let m = 1; m <= 12; m++) {
      const month = `2024-${String(m).padStart(2, '0')}`;
      const admissions = Math.round(100 + Math.random() * 300);
      const avgLos = parseFloat((2.5 + Math.random() * 9).toFixed(1));
      const occupancy = parseFloat((50 + Math.random() * 45).toFixed(1));
      const satisfaction = parseFloat((3.0 + Math.random() * 2.0).toFixed(1));
      const readmission = parseFloat((2 + Math.random() * 13).toFixed(1));
      const cost = Math.round(3500 + Math.random() * 20000);
      const staff = Math.round(12 + Math.random() * 55);
      rows.push({
        id: id++,
        month,
        department: dept,
        admissions,
        avg_length_of_stay: avgLos,
        bed_occupancy_pct: occupancy,
        patient_satisfaction: satisfaction,
        readmission_rate_pct: readmission,
        cost_per_case: cost,
        total_revenue: Math.round(admissions * cost * (1.15 + Math.random() * 0.45)),
        staff_count: staff,
        staff_to_patient_ratio: parseFloat((staff / admissions).toFixed(2)),
      });
    }
  }
  return rows;
};

const generateEducationData = () => {
  const courses = ['Data Science 101', 'Python Programming', 'Business Analytics', 'Machine Learning', 'Statistics', 'Excel Mastery', 'SQL Foundations', 'Leadership 101'];
  const campuses = ['Online', 'San Francisco', 'New York', 'Chicago', 'London'];
  const rows = [];
  let id = 1;
  for (let m = 1; m <= 12; m++) {
    for (const course of courses) {
      for (const campus of campuses) {
        const enrolled = Math.round(30 + Math.random() * 180);
        const completed = Math.round(enrolled * (0.52 + Math.random() * 0.38));
        const dropped = Math.round(enrolled * (0.03 + Math.random() * 0.18));
        const satisfaction = parseFloat((3.0 + Math.random() * 2.0).toFixed(1));
        const avg_score = parseFloat((55 + Math.random() * 43).toFixed(1));
        const revenue = Math.round(enrolled * (250 + Math.random() * 500));
        rows.push({
          id: id++,
          month: `2024-${String(m).padStart(2, '0')}`,
          course,
          campus,
          enrolled,
          completed,
          dropped,
          completion_rate: parseFloat(((completed / enrolled) * 100).toFixed(1)),
          satisfaction_score: satisfaction,
          avg_assessment_score: avg_score,
          revenue,
          instructor_rating: parseFloat((3.2 + Math.random() * 1.8).toFixed(1)),
          net_promoter_score: Math.round(20 + Math.random() * 70),
        });
      }
    }
  }
  return rows;
};

// ── Column inference engine ──────────────────────────────────────
export const inferColumns = (rows) => {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(key => {
    const allValues = rows.map(r => r[key]);
    const values = allValues.filter(v => v != null && String(v).trim() !== '' && String(v).toLowerCase() !== 'null' && String(v).toLowerCase() !== 'undefined' && String(v).toLowerCase() !== 'nan');
    if (!values.length) return { name: key, type: 'text', nullCount: rows.length, uniqueCount: 0, mean: null, min: null, max: null, sample: [], missingPct: 100 };

    const numericCount = values.filter(v => !isNaN(Number(v)) && String(v).trim() !== '').length;
    const isNumeric = numericCount > values.length * 0.72;

    const isDate = !isNumeric && values.some(v => {
      const s = String(v).trim();
      return /^\d{4}-\d{2}(-\d{2})?/.test(s) || /^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(s) ||
        /^Q[1-4]\s*\d{4}/.test(s) || /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(s) ||
        /^\d{4}$/.test(s);
    });

    const uniqueVals = new Set(values.map(String));
    const uniqueCount = uniqueVals.size;
    const isIdCol = /\bid\b|_id$|^id_|employee_id|user_id|record_id|row_id/i.test(key);

    let type = 'text';
    if (isIdCol && uniqueCount === values.length) type = 'id';
    else if (isDate) type = 'date';
    else if (isNumeric) type = 'numeric';
    else if (uniqueCount <= Math.max(25, values.length * 0.25)) type = 'category';

    const numVals = isNumeric ? values.map(v => Number(v)).filter(v => !isNaN(v)) : [];
    const sum = numVals.reduce((a, b) => a + b, 0);
    const mean = numVals.length ? sum / numVals.length : null;
    const nullCount = rows.length - values.length;
    const sorted = [...numVals].sort((a, b) => a - b);

    return {
      name: key,
      type,
      nullCount,
      uniqueCount,
      missingPct: parseFloat(((nullCount / rows.length) * 100).toFixed(1)),
      mean: mean !== null ? parseFloat(mean.toFixed(2)) : null,
      min: numVals.length ? sorted[0] : null,
      max: numVals.length ? sorted[sorted.length - 1] : null,
      median: numVals.length ? sorted[Math.floor(numVals.length / 2)] : null,
      sample: values.slice(0, 4).map(String),
    };
  });
};

// ── Semantic model builder ────────────────────────────────────────
export const buildSemanticModel = (tableId, columns, tableName) => {
  const dateCol = columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const dimCols = columns.filter(c => c.type === 'category');
  const idCols = columns.filter(c => c.type === 'id');
  const formatLabel = s => s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  return {
    tableId,
    tableName,
    primaryKey: idCols[0]?.name || null,
    dateField: dateCol?.name || null,
    measures: numericCols.slice(0, 8).map(c => ({
      name: c.name,
      label: formatLabel(c.name),
      type: /pct|rate|ratio|score|index/i.test(c.name) ? 'ratio' : /count|num|qty|quantity/i.test(c.name) ? 'count' : 'sum',
      format: /pct|rate|margin/i.test(c.name) ? 'percent' : /salary|revenue|cost|profit|price|amount|value|spend/i.test(c.name) ? 'currency' : 'number',
      description: `Total ${formatLabel(c.name)} aggregated across all records`,
    })),
    dimensions: dimCols.map(c => ({
      name: c.name,
      label: formatLabel(c.name),
      cardinality: c.uniqueCount,
      description: `Segment or group identifier: ${formatLabel(c.name)}`,
    })),
    dateGrain: dateCol ? 'month' : null,
    exampleQuestions: [
      `What is the total ${numericCols[0]?.name?.replace(/_/g, ' ') || 'value'} by ${dimCols[0]?.name?.replace(/_/g, ' ') || 'segment'}?`,
      `Which ${dimCols[0]?.name?.replace(/_/g, ' ') || 'category'} has the highest ${numericCols[0]?.name?.replace(/_/g, ' ') || 'metric'}?`,
      `Show the trend of ${numericCols[0]?.name?.replace(/_/g, ' ') || 'values'} over time.`,
      `Are there any anomalies or outliers in the data?`,
      `What are the top recommendations based on current data?`,
    ],
  };
};

// ── Core analysis builder (local fallback + rich output) ──────────
export const buildAnalysis = (rows, columns, tableName) => {
  const dateCol = columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const dimCols = columns.filter(c => c.type === 'category');
  const formatLabel = s => s?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || '';

  // Smart KPI selection: prefer revenue/sales/score columns
  const rankMetric = col => {
    const n = col.name.toLowerCase();
    if (/revenue|sales|profit|income/.test(n)) return 10;
    if (/score|rate|margin/.test(n)) return 7;
    if (/cost|expense|spend/.test(n)) return 5;
    if (/count|quantity|units/.test(n)) return 4;
    return 3;
  };
  const rankedNumerics = [...numericCols].sort((a, b) => rankMetric(b) - rankMetric(a));
  const primaryMetric = rankedNumerics[0];
  const secondMetric = rankedNumerics[1];

  // Trend data
  let trendData = [];
  if (dateCol && primaryMetric) {
    const grouped = {};
    rows.forEach(row => {
      const key = String(row[dateCol.name]).slice(0, 7);
      if (!key || key === 'null' || key === 'unde') return;
      if (!grouped[key]) grouped[key] = [];
      const v = Number(row[primaryMetric.name]);
      if (!isNaN(v)) grouped[key].push(v);
    });
    trendData = Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-24)
      .map(([date, vals]) => ({ date, value: Math.round(vals.reduce((a, b) => a + b, 0)) }));
  }

  // Breakdown
  let breakdownData = [];
  const primaryDim = dimCols[0];
  if (primaryDim && primaryMetric) {
    const grouped = {};
    rows.forEach(row => {
      const key = String(row[primaryDim.name]);
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += Number(row[primaryMetric.name]) || 0;
    });
    breakdownData = Object.entries(grouped)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }

  const totalValue = primaryMetric ? rows.reduce((s, r) => s + (Number(r[primaryMetric.name]) || 0), 0) : 0;
  const secondValue = secondMetric ? rows.reduce((s, r) => s + (Number(r[secondMetric.name]) || 0), 0) : 0;

  // Anomaly detection (Z-score)
  const anomalies = [];
  if (trendData.length > 4) {
    const vals = trendData.map(d => d.value);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / vals.length) || 1;
    trendData.forEach(d => {
      const z = Math.abs((d.value - mean) / std);
      if (z > 1.9) anomalies.push({ date: d.date, value: d.value, expected: Math.round(mean), severity: z > 2.8 ? 'high' : 'medium', zScore: parseFloat(z.toFixed(2)) });
    });
  }

  // Forecast
  let forecastData = [];
  if (trendData.length >= 6) {
    const vals = trendData.map(d => d.value);
    const n = vals.length;
    const xs = vals.map((_, i) => i);
    const mx = xs.reduce((a, b) => a + b) / n;
    const my = vals.reduce((a, b) => a + b) / n;
    const slope = xs.reduce((s, x, i) => s + (x - mx) * (vals[i] - my), 0) / xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    const intercept = my - slope * mx;
    const lastDate = new Date(trendData[trendData.length - 1].date + '-01');
    for (let i = 1; i <= 6; i++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i);
      forecastData.push({ date: d.toISOString().slice(0, 7), value: Math.round(slope * (n + i - 1) + intercept), isForecast: true });
    }
  }

  const growthRate = trendData.length >= 2
    ? parseFloat(((trendData[trendData.length - 1].value - trendData[0].value) / (trendData[0].value || 1) * 100).toFixed(1))
    : null;

  // Correlations
  const correlations = [];
  for (let i = 0; i < Math.min(numericCols.length, 6); i++) {
    for (let j = i + 1; j < Math.min(numericCols.length, 6); j++) {
      const xs = rows.map(r => Number(r[numericCols[i].name])).filter(v => !isNaN(v));
      const ys = rows.map(r => Number(r[numericCols[j].name])).filter(v => !isNaN(v));
      const n = Math.min(xs.length, ys.length);
      if (n < 5) continue;
      const mx = xs.reduce((a, b) => a + b) / n;
      const my = ys.reduce((a, b) => a + b) / n;
      const num = xs.reduce((s, x, k) => s + (x - mx) * (ys[k] - my), 0);
      const den = Math.sqrt(xs.reduce((s, x) => s + (x - mx) ** 2) * ys.reduce((s, y) => s + (y - my) ** 2));
      const r = den === 0 ? 0 : parseFloat((num / den).toFixed(3));
      if (Math.abs(r) > 0.28) correlations.push({ colA: numericCols[i].name, colB: numericCols[j].name, r, significant: Math.abs(r) > 0.5 });
    }
  }

  // Column stats
  const colStats = {};
  numericCols.forEach(col => {
    const vals = rows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (!vals.length) return;
    const sorted = [...vals].sort((a, b) => a - b);
    const mean = vals.reduce((a, b) => a + b) / vals.length;
    const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
    colStats[col.name] = {
      mean: parseFloat(mean.toFixed(2)),
      std: parseFloat(Math.sqrt(variance).toFixed(2)),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(vals.length / 2)],
      q1: sorted[Math.floor(vals.length * 0.25)],
      q3: sorted[Math.floor(vals.length * 0.75)],
      n: vals.length,
    };
  });

  const keyFindings = [
    primaryMetric && `Total ${formatLabel(primaryMetric.name)} across all records: ${totalValue.toLocaleString()}.`,
    growthRate != null && `Overall trend: ${growthRate > 0 ? '+' : ''}${growthRate}% over the full period.`,
    breakdownData[0] && dimCols[0] && `Top ${formatLabel(dimCols[0].name)}: "${breakdownData[0].name}" contributing ${Math.round(breakdownData[0].value / totalValue * 100)}% of total.`,
    anomalies.length > 0 && `${anomalies.length} statistical anomalies detected — data periods outside normal range.`,
    correlations[0] && `Notable correlation: ${formatLabel(correlations[0].colA)} ↔ ${formatLabel(correlations[0].colB)} (r=${correlations[0].r}).`,
    !dateCol && 'No date column detected — time-series forecasting unavailable; descriptive analytics active.',
  ].filter(Boolean);

  const recommendations = buildRecommendations(tableName, growthRate, anomalies, breakdownData, dimCols[0]?.name);
  const executiveSummary = buildExecutiveSummary(tableName, primaryMetric, totalValue, growthRate, anomalies, breakdownData, dimCols[0]?.name);

  return {
    tableName,
    domain: 'general',
    domainLabel: tableName,
    primaryMetric: primaryMetric?.name,
    primaryLabel: formatLabel(primaryMetric?.name) || 'Primary KPI',
    secondMetric: secondMetric?.name,
    secondLabel: formatLabel(secondMetric?.name),
    primaryDimension: primaryDim?.name,
    secondDimension: dimCols[1]?.name,
    totalValue: Math.round(totalValue),
    secondValue: Math.round(secondValue),
    growthRate,
    trendData,
    forecastData,
    breakdownData,
    allTrends: {},
    allBreakdowns: {},
    anomalies,
    correlations,
    colStats,
    canForecast: trendData.length >= 6,
    chartPanels: null,
    keyFindings,
    executiveSummary,
    recommendations,
    dataStory: `Analysis of ${tableName} reveals ${keyFindings[0] || 'key patterns across the dataset'}.`,
  };
};

const buildExecutiveSummary = (tableName, primaryMetric, totalValue, growthRate, anomalies, breakdown, dimName) => {
  const metricLabel = primaryMetric?.name?.replace(/_/g, ' ') || 'key metric';
  const topSegment = breakdown[0]?.name || 'top segment';
  const topShare = breakdown.length > 0 && totalValue > 0 ? Math.round((breakdown[0].value / totalValue) * 100) : 0;
  const growthText = Number(growthRate) > 0 ? `grew ${growthRate}%` : Number(growthRate) < 0 ? `declined ${Math.abs(Number(growthRate))}%` : 'remained stable';
  const anomalyText = anomalies.length > 0 ? ` ${anomalies.length} statistical anomaly${anomalies.length > 1 ? 'ies' : ''} detected — recommend investigation.` : ' No major anomalies detected, data is within normal statistical range.';
  const dimLabel = dimName?.replace(/_/g, ' ') || 'segment';
  return `Analysis of ${tableName}: Total ${metricLabel} ${growthText} over the analysis period, reaching ${totalValue.toLocaleString()}. ${topSegment} is the leading ${dimLabel}, accounting for ${topShare}% of total volume.${anomalyText} Data quality is sufficient for reliable analytical conclusions.`;
};

const buildRecommendations = (tableName, growthRate, anomalies, breakdown, dimName) => {
  const recs = [];
  const topSegment = breakdown[0]?.name;
  const bottomSegment = breakdown[breakdown.length - 1]?.name;
  const dimLabel = dimName?.replace(/_/g, ' ') || 'segment';
  if (Number(growthRate) > 12) recs.push({ priority: 'high', action: `Accelerate investment in top-performing ${dimLabel}s to sustain the ${growthRate}% growth trajectory.` });
  if (Number(growthRate) < -5) recs.push({ priority: 'critical', action: `Investigate root causes of declining trend (${growthRate}%). Convene cross-functional task force immediately.` });
  if (anomalies.length > 0) recs.push({ priority: 'medium', action: `Review ${anomalies.length} detected anomaly${anomalies.length > 1 ? 'ies' : ''} — validate data integrity and check for external events.` });
  if (topSegment) recs.push({ priority: 'medium', action: `Double down on "${topSegment}" — it is the highest-performing ${dimLabel}. Explore replication strategies across other segments.` });
  if (bottomSegment && breakdown.length > 3) recs.push({ priority: 'low', action: `Assess viability of "${bottomSegment}" ${dimLabel}. Consider restructuring if underperformance persists beyond next quarter.` });
  recs.push({ priority: 'low', action: 'Schedule quarterly data quality review to maintain long-term analytical reliability.' });
  return recs.slice(0, 5);
};

// ── Build all bundles ─────────────────────────────────────────────
const salesData = generateSalesData();
const workforceData = generateWorkforceData();
const healthcareData = generateHealthcareData();
const educationData = generateEducationData();

const salesColumns = inferColumns(salesData);
const workforceColumns = inferColumns(workforceData);
const healthcareColumns = inferColumns(healthcareData);
const educationColumns = inferColumns(educationData);

const computeQualityScore = (rows, columns) => {
  if (!rows || rows.length === 0) return 0;
  let score = 100;
  columns.forEach(col => {
    const nullRate = col.nullCount / rows.length;
    if (nullRate > 0.5) score -= 18;
    else if (nullRate > 0.2) score -= 10;
    else if (nullRate > 0.05) score -= 4;
  });
  const rowStrings = rows.slice(0, 300).map(r => JSON.stringify(r));
  const dupRate = 1 - new Set(rowStrings).size / rowStrings.length;
  if (dupRate > 0.1) score -= 10;
  else if (dupRate > 0.05) score -= 5;
  return Math.max(0, Math.min(100, Math.round(score)));
};

export const sampleBundles = {
  sales: {
    tables: [{ id: 'sales-main', name: 'Sales & Revenue', fileName: 'sales_revenue_2023_2024.csv', rows: salesData, columns: salesColumns, rowCount: salesData.length, qualityScore: computeQualityScore(salesData, salesColumns), issues: [] }],
    semanticModel: buildSemanticModel('sales-main', salesColumns, 'Sales & Revenue'),
    analysisResults: buildAnalysis(salesData, salesColumns, 'Sales & Revenue'),
  },
  workforce: {
    tables: [{ id: 'workforce-main', name: 'Workforce & Payroll', fileName: 'workforce_data.csv', rows: workforceData, columns: workforceColumns, rowCount: workforceData.length, qualityScore: computeQualityScore(workforceData, workforceColumns), issues: [] }],
    semanticModel: buildSemanticModel('workforce-main', workforceColumns, 'Workforce & Payroll'),
    analysisResults: buildAnalysis(workforceData, workforceColumns, 'Workforce & Payroll'),
  },
  healthcare: {
    tables: [{ id: 'healthcare-main', name: 'Healthcare Operations', fileName: 'healthcare_ops.csv', rows: healthcareData, columns: healthcareColumns, rowCount: healthcareData.length, qualityScore: computeQualityScore(healthcareData, healthcareColumns), issues: [] }],
    semanticModel: buildSemanticModel('healthcare-main', healthcareColumns, 'Healthcare Operations'),
    analysisResults: buildAnalysis(healthcareData, healthcareColumns, 'Healthcare Operations'),
  },
  education: {
    tables: [{ id: 'education-main', name: 'Student Engagement & Retention', fileName: 'education_data.csv', rows: educationData, columns: educationColumns, rowCount: educationData.length, qualityScore: computeQualityScore(educationData, educationColumns), issues: [] }],
    semanticModel: buildSemanticModel('education-main', educationColumns, 'Student Engagement & Retention'),
    analysisResults: buildAnalysis(educationData, educationColumns, 'Student Engagement & Retention'),
  },
};