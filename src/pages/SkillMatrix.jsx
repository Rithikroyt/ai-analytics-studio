/**
 * Analyst Skill Matrix — OmniData Professional Skills Coverage Map
 */
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/lib/store';
import {
  CheckCircle2, Terminal, FlaskConical, Database, BarChart2, FileText,
  RefreshCw, Users, TrendingUp, Brain, Shield, MessageSquare, Layers,
  Map, Zap, Target, GitCompare, ChevronLeft
} from 'lucide-react';
// Note: Layers is used for both Semantic and Workbench skills above

const SKILLS = [
  { id: 'workbench', label: 'Senior Analyst Workbench', icon: Layers, color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/8', level: 'Advanced', module: 'Senior Analyst Workbench', path: '/senior-workbench', desc: 'Full workflow: SQL + Python EDA + Pivot + Stats + Validation + Charts + Methodology export' },
  { id: 'sql', label: 'SQL Analytics', icon: Terminal, color: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8', level: 'Advanced', module: 'SQL Proof Studio', path: '/sql-workbench', desc: 'Complex queries, aggregations, window functions, CTEs, NL-to-SQL, 15 templates' },
  { id: 'python', label: 'Python/Pandas EDA', icon: Brain, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8', level: 'Advanced', module: 'Senior Analyst Workbench', path: '/senior-workbench', desc: 'df.info(), df.describe(), cleaning logic, pivot tables, correlation, outlier detection' },
  { id: 'powerquery', label: 'Power Query Transformations', icon: RefreshCw, color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/8', level: 'Advanced', module: 'Data Engineering Studio', path: '/data-engineering', desc: '15 transformations: dedup, fill, replace, pivot, unpivot, split, group-by, custom column' },
  { id: 'starschema', label: 'Star Schema / Data Modeling', icon: Database, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/8', level: 'Advanced', module: 'Semantic Metric Store', path: '/semantic-metrics', desc: 'Fact/dimension detection, grain analysis, relationship modeling, non-additive field safety' },
  { id: 'semantic', label: 'Semantic Metrics Layer', icon: Layers, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/8', level: 'Advanced', module: 'Semantic Metric Store', path: '/semantic-metrics', desc: 'Certified metrics, formulas, synonyms, domain, aggregation rules, SQL safety enforcement' },
  { id: 'stats', label: 'Statistical Analysis', icon: FlaskConical, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8', level: 'Advanced', module: 'Statistics + A/B Testing', path: '/workspace', section: 'abtest', desc: 'Z-tests, significance, confidence intervals, MAPE, RMSE, MAE, IQR, outlier detection' },
  { id: 'cleaning', label: 'Data Cleaning & Validation', icon: Shield, color: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8', level: 'Advanced', module: 'Data Engineering Studio', path: '/data-engineering', desc: '5-dimension quality engine: Completeness, Validity, Uniqueness, Consistency, Timeliness' },
  { id: 'viz', label: 'Visualization', icon: BarChart2, color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/8', level: 'Advanced', module: 'Visual Builder', path: '/workspace', section: 'visual', desc: 'Bar, line, scatter, heatmap, geo maps, custom chart specs' },
  { id: 'reporting', label: 'Executive Reporting', icon: FileText, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/8', level: 'Advanced', module: 'Reports + Decision Reports', path: '/workspace', section: 'reports', desc: 'Executive briefs, decision memos, PDF export, stakeholder decks' },
  { id: 'docs', label: 'Documentation & Reproducibility', icon: FileText, color: 'text-indigo-400', border: 'border-indigo-400/20', bg: 'bg-indigo-400/8', level: 'Advanced', module: 'Methodology Panel + Workbench', path: '/senior-workbench', desc: 'Cleaning rules, SQL audit, assumptions, limitations, methodology export to Markdown' },
  { id: 'pipeline', label: 'ELT Pipeline Thinking', icon: Zap, color: 'text-yellow-400', border: 'border-yellow-400/20', bg: 'bg-yellow-400/8', level: 'Intermediate', module: 'Pipeline Studio', path: '/pipeline-studio', desc: 'dbt-style layers: Raw → Staging → Intermediate → Fact/Dim → Metrics → Dashboard → Report' },
  { id: 'cohort', label: 'Cohort Analysis', icon: RefreshCw, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/8', level: 'Advanced', module: 'Cohort Retention', path: '/workspace', section: 'cohort', desc: 'Cohort heatmap, retention curves, churn risk, period analysis' },
  { id: 'forecast', label: 'Forecasting & Time Series', icon: TrendingUp, color: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8', level: 'Advanced', module: 'Forecast Hub + Forecast Engine', path: '/forecast-hub', desc: 'Model routing: Moving Avg → SARIMA → Prophet → XGBoost. MAPE, RMSE, MAE, CI bands' },
  { id: 'governance', label: 'Data Governance', icon: Shield, color: 'text-amber-400', border: 'border-amber-400/20', bg: 'bg-amber-400/8', level: 'Advanced', module: 'Semantic Model + Governance', path: '/data-governance', desc: 'KPI definitions, certified metrics, data contracts, lineage' },
  { id: 'stakeholder', label: 'Stakeholder Communication', icon: MessageSquare, color: 'text-teal-400', border: 'border-teal-400/20', bg: 'bg-teal-400/8', level: 'Advanced', module: 'Agent Studio + Reports', path: '/agent-studio', desc: 'Executive summaries, decision reports, narrative builders' },
  { id: 'decision', label: 'Business Decision-Making', icon: Target, color: 'text-pink-400', border: 'border-pink-400/20', bg: 'bg-pink-400/8', level: 'Advanced', module: 'AI Command Center', path: '/ai-command-center', desc: 'Evidence-based recommendations, what-if scenarios, risk scoring' },
  { id: 'geo', label: 'Geospatial Analytics', icon: Map, color: 'text-green-400', border: 'border-green-400/20', bg: 'bg-green-400/8', level: 'Intermediate', module: 'Geo Analytics', path: '/workspace', section: 'geo', desc: 'Map charts, density, region KPIs, route analysis, location clustering' },
  { id: 'ops', label: 'Operational Analytics', icon: GitCompare, color: 'text-orange-400', border: 'border-orange-400/20', bg: 'bg-orange-400/8', level: 'Advanced', module: 'RFM + CLV + Pipeline Studio', path: '/workspace', section: 'rfm', desc: 'Process efficiency, capacity, SLA tracking, bottleneck analysis' },
  { id: 'ml', label: 'ML & Predictive', icon: Brain, color: 'text-purple-400', border: 'border-purple-400/20', bg: 'bg-purple-400/8', level: 'Advanced', module: 'ML Intelligence', path: '/ml-intelligence', desc: 'Regression, classification, anomaly detection, feature importance' },
  { id: 'admin', label: 'Admin Observability', icon: CheckCircle2, color: 'text-cyan-400', border: 'border-cyan-400/20', bg: 'bg-cyan-400/8', level: 'Advanced', module: 'Admin Center + Observability', path: '/observability', desc: 'Agent traces, SQL failures, quality scores, session analytics, feedback ratings' },
];

const LEVEL_COLORS = {
  Advanced: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  Intermediate: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  Foundational: 'bg-white/8 text-white/40 border-white/10',
};

export default function SkillMatrix() {
  const { setActiveSection } = useWorkspaceStore();

  const advanced = SKILLS.filter(s => s.level === 'Advanced').length;
  const coverage = Math.round(Math.min((SKILLS.length / 20) * 100, 100));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/8 px-8 py-5">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <Link to="/" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black">Analyst Skill Matrix</h1>
            <p className="text-xs text-muted-foreground">Professional analytics skills demonstrated in OmniData AI</p>
          </div>
          <div className="ml-auto flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-black text-cyan-400">{SKILLS.length}</div>
              <div className="text-xs text-white/30">Skills</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-green-400">{advanced}</div>
              <div className="text-xs text-white/30">Advanced</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-purple-400">{coverage}%</div>
              <div className="text-xs text-white/30">Coverage</div>
            </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Intro */}
        <div className="p-5 rounded-2xl bg-cyan-400/5 border border-cyan-400/15 mb-8 text-sm text-white/60 leading-relaxed">
          <strong className="text-cyan-400">OmniData</strong> is designed around real Senior Data Analyst workflows — not just dashboards.
          Each skill below is demonstrated by a specific module, reflecting how analysts actually work in companies:
          extracting data, cleaning it, modeling KPIs, running experiments, forecasting trends, documenting methodology, and supporting executive decisions.
        </div>

        {/* Skill grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SKILLS.map((skill, i) => (
            <motion.div
              key={skill.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`p-4 rounded-2xl border ${skill.border} ${skill.bg} hover:scale-[1.01] transition-all cursor-default group`}
            >
              <div className="flex items-start gap-3 mb-2">
                <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0`}>
                  <skill.icon className={`w-4 h-4 ${skill.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-white/90">{skill.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full border ${LEVEL_COLORS[skill.level]}`}>{skill.level}</span>
                  </div>
                  <div className="text-xs text-white/35">{skill.desc}</div>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-white/8 flex items-center justify-between">
                <span className={`text-xs font-semibold ${skill.color}`}>📍 {skill.module}</span>
                <Link to={skill.path}
                  onClick={() => skill.section && setActiveSection(skill.section)}
                  className="text-xs text-white/25 hover:text-white/60 transition-all">
                  Open →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Summary badge */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-cyan-400/8 via-purple-400/5 to-teal-400/8 border border-white/10 text-center">
          <div className="text-sm font-semibold text-white/60 mb-2">
            This project demonstrates <strong className="text-white">{SKILLS.length} professional Senior Data Analyst skills</strong>, covering the full analytics operating system lifecycle
          </div>
          <div className="text-xs text-white/35 max-w-2xl mx-auto">
            From data engineering, Power Query transformations, semantic modeling, SQL/Python analytics, star schema design, time-series forecasting, dashboard storytelling, AI-grounded analysis, and executive reporting —
            OmniData reflects how Senior Data Analysts and Business Intelligence professionals actually work in enterprise companies.
          </div>
        </div>
      </div>
    </div>
  );
}