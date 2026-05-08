/**
 * ML Workbench — Train, evaluate, and deploy ML models on workspace data
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { Brain, Play, CheckCircle2, AlertTriangle, BarChart2, Zap, ChevronRight, Loader2, TrendingUp, Target, Upload, RefreshCw, Code2 } from 'lucide-react';
import MLModelCard from '@/components/ml/MLModelCard';
import MLTrainingForm from '@/components/ml/MLTrainingForm';
import MLResultsPanel from '@/components/ml/MLResultsPanel';
import MLOpsPanel from '@/components/ml/MLOpsPanel';
import ScriptUploadPanel from '@/components/ml/ScriptUploadPanel';

const MAIN_TABS = [
  { id: 'train', label: 'Train Models', icon: Brain },
  { id: 'mlops', label: 'MLOps', icon: RefreshCw },
  { id: 'scripts', label: 'Custom Scripts', icon: BarChart2 },
];

export default function MLWorkbench() {
  const { getActiveTable } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const [models, setModels] = useState([]);
  const [training, setTraining] = useState(false);
  const [activeModel, setActiveModel] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [mainTab, setMainTab] = useState('train');

  const handleTrain = async (config) => {
    if (!activeTable?.rows?.length) return;
    setTraining(true);
    setShowForm(false);
    try {
      const res = await base44.functions.invoke('trainMLModel', {
        modelName: config.name,
        modelType: config.modelType,
        targetColumn: config.targetColumn,
        featureColumns: config.featureColumns,
        algorithm: config.algorithm,
        tableName: activeTable.name,
        rows: activeTable.rows.slice(0, 500),
        hyperparameters: config.hyperparameters || {},
      });
      const model = {
        id: Date.now().toString(),
        name: config.name,
        modelType: config.modelType,
        tableName: activeTable.name,
        status: 'trained',
        trainedAt: new Date().toISOString(),
        ...res.data,
      };
      setModels(prev => [model, ...prev]);
      setActiveModel(model);
    } catch (e) {
      console.error(e);
    }
    setTraining(false);
  };

  if (!activeTable) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-400/10 border border-purple-400/20 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Dataset Loaded</h2>
          <p className="text-muted-foreground text-sm mb-4">Load a dataset in the Workspace to start training ML models.</p>
          <a href="/workspace" className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-400 text-xs font-bold rounded-xl hover:bg-purple-300 transition-colors" style={{ color: 'hsl(222,47%,6%)' }}>
            <Upload className="w-4 h-4" /> Go to Workspace
          </a>
        </div>
      </div>
    );
  }

  const cols = activeTable.columns || [];
  const numericCols = cols.filter(c => c.inferredType === 'numeric' || c.isKpiCandidate);
  const catCols = cols.filter(c => c.inferredType === 'category' || c.isSegmentCandidate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
            <Brain className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">ML Workbench</h1>
            <p className="text-xs text-muted-foreground">Train & deploy machine learning models on <span className="text-purple-400 font-semibold">{activeTable.name}</span> · {activeTable.rowCount?.toLocaleString()} rows</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Main Tabs */}
          <div className="flex gap-0.5 p-1 bg-white/5 rounded-xl border border-white/8">
            {MAIN_TABS.map(t => (
              <button key={t.id} onClick={() => setMainTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${mainTab === t.id ? 'bg-purple-400/20 text-purple-400' : 'text-white/40 hover:text-white/70'}`}>
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {mainTab === 'train' && (
            <button onClick={() => setShowForm(true)} disabled={training}
              className="flex items-center gap-2 px-4 py-2 bg-purple-400 text-xs font-bold rounded-xl hover:bg-purple-300 transition-all disabled:opacity-50"
              style={{ color: 'hsl(222,47%,6%)' }}>
              {training ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {training ? 'Training…' : 'Train Model'}
            </button>
          )}
        </div>
      </div>

      <div className="flex h-[calc(100vh-81px)]">
        {/* Sidebar */}
        <div className="w-72 border-r border-white/8 overflow-y-auto p-4 space-y-2 flex-shrink-0">
          <div className="text-xs text-white/30 uppercase tracking-widest mb-3 px-1">Trained Models ({models.length})</div>
          {models.length === 0 && !training && (
            <div className="text-center py-10 text-muted-foreground text-xs">
              <Brain className="w-8 h-8 mx-auto mb-2 opacity-20" />
              No models yet. Train your first model!
            </div>
          )}
          {training && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-3 p-3 rounded-xl bg-purple-400/10 border border-purple-400/20 text-xs">
              <Loader2 className="w-4 h-4 text-purple-400 animate-spin flex-shrink-0" />
              <span className="text-purple-300">Training model…</span>
            </motion.div>
          )}
          <AnimatePresence>
            {models.map(m => (
              <MLModelCard key={m.id} model={m} active={activeModel?.id === m.id} onClick={() => setActiveModel(m)} />
            ))}
          </AnimatePresence>

          {/* Quick Stats */}
          <div className="pt-4 mt-4 border-t border-white/5 space-y-2">
            <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Dataset Info</div>
            <div className="glass rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between"><span className="text-white/40">Rows</span><span className="font-mono text-white/70">{activeTable.rowCount?.toLocaleString()}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Numeric cols</span><span className="font-mono text-white/70">{numericCols.length}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Category cols</span><span className="font-mono text-white/70">{catCols.length}</span></div>
              <div className="flex justify-between"><span className="text-white/40">Quality score</span><span className="font-mono text-cyan-400">{activeTable.qualityScore || 0}%</span></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {mainTab === 'mlops' && <MLOpsPanel model={activeModel} onRetrain={() => setShowForm(true)} />}
          {mainTab === 'scripts' && <ScriptUploadPanel table={activeTable} />}
          {mainTab === 'train' && (
            activeModel ? (
              <MLResultsPanel model={activeModel} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain className="w-16 h-16 text-purple-400/20 mb-4" />
                <h2 className="text-lg font-bold mb-2">Select or Train a Model</h2>
                <p className="text-muted-foreground text-sm max-w-md">Train classification, regression, clustering, or anomaly detection models on your workspace data with one click.</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
                  {['Classification', 'Regression', 'Clustering', 'Anomaly Detection'].map((t, i) => (
                    <div key={t} className="p-4 glass rounded-xl border border-white/8 text-xs font-semibold text-center hover:border-purple-400/30 transition-all cursor-pointer" onClick={() => setShowForm(true)}>
                      <div className="text-2xl mb-2">{['🎯','📈','🔵','🚨'][i]}</div>
                      {t}
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Training Form Modal */}
      <AnimatePresence>
        {showForm && (
          <MLTrainingForm
            table={activeTable}
            onTrain={handleTrain}
            onClose={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}