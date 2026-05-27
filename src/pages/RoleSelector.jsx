/**
 * RoleSelector — Phase 1
 * Four-role entry point: Business Analyst, Marketing Analyst, Data Analyst, Data Scientist
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase, TrendingUp, BarChart2, Brain,
  ArrowRight, CheckCircle2, Zap
} from 'lucide-react';
import OmniLogo from '@/components/ui/OmniLogo';

const ROLES = [
  {
    id: 'business',
    path: '/workspace/business-analyst',
    icon: Briefcase,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/25',
    glow: 'shadow-blue-400/10',
    ring: 'ring-blue-400/40',
    title: 'Business Analyst',
    tagline: 'Frame problems · Requirements · ROI · Process maps · Business cases',
    description: 'Analyze business problems, generate BRDs, map workflows, calculate ROI, create stakeholder matrices, and export executive business cases.',
    tools: ['Problem Framing Studio', 'BRD Generator', 'Process Mapping (Mermaid)', 'ROI Calculator', 'Stakeholder Matrix', 'UAT Test Cases', 'Gap Analysis', 'Business Case PDF'],
    persona: 'You are a Senior Business Analyst. Analyze business problems with structured BRD output, stakeholder impacts, ROI calculations, process gaps, and acceptance criteria.',
    sampleQ: ['Why is the sales process failing in Q3?', 'Map our current approval workflow', 'Calculate ROI for this initiative', 'Generate requirements for new CRM'],
  },
  {
    id: 'marketing',
    path: '/workspace/marketing-analyst',
    icon: TrendingUp,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/25',
    glow: 'shadow-pink-400/10',
    ring: 'ring-pink-400/40',
    title: 'Marketing Analyst',
    tagline: 'Campaigns · CAC/ROAS/LTV · Funnels · Attribution · A/B Tests · Growth',
    description: 'Analyze campaigns, calculate CAC, ROAS, and LTV, run funnel analysis, A/B tests, attribution models, and generate growth strategy reports.',
    tools: ['Campaign Performance Studio', 'CAC / ROAS / LTV Calculator', 'Attribution Engine (4 models)', 'A/B Testing Lab', 'RFM Segmentation', 'Funnel Analysis', 'Persona Generator', 'Budget Optimizer'],
    persona: 'You are a Senior Marketing Analyst. Analyze campaign performance, customer segments, funnel metrics (CAC, ROAS, LTV, CTR, CPC), attribution, and recommend budget actions.',
    sampleQ: ['Which campaign has the best ROAS?', 'Analyze funnel drop-off by channel', 'Which customer segment has highest LTV?', 'Run A/B test significance analysis'],
  },
  {
    id: 'data',
    path: '/workspace/data-analyst',
    icon: BarChart2,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/25',
    glow: 'shadow-cyan-400/10',
    ring: 'ring-cyan-400/40',
    title: 'Data Analyst',
    tagline: 'Clean · SQL · EDA · Dashboards · KPIs · Chart QA · Insight Reports',
    description: 'Profile and clean datasets, run SQL analysis, auto-generate EDA reports, build dashboards, validate charts, and export analyst-grade insight reports.',
    tools: ['Auto-EDA Report', 'SQL Studio (CTE, Window, Running Total)', 'Chart Recommendation Engine', 'Geo Map Fallback', 'Dashboard Builder', 'Chart QA Validator', 'KPI Engine', 'Data Quality Scoring'],
    persona: 'You are a Senior Data Analyst / BI Analyst. Profile datasets, calculate KPIs with formulas, generate SQL, recommend charts, detect anomalies, and produce evidence tables.',
    sampleQ: ['Profile this dataset and score data quality', 'Show revenue contribution by category', 'Which column has the most missing values?', 'Build a SQL query for monthly growth'],
  },
  {
    id: 'datascience',
    path: '/workspace/data-scientist',
    icon: Brain,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/25',
    glow: 'shadow-purple-400/10',
    ring: 'ring-purple-400/40',
    title: 'Data Scientist',
    tagline: 'ML · Feature Engineering · Evaluation · SHAP · Model Registry · Drift',
    description: 'Train ML models (regression, classification, clustering, forecasting), engineer features, evaluate with full metrics, explain with SHAP-style importance, and monitor drift.',
    tools: ['ML Problem Type Detector', 'Feature Engineering Studio', 'Regression / Classification / Clustering', 'Model Evaluation Dashboard', 'Feature Importance / SHAP', 'Model Registry', 'Drift Monitoring', 'Prediction Report'],
    persona: 'You are a Senior Data Scientist. Identify ML problem type, select features, recommend and simulate ML models, produce evaluation metrics (MAE, RMSE, F1, ROC-AUC), explain feature importance.',
    sampleQ: ['Predict which customers will churn', 'Detect anomalies in this dataset', 'Cluster customers into segments', 'What features drive revenue?'],
  },
];

export default function RoleSelector() {
  const [hovered, setHovered] = useState(null);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-16">
      {/* Logo */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 flex flex-col items-center gap-3">
        <OmniLogo size="md" showText={false} />
        <div className="text-center">
          <h1 className="text-3xl font-black mb-2">OmniData AI Analytics Studio</h1>
          <p className="text-sm text-muted-foreground max-w-lg text-center leading-relaxed">
            An AI analytics team-in-a-box. Choose your professional role to get a purpose-built workspace, AI agent, tools, and structured outputs.
          </p>
        </div>
      </motion.div>

      {/* Role prompt */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
        className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          I want help as a…
        </div>
      </motion.div>

      {/* Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl w-full">
        {ROLES.map((role, i) => {
          const Icon = role.icon;
          const isHovered = hovered === role.id;
          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              onMouseEnter={() => setHovered(role.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => navigate(role.path)}
              className={`glass-card rounded-2xl p-6 border cursor-pointer transition-all duration-300 flex flex-col gap-4 relative overflow-hidden
                ${isHovered ? `${role.border} shadow-lg ${role.glow} scale-[1.02] ring-1 ${role.ring}` : 'border-white/8 hover:border-white/15'}`}
            >
              {/* Glow bg */}
              {isHovered && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`absolute inset-0 ${role.bg} pointer-events-none opacity-30`} />
              )}

              <div className="relative">
                <div className={`w-12 h-12 rounded-xl ${role.bg} border ${role.border} flex items-center justify-center mb-3`}>
                  <Icon className={`w-6 h-6 ${role.color}`} />
                </div>
                <h2 className={`text-lg font-black mb-1 ${role.color}`}>{role.title}</h2>
                <p className="text-xs text-white/40 leading-relaxed mb-3">{role.tagline}</p>
                <p className="text-xs text-white/60 leading-relaxed">{role.description}</p>
              </div>

              {/* Tool list */}
              <div className="flex flex-col gap-1.5 relative">
                {role.tools.slice(0, 4).map(t => (
                  <div key={t} className="flex items-center gap-2 text-xs text-white/50">
                    <CheckCircle2 className={`w-3 h-3 flex-shrink-0 ${role.color}`} />
                    {t}
                  </div>
                ))}
                {role.tools.length > 4 && (
                  <div className={`text-xs ${role.color} mt-1`}>+ {role.tools.length - 4} more tools</div>
                )}
              </div>

              {/* CTA */}
              <div className={`flex items-center gap-1.5 text-xs font-bold mt-auto ${role.color}`}>
                Enter {role.title} Workspace <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Or continue to full workspace */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
        className="mt-10 flex flex-col items-center gap-3">
        <div className="text-xs text-white/25">or</div>
        <button onClick={() => navigate('/workspace')}
          className="flex items-center gap-2 px-5 py-2.5 border border-white/10 rounded-xl text-xs text-white/50 hover:text-white/80 hover:border-white/20 transition-all">
          <Zap className="w-3.5 h-3.5" /> Open Full Workspace (All Tools)
        </button>
      </motion.div>
    </div>
  );
}