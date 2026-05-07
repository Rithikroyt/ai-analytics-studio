/**
 * qualityScorer.js — Weighted Data Quality Score
 * QS = 0.35×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.10×Consistency + 0.10×Timeliness
 */

export function computeQualityScore(rows = [], columns = []) {
  if (!rows.length || !columns.length) return { score: 0, breakdown: {} };

  const totalCells = rows.length * columns.length;

  // Completeness = 1 - missing_rate
  let missingCells = 0;
  rows.forEach(row => {
    columns.forEach(col => {
      const v = row[col.name];
      if (v == null || v === '' || v === 'null' || v === 'undefined' || v === 'NaN') missingCells++;
    });
  });
  const completeness = 1 - (missingCells / totalCells);

  // Validity = valid format cells / total cells
  let validCells = 0;
  rows.forEach(row => {
    columns.forEach(col => {
      const v = row[col.name];
      if (v == null || v === '') return;
      if (col.type === 'numeric') {
        if (!isNaN(Number(v))) validCells++;
      } else if (col.type === 'date') {
        if (!isNaN(Date.parse(String(v)))) validCells++;
      } else {
        validCells++; // text/category always valid if present
      }
    });
  });
  const validity = validCells / totalCells;

  // Uniqueness = 1 - duplicate_rate
  const rowHashes = rows.map(row => JSON.stringify(row));
  const uniqueRows = new Set(rowHashes).size;
  const uniqueness = uniqueRows / rows.length;

  // Consistency = columns with standardized values / total columns
  let consistentCols = 0;
  columns.forEach(col => {
    if (col.type === 'numeric') {
      const vals = rows.map(r => r[col.name]).filter(v => v != null && v !== '');
      const allNumeric = vals.every(v => !isNaN(Number(v)));
      if (allNumeric) consistentCols++;
    } else if (col.type === 'category') {
      // Check casing consistency
      const vals = rows.map(r => String(r[col.name] || '')).filter(Boolean);
      const hasLower = vals.some(v => v === v.toLowerCase());
      const hasUpper = vals.some(v => v === v.toUpperCase() && v.length > 1);
      if (!hasLower || !hasUpper) consistentCols++; // consistent casing
      else consistentCols += 0.5;
    } else {
      consistentCols++;
    }
  });
  const consistency = consistentCols / columns.length;

  // Timeliness = recent_records / total (based on date column if present)
  let timeliness = 0.8; // default if no date
  const dateCol = columns.find(c => c.type === 'date');
  if (dateCol) {
    const now = Date.now();
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
    const recentRows = rows.filter(r => {
      const d = Date.parse(String(r[dateCol.name] || ''));
      return !isNaN(d) && d >= twoYearsAgo;
    });
    timeliness = recentRows.length / rows.length;
  }

  const score = Math.round(
    (completeness * 0.35 + validity * 0.25 + uniqueness * 0.20 + consistency * 0.10 + timeliness * 0.10) * 100
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown: {
      completeness: Math.round(completeness * 100),
      validity: Math.round(validity * 100),
      uniqueness: Math.round(uniqueness * 100),
      consistency: Math.round(consistency * 100),
      timeliness: Math.round(timeliness * 100),
    },
    missingCells,
      duplicateRows: rows.length - uniqueRows,
    totalCells,
  };
}

export function getQualityLabel(score) {
  if (score >= 90) return { label: 'Excellent', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25' };
  if (score >= 75) return { label: 'Good', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/25' };
  if (score >= 60) return { label: 'Fair', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25' };
  return { label: 'Poor — Review Required', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/25' };
}