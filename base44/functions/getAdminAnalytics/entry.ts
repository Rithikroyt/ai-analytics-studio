import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const ADMIN_EMAILS = ['rthati1@asu.edu', 'thatirithikroy@gmail.com'];

function isAdmin(user) {
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  if (role === 'admin') return true;
  return ADMIN_EMAILS.includes((user.email || '').toLowerCase());
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isAdmin(user)) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    // Fetch data (paginated/limited)
    const [profiles, sessions, errors, auditLogs] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.list('-lastActiveAt', 500),
      base44.asServiceRole.entities.AppSession.list('-startedAt', 500),
      base44.asServiceRole.entities.AppErrorLog.list('-timestamp', 200),
      base44.asServiceRole.entities.AdminAuditLog.list('-timestamp', 200),
    ]);

    // Recent events — only last 7 days to stay within limits
    const recentEvents = await base44.asServiceRole.entities.UsageEvent.list('-timestamp', 1000);

    const eventsToday = recentEvents.filter(e => (e.timestamp || '').startsWith(today));
    const eventsThisWeek = recentEvents.filter(e => (e.timestamp || '') >= weekAgo);

    const activeToday = new Set(eventsToday.map(e => e.userEmail)).size;
    const activeThisWeek = new Set(eventsThisWeek.map(e => e.userEmail)).size;

    const countByType = (type) => recentEvents.filter(e => e.eventType === type).length;

    // Feature usage breakdown
    const featureMap = {};
    recentEvents.forEach(e => {
      if (e.feature) featureMap[e.feature] = (featureMap[e.feature] || 0) + 1;
    });
    const featureUsage = Object.entries(featureMap)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);

    // AI monitoring
    const aiEvents = recentEvents.filter(e => e.eventType === 'ai_question');
    const aiByUser = {};
    aiEvents.forEach(e => { aiByUser[e.userEmail] = (aiByUser[e.userEmail] || 0) + 1; });

    // Page views trend (last 7 days)
    const pageViewsByDay = {};
    recentEvents.filter(e => e.eventType === 'page_view').forEach(e => {
      const day = (e.timestamp || '').slice(0, 10);
      if (day) pageViewsByDay[day] = (pageViewsByDay[day] || 0) + 1;
    });

    const overview = {
      totalUsers: profiles.length,
      activeToday,
      activeThisWeek,
      totalSessions: sessions.length,
      totalPageViews: countByType('page_view'),
      totalAIQuestions: countByType('ai_question'),
      totalUploads: countByType('dataset_uploaded'),
      totalChartsCreated: countByType('chart_created'),
      totalReports: countByType('report_generated'),
      totalErrors: errors.filter(e => !e.resolved).length,
      newUsersToday: profiles.filter(p => (p.firstLoginAt || '').startsWith(today)).length,
    };

    return Response.json({
      ok: true,
      overview,
      users: profiles,
      recentEvents: recentEvents.slice(0, 200),
      recentErrors: errors.slice(0, 100),
      auditLogs: auditLogs.slice(0, 100),
      featureUsage,
      aiByUser,
      pageViewsByDay,
    });
  } catch (error) {
    return Response.json({ error: 'Admin analytics failed', details: error.message }, { status: 500 });
  }
});