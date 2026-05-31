import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, BarChart2, Shield, Wand2, GitBranch, CheckCircle2, History, Download, Loader2, AlertTriangle, Info, ChevronRight, Database, Sparkles, X, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { DEMO_DATASETS, generateDemoData } from '@/lib/demoDatasets';
import { profileDataset, calculateQualityScore, calculateReadinessScore, applyCleaningStep } from '@/lib/analyticsEngine';
import { base44 } from '@/api/base44Client';

const TABS = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'profile', label: 'Profile', icon: BarChart2 },
  { id: 'quality', label: 'Quality Score', icon: Shield },
  { id: 'clean', label: 'Clean', icon: Wand2 },
  { id: 'transform', label: 'Transform', icon: GitBranch },
  { id: 'validate', label: 'Validate', icon: CheckCircle2 },
  { id: 'versions', label: 'Versions', icon: History },
  { id: 'export', label: 'Export', icon: Download },
];

const CLEANING_ACTIONS = [
  { action: 'remove_duplicates', label: 'Remove Duplicate Rows', risk: 'low', desc: 'Removes fully duplicate rows from the dataset' },
  { action: 'remove_blank_rows', label: 'Remove Blank Rows', risk: 'low', desc: 'Removes rows where all values are empty' },
  { action: 'trim_whitespace', label: 'Trim Whitespace', risk: 'low', desc: 'Strips leading/trailing spaces from all text cells' },
  { action: 'standardize_column_names', label: 'Standardize Column Names', risk: 'low', desc: 'Converts headers to snake_case' },
  { action: 'fill_missing_mean', label: 'Fill Missing → Mean', risk: 'medium', desc: 'Fills missing numeric values with column mean', needsColumn: true },
  { action: 'fill_missing_zero', label: 'Fill Missing → Zero', risk: 'medium', desc: 'Fills missing numeric values with 0', needsColumn: true },
  { action: 'fill_missing_unknown', label: 'Fill Missing → Unknown', risk: 'low', desc: 'Fills missing text values with "Unknown"', needsColumn: true },
  { action: 'convert_currency_to_numeric', label: 'Convert $Currency → Number', risk: 'low', desc: 'Strips $ and , from currency fields', needsColumn: true },
  { action: 'convert_percentage_to_decimal', label: 'Convert %Percent → Decimal', risk: 'low', desc: 'Converts 25% → 0.25', needsColumn: true },
  { action: 'uppercase_to_lowercase', label: 'Uppercase → Lowercase', risk: 'low', desc: 'Converts text to lowercase', needsColumn: true },
  { action: 'add_calculated_column', label: 'Add Calculated Column', risk: 'medium', desc: 'Create a new column from formula', needsColumn: true, needsFormula: true },
];

const TRANSFORM_ACTIONS = [
  { id: 'profit', label: 'Add Profit Column', formula: 'revenue - cost', newColumn: 'profit', desc: 'profit = revenue - cost' },
  { id: 'margin', label: 'Add Gross Margin %', formula: 'revenue > 0 ? ((revenue - cost) / revenue * 100) : 0', newColumn: 'gross_margin_pct', desc: 'Gross Margin %' },
  { id: 'aov', label: 'Add Avg Order Value', formula: 'revenue / quantity', newColumn: 'avg_order_value', desc: 'revenue / quantity' },
  { id: 'days_late', label: 'Add Days Late Indicator', formula: 'lead_time_days > 14 ? 1 : 0', newColumn: 'is_late', desc: 'Flags orders > 14 days' },
];

function ScoreGauge({ score, label, size = 'md' }) {
  const color = score >= 90 ? 'text-green-400' : score >= 80 ? 'text-cyan-400' : score >= 70 ? 'text-yellow-400' : score >= 60 ? 'text-orange-400' : 'text-red-400';
  const bg = score >= 90 ? 'bg-green-400/10 border-green-400/25' : score >= 80 ? 'bg-cyan-400/10 border-cyan-400/25' : score >= 70 ? 'bg-yellow-400/10 border-yellow-400/25' : score >= 60 ? 'bg-orange-400/10 border-orange-400/25' : 'bg-red-400/10 border-red-400/25';
  return (
    <div className={`rounded-2xl border p-4 text-center ${bg}`}>
      <div className={`text-3xl font-black font-mono ${color}`}>{score}</div>
      <div className="text-xs text-white/50 mt-1">{label}</div>
    </div>
  );
}

function QualityBar({ label, value, color = 'cyan' }) {
  const colors = { cyan: 'bg-cyan-400', green: 'bg-green-400', yellow: 'bg-yellow-400', orange: 'bg-orange-400', red: 'bg-red-400', purple: 'bg-purple-400' };
  return (
    <div className="flex items-center gap-3">
      <div className="text-xs text-white/50 w-28 flex-shrink-0">{label}</div>
      <div className="flex-1 bg-white/5 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-700 ${colors[color] || 'bg-cyan-400'}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <div className="text-xs font-mono text-white/70 w-10 text-right">{value}%</div>
    </div>
  );
}

export default function DataStudio() {
  const [activeTab, setActiveTab] = useState('upload');
  const [rows, setRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [columnProfiles, setColumnProfiles] = useState([]);
  const [qualityScore, setQualityScore] = useState(null);
  const [readinessScore, setReadinessScore] = useState(null);
  const [cleaningSteps, setCleaningSteps] = useState([]);
  const [versions, setVersions] = useState([]);
  const [datasetName, setDatasetName] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedColumn, setSelectedColumn] = useState('');
  const [formulaInput, setFormulaInput] = useState('');
  const [newColName, setNewColName] = useState('');
  const [cleaningHistory, setCleaningHistory] = useState([]);
  const fileRef = useRef();

  const processRows = useCallback((data, name) => {
    if (!data || data.length === 0) return;
    const cols = Object.keys(data[0]).filter(k => k && k.trim());
    setRows(data);
    setColumns(cols);
    setDatasetName(name);
    setVersions([{ id: 1, name: 'v1 Raw', type: 'raw', rows: data.length, cols: cols.length, ts: new Date().toISOString() }]);
    const profiles = profileDataset(data, cols);
    setColumnProfiles(profiles);
    const qs = calculateQualityScore(data, profiles);
    setQualityScore(qs);
    setReadinessScore(calculateReadinessScore(profiles, qs));
    setActiveTab('profile');
  }, []);

  const handleFile = (file) => {
    if (!file) return;
    setLoading(true);
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => { processRows(res.data, file.name); setLoading(false); }
      });
    } else if (ext === 'xlsx' || ext === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
        processRows(data, file.name);
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    } else {
      setLoading(false);
    }
  };

  const loadDemo = (dataset) => {
    setLoading(true);
    setTimeout(() => {
      const data = generateDemoData(dataset.id);
      processRows(data, dataset.name);
      setLoading(false);
    }, 600);
  };

  const applyStep = (stepConfig) => {
    const { rows: newRows, affected } = applyCleaningStep(rows, stepConfig);
    setRows(newRows);
    const cols = Object.keys(newRows[0] || {}).filter(k => k && k.trim());
    setColumns(cols);
    const profiles = profileDataset(newRows, cols);
    setColumnProfiles(profiles);
    const qs = calculateQualityScore(newRows, profiles);
    setQualityScore(qs);
    setReadinessScore(calculateReadinessScore(profiles, qs));
    setCleaningHistory(h => [...h, { ...stepConfig, affected, ts: new Date().toISOString() }]);
    const newVersion = { id: versions.length + 1, name: `v${versions.length + 1} Cleaned`, type: 'cleaned', rows: newRows.length, cols: cols.length, ts: new Date().toISOString() };
    setVersions(v => [...v, newVersion]);
  };

  const exportCSV = () => {
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${datasetName || 'dataset'}_cleaned.csv`; a.click();
  };

  const metricCols = columnProfiles.filter(cp => cp.isKpiCandidate);
  const dimCols = columnProfiles.filter(cp => cp.semanticRole === 'dimension');
  const dateCols = columnProfiles.filter(cp => cp.isDateCandidate);
  const geoCols = columnProfiles.filter(cp => cp.isGeoCandidate);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/6 px-6 py-4 bg-navy-800/50 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Database className="w-4.5 h-4.5 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-base font-bold">Data Studio</h1>
              {datasetName && <p className="text-xs text-cyan-400 font-mono">{datasetName} · {rows.length.toLocaleString()} rows · {columns.length} cols</p>}
            </div>
          </div>
          {qualityScore && (
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold border ${qualityScore.score >= 80 ? 'bg-green-400/10 border-green-400/25 text-green-400' : qualityScore.score >= 60 ? 'bg-yellow-400/10 border-yellow-400/25 text-yellow-400' : 'bg-red-400/10 border-red-400/25 text-red-400'}`}>
                Quality: {qualityScore.score}/100
              </div>
              <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-400/10 border border-purple-400/25 text-purple-400">
                Ready: {readinessScore?.score}/100
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto mt-3 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-cyan-400/15 text-cyan-400 border border-cyan-400/25' : 'text-white/40 hover:text-white/70 hover:bg-white/5'}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ── UPLOAD TAB ── */}
        {activeTab === 'upload' && (
          <div className="space-y-6">
            <div
              onDrop={e => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-white/15 rounded-2xl p-12 text-center cursor-pointer hover:border-cyan-400/40 hover:bg-cyan-400/3 transition-all"
            >
              {loading ? <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-3" /> : <Upload className="w-10 h-10 text-white/25 mx-auto mb-3" />}
              <div className="font-semibold text-white/60 mb-1">{loading ? 'Processing dataset…' : 'Drop file here or click to browse'}</div>
              <div className="text-xs text-white/30">CSV · XLSX · JSON supported</div>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.json" className="hidden" onChange={e => handleFile(e.target.files[0])} />
            </div>

            <div>
              <div className="text-sm font-bold text-white/70 mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-cyan-400" /> Built-in Demo Datasets</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {DEMO_DATASETS.map(ds => (
                  <button key={ds.id} onClick={() => loadDemo(ds)}
                    className="glass-card rounded-xl p-4 border border-white/8 hover:border-cyan-400/25 hover:bg-cyan-400/5 transition-all text-left group">
                    <div className="text-2xl mb-2">{ds.icon}</div>
                    <div className="text-xs font-bold text-white/80 mb-1">{ds.name}</div>
                    <div className="text-xs text-white/35 leading-relaxed">{ds.rowCount.toLocaleString()} rows · {ds.domain}</div>
                    <div className="text-xs text-cyan-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Load Dataset →</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="space-y-4">
            {!columnProfiles.length ? (
              <div className="text-center py-20 text-white/30">Upload a dataset first</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: 'Total Rows', value: rows.length.toLocaleString(), color: 'text-cyan-400' },
                    { label: 'Columns', value: columns.length, color: 'text-purple-400' },
                    { label: 'Metric Columns', value: metricCols.length, color: 'text-green-400' },
                    { label: 'Dimension Columns', value: dimCols.length, color: 'text-amber-400' },
                    { label: 'Date Columns', value: dateCols.length, color: 'text-pink-400' },
                    { label: 'Geo Columns', value: geoCols.length, color: 'text-teal-400' },
                    { label: 'Total Missing', value: columnProfiles.reduce((a, cp) => a + cp.missingCount, 0).toLocaleString(), color: 'text-red-400' },
                    { label: 'Outlier Flags', value: columnProfiles.reduce((a, cp) => a + cp.outlierCount, 0), color: 'text-orange-400' },
                  ].map(stat => (
                    <div key={stat.label} className="glass-card rounded-xl p-3 border border-white/8">
                      <div className={`text-xl font-black font-mono ${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-white/40 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/8">
                        {['Column', 'Type', 'Role', 'Missing', 'Unique', 'Min', 'Max', 'Outliers', 'Warnings'].map(h => (
                          <th key={h} className="text-left py-2 px-2 text-white/40 font-semibold whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {columnProfiles.map((cp, i) => (
                        <tr key={i} className="border-b border-white/4 hover:bg-white/2">
                          <td className="py-2 px-2 font-mono font-semibold text-white/80 max-w-[140px] truncate">{cp.columnName}</td>
                          <td className="py-2 px-2"><span className="px-1.5 py-0.5 rounded bg-cyan-400/10 text-cyan-400">{cp.detectedType}</span></td>
                          <td className="py-2 px-2"><span className={`px-1.5 py-0.5 rounded ${cp.semanticRole === 'metric' ? 'bg-green-400/10 text-green-400' : cp.semanticRole === 'dimension' ? 'bg-purple-400/10 text-purple-400' : cp.semanticRole === 'date' ? 'bg-pink-400/10 text-pink-400' : cp.semanticRole === 'geo' ? 'bg-teal-400/10 text-teal-400' : 'bg-white/5 text-white/40'}`}>{cp.semanticRole}</span></td>
                          <td className="py-2 px-2 text-white/60">{cp.missingCount > 0 ? <span className="text-orange-400">{(cp.missingRate * 100).toFixed(1)}%</span> : <span className="text-green-400">0%</span>}</td>
                          <td className="py-2 px-2 text-white/60">{cp.uniqueCount}</td>
                          <td className="py-2 px-2 font-mono text-white/50 max-w-[80px] truncate">{cp.min || '–'}</td>
                          <td className="py-2 px-2 font-mono text-white/50 max-w-[80px] truncate">{cp.max || '–'}</td>
                          <td className="py-2 px-2">{cp.outlierCount > 0 ? <span className="text-red-400">{cp.outlierCount}</span> : <span className="text-white/30">0</span>}</td>
                          <td className="py-2 px-2 max-w-[180px]">
                            {cp.warnings.length > 0 ? <span className="text-yellow-400 text-xs">{cp.warnings[0]}</span> : <span className="text-green-400">✓ Clean</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setActiveTab('quality')} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-400/15">
                    View Quality Score <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── QUALITY SCORE TAB ── */}
        {activeTab === 'quality' && (
          <div className="space-y-6">
            {!qualityScore ? (
              <div className="text-center py-20 text-white/30">Upload a dataset first</div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ScoreGauge score={qualityScore.score} label="Overall Quality Score" />
                  <ScoreGauge score={readinessScore?.score || 0} label="Analysis Readiness Score" />
                  <div className="glass-card rounded-2xl border border-white/8 p-4">
                    <div className={`text-2xl font-black mb-1 ${qualityScore.score >= 90 ? 'text-green-400' : qualityScore.score >= 80 ? 'text-cyan-400' : qualityScore.score >= 70 ? 'text-yellow-400' : qualityScore.score >= 60 ? 'text-orange-400' : 'text-red-400'}`}>
                      {qualityScore.label}
                    </div>
                    <div className="text-xs text-white/40">{qualityScore.duplicateRows} duplicate rows · {qualityScore.missingCells} missing cells</div>
                    <div className="mt-2 text-xs text-white/30 leading-relaxed">
                      {qualityScore.score >= 80 ? 'Dataset is ready for analysis and AI agents.' : qualityScore.score >= 60 ? 'Dataset needs cleaning before AI analysis.' : 'Critical issues detected. Clean dataset before proceeding.'}
                    </div>
                  </div>
                </div>

                <div className="glass-card rounded-2xl border border-white/8 p-5 space-y-3">
                  <div className="text-sm font-bold mb-4">Quality Dimension Breakdown</div>
                  <QualityBar label="Completeness" value={qualityScore.completeness} color="cyan" />
                  <QualityBar label="Validity" value={qualityScore.validity} color="green" />
                  <QualityBar label="Uniqueness" value={qualityScore.uniqueness} color="purple" />
                  <QualityBar label="Consistency" value={qualityScore.consistency} color="amber" />
                  <QualityBar label="Timeliness" value={qualityScore.timeliness} color="pink" />
                  <QualityBar label="Business Rules" value={qualityScore.businessRuleScore} color="teal" />
                </div>

                <div className="glass-card rounded-2xl border border-white/8 p-5">
                  <div className="text-sm font-bold mb-3">Readiness Breakdown</div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: 'KPI Readiness', value: readinessScore?.kpiReadiness },
                      { label: 'Time Series', value: readinessScore?.timeSeriesReadiness },
                      { label: 'Visualization', value: readinessScore?.vizReadiness },
                      { label: 'AI Agent Ready', value: readinessScore?.agentReadiness },
                      { label: 'Governance', value: readinessScore?.governanceReadiness },
                    ].map(item => (
                      <div key={item.label} className="bg-white/3 rounded-xl p-3">
                        <div className="text-xs text-white/40 mb-1">{item.label}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-white/5 rounded-full h-1.5">
                            <div className="bg-cyan-400 h-1.5 rounded-full" style={{ width: `${item.value}%` }} />
                          </div>
                          <span className="text-xs font-mono text-cyan-400">{item.value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {readinessScore?.hasMetric && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-xs">✓ Metric fields</span>}
                    {readinessScore?.hasDimension && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-xs">✓ Dimension fields</span>}
                    {readinessScore?.hasDate && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-xs">✓ Date field</span>}
                    {readinessScore?.hasId && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-xs">✓ ID field</span>}
                    {readinessScore?.hasGeo && <span className="px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-xs">✓ Geo field</span>}
                    {!readinessScore?.hasDate && <span className="px-2 py-0.5 rounded-full bg-orange-400/10 text-orange-400 text-xs">⚠ No date field</span>}
                    {!readinessScore?.hasMetric && <span className="px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 text-xs">✗ No numeric metrics</span>}
                  </div>
                </div>

                {/* Formula */}
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-2 font-mono">FORMULA</div>
                  <div className="font-mono text-xs text-cyan-400/80 leading-relaxed">
                    Quality Score = 0.25×Completeness + 0.20×Validity + 0.20×Uniqueness + 0.15×Consistency + 0.10×Timeliness + 0.10×Business Rules<br/>
                    Readiness Score = 0.30×Quality + 0.20×KPI + 0.15×TimeSeries + 0.15×Visualization + 0.10×Agent + 0.10×Governance
                  </div>
                </div>

                <button onClick={() => setActiveTab('clean')} className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400 text-navy-900 rounded-xl text-xs font-bold hover:bg-cyan-300">
                  <Wand2 className="w-3.5 h-3.5" /> Clean Dataset →
                </button>
              </>
            )}
          </div>
        )}

        {/* ── CLEAN TAB ── */}
        {activeTab === 'clean' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="text-sm font-bold">Cleaning Actions</div>
              {CLEANING_ACTIONS.map(action => (
                <button key={action.action}
                  onClick={() => { setSelectedAction(action); setSelectedColumn(''); setFormulaInput(''); setNewColName(''); }}
                  className={`w-full text-left p-3 rounded-xl border transition-all ${selectedAction?.action === action.action ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-white/8 hover:border-white/15'}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-semibold">{action.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${action.risk === 'low' ? 'bg-green-400/10 text-green-400' : 'bg-yellow-400/10 text-yellow-400'}`}>{action.risk} risk</span>
                  </div>
                  <div className="text-xs text-white/35">{action.desc}</div>
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {selectedAction ? (
                <div className="glass-card rounded-2xl border border-cyan-400/20 p-5 space-y-4">
                  <div className="font-bold text-sm">{selectedAction.label}</div>
                  <div className="text-xs text-white/50">{selectedAction.desc}</div>

                  {selectedAction.needsColumn && (
                    <select value={selectedColumn} onChange={e => setSelectedColumn(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                      <option value="">Select column…</option>
                      {columns.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  )}

                  {selectedAction.needsFormula && (
                    <>
                      <input value={formulaInput} onChange={e => setFormulaInput(e.target.value)}
                        placeholder="Formula e.g. revenue - cost" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
                      <input value={newColName} onChange={e => setNewColName(e.target.value)}
                        placeholder="New column name" className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
                    </>
                  )}

                  {!rows.length ? (
                    <div className="text-xs text-red-400">Upload a dataset first</div>
                  ) : (
                    <button onClick={() => {
                      const step = { action: selectedAction.action, column: selectedColumn, formula: formulaInput, newColumn: newColName };
                      applyStep(step);
                      setSelectedAction(null);
                    }} className="w-full py-2.5 bg-cyan-400 text-navy-900 rounded-xl text-sm font-bold hover:bg-cyan-300">
                      Apply Cleaning Step
                    </button>
                  )}
                </div>
              ) : (
                <div className="glass-card rounded-2xl border border-white/8 p-8 text-center text-white/25">
                  <Wand2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  Select an action to apply
                </div>
              )}

              {cleaningHistory.length > 0 && (
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-2">Cleaning History</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {cleaningHistory.map((step, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-xs text-white/60">{step.action.replace(/_/g, ' ')}{step.column ? ` → ${step.column}` : ''}</span>
                        <span className="text-xs text-green-400">{step.affected} rows</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Python */}
              {cleaningHistory.length > 0 && (
                <div className="glass-card rounded-xl border border-white/8 p-4">
                  <div className="text-xs font-bold text-white/50 mb-2 font-mono">GENERATED PYTHON</div>
                  <pre className="font-mono text-xs text-green-400/80 whitespace-pre-wrap leading-relaxed">
{`import pandas as pd\ndf = pd.read_csv("${datasetName || 'dataset.csv'}")\n\n`}
{cleaningHistory.map(step => {
  switch (step.action) {
    case 'remove_duplicates': return 'df = df.drop_duplicates()\n';
    case 'remove_blank_rows': return 'df = df.dropna(how="all")\n';
    case 'trim_whitespace': return 'df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)\n';
    case 'standardize_column_names': return 'df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")\n';
    case 'fill_missing_mean': return `df["${step.column}"].fillna(df["${step.column}"].mean(), inplace=True)\n`;
    case 'fill_missing_zero': return `df["${step.column}"].fillna(0, inplace=True)\n`;
    case 'fill_missing_unknown': return `df["${step.column}"].fillna("Unknown", inplace=True)\n`;
    case 'convert_currency_to_numeric': return `df["${step.column}"] = pd.to_numeric(df["${step.column}"].str.replace(r'[$,]', '', regex=True))\n`;
    case 'convert_percentage_to_decimal': return `df["${step.column}"] = df["${step.column}"].str.replace('%', '').astype(float) / 100\n`;
    case 'add_calculated_column': return `df["${step.newColumn}"] = ${step.formula}\n`;
    default: return '';
  }
}).join('')}
{`\ndf.to_csv("cleaned_${datasetName || 'dataset.csv'}", index=False)`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TRANSFORM TAB ── */}
        {activeTab === 'transform' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Quick Transformations</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TRANSFORM_ACTIONS.map(t => (
                <div key={t.id} className="glass-card rounded-xl border border-white/8 p-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold mb-0.5">{t.label}</div>
                    <div className="font-mono text-xs text-white/35">{t.desc}</div>
                  </div>
                  <button onClick={() => {
                    if (!rows.length) return;
                    applyStep({ action: 'add_calculated_column', formula: t.formula, newColumn: t.newColumn });
                  }} className="px-3 py-1.5 bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 rounded-lg text-xs font-semibold hover:bg-cyan-400/15">
                    Apply
                  </button>
                </div>
              ))}
            </div>

            <div className="glass-card rounded-xl border border-white/8 p-4">
              <div className="text-sm font-bold mb-3">Custom Calculated Column</div>
              <div className="flex gap-2">
                <input placeholder="Column name" value={newColName} onChange={e => setNewColName(e.target.value)}
                  className="w-40 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none" />
                <input placeholder="Formula (use column names)" value={formulaInput} onChange={e => setFormulaInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs focus:outline-none font-mono" />
                <button onClick={() => {
                  if (!rows.length || !newColName || !formulaInput) return;
                  applyStep({ action: 'add_calculated_column', formula: formulaInput, newColumn: newColName });
                  setNewColName(''); setFormulaInput('');
                }} className="px-4 py-2 bg-cyan-400 text-navy-900 rounded-lg text-xs font-bold hover:bg-cyan-300">
                  Add
                </button>
              </div>
              <div className="mt-2 text-xs text-white/30">Example: <code className="text-cyan-400/60">revenue - cost</code> or <code className="text-cyan-400/60">revenue / quantity</code></div>
            </div>

            {/* Available columns */}
            {columns.length > 0 && (
              <div className="glass-card rounded-xl border border-white/8 p-4">
                <div className="text-xs font-bold text-white/50 mb-2">Available Columns</div>
                <div className="flex flex-wrap gap-1.5">
                  {columns.map(c => (
                    <span key={c} onClick={() => setFormulaInput(f => f + c)} className="px-2 py-0.5 bg-white/5 rounded font-mono text-xs text-white/60 cursor-pointer hover:text-cyan-400 hover:bg-cyan-400/5">{c}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── VALIDATE TAB ── */}
        {activeTab === 'validate' && (
          <div className="space-y-4">
            {!columnProfiles.length ? (
              <div className="text-center py-20 text-white/30">Upload a dataset first</div>
            ) : (
              <>
                <div className="text-sm font-bold">Data Validation Report</div>
                <div className="space-y-3">
                  {columnProfiles.map((cp, i) => (
                    <div key={i} className={`glass-card rounded-xl border p-4 ${cp.warnings.length > 0 ? 'border-orange-400/20' : 'border-green-400/15'}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {cp.warnings.length === 0 ? <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />}
                          <span className="font-mono text-sm font-semibold">{cp.columnName}</span>
                          <span className="text-xs text-white/35">{cp.detectedType} · {cp.semanticRole}</span>
                        </div>
                      </div>
                      {cp.warnings.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {cp.warnings.map((w, wi) => <div key={wi} className="text-xs text-orange-400">⚠ {w}</div>)}
                          {cp.recommendedFixes.map((f, fi) => <div key={fi} className="text-xs text-cyan-400">→ {f}</div>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── VERSIONS TAB ── */}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            <div className="text-sm font-bold">Dataset Versions</div>
            {versions.length === 0 ? (
              <div className="text-center py-20 text-white/30">No versions yet</div>
            ) : (
              versions.map((v, i) => (
                <div key={i} className="glass-card rounded-xl border border-white/8 p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{v.name}</div>
                    <div className="text-xs text-white/40">{v.rows.toLocaleString()} rows · {v.cols} cols · {new Date(v.ts).toLocaleString()}</div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs ${v.type === 'raw' ? 'bg-white/8 text-white/50' : 'bg-cyan-400/10 text-cyan-400'}`}>{v.type}</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── EXPORT TAB ── */}
        {activeTab === 'export' && (
          <div className="space-y-4">
            <div className="text-sm font-bold">Export Dataset</div>
            {!rows.length ? (
              <div className="text-center py-20 text-white/30">Upload a dataset first</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button onClick={exportCSV} className="glass-card rounded-xl border border-green-400/20 p-6 hover:bg-green-400/5 transition-all text-left">
                  <Download className="w-6 h-6 text-green-400 mb-3" />
                  <div className="font-bold text-sm mb-1">Export as CSV</div>
                  <div className="text-xs text-white/40">{rows.length.toLocaleString()} rows · {columns.length} columns</div>
                </button>
                <div className="glass-card rounded-xl border border-white/8 p-6">
                  <FileText className="w-6 h-6 text-cyan-400 mb-3" />
                  <div className="font-bold text-sm mb-1">Quality Report</div>
                  <div className="text-xs text-white/40">Score: {qualityScore?.score}/100</div>
                  {qualityScore && <div className="text-xs text-white/30 mt-1">{qualityScore.label}</div>}
                </div>
                <div className="glass-card rounded-xl border border-white/8 p-6">
                  <TrendingUp className="w-6 h-6 text-purple-400 mb-3" />
                  <div className="font-bold text-sm mb-1">Dataset Summary</div>
                  <div className="text-xs text-white/40">{metricCols.length} metrics · {dimCols.length} dimensions · {dateCols.length} dates</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}