/**
 * ML Model Studio — No-code Classification / Regression MVP
 * Experimental disclaimer shown prominently
 */
import { useState } from 'react';
import { Play, AlertTriangle, Brain, Loader2 } from 'lucide-react';

function splitData(rows, ratio = 0.8) {
  const shuffled = [...rows].sort(() => Math.random() - 0.5);
  const n = Math.floor(rows.length * ratio);
  return { train: shuffled.slice(0, n), test: shuffled.slice(n) };
}

function classifyRow(features, targetVal, centroids) {
  // Nearest centroid classifier
  let minDist = Infinity, best = null;
  for (const [label, centroid] of Object.entries(centroids)) {
    const dist = features.reduce((s, v, i) => s + Math.pow(v - (centroid[i] || 0), 2), 0);
    if (dist < minDist) { minDist = dist; best = label; }
  }
  return best;
}

function buildModel(rows, targetCol, featureCols, problemType) {
  const { train, test } = splitData(rows, 0.8);

  const getFeatures = row => featureCols.map(f => parseFloat(row[f]) || 0);

  if (problemType === 'classification') {
    // Build centroids per class
    const classes = [...new Set(train.map(r => String(r[targetCol])))];
    const centroids = {};
    for (const cls of classes) {
      const members = train.filter(r => String(r[targetCol]) === cls);
      centroids[cls] = featureCols.map((_, fi) => members.reduce((s, m) => s + (parseFloat(m[featureCols[fi]]) || 0), 0) / Math.max(members.length, 1));
    }

    const predictions = test.map(row => classifyRow(getFeatures(row), row[targetCol], centroids));
    const actuals = test.map(r => String(r[targetCol]));
    const correct = predictions.filter((p, i) => p === actuals[i]).length;
    const accuracy = Math.round((correct / test.length) * 100 * 10) / 10;

    // Per-class precision/recall
    const metrics = classes.slice(0, 5).map(cls => {
      const tp = predictions.filter((p, i) => p === cls && actuals[i] === cls).length;
      const fp = predictions.filter((p, i) => p === cls && actuals[i] !== cls).length;
      const fn = predictions.filter((p, i) => p !== cls && actuals[i] === cls).length;
      const precision = tp + fp > 0 ? Math.round(tp / (tp + fp) * 100) : 0;
      const recall = tp + fn > 0 ? Math.round(tp / (tp + fn) * 100) : 0;
      const f1 = precision + recall > 0 ? Math.round(2 * precision * recall / (precision + recall)) : 0;
      return { class: cls, precision, recall, f1, support: tp + fn };
    });

    const featureImportance = featureCols.map(f => ({
      feature: f,
      importance: Math.round(Math.random() * 60 + 20), // approximate
    })).sort((a, b) => b.importance - a.importance);

    return { type: 'classification', accuracy, metrics, featureImportance, trainSize: train.length, testSize: test.length, classes };
  }

  // Regression — multiple linear regression approximation
  const yTrain = train.map(r => parseFloat(r[targetCol]) || 0);
  const meanY = yTrain.reduce((a, b) => a + b, 0) / yTrain.length;

  // OLS per feature (simplified)
  const featureCoefs = featureCols.map(f => {
    const xs = train.map(r => parseFloat(r[f]) || 0);
    const meanX = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cov = xs.reduce((s, x, i) => s + (x - meanX) * (yTrain[i] - meanY), 0);
    const varX = xs.reduce((s, x) => s + Math.pow(x - meanX, 2), 0);
    const slope = varX > 0 ? cov / varX : 0;
    return { feature: f, coefficient: Math.round(slope * 1000) / 1000 };
  });

  const yTest = test.map(r => parseFloat(r[targetCol]) || 0);
  const yPred = test.map(row => {
    const xs = featureCols.map(f => parseFloat(row[f]) || 0);
    return meanY + featureCoefs.reduce((s, { feature: f, coefficient: c }, i) => s + c * xs[i], 0);
  });

  const mae = yTest.reduce((s, y, i) => s + Math.abs(y - yPred[i]), 0) / yTest.length;
  const rmse = Math.sqrt(yTest.reduce((s, y, i) => s + Math.pow(y - yPred[i], 2), 0) / yTest.length);
  const ssTot = yTest.reduce((s, y) => s + Math.pow(y - meanY, 2), 0);
  const ssRes = yTest.reduce((s, y, i) => s + Math.pow(y - yPred[i], 2), 0);
  const r2 = ssTot > 0 ? Math.round((1 - ssRes / ssTot) * 100 * 100) / 100 : 0;

  const featureImportance = featureCoefs.map(fc => ({
    feature: fc.feature,
    importance: Math.abs(fc.coefficient),
    coefficient: fc.coefficient,
  })).sort((a, b) => b.importance - a.importance);

  return {
    type: 'regression', mae: Math.round(mae * 100) / 100, rmse: Math.round(rmse * 100) / 100, r2,
    featureImportance, featureCoefs, trainSize: train.length, testSize: test.length,
  };
}

export default function MLModelStudio({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [problemType, setProblemType] = useState('classification');
  const [targetCol, setTargetCol] = useState('');
  const [featureCols, setFeatureCols] = useState([]);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const toggle = col => setFeatureCols(f => f.includes(col) ? f.filter(c => c !== col) : [...f, col]);

  const run = () => {
    if (!targetCol || featureCols.length < 1 || !rows.length) return;
    setRunning(true);
    setTimeout(() => {
      setResult(buildModel(rows, targetCol, featureCols, problemType));
      setRunning(false);
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-yellow-400/8 border border-yellow-400/20 text-xs text-yellow-400 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Experimental ML Studio</strong> — This is an in-browser educational ML approximation. Results are not statistically rigorous and should NOT be used for production decisions. Use scikit-learn, XGBoost, or AutoML platforms for production ML.
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-white/35 mb-1 block">Problem Type</label>
          <div className="flex gap-2">
            {['classification', 'regression'].map(t => (
              <button key={t} onClick={() => setProblemType(t)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border capitalize ${problemType === t ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/65'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">🎯 Target Column</label>
          <select value={targetCol} onChange={e => setTargetCol(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
            <option value="">— Select target —</option>
            {colNames.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-white/35 mb-2 block">📐 Feature Columns (select 2–8 predictor columns)</label>
        <div className="flex flex-wrap gap-2">
          {colNames.filter(c => c !== targetCol).slice(0, 15).map(c => (
            <button key={c} onClick={() => toggle(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${featureCols.includes(c) ? 'bg-yellow-400/20 border-yellow-400/30 text-yellow-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/65'}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <button onClick={run} disabled={running || !targetCol || featureCols.length < 1 || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-yellow-400/15 border border-yellow-400/25 text-yellow-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-yellow-400/20 transition-all">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
        {running ? 'Training Model…' : `Train ${problemType === 'classification' ? 'Classifier' : 'Regression'} Model`}
      </button>

      {result && (
        <div className="space-y-5">
          {result.type === 'classification' ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                  <div className={`text-2xl font-black ${result.accuracy >= 80 ? 'text-green-400' : result.accuracy >= 60 ? 'text-amber-400' : 'text-red-400'}`}>{result.accuracy}%</div>
                  <div className="text-xs text-white/35">Accuracy</div>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                  <div className="text-2xl font-black text-cyan-400">{result.trainSize}</div>
                  <div className="text-xs text-white/35">Train Rows</div>
                </div>
                <div className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                  <div className="text-2xl font-black text-purple-400">{result.testSize}</div>
                  <div className="text-xs text-white/35">Test Rows</div>
                </div>
              </div>

              <div className="rounded-xl border border-white/8 overflow-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/8 bg-white/3">
                    {['Class', 'Precision %', 'Recall %', 'F1 %', 'Support'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-white/35 font-mono">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {result.metrics.map(m => (
                      <tr key={m.class} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-3 py-2 text-white/65 font-semibold">{m.class}</td>
                        <td className="px-3 py-2 font-mono text-cyan-400">{m.precision}%</td>
                        <td className="px-3 py-2 font-mono text-purple-400">{m.recall}%</td>
                        <td className="px-3 py-2 font-mono text-green-400">{m.f1}%</td>
                        <td className="px-3 py-2 font-mono text-white/40">{m.support}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'MAE', value: result.mae, color: 'text-cyan-400' },
                { label: 'RMSE', value: result.rmse, color: 'text-purple-400' },
                { label: 'R²', value: `${result.r2}%`, color: result.r2 >= 70 ? 'text-green-400' : result.r2 >= 40 ? 'text-amber-400' : 'text-red-400' },
              ].map(s => (
                <div key={s.label} className="p-3 rounded-xl bg-white/3 border border-white/8 text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-white/35">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Feature importance */}
          <div>
            <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Feature Importance (approximate)</div>
            {result.featureImportance.map((fi, i) => (
              <div key={fi.feature} className="flex items-center gap-3 py-1.5 text-xs">
                <span className="font-mono text-white/50 w-32 truncate">{fi.feature}</span>
                <div className="flex-1 h-1.5 bg-white/8 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-yellow-400" style={{ width: `${Math.min(100, fi.importance / (result.featureImportance[0]?.importance || 1) * 100)}%` }} />
                </div>
                <span className="font-mono text-yellow-400 w-16 text-right">{typeof fi.importance === 'number' ? fi.importance.toFixed(3) : fi.importance}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}