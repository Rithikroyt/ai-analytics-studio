/**
 * Frontend tracking helper — fire-and-forget, never throws
 */
import { base44 } from '@/api/base44Client';

function getOrCreateSessionId() {
  let id = sessionStorage.getItem('omnidata_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('omnidata_session_id', id);
  }
  return id;
}

export async function trackEvent({ eventType, feature = null, page = null, objectType = null, objectId = null, metadata = {} }) {
  try {
    const sessionId = getOrCreateSessionId();
    await base44.functions.invoke('trackUsageEvent', {
      sessionId,
      eventType,
      feature,
      page: page || window.location.pathname,
      objectType,
      objectId,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });
  } catch {
    // Silently ignore — tracking must never break the app
  }
}

export async function logError({ errorMessage, stackTrace = null, feature = null, severity = 'medium' }) {
  try {
    await base44.functions.invoke('logAppError', {
      sessionId: getOrCreateSessionId(),
      page: window.location.pathname,
      feature,
      errorMessage,
      stackTrace,
      severity,
    });
  } catch {
    // ignore
  }
}