/**
 * VBMarksCard — Clean, focused marks controls
 */
import { useState } from 'react';
import { Palette } from 'lucide-react';

const PALETTES = {
  Neon: ['#00e5ff', '#a855f7', '#ff2d7a', '#4caf50', '#ffcc02', '#ff6b35', '#00bfa5', '#60a5fa'],
  Corporate: ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#64748b'],
  Sunset: ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#06b6d4', '#10b981', '#fbbf24'],
};

export default function VBMarksCard({ marks, onChange }) {
  const [palette, setPalette] = useState('Neon');
  const set = (key, val) => onChange({ ...marks, [key]: val });
  const colors = PALETTES[palette];

  return (
    <div className="space-y-4 p-3">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 pb-1 border-b border-white/5">Marks</div>

      {/* Color */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-white/35 font-semibold">Color</div>
          <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg">
            {Object.keys(PALETTES).map(p => (
              <button key={p} onClick={() => setPalette(p)}
                className={`px-1.5 py-0.5 rounded text-xs transition-all ${palette === p ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
                {p[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {colors.map(c => (
            <button key={c} onClick={() => set('color', c)}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${marks.color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c, boxShadow: marks.color === c ? `0 0 8px ${c}80` : undefined }} />
          ))}
          <label className="w-6 h-6 rounded-full border-2 border-dashed border-white/20 hover:border-white/50 flex items-center justify-center cursor-pointer overflow-hidden" title="Custom">
            <Palette className="w-3 h-3 text-white/30" />
            <input type="color" value={marks.color || '#00e5ff'} onChange={e => set('color', e.target.value)} className="opacity-0 absolute w-1 h-1" />
          </label>
        </div>
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Opacity</div>
          <span className="text-xs font-mono text-cyan-400">{marks.opacity ?? 85}%</span>
        </div>
        <input type="range" min={10} max={100} step={5} value={marks.opacity ?? 85}
          onChange={e => set('opacity', Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Stroke Width */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Line Width</div>
          <span className="text-xs font-mono text-cyan-400">{marks.strokeWidth ?? 2}px</span>
        </div>
        <input type="range" min={1} max={8} step={0.5} value={marks.strokeWidth ?? 2}
          onChange={e => set('strokeWidth', Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Bar Radius */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Bar Radius</div>
          <span className="text-xs font-mono text-cyan-400">{marks.borderRadius ?? 4}px</span>
        </div>
        <input type="range" min={0} max={16} step={1} value={marks.borderRadius ?? 4}
          onChange={e => set('borderRadius', Number(e.target.value))} className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Toggles */}
      <div className="space-y-2.5 border-t border-white/5 pt-3">
        {[
          { key: 'showLabel', label: 'Show Labels' },
          { key: 'showDots', label: 'Show Dots (lines)' },
          { key: 'showGrid', label: 'Show Grid' },
          { key: 'showLegend', label: 'Show Legend' },
          { key: 'showTrendLine', label: '📈 ML Trend Line' },
          { key: 'showAnomalies', label: '⚡ Anomaly Highlights' },
          { key: 'showReferenceLine', label: '— Reference Line' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="text-xs text-white/40">{label}</div>
            <button onClick={() => set(key, !marks[key])}
              className={`w-8 h-4 rounded-full transition-all relative ${marks[key] ? 'bg-cyan-400' : 'bg-white/15'}`}>
              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${marks[key] ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {marks.showReferenceLine && (
        <div>
          <div className="text-xs text-white/35 font-semibold mb-1">Reference Value</div>
          <input type="number" value={marks.referenceValue || 0}
            onChange={e => set('referenceValue', Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30" />
        </div>
      )}

      {/* Sort */}
      <div className="border-t border-white/5 pt-3">
        <div className="text-xs text-white/35 font-semibold mb-1.5">Sort Order</div>
        <div className="flex gap-1">
          {['None', 'Asc', 'Desc', 'Alpha'].map(s => (
            <button key={s} onClick={() => set('sort', s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${(marks.sort || 'Desc') === s ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/25' : 'bg-white/5 text-white/30 hover:text-white/60'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}