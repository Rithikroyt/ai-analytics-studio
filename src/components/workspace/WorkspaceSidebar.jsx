import { motion } from 'framer-motion';
import OmniLogo from '@/components/ui/OmniLogo';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Settings2, BarChart3, BookOpen,
  Layers, Terminal, FileText, MessageSquare, Download,
  ChevronLeft, Database, GitCompare, PieChart, Bell, Link2, Wand2
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

const sections = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'intake', label: 'Intake', icon: Upload },
  { id: 'prepare', label: 'Prepare', icon: Settings2 },
  { id: 'story', label: 'Story', icon: BarChart3 },
  { id: 'workbook', label: 'Workbook', icon: BookOpen },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'semantic', label: 'Semantic Model', icon: Layers },
  { id: 'sql', label: 'SQL Studio', icon: Terminal },
  { id: 'docs', label: 'Docs & Evidence', icon: FileText },
  { id: 'analyst', label: 'AI Analyst', icon: MessageSquare },
  { id: 'reports', label: 'Reports & Export', icon: Download },
];

export default function WorkspaceSidebar({ collapsed, onToggle }) {
  const { activeSection, setActiveSection, tables, savedCharts } = useWorkspaceStore();

  return (
    <aside
      className={`workspace-rail flex flex-col h-screen transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-16' : 'w-56'}`}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-white/5 flex-shrink-0">
        {collapsed ? (
          <Link to="/"><div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center"><div className="w-3 h-3 rounded-full bg-cyan-400" /></div></Link>
        ) : (
          <Link to="/"><OmniLogo size="sm" showText={true} /></Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-1 px-2">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm ${
                isActive
                  ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
              }`}
            >
              <s.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="font-medium truncate">{s.label}</span>}
              {!collapsed && s.id === 'intake' && tables.length > 0 && (
                <span className="ml-auto text-xs bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded-full">
                  {tables.length}
                </span>
              )}
            </button>
          );
        })}

        {/* Bottom links */}
        <div className="pt-2 mt-2 border-t border-white/5 space-y-1">
          <Link to="/dashboards"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <PieChart className="w-4 h-4 flex-shrink-0 text-cyan-400" />
            {!collapsed && (
              <>
                <span className="font-medium truncate">Dashboards</span>
                {savedCharts.length > 0 && (
                  <span className="ml-auto text-xs bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded-full">{savedCharts.length}</span>
                )}
              </>
            )}
          </Link>
          <Link to="/story-builder"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <BookOpen className="w-4 h-4 flex-shrink-0 text-purple-400" />
            {!collapsed && <span className="font-medium truncate">Story Builder</span>}
          </Link>
          <Link to="/alerts"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <Bell className="w-4 h-4 flex-shrink-0 text-amber-400" />
            {!collapsed && <span className="font-medium truncate">Alerts</span>}
          </Link>
          <Link to="/integrations"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <Link2 className="w-4 h-4 flex-shrink-0 text-cyan-400" />
            {!collapsed && <span className="font-medium truncate">Integrations</span>}
          </Link>
          <Link to="/data-mapping"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <Wand2 className="w-4 h-4 flex-shrink-0 text-purple-400" />
            {!collapsed && <span className="font-medium truncate">Data Mapping</span>}
          </Link>
          <Link to="/reports"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-muted-foreground hover:text-foreground hover:bg-white/5">
            <FileText className="w-4 h-4 flex-shrink-0 text-blue-400" />
            {!collapsed && <span className="font-medium truncate">Reports</span>}
          </Link>
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-white/5">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all text-xs"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}