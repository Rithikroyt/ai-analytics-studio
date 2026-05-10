/**
 * VBMarksCard — Professional Tableau-style Marks Card with full color picker
 */
import { useState } from 'react';
import { ChevronDown, Palette } from 'lucide-react';

const MARK_TYPES = [
  'Automatic', 'Bar', 'Line', 'Area', 'Square', 'Circle',
  'Shape', 'Text', 'Map', 'Pie', 'Gantt Bar', 'Polygon', 'Density',
];

const PALETTES = {
  Neon: ['#00e5ff', '#a855f7', '#ff2d7a', '#4caf50', '#ffcc02', '#ff6b35', '#00bfa5', '#60a5fa'],
  Corporate: ['#2563eb', '#7c3aed', '#db2777', '#059669', '#d97706', '#dc2626', '#0891b2', '#374151'],
  Sunset: ['#f97316', '#ef4444', '#ec4899', '#a855f7', '#8b5cf6', '#6366f1', '#06b6d4', '#10b981'],
  Ocean: ['#0ea5e9', '#0891b2', '#0e7490', '#155e75', '#164e63', '#083344', '#22d3ee', '#67e8f9'],
  Forest: ['#16a34a', '#15803d', '#166534', '#14532d', '#65a30d', '#4d7c0f', '#3f6212', '#a3e635'],
  Fire: ['#ef4444', '#f97316', '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#dc2626', '#b91c1c'],
};

const SHAPES = ['●', '■', '▲', '◆', '★', '✦', '+', '×', '⬟', '⬡'];

const GRADIENT_PRESETS = [
  { label: 'Cyan → Blue', from: '#00e5ff', to: '#2563eb' },
  { label: 'Purple → Pink', from: '#a855f7', to: '#ff2d7a' },
  { label: 'Green → Teal', from: '#4caf50', to: '#00bfa5' },
  { label: 'Orange → Red', from: '#ff6b35', to: '#ef4444' },
  { label: 'Gold → Orange', from: '#ffcc02', to: '#ff6b35' },
];

export default function VBMarksCard({ marks, onChange }) {
  const [paletteName, setPaletteName] = useState('Neon');
  const [showGradients, setShowGradients] = useState(false);
  const set = (key, val) => onChange({ ...marks, [key]: val });
  const currentPalette = PALETTES[paletteName] || PALETTES.Neon;

  return (
    <div className="space-y-4 p-3">
      <div className="text-xs font-black uppercase tracking-widest text-white/40 pb-1 border-b border-white/5">Marks Card</div>

      {/* Mark Type */}
      <div>
        <div className="text-xs text-white/35 mb-1.5 font-semibold">Mark Type</div>
        <div className="relative">
          <select value={marks.markType || 'Automatic'} onChange={e => set('markType', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30 appearance-none cursor-pointer">
            {MARK_TYPES.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Color Palette Selector */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-white/35 font-semibold">Color Theme</div>
          <div className="flex gap-0.5 p-0.5 bg-white/5 rounded-lg">
            {Object.keys(PALETTES).map(p => (
              <button key={p} onClick={() => setPaletteName(p)} title={p}
                className={`px-1.5 py-0.5 rounded text-xs transition-all ${paletteName === p ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}>
                {p[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {currentPalette.map(c => (
            <button key={c} onClick={() => set('color', c)} title={c}
              className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${marks.color === c ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
              style={{ background: c, boxShadow: marks.color === c ? `0 0 8px ${c}80` : undefined }} />
          ))}
          {/* Custom color picker */}
          <label className="w-6 h-6 rounded-full border-2 border-dashed border-white/20 hover:border-white/40 flex items-center justify-center cursor-pointer transition-all overflow-hidden" title="Custom color">
            <Palette className="w-3 h-3 text-white/30" />
            <input type="color" value={marks.color || '#00e5ff'} onChange={e => set('color', e.target.value)} className="opacity-0 absolute w-1 h-1" />
          </label>
        </div>
      </div>

      {/* Gradient toggle */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-xs text-white/35 font-semibold">Gradient Fill</div>
          <button onClick={() => setShowGradients(v => !v)}
            className={`w-8 h-4 rounded-full transition-all relative ${showGradients ? 'bg-cyan-400' : 'bg-white/15'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${showGradients ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
        {showGradients && (
          <div className="space-y-1">
            {GRADIENT_PRESETS.map(g => (
              <button key={g.label} onClick={() => set('gradient', g)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all text-xs ${marks.gradient?.label === g.label ? 'border-white/25 bg-white/8' : 'border-white/5 hover:border-white/12 bg-white/2'}`}>
                <div className="w-16 h-3 rounded-full flex-shrink-0" style={{ background: `linear-gradient(90deg, ${g.from}, ${g.to})` }} />
                <span className="text-white/50">{g.label}</span>
              </button>
            ))}
            <button onClick={() => set('gradient', null)} className="text-xs text-white/25 hover:text-white/50 transition-colors mt-1">✕ Remove gradient</button>
          </div>
        )}
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Size</div>
          <span className="text-xs font-mono text-cyan-400">{marks.size ?? 4}</span>
        </div>
        <input type="range" min={1} max={20} step={1} value={marks.size ?? 4} onChange={e => set('size', Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Opacity</div>
          <span className="text-xs font-mono text-cyan-400">{marks.opacity ?? 85}%</span>
        </div>
        <input type="range" min={10} max={100} step={5} value={marks.opacity ?? 85} onChange={e => set('opacity', Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Stroke Width (for lines) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Stroke Width</div>
          <span className="text-xs font-mono text-cyan-400">{marks.strokeWidth ?? 2}px</span>
        </div>
        <input type="range" min={1} max={8} step={0.5} value={marks.strokeWidth ?? 2} onChange={e => set('strokeWidth', Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Shape */}
      <div>
        <div className="text-xs text-white/35 font-semibold mb-1.5">Shape</div>
        <div className="flex gap-1 flex-wrap">
          {SHAPES.map(s => (
            <button key={s} onClick={() => set('shape', s)}
              className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${marks.shape === s ? 'bg-cyan-400/15 border border-cyan-400/30 text-cyan-400' : 'bg-white/5 text-white/35 hover:text-white/70 border border-white/5'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Border Radius (bars) */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/35 font-semibold">Bar Radius</div>
          <span className="text-xs font-mono text-cyan-400">{marks.borderRadius ?? 4}px</span>
        </div>
        <input type="range" min={0} max={16} step={1} value={marks.borderRadius ?? 4} onChange={e => set('borderRadius', Number(e.target.value))}
          className="w-full accent-cyan-400 cursor-pointer" />
      </div>

      {/* Toggles */}
      <div className="space-y-2.5">
        {[
          { key: 'showLabel', label: 'Show Labels' },
          { key: 'stacked', label: 'Stack Marks' },
          { key: 'showDots', label: 'Show Dots (lines)' },
          { key: 'showGrid', label: 'Show Grid' },
          { key: 'showLegend', label: 'Show Legend' },
          { key: 'showTrendLine', label: '🤖 ML Trend Line' },
          { key: 'showAnomalies', label: '⚡ Anomaly Highlights' },
          { key: 'showReferenceLine', label: '— Reference Line' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between">
            <div className="text-xs text-white/35">{label}</div>
            <button onClick={() => set(key, !marks[key])}
              className={`w-8 h-4 rounded-full transition-all relative ${marks[key] ? 'bg-cyan-400' : 'bg-white/15'}`}>
              <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${marks[key] ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Sort */}
      <div>
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

      {/* Reference line value */}
      {marks.showReferenceLine && (
        <div>
          <div className="text-xs text-white/35 font-semibold mb-1">Reference Value</div>
          <input type="number" value={marks.referenceValue || 0} onChange={e => set('referenceValue', Number(e.target.value))}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30" />
        </div>
      )}
    </div>
  );
}