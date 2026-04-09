/**
 * Robust Data Parser — handles CSV, XLSX, JSON, TXT
 * Graceful error handling for real-world messy files
 */
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferColumns } from '@/lib/sampleData';

// ── CSV parser ───────────────────────────────────────────────────
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: true,
      transformHeader: (h) => h.trim().replace(/\s+/g, '_').toLowerCase(),
      complete: (results) => {
        const rows = results.data.filter(r => {
          const vals = Object.values(r);
          return vals.some(v => v != null && String(v).trim() !== '');
        });
        const columns = inferColumns(rows);
        resolve({ rows, columns, errors: results.errors });
      },
      error: (err) => reject(new Error(`CSV parse error: ${err.message}`)),
    });
  });
};

// ── XLSX parser ───────────────────────────────────────────────────
export const parseXLSX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true, dateNF: 'yyyy-mm-dd' });
        const sheets = workbook.SheetNames.map(name => {
          const ws = workbook.Sheets[name];
          if (!ws) return { name, rows: [], columns: [], rowCount: 0 };

          // Clean: find actual header row by scanning first 10 rows
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
          const rawRows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false, header: 1 });

          // Find first non-empty row to use as header
          let headerRowIdx = 0;
          for (let i = 0; i < Math.min(10, rawRows.length); i++) {
            const row = rawRows[i];
            const nonEmpty = row.filter(c => c != null && String(c).trim() !== '').length;
            if (nonEmpty >= 2) { headerRowIdx = i; break; }
          }

          // Build clean header
          const headerRaw = rawRows[headerRowIdx] || [];
          const seen = {};
          const header = headerRaw.map((h, i) => {
            let clean = String(h || '').trim().replace(/\s+/g, '_').toLowerCase() || `col_${i}`;
            if (seen[clean]) { clean = `${clean}_${i}`; }
            seen[clean] = true;
            return clean;
          }).filter((h, i) => h !== '' && headerRaw[i] != null);

          // Build rows from data after header
          const dataRows = rawRows.slice(headerRowIdx + 1).map(row => {
            const obj = {};
            header.forEach((key, i) => {
              let val = row[i];
              if (val instanceof Date) val = val.toISOString().split('T')[0];
              obj[key] = val;
            });
            return obj;
          }).filter(r => {
            const vals = Object.values(r);
            return vals.some(v => v != null && String(v).trim() !== '');
          });

          const columns = inferColumns(dataRows);
          return { name, rows: dataRows, columns, rowCount: dataRows.length };
        }).filter(s => s.rowCount > 0);

        resolve(sheets);
      } catch (err) {
        reject(new Error(`Excel parse error: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
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
        // Unwrap nested arrays
        if (!Array.isArray(data)) {
          const arr = Object.values(data).find(v => Array.isArray(v));
          data = arr || [data];
        }
        // Flatten one level of nesting
        data = data.map(item => {
          const flat = {};
          Object.entries(item || {}).forEach(([k, v]) => {
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              Object.entries(v).forEach(([k2, v2]) => { flat[`${k}_${k2}`] = v2; });
            } else {
              flat[k] = v;
            }
          });
          return flat;
        });
        const columns = inferColumns(data);
        resolve({ rows: data, columns });
      } catch (err) {
        reject(new Error(`JSON parse error: ${err.message}`));
      }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
};

// ── TXT parser (context doc) ──────────────────────────────────────
export const parseTXT = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ content: e.target.result, type: 'text' });
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsText(file);
  });
};

// ── Quality score ─────────────────────────────────────────────────
export const computeQualityScore = (rows, columns) => {
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

// ── Issue detection ───────────────────────────────────────────────
export const detectIssues = (rows, columns) => {
  const issues = [];
  columns.forEach(col => {
    const nullRate = col.nullCount / rows.length;
    if (nullRate > 0.3) {
      issues.push({ type: 'missing', column: col.name, severity: 'high', message: `${Math.round(nullRate * 100)}% missing values in "${col.name}" — may impact analysis quality.` });
    } else if (nullRate > 0.1) {
      issues.push({ type: 'missing', column: col.name, severity: 'medium', message: `${Math.round(nullRate * 100)}% missing values in "${col.name}".` });
    }
  });
  const rowStrings = rows.slice(0, 300).map(r => JSON.stringify(r));
  const dupCount = rowStrings.length - new Set(rowStrings).size;
  if (dupCount > 0) {
    issues.push({ type: 'duplicate', severity: dupCount > rows.length * 0.05 ? 'high' : 'low', message: `~${dupCount} duplicate rows detected — consider deduplication.` });
  }
  return issues;
};

// ── Main entry point ──────────────────────────────────────────────
export const processUploadedFile = async (file, selectedSheet = null) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const id = `table-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').trim();

  if (ext === 'csv' || ext === 'tsv') {
    const { rows, columns } = await parseCSV(file);
    if (!rows.length) throw new Error('CSV file appears empty or could not be parsed. Check the file format.');
    const table = {
      id, name: baseName, fileName: file.name, rows, columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
    };
    return { type: 'single', table };

  } else if (ext === 'xlsx' || ext === 'xls') {
    const sheets = await parseXLSX(file);
    if (!sheets.length) throw new Error('Excel file contains no readable data sheets.');
    if (sheets.length === 1 || selectedSheet !== null) {
      const sheet = selectedSheet !== null ? sheets[selectedSheet] : sheets[0];
      if (!sheet.rows.length) throw new Error(`Sheet "${sheet.name}" appears empty. Try selecting a different sheet.`);
      const table = {
        id, name: sheet.name, fileName: file.name, rows: sheet.rows, columns: sheet.columns,
        rowCount: sheet.rows.length,
        qualityScore: computeQualityScore(sheet.rows, sheet.columns),
        issues: detectIssues(sheet.rows, sheet.columns),
      };
      return { type: 'single', table };
    }
    return { type: 'multisheet', sheets, fileName: file.name, baseName };

  } else if (ext === 'json') {
    const { rows, columns } = await parseJSON(file);
    if (!rows.length) throw new Error('JSON file appears empty or has no array data.');
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

  } else {
    throw new Error(`Unsupported file type: .${ext}. Supported formats: CSV, XLSX, XLS, JSON, TXT.`);
  }
};

export const buildTableSemanticModel = async (table) => {
  const { buildSemanticModel } = await import('@/lib/sampleData');
  return buildSemanticModel(table.id, table.columns, table.name);
};