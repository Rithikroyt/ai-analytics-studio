import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const fmtV = v => {
  if (v == null || isNaN(v)) return '—';
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
};

const SCENARIOS = [
  { id: 'base', label: 'Base Case',  desc: 'Expected trajectory based on current trend',  multiplier: 1.0,  color: '#a855f7', icon: Minus },
  { id: 'bull', label: 'Bull Case',  desc: 'Optimistic scenario — +20% upside assumption', multiplier: 1.2,  color: '#4ade80', icon: TrendingUp },
  { id: 'bear', label: 'Bear Case',  desc: 'Pessimistic scenario — 20% downside risk',    multiplier: 0.8,  color: '#f87171', icon: TrendingDown },
];

export default function ScenarioPanel({ scenarios, activeScenario, onSelect, primaryLabel, baseValue }) {
  if (!scenarios) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border border-white/8">
      <h3 className="font-semibold text-sm mb-1">Scenario Analysis</h3>
      <p className="text-xs text-white/30 mb-4">Select a scenario to update the forecast chart</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {SCENARIOS.map((sc, i) => {
          const data = scenarios[sc.id] || [];
          const endValue = data[data.length - 1]?.value;
          const isActive = activeScenario === sc.id;
          const Icon = sc.icon;

          return (
            <motion.button
              key={sc.id}
              onClick={() => onSelect(sc.id)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`text-left p-4 rounded-xl border transition-all ${isActive ? 'border-opacity-60 scale-[1.02]' : 'border-white/8 hover:border-white/15'}`}
              style={isActive ? { borderColor: `${sc.color}60`, background: `${sc.color}08` } : {}}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${sc.color}15` }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: sc.color }} />
                </div>
                <span className="font-semibold text-sm" style={{ color: isActive ? sc.color : 'rgba(255,255,255,0.75)' }}>
                  {sc.label}
                </span>
                {isActive && <span className="ml-auto text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ background: `${sc.color}20`, color: sc.color }}>Active</span>}
              </div>
              <div className="font-black font-mono text-lg mb-1" style={{ color: sc.color }}>{fmtV(endValue)}</div>
              <div className="text-xs text-white/35 leading-relaxed">{sc.desc}</div>
              {baseValue && endValue && (
                <div className="mt-2 text-xs font-mono" style={{ color: sc.color }}>
                  {sc.multiplier > 1 ? '+' : sc.multiplier < 1 ? '-' : ''}{Math.abs((sc.multiplier - 1) * 100).toFixed(0)}% vs base
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}