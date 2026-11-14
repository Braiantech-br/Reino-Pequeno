// ================================================================ the council: one place for every request, report and decision
// Tabs: Mensagens (what waits for an answer, and the news), Exército (the general, the squads, the scouts and the war
// plan), Contratos (honour, contracts, the towns), Estradas (the delivery services), Economia (taxes, mood, fair, pay)
// and Regras (what the people may decide alone).
const COUNCIL={tab:'msg',log:[],seen:0};
const CTAB=[['msg','Mensagens'],['army','Exército'],['ctr','Contratos'],['road','Estradas'],['econ','Economia'],['rules','Regras']];
const esc=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function cLog(txt,kind,loc){COUNCIL.log.unshift({t:S?S.t:0,txt,kind:kind||'',loc:loc||null});if(COUNCIL.log.length>40)COUNCIL.log.pop();}
function openCouncil(tab){if(!S)return;if(tab)COUNCIL.tab=tab;$('ov-council').hidden=false;COUNCIL.seen=COUNCIL.log.length?COUNCIL.log[0].t:0;COUNCIL.last='';renderCouncil(true);}
function councilOpen(){return !$('ov-council').hidden;}
function councilBadge(){
  if(!S)return;
  const n=(S.ask?1:0)+((S.asks||[]).length);
  const run=svcList().list.filter(m=>m.team===1&&m.state==='run'&&m.type!=='contract').length;
  const b=$('svc-n');const v=n||run;b.hidden=!v;b.textContent=v;b.classList.toggle('ask',!!n);
}
const fmtLeft=s=>s===Infinity?'sem prazo':fmtT(s);
function avImg(k){return `<img alt="" src="assets/${k||'av05'}.png">`;}
// ---------------------------------------------------------------- Mensagens
function cMsg(){
  const qs=[S.ask,...(S.asks||[])].filter(Boolean);
  let h=`<h3 class="c-h">Esperando a sua resposta <small>${qs.length||'nada'}</small></h3>`;
  h+=qs.length?qs.map(q=>`<div class="c-item ask">${avImg(q.av)}<div class="grow"><b>${esc(q.who)}</b><p>${esc(q.text)}</p>${q.cost&&Object.keys(q.cost).length?`<p class="c-cost">Custo: ${Object.entries(q.cost).map(([k,v])=>`${RES_IMG[k]||''}${v}`).join(' ')}</p>`:''}</div><div class="btns"><button class="btn sm-btn" type="button" data-c="ans:${q.id}:1">Autorizar</button><button class="btn alt sm-btn" type="button" data-c="ans:${q.id}:0">Agora não</button>${q.loc?`<button class="btn alt sm-btn" type="button" data-c="see:${Math.round(q.loc.x)}:${Math.round(q.loc.y)}">Ver</button>`:''}</div></div>`).join(''):'<p class="meta">Ninguém está esperando resposta. As regras do Conselho decidem sozinhas o que você liberou.</p>';
  h+=`<h3 class="c-h">Notícias do reino</h3>`;
  h+=COUNCIL.log.length?`<ul class="c-news">${COUNCIL.log.slice(0,18).map(l=>`<li class="${l.kind}"><span>${fmt(l.t)}</span> ${esc(l.txt)}${l.loc?` <button class="lnk" type="button" data-c="see:${Math.round(l.loc.x)}:${Math.round(l.loc.y)}">ver</button>`:''}</li>`).join('')}</ul>`:'<p class="meta">Nada de novo por enquanto.</p>';
  return h;
}
// ---------------------------------------------------------------- Exército
function sqLine(q,depth){
  const L=byId.get(q.lead);if(!alive(L))return '';
  const cnt={};for(const id of q.mem){const u=byId.get(id);if(alive(u)){const nm=unitName(u);cnt[nm]=(cnt[nm]||0)+1;}}
  const mem=Object.entries(cnt).map(([k,n])=>`${n} ${n>1?k.replace(/^(\S+)/,'$1s').toLowerCase():k.toLowerCase()}`).join(', ')||'sozinho';
  const A=armyOf(1),gen=A.gen===L.id;
  const bufs=Object.keys(CMD).filter(k=>sqBuf(q,k)).map(k=>CMD[k].name);
  const cmds=Object.keys(CMD).filter(k=>(L.rank||0)>=CMD[k].rank).map(k=>{const cd=Math.max(0,Math.ceil((q.cd[k]||0)-S.t));return `<button class="btn alt sm-btn" type="button" data-c="cmd:${q.id}:${k}" title="${esc(CMD[k].desc)}" ${cd?'disabled':''}>${CMD[k].glyph} ${CMD[k].name}${cd?` (${cd})`:''}</button>`;}).join('');
  return `<div class="c-sq" style="margin-left:${depth*18}px"><i class="dot" style="background:${SQ_COL[q.col%SQ_COL.length]}"></i><div class="grow">${gen?`<em class="c-gen">${(L.rank||0)>=3?'General':'Chefe eleito'}</em> `:''}<b>${esc(rankedName(L))}</b> <small>comanda até ${q.cap} · ${q.form||0} perto dele${q.morT>S.t?' · <em class="bad">abalado</em>':''}${bufs.length?' · <em class="good">'+bufs.join(', ')+'</em>':''}</small><p>${esc(mem)}</p>${cmds?`<div class="btns l">${cmds}</div>`:''}</div><button class="btn alt sm-btn" type="button" data-c="selsq:${q.id}">Ver</button></div>`;
}
function cArmy(){
  const A=armyOf(1),g=byId.get(A.gen),U=armyUnits(1);
  let h=`<h3 class="c-h">${alive(g)?`${(g.rank||0)>=3?'General':'Chefe eleito'}: ${esc(rankedName(g))}`:'Sem general'} <small>${U.length} soldados · ${A.sq.length} ${A.sq.length===1?'grupo':'grupos'}</small></h3>`;
  h+=`<p class="meta">Quem tem a maior patente comanda o exército; entre iguais, a tropa vota. Cada patente a partir de Soldado comanda um grupo (Soldado 3, Cabo 4, Sargento 6, Tenente 8 + 1 subchefe, Capitão 12 + 2, Major 16 + 3, Comandante todos). Quanto maior a patente, mais vida, força e regeneração.</p>`;
  h+=`<div class="c-ord">${Object.entries(ARMY_ORD).map(([k,n])=>`<button class="btn ${A.ord.type===k?'':'alt'} sm-btn" type="button" data-c="ord:${k}">${n}</button>`).join('')}</div>`;
  if(!A.sq.length)h+='<p class="meta">Ainda não há grupos: o exército precisa de pelo menos 4 soldados. Treine tropas no quartel, na arquearia e no mosteiro.</p>';
  const kids=p=>A.sq.filter(q=>q.par===p);
  const walk=(q,d)=>sqLine(q,d)+kids(q.id).map(k=>walk(k,d+1)).join('');
  h+=A.sq.filter(q=>!q.par).map(q=>walk(q,0)).join('');
  const free=U.filter(u=>!u.sq).length;if(free)h+=`<p class="meta">${free} ${free===1?'soldado está':'soldados estão'} sem grupo: faltam chefes com patente para comandar todos.</p>`;
  // scouting and the plan
  const I=intelOf(1),sc=byId.get(I.sweep);
  h+=`<h3 class="c-h">Batedores e plano de guerra</h3><div class="c-ord">`;
  h+=`<button class="btn alt sm-btn" type="button" data-c="sweep:defense" ${I.sweep?'disabled':''}>Reconhecer o terreno</button>`;
  h+=`<button class="btn alt sm-btn" type="button" data-c="sweep:spy" ${I.sweep||!castleOf(2)?'disabled':''}>Espiar o Reino Vermelho</button></div>`;
  h+=`<p class="meta">${alive(sc)?`O batedor ${esc(folkName(sc))} está na estrada (${sc.sweeper==='spy'?'espiando a base inimiga':'dando a volta no reino'}).`:I.t?`Último reconhecimento: ${fmt(I.t)}. ${I.fronts.length} ${I.fronts.length===1?'entrada vigiada':'entradas vigiadas'}.`:'O terreno ainda não foi estudado.'}${I.spy?` Espionagem: ${I.spy.towers} torres em volta do castelo vermelho, lado mais fraco: ${I.spy.weak}.`:''}</p>`;
  const items=I.plan.filter(p=>p.st==='new'||p.st==='raising');
  if(items.length){
    h+=`<div class="c-ord"><button class="btn sm-btn" type="button" data-c="planall">Autorizar todo o plano</button><button class="btn alt sm-btn" type="button" data-c="planshow">${ui.showPlan?'Esconder no mapa':'Mostrar no mapa'}</button></div>`;
    h+=items.map((p,i)=>`<div class="c-item plan">${'<span class="num">'+(i+1)+'</span>'}<div class="grow"><b>${PLAN_NAME[p.kind]}</b>${p.st==='raising'?' <em class="good">o engenheiro está erguendo o terreno</em>':''}<p>${esc(p.why)}</p>${Object.keys(p.cost||{}).length?`<p class="c-cost">Custo: ${costHTML(p.cost)}${p.towerCost?' + torre '+costHTML(p.towerCost):''}</p>`:'<p class="c-cost">Sem custo</p>'}</div><div class="btns">${p.st==='new'?`<button class="btn sm-btn" type="button" data-c="plan:${p.id}:1">Autorizar</button><button class="btn alt sm-btn" type="button" data-c="plan:${p.id}:0">Recusar</button>`:''}<button class="btn alt sm-btn" type="button" data-c="see:${Math.round(p.x)}:${Math.round(p.y)}">Ver</button></div></div>`).join('');
  }else if(I.t)h+='<p class="meta">Nenhuma obra pendente no plano.</p>';
  return h;
}
// ---------------------------------------------------------------- Contratos
function honorBar(t){const h=Math.round(honorOf(t));return `<div class="c-meter"><span>${t===1?'Você':'Reino Vermelho'}</span><div class="bar"><i style="width:${h}%;background:${h>=60?'#5cc04a':h>=40?'#e3b23c':'#d8382a'}"></i></div><b>${h} · ${HONOR_NAME(h)}</b></div>`;}
function ctrLine(c,mine){
  const T=S.towns[c.town],t=c.terms;
  let info='';
  if(c.kind==='merc'||c.kind==='mercLife'||c.kind==='hero')info=`${c.ids.length} de ${t.n} ${t.n===1?'herói':DEF[t.unit].name.toLowerCase()+'s'} vivos`;
  else if(c.kind==='garrison')info=`${c.ids.length} guardas nos postos`;
  else if(c.kind==='protect'||c.kind==='loyalty')info=`${Math.round(t.pct*100)}% da produção por minuto · já pagou ${Math.round(c.paid||0)}${c.strikes?` · <em class="bad">${c.strikes} pagamento atrasado</em>`:''}`;
  else if(c.kind==='route')info=`${c.delivered||0} caravanas entregues · faltam ${c.left} · cada uma: ${t.n} de ${RES_NAME[t.res]} por ${Object.entries(t.pay).map(([k,v])=>v+' de '+RES_NAME[k]).join(', ')}`;
  return `<div class="c-item">${avImg('av14')}<div class="grow"><b>${CTR[c.kind].name} · ${esc(T.name)}</b><p>${info} · ${c.end?'termina em '+fmtLeft(ctrLeft(c)):'sem prazo'}</p></div>${mine?`<div class="btns">${c.end&&c.kind!=='route'?`<button class="btn sm-btn" type="button" data-c="renew:${c.id}">Renovar</button>`:''}<button class="btn alt sm-btn danger-t" type="button" data-c="cancel:${c.id}">Cancelar</button></div>`:''}</div>`;
}
function cCtr(){
  let h=`<h3 class="c-h">Honra</h3><p class="meta">Todas as vilas enxergam a honra: quem cumpre contratos paga menos e é aceito em mais acordos; quem quebra, saqueia ou ataca vilas paga mais e é recusado.</p>${honorBar(1)}${S.ai?honorBar(2):''}`;
  const mine=ctrList().filter(c=>c.state==='active'&&c.team===1),red=ctrList().filter(c=>c.state==='active'&&c.team===2);
  h+=`<h3 class="c-h">Seus contratos <small>${mine.length}</small></h3>`+(mine.length?mine.map(c=>ctrLine(c,true)).join(''):'<p class="meta">Nenhum contrato ativo. Selecione uma vila e abra a aba Contratos para propor um.</p>');
  if(red.length)h+=`<h3 class="c-h">Contratos do Reino Vermelho</h3>`+red.map(c=>ctrLine(c,false)).join('');
  const msgs=svcList().list.filter(m=>m.state==='run'&&m.type==='contract'&&m.team===1);
  if(msgs.length)h+=`<h3 class="c-h">Mensageiros na estrada</h3>`+msgs.map(m=>`<div class="c-item">${avImg('av28')}<div class="grow"><b>${esc(m.driver||'Mensageiro')} → ${esc(S.towns[m.town].name)}</b><p>${CTR[m.terms.kind].name}</p></div><button class="btn alt sm-btn" type="button" data-c="selid:${m.lead}">Ver</button></div>`).join('');
  if(S.towns&&S.towns.length){
    h+=`<h3 class="c-h">As vilas</h3>`+S.towns.map(T=>{const st=T.owner?(T.owner===1?`sua vassala (lealdade ${Math.round(T.loyal)})`:`vassala do Reino Vermelho (lealdade ${Math.round(T.loyal)})`):T.siege?`sob ataque de ${teamName(T.siege.team)}`:loyalTo(T)?`jurada a ${teamName(loyalTo(T))}`:'livre';
      return `<div class="c-item">${avImg('av14')}<div class="grow"><b>${esc(T.name)}</b> <small>${TOWN_TITLE[T.lvl||1]} · ${st}</small><p>Você ${repStars(repOf(T,1))} ${FRIEND[friendOf(T,1)]}${favOf(T,1)?` (${favOf(T,1)>0?'te deve':'você deve'} ${Math.abs(favOf(T,1))})`:''} · Vermelho ${repStars(repOf(T,2))}</p></div><button class="btn alt sm-btn" type="button" data-c="town:${T.i}">Abrir</button></div>`;}).join('');
  }else h+='<p class="meta">Neste modo não há vilas neutras.</p>';
  h+=`<details class="howto"><summary>Os tipos de contrato</summary><ul class="rules">${Object.entries(CTR).filter(([k])=>k!=='help'&&k!=='liberate').map(([k,c])=>`<li><b>${c.name}</b> (pede ${c.need?repStars(c.need):'nada'}): ${c.desc}</li>`).join('')}<li><b>Quebrar um contrato</b> custa honra (−15) e amizade. <b>Cumprir</b> dá honra (+3).</li><li><b>Leilão:</b> se o outro reino oferecer mais por uma vila jurada a você, ela avisa e você pode cobrir a oferta.</li><li><b>Conquista:</b> uma vila pode ser tomada à força (honra −25 no total). Vira vassala: paga tributo e dá guardas, mas pode se revoltar ou ser comprada de volta.</li></ul></details>`;
  return h;
}
// ---------------------------------------------------------------- Economia
function cEcon(){
  const E=econOf(1),p=Math.round(E.pop),T=S.teams[1];
  let h=`<h3 class="c-h">Impostos</h3><div class="c-ord">${TAX.map((x,i)=>`<button class="btn ${E.tax===i?'':'alt'} sm-btn" type="button" data-c="tax:${i}" title="${x.g} de ouro por aldeão por minuto; humor ${x.p>0?'+':''}${x.p} por minuto">${x.n}</button>`).join('')}</div>`;
  h+=`<p class="meta">Arrecadação: ${E.income} de ouro por minuto (${popWorkers(1).length} aldeões).</p>`;
  h+=`<h3 class="c-h">Humor do povo</h3><div class="c-meter"><span>${POP_NAME(p)}</span><div class="bar"><i style="width:${p}%;background:${p>=60?'#5cc04a':p>=35?'#e3b23c':'#d8382a'}"></i></div><b>${p}</b></div>`;
  const W=E.why||{},nm={tax:'Impostos',food:'Comida no celeiro',tavern:'Taberna',homes:'Casas lotadas',safety:'Ataques recentes',fair:'Feira famosa',pay:'Soldo atrasado',party:'Festa'};
  h+=`<ul class="c-why">${Object.entries(W).filter(([k,v])=>v).map(([k,v])=>`<li class="${v>0?'good':'bad'}">${nm[k]||k}: ${v>0?'+':''}${v} por minuto</li>`).join('')||'<li>Nada mexe com o humor agora.</li>'}</ul>`;
  h+=`<p class="meta">Povo feliz (75+) trabalha 10% mais rápido; insatisfeito (abaixo de 45) 10% mais devagar; revoltado (abaixo de 25) 20% mais devagar, e abaixo de 15 os aldeões vão embora.</p>`;
  const fcd=Math.max(0,Math.ceil(E.festT-S.t));
  h+=`<div class="c-ord"><button class="btn sm-btn" type="button" data-c="fest" ${fcd||!afford(1,FEST_COST)?'disabled':''}>Dar uma festa (${costHTML(FEST_COST)})${fcd?` · ${fcd}s`:''}</button></div>`;
  const tr=traders(1),slots=stallSlots(1);
  h+=`<h3 class="c-h">Feira do mercado <small>${tr.length}/${slots} barracas</small></h3><p class="meta">Um aldeão com barraca vende o que sobra (madeira ou comida acima de 350) e ganha fama. Comerciante famoso vende mais caro, alegra o povo e atrai caravanas das vilas que compram a sua sobra.</p>`;
  h+=tr.map(u=>`<div class="c-item">${avImg('av05')}<div class="grow"><b>${esc(folkName(u))}</b> <small>${repStars(u.trader.fame)} fama</small><p>Vendeu ${u.trader.sold} · ganhou ${u.trader.earned||0} de ouro</p></div><button class="btn alt sm-btn" type="button" data-c="close:${u.id}">Fechar barraca</button></div>`).join('');
  h+=`<div class="c-ord"><button class="btn sm-btn" type="button" data-c="stall" ${!slots||tr.length>=slots?'disabled':''}>${slots?'Abrir uma barraca':'Construa um mercado'}</button></div>`;
  h+=`<h3 class="c-h">Soldo do exército</h3><p class="meta">${E.unpaid?'<b class="bad">Soldo atrasado!</b> Os soldados lutam 10% pior e, depois de um minuto sem pagamento, um recruta deserta. ':''}Cada soldado custa 0,6 de ouro por minuto (máquinas de cerco, paladinos e magos mais). Mercenários de contrato e heróis não entram. Agora: ${E.upkeep} de ouro por minuto.</p>`;
  const R=rulesOf(),car=S.ents.filter(e=>!e.dead&&e.kind==='cart'&&e.trip).length;
  h+=`<h3 class="c-h">Estradas e pedágio</h3><p class="meta">${car} ${car===1?'caravana':'caravanas'} das vilas na estrada agora. Quando uma caravana passa pelos seus portões ou pontes, você pode cobrar pedágio (8% da carga). As vilas não gostam: cada pedágio tira um pouco de amizade.</p><div class="c-ord"><button class="btn ${R.tolls?'':'alt'} sm-btn" type="button" data-c="rule:tolls">${R.tolls?'Cobrando pedágio':'Sem pedágio'}</button></div>`;
  return h;
}
// ---------------------------------------------------------------- Regras
const RULE_TXT=[['obras','Obras do engenheiro','Mercado, taberna, cais, reformas e terraplanagem saem sem perguntar (dentro do limite de gasto).'],['estradas','Serviços de entrega','Tropeiros e comandantes saem com a carroça sem perguntar (dentro do limite).'],['socorro','Socorro','Mandar soldados quando uma vila amiga (★★★) pede, e mandar mensageiro quando o general pede ajuda.'],['renovar','Renovar mercenários','Contratos que vencem são renovados sozinhos, se houver ouro.'],['medicos','Médicos de campo','Sargentos que querem virar médicos viram sem perguntar.'],['batedor','Reconhecimento','O general manda o batedor estudar o terreno sem perguntar.'],['armyAuto','Comandos dos chefes','Tenentes e acima usam escudos, avante, segurar a linha e grito de guerra sozinhos.'],['quiet','Relatórios discretos','Relatórios de serviço só aparecem quando houve perdas; os outros vão direto para o Conselho.']];
function cRules(){
  const R=rulesOf();
  let h=`<p class="meta">O que o seu povo pode decidir sozinho. Tudo o que for decidido por uma regra aparece em Notícias do reino.</p>`;
  h+=RULE_TXT.map(([k,n,d])=>`<div class="c-item rule"><div class="grow"><b>${n}</b><p>${d}</p></div><button class="btn ${R[k]?'':'alt'} sm-btn" type="button" data-c="rule:${k}">${R[k]?'Liberado':'Perguntar'}</button></div>`).join('');
  h+=`<h3 class="c-h">Limite de gasto sem perguntar</h3><div class="c-ord">${[0,100,200,400].map(v=>`<button class="btn ${R.gold===v?'':'alt'} sm-btn" type="button" data-c="gold:${v}">${v?'até '+v+' de ouro':'nada'}</button>`).join('')}</div>`;
  return h;
}
function renderCouncil(force){
  if(!S||!councilOpen()||COUNCIL.press&&!force)return;
  const tabs=CTAB.map(([k,n])=>{const badge=k==='msg'?((S.ask?1:0)+(S.asks||[]).length):k==='army'?intelOf(1).plan.filter(p=>p.st==='new').length:0;return `<button class="c-tab${COUNCIL.tab===k?' on':''}" type="button" data-ct="${k}">${n}${badge?` <i>${badge}</i>`:''}</button>`;}).join('');
  if(tabs!==COUNCIL.tabs){$('c-tabs').innerHTML=tabs;COUNCIL.tabs=tabs;}
  const panes={msg:cMsg,army:cArmy,ctr:cCtr,econ:cEcon,rules:cRules};
  $('c-road').hidden=COUNCIL.tab!=='road';$('c-body').hidden=COUNCIL.tab==='road';
  if(COUNCIL.tab==='road'){renderSvc();return;}
  const h=panes[COUNCIL.tab]();
  if(h!==COUNCIL.last){$('c-body').innerHTML=h;COUNCIL.last=h;}
}
function councilAct(a){
  const [k,x,y]=a.split(':');
  if(k==='ans'){answerQueued(+x,y==='1');renderAsk();ui.actKey='';}
  else if(k==='see'){$('ov-council').hidden=true;centerOn(+x,+y);FX.pings.push({x:+x,y:+y,t:0,col:'#ffe066'});}
  else if(k==='selid'){const e=byId.get(+x);if(alive(e)){$('ov-council').hidden=true;centerOn(e.x,e.y);select([e]);}}
  else if(k==='ord'){armyOrder(1,x);toast(`Ordem ao general: ${ARMY_ORD[x]}.`,'good');playSfx(x==='attack'?'march':'click');}
  else if(k==='cmd'){const q=armyOf(1).sq.find(s=>s.id===+x);if(q){const r=sqCommand(q,y,true);if(r!=='ok')toast(r==='cd'?'Esse comando ainda está recarregando.':'O chefe desse grupo não tem patente para isso.','warn');}}
  else if(k==='selsq'){const q=armyOf(1).sq.find(s=>s.id===+x);if(q){const us=[q.lead,...q.mem].map(id=>byId.get(id)).filter(alive);if(us.length){$('ov-council').hidden=true;select(us);centerOn(us[0].x,us[0].y);}}}
  else if(k==='sweep'){const r=startSweep(1,x);toast(r==='ok'?(x==='spy'?'O batedor partiu para espiar a base vermelha.':'O batedor partiu para reconhecer o terreno.'):r==='noscout'?'Não há batedor livre. Treine um no quartel.':'Não há caminho para o batedor.',r==='ok'?'good':'warn');}
  else if(k==='plan'){if(y==='1'){const r=planApprove(1,+x);toast({ok:'Obra autorizada: o engenheiro já está cuidando.',cost:'Faltam recursos para essa obra.',era:'Torres só a partir da Era II.',noeng:'Sem engenheiro-chefe agora.',place:'O lugar não está mais livre.'}[r]||'Essa obra não está mais no plano.',r==='ok'?'good':'warn');}else planReject(1,+x);}
  else if(k==='planall'){let ok=0,fail=0;for(const p of intelOf(1).plan.filter(p=>p.st==='new')){planApprove(1,p.id)==='ok'?ok++:fail++;}toast(`${ok} ${ok===1?'obra autorizada':'obras autorizadas'}${fail?`, ${fail} sem recursos ou sem lugar`:''}.`,ok?'good':'warn');}
  else if(k==='planshow'){ui.showPlan=!ui.showPlan;}
  else if(k==='renew'){const r=ctrRenew(+x);toast(r==='ok'?'Contrato renovado.':r==='cost'?'Falta ouro para renovar.':'Esse contrato não pode ser renovado.',r==='ok'?'good':'warn');}
  else if(k==='cancel'){const c=ctrList().find(q=>q.id===+x);if(c)confirmBox('Cancelar o contrato?',`Quebrar ${CTR[c.kind].name.toLowerCase()} com ${S.towns[c.town].name} custa 15 de honra e amizade com a vila. Os mercenários voltam para casa.`,'Quebrar contrato',()=>{ctrCancel(+x);COUNCIL.last='';renderCouncil(true);});}
  else if(k==='town'){const T=S.towns[+x],h=T&&byId.get(T.id);if(h){$('ov-council').hidden=true;centerOn(T.x,T.y-40);select([h]);}}
  else if(k==='tax'){econSetTax(1,+x);}
  else if(k==='fest'){const r=econFestival(1);if(r!=='ok')toast(r==='cost'?'Faltam recursos para a festa.':'A última festa foi há pouco.','warn');}
  else if(k==='stall'){const r=econOpenStall(1);if(r!=='ok')toast({nomarket:'Construa um mercado primeiro.',full:'Todas as barracas estão ocupadas.',nobody:'Não há aldeão livre agora.'}[r],'warn');}
  else if(k==='close'){econCloseStall(byId.get(+x));}
  else if(k==='rule'){S.rules=rulesOf();S.rules[x]=!S.rules[x];}
  else if(k==='gold'){S.rules=rulesOf();S.rules.gold=+x;}
  COUNCIL.last='';renderCouncil(true);councilBadge();
}
// ---------------------------------------------------------------- the town panel: Comércio · Contratos · Diplomacia
function townTabs(T){
  const t=ui.townTab||'com';
  return `<div class="t-tabs">${[['com','Comércio'],['ctr','Contratos'],['dip','Diplomacia']].map(([k,n])=>`<button class="act wide t-tab${t===k?' go':''}" type="button" data-act="ttab:${k}">${n}</button>`).join('')}</div>`;
}
function townCtrPanel(T,btn){
  let a='';const f=friendOf(T,1)+(favOf(T,1)>0?1:0),side=loyalTo(T),R=S.teams[1].res;
  if(side===2&&!T.owner)a+=`<div class="hint">${T.name} jurou lealdade ao Reino Vermelho: não aceita contratos com você, a não ser que você pague para quebrar o juramento (Aliança ou Proteção).</div>`;
  const opt=(kind,o,label)=>{const t=ctrTerms(kind,T,1,o),need=CTR[kind].need,lk=f<need,price=t.cost&&t.cost.gold?costHTML(t.cost):kind==='protect'||kind==='loyalty'?`${Math.round(t.pct*100)}%/min`:kind==='route'?Object.entries(t.pay).map(([k,v])=>v+' '+RES_IMG[k]).join(''):'';
    const act=activeCtr(T,kind,1);
    return btn(`ctr:${kind}:${T.i}:${(o&&o.min)||0}`,'',`${CTR[kind].name}: ${CTR[kind].desc}`,`<span class="glyph">${{merc:'⚔',mercLife:'⚔',hero:'★',garrison:'⛨',protect:'⛉',loyalty:'♛',route:'⇆'}[kind]}</span><span>${label||CTR[kind].short}</span>${act?'<span class="lock">em vigor</span>':lk?`<span class="lock">${repStars(need)}</span>`:`<span class="cost">${price}</span>`}`,lk||act?'off':(t.cost&&!afford(1,t.cost)?'off':''),t.cost&&t.cost.gold?` data-cost='${JSON.stringify(t.cost)}'`:'');};
  for(const m of CTR_MIN)a+=opt('merc',{min:m},`${m} min: 4 ${DEF[eliteOf(T)].name.toLowerCase()}s`);
  a+=opt('mercLife',{},`Fiéis até a morte`);
  a+=opt('hero',{},DEF[heroOf(T)].name);
  a+=opt('garrison',{},'Guarnição 10 min');
  a+=opt('protect',{},'Proteção');
  a+=opt('loyalty',{},'Aliança');
  a+=opt('route',{},`Rota de ${RES_NAME[routeRes(T)]}`);
  const mine=ctrList().filter(c=>c.state==='active'&&c.team===1&&c.town===T.i);
  a+=`<div class="hint" style="flex:none;width:34ch">Um mensageiro (um batedor seu, ou um embaixador) leva a proposta a pé e a vila decide. ${mine.length?`Em vigor: ${mine.map(c=>CTR[c.kind].short+(c.end?` (${fmtT(ctrLeft(c))})`:'')).join(', ')}.`:'Nenhum contrato com esta vila.'} Honra: ${Math.round(honorOf(1))} (${HONOR_NAME(honorOf(1))}).</div>`;
  return a;
}
function townDipPanel(T,btn){
  let a='';const R=S.teams[1].res,free=svcActive(1)<svcSlots(1);
  a+=btn(`svc:embassy:${T.i}`,'',`Mandar um embaixador com 60 de ouro de presente: a amizade com ${T.name} cresce`,`<span class="glyph" style="color:#b07a3a">✉</span><span>Embaixador</span><span class="cost">${costHTML({gold:60})}</span>`,!free||R.gold<60||S.t<(T.embT||0)?'off':'');
  a+=`<button class="act wide${underAttack(1)?' go':''}" type="button" data-act="sos" title="Pedir ajuda às vilas durante um ataque">Pedir<br>ajuda</button>`;
  a+=btn(`svc:soldiers:${T.i}`,'',`Ceder 2 soldados livres para a guarda de ${T.name}: eles vão a pé e a vila paga por eles`,`<img alt="" src="${iconFor('warrior',1)}"><span>Ceder soldados</span><span class="cost">+ouro</span>`,!free?'off':'');
  if(T.owner===1){
    a+=btn(`tfest:${T.i}`,'','Dar uma festa na vila: lealdade +12',`<span class="glyph">♪</span><span>Festa na vila</span><span class="cost">${costHTML({food:100,gold:50})}</span>`,S.t<(T.festT||0)||!afford(1,{food:100,gold:50})?'off':'');
  }else if(T.owner===2){
    const t=ctrTerms('liberate',T,1);
    a+=btn(`ctr:liberate:${T.i}:0`,'',`Comprar ${T.name} do Reino Vermelho: ela passa para o seu lado`,`<span class="glyph">⚖</span><span>Libertar</span><span class="cost">${costHTML(t.cost)}</span>`,afford(1,t.cost)&&(T.loyal||0)<70?'':'off',` data-cost='${JSON.stringify(t.cost)}'`);
  }
  if(T.owner!==1&&!T.siege)a+=`<button class="act wide warn" type="button" data-act="conquer:${T.i}" title="Tomar a vila à força">Conquistar</button>`;
  if(T.siege&&T.siege.team===1)a+=`<button class="act wide warn" type="button" data-act="siegego:${T.i}" title="Mandar o exército selecionado para a vila">Atacar a vila</button>`;
  const st=T.owner===1?`É sua vassala: lealdade ${Math.round(T.loyal)}/100. Paga tributo a cada minuto e manda guardas quando você é atacado. Se a lealdade cair abaixo de 15 sem tropas suas por perto, ela se revolta.`:T.owner===2?`É vassala do Reino Vermelho (lealdade ${Math.round(T.loyal)}). Com lealdade abaixo de 70, você pode comprá-la de volta.`:T.siege?`Sob ataque de ${teamName(T.siege.team)}: guardas da vila por perto ${townGuardsNear(T,16*TS)}.`:'Vila livre.';
  a+=`<div class="hint" style="flex:none;width:34ch">${st} ${FRIEND_PERKS[friendOf(T,1)]}</div>`;
  return a;
}

// ---------------------------------------------------------------- news from the simulation
HOOK.council=(what,q)=>{
  if(what==='auto'){cLog(`Decidido pela regra: ${q.who} — ${(q.text||'').split(/[.?!]/)[0]}.`,'good',q.loc);toast(`Conselho: ${q.who.replace(' pede autorização','')} — autorizado pela regra.`,null,q.loc);}
  councilBadge();
};
HOOK.honor=(t,v,why)=>{
  if(t!==1)return;
  const txt={kept:'Contrato cumprido',broken:'Contrato quebrado',unpaid:'Pagamento atrasado',saved:'Você defendeu uma vila',ingrate:'Você recusou ajuda a quem te ajudou',attack:'Você atacou uma vila neutra',conquer:'Você conquistou uma vila',loot:'Você saqueou uma caravana'}[why]||'Honra';
  toast(`${txt}: honra ${v>0?'+':''}${v} (${Math.round(honorOf(1))}).`,v>0?'good':'warn');cLog(`${txt}: honra ${v>0?'+':''}${v}.`,v>0?'good':'bad');
};
HOOK.ctr=(what,c,x)=>{
  const T=S.towns&&S.towns[c.town],nm=T?T.name:'',loc=T?{x:T.x,y:T.y}:null;
  if(c.team===2){
    if(what==='start'){const m=`O Reino Vermelho fechou ${CTR[c.kind].name.toLowerCase()} com ${nm}.`;cLog(m,'bad',loc);toast(m,'warn',loc);}
    else if(what==='lost'){const m=`${nm} quebrou o contrato com o Reino Vermelho e ficou do seu lado!`;cLog(m,'good',loc);toast(m,'good',loc);}
    return;
  }
  if(what==='start'){const m=`Contrato fechado com ${nm}: ${CTR[c.kind].name}.`;toast(m,'good',loc);cLog(m,'good',loc);playSfx('rank');
    if(c.kind==='merc'||c.kind==='mercLife'||c.kind==='hero')townSay(T,null,c.kind==='hero'?`${DEF[c.terms.unit].name} parte agora para o seu castelo.`:`Os nossos ${DEF[c.terms.unit].name.toLowerCase()}s já estão a caminho.`);}
  else if(what==='answer'){if(x&&!x.ok&&!x.counter){townSay(T,null,x.why);cLog(`${nm} recusou ${CTR[c.terms.kind].name.toLowerCase()}: ${x.why}`,'bad',loc);}}
  else if(what==='tribute'){FX.floats.push({x:T.x,y:T.y-50,txt:`+tributo de ${teamName(1)}`,col:'#ffe066',t:0});}
  else if(what==='unpaid'){toast(`Faltou pagar ${CTR[c.kind].name.toLowerCase()} a ${nm}! Mais um atraso e o contrato acaba.`,'warn',loc);cLog(`Pagamento atrasado a ${nm}.`,'bad',loc);}
  else if(what==='help'){toast(`${nm} cumpriu a ${CTR[c.kind].short.toLowerCase()}: ${x} guardas vêm te defender.`,'good',loc);cLog(`${nm} mandou ${x} guardas (contrato).`,'good',loc);}
  else if(what==='war'){toast(`${nm} mandou ${x} guardas para a sua guerra.`,'good',loc);cLog(`${nm} mandou ${x} guardas para a guerra.`,'good',loc);}
  else if(what==='route'){FX.floats.push({x:x.x,y:x.y-40,txt:`+${c.terms.n} ${RES_NAME[c.terms.res]}`,col:'#ffe066',t:0});cLog(`Caravana de ${nm} entregou ${c.terms.n} de ${RES_NAME[c.terms.res]}.`,'good');}
  else if(what==='routeUnpaid'){toast(`A caravana de ${nm} chegou e não havia como pagar!`,'warn',loc);}
  else if(what==='renew'){toast(`Contrato renovado com ${nm}.`,'good',loc);cLog(`Contrato renovado com ${nm}.`,'good');}
  else if(what==='end'){const w={done:'terminou e foi cumprido',broken:'foi quebrado',unpaid:'acabou por falta de pagamento',outbid:'acabou: a vila mudou de lado',dead:'acabou: ninguém sobreviveu'}[c.why]||'acabou';const m=`${CTR[c.kind].name} com ${nm} ${w}.`;toast(m,c.why==='done'?null:'warn',loc);cLog(m,c.why==='done'?'':'bad',loc);}
  else if(what==='kept'){toast(`${nm} recusou o ouro do Reino Vermelho e continua do seu lado.`,'good',loc);cLog(`Você cobriu a oferta do Vermelho em ${nm}.`,'good');}
  else if(what==='lost'){toast(`${nm} aceitou o ouro do Reino Vermelho e quebrou o acordo com você!`,'warn',loc);cLog(`${nm} mudou para o lado do Vermelho.`,'bad',loc);}
  else if(what==='stayed'){toast(`${nm} pensou bem e continua do seu lado.`,'good',loc);}
  else if(what==='noRenew'){cLog('Você não renovou o contrato.','');}
  else if(what==='helpAnswer'){if(x.kind==='free')toast(`${nm} atendeu o mensageiro: ${x.n} guardas a caminho!`,'good',loc);else if(x.kind!=='paid')toast(`${nm} não pôde mandar ajuda desta vez.`,'warn',loc);}
  renderCouncil();councilBadge();
};
HOOK.town=(T,what,team,x)=>{
  const loc={x:T.x,y:T.y},who=teamName(team,true);
  const m={siege:`${who} ${team===1?'atacou':'atacou'} ${T.name}!`,lifted:`O ataque a ${T.name} acabou.`,conquered:`${who} ${team===1?'conquistou':'conquistou'} ${T.name}! Agora é vassala.`,revolt:`${T.name} se revoltou contra ${teamName(team)}!`,freed:`${T.name} foi comprada e passou para o lado de ${teamName(team)}.`,tribute:null,festival:`Festa em ${T.name}: a lealdade cresceu.`}[what];
  if(what==='tribute'){if(team===1)FX.floats.push({x:T.x,y:T.y-50,txt:`+${x} ouro (tributo)`,col:'#ffe066',t:0});return;}
  if(!m)return;
  toast(m,(what==='conquered'||what==='freed')&&team===1||what==='festival'?'good':'warn',loc);cLog(m,team===1&&(what==='conquered'||what==='freed')?'good':'bad',loc);
  if(what==='siege'||what==='conquered'){playSfx('march');FX.pings.push({x:T.x,y:T.y,t:0,col:'#ff5a4a'});}
  if(what==='revolt')townSay(T,null,'Chega de servir quem não nos protege!');
  ui.actKey='';
};
HOOK.army=(what,team,u,x)=>{
  if(what==='cmd'&&u)FX.cmds.push({id:u.id,t:0,team,k:x.k});
  if(team!==1){
    if(what==='flank'&&u){cLog('O general vermelho mandou um grupo pelo flanco.','bad',{x:u.x,y:u.y});toast('Cuidado: o Reino Vermelho mandou um grupo pelo flanco!','warn',{x:u.x,y:u.y});}
    return;
  }
  const loc=u?{x:u.x,y:u.y,id:u.id}:null;
  if(what==='general'&&u){const m=x&&x.vote?`A tropa votou: ${rankedName(u)} é o novo chefe do exército (${x.vote.votes} de ${x.vote.total} votos).`:`${rankedName(u)} assumiu o comando do exército.`;toast(m,'good',loc);cLog(m,'good',loc);playSfx('rank');}
  else if(what==='fallen'&&u){const m=`${rankedName(u)} caiu em combate${x&&x.next?`. ${rankedName(x.next)} assume o grupo`:''}${x&&x.general?' (era o general)':''}.`;toast(m,'warn',loc);cLog(m,'bad',loc);}
  else if(what==='cmd'&&u){if(x.manual)playSfx('march');}
  else if(what==='order'){cLog(`Ordem do exército: ${ARMY_ORD[x.type]}.`,'');}
  else if(what==='march'&&u){toast('O exército está reunido. Avante!','good',loc);}
  else if(what==='fallback'&&u){toast(`${rankedName(u)} mandou recuar para salvar o exército.`,'warn',loc);cLog('O general mandou recuar.','bad',loc);}
  renderCouncil();
};
HOOK.scout=(what,team,u,x)=>{
  if(what==='openPlan'){if(watching()){for(const p of intelOf(1).plan.filter(p=>p.st==='new'))planApprove(1,p.id);return;}ui.showPlan=true;openCouncil('army');return;}
  if(team!==1){if(what==='rubro'&&u)cLog('O Reino Vermelho tem um engenheiro-chefe: Mestre Rubro.','bad',{x:u.x,y:u.y});return;}
  const loc=u?{x:u.x,y:u.y,id:u.id}:null;
  if(what==='start'){toast(x.kind==='spy'?'O batedor partiu para espiar a base vermelha.':'O batedor partiu para reconhecer o terreno.','good',loc);cLog(x.kind==='spy'?'Batedor a caminho da base vermelha.':'Batedor reconhecendo o terreno.','',loc);}
  else if(what==='lost'){toast('O batedor não voltou...','warn');cLog('O batedor foi perdido.','bad');}
  else if(what==='plan'){cLog(`Plano de defesa pronto: ${(x.plan||[]).length} obras.`,'good',loc);}
  else if(what==='spy'){cLog(x.item?'Espionagem pronta: plano de ataque pelo lado fraco.':'O batedor não achou um caminho para atacar.','good',loc);}
  renderCouncil();
};
HOOK.econ=(what,team,u,x)=>{
  if(team!==1&&!(what==='caravanLost'||what==='ambush'||what==='looted'&&team===2))return;
  const loc=u&&u.x!=null?{x:u.x,y:u.y}:null;
  if(what==='sale'){FX.floats.push({x:u.x,y:u.y-46,txt:`+${x.gold}`,col:'#ffe066',t:0});u.trader.saleT=S.t;}
  else if(what==='festival'){toast('Festa no castelo! O povo está mais feliz.','good');cLog('Você deu uma festa: humor +18.','good');playSfx('era');const c=castleOf(1);if(c)for(let i=0;i<6;i++)FX.sparks.push({x:c.x+(Math.random()-.5)*160,y:c.y-40-Math.random()*60,t:-i*.2,team:1});}
  else if(what==='leave'){toast('Um aldeão foi embora: o povo está revoltado. Baixe os impostos ou dê uma festa.','warn');cLog('Um aldeão abandonou o reino.','bad');}
  else if(what==='unpaid'){toast('Não há ouro para o soldo! Os soldados lutam pior até serem pagos.','warn');cLog('Soldo atrasado.','bad');}
  else if(what==='paid'){toast('Soldo em dia de novo.','good');}
  else if(what==='desert'){toast('Um recruta desertou por falta de soldo!','warn');cLog('Um recruta desertou.','bad');}
  else if(what==='stall'){toast(`${folkName(u)} abriu uma barraca na feira.`,'good',loc);}
  else if(what==='toll'){FX.floats.push({x:u.x,y:u.y-40,txt:`+${x.v} ouro (pedágio)`,col:'#ffe066',t:0});}
  else if(what==='visit'){FX.floats.push({x:u.x,y:u.y-40,txt:`+${x.g} ouro`,col:'#ffe066',t:0});cLog(`Uma caravana comprou ${x.n} de ${RES_NAME[x.k]} na sua feira por ${x.g} de ouro.`,'good',loc);}
  else if(what==='visitor'){cLog(`A fama da sua feira atraiu uma caravana de ${u.name}.`,'good');}
  else if(what==='looted'){if(team===1){toast(`Caravana saqueada: ${Object.entries(x.g).map(([k,v])=>v+' de '+RES_NAME[k]).join(', ')}. As vilas não vão esquecer.`,'warn',loc);}else cLog('O Reino Vermelho saqueou uma caravana das vilas.','',loc);}
  renderCouncil();
};

// ---------------------------------------------------------------- wiring (called once by boot)
function councilBind(){
  $('b-svc').addEventListener('click',()=>{audioInit();openCouncil((S&&(S.ask||(S.asks&&S.asks.length)))?'msg':COUNCIL.tab);});
  $('b-c-close').addEventListener('click',()=>{$('ov-council').hidden=true;});
  $('c-pop').addEventListener('click',()=>{audioInit();openCouncil('econ');});
  $('ov-council').addEventListener('pointerdown',ev=>{if(ev.target.id==='ov-council')$('ov-council').hidden=true;});
  $('c-tabs').addEventListener('click',ev=>{const b=ev.target.closest('[data-ct]');if(!b)return;COUNCIL.tab=b.dataset.ct;COUNCIL.last='';renderCouncil(true);});
  $('ov-council').addEventListener('pointerdown',()=>{COUNCIL.press=true;});
  window.addEventListener('pointerup',()=>{if(COUNCIL.press)setTimeout(()=>{COUNCIL.press=false;},80);});
  $('ov-council').addEventListener('click',ev=>{const b=ev.target.closest('[data-c]');if(!b||b.disabled)return;audioInit();councilAct(b.dataset.c);});
}

// ---------------------------------------------------------------- the action panel: squads, leaders and the general's orders
function selSquads(sel){const out=[];for(const u of sel){if(u.team!==1)continue;const q=sqOf(u);if(q&&!out.includes(q))out.push(q);}return out;}
function panelSqKey(sel){
  if(!S||!sel.length||sel[0].team!==1||!DEF[sel[0].kind].unit)return 0;
  const A=armyOf(1);
  return A.ord.type+'|'+A.gen+'|'+selSquads(sel).map(q=>{const L=byId.get(q.lead);return q.id+':'+(L?L.rank||0:0)+':'+Object.keys(CMD).map(k=>(q.cd[k]||0)>S.t?0:1).join('');}).join(',');
}
function squadText(e){
  if(!S||e.team!==1||!DEF[e.kind].unit)return '';
  const A=armyOf(1),q=sqOf(e);if(!q)return '';
  const L=byId.get(q.lead);
  if(q.lead===e.id)return ` · ${A.gen===e.id?'<b>General do exército</b>, ':''}chefe de um grupo de ${q.mem.length}`;
  return L?` · grupo de ${rankedName(L)}`:'';
}
function armyPanel(sel,btn){
  let a='';const A=armyOf(1),sqs=selSquads(sel).filter(q=>alive(byId.get(q.lead)));
  if(sqs.length){
    const top=Math.max(...sqs.map(q=>byId.get(q.lead).rank||0));
    for(const k of Object.keys(CMD)){
      const C=CMD[k],can=sqs.filter(q=>(byId.get(q.lead).rank||0)>=C.rank),ready=can.filter(q=>(q.cd[k]||0)<=S.t);
      const lk=!can.length,cd=!lk&&!ready.length;
      a+=btn(`sqcmd:all:${k}`,'',`${C.name}: ${C.desc} Pede um chefe ${RANKS[C.rank].n} ou acima. Recarga ${C.cd} s.`,`<span class="glyph">${C.glyph}</span><span>${C.name}</span>${lk?`<span class="lock">${RANKS[C.rank].n}</span>`:cd?'<span class="lock">recarregando</span>':`<span class="cost">${ready.length>1?ready.length+' grupos':'pronto'}</span>`}`,lk||cd?'off':'');
    }
  }
  if(A.gen)a+=`<button class="act wide${A.ord.type!=='free'?' go':''}" type="button" data-act="genorders" title="Dar ordens ao general e ver os grupos do exército">Ordens do<br>general</button>`;
  return a;
}
// what a town contract means, said plainly before the messenger leaves
function ctrConfirmText(kind,T,t){
  const g=t.cost&&t.cost.gold?`${t.cost.gold} de ouro`:'';
  const u=t.unit?DEF[t.unit].name.toLowerCase():'';
  return {
    merc:`4 ${u}s de ${T.name} lutam por você durante ${t.min} minutos, por ${g}. Depois voltam para casa (ou você renova com 10% de desconto).`,
    mercLife:`4 ${u}s de ${T.name} lutam por você até o último cair, por ${g}.`,
    hero:`${DEF[t.unit].name}, o herói de ${T.name}, luta por você até cair, por ${g}. Se ele cair, a vila precisa de um tempo para ter outro.`,
    garrison:`4 ${u}s de ${T.name} ficam de guarda nos seus portões e torres por 10 minutos, por ${g}.`,
    protect:`${T.name} defende você quando for atacado. Em troca, você paga ${Math.round(t.pct*100)}% da sua produção a cada minuto (no mínimo ${t.min} de ouro). Dois atrasos e o contrato acaba.`,
    loyalty:`${T.name} jura lealdade: não negocia com o Reino Vermelho, manda guardas para as suas guerras, defende você e faz 15% de desconto. Você paga ${g} na assinatura e ${Math.round(t.pct*100)}% da sua produção por minuto (no mínimo ${t.min}).`,
    route:`Durante 10 minutos, ${T.name} manda uma caravana a cada 1 min 40 s com ${t.n} de ${RES_NAME[t.res]}. Você paga na chegada: ${t.pay?Object.entries(t.pay).map(([k,v])=>v+' de '+RES_NAME[k]).join(', '):''}.`,
    liberate:`O ouro (${g}) vai para ${T.name}, que quebra a vassalagem com o Reino Vermelho e passa para o seu lado.`,
  }[kind]+' Um mensageiro leva a proposta a pé; a vila decide quando ele chegar.';
}
// the mood chip on the top bar
function moodChip(){
  if(!S)return;const ch=$('c-pop');
  const on=!!castleOf(1);ch.hidden=!on;if(!on)return;
  const E=econOf(1),p=Math.round(E.pop),face=p>=75?'☺':p>=45?'◡':p>=25?'☹':'✖';
  const t=String(p);if($('r-mood').textContent!==t)$('r-mood').textContent=t;
  if($('r-face').textContent!==face)$('r-face').textContent=face;
  $('r-mood-bar').style.width=p+'%';
  ch.classList.toggle('warn',p<25||!!E.unpaid);
  ch.title=`Humor do povo: ${POP_NAME(p)} (${p}). Impostos: ${TAX[E.tax].n}.${E.unpaid?' Soldo atrasado!':''}`;
}
