import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Brain, BarChart3, Database, Layers, Zap, Shield, GitBranch, FileText, ArrowRight, CheckCircle2 } from 'lucide-react';

const caps = [
  { icon: Database, color: 'text-cyan-400', bg: 'bg-cyan-400/10', title: 'Data Intake Engine', items: ['CSV, XLSX, JSON, TXT upload', 'Multi-sheet Excel detection', 'Header inference & cleaning', 'Column type classification', 'Multi-table workspace'] },
  { icon: Brain, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'AI Analyst Agent', items: ['Natural language data queries', 'Schema & semantic layer grounding', 'SQL generation & execution', 'Evidence from uploaded docs', 'Structured answer framework'] },
  { icon: BarChart3, color: 'text-teal-400', bg: 'bg-teal-400/10', title: 'Storytelling Dashboards', items: ['Narrative-driven charts', 'KPI strip + executive headline', 'Anomaly detection panel', 'Forecast with confidence bands', 'Recommended actions panel'] },
  { icon: Layers, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'Semantic Layer', items: ['Dimensions & measures', 'KPI definitions', 'Relationship inference', 'Consistent metric names', 'Date grain management'] },
  { icon: GitBranch, color: 'text-amber-400', bg: 'bg-amber-400/10', title: 'SQL Studio', items: ['Natural language to SQL', 'Query preview & results', 'Plain-English explanation', 'Safe fallback mode', 'Export query results'] },
  { icon: FileText, color: 'text-pink-400', bg: 'bg-pink-400/10', title: 'Reports & Export', items: ['Executive summary memos', 'Board-ready PDFs', 'Anomaly & forecast reports', 'Data quality reports', 'CSV exports of results'] },
];

export default function Platform() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <section className="py-24 hero-gradient">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">The Platform</span>
            <h1 className="text-5xl font-black mt-4 mb-6">
              One platform.<br /><span className="text-gradient">Infinite data stories.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">OmniData AI Analytics Studio is the only platform that takes raw structured data all the way to executive-ready AI insights — without any setup.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {caps.map((cap, i) => (
            <motion.div
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-2xl p-6 border border-white/5"
            >
              <div className={`w-10 h-10 rounded-xl ${cap.bg} flex items-center justify-center mb-4`}>
                <cap.icon className={`w-5 h-5 ${cap.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-4">{cap.title}</h3>
              <ul className="space-y-2">
                {cap.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-5 h-5" /> Launch Workspace <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}