import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ErrorBoundary from '@/components/ErrorBoundary';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
import AnnotationsPanel from '@/components/workspace/AnnotationsPanel';
import NotificationCenter from '@/components/workspace/NotificationCenter';
import { MessageSquare, X } from 'lucide-react';
import WorkspaceTopBar from '@/components/workspace/WorkspaceTopBar';
import OverviewSection from '@/components/workspace/OverviewSection';
import IntakeSection from '@/components/workspace/IntakeSection';
import PrepareSection from '@/components/workspace/PrepareSection';
import StorySection from '@/components/workspace/StorySection';
import WorkbookSection from '@/components/workspace/WorkbookSection';
import SemanticSection from '@/components/workspace/SemanticSection';
import SQLSection from '@/components/workspace/SQLSection';
import DocsSection from '@/components/workspace/DocsSection';
import AnalystSection from '@/components/workspace/AnalystSection';
import ReportsSection from '@/components/workspace/ReportsSection';
import CompareSection from '@/components/workspace/CompareSection';
import StatisticsSection from '@/components/workspace/StatisticsSection';
import DataPrepStudio from '@/components/workspace/DataPrepStudio';
import RFMSection from '@/components/workspace/RFMSection';
import FunnelSection from '@/components/workspace/FunnelSection';
import ObservabilityPanel from '@/components/workspace/ObservabilityPanel';
import DataQualityStudio from '@/components/workspace/DataQualityStudio';
import VisualBuilder from '@/components/workspace/VisualBuilder/index.jsx';
import ContributionAnalysis from '@/components/workspace/ContributionAnalysis';
import CLVSection from '@/components/workspace/CLVSection';
import CohortSection from '@/components/workspace/CohortSection';
import AgentStudioSection from '@/components/workspace/AgentStudioSection';
import DataConnectorSection from '@/components/workspace/DataConnectorSection';
import DataExplorer from '@/components/workspace/DataExplorer';
import RealTimeMonitor from '@/components/workspace/RealTimeMonitor';
import { useWorkspaceStore } from '@/lib/store';

// Wrapper for RealTimeMonitor as a full workspace section
function RealTimeSection() {
  return (
    <div className="p-6 max-w-xl mx-auto space-y-4 pt-8">
      <h2 className="text-xl font-black mb-2">Live Platform Monitor</h2>
      <p className="text-sm text-muted-foreground mb-4">Real-time service health, latency, and SLA tracking.</p>
      <RealTimeMonitor />
    </div>
  );
}

const sectionComponents = {
  overview: OverviewSection,
  intake: IntakeSection,
  quality: DataQualityStudio,
  visual: VisualBuilder,
  prepare: PrepareSection,
  story: StorySection,
  workbook: WorkbookSection,
  semantic: SemanticSection,
  sql: SQLSection,
  docs: DocsSection,
  analyst: AnalystSection,
  reports: ReportsSection,
  compare: CompareSection,
  statistics: StatisticsSection,
  dataprep: DataPrepStudio,
  rfm: RFMSection,
  funnel: FunnelSection,
  observability: ObservabilityPanel,
  contribution: ContributionAnalysis,
  clv: CLVSection,
  cohort: CohortSection,
  agentStudio: AgentStudioSection,
  connectors: DataConnectorSection,
  explorer: DataExplorer,
  realtime: RealTimeSection,
};

export default function Workspace() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const { activeSection } = useWorkspaceStore();

  const ActiveSection = sectionComponents[activeSection] || OverviewSection;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <WorkspaceSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(c => !c)}
      />

      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <WorkspaceTopBar onSearch={() => {}} />

        <main className="flex-1 overflow-auto relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="h-full"
            >
              <ErrorBoundary>
                <ActiveSection />
              </ErrorBoundary>
            </motion.div>
          </AnimatePresence>

          {/* Annotations toggle button */}
          <button
            onClick={() => setShowAnnotations(v => !v)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-3 py-2.5 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl text-xs font-semibold shadow-xl hover:bg-cyan-400/20 transition-all">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">Annotate</span>
          </button>
        </main>
      </div>

      {/* Notification Center */}
      <NotificationCenter />

      {/* Annotations slide-over */}
      <AnimatePresence>
        {showAnnotations && (
          <motion.div
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-80 z-50 bg-background border-l border-white/8 shadow-2xl flex flex-col"
          >
            <button onClick={() => setShowAnnotations(false)}
              className="absolute top-3 right-3 p-1.5 text-white/40 hover:text-white/80 hover:bg-white/5 rounded-lg transition-all z-10">
              <X className="w-4 h-4" />
            </button>
            <AnnotationsPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}