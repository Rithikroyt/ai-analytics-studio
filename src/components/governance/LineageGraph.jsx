import { useState } from 'react';
import { GitBranch, Database, BarChart2, FileText, Zap, ArrowRight } from 'lucide-react';

const NODE_STYLES = {
  table: { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25' },
  column: { icon: BarChart2, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/25' },
  kpi: { icon: Zap, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25' },
  report: { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25' },
  transformation: { icon: GitBranch, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/25' },
};

export default function LineageGraph({ nodes, edges, criticalPath, impactMap }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');

  const types = ['all', 'table', 'column', 'kpi', 'report', 'transformation'];
  const filteredNodes = filter === 'all' ? nodes : nodes.filter(n => n.type === filter);

  const selectedImpact = selected ? (impactMap[selected.label] || impactMap[selected.id] || []) : [];

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex gap-1.5 flex-wrap">
        {types.map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-medium ${filter === t ? 'bg-white/10 border-white/20 text-white' : 'border-white/8 text-white/40 hover:text-white/60'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Node Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {filteredNodes.map((node) => {
          const style = NODE_STYLES[node.type] || NODE_STYLES.table;
          const Icon = style.icon;
          const isCritical = criticalPath?.includes(node.id);
          const isSelected = selected?.id === node.id;
          return (
            <button key={node.id} onClick={() => setSelected(isSelected ? null : node)}
              className={`text-left p-3 rounded-xl border transition-all ${isSelected ? `${style.bg} ${style.border}` : isCritical ? 'bg-amber-400/5 border-amber-400/20 hover:border-amber-400/30' : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
              <div className="flex items-center gap-2 mb-1.5">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${style.bg} border ${style.border}`}>
                  <Icon className={`w-3 h-3 ${style.color}`} />
                </div>
                <span className="text-xs font-semibold truncate">{node.label}</span>
                {isCritical && <span className="text-xs text-amber-400 ml-auto">⚠ critical</span>}
              </div>
              <div className={`text-xs font-medium ${style.color}`}>{node.type}</div>
              {node.table && node.type !== 'table' && <div className="text-xs text-white/30 mt-0.5">in {node.table}</div>}
            </button>
          );
        })}
      </div>

      {/* Selected node impact */}
      {selected && (
        <div className="p-4 rounded-2xl bg-white/3 border border-white/10">
          <h4 className="text-sm font-bold mb-2 flex items-center gap-2"><ArrowRight className="w-4 h-4 text-cyan-400" /> Impact of "{selected.label}"</h4>
          {selectedImpact.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedImpact.map((item, i) => <span key={i} className="text-xs px-2 py-1 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-lg">{item}</span>)}
            </div>
          ) : (
            <p className="text-xs text-white/40">No downstream impacts tracked for this node.</p>
          )}
        </div>
      )}

      {/* Edges summary */}
      {edges.length > 0 && (
        <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5 text-xs font-semibold text-white/50">Data Flow Connections ({edges.length})</div>
          <div className="divide-y divide-white/5 max-h-48 overflow-y-auto">
            {edges.slice(0, 20).map((edge, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 text-xs text-white/50 hover:bg-white/2">
                <span className="text-white/70">{edge.from}</span>
                <ArrowRight className="w-3 h-3 text-white/20 flex-shrink-0" />
                <span className="text-cyan-400">{edge.to}</span>
                {edge.label && <span className="ml-auto text-white/25 bg-white/5 px-1.5 py-0.5 rounded-full">{edge.label}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}