import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * ETL Pipeline Job Runner
 * Handles: upload, clean, profile, semantic, report pipelines
 * Each pipeline run is logged to PipelineRun entity
 */

function detectTypes(rows, columns) {
  const types = {};
  columns.forEach(col => {
    const name = col.name || col;
    const vals = rows.slice(0, 50).map(r => r[name]).filter(v => v !== null && v !== undefined && v !== '');
    const numCount = vals.filter(v => !isNaN(Number(v))).length;
    const dateCount = vals.filter(v => !isNaN(Date.parse(v)) && isNaN(Number(v))).length;
    if (numCount > vals.length * 0.7) types[name] = 'numeric';
    else if (dateCount > vals.length * 0.7) types[name] = 'date';
    else types[name] = 'categorical';
  });
  return types;
}

function profileDataset(rows, columns) {
  const colTypes = detectTypes(rows, columns);
  const totalCells = rows.length * columns.length;
  let missingCells = 0;
  const profile = {};

  columns.forEach(col => {
    const name = col.name || col;
    const vals = rows.map(r => r[name]);
    const missing = vals.filter(v => v === null || v === undefined || v === '').length;
    const unique = new Set(vals.filter(v => v !== null && v !== undefined && v !== '')).size;
    missingCells += missing;
    const numVals = vals.map(v => Number(v)).filter(v => !isNaN(v));
    profile[name] = {
      type: colTypes[name], missing, missingRate: Math.round(missing/rows.length*100),
      unique, uniqueRate: Math.round(unique/rows.length*100),
      ...(numVals.length > 0 ? {
        min: Math.min(...numVals), max: Math.max(...numVals),
        mean: Math.round(numVals.reduce((a,b)=>a+b,0)/numVals.length*100)/100,
        sum: Math.round(numVals.reduce((a,b)=>a+b,0)*100)/100,
      } : {}),
    };
  });

  const completeness = Math.round((1 - missingCells/totalCells)*100);
  const duplicateRows = rows.length - new Set(rows.map(r => JSON.stringify(r))).size;
  const duplicateRate = Math.round(duplicateRows/rows.length*100);

  // Quality score
  const validity = Math.round(Object.values(profile).reduce((acc, p) => acc + (100 - p.missingRate), 0) / columns.length);
  const uniqueness = Math.round(100 - duplicateRate);
  const qualityScore = Math.round(0.30*completeness + 0.25*validity + 0.20*uniqueness + 0.15*Math.min(100, columns.length*10) + 0.10*Math.min(100, rows.length/10));

  return { profile, completeness, duplicateRows, duplicateRate, qualityScore, totalRows: rows.length, totalColumns: columns.length };
}

function cleanDataset(rows, columns) {
  const colNames = columns.map(c => c.name || c);
  const cleaned = [];
  const issues = { missing_filled: 0, duplicates_removed: 0, types_fixed: 0 };
  const seen = new Set();

  // Compute means for numeric cols
  const colTypes = detectTypes(rows, columns);
  const numericMeans = {};
  colNames.forEach(col => {
    if (colTypes[col] === 'numeric') {
      const vals = rows.map(r => Number(r[col])).filter(v => !isNaN(v));
      numericMeans[col] = vals.length > 0 ? vals.reduce((a,b)=>a+b,0)/vals.length : 0;
    }
  });

  rows.forEach(row => {
    const key = JSON.stringify(colNames.map(c => row[c]));
    if (seen.has(key)) { issues.duplicates_removed++; return; }
    seen.add(key);

    const cleanRow = { ...row };
    colNames.forEach(col => {
      if (cleanRow[col] === null || cleanRow[col] === undefined || cleanRow[col] === '') {
        if (colTypes[col] === 'numeric') { cleanRow[col] = numericMeans[col] || 0; issues.missing_filled++; }
        else { cleanRow[col] = 'Unknown'; issues.missing_filled++; }
      }
      // Trim strings
      if (typeof cleanRow[col] === 'string') cleanRow[col] = cleanRow[col].trim();
    });
    cleaned.push(cleanRow);
  });

  return { cleaned, issues, rowsRemoved: rows.length - cleaned.length };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { pipelineName, steps, tableData } = body;

    const runId = `run_${Date.now()}`;
    const startTime = Date.now();
    const stepResults = [];

    // Log pipeline start
    let pipelineRecord;
    try {
      pipelineRecord = await base44.asServiceRole.entities.PipelineRun.create({
        pipelineId: runId, pipelineName: pipelineName || 'Data Processing Pipeline',
        status: 'running', startedAt: new Date().toISOString(),
        steps: [], createdBy: user.email,
      });
    } catch (e) { /* non-blocking */ }

    const rows = tableData?.rows || [];
    const columns = tableData?.columns || [];

    for (const step of (steps || ['profile','clean','kpi_ready'])) {
      const stepStart = Date.now();
      let result = {};

      if (step === 'profile') {
        result = profileDataset(rows, columns);
        stepResults.push({ step, status: 'success', durationMs: Date.now()-stepStart, output: { qualityScore: result.qualityScore, completeness: result.completeness, duplicates: result.duplicateRows } });
      }
      else if (step === 'clean') {
        const cleaned = cleanDataset(rows, columns);
        result = cleaned;
        stepResults.push({ step, status: 'success', durationMs: Date.now()-stepStart, output: { rowsKept: cleaned.cleaned.length, issues: cleaned.issues } });
      }
      else if (step === 'kpi_ready') {
        const profile = profileDataset(rows, columns);
        const numericCols = Object.entries(profile.profile).filter(([,v]) => v.type === 'numeric').map(([k]) => k);
        const categoryCols = Object.entries(profile.profile).filter(([,v]) => v.type === 'categorical').map(([k]) => k);
        result = { numericKPIs: numericCols, categoryDimensions: categoryCols, kpiReadiness: Math.min(100, numericCols.length * 20) };
        stepResults.push({ step, status: 'success', durationMs: Date.now()-stepStart, output: result });
      }
      else {
        stepResults.push({ step, status: 'skipped', durationMs: 0, output: {} });
      }
    }

    // Update pipeline record
    if (pipelineRecord?.id) {
      base44.asServiceRole.entities.PipelineRun.update(pipelineRecord.id, {
        status: 'success', endedAt: new Date().toISOString(),
        durationMs: Date.now()-startTime, steps: stepResults,
      }).catch(() => {});
    }

    // Full profile for the response
    const fullProfile = profileDataset(rows, columns);
    const cleanResult = cleanDataset(rows, columns);

    return Response.json({
      runId, pipelineName, status: 'success',
      durationMs: Date.now() - startTime,
      steps: stepResults,
      profile: fullProfile,
      cleanedData: cleanResult.cleaned.slice(0, 500), // return first 500 cleaned rows
      issues: cleanResult.issues,
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});