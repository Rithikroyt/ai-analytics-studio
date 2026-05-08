import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Brain, Zap } from 'lucide-react';

const MODEL_TYPES = [
  { value: 'classification', label: 'Classification', desc: 'Predict categories or labels', emoji: '🎯' },
  { value: 'regression', label: 'Regression', desc: 'Predict numeric values', emoji: '📈' },
  { value: 'clustering', label: 'Clustering', desc: 'Group similar records', emoji: '🔵' },
  { value: 'anomaly_detection', label: 'Anomaly Detection', desc: 'Find outliers and anomalies', emoji: '🚨' },
];

const ALGORITHMS = {
  classification: ['Random Forest', 'XGBoost', 'Logistic Regression', 'Neural Network', 'SVM'],
  regression: ['Random Forest Regressor', 'XGBoost Regressor', 'Linear Regression', 'Ridge Regression', 'Neural Network'],
  clustering: ['K-Means', 'DBSCAN', 'Hierarchical', 'Gaussian Mixture'],
  anomaly_detection: ['Isolation Forest', 'One-Class SVM', 'AutoEncoder', 'LOF'],
};

export default function MLTrainingForm({ table, onTrain, onClose }) {
  const cols = table?.columns || [];
  const numericCols = cols.filter(c => c.inferredType === 'numeric' || c.isKpiCandidate);

  const [form, setForm] = useState({
    name: `Model_${Date.now().toString().slice(-4)}`,
    modelType: 'classification',
    targetColumn: numericCols[0]?.name || cols[0]?.name || '',
    featureColumns: numericCols.slice(1, 6).map(c => c.name),
    algorithm: '',
  });

  const toggleFeature = (col) => {
    setForm(prev => ({
      ...prev,
      featureColumns: prev.featureColumns.includes(col)
        ? prev.featureColumns.filter(c => c !== col)
        : [...prev.featureColumns, col],
    }));
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        className="w-full max-w-lg glass-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            <span className="font-bold">Train New Model</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/70 rounded-lg hover:bg-white/5 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Name */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Model Name</label>
            <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400/40" />
          </div>

          {/* Model Type */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Model Type</label>
            <div className="grid grid-cols-2 gap-2">
              {MODEL_TYPES.map(t => (
                <button key={t.value} onClick={() => setForm(p => ({ ...p, modelType: t.value, algorithm: '' }))}
                  className={`p-3 rounded-xl border text-left transition-all ${form.modelType === t.value ? 'border-purple-400/40 bg-purple-400/10' : 'border-white/8 bg-white/3 hover:border-white/15'}`}>
                  <div className="text-lg mb-1">{t.emoji}</div>
                  <div className="text-xs font-semibold">{t.label}</div>
                  <div className="text-xs text-white/35">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Algorithm */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Algorithm (optional)</label>
            <select value={form.algorithm} onChange={e => setForm(p => ({ ...p, algorithm: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400/40">
              <option value="">Auto-select best</option>
              {(ALGORITHMS[form.modelType] || []).map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          {/* Target Column */}
          {form.modelType !== 'clustering' && (
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Target Column (what to predict)</label>
              <select value={form.targetColumn} onChange={e => setForm(p => ({ ...p, targetColumn: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-purple-400/40">
                {cols.map(c => <option key={c.name} value={c.name}>{c.name} ({c.inferredType || c.type})</option>)}
              </select>
            </div>
          )}

          {/* Feature Columns */}
          <div>
            <label className="text-xs text-white/40 mb-1.5 block">Feature Columns ({form.featureColumns.length} selected)</label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-xl bg-white/3 border border-white/8">
              {cols.filter(c => c.name !== form.targetColumn).map(c => (
                <button key={c.name} onClick={() => toggleFeature(c.name)}
                  className={`text-xs px-2 py-1 rounded-lg border transition-all ${form.featureColumns.includes(c.name) ? 'bg-purple-400/15 border-purple-400/30 text-purple-300' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-white/8 flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
          <button onClick={() => onTrain(form)} disabled={!form.featureColumns.length}
            className="flex items-center gap-2 px-5 py-2 bg-purple-400 text-xs font-bold rounded-xl hover:bg-purple-300 transition-all disabled:opacity-40"
            style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-3.5 h-3.5" /> Start Training
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}