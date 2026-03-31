import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Layers, Hash, Tag, Calendar, Key, TrendingUp, Database, GitBranch } from 'lucide-react';

export default function SemanticSection() {
  const { semanticModel, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  if (!semanticModel || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Layers className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm mb-4">Upload data to generate the semantic model.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold mb-2">Semantic Model</h1>
        <p className="text-muted-foreground text-sm">Auto-generated dimensions, measures, and KPI definitions for <strong>{table.name}</strong>.</p>
      </motion.div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Table', value: semanticModel.tableName, icon: Database, color: 'text-cyan-400' },
          { label: 'Primary Key', value: semanticModel.primaryKey || 'None detected', icon: Key, color: 'text-amber-400' },
          { label: 'Date Field', value: semanticModel.dateField || 'None detected', icon: Calendar, color: 'text-teal-400' },
          { label: 'Date Grain', value: semanticModel.dateGrain || 'N/A', icon: Calendar, color: 'text-blue-400' },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <item.icon className={`w-3.5 h-3.5 ${item.color}`} />
              <span className="text-xs text-muted-foreground">{item.label}</span>
            </div>
            <div className="font-mono text-sm truncate">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Measures */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-cyan-400" /> Measures ({semanticModel.measures?.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {semanticModel.measures?.map((m) => (
            <div key={m.name} className="glass-card rounded-xl p-4 border border-cyan-400/10">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold text-sm">{m.label}</div>
                  <div className="font-mono text-xs text-muted-foreground mt-0.5">{m.name}</div>
                </div>
                <div className="flex gap-1.5">
                  <span className="px-2 py-0.5 bg-blue-400/10 text-blue-400 text-xs rounded">{m.type}</span>
                  <span className="px-2 py-0.5 bg-teal-400/10 text-teal-400 text-xs rounded">{m.format}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dimensions */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
          <Tag className="w-4 h-4 text-purple-400" /> Dimensions ({semanticModel.dimensions?.length})
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {semanticModel.dimensions?.map((d) => (
            <div key={d.name} className="glass-card rounded-xl p-4 border border-purple-400/10">
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="font-mono text-xs text-muted-foreground mt-0.5">{d.name}</div>
              <div className="text-xs text-muted-foreground mt-2">{d.cardinality} unique values</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quality */}
      <div className="glass-card rounded-2xl p-6 border border-green-400/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold mb-1">Model Quality</h3>
            <p className="text-sm text-muted-foreground">Confidence score for this semantic model</p>
          </div>
          <div className="text-3xl font-black text-green-400">{semanticModel.qualityScore}%</div>
        </div>
        <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-400 to-teal-400 rounded-full" style={{ width: `${semanticModel.qualityScore}%` }} />
        </div>
      </div>
    </div>
  );
}