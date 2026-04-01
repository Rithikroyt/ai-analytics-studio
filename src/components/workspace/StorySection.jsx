import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useWorkspaceStore } from '@/lib/store';
import { Database, ArrowRight, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown } from 'lucide-react';

// ── Circular gauge ──────────────────────────────────────────────
function RadialGauge({ value, max = 100, label, sublabel, size = 140, gradStart = '#ff2d7a', gradEnd = '#7b2fff', number, unit = '%' }) {
  const pct = Math.min(Math.max(value / max, 0), 1);
  const r = (size / 2) - 14;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  // Use a stable unique ID per instance combining all distinguishing props
  const gradId = `grad-${gradStart.replace('#','')}-${gradEnd.replace('#','')}-${size}-${label?.replace(/\s/g,'') || 'x'}`;

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={gradStart} />
              <stop offset="100%" stopColor={gradEnd} />
            </linearGradient>
          </defs>
          {/* track */}
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
          {/* dots on track */}
          {[...Array(32)].map((_, i) => {
            const a = (i / 32) * 2 * Math.PI;
            const x = size/2 + (r + 12) * Math.cos(a);
            const y = size/2 + (r + 12) * Math.sin(a);
            return <circle key={i} cx={x} cy={y} r="1.2" fill="rgba(255,255,255,0.15)" />;
          })}
          {/* progress arc */}
          <circle
            cx={size/2} cy={size/2} r={r}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ filter: `drop-shadow(0 0 6px ${gradStart}88)` }}
          />
        </svg>
        {/* center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-black font-mono leading-none" style={{ fontSize: size * 0.22, color: gradEnd, textShadow: `0 0 16px ${gradEnd}99` }}>
            {number ?? `${Math.round(value)}${unit}`}
          </span>
          {sublabel && <span className="text-xs text-white/50 mt-0.5 uppercase tracking-wider leading-tight px-2">{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-xs text-white/60 uppercase tracking-widest font-semibold">{label}</span>}
    </div>
  );
}

// ── Neon bar chart ───────────────────────────────────────────────
function NeonBars({ data = [], height = 120 }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const NEONS = ['#ff2d7a','#7b2fff','#ff6b35','#00e5ff','#ff2d7a','#7b2fff','#ff6b35','#00e5ff'];
  return (
    <div style={{ height }} className="flex items-end gap-1">
      {data.slice(0, 12).map((d, i) => {
        const pct = (d.value / max) * 100;
        const col = NEONS[i % NEONS.length];
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
            <div
              className="w-full rounded-sm transition-all"
              style={{
                height: `${pct}%`,
                background: `linear-gradient(180deg, ${col} 0%, ${col}44 100%)`,
                boxShadow: `0 0 8px ${col}88`,
                minHeight: 4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

// ── Wave / line chart ─────────────────────────────────────────────
function NeonWave({ data = [], height = 130, color1 = '#7b2fff', color2 = '#ff2d7a' }) {
  const vals = data.map(d => d.value || 0);
  if (vals.length < 2) return null;
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const range = max - min || 1;
  const W = 100, H = height;
  const pad = 6;
  const toX = (i) => pad + (i / (vals.length - 1)) * (W - pad * 2);
  const toY = (v) => pad + ((max - v) / range) * (H - pad * 2 - 16);
  const pts = vals.map((v, i) => ({ x: toX(i), y: toY(v) }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length-1].x} ${H-16} L ${pts[0].x} ${H-16} Z`;
  const id1 = `wg1-${color1.replace('#','')}`;
  const id2 = `wl-${color1.replace('#','')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height }}>
      <defs>
        <linearGradient id={id1} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color1} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id2} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {[0.25,0.5,0.75].map(f => (
        <line key={f} x1={pad} x2={W-pad} y1={pad + f*(H-pad*2-16)} y2={pad + f*(H-pad*2-16)}
          stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      ))}
      <path d={areaPath} fill={`url(#${id1})`} />
      <path d={linePath} fill="none" stroke={`url(#${id2})`} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 4px ${color1}cc)` }} />
      {pts.filter((_, i) => i === 0 || i === Math.floor(pts.length/2) || i === pts.length-1).map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color2} style={{ filter: `drop-shadow(0 0 4px ${color2})` }} />
      ))}
    </svg>
  );
}

// ── Mini sparklines ───────────────────────────────────────────────
function Sparkline({ values = [], color = '#ff2d7a', height = 30 }) {
  if (values.length < 2) return <div style={{ height }} />;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const W = 80, H = height;
  const toX = (i) => (i / (values.length - 1)) * W;
  const toY = (v) => H - ((v - min) / range) * H;
  const path = values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: 80, height }}>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"
        style={{ filter: `drop-shadow(0 0 3px ${color})` }} />
    </svg>
  );
}

// ── Segment progress bars ─────────────────────────────────────────
function NeonProgressBar({ label, value, max, color }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-white/60 truncate">{label}</span>
        <span className="font-mono" style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, boxShadow: `0 0 8px ${color}66` }} />
      </div>
    </div>
  );
}

// ── Calendar dot grid (decorative) ───────────────────────────────
function CalendarGrid({ anomalies = [] }) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = Array.from({ length: 35 }, (_, i) => i + 1);
  const NEONS = ['#ff2d7a','#7b2fff','#ff6b35','#00e5ff','#7dff7d'];

  return (
    <div>
      <div className="flex gap-1.5 mb-2 flex-wrap">
        {months.slice(0,7).map((m, i) => (
          <span key={m} className="text-xs font-mono px-1" style={{ color: NEONS[i % NEONS.length] }}>{m}</span>
        ))}
      </div>
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
        {days.map(d => {
          const isHot = d % 7 === 0 || d % 11 === 0;
          const color = NEONS[d % NEONS.length];
          return (
            <div key={d} className="flex items-center justify-center rounded-sm text-xs font-mono"
              style={{
                width: 22, height: 22,
                background: isHot ? `${color}22` : 'rgba(255,255,255,0.03)',
                color: isHot ? color : 'rgba(255,255,255,0.3)',
                border: isHot ? `1px solid ${color}44` : '1px solid transparent',
                fontSize: 9,
              }}>
              {d <= 31 ? d : ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main dashboard ────────────────────────────────────────────────
export default function StorySection() {
  const { analysisResults, getActiveTable, setActiveSection } = useWorkspaceStore();
  const activeTable = getActiveTable();

  if (!analysisResults || !activeTable) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[500px] text-center">
        <Database className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-2">No Analysis Yet</h2>
        <p className="text-sm text-muted-foreground mb-4">Upload data and run analysis to generate the story dashboard.</p>
        <button onClick={() => setActiveSection('intake')} className="px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 rounded-lg text-sm">Upload Data</button>
      </div>
    );
  }

  const { tableName, primaryLabel, secondLabel, totalValue, secondValue, trendData, forecastData, breakdownData, anomalies, growthRate, executiveSummary, recommendations, canForecast } = analysisResults;

  const formatV = (v) => {
    if (v == null) return '—';
    if (v >= 1e6) return `${(v/1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v/1e3).toFixed(0)}K`;
    return v.toLocaleString();
  };
  const growthNum = growthRate != null ? Number(growthRate) : 0;
  const growthAbs = Math.min(Math.abs(growthNum), 100);
  const qualityPct = activeTable.qualityScore || 0;
  const topShare = breakdownData?.length > 0
    ? Math.round((breakdownData[0].value / breakdownData.reduce((s, b) => s + b.value, 0)) * 100)
    : 0;
  const combinedTrend = [...trendData, ...forecastData];

  // sparkline series — use deterministic values based on segment index to avoid random re-renders
  const sparkSeries = useMemo(() => {
    if (!breakdownData?.length) return [];
    const COLS = ['#ff2d7a','#7b2fff','#00e5ff','#ff6b35'];
    return breakdownData.slice(0, 4).map((seg, i) => {
      const base = seg.value;
      // deterministic pseudo-random using index + position
      const vals = Array.from({ length: 8 }, (_, j) => {
        const factor = 0.7 + ((i * 7 + j * 13) % 30) / 100;
        return Math.round(base * factor);
      });
      return { ...seg, vals, color: COLS[i % COLS.length] };
    });
  }, [breakdownData]);

  const cardStyle = {
    background: 'linear-gradient(135deg, rgba(30,16,60,0.9) 0%, rgba(18,12,40,0.95) 100%)',
    border: '1px solid rgba(123,47,255,0.2)',
    borderRadius: 16,
    backdropFilter: 'blur(16px)',
  };

  const labelStyle = "text-xs font-mono text-white/40 uppercase tracking-widest mb-3";

  return (
    <div className="p-5 overflow-auto" style={{ background: 'linear-gradient(135deg, #0e0720 0%, #120c28 50%, #0a0618 100%)', minHeight: '100%' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs font-mono tracking-widest mb-1" style={{ color: '#7b2fff' }}>◆ EXECUTIVE DASHBOARD</div>
          <h1 className="text-xl font-black text-white">{tableName}</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveSection('workbook')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg text-white/50 hover:text-white/80 transition-colors"
            style={{ background: 'rgba(123,47,255,0.1)', border: '1px solid rgba(123,47,255,0.25)' }}>
            Workbook <ArrowRight className="w-3 h-3" />
          </button>
          <button onClick={() => setActiveSection('analyst')} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
            style={{ background: 'linear-gradient(90deg,#7b2fff,#ff2d7a)', color: '#fff', boxShadow: '0 0 16px #7b2fff66' }}>
            Ask AI
          </button>
        </div>
      </motion.div>

      {/* 3×3 grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* 01 — Primary KPI gauge */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#ff2d7a' }}>01</span> {primaryLabel || 'Primary KPI'}</div>
          <div className="flex-1 flex items-center justify-center py-2">
            <RadialGauge
              value={growthAbs}
              max={100}
              label=""
              sublabel={primaryLabel?.slice(0,12)}
              size={150}
              gradStart="#ff2d7a"
              gradEnd="#7b2fff"
              number={formatV(totalValue)}
              unit=""
            />
          </div>
          <div className="text-xs text-center font-mono mt-1" style={{ color: '#ff2d7a99' }}>
            {growthNum > 0 ? `▲ +${growthRate}% growth` : growthNum < 0 ? `▼ ${growthRate}% decline` : 'stable'}
          </div>
        </motion.div>

        {/* 02 — Growth ring */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#7b2fff' }}>02</span> Growth Rate</div>
          <div className="flex-1 flex items-center justify-center py-2">
            <RadialGauge
              value={growthAbs}
              max={100}
              size={150}
              gradStart="#7b2fff"
              gradEnd="#00e5ff"
              sublabel="SYSTEM GRADE"
              number={`${growthRate ?? 0}%`}
              unit=""
            />
          </div>
          <div className="text-xs text-center font-mono mt-1" style={{ color: '#7b2fff99' }}>
            {canForecast ? '6-month forecast ready' : 'trend analysis'}
          </div>
        </motion.div>

        {/* 03 — Quality + segments legend */}
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#ff6b35' }}>03</span> Data Quality</div>
          <div className="flex items-center gap-5 flex-1">
            <RadialGauge
              value={qualityPct}
              max={100}
              size={130}
              gradStart="#ff6b35"
              gradEnd="#7b2fff"
              sublabel="UPGRADE"
              number={`${qualityPct}%`}
              unit=""
            />
            <div className="flex flex-col gap-2 flex-1">
              {breakdownData.slice(0, 4).map((seg, i) => {
                const COLS = ['#ff2d7a','#7b2fff','#ff6b35','#00e5ff'];
                const pct = Math.round(seg.value / breakdownData.reduce((s,b)=>s+b.value,0) * 100);
                return (
                  <div key={seg.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLS[i % COLS.length], boxShadow: `0 0 6px ${COLS[i%COLS.length]}` }} />
                    <span className="text-white/50 truncate flex-1">{seg.name}</span>
                    <span className="font-mono" style={{ color: COLS[i % COLS.length] }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* 04 — Neon bar chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#ff6b35' }}>04</span> Segment Distribution</div>
          <div className="flex gap-3 text-xs font-mono mb-3">
            {breakdownData.slice(0,3).map((d,i) => {
              const COLS = ['#ff2d7a','#7b2fff','#ff6b35'];
              return <span key={d.name} style={{ color: COLS[i] }}>{d.name?.slice(0,8)}</span>;
            })}
          </div>
          <div className="flex-1">
            <NeonBars data={breakdownData} height={120} />
          </div>
        </motion.div>

        {/* 05 — Wave trend chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#7b2fff' }}>05</span> {primaryLabel} Trend</div>
          <div className="flex-1">
            <NeonWave data={combinedTrend} height={130} color1="#7b2fff" color2="#ff2d7a" />
          </div>
          <div className="flex gap-4 mt-2">
            {[totalValue, secondValue || 0, breakdownData[0]?.value || 0].filter(Boolean).slice(0,3).map((v, i) => {
              const COLS = ['#ff2d7a','#7b2fff','#00e5ff'];
              const LABELS = [primaryLabel, secondLabel, breakdownData[0]?.name];
              return (
                <div key={i} className="text-center">
                  <div className="text-xs font-black font-mono" style={{ color: COLS[i] }}>{formatV(v)}</div>
                  <div className="text-xs text-white/30 truncate" style={{ maxWidth: 56, fontSize: 9 }}>{LABELS[i]?.slice(0,10)}</div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 06 — Progress bars */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#00e5ff' }}>06</span> Segment Share</div>
          <div className="flex-1 flex flex-col justify-center gap-3">
            {breakdownData.slice(0, 5).map((seg, i) => {
              const COLS = ['#ff2d7a','#7b2fff','#ff6b35','#00e5ff','#7dff7d'];
              const maxVal = breakdownData[0]?.value || 1;
              return <NeonProgressBar key={seg.name} label={seg.name} value={seg.value} max={maxVal} color={COLS[i % COLS.length]} />;
            })}
          </div>
        </motion.div>

        {/* 07 — Multi sparklines */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#ff2d7a' }}>07</span> Segment Trends</div>
          <div className="flex gap-2 mb-3 text-xs">
            {['INFO','STATS','POPULAR'].map((t, i) => (
              <span key={t} className="px-2 py-0.5 rounded text-xs font-mono"
                style={i === 1 ? { background: '#ff6b35', color: '#fff', fontSize: 10 } : { color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{t}</span>
            ))}
          </div>
          <div className="flex-1 space-y-2">
            {sparkSeries.map((seg) => {
              const total = seg.vals.reduce((a,b)=>a+b,0);
              const trend = seg.vals[seg.vals.length-1] - seg.vals[0];
              return (
                <div key={seg.name} className="flex items-center gap-3">
                  <div className="text-xs font-mono w-14 flex-shrink-0" style={{ color: seg.color }}>{formatV(seg.value)}</div>
                  <Sparkline values={seg.vals} color={seg.color} height={24} />
                  <div className="text-xs font-mono flex-shrink-0" style={{ color: trend > 0 ? '#7dff7d' : '#ff4466', fontSize: 10 }}>
                    {trend > 0 ? 'UP' : 'DN'} {Math.abs(Math.round((trend / seg.vals[0]) * 100))}%
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* 08 — Calendar */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#7b2fff' }}>08</span> Activity Calendar</div>
          <div className="flex-1">
            <CalendarGrid anomalies={anomalies} />
          </div>
          {anomalies.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#ff6b35' }}>
              <AlertTriangle className="w-3 h-3" />
              {anomalies.length} anomalies detected
            </div>
          )}
          {anomalies.length === 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs" style={{ color: '#7dff7d' }}>
              <CheckCircle2 className="w-3 h-3" />
              No anomalies
            </div>
          )}
        </motion.div>

        {/* 09 — Mixed KPIs + mini gauge */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          style={cardStyle} className="p-5 flex flex-col">
          <div className={labelStyle}><span style={{ color: '#ff6b35' }}>09</span> KPI Summary</div>
          <div className="flex gap-3 items-start flex-1">
            {/* mini gauges */}
            <div className="flex flex-col gap-2">
              <RadialGauge value={topShare} max={100} size={80} gradStart="#ff2d7a" gradEnd="#ff6b35" number={`${topShare}%`} unit="" />
              <RadialGauge value={qualityPct} max={100} size={80} gradStart="#7b2fff" gradEnd="#00e5ff" number={`${qualityPct}%`} unit="" />
            </div>
            {/* bar strips */}
            <div className="flex-1">
              <div className="space-y-1 mb-3">
                {recommendations?.slice(0,3).map((rec, i) => {
                  const COLS = ['#ff2d7a','#7b2fff','#ff6b35'];
                  return (
                    <div key={i} className="flex items-start gap-1.5 text-xs leading-tight">
                      <div className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0" style={{ background: COLS[i % COLS.length] }} />
                      <span className="text-white/50 line-clamp-2" style={{ fontSize: 10 }}>{rec.action?.slice(0, 55)}…</span>
                    </div>
                  );
                })}
              </div>
              <NeonBars data={breakdownData.slice(0,6)} height={60} />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom summary bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
        className="mt-4 p-4 rounded-2xl text-sm text-white/50 leading-relaxed"
        style={{ background: 'rgba(123,47,255,0.06)', border: '1px solid rgba(123,47,255,0.15)' }}>
        <span className="text-xs font-mono" style={{ color: '#7b2fff' }}>◆ EXECUTIVE SUMMARY  </span>
        {executiveSummary}
      </motion.div>
    </div>
  );
}