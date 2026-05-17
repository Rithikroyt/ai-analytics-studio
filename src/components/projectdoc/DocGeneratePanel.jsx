import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { FileText, Loader2, Download, Eye, AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

export default function DocGeneratePanel({ config, user }) {
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [error, setError] = useState('');
  const [previewHtml, setPreviewHtml] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [generatedAt, setGeneratedAt] = useState(null);

  const handleGenerate = async (mode = 'preview') => {
    if (!config?.id) {
      setError('Please save project metadata first.');
      return;
    }
    setError('');
    if (mode === 'preview') {
      setPreviewing(true);
    } else {
      setGenerating(true);
    }

    try {
      const res = await base44.functions.invoke('generateProjectDocumentPDF', { configId: config.id });
      if (res.data?.error) throw new Error(res.data.error);

      // The function returns HTML content
      const html = typeof res.data === 'string' ? res.data : res.data;

      if (mode === 'preview') {
        setPreviewHtml(html);
        setShowPreview(true);
      } else {
        // For PDF, open in new window and trigger print
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(html);
          win.document.close();
          setTimeout(() => {
            win.print();
          }, 1500);
        }
        setGeneratedAt(new Date());
      }
    } catch (e) {
      setError(e.message || 'Failed to generate document.');
    }

    setGenerating(false);
    setPreviewing(false);
  };

  const sections = config?.selectedSections || [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-lg font-bold">Generate PDF</h2>
        <p className="text-sm text-white/40 mt-0.5">Generate a professional, capstone-grade project document PDF from your live configuration.</p>
      </div>

      {/* Config Summary */}
      {config && (
        <div className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
          <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Document Configuration Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Project Title', value: config.projectTitle || '—' },
              { label: 'Author', value: config.authorName || '—' },
              { label: 'Organization', value: config.university || config.organization || '—' },
              { label: 'Version', value: config.version || '1.0' },
              { label: 'Page Format', value: config.pageFormat || 'A4' },
              { label: 'Sections', value: `${sections.length} selected` },
            ].map(item => (
              <div key={item.label} className="space-y-0.5">
                <div className="text-xs text-white/30 uppercase tracking-wider">{item.label}</div>
                <div className="text-sm text-white/80 font-medium truncate">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF Quality Checklist */}
      <div className="glass-card rounded-2xl border border-white/8 p-6 space-y-3">
        <h3 className="text-sm font-bold text-white/50 uppercase tracking-widest">PDF Quality Checklist</h3>
        {[
          { label: 'Project metadata configured', ok: !!(config?.projectTitle && config?.authorName) },
          { label: 'Sections selected', ok: sections.length > 0 },
          { label: 'Abstract provided', ok: !!(config?.abstract && config.abstract.length > 50) },
          { label: 'Keywords defined', ok: !!(config?.keywords && config.keywords.length > 0) },
          { label: 'Author name set', ok: !!config?.authorName },
        ].map(item => (
          <div key={item.label} className={`flex items-center gap-2.5 text-sm ${item.ok ? 'text-green-400' : 'text-white/40'}`}>
            <CheckCircle2 className={`w-4 h-4 flex-shrink-0 ${item.ok ? 'text-green-400' : 'text-white/20'}`} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-400/8 border border-red-400/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Success */}
      {generatedAt && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-green-400/8 border border-green-400/20 text-green-400 text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          Document opened in new tab for printing/saving as PDF. Generated at {generatedAt.toLocaleTimeString()}.
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={() => handleGenerate('preview')} disabled={previewing || generating || !config?.id}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/15 text-white/70 rounded-xl font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-40">
          {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          {previewing ? 'Loading Preview…' : 'Preview Document'}
        </button>

        <button onClick={() => handleGenerate('pdf')} disabled={generating || previewing || !config?.id}
          className="flex items-center justify-center gap-2 px-8 py-3 bg-cyan-400/15 border border-cyan-400/30 text-cyan-400 rounded-xl font-bold hover:bg-cyan-400/25 transition-all disabled:opacity-40">
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {generating ? 'Generating Document…' : 'Generate & Export PDF'}
        </button>
      </div>

      <p className="text-xs text-white/25 leading-relaxed">
        The document opens in a new browser tab with full content rendered. Use your browser's <strong className="text-white/40">Print → Save as PDF</strong> to download.
        This approach ensures Mermaid diagrams, code blocks, screenshots, and all styled content render correctly in the final PDF.
      </p>

      {/* Inline Preview */}
      {showPreview && previewHtml && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white/60">Document Preview</h3>
            <button onClick={() => setShowPreview(false)} className="text-xs text-white/30 hover:text-white/60 transition-all">Close</button>
          </div>
          <div className="rounded-2xl border border-white/8 overflow-hidden" style={{ height: '80vh' }}>
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full"
              title="Document Preview"
              sandbox="allow-scripts"
            />
          </div>
        </div>
      )}
    </div>
  );
}