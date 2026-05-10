/**
 * VBFieldShelves — Tableau-style field mapping shelves
 */
import { X, Plus } from 'lucide-react';

const SHELF_CONFIG = [
  { id: 'x', label: 'Columns / X-axis', types: ['category', 'date', 'numeric'], multi: false },
  { id: 'y', label: 'Rows / Y-axis', types: ['numeric'], multi: false },
  { id: 'color', label: 'Color', types: ['category', 'numeric'], multi: false },
  { id: 'size', label: 'Size', types: ['numeric'], multi: false },
  { id: 'detail', label: 'Detail', types: ['category'], multi: true },
  { id: 'filter', label: 'Filters', types: ['category', 'date', 'numeric'], multi: true },
  { id: 'date', label: 'Date', types: ['date'], multi: false },
  { id: 'group', label: 'Group / Dimension', types: ['category'], multi: false },
];

const AGG_OPTIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN'];

function FieldPill({ field, onRemove, onAggChange }) {
  return (
    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-400/12 border border-cyan-400/20 text-xs text-cyan-400 group">
      {field.agg && (
        <select value={field.agg} onChange={e => onAggChange(field.name, e.target.value)}
          className="bg-transparent text-cyan-400 text-xs focus:outline-none cursor-pointer"
          onClick={e => e.stopPropagation()}>
          {AGG_OPTIONS.map(a => <option key={a} value={a} className="bg-background text-foreground">{a}</option>)}
        </select>
      )}
      <span className="truncate max-w-[80px]">{field.name.replace(/_/g, ' ')}</span>
      <button onClick={() => onRemove(field.name)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function ShelfRow({ shelf, shelves, columns, onAdd, onRemove, onAggChange }) {
  const shelfFields = shelves[shelf.id] || [];
  const compatibleCols = columns.filter(c => shelf.types.includes(c.type));
  const usedNames = shelfFields.map(f => f.name);

  return (
    <div className="space-y-1">
      <div className="text-xs text-white/30 font-medium">{shelf.label}</div>
      <div className={`min-h-[32px] flex flex-wrap gap-1 p-1.5 rounded-xl border transition-all ${shelfFields.length > 0 ? 'border-white/12 bg-white/3' : 'border-dashed border-white/8 bg-transparent'}`}>
        {shelfFields.map(f => (
          <FieldPill key={f.name} field={f}
            onRemove={(name) => onRemove(shelf.id, name)}
            onAggChange={(name, agg) => onAggChange(shelf.id, name, agg)} />
        ))}
        {(shelf.multi || shelfFields.length === 0) && (
          <select onChange={e => { if (e.target.value) onAdd(shelf.id, e.target.value, columns); e.target.value = ''; }}
            className="bg-transparent text-xs text-white/25 focus:outline-none cursor-pointer hover:text-white/50 transition-colors">
            <option value="">+ field</option>
            {compatibleCols.filter(c => !usedNames.includes(c.name)).map(c => (
              <option key={c.name} value={c.name} className="bg-background text-foreground">{c.name.replace(/_/g, ' ')}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

export default function VBFieldShelves({ shelves, columns, onAdd, onRemove, onAggChange, aggregation, onAggFnChange }) {
  return (
    <div className="space-y-3 p-3">
      <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Field Mapping</div>
      {SHELF_CONFIG.map(shelf => (
        <ShelfRow key={shelf.id} shelf={shelf} shelves={shelves} columns={columns}
          onAdd={onAdd} onRemove={onRemove} onAggChange={onAggChange} />
      ))}
      <div>
        <div className="text-xs text-white/30 font-medium mb-1">Default Aggregation</div>
        <div className="flex gap-1 flex-wrap">
          {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX'].map(a => (
            <button key={a} onClick={() => onAggFnChange(a)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${aggregation === a ? 'bg-cyan-400/15 text-cyan-400' : 'bg-white/5 text-white/30 hover:text-white/60'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}