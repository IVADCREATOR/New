const { supabaseRequest } = require('./_supabase');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control','no-store');
  try {
    const rows = await supabaseRequest('/rest/v1/site_settings?key=in.(maintenance_mode,maintenance_title,maintenance_message,maintenance_image_url,maintenance_return_at,maintenance_start_at)&select=key,value');
    const settings = Object.fromEntries((rows || []).map(x => [x.key, x.value]));
    const value = (key, fallback) => settings[key] !== undefined ? settings[key] : fallback;
  const boolValue = (key, fallback=false) => {
    const v = value(key, fallback);
    if (typeof v === 'boolean') return v;
    if (typeof v === 'string') { try { return Boolean(JSON.parse(v)); } catch {} }
    return Boolean(v);
  };
  const nullableValue = (key, fallback=null) => {
    const v = value(key, fallback);
    if (typeof v === 'string') { try { return JSON.parse(v); } catch {} }
    return v;
  };
    return res.status(200).json({
      ok:true,
      maintenance: boolValue('maintenance_mode', false),
      title:String(value('maintenance_title','Estamos em manutenção')),
      message:String(value('maintenance_message','O site está passando por algumas melhorias no momento. Nossa equipe está trabalhando para deixar tudo funcionando corretamente.')),
      image_url:String(value('maintenance_image_url','') || ''),
      return_at:nullableValue('maintenance_return_at',null),
      start_at:nullableValue('maintenance_start_at',null)
    });
  } catch (error) {
    console.error('site-state error', error);
    return res.status(200).json({ok:true,maintenance:false});
  }
};
