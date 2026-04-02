import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { inferColumns, buildSemanticModel, buildAnalysis } from '@/lib/sampleData';
export { runAIAnalysis } from '@/lib/aiAnalyzer';

export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        const rows = results.data;
        const columns = inferColumns(rows);
        resolve({ rows, columns, errors: results.errors });
      },
      error: reject,
    });
  });
};

export const parseXLSX = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheets = workbook.SheetNames.map(name => {
          const ws = workbook.Sheets[name];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });
          const columns = inferColumns(rows);
          return { name, rows, columns };
        });
        resolve(sheets);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseJSON = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let data = JSON.parse(e.target.result);
        if (!Array.isArray(data)) {
          // Try to find array in object
          const arr = Object.values(data).find(v => Array.isArray(v));
          data = arr || [data];
        }
        const columns = inferColumns(data);
        resolve({ rows: data, columns });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const parseTXT = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve({ content: e.target.result, type: 'text' });
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
};

export const processUploadedFile = async (file, selectedSheet = null) => {
  const ext = file.name.split('.').pop().toLowerCase();
  const id = `table-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
  
  if (ext === 'csv') {
    const { rows, columns } = await parseCSV(file);
    const table = {
      id,
      name: file.name.replace('.csv', '').replace(/_/g, ' '),
      fileName: file.name,
      rows,
      columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
    };
    return { type: 'single', table };
    
  } else if (ext === 'xlsx' || ext === 'xls') {
    const sheets = await parseXLSX(file);
    if (sheets.length === 1 || selectedSheet !== null) {
      const sheet = selectedSheet !== null ? sheets[selectedSheet] : sheets[0];
      const table = {
        id,
        name: sheet.name,
        fileName: file.name,
        rows: sheet.rows,
        columns: sheet.columns,
        rowCount: sheet.rows.length,
        qualityScore: computeQualityScore(sheet.rows, sheet.columns),
        issues: detectIssues(sheet.rows, sheet.columns),
      };
      return { type: 'single', table };
    }
    return { type: 'multisheet', sheets, fileName: file.name };
    
  } else if (ext === 'json') {
    const { rows, columns } = await parseJSON(file);
    const table = {
      id,
      name: file.name.replace('.json', '').replace(/_/g, ' '),
      fileName: file.name,
      rows,
      columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
    };
    return { type: 'single', table };
    
  } else if (ext === 'txt') {
    const { content } = await parseTXT(file);
    return { type: 'document', content, fileName: file.name };
  }
  
  throw new Error(`Unsupported file type: .${ext}`);
};

const computeQualityScore = (rows, columns) => {
  if (!rows || rows.length === 0) return 0;
  let score = 100;
  columns.forEach(col => {
    const nullRate = col.nullCount / rows.length;
    if (nullRate > 0.5) score -= 15;
    else if (nullRate > 0.2) score -= 8;
    else if (nullRate > 0.05) score -= 3;
  });
  // Duplicate rows
  const rowStrings = rows.slice(0, 200).map(r => JSON.stringify(r));
  const uniqueRows = new Set(rowStrings).size;
  const dupRate = 1 - uniqueRows / rowStrings.length;
  if (dupRate > 0.1) score -= 10;
  return Math.max(0, Math.min(100, Math.round(score)));
};

const detectIssues = (rows, columns) => {
  const issues = [];
  columns.forEach(col => {
    const nullRate = col.nullCount / rows.length;
    if (nullRate > 0.2) {
      issues.push({ type: 'missing', column: col.name, message: `${Math.round(nullRate * 100)}% missing values in "${col.name}"` });
    }
  });
  const rowStrings = rows.slice(0, 200).map(r => JSON.stringify(r));
  const dupCount = rowStrings.length - new Set(rowStrings).size;
  if (dupCount > 0) {
    issues.push({ type: 'duplicate', message: `~${dupCount} duplicate rows detected` });
  }
  return issues;
};

export const buildTableSemanticModel = (table) => {
  return buildSemanticModel(table.id, table.columns, table.name);
};

export const buildTableAnalysis = (table) => {
  return buildAnalysis(table.rows, table.columns, table.name);
};