import { supabaseRequest, getUserFromAccessToken, bearerToken, readJsonBody, sendJson } from './_supabase.js';

// Registra, uma única vez por usuário, o contexto de quando a conta foi
// criada: IP, localização aproximada (pelos cabeçalhos de geo da Vercel) e
// qual página/origem trouxe a pessoa até o cadastro.
//
// Importante: o IP e a localização vêm do próprio request no servidor —
// nunca do que o navegador envia — então não dá pra falsificar.
// O dado é sensível (é informação pessoal), por isso a tabela não tem
// nenhuma policy de leitura pública: só a service role (usada aqui e no
// endpoint de admin) consegue acessá-la.

function primeiroIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket?.remoteAddress || null;
}

function cortar(valor, max) {
  if (!valor) return null;
  return String(valor).slice(0, max);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendJson(res, 405, { ok: false, message: 'Ação não disponível.' });
  }
  try {
    const user = await getUserFromAccessToken(bearerToken(req));
    if (!user?.id) return sendJson(res, 401, { ok: false, message: 'Sessão inválida.' });

    const body = readJsonBody(req) || {};
    const cidadeBruta = req.headers['x-vercel-ip-city'];
    const row = {
      user_id: user.id,
      ip: primeiroIp(req),
      country: req.headers['x-vercel-ip-country'] || null,
      region: req.headers['x-vercel-ip-country-region'] || null,
      city: cidadeBruta ? decodeURIComponent(cidadeBruta) : null,
      entry_page: cortar(body.entry_page, 300),
      referrer: cortar(body.referrer, 300)
    };

    // on_conflict com ignore-duplicates: se a pessoa já tem um registro
    // (ela só se cadastra uma vez), a chamada seguinte não faz nada — assim
    // dá pra chamar isso a cada login sem se preocupar em saber se é a
    // primeira vez.
    await supabaseRequest('/rest/v1/signup_events?on_conflict=user_id', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify([row])
    });

    return sendJson(res, 200, { ok: true });
  } catch (error) {
    console.error('track-signup error', error?.status || '', error?.data || error?.message || error);
    // Nunca travar o cadastro/login por causa de uma métrica.
    return sendJson(res, 200, { ok: true });
  }
}
