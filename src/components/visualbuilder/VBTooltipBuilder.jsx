/**
 * VBTooltipBuilder — Customizable tooltip designer with token system
 */
import { useState } from 'react';
import { Plus, X, Eye, ChevronDown } from 'lucide-react';

const FORMATS = ['text', 'currency', 'percent', 'decimal', 'date', 'number'];
const AGG_OPTIONS = ['ATTR', 'SUM', 'AVG', 'COUNT', 'MIN', 'MAX'];

const QUICK_TOKENS = [
  { token: 'percent_of_total', label: '% of Total', format: 'percent' },
  { token: 'anomaly_flag', label: 'Anomaly Flag', format: 'text' },
  { token: 'forecast_value', label: 'Forecast Value', format: 'number' },
  { token: 'ai_summary', label: 'AI Insight', format: 'text' },
  { token: 'trend_direction', label: 'Trend Direction', format: 'text' },
];

function renderPreview(template, fields) {
  let out = template || '';
  fields.forEach(f => {
    const token = `{{${f.token || f.field}}}`;
    const sampleValues = {
      currency: '$12,450',
      percent: '34.2%',
      decimal: '12.45',
      date: '2026-05',
      number: '1,234',
      text: f.label || f.field,
    };
    out = out.replaceAll(token, `<span style="color:#00e5ff">${sampleValues[f.format] || f.label || f.field}</span>`);
  });
  // replace remaining tokens
  out = out.replace(/\{\{([^}]+)\}\}/g, (_, tok) => `<span style="color:#ffcc02">{{${tok}}}</span>`);
  return out.replace(/\n/g, '<br/>');
}

export default function VBTooltipBuilder({ tooltip, columns, onChange }) {
  const [showPreview, setShowPreview] = useState(false);

  const set = (key, val) => onChange({ ...tooltip, [key]: val });
  const addField = (colName) => {
    if (!colName) return;
    const col = columns.find(c => c.name === colName);
    const isNumeric = col?.type === 'numeric';
    const newField = { field: colName, token: colName, label: colName.replace(/_/g, ' '), agg: isNumeric ? 'SUM' : 'ATTR', format: isNumeric ? 'number' : 'text' };
    set('fields', [...(tooltip.fields || []), newField]);
    // append token to template
    const tpl = (tooltip.template || '') + (tooltip.template ? '\n' : '') + `${newField.label}: {{${colName}}}`;
    set('template', tpl);
  };
  const addQuickToken = (qt) => {
    const exists = (tooltip.fields || []).find(f => f.token === qt.token);
    if (!exists) {
      set('fields', [...(tooltip.fields || []), { field: qt.token, token: qt.token, label: qt.label, agg: 'ATTR', format: qt.format }]);
    }
    const tpl = (tooltip.template || '') + (tooltip.template ? '\n' : '') + `${qt.label}: {{${qt.token}}}`;
    set('template', tpl);
  };
  const removeField = (token) => {
    set('fields', (tooltip.fields || []).filter(f => f.token !== token));
  };
  const updateField = (token, key, val) => {
    set('fields', (tooltip.fields || []).map(f => f.token === token ? { ...f, [key]: val } : f));
  };

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/30 uppercase tracking-widest font-semibold">Tooltip Builder</div>
        <button onClick={() => set('enabled', !tooltip.enabled)}
          className={`w-8 h-4 rounded-full transition-all relative ${tooltip.enabled !== false ? 'bg-cyan-400' : 'bg-white/15'}`}>
          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${tooltip.enabled !== false ? 'right-0.5' : 'left-0.5'}`} />
        </button>
      </div>

      {/* Template editor */}
      <div>
        <div className="text-xs text-white/30 mb-1">Template</div>
        <textarea value={tooltip.template || ''} onChange={e => set('template', e.target.value)}
          placeholder={'Revenue: {{SUM(revenue)}}\nRegion: {{region}}\n% of Total: {{percent_of_total}}'}
          rows={4}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white/70 focus:outline-none focus:border-cyan-400/30 resize-none" />
      </div>

      {/* Add field from dataset */}
      <div>
        <div className="text-xs text-white/30 mb-1">Add Field</div>
        <select onChange={e => { addField(e.target.value); e.target.value = ''; }}
          className="w-full px-2 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-cyan-400/30">
          <option value="">+ dataset field…</option>
          {columns.map(c => <option key={c.name} value={c.name} className="bg-background">{c.name.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {/* Quick tokens */}
      <div>
        <div className="text-xs text-white/30 mb-1.5">Quick Add</div>
        <div className="flex flex-wrap gap-1">
          {QUICK_TOKENS.map(qt => (
            <button key={qt.token} onClick={() => addQuickToken(qt)}
              className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/8 text-white/40 hover:text-white/70 hover:border-white/15 transition-all">
              + {qt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field list */}
      {(tooltip.fields || []).length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-white/30 mb-1">Fields</div>
          {(tooltip.fields || []).map(f => (
            <div key={f.token} className="flex items-center gap-1.5 text-xs">
              <span className="text-white/50 truncate flex-1 max-w-[60px]">{f.label}</span>
              <select value={f.agg} onChange={e => updateField(f.token, 'agg', e.target.value)}
                className="bg-white/5 border border-white/8 rounded-lg px-1 py-0.5 text-xs text-foreground focus:outline-none">
                {AGG_OPTIONS.map(a => <option key={a} value={a} className="bg-background">{a}</option>)}
              </select>
              <select value={f.format} onChange={e => updateField(f.token, 'format', e.target.value)}
                className="bg-white/5 border border-white/8 rounded-lg px-1 py-0.5 text-xs text-foreground focus:outline-none">
                {FORMATS.map(fmt => <option key={fmt} value={fmt} className="bg-background">{fmt}</option>)}
              </select>
              <button onClick={() => removeField(f.token)} className="text-white/25 hover:text-red-400 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Toggle options */}
      {[
        { key: 'show_ai_insight', label: 'AI Insight' },
        { key: 'show_anomaly_flag', label: 'Anomaly Flag' },
        { key: 'show_sql_source', label: 'SQL Source' },
      ].map(opt => (
        <div key={opt.key} className="flex items-center justify-between">
          <span className="text-xs text-white/30">{opt.label}</span>
          <button onClick={() => set(opt.key, !tooltip[opt.key])}
            className={`w-7 h-3.5 rounded-full transition-all relative ${tooltip[opt.key] ? 'bg-cyan-400' : 'bg-white/15'}`}>
            <div className={`w-2.5 h-2.5 rounded-full bg-white absolute top-0.5 transition-all ${tooltip[opt.key] ? 'right-0.5' : 'left-0.5'}`} />
          </button>
        </div>
      ))}

      {/* Preview */}
      <div>
        <button onClick={() => setShowPreview(v => !v)}
          className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
          <Eye className="w-3.5 h-3.5" /> {showPreview ? 'Hide' : 'Preview'} Tooltip
        </button>
        {showPreview && (
          <div className="mt-2 p-3 rounded-xl bg-background border border-white/15 text-xs leading-relaxed shadow-xl"
            dangerouslySetInnerHTML={{ __html: renderPreview(tooltip.template, tooltip.fields || []) }} />
        )}
      </div>
    </div>
  );
}