/**
 * ML Intelligence Center — Phase 2: Advanced MLOps Pipeline
 * AutoML, model registry, feature store, experiment tracking, XAI, causal inference
 * Think: Azure ML Studio + SageMaker + DataRobot combined
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Brain, Zap, TrendingUp, BarChart2, CheckCircle2, AlertTriangle,
  Play, Pause, RotateCcw, Download, Upload, Settings, ChevronRight,
  Activity, Target, Layers, GitBranch, Star, Clock, Database,
  Eye, Shield, Sparkles, Loader2, ArrowUpRight
} from 'lucide-react';

const MODEL_TYPES = [
  { id: 'automl_classification', label: 'AutoML Classification', icon: Target, color: '#00e5ff', desc: 'Automatically find best classifier (XGBoost, LightGBM, RF, LogReg)' },
  { id: 'automl_regression', label: 'AutoML Regression', icon: TrendingUp, color: '#4caf50', desc: 'Predict continuous values with ensemble selection + tuning' },
  { id: 'time_series_forecast', label: 'Time-Series Forecast', icon: BarChart2, color: '#a855f7', desc: 'Prophet + LSTM hybrid for seasonal, trend, holiday decomposition' },
  { id: 'anomaly_detection', label: 'Anomaly Detection', icon: AlertTriangle, color: '#ef4444', desc: 'Isolation Forest + AutoEncoder for unsupervised outlier detection' },
  { id: 'clustering', label: 'Customer Clustering', icon: Layers, color: '#ffcc02', desc: 'K-Means + DBSCAN + hierarchical clustering with elbow method' },
  { id: 'causal_inference', label: 'Causal Inference', icon: GitBranch, color: '#ff6b35', desc: 'DoWhy + EconML for treatment effect estimation and A/B analysis' },
];

const EXPERIMENT_LOG = [
  { name: 'XGBoost v3', metric: 0.924, status: 'champion', duration: '4m 12s', params: { n_estimators: 300, max_depth: 6, lr: 0.08 } },
  { name: 'LightGBM v2', metric: 0.918, status: 'challenger', duration: '2m 45s', params: { n_leaves: 63, lr: 0.1 } },
  { name: 'Random Forest v1', metric: 0.891, status: 'archived', duration: '6m 30s', params: { n_estimators: 200, max_features: 'sqrt' } },
  { name: 'Logistic Reg', metric: 0.834, status: 'archived', duration: '0m 18s', params: { C: 1.0, solver: 'lbfgs' } },
];

const FEATURE_IMPORTANCE = [
  { feature: 'tenure_days', importance: 0.34, type: 'numeric' },
  { feature: 'monthly_charges', importance: 0.28, type: 'currency' },
  { feature: 'contract_type', importance: 0.18, type: 'category' },
  { feature: 'num_services', importance: 0.11, type: 'count' },
  { feature: 'support_tickets', importance: 0.06, type: 'count' },
  { feature: 'payment_method', importance: 0.03, type: 'category' },
];

const SHAP_COLORS = { numeric: '#00e5ff', currency: '#4caf50', category: '#a855f7', count: '#ffcc02' };

function ExperimentRow({ exp }) {
  const statusCfg = {
    champion: { color: '#4caf50', label: '🏆 Champion' },
    challenger: { color: '#00e5ff', label: '⚡ Challenger' },
    archived: { color: '#888', label: '📦 Archived' },
  }[exp.status];
  return (
    <tr className="border-b border-white/5 hover:bg-white/2 transition-colors">
      <td className="px-4 py-3 font-semibold text-white/80">{exp.name}</td>
      <td className="px-4 py-3">
        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ color: statusCfg.color, background: `${statusCfg.color}18`, border: `1px solid ${statusCfg.color}30` }}>
          {statusCfg.label}
        </span>
      </td>
      <td className="px-4 py-3 font-mono font-bold" style={{ color: exp.metric > 0.9 ? '#4caf50' : '#ffcc02' }}>
        {exp.metric.toFixed(3)} AUC
      </td>
      <td className="px-4 py-3 text-white/35 text-xs">{exp.duration}</td>
      <td className="px-4 py-3 text-white/30 text-xs font-mono">
        {Object.entries(exp.params).map(([k, v]) => `${k}=${v}`).join(' · ')}
      </td>
    </tr>
  );
}

export default function MLIntelligence() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [selectedModel, setSelectedModel] = useState(null);
  const [targetCol, setTargetCol] = useState('');
  const [featureCols, setFeatureCols] = useState([]);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState(null);
  const [tab, setTab] = useState('automl');
  const [models, setModels] = useState([]);

  const columns = table?.columns || [];
  const numericCols = columns.filter(c => ['numeric', 'number'].includes(c.type || '') || c.inferredType === 'numeric');

  useEffect(() => {
    base44.entities.MachineLearningModel.list('-updated_date', 10).then(r => setModels(r || [])).catch(() => {});
  }, []);

  const handleTrain = async () => {
    if (!selectedModel || !table) return;
    setTraining(true);
    setTrainResult(null);
    try {
      const res = await base44.functions.invoke('trainMLModel', {
        modelType: selectedModel.id,
        targetColumn: targetCol,
        featureColumns: featureCols.length ? featureCols : numericCols.slice(0, 8).map(c => c.name || c),
        tableId: table.id || table.name,
        tableName: table.name,
        hyperparameters: { n_estimators: 200, max_depth: 6, learning_rate: 0.1 },
      });
      setTrainResult(res.data);
    } catch (e) {
      setTrainResult({ error: e.message });
    }
    setTraining(false);
  };

  const TABS = ['automl', 'experiments', 'xai', 'features'];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(168,85,247,0.06) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">ML Intelligence Center</h1>
            <p className="text-xs text-muted-foreground">AutoML · Experiment Tracking · XAI (SHAP) · Causal Inference · Model Registry</p>
          </div>
        </div>
        <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${tab === t ? 'bg-white/10 text-white/90' : 'text-white/35 hover:text-white/65'}`}>
              {t === 'automl' ? 'AutoML' : t === 'xai' ? 'Explainability (XAI)' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 max-w-[1400px] mx-auto space-y-6">

        {/* AutoML */}
        {tab === 'automl' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Model Selector */}
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Select ML Task</h2>
              <div className="grid grid-cols-2 gap-3">
                {MODEL_TYPES.map(m => (
                  <motion.button key={m.id} onClick={() => setSelectedModel(m)} whileHover={{ scale: 1.01 }}
                    className={`text-left glass-card rounded-2xl p-4 border transition-all ${selectedModel?.id === m.id ? 'border-white/25' : 'border-white/8 hover:border-white/15'}`}
                    style={selectedModel?.id === m.id ? { boxShadow: `0 0 20px ${m.color}20`, borderColor: `${m.color}40` } : {}}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${m.color}18`, border: `1px solid ${m.color}30` }}>
                        <m.icon className="w-3.5 h-3.5" style={{ color: m.color }} />
                      </div>
                      <span className="text-xs font-bold" style={{ color: selectedModel?.id === m.id ? m.color : 'rgba(255,255,255,0.7)' }}>{m.label}</span>
                    </div>
                    <p className="text-xs text-white/35 leading-relaxed">{m.desc}</p>
                  </motion.button>
                ))}
              </div>

              {/* Config */}
              {selectedModel && (
                <div className="glass-card rounded-2xl p-5 border border-white/8 space-y-4">
                  <h3 className="text-sm font-bold">Configure: {selectedModel.label}</h3>
                  {table ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">Target Column</label>
                          <select value={targetCol} onChange={e => setTargetCol(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
                            <option value="">Select target…</option>
                            {columns.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-white/40 mb-1 block">Dataset: {table.name}</label>
                          <div className="bg-white/3 rounded-xl px-3 py-2 text-sm text-white/45">{table.rowCount || table.rows?.length} rows · {columns.length} columns</div>
                        </div>
                      </div>
                      <button onClick={handleTrain} disabled={training || !targetCol}
                        className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-40"
                        style={{ background: selectedModel.color, color: 'hsl(222,47%,6%)' }}>
                        {training ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                        {training ? 'Training…' : 'Run AutoML'}
                      </button>
                    </>
                  ) : (
                    <div className="text-sm text-white/35">Load a dataset in the Workspace first to train a model.</div>
                  )}
                  {trainResult && (
                    <div className="bg-white/3 rounded-xl p-4 border border-white/8 text-xs space-y-1">
                      {trainResult.error ? (
                        <div className="text-red-400">{trainResult.error}</div>
                      ) : (
                        <>
                          <div className="text-green-400 font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Training complete</div>
                          {trainResult.accuracy && <div className="text-white/50">Accuracy: <span className="text-cyan-400 font-mono">{(trainResult.accuracy).toFixed(3)}</span></div>}
                          {trainResult.status && <div className="text-white/40">Status: {trainResult.status}</div>}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Model Registry */}
            <div className="space-y-4">
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">Model Registry</h2>
              {models.length === 0 ? (
                <div className="glass-card rounded-2xl p-6 border border-white/8 text-center text-sm text-white/25">No models trained yet</div>
              ) : (
                <div className="space-y-2">
                  {models.slice(0, 6).map(m => (
                    <div key={m.id} className="glass-card rounded-xl p-3 border border-white/8 hover:border-white/15 transition-all">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-white/80">{m.name}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-green-400/10 border border-green-400/20 text-green-400 capitalize">{m.status}</span>
                      </div>
                      <div className="text-xs text-white/35">{m.modelType?.replace(/_/g, ' ')} · {m.tableName}</div>
                      {m.accuracy && <div className="text-xs font-mono text-cyan-400 mt-1">AUC {m.accuracy.toFixed(3)}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Experiments */}
        {tab === 'experiments' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
              <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
                <h2 className="font-bold text-sm flex items-center gap-2"><Activity className="w-4 h-4 text-cyan-400" /> Experiment Tracker</h2>
                <span className="text-xs text-white/30">MLflow-style tracking</span>
              </div>
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/8 bg-white/3">
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Run Name</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Metric</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left text-white/35 font-semibold">Hyperparameters</th>
                </tr></thead>
                <tbody>{EXPERIMENT_LOG.map(e => <ExperimentRow key={e.name} exp={e} />)}</tbody>
              </table>
            </div>
            {/* Metric comparison chart */}
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h3 className="text-sm font-bold mb-4">AUC Score Comparison</h3>
              <div className="space-y-2">
                {EXPERIMENT_LOG.map(e => (
                  <div key={e.name} className="flex items-center gap-3 text-xs">
                    <span className="w-28 text-white/50 truncate">{e.name}</span>
                    <div className="flex-1 h-5 bg-white/4 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${e.metric * 100}%`, background: e.status === 'champion' ? '#4caf50' : e.status === 'challenger' ? '#00e5ff' : '#888' }} />
                    </div>
                    <span className="w-12 text-right font-mono" style={{ color: e.metric > 0.9 ? '#4caf50' : '#ffcc02' }}>{e.metric.toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* XAI */}
        {tab === 'xai' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <div className="flex items-center gap-2 mb-5">
                <Eye className="w-4 h-4 text-purple-400" />
                <h2 className="font-bold text-sm">SHAP Feature Importance — XGBoost Champion Model</h2>
              </div>
              <div className="space-y-3">
                {FEATURE_IMPORTANCE.map((f, i) => (
                  <motion.div key={f.feature} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className="flex items-center gap-3 text-xs">
                    <span className="w-32 text-white/55 font-mono truncate">{f.feature}</span>
                    <div className="flex-1 h-5 bg-white/4 rounded-full overflow-hidden relative">
                      <div className="h-full rounded-full" style={{ width: `${f.importance * 100}%`, background: SHAP_COLORS[f.type] || '#888' }} />
                      <span className="absolute right-2 top-0 h-full flex items-center font-mono text-white/35">{(f.importance * 100).toFixed(0)}%</span>
                    </div>
                    <span className="text-xs px-1.5 py-0.5 rounded-full border" style={{ color: SHAP_COLORS[f.type], borderColor: `${SHAP_COLORS[f.type]}30`, background: `${SHAP_COLORS[f.type]}10` }}>{f.type}</span>
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <h3 className="text-sm font-bold mb-3">Local Explanation (LIME)</h3>
                <p className="text-xs text-white/45 leading-relaxed">For a customer with tenure=340 days, monthly_charges=$89, contract=month-to-month: <br /><br />The model predicts <span className="text-red-400 font-semibold">67% churn probability</span>. Key drivers: short tenure (+0.18 SHAP), month-to-month contract (+0.14), high charges (+0.09).</p>
              </div>
              <div className="glass-card rounded-2xl p-5 border border-white/8">
                <h3 className="text-sm font-bold mb-3">Causal Inference (DoWhy)</h3>
                <p className="text-xs text-white/45 leading-relaxed">Treatment: Offer 2-year contract<br />Outcome: Churn reduction<br /><br />Average Treatment Effect (ATE): <span className="text-green-400 font-semibold">-32% churn rate</span><br />95% CI: [-38%, -26%] — statistically significant (p&lt;0.001)</p>
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        {tab === 'features' && (
          <div className="space-y-4">
            <div className="glass-card rounded-2xl p-5 border border-white/8">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2"><Database className="w-4 h-4 text-cyan-400" /> Feature Store</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'customer_tenure', type: 'numeric', derived: false, freshness: '1hr' },
                  { name: 'avg_monthly_spend_90d', type: 'currency', derived: true, freshness: '4hr' },
                  { name: 'support_ticket_count_30d', type: 'count', derived: true, freshness: '1hr' },
                  { name: 'contract_remaining_days', type: 'numeric', derived: true, freshness: '24hr' },
                  { name: 'product_usage_score', type: 'rate', derived: true, freshness: '4hr' },
                  { name: 'nps_last_survey', type: 'score', derived: false, freshness: '7d' },
                  { name: 'payment_delay_count', type: 'count', derived: true, freshness: '1hr' },
                  { name: 'churn_risk_segment', type: 'category', derived: true, freshness: '4hr' },
                ].map(f => (
                  <div key={f.name} className="bg-white/3 rounded-xl p-3 border border-white/6 hover:border-white/12 transition-all">
                    <div className="font-mono text-xs text-cyan-400 mb-1 truncate">{f.name}</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-white/8 text-white/40">{f.type}</span>
                      {f.derived && <span className="text-xs px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400">derived</span>}
                    </div>
                    <div className="text-xs text-white/25 mt-1 flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{f.freshness}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}