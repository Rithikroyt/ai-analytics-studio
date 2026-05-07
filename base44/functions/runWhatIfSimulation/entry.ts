import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { baselineMetrics, parameters, formula } = await req.json();

    if (!baselineMetrics || !parameters) {
      return Response.json({ error: 'Missing baselineMetrics or parameters' }, { status: 400 });
    }

    const projectedMetrics = { ...baselineMetrics };
    
    // Example: Revenue = Traffic * ConversionRate * AverageOrderValue
    if (formula && formula.includes('*')) {
      const parts = formula.split('*').map(p => p.trim());
      let result = 1;
      
      parts.forEach(part => {
        // Look up in baselineMetrics or parameters
        const key = part.toLowerCase();
        const param = parameters.find(p => p.name.toLowerCase() === key);
        if (param) {
          result *= param.newVal;
        } else if (baselineMetrics[part]) {
          result *= baselineMetrics[part];
        }
      });
      
      projectedMetrics.projectedRevenue = result;
    }

    // Calculate incremental impact
    const currentRevenue = baselineMetrics.revenue || baselineMetrics.totalValue || 0;
    const projectedRevenue = projectedMetrics.projectedRevenue || currentRevenue;
    const incrementalImpact = projectedRevenue - currentRevenue;
    const liftPct = currentRevenue > 0 ? (incrementalImpact / currentRevenue) * 100 : 0;

    return Response.json({
      baselineMetrics,
      projectedMetrics,
      parameters,
      incrementalImpact,
      liftPct,
      confidence: 0.75,
      formula,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});