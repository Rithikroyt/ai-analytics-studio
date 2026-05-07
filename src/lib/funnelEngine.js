/**
 * funnelEngine.js — Funnel Analysis Engine
 * ConversionRate_i = Stage_i / Stage_i-1
 */

export function buildFunnel(rows, stageCol, valueCol = null) {
  if (!rows?.length || !stageCol) return null;

  // Count records per stage value
  const stageCounts = {};
  const stageValues = {};

  rows.forEach(row => {
    const stage = String(row[stageCol] || '');
    if (!stage || stage === 'null') return;
    stageCounts[stage] = (stageCounts[stage] || 0) + 1;
    if (valueCol) {
      const v = Number(row[valueCol]);
      if (!isNaN(v)) stageValues[stage] = (stageValues[stage] || 0) + v;
    }
  });

  // Try to detect stage order from values or alphabetical
  const stages = Object.keys(stageCounts).sort((a, b) => {
    // Numeric prefix ordering: "1_Awareness" < "2_Interest"
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    return stageCounts[b] - stageCounts[a]; // fallback: descending count (natural funnel shape)
  });

  if (stages.length < 2) return null;

  const topCount = stageCounts[stages[0]];
  const funnelSteps = stages.map((stage, i) => {
    const count = stageCounts[stage];
    const prevCount = i > 0 ? stageCounts[stages[i - 1]] : count;
    const conversionRate = i === 0 ? 100 : prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
    const dropOff = i === 0 ? 0 : prevCount - count;
    const dropOffPct = i === 0 ? 0 : prevCount > 0 ? Math.round(((prevCount - count) / prevCount) * 100) : 0;
    const overallPct = topCount > 0 ? Math.round((count / topCount) * 100) : 0;

    return {
      stage,
      count,
      conversionRate,
      dropOff,
      dropOffPct,
      overallPct,
      value: stageValues[stage] || null,
    };
  });

  const worstDropOff = funnelSteps.slice(1).reduce((worst, step) =>
    step.dropOffPct > (worst?.dropOffPct || 0) ? step : worst, null);

  const overallConversion = topCount > 0 ? Math.round((stageCounts[stages[stages.length - 1]] / topCount) * 100) : 0;

  return {
    steps: funnelSteps,
    overallConversion,
    worstDropOff,
    topOfFunnel: topCount,
    bottomOfFunnel: stageCounts[stages[stages.length - 1]],
    stageCount: stages.length,
  };
}

export function detectFunnelColumns(columns) {
  // Columns with funnel-like names
  const funnelHints = ['stage', 'step', 'funnel', 'phase', 'status', 'level', 'tier', 'journey'];
  return columns.filter(col =>
    col.type === 'category' &&
    funnelHints.some(hint => col.name.toLowerCase().includes(hint))
  );
}