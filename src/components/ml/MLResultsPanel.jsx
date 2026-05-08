import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Shield, TrendingUp, AlertTriangle, Brain } from 'lucide-react';

const PALETTE = ['#00e5ff', '#ff2d7a', '#7b2fff', '#ff6b35', '#4caf50', '#ffcc02', '#00bfa5', '#e91e63'];

export default function MLResultsPanel({ model }) {
  if (!model) return null;

  const featureData = (model.featureImportance || [])
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 8)
    .map((f, i) => ({ name: f.feature, value: Math.round(f.importance * 100), direction: f.direction, color: PALETTE[i % PALETTE.length] }));

  const predictions = model.predictions || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-purple-400/15 border border-purple-400/25 flex items-center justify-center">
          <Brain className="w-6 h-6 text-purple-400" />
        </div>
        <div>
          <h2 className="text-lg font-black">{model.name}</h2>
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="px-2 py-0.5 rounded-full bg-purple-400/10 border border-purple-400/20 text-purple-300 font-medium">{model.modelType}</span>
            <span>{model.algorithm}</span>
            <span>· Trained {new Date(model.trainedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Accuracy', value: model.accuracy ? `${Math.round(model.accuracy)}%` : '—', color: 'text-green-400', icon: CheckCircle2 },
          { label: 'F1 Score', value: model.f1Score?.toFixed(3) || '—', color: 'text-cyan-400', icon: Shield },
          { label: 'RMSE', value: model.rmse?.toFixed(2) || '—', color: 'text-blue-400', icon: TrendingUp },
          { label: 'Overfit Risk', value: model.overfitRisk || '—', color: model.overfitRisk === 'low' ? 'text-green-400' : model.overfitRisk === 'medium' ? 'text-amber-400' : 'text-red-400', icon: AlertTriangle },
        ].map(m => (
          <div key={m.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
            <m.icon className={`w-4 h-4 ${m.color} mx-auto mb-2`} />
            <div className={`text-xl font-black font-mono ${m.color}`}>{m.value}</div>
            <div className="text-xs text-white/40 mt-0.5">{m.label}</div>
          </div>
        ))}
      </div>

      {/* Feature Importance */}
      {featureData.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/8">
          <h3 className="text-sm font-bold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-purple-400" /> Feature Importance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={featureData} layout="vertical" margin={{ left: 0, right: 30 }}>
              <XAxis type="number" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} tickLine={false} axisLine={false} domain={[0, 100]} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.5)' }} tickLine={false} axisLine={false} width={100} />
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <Tooltip contentStyle={{ background: 'rgba(8,6,18,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }} formatter={v => [`${v}%`, 'Importance']} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {featureData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Key Findings */}
      {model.keyFindings?.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-white/8">
          <h3 className="text-sm font-bold mb-3">Key Findings</h3>
          <div className="space-y-2">
            {model.keyFindings.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-white/65">
                <div className="w-4 h-4 rounded-full bg-purple-400/15 flex items-center justify-center text-purple-400 font-bold flex-shrink-0 mt-0.5">{i + 1}</div>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deployment Recommendation */}
      {model.deploymentRecommendation && (
        <div className="p-4 rounded-2xl bg-green-400/5 border border-green-400/15">
          <div className="text-xs font-bold text-green-400 mb-1 flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Deployment Recommendation</div>
          <p className="text-xs text-white/65 leading-relaxed">{model.deploymentRecommendation}</p>
        </div>
      )}

      {/* Sample Predictions */}
      {predictions.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-5 py-3 border-b border-white/8">
            <h3 className="text-sm font-bold">Sample Predictions ({predictions.length} rows)</h3>
          </div>
          <div className="overflow-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-white/3 border-b border-white/5">
                  {['Row', 'Actual', 'Predicted', 'Confidence'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-white/40 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.slice(0, 10).map((p, i) => (
                  <tr key={i} className="border-b border-white/5 hover:bg-white/2">
                    <td className="px-4 py-2 text-white/30 font-mono">{p.rowIndex}</td>
                    <td className="px-4 py-2 text-white/60">{String(p.actual ?? '—')}</td>
                    <td className="px-4 py-2 text-cyan-400 font-semibold">{String(p.predicted)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1 bg-white/10 rounded-full"><div className="h-full bg-green-400 rounded-full" style={{ width: `${(p.confidence || 0) * 100}%` }} /></div>
                        <span className="text-white/40 font-mono">{((p.confidence || 0) * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}