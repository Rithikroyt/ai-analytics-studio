/**
 * Cohort Retention Engine
 * Builds a cohort × period retention matrix
 * ConversionRate_i = Users_i / Users_(i-1)
 */

export function buildCohortMatrix(rows, customerCol, dateCol, maxPeriods = 8) {
  if (!rows?.length || !customerCol || !dateCol) return null;

  // Parse dates and assign cohort (first purchase month)
  const customerFirstDate = {};
  const customerActivePeriods = {};

  rows.forEach(row => {
    const id = String(row[customerCol] ?? '');
    if (!id || id === 'undefined') return;
    const d = new Date(row[dateCol]);
    if (isNaN(d.getTime())) return;

    const monthKey = d.toISOString().slice(0, 7);
    if (!customerFirstDate[id] || monthKey < customerFirstDate[id]) {
      customerFirstDate[id] = monthKey;
    }
    if (!customerActivePeriods[id]) customerActivePeriods[id] = new Set();
    customerActivePeriods[id].add(monthKey);
  });

  // Group customers by cohort (first month)
  const cohorts = {};
  Object.entries(customerFirstDate).forEach(([id, cohort]) => {
    if (!cohorts[cohort]) cohorts[cohort] = [];
    cohorts[cohort].push(id);
  });

  const cohortKeys = Object.keys(cohorts).sort();
  const matrix = [];

  cohortKeys.forEach(cohort => {
    const members = cohorts[cohort];
    const cohortSize = members.length;
    const cohortDate = new Date(cohort + '-01');
    const row = { cohort, cohortSize, periods: [] };

    for (let p = 0; p < maxPeriods; p++) {
      const targetDate = new Date(cohortDate);
      targetDate.setMonth(targetDate.getMonth() + p);
      const targetKey = targetDate.toISOString().slice(0, 7);

      const activeInPeriod = members.filter(id => customerActivePeriods[id]?.has(targetKey)).length;
      const retentionRate = cohortSize > 0 ? parseFloat((activeInPeriod / cohortSize * 100).toFixed(1)) : 0;

      row.periods.push({
        period: p,
        active: activeInPeriod,
        retentionRate,
        isEmpty: activeInPeriod === 0 && p > 0,
      });
    }

    matrix.push(row);
  });

  // Average retention by period
  const avgRetention = Array.from({ length: maxPeriods }, (_, p) => {
    const validRows = matrix.filter(r => r.periods[p] && !r.periods[p].isEmpty);
    const avg = validRows.length
      ? validRows.reduce((s, r) => s + r.periods[p].retentionRate, 0) / validRows.length
      : 0;
    return parseFloat(avg.toFixed(1));
  });

  // Overall stats
  const totalCustomers = Object.keys(customerFirstDate).length;
  const period1Retention = avgRetention[1] || 0;
  const period3Retention = avgRetention[3] || 0;

  return {
    matrix,
    cohortKeys,
    avgRetention,
    totalCustomers,
    period1Retention,
    period3Retention,
    maxPeriods,
  };
}

// Color scale for heatmap cells
export function retentionColor(rate) {
  if (rate >= 80) return { bg: 'rgba(74,222,128,0.7)', text: '#052e16' };
  if (rate >= 60) return { bg: 'rgba(74,222,128,0.45)', text: '#e2e8f0' };
  if (rate >= 40) return { bg: 'rgba(251,191,36,0.4)', text: '#e2e8f0' };
  if (rate >= 20) return { bg: 'rgba(251,146,60,0.35)', text: '#e2e8f0' };
  if (rate > 0) return { bg: 'rgba(248,113,113,0.3)', text: '#e2e8f0' };
  return { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.15)' };
}