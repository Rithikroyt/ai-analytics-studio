import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Zap, Upload, Settings, BarChart3, MessageSquare, Download } from 'lucide-react';

const steps = [
  { icon: Upload, num: '01', title: 'Upload', color: 'text-cyan-400', border: 'border-cyan-400/30', bg: 'bg-cyan-400/10', desc: 'Drop CSV, XLSX, or JSON. OmniData detects sheets, cleans headers, and classifies columns automatically. Supports multi-table workspaces and optional context documents.' },
  { icon: Settings, num: '02', title: 'Prepare', color: 'text-teal-400', border: 'border-teal-400/30', bg: 'bg-teal-400/10', desc: 'Auto-profile each table: detect missing values, duplicates, primary keys, date fields, KPIs, and dimensions. Assign a trust/quality score. Confirm key fields.' },
  { icon: BarChart3, num: '03', title: 'Analyze', color: 'text-blue-400', border: 'border-blue-400/30', bg: 'bg-blue-400/10', desc: 'Descriptive profiling, trend analysis, anomaly detection, forecasting (when valid date + KPI exist), contribution breakdown, and driver analysis.' },
  { icon: MessageSquare, num: '04', title: 'Ask AI', color: 'text-purple-400', border: 'border-purple-400/30', bg: 'bg-purple-400/10', desc: 'The AI Analyst is grounded in your uploaded data, semantic layer, and generated SQL. Ask anything and receive structured answers with evidence.' },
  { icon: Download, num: '05', title: 'Export', color: 'text-pink-400', border: 'border-pink-400/30', bg: 'bg-pink-400/10', desc: 'Generate executive memos, board reports, anomaly summaries, and CSV exports. One click — professional results.' },
];

export default function Workflows() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <section className="py-24 hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Guided Workflows</span>
            <h1 className="text-5xl font-black mt-4 mb-6">
              A workflow designed for<br /><span className="text-gradient">every data scenario</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">OmniData guides you from messy raw data to polished executive insight — with guardrails at every step.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 max-w-4xl mx-auto px-6">
        <div className="relative">
          {/* Connector line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-gradient-to-b from-cyan-400/40 via-teal-400/30 to-transparent hidden md:block" />
          
          <div className="space-y-8">
            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`flex gap-6 glass-card rounded-2xl p-6 border ${step.border} ml-0 md:ml-4`}
              >
                <div className={`flex-shrink-0 w-14 h-14 rounded-2xl ${step.bg} flex flex-col items-center justify-center`}>
                  <step.icon className={`w-5 h-5 ${step.color}`} />
                  <span className={`text-xs font-mono ${step.color} mt-1`}>{step.num}</span>
                </div>
                <div>
                  <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-5 h-5" /> Start Your Workflow <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}