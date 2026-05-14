import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const now = new Date().toISOString();
    const sessionId = body.sessionId || crypto.randomUUID();

    // Write usage event
    await base44.asServiceRole.entities.UsageEvent.create({
      eventId: crypto.randomUUID(),
      sessionId,
      userEmail: user.email,
      eventType: body.eventType || 'page_view',
      feature: body.feature || null,
      page: body.page || null,
      objectType: body.objectType || null,
      objectId: body.objectId || null,
      metadata: body.metadata || {},
      timestamp: body.timestamp || now,
    });

    // Upsert UserProfile
    const existing = await base44.asServiceRole.entities.UserProfile.filter({ email: user.email });

    if (existing.length === 0) {
      await base44.asServiceRole.entities.UserProfile.create({
        email: user.email,
        fullName: user.full_name || '',
        avatarUrl: user.avatar_url || '',
        role: user.role || 'user',
        loginProvider: 'Google',
        firstLoginAt: now,
        lastLoginAt: now,
        loginCount: 1,
        sessionCount: 1,
        visitCount: 1,
        totalPageViews: body.eventType === 'page_view' ? 1 : 0,
        totalEvents: 1,
        lastActivePage: body.page || null,
        lastActiveAt: now,
        status: 'Active',
      });
    } else {
      const profile = existing[0];
      await base44.asServiceRole.entities.UserProfile.update(profile.id, {
        lastLoginAt: now,
        lastActiveAt: now,
        lastActivePage: body.page || profile.lastActivePage,
        totalEvents: (profile.totalEvents || 0) + 1,
        totalPageViews: body.eventType === 'page_view' ? (profile.totalPageViews || 0) + 1 : (profile.totalPageViews || 0),
        visitCount: (profile.visitCount || 0) + (body.eventType === 'page_view' ? 1 : 0),
      });
    }

    // Upsert AppSession
    const sessions = await base44.asServiceRole.entities.AppSession.filter({ sessionId });
    if (sessions.length === 0) {
      await base44.asServiceRole.entities.AppSession.create({
        sessionId,
        userEmail: user.email,
        startedAt: now,
        lastSeenAt: now,
        pageViews: body.eventType === 'page_view' ? 1 : 0,
        eventsCount: 1,
        deviceType: detectDevice(body.userAgent || ''),
        browser: detectBrowser(body.userAgent || ''),
        entryPage: body.page || null,
      });
    } else {
      const session = sessions[0];
      const startMs = new Date(session.startedAt).getTime();
      await base44.asServiceRole.entities.AppSession.update(session.id, {
        lastSeenAt: now,
        durationSeconds: Math.floor((Date.now() - startMs) / 1000),
        pageViews: body.eventType === 'page_view' ? (session.pageViews || 0) + 1 : (session.pageViews || 0),
        eventsCount: (session.eventsCount || 0) + 1,
        exitPage: body.page || session.exitPage,
      });
    }

    return Response.json({ ok: true, sessionId });
  } catch (error) {
    return Response.json({ error: 'Tracking failed', details: error.message }, { status: 500 });
  }
});

function detectDevice(ua) {
  if (!ua) return 'Unknown';
  if (/Mobi|Android/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function detectBrowser(ua) {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Other';
}