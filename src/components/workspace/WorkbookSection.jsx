import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import SimpleChart from '@/components/charts/SimpleChart';
import SimpleBar from '@/components/charts/SimpleBar';
import { Database, BarChart3, LineChart, PieChart, Grid3X3, ScatterChart, TableIcon } from 'lucide-react';

const tabs = [
  { id: 'scorecards', label: 'Scorecards', icon: Grid3X3 },
  { id: 'trends', label: 'Trends', icon: LineChart },
  { id: 'breakdown', label: 'Breakdown', icon: BarChart3 },
  { id: 'distribution', label: 'Distribution', icon: PieChart },
  { id: 'detail', label: 'Detail Table', icon: TableIcon },
];

export default function WorkbookSection() {
  const [activeTab, setActiveTab] = useState('scorecards');
  const { analysisResults, getActiveTable, setActiveSection } = useWorkspaceStore();
  const table = getActiveTable();

  if (!analysisResults || !table) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm mb-4">Load data and run analysis to open the workbook.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-white/5 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-cyan-400/10 text-cyan-400 border border-cyan-400/20'
                : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {activeTab === 'scorecards' && <ScorecardsTab results={analysisResults} table={table} />}
          {activeTab === 'trends' && <TrendsTab results={analysisResults} />}
          {activeTab === 'breakdown' && <BreakdownTab results={analysisResults} />}
          {activeTab === 'distribution' && <DistributionTab table={table} />}
          {activeTab === 'detail' && <DetailTab table={table} />}
        </motion.div>
      </div>
    </div>
  );
}

function ScorecardsTab({ results, table }) {
  const { primaryLabel, totalValue, secondLabel, secondValue, growthRate, breakdownData } = results;
  const fmt = (v) => v >= 1e6 ? `${(v/1e6).toFixed(1)}M` : v >= 1e3 ? `${(v/1e3).toFixed(0)}K` : v?.toLocaleString?.();

  const stats = [
    { label: primaryLabel || 'Total', value: fmt(totalValue), sub: growthRate != null ? `${Number(growthRate) > 0 ? '+' : ''}${growthRate}% growth` : '', color: 'text-cyan-400' },
    { label: 'Records', value: fmt(table.rowCount), sub: `${table.columns?.length} columns`, color: 'text-teal-400' },
    { label: 'Quality', value: `${table.qualityScore}%`, sub: table.qualityScore >= 90 ? 'Excellent' : 'Good', color: 'text-green-400' },
    ...(secondLabel ? [{ label: secondLabel, value: fmt(secondValue), sub: '', color: 'text-blue-400' }] : []),
    ...(breakdownData.length > 0 ? [{ label: 'Top Segment', value: breakdownData[0]?.name, sub: fmt(breakdownData[0]?.value), color: 'text-purple-400' }] : []),
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {stats.map((s) => (
        <div key={s.label} className="glass-card rounded-2xl p-5 border border-white/5 text-center">
          <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">{s.label}</div>
          <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
          {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function TrendsTab({ results }) {
  const combined = [
    ...results.trendData,
    ...results.forecastData,
  ];
  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <div className="font-semibold mb-1">{results.primaryLabel} Over Time</div>
        <div className="text-xs text-muted-foreground mb-4">{results.canForecast ? 'Actual + 6-month AI forecast' : 'Historical trend'}</div>
        <SimpleChart data={combined} height={300} />
      </div>
    </div>
  );
}

function BreakdownTab({ results }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <div className="font-semibold mb-1">Segment Contribution</div>
        <div className="text-xs text-muted-foreground mb-4">Share of total by segment</div>
        <SimpleBar data={results.breakdownData} height={300} />
      </div>
      <div className="glass-card rounded-2xl p-6 border border-white/5">
        <div className="font-semibold mb-2">Segment Details</div>
        <div className="space-y-2 overflow-auto max-h-[280px]">
          {results.breakdownData.map((d, i) => {
            const total = results.breakdownData.reduce((s, x) => s + x.value, 0);
            const pct = total > 0 ? Math.round(d.value / total * 100) : 0;
            return (
              <div key={d.name} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div className="text-sm">{d.name}</div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground font-mono">{d.value?.toLocaleString()}</span>
                  <span className="text-xs bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DistributionTab({ table }) {
  const numericCols = table.columns?.filter(c => c.type === 'numeric') || [];
  if (!numericCols.length) return <div className="text-muted-foreground text-sm">No numeric columns.</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {numericCols.slice(0, 6).map(col => (
        <div key={col.name} className="glass-card rounded-2xl p-5 border border-white/5">
          <div className="font-mono text-sm font-semibold mb-3">{col.name}</div>
          <div className="space-y-2 text-xs">
            {[['Min', col.min], ['Max', col.max], ['Mean', col.mean], ['Unique', col.uniqueCount]].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-muted-foreground">{l}</span>
                <span className="font-mono">{v?.toLocaleString?.() ?? v}</span>
              </div>
            ))}
          </div>
          {/* Mini inline chart */}
          <div className="mt-3 flex items-end gap-0.5 h-12">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="flex-1 bg-cyan-400/30 rounded-sm" style={{ height: `${20 + Math.random() * 80}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailTab({ table }) {
  const [page, setPage] = useState(0);
  const pageSize = 20;
  const rows = table.rows || [];
  const cols = table.columns || [];
  const totalPages = Math.ceil(rows.length / pageSize);
  const visibleRows = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{rows.length.toLocaleString()} rows · {cols.length} columns</div>
        <div className="flex items-center gap-2 text-xs">
          <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="px-2 py-1 rounded bg-white/5 disabled:opacity-30">←</button>
          <span className="text-muted-foreground">Page {page + 1} / {totalPages}</span>
          <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-2 py-1 rounded bg-white/5 disabled:opacity-30">→</button>
        </div>
      </div>
      <div className="overflow-auto rounded-xl border border-white/5 max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="sticky top-0">
            <tr className="bg-navy-700 border-b border-white/5">
              {cols.map(c => (
                <th key={c.name} className="px-3 py-2.5 text-left text-muted-foreground font-medium whitespace-nowrap">{c.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/2 transition-colors">
                {cols.map(c => (
                  <td key={c.name} className="px-3 py-2 font-mono text-foreground/80 whitespace-nowrap">
                    {String(row[c.name] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}