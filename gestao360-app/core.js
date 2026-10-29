const SB_URL="https://cqpihcfgjocmwaqwiemi.supabase.co";
const SB_KEY="sb_publishable_kDx8ysTXs-p6J3EN7PNO0Q_on-h2m_r";
const CHECKOUT="https://pay.kiwify.com.br/CUnAMR0";
const ACCESS_URL="https://mentorarejanedahmer-ux.github.io/gestao360-app/acesso.html";
let DBKEY=null;
let activeUserId=null,loadReady=false,pendingSave=false,saving=false;
function emptyDB(){return {accounts:[{id:'dinheiro',name:'Dinheiro'},{id:'pix',name:'PIX'},{id:'cartao',name:'Cartão'}],cashDays:{},tx:[],products:[],purchases:[],employees:[],punches:[],hr:[],fiscal:{company:{},docs:[]},settings:{revenueTarget:0,spendingLimit:0,prolaboreTarget:0},closures:[]}}
function syncStatus(text){let el=document.getElementById('cloudStatus');if(!el){el=document.createElement('p');el.id='cloudStatus';el.setAttribute('role','status');document.getElementById('app').prepend(el)}el.textContent=text}
let session=null,deferredPrompt=null,saveTimer=null;

const money=v=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const uid=()=>crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now();

let db=emptyDB();

function showSignup(){authGate.classList.add("hidden");signupGate.classList.remove("hidden")}
function showLogin(){signupGate.classList.add("hidden");authGate.classList.remove("hidden")}

async function api(path,opt={}){
  const h={apikey:SB_KEY,"Content-Type":"application/json",...(opt.headers||{})};
  if(session?.access_token)h.Authorization="Bearer "+session.access_token;
  const r=await fetch(SB_URL+path,{...opt,headers:h});
  const t=await r.text();let d;
  try{d=t?JSON.parse(t):null}catch{d=t}
  if(!r.ok)throw new Error(d?.msg||d?.message||d?.error_description||d?.error||"Erro");
  return d;
}

async function hasPaidAccess(){
  const u=await api("/auth/v1/user");
  const email=(u?.email||"").toLowerCase();
  if(!email)return false;
  const r=await api("/rest/v1/gestao360_access?email=eq."+encodeURIComponent(email)+"&select=active,status");
  return Array.isArray(r)&&r.length>0&&r[0].active===true;
}

async function passwordLogin(email,password,statusEl){
  const d=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
  session=d;
  localStorage.setItem("g360_session",JSON.stringify(d));
  if(!(await hasPaidAccess())){
    if(statusEl)statusEl.textContent="Compra não localizada para este e-mail. Use o mesmo e-mail informado na Kiwify.";
    localStorage.removeItem("g360_session");session=null;return false;
  }
  await openApp();return true;
}

async function signIn(){
  try{authStatus.textContent="Entrando...";await passwordLogin(loginEmail.value.trim().toLowerCase(),loginPassword.value,authStatus)}
  catch(e){authStatus.textContent=e.message}
}

async function resetPassword(){
  try{
    const e=loginEmail.value.trim().toLowerCase();
    if(!e)throw new Error("Digite seu e-mail primeiro.");
    authStatus.textContent="Enviando recuperação...";
    await api("/auth/v1/recover",{method:"POST",body:JSON.stringify({email:e,redirect_to:ACCESS_URL+"?mode=recovery"})});
    authStatus.textContent="Se o e-mail estiver cadastrado, você receberá as instruções para recuperar a senha.";
  }catch(e){authStatus.textContent=e.message}
}

async function signUp(){
  try{
    let e=signupEmail.value.trim().toLowerCase();
    if(!e)throw new Error('Informe seu e-mail da compra.');
    signupStatus.textContent="Criando seu acesso...";
    const r=await fetch(SB_URL+"/functions/v1/gestao360-first-access",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY},body:JSON.stringify({email:e})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok){
      if(d?.code==="already_active"){
        signupStatus.textContent="Seu e-mail já foi confirmado. Entrando...";
        throw new Error('Seu acesso já existe. Volte e entre com sua senha.');
      }
      throw new Error(d?.error||"Não foi possível criar o acesso agora. Tente novamente.")
    }
    signupStatus.textContent=d.message||'Confira seu e-mail para confirmar o acesso e criar sua senha.';
  }catch(e){signupStatus.textContent=e.message}
}

async function refreshSession(){
  if(!session?.refresh_token)return false;
  const r=await fetch(SB_URL+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{apikey:SB_KEY,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:session.refresh_token})});
  if(!r.ok)return false;
  session=await r.json();
  localStorage.setItem("g360_session",JSON.stringify(session));
  return true;
}

async function signOut(){
  clearTimeout(saveTimer);
  if(pendingSave){await cloudSave();if(pendingSave){alert('Há alterações ainda não enviadas. Conecte-se e tente sair novamente.');return}}
  try{await api("/auth/v1/logout",{method:"POST"})}catch{}
  localStorage.removeItem("g360_session");
  location.reload();
}

async function checkSession(){
  const r=localStorage.getItem("g360_session");
  if(!r)return;
  try{
    session=JSON.parse(r);
    try{await api("/auth/v1/user")}
    catch(e){if(!(await refreshSession()))throw e;await api("/auth/v1/user")}
    if(!(await hasPaidAccess())){localStorage.removeItem("g360_session");session=null;return}
    await openApp();
  }catch{localStorage.removeItem("g360_session");session=null}
}

async function openApp(){
  await loadCloud();
  authGate.classList.add("hidden");signupGate.classList.add("hidden");app.classList.remove("hidden");
  renderNav();render();
}

async function loadCloud(){
  loadReady=false;
  const u=await api('/auth/v1/user');activeUserId=u.id;DBKEY='g360_user_'+u.id;db=emptyDB();
  let cache=null;try{cache=JSON.parse(localStorage.getItem(DBKEY)||'null')}catch{}
  const rows=await api('/rest/v1/gestao360_user_data?user_id=eq.'+encodeURIComponent(u.id)+'&select=data');
  if(cache?.pending){db=cache.data;pendingSave=true;syncStatus('Alterações deste aparelho aguardam envio.');}
  else{db=rows?.[0]?.data&&Object.keys(rows[0].data).length?rows[0].data:emptyDB();pendingSave=false;syncStatus('Dados carregados do servidor.');}
  localStorage.setItem(DBKEY,JSON.stringify({data:db,pending:pendingSave}));loadReady=true;
  if(pendingSave)await cloudSave();
}

function save(){if(!loadReady||!activeUserId)throw new Error('Aguarde carregar seus dados.');pendingSave=true;localStorage.setItem(DBKEY,JSON.stringify({data:db,pending:true}));syncStatus('Salvo neste aparelho. Enviando ao servidor…');clearTimeout(saveTimer);saveTimer=setTimeout(cloudSave,700)}

async function cloudSave(){
  if(!session||!loadReady||!pendingSave||saving)return;
  saving=true;const owner=activeUserId,key=DBKEY,snapshot=JSON.stringify(db);
  try{
    await api('/rest/v1/gestao360_user_data?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({user_id:owner,data:JSON.parse(snapshot),updated_at:new Date().toISOString()})});
    if(owner===activeUserId&&snapshot===JSON.stringify(db)){pendingSave=false;localStorage.setItem(key,JSON.stringify({data:db,pending:false}));syncStatus('Tudo salvo no servidor.');}
  }catch(e){syncStatus('Ainda não salvo no servidor. Sua cópia está neste aparelho. Verifique a conexão.');}
  finally{saving=false;}
  if(pendingSave&&snapshot!==JSON.stringify(db)){clearTimeout(saveTimer);saveTimer=setTimeout(cloudSave,700)}
}
window.addEventListener('online',()=>cloudSave());
window.addEventListener('beforeunload',e=>{if(pendingSave){e.preventDefault();e.returnValue=''}});

window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferredPrompt=e});
async function installApp(){if(deferredPrompt){deferredPrompt.prompt();await deferredPrompt.userChoice;deferredPrompt=null}else alert("No celular, abra o menu do navegador e toque em Instalar aplicativo ou Adicionar à tela inicial.")}
async function forceUpdate(){if("serviceWorker"in navigator){for(const r of await navigator.serviceWorker.getRegistrations())await r.update()}let u=new URL(location.href);u.searchParams.set("v",Date.now());location.replace(u)}
if("serviceWorker"in navigator)navigator.serviceWorker.register("./sw.js");
