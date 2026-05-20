/**
 * processDataset — Phase 1 & 2: Data Engineering + Quality Layer
 * Parses CSV/XLSX files, infers schema, profiles columns, calculates quality scores
 * Creates DataSource, DatasetVersion (raw+cleaned), ColumnProfile, ProcessingLog records
 */
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Papa from 'npm:papaparse@5.5.3';
import * as XLSX from 'npm:xlsx@0.18.5';

// ── Quality Scoring Formulas ──────────────────────────────────────────────────
function computeQualityScores({ totalCells, missingCells, validCells, duplicateRows, totalRows, standardizedCells, recentRows }) {
  const completeness = totalCells > 0 ? 1 - missingCells / totalCells : 1;
  const validity = totalCells > 0 ? validCells / totalCells : 1;
  const uniqueness = totalRows > 0 ? 1 - duplicateRows / totalRows : 1;
  const consistency = totalCells > 0 ? standardizedCells / totalCells : 1;
  const timeliness = totalRows > 0 ? recentRows / totalRows : 0.5;

  const qualityScore = Math.round((
    0.30 * completeness +
    0.25 * validity +
    0.20 * uniqueness +
    0.15 * consistency +
    0.10 * timeliness
  ) * 100);

  return { completeness, validity, uniqueness, consistency, timeliness, qualityScore };
}

// ── Column Type Inference ─────────────────────────────────────────────────────
function inferColumnType(values) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'string';

  const datePatterns = [/^\d{4}-\d{2}-\d{2}/, /^\d{1,2}\/\d{1,2}\/\d{2,4}/, /^\d{4}\/\d{2}\/\d{2}/];
  const isDate = nonNull.slice(0, 20).every(v => datePatterns.some(p => p.test(String(v))));
  if (isDate) return 'date';

  const numericCount = nonNull.filter(v => !isNaN(parseFloat(String(v).replace(/,/g, ''))) && isFinite(String(v).replace(/,/g, ''))).length;
  if (numericCount / nonNull.length >= 0.85) return 'numeric';

  const boolValues = ['true', 'false', 'yes', 'no', '1', '0'];
  if (nonNull.every(v => boolValues.includes(String(v).toLowerCase()))) return 'boolean';

  return 'string';
}

function inferSemanticType(colName, type) {
  const n = colName.toLowerCase();
  if (/_id$|^id$|^id_|uuid|record_id|row_id/.test(n)) return 'id';
  if (/revenue|sales|income|gross/.test(n)) return 'currency_measure';
  if (/cost|expense|spend|payment|fee|price|salary|wage|payroll|labor/.test(n)) return 'currency_measure';
  if (/profit|margin|earnings/.test(n)) return 'currency_measure';
  if (/count|num_|number_|qty|quantity|headcount|sessions|visits|clicks/.test(n)) return 'count_measure';
  if (/rate|ratio|pct|percent|percentage|conversion|retention|churn/.test(n)) return 'rate_measure';
  if (/date|month|year|quarter|week|period|time|created|updated|timestamp/.test(n)) return 'date_dim';
  if (/department|category|type|status|region|country|city|state|channel|product|segment|group|tier|plan|source|campaign|role|team/.test(n)) return 'category_dim';
  if (/rank|ranking|score|index|percentile|quintile|decile/.test(n)) return 'rank';
  if (/age|birth_year|year_of_birth/.test(n)) return 'age';
  if (/zip|postal|latitude|longitude|lat$|lng$|lon$/.test(n)) return 'geo';
  if (type === 'numeric') return 'numeric';
  return 'text';
}

// ── Column Profiling ──────────────────────────────────────────────────────────
function profileColumn(colName, values, totalRows) {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '' && String(v) !== 'nan' && String(v) !== 'None');
  const missingCount = totalRows - nonNull.length;
  const missingRate = totalRows > 0 ? missingCount / totalRows : 0;
  const unique = new Set(nonNull.map(String));
  const uniqueCount = unique.size;
  const uniqueRate = nonNull.length > 0 ? uniqueCount / nonNull.length : 0;

  const inferredType = inferColumnType(values);
  const semanticType = inferSemanticType(colName, inferredType);

  const standardized = colName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

  let stats = {};
  if (inferredType === 'numeric') {
    const nums = nonNull.map(v => parseFloat(String(v).replace(/,/g, ''))).filter(n => !isNaN(n));
    if (nums.length > 0) {
      const sorted = [...nums].sort((a, b) => a - b);
      const sum = nums.reduce((a, b) => a + b, 0);
      const mean = sum / nums.length;
      const median = sorted[Math.floor(sorted.length / 2)];
      const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
      stats = {
        min: sorted[0], max: sorted[sorted.length - 1],
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median * 100) / 100,
        stdDev: Math.round(Math.sqrt(variance) * 100) / 100,
      };
    }
  }

  const valueCounts = {};
  nonNull.forEach(v => { const k = String(v); valueCounts[k] = (valueCounts[k] || 0) + 1; });
  const mode = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  const warnings = [];
  if (missingRate > 0.3) warnings.push(`High missing rate: ${Math.round(missingRate * 100)}%`);
  if (uniqueRate < 0.01 && inferredType !== 'boolean') warnings.push('Very low cardinality — may be a constant or corrupt column');
  if (semanticType === 'id' && missingRate > 0) warnings.push('ID column has missing values — referential integrity risk');

  return {
    columnName: colName,
    originalName: colName,
    standardizedName: standardized,
    inferredType,
    semanticType,
    missingCount,
    missingRate: Math.round(missingRate * 1000) / 1000,
    uniqueCount,
    uniqueRate: Math.round(uniqueRate * 1000) / 1000,
    mode,
    isKpiCandidate: ['currency_measure', 'count_measure'].includes(semanticType),
    isDateCandidate: semanticType === 'date_dim' || inferredType === 'date',
    isDimensionCandidate: semanticType === 'category_dim',
    warnings,
    ...stats,
  };
}

// ── Data Cleaning Logic ───────────────────────────────────────────────────────
function cleanDataset(rows, columns) {
  if (!rows?.length) return { cleaned: [], summary: {} };

  // Standardize column names
  const colMap = {};
  columns.forEach(c => {
    colMap[c.name] = c.standardizedName || c.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  });

  // Remove duplicates
  const seen = new Set();
  const deduplicated = [];
  let duplicateCount = 0;
  for (const row of rows) {
    const key = JSON.stringify(row);
    if (seen.has(key)) { duplicateCount++; continue; }
    seen.add(key);
    deduplicated.push(row);
  }

  // Clean values and standardize column names
  const cleaned = deduplicated.map(row => {
    const newRow = {};
    for (const [key, val] of Object.entries(row)) {
      const newKey = colMap[key] || key;
      const col = columns.find(c => c.name === key);
      let cleaned = val;

      if (val === '' || val === 'nan' || val === 'None' || val === null) {
        cleaned = null;
      } else if (typeof val === 'string') {
        cleaned = val.trim();
        // Numeric conversion
        if (col?.inferredType === 'numeric') {
          const num = parseFloat(String(cleaned).replace(/,/g, ''));
          cleaned = isNaN(num) ? null : num;
        }
        // Date normalization
        if (col?.isDateCandidate && cleaned) {
          const d = new Date(cleaned);
          if (!isNaN(d.getTime())) cleaned = d.toISOString().split('T')[0];
        }
      }
      newRow[newKey] = cleaned;
    }
    return newRow;
  });

  // Impute missing values (median for numeric, mode for categorical)
  const colStats = {};
  const colKeys = Object.keys(cleaned[0] || {});
  for (const key of colKeys) {
    const vals = cleaned.map(r => r[key]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) continue;
    const isNum = typeof vals[0] === 'number' || (typeof vals[0] === 'string' && !isNaN(parseFloat(vals[0])));
    if (isNum) {
      const nums = vals.map(v => parseFloat(v)).filter(v => !isNaN(v)).sort((a, b) => a - b);
      colStats[key] = { type: 'numeric', fill: nums[Math.floor(nums.length / 2)] ?? 0 };
    } else {
      const freq = {};
      vals.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      colStats[key] = { type: 'categorical', fill: Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '' };
    }
  }

  const imputed = cleaned.map(row => {
    const r = { ...row };
    for (const [key, stat] of Object.entries(colStats)) {
      if (r[key] === null || r[key] === undefined) r[key] = stat.fill;
    }
    return r;
  });

  return {
    cleaned: imputed,
    summary: {
      duplicatesRemoved: duplicateCount,
      originalRows: rows.length,
      cleanedRows: imputed.length,
      columnsStandardized: Object.keys(colMap).length,
    },
  };
}

// ── Main Handler ──────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileUrl, fileName, fileType, dataSourceId, sheetName, action = 'profile' } = body;

    if (!fileUrl) return Response.json({ error: 'fileUrl is required' }, { status: 400 });

    const jobId = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const startedAt = new Date().toISOString();

    // Log start
    await base44.asServiceRole.entities.ProcessingLog.create({
      jobId, dataSourceId: dataSourceId || 'new',
      stepName: 'data_ingestion', status: 'running',
      startedAt, message: `Processing ${fileName} (${fileType})`,
    });

    // Fetch file
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error(`Failed to fetch file: ${fileRes.statusText}`);
    const fileBuffer = await fileRes.arrayBuffer();

    let rawRows = [];
    let headers = [];

    if (fileType === 'csv') {
      const text = new TextDecoder().decode(fileBuffer);
      const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false });
      rawRows = parsed.data;
      headers = parsed.meta.fields || [];
    } else if (fileType === 'xlsx' || fileType === 'xls') {
      const workbook = XLSX.read(fileBuffer, { type: 'array' });
      const sheet = sheetName || workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheet];
      rawRows = XLSX.utils.sheet_to_json(worksheet, { defval: null, raw: false });
      headers = rawRows.length > 0 ? Object.keys(rawRows[0]) : [];
    }

    if (!rawRows.length) {
      return Response.json({ error: 'No data rows found in file. Check the file format and sheet selection.' }, { status: 400 });
    }

    // Profile columns
    const columnProfiles = headers.map(col => {
      const values = rawRows.map(r => r[col]);
      return profileColumn(col, values, rawRows.length);
    });

    // Quality metrics
    const totalCells = rawRows.length * headers.length;
    const missingCells = columnProfiles.reduce((s, c) => s + c.missingCount, 0);
    const validCells = totalCells - columnProfiles.filter(c => c.warnings.length > 0).length * rawRows.length;

    const seen = new Set();
    let duplicateRows = 0;
    for (const row of rawRows) {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicateRows++;
      else seen.add(key);
    }

    const dateColCount = columnProfiles.filter(c => c.isDateCandidate).length;
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    let recentRows = 0;
    if (dateColCount > 0) {
      const dateCol = columnProfiles.find(c => c.isDateCandidate)?.columnName;
      if (dateCol) {
        recentRows = rawRows.filter(r => {
          const d = new Date(r[dateCol]);
          return !isNaN(d.getTime()) && d >= oneYearAgo;
        }).length;
      }
    } else {
      recentRows = Math.floor(rawRows.length * 0.6);
    }

    const scores = computeQualityScores({
      totalCells, missingCells, validCells,
      duplicateRows, totalRows: rawRows.length,
      standardizedCells: totalCells - missingCells,
      recentRows,
    });

    // Run cleaning if requested
    let cleanedRows = [];
    let cleaningSummary = {};
    if (action === 'clean' || action === 'full') {
      const result = cleanDataset(rawRows, columnProfiles);
      cleanedRows = result.cleaned;
      cleaningSummary = result.summary;
    }

    // DataReadinessScore
    const kpiCols = columnProfiles.filter(c => c.isKpiCandidate).length;
    const dateCols = columnProfiles.filter(c => c.isDateCandidate).length;
    const kpiReadiness = Math.min(1, kpiCols / 3);
    const relationshipReadiness = columnProfiles.filter(c => c.semanticType === 'id').length > 0 ? 0.8 : 0.3;
    const contractPassRate = 0.7; // baseline before contract validation
    const readinessScore = Math.round((
      0.40 * contractPassRate +
      0.30 * (scores.qualityScore / 100) +
      0.20 * kpiReadiness +
      0.10 * relationshipReadiness
    ) * 100);

    const result = {
      jobId,
      fileName,
      fileType,
      rowCount: rawRows.length,
      columnCount: headers.length,
      columns: columnProfiles,
      sampleRows: rawRows.slice(0, 20),
      qualityScores: {
        ...scores,
        readinessScore,
      },
      cleaningSummary: action === 'profile' ? null : cleaningSummary,
      cleanedRows: cleanedRows.length > 0 ? cleanedRows.slice(0, 50) : null,
      cleanedRowCount: cleanedRows.length,
      kpiCandidates: columnProfiles.filter(c => c.isKpiCandidate).map(c => c.columnName),
      dateCandidates: columnProfiles.filter(c => c.isDateCandidate).map(c => c.columnName),
      dimensionCandidates: columnProfiles.filter(c => c.isDimensionCandidate).map(c => c.columnName),
      warnings: columnProfiles.flatMap(c => c.warnings.map(w => `${c.columnName}: ${w}`)),
    };

    // Update DataSource if ID provided
    if (dataSourceId) {
      await base44.asServiceRole.entities.DataSource.update(dataSourceId, {
        rowCount: rawRows.length,
        columnCount: headers.length,
        qualityScore: scores.qualityScore,
        readinessScore,
        status: 'ready',
      });

      // Create DatasetVersion record
      await base44.asServiceRole.entities.DatasetVersion.create({
        dataSourceId,
        versionType: action === 'profile' ? 'raw' : 'cleaned',
        rowCount: action === 'profile' ? rawRows.length : cleanedRows.length,
        columnCount: headers.length,
        qualityScore: scores.qualityScore,
        readinessScore,
        completenessScore: Math.round(scores.completeness * 100),
        validityScore: Math.round(scores.validity * 100),
        uniquenessScore: Math.round(scores.uniqueness * 100),
        consistencyScore: Math.round(scores.consistency * 100),
        timelinessScore: Math.round(scores.timeliness * 100),
        cleaningSummary,
        columns: columnProfiles,
        sampleRows: rawRows.slice(0, 20),
        createdAt: new Date().toISOString(),
      });
    }

    // Log completion
    await base44.asServiceRole.entities.ProcessingLog.create({
      jobId, dataSourceId: dataSourceId || 'new',
      stepName: 'data_profiling', status: 'success',
      startedAt, completedAt: new Date().toISOString(),
      durationMs: Date.now() - new Date(startedAt).getTime(),
      message: `Profiled ${rawRows.length} rows × ${headers.length} columns. Quality: ${scores.qualityScore}%`,
      metadata: { qualityScore: scores.qualityScore, readinessScore },
    });

    return Response.json({ ok: true, ...result });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});