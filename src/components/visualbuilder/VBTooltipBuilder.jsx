/**
 * VBTooltipBuilder — Professional Tooltip designer with token system and live preview
 */
import { useState } from 'react';
import { Plus, X, Eye, EyeOff, Sparkles, Hash, Calendar, Tag } from 'lucide-react';

const FORMATS = ['Auto', 'Number', 'Currency ($)', 'Currency (€)', 'Percentage', 'Date', 'Text'];
const AGG_TYPES = ['SUM', 'AVG', 'COUNT', 'MIN', 'MAX', 'LAST'];
const QUICK_TOKENS = [
  { token: '{{AI_INSIGHT}}', label: '🤖 AI Insight', desc: 'Auto-generated chart insight' },
  { token: '{{ANOMALY_FLAG}}', label: '⚡ Anomaly', desc: 'Flag if anomaly detected' },
  { token: '{{RANK}}', label: '🏆 Rank', desc: 'Value rank in dataset' },
  { token: '{{PCT_TOTAL}}', label: '% Total', desc: 'Percentage of total' },
  { token: '{{TREND}}', label: '📈 Trend', desc: 'Up/down trend indicator' },
  { token: '{{DELTA}}', label: 'Δ Delta', desc: 'Change vs previous' },
];

function renderPreview(template, fields) {
  let t = template || '';
  const sampleVals = { '{{AI_INSIGHT}}': '↑ Strong growth signal', '{{ANOMALY_FLAG}}': '⚡ Outlier', '{{RANK}}': '#1', '{{PCT_TOTAL}}': '34.2%', '{{TREND}}': '↑ Upward', '{{DELTA}}': '+12.4%' };
  Object.entries(sampleVals).forEach(([k, v]) => { t = t.replaceAll(k, `<span style="color:#00e5ff">${v}</span>`); });
  fields.forEach(f => {
    const sampleVal = f.format === 'Percentage' ? '42.1%' : f.format === 'Currency ($)' ? '$12,450' : f.format === 'Date' ? '2024-03-15' : '8,230';
    t = t.replaceAll(`{{${f.name}}}`, `<span style="color:#a855f7">${sampleVal}</span>`);
  });
  return t;
}

export default function VBTooltipBuilder({ tooltip, columns, onChange }) {
  const [showPreview, setShowPreview] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const set = (k, v) => onChange({ ...tooltip, [k]: v });

  const addField = (name, fromCol) => {
    if (!name) return;
    const col = columns?.find(c => c.name === name);
    const newField = { name, label: name.replace(/_/g, ' '), format: col?.type === 'numeric' ? 'Number' : col?.type === 'date' ? 'Date' : 'Text', agg: col?.type === 'numeric' ? 'SUM' : 'ATTR' };
    set('fields', [...(tooltip.fields || []), newField]);
    const token = `{{${name}}}`;
    if (!(tooltip.template || '').includes(token)) {
      set('template', (tooltip.template || '') + (tooltip.template ? '\n' : '') + `${newField.label}: ${token}`);
    }
    setNewFieldName('');
  };

  const removeField = (name) => {
    set('fields', (tooltip.fields || []).filter(f => f.name !== name));
  };

  const updateField = (name, key, val) => {
    set('fields', (tooltip.fields || []).map(f => f.name === name ? { ...f, [key]: val } : f));
  };

  const insertToken = (token) => {
    set('template', (tooltip.template || '') + (tooltip.template ? '\n' : '') + token);
  };

  const numericCols = columns?.filter(c => c.type === 'numeric' || c.isKpiCandidate) || [];
  const allCols = columns || [];

  return (
    <div className="space-y-3 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-black uppercase tracking-widest text-white/40">Tooltip Builder</div>
        <button onClick={() => setShowPreview(v => !v)}
          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-all ${showPreview ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/30 hover:text-white/60'}`}>
          {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />} Preview
        </button>
      </div>

      {/* Enable toggle */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-white/35 font-semibold">Enable Tooltip</div>
        <button onClick={() => set('enabled', !tooltip.enabled)}
          className={`w-8 h-4 rounded-full transition-all relative ${tooltip.enabled ? 'bg-cyan-400' : 'bg-white/15'}`}>
          <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${tooltip.enabled ? 'right-0.5' : 'left-0.5'}`} />
        </button>
      </div>

      {tooltip.enabled && (
        <>
          {/* Template editor */}
          <div>
            <div className="text-xs text-white/30 mb-1.5 font-semibold">Template</div>
            <textarea value={tooltip.template || ''} onChange={e => set('template', e.target.value)} rows={4}
              placeholder="Build your tooltip template here. Use {{FieldName}} tokens."
              className="w-full bg-white/4 border border-white/8 rounded-xl px-3 py-2 text-xs text-white/65 focus:outline-none focus:border-cyan-400/25 resize-none font-mono leading-relaxed" />
          </div>

          {/* Quick tokens */}
          <div>
            <div className="text-xs text-white/30 mb-1.5 font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" /> AI / ML Tokens
            </div>
            <div className="grid grid-cols-2 gap-1">
              {QUICK_TOKENS.map(t => (
                <button key={t.token} onClick={() => insertToken(t.token)} title={t.desc}
                  className="text-left px-2 py-1.5 rounded-lg bg-purple-400/8 border border-purple-400/15 text-xs text-purple-400/80 hover:bg-purple-400/12 hover:text-purple-400 transition-all">
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add field */}
          <div>
            <div className="text-xs text-white/30 mb-1.5 font-semibold">Add Field Token</div>
            <div className="flex gap-1.5">
              <select value={newFieldName} onChange={e => setNewFieldName(e.target.value)}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5 text-xs text-foreground focus:outline-none focus:border-cyan-400/25">
                <option value="">Select column…</option>
                {allCols.map(c => <option key={c.name} value={c.name}>{c.name.replace(/_/g, ' ')} [{c.type}]</option>)}
              </select>
              <button onClick={() => addField(newFieldName)} disabled={!newFieldName}
                className="p-1.5 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-xl hover:bg-cyan-400/15 transition-all disabled:opacity-40">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Added fields */}
          {(tooltip.fields || []).length > 0 && (
            <div className="space-y-2">
              <div className="text-xs text-white/30 font-semibold">Field Settings</div>
              {(tooltip.fields || []).map(f => (
                <div key={f.name} className="flex items-center gap-1.5 p-2 rounded-xl bg-white/3 border border-white/6 text-xs">
                  <span className="text-white/55 font-medium truncate flex-1">{f.name.replace(/_/g, ' ')}</span>
                  <select value={f.format || 'Auto'} onChange={e => updateField(f.name, 'format', e.target.value)}
                    className="bg-white/5 border border-white/8 rounded-lg px-1.5 py-0.5 text-xs text-white/40 focus:outline-none">
                    {FORMATS.map(fm => <option key={fm} value={fm}>{fm}</option>)}
                  </select>
                  <select value={f.agg || 'ATTR'} onChange={e => updateField(f.name, 'agg', e.target.value)}
                    className="bg-white/5 border border-white/8 rounded-lg px-1.5 py-0.5 text-xs text-white/40 focus:outline-none">
                    {['ATTR', ...AGG_TYPES].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                  <button onClick={() => removeField(f.name)} className="text-white/20 hover:text-red-400 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Extra toggles */}
          <div className="space-y-2 border-t border-white/5 pt-2">
            {[
              { key: 'show_ai_insight', label: '🤖 Show AI Insight' },
              { key: 'show_anomaly_flag', label: '⚡ Show Anomaly Flag' },
              { key: 'show_sql_source', label: '🔍 Show SQL Source' },
              { key: 'show_sparkline', label: '📈 Show Sparkline' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-xs text-white/35">{label}</span>
                <button onClick={() => set(key, !tooltip[key])}
                  className={`w-8 h-4 rounded-full transition-all relative ${tooltip[key] ? 'bg-cyan-400' : 'bg-white/15'}`}>
                  <div className={`w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all ${tooltip[key] ? 'right-0.5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>

          {/* Live preview */}
          {showPreview && (
            <div>
              <div className="text-xs text-white/30 mb-1.5 font-semibold">Live Preview</div>
              <div className="p-3 rounded-xl border border-white/10 bg-background/95 text-xs leading-relaxed"
                style={{ fontFamily: 'inherit', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                dangerouslySetInnerHTML={{ __html: renderPreview(tooltip.template, tooltip.fields || []) || '<span style="color:rgba(255,255,255,0.2)">Empty template…</span>' }} />
            </div>
          )}
        </>
      )}
    </div>
  );
}