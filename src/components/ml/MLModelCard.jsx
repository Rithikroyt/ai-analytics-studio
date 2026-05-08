import { motion } from 'framer-motion';
import { Brain, CheckCircle2, Loader2, Clock } from 'lucide-react';

const TYPE_COLORS = {
  classification: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  regression: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  clustering: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  anomaly_detection: 'text-red-400 bg-red-400/10 border-red-400/20',
  forecasting: 'text-green-400 bg-green-400/10 border-green-400/20',
};

export default function MLModelCard({ model, active, onClick }) {
  const color = TYPE_COLORS[model.modelType] || 'text-white/50 bg-white/5 border-white/10';
  const acc = model.accuracy ? `${Math.round(model.accuracy)}%` : model.f1Score ? `F1: ${model.f1Score?.toFixed(2)}` : null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`p-3 rounded-xl border cursor-pointer transition-all ${active ? 'bg-purple-400/10 border-purple-400/25' : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Brain className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        <span className="text-xs font-semibold truncate flex-1">{model.name}</span>
        {model.status === 'trained' && <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" />}
        {model.status === 'training' && <Loader2 className="w-3 h-3 text-purple-400 animate-spin flex-shrink-0" />}
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`text-xs px-1.5 py-0.5 rounded-full border font-medium ${color}`}>{model.modelType}</span>
        {acc && <span className="text-xs font-mono text-green-400">{acc}</span>}
      </div>
      {model.tableName && <div className="text-xs text-white/30 mt-1.5 truncate">📊 {model.tableName}</div>}
    </motion.div>
  );
}