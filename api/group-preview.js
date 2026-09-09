const crypto = require('crypto');
const dns = require('dns').promises;
const net = require('net');
const { supabaseRequest, getUserFromAccessToken, bearerToken } = require('./_supabase');

const MAX_HTML = 1024 * 1024;
const MAX_IMAGE = 5 * 1024 * 1024;
const ALLOWED_HOSTS = [
  'chat.whatsapp.com', 'www.whatsapp.com',
  't.me', 'telegram.me',
  'discord.gg', 'discord.com', 'www.discord.com'
];
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg','image/png','image/webp','image/gif']);
const lookupRate = new Map();
function allowLookup(userId){const now=Date.now(),windowMs=60_000,max=12;const list=(lookupRate.get(userId)||[]).filter(ts=>now-ts<windowMs);if(list.length>=max){lookupRate.set(userId,list);return false;}list.push(now);lookupRate.set(userId,list);return true;}


function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const parts = ip.split('.').map(Number);
    const [a,b] = parts;
    return a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a === 0;
  }
  if (net.isIPv6(ip)) {
    const h = ip.toLowerCase();
    return h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80:') || h.startsWith('::ffff:127.') || h.startsWith('::ffff:10.') || h.startsWith('::ffff:192.168.') || h.startsWith('::ffff:172.');
  }
  return true;
}
async function assertPublicHost(hostname) {
  const host = String(hostname || '').toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('private_host');
  if (net.isIP(host)) { if (isPrivateIp(host)) throw new Error('private_host'); return; }
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(r => isPrivateIp(r.address))) throw new Error('private_host');
}

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}
function hostAllowed(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./,'');
  return ALLOWED_HOSTS.some(x => h === x || h.endsWith('.' + x));
}
function normalizeUrl(value) {
  try {
    const u = new URL(String(value || '').trim());
    if (!['http:','https:'].includes(u.protocol)) return null;
    if (!hostAllowed(u.hostname)) return null;
    return u;
  } catch { return null; }
}
function providerFor(u) {
  const h = u.hostname.toLowerCase();
  if (h === 'chat.whatsapp.com' || h.endsWith('.whatsapp.com')) return 'whatsapp';
  if (h === 't.me' || h.endsWith('.telegram.me')) return 'telegram';
  if (h === 'discord.gg' || h === 'discord.com' || h === 'www.discord.com') return 'discord';
  return 'unknown';
}
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;/gi,"'")
    .replace(/&lt;/gi,'<').replace(/&gt;/gi,'>');
}
function meta(html, key) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["'][^>]*>`, 'i');
  const m = html.match(re);
  return decodeEntities(m?.[1] || m?.[2] || '').trim();
}
function firstImageFromJsonLd(html) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  for (const block of blocks) {
    try {
      const value = JSON.parse(block[1]);
      const stack = Array.isArray(value) ? value : [value];
      for (const item of stack) {
        const image = item?.image;
        if (typeof image === 'string') return image;
        if (Array.isArray(image) && typeof image[0] === 'string') return image[0];
        if (image?.url) return image.url;
      }
    } catch {}
  }
  return '';
}
async function readLimited(response, limit) {
  const len = Number(response.headers.get('content-length') || 0);
  if (len > limit) throw new Error('too_large');
  if (!response.body) return Buffer.from(await response.arrayBuffer());
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      try { await reader.cancel(); } catch {}
      throw new Error('too_large');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
async function fetchPage(url) {
  await assertPublicHost(url.hostname);
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'SorasakiGroupPreview/1.0 (+https://sorasakiplatform.store)',
      accept: 'text/html,application/xhtml+xml'
    }
  });
  if (!response.ok) throw new Error('page_unavailable');
  const finalUrl = new URL(response.url || url);
  if (!hostAllowed(finalUrl.hostname)) throw new Error('redirect_not_allowed');
  await assertPublicHost(finalUrl.hostname);
  const body = await readLimited(response, MAX_HTML);
  return { html: body.toString('utf8'), finalUrl };
}
async function fetchImage(imageUrl) {
  const u = new URL(imageUrl);
  if (!['http:','https:'].includes(u.protocol) || u.href.length > 2000) throw new Error('image_url_invalid');
  await assertPublicHost(u.hostname);
  const response = await fetch(u, {
    redirect: 'follow',
    headers: { 'user-agent': 'SorasakiGroupPreview/1.0 (+https://sorasakiplatform.store)', accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8' }
  });
  if (!response.ok) throw new Error('image_unavailable');
  const finalUrl = new URL(response.url || u.toString());
  await assertPublicHost(finalUrl.hostname);
  const contentType = String(response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) throw new Error('image_type_not_allowed');
  const body = await readLimited(response, MAX_IMAGE);
  if (!body.length) throw new Error('image_empty');
  return { body, contentType };
}
function extension(type) {
  return ({'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/gif':'gif'})[type] || 'bin';
}
async function uploadImage(buffer, contentType, ownerId, scope, hash) {
  const path = `${scope}/${ownerId}/${hash}.${extension(contentType)}`;
  const url = `${process.env.SUPABASE_URL.replace(/\/+$/,'')}/storage/v1/object/group-images/${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'cache-control': 'public,max-age=31536000,immutable'
    },
    body: buffer
  });
  if (!response.ok) throw new Error('storage_upload_failed');
  const publicUrl = `${process.env.SUPABASE_URL.replace(/\/+$/,'')}/storage/v1/object/public/group-images/${path.split('/').map(encodeURIComponent).join('/')}`;
  return { path, publicUrl };
}
async function adminUser(userId) {
  const rows = await supabaseRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(userId)}&select=role,account_status&limit=1`);
  return rows?.[0]?.role === 'admin' && rows?.[0]?.account_status === 'active';
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return json(res, 405, { ok:false, message:'Ação não disponível.' });
  try {
    const token = bearerToken(req);
    const user = await getUserFromAccessToken(token);
    if (!user) return json(res, 401, { ok:false, message:'Sua sessão expirou. Entre novamente.' });
    if(!allowLookup(user.id)) return json(res,429,{ok:false,message:'Muitas tentativas de identificação. Aguarde um pouco e tente novamente.'});
    const body = req.body || {};
    const inviteUrl = normalizeUrl(body.invite_url);
    if (!inviteUrl) return json(res, 400, { ok:false, message:'Informe um link público de grupo compatível.' });
    const provider = providerFor(inviteUrl);
    const { html, finalUrl } = await fetchPage(inviteUrl.toString());
    const name = meta(html,'og:title') || meta(html,'twitter:title') || '';
    const description = meta(html,'og:description') || meta(html,'twitter:description') || '';
    let image = meta(html,'og:image') || meta(html,'twitter:image') || firstImageFromJsonLd(html) || '';
    if (image) image = new URL(image, finalUrl).toString();

    let imageUrl = '';
    let imagePath = '';
    let imageHash = '';
    let imageStatus = 'not_found';
    let imageMessage = 'Não foi possível encontrar uma foto pública para este grupo.';
    if (image) {
      try {
        const fetched = await fetchImage(image);
        imageHash = crypto.createHash('sha256').update(fetched.body).digest('hex');
        const scope = body.entity === 'official' ? 'official' : 'groups';
        const uploaded = await uploadImage(fetched.body, fetched.contentType, user.id, scope, imageHash);
        imageUrl = uploaded.publicUrl;
        imagePath = uploaded.path;
        imageStatus = 'found';
        imageMessage = 'Foto pública identificada e salva com sucesso.';
      } catch (error) {
        imageStatus = 'error';
        imageMessage = 'A foto pública não pôde ser salva. Você pode adicionar uma imagem manualmente.';
      }
    }

    const entity = body.entity === 'official' ? 'official' : 'group';
    const id = Number(body.id || 0);
    if (id > 0) {
      const isAdmin = await adminUser(user.id);
      let allowed = isAdmin;
      if (!allowed && entity === 'group') {
        const owned = await supabaseRequest(`/rest/v1/groups?id=eq.${id}&owner_id=eq.${encodeURIComponent(user.id)}&select=id&limit=1`);
        allowed = Boolean(owned?.length);
      }
      if (!allowed) return json(res, 403, { ok:false, message:'Você não pode alterar esta divulgação.' });
      const table = entity === 'official' ? 'official_groups' : 'groups';
      const patch = entity === 'official'
        ? { image_url:imageUrl || null, avatar_url:imageUrl || null, image_source:imageUrl ? 'auto':'fallback', image_status:imageStatus, image_checked_at:new Date().toISOString(), image_hash:imageHash || null }
        : { avatar_url:imageUrl || null, avatar_source:imageUrl ? 'auto':'fallback', avatar_status:imageStatus, avatar_checked_at:new Date().toISOString(), avatar_hash:imageHash || null, avatar_path:imagePath || null };
      await supabaseRequest(`/rest/v1/${table}?id=eq.${id}`, { method:'PATCH', body:JSON.stringify(patch) });
    }

    return json(res, 200, {
      ok:true, provider, found:Boolean(imageUrl), name:name.slice(0,100), description:description.slice(0,800),
      image_url:imageUrl, image_path:imagePath, image_hash:imageHash, image_status:imageStatus, message:imageMessage
    });
  } catch (error) {
    const publicMessage = error?.message === 'page_unavailable' || error?.message === 'redirect_not_allowed'
      ? 'Não foi possível consultar as informações públicas desse convite.'
      : error?.message === 'too_large' ? 'O conteúdo retornado é maior do que o permitido.' : 'Não foi possível identificar as informações públicas agora.';
    return json(res, 200, { ok:true, found:false, image_status:'error', message:publicMessage });
  }
};
