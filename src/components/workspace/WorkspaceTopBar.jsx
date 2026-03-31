import { Search, Database, Sparkles, RotateCcw } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

const sectionTitles = {
  overview: 'Workspace Overview',
  intake: 'Data Intake',
  prepare: 'Prepare & Profile',
  story: 'Story Dashboard',
  workbook: 'Workbook',
  semantic: 'Semantic Model',
  sql: 'SQL Studio',
  docs: 'Docs & Evidence',
  analyst: 'AI Analyst',
  reports: 'Reports & Export',
};

export default function WorkspaceTopBar({ onSearch }) {
  const { activeSection, tables, reset } = useWorkspaceStore();
  const activeTable = useWorkspaceStore(s => s.getActiveTable());

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-white/5 bg-navy-800/60 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-semibold text-foreground">{sectionTitles[activeSection]}</h2>
        {activeTable && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-400/5 border border-cyan-400/15 text-xs text-cyan-400">
            <Database className="w-3 h-3" />
            {activeTable.name}
            <span className="text-muted-foreground ml-1">({activeTable.rowCount?.toLocaleString()} rows)</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workspace..."
            onChange={e => onSearch?.(e.target.value)}
            className="pl-9 pr-4 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 w-48"
          />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-400/5 border border-purple-400/15 text-xs text-purple-400">
          <Sparkles className="w-3 h-3" />
          AI Ready
        </div>
        <button
          onClick={reset}
          title="Reset workspace"
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}