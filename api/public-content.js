const { supabaseRequest } = require('./_supabase');

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.end(JSON.stringify(body));
}

function safeUrl(value) {
  if (!value) return null;
  try {
    const u = new URL(String(value), 'https://sorasakiplatform.store');
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    return u.href;
  } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    if (req.method !== 'GET') return json(res, 405, { ok:false, message:'Método não permitido.' });
    const raw = String(req.query?.type || 'all').toLowerCase();
    const type = ['all','products','news','notices'].includes(raw) ? raw : 'all';
    const out = { ok:true, products:[], news:[], notices:[] };
    if (type === 'all' || type === 'products') {
      const rows = await supabaseRequest('/rest/v1/products?active=eq.true&select=id,name,slug,description,price,previous_price,promo_price,image_url,category,display_order,created_at&order=display_order.asc,created_at.desc&limit=100');
      out.products = (rows || []).map(p => ({...p, image_url:safeUrl(p.image_url)}));
    }
    if (type === 'all' || type === 'news') {
      const now = new Date().toISOString();
      const rows = await supabaseRequest(`/rest/v1/news?status=eq.published&publish_at=lte.${encodeURIComponent(now)}&select=id,title,summary,content,category,image_url,publish_at&order=publish_at.desc&limit=30`);
      out.news = (rows || []).map(n => ({...n, image_url:safeUrl(n.image_url)}));
    }
    if (type === 'all' || type === 'notices') {
      const now = new Date().toISOString();
      const rows = await supabaseRequest(`/rest/v1/site_notices?active=eq.true&starts_at=lte.${encodeURIComponent(now)}&or=(ends_at.is.null,ends_at.gt.${encodeURIComponent(now)})&select=id,title,message,notice_type,highlighted,starts_at,ends_at&order=highlighted.desc,starts_at.desc&limit=10`);
      out.notices = rows || [];
    }
    return json(res, 200, out);
  } catch (error) {
    console.error('public-content error', error?.status || error?.message || error);
    return json(res, 500, { ok:false, message:'Não foi possível carregar o conteúdo agora.' });
  }
};
