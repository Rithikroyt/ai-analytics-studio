import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { tableId, tableName, columns, rows, policies } = await req.json();

    if (!policies?.length) {
      return Response.json({ violations: [], summary: 'No policies to enforce.' });
    }

    const violations = [];
    const maskedColumns = [];
    const auditLog = [];

    for (const policy of policies) {
      const rule = policy.ruleDefinition || {};

      if (policy.policyType === 'quality_threshold') {
        // Check null rates against threshold
        for (const col of (columns || [])) {
          const nullCount = rows.filter(r => r[col.name] == null || r[col.name] === '').length;
          const nullPct = (nullCount / rows.length) * 100;
          const threshold = rule.maxNullPct || 10;
          if (nullPct > threshold) {
            violations.push({
              policyId: policy.id,
              policyName: policy.name,
              severity: policy.severity,
              column: col.name,
              message: `Column "${col.name}" has ${nullPct.toFixed(1)}% nulls, exceeding threshold of ${threshold}%`,
              enforcement: policy.enforcement,
            });
          }
        }
      }

      if (policy.policyType === 'masking') {
        const targetCols = rule.sensitiveColumns || [];
        maskedColumns.push(...targetCols);
        auditLog.push({ action: 'mask', columns: targetCols, policy: policy.name, at: new Date().toISOString() });
      }

      if (policy.policyType === 'retention') {
        const dateCol = rule.dateColumn;
        const maxAgeDays = rule.maxAgeDays || 365;
        if (dateCol && rows.length) {
          const cutoff = new Date(Date.now() - maxAgeDays * 86400000);
          const staleRows = rows.filter(r => r[dateCol] && new Date(r[dateCol]) < cutoff).length;
          if (staleRows > 0) {
            violations.push({
              policyId: policy.id,
              policyName: policy.name,
              severity: policy.severity,
              message: `${staleRows} rows are older than ${maxAgeDays} days (retention policy)`,
              enforcement: policy.enforcement,
              staleRowCount: staleRows,
            });
          }
        }
      }
    }

    // AI summary of policy enforcement
    const summary = await base44.integrations.Core.InvokeLLM({
      prompt: `Summarize these data governance policy enforcement results for a business stakeholder:
Table: ${tableName}
Policies checked: ${policies.length}
Violations found: ${violations.length}
Violations: ${JSON.stringify(violations.slice(0, 5))}
Masked columns: ${maskedColumns.join(', ') || 'none'}

Write 2-3 sentences summarizing compliance status, key issues, and recommended priority actions.`,
    });

    return Response.json({
      ok: true,
      tableId,
      tableName,
      policiesChecked: policies.length,
      violations,
      maskedColumns,
      auditLog,
      complianceScore: violations.length === 0 ? 100 : Math.max(0, 100 - violations.length * 15),
      summary,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});