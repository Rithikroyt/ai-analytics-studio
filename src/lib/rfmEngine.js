/**
 * rfmEngine.js — RFM Segmentation Engine
 * R = days since last purchase (lower = better → score 5)
 * F = count of transactions (higher = better → score 5)
 * M = total spend (higher = better → score 5)
 */

function quintile(sortedVals, val, invert = false) {
  const n = sortedVals.length;
  const idx = sortedVals.findIndex(v => v >= val);
  const pct = idx === -1 ? 1 : idx / n;
  const score = Math.ceil(pct * 5);
  return invert ? 6 - score : score;
}

export function buildRFM(rows, customerCol, dateCol, revenueCol) {
  if (!rows?.length || !customerCol || !dateCol || !revenueCol) return null;

  const refDate = Date.now();
  const customerMap = {};

  rows.forEach(row => {
    const cid = String(row[customerCol] || '');
    if (!cid || cid === 'null') return;

    const dateVal = new Date(row[dateCol]);
    const rev = Number(row[revenueCol]) || 0;
    if (isNaN(dateVal.getTime())) return;

    if (!customerMap[cid]) {
      customerMap[cid] = { customerId: cid, lastDate: dateVal.getTime(), txCount: 0, totalRevenue: 0 };
    }
    if (dateVal.getTime() > customerMap[cid].lastDate) customerMap[cid].lastDate = dateVal.getTime();
    customerMap[cid].txCount++;
    customerMap[cid].totalRevenue += rev;
  });

  const customers = Object.values(customerMap).map(c => ({
    ...c,
    recency: Math.round((refDate - c.lastDate) / (1000 * 60 * 60 * 24)),
  }));

  if (!customers.length) return null;

  // Sort arrays for quintile scoring
  const recencySorted = [...customers.map(c => c.recency)].sort((a, b) => a - b);
  const freqSorted = [...customers.map(c => c.txCount)].sort((a, b) => a - b);
  const monSorted = [...customers.map(c => c.totalRevenue)].sort((a, b) => a - b);

  const scored = customers.map(c => {
    const r = quintile(recencySorted, c.recency, true); // invert: lower recency = higher score
    const f = quintile(freqSorted, c.txCount, false);
    const m = quintile(monSorted, c.totalRevenue, false);
    const rfmScore = `${r}${f}${m}`;
    const segment = classifySegment(r, f, m);
    return { ...c, r_score: r, f_score: f, m_score: m, rfm_score: rfmScore, segment };
  });

  // Segment summary
  const segmentCounts = {};
  const segmentRevenue = {};
  scored.forEach(c => {
    segmentCounts[c.segment] = (segmentCounts[c.segment] || 0) + 1;
    segmentRevenue[c.segment] = (segmentRevenue[c.segment] || 0) + c.totalRevenue;
  });

  const segmentSummary = Object.entries(segmentCounts).map(([segment, count]) => ({
    segment,
    count,
    revenue: segmentRevenue[segment] || 0,
    pct: Math.round((count / scored.length) * 100),
    ...SEGMENT_META[segment],
  })).sort((a, b) => b.revenue - a.revenue);

  return {
    customers: scored,
    segmentSummary,
    totalCustomers: scored.length,
    avgRecency: Math.round(scored.reduce((s, c) => s + c.recency, 0) / scored.length),
    avgFrequency: +(scored.reduce((s, c) => s + c.txCount, 0) / scored.length).toFixed(1),
    avgMonetary: +(scored.reduce((s, c) => s + c.totalRevenue, 0) / scored.length).toFixed(2),
  };
}

function classifySegment(r, f, m) {
  if (r >= 4 && f >= 4 && m >= 4) return 'Champions';
  if (r >= 3 && f >= 3) return 'Loyal Customers';
  if (r >= 4 && f <= 2) return 'New Customers';
  if (r >= 3 && f >= 1 && m >= 3) return 'Potential Loyalists';
  if (r <= 2 && f >= 3) return 'At Risk';
  if (r <= 2 && f >= 4 && m >= 4) return "Can't Lose Them";
  if (r <= 2 && f <= 2 && m <= 2) return 'Hibernating';
  if (m >= 4 && f <= 2) return 'Big Spenders';
  if (r <= 1 && f <= 1) return 'Lost';
  return 'Promising';
}

export const SEGMENT_META = {
  'Champions':           { color: '#00e5ff', emoji: '🏆', action: 'Reward them — they power your growth' },
  'Loyal Customers':     { color: '#4caf50', emoji: '💚', action: 'Upsell and ask for reviews' },
  'New Customers':       { color: '#7b2fff', emoji: '✨', action: 'Onboard well, offer early value' },
  'Potential Loyalists': { color: '#00bfa5', emoji: '🌱', action: 'Build habit with loyalty program' },
  'At Risk':             { color: '#ff6b35', emoji: '⚠️', action: 'Urgent: win-back campaign' },
  "Can't Lose Them":     { color: '#ff2d7a', emoji: '🚨', action: 'High-value churn risk — act now' },
  'Hibernating':         { color: '#ffcc02', emoji: '😴', action: 'Reactivation offer or sunset' },
  'Big Spenders':        { color: '#e91e63', emoji: '💰', action: 'High-value — increase frequency' },
  'Lost':                { color: '#ffffff33', emoji: '👋', action: 'Low ROI — optional re-engagement' },
  'Promising':           { color: '#29b6f6', emoji: '🔮', action: 'Nurture with personalized content' },
};