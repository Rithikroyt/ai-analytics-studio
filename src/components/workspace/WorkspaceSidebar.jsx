import OmniLogo from '@/components/ui/OmniLogo';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, Upload, Settings2, BarChart3, BookOpen,
  Layers, Terminal, FileText, MessageSquare, Download,
  ChevronLeft, Database, GitCompare, PieChart, Bell, Link2, FlaskConical,
  Users, Filter, Activity, Scissors, TrendingUp, History, Shield, Paintbrush,
  Target, RefreshCw, DollarSign, Zap
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

const sections = [
  { id: 'overview',      label: 'Overview',          icon: LayoutDashboard },
  { id: 'intake',        label: 'Upload Data',        icon: Upload },
  { id: 'quality',       label: 'Quality Studio',     icon: Shield },
  { id: 'prepare',       label: 'Prepare & Profile',  icon: Settings2 },
  { id: 'dataprep',      label: 'Data Prep',          icon: Scissors },
  { id: 'workbook',      label: 'Dashboard',          icon: BarChart3 },
  { id: 'visual',        label: 'Visual Builder',     icon: Paintbrush },
  { id: 'analyst',       label: 'AI Analyst',         icon: MessageSquare },
  { id: 'statistics',    label: 'Statistics',         icon: FlaskConical },
  { id: 'rfm',           label: 'RFM Segments',       icon: Users },
  { id: 'funnel',        label: 'Funnel',             icon: Filter },
  { id: 'contribution',  label: 'Contribution',       icon: Target },
  { id: 'clv',           label: 'CLV Analysis',       icon: DollarSign },
  { id: 'cohort',        label: 'Cohort Retention',   icon: RefreshCw },
  { id: 'reports',       label: 'Reports',            icon: Download },
  { id: 'story',         label: 'Story',              icon: BookOpen },
  { id: 'compare',       label: 'Compare',            icon: GitCompare },
  { id: 'semantic',      label: 'Semantic Model',     icon: Layers },
  { id: 'sql',           label: 'SQL Studio',         icon: Terminal },
  { id: 'docs',          label: 'Docs & Evidence',    icon: FileText },
  { id: 'observability', label: 'Observability',      icon: Activity },
];

export default function WorkspaceSidebar({ collapsed, onToggle }) {
  const { activeSection, setActiveSection, tables } = useWorkspaceStore();

  return (
    <aside
      className={`flex flex-col h-screen transition-all duration-300 flex-shrink-0 ${collapsed ? 'w-[68px]' : 'w-56'}`}
      style={{ background: 'hsl(222,47%,6%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}
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
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5 px-2">
        {sections.map((s) => {
          const isActive = activeSection === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              title={collapsed ? s.label : undefined}
              className={`w-full flex items-center transition-all text-sm group relative ${
                collapsed ? 'justify-center p-0 h-10 rounded-xl' : 'gap-3 px-3 py-2.5 rounded-xl'
              } ${isActive ? 'text-cyan-400' : 'text-white/40 hover:text-white/80'}`}
              style={isActive ? { background: 'rgba(0,229,255,0.08)', boxShadow: collapsed ? '0 0 12px rgba(0,229,255,0.15)' : 'none' } : {}}
            >
              {collapsed ? (
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive ? 'bg-cyan-400/15 shadow-[0_0_12px_rgba(0,229,255,0.3)]' : 'hover:bg-white/8'}`}>
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                </div>
              ) : (
                <>
                  <s.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium truncate flex-1">{s.label}</span>
                  {s.id === 'intake' && tables.length > 0 && (
                    <span className="text-xs bg-cyan-400/10 text-cyan-400 px-1.5 py-0.5 rounded-full">{tables.length}</span>
                  )}
                </>
              )}
            </button>
          );
        })}

        {/* External links */}
        <div className="pt-2 mt-2 border-t border-white/5 space-y-0.5">
          {[
            { to: '/dashboards',   icon: PieChart,    label: 'Dashboards',    color: 'text-cyan-400' },
            { to: '/alerts',       icon: Bell,        label: 'Alerts',        color: 'text-amber-400' },
            { to: '/collaboration',icon: Users,       label: 'Collaborate',   color: 'text-teal-400' },
            { to: '/predictive',   icon: TrendingUp,  label: 'Predictive AI', color: 'text-purple-400' },
            { to: '/forecast-hub', icon: History,     label: 'Forecast Hub',  color: 'text-teal-400' },
            { to: '/workbench',    icon: Zap,         label: 'Workbench',     color: 'text-cyan-400' },
            { to: '/integrations', icon: Link2,       label: 'Integrations',  color: 'text-cyan-400' },
          ].map(link => (
            collapsed ? (
              <Link key={link.to} to={link.to} title={link.label} className="w-full flex justify-center py-1.5">
                <div className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-white/8 transition-all">
                  <link.icon className={`w-4 h-4 ${link.color}`} />
                </div>
              </Link>
            ) : (
              <Link key={link.to} to={link.to}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm text-white/40 hover:text-white/80 hover:bg-white/5">
                <link.icon className={`w-4 h-4 flex-shrink-0 ${link.color}`} />
                <span className="font-medium truncate">{link.label}</span>
              </Link>
            )
          ))}
        </div>
      </nav>

      {/* Collapse toggle */}
      <div className="p-3 border-t border-white/5">
        <button onClick={onToggle} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-full flex items-center justify-center py-2 rounded-xl text-white/25 hover:text-white/60 hover:bg-white/5 transition-all">
          <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          {!collapsed && <span className="text-xs ml-1.5">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}