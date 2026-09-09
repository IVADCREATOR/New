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
  const couponCode = String(body.coupon_code || '').trim().toUpperCase();
  if (!Number.isInteger(planId) || !Number.isInteger(groupId)) {
    return json(res, 400, { ok: false, message: 'Selecione um plano e um grupo válidos.' });
  }

  try {
    const plans = await supabaseRequest(`/rest/v1/promotion_plans?id=eq.${planId}&active=eq.true&select=id,name,description,price,duration_days`);
    const plan = plans?.[0];
    if (!plan) return json(res, 404, { ok: false, message: 'Este plano não está disponível.' });
    let coupon = null;
    let discount = 0;
    if (couponCode) {
      const coupons = await supabaseRequest(`/rest/v1/coupons?code=eq.${encodeURIComponent(couponCode)}&active=eq.true&select=id,code,discount_type,discount_value,starts_at,expires_at,max_uses,uses_count,max_uses_per_user,plan_id`);
      coupon = coupons?.[0];
      if (!coupon) return json(res, 400, { ok: false, message: 'Cupom inválido ou indisponível.' });
      const now = Date.now();
      if (new Date(coupon.starts_at).getTime() > now || (coupon.expires_at && new Date(coupon.expires_at).getTime() <= now)) return json(res, 400, { ok: false, message: 'Este cupom não está válido neste momento.' });
      if (coupon.max_uses != null && Number(coupon.uses_count) >= Number(coupon.max_uses)) return json(res, 400, { ok: false, message: 'Este cupom atingiu o limite de utilizações.' });
      if (coupon.plan_id != null && Number(coupon.plan_id) !== plan.id) return json(res, 400, { ok: false, message: 'Este cupom não se aplica a este plano.' });
      const previous = await supabaseRequest(`/rest/v1/coupon_redemptions?coupon_id=eq.${coupon.id}&user_id=eq.${encodeURIComponent(user.id)}&select=id&limit=100`);
      if ((previous||[]).length >= Number(coupon.max_uses_per_user || 1)) return json(res, 400, { ok: false, message: 'Você já atingiu o limite deste cupom.' });
      discount = coupon.discount_type === 'percent'
        ? Number((Number(plan.price) * Number(coupon.discount_value) / 100).toFixed(2))
        : Number(coupon.discount_value);
      discount = Math.min(Number(plan.price), Math.max(0, discount));
    }
    const finalAmount = Number((Number(plan.price) - discount).toFixed(2));
    if (finalAmount <= 0) return json(res, 400, { ok: false, message: 'O desconto não pode deixar o pedido sem valor.' });


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
        amount: finalAmount,
        coupon_id: coupon?.id || null,
        discount_amount: discount,
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
        unit_price: finalAmount
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
        plan_id: String(plan.id),
        coupon_id: coupon?.id ? String(coupon.id) : ''
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
