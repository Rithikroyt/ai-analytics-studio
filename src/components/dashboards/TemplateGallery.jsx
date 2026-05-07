/**
 * TemplateGallery — Pre-built dashboard layout templates for Dashboards page
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutDashboard, TrendingUp, Briefcase, Settings2, Sparkles, ChevronRight } from 'lucide-react';

const TEMPLATES = [
  {
    id: 'executive',
    label: 'Executive Overview',
    icon: Briefcase,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/20',
    desc: 'KPI summary, trend chart, top segments, anomaly register, and strategic recommendations.',
    slots: [
      { label: 'Primary KPI Card', type: 'kpi', w: 'col-span-1' },
      { label: 'Growth Rate', type: 'kpi', w: 'col-span-1' },
      { label: 'Anomaly Count', type: 'kpi', w: 'col-span-1' },
      { label: 'Revenue Trend (12m)', type: 'area', w: 'col-span-2' },
      { label: 'Segment Breakdown', type: 'donut', w: 'col-span-1' },
      { label: 'Top Recommendations', type: 'list', w: 'col-span-3' },
    ],
    tags: ['C-Suite', 'Board', 'KPIs'],
  },
  {
    id: 'sales',
    label: 'Sales Performance',
    icon: TrendingUp,
    color: 'text-green-400',
    bg: 'bg-green-400/10',
    border: 'border-green-400/20',
    desc: 'Pipeline metrics, conversion funnels, rep performance, deal velocity, and revenue forecast.',
    slots: [
      { label: 'Total Revenue', type: 'kpi', w: 'col-span-1' },
      { label: 'Deal Count', type: 'kpi', w: 'col-span-1' },
      { label: 'Win Rate', type: 'kpi', w: 'col-span-1' },
      { label: 'Monthly Revenue Trend', type: 'bar', w: 'col-span-2' },
      { label: 'Revenue by Region', type: 'donut', w: 'col-span-1' },
      { label: 'Pipeline Funnel', type: 'funnel', w: 'col-span-2' },
      { label: 'Top Reps by Revenue', type: 'bar', w: 'col-span-1' },
    ],
    tags: ['Sales', 'Revenue', 'Pipeline'],
  },
  {
    id: 'operational',
    label: 'Operational Report',
    icon: Settings2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/20',
    desc: 'Volume metrics, quality scores, process efficiency, anomaly log, and operational KPIs.',
    slots: [
      { label: 'Volume This Period', type: 'kpi', w: 'col-span-1' },
      { label: 'Quality Score', type: 'kpi', w: 'col-span-1' },
      { label: 'Error Rate', type: 'kpi', w: 'col-span-1' },
      { label: 'Daily Volume Trend', type: 'line', w: 'col-span-3' },
      { label: 'Category Breakdown', type: 'bar', w: 'col-span-2' },
      { label: 'Anomaly Log', type: 'list', w: 'col-span-1' },
    ],
    tags: ['Ops', 'Quality', 'Volume'],
  },
];

const SLOT_COLORS = {
  kpi: 'bg-cyan-400/10 border-cyan-400/20 text-cyan-400',
  area: 'bg-teal-400/10 border-teal-400/20 text-teal-400',
  bar: 'bg-blue-400/10 border-blue-400/20 text-blue-400',
  donut: 'bg-purple-400/10 border-purple-400/20 text-purple-400',
  line: 'bg-green-400/10 border-green-400/20 text-green-400',
  funnel: 'bg-orange-400/10 border-orange-400/20 text-orange-400',
  list: 'bg-white/5 border-white/10 text-white/40',
};

function TemplatePreview({ template }) {
  return (
    <div className="grid grid-cols-3 gap-1.5 mt-3">
      {template.slots.map((slot, i) => (
        <div key={i} className={`rounded-lg border px-2 py-1.5 text-xs text-center truncate ${SLOT_COLORS[slot.type] || 'bg-white/5 border-white/8 text-white/30'} ${slot.w}`}>
          {slot.label}
        </div>
      ))}
    </div>
  );
}

export default function TemplateGallery({ onApply, onClose }) {
  const [selected, setSelected] = useState(null);
  const [hovered, setHovered] = useState(null);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.93, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0 }}
          className="w-full max-w-4xl glass-card rounded-2xl border border-white/12 shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
                <LayoutDashboard className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="font-bold text-sm">Dashboard Template Gallery</h2>
                <p className="text-xs text-white/40">Choose a pre-built layout to jumpstart your dashboard</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 text-white/40 hover:text-white/80 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Templates grid */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-h-[70vh] overflow-y-auto">
            {TEMPLATES.map(t => {
              const Icon = t.icon;
              const isSelected = selected === t.id;
              return (
                <motion.div
                  key={t.id}
                  whileHover={{ scale: 1.01 }}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={() => setSelected(t.id)}
                  className={`rounded-2xl border cursor-pointer transition-all p-4 ${
                    isSelected ? `${t.bg} ${t.border}` : 'bg-white/3 border-white/8 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-xl ${t.bg} border ${t.border} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-4 h-4 ${t.color}`} />
                      </div>
                      <span className="font-bold text-sm">{t.label}</span>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed mb-2">{t.desc}</p>
                  <div className="flex flex-wrap gap-1 mb-1">
                    {t.tags.map(tag => (
                      <span key={tag} className={`text-xs px-2 py-0.5 rounded-full border ${t.bg} ${t.border} ${t.color}`}>{tag}</span>
                    ))}
                  </div>
                  <TemplatePreview template={t} />
                </motion.div>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-white/8 bg-white/[0.02]">
            <p className="text-xs text-white/35">
              {selected
                ? `"${TEMPLATES.find(t => t.id === selected)?.label}" selected — charts matching these slots will be auto-arranged.`
                : 'Select a template to preview and apply it to your dashboard.'}
            </p>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 border border-white/8 rounded-xl hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button
                disabled={!selected}
                onClick={() => { onApply(TEMPLATES.find(t => t.id === selected)); onClose(); }}
                className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-cyan-300 transition-all"
                style={{ color: 'hsl(222,47%,6%)' }}
              >
                <Sparkles className="w-3.5 h-3.5" /> Apply Template <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}