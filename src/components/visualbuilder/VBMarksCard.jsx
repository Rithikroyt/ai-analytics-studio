/**
 * VBMarksCard — Tableau-style Marks Card
 */
import { ChevronDown } from 'lucide-react';

const MARK_TYPES = [
  'Automatic', 'Bar', 'Line', 'Area', 'Square', 'Circle',
  'Shape', 'Text', 'Map', 'Pie', 'Gantt Bar', 'Polygon', 'Density',
];

const PALETTE = ['#00e5ff', '#a855f7', '#ff6b35', '#4caf50', '#ff2d7a', '#ffcc02', '#00bfa5', '#e91e63', '#60a5fa', '#fb923c'];

const SHAPES = ['●', '■', '▲', '◆', '★', '✦', '+', '×'];

export default function VBMarksCard({ marks, onChange }) {
  const set = (key, val) => onChange({ ...marks, [key]: val });

  return (
    <div className="space-y-3 p-3">
      <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Marks</div>

      {/* Mark Type */}
      <div>
        <div className="text-xs text-white/30 mb-1">Mark Type</div>
        <div className="relative">
          <select value={marks.markType || 'Automatic'} onChange={e => set('markType', e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30 appearance-none cursor-pointer">
            {MARK_TYPES.map(m => <option key={m} value={m} className="bg-background">{m}</option>)}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30 pointer-events-none" />
        </div>
      </div>

      {/* Color */}
      <div>
        <div className="text-xs text-white/30 mb-1.5">Color</div>
        <div className="flex gap-1.5 flex-wrap">
          {PALETTE.map(c => (
            <button key={c} onClick={() => set('color', c)}
              className={`w-5 h-5 rounded-full border-2 transition-all ${marks.color === c ? 'border-white scale-110' : 'border-transparent'}`}
              style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* Size */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/30">Size</div>
          <span className="text-xs text-white/50 font-mono">{marks.size ?? 4}</span>
        </div>
        <input type="range" min={1} max={12} step={1} value={marks.size ?? 4} onChange={e => set('size', Number(e.target.value))}
          className="w-full accent-cyan-400" />
      </div>

      {/* Opacity */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <div className="text-xs text-white/30">Opacity</div>
          <span className="text-xs text-white/50 font-mono">{marks.opacity ?? 85}%</span>
        </div>
        <input type="range" min={10} max={100} step={5} value={marks.opacity ?? 85} onChange={e => set('opacity', Number(e.target.value))}
          className="w-full accent-cyan-400" />
      </div>

      {/* Shape */}
      <div>
        <div className="text-xs text-white/30 mb-1.5">Shape</div>
        <div className="flex gap-1.5 flex-wrap">
          {SHAPES.map(s => (
            <button key={s} onClick={() => set('shape', s)}
              className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all ${marks.shape === s ? 'bg-cyan-400/15 border border-cyan-400/30 text-cyan-400' : 'bg-white/5 text-white/30 hover:text-white/70 border border-white/5'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/30">Show Labels</div>
          <button onClick={() => set('showLabel', !marks.showLabel)}
            className={`w-8 h-4 rounded-full transition-all relative ${marks.showLabel ? 'bg-cyan-400' : 'bg-white/15'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${marks.showLabel ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Stack */}
      <div>
        <div className="flex items-center justify-between">
          <div className="text-xs text-white/30">Stack Marks</div>
          <button onClick={() => set('stacked', !marks.stacked)}
            className={`w-8 h-4 rounded-full transition-all relative ${marks.stacked ? 'bg-cyan-400' : 'bg-white/15'}`}>
            <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${marks.stacked ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      </div>

      {/* Sort */}
      <div>
        <div className="text-xs text-white/30 mb-1">Sort</div>
        <div className="flex gap-1">
          {['None', 'Asc', 'Desc'].map(s => (
            <button key={s} onClick={() => set('sort', s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${(marks.sort || 'Desc') === s ? 'bg-cyan-400/15 text-cyan-400' : 'bg-white/5 text-white/30 hover:text-white/60'}`}>
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}