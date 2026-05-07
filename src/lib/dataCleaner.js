/**
 * Data Cleaner — Browser-side cleaning pipeline
 * Mirrors the Python clean_dataset pipeline for in-browser use
 */

export function normalizeColumnName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function standardizeColumns(columns) {
  return columns.map(col => ({ ...col, name: normalizeColumnName(col.name) }));
}

export function trimStringValues(rows, columns) {
  const strCols = columns.filter(c => c.type === 'text' || c.type === 'category').map(c => c.name);
  return rows.map(row => {
    const newRow = { ...row };
    strCols.forEach(col => {
      const v = newRow[col];
      if (typeof v === 'string') {
        const trimmed = v.trim();
        newRow[col] = (trimmed === '' || trimmed.toLowerCase() === 'nan' || trimmed.toLowerCase() === 'null') ? null : trimmed;
      }
    });
    return newRow;
  });
}

export function removeExactDuplicates(rows) {
  const seen = new Set();
  const cleaned = [];
  rows.forEach(row => {
    const key = JSON.stringify(row);
    if (!seen.has(key)) { seen.add(key); cleaned.push(row); }
  });
  return { rows: cleaned, removed: rows.length - cleaned.length };
}

export function detectFuzzyDuplicates(rows, keyColumns) {
  if (!keyColumns?.length) return [];
  const groups = {};
  rows.forEach((row, i) => {
    const key = keyColumns.map(k => String(row[k] || '').toLowerCase().trim()).join('|');
    if (!groups[key]) groups[key] = [];
    groups[key].push(i);
  });
  return Object.values(groups).filter(g => g.length > 1);
}

export function imputeNulls(rows, columns) {
  const stats = {};
  columns.forEach(col => {
    const vals = rows.map(r => r[col.name]).filter(v => v != null && v !== '');
    if (col.type === 'numeric') {
      const nums = vals.map(Number).filter(n => !isNaN(n)).sort((a, b) => a - b);
      stats[col.name] = { strategy: 'median', value: nums.length ? nums[Math.floor(nums.length / 2)] : 0 };
    } else if (col.type === 'category' || col.type === 'text') {
      const freq = {};
      vals.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
      const mode = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
      stats[col.name] = { strategy: 'mode', value: mode };
    }
  });

  const imputed = rows.map(row => {
    const newRow = { ...row };
    columns.forEach(col => {
      if ((newRow[col.name] == null || newRow[col.name] === '') && stats[col.name]) {
        newRow[col.name] = stats[col.name].value;
      }
    });
    return newRow;
  });

  return { rows: imputed, stats };
}

export function standardizeDates(rows, dateColumns) {
  if (!dateColumns?.length) return rows;
  return rows.map(row => {
    const newRow = { ...row };
    dateColumns.forEach(col => {
      const v = newRow[col];
      if (v != null && v !== '') {
        const d = new Date(v);
        if (!isNaN(d)) newRow[col] = d.toISOString().slice(0, 10);
      }
    });
    return newRow;
  });
}

export function normalizeNumericColumn(rows, colName, method = 'minmax') {
  const vals = rows.map(r => Number(r[colName])).filter(n => !isNaN(n));
  if (!vals.length) return rows;

  if (method === 'minmax') {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return rows.map(r => {
      const v = Number(r[colName]);
      return { ...r, [`${colName}_normalized`]: isNaN(v) ? null : +((v - min) / range).toFixed(4) };
    });
  }

  if (method === 'zscore') {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
    return rows.map(r => {
      const v = Number(r[colName]);
      return { ...r, [`${colName}_zscore`]: isNaN(v) ? null : +((v - mean) / std).toFixed(4) };
    });
  }

  return rows;
}

export function joinTables(leftRows, rightRows, leftKey, rightKey, columns, joinType = 'left') {
  const rightIndex = {};
  rightRows.forEach(row => {
    const key = String(row[rightKey]);
    if (!rightIndex[key]) rightIndex[key] = [];
    rightIndex[key].push(row);
  });

  const result = [];
  leftRows.forEach(leftRow => {
    const key = String(leftRow[leftKey]);
    const matches = rightIndex[key] || [];
    if (matches.length > 0) {
      matches.forEach(rightRow => {
        const merged = { ...leftRow };
        columns.forEach(col => { merged[`lookup_${col}`] = rightRow[col]; });
        result.push(merged);
      });
    } else if (joinType === 'left') {
      const merged = { ...leftRow };
      columns.forEach(col => { merged[`lookup_${col}`] = null; });
      result.push(merged);
    }
  });
  return result;
}

export function pivotTable(rows, rowDimension, valueDimension, aggregation = 'sum') {
  const groups = {};
  rows.forEach(row => {
    const key = String(row[rowDimension] || '');
    const val = Number(row[valueDimension]);
    if (!groups[key]) groups[key] = { _key: key, _vals: [], _count: 0 };
    if (!isNaN(val)) { groups[key]._vals.push(val); groups[key]._count++; }
  });

  return Object.values(groups).map(g => {
    const sum = g._vals.reduce((a, b) => a + b, 0);
    let value;
    if (aggregation === 'sum') value = sum;
    else if (aggregation === 'avg') value = g._vals.length ? sum / g._vals.length : 0;
    else if (aggregation === 'count') value = g._count;
    else if (aggregation === 'min') value = Math.min(...g._vals);
    else if (aggregation === 'max') value = Math.max(...g._vals);
    return { [rowDimension]: g._key, [valueDimension]: +value.toFixed(2), count: g._count };
  }).sort((a, b) => b[valueDimension] - a[valueDimension]);
}

export function validateColumn(rows, colName, rule) {
  const violations = [];
  rows.forEach((row, i) => {
    const v = row[colName];
    if (rule.required && (v == null || v === '')) violations.push({ row: i, value: v, reason: 'required' });
    if (rule.min != null && Number(v) < rule.min) violations.push({ row: i, value: v, reason: `below min ${rule.min}` });
    if (rule.max != null && Number(v) > rule.max) violations.push({ row: i, value: v, reason: `above max ${rule.max}` });
    if (rule.allowedValues?.length && !rule.allowedValues.includes(String(v))) violations.push({ row: i, value: v, reason: `not in allowed values` });
    if (rule.pattern && !new RegExp(rule.pattern).test(String(v || ''))) violations.push({ row: i, value: v, reason: `pattern mismatch` });
  });
  return violations;
}

/**
 * Full cleaning pipeline — mirrors Python clean_dataset
 */
export function cleanDataset(rows, columns, options = {}) {
  const originalCount = rows.length;
  const log = [];

  // Step 1: Normalize column names
  const normalizedCols = standardizeColumns(columns);
  const colNameMap = {};
  columns.forEach((c, i) => { colNameMap[c.name] = normalizedCols[i].name; });
  let cleanedRows = rows.map(row => {
    const newRow = {};
    Object.entries(row).forEach(([k, v]) => { newRow[normalizeColumnName(k)] = v; });
    return newRow;
  });
  log.push('Column names normalized');

  // Step 2: Trim strings
  cleanedRows = trimStringValues(cleanedRows, normalizedCols);
  log.push('String whitespace trimmed');

  // Step 3: Remove exact duplicates
  const { rows: dedupedRows, removed } = removeExactDuplicates(cleanedRows);
  cleanedRows = dedupedRows;
  if (removed > 0) log.push(`${removed} exact duplicates removed`);

  // Step 4: Standardize dates
  const dateCols = normalizedCols.filter(c => c.type === 'date').map(c => c.name);
  cleanedRows = standardizeDates(cleanedRows, dateCols);
  if (dateCols.length) log.push(`Dates standardized to ISO 8601 (${dateCols.join(', ')})`);

  // Step 5: Impute nulls
  const { rows: imputedRows, stats: imputeStats } = imputeNulls(cleanedRows, normalizedCols);
  cleanedRows = imputedRows;
  log.push('Null values imputed (median for numeric, mode for categorical)');

  const profile = {
    originalRows: originalCount,
    cleanedRows: cleanedRows.length,
    duplicatesRemoved: removed,
    columnsNormalized: Object.keys(colNameMap).filter(k => k !== colNameMap[k]).length,
    imputationStats: imputeStats,
    steps: log,
  };

  return { rows: cleanedRows, columns: normalizedCols, profile };
}