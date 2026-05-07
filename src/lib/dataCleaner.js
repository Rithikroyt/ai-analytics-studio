/**
 * dataCleaner.js — Browser-side data cleaning pipeline
 * Mirrors the Python clean_dataset() logic for client-side processing
 *
 * Pipeline:
 * 1. Normalize column names
 * 2. Strip whitespace + hidden characters
 * 3. Remove exact duplicates
 * 4. Detect & standardize dates
 * 5. Null imputation (median for numeric, mode for categorical)
 * 6. Flag noisy values / invalid formats
 * 7. Return cleaned rows + profile
 */

function normalizeColName(name) {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function median(vals) {
  if (!vals.length) return 0;
  const s = [...vals].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function mode(vals) {
  const freq = {};
  vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

function isDateLike(val) {
  if (!val || typeof val !== 'string') return false;
  return !isNaN(Date.parse(val)) && val.length > 4;
}

function parseDate(val) {
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export function cleanDataset(rows, columns) {
  if (!rows?.length || !columns?.length) return { cleanedRows: rows, cleanedColumns: columns, profile: {} };

  const before = rows.length;

  // Step 1: Normalize column names
  const colMap = {}; // old name → new name
  const cleanedColumns = columns.map(col => {
    const newName = normalizeColName(col.name);
    colMap[col.name] = newName;
    return { ...col, name: newName };
  });

  // Step 2: Rename keys in all rows
  let cleanedRows = rows.map(row => {
    const newRow = {};
    Object.entries(row).forEach(([k, v]) => {
      const newKey = colMap[k] || normalizeColName(k);
      // Strip whitespace from strings
      newRow[newKey] = typeof v === 'string' ? v.trim().replace(/[\u200B\u200C\u200D\uFEFF]/g, '') : v;
    });
    return newRow;
  });

  // Step 3: Remove exact duplicates
  const seen = new Set();
  cleanedRows = cleanedRows.filter(row => {
    const h = JSON.stringify(row);
    if (seen.has(h)) return false;
    seen.add(h);
    return true;
  });
  const duplicatesRemoved = before - cleanedRows.length;

  // Step 4: Standardize dates
  cleanedColumns.forEach(col => {
    if (col.type === 'date' || /date|month|time|period|year/i.test(col.name)) {
      cleanedRows = cleanedRows.map(row => {
        const v = row[col.name];
        if (v && isDateLike(String(v))) {
          return { ...row, [col.name]: parseDate(String(v)) || v };
        }
        return row;
      });
    }
  });

  // Step 5: Null imputation
  const nullsBefore = {};
  const nullsAfter = {};

  cleanedColumns.forEach(col => {
    const nullCount = cleanedRows.filter(r => r[col.name] == null || r[col.name] === '' || r[col.name] === 'null').length;
    nullsBefore[col.name] = nullCount;

    if (nullCount === 0) { nullsAfter[col.name] = 0; return; }

    if (col.type === 'numeric') {
      const vals = cleanedRows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
      const fill = median(vals);
      cleanedRows = cleanedRows.map(row => {
        const v = row[col.name];
        if (v == null || v === '' || isNaN(Number(v))) return { ...row, [col.name]: fill };
        return row;
      });
    } else if (col.type === 'category' || col.type === 'text') {
      const vals = cleanedRows.map(r => r[col.name]).filter(v => v != null && v !== '' && v !== 'null');
      const fill = mode(vals) || 'Unknown';
      cleanedRows = cleanedRows.map(row => {
        const v = row[col.name];
        if (v == null || v === '' || v === 'null') return { ...row, [col.name]: fill };
        return row;
      });
    }
    nullsAfter[col.name] = 0;
  });

  // Step 6: Flag noisy numeric values (>5σ outliers)
  const flaggedRows = new Set();
  cleanedColumns.forEach(col => {
    if (col.type !== 'numeric') return;
    const vals = cleanedRows.map(r => Number(r[col.name])).filter(v => !isNaN(v));
    if (vals.length < 10) return;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    cleanedRows.forEach((row, i) => {
      const v = Number(row[col.name]);
      if (!isNaN(v) && Math.abs(v - mean) > 5 * std) flaggedRows.add(i);
    });
  });

  const profile = {
    rowsBefore: before,
    rowsAfter: cleanedRows.length,
    duplicatesRemoved,
    nullsImputedBefore: nullsBefore,
    nullsAfter,
    noisyRowsFlagged: flaggedRows.size,
    columnNamesNormalized: Object.entries(colMap).filter(([a, b]) => a !== b).length,
  };

  return { cleanedRows, cleanedColumns, profile };
}

export function applyNormalization(rows, colName, method = 'minmax') {
  const vals = rows.map(r => Number(r[colName])).filter(v => !isNaN(v));
  if (!vals.length) return rows;

  if (method === 'minmax') {
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    return rows.map(r => ({ ...r, [`${colName}_norm`]: +((Number(r[colName]) - min) / range).toFixed(4) }));
  }

  if (method === 'zscore') {
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const std = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length) || 1;
    return rows.map(r => ({ ...r, [`${colName}_z`]: +((Number(r[colName]) - mean) / std).toFixed(4) }));
  }

  return rows;
}

export function vlookup(mainRows, lookupRows, keyCol, lookupKeyCol, returnCols) {
  const lookupMap = {};
  lookupRows.forEach(row => { lookupMap[String(row[lookupKeyCol])] = row; });
  return mainRows.map(row => {
    const match = lookupMap[String(row[keyCol])];
    const extra = {};
    if (match) returnCols.forEach(c => { extra[`lookup_${c}`] = match[c]; });
    else returnCols.forEach(c => { extra[`lookup_${c}`] = null; });
    return { ...row, ...extra };
  });
}

export function pivotTable(rows, rowDim, colDim, valueCol, aggFn = 'sum') {
  const result = {};
  const allColVals = new Set();

  rows.forEach(row => {
    const rk = String(row[rowDim] || '');
    const ck = String(row[colDim] || '');
    const v = Number(row[valueCol]);
    allColVals.add(ck);
    if (!result[rk]) result[rk] = {};
    if (!result[rk][ck]) result[rk][ck] = { sum: 0, count: 0, vals: [] };
    if (!isNaN(v)) { result[rk][ck].sum += v; result[rk][ck].count++; result[rk][ck].vals.push(v); }
  });

  const colHeaders = [...allColVals].sort();
  const pivotRows = Object.entries(result).map(([rowKey, cols]) => {
    const out = { [rowDim]: rowKey };
    colHeaders.forEach(ck => {
      const d = cols[ck] || { sum: 0, count: 0, vals: [] };
      if (aggFn === 'sum') out[ck] = d.sum;
      else if (aggFn === 'avg') out[ck] = d.count ? +(d.sum / d.count).toFixed(2) : 0;
      else if (aggFn === 'count') out[ck] = d.count;
      else out[ck] = d.sum;
    });
    return out;
  });

  return { pivotRows, colHeaders, rowDim };
}