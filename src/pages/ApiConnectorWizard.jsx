/**
 * API Connector Wizard — No-code API ingestion
 */
import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Globe, Play, CheckCircle2, AlertTriangle, Loader2, Copy, Database, RefreshCw, Code2 } from 'lucide-react';

const PYTHON_CODE = (url, headers, recordPath) => `import requests
import pandas as pd
from datetime import datetime

def ingest_api(url, headers=None, params=None, record_path=None):
    response = requests.get(
        '${url}',
        headers=${JSON.stringify(headers || {})},
        timeout=30
    )
    response.raise_for_status()
    payload = response.json()
    
    data = payload
    if record_path:
        for key in '${recordPath || ''.split('.')}':
            data = data[key]
    
    df = pd.json_normalize(data if isinstance(data, list) else [data])
    df['ingested_at'] = datetime.utcnow()
    return df

df = ingest_api('${url}')
print(df.shape)
print(df.head())`;

function flattenJSON(obj, prefix = '') {
  const result = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenJSON(v, key));
    } else {
      result[key] = v;
    }
  }
  return result;
}

function getNestedPath(obj, path) {
  if (!path) return obj;
  try {
    return path.split('.').reduce((acc, key) => acc[key], obj);
  } catch {
    return null;
  }
}

function inferSchema(rows) {
  if (!rows?.length) return [];
  const sample = rows[0];
  return Object.entries(sample).map(([name, val]) => ({
    name,
    type: typeof val === 'number' ? 'number' : val instanceof Date || (typeof val === 'string' && !isNaN(Date.parse(val)) && val.includes('-')) ? 'date' : 'string',
    sample: String(val ?? '').slice(0, 40),
  }));
}

export default function ApiConnectorWizard() {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState({
    apiName: '', url: '', method: 'GET', headers: '{}', params: '{}',
    authToken: '', recordPath: '', tableName: '', refreshFrequency: 'manual',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const testConnection = async () => {
    if (!config.url) return;
    setTesting(true);
    setTestError('');
    setTestResult(null);
    try {
      const headers = JSON.parse(config.headers || '{}');
      if (config.authToken) headers['Authorization'] = `Bearer ${config.authToken}`;

      const res = await fetch(config.url, { method: config.method, headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const raw = await res.json();
      const data = getNestedPath(raw, config.recordPath);
      const rows = Array.isArray(data) ? data : [data];
      const flattened = rows.slice(0, 5).map(r => flattenJSON(r));
      const schema = inferSchema(flattened);
      setTestResult({ raw: JSON.stringify(raw, null, 2).slice(0, 1000), flattened, schema, rowCount: rows.length });
      setStep(3);
    } catch (e) {
      setTestError(e.message || 'Connection failed. Check URL, CORS policy, and authentication.');
    }
    setTesting(false);
  };

  const saveDataSource = async () => {
    if (!testResult) return;
    setSaving(true);
    try {
      const user = await base44.auth.me().catch(() => ({}));
      const ds = await base44.entities.DataSource.create({
        name: config.tableName || config.apiName,
        fileName: `${config.apiName}_api`,
        fileType: 'json',
        status: 'ready',
        rowCount: testResult.rowCount,
        columnCount: testResult.schema.length,
        uploadedBy: user.email || '',
        uploadedAt: new Date().toISOString(),
        description: `API source: ${config.url} — ingested via API Connector Wizard`,
        tags: ['api', 'connector'],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {}
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-white/8 px-8 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-400/15 border border-blue-400/25 flex items-center justify-center">
            <Globe className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-black">API Connector Wizard</h1>
            <p className="text-xs text-muted-foreground">Connect any REST API · Test · Flatten JSON · Infer Schema · Create DataSource</p>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="flex gap-0 border-b border-white/8 px-8">
        {[
          { n: 1, label: 'Configure API' },
          { n: 2, label: 'Test Connection' },
          { n: 3, label: 'Preview & Save' },
        ].map(s => (
          <button key={s.n} onClick={() => step >= s.n && setStep(s.n)}
            className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-all ${step === s.n ? 'border-blue-400 text-blue-400' : step > s.n ? 'border-green-400/50 text-green-400' : 'border-transparent text-white/30'}`}>
            {step > s.n ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-xs">{s.n}</span>}
            {s.label}
          </button>
        ))}
      </div>

      <div className="p-8 max-w-3xl">
        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-white/60">Step 1: Configure API</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/35 mb-1 block">API Name</label>
                <input value={config.apiName} onChange={e => set('apiName', e.target.value)}
                  placeholder="e.g. Salesforce Accounts"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">Output Table Name</label>
                <input value={config.tableName} onChange={e => set('tableName', e.target.value)}
                  placeholder="e.g. salesforce_accounts"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">API URL</label>
              <input value={config.url} onChange={e => set('url', e.target.value)}
                placeholder="https://api.example.com/v1/data"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
              <p className="text-xs text-white/25 mt-1">Tip: Use public APIs like https://jsonplaceholder.typicode.com/posts to test</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/35 mb-1 block">HTTP Method</label>
                <select value={config.method} onChange={e => set('method', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">Refresh Frequency</label>
                <select value={config.refreshFrequency} onChange={e => set('refreshFrequency', e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none">
                  <option value="manual">Manual only</option>
                  <option value="hourly">Hourly</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-white/35 mb-1 block">Auth Token / API Key (optional)</label>
              <input value={config.authToken} onChange={e => set('authToken', e.target.value)}
                placeholder="Bearer token or API key value"
                type="password"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/35 mb-1 block">Headers (JSON)</label>
                <textarea value={config.headers} onChange={e => set('headers', e.target.value)} rows={3}
                  placeholder='{"Content-Type": "application/json"}'
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-xs focus:outline-none font-mono resize-none" />
              </div>
              <div>
                <label className="text-xs text-white/35 mb-1 block">Record Path (JSON dot notation, optional)</label>
                <input value={config.recordPath} onChange={e => set('recordPath', e.target.value)}
                  placeholder="e.g. data.results or items"
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none font-mono" />
                <p className="text-xs text-white/25 mt-1">Leave blank if response is already an array</p>
              </div>
            </div>
            <button onClick={() => setStep(2)}
              disabled={!config.url || !config.apiName}
              className="px-6 py-2.5 bg-blue-400/15 border border-blue-400/25 text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-400/20 transition-all disabled:opacity-40">
              Next: Test Connection →
            </button>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-white/60">Step 2: Test Connection</h2>
            <div className="p-4 rounded-xl bg-white/3 border border-white/8 text-sm space-y-1">
              <div><span className="text-white/35">URL: </span><span className="font-mono text-cyan-400">{config.url}</span></div>
              <div><span className="text-white/35">Method: </span><span className="font-mono">{config.method}</span></div>
              {config.recordPath && <div><span className="text-white/35">Record Path: </span><span className="font-mono text-amber-400">{config.recordPath}</span></div>}
              {config.authToken && <div><span className="text-white/35">Auth: </span><span className="text-green-400">Token configured ✓</span></div>}
            </div>
            {testError && (
              <div className="p-4 rounded-xl bg-red-400/8 border border-red-400/20 flex items-start gap-2 text-sm text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Connection Failed</div>
                  <div className="text-xs mt-1 text-red-400/70">{testError}</div>
                  <div className="text-xs mt-2 text-white/35">Note: Many public APIs have CORS restrictions. Test from a backend function if the browser connection fails.</div>
                </div>
              </div>
            )}
            <button onClick={testConnection} disabled={testing}
              className="flex items-center gap-2 px-6 py-2.5 bg-green-400/15 border border-green-400/25 text-green-400 rounded-xl text-sm font-bold hover:bg-green-400/20 transition-all disabled:opacity-50">
              {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {testing ? 'Testing Connection…' : 'Test Connection & Fetch Sample'}
            </button>
          </div>
        )}

        {/* Step 3 */}
        {step === 3 && testResult && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold text-white/60">Step 3: Preview Schema & Save DataSource</h2>

            <div className="p-4 rounded-xl bg-green-400/8 border border-green-400/20 flex items-center gap-3 text-green-400 text-sm">
              <CheckCircle2 className="w-4 h-4" />
              Connection successful! {testResult.rowCount} records detected · {testResult.schema.length} columns
            </div>

            {/* Inferred schema */}
            <div>
              <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Inferred Schema</div>
              <div className="rounded-xl border border-white/8 overflow-auto max-h-48">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-white/8 bg-white/3">
                    {['Column', 'Inferred Type', 'Sample Value'].map(h => (
                      <th key={h} className="px-3 py-2 text-left text-white/35 font-mono">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {testResult.schema.map(col => (
                      <tr key={col.name} className="border-b border-white/5 hover:bg-white/2">
                        <td className="px-3 py-2 font-mono text-cyan-400">{col.name}</td>
                        <td className="px-3 py-2 text-white/50">{col.type}</td>
                        <td className="px-3 py-2 text-white/35 truncate max-w-48">{col.sample}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Raw JSON preview */}
            <div>
              <div className="text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Raw JSON Preview</div>
              <pre className="bg-black/30 border border-white/8 rounded-xl p-3 text-xs text-green-400/80 font-mono overflow-auto max-h-48 whitespace-pre-wrap">{testResult.raw}</pre>
            </div>

            {/* Python code */}
            <div className="rounded-xl border border-purple-400/20 bg-black/20">
              <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
                <span className="text-xs text-purple-400 font-semibold">Generated Python — Ingestion Script</span>
                <button onClick={() => { navigator.clipboard.writeText(PYTHON_CODE(config.url, JSON.parse(config.headers || '{}'), config.recordPath)); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                  className="flex items-center gap-1 text-xs text-white/30 hover:text-purple-400 transition-all">
                  {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <pre className="p-4 text-xs text-purple-400/80 font-mono overflow-x-auto whitespace-pre-wrap">{PYTHON_CODE(config.url, JSON.parse(config.headers || '{}'), config.recordPath)}</pre>
            </div>

            <div className="flex gap-3">
              <button onClick={saveDataSource} disabled={saving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${saved ? 'bg-green-400/15 border border-green-400/25 text-green-400' : 'bg-blue-400/15 border border-blue-400/25 text-blue-400 hover:bg-blue-400/20'} disabled:opacity-50`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                {saved ? 'Saved to DataSources!' : 'Save DataSource'}
              </button>
              <button onClick={testConnection} disabled={testing}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-white/50 rounded-xl text-sm hover:bg-white/8 transition-all disabled:opacity-40">
                <RefreshCw className="w-3.5 h-3.5" /> Re-test
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}