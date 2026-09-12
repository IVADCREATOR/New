import { supabaseRequest, requireAdmin, sendJson } from './_supabase.js';

// Lista os registros de contexto de cadastro (IP, localização, página de
// entrada, data). Só admin ativo acessa — validado no servidor com a
// service role, igual aos outros endpoints administrativos.
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { ok: false, message: 'Ação não disponível.' });
  }
  try {
    const admin = await requireAdmin(req);
    if (!admin) return sendJson(res, 403, { ok: false, message: 'Você não tem permissão para esta ação.' });

    const limit = Math.min(Math.max(Number(req.query?.limit) || 50, 1), 200);
    const rows = await supabaseRequest(
      `/rest/v1/signup_events?select=user_id,ip,country,region,city,entry_page,referrer,created_at&order=created_at.desc&limit=${limit}`
    );
    return sendJson(res, 200, { ok: true, signups: rows || [] });
  } catch (error) {
    console.error('admin-signups error', error?.status || '', error?.data || error?.message || error);
    return sendJson(res, 500, { ok: false, message: 'Não foi possível carregar os cadastros agora.' });
  }
}
