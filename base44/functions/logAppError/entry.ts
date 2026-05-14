import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    const body = await req.json();

    await base44.asServiceRole.entities.AppErrorLog.create({
      userEmail: user?.email || 'anonymous',
      sessionId: body.sessionId || null,
      page: body.page || null,
      feature: body.feature || null,
      errorMessage: body.errorMessage || 'Unknown error',
      stackTrace: body.stackTrace || null,
      severity: body.severity || 'medium',
      timestamp: new Date().toISOString(),
      resolved: false,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});