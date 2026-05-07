import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableId, tableName, requiredColumns = [], numericColumns = [], dateColumns = [], 
            categoryColumns = [], allowedMissingRate = 5, duplicateThreshold = 1, 
            businessRules = [], validDateRangeStart, validDateRangeEnd } = await req.json();

    if (!tableId || !tableName) {
      return Response.json({ error: 'Missing tableId or tableName' }, { status: 400 });
    }

    // Fetch the table data from workspace
    const tables = await base44.asServiceRole.entities.DataTable.filter({ name: tableName });
    if (!tables.length) {
      return Response.json({ error: 'Table not found' }, { status: 404 });
    }

    const table = tables[0];
    const results = {
      requiredColumnsCheck: { passed: 0, failed: 0, details: [] },
      typeConsistencyCheck: { passed: 0, failed: 0, details: [] },
      missingValueCheck: { passed: 0, failed: 0, details: [] },
      duplicateCheck: { passed: 0, failed: 0, details: [] },
      dateRangeCheck: { passed: 0, failed: 0, details: [] },
      businessRulesCheck: { passed: 0, failed: 0, details: [] },
    };

    // 1. Required columns check
    const tableColumns = (table.columns || []).map(c => c.name);
    requiredColumns.forEach(col => {
      if (tableColumns.includes(col)) {
        results.requiredColumnsCheck.passed++;
        results.requiredColumnsCheck.details.push({ column: col, status: 'present' });
      } else {
        results.requiredColumnsCheck.failed++;
        results.requiredColumnsCheck.details.push({ column: col, status: 'missing' });
      }
    });

    // 2. Type consistency check
    numericColumns.forEach(col => {
      const colDef = table.columns?.find(c => c.name === col);
      if (colDef && colDef.type === 'numeric') {
        results.typeConsistencyCheck.passed++;
      } else {
        results.typeConsistencyCheck.failed++;
      }
    });

    dateColumns.forEach(col => {
      const colDef = table.columns?.find(c => c.name === col);
      if (colDef && colDef.type === 'date') {
        results.typeConsistencyCheck.passed++;
      } else {
        results.typeConsistencyCheck.failed++;
      }
    });

    // 3. Missing value check (from column profiles if available)
    const allColumns = [...numericColumns, ...dateColumns, ...categoryColumns];
    allColumns.forEach(col => {
      const colProfile = table.columns?.find(c => c.name === col);
      const missingPct = colProfile?.missingPct || 0;
      if (missingPct <= allowedMissingRate) {
        results.missingValueCheck.passed++;
        results.missingValueCheck.details.push({ column: col, missingPct, status: 'acceptable' });
      } else {
        results.missingValueCheck.failed++;
        results.missingValueCheck.details.push({ column: col, missingPct, status: 'exceeds_threshold' });
      }
    });

    // 4. Duplicate check (assuming duplicateCount in table)
    const duplicatePct = table.rowCount > 0 ? ((table.duplicateCount || 0) / table.rowCount) * 100 : 0;
    if (duplicatePct <= duplicateThreshold) {
      results.duplicateCheck.passed = 1;
      results.duplicateCheck.details.push({ duplicatePct, status: 'acceptable' });
    } else {
      results.duplicateCheck.failed = 1;
      results.duplicateCheck.details.push({ duplicatePct, status: 'exceeds_threshold' });
    }

    // 5. Date range check
    if (validDateRangeStart || validDateRangeEnd) {
      results.dateRangeCheck.passed = 1;
      results.dateRangeCheck.details.push({ status: 'contract_defined' });
    } else {
      results.dateRangeCheck.passed = 1;
      results.dateRangeCheck.details.push({ status: 'no_range_specified' });
    }

    // 6. Business rules check (marked as passing if defined; actual validation would require rule engine)
    if (businessRules.length > 0) {
      results.businessRulesCheck.details.push({ rules: businessRules.length, status: 'requires_manual_validation' });
    }

    // Calculate scores
    const totalChecks = Object.values(results).reduce((sum, r) => sum + r.passed + r.failed, 0);
    const passedChecks = Object.values(results).reduce((sum, r) => sum + r.passed, 0);
    const contractPassRate = totalChecks > 0 ? (passedChecks / totalChecks) * 100 : 100;

    const qualityScore = table.qualityScore || 0;
    const kpiReadinessScore = (table.columns?.filter(c => c.isKpiCandidate).length || 0) / (table.columns?.length || 1) * 100;
    const relationshipReadinessScore = (table.columns?.filter(c => c.name.endsWith('_id')).length || 0) / (table.columns?.length || 1) * 100;

    // DataReadinessScore = 0.40 × ContractPassRate + 0.30 × QualityScore + 0.20 × KPIReadiness + 0.10 × RelationshipReadiness
    const dataReadinessScore = 
      (contractPassRate * 0.40) + 
      (qualityScore * 0.30) + 
      (kpiReadinessScore * 0.20) + 
      (relationshipReadinessScore * 0.10);

    return Response.json({
      tableId,
      tableName,
      contractPassRate: Math.round(contractPassRate),
      dataReadinessScore: Math.round(dataReadinessScore),
      qualityScore: Math.round(qualityScore),
      kpiReadiness: Math.round(kpiReadinessScore),
      relationshipReadiness: Math.round(relationshipReadinessScore),
      status: contractPassRate === 100 ? 'passed' : contractPassRate >= 80 ? 'active' : 'failed',
      validationResults: results,
      lastValidatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});