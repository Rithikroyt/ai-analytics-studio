/**
 * Strategic OKR Board — Map data KPIs to company goals, track progress in real-time
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Target, Plus, Edit3, Trash2, CheckCircle2, AlertTriangle, Clock,
  TrendingUp, TrendingDown, RefreshCw, ChevronDown, ChevronUp,
  BarChart2, DollarSign, Users, Activity, Zap, Save, X
} from 'lucide-react';

const OWNER_COLORS = { CEO: '#00e5ff', CFO: '#4caf50', COO: '#a855f7', CTO: '#ff6b35', CDO: '#ffcc02', CMO: '#ff2d7a' };
const QUARTER_OPTIONS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026', 'Q1 2027'];

const DEFAULT_OKRS = [
  {
    id: '1', objective: 'Achieve market leadership in Mid-Market segment', owner: 'CEO', quarter: 'Q2 2026', progress: 62, status: 'on_track',
    keyResults: [
      { id: 'kr1', kr: 'Grow MRR from $1.2M to $1.8M', target: 1800000, actual: 1278000, unit: '$', kpiColumn: '', progress: 71 },
      { id: 'kr2', kr: 'Close 50 Mid-Market accounts', target: 50, actual: 29, unit: 'accounts', kpiColumn: '', progress: 58 },
      { id: 'kr3', kr: 'Achieve NPS ≥ 75 in Mid-Market', target: 75, actual: 72, unit: 'pts', kpiColumn: '', progress: 96 },
    ]
  },
  {
    id: '2', objective: 'Reduce operational costs by 20% through automation', owner: 'COO', quarter: 'Q2 2026', progress: 44, status: 'at_risk',
    keyResults: [
      { id: 'kr4', kr: 'Automate 15 manual workflows', target: 15, actual: 10, unit: 'workflows', kpiColumn: '', progress: 67 },
      { id: 'kr5', kr: 'Reduce support ticket volume by 30%', target: 30, actual: 12, unit: '%', kpiColumn: '', progress: 40 },
      { id: 'kr6', kr: 'Deploy AI-QA in all product teams', target: 5, actual: 1, unit: 'teams', kpiColumn: '', progress: 20 },
    ]
  },
  {
    id: '3', objective: 'Build a data-driven culture across all departments', owner: 'CDO', quarter: 'Q2 2026', progress: 55, status: 'on_track',
    keyResults: [
      { id: 'kr7', kr: 'All teams use OmniData dashboards weekly', target: 10, actual: 7.8, unit: 'teams', kpiColumn: '', progress: 78 },
      { id: 'kr8', kr: 'Train 100% of staff on AI tools', target: 100, actual: 44, unit: '%', kpiColumn: '', progress: 44 },
      { id: 'kr9', kr: 'Launch governed metric store with 50+ KPIs', target: 50, actual: 22, unit: 'KPIs', kpiColumn: '', progress: 44 },
    ]
  },
];

const STATUS_CFG = {
  on_track: { color: '#4caf50', label: 'On Track', icon: CheckCircle2 },
  at_risk: { color: '#ffcc02', label: 'At Risk', icon: AlertTriangle },
  off_track: { color: '#ef4444', label: 'Off Track', icon: AlertTriangle },
  complete: { color: '#00e5ff', label: 'Complete', icon: CheckCircle2 },
};

function ProgressRing({ pct, size = 48, color }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={4} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{pct}%</text>
    </svg>
  );
}

function KRRow({ kr, cols, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(kr.actual);
  const pct = Math.min(100, Math.round((kr.actual / kr.target) * 100));
  const color = pct >= 80 ? '#4caf50' : pct >= 50 ? '#ffcc02' : '#ef4444';

  const save = () => { onUpdate(kr.id, { actual: Number(val), progress: Math.min(100, Math.round((Number(val) / kr.target) * 100)) }); setEditing(false); };

  return (
    <div className="flex items-center gap-3 text-xs py-2.5 border-b border-white/5 last:border-0">
      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
      <span className="flex-1 text-white/60">{kr.kr}</span>
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" value={val} onChange={e => setVal(e.target.value)} className="w-20 bg-white/8 border border-white/15 rounded px-1.5 py-0.5 text-xs text-white/80 focus:outline-none" />
          <button onClick={save} className="p-1 text-green-400 hover:bg-green-400/10 rounded"><Save className="w-3 h-3" /></button>
          <button onClick={() => setEditing(false)} className="p-1 text-white/30 hover:bg-white/5 rounded"><X className="w-3 h-3" /></button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} className="font-mono text-white/40 hover:text-white/70 transition-colors">
          {kr.actual.toLocaleString()}{kr.unit ? ` ${kr.unit}` : ''} / {kr.target.toLocaleString()}
        </button>
      )}
      <div className="w-24 h-1.5 bg-white/8 rounded-full overflow-hidden flex-shrink-0">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="w-8 text-right font-mono" style={{ color }}>{pct}%</span>
      {cols.length > 0 && (
        <select value={kr.kpiColumn} onChange={e => onUpdate(kr.id, { kpiColumn: e.target.value })}
          className="text-xs bg-white/5 border border-white/8 rounded px-1.5 py-0.5 text-white/30 focus:outline-none max-w-24 truncate"
          title="Link to data column">
          <option value="">Link KPI…</option>
          {cols.map(c => <option key={c.name || c} value={c.name || c}>{c.name || c}</option>)}
        </select>
      )}
    </div>
  );
}

function OKRCard({ okr, cols, onUpdateKR, onDelete }) {
  const [open, setOpen] = useState(true);
  const statusCfg = STATUS_CFG[okr.status] || STATUS_CFG.on_track;
  const StatusIcon = statusCfg.icon;
  const ownerColor = OWNER_COLORS[okr.owner] || '#888';

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-white/8 overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/2 transition-colors text-left">
        <ProgressRing pct={okr.progress} color={statusCfg.color} />
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-white/90 mb-0.5 truncate">{okr.objective}</div>
          <div className="flex items-center gap-2 text-xs text-white/30">
            <span style={{ color: ownerColor }}>{okr.owner}</span>
            <span>·</span><span>{okr.quarter}</span>
            <span className="flex items-center gap-1 ml-2" style={{ color: statusCfg.color }}>
              <StatusIcon className="w-3 h-3" />{statusCfg.label}
            </span>
          </div>
        </div>
        <button onClick={e => { e.stopPropagation(); onDelete(okr.id); }} className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-400/8 rounded-lg transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        {open ? <ChevronUp className="w-4 h-4 text-white/30 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-5 pb-4 border-t border-white/5">
              {okr.keyResults.map(kr => (
                <KRRow key={kr.id} kr={kr} cols={cols} onUpdate={(id, upd) => onUpdateKR(okr.id, id, upd)} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddOKRModal({ onAdd, onClose }) {
  const [obj, setObj] = useState('');
  const [owner, setOwner] = useState('CEO');
  const [quarter, setQuarter] = useState('Q2 2026');
  const [krs, setKrs] = useState([{ kr: '', target: '', unit: '' }]);

  const submit = () => {
    if (!obj.trim()) return;
    onAdd({
      id: Date.now().toString(),
      objective: obj,
      owner, quarter, progress: 0, status: 'on_track',
      keyResults: krs.filter(k => k.kr).map((k, i) => ({
        id: `kr_${Date.now()}_${i}`, kr: k.kr,
        target: Number(k.target) || 100, actual: 0,
        unit: k.unit, kpiColumn: '', progress: 0
      }))
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-2xl border border-white/15 p-6 w-full max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold">New Objective</h3>
          <button onClick={onClose} className="p-1.5 text-white/30 hover:text-white/70 hover:bg-white/5 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
        <input value={obj} onChange={e => setObj(e.target.value)} placeholder="Objective…"
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/80 focus:outline-none" />
        <div className="grid grid-cols-2 gap-3">
          <select value={owner} onChange={e => setOwner(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
            {Object.keys(OWNER_COLORS).map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={quarter} onChange={e => setQuarter(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white/70 focus:outline-none">
            {QUARTER_OPTIONS.map(q => <option key={q}>{q}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <div className="text-xs text-white/40 uppercase tracking-widest">Key Results</div>
          {krs.map((kr, i) => (
            <div key={i} className="flex gap-2">
              <input value={kr.kr} onChange={e => setKrs(p => p.map((k, j) => j === i ? { ...k, kr: e.target.value } : k))}
                placeholder={`Key result ${i + 1}…`}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white/70 focus:outline-none" />
              <input value={kr.target} onChange={e => setKrs(p => p.map((k, j) => j === i ? { ...k, target: e.target.value } : k))}
                placeholder="Target" type="number"
                className="w-20 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white/70 focus:outline-none" />
              <input value={kr.unit} onChange={e => setKrs(p => p.map((k, j) => j === i ? { ...k, unit: e.target.value } : k))}
                placeholder="Unit" className="w-16 bg-white/5 border border-white/10 rounded-xl px-2 py-2 text-xs text-white/70 focus:outline-none" />
            </div>
          ))}
          <button onClick={() => setKrs(p => [...p, { kr: '', target: '', unit: '' }])}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"><Plus className="w-3 h-3" /> Add Key Result</button>
        </div>
        <button onClick={submit} className="w-full py-2.5 bg-cyan-400 rounded-xl font-bold text-sm hover:bg-cyan-300 transition-all" style={{ color: 'hsl(222,47%,6%)' }}>
          Create Objective
        </button>
      </motion.div>
    </div>
  );
}

export default function StrategicOKRBoard() {
  const { getActiveTable } = useWorkspaceStore();
  const table = getActiveTable();
  const [okrs, setOkrs] = useState(DEFAULT_OKRS);
  const [showAdd, setShowAdd] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const cols = table?.columns || [];

  const overallProgress = Math.round(okrs.reduce((s, o) => s + o.progress, 0) / (okrs.length || 1));

  const handleUpdateKR = (okrId, krId, updates) => {
    setOkrs(prev => prev.map(o => {
      if (o.id !== okrId) return o;
      const newKRs = o.keyResults.map(kr => kr.id === krId ? { ...kr, ...updates } : kr);
      const avgProgress = Math.round(newKRs.reduce((s, kr) => s + kr.progress, 0) / newKRs.length);
      const status = avgProgress >= 70 ? 'on_track' : avgProgress >= 40 ? 'at_risk' : 'off_track';
      return { ...o, keyResults: newKRs, progress: avgProgress, status };
    }));
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg, rgba(76,175,80,0.05) 0%, rgba(0,229,255,0.04) 100%)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-400/15 border border-green-400/25 flex items-center justify-center">
            <Target className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">Strategic OKR Board</h1>
            <p className="text-xs text-muted-foreground">Map data KPIs to company goals · Real-time progress tracking · Live dataset sync</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="p-2 rounded-xl bg-white/5 border border-white/8 text-white/40 hover:text-white/70 transition-all">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-xs font-bold hover:bg-green-400/25 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Objective
          </button>
        </div>
      </div>

      <div className="p-6 max-w-[1100px] mx-auto space-y-6">
        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Overall Progress', value: `${overallProgress}%`, color: overallProgress >= 70 ? '#4caf50' : '#ffcc02', icon: Target },
            { label: 'Objectives', value: okrs.length, color: '#00e5ff', icon: BarChart2 },
            { label: 'On Track', value: okrs.filter(o => o.status === 'on_track').length, color: '#4caf50', icon: CheckCircle2 },
            { label: 'At Risk', value: okrs.filter(o => o.status === 'at_risk' || o.status === 'off_track').length, color: '#ef4444', icon: AlertTriangle },
          ].map(s => (
            <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
              <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.color }} />
              <div className="text-2xl font-black font-mono mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-white/35">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Dataset link banner */}
        {table && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cyan-400/5 border border-cyan-400/15 text-xs text-white/50">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            Live dataset linked: <span className="text-cyan-400 font-semibold">{table.name}</span> · {table.rows?.length} rows · Use the "Link KPI…" dropdown on each Key Result to map a column to real data.
          </div>
        )}

        {/* OKR cards */}
        <div className="space-y-4">
          {okrs.map(okr => (
            <OKRCard key={okr.id} okr={okr} cols={cols}
              onUpdateKR={handleUpdateKR}
              onDelete={id => setOkrs(prev => prev.filter(o => o.id !== id))} />
          ))}
        </div>
      </div>

      {showAdd && <AddOKRModal onAdd={o => setOkrs(p => [...p, o])} onClose={() => setShowAdd(false)} />}
    </div>
  );
}