let selectedComandaId=null;
function ensureComandas(){if(!db.comandas)db.comandas=[]}
function comandaTotal(c){
  const sub=(c.items||[]).reduce((s,i)=>s+Number(i.qty||0)*Number(i.unit||0),0);
  const service=sub*Number(c.servicePct||0)/100;
  const discount=Number(c.discount||0);
  return Math.max(0,sub+service-discount);
}
function openComanda(){
  ensureComandas();
  const name=(document.getElementById('cmdName')?.value||'').trim();
  const customer=(document.getElementById('cmdCustomer')?.value||'').trim();
  const people=Math.max(1,Number(document.getElementById('cmdPeople')?.value||1));
  if(!name)return alert('Informe a mesa, balcão ou nome da comanda.');
  const c={id:uid(),name,customer,people,status:'aberta',items:[],servicePct:0,discount:0,openedAt:new Date().toISOString(),openedDate:today()};
  db.comandas.push(c);selectedComandaId=c.id;save();render();
}
function selectComanda(id){selectedComandaId=id;render()}
function addComandaProduct(){
  ensureComandas();const c=db.comandas.find(x=>x.id===selectedComandaId);if(!c)return;
  const pid=document.getElementById('cmdProduct')?.value,q=Math.max(1,Number(document.getElementById('cmdQty')?.value||1));
  const p=(db.products||[]).find(x=>x.id===pid);if(!p)return alert('Selecione um produto.');
  const already=(c.items||[]).filter(i=>i.productId===p.id).reduce((s,i)=>s+Number(i.qty||0),0);
  if(Number(p.qty||0)<already+q&&!confirm('A quantidade lançada ficará acima do estoque disponível. Continuar mesmo assim?'))return;
  c.items.push({id:uid(),productId:p.id,description:p.name,qty:q,unit:Number(p.price||0),stockControlled:true,note:''});save();render();
}
function addComandaFreeItem(){
  ensureComandas();const c=db.comandas.find(x=>x.id===selectedComandaId);if(!c)return;
  const desc=(document.getElementById('cmdFreeDesc')?.value||'').trim();const q=Math.max(1,Number(document.getElementById('cmdFreeQty')?.value||1));const unit=Number(document.getElementById('cmdFreeUnit')?.value||0);
  if(!desc||unit<=0)return alert('Informe descrição e valor do item.');
  c.items.push({id:uid(),productId:null,description:desc,qty:q,unit,stockControlled:false,note:''});save();render();
}
function removeComandaItem(itemId){const c=db.comandas.find(x=>x.id===selectedComandaId);if(!c)return;c.items=c.items.filter(i=>i.id!==itemId);save();render()}
function updateComandaAdjustments(){
  const c=db.comandas.find(x=>x.id===selectedComandaId);if(!c)return;
  c.people=Math.max(1,Number(document.getElementById('cmdEditPeople')?.value||1));
  c.servicePct=Math.max(0,Number(document.getElementById('cmdService')?.value||0));
  c.discount=Math.max(0,Number(document.getElementById('cmdDiscount')?.value||0));save();render();
}
function closeComanda(){
  ensureComandas();const c=db.comandas.find(x=>x.id===selectedComandaId);if(!c||c.status!=='aberta')return;
  if(!c.items?.length)return alert('Inclua pelo menos um item na comanda.');
  if(!db.cashDays?.[today()])return alert('Abra o caixa antes de fechar a comanda.');
  const total=comandaTotal(c),method=document.getElementById('cmdPayMethod')?.value||'dinheiro';
  let payments=[];
  if(method==='misto'){
    const vals=[['dinheiro',Number(document.getElementById('cmdPayCash')?.value||0)],['pix',Number(document.getElementById('cmdPayPix')?.value||0)],['cartao',Number(document.getElementById('cmdPayCard')?.value||0)]];
    const sum=vals.reduce((s,x)=>s+x[1],0);if(Math.abs(sum-total)>0.01)return alert('No pagamento misto, a soma de Dinheiro + PIX + Cartão precisa ser igual ao total da comanda.');payments=vals.filter(x=>x[1]>0);
  }else payments=[[method,total]];
  for(const i of c.items){if(i.stockControlled&&i.productId){const p=(db.products||[]).find(x=>x.id===i.productId);if(p)p.qty=Number(p.qty||0)-Number(i.qty||0)}}
  const txArr=db.tx||db.transactions||(db.tx=[]);const stamp=new Date().toLocaleTimeString('pt-BR');
  for(const [account,amount] of payments)txArr.push({id:uid(),date:today(),time:stamp,type:'venda',account,category:'Venda - Comanda',amount,note:`${c.name}${c.customer?' - '+c.customer:''}`});
  c.status='fechada';c.closedAt=new Date().toISOString();c.total=total;c.payments=payments.map(([account,amount])=>({account,amount}));c.closedDate=today();selectedComandaId=null;save();render();alert('Comanda fechada. Venda lançada no caixa e estoque atualizado.');
}
function printComanda(id){
  ensureComandas();const c=db.comandas.find(x=>x.id===id);if(!c)return;const total=comandaTotal(c);const w=window.open('','_blank','width=420,height=650');if(!w)return alert('Libere pop-ups para imprimir a comanda.');
  const rows=(c.items||[]).map(i=>`<tr><td>${i.qty}x ${String(i.description).replace(/[<>]/g,'')}</td><td style="text-align:right">${money(Number(i.qty)*Number(i.unit))}</td></tr>`).join('');
  w.document.write(`<html><head><title>${c.name}</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}td{padding:7px 0;border-bottom:1px dashed #ccc}.t{font-size:22px;font-weight:800}.tot{font-size:20px;font-weight:800;text-align:right;margin-top:16px}</style></head><body><div class="t">${c.name}</div><div>${c.customer||''}</div><div>${new Date(c.openedAt).toLocaleString('pt-BR')}</div><table>${rows}</table><div class="tot">Total: ${money(total)}</div><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();
}
function renderComandas(){
  ensureComandas();const open=db.comandas.filter(x=>x.status==='aberta'),closed=db.comandas.filter(x=>x.status==='fechada').slice().reverse().slice(0,20);let c=db.comandas.find(x=>x.id===selectedComandaId&&x.status==='aberta');
  const pOpts=(db.products||[]).map(p=>`<option value="${p.id}">${p.name} - ${money(p.price)} (est. ${p.qty})</option>`).join('');
  content.innerHTML=`<div class="grid">
  <div class="card s12"><div class="title">Comandas / Mesas</div><div class="hint">Abra uma mesa, balcão ou cliente; lance os itens; acompanhe o total; divida por pessoas; feche em Dinheiro, PIX, Cartão ou pagamento misto. Ao fechar, a venda entra no caixa e os produtos cadastrados dão baixa no estoque.</div></div>
  <div class="card s4"><div class="title">Abrir comanda</div><label>Mesa / balcão / identificação</label><input id="cmdName" placeholder="Ex.: Mesa 4 ou João"><label style="margin-top:8px">Cliente (opcional)</label><input id="cmdCustomer"><label style="margin-top:8px">Pessoas</label><input id="cmdPeople" type="number" min="1" value="1"><button class="primary" style="margin-top:10px;width:100%" onclick="openComanda()">ABRIR COMANDA</button></div>
  <div class="card s8"><div class="title">Comandas abertas (${open.length})</div>${open.length?`<div class="scroll"><table><thead><tr><th>Comanda</th><th>Cliente</th><th>Itens</th><th>Total</th><th></th></tr></thead><tbody>${open.map(x=>`<tr><td><b>${x.name}</b></td><td>${x.customer||'-'}</td><td>${(x.items||[]).reduce((s,i)=>s+Number(i.qty||0),0)}</td><td>${money(comandaTotal(x))}</td><td><button onclick="selectComanda('${x.id}')">Abrir</button> <button onclick="printComanda('${x.id}')">Imprimir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">Nenhuma comanda aberta.</div>'}</div>
  ${c?`<div class="card s12"><div class="title">${c.name}${c.customer?' - '+c.customer:''}</div><div class="row"><div class="f6"><label>Produto do estoque</label><select id="cmdProduct"><option value="">Selecione...</option>${pOpts}</select></div><div class="f2"><label>Qtd.</label><input id="cmdQty" type="number" min="1" value="1"></div><div class="f4" style="align-self:end"><button class="primary" onclick="addComandaProduct()">Adicionar produto</button></div><div class="f6"><label>Item livre</label><input id="cmdFreeDesc" placeholder="Ex.: Dose, porção, taxa"></div><div class="f2"><label>Qtd.</label><input id="cmdFreeQty" type="number" min="1" value="1"></div><div class="f2"><label>Valor un.</label><input id="cmdFreeUnit" type="number" step="0.01"></div><div class="f2" style="align-self:end"><button onclick="addComandaFreeItem()">Adicionar</button></div></div>
  ${(c.items||[]).length?`<div class="scroll" style="margin-top:12px"><table><thead><tr><th>Item</th><th>Qtd.</th><th>Unit.</th><th>Total</th><th></th></tr></thead><tbody>${c.items.map(i=>`<tr><td>${i.description}</td><td>${i.qty}</td><td>${money(i.unit)}</td><td>${money(Number(i.qty)*Number(i.unit))}</td><td><button onclick="removeComandaItem('${i.id}')">Remover</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="muted" style="margin-top:12px">Nenhum item lançado.</div>'}
  <div class="row" style="margin-top:12px"><div class="f2"><label>Pessoas</label><input id="cmdEditPeople" type="number" min="1" value="${c.people||1}"></div><div class="f2"><label>Serviço %</label><input id="cmdService" type="number" min="0" step="0.1" value="${c.servicePct||0}"></div><div class="f2"><label>Desconto R$</label><input id="cmdDiscount" type="number" min="0" step="0.01" value="${c.discount||0}"></div><div class="f3" style="align-self:end"><button onclick="updateComandaAdjustments()">Atualizar total</button></div><div class="f3" style="align-self:end"><button onclick="printComanda('${c.id}')">Imprimir comanda</button></div></div>
  <div class="hint" style="margin-top:12px"><b>Total: ${money(comandaTotal(c))}</b> • Por pessoa: ${money(comandaTotal(c)/Math.max(1,Number(c.people||1)))}</div>
  <div class="row" style="margin-top:12px"><div class="f3"><label>Pagamento</label><select id="cmdPayMethod" onchange="render()"><option value="dinheiro">Dinheiro</option><option value="pix">PIX</option><option value="cartao">Cartão</option><option value="misto">Misto</option></select></div><div class="f3"><label>Dinheiro (misto)</label><input id="cmdPayCash" type="number" step="0.01"></div><div class="f3"><label>PIX (misto)</label><input id="cmdPayPix" type="number" step="0.01"></div><div class="f3"><label>Cartão (misto)</label><input id="cmdPayCard" type="number" step="0.01"></div><div class="f12"><button class="primary" onclick="closeComanda()">FECHAR COMANDA E LANÇAR NO CAIXA</button></div></div></div>`:''}
  <div class="card s12"><div class="title">Últimas comandas fechadas</div>${closed.length?`<div class="scroll"><table><thead><tr><th>Data</th><th>Comanda</th><th>Cliente</th><th>Total</th><th>Pagamento</th><th></th></tr></thead><tbody>${closed.map(x=>`<tr><td>${x.closedDate||x.openedDate||'-'}</td><td>${x.name}</td><td>${x.customer||'-'}</td><td>${money(x.total||comandaTotal(x))}</td><td>${(x.payments||[]).map(p=>p.account+' '+money(p.amount)).join(' / ')||'-'}</td><td><button onclick="printComanda('${x.id}')">Imprimir</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="muted">Nenhuma comanda fechada.</div>'}</div>
  </div>`;
}
