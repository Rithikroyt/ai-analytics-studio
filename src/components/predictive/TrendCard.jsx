import { TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TrendCard({ label, value, sub, color, icon: Icon, growth, index = 0 }) {
  const isUp = growth > 0;
  const isDown = growth < 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (index || 0) * 0.05 }}
      className="glass-card rounded-2xl p-5 border border-white/8 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 w-full h-0.5 rounded-t-2xl" style={{ background: `linear-gradient(90deg, transparent, ${color}55, transparent)` }} />
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-widest text-white/35">{label}</span>
        {Icon && (
          <div className="w-7 h-7 rounded-xl flex items-center justify-center" style={{ background: `${color}15` }}>
            <Icon className="w-3.5 h-3.5" style={{ color }} />
          </div>
        )}
      </div>
      <div className="font-black leading-none tabular-nums mb-2" style={{ fontSize: 24, color }}>
        {value}
      </div>
      <div className="flex items-center gap-1.5">
        {growth != null && (isUp ? <TrendingUp className="w-3 h-3 text-green-400" /> : isDown ? <TrendingDown className="w-3 h-3 text-red-400" /> : null)}
        <span className="text-xs" style={{ color: growth != null ? (isUp ? '#4ade80' : isDown ? '#f87171' : 'rgba(255,255,255,0.3)') : 'rgba(255,255,255,0.3)' }}>
          {sub}
        </span>
      </div>
    </motion.div>
  );
}