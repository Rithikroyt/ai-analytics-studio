import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FileSpreadsheet, FileJson, FileText, GitBranch, Eye, CheckCircle2, ArrowRight, Zap } from 'lucide-react';

const formats = [
  { icon: FileSpreadsheet, title: 'CSV / TSV', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', desc: 'Upload any delimited file. Auto-detect separator, header row, encoding, and column types.' },
  { icon: FileSpreadsheet, title: 'Excel XLSX', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', desc: 'Detect all worksheets, let you choose a sheet, preview rows, clean blank/unnamed columns.' },
  { icon: FileJson, title: 'JSON', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', desc: 'Parse flat or nested JSON arrays. Flatten nested objects automatically for analysis.' },
  { icon: FileText, title: 'TXT / PDF / DOCX', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', desc: 'Upload context documents. Extract text for evidence snippets and AI analyst grounding.' },
];

const capabilities = [
  'Detect likely header row in messy files',
  'Clean blank rows and unnamed columns',
  'Classify columns as ID, Date, Numeric KPI, Category, or Text',
  'Detect duplicate rows and flag them',
  'Score data quality (trust score 0–100)',
  'Infer joins between multiple uploaded tables',
  'Suggest primary keys and date grain',
  'Handle real-world messy Excel with merged cells',
  'Multi-table workspace with relationship graph',
  'Preview first rows before final import',
];

export default function UniversalData() {
  return (
    <div className="min-h-screen bg-background pt-20">
      <section className="py-24 hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Universal Data</span>
            <h1 className="text-5xl font-black mt-4 mb-6">
              Any file.<br /><span className="text-gradient">Zero preparation needed.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">OmniData accepts raw, messy, real-world structured data in any format — and turns it into clean, analysis-ready tables automatically.</p>
          </motion.div>
        </div>
      </section>

      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
          {formats.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`glass-card rounded-2xl p-6 border ${f.border}`}
            >
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="glass-card rounded-2xl border border-white/5 p-8">
          <h2 className="text-2xl font-bold mb-8 text-center">Intelligent Data Preparation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {capabilities.map((cap, i) => (
              <motion.div
                key={cap}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-3"
              >
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{cap}</span>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="text-center mt-16">
          <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
            <Zap className="w-5 h-5" /> Upload Your Data <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}