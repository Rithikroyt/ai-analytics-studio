/**
 * Observability — In-memory telemetry ring buffer
 * Tracks: tool calls, LLM calls, SQL execution, chart renders, errors
 */

const MAX_EVENTS = 500;
const state = {
  events: [],
  sessionStart: Date.now(),
};

export const obs = {
  log(type, data = {}) {
    const event = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      ts: Date.now(),
      ...data,
    };
    state.events.push(event);
    if (state.events.length > MAX_EVENTS) state.events.shift();
    return event;
  },

  startTimer(type, data = {}) {
    const start = Date.now();
    return {
      end(extraData = {}) {
        const latencyMs = Date.now() - start;
        return obs.log(type, { ...data, ...extraData, latencyMs, success: extraData.error == null });
      },
    };
  },

  logToolCall(toolName, inputSize = 0) {
    return obs.startTimer('tool_call', { toolName, inputSize });
  },

  logLLMCall(model, question = '') {
    return obs.startTimer('llm_call', { model, question: question.slice(0, 100) });
  },

  logSQL(sql = '') {
    return obs.startTimer('sql', { sql: sql.slice(0, 200) });
  },

  logError(component, error) {
    return obs.log('error', { component, message: error?.message || String(error), stack: error?.stack?.slice(0, 300) });
  },

  logChartRender(chartType, dataPoints) {
    return obs.log('chart_render', { chartType, dataPoints });
  },

  logReport(reportType) {
    return obs.startTimer('report', { reportType });
  },

  getLogs(type = null, limit = 100) {
    const filtered = type ? state.events.filter(e => e.type === type) : state.events;
    return filtered.slice(-limit).reverse();
  },

  getMetrics() {
    const events = state.events;
    const byType = {};
    events.forEach(e => {
      if (!byType[e.type]) byType[e.type] = { count: 0, errors: 0, totalLatency: 0, latencies: [] };
      byType[e.type].count++;
      if (!e.success && e.error) byType[e.type].errors++;
      if (e.latencyMs) { byType[e.type].totalLatency += e.latencyMs; byType[e.type].latencies.push(e.latencyMs); }
    });

    const metrics = {};
    Object.entries(byType).forEach(([type, data]) => {
      const sorted = [...data.latencies].sort((a, b) => a - b);
      metrics[type] = {
        count: data.count,
        errorRate: data.count ? (data.errors / data.count * 100).toFixed(1) + '%' : '0%',
        avgLatency: data.latencies.length ? Math.round(data.totalLatency / data.latencies.length) + 'ms' : null,
        p50: sorted[Math.floor(sorted.length * 0.5)] ? sorted[Math.floor(sorted.length * 0.5)] + 'ms' : null,
        p95: sorted[Math.floor(sorted.length * 0.95)] ? sorted[Math.floor(sorted.length * 0.95)] + 'ms' : null,
      };
    });
    return metrics;
  },

  getAlerts() {
    const alerts = [];
    const recent = state.events.filter(e => e.ts > Date.now() - 5 * 60 * 1000);
    const errors = recent.filter(e => e.type === 'error');
    const llmFallbacks = recent.filter(e => e.type === 'llm_call' && e.fallback);
    const slowOps = recent.filter(e => e.latencyMs > 8000);

    if (errors.length > 3) alerts.push({ level: 'critical', message: `${errors.length} errors in last 5 minutes`, type: 'error_spike' });
    if (llmFallbacks.length > 2) alerts.push({ level: 'warning', message: `${llmFallbacks.length} AI fallbacks triggered`, type: 'ai_fallback' });
    if (slowOps.length > 0) alerts.push({ level: 'warning', message: `${slowOps.length} operations took >8s`, type: 'slow_ops' });
    return alerts;
  },

  clear() {
    state.events = [];
    state.sessionStart = Date.now();
  },

  getUptime() {
    return Math.round((Date.now() - state.sessionStart) / 1000) + 's';
  },
};