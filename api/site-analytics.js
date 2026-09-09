const { supabaseRequest } = require('./_supabase');
function json(res,status,body){res.status(status).setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(body));}
function cleanPath(v){const x=String(v||'/').trim();return x.startsWith('/')?x.slice(0,180).replace(/[\r\n]/g,''):'/';}
function validVisitorId(v){return /^[A-Za-z0-9_-]{20,120}$/.test(String(v||''));}
async function readAnalytics(){
 const result=await supabaseRequest('/rest/v1/rpc/get_site_analytics',{method:'POST',body:'{}'});
 return result && result.ok ? result : {ok:true,website:result||{}};
}

module.exports=async(req,res)=>{res.setHeader('Cache-Control','no-store');try{if(req.method==='GET')return json(res,200,await readAnalytics());if(req.method!=='POST')return json(res,405,{ok:false,message:'Método não permitido.'});const visitorId=String(req.body?.visitor_id||'').trim(),path=cleanPath(req.body?.path);if(!validVisitorId(visitorId))return json(res,400,{ok:false,message:'Identificador de visitante inválido.'});if(/^\/api(?:\/|$)/i.test(path)||/^\/controle-8f4c2e91(?:\/|$)/i.test(path))return json(res,400,{ok:false,message:'Rota não rastreável.'});await supabaseRequest('/rest/v1/rpc/record_site_visit',{method:'POST',body:JSON.stringify({p_visitor_id:visitorId,p_path:path})});return json(res,200,{ok:true});}catch(e){console.error('site-analytics error',e?.status||e?.message||e);return json(res,500,{ok:false,message:'Não foi possível registrar a visita agora.'});}};
