/**
 * StreamingConnectors — Real-time event stream simulation + webhook configuration
 */
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import {
  Zap, Activity, Globe, Radio, Play, Pause, CheckCircle2,
  AlertTriangle, TrendingUp, TrendingDown, Loader2, Plus, X, Link
} from 'lucide-react';

const CONNECTOR_TYPES = [
  { id: 'webhook', label: 'Webhook', icon: Globe, color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', desc: 'Receive real-time events from any HTTP source' },
  { id: 'kafka', label: 'Kafka Topic', icon: Radio, color: 'text-purple-400', bg: 'bg-purple-400/10', border: 'border-purple-400/20', desc: 'Stream data from Apache Kafka topics' },
  { id: 'iot', label: 'IoT / MQTT', icon: Activity, color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20', desc: 'Ingest sensor data and IoT device streams' },
  { id: 'api_poll', label: 'API Polling', icon: Zap, color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', desc: 'Poll external APIs on a configurable interval' },
];

function generateEvent(connectorType) {
  const templates = {
    webhook: () => ({ type: 'order.created', orderId: `ORD-${Math.floor(Math.random() * 10000)}`, amount: (Math.random() * 500 + 50).toFixed(2), customer: `cust_${Math.floor(Math.random() * 1000)}`, ts: new Date().toISOString() }),
    kafka: () => ({ topic: 'events.user', event: ['page_view', 'click', 'purchase', 'signup'][Math.floor(Math.random() * 4)], userId: `u_${Math.floor(Math.random() * 5000)}`, sessionId: `s_${Math.floor(Math.random() * 1000)}`, ts: new Date().toISOString() }),
    iot: () => ({ deviceId: `sensor_${Math.floor(Math.random() * 50)}`, temperature: (20 + Math.random() * 15).toFixed(1), humidity: (40 + Math.random() * 40).toFixed(1), pressure: (1000 + Math.random() * 50).toFixed(0), ts: new Date().toISOString() }),
    api_poll: () => ({ endpoint: '/api/metrics', metric: ['revenue', 'orders', 'churn_rate', 'nps'][Math.floor(Math.random() * 4)], value: (Math.random() * 1000).toFixed(2), change: ((Math.random() - 0.5) * 20).toFixed(1) + '%', ts: new Date().toISOString() }),
  };
  return (templates[connectorType] || templates.webhook)();
}

export default function StreamingConnectors() {
  const [activeConnector, setActiveConnector] = useState(CONNECTOR_TYPES[0]);
  const [streaming, setStreaming] = useState(false);
  const [events, setEvents] = useState([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [connections, setConnections] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const intervalRef = useRef(null);
  const eventsRef = useRef(events);
  eventsRef.current = events;

  const startStream = () => {
    setStreaming(true);
    setEvents([]);
    setAnomalies([]);
    intervalRef.current = setInterval(() => {
      const event = generateEvent(activeConnector.id);
      const isAnomaly = Math.random() < 0.08;
      if (isAnomaly) {
        setAnomalies(prev => [...prev.slice(-9), { ...event, anomalyType: 'spike', detectedAt: new Date().toISOString() }]);
      }
      setEvents(prev => [{ ...event, _id: Date.now(), _anomaly: isAnomaly }, ...prev.slice(0, 49)]);
    }, 800);
  };

  const stopStream = () => {
    setStreaming(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const addConnection = () => {
    if (!webhookUrl.trim()) return;
    setConnections(prev => [...prev, { id: Date.now(), url: webhookUrl, type: activeConnector.id, status: 'active', eventsCount: 0, addedAt: new Date().toISOString() }]);
    setWebhookUrl('');
  };

  const totalEvents = events.length;
  const eventsPerSec = streaming ? '~1.2' : '0';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-black mb-1">Real-time Streaming Connectors</h2>
        <p className="text-sm text-muted-foreground">Connect live data streams for instant analytics, anomaly detection, and event-driven alerts.</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Events/sec', value: eventsPerSec, color: 'text-cyan-400' },
          { label: 'Total Events', value: totalEvents, color: 'text-purple-400' },
          { label: 'Anomalies', value: anomalies.length, color: anomalies.length > 0 ? 'text-red-400' : 'text-green-400' },
        ].map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 border border-white/8 text-center">
            <div className={`text-2xl font-black font-mono ${s.color}`}>{s.value}</div>
            <div className="text-xs text-white/40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Connector Selection */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CONNECTOR_TYPES.map(c => (
          <button key={c.id} onClick={() => { setActiveConnector(c); stopStream(); setEvents([]); }}
            className={`p-4 rounded-2xl border text-left transition-all ${activeConnector.id === c.id ? `${c.bg} ${c.border}` : 'bg-white/3 border-white/8 hover:border-white/15'}`}>
            <c.icon className={`w-5 h-5 ${activeConnector.id === c.id ? c.color : 'text-white/30'} mb-2`} />
            <div className="text-xs font-bold">{c.label}</div>
            <div className="text-xs text-white/35 mt-0.5 leading-relaxed">{c.desc}</div>
          </button>
        ))}
      </div>

      {/* Connection Config */}
      <div className="glass-card rounded-2xl p-5 border border-white/8">
        <div className="flex items-center gap-2 mb-3">
          <Link className={`w-4 h-4 ${activeConnector.color}`} />
          <span className="text-sm font-bold">Configure {activeConnector.label}</span>
        </div>
        <div className="flex gap-2 mb-3">
          <input value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)}
            placeholder={activeConnector.id === 'webhook' ? 'https://your-app.com/webhook' : activeConnector.id === 'kafka' ? 'kafka://broker:9092/topic' : activeConnector.id === 'iot' ? 'mqtt://broker:1883/sensors/#' : 'https://api.example.com/metrics'}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm font-mono text-white/70 focus:outline-none focus:border-cyan-400/30" />
          <button onClick={addConnection} disabled={!webhookUrl.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-400/10 border border-cyan-400/20 text-cyan-400 text-xs font-semibold rounded-xl hover:bg-cyan-400/15 transition-all disabled:opacity-40">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>

        {connections.length > 0 && (
          <div className="space-y-1.5">
            {connections.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/8 text-xs">
                <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 animate-pulse" />
                <span className="font-mono text-white/50 flex-1 truncate">{c.url}</span>
                <span className="text-white/25">{c.type}</span>
                <button onClick={() => setConnections(p => p.filter(x => x.id !== c.id))} className="text-white/20 hover:text-red-400 transition-colors"><X className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stream Controls */}
      <div className="flex items-center gap-3">
        <button onClick={streaming ? stopStream : startStream}
          className={`flex items-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl transition-all ${streaming ? 'bg-red-400/15 border border-red-400/25 text-red-400 hover:bg-red-400/20' : `${activeConnector.bg} border ${activeConnector.border} ${activeConnector.color} hover:opacity-80`}`}>
          {streaming ? <><Pause className="w-4 h-4" /> Stop Stream</> : <><Play className="w-4 h-4" /> Start Live Stream</>}
        </button>
        {streaming && (
          <div className="flex items-center gap-2 text-xs text-white/40">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            LIVE · receiving events
          </div>
        )}
      </div>

      {/* Anomaly Alerts */}
      <AnimatePresence>
        {anomalies.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-red-400/5 border border-red-400/20">
            <div className="flex items-center gap-2 mb-2 text-sm font-bold text-red-400">
              <AlertTriangle className="w-4 h-4" /> {anomalies.length} Stream Anomalies Detected
            </div>
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {anomalies.slice(0, 5).map((a, i) => (
                <div key={i} className="text-xs text-white/50 font-mono flex items-center gap-2">
                  <span className="text-red-400">⚠</span>
                  <span>{JSON.stringify(a).slice(0, 80)}…</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Event Feed */}
      <div className="glass-card rounded-2xl border border-white/8 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8 bg-white/2">
          <Activity className={`w-4 h-4 ${streaming ? activeConnector.color : 'text-white/20'}`} />
          <span className="text-xs font-semibold text-white/50">Live Event Feed</span>
          {streaming && <span className="text-xs text-white/25">{events.length} events buffered</span>}
          {events.length > 0 && <button onClick={() => setEvents([])} className="ml-auto text-xs text-white/20 hover:text-white/50 transition-colors">Clear</button>}
        </div>
        <div className="max-h-64 overflow-y-auto font-mono text-xs">
          {events.length === 0 && (
            <div className="p-8 text-center text-white/20">{streaming ? 'Waiting for events…' : 'Start stream to see live events'}</div>
          )}
          <AnimatePresence initial={false}>
            {events.slice(0, 20).map(e => (
              <motion.div key={e._id} initial={{ opacity: 0, backgroundColor: 'rgba(0,229,255,0.1)' }} animate={{ opacity: 1, backgroundColor: 'transparent' }} transition={{ duration: 0.6 }}
                className={`flex items-start gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/2 ${e._anomaly ? 'bg-red-400/5' : ''}`}>
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${e._anomaly ? 'bg-red-400' : 'bg-green-400'}`} />
                <span className="text-white/30 flex-shrink-0">{new Date(e.ts).toLocaleTimeString()}</span>
                <span className={`flex-1 truncate ${e._anomaly ? 'text-red-300/70' : 'text-white/50'}`}>
                  {JSON.stringify({ ...e, _id: undefined, _anomaly: undefined })}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}