import { useState } from 'react';
import { useWorkspaceStore } from '@/lib/store';
import { Search, Database, Activity, RotateCcw, ChevronDown, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const sectionTitles = {
  overview:    { label: 'Overview',                sub: 'Workspace home · quick actions & bundles' },
  intake:      { label: 'Data Intake',             sub: 'Upload CSV, XLSX, JSON · live connectors' },
  prepare:     { label: 'Prepare & Profile',       sub: 'Schema inference · quality scoring · type classification' },
  story:       { label: 'Executive Dashboard',     sub: 'AI-powered storytelling · KPIs · anomalies · actions' },
  workbook:    { label: 'Analytics Workbook',      sub: 'Scorecards · trends · distribution · outliers' },
  statistics:  { label: 'Statistical Analysis',    sub: 'Correlation · regression · t-test · CI' },
  semantic:    { label: 'Semantic Model',          sub: 'Business KPI definitions · dimensions · measures' },
  sql:         { label: 'SQL Studio',              sub: 'Natural language → SQL → in-memory execution' },
  docs:        { label: 'Docs & Evidence',         sub: 'Context documents · evidence grounding for AI' },
  analyst:     { label: 'AI Analyst',              sub: 'Grounded Q&A · statistical engine · chart generation' },
  reports:     { label: 'Reports & Export',        sub: 'Board memos · PDF · HTML · CSV bundles' },
  compare:     { label: 'Compare Datasets',        sub: 'Side-by-side delta analysis · AI comparison summary' },
  mapping:     { label: 'Data Mapping',            sub: 'AI schema detection · type suggestion' },
};

export default function WorkspaceTopBar({ onSearch }) {
  const { activeSection, getActiveTable, reset, analysisResults, setActiveSection } = useWorkspaceStore();
  const activeTable = getActiveTable();
  const section = sectionTitles[activeSection] || sectionTitles.overview;
  const [showReset, setShowReset] = useState(false);

  return (
    <div className="h-14 flex items-center px-5 border-b border-white/5 flex-shrink-0 bg-navy-800/30 gap-4">
      {/* Section info */}
      <div className="flex-shrink-0">
        <div className="font-semibold text-sm leading-none">{section.label}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{section.sub}</div>
      </div>

      {/* Divider */}
      <div className="w-px h-6 bg-white/10 flex-shrink-0" />

      {/* Active table badge */}
      {activeTable ? (
        <div className="flex items-center gap-2 text-xs flex-shrink-0">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-400/8 border border-cyan-400/15">
            <Database className="w-3 h-3 text-cyan-400" />
            <span className="text-cyan-400/80 font-mono">{activeTable.name}</span>
            <span className="text-white/25">·</span>
            <span className="text-white/40">{activeTable.rowCount?.toLocaleString()} rows</span>
          </div>
          {activeTable.qualityScore != null && (
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
              activeTable.qualityScore >= 90 ? 'text-green-400 border-green-400/25 bg-green-400/8'
              : activeTable.qualityScore >= 70 ? 'text-amber-400 border-amber-400/25 bg-amber-400/8'
              : 'text-red-400 border-red-400/25 bg-red-400/8'
            }`}>
              {activeTable.qualityScore >= 90 ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
              {activeTable.qualityScore}%
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-shrink-0">
          <Database className="w-3 h-3" /> No dataset loaded
        </div>
      )}

      {/* Analysis status */}
      {analysisResults && (
        <div className="flex items-center gap-1.5 text-xs text-purple-400 flex-shrink-0">
          <Activity className="w-3 h-3 animate-pulse" />
          <span>Analysis ready</span>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-52 flex-shrink-0">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          type="text"
          placeholder="Jump to section…"
          onFocus={e => e.target.select()}
          onChange={e => {
            onSearch(e.target.value);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              const val = e.target.value.toLowerCase();
              const sectionMap = { intake: 'intake', upload: 'intake', prepare: 'prepare', profile: 'prepare', dashboard: 'story', story: 'story', analyst: 'analyst', ai: 'analyst', sql: 'sql', query: 'sql', report: 'reports', export: 'reports', semantic: 'semantic', model: 'semantic', docs: 'docs', evidence: 'docs', workbook: 'workbook', compare: 'compare', overview: 'overview' };
              const match = Object.entries(sectionMap).find(([k]) => val.includes(k));
              if (match) { setActiveSection(match[1]); e.target.value = ''; e.target.blur(); }
            }
          }}
          className="w-full pl-8 pr-3 py-1.5 bg-white/5 border border-white/8 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-cyan-400/30 transition-colors"
        />
      </div>

      {/* Reset button */}
      <div className="relative flex-shrink-0">
        <button
          onClick={() => setShowReset(v => !v)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          title="Reset workspace"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <AnimatePresence>
          {showReset && (
            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
              className="absolute right-0 top-full mt-1 w-52 rounded-xl border border-white/10 bg-navy-800 shadow-xl z-50 p-3">
              <div className="text-xs text-white/50 mb-2">Reset workspace?</div>
              <div className="text-xs text-white/35 mb-3">This clears all tables and analysis data. Saved charts and stories are preserved.</div>
              <div className="flex gap-2">
                <button onClick={() => setShowReset(false)} className="flex-1 py-1.5 rounded-lg border border-white/10 text-xs text-white/50 hover:text-white/80">Cancel</button>
                <button onClick={() => { reset(); setShowReset(false); }} className="flex-1 py-1.5 rounded-lg bg-red-400/15 border border-red-400/25 text-xs text-red-400 hover:bg-red-400/20">Reset</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}