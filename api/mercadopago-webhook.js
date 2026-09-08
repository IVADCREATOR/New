const crypto = require('crypto');
const { supabaseRequest } = require('./_supabase');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function validSignature(req, resourceId) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
  const signature = String(req.headers['x-signature'] || '');
  const requestId = String(req.headers['x-request-id'] || '');
  if (!secret || !signature || !requestId || !resourceId) return false;

  const values = {};
  for (const part of signature.split(',')) {
    const [key, ...rest] = part.split('=');
    if (key && rest.length) values[key.trim()] = rest.join('=').trim();
  }
  if (!values.ts || !values.v1) return false;

  const manifest = `id:${resourceId};request-id:${requestId};ts:${values.ts};`;
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex');
  return safeEqual(expected, values.v1);
}

async function getPayment(paymentId) {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('payment configuration missing');
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('payment lookup failed');
  return data;
}

function mapStatus(status) {
  if (status === 'approved') return 'paid';
  if (status === 'rejected') return 'rejected';
  if (status === 'cancelled') return 'cancelled';
  if (status === 'refunded' || status === 'charged_back') return 'refunded';
  if (status === 'expired') return 'expired';
  return 'pending';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST' && req.method !== 'GET') return res.status(405).end();

  const type = String(req.query?.type || req.body?.type || '');
  const paymentId = String(req.query?.['data.id'] || req.query?.data?.id || req.body?.data?.id || '');
  if (type && type !== 'payment') return res.status(200).json({ ok: true });

  if (!paymentId || !validSignature(req, paymentId)) {
    return res.status(401).json({ ok: false });
  }

  try {
    const payment = await getPayment(paymentId);
    const externalReference = String(payment.external_reference || '');
    const orderId = Number(externalReference);
    if (!Number.isInteger(orderId) || orderId <= 0) return res.status(200).json({ ok: true });

    const orders = await supabaseRequest(`/rest/v1/orders?id=eq.${orderId}&select=id,user_id,group_id,plan_id,amount,status`);
    const order = orders?.[0];
    if (!order) return res.status(200).json({ ok: true });

    const amountMatches = Math.abs(Number(payment.transaction_amount || 0) - Number(order.amount || 0)) < 0.01;
    if (!amountMatches) return res.status(422).json({ ok: false });

    const status = mapStatus(payment.status);
    const patch = {
      status,
      payment_id: String(payment.id),
      paid_at: status === 'paid' ? new Date().toISOString() : null
    };

    await supabaseRequest(`/rest/v1/orders?id=eq.${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });

    if (status === 'paid') {
      const plans = await supabaseRequest(`/rest/v1/promotion_plans?id=eq.${order.plan_id}&select=id,duration_days`);
      const plan = plans?.[0];
      if (plan && order.group_id) {
        const now = new Date();
        const active = await supabaseRequest(`/rest/v1/promotions?group_id=eq.${order.group_id}&active=eq.true&expires_at=gt.${encodeURIComponent(now.toISOString())}&select=expires_at&order=expires_at.desc&limit=1`);
        const base = active?.[0]?.expires_at ? new Date(active[0].expires_at) : now;
        const starts = base > now ? base : now;
        const expires = new Date(starts.getTime() + Number(plan.duration_days) * 86400000);
        await supabaseRequest('/rest/v1/promotions', {
          method: 'POST',
          headers: { Prefer: 'resolution=ignore-duplicates' },
          body: JSON.stringify({
            group_id: order.group_id,
            order_id: order.id,
            plan_id: plan.id,
            starts_at: starts.toISOString(),
            expires_at: expires.toISOString(),
            active: true
          })
        });
      }
    }
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('mercadopago-webhook error', error);
    return res.status(500).json({ ok: false });
  }
};
