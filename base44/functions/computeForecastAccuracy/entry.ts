import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { actuals, forecasts } = await req.json();
    if (!actuals?.length || !forecasts?.length) {
      return Response.json({ error: 'actuals and forecasts arrays are required' }, { status: 400 });
    }

    const n = Math.min(actuals.length, forecasts.length);
    const pairs = Array.from({ length: n }, (_, i) => ({ y: actuals[i], yhat: forecasts[i] }))
      .filter(p => p.yhat != null && !isNaN(p.y) && !isNaN(p.yhat));

    if (pairs.length < 2) {
      return Response.json({ error: 'Insufficient valid pairs for evaluation' }, { status: 400 });
    }

    // MAPE
    const mapeSum = pairs.reduce((s, p) => p.y !== 0 ? s + Math.abs(p.y - p.yhat) / Math.abs(p.y) : s, 0);
    const mape = parseFloat((100 / pairs.length * mapeSum).toFixed(2));

    // RMSE
    const mse = pairs.reduce((s, p) => s + Math.pow(p.y - p.yhat, 2), 0) / pairs.length;
    const rmse = parseFloat(Math.sqrt(mse).toFixed(2));

    // sMAPE
    const smapeSum = pairs.reduce((s, p) => {
      const denom = (Math.abs(p.y) + Math.abs(p.yhat)) / 2;
      return denom === 0 ? s : s + Math.abs(p.y - p.yhat) / denom;
    }, 0);
    const smape = parseFloat((100 / pairs.length * smapeSum).toFixed(2));

    // MAE
    const mae = parseFloat((pairs.reduce((s, p) => s + Math.abs(p.y - p.yhat), 0) / pairs.length).toFixed(2));

    // Grade
    const grade = mape < 10 ? 'A' : mape < 20 ? 'B' : mape < 30 ? 'C' : mape < 50 ? 'D' : 'F';
    const gradeLabel = { A: 'Excellent', B: 'Good', C: 'Fair', D: 'Poor', F: 'Very Poor' }[grade];

    return Response.json({ mape, rmse, smape, mae, grade, gradeLabel, n: pairs.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});