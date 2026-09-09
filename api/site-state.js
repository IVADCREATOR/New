const { supabaseRequest } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const rows = await supabaseRequest('/rest/v1/site_settings?key=in.(maintenance_mode,maintenance_title,maintenance_message,maintenance_image_url,maintenance_return_at,maintenance_start_at)&select=key,value');
    const settings = Object.fromEntries((rows || []).map(x => [x.key, x.value]));
    const value = (key, fallback) => settings[key] !== undefined ? settings[key] : fallback;
  const asBool = (key, fallback=false) => {
    const raw = value(key, fallback);
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'number') return raw !== 0;
    if (typeof raw === 'string') return ['true','1','yes','on'].includes(raw.trim().toLowerCase());
    return Boolean(raw);
  };
  const asText = (key, fallback='') => { const raw=value(key,fallback); return raw==null?fallback:String(raw); };
    return res.status(200).json({
      ok:true,
      maintenance: asBool('maintenance_mode', false),
      title:asText('maintenance_title','Estamos em manutenção'),
      message:asText('maintenance_message','O site está passando por algumas melhorias no momento. Nossa equipe está trabalhando para deixar tudo funcionando corretamente.'),
      image_url:asText('maintenance_image_url',''),
      return_at:value('maintenance_return_at',null),
      start_at:value('maintenance_start_at',null)
    });
  } catch (error) {
    console.error('site-state error', error);
    return res.status(200).json({ok:true,maintenance:false});
  }
};
