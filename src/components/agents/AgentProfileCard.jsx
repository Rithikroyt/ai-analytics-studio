/**
 * AgentProfileCard — Full senior agent profile with KPI ownership, tools, framework.
 */
import { useState } from 'react';
import { Brain, Target, Zap, BarChart2, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AGENT_PROFILES = {
  cfo: {
    specialty: 'Finance, payroll, margin, budget, profitability',
    kpis: ['Revenue', 'Gross Margin %', 'Payroll Cost', 'Budget Variance', 'ROI', 'Runway', 'EBITDA', 'Net Margin'],
    tools: ['SQL variance analysis', 'Contribution analysis', 'Forecasting', 'Anomaly detection', 'Formula engine'],
    framework: 'Variance → Driver → Risk → Action',
    playbooks: ['Budget Variance Diagnosis', 'Payroll Efficiency Review', 'Margin Bridge', 'Forecast Variance Review'],
    starterQuestions: ['Why is payroll cost increasing?', 'Which department is over budget?', 'What is our gross margin trend?', 'When do we run out of runway?'],
  },
  growth: {
    specialty: 'Acquisition, activation, retention, conversion, RFM, cohort',
    kpis: ['Conversion Rate', 'Churn Rate', 'LTV/CAC', 'RFM Segment', 'Funnel Drop-off', 'CAC', 'Activation Rate', 'Campaign ROI'],
    tools: ['Funnel analysis', 'RFM segmentation', 'Cohort retention', 'Anomaly detection', 'Growth scoring'],
    framework: 'Acquire → Activate → Retain → Expand',
    playbooks: ['Funnel Drop-off Diagnosis', 'RFM Customer Segmentation', 'Retention Analysis', 'Campaign ROI Review'],
    starterQuestions: ['Where is the biggest funnel drop-off?', 'Which customer segment is churning most?', 'What is our LTV/CAC ratio?', 'Which campaign has the best ROI?'],
  },
  ops: {
    specialty: 'Throughput, capacity, cycle time, SLA, bottlenecks, automation',
    kpis: ['Cycle Time', 'SLA Compliance', 'Throughput', 'Defect Rate', 'Utilization', 'Backlog Growth', 'Cost per Process'],
    tools: ['Bottleneck detection', 'SLA analysis', 'Cycle time profiling', 'Capacity planning', 'DMAIC framework'],
    framework: 'DMAIC: Define → Measure → Analyze → Improve → Control',
    playbooks: ['Bottleneck Detection', 'SLA Risk Review', 'Capacity Planning', 'Process Improvement'],
    starterQuestions: ['Where is the biggest bottleneck?', 'Which process is breaching SLA?', 'What is our capacity utilization?', 'Where can we automate?'],
  },
};

export default function AgentProfileCard({ persona, active, onClick }) {
  const [expanded, setExpanded] = useState(false);
  const profile = AGENT_PROFILES[persona.id] || AGENT_PROFILES.cfo;
  const color = persona.avatarColor || '#00e5ff';

  return (
    <div>
      {/* Compact selector (always visible) */}
      <button onClick={onClick}
        className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl border text-left transition-all ${active ? 'border-opacity-30' : 'border-white/8 hover:border-white/15 hover:bg-white/3'}`}
        style={active ? { borderColor: `${color}35`, background: `${color}0e` } : {}}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
          style={{ background: `${color}20`, color }}>
          {persona.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold truncate" style={active ? { color } : { color: 'rgba(255,255,255,0.6)' }}>{persona.name}</div>
          <div className="text-xs text-white/25 truncate">{persona.department}</div>
        </div>
        {active && (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            className="p-1 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/8 transition-all flex-shrink-0">
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </button>

      {/* Expanded profile — only for active persona */}
      <AnimatePresence>
        {active && expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden">
            <div className="mx-1 mb-1 px-3 py-3 rounded-b-xl border border-t-0 space-y-3"
              style={{ borderColor: `${color}20`, background: `${color}06` }}>

              {/* Specialty */}
              <div>
                <div className="text-xs text-white/25 mb-1">Specialty</div>
                <p className="text-xs text-white/55 leading-relaxed">{profile.specialty}</p>
              </div>

              {/* KPIs */}
              <div>
                <div className="text-xs text-white/25 mb-1.5 flex items-center gap-1"><BarChart2 className="w-3 h-3" /> KPI Ownership</div>
                <div className="flex flex-wrap gap-1">
                  {profile.kpis.map(k => (
                    <span key={k} className="text-xs px-1.5 py-0.5 rounded-full border text-white/45"
                      style={{ borderColor: `${color}30`, background: `${color}0a` }}>{k}</span>
                  ))}
                </div>
              </div>

              {/* Tools */}
              <div>
                <div className="text-xs text-white/25 mb-1.5 flex items-center gap-1"><Zap className="w-3 h-3" /> Available Tools</div>
                <div className="flex flex-wrap gap-1">
                  {profile.tools.map(t => (
                    <span key={t} className="text-xs px-1.5 py-0.5 rounded-full bg-white/5 border border-white/8 text-white/40">{t}</span>
                  ))}
                </div>
              </div>

              {/* Framework */}
              <div className="px-2 py-1.5 rounded-lg bg-white/3 border border-white/6">
                <div className="text-xs text-white/25 mb-0.5 flex items-center gap-1"><Brain className="w-3 h-3" /> Decision Framework</div>
                <div className="text-xs font-semibold" style={{ color }}>{profile.framework}</div>
              </div>

              {/* Playbooks */}
              <div>
                <div className="text-xs text-white/25 mb-1.5">Playbooks</div>
                <div className="space-y-1">
                  {profile.playbooks.map(p => (
                    <div key={p} className="text-xs px-2 py-1 rounded-lg bg-white/3 text-white/45 flex items-center gap-1.5">
                      <Target className="w-3 h-3 flex-shrink-0" style={{ color: `${color}80` }} />{p}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}