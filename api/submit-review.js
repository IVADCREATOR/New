const { supabaseRequest, getUserFromAccessToken, bearerToken } = require('./_supabase');

const rateMap = new Map();
function allowSubmit(userId) {
  const now = Date.now(), windowMs = 60_000, max = 5;
  const list = (rateMap.get(userId) || []).filter(ts => now - ts < windowMs);
  if (list.length >= max) { rateMap.set(userId, list); return false; }
  list.push(now); rateMap.set(userId, list);
  return true;
}

function clientIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Ação não disponível.' });
  try {
    const token = bearerToken(req);
    const user = await getUserFromAccessToken(token);
    if (!user) return json(res, 401, { ok: false, message: 'Sua sessão expirou. Entre novamente para avaliar.' });
    if (!allowSubmit(user.id)) return json(res, 429, { ok: false, message: 'Muitas tentativas em pouco tempo. Aguarde um instante.' });

    const body = req.body || {};
    const groupId = Number(body.group_id || 0);
    const rating = Number(body.rating || 0);
    const comment = typeof body.comment === 'string' ? body.comment.trim().slice(0, 600) : null;
    const email = typeof user.email === 'string' ? user.email.slice(0, 160) : null;
    const ip = clientIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 300);
    if (!(groupId > 0) || !(rating >= 1 && rating <= 5)) {
      return json(res, 400, { ok: false, message: 'Escolha uma nota de 1 a 5 para um grupo válido.' });
    }

    const group = await supabaseRequest(`/rest/v1/groups?id=eq.${groupId}&status=eq.approved&select=id&limit=1`);
    if (!group?.length) {
      return json(res, 404, { ok: false, message: 'Este grupo não está disponível para avaliação no momento.' });
    }

    const payload = {
      group_id: groupId,
      user_id: user.id,
      rating,
      comment: comment || null,
      status: 'pending',
      email,
      ip,
      user_agent: userAgent
    };

    try {
      await supabaseRequest('/rest/v1/reviews', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      if (error?.status === 409 || error?.data?.code === '23505') {
        return json(res, 409, { ok: false, message: 'Você já avaliou este grupo.' });
      }
      throw error;
    }

    return json(res, 200, { ok: true, message: 'Avaliação enviada! Ela passa por uma checagem antes de aparecer publicamente.' });
  } catch (error) {
    console.error('submit-review error', error);
    return json(res, 200, { ok: false, message: 'Não foi possível enviar sua avaliação agora. Tente novamente em instantes.' });
  }
};
