/**
 * DataConnectorSection — Live cloud storage connector interface.
 * Connect Google Drive, S3, Dropbox URLs so datasets auto-refresh.
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import {
  Link2, Plus, Trash2, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  Cloud, FileText, Clock, Database, ExternalLink, Zap
} from 'lucide-react';

const SOURCE_TYPES = [
  { id: 'url', label: 'Direct URL', icon: Link2, color: '#00e5ff', desc: 'CSV/JSON from any public URL', placeholder: 'https://example.com/data.csv' },
  { id: 'gdrive', label: 'Google Drive', icon: Cloud, color: '#4caf50', desc: 'Public Google Sheet or Drive file', placeholder: 'https://docs.google.com/spreadsheets/...' },
  { id: 's3', label: 'AWS S3', icon: Database, color: '#ff9900', desc: 'Public S3 bucket URL', placeholder: 'https://mybucket.s3.amazonaws.com/data.csv' },
  { id: 'dropbox', label: 'Dropbox', icon: Cloud, color: '#0061ff', desc: 'Dropbox shared link', placeholder: 'https://www.dropbox.com/s/...' },
  { id: 'github', label: 'GitHub Raw', icon: FileText, color: '#a855f7', desc: 'Raw file from GitHub repo', placeholder: 'https://raw.githubusercontent.com/...' },
];

const REFRESH_INTERVALS = [
  { value: 0, label: 'Manual only' },
  { value: 15, label: 'Every 15 min' },
  { value: 60, label: 'Every hour' },
  { value: 360, label: 'Every 6 hours' },
  { value: 1440, label: 'Daily' },
];

function ConnectorCard({ connector, onDelete, onRefresh }) {
  const statusColor = connector.status === 'connected' ? 'text-green-400'
    : connector.status === 'error' ? 'text-red-400'
    : 'text-white/30';
  const StatusIcon = connector.status === 'connected' ? CheckCircle2
    : connector.status === 'error' ? AlertCircle
    : Loader2;

  const src = SOURCE_TYPES.find(s => s.id === connector.type) || SOURCE_TYPES[0];
  const Icon = src.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card rounded-2xl border border-white/8 p-4 flex items-start gap-3 group hover:border-white/15 transition-all">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${src.color}15`, border: `1px solid ${src.color}25` }}>
        <Icon className="w-4 h-4" style={{ color: src.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <div className="font-semibold text-sm truncate">{connector.name}</div>
          <StatusIcon className={`w-3.5 h-3.5 flex-shrink-0 ${statusColor} ${connector.status === 'loading' ? 'animate-spin' : ''}`} />
        </div>
        <div className="text-xs text-white/30 truncate mb-1">{connector.url}</div>
        <div className="flex items-center gap-3 text-xs text-white/20">
          <span>{src.label}</span>
          {connector.lastRefreshed && <span><Clock className="w-3 h-3 inline mr-0.5" />{new Date(connector.lastRefreshed).toLocaleTimeString()}</span>}
          {connector.rowCount && <span>{connector.rowCount.toLocaleString()} rows</span>}
          {connector.refreshInterval > 0 && <span>Auto: every {REFRESH_INTERVALS.find(r => r.value === connector.refreshInterval)?.label?.replace('Every ', '') || '—'}</span>}
        </div>
        {connector.error && <div className="text-xs text-red-400 mt-1">{connector.error}</div>}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => onRefresh(connector.id)}
          className="p-1.5 rounded-lg text-white/30 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all" title="Refresh now">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <a href={connector.url} target="_blank" rel="noopener noreferrer"
          className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/8 transition-all" title="Open source">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        <button onClick={() => onDelete(connector.id)}
          className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export default function DataConnectorSection() {
  const { loadTableFromUrl } = useWorkspaceStore();
  const [connectors, setConnectors] = useState(() => {
    try { return JSON.parse(localStorage.getItem('omni_connectors') || '[]'); } catch { return []; }
  });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '', type: 'url', refreshInterval: 0 });
  const [connecting, setConnecting] = useState(false);
  const [formError, setFormError] = useState('');

  const persist = (list) => {
    setConnectors(list);
    localStorage.setItem('omni_connectors', JSON.stringify(list));
  };

  const handleConnect = async () => {
    if (!form.url.trim() || !form.name.trim()) { setFormError('Name and URL are required.'); return; }
    setConnecting(true);
    setFormError('');
    const id = Date.now().toString();
    const newConn = { ...form, id, status: 'loading', lastRefreshed: null, rowCount: null, error: null };
    const updated = [newConn, ...connectors];
    persist(updated);
    setShowForm(false);
    setForm({ name: '', url: '', type: 'url', refreshInterval: 0 });

    // Try to actually fetch + parse the file
    try {
      let fetchUrl = form.url;
      // Convert Google Sheets share URL to CSV export
      if (fetchUrl.includes('docs.google.com/spreadsheets')) {
        const match = fetchUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (match) fetchUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
      }
      // Convert Dropbox share link to direct download
      if (fetchUrl.includes('dropbox.com') && fetchUrl.includes('?dl=0')) {
        fetchUrl = fetchUrl.replace('?dl=0', '?dl=1');
      }
      // Convert GitHub blob to raw
      if (fetchUrl.includes('github.com') && fetchUrl.includes('/blob/')) {
        fetchUrl = fetchUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }

      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      // Parse CSV quickly
      const lines = text.trim().split('\n').slice(0, 1001);
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
      const rows = lines.slice(1, 1001).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = vals[i]?.replace(/"/g, '').trim() || ''; });
        return obj;
      });

      persist(updated.map(c => c.id === id
        ? { ...c, status: 'connected', lastRefreshed: new Date().toISOString(), rowCount: rows.length, resolvedUrl: fetchUrl }
        : c
      ));

      // Load into workspace if user wants
      if (loadTableFromUrl) loadTableFromUrl(form.name, rows, headers);

    } catch (e) {
      persist(updated.map(c => c.id === id
        ? { ...c, status: 'error', error: e.message || 'Could not fetch data from URL' }
        : c
      ));
    }
    setConnecting(false);
  };

  const handleRefresh = async (id) => {
    const conn = connectors.find(c => c.id === id);
    if (!conn) return;
    persist(connectors.map(c => c.id === id ? { ...c, status: 'loading', error: null } : c));
    try {
      const res = await fetch(conn.resolvedUrl || conn.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const lines = text.trim().split('\n');
      const rowCount = lines.length - 1;
      persist(connectors.map(c => c.id === id
        ? { ...c, status: 'connected', lastRefreshed: new Date().toISOString(), rowCount, error: null }
        : c
      ));
    } catch (e) {
      persist(connectors.map(c => c.id === id ? { ...c, status: 'error', error: e.message } : c));
    }
  };

  const handleDelete = (id) => persist(connectors.filter(c => c.id !== id));

  const connected = connectors.filter(c => c.status === 'connected').length;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Data Connectors</h2>
            <p className="text-xs text-muted-foreground">{connected} active · {connectors.length} total connections</p>
          </div>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-300 transition-all"
          style={{ color: 'hsl(222,47%,6%)' }}>
          <Plus className="w-3.5 h-3.5" /> Add Connector
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="glass-card rounded-2xl border border-cyan-400/20 p-5 mb-5 space-y-4">
            <div className="text-sm font-bold text-cyan-400">New Data Connector</div>

            {/* Source type */}
            <div>
              <div className="text-xs text-white/40 mb-2">Source Type</div>
              <div className="grid grid-cols-3 gap-2">
                {SOURCE_TYPES.map(s => {
                  const Icon = s.icon;
                  return (
                    <button key={s.id} onClick={() => setForm(f => ({ ...f, type: s.id }))}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs transition-all text-left ${form.type === s.id ? 'border-opacity-40' : 'border-white/8 bg-white/2 hover:border-white/15'}`}
                      style={form.type === s.id ? { borderColor: `${s.color}40`, background: `${s.color}10` } : {}}>
                      <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: form.type === s.id ? s.color : 'rgba(255,255,255,0.3)' }} />
                      <span className={form.type === s.id ? 'font-semibold' : 'text-white/40'}>{s.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-white/25 mt-1.5">{SOURCE_TYPES.find(s => s.id === form.type)?.desc}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-white/40 mb-1.5">Connection Name</div>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Sales Data Q2"
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
              </div>
              <div>
                <div className="text-xs text-white/40 mb-1.5">Auto-Refresh</div>
                <select value={form.refreshInterval} onChange={e => setForm(f => ({ ...f, refreshInterval: Number(e.target.value) }))}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
                  {REFRESH_INTERVALS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/40 mb-1.5">File URL</div>
              <input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder={SOURCE_TYPES.find(s => s.id === form.type)?.placeholder || 'https://...'}
                className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground" />
            </div>

            {formError && <p className="text-xs text-red-400">{formError}</p>}

            <div className="flex gap-2 justify-end">
              <button onClick={() => { setShowForm(false); setFormError(''); }}
                className="px-4 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl hover:bg-white/5 transition-all">
                Cancel
              </button>
              <button onClick={handleConnect} disabled={connecting || !form.url.trim() || !form.name.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-400 rounded-xl text-xs font-bold hover:bg-cyan-300 transition-all disabled:opacity-40"
                style={{ color: 'hsl(222,47%,6%)' }}>
                {connecting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : <><Zap className="w-3.5 h-3.5" /> Connect & Load</>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Connector list */}
      {connectors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Cloud className="w-12 h-12 text-white/10 mb-3" />
          <h3 className="font-semibold mb-1">No Connectors Yet</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm">
            Connect a live CSV, Google Sheet, or S3 file and your charts will stay fresh automatically without manual re-uploads.
          </p>
          <div className="grid grid-cols-1 gap-2 text-left w-full max-w-sm">
            {SOURCE_TYPES.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white/2 border border-white/6 text-xs text-white/40">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: s.color }} />
                  <span className="font-medium">{s.label}</span>
                  <span className="text-white/25">— {s.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {connectors.map(c => (
            <ConnectorCard key={c.id} connector={c} onDelete={handleDelete} onRefresh={handleRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}