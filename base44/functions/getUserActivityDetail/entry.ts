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

    const body = await req.json();
    const targetEmail = body.email;
    if (!targetEmail) return Response.json({ error: 'Email required' }, { status: 400 });

    // Log admin action
    await base44.asServiceRole.entities.AdminAuditLog.create({
      adminEmail: user.email,
      action: 'viewed_user_detail',
      targetEntity: 'UserProfile',
      targetId: targetEmail,
      details: { viewedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });

    const [profiles, sessions, events, errors] = await Promise.all([
      base44.asServiceRole.entities.UserProfile.filter({ email: targetEmail }),
      base44.asServiceRole.entities.AppSession.filter({ userEmail: targetEmail }),
      base44.asServiceRole.entities.UsageEvent.list('-timestamp', 200),
      base44.asServiceRole.entities.AppErrorLog.filter({ userEmail: targetEmail }),
    ]);

    const userEvents = events.filter(e => e.userEmail === targetEmail);

    return Response.json({
      ok: true,
      profile: profiles[0] || null,
      sessions: sessions.slice(0, 50),
      recentEvents: userEvents.slice(0, 100),
      errors: errors.slice(0, 50),
      stats: {
        totalAIQuestions: userEvents.filter(e => e.eventType === 'ai_question').length,
        totalUploads: userEvents.filter(e => e.eventType === 'dataset_uploaded').length,
        totalCharts: userEvents.filter(e => e.eventType === 'chart_created').length,
        totalReports: userEvents.filter(e => e.eventType === 'report_generated').length,
        totalPageViews: userEvents.filter(e => e.eventType === 'page_view').length,
        pagesVisited: [...new Set(userEvents.map(e => e.page).filter(Boolean))],
        featuresUsed: [...new Set(userEvents.map(e => e.feature).filter(Boolean))],
      },
    });
  } catch (error) {
    return Response.json({ error: 'Failed', details: error.message }, { status: 500 });
  }
});