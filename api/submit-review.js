import { supabaseRequest, getUserFromAccessToken, bearerToken, readJsonBody, sendJson } from './_supabase.js';

const rateMap = new Map();
function allowSubmit(userId) {
  const now = Date.now(), windowMs = 60_000, max = 5;
  const list = (rateMap.get(userId) || []).filter((ts) => now - ts < windowMs);
  if (list.length >= max) { rateMap.set(userId, list); return false; }
  list.push(now);
  rateMap.set(userId, list);
  return true;
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Ação não disponível.' });
  }
  try {
    const user = await getUserFromAccessToken(bearerToken(req));
    if (!user) return sendJson(res, 401, { ok: false, message: 'Você precisa entrar na sua conta para avaliar.' });
    if (!allowSubmit(user.id)) return sendJson(res, 429, { ok: false, message: 'Muitas tentativas em pouco tempo. Aguarde um instante.' });

    const body = readJsonBody(req) || {};
    const groupId = Number(body.group_id || 0);
    const rating = Number(body.rating || 0);
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 600) : null;
    if (!(groupId > 0) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      return sendJson(res, 400, { ok: false, message: 'Escolha uma nota de 1 a 5.' });
    }

    const group = await supabaseRequest(`/rest/v1/groups?id=eq.${groupId}&status=eq.approved&select=id,owner_id&limit=1`);
    if (!group?.length) {
      return sendJson(res, 404, { ok: false, message: 'Este grupo não está disponível para avaliação no momento.' });
    }
    if (group[0].owner_id === user.id) {
      return sendJson(res, 400, { ok: false, message: 'Você não pode avaliar a sua própria divulgação.' });
    }

    try {
      await supabaseRequest('/rest/v1/reviews', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          group_id: groupId,
          user_id: user.id,
          rating,
          comment: comment || null,
          status: 'pending',
          email: user.email || null,
          ip: clientIp(req),
          user_agent: String(req.headers['user-agent'] || '').slice(0, 300)
        })
      });
    } catch (error) {
      if (error?.status === 409 || error?.data?.code === '23505') {
        return sendJson(res, 409, { ok: false, message: 'Você já avaliou este grupo.' });
      }
      throw error;
    }

    return sendJson(res, 200, { ok: true, message: 'Avaliação enviada! Ela aparece publicamente depois de uma checagem rápida da equipe.' });
  } catch (error) {
    console.error('submit-review error', error?.status || '', error?.data || error?.message || error);
    return sendJson(res, 500, { ok: false, message: 'Não foi possível enviar sua avaliação agora. Tente novamente em instantes.' });
  }
}
