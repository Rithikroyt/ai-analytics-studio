/**
 * ScriptUploadPanel — Upload custom Python/R scripts for training
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { Upload, FileText, Play, CheckCircle2, Loader2, X, Code2, Sparkles } from 'lucide-react';

const EXAMPLE_SCRIPTS = [
  {
    name: 'Churn Prediction',
    lang: 'python',
    desc: 'Logistic regression churn model with feature engineering',
    code: `import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report

# Load data
df = pd.read_csv('data.csv')

# Feature engineering
X = df[['tenure', 'monthly_charges', 'total_charges']].fillna(0)
y = df['churn'].map({'Yes': 1, 'No': 0})

# Split & train
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
scaler = StandardScaler()
model = LogisticRegression()
model.fit(scaler.fit_transform(X_train), y_train)

# Evaluate
preds = model.predict(scaler.transform(X_test))
print(classification_report(y_test, preds))`,
  },
  {
    name: 'Customer Segmentation',
    lang: 'python',
    desc: 'K-Means clustering for RFM customer segmentation',
    code: `import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

df = pd.read_csv('data.csv')

# RFM features
features = df[['recency', 'frequency', 'monetary']].fillna(0)
scaler = StandardScaler()
scaled = scaler.fit_transform(features)

# K-Means (4 segments)
kmeans = KMeans(n_clusters=4, random_state=42)
df['segment'] = kmeans.fit_predict(scaled)
print(df.groupby('segment')[['recency','frequency','monetary']].mean())`,
  },
  {
    name: 'Lead Scoring',
    lang: 'python',
    desc: 'XGBoost lead scoring with probability calibration',
    code: `import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV

df = pd.read_csv('data.csv')
features = ['page_views', 'email_opens', 'demo_requests', 'company_size']
X = df[features].fillna(0)
y = df['converted']

model = GradientBoostingClassifier(n_estimators=100)
calibrated = CalibratedClassifierCV(model, cv=3)
calibrated.fit(X, y)

df['lead_score'] = calibrated.predict_proba(X)[:, 1]
print(df[['lead_id', 'lead_score']].sort_values('lead_score', ascending=False).head(20))`,
  },
];

export default function ScriptUploadPanel({ table }) {
  const [script, setScript] = useState('');
  const [scriptName, setScriptName] = useState('');
  const [lang, setLang] = useState('python');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  const fileRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScriptName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => setScript(ev.target?.result || '');
    reader.readAsText(file);
  };

  const handleRun = async () => {
    if (!script.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      // Use the executeNotebookCell backend with type=python
      const res = await base44.functions.invoke('executeNotebookCell', {
        cellType: 'python',
        content: script,
        tableData: table?.rows?.slice(0, 100) || [],
        tableName: table?.name || 'data',
        columns: table?.columns?.map(c => c.name) || [],
      });
      setResult({ success: true, output: res.data?.output || res.data?.result || 'Script executed successfully.' });
    } catch (e) {
      setResult({ success: false, output: e.message });
    }
    setRunning(false);
  };

  const loadExample = (ex) => {
    setScript(ex.code);
    setScriptName(ex.name + '.py');
    setLang(ex.lang);
    setSelectedExample(ex.name);
    setResult(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black mb-1">Custom Script Training</h2>
        <p className="text-sm text-muted-foreground">Upload or paste Python scripts to train custom ML models on your workspace data.</p>
      </div>

      {/* Example Scripts */}
      <div>
        <div className="text-xs text-white/30 uppercase tracking-widest mb-2">Quick Start Templates</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {EXAMPLE_SCRIPTS.map(ex => (
            <button key={ex.name} onClick={() => loadExample(ex)}
              className={`text-left p-4 rounded-2xl border transition-all ${selectedExample === ex.name ? 'bg-purple-400/10 border-purple-400/25' : 'bg-white/3 border-white/8 hover:border-white/15 hover:bg-white/5'}`}>
              <div className="flex items-center gap-2 mb-2">
                <Code2 className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold">{ex.name}</span>
              </div>
              <p className="text-xs text-white/45 leading-relaxed">{ex.desc}</p>
              <div className="mt-2 text-xs px-1.5 py-0.5 rounded bg-purple-400/10 text-purple-400 inline-block font-mono">{ex.lang}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Script Editor */}
      <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8 bg-white/2">
          <div className="flex gap-1.5">
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />)}
          </div>
          <input value={scriptName} onChange={e => setScriptName(e.target.value)}
            placeholder="script.py" className="flex-1 bg-transparent text-xs font-mono text-white/50 focus:outline-none" />
          <div className="flex items-center gap-2">
            <select value={lang} onChange={e => setLang(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/50 focus:outline-none">
              <option value="python">Python</option>
              <option value="r">R</option>
            </select>
            <input ref={fileRef} type="file" accept=".py,.r,.R" className="hidden" onChange={handleFileUpload} />
            <button onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 px-2 py-1 rounded-lg hover:bg-white/5 transition-all">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          </div>
        </div>
        <textarea value={script} onChange={e => setScript(e.target.value)}
          placeholder={`# Paste your ${lang} ML script here...\n# Your data is available as 'df' (pandas DataFrame)\n# Access columns: ${table?.columns?.slice(0,3).map(c=>c.name).join(', ') || 'col1, col2, ...'}`}
          className="w-full bg-transparent p-4 text-xs font-mono text-green-300/80 focus:outline-none resize-none leading-relaxed"
          style={{ minHeight: 280 }} />
        <div className="flex items-center justify-between px-4 py-3 border-t border-white/8 bg-white/2">
          <div className="text-xs text-white/25">{script.split('\n').length} lines · {script.length} chars</div>
          <div className="flex gap-2">
            {script && <button onClick={() => { setScript(''); setResult(null); setScriptName(''); setSelectedExample(null); }}
              className="text-xs text-white/25 hover:text-white/50 px-2 py-1 rounded-lg hover:bg-white/5 transition-all flex items-center gap-1">
              <X className="w-3 h-3" /> Clear
            </button>}
            <button onClick={handleRun} disabled={!script.trim() || running}
              className="flex items-center gap-1.5 px-4 py-2 bg-purple-400 text-xs font-bold rounded-xl hover:bg-purple-300 transition-all disabled:opacity-40"
              style={{ color: 'hsl(222,47%,6%)' }}>
              {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {running ? 'Running…' : 'Run Script'}
            </button>
          </div>
        </div>
      </div>

      {/* Output */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border overflow-hidden ${result.success ? 'border-green-400/20 bg-green-400/3' : 'border-red-400/20 bg-red-400/3'}`}>
            <div className={`px-4 py-2.5 border-b flex items-center gap-2 text-xs font-semibold ${result.success ? 'border-green-400/15 text-green-400' : 'border-red-400/15 text-red-400'}`}>
              {result.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {result.success ? 'Output' : 'Error'}
            </div>
            <pre className="p-4 text-xs font-mono text-white/60 whitespace-pre-wrap max-h-48 overflow-auto leading-relaxed">
              {result.output}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}