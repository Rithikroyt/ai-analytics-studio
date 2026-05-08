import { motion } from 'framer-motion';
import { Users, Star } from 'lucide-react';

export default function PersonaCard({ persona, active, onClick }) {
  return (
    <motion.button initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={`w-full text-left p-3 rounded-xl border transition-all ${active ? 'border-opacity-50 bg-opacity-10' : 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/5'}`}
      style={active ? { borderColor: `${persona.avatarColor}50`, background: `${persona.avatarColor}10` } : {}}>
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
          style={{ background: `${persona.avatarColor}20`, color: persona.avatarColor, border: `1px solid ${persona.avatarColor}30` }}>
          {persona.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate">{persona.name}</div>
          <div className="text-xs text-white/35 truncate">{persona.role}</div>
        </div>
        {active && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: persona.avatarColor }} />}
      </div>
      <div className="text-xs text-white/25 mt-1.5">{persona.department}</div>
    </motion.button>
  );
}