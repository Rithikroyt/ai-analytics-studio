import { useState } from 'react';
import { Presentation, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import pptxgen from 'pptxgenjs';

/**
 * ExportToPptx
 * Props:
 *  - title: string
 *  - subtitle: string
 *  - slides: Array<{ heading, bullets?, table?: { headers, rows }, note? }>
 *  - filename: string (without extension)
 *  - variant: 'default' | 'outline' | 'primary'
 */
export default function ExportToPptx({ title, subtitle, slides = [], filename = 'presentation', variant = 'default' }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    if (!slides.length) { toast.error('No content to export.'); return; }
    setLoading(true);
    try {
      const pptx = new pptxgen();
      pptx.layout = 'LAYOUT_WIDE';

      const BG    = '0D1526';
      const ACCENT = '00F5FF';
      const WHITE  = 'FFFFFF';
      const MUTED  = '8899AA';

      // Cover slide
      const cover = pptx.addSlide();
      cover.background = { color: BG };
      cover.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.12, h: 7.5, fill: { color: ACCENT } });
      cover.addText(title || 'Report', { x: 0.4, y: 2.2, w: 12, h: 1.2, fontSize: 36, bold: true, color: WHITE, fontFace: 'Calibri' });
      if (subtitle) cover.addText(subtitle, { x: 0.4, y: 3.6, w: 12, h: 0.6, fontSize: 16, color: MUTED, fontFace: 'Calibri' });
      const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
      cover.addText(today, { x: 0.4, y: 6.8, w: 12, h: 0.4, fontSize: 11, color: MUTED, fontFace: 'Calibri' });

      // Content slides
      slides.forEach((s, idx) => {
        const slide = pptx.addSlide();
        slide.background = { color: BG };
        slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 13.33, h: 0.08, fill: { color: ACCENT } });
        slide.addText(s.heading || 'Section', { x: 0.4, y: 0.25, w: 12, h: 0.7, fontSize: 22, bold: true, color: WHITE, fontFace: 'Calibri' });

        if (s.bullets && s.bullets.length) {
          const bulletObjs = s.bullets.filter(Boolean).map(b => ({
            text: String(b),
            options: { bullet: { type: 'bullet' }, fontSize: 14, color: 'D0E8FF', fontFace: 'Calibri', paraSpaceAfter: 6 },
          }));
          slide.addText(bulletObjs, { x: 0.4, y: 1.1, w: 12, h: 5.5 });
        }

        if (s.table && s.table.headers && s.table.rows) {
          const tableRows = [
            s.table.headers.map(h => ({ text: h, options: { bold: true, color: BG, fill: { color: ACCENT }, fontSize: 11, fontFace: 'Calibri', align: 'center' } })),
            ...s.table.rows.map(row => row.map(cell => ({ text: String(cell ?? ''), options: { color: WHITE, fill: { color: '1A2B40' }, fontSize: 11, fontFace: 'Calibri' } }))),
          ];
          slide.addTable(tableRows, { x: 0.4, y: 1.1, w: 12, border: { type: 'solid', color: '243654', pt: 0.5 }, rowH: 0.38 });
        }

        if (s.note) slide.addNotes(s.note);
        slide.addText(`${idx + 1} / ${slides.length}`, { x: 12, y: 7.1, w: 1.2, h: 0.3, fontSize: 9, color: MUTED, align: 'right', fontFace: 'Calibri' });
      });

      await pptx.writeFile({ fileName: `${filename}.pptx` });
      toast.success('PowerPoint downloaded!');
    } catch (err) {
      toast.error('Export failed: ' + err.message);
    }
    setLoading(false);
  };

  const base = 'flex items-center gap-2 font-semibold transition-all disabled:opacity-50';
  const styles = {
    default: `${base} px-4 py-2 bg-cyan-400/10 border border-cyan-400/25 text-cyan-400 rounded-xl text-xs hover:bg-cyan-400/20`,
    outline:  `${base} px-3 py-1.5 border border-white/15 text-white/60 rounded-lg text-xs hover:text-white hover:border-white/30`,
    primary:  `${base} px-5 py-2.5 bg-cyan-400 text-navy-900 rounded-xl text-sm hover:bg-cyan-300`,
  };

  return (
    <button onClick={handleExport} disabled={loading} className={styles[variant] || styles.default}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
      {loading ? 'Exporting…' : 'Export to PPTX'}
    </button>
  );
}