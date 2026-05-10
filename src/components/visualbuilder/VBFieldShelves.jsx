/**
 * VBFieldShelves — Professional Tableau-style field mapping shelves with drag-friendly UX
 */
import { useState } from 'react';
import { X, Database, Hash, Calendar, Tag, Filter, ChevronDown } from 'lucide-react';

const TYPE_ICONS = { numeric: Hash, date: Calendar, category: Tag, text: Tag, id: Hash };
const TYPE_COLORS = { numeric: 'text-cyan-400', date: 'text-green-400', category: 'text-amber-400', text: 'text-purple-400', id: 'text-white/30' };

const SHELF_CONFIG = [
  { id: 'x', label: 'Columns / X-axis', hint: 'Dimension, date, or category', types: ['category', 'date', 'numeric', 'text', 'id'], multi: false, icon: '⇆' },
  { id: 'y', label: 'Rows / Y-axis', hint: 'Numeric measure (supports multiple)', types: ['numeric'], multi: true, icon: '↕' },
  { id: 'color', label: 'Color', hint: 'Encode color by category or value', types: ['category', 'numeric'], multi: false, icon: '◉' },
  { id: 'size', label: 'Size', hint: 'Encode size by numeric measure', types: ['numeric'], multi: false, icon: '●' },
  { id: 'detail', label: 'Detail', hint: 'Add granularity without aggregation', types: ['category', 'text'], multi: true, icon: '≡' },
  { id: 'filter', label: 'Filters', hint: 'Filter the data view', types: ['category', 'date', 'numeric', 'text'], multi: true, icon: '⊘' },
  { id: 'group', label: 'Group / Dimension', hint: 'Secondary grouping', types: ['category', 'text'], multi: false, icon: '⊞' },
];

const AGG_OPTIONS = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN', 'COUNT_DISTINCT'];

function TypeIcon({ type }) {
  const Icon = TYPE_ICONS[type] || Database;
  const cls = TYPE_COLORS[type] || 'text-white/30';
  return <Icon className={`w-3 h-3 flex-shrink-0 ${cls}`} />;
}

function FieldPill({ field, shelfId, onRemove, onAggChange, isNumeric }) {
  const [showAgg, setShowAgg] = useState(false);
  return (
    <div className="group flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/18 text-xs text-cyan-400 hover:bg-cyan-400/15 transition-all max-w-full">
      <TypeIcon type={field.type} />
      {isNumeric && (
        <select value={field.agg || 'SUM'} onChange={e => onAggChange(field.name, e.target.value)}
          className="bg-transparent text-cyan-400/80 text-xs focus:outline-none cursor-pointer hover:text-cyan-400 transition-colors"
          onClick={e => e.stopPropagation()}>
          {AGG_OPTIONS.map(a => <option key={a} value={a} className="bg-background text-foreground">{a}</option>)}
        </select>
      )}
      <span className="truncate max-w-[70px] font-medium">{field.name.replace(/_/g, ' ')}</span>
      <button onClick={() => onRemove(field.name)} className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:text-red-400">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function ShelfRow({ shelf, shelves, columns, onAdd, onRemove, onAggChange }) {
  const shelfFields = shelves[shelf.id] || [];
  const compatibleCols = columns.filter(c => shelf.types.includes(c.type) || shelf.types.includes('text'));
  const usedNames = shelfFields.map(f => f.name);
  const canAdd = shelf.multi || shelfFields.length === 0;
  const isEmpty = shelfFields.length === 0;

  return (
    <div className="group">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-white/20 text-xs">{shelf.icon}</span>
        <div className="text-xs text-white/40 font-semibold">{shelf.label}</div>
      </div>
      <div className={`min-h-[30px] flex flex-wrap gap-1 p-1.5 rounded-xl border transition-all ${isEmpty ? 'border-dashed border-white/8 bg-transparent hover:border-white/15 hover:bg-white/2' : 'border-white/10 bg-white/3'}`}>
        {shelfFields.map(f => (
          <FieldPill key={f.name} field={f} shelfId={shelf.id}
            isNumeric={['numeric'].includes(f.type) || f.agg}
            onRemove={(name) => onRemove(shelf.id, name)}
            onAggChange={(name, agg) => onAggChange(shelf.id, name, agg)} />
        ))}
        {canAdd && (
          <select onChange={e => { if (e.target.value) onAdd(shelf.id, e.target.value, columns); e.target.value = ''; }}
            className="bg-transparent text-xs text-white/25 focus:outline-none cursor-pointer hover:text-white/55 transition-colors max-w-full">
            <option value="">{isEmpty ? `+ Add ${shelf.label}` : '+ field'}</option>
            <optgroup label="Compatible columns">
              {compatibleCols.filter(c => !usedNames.includes(c.name)).map(c => (
                <option key={c.name} value={c.name} className="bg-background text-foreground">
                  {c.name.replace(/_/g, ' ')} [{c.type}]
                </option>
              ))}
            </optgroup>
            {columns.filter(c => !shelf.types.includes(c.type) && !usedNames.includes(c.name)).length > 0 && (
              <optgroup label="All columns">
                {columns.filter(c => !shelf.types.includes(c.type) && !usedNames.includes(c.name)).map(c => (
                  <option key={c.name} value={c.name} className="bg-background text-white/50">
                    {c.name.replace(/_/g, ' ')} [{c.type}]
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        )}
      </div>
      {isEmpty && <div className="text-xs text-white/18 mt-0.5 px-0.5 italic">{shelf.hint}</div>}
    </div>
  );
}

export default function VBFieldShelves({ shelves, columns, onAdd, onRemove, onAggChange, aggregation, onAggFnChange }) {
  const [showAll, setShowAll] = useState(false);
  const visibleShelves = showAll ? SHELF_CONFIG : SHELF_CONFIG.slice(0, 5);

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-white/40">Field Mapping</div>
        <div className="text-xs text-white/20">{columns.length} cols</div>
      </div>

      {/* Column browser */}
      {columns.length > 0 && (
        <div className="bg-white/2 border border-white/6 rounded-xl p-2 max-h-24 overflow-y-auto">
          <div className="text-xs text-white/25 mb-1.5">Dataset columns</div>
          <div className="flex flex-wrap gap-1">
            {columns.map(c => (
              <div key={c.name} title={`${c.name} — ${c.type}`}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-white/3 border border-white/6 text-xs text-white/40 hover:text-white/70 cursor-default transition-colors">
                <TypeIcon type={c.type} />
                <span className="truncate max-w-[60px]">{c.name.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {visibleShelves.map(shelf => (
        <ShelfRow key={shelf.id} shelf={shelf} shelves={shelves} columns={columns}
          onAdd={onAdd} onRemove={onRemove} onAggChange={onAggChange} />
      ))}

      {!showAll && (
        <button onClick={() => setShowAll(true)} className="w-full text-xs text-white/25 hover:text-white/55 transition-colors py-1 flex items-center justify-center gap-1">
          <ChevronDown className="w-3 h-3" /> Show more shelves ({SHELF_CONFIG.length - 5})
        </button>
      )}

      <div className="border-t border-white/5 pt-3">
        <div className="text-xs text-white/30 font-semibold mb-2">Default Aggregation</div>
        <div className="grid grid-cols-3 gap-1">
          {['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'MEDIAN'].map(a => (
            <button key={a} onClick={() => onAggFnChange(a)}
              className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${aggregation === a ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/25' : 'bg-white/5 text-white/30 hover:text-white/60 hover:bg-white/8'}`}>
              {a}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}