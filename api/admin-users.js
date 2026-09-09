const { supabaseRequest, getUserFromAccessToken, bearerToken } = require('./_supabase');

function json(res,status,body){res.status(status).setHeader('Content-Type','application/json');return res.end(JSON.stringify(body));}
async function requireAdmin(req){
  const user=await getUserFromAccessToken(bearerToken(req));
  if(!user)return null;
  const rows=await supabaseRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(user.id)}&role=eq.admin&account_status=eq.active&select=user_id`);
  return rows?.length?user:null;
}
async function adminAuth(path, options={}){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'',url=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
  if(!key||!url)throw new Error('server configuration missing');
  const r=await fetch(`${url}${path}`,{...options,headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json',...(options.headers||{})}});
  const text=await r.text();let data=null;try{data=text?JSON.parse(text):null}catch{}
  if(!r.ok){const e=new Error('admin operation failed');e.status=r.status;e.data=data;throw e}
  return data;
}
module.exports=async(req,res)=>{
  try{
    const admin=await requireAdmin(req);
    if(!admin)return json(res,401,{ok:false,message:'Acesso administrativo necessário.'});
    if(req.method==='GET'){
      const q=String(req.query?.q||'').trim().toLowerCase();
      const status=String(req.query?.status||'all');
      const users=await adminAuth('/auth/v1/admin/users?per_page=1000&page=1');
      const list=(users?.users||[]).map(u=>({
        id:u.id,email:u.email||'',created_at:u.created_at,last_sign_in_at:u.last_sign_in_at||null,
        confirmed:!!u.email_confirmed_at,metadata:u.user_metadata||{}
      })).filter(u=>!q||`${u.email} ${u.metadata.username||''} ${u.metadata.display_name||''} ${u.id}`.toLowerCase().includes(q));
      const ids=list.map(u=>u.id);
      let profiles=[];
      if(ids.length){
        const inList=ids.join(',');
        profiles=await supabaseRequest(`/rest/v1/profiles?user_id=in.(${inList})&select=user_id,display_name,username,email,role,account_status,created_at`);
      }
      const byId=Object.fromEntries((profiles||[]).map(p=>[p.user_id,p]));
      return json(res,200,{ok:true,users:list.map(u=>({...u,profile:byId[u.id]||{}}))});
    }
    if(req.method==='POST'){
      let body=typeof req.body==='object'?req.body:JSON.parse(req.body||'{}');
      const id=String(body.user_id||'').trim(),action=String(body.action||'');
      if(!id||!['suspend','activate'].includes(action))return json(res,400,{ok:false,message:'Ação inválida.'});
      if(id===admin.id)return json(res,400,{ok:false,message:'Você não pode alterar o próprio acesso por aqui.'});
      const account_status=action==='suspend'?'suspended':'active';
      await supabaseRequest(`/rest/v1/profiles?user_id=eq.${encodeURIComponent(id)}`,{
        method:'PATCH',headers:{Prefer:'return=minimal'},body:JSON.stringify({account_status})
      });
      await adminAuth(`/auth/v1/admin/users/${encodeURIComponent(id)}`,{
        method:'PUT',body:JSON.stringify({ban_duration:action==='suspend'?'876000h':'none'})
      });
      await supabaseRequest('/rest/v1/admin_activity',{
        method:'POST',headers:{Prefer:'return=minimal'},body:JSON.stringify({
          admin_id:admin.id,action:action==='suspend'?'SUSPEND':'ACTIVATE',entity:'user',entity_id:id,details:{source:'admin_panel'}
        })
      });
      return json(res,200,{ok:true});
    }
    return json(res,405,{ok:false,message:'Método não permitido.'});
  }catch(err){
    console.error(err);
    return json(res,500,{ok:false,message:'Não foi possível concluir esta ação agora.'});
  }
};
