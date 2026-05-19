/**
 * MLModelSelector — Phase 7: Model selection guide
 * Recommends the right model based on data and task type
 * IsolationForest, DBSCAN, Prophet, SARIMAX, XGBoost, SHAP, SimpleImputer
 */
import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { Brain, TrendingUp, AlertTriangle, Zap, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MODELS = [
  {
    id: 'imputer',
    name: 'SimpleImputer',
    task: 'Missing Values',
    useCase: 'Fill missing numeric cells with median, mean, or mode',
    when: 'Dataset has <30% missing values in numeric/categorical columns',
    evaluation: 'Before/after completeness score',
    color: '#60a5fa',
    icon: '🔧',
    formulae: ['Numeric: Median imputation', 'Categorical: Mode imputation', 'Time-series: Forward fill'],
  },
  {
    id: 'zscore',
    name: 'Z-Score / IQR',
    task: 'Univariate Anomalies',
    useCase: 'Flag outliers in a single numeric column',
    when: 'Single column anomaly detection needed — simple and explainable',
    evaluation: 'Z = (x - mean) / stdDev → flag if |Z| > 3',
    color: '#fbbf24',
    icon: '📊',
    formulae: ['Z = (x - mean) / stdDev', 'Flag if |Z| > 3', 'IQR = Q3 - Q1', 'Outlier if x < Q1 - 1.5×IQR or x > Q3 + 1.5×IQR'],
  },
  {
    id: 'isolation',
    name: 'IsolationForest',
    task: 'Multivariate Anomalies',
    useCase: 'Detect anomalous rows across multiple numeric columns simultaneously',
    when: 'Dataset has multiple numeric columns and you need multi-dimensional anomaly detection',
    evaluation: 'Anomaly score: lower = more anomalous; contamination=0.02 by default',
    color: '#f87171',
    icon: '🌲',
    formulae: ['n_estimators=200', 'contamination=0.02', 'Shorter path = more isolated = anomaly'],
  },
  {
    id: 'dbscan',
    name: 'DBSCAN',
    task: 'Density Clustering',
    useCase: 'Cluster data and identify noise points without defining cluster count',
    when: 'You want to find natural clusters and noise/outliers simultaneously',
    evaluation: 'Noise points labeled -1; silhouette score for cluster quality',
    color: '#e879f9',
    icon: '🔵',
    formulae: ['No need to define k clusters', 'Noise points = label -1 = potential fraud/anomaly'],
  },
  {
    id: 'prophet',
    name: 'Prophet',
    task: 'Business Forecasting',
    useCase: 'Forecast business time series — revenue, demand, users',
    when: 'Dataset has a date column + 100+ rows + metric to forecast',
    evaluation: 'MAPE = avg(|actual - forecast| / actual) × 100',
    color: '#4ade80',
    icon: '📈',
    formulae: ['Requires ds (date) + y (metric)', 'yearly_seasonality=True', 'weekly_seasonality=True', 'MAPE < 10% = excellent'],
  },
  {
    id: 'sarimax',
    name: 'SARIMAX',
    task: 'Seasonal Forecasting',
    useCase: 'Seasonal time series with external regressors (e.g. marketing spend → revenue)',
    when: 'Strong seasonality + you have external variables that affect the forecast',
    evaluation: 'AIC/BIC for model fit; RMSE for accuracy',
    color: '#00e5ff',
    icon: '🌊',
    formulae: ['order=(1,1,1)', 'seasonal_order=(1,1,1,12)', 'RMSE = sqrt(mean((actual - forecast)²))'],
  },
  {
    id: 'xgboost',
    name: 'XGBRegressor / XGBClassifier',
    task: 'Tabular Prediction',
    useCase: 'Predict a target column from other columns (regression or classification)',
    when: 'Dataset has feature columns + a numeric or categorical target column to predict',
    evaluation: 'RMSE for regression; Accuracy/F1 for classification; SHAP for explainability',
    color: '#f59e0b',
    icon: '🚀',
    formulae: ['n_estimators=300', 'max_depth=4', 'learning_rate=0.05', 'SHAP values for feature importance'],
  },
  {
    id: 'shap',
    name: 'SHAP Explainability',
    task: 'Model Explainability',
    useCase: 'Explain which features drive predictions — required for business ML',
    when: 'After XGBoost training — always add SHAP for trust and auditability',
    evaluation: 'Mean absolute SHAP value per feature = feature importance',
    color: '#a855f7',
    icon: '🔍',
    formulae: ['Shapley value = marginal contribution', 'Positive = pushes prediction up', 'Negative = pushes prediction down'],
  },
];

const TASK_RECOMMENDATION = (cols) => {
  const numericCount = cols.filter(c => c.type === 'numeric').length;
  const hasDate = cols.some(c => c.type === 'date');
  const hasCat = cols.some(c => c.type === 'category');
  const recs = [];
  if (numericCount >= 1) recs.push('zscore');
  if (numericCount >= 3) recs.push('isolation');
  if (hasDate && numericCount >= 1) recs.push('prophet');
  if (hasCat && numericCount >= 1) recs.push('xgboost');
  if (numericCount >= 2 && hasCat) recs.push('dbscan');
  return recs;
};

export default function MLModelSelector({ onModelSelect }) {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const cols = table?.columns || [];
  const [selected, setSelected] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const recommended = TASK_RECOMMENDATION(cols);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-white/40 px-1">
        <Brain className="w-3.5 h-3.5 text-purple-400" />
        <span>Model selection based on your dataset. Highlighted = recommended for your data.</span>
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        {MODELS.map(m => {
          const isRec = recommended.includes(m.id);
          const isSel = selected === m.id;
          return (
            <div key={m.id} className={`rounded-xl border transition-all ${isSel ? 'border-white/20 bg-white/5' : isRec ? 'border-white/12 bg-white/3' : 'border-white/6 bg-white/1'}`}>
              <button onClick={() => { setSelected(m.id); setExpanded(expanded === m.id ? null : m.id); if (onModelSelect) onModelSelect(m); }}
                className="w-full flex items-center gap-3 px-4 py-3 text-left">
                <span className="text-lg flex-shrink-0">{m.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold" style={{ color: m.color }}>{m.name}</span>
                    {isRec && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 flex items-center gap-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Recommended</span>}
                  </div>
                  <div className="text-xs text-white/35 mt-0.5">{m.task} — {m.useCase}</div>
                </div>
                {expanded === m.id ? <ChevronDown className="w-4 h-4 text-white/25" /> : <ChevronRight className="w-4 h-4 text-white/25" />}
              </button>
              <AnimatePresence>
                {expanded === m.id && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="px-4 pb-4 space-y-3 border-t border-white/8 pt-3">
                      <div className="text-xs text-white/40"><span className="text-white/60 font-semibold">When to use:</span> {m.when}</div>
                      <div className="text-xs text-white/40"><span className="text-white/60 font-semibold">Evaluation:</span> {m.evaluation}</div>
                      <div className="space-y-1">
                        <div className="text-xs text-white/30 font-semibold">Key formulas/parameters:</div>
                        {m.formulae.map(f => (
                          <code key={f} className="text-xs text-cyan-400/70 block bg-white/3 rounded px-2 py-0.5 font-mono">{f}</code>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}