/**
 * Robust Data Parser — Phase 2 hardened version
 * Handles: CSV (comma/semicolon/tab), XLSX (serial dates, blank rows, dupes),
 * JSON (nested/flat), TXT/MD/PDF context docs
 * Never throws silently — always surfaces a user-friendly message.
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferColumns } from '@/lib/sampleData';

// ── Excel serial date → ISO string ───────────────────────────────
function excelSerialToDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const n = Number(serial);
  if (n < 1 || n > 2958465) return null; // sane range: 1900-01-01 to 9999-12-31
  const utcDays = Math.floor(n - 25569); // offset from Excel epoch to Unix epoch
  const utcValue = utcDays * 86400 * 1000;
  const d = new Date(utcValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}

// Heuristic: is this value an Excel date serial?
function looksLikeExcelSerial(val, colName) {
  if (typeof val !== 'number') return false;
  const n = Math.floor(val);
  // Common Excel date range: 1900-2100 → serials 1 to ~73000
  if (n < 1 || n > 73050) return false;
  return /date|month|year|period|day|time|created|updated|due|start|end/i.test(String(colName));
}

// ── Sanitize column name ──────────────────────────────────────────
function sanitizeColName(name, idx, seen) {
  let clean = String(name ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .toLowerCase();
  if (!clean) clean = `col_${idx}`;
  // Deduplicate
  let final = clean;
  let counter = 2;
  while (seen.has(final)) { final = `${clean}_${counter++}`; }
  seen.add(final);
  return final;
}

// ── CSV parser ───────────────────────────────────────────────────
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result || '';
      // Detect separator: check first 3 lines for ;, \t, ,
      const sampleLines = text.split('\n').slice(0, 5).join('\n');
      const semiCount = (sampleLines.match(/;/g) || []).length;
      const tabCount = (sampleLines.match(/\t/g) || []).length;
      const commaCount = (sampleLines.match(/,/g) || []).length;
      const delimiter = tabCount > semiCount && tabCount > commaCount ? '\t'
        : semiCount > commaCount ? ';' : ',';

      Papa.parse(text, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: true,
        delimiter,
        transformHeader: (h, idx) => {
          const seen = new Set();
          return sanitizeColName(h, idx, seen);
        },
        complete: (results) => {
          // De-dupe headers (papaparse may have already renamed, but reinforce)
          const seenKeys = new Set();
          const renamedFields = (results.meta?.fields || []).map((f, i) => sanitizeColName(f, i, seenKeys));

          const rows = (results.data || []).filter(r => {
            const vals = Object.values(r);
            return vals.some(v => v != null && String(v).trim() !== '');
          }).map(row => {
            // Remap to deduplicated keys
            const orig = Object.keys(row);
            const out = {};
            orig.forEach((k, i) => { out[renamedFields[i] || k] = row[k]; });
            return out;
          });

          const columns = inferColumns(rows);
          resolve({ rows, columns, errors: results.errors?.length ? results.errors.slice(0, 3) : [] });
        },
        error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
      });
    };
    reader.onerror = () => reject(new Error('Could not read file. Try re-saving it as UTF-8 CSV.'));
    reader.readAsText(file, 'UTF-8');
  });
};

// ── XLSX parser ───────────────────────────────────────────────────
export const parseXLSX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: false, // We handle date serials manually
          raw: false,
        });

        const sheets = workbook.SheetNames.map(sheetName => {
          const ws = workbook.Sheets[sheetName];
          if (!ws || !ws['!ref']) return { name: sheetName, rows: [], columns: [], rowCount: 0 };

          try {
            // Get raw rows as arrays (no auto-header)
            const rawRows = XLSX.utils.sheet_to_json(ws, {
              defval: null,
              raw: true,
              header: 1,
            });

            if (!rawRows.length) return { name: sheetName, rows: [], columns: [], rowCount: 0 };

            // Find first row with enough non-null values to be a header (scan up to 15 rows)
            const MIN_NON_EMPTY = Math.max(2, Math.floor((rawRows[0]?.length || 1) * 0.3));
            let headerRowIdx = 0;
            for (let i = 0; i < Math.min(15, rawRows.length); i++) {
              const nonEmpty = (rawRows[i] || []).filter(c =>
                c != null && String(c).trim() !== '' && String(c).trim() !== '0'
              ).length;
              if (nonEmpty >= MIN_NON_EMPTY) { headerRowIdx = i; break; }
            }

            const rawHeader = rawRows[headerRowIdx] || [];
            // Sanitize + deduplicate header
            const seenHeaders = new Set();
            const headers = rawHeader.map((h, i) => sanitizeColName(h, i, seenHeaders));

            // Build data rows
            const dataRows = rawRows.slice(headerRowIdx + 1).map(row => {
              const obj = {};
              headers.forEach((key, i) => {
                let val = row[i];

                // Convert Excel date serials to ISO strings
                if (looksLikeExcelSerial(val, key)) {
                  const iso = excelSerialToDate(val);
                  if (iso) { val = iso; }
                }

                // Convert XLSX Date objects
                if (val instanceof Date && !isNaN(val)) {
                  val = val.toISOString().split('T')[0];
                }

                obj[key] = val;
              });
              return obj;
            }).filter(r => {
              const vals = Object.values(r);
              return vals.some(v => v != null && String(v).trim() !== '');
            });

            if (!dataRows.length) return { name: sheetName, rows: [], columns: [], rowCount: 0 };

            const columns = inferColumns(dataRows);
            return { name: sheetName, rows: dataRows, columns, rowCount: dataRows.length };
          } catch (sheetErr) {
            console.warn(`[parseXLSX] Sheet "${sheetName}" failed:`, sheetErr.message);
            return { name: sheetName, rows: [], columns: [], rowCount: 0, parseError: sheetErr.message };
          }
        }).filter(s => s.rowCount > 0 || s.parseError);

        if (!sheets.length) {
          reject(new Error('This Excel file has no readable data sheets. Make sure the file has data rows below a header row.'));
          return;
        }
        resolve(sheets);
      } catch (err) {
        reject(new Error(`Excel file could not be opened: ${err.message}. Try re-saving as .xlsx from Excel or Google Sheets.`));
      }
    };
    reader.onerror = () => reject(new Error('Could not read the Excel file. The file may be corrupted.'));
    reader.readAsArrayBuffer(file);
  });
};

// ── JSON parser ───────────────────────────────────────────────────
export const parseJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target.result);

        // Unwrap common JSON structures: {data: []}, {results: []}, {items: []}
        if (!Array.isArray(data)) {
          const arrKey = ['data', 'results', 'items', 'rows', 'records', 'entries'].find(k => Array.isArray(data[k]));
          if (arrKey) {
            data = data[arrKey];
          } else {
            const firstArr = Object.values(data).find(v => Array.isArray(v) && v.length > 0);
            data = firstArr || [data];
          }
        }

        // Flatten one level of nesting
        data = data.map(item => {
          if (typeof item !== 'object' || item === null) return { value: item };
          const flat = {};
          Object.entries(item).forEach(([k, v]) => {
            const cleanKey = sanitizeColName(k, 0, new Set());
            if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
              Object.entries(v).forEach(([k2, v2]) => {
                flat[`${cleanKey}_${sanitizeColName(k2, 0, new Set())}`] = v2;
              });
            } else {
              flat[cleanKey] = v;
            }
          });
          return flat;
        }).filter(r => Object.keys(r).length > 0);

        if (!data.length) throw new Error('JSON file is empty or has no array data.');
        const columns = inferColumns(data);
        resolve({ rows: data, columns });
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}. Make sure the file contains a valid JSON array or object.`));
      }
    };
    reader.onerror = () => reject(new Error('Could not read JSON file.'));
    reader.readAsText(file, 'UTF-8');
  });
};

// ── TXT / MD parser ───────────────────────────────────────────────
export const parseTXT = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ content: e.target.result || '', type: 'text' });
    reader.onerror = () => reject(new Error('Could not read text file.'));
    reader.readAsText(file, 'UTF-8');
  });
};

// ── Quality score ─────────────────────────────────────────────────
export const computeQualityScore = (rows, columns) => {
  if (!rows?.length || !columns?.length) return 0;
  let score = 100;
  columns.forEach(col => {
    const nullRate = (col.nullCount || 0) / rows.length;
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

// ── Issue detection ───────────────────────────────────────────────
export const detectIssues = (rows, columns) => {
  const issues = [];
  if (!rows?.length) { issues.push({ type: 'empty', severity: 'high', message: 'No data rows found after parsing.' }); return issues; }

  columns.forEach(col => {
    const nullRate = (col.nullCount || 0) / rows.length;
    if (nullRate > 0.3) {
      issues.push({ type: 'missing', column: col.name, severity: 'high', message: `${Math.round(nullRate * 100)}% of values in "${col.name}" are missing — this may significantly impact analysis.` });
    } else if (nullRate > 0.1) {
      issues.push({ type: 'missing', column: col.name, severity: 'medium', message: `${Math.round(nullRate * 100)}% of values in "${col.name}" are missing.` });
    }
  });

  const rowStrings = rows.slice(0, 500).map(r => JSON.stringify(r));
  const dupCount = rowStrings.length - new Set(rowStrings).size;
  if (dupCount > 5) {
    issues.push({ type: 'duplicate', severity: dupCount > rows.length * 0.05 ? 'high' : 'low', message: `~${dupCount} duplicate rows detected. Consider deduplication before analysis.` });
  }

  const numericCols = columns.filter(c => c.type === 'numeric');
  if (numericCols.length === 0 && columns.length > 0) {
    issues.push({ type: 'no_numeric', severity: 'high', message: 'No numeric columns detected. AI analysis requires at least one measurable KPI column (e.g. revenue, count, score).' });
  }

  return issues;
};

// ── Main entry point ──────────────────────────────────────────────
export const processUploadedFile = async (file, selectedSheet = null) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const baseName = file.name
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, l => l.toUpperCase());

  if (ext === 'csv' || ext === 'tsv') {
    const { rows, columns, errors } = await parseCSV(file);
    if (!rows.length) throw new Error(`"${file.name}" appears empty or could not be parsed. Try re-exporting as UTF-8 CSV from your spreadsheet application.`);
    const table = {
      id, name: baseName, fileName: file.name, rows, columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
      parseWarnings: errors.length ? errors.map(e => e.message) : [],
    };
    return { type: 'single', table };

  } else if (ext === 'xlsx' || ext === 'xls') {
    const sheets = await parseXLSX(file);
    const validSheets = sheets.filter(s => s.rowCount > 0);

    if (!validSheets.length) {
      throw new Error(`No data found in "${file.name}". Make sure the Excel file has data rows beneath a header row, with no fully empty sheets.`);
    }

    if (validSheets.length === 1 || selectedSheet !== null) {
      const sheet = selectedSheet !== null ? (sheets[selectedSheet] || validSheets[0]) : validSheets[0];
      const table = {
        id, name: sheet.name || baseName, fileName: file.name,
        rows: sheet.rows, columns: sheet.columns,
        rowCount: sheet.rows.length,
        qualityScore: computeQualityScore(sheet.rows, sheet.columns),
        issues: detectIssues(sheet.rows, sheet.columns),
        parseWarnings: sheet.parseError ? [`Sheet "${sheet.name}" had parsing issues: ${sheet.parseError}`] : [],
      };
      return { type: 'single', table };
    }

    // Multiple valid sheets — let user pick
    return { type: 'multisheet', sheets: validSheets, fileName: file.name, baseName };

  } else if (ext === 'json') {
    const { rows, columns } = await parseJSON(file);
    if (!rows.length) throw new Error(`"${file.name}" is empty or has no array data.`);
    const table = {
      id, name: baseName, fileName: file.name, rows, columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
    };
    return { type: 'single', table };

  } else if (ext === 'txt' || ext === 'md') {
    const { content } = await parseTXT(file);
    return { type: 'document', content, fileName: file.name, name: baseName };

  } else if (ext === 'pdf' || ext === 'docx' || ext === 'doc') {
    return {
      type: 'document',
      content: `[${ext.toUpperCase()} document: "${file.name}" — uploaded as context reference for AI Analyst. For full text extraction, export as TXT from your editor.]`,
      fileName: file.name,
      name: baseName,
    };

  } else {
    throw new Error(`Unsupported file type: .${ext}. Supported formats: CSV, XLSX, XLS, JSON, TXT, MD, PDF, DOCX.`);
  }
};

export const buildTableSemanticModel = async (table) => {
  const { buildSemanticModel } = await import('@/lib/sampleData');
  return buildSemanticModel(table.id, table.columns, table.name);
};