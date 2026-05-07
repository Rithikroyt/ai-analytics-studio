/**
 * Quality Scorer — Weighted data quality formula
 * QS = 0.35×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.10×Consistency + 0.10×Timeliness
 */

export function computeQualityScore(rows = [], columns = []) {
  if (!rows.length || !columns.length) return 0;

  const totalCells = rows.length * columns.length;

  // Completeness = 1 - missing_rate
  let missingCells = 0;
  columns.forEach(col => {
    rows.forEach(row => {
      const v = row[col.name];
      if (v == null || v === '' || String(v).toLowerCase() === 'nan' || String(v).toLowerCase() === 'null') missingCells++;
    });
  });
  const completeness = 1 - (missingCells / totalCells);

  // Validity = valid_format_cells / total_cells
  let validCells = 0;
  columns.forEach(col => {
    rows.forEach(row => {
      const v = row[col.name];
      if (col.type === 'numeric') {
        if (!isNaN(Number(v)) && v != null && v !== '') validCells++;
      } else if (col.type === 'date') {
        if (v && !isNaN(Date.parse(String(v)))) validCells++;
      } else {
        if (v != null && v !== '') validCells++;
      }
    });
  });
  const validity = validCells / totalCells;

  // Uniqueness = 1 - duplicate_rate
  const rowStrings = rows.map(r => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings).size;
  const uniqueness = uniqueRows / rows.length;

  // Consistency = standardized cells / total (proxy: no mixed types within a column)
  let consistentCells = 0;
  columns.forEach(col => {
    rows.forEach(row => {
      const v = row[col.name];
      if (col.type === 'numeric' && !isNaN(Number(v)) && v != null) consistentCells++;
      else if (col.type === 'category' && typeof v === 'string' && v.trim().length > 0) consistentCells++;
      else if (col.type === 'date' && v != null) consistentCells++;
      else if (col.type === 'text' || col.type === 'id') consistentCells++;
    });
  });
  const consistency = consistentCells / totalCells;

  // Timeliness = recent_records / total (if date column exists, else 1.0)
  const dateCol = columns.find(c => c.type === 'date');
  let timeliness = 1.0;
  if (dateCol) {
    const now = Date.now();
    const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000;
    const recentRows = rows.filter(r => {
      const d = Date.parse(String(r[dateCol.name]));
      return !isNaN(d) && d >= twoYearsAgo;
    }).length;
    timeliness = recentRows / rows.length;
  }

  const score = (
    0.35 * completeness +
    0.25 * validity +
    0.20 * uniqueness +
    0.10 * consistency +
    0.10 * timeliness
  );

  return Math.round(score * 100);
}

export function computeColumnProfile(rows = [], col) {
  const values = rows.map(r => r[col.name]).filter(v => v != null && v !== '');
  const missing = rows.length - values.length;
  const missingPct = rows.length ? Math.round((missing / rows.length) * 100) : 0;
  const unique = new Set(values.map(String)).size;

  let mean = null, std = null, min = null, max = null, median = null;
  if (col.type === 'numeric') {
    const nums = values.map(Number).filter(n => !isNaN(n));
    if (nums.length) {
      mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      std = Math.sqrt(nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length);
      min = Math.min(...nums);
      max = Math.max(...nums);
      const sorted = [...nums].sort((a, b) => a - b);
      median = sorted[Math.floor(sorted.length / 2)];
      mean = +mean.toFixed(2);
      std = +std.toFixed(2);
    }
  } else {
    const strs = values.map(String);
    if (strs.length) { min = strs[0]; max = strs[strs.length - 1]; }
  }

  return { missingPct, uniqueCount: unique, nullCount: missing, mean, std, min, max, median, sampleValues: values.slice(0, 5).map(String) };
}

export function detectDuplicates(rows = []) {
  const seen = {};
  const dupes = [];
  rows.forEach((row, i) => {
    const key = JSON.stringify(row);
    if (seen[key] !== undefined) dupes.push({ index: i, firstSeenAt: seen[key] });
    else seen[key] = i;
  });
  return dupes;
}

export function generateCleaningReport(rows, columns, originalCount) {
  const dupes = detectDuplicates(rows);
  const missingByCol = {};
  columns.forEach(col => {
    const missing = rows.filter(r => r[col.name] == null || r[col.name] === '').length;
    if (missing > 0) missingByCol[col.name] = missing;
  });

  return {
    originalRows: originalCount,
    cleanedRows: rows.length,
    duplicatesRemoved: originalCount - rows.length,
    duplicatesFound: dupes.length,
    missingValuesByColumn: missingByCol,
    totalMissingCells: Object.values(missingByCol).reduce((a, b) => a + b, 0),
    qualityScore: computeQualityScore(rows, columns),
    recommendations: [
      ...Object.entries(missingByCol).filter(([, v]) => v > rows.length * 0.1).map(([col]) => `Fill missing values in "${col}" (>${Math.round(missingByCol[col] / rows.length * 100)}% missing)`),
      ...(dupes.length > 0 ? [`Remove ${dupes.length} duplicate rows`] : []),
    ],
  };
}