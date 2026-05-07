/**
 * BusinessMeaningTooltip — Enhanced recharts tooltip with AI Business Meaning
 * Drop-in replacement for recharts' default Tooltip
 * Usage: <Tooltip content={<BusinessMeaningTooltip meaning="..." />} />
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

const fmtV = v => {
  if (v == null || isNaN(Number(v))) return String(v ?? '—');
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

// Pre-computed business meanings based on value characteristics
function inferMeaning(label, value, allValues) {
  if (!allValues || !allValues.length) return null;
  const nums = allValues.map(Number).filter(v => !isNaN(v));
  if (!nums.length) return null;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  const n = Number(value);
  const pctOfMax = max > 0 ? (n / max) * 100 : 0;
  const vsAvg = mean > 0 ? ((n - mean) / mean) * 100 : 0;

  if (n === max) return { text: `Peak value — ${Math.round(pctOfMax)}% of maximum range. Investigate what drove this spike.`, trend: 'up' };
  if (n === min) return { text: `Lowest recorded value. May indicate under-performance or a data gap worth investigating.`, trend: 'down' };
  if (vsAvg > 20) return { text: `${Math.round(vsAvg)}% above average. This segment is outperforming the mean — a potential growth driver.`, trend: 'up' };
  if (vsAvg < -20) return { text: `${Math.round(Math.abs(vsAvg))}% below average. This segment is lagging — consider targeted intervention.`, trend: 'down' };
  return { text: `Within normal range (${Math.round(vsAvg > 0 ? '+' : '')}${Math.round(vsAvg)}% vs avg). Stable performance for "${label}".`, trend: 'neutral' };
}

export default function BusinessMeaningTooltip({ active, payload, label, meaning, allValues, unit = '' }) {
  if (!active || !payload || !payload.length) return null;

  const entry = payload[0];
  const value = entry?.value;
  const dataKey = entry?.dataKey || entry?.name || '';
  const color = entry?.color || '#00e5ff';

  const allVals = allValues || payload.map(p => p.value);
  const inferred = meaning ? { text: meaning, trend: 'neutral' } : inferMeaning(String(label), value, allVals);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-xl border shadow-2xl overflow-hidden max-w-xs"
      style={{ background: 'rgba(5,10,24,0.97)', borderColor: `${color}30` }}
    >
      {/* Value row */}
      <div className="px-3 pt-3 pb-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-xs text-white/40 mb-1 truncate">{label}</div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-black font-mono" style={{ color }}>{unit}{fmtV(value)}</span>
          <span className="text-xs text-white/30">{dataKey}</span>
        </div>
        {payload.length > 1 && payload.slice(1).map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 mt-1">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
            <span className="text-xs text-white/50">{p.name}: <span className="font-mono text-white/70">{fmtV(p.value)}</span></span>
          </div>
        ))}
      </div>

      {/* Business meaning */}
      {inferred && (
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Target className="w-3 h-3 text-purple-400 flex-shrink-0" />
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Business Meaning</span>
            {inferred.trend === 'up' && <TrendingUp className="w-3 h-3 text-green-400 ml-auto" />}
            {inferred.trend === 'down' && <TrendingDown className="w-3 h-3 text-red-400 ml-auto" />}
          </div>
          <p className="text-xs text-white/60 leading-relaxed">{inferred.text}</p>
        </div>
      )}
    </motion.div>
  );
}