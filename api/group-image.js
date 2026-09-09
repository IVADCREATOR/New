const crypto = require('crypto');
const { supabaseRequest, assertServerConfig } = require('./_supabase');

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 8000;
const INVITE_HOSTS = new Set(['chat.whatsapp.com', 'www.chat.whatsapp.com']);
const IMAGE_HOST_ALLOW = [
  /(^|\.)whatsapp\.net$/i,
  /(^|\.)whatsapp\.com$/i,
  /(^|\.)facebook\.com$/i,
  /(^|\.)fbcdn\.net$/i,
  /(^|\.)fbsbx\.com$/i
];

function json(res, status, body) {
  res.status(status).setHeader('Cache-Control', 'no-store').json(body);
}
function isAllowedInvite(value) {
  try {
    const u = new URL(String(value || ''));
    return u.protocol === 'https:' && INVITE_HOSTS.has(u.hostname.toLowerCase()) && /^\/[A-Za-z0-9_-]{5,160}\/?$/.test(u.pathname);
  } catch { return false; }
}
function allowedImageHost(hostname) {
  return IMAGE_HOST_ALLOW.some(re => re.test(String(hostname || '')));
}
function decodeHtml(value) {
  return String(value || '')
    .replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;/gi, "'")
    .replace(/&#x2F;/gi, '/').replace(/&#47;/gi, '/');
}
function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["'][^>]*>/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return decodeHtml(m[1]);
  }
  return '';
}
function extFor(contentType) {
  const t = String(contentType || '').split(';')[0].toLowerCase();
  return t === 'image/png' ? 'png' : t === 'image/webp' ? 'webp' : t === 'image/gif' ? 'gif' : 'jpg';
}
async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try { return await fetch(url, {...options, signal: controller.signal, redirect: 'follow'}); }
  finally { clearTimeout(timer); }
}
async function readLimited(response) {
  const len = Number(response.headers.get('content-length') || 0);
  if (len > MAX_IMAGE_BYTES) throw new Error('too_large');
  const reader = response.body?.getReader();
  if (!reader) return Buffer.from(await response.arrayBuffer());
  const chunks=[]; let total=0;
  while(true){
    const {done,value}=await reader.read();
    if(done) break;
    total += value.byteLength;
    if(total > MAX_IMAGE_BYTES){ try{await reader.cancel()}catch{}; throw new Error('too_large'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
async function uploadImage(buffer, contentType) {
  assertServerConfig();
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const ext = extFor(contentType);
  const path = `auto/${hash}.${ext}`;
  const response = await fetch(`${process.env.SUPABASE_URL.replace(/\/+$/,'')}/storage/v1/object/group-images/${path}`, {
    method: 'POST',
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': contentType,
      'x-upsert': 'true',
      'Cache-Control': 'public, max-age=31536000, immutable'
    },
    body: buffer
  });
  if(!response.ok) throw new Error('storage_failed');
  const publicUrl = `${process.env.SUPABASE_URL.replace(/\/+$/,'')}/storage/v1/object/public/group-images/${path}`;
  return {publicUrl, path, hash};
}

module.exports = async function handler(req,res){
  if(req.method !== 'POST') return json(res,405,{ok:false,message:'Método não disponível.'});
  try {
    const inviteUrl = String(req.body?.invite_url || '').trim();
    if(!isAllowedInvite(inviteUrl)) return json(res,400,{ok:false,found:false,message:'Informe um link de convite do WhatsApp válido.'});

    const page = await fetchWithTimeout(inviteUrl,{headers:{'User-Agent':'Mozilla/5.0 Sorasaki/1.0','Accept':'text/html,application/xhtml+xml'}});
    if(!page.ok || !/^text\/html/i.test(page.headers.get('content-type')||'')) return json(res,200,{ok:true,found:false,message:'Não foi possível identificar uma imagem pública neste convite.'});
    try { if(!isAllowedInvite(page.url)) return json(res,200,{ok:true,found:false,message:'O convite não pôde ser validado.'}); } catch {}
    const html = await page.text();
    const imageUrl = extractOgImage(html);
    if(!imageUrl) return json(res,200,{ok:true,found:false,message:'Não foi encontrada uma imagem pública para este grupo.'});
    let image;
    try { image = new URL(imageUrl, inviteUrl); } catch { return json(res,200,{ok:true,found:false,message:'A imagem pública não pôde ser validada.'}); }
    if(image.protocol !== 'https:' || !allowedImageHost(image.hostname)) return json(res,200,{ok:true,found:false,message:'A imagem encontrada não pôde ser validada.'});

    const imageResponse = await fetchWithTimeout(image.href,{headers:{'User-Agent':'Mozilla/5.0 Sorasaki/1.0','Accept':'image/avif,image/webp,image/apng,image/*'}});
    if(!imageResponse.ok) return json(res,200,{ok:true,found:false,message:'A imagem pública não está disponível agora.'});
    const contentType = String(imageResponse.headers.get('content-type')||'').split(';')[0].toLowerCase();
    if(!/^image\/(jpeg|png|webp|gif)$/i.test(contentType)) return json(res,200,{ok:true,found:false,message:'O arquivo encontrado não é uma imagem compatível.'});
    const buffer = await readLimited(imageResponse);
    if(!buffer.length) return json(res,200,{ok:true,found:false,message:'A imagem encontrada está vazia.'});
    const uploaded = await uploadImage(buffer,contentType);
    return json(res,200,{ok:true,found:true,avatar_url:uploaded.publicUrl,storage_path:uploaded.path,source:'whatsapp_public_preview',checked_at:new Date().toISOString(),message:'Foto identificada automaticamente.'});
  } catch (error) {
    const userMessage = error?.message === 'too_large' ? 'A imagem encontrada é maior que o limite permitido.' : 'Não foi possível identificar a foto automaticamente agora.';
    return json(res,200,{ok:true,found:false,message:userMessage});
  }
};
