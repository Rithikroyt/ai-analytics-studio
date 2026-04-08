import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  FileSpreadsheet, FileJson, FileText, GitBranch, CheckCircle2,
  ArrowRight, Zap, Database, Shield, Activity, Search,
  AlertTriangle, TrendingUp, Tag, Hash, Calendar, Key
} from 'lucide-react';

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };

const formats = [
  {
    icon: FileSpreadsheet, title: 'CSV / TSV', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    desc: 'Upload any delimited file. Auto-detect separator, header row, encoding, and column types.',
    details: ['Auto-detect comma, tab, semicolon', 'Handle encoding: UTF-8, Latin-1', 'Smart header row detection', 'Preview first 20 rows before import'],
  },
  {
    icon: FileSpreadsheet, title: 'Excel XLSX / XLS', color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20',
    desc: 'Detect all worksheets, choose a sheet, preview rows, clean blank/unnamed columns.',
    details: ['List all sheets in workbook', 'Let user select target sheet', 'Clean unnamed columns (e.g., "Column1")', 'Handle merged cells gracefully'],
  },
  {
    icon: FileJson, title: 'JSON', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    desc: 'Parse flat or nested JSON arrays. Flatten nested objects automatically for analysis.',
    details: ['Flat and nested JSON support', 'Auto-flatten nested objects', 'Handle arrays of records', 'Type inference on parsed fields'],
  },
  {
    icon: FileText, title: 'TXT / PDF / DOCX', color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    desc: 'Upload context documents. Extract text for evidence snippets and AI analyst grounding.',
    details: ['Plain text extraction', 'Used as AI evidence context', 'Evidence snippets surfaced in answers', 'Supports multiple documents'],
  },
];

const columnTypes = [
  { icon: Calendar, label: 'Date', color: 'text-teal-400 bg-teal-400/10', desc: 'Auto-detected and used for time-series analysis and forecasting.' },
  { icon: Hash, label: 'Numeric KPI', color: 'text-blue-400 bg-blue-400/10', desc: 'Candidate metrics for analysis, trending, and forecasting.' },
  { icon: Tag, label: 'Category / Dimension', color: 'text-purple-400 bg-purple-400/10', desc: 'Used for grouping, filtering, and segment comparison charts.' },
  { icon: Key, label: 'ID / Primary Key', color: 'text-amber-400 bg-amber-400/10', desc: 'Detected for join inference across multiple uploaded tables.' },
  { icon: FileText, label: 'Text / Free-form', color: 'text-pink-400 bg-pink-400/10', desc: 'Fed into feedback analytics and sentiment analysis when applicable.' },
  { icon: Shield, label: 'Boolean / Flag', color: 'text-green-400 bg-green-400/10', desc: 'Binary columns detected for risk scoring and filtering.' },
];

const qualityChecks = [
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
  'Surface warnings for ambiguous column types',
  'Detect and report null-impact on analysis',
];

export default function UniversalData() {
  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="py-24 hero-gradient">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.6 } }}>
            <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Universal Data</span>
            <h1 className="text-5xl md:text-6xl font-black mt-4 mb-6">
              Any file.<br /><span className="text-gradient">Zero preparation needed.</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Accepts raw, messy, real-world structured data in any format — and turns it into clean, analysis-ready tables automatically. No ETL pipeline. No data engineer required.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Formats */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-14">
          <span className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">Supported Formats</span>
          <h2 className="text-4xl font-black mt-3 mb-4">Whatever format your data is in</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Each format is handled with intelligent parsing tailored to its structure and common quirks.</p>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
          {formats.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className={`glass-card rounded-2xl p-6 border ${f.border} hover:border-opacity-80 transition-all`}>
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className={`text-sm mb-4 ${f.color.replace('text-', 'text-').replace('400', '300/80')}`}>{f.desc}</p>
              <div className="grid grid-cols-2 gap-2">
                {f.details.map(d => (
                  <div key={d} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3 h-3 text-cyan-400 flex-shrink-0" /> {d}
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Column type detection */}
        <div className="mb-24">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <span className="text-xs font-semibold tracking-widest text-teal-400 uppercase">Column Intelligence</span>
            <h2 className="text-3xl font-black mt-3 mb-3">Automatic column classification</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-sm">Every column is automatically classified into a semantic type. This drives the entire downstream analysis pipeline.</p>
          </motion.div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {columnTypes.map((ct) => (
              <motion.div key={ct.label} variants={fadeUp} className="glass-card rounded-xl p-4 border border-white/5">
                <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs font-semibold mb-3 ${ct.color}`}>
                  <ct.icon className="w-3 h-3" /> {ct.label}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{ct.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Data quality checks */}
        <div className="glass-card rounded-2xl border border-white/5 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-green-400/10 flex items-center justify-center">
              <Shield className="w-4 h-4 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold">Intelligent Data Preparation</h2>
          </div>
          <motion.div variants={stagger} initial="hidden" whileInView="show" viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {qualityChecks.map((cap, i) => (
              <motion.div key={cap} variants={fadeUp} className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-muted-foreground">{cap}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Quality Score mock */}
      <section className="py-16 section-gradient">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-xs font-semibold tracking-widest text-amber-400 uppercase">Data Quality Score</span>
              <h2 className="text-4xl font-black mt-4 mb-6">Know your data's health<br /><span className="text-gradient">before you analyze it.</span></h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Every uploaded table receives a quality score from 0–100, with detailed breakdown of issues found. Analysis confidence is tied to this score so you always know how much to trust the results.
              </p>
              <div className="space-y-3">
                {[
                  ['90–100', 'Excellent', 'text-green-400', 'Ready for all analysis types.'],
                  ['70–89', 'Good', 'text-teal-400', 'Minor issues — most analysis available.'],
                  ['50–69', 'Needs Work', 'text-amber-400', 'Significant gaps detected. Review before analysis.'],
                  ['0–49', 'Poor', 'text-red-400', 'Data quality too low for reliable insights.'],
                ].map(([range, label, color, desc]) => (
                  <div key={range} className="flex items-center gap-3 text-sm">
                    <span className={`font-mono font-bold ${color} w-16 flex-shrink-0`}>{range}</span>
                    <span className={`font-semibold ${color} w-20 flex-shrink-0`}>{label}</span>
                    <span className="text-muted-foreground">{desc}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Quality score mock UI */}
            <motion.div initial={{ opacity: 0, x: 32 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
              className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold">Sales_Q4_2024.xlsx</span>
                <span className="text-xs text-white/30">2,304 rows · 12 cols</span>
              </div>
              {/* Quality bar */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-green-400/5 border border-green-400/20">
                <div className="text-3xl font-black text-green-400 font-mono">94%</div>
                <div>
                  <div className="text-sm font-semibold text-green-400">Excellent Quality</div>
                  <div className="text-xs text-muted-foreground">Ready for all analysis types</div>
                </div>
              </div>
              {/* Column list */}
              <div className="space-y-2">
                {[
                  ['date', 'order_date', 'teal', '2021-01-15'],
                  ['numeric', 'revenue', 'blue', '$12,450.00'],
                  ['category', 'region', 'purple', 'North America'],
                  ['id', 'customer_id', 'amber', 'CUST-004821'],
                  ['numeric', 'margin_pct', 'blue', '68.2%'],
                ].map(([type, name, color, sample]) => (
                  <div key={name} className="flex items-center gap-3 text-xs py-1.5 border-b border-white/5">
                    <span className={`px-2 py-0.5 rounded text-${color}-400 bg-${color}-400/10 w-16 text-center flex-shrink-0`}>{type}</span>
                    <span className="font-mono text-white/70 flex-1">{name}</span>
                    <span className="text-white/30">{sample}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-400/5 border border-amber-400/20">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-400">1 issue: 23 rows have missing margin_pct values (1% of data).</div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 max-w-4xl mx-auto px-6 text-center">
        <Link to="/workspace" className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all hover:scale-105" style={{ color: 'hsl(222,47%,6%)' }}>
          <Zap className="w-5 h-5" /> Upload Your Data <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
}