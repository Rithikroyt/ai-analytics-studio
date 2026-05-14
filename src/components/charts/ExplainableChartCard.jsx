/**
 * ExplainableChartCard — A chart wrapper with Explain, Business Meaning, View SQL, and Save buttons
 */
import { useState } from 'react';
import { Brain, Lightbulb, Code2, BookmarkPlus, ChevronDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import VBChartPreview from '@/components/visualbuilder/VBChartPreview.jsx';
import ChartExplainPanel from './ChartExplainPanel.jsx';

export default function ExplainableChartCard({
  title, chartType, data, shelves, marks, tableName, xLabel, yLabel,
  metricDefinition, onSave, insight, className = '',
}) {
  const [showExplain, setShowExplain] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (onSave) { onSave(); setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const xKey = shelves?.x?.[0]?.name || 'name';
  const yKey = shelves?.y?.[0]?.name || 'value';

  return (
    <div className={`glass-card rounded-2xl border border-white/8 overflow-hidden relative ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/6">
        <h3 className="text-sm font-semibold text-white/80 truncate">{title || 'Chart'}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Explain */}
          <button onClick={() => setShowExplain(v => !v)}
            title="Explain this chart"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${showExplain ? 'bg-purple-400/15 border-purple-400/25 text-purple-400' : 'border-white/8 text-white/30 hover:text-purple-400 hover:border-purple-400/20 hover:bg-purple-400/8'}`}>
            <Brain className="w-3 h-3" /> Explain
          </button>

          {/* Save */}
          {onSave && (
            <button onClick={handleSave}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs border transition-all ${saved ? 'bg-green-400/15 border-green-400/25 text-green-400' : 'border-white/8 text-white/30 hover:text-cyan-400 hover:border-cyan-400/20'}`}>
              <BookmarkPlus className="w-3 h-3" />{saved ? 'Saved' : 'Save'}
            </button>
          )}
        </div>
      </div>

      {/* AI insight strip */}
      {insight && (
        <div className="flex items-start gap-2 px-3 py-2 bg-purple-400/5 border-b border-white/4">
          <Lightbulb className="w-3 h-3 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-white/50 leading-relaxed">{insight}</p>
        </div>
      )}

      {/* Chart */}
      <div className="p-3 relative">
        <VBChartPreview chartType={chartType} data={data} marks={marks} shelves={shelves} />

        {/* Explain panel overlay */}
        <AnimatePresence>
          {showExplain && (
            <ChartExplainPanel
              title={title} type={chartType} data={data}
              xKey={xKey} yKey={yKey} xLabel={xLabel} yLabel={yLabel}
              tableName={tableName} metricDefinition={metricDefinition}
              onClose={() => setShowExplain(false)}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}