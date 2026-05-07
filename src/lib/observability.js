/**
 * observability.js — In-app telemetry ring buffer
 * Tracks tool calls, LLM calls, SQL execution, errors, and latency
 */

const MAX_EVENTS = 500;
const ring = [];
let listeners = [];

export const obs = {
  log(type, data = {}) {
    const event = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      type,
      ts: Date.now(),
      ...data,
    };
    ring.push(event);
    if (ring.length > MAX_EVENTS) ring.shift();
    listeners.forEach(fn => fn(event));
    return event.id;
  },

  // Convenience helpers
  toolCall(tool, fn) {
    const start = performance.now();
    const id = obs.log('tool_call', { tool, status: 'running' });
    return Promise.resolve()
      .then(() => fn())
      .then(result => {
        obs.log('tool_call', { tool, status: 'success', latencyMs: Math.round(performance.now() - start), resultSize: JSON.stringify(result || '').length });
        return result;
      })
      .catch(err => {
        obs.log('tool_call', { tool, status: 'error', latencyMs: Math.round(performance.now() - start), error: err?.message });
        throw err;
      });
  },

  llmCall(model, prompt, fn) {
    const start = performance.now();
    obs.log('llm_call', { model, promptLen: prompt?.length, status: 'running' });
    return Promise.resolve()
      .then(() => fn())
      .then(result => {
        obs.log('llm_call', { model, status: 'success', latencyMs: Math.round(performance.now() - start) });
        return result;
      })
      .catch(err => {
        obs.log('llm_call', { model, status: 'error', latencyMs: Math.round(performance.now() - start), error: err?.message });
        obs.log('ai_fallback', { model, reason: err?.message });
        throw err;
      });
  },

  sqlRun(sql, fn) {
    const start = performance.now();
    return Promise.resolve()
      .then(() => fn())
      .then(result => {
        obs.log('sql_run', { status: 'success', latencyMs: Math.round(performance.now() - start), rows: result?.rows?.length });
        return result;
      })
      .catch(err => {
        obs.log('sql_run', { status: 'error', latencyMs: Math.round(performance.now() - start), error: err?.message });
        throw err;
      });
  },

  error(component, error) {
    obs.log('error', { component, message: error?.message || String(error), stack: error?.stack?.slice(0, 500) });
  },

  getLogs(type = null) {
    return type ? ring.filter(e => e.type === type) : [...ring];
  },

  getMetrics() {
    const byType = {};
    ring.forEach(e => {
      if (!byType[e.type]) byType[e.type] = { count: 0, errors: 0, totalLatency: 0, latencies: [] };
      byType[e.type].count++;
      if (e.status === 'error') byType[e.type].errors++;
      if (e.latencyMs) {
        byType[e.type].totalLatency += e.latencyMs;
        byType[e.type].latencies.push(e.latencyMs);
      }
    });

    const result = {};
    Object.entries(byType).forEach(([type, data]) => {
      const sorted = [...data.latencies].sort((a, b) => a - b);
      result[type] = {
        count: data.count,
        errorRate: data.count > 0 ? Math.round((data.errors / data.count) * 100) : 0,
        p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
        p95: sorted[Math.floor(sorted.length * 0.95)] || 0,
        avgLatency: data.latencies.length ? Math.round(data.totalLatency / data.latencies.length) : 0,
      };
    });
    return result;
  },

  subscribe(fn) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },

  clear() {
    ring.length = 0;
  },

  getAlerts() {
    const alerts = [];
    const recentErrors = ring.filter(e => e.type === 'error' && Date.now() - e.ts < 60000);
    if (recentErrors.length >= 3) alerts.push({ level: 'error', msg: `${recentErrors.length} errors in last 60s` });

    const fallbacks = ring.filter(e => e.type === 'ai_fallback' && Date.now() - e.ts < 300000);
    if (fallbacks.length >= 2) alerts.push({ level: 'warn', msg: `AI fallback triggered ${fallbacks.length}x in last 5 min` });

    const slowLLM = ring.filter(e => e.type === 'llm_call' && e.latencyMs > 10000);
    if (slowLLM.length > 0) alerts.push({ level: 'warn', msg: `${slowLLM.length} slow LLM calls (>10s)` });

    return alerts;
  },
};