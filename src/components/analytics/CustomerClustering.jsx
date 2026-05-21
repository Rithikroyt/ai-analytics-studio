/**
 * Customer Clustering Module — KMeans-style in browser
 */
import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SEGMENT_LABELS = ['VIP Champions', 'Loyal Mid-Tier', 'Budget Regulars', 'New Low Engagement', 'Dormant Customers', 'High Potential', 'At-Risk High Value'];
const COLORS = ['#00e5ff', '#a855f7', '#4ade80', '#f59e0b', '#f87171', '#60a5fa', '#fb923c'];

function normalize(values) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map(v => (v - min) / range);
}

function kMeans(data, k = 4, iterations = 30) {
  if (!data.length || data[0].length === 0) return [];
  // Initialize centroids as random rows
  let centroids = data.slice(0, k).map(row => [...row]);

  let assignments = new Array(data.length).fill(0);
  for (let iter = 0; iter < iterations; iter++) {
    // Assign to nearest centroid
    assignments = data.map(point => {
      let minDist = Infinity, bestC = 0;
      centroids.forEach((c, i) => {
        const dist = point.reduce((s, v, j) => s + Math.pow(v - c[j], 2), 0);
        if (dist < minDist) { minDist = dist; bestC = i; }
      });
      return bestC;
    });
    // Update centroids
    centroids = centroids.map((_, ci) => {
      const members = data.filter((_, i) => assignments[i] === ci);
      if (!members.length) return centroids[ci];
      return centroids[ci].map((_, j) => members.reduce((s, m) => s + m[j], 0) / members.length);
    });
  }
  return assignments;
}

export default function CustomerClustering({ rows = [], columns = [] }) {
  const colNames = columns.map(c => c.name || c);
  const [features, setFeatures] = useState([]);
  const [kClusters, setKClusters] = useState(4);
  const [result, setResult] = useState(null);
  const [running, setRunning] = useState(false);

  const toggleFeature = (col) => {
    setFeatures(f => f.includes(col) ? f.filter(c => c !== col) : [...f, col]);
  };

  const run = () => {
    if (!features.length || !rows.length) return;
    setRunning(true);
    setTimeout(() => {
      // Build feature matrix
      const matrix = rows.map(row => features.map(f => parseFloat(row[f]) || 0));
      // Normalize each feature
      const normalized = features.map((_, fi) => normalize(matrix.map(r => r[fi])));
      const transposed = matrix.map((_, ri) => features.map((_, fi) => normalized[fi][ri]));

      const assignments = kMeans(transposed, kClusters);

      // Cluster profiles
      const clusters = Array.from({ length: kClusters }, (_, ci) => {
        const members = rows.filter((_, i) => assignments[i] === ci);
        const profile = {};
        features.forEach(f => {
          const vals = members.map(r => parseFloat(r[f]) || 0);
          profile[f] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 100) / 100 : 0;
        });
        return { id: ci, size: members.length, profile, label: SEGMENT_LABELS[ci % SEGMENT_LABELS.length] };
      }).sort((a, b) => b.size - a.size);

      // For scatter: use first 2 features
      const scatterData = rows.slice(0, 200).map((_, i) => ({
        x: parseFloat(rows[i][features[0]]) || 0,
        y: parseFloat(rows[i][features[1] || features[0]]) || 0,
        cluster: assignments[i],
      }));

      setResult({ clusters, assignments, scatterData });
      setRunning(false);
    }, 400);
  };

  // Detect numeric columns
  const numericCols = colNames.filter(name => {
    const vals = rows.slice(0, 20).map(r => parseFloat(r[name])).filter(v => !isNaN(v));
    return vals.length > 10;
  });

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-xl bg-indigo-400/5 border border-indigo-400/15 text-xs text-white/55 leading-relaxed">
        <strong className="text-indigo-400">Customer Clustering</strong> — KMeans-style clustering on selected numeric features. Select 2–5 numeric columns (e.g., recency, frequency, monetary, tenure), choose K clusters, and identify natural customer groups.
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-xs text-white/35 mb-2 block">Select Numeric Features (2–5 columns)</label>
          <div className="flex flex-wrap gap-2">
            {numericCols.slice(0, 15).map(c => (
              <button key={c} onClick={() => toggleFeature(c)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${features.includes(c) ? 'bg-indigo-400/20 border-indigo-400/30 text-indigo-400' : 'bg-white/5 border-white/10 text-white/40 hover:text-white/65'}`}>
                {c}
              </button>
            ))}
          </div>
          {numericCols.length === 0 && <div className="text-xs text-amber-400">No numeric columns detected. Load a dataset with numeric fields.</div>}
        </div>
        <div>
          <label className="text-xs text-white/35 mb-1 block">Number of Clusters (K)</label>
          <div className="flex gap-2">
            {[2, 3, 4, 5, 6].map(k => (
              <button key={k} onClick={() => setKClusters(k)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${kClusters === k ? 'bg-indigo-400/20 border-indigo-400/30 text-indigo-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                {k}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button onClick={run} disabled={running || features.length < 2 || !rows.length}
        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-400/15 border border-indigo-400/25 text-indigo-400 rounded-xl text-sm font-bold disabled:opacity-40 hover:bg-indigo-400/20 transition-all">
        {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
        {running ? 'Clustering…' : 'Run Customer Clustering'}
      </button>

      {result && (
        <div className="space-y-5">
          {/* Scatter */}
          {features.length >= 2 && (
            <div className="rounded-2xl border border-white/8 bg-white/2 p-4" style={{ height: 250 }}>
              <div className="text-xs text-white/40 font-semibold mb-2">{features[0]} vs {features[1]} — Cluster Map</div>
              <ResponsiveContainer width="100%" height="85%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="x" name={features[0]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                  <YAxis dataKey="y" name={features[1]} tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} />
                  <Tooltip contentStyle={{ background: 'hsl(222,44%,9%)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
                  <Scatter data={result.scatterData}>
                    {result.scatterData.map((d, i) => <Cell key={i} fill={COLORS[d.cluster % COLORS.length]} opacity={0.7} />)}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Cluster profiles */}
          <div className="grid grid-cols-2 gap-3">
            {result.clusters.map(cluster => (
              <div key={cluster.id} className="p-4 rounded-2xl border border-white/8 bg-white/2">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: COLORS[cluster.id % COLORS.length] }} />
                  <span className="font-bold text-sm text-white/80">{cluster.label}</span>
                  <span className="text-xs text-white/35 ml-auto">{cluster.size} customers</span>
                </div>
                <div className="space-y-1">
                  {Object.entries(cluster.profile).map(([feat, avg]) => (
                    <div key={feat} className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-white/40 w-24 truncate">{feat}</span>
                      <span className="font-mono text-white/70 ml-auto">{avg.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-indigo-400/5 border border-indigo-400/15 text-xs text-white/45">
            <strong className="text-indigo-400">Recommendation:</strong> Treat each cluster as a distinct persona. Design separate marketing strategies, product bundles, and retention programs per segment. Validate clusters with domain experts before action.
            <br /><strong className="text-white/45 mt-1 block">⚠ Experimental:</strong> In-browser KMeans is approximate. For production, use scikit-learn with proper elbow method and silhouette scoring.
          </div>
        </div>
      )}
    </div>
  );
}