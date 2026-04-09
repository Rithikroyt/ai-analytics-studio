import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  FileSpreadsheet, FileJson, FileText, Upload, CheckCircle2,
  AlertTriangle, Zap, ArrowRight, Database, Tag, Hash, Calendar,
  Key, TrendingUp, Shield, Layers, GitBranch, ChevronRight, Info
} from 'lucide-react';

function FadeIn({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }} className={className}>
      {children}
    </motion.div>
  );
}

const FORMATS = [
  {
    icon: FileSpreadsheet, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20',
    ext: 'CSV / TSV',
    title: 'Comma & Tab Separated',
    features: ['Auto-detect separator', 'Robust header detection', 'Numeric & date inference', 'Encoding detection', 'Multi-line value support'],
  },
  {
    icon: FileSpreadsheet, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20',
    ext: 'XLSX / XLS',
    title: 'Excel Workbooks',
    features: ['Multi-sheet detection', 'Sheet selection UI', 'Header row cleaning', 'Unnamed column removal', 'Formula cell support'],
  },
  {
    icon: FileJson, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20',
    ext: 'JSON',
    title: 'Structured JSON',
    features: ['Flat array support', 'Nested object flattening', 'Key auto-detection', 'Array-in-object extraction', 'Schema inference'],
  },
  {
    icon: FileText, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20',
    ext: 'TXT / DOCX',
    title: 'Context Documents',
    features: ['Text extraction', 'Evidence snippet mining', 'AI analyst grounding', 'Domain definition storage', 'Semantic enrichment'],
  },
];

const COLUMN_TYPES = [
  { icon: Calendar, color: 'text-teal-400', bg: 'bg-teal-400/10', border: 'border-teal-400/20', type: 'Date / Time', desc: 'ISO, YYYY-MM, MM/DD/YYYY, quarter formats' },
  { icon: Hash, color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/20', type: 'Numeric KPI', desc: 'Revenue, counts, scores, rates, percentages' },
  { icon: Tag, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', type: 'Category / Dimension', desc: 'Region, department, product, status' },
  { icon: Key, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', type: 'ID / Key', desc: 'Unique identifiers for join key detection' },
  { icon: FileText, color: 'text-white/40', bg: 'bg-white/5', border: 'border-white/10', type: 'Text / Free-form', desc: 'Comments, descriptions, feedback, notes' },
];

const PREP_STEPS = [
  { label: 'Missing value analysis', detail: 'Per-column null rate, impact score, recommended action' },
  { label: 'Duplicate row detection', detail: 'Exact and near-duplicate identification' },
  { label: 'KPI candidate ranking', detail: 'Coefficient of variation + domain keyword scoring' },
  { label: 'Date field inference', detail: 'Pattern matching across 8+ date format variants' },
  { label: 'Category vs. text split', detail: 'Cardinality threshold + uniqueness ratio analysis' },
  { label: 'Data quality scoring', detail: 'Composite score: completeness, consistency, uniqueness' },
  { label: 'Semantic model generation', detail: 'Business labels, measures, dimensions, KPI definitions' },
  { label: 'Relationship suggestions', detail: 'Shared key detection across multi-table uploads' },
];

// Interactive quality score mockup
function QualityMockup() {
  const cols = [
    { name: 'revenue', type: 'numeric', missing: 0, quality: 98 },
    { name: 'region', type: 'category', missing: 2, quality: 96 },
    { name: 'date', type: 'date', missing: 0, quality: 100 },
    { name: 'product', type: 'category', missing: 5, quality: 91 },
    { name: 'rep_id', type: 'id', missing: 12, quality: 76 },
    { name: 'notes', type: 'text', missing: 31, quality: 55 },
  ];
  const typeColors = { numeric: 'text-blue-400', category: 'text-purple-400', date: 'text-teal-400', id: 'text-amber-400', text: 'text-white/40' };
  const overall = Math.round(cols.reduce((s, c) => s + c.quality, 0) / cols.length);

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-sm">sales_data_2024.csv</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className={`w-3.5 h-3.5 ${overall >= 90 ? 'text-green-400' : overall >= 70 ? 'text-amber-400' : 'text-red-400'}`} />
          <span className={`text-sm font-black font-mono ${overall >= 90 ? 'text-green-400' : 'text-amber-400'}`}>{overall}%</span>
          <span className="text-xs text-muted-foreground">quality</span>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-white/3 border-b border-white/5">
              {['Column', 'Type', 'Missing', 'Quality'].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-muted-foreground font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((col, i) => (
              <motion.tr key={col.name} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                className="border-b border-white/5 hover:bg-white/2 transition-colors">
                <td className="px-3 py-2.5 font-mono text-white/80">{col.name}</td>
                <td className="px-3 py-2.5">
                  <span className={`font-semibold ${typeColors[col.type]}`}>{col.type}</span>
                </td>
                <td className="px-3 py-2.5">
                  {col.missing > 0
                    ? <span className="text-amber-400 font-mono">{col.missing}%</span>
                    : <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />0%</span>
                  }
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${col.quality >= 90 ? 'bg-green-400' : col.quality >= 70 ? 'bg-amber-400' : 'bg-red-400'}`}
                        style={{ width: `${col.quality}%` }} />
                    </div>
                    <span className={`font-mono text-xs ${col.quality >= 90 ? 'text-green-400' : 'text-amber-400'}`}>{col.quality}%</span>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function UniversalData() {
  const [activeFormat, setActiveFormat] = useState(0);

  return (
    <div className="min-h-screen bg-background pt-20">
      {/* Hero */}
      <section className="hero-gradient py-20 px-6 text-center">
        <div className="max-w-4xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-400/25 bg-teal-400/8 mb-6">
              <Upload className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-xs font-semibold text-teal-400 tracking-widest uppercase">Universal Data Ingestion</span>
            </div>
            <h1 className="text-5xl font-black mb-5">
              Any format. Any structure.
              <span className="text-gradient block">Auto-understood in seconds.</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              From messy CSVs to complex Excel workbooks — the platform reads, cleans, classifies, and profiles your data automatically before the first analysis runs.
            </p>
            <Link to="/workspace"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Upload className="w-4 h-4" /> Upload Your Data Now
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Supported formats */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-12">
            <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-3">Supported Formats</div>
            <h2 className="text-4xl font-black mb-4">Built for messy real-world files</h2>
          </FadeIn>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-12">
            {FORMATS.map((fmt, i) => (
              <FadeIn key={fmt.ext} delay={i * 0.07}>
                <div className={`glass-card rounded-2xl p-5 border ${fmt.border} hover:scale-[1.01] transition-all cursor-pointer ${activeFormat === i ? fmt.bg : ''}`}
                  onClick={() => setActiveFormat(i)}>
                  <div className={`w-10 h-10 rounded-xl ${fmt.bg} border ${fmt.border} flex items-center justify-center mb-3`}>
                    <fmt.icon className={`w-5 h-5 ${fmt.color}`} />
                  </div>
                  <div className={`text-xs font-black font-mono mb-1 ${fmt.color}`}>{fmt.ext}</div>
                  <div className="font-semibold text-sm mb-3">{fmt.title}</div>
                  <ul className="space-y-1.5">
                    {fmt.features.map(f => (
                      <li key={f} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <CheckCircle2 className="w-3 h-3 text-green-400 flex-shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              </FadeIn>
            ))}
          </div>

          {/* Excel-specific callout */}
          <FadeIn>
            <div className="glass-card rounded-2xl p-6 border border-teal-400/20 bg-teal-400/5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-teal-400/10 border border-teal-400/20 flex items-center justify-center flex-shrink-0">
                  <FileSpreadsheet className="w-5 h-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-1">Excel Workbook Intelligence</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    When you upload a multi-sheet Excel file, we detect all sheets, show row counts, and let you choose which sheet to analyze — or process all of them as related tables.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {['Sheet detection', 'Row count preview', 'Sheet selection UI', 'Unnamed column cleaning', 'Blank row detection'].map(f => (
                      <span key={f} className="text-xs px-2 py-0.5 bg-teal-400/10 border border-teal-400/20 text-teal-400 rounded-full">{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* Column classification */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <FadeIn>
              <div className="text-xs text-purple-400 uppercase tracking-widest font-semibold mb-3">Semantic Column Classification</div>
              <h2 className="text-3xl font-black mb-5">Every column gets a semantic role — automatically</h2>
              <p className="text-muted-foreground mb-6 leading-relaxed">
                The ingestion engine classifies every column into a semantic role using a combination of name heuristics, data sampling, cardinality analysis, and format pattern matching.
              </p>
              <div className="space-y-3">
                {COLUMN_TYPES.map((ct) => (
                  <div key={ct.type} className={`flex items-center gap-3 p-3 rounded-xl border ${ct.border} ${ct.bg}`}>
                    <div className={`w-8 h-8 rounded-lg ${ct.bg} border ${ct.border} flex items-center justify-center flex-shrink-0`}>
                      <ct.icon className={`w-4 h-4 ${ct.color}`} />
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${ct.color}`}>{ct.type}</div>
                      <div className="text-xs text-muted-foreground">{ct.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </FadeIn>

            <FadeIn delay={0.15}>
              <div className="text-xs text-cyan-400 uppercase tracking-widest font-semibold mb-4">Quality Profiling Output</div>
              <QualityMockup />
              <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-cyan-400" />
                Quality score is computed from completeness (null rates), consistency (type conformance), and uniqueness (duplicate detection).
              </div>
            </FadeIn>
          </div>
        </div>
      </section>

      {/* Prepare steps */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-12">
            <div className="text-xs text-green-400 uppercase tracking-widest font-semibold mb-3">Auto-Prepare Pipeline</div>
            <h2 className="text-4xl font-black mb-4">8 automated quality checks on every upload</h2>
          </FadeIn>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PREP_STEPS.map((step, i) => (
              <FadeIn key={step.label} delay={i * 0.05}>
                <div className="flex items-start gap-3 p-4 glass-card rounded-xl border border-white/8 hover:border-green-400/20 transition-all group">
                  <div className="w-6 h-6 rounded-full bg-green-400/10 border border-green-400/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-black text-green-400">{i + 1}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-sm mb-0.5">{step.label}</div>
                    <div className="text-xs text-muted-foreground">{step.detail}</div>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Multi-table */}
      <section className="section-gradient py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <div className="text-xs text-amber-400 uppercase tracking-widest font-semibold mb-3">Multi-Table Support</div>
            <h2 className="text-3xl font-black mb-5">Upload multiple files. We suggest the joins.</h2>
            <p className="text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
              Upload multiple CSVs or sheets simultaneously. The platform detects shared column names, likely join keys, and suggests relationships across tables for richer analysis.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-8">
              {['Shared key detection', 'Join suggestions', 'Cross-table KPIs', 'Multi-table dashboards', 'Compare datasets'].map(f => (
                <span key={f} className="text-xs px-3 py-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-full font-medium">
                  <CheckCircle2 className="w-3 h-3 inline mr-1" />{f}
                </span>
              ))}
            </div>
            <Link to="/workspace"
              className="inline-flex items-center gap-2 px-6 py-3.5 bg-cyan-400 rounded-xl font-bold hover:bg-cyan-300 transition-all"
              style={{ color: 'hsl(222,47%,6%)' }}>
              <Upload className="w-4 h-4" /> Upload Your Data
            </Link>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}