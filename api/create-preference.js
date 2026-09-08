const { supabaseRequest, getUserFromAccessToken, bearerToken } = require('./_supabase');

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok: false, message: 'Método não permitido.' });

  const token = bearerToken(req);
  const user = await getUserFromAccessToken(token);
  if (!user) return json(res, 401, { ok: false, message: 'Você precisa estar conectado para continuar.' });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return json(res, 503, { ok: false, message: 'O pagamento não está disponível no momento.' });

  let body;
  try { body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}'); } catch {
    return json(res, 400, { ok: false, message: 'Não foi possível iniciar esta compra.' });
  }

  const planId = Number(body.plan_id);
  const groupId = Number(body.group_id);
  if (!Number.isInteger(planId) || !Number.isInteger(groupId)) {
    return json(res, 400, { ok: false, message: 'Selecione um plano e um grupo válidos.' });
  }

  try {
    const plans = await supabaseRequest(`/rest/v1/promotion_plans?id=eq.${planId}&active=eq.true&select=id,name,description,price,duration_days`);
    const plan = plans?.[0];
    if (!plan) return json(res, 404, { ok: false, message: 'Este plano não está disponível.' });

    const groups = await supabaseRequest(`/rest/v1/groups?id=eq.${groupId}&owner_id=eq.${encodeURIComponent(user.id)}&select=id,name,status`);
    const group = groups?.[0];
    if (!group) return json(res, 404, { ok: false, message: 'Grupo não encontrado na sua conta.' });
    if (group.status !== 'approved') return json(res, 409, { ok: false, message: 'O grupo precisa estar aprovado antes de receber destaque.' });

    const orders = await supabaseRequest('/rest/v1/orders', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: user.id,
        group_id: group.id,
        plan_id: plan.id,
        amount: Number(plan.price),
        status: 'pending',
        payment_provider: 'mercadopago'
      })
    });
    const order = orders?.[0];
    if (!order) throw new Error('order creation failed');

    const origin = String(process.env.SITE_URL || `https://${req.headers.host || ''}`).replace(/\/+$/, '');
    const preferencePayload = {
      items: [{
        id: String(plan.id),
        title: `Sorasaki — ${plan.name}`,
        description: plan.description,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: Number(plan.price)
      }],
      external_reference: String(order.id),
      notification_url: `${origin}/api/mercadopago-webhook`,
      back_urls: {
        success: `${origin}/grupos.html?pagamento=sucesso&pedido=${order.id}`,
        pending: `${origin}/grupos.html?pagamento=pendente&pedido=${order.id}`,
        failure: `${origin}/grupos.html?pagamento=erro&pedido=${order.id}`
      },
      auto_return: 'approved',
      metadata: {
        order_id: String(order.id),
        user_id: user.id,
        group_id: String(group.id),
        plan_id: String(plan.id)
      }
    };

    const mp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preferencePayload)
    });

    const mpData = await mp.json().catch(() => ({}));
    if (!mp.ok || !mpData.id || !mpData.init_point) {
      await supabaseRequest(`/rest/v1/orders?id=eq.${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'cancelled' })
      }).catch(() => {});
      return json(res, 502, { ok: false, message: 'Não foi possível iniciar o pagamento.' });
    }

    await supabaseRequest(`/rest/v1/orders?id=eq.${order.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ payment_id: String(mpData.id) })
    });

    return json(res, 200, { ok: true, checkout_url: mpData.init_point });
  } catch (error) {
    console.error('create-preference error', error);
    return json(res, 500, { ok: false, message: 'Não foi possível iniciar o pagamento. Tente novamente.' });
  }
};
