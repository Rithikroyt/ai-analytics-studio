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

    await base44.asServiceRole.entities.AdminAuditLog.create({
      adminEmail: user.email,
      action: body.action,
      targetEntity: body.targetEntity || null,
      targetId: body.targetId || null,
      details: body.details || {},
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});