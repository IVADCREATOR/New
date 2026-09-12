import { supabaseRequest, readJsonBody, sendJson } from './_supabase.js';

function cleanPath(v) {
  const x = String(v || '/').trim();
  return x.startsWith('/') ? x.slice(0, 180).replace(/[\r\n]/g, '') : '/';
}
function validVisitorId(v) {
  return /^[A-Za-z0-9_-]{20,120}$/.test(String(v || ''));
}
async function readAnalytics() {
  const result = await supabaseRequest('/rest/v1/rpc/get_site_analytics', { method: 'POST', body: '{}' });
  return result && result.ok ? result : { ok: true, website: result || {} };
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (req.method === 'GET') return sendJson(res, 200, await readAnalytics());
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return sendJson(res, 405, { ok: false, message: 'Ação não disponível.' });
    }
    const body = readJsonBody(req) || {};
    const visitorId = String(body.visitor_id || '').trim();
    const path = cleanPath(body.path);
    if (!validVisitorId(visitorId)) return sendJson(res, 400, { ok: false });
    if (/^\/api(?:\/|$)/i.test(path) || /^\/controle-8f4c2e91(?:\/|$)/i.test(path)) return sendJson(res, 400, { ok: false });
    await supabaseRequest('/rest/v1/rpc/record_site_visit', {
      method: 'POST',
      body: JSON.stringify({ p_visitor_id: visitorId, p_path: path })
    });
    return sendJson(res, 200, { ok: true });
  } catch (e) {
    console.error('site-analytics error', e?.status || '', e?.data || e?.message || e);
    return sendJson(res, 500, { ok: false, message: 'Não foi possível carregar as estatísticas agora.' });
  }
}
