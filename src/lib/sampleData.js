// Sample data bundles for demo mode

const generateSalesData = () => {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const regions = ['North America','Europe','Asia Pacific','Latin America'];
  const products = ['Enterprise Suite','Pro Plan','Starter','Add-ons'];
  const rows = [];
  let id = 1;
  for (let year of [2023, 2024]) {
    for (let m = 0; m < 12; m++) {
      for (const region of regions) {
        for (const product of products) {
          const base = product === 'Enterprise Suite' ? 180000 : product === 'Pro Plan' ? 95000 : product === 'Starter' ? 35000 : 22000;
          const regionMult = region === 'North America' ? 1.4 : region === 'Europe' ? 1.1 : region === 'Asia Pacific' ? 0.9 : 0.6;
          const trend = year === 2024 ? 1.18 : 1;
          const noise = 0.85 + Math.random() * 0.3;
          const revenue = Math.round(base * regionMult * trend * noise);
          const units = Math.round(revenue / (product === 'Enterprise Suite' ? 4500 : product === 'Pro Plan' ? 950 : 350));
          const cogs = Math.round(revenue * 0.32);
          rows.push({
            id: id++,
            date: `${year}-${String(m+1).padStart(2,'0')}-01`,
            month: months[m],
            year,
            quarter: `Q${Math.floor(m/3)+1}`,
            region,
            product,
            revenue,
            units_sold: units,
            cogs,
            gross_profit: revenue - cogs,
            gross_margin_pct: parseFloat(((revenue - cogs) / revenue * 100).toFixed(1)),
          });
        }
      }
    }
  }
  return rows;
};

const generateWorkforceData = () => {
  const depts = ['Engineering','Sales','Marketing','Finance','Operations','HR','Legal'];
  const levels = ['IC1','IC2','IC3','Senior','Staff','Principal','Manager','Director'];
  const statuses = ['Active','Active','Active','Active','Terminated','Leave'];
  const rows = [];
  let id = 1;
  for (const dept of depts) {
    const headcount = dept === 'Engineering' ? 42 : dept === 'Sales' ? 28 : dept === 'Marketing' ? 16 : dept === 'Finance' ? 12 : dept === 'Operations' ? 20 : dept === 'HR' ? 8 : 5;
    for (let i = 0; i < headcount; i++) {
      const level = levels[Math.floor(Math.random() * levels.length)];
      const basesal = level.includes('Director') ? 210000 : level.includes('Principal') ? 185000 : level.includes('Staff') ? 165000 : level.includes('Senior') ? 140000 : level.includes('Manager') ? 155000 : level.includes('IC3') ? 120000 : level.includes('IC2') ? 98000 : 78000;
      const sal = Math.round(basesal * (0.92 + Math.random() * 0.16));
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const tenure = Math.round(Math.random() * 72);
      rows.push({
        employee_id: `EMP${String(id).padStart(4,'0')}`,
        department: dept,
        level,
        status,
        hire_date: new Date(Date.now() - tenure * 30 * 24 * 3600000).toISOString().split('T')[0],
        salary: sal,
        bonus_pct: Math.round(10 + Math.random() * 25),
        tenure_months: tenure,
        performance_score: parseFloat((2.5 + Math.random() * 2.5).toFixed(1)),
        location: Math.random() > 0.4 ? 'Remote' : 'On-site',
      });
      id++;
    }
  }
  return rows;
};

const generateHealthcareData = () => {
  const departments = ['Emergency','Cardiology','Oncology','Orthopedics','Neurology','Pediatrics','General Medicine'];
  const rows = [];
  const months = ['2024-01','2024-02','2024-03','2024-04','2024-05','2024-06','2024-07','2024-08','2024-09','2024-10','2024-11','2024-12'];
  let id = 1;
  for (const dept of departments) {
    for (const month of months) {
      const admissions = Math.round(120 + Math.random() * 280);
      const avgLos = parseFloat((2.5 + Math.random() * 8).toFixed(1));
      const occupancy = parseFloat((55 + Math.random() * 40).toFixed(1));
      const satisfaction = parseFloat((3.2 + Math.random() * 1.8).toFixed(1));
      const readmission_rate = parseFloat((3 + Math.random() * 12).toFixed(1));
      const cost_per_case = Math.round(4000 + Math.random() * 18000);
      rows.push({
        id: id++,
        month,
        department: dept,
        admissions,
        avg_length_of_stay: avgLos,
        bed_occupancy_pct: occupancy,
        patient_satisfaction: satisfaction,
        readmission_rate_pct: readmission_rate,
        cost_per_case,
        total_revenue: Math.round(admissions * cost_per_case * (1.2 + Math.random() * 0.4)),
        staff_count: Math.round(15 + Math.random() * 45),
      });
    }
  }
  return rows;
};

const salesData = generateSalesData();
const workforceData = generateWorkforceData();
const healthcareData = generateHealthcareData();

const inferColumns = (rows) => {
  if (!rows || rows.length === 0) return [];
  const keys = Object.keys(rows[0]);
  return keys.map(key => {
    const values = rows.slice(0, 50).map(r => r[key]).filter(v => v != null);
    const numericCount = values.filter(v => typeof v === 'number').length;
    const isNumeric = numericCount > values.length * 0.8;
    const isDate = values.some(v => /\d{4}-\d{2}/.test(String(v)));
    const uniqueCount = new Set(values).size;
    const isId = key.toLowerCase().includes('id') || key.toLowerCase().includes('_id');
    
    let type = 'text';
    if (isId) type = 'id';
    else if (isDate) type = 'date';
    else if (isNumeric) type = 'numeric';
    else if (uniqueCount < 15) type = 'category';
    
    const numVals = isNumeric ? values.map(Number) : [];
    const sum = numVals.reduce((a, b) => a + b, 0);
    const mean = numVals.length ? sum / numVals.length : 0;
    const nullCount = rows.length - values.length;
    
    return {
      name: key,
      type,
      nullCount,
      uniqueCount,
      mean: isNumeric ? Math.round(mean) : null,
      min: isNumeric ? Math.min(...numVals) : null,
      max: isNumeric ? Math.max(...numVals) : null,
      sample: values.slice(0, 3).map(String),
    };
  });
};

const buildSemanticModel = (tableId, columns, tableName) => {
  const dateCol = columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const dimCols = columns.filter(c => c.type === 'category');
  const idCols = columns.filter(c => c.type === 'id');

  return {
    tableId,
    tableName,
    primaryKey: idCols[0]?.name || null,
    dateField: dateCol?.name || null,
    measures: numericCols.slice(0, 6).map(c => ({
      name: c.name,
      label: c.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      type: c.name.includes('pct') || c.name.includes('rate') ? 'ratio' : 'sum',
      format: c.name.includes('pct') || c.name.includes('rate') ? 'percent' : c.name.includes('salary') || c.name.includes('revenue') || c.name.includes('cost') ? 'currency' : 'number',
    })),
    dimensions: dimCols.map(c => ({
      name: c.name,
      label: c.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      cardinality: c.uniqueCount,
    })),
    dateGrain: dateCol ? 'month' : null,
    qualityScore: Math.round(85 + Math.random() * 14),
  };
};

const buildAnalysis = (rows, columns, tableName) => {
  const dateCol = columns.find(c => c.type === 'date');
  const numericCols = columns.filter(c => c.type === 'numeric');
  const dimCols = columns.filter(c => c.type === 'category');
  const primaryMetric = numericCols[0];

  // Trend data
  let trendData = [];
  if (dateCol && primaryMetric) {
    const grouped = {};
    rows.forEach(row => {
      const key = String(row[dateCol.name]).slice(0, 7);
      if (!grouped[key]) grouped[key] = { date: key, values: [] };
      const val = Number(row[primaryMetric.name]);
      if (!isNaN(val)) grouped[key].values.push(val);
    });
    trendData = Object.values(grouped)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-24)
      .map(g => ({
        date: g.date,
        value: Math.round(g.values.reduce((a, b) => a + b, 0)),
      }));
  }

  // Breakdown by first dimension
  let breakdownData = [];
  if (dimCols[0] && primaryMetric) {
    const grouped = {};
    rows.forEach(row => {
      const key = String(row[dimCols[0].name]);
      if (!grouped[key]) grouped[key] = 0;
      grouped[key] += Number(row[primaryMetric.name]) || 0;
    });
    breakdownData = Object.entries(grouped)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name, value: Math.round(value) }));
  }

  // KPI summary
  const totalValue = primaryMetric
    ? rows.reduce((sum, r) => sum + (Number(r[primaryMetric.name]) || 0), 0)
    : 0;

  // Second metric
  const secondMetric = numericCols[1];
  const secondValue = secondMetric
    ? rows.reduce((sum, r) => sum + (Number(r[secondMetric.name]) || 0), 0)
    : 0;

  // Anomalies: simple outlier detection
  const anomalies = [];
  if (primaryMetric && trendData.length > 3) {
    const vals = trendData.map(d => d.value);
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.map(v => Math.pow(v - mean, 2)).reduce((a, b) => a + b, 0) / vals.length);
    trendData.forEach(d => {
      if (Math.abs(d.value - mean) > 2 * std) {
        anomalies.push({
          date: d.date,
          value: d.value,
          expected: Math.round(mean),
          severity: Math.abs(d.value - mean) > 3 * std ? 'high' : 'medium',
        });
      }
    });
  }

  // Forecast: simple linear extrapolation
  let forecastData = [];
  if (trendData.length >= 6) {
    const recent = trendData.slice(-6);
    const avgGrowth = (recent[recent.length-1].value - recent[0].value) / 5;
    const lastDate = new Date(recent[recent.length-1].date + '-01');
    for (let i = 1; i <= 6; i++) {
      const d = new Date(lastDate);
      d.setMonth(d.getMonth() + i);
      forecastData.push({
        date: d.toISOString().slice(0, 7),
        value: Math.round(recent[recent.length-1].value + avgGrowth * i),
        isForecast: true,
      });
    }
  }

  // Growth rate
  const growthRate = trendData.length >= 2
    ? ((trendData[trendData.length-1].value - trendData[0].value) / trendData[0].value * 100).toFixed(1)
    : null;

  return {
    tableName,
    primaryMetric: primaryMetric?.name,
    primaryLabel: primaryMetric?.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    secondMetric: secondMetric?.name,
    secondLabel: secondMetric?.name?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    totalValue,
    secondValue,
    totalRows: rows.length,
    trendData,
    forecastData,
    breakdownData,
    anomalies,
    growthRate,
    primaryDimension: dimCols[0]?.name,
    secondDimension: dimCols[1]?.name,
    canForecast: trendData.length >= 6,
    executiveSummary: buildExecutiveSummary(tableName, primaryMetric, totalValue, growthRate, anomalies, breakdownData),
    recommendations: buildRecommendations(tableName, growthRate, anomalies, breakdownData),
  };
};

const buildExecutiveSummary = (tableName, primaryMetric, totalValue, growthRate, anomalies, breakdown) => {
  const metricLabel = primaryMetric?.name.replace(/_/g, ' ') || 'key metric';
  const topSegment = breakdown[0]?.name || 'the top segment';
  const topShare = breakdown.length > 0 
    ? Math.round(breakdown[0].value / breakdown.reduce((s, b) => s + b.value, 0) * 100)
    : 0;
  const growthText = growthRate > 0 ? `grew ${growthRate}%` : growthRate < 0 ? `declined ${Math.abs(growthRate)}%` : 'remained stable';
  const anomalyText = anomalies.length > 0 ? ` ${anomalies.length} anomalous period${anomalies.length > 1 ? 's' : ''} were detected.` : '';
  
  return `Total ${metricLabel} ${growthText} over the analysis period, reaching ${totalValue.toLocaleString()}. ${topSegment} contributed ${topShare}% of total volume, making it the dominant segment.${anomalyText} The data quality score indicates strong analytical reliability.`;
};

const buildRecommendations = (tableName, growthRate, anomalies, breakdown) => {
  const recs = [];
  const top = breakdown[0]?.name;
  const bottom = breakdown[breakdown.length - 1]?.name;
  
  if (growthRate > 10) recs.push({ priority: 'high', action: `Accelerate investment in top-performing segments to sustain ${growthRate}% growth trajectory.` });
  if (growthRate < 0) recs.push({ priority: 'critical', action: 'Investigate root causes of declining trend and implement corrective measures immediately.' });
  if (anomalies.length > 0) recs.push({ priority: 'medium', action: `Review ${anomalies.length} detected anomalies — validate data integrity and check for external events.` });
  if (top) recs.push({ priority: 'medium', action: `Double down on ${top} — it is the highest-performing segment. Explore replication strategies.` });
  if (bottom && breakdown.length > 3) recs.push({ priority: 'low', action: `Assess viability of ${bottom} segment. Consider restructuring or divestment if underperformance persists.` });
  recs.push({ priority: 'low', action: 'Schedule quarterly data quality review to maintain analytical reliability.' });
  
  return recs.slice(0, 4);
};

// Build sample bundles
const salesColumns = inferColumns(salesData);
const workforceColumns = inferColumns(workforceData);
const healthcareColumns = inferColumns(healthcareData);

export const sampleBundles = {
  sales: {
    tables: [{
      id: 'sales-main',
      name: 'Sales & Revenue',
      fileName: 'sales_revenue_2023_2024.csv',
      rows: salesData,
      columns: salesColumns,
      rowCount: salesData.length,
      qualityScore: 96,
      issues: [],
    }],
    semanticModel: buildSemanticModel('sales-main', salesColumns, 'Sales & Revenue'),
    analysisResults: buildAnalysis(salesData, salesColumns, 'Sales & Revenue'),
  },
  workforce: {
    tables: [{
      id: 'workforce-main',
      name: 'Workforce & Payroll',
      fileName: 'workforce_data.csv',
      rows: workforceData,
      columns: workforceColumns,
      rowCount: workforceData.length,
      qualityScore: 92,
      issues: [],
    }],
    semanticModel: buildSemanticModel('workforce-main', workforceColumns, 'Workforce & Payroll'),
    analysisResults: buildAnalysis(workforceData, workforceColumns, 'Workforce & Payroll'),
  },
  healthcare: {
    tables: [{
      id: 'healthcare-main',
      name: 'Healthcare Operations',
      fileName: 'healthcare_ops.csv',
      rows: healthcareData,
      columns: healthcareColumns,
      rowCount: healthcareData.length,
      qualityScore: 94,
      issues: [],
    }],
    semanticModel: buildSemanticModel('healthcare-main', healthcareColumns, 'Healthcare Operations'),
    analysisResults: buildAnalysis(healthcareData, healthcareColumns, 'Healthcare Operations'),
  },
};

export { inferColumns, buildSemanticModel, buildAnalysis };