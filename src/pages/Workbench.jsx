/**
 * Analytics Workbench — Unified hub for SQL, Stats, RFM, Funnel, Pivot, Anomaly
 * One page, tabbed — no need to navigate the workspace sidebar
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/lib/store';
import SQLSection from '@/components/workspace/SQLSection';
import StatisticsSection from '@/components/workspace/StatisticsSection';
import RFMSection from '@/components/workspace/RFMSection';
import FunnelSection from '@/components/workspace/FunnelSection';
import DataPrepStudio from '@/components/workspace/DataPrepStudio';
import ContributionAnalysis from '@/components/workspace/ContributionAnalysis';
import PythonScriptLab from '@/components/workbench/PythonScriptLab';
import {
  Terminal, FlaskConical, Users, Filter, Scissors, Target,
  ChevronLeft, Database, Zap, Code2
} from 'lucide-react';
import UnifiedExportButton from '@/components/export/UnifiedExportButton';

const TABS = [
  { id: 'sql',          label: 'SQL Lab',            icon: Terminal,      color: 'text-cyan-400',   desc: 'NL→SQL, templates, execution' },
  { id: 'stats',        label: 'Statistics Lab',     icon: FlaskConical,  color: 'text-blue-400',   desc: 'Distribution, correlation, outliers' },
  { id: 'rfm',          label: 'RFM Analysis',       icon: Users,         color: 'text-orange-400', desc: 'Customer segmentation' },
  { id: 'funnel',       label: 'Funnel Analysis',    icon: Filter,        color: 'text-teal-400',   desc: 'Conversion & drop-off' },
  { id: 'dataprep',     label: 'Data Prep',          icon: Scissors,      color: 'text-amber-400',  desc: 'Clean, normalize, pivot, join' },
  { id: 'contribution', label: 'Contribution',       icon: Target,        color: 'text-purple-400', desc: 'KPI driver & segment attribution' },
  { id: 'python',       label: 'Python Lab',         icon: Code2,         color: 'text-blue-400',   desc: 'pandas-style script executor' },
];

const SECTION_MAP = {
  sql: SQLSection,
  stats: StatisticsSection,
  rfm: RFMSection,
  funnel: FunnelSection,
  dataprep: DataPrepStudio,
  contribution: ContributionAnalysis,
  python: PythonScriptLab,
};

export default function Workbench() {
  const [activeTab, setActiveTab] = useState('sql');
  const { tables } = useWorkspaceStore();
  const hasData = tables.length > 0;

  const ActiveSection = SECTION_MAP[activeTab] || SQLSection;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 flex-shrink-0 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Zap className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Analytics Workbench</h1>
              <p className="text-xs text-muted-foreground">SQL · Statistics · RFM · Funnel · Data Prep · Contribution · Python Lab</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <UnifiedExportButton />
            <span className="text-xs text-white/30 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5" />
              {hasData ? `${tables.length} dataset${tables.length > 1 ? 's' : ''} loaded` : 'No data — upload in Workspace'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-white/5 px-6 flex-shrink-0 overflow-x-auto bg-white/[0.005]">
        <div className="max-w-7xl mx-auto flex gap-0.5 pt-2">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-medium transition-all whitespace-nowrap border-b-2 ${
                activeTab === tab.id
                  ? 'bg-white/8 border-cyan-400 text-white'
                  : 'border-transparent text-white/35 hover:text-white/65 hover:bg-white/4'
              }`}>
              <tab.icon className={`w-3.5 h-3.5 ${activeTab === tab.id ? tab.color : ''}`} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.12 }} className="h-full">
          <ActiveSection />
        </motion.div>
      </div>
    </div>
  );
}