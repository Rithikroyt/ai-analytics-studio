/**
 * LocalPptxExport — generates a PowerPoint file fully client-side using pptxgenjs
 * Works for any dataset / analysis snapshot without any cloud or backend calls.
 */
import { useState } from 'react';
import { Presentation, Loader2, CheckCircle2 } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

const THEME = {
  bg: '0B1120',
  accent: '00F5FF',
  text: 'E8F4F8',
  subtext: '7A9BB5',
  cardBg: '111827',
  positive: '22C55E',
  negative: 'EF4444',
  amber: 'F59E0B',
};

function fmt(v) {
  if (v == null || isNaN(Number(v))) return String(v ?? '—');
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

async function buildPresentation(table, analysisResults, title) {
  const PptxGenJS = (await import('pptxgenjs')).default;
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.title = title || 'Analytics Report';

  // ── Slide 1: Cover ───────────────────────────────────────────────
  const cover = pptx.addSlide();
  cover.background = { color: THEME.bg };
  cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
  cover.addText(title || 'Analytics Report', {
    x: 0.6, y: 1.4, w: 11, h: 1.2,
    fontSize: 40, bold: true, color: THEME.text, fontFace: 'Arial',
  });
  cover.addText(table?.name ? `Dataset: ${table.name}` : '', {
    x: 0.6, y: 2.7, w: 11, h: 0.5,
    fontSize: 18, color: THEME.accent, fontFace: 'Arial',
  });
  cover.addText(`Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, {
    x: 0.6, y: 3.3, w: 11, h: 0.4,
    fontSize: 13, color: THEME.subtext, fontFace: 'Arial',
  });
  if (table) {
    cover.addText(`${table.rowCount?.toLocaleString() || 0} rows · ${table.columns?.length || 0} columns · Quality: ${table.qualityScore || 0}%`, {
      x: 0.6, y: 3.85, w: 11, h: 0.35,
      fontSize: 12, color: THEME.subtext, fontFace: 'Arial',
    });
  }

  // ── Slide 2: Executive Summary ───────────────────────────────────
  const r = analysisResults;
  if (r) {
    const sumSlide = pptx.addSlide();
    sumSlide.background = { color: THEME.bg };
    sumSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    sumSlide.addText('Executive Summary', {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });
    sumSlide.addText(r.executiveSummary || 'No summary available.', {
      x: 0.6, y: 0.95, w: 11, h: 1.5,
      fontSize: 13, color: THEME.subtext, fontFace: 'Arial', wrap: true,
    });

    // KPI cards row
    const kpis = [
      { label: r.primaryLabel || 'Primary KPI', value: fmt(r.totalValue), color: THEME.accent },
      { label: r.secondLabel || 'Secondary KPI', value: fmt(r.secondValue), color: '22C55E' },
      { label: 'Growth Rate', value: r.growthRate != null ? `${r.growthRate > 0 ? '+' : ''}${r.growthRate}%` : '—', color: r.growthRate > 0 ? THEME.positive : THEME.negative },
      { label: 'Anomalies', value: String(r.anomalies?.length ?? 0), color: THEME.amber },
    ];
    kpis.forEach((kpi, i) => {
      const x = 0.5 + i * 3.1;
      sumSlide.addShape(pptx.ShapeType.rect, { x, y: 2.7, w: 2.8, h: 1.3, fill: { color: THEME.cardBg }, line: { color: kpi.color, width: 1 }, rounding: true });
      sumSlide.addText(kpi.label, { x, y: 2.78, w: 2.8, h: 0.35, fontSize: 10, color: THEME.subtext, fontFace: 'Arial', align: 'center' });
      sumSlide.addText(kpi.value, { x, y: 3.2, w: 2.8, h: 0.55, fontSize: 22, bold: true, color: kpi.color, fontFace: 'Arial', align: 'center' });
    });

    // Key findings
    if (r.keyFindings?.length) {
      sumSlide.addText('Key Findings', {
        x: 0.6, y: 4.2, w: 11, h: 0.35,
        fontSize: 13, bold: true, color: THEME.text, fontFace: 'Arial',
      });
      r.keyFindings.slice(0, 3).forEach((finding, i) => {
        sumSlide.addText(`• ${finding}`, {
          x: 0.6, y: 4.65 + i * 0.38, w: 11, h: 0.35,
          fontSize: 11, color: THEME.subtext, fontFace: 'Arial', wrap: true,
        });
      });
    }
  }

  // ── Slide 3: Data Overview Table ─────────────────────────────────
  if (table?.rows?.length && table?.columns?.length) {
    const tblSlide = pptx.addSlide();
    tblSlide.background = { color: THEME.bg };
    tblSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    tblSlide.addText('Data Sample (First 10 Rows)', {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });

    const cols = table.columns.slice(0, 8);
    const sampleRows = table.rows.slice(0, 10);
    const colW = Math.min(1.5, 12 / cols.length);

    const tableData = [
      cols.map(c => ({ text: c.name, options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } })),
      ...sampleRows.map(row =>
        cols.map(c => ({ text: String(row[c.name] ?? ''), options: { color: THEME.text, fontSize: 8, fill: { color: THEME.cardBg } } }))
      ),
    ];

    tblSlide.addTable(tableData, {
      x: 0.5, y: 0.95, w: cols.length * colW, h: 4,
      border: { color: '1F2937', size: 1 },
      fontFace: 'Arial',
    });
  }

  // ── Slide 4: Trend Data ──────────────────────────────────────────
  if (r?.trendData?.length >= 4) {
    const trendSlide = pptx.addSlide();
    trendSlide.background = { color: THEME.bg };
    trendSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    trendSlide.addText(`Trend Analysis — ${r.primaryLabel || 'Primary Metric'}`, {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });

    const trendTableData = [
      [
        { text: 'Period', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 10 } },
        { text: r.primaryLabel || 'Value', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 10 } },
        { text: 'Change', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 10 } },
      ],
      ...r.trendData.slice(-16).map((d, i, arr) => {
        const prev = arr[i - 1];
        const change = prev ? ((d.value - prev.value) / (prev.value || 1) * 100).toFixed(1) : '—';
        const isPos = parseFloat(change) >= 0;
        return [
          { text: d.date, options: { color: THEME.text, fontSize: 9, fill: { color: THEME.cardBg } } },
          { text: fmt(d.value), options: { color: THEME.accent, fontSize: 9, fill: { color: THEME.cardBg } } },
          { text: change === '—' ? '—' : `${isPos ? '+' : ''}${change}%`, options: { color: isPos ? THEME.positive : THEME.negative, fontSize: 9, fill: { color: THEME.cardBg } } },
        ];
      }),
    ];

    trendSlide.addTable(trendTableData, {
      x: 0.5, y: 0.95, w: 5.5, h: 5.5,
      border: { color: '1F2937', size: 1 },
      fontFace: 'Arial',
    });

    if (r.growthRate != null) {
      trendSlide.addText(`Overall Growth: ${r.growthRate > 0 ? '+' : ''}${r.growthRate}%`, {
        x: 6.5, y: 1.1, w: 5, h: 0.5,
        fontSize: 18, bold: true, color: r.growthRate > 0 ? THEME.positive : THEME.negative, fontFace: 'Arial',
      });
    }
    if (r.anomalies?.length > 0) {
      trendSlide.addText(`⚠ ${r.anomalies.length} anomalies detected in time series`, {
        x: 6.5, y: 1.8, w: 5, h: 0.4,
        fontSize: 12, color: THEME.amber, fontFace: 'Arial',
      });
    }
  }

  // ── Slide 5: Breakdown ───────────────────────────────────────────
  if (r?.breakdownData?.length) {
    const brkSlide = pptx.addSlide();
    brkSlide.background = { color: THEME.bg };
    brkSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    brkSlide.addText(`Breakdown by ${r.primaryDimension?.replace(/_/g, ' ') || 'Dimension'}`, {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });

    const total = r.breakdownData.reduce((s, d) => s + d.value, 0) || 1;
    r.breakdownData.slice(0, 8).forEach((d, i) => {
      const pct = Math.round((d.value / total) * 100);
      const barW = Math.max(0.3, (d.value / r.breakdownData[0].value) * 6);
      brkSlide.addText(d.name, { x: 0.5, y: 1.0 + i * 0.62, w: 2.8, h: 0.4, fontSize: 11, color: THEME.text, fontFace: 'Arial' });
      brkSlide.addShape(pptx.ShapeType.rect, { x: 3.5, y: 1.05 + i * 0.62, w: barW, h: 0.3, fill: { color: THEME.accent }, rounding: true });
      brkSlide.addText(`${fmt(d.value)} (${pct}%)`, { x: 3.6 + barW, y: 1.0 + i * 0.62, w: 3, h: 0.4, fontSize: 10, color: THEME.subtext, fontFace: 'Arial' });
    });
  }

  // ── Slide 6: Recommendations ─────────────────────────────────────
  if (r?.recommendations?.length) {
    const recSlide = pptx.addSlide();
    recSlide.background = { color: THEME.bg };
    recSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    recSlide.addText('Recommendations & Next Steps', {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });

    const priorityColor = { critical: THEME.negative, high: THEME.amber, medium: THEME.accent, low: THEME.subtext };
    r.recommendations.slice(0, 5).forEach((rec, i) => {
      const p = rec.priority || 'medium';
      const color = priorityColor[p] || THEME.accent;
      recSlide.addShape(pptx.ShapeType.rect, { x: 0.5, y: 1.0 + i * 0.95, w: 11.5, h: 0.78, fill: { color: THEME.cardBg }, line: { color: color, width: 1.5 }, rounding: true });
      recSlide.addText(p.toUpperCase(), { x: 0.7, y: 1.05 + i * 0.95, w: 1.2, h: 0.25, fontSize: 8, bold: true, color, fontFace: 'Arial' });
      recSlide.addText(rec.action || String(rec), { x: 0.7, y: 1.3 + i * 0.95, w: 11, h: 0.38, fontSize: 11, color: THEME.text, fontFace: 'Arial', wrap: true });
    });
  }

  // ── Slide 7: Column Schema ───────────────────────────────────────
  if (table?.columns?.length) {
    const schSlide = pptx.addSlide();
    schSlide.background = { color: THEME.bg };
    schSlide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 0.06, fill: { color: THEME.accent } });
    schSlide.addText('Dataset Schema', {
      x: 0.6, y: 0.25, w: 11, h: 0.55,
      fontSize: 22, bold: true, color: THEME.text, fontFace: 'Arial',
    });

    const schData = [
      [
        { text: 'Column', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
        { text: 'Type', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
        { text: 'Null%', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
        { text: 'Unique', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
        { text: 'Min', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
        { text: 'Max', options: { bold: true, color: THEME.bg, fill: { color: THEME.accent }, fontSize: 9 } },
      ],
      ...table.columns.slice(0, 20).map(c => [
        { text: c.name, options: { color: THEME.accent, fontSize: 8, fill: { color: THEME.cardBg } } },
        { text: c.type || '—', options: { color: THEME.subtext, fontSize: 8, fill: { color: THEME.cardBg } } },
        { text: `${c.missingPct || 0}%`, options: { color: (c.missingPct || 0) > 10 ? THEME.amber : THEME.positive, fontSize: 8, fill: { color: THEME.cardBg } } },
        { text: String(c.uniqueCount || '—'), options: { color: THEME.text, fontSize: 8, fill: { color: THEME.cardBg } } },
        { text: String(c.min ?? '—'), options: { color: THEME.subtext, fontSize: 8, fill: { color: THEME.cardBg } } },
        { text: String(c.max ?? '—'), options: { color: THEME.subtext, fontSize: 8, fill: { color: THEME.cardBg } } },
      ]),
    ];

    schSlide.addTable(schData, {
      x: 0.5, y: 0.95, w: 12, h: 5.5,
      border: { color: '1F2937', size: 1 },
      fontFace: 'Arial',
      colW: [2.5, 1.2, 0.9, 0.9, 1.5, 1.5],
    });
  }

  return pptx;
}

export default function LocalPptxExport({ title, variant = 'default', className = '' }) {
  const { getActiveTable, analysisResults } = useWorkspaceStore();
  const [status, setStatus] = useState('idle'); // idle | loading | done | error

  const handleExport = async () => {
    setStatus('loading');
    try {
      const table = getActiveTable();
      const reportTitle = title || (table?.name ? `${table.name} — Analytics Report` : 'Analytics Report');
      const pptx = await buildPresentation(table, analysisResults, reportTitle);
      await pptx.writeFile({ fileName: `${reportTitle.replace(/[^a-z0-9]/gi, '_')}.pptx` });
      setStatus('done');
      setTimeout(() => setStatus('idle'), 2500);
    } catch (e) {
      console.error('PPTX export error:', e);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  const variantStyles = {
    default: 'flex items-center gap-2 px-4 py-2.5 bg-purple-400/10 border border-purple-400/25 text-purple-400 rounded-xl text-xs font-bold hover:bg-purple-400/20 transition-all disabled:opacity-50',
    compact: 'flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 text-white/50 rounded-lg text-xs hover:text-purple-400 hover:border-purple-400/25 transition-all disabled:opacity-50',
    primary: 'flex items-center gap-2 px-5 py-3 bg-purple-500 text-white rounded-xl text-sm font-bold hover:bg-purple-400 transition-all disabled:opacity-50',
  };

  return (
    <button
      onClick={handleExport}
      disabled={status === 'loading'}
      className={variantStyles[variant] + ' ' + className}
      title="Export as PowerPoint presentation"
    >
      {status === 'loading' ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating PPTX…</>
      ) : status === 'done' ? (
        <><CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> Downloaded!</>
      ) : (
        <><Presentation className="w-3.5 h-3.5" /> Export PPTX</>
      )}
    </button>
  );
}