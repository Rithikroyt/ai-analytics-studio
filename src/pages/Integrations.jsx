import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Link2, CheckCircle2, AlertTriangle, Loader2, RefreshCw,
  ChevronLeft, ExternalLink, Clock, Database, Zap, Shield,
  Plus, X, Settings, Trash2, Play, Globe
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWorkspaceStore } from '@/lib/store';

const CONNECTORS = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    desc: 'Sync spreadsheets directly from Google Drive. Auto-refresh on schedule.',
    icon: '📊',
    color: 'text-green-400', border: 'border-green-400/25', bg: 'bg-green-400/8',
    badge: 'OAuth 2.0',
    badgeColor: 'text-green-400 bg-green-400/10 border-green-400/20',
    fields: [{ key: 'sheet_url', label: 'Sheet URL', placeholder: 'https://docs.google.com/spreadsheets/d/...' }],
    authType: 'oauth',
    schedules: ['Every 15 min', 'Hourly', 'Daily', 'Manual'],
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    desc: 'Pull CRM data — Opportunities, Leads, Accounts — via Salesforce REST API.',
    icon: '☁️',
    color: 'text-blue-400', border: 'border-blue-400/25', bg: 'bg-blue-400/8',
    badge: 'OAuth 2.0',
    badgeColor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    fields: [
      { key: 'instance_url', label: 'Instance URL', placeholder: 'https://yourorg.salesforce.com' },
      { key: 'object', label: 'Object / Report', placeholder: 'Opportunity, Lead, Account…' },
    ],
    authType: 'oauth',
    schedules: ['Hourly', 'Every 6 hours', 'Daily', 'Manual'],
  },
  {
    id: 'postgres',
    name: 'PostgreSQL',
    desc: 'Connect to any Postgres database. Run custom SQL queries on a schedule.',
    icon: '🐘',
    color: 'text-cyan-400', border: 'border-cyan-400/25', bg: 'bg-cyan-400/8',
    badge: 'Direct',
    badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    fields: [
      { key: 'host', label: 'Host', placeholder: 'db.example.com' },
      { key: 'database', label: 'Database', placeholder: 'my_database' },
      { key: 'username', label: 'Username', placeholder: 'readonly_user' },
      { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM analytics.daily_revenue LIMIT 5000', textarea: true },
    ],
    authType: 'credentials',
    schedules: ['Every 15 min', 'Hourly', 'Daily', 'Manual'],
  },
  {
    id: 'bigquery',
    name: 'Google BigQuery',
    desc: 'Run queries against BigQuery datasets and sync results automatically.',
    icon: '🔵',
    color: 'text-indigo-400', border: 'border-indigo-400/25', bg: 'bg-indigo-400/8',
    badge: 'OAuth 2.0',
    badgeColor: 'text-indigo-400 bg-indigo-400/10 border-indigo-400/20',
    fields: [
      { key: 'project_id', label: 'Project ID', placeholder: 'my-gcp-project' },
      { key: 'query', label: 'BigQuery SQL', placeholder: 'SELECT * FROM `project.dataset.table`', textarea: true },
    ],
    authType: 'oauth',
    schedules: ['Hourly', 'Every 6 hours', 'Daily', 'Manual'],
  },
  {
    id: 'hubspot',
    name: 'HubSpot',
    desc: 'Sync contacts, deals, and pipeline data from HubSpot CRM.',
    icon: '🟠',
    color: 'text-orange-400', border: 'border-orange-400/25', bg: 'bg-orange-400/8',
    badge: 'OAuth 2.0',
    badgeColor: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
    fields: [{ key: 'object_type', label: 'Object Type', placeholder: 'contacts, deals, companies' }],
    authType: 'oauth',
    schedules: ['Hourly', 'Daily', 'Manual'],
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    desc: 'Query your Snowflake data warehouse. Run SQL and sync result sets on a schedule.',
    icon: '❄️',
    color: 'text-cyan-400', border: 'border-cyan-400/25', bg: 'bg-cyan-400/8',
    badge: 'Direct',
    badgeColor: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
    fields: [
      { key: 'account', label: 'Account Identifier', placeholder: 'xy12345.us-east-1' },
      { key: 'warehouse', label: 'Warehouse', placeholder: 'COMPUTE_WH' },
      { key: 'database', label: 'Database', placeholder: 'ANALYTICS_DB' },
      { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM ANALYTICS_DB.PUBLIC.REVENUE LIMIT 10000', textarea: true },
    ],
    authType: 'credentials',
    schedules: ['Every 15 min', 'Hourly', 'Every 6 hours', 'Daily', 'Manual'],
  },
  {
    id: 'rest_api',
    name: 'Custom REST API',
    desc: 'Connect any JSON REST endpoint. Define headers, auth, and response path.',
    icon: '🔌',
    color: 'text-purple-400', border: 'border-purple-400/25', bg: 'bg-purple-400/8',
    badge: 'API Key',
    badgeColor: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
    fields: [
      { key: 'url', label: 'Endpoint URL', placeholder: 'https://api.example.com/v1/data' },
      { key: 'api_key', label: 'API Key / Bearer Token', placeholder: 'sk-...' },
      { key: 'json_path', label: 'JSON Data Path (optional)', placeholder: 'data.records' },
    ],
    authType: 'api_key',
    schedules: ['Every 15 min', 'Hourly', 'Daily', 'Manual'],
  },
];

const STATUS_META = {
  connected: { label: 'Connected', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/25', dot: 'bg-green-400' },
  syncing: { label: 'Syncing…', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/25', dot: 'bg-cyan-400 animate-pulse' },
  error: { label: 'Error', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/25', dot: 'bg-red-400' },
  pending: { label: 'Pending Auth', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/25', dot: 'bg-amber-400 animate-pulse' },
};

function ConnectorCard({ connector, connection, onConnect, onSync, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);
  const status = connection ? STATUS_META[connection.status] : null;

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`glass-card rounded-2xl border ${connector.border} transition-all`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl ${connector.bg} border ${connector.border} flex items-center justify-center text-xl flex-shrink-0`}>
              {connector.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">{connector.name}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono ${connector.badgeColor}`}>{connector.badge}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-52 leading-relaxed">{connector.desc}</p>
            </div>
          </div>
          {connection && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${status.bg} ${status.border} ${status.color} flex-shrink-0`}>
              <div className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </div>
          )}
        </div>

        {connection ? (
          <div className="space-y-3">
            {/* Sync info */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Last sync: {connection.lastSync ? new Date(connection.lastSync).toLocaleString() : 'Never'}</span>
              <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Schedule: {connection.schedule}</span>
              {connection.rowCount && <span className="flex items-center gap-1"><Database className="w-3 h-3" /> {connection.rowCount.toLocaleString()} rows</span>}
            </div>
            {connection.error && (
              <div className="flex items-start gap-2 p-3 rounded-xl bg-red-400/5 border border-red-400/20 text-xs text-red-400">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {connection.error}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => onSync(connector.id)}
                disabled={connection.status === 'syncing'}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-50 ${connector.bg} ${connector.border} ${connector.color}`}>
                {connection.status === 'syncing' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                {connection.status === 'syncing' ? 'Syncing…' : 'Sync Now'}
              </button>
              <button onClick={() => setExpanded(v => !v)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white/70 border border-white/8 hover:bg-white/5 transition-all">
                <Settings className="w-3 h-3" /> Configure
              </button>
              <button onClick={() => onDisconnect(connector.id)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-white/30 hover:text-red-400 border border-white/8 hover:border-red-400/25 transition-all ml-auto">
                <Trash2 className="w-3 h-3" /> Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setExpanded(v => !v)}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold border transition-all ${connector.bg} ${connector.border} ${connector.color} hover:opacity-80`}>
            <Plus className="w-3.5 h-3.5" /> Connect {connector.name}
          </button>
        )}
      </div>

      {/* Config form */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <ConnectorForm connector={connector} existing={connection} onSubmit={(data) => { onConnect(connector.id, data); setExpanded(false); }} onCancel={() => setExpanded(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function ConnectorForm({ connector, existing, onSubmit, onCancel }) {
  const [fields, setFields] = useState(() => {
    const init = {};
    connector.fields.forEach(f => { init[f.key] = existing?.config?.[f.key] || ''; });
    return init;
  });
  const [schedule, setSchedule] = useState(existing?.schedule || connector.schedules[1]);

  return (
    <div className="p-5 space-y-4">
      {connector.authType === 'oauth' && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-400/5 border border-blue-400/20">
          <Shield className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-blue-400/90 leading-relaxed">
            <strong>OAuth authentication</strong> — In production, clicking "Connect" would redirect to {connector.name}'s OAuth consent screen. For this demo, the connection is simulated locally.
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {connector.fields.map(f => (
          <div key={f.key} className={f.textarea ? 'md:col-span-2' : ''}>
            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
            {f.textarea ? (
              <textarea value={fields[f.key]} onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder} rows={3}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 resize-none font-mono" />
            ) : (
              <input value={fields[f.key]} onChange={e => setFields(s => ({ ...s, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30" />
            )}
          </div>
        ))}
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Sync Schedule</label>
          <select value={schedule} onChange={e => setSchedule(e.target.value)}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-cyan-400/30 text-foreground">
            {connector.schedules.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => onSubmit({ config: fields, schedule })}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${connector.bg} ${connector.border} ${connector.color}`}>
          {connector.authType === 'oauth' ? <><Globe className="w-3.5 h-3.5" /> Authorize &amp; Connect</> : <><Link2 className="w-3.5 h-3.5" /> Save Connection</>}
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs text-white/40 hover:text-white/70 border border-white/8 rounded-xl hover:bg-white/5 transition-all">Cancel</button>
      </div>
    </div>
  );
}

export default function Integrations() {
  const { addTable, setSemanticModel, setActiveSection } = useWorkspaceStore();
  const [connections, setConnections] = useState({}); // { [connectorId]: { status, lastSync, schedule, config, rowCount, error } }
  const [syncLog, setSyncLog] = useState([]); // [{ id, connectorId, connectorName, time, status, rows, message }]

  const handleConnect = (connectorId, data) => {
    const connector = CONNECTORS.find(c => c.id === connectorId);
    setConnections(s => ({
      ...s,
      [connectorId]: {
        status: 'pending',
        schedule: data.schedule,
        config: data.config,
        lastSync: null,
        rowCount: null,
        error: null,
      }
    }));
    // Simulate OAuth / credential verification
    setTimeout(() => {
      setConnections(s => ({
        ...s,
        [connectorId]: { ...s[connectorId], status: 'connected' }
      }));
      addSyncLog(connectorId, connector.name, 'connected', null, `Connection to ${connector.name} established`);
    }, 1500);
  };

  const addSyncLog = (connectorId, name, status, rows, message) => {
    setSyncLog(s => [{
      id: Date.now().toString(),
      connectorId, connectorName: name,
      time: new Date().toISOString(),
      status, rows, message,
    }, ...s].slice(0, 50));
  };

  const handleSync = (connectorId) => {
    const connector = CONNECTORS.find(c => c.id === connectorId);
    setConnections(s => ({ ...s, [connectorId]: { ...s[connectorId], status: 'syncing', error: null } }));
    // Simulate data sync
    setTimeout(() => {
      const rows = Math.floor(Math.random() * 4000) + 500;
      setConnections(s => ({
        ...s,
        [connectorId]: { ...s[connectorId], status: 'connected', lastSync: new Date().toISOString(), rowCount: rows }
      }));
      addSyncLog(connectorId, connector.name, 'success', rows, `Synced ${rows.toLocaleString()} rows successfully`);
    }, 2500);
  };

  const handleDisconnect = (connectorId) => {
    const connector = CONNECTORS.find(c => c.id === connectorId);
    setConnections(s => {
      const next = { ...s };
      delete next[connectorId];
      return next;
    });
    addSyncLog(connectorId, connector.name, 'disconnected', null, 'Connection removed');
  };

  const connectedCount = Object.keys(connections).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-white/5 px-6 py-4 sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/workspace" className="p-1.5 rounded-lg text-white/40 hover:text-white/80 hover:bg-white/5 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-cyan-400/10 border border-cyan-400/20 flex items-center justify-center">
              <Link2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Data Integrations</h1>
              <p className="text-xs text-muted-foreground">{connectedCount} connected · Live sync from external sources</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/3 border border-white/8">
              <Zap className="w-3 h-3 text-cyan-400" /> Scheduled sync replaces manual uploads
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-8">
        {/* Stats */}
        {connectedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Connected Sources', value: connectedCount, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
              { label: 'Syncing Now', value: Object.values(connections).filter(c => c.status === 'syncing').length, color: 'text-blue-400', bg: 'bg-blue-400/10' },
              { label: 'Total Rows Synced', value: Object.values(connections).reduce((s, c) => s + (c.rowCount || 0), 0).toLocaleString(), color: 'text-green-400', bg: 'bg-green-400/10' },
              { label: 'Sync Events', value: syncLog.length, color: 'text-purple-400', bg: 'bg-purple-400/10' },
            ].map(s => (
              <div key={s.label} className="glass-card rounded-xl p-4 border border-white/5 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <Database className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Connectors grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-bold text-base mb-0.5">Available Connectors</h2>
              <p className="text-xs text-muted-foreground">Connect live data sources for automatic scheduled ingestion</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {CONNECTORS.map((connector, i) => (
              <ConnectorCard key={connector.id} connector={connector}
                connection={connections[connector.id] || null}
                onConnect={handleConnect}
                onSync={handleSync}
                onDisconnect={handleDisconnect} />
            ))}
          </div>
        </div>

        {/* Sync Activity Log */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm">Sync Activity Log</h2>
            {syncLog.length > 0 && (
              <button onClick={() => setSyncLog([])} className="text-xs text-white/30 hover:text-white/60 transition-colors">
                Clear log
              </button>
            )}
          </div>
          {syncLog.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground border border-white/5 rounded-2xl">
              <RefreshCw className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No sync activity yet. Connect a source above to begin.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {syncLog.map(entry => (
                <motion.div key={entry.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/2 border border-white/5 text-xs">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    entry.status === 'success' ? 'bg-green-400/10' :
                    entry.status === 'error' ? 'bg-red-400/10' :
                    entry.status === 'connected' ? 'bg-cyan-400/10' : 'bg-white/5'
                  }`}>
                    {entry.status === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> :
                     entry.status === 'error' ? <AlertTriangle className="w-3.5 h-3.5 text-red-400" /> :
                     entry.status === 'connected' ? <Link2 className="w-3.5 h-3.5 text-cyan-400" /> :
                     <X className="w-3.5 h-3.5 text-white/30" />}
                  </div>
                  <span className="font-semibold text-white/70 w-28 flex-shrink-0">{entry.connectorName}</span>
                  <span className="text-white/50 flex-1">{entry.message}</span>
                  {entry.rows && <span className="text-cyan-400/70 font-mono">{entry.rows.toLocaleString()} rows</span>}
                  <span className="text-white/25 flex-shrink-0">{new Date(entry.time).toLocaleTimeString()}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 p-4 glass rounded-xl border border-white/5 text-xs text-muted-foreground">
          <Shield className="w-4 h-4 flex-shrink-0 mt-0.5 text-cyan-400/60" />
          <span>
            <strong className="text-white/50">Production note:</strong> OAuth flows require registered app credentials with each provider. Postgres/REST connections run through a secure backend proxy. Credentials are encrypted at rest and never exposed client-side. Scheduled syncs update your workspace datasets automatically.
          </span>
        </div>
      </div>
    </div>
  );
}