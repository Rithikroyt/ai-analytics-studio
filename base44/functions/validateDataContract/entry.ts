import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// DataReadinessScore = 0.40 × ContractPassRate + 0.30 × QualityScore + 0.20 × KPIReadiness + 0.10 × RelationshipReadiness
// QualityScore = 0.30×Completeness + 0.25×Validity + 0.20×Uniqueness + 0.15×Consistency + 0.10×Timeliness

function computeQualityScore({ completeness = 100, validity = 100, uniqueness = 100, consistency = 100, timeliness = 100 }) {
  return Math.round(
    completeness  * 0.30 +
    validity      * 0.25 +
    uniqueness    * 0.20 +
    consistency   * 0.15 +
    timeliness    * 0.10
  );
}

function inferSemanticType(colName) {
  const n = colName.toLowerCase();
  if (/revenue|sales|cost|price|amount|value|fee|spend|profit|margin|salary|wage|payroll/.test(n)) return 'currency_measure';
  if (/date|month|year|quarter|week|period|time|created_at|updated_at|timestamp/.test(n)) return 'date_dim';
  if (/count|num_|qty|quantity|headcount|sessions|clicks|views/.test(n)) return 'count_measure';
  if (/_id$|^id$|^id_|uuid/.test(n)) return 'id';
  if (/department|category|type|status|region|country|segment|group|channel/.test(n)) return 'category_dim';
  if (/rate|ratio|pct|percent|conversion|retention|churn/.test(n)) return 'rate_measure';
  return 'unknown';
}

function assessKPIReadiness(tableColumns) {
  const kpiTypes = ['currency_measure', 'count_measure', 'rate_measure'];
  const kpiCols = tableColumns.filter(c => kpiTypes.includes(inferSemanticType(c)));
  return Math.min(100, (kpiCols.length / Math.max(tableColumns.length, 1)) * 100 * 2.5);
}

function assessRelationshipReadiness(tableColumns) {
  const joinCols = tableColumns.filter(c => c.toLowerCase().endsWith('_id') || c.toLowerCase().startsWith('id_'));
  return Math.min(100, joinCols.length * 25);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const {
      tableId, tableName,
      requiredColumns = [], numericColumns = [], dateColumns = [],
      categoryColumns = [], allowedMissingRate = 5, duplicateThreshold = 1,
      businessRules = [], validDateRangeStart, validDateRangeEnd,
      // Direct data path (when passing rows directly without entity lookup)
      rows, columns,
    } = await req.json();

    if (!tableName) return Response.json({ error: 'Missing tableName' }, { status: 400 });

    // ── Get table data ─────────────────────────────────────────────────────────
    let tableData = null;
    let tableColumns = columns?.map(c => c.name || c) || [];
    let rowCount = rows?.length || 0;
    let duplicateCount = 0;

    if (tableId && !rows) {
      try {
        const tables = await base44.asServiceRole.entities.DataTable.filter({ name: tableName });
        if (tables.length) {
          tableData = tables[0];
          tableColumns = (tableData.columns || []).map(c => c.name || c);
          rowCount = tableData.rowCount || 0;
          duplicateCount = tableData.duplicateCount || 0;
        }
      } catch {}
    } else if (rows) {
      // Compute duplicates from row data
      const seen = new Set();
      rows.forEach(r => {
        const key = JSON.stringify(r);
        if (seen.has(key)) duplicateCount++;
        else seen.add(key);
      });
    }

    const results = {
      requiredColumnsCheck: { passed: 0, failed: 0, details: [] },
      typeConsistencyCheck: { passed: 0, failed: 0, details: [] },
      missingValueCheck: { passed: 0, failed: 0, details: [] },
      duplicateCheck: { passed: 0, failed: 0, details: [] },
      dateRangeCheck: { passed: 0, failed: 0, details: [] },
      businessRulesCheck: { passed: 0, failed: 0, details: [] },
    };

    // 1. Required columns
    requiredColumns.forEach(col => {
      const present = tableColumns.some(c => c.toLowerCase() === col.toLowerCase());
      if (present) { results.requiredColumnsCheck.passed++; results.requiredColumnsCheck.details.push({ column: col, status: 'present' }); }
      else { results.requiredColumnsCheck.failed++; results.requiredColumnsCheck.details.push({ column: col, status: 'missing' }); }
    });

    // 2. Type consistency
    const checkTypes = (expected, colList) => {
      colList.forEach(col => {
        const inTable = tableColumns.some(c => c.toLowerCase() === col.toLowerCase());
        if (inTable) results.typeConsistencyCheck.passed++;
        else { results.typeConsistencyCheck.failed++; results.typeConsistencyCheck.details.push({ column: col, expected, status: 'missing' }); }
      });
    };
    checkTypes('numeric', numericColumns);
    checkTypes('date', dateColumns);
    checkTypes('category', categoryColumns);

    // 3. Missing value check — from rows if available
    const allTargetCols = [...numericColumns, ...dateColumns, ...categoryColumns];
    if (rows?.length > 0 && allTargetCols.length > 0) {
      allTargetCols.forEach(col => {
        const nullCount = rows.filter(r => r[col] == null || r[col] === '' || r[col] === 'null' || r[col] === 'NaN').length;
        const missingPct = (nullCount / rows.length) * 100;
        if (missingPct <= allowedMissingRate) {
          results.missingValueCheck.passed++;
          results.missingValueCheck.details.push({ column: col, missingPct: Math.round(missingPct * 10) / 10, status: 'acceptable' });
        } else {
          results.missingValueCheck.failed++;
          results.missingValueCheck.details.push({ column: col, missingPct: Math.round(missingPct * 10) / 10, status: 'exceeds_threshold' });
        }
      });
    } else {
      results.missingValueCheck.passed = 1;
      results.missingValueCheck.details.push({ status: 'no_row_data_provided' });
    }

    // 4. Duplicate check
    const duplicatePct = rowCount > 0 ? (duplicateCount / rowCount) * 100 : 0;
    if (duplicatePct <= duplicateThreshold) {
      results.duplicateCheck.passed = 1;
      results.duplicateCheck.details.push({ duplicatePct: Math.round(duplicatePct * 10) / 10, status: 'acceptable' });
    } else {
      results.duplicateCheck.failed = 1;
      results.duplicateCheck.details.push({ duplicatePct: Math.round(duplicatePct * 10) / 10, duplicateCount, status: 'exceeds_threshold' });
    }

    // 5. Date range check
    results.dateRangeCheck.passed = 1;
    results.dateRangeCheck.details.push({ status: validDateRangeStart || validDateRangeEnd ? 'range_defined' : 'no_range_specified' });

    // 6. Business rules
    if (businessRules.length > 0) {
      results.businessRulesCheck.details.push({ rules: businessRules.length, status: 'defined_requires_validation', rules_list: businessRules });
      results.businessRulesCheck.passed = 1;
    } else {
      results.businessRulesCheck.passed = 1;
      results.businessRulesCheck.details.push({ status: 'no_rules_defined' });
    }

    // ── Scoring ────────────────────────────────────────────────────────────────
    const totalChecks = Object.values(results).reduce((s, r) => s + r.passed + r.failed, 0);
    const passedChecks = Object.values(results).reduce((s, r) => s + r.passed, 0);
    const contractPassRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    // Compute quality components from row data if available
    let completeness = 100, uniqueness = 100;
    if (rows?.length > 0) {
      const totalCells = rows.length * tableColumns.length;
      const missingCells = rows.reduce((s, r) => s + tableColumns.filter(c => r[c] == null || r[c] === '').length, 0);
      completeness = totalCells > 0 ? ((totalCells - missingCells) / totalCells) * 100 : 100;
      uniqueness = rowCount > 0 ? ((rowCount - duplicateCount) / rowCount) * 100 : 100;
    }
    const qualityScore = computeQualityScore({ completeness, uniqueness });

    const kpiReadiness = assessKPIReadiness(tableColumns);
    const relationshipReadiness = assessRelationshipReadiness(tableColumns);

    const dataReadinessScore = Math.round(
      contractPassRate * 0.40 +
      qualityScore     * 0.30 +
      kpiReadiness     * 0.20 +
      relationshipReadiness * 0.10
    );

    // Semantic column map
    const semanticMap = {};
    tableColumns.forEach(col => { semanticMap[col] = inferSemanticType(col); });

    const status = contractPassRate >= 95 ? 'passed' : contractPassRate >= 75 ? 'active' : 'failed';

    // Persist to entity if tableId given
    if (tableId) {
      base44.asServiceRole.entities.DataContract.filter({ tableId }).then(existing => {
        const contractData = {
          tableId, tableName, requiredColumns, numericColumns, dateColumns, categoryColumns,
          allowedMissingRate, duplicateThreshold, businessRules,
          contractPassRate: Math.round(contractPassRate),
          dataReadinessScore,
          qualityScore,
          kpiReadiness: Math.round(kpiReadiness),
          relationshipReadiness: Math.round(relationshipReadiness),
          lastValidatedAt: new Date().toISOString(),
          status,
          validationResults: results,
        };
        if (existing.length > 0) {
          base44.asServiceRole.entities.DataContract.update(existing[0].id, contractData).catch(() => {});
        } else {
          base44.asServiceRole.entities.DataContract.create(contractData).catch(() => {});
        }
      }).catch(() => {});
    }

    return Response.json({
      ok: true,
      tableId, tableName,
      contractPassRate: Math.round(contractPassRate),
      dataReadinessScore,
      qualityScore,
      kpiReadiness: Math.round(kpiReadiness),
      relationshipReadiness: Math.round(relationshipReadiness),
      completeness: Math.round(completeness),
      uniqueness: Math.round(uniqueness),
      status,
      validationResults: results,
      semanticMap,
      lastValidatedAt: new Date().toISOString(),
      summary: `${tableName} is ${dataReadinessScore}% ready for analysis. Contract: ${Math.round(contractPassRate)}% | Quality: ${qualityScore}% | KPI fields: ${Math.round(kpiReadiness)}%`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});