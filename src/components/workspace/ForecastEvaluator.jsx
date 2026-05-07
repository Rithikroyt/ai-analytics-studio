/**
 * ForecastEvaluator — MAPE, RMSE, sMAPE, MAE display
 * Attaches to any section that has trendData + forecastData
 */
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { evaluateForecast } from '@/lib/forecastEval';
import { Activity, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

const MetricCard = ({ label, value, unit = '', color }) => (
  <div className="rounded-xl p-3 border border-white/8 bg-white/2">
    <div className="text-xs text-white/35 uppercase tracking-wider mb-1.5">{label}</div>
    <div className={`font-mono font-black text-lg ${color}`}>
      {value != null ? `${value}${unit}` : '—'}
    </div>
  </div>
);

export default function ForecastEvaluator({ trendData, forecastData, primaryLabel }) {
  const evaluation = useMemo(() => {
    if (!trendData?.length || !forecastData?.length) return null;
    return evaluateForecast(trendData, forecastData);
  }, [trendData, forecastData]);

  if (!evaluation) return null;

  const { mape, rmse, smape, mae, grade, n } = evaluation;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-white/8 bg-white/1 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-sm">Forecast Accuracy</span>
          <span className="text-xs text-white/30">· {primaryLabel} · n={n}</span>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-black ${grade.color}`}
          style={{ background: grade.color.includes('green') ? 'rgba(74,222,128,0.08)' : grade.color.includes('teal') ? 'rgba(45,212,191,0.08)' : grade.color.includes('amber') ? 'rgba(251,191,36,0.08)' : 'rgba(248,113,113,0.08)', borderColor: 'rgba(255,255,255,0.1)' }}>
          Grade: {grade.grade}
          <span className="text-xs font-normal ml-1 text-white/40">{grade.label}</span>
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MetricCard label="MAPE" value={mape} unit="%" color={mape == null ? 'text-white/30' : mape < 10 ? 'text-green-400' : mape < 20 ? 'text-teal-400' : mape < 30 ? 'text-amber-400' : 'text-red-400'} />
          <MetricCard label="RMSE" value={rmse} color="text-purple-400" />
          <MetricCard label="sMAPE" value={smape} unit="%" color="text-cyan-400" />
          <MetricCard label="MAE" value={mae} color="text-blue-400" />
        </div>
        <div className="text-xs text-white/25 space-y-0.5">
          <div>MAPE = mean absolute % error · RMSE = root mean squared error · sMAPE = symmetric MAPE · MAE = mean absolute error</div>
          <div className="text-white/15">Computed on a held-out validation window of the historical data.</div>
        </div>
      </div>
    </motion.div>
  );
}