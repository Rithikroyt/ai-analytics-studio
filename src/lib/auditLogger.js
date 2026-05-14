/**
 * auditLogger — fire-and-forget audit logging for all analyst actions
 * Tracks: exports, dashboard views, chart saves, report generates, data access
 */
import { base44 } from '@/api/base44Client';

let _userEmail = null;

async function getUserEmail() {
  if (_userEmail) return _userEmail;
  try {
    const user = await base44.auth.me();
    _userEmail = user?.email || 'anonymous';
  } catch {
    _userEmail = 'anonymous';
  }
  return _userEmail;
}

/**
 * Log an analyst action to AdminAuditLog
 * @param {string} action - e.g. 'export_csv', 'view_dashboard', 'save_chart'
 * @param {string} targetEntity - e.g. 'Dataset', 'Chart', 'Report'
 * @param {string} targetId - name or ID of the target
 * @param {object} details - additional metadata
 */
export async function logAuditAction(action, targetEntity, targetId = '', details = {}) {
  const email = await getUserEmail();
  base44.entities.AdminAuditLog.create({
    adminEmail: email,
    action,
    targetEntity,
    targetId: String(targetId),
    details: { ...details, userAgent: navigator.userAgent.slice(0, 80), url: window.location.pathname },
    timestamp: new Date().toISOString(),
  }).catch(() => {}); // fire-and-forget, never block UI
}

/**
 * Log a usage event
 * @param {string} eventType
 * @param {string} feature
 * @param {object} metadata
 */
export async function logUsageEvent(eventType, feature, metadata = {}) {
  const email = await getUserEmail();
  base44.entities.UsageEvent.create({
    userEmail: email,
    eventType,
    feature,
    page: window.location.pathname,
    metadata,
    timestamp: new Date().toISOString(),
  }).catch(() => {});
}

// Convenience wrappers
export const auditExport = (format, datasetName, rowCount) =>
  logAuditAction('export_data', 'Dataset', datasetName, { format, rowCount });

export const auditDashboardView = (dashboardName) =>
  logAuditAction('view_dashboard', 'Dashboard', dashboardName);

export const auditChartSave = (chartTitle, datasetName) =>
  logAuditAction('save_chart', 'Chart', chartTitle, { datasetName });

export const auditReportGenerate = (reportType, datasetName) =>
  logAuditAction('generate_report', 'Report', reportType, { datasetName });

export const auditDataAccess = (datasetName, rowCount, accessType = 'view') =>
  logAuditAction(`data_access_${accessType}`, 'Dataset', datasetName, { rowCount });

export const auditSQLRun = (query, tableName) =>
  logAuditAction('run_sql', 'Query', tableName, { queryPreview: query?.slice(0, 100) });

export const auditAIQuery = (question, agentName) =>
  logAuditAction('ai_query', 'AIAgent', agentName, { questionPreview: question?.slice(0, 100) });