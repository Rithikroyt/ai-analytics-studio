import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import WorkspaceSidebar from '@/components/workspace/WorkspaceSidebar';
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
import { useWorkspaceStore } from '@/lib/store';

const sectionComponents = {
  overview: OverviewSection,
  intake: IntakeSection,
  prepare: PrepareSection,
  story: StorySection,
  workbook: WorkbookSection,
  semantic: SemanticSection,
  sql: SQLSection,
  docs: DocsSection,
  analyst: AnalystSection,
  reports: ReportsSection,
};

export default function Workspace() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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

        <main className="flex-1 overflow-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="h-full"
            >
              <ActiveSection />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}