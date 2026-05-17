import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, Loader2, Trash2, Eye, EyeOff, Plus, Image } from 'lucide-react';

const PAGE_OPTIONS = [
  'Overview', 'Upload Data', 'Quality Studio', 'Data Prep', 'Prepare & Profile',
  'Dashboard', 'Visual Builder', 'AI Analyst', 'Statistics', 'RFM Segments',
  'Funnel Analysis', 'Contribution', 'CLV Analysis', 'Cohort Retention',
  'Reports', 'Story Builder', 'Compare', 'Semantic Model', 'SQL Studio',
  'Docs & Evidence', 'Observability', 'Agent Studio', 'Data Connectors',
  'Executive Dashboard', 'Alerts', 'Admin Portal', 'Project Documentation Center',
];

export default function DocScreenshotManager({ config, user }) {
  const [screenshots, setScreenshots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ pageName: PAGE_OPTIONS[0], sectionName: '', caption: '', description: '' });

  useEffect(() => { if (config?.id) load(); }, [config?.id]);

  const load = async () => {
    setLoading(true);
    try {
      const items = await base44.entities.ApplicationScreenshot.filter({ configId: config.id }, 'order');
      setScreenshots(items);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !config?.id) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ApplicationScreenshot.create({
        configId: config.id,
        pageName: form.pageName,
        sectionName: form.sectionName,
        imageUrl: file_url,
        caption: form.caption || form.pageName,
        description: form.description,
        order: screenshots.length,
        capturedAt: new Date().toISOString(),
        capturedBy: user?.email || '',
        includeInPdf: true,
      });
      setForm({ pageName: PAGE_OPTIONS[0], sectionName: '', caption: '', description: '' });
      await load();
    } catch (e) { console.error(e); }
    setUploading(false);
    e.target.value = '';
  };

  const toggleInclude = async (s) => {
    await base44.entities.ApplicationScreenshot.update(s.id, { includeInPdf: !s.includeInPdf });
    setScreenshots(prev => prev.map(x => x.id === s.id ? { ...x, includeInPdf: !x.includeInPdf } : x));
  };

  const remove = async (id) => {
    await base44.entities.ApplicationScreenshot.delete(id);
    setScreenshots(prev => prev.filter(x => x.id !== id));
  };

  const updateCaption = async (s, caption) => {
    await base44.entities.ApplicationScreenshot.update(s.id, { caption });
    setScreenshots(prev => prev.map(x => x.id === s.id ? { ...x, caption } : x));
  };

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Screenshot Manager</h2>
          <p className="text-sm text-white/40 mt-0.5">Upload screenshots of each application module. These will be embedded in the PDF as figures.</p>
        </div>
        <span className="text-xs text-white/30">{screenshots.filter(s => s.includeInPdf).length} included in PDF</span>
      </div>

      {/* Upload Form */}
      <div className="glass-card rounded-2xl border border-white/8 p-6 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-widest">Add New Screenshot</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Page / Module</label>
            <select value={form.pageName} onChange={e => setForm(f => ({ ...f, pageName: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 focus:outline-none focus:border-cyan-400/40">
              {PAGE_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Section Name (optional)</label>
            <input value={form.sectionName} onChange={e => setForm(f => ({ ...f, sectionName: e.target.value }))}
              placeholder="e.g., Quality Score Panel"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Caption *</label>
            <input value={form.caption} onChange={e => setForm(f => ({ ...f, caption: e.target.value }))}
              placeholder="e.g., Figure X: Quality Studio Dashboard"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-white/50 uppercase tracking-wider">Description</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description of what this screenshot shows"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white/80 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40" />
          </div>
        </div>
        <div className="pt-2">
          <label className={`flex items-center gap-3 px-5 py-3 rounded-xl border cursor-pointer transition-all w-fit ${uploading ? 'opacity-50 cursor-not-allowed' : 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/20'}`}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            <span className="text-sm font-semibold">{uploading ? 'Uploading…' : 'Choose Screenshot File'}</span>
            <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading || !config?.id} className="hidden" />
          </label>
          <p className="text-xs text-white/25 mt-2">Supported: PNG, JPG, WebP. Recommended: 1400px+ wide for best PDF quality.</p>
        </div>
      </div>

      {/* Gallery */}
      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-white/30" /></div>
      ) : screenshots.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/5 rounded-2xl">
          <Image className="w-10 h-10 text-white/15 mb-3" />
          <p className="text-sm text-white/30">No screenshots yet. Upload your first screenshot above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenshots.map((s, i) => (
            <div key={s.id} className={`glass-card rounded-2xl border p-3 space-y-3 transition-all ${s.includeInPdf ? 'border-white/8' : 'border-white/3 opacity-60'}`}>
              <div className="relative rounded-xl overflow-hidden aspect-video bg-white/5">
                <img src={s.imageUrl} alt={s.caption} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-2 text-xs text-white/70 font-semibold">{s.pageName}</div>
              </div>
              <input value={s.caption} onChange={e => updateCaption(s, e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-cyan-400/30" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/30">#{i + 1}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleInclude(s)} title={s.includeInPdf ? 'Exclude from PDF' : 'Include in PDF'}
                    className={`p-1.5 rounded-lg transition-all ${s.includeInPdf ? 'text-cyan-400 bg-cyan-400/10' : 'text-white/30 hover:text-white/60'}`}>
                    {s.includeInPdf ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => remove(s.id)} className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}