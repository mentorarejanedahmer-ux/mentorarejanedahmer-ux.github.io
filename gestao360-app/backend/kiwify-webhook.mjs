import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.116.0';
const APP='https://mentorarejanedahmer-ux.github.io/gestao360-app/acesso.html';
const TOKEN=Deno.env.get('G360_KIWIFY_WEBHOOK_TOKEN')||'';
const PRODUCT='Gestão 360 do Comércio — Caixa, Estoque, Financeiro e RH';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json'}});
export async function verified(raw,body,signature,token){
 if(!token||!signature||!/^([a-f0-9]{40}|[a-f0-9]{64})$/i.test(signature))return false;
 const hash=signature.length===40?'SHA-1':'SHA-256';
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(token),{name:'HMAC',hash},false,['verify']);
 const bytes=Uint8Array.from(signature.match(/../g),x=>parseInt(x,16));
 for(const data of new Set([raw,JSON.stringify(body)]))if(await crypto.subtle.verify('HMAC',key,bytes,new TextEncoder().encode(data)))return true;
 return false;
}
export function classify(body){
 const event=String(body.webhook_event_type||body.event_type||body.event||'').toLowerCase();
 const pending=new Set(['boleto_gerado','billet_created','pix_created','pix_gerado','cart_abandoned','carrinho_abandonado','order_rejected','purchase_refused','compra_recusada']);
 if(pending.has(event))return 'ignore';
 if(new Set(['order_approved','purchase_approved','compra_aprovada','subscription_renewed','assinatura_renovada']).has(event)){
  return ['paid','approved'].includes(String(body.order_status||'').toLowerCase())?'approved':'ignore';
 }
 if(new Set(['order_refunded','purchase_refunded','refunded','refund','chargeback','chargedback','subscription_canceled','subscription_cancelled','subscription_late','assinatura_cancelada','assinatura_atrasada']).has(event))return 'inactive';
 return 'ignore';
}
export async function handler(req){
 if(req.method!=='POST')return json({error:'method_not_allowed'},405);
 try{
  const raw=await req.text();if(raw.length>262144)return json({error:'payload_too_large'},413);
  let body;try{body=JSON.parse(raw)}catch{return json({error:'invalid_json'},400)}
  if(!body||typeof body!=='object'||Array.isArray(body))return json({error:'invalid_payload'},400);
  const sig=new URL(req.url).searchParams.get('signature')||req.headers.get('x-kiwify-signature')||'';
  if(!await verified(raw,body,sig,TOKEN))return json({error:'invalid_signature'},401);
  const product=body.Product||body.product||{};
  const expectedId=Deno.env.get('G360_KIWIFY_PRODUCT_ID');
  const productMatch=expectedId?String(product.product_id||product.id||body.product_id||'')===expectedId:String(product.product_name||product.name||'').normalize('NFC')===PRODUCT;
  if(!productMatch)return json({ok:true,ignored:true,reason:'different_product'});
  const state=classify(body);if(state==='ignore')return json({ok:true,ignored:true,reason:'non_access_event'});
  const email=String(body.Customer?.email||body.customer?.email||'').trim().toLowerCase();
  const purchaseId=String(body.order_id||body.order?.id||'');
  if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)||!purchaseId)return json({error:'missing_order_or_buyer'},422);
  const sb=createClient(Deno.env.get('SUPABASE_URL'),Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:existing,error:readError}=await sb.from('gestao360_access').select('purchase_id,active').eq('email',email).maybeSingle();if(readError)throw readError;
  if(state==='inactive'&&existing?.purchase_id&&existing.purchase_id!==purchaseId)return json({ok:true,ignored:true,reason:'different_order_requires_review'});
  const {error}=await sb.from('gestao360_access').upsert({email,active:state==='approved',source:'kiwify',status:state,purchase_id:purchaseId,updated_at:new Date().toISOString()},{onConflict:'email'});if(error)throw error;
  // A notificação nunca cria ou redefine a senha da compradora.
  // O primeiro acesso exige o link enviado ao e-mail da compra.
  return json({ok:true,access:state});
 }catch{return json({error:'processing_failed'},500)}
}
Deno.serve(handler);
