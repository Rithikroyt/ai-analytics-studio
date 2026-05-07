/**
 * Forecast Evaluation Metrics
 * MAPE, RMSE, sMAPE, MAE — standard forecast accuracy formulas
 */

// MAPE = 100/n × Σ |y_i - ŷ_i| / |y_i|
export function computeMAPE(actuals, forecasts) {
  const pairs = actuals.map((y, i) => ({ y, yhat: forecasts[i] })).filter(p => p.yhat != null && p.y !== 0 && !isNaN(p.y) && !isNaN(p.yhat));
  if (!pairs.length) return null;
  const mape = (100 / pairs.length) * pairs.reduce((s, p) => s + Math.abs(p.y - p.yhat) / Math.abs(p.y), 0);
  return parseFloat(mape.toFixed(2));
}

// RMSE = √(1/n × Σ(y_i - ŷ_i)²)
export function computeRMSE(actuals, forecasts) {
  const pairs = actuals.map((y, i) => ({ y, yhat: forecasts[i] })).filter(p => p.yhat != null && !isNaN(p.y) && !isNaN(p.yhat));
  if (!pairs.length) return null;
  const mse = pairs.reduce((s, p) => s + Math.pow(p.y - p.yhat, 2), 0) / pairs.length;
  return parseFloat(Math.sqrt(mse).toFixed(2));
}

// sMAPE = 100/n × Σ |y_i - ŷ_i| / ((|y_i| + |ŷ_i|) / 2)
export function computeSMAPE(actuals, forecasts) {
  const pairs = actuals.map((y, i) => ({ y, yhat: forecasts[i] })).filter(p => p.yhat != null && !isNaN(p.y) && !isNaN(p.yhat));
  if (!pairs.length) return null;
  const smape = (100 / pairs.length) * pairs.reduce((s, p) => {
    const denom = (Math.abs(p.y) + Math.abs(p.yhat)) / 2;
    return s + (denom === 0 ? 0 : Math.abs(p.y - p.yhat) / denom);
  }, 0);
  return parseFloat(smape.toFixed(2));
}

// MAE
export function computeMAE(actuals, forecasts) {
  const pairs = actuals.map((y, i) => ({ y, yhat: forecasts[i] })).filter(p => p.yhat != null && !isNaN(p.y) && !isNaN(p.yhat));
  if (!pairs.length) return null;
  return parseFloat((pairs.reduce((s, p) => s + Math.abs(p.y - p.yhat), 0) / pairs.length).toFixed(2));
}

// Grade the forecast quality
export function gradeForecast(mape) {
  if (mape == null) return { grade: 'N/A', color: 'text-white/30', label: 'Insufficient data' };
  if (mape < 10) return { grade: 'A', color: 'text-green-400', label: 'Excellent (< 10% error)' };
  if (mape < 20) return { grade: 'B', color: 'text-teal-400', label: 'Good (10–20% error)' };
  if (mape < 30) return { grade: 'C', color: 'text-amber-400', label: 'Fair (20–30% error)' };
  if (mape < 50) return { grade: 'D', color: 'text-orange-400', label: 'Poor (30–50% error)' };
  return { grade: 'F', color: 'text-red-400', label: 'Very poor (> 50% error)' };
}

// Evaluate a forecast against held-out actuals
export function evaluateForecast(trendData, forecastData) {
  if (!trendData?.length || !forecastData?.length) return null;

  // Use last 20% of trend as "actuals" to validate against forecast
  const holdoutN = Math.max(2, Math.floor(trendData.length * 0.2));
  const holdoutActuals = trendData.slice(-holdoutN).map(d => d.value);

  // Match forecast to holdout dates
  const holdoutDates = trendData.slice(-holdoutN).map(d => d.date);
  const matchedForecasts = holdoutDates.map(date => {
    const fc = forecastData.find(f => f.date === date);
    return fc ? fc.value : null;
  }).filter(v => v != null);

  if (matchedForecasts.length < 2) {
    // Use first N forecasts vs last N actuals as proxy
    const n = Math.min(holdoutActuals.length, forecastData.length);
    const proxActuals = holdoutActuals.slice(0, n);
    const proxForecasts = forecastData.slice(0, n).map(d => d.value);
    const mape = computeMAPE(proxActuals, proxForecasts);
    const rmse = computeRMSE(proxActuals, proxForecasts);
    const smape = computeSMAPE(proxActuals, proxForecasts);
    const mae = computeMAE(proxActuals, proxForecasts);
    return { mape, rmse, smape, mae, grade: gradeForecast(mape), n };
  }

  const mape = computeMAPE(holdoutActuals.slice(0, matchedForecasts.length), matchedForecasts);
  const rmse = computeRMSE(holdoutActuals.slice(0, matchedForecasts.length), matchedForecasts);
  const smape = computeSMAPE(holdoutActuals.slice(0, matchedForecasts.length), matchedForecasts);
  const mae = computeMAE(holdoutActuals.slice(0, matchedForecasts.length), matchedForecasts);

  return { mape, rmse, smape, mae, grade: gradeForecast(mape), n: matchedForecasts.length };
}