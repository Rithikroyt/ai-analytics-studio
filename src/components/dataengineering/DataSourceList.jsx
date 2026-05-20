import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Database, RefreshCw, Loader2, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react';

function scoreColor(s) { return s >= 80 ? 'text-green-400' : s >= 60 ? 'text-amber-400' : 'text-red-400'; }

export default function DataSourceList({ onSelect }) {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setSources(await base44.entities.DataSource.list('-created_date', 30)); } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id) => {
    await base44.entities.DataSource.delete(id);
    setSources(s => s.filter(x => x.id !== id));
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 text-cyan-400 animate-spin" /></div>;
  if (!sources.length) return (
    <div className="text-center py-20 text-sm text-white/30">No datasets uploaded yet. Use the Upload tab to add your first dataset.</div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white/70">{sources.length} Datasets</h3>
        <button onClick={load} className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/30 hover:text-white/60 transition-all">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid gap-3">
        {sources.map(ds => (
          <div key={ds.id} onClick={() => onSelect?.(ds)}
            className="p-4 rounded-2xl border border-white/8 bg-white/2 hover:border-white/15 hover:bg-white/3 cursor-pointer transition-all flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-cyan-400/15 border border-cyan-400/20 flex items-center justify-center flex-shrink-0">
              <Database className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm text-white/80 truncate">{ds.name}</div>
              <div className="text-xs text-white/35 mt-0.5">
                {ds.fileName} · {ds.rowCount?.toLocaleString() || '?'} rows · {ds.columnCount} cols · {ds.fileType?.toUpperCase()}
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              {ds.qualityScore > 0 && (
                <div className="text-center">
                  <div className={`text-lg font-black ${scoreColor(ds.qualityScore)}`}>{ds.qualityScore}%</div>
                  <div className="text-xs text-white/25">quality</div>
                </div>
              )}
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${
                ds.status === 'ready' ? 'bg-green-400/10 border-green-400/20 text-green-400' :
                ds.status === 'processing' ? 'bg-amber-400/10 border-amber-400/20 text-amber-400' :
                'bg-red-400/10 border-red-400/20 text-red-400'}`}>{ds.status}</span>
              <button onClick={e => { e.stopPropagation(); remove(ds.id); }}
                className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}