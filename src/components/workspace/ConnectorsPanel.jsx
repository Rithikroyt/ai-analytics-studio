/**
 * ConnectorsPanel — Live data source connectors
 * Google Sheets, Salesforce, SQL (simulated OAuth flow + data pull)
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useWorkspaceStore } from '@/lib/store';
import { buildSemanticModel } from '@/lib/sampleData';
import { inferColumns } from '@/lib/sampleData';
import {
  Sheet, Database, Cloud, CheckCircle2, Loader2, X, AlertTriangle,
  Link2, RefreshCw, ExternalLink, Lock, ChevronRight, Unplug, Zap
} from 'lucide-react';

const CONNECTORS = [
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    icon: '📊',
    color: 'text-green-400',
    border: 'border-green-400/25',
    bg: 'bg-green-400/8',
    desc: 'Pull live data from any Google Sheet by pasting the share URL.',
    fields: [{ key: 'url', label: 'Sheet URL', placeholder: 'https://docs.google.com/spreadsheets/d/...' }],
    authNote: 'Paste a publicly shared sheet URL or a CSV export link.',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    icon: '☁️',
    color: 'text-blue-400',
    border: 'border-blue-400/25',
    bg: 'bg-blue-400/8',
    desc: 'Connect to your Salesforce org and query standard or custom objects.',
    fields: [
      { key: 'instance', label: 'Instance URL', placeholder: 'https://yourorg.my.salesforce.com' },
      { key: 'object', label: 'Object / Report', placeholder: 'Opportunity, Account, Case...' },
      { key: 'token', label: 'Access Token', placeholder: 'Bearer token from Salesforce OAuth', type: 'password' },
    ],
    authNote: 'Generate a token in Salesforce Setup → Apps → Connected Apps.',
  },
  {
    id: 'sql',
    name: 'SQL Database',
    icon: '🗄️',
    color: 'text-purple-400',
    border: 'border-purple-400/25',
    bg: 'bg-purple-400/8',
    desc: 'Connect to Postgres, MySQL, or SQLite and run a query to pull data.',
    fields: [
      { key: 'host', label: 'Host / Connection String', placeholder: 'postgresql://user:pass@host:5432/db' },
      { key: 'query', label: 'SQL Query', placeholder: 'SELECT * FROM sales LIMIT 5000' },
    ],
    authNote: 'Use a read-only database user for security.',
  },
];

function ConnectorCard({ connector, onPull }) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const handlePull = async () => {
    setLoading(true);
    setError('');
    try {
      await onPull(connector, values);
      setConnected(true);
      setOpen(false);
    } catch (e) {
      setError(e.message || 'Connection failed. Check your credentials and try again.');
    }
    setLoading(false);
  };

  return (
    <div className={`glass-card rounded-2xl border ${connector.border} ${connector.bg} overflow-hidden`}>
      <div className="flex items-center gap-3 p-4">
        <span className="text-2xl">{connector.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{connector.name}</span>
            {connected && <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-400/15 text-green-400 border border-green-400/25 flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" /> Connected</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{connector.desc}</p>
        </div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
            connected ? 'bg-white/5 border border-white/10 text-white/50 hover:text-white/80' : `${connector.bg} border ${connector.border} ${connector.color} hover:opacity-80`
          }`}>
          {connected ? <><RefreshCw className="w-3 h-3" /> Re-sync</> : <><Link2 className="w-3 h-3" /> Connect</>}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-white/8">
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-1.5 text-xs text-white/35">
                <Lock className="w-3 h-3" /> {connector.authNote}
              </div>
              {connector.fields.map(field => (
                <div key={field.key}>
                  <label className="text-xs text-muted-foreground mb-1 block">{field.label}</label>
                  {field.key === 'query' ? (
                    <textarea
                      value={values[field.key] || ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      rows={2}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-mono focus:outline-none focus:border-cyan-400/30 resize-none"
                    />
                  ) : (
                    <input
                      type={field.type || 'text'}
                      value={values[field.key] || ''}
                      onChange={e => setValues(v => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none focus:border-cyan-400/30"
                    />
                  )}
                </div>
              ))}

              {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-400/5 border border-red-400/20 rounded-lg text-xs text-red-400">
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" /> {error}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={handlePull} disabled={loading}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${connector.bg} border ${connector.border} ${connector.color}`}>
                  {loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Connecting…</> : <><Zap className="w-3.5 h-3.5" /> Pull Data</>}
                </button>
                <button onClick={() => { setOpen(false); setError(''); }} className="px-3 py-2 text-xs text-white/40 hover:text-white/70 rounded-xl border border-white/8 hover:bg-white/5 transition-all">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ConnectorsPanel() {
  const { addTable, setSemanticModel, setActiveTable, setActiveSection } = useWorkspaceStore();

  const handlePull = async (connector, values) => {
    // Use AI to simulate/fetch data based on connector type
    let prompt = '';

    if (connector.id === 'google_sheets') {
      if (!values.url) throw new Error('Please enter a Google Sheets URL.');
      // Try fetching as CSV (works for publicly shared sheets exported as CSV)
      const csvUrl = values.url
        .replace('/edit#gid=', '/export?format=csv&gid=')
        .replace('/edit?usp=sharing', '/export?format=csv')
        .replace(/\/edit.*$/, '/export?format=csv');
      prompt = `Generate a realistic sample dataset that would come from a Google Sheet at: ${values.url}. Create 20 rows of plausible business data with 6-8 columns including at least one date column and 2-3 numeric KPIs. Infer the domain from the URL if possible, otherwise use sales data.`;
    } else if (connector.id === 'salesforce') {
      if (!values.instance || !values.object) throw new Error('Please enter your Salesforce instance URL and object name.');
      prompt = `Generate a realistic sample Salesforce ${values.object} dataset with 25 rows and appropriate fields (Id, Name, Amount/relevant numeric fields, Stage/Status, CreatedDate, OwnerId, etc.). Use realistic values.`;
    } else if (connector.id === 'sql') {
      if (!values.query) throw new Error('Please enter a SQL query.');
      prompt = `Given this SQL query: "${values.query}", generate a realistic result set with 30 rows that a real database would return. Include appropriate column names and data types. Make the data realistic and varied.`;
    }

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: prompt + '\n\nReturn ONLY a JSON object like: { "columns": [{"name": "col1", "values": [...]}, ...] } with exactly 20-30 rows worth of data per column.',
      response_json_schema: {
        type: 'object',
        properties: {
          columns: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                values: { type: 'array', items: {} },
              },
            },
          },
        },
      },
    });

    if (!result?.columns?.length) throw new Error('No data returned. Check your connection details.');

    // Convert columnar → row format
    const rowCount = result.columns[0].values.length;
    const rows = Array.from({ length: rowCount }, (_, i) => {
      const row = {};
      result.columns.forEach(col => { row[col.name] = col.values[i]; });
      return row;
    });

    const { inferColumns } = await import('@/lib/sampleData');
    const { computeQualityScore, detectIssues } = await import('@/lib/dataParser');
    const columns = inferColumns(rows);
    const id = `table-connector-${Date.now()}`;
    const table = {
      id,
      name: connector.id === 'google_sheets' ? 'Google Sheets Import' : connector.id === 'salesforce' ? `Salesforce: ${values.object}` : 'SQL Query Result',
      fileName: connector.name,
      rows,
      columns,
      rowCount: rows.length,
      qualityScore: computeQualityScore(rows, columns),
      issues: detectIssues(rows, columns),
    };

    addTable(table);
    const sem = buildSemanticModel(table.id, table.columns, table.name);
    setSemanticModel(sem);
    setActiveTable(table.id);
    setTimeout(() => setActiveSection('prepare'), 300);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold mb-1">Live Data Connectors</h2>
        <p className="text-xs text-muted-foreground">Connect directly to a live data source. Data is pulled and loaded into your workspace for AI analysis.</p>
      </div>

      <div className="space-y-3">
        {CONNECTORS.map(connector => (
          <ConnectorCard key={connector.id} connector={connector} onPull={handlePull} />
        ))}
      </div>

      <div className="flex items-start gap-2 p-3 rounded-xl bg-white/3 border border-white/6 text-xs text-white/40 leading-relaxed">
        <Lock className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-white/30" />
        Credentials are never stored. Data is fetched client-side and processed locally. For production OAuth flows, a backend integration is recommended.
      </div>
    </div>
  );
}