// ================================================================ Dois jogadores: a match between two devices, straight from one to the other (WebRTC)
// No game server: the host makes an invitation code, the friend answers with a reply code (sent by WhatsApp, for example), and the
// two devices talk directly (public STUN servers only help them find each other). The host's device runs the match: the host plays
// the Blue Kingdom, the friend the Red one. The friend's device receives the whole world every few seconds and the moving pieces
// several times a second; it shows the world with the colours swapped, so each player sees their own kingdom in blue, and it sends
// back the orders given to its troops and buildings.
const NET={pc:null,dc:null,role:'',on:false,base:{},known:new Set(),dT:0,fT:0,res:null,parts:{},seq:0,first:true,gz:false};
// STUN servers only tell each device its public address; when the networks in between do not let the two devices talk straight
// to each other (mobile data, some routers, guest Wi-Fi), a TURN relay is needed: the player can add one in the "Dois jogadores"
// screen (a free Metered/Open Relay key, or the address, user and password of any TURN server)
const NET_STUN=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun2.l.google.com:19302']},{urls:'stun:stun.cloudflare.com:3478'}];
const NET_ORD=['move','attack','gather','build','convert','repair','unload','heal'];
function netGuest(){return NET.on&&NET.role==='guest';}
function netHost(){return NET.on&&NET.role==='host';}
function netStatus(t,bad){const el=$('net-st');if(el){el.textContent=t;el.classList.toggle('bad',!!bad);}}
function netTurnCfg(){try{return localStorage.getItem('rp.turn')||'';}catch(e){return '';}}
// the ICE servers: STUN, plus the relay the player configured
async function netIceServers(){
  const t=netTurnCfg().trim();if(!t)return NET_STUN;
  try{
    if(/^https:\/\//i.test(t)){const r=await fetch(t);const j=await r.json();const list=Array.isArray(j)?j:j.iceServers;if(Array.isArray(list)&&list.length)return NET_STUN.concat(list);}
    else{const[u,user,pass]=t.split(/\s+/);if(/^turns?:/i.test(u))return NET_STUN.concat([{urls:u,username:user||'',credential:pass||''}]);}
  }catch(e){}
  return NET_STUN;
}
function netIce(pc){return new Promise(r=>{if(pc.iceGatheringState==='complete')return r();const t=setTimeout(r,6000);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);r();}});});}
function netReset(){clearTimeout(NET.failT);try{NET.dc&&NET.dc.close();}catch(e){}try{NET.pc&&NET.pc.close();}catch(e){}Object.assign(NET,{pc:null,dc:null,role:'',on:false,base:{},known:new Set(),parts:{},first:true,ended:false,gz:false,code:'',stage:''});}
// the connection codes: the description of the connection in plain base64 (no compression, so any browser can read them)
function netPack(desc){const j=JSON.stringify({t:desc.type,s:desc.sdp});return 'RPC0:'+btoa(unescape(encodeURIComponent(j)));}
async function netUnpack(code){
  code=String(code||'').trim().replace(/\s+/g,'');
  if(code.startsWith('RPC0:')){const o=JSON.parse(decodeURIComponent(escape(atob(code.slice(5)))));return {type:o.t,sdp:o.s};}
  return JSON.parse(await edUncode(code));                                        // codes made by 2.3 and 2.3.1
}
// copy to the clipboard for real, and say so only when it worked
async function netCopy(text,el){
  try{if(navigator.clipboard&&window.isSecureContext!==false){await navigator.clipboard.writeText(text);return true;}}catch(e){}
  try{el.focus();el.select();el.setSelectionRange(0,text.length);if(document.execCommand&&document.execCommand('copy'))return true;}catch(e){}
  return false;
}
function netShow(){
  // what the screen shows now (the invitation survives closing this window to go to WhatsApp)
  $('net-out').value=NET.code||'';$('net-outbox').hidden=!NET.code;
  $('net-ans').hidden=!(NET.role==='host'&&NET.code&&!NET.on);
  $('net-share').hidden=!navigator.share;
}
function netWatch(pc){
  pc.addEventListener('iceconnectionstatechange',()=>{
    const st=pc.iceConnectionState;
    if(st==='checking')netStatus('Conectando os dois aparelhos…');
    else if(st==='failed'){clearTimeout(NET.failT);netFail();}
    else if(st==='disconnected'&&NET.on)toast('A conexão com o outro aparelho está instável…','warn');
  });
}
function netFail(){
  netStatus('Não deu para conectar: as redes dos dois aparelhos não deixaram eles se falarem direto. Veja "Problemas para conectar?" logo abaixo e toque em "Começar de novo".',true);
  const d=$('net-help');if(d)d.open=true;
}
// messages: JSON, cut in pieces when long (a data channel takes about 64 KB per message on every browser)
function netSend(o){
  const d=NET.dc;if(!d||d.readyState!=='open')return;
  const s=JSON.stringify(o);if(s.length<60000){d.send(s);return;}
  const id=++NET.seq,n=Math.ceil(s.length/60000);for(let i=0;i<n;i++)d.send(JSON.stringify({t:'part',id,i,n,d:s.slice(i*60000,(i+1)*60000)}));
}
function netRecv(raw){
  let o;try{o=JSON.parse(raw);}catch(e){return;}
  if(o.t==='part'){const P=NET.parts[o.id]||(NET.parts[o.id]={n:o.n,got:0,d:[]});if(P.d[o.i]==null){P.d[o.i]=o.d;P.got++;}if(P.got<P.n)return;delete NET.parts[o.id];return netRecv(P.d.join(''));}
  if(NET.role==='host')netHostMsg(o);else netGuestMsg(o);
}
function netChannel(dc){
  NET.dc=dc;
  const opened=()=>{if(NET.on)return;NET.on=true;clearTimeout(NET.failT);netStatus('Conectado!');
    if(NET.role==='host')netHostStart();else{netSend({t:'hi',gz:typeof DecompressionStream==='function'});netStatus('Conectado! Esperando o anfitrião começar a partida…');}};
  dc.onopen=opened;if(dc.readyState==='open')opened();
  dc.onmessage=ev=>netRecv(ev.data);
  dc.onclose=()=>{const was=NET.on;NET.on=false;if(!was)return;
    if(NET.role==='host'&&S&&!S.over){aiInit(2);toast('O seu amigo saiu. O computador assume o Reino Vermelho.','warn');}
    else if(NET.role==='guest'){toast('A conexão com o anfitrião caiu.','warn');setTimeout(()=>{ui.started=false;S=null;showMenu();},1500);}
    NET.role='';};
}
async function netOut(code,msg){
  NET.code=code;netShow();
  const ok=await netCopy(code,$('net-out'));
  netStatus((ok?'Código copiado. ':'Toque em "Copiar código" (ou selecione o código e copie). ')+msg);
}
async function netCreate(){
  netReset();NET.role='host';NET.stage='convite';
  netStatus('Preparando o convite… (leva alguns segundos)');
  const pc=new RTCPeerConnection({iceServers:await netIceServers()});NET.pc=pc;netWatch(pc);netChannel(pc.createDataChannel('reino',{ordered:true}));
  await pc.setLocalDescription(await pc.createOffer());await netIce(pc);
  await netOut(netPack(pc.localDescription),'Mande o convite para o seu amigo. Quando ele mandar a resposta, cole no campo de cima e toque em "Conectar". Pode fechar esta janela enquanto isso: o convite continua valendo.');
}
async function netAnswerIn(){
  let d;try{d=await netUnpack($('net-in').value);if(d.type!=='answer')throw 0;}
  catch(e){netStatus('Esse não é o código de resposta do seu amigo. Confira se ele mandou a resposta (e não o seu próprio convite) e se veio inteiro.',true);return;}
  try{await NET.pc.setRemoteDescription(d);}catch(e){netStatus('Essa resposta é de outro convite. Peça ao amigo para colar o convite mais novo e mandar a resposta de novo.',true);return;}
  netStatus('Conectando os dois aparelhos…');
  clearTimeout(NET.failT);NET.failT=setTimeout(()=>{if(!NET.on)netFail();},25000);
}
async function netJoin(){
  let offer;try{offer=await netUnpack($('net-in').value);if(offer.type!=='offer')throw 0;}
  catch(e){netStatus('Esse não é um convite do Reino Pequeno (ou veio cortado). Peça para o amigo copiar de novo.',true);return;}
  netReset();NET.role='guest';NET.stage='resposta';
  netStatus('Preparando a resposta… (leva alguns segundos)');
  const pc=new RTCPeerConnection({iceServers:await netIceServers()});NET.pc=pc;netWatch(pc);pc.ondatachannel=ev=>netChannel(ev.channel);
  await pc.setRemoteDescription(offer);await pc.setLocalDescription(await pc.createAnswer());await netIce(pc);
  NET.failT=setTimeout(()=>{if(!NET.on)netStatus('Ainda esperando o anfitrião colar a sua resposta. Se demorar muito, os dois tocam em "Começar de novo".');},90000);
  await netOut(netPack(pc.localDescription),'Mande esta resposta para quem criou a sala e volte para cá: a partida começa sozinha assim que ele colar.');
}
// "Testar a minha rede": which ways out this device has
async function netTest(){
  const out=$('net-test-r');out.textContent='Testando… (até 8 segundos)';
  let pc;try{pc=new RTCPeerConnection({iceServers:await netIceServers()});}catch(e){out.textContent='Este navegador não tem conexão direta (WebRTC). Use o Chrome, o Edge, o Firefox ou o Safari atualizados.';return;}
  const seen={host:0,srflx:0,relay:0};pc.onicecandidate=e=>{if(e.candidate){const m=/ typ (\w+)/.exec(e.candidate.candidate);if(m&&seen[m[1]]!=null)seen[m[1]]++;}};
  pc.createDataChannel('t');await pc.setLocalDescription(await pc.createOffer());
  await new Promise(r=>{const t=setTimeout(r,8000);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);r();}});});
  pc.close();
  const turn=!!netTurnCfg().trim(),L=[];
  L.push(seen.host?'✓ Rede local: ok (funciona com os dois no mesmo Wi-Fi).':'✗ Rede local: nenhum caminho. Confira se o aparelho está conectado.');
  L.push(seen.srflx?'✓ Internet: ok, a rede deixa sair para conexões diretas.':'✗ Internet: a rede bloqueia conexões diretas (firewall, rede da empresa ou da escola). Use o mesmo Wi-Fi ou um servidor de retransmissão.');
  L.push(turn?(seen.relay?'✓ Retransmissão: funcionando. Deve conectar mesmo em redes diferentes e nos dados móveis.':'✗ Retransmissão: configurada, mas não respondeu. Confira a chave ou o endereço.'):'• Retransmissão: não configurada. Sem ela, redes diferentes e dados móveis podem não conectar.');
  out.textContent=L.join('\n');
}
// ---- the host: the match runs here
function netHostStart(){
  $('ov-net').hidden=true;
  startGame({mode:'skirmish',diff:radio('diff')||'dificil',blue:'voce',claude:false,hero:'nenhum'});
  S.ai=null;S.cfg=Object.assign({},S.cfg,{mp:true,claude:false,fog:false});S.autoBuild=false;
  for(const t of[1,2]){const C=CLAUDE.side[t];C.gid++;C.on=false;}clChip();
  banner('Dois jogadores','Você é o Reino Azul','O seu amigo comanda o Reino Vermelho. Boa batalha!',false);
  NET.fT=0;NET.dT=0;netFull();
}
async function netFull(){
  const raw=JSON.stringify({S},matchOut);
  if(NET.gz&&typeof CompressionStream==='function')netSend({t:'full',z:await edCode(raw)});else netSend({t:'full',j:raw});
}
function netDelta(){
  const e=[];for(const u of S.ents){if(u.dead||!DEF[u.kind].unit)continue;e.push([u.id,Math.round(u.x),Math.round(u.y),Math.round(u.hp),u.face||1,u.moving?1:0,u.atkT>0?1:0,u.anim||0]);}
  netSend({t:'d',st:S.t,e,r:{1:S.teams[1].res,2:S.teams[2].res},over:S.over||null});
}
function netHostMsg(o){
  if(!S||S.over)return;
  if(o.t==='hi'){NET.gz=!!o.gz;return;}
  if(o.t==='ord')for(const[id,ord]of o.l){const u=byId.get(id);if(!u||u.dead||u.team!==2)continue;if(ord&&!NET_ORD.includes(ord.type))continue;u.order=ord;u.path=null;u.stuck=0;}
  else if(o.t==='bq'){const b=byId.get(o.id);if(!b||b.dead||b.team!==2)return;if(o.rally)b.rally=o.rally;const add=(o.q||[]).slice((b.queue||[]).length);for(const k of add)if(DEF[k])trainAt(b,k);}
  else if(o.t==='place'){const bl=(o.b||[]).map(id=>byId.get(id)).filter(u=>u&&!u.dead&&u.team===2);placeBuilding(2,o.k,o.x,o.y,bl);}
  else if(o.t==='res')startResearch(2);
  else if(o.t==='fn'&&NET_FN.includes(o.f))netAsGuest(()=>{const fn=NET_FNS[o.f];if(fn)fn(...netArgsIn(o.a||[]));});
}
// the Council, the villages and the army orders of the friend: run here, in a world turned around for a moment so that the
// friend's kingdom is the "player" one (the same functions the host's own buttons use), with the screen messages muted
const NET_FN=['proposeContract','ctrCancel','ctrRenew','startConquest','townFestival','askHelp','caravanSend','trade','barter','econSetTax','econOpenStall','econFestival',
  'armyOrder','sqCommand','startSweep','planApprove','planReject','cancelResearch','placeWall','demolish','townRaid','svcOrder'];
const NET_FNS={};
function netAsGuest(fn){
  const H={};for(const k in HOOK){H[k]=HOOK[k];HOOK[k]=()=>{};}
  netSwap(S);
  try{return fn();}catch(e){}
  finally{netSwap(S);for(const k in H)HOOK[k]=H[k];}
}
function netArgOut(v){
  if(v&&typeof v==='object'){
    if(v.id!=null&&v.kind&&byId.get(v.id)===v)return {__id:v.id};
    if(v.lead!=null&&Array.isArray(v.mem))return {__sq:v.id};
    if(Array.isArray(v))return v.map(netArgOut);
    const o={};for(const k in v)o[k]=netArgOut(v[k]);return o;
  }
  return v;
}
function netArgsIn(a){
  const f=v=>{if(v&&typeof v==='object'){if(v.__id!=null)return byId.get(v.__id);if(v.__sq!=null){const A=S.armies&&S.armies[1];return A&&A.sq.find(q=>q.id===v.__sq);}
    if(Array.isArray(v))return v.map(f);const o={};for(const k in v)o[k]=f(v[k]);return o;}return v;};
  return a.map(f);
}
// on the friend's device each of these goes to the host too (and runs here at once, so the screen answers right away)
function netWrap(){
  const wrap=(name,orig,set)=>{NET_FNS[name]=orig;set(function(...a){
    if(netGuest()){netSend({t:'fn',f:name,a:a.map(netArgOut)});const r=orig.apply(this,a);for(const e of S.ents){NET.known.add(e.id);if(e.team===1&&DEF[e.kind].unit)NET.base[e.id]=e.order?JSON.stringify(e.order):'';}return r;}
    return orig.apply(this,a);});};
  wrap('proposeContract',proposeContract,f=>proposeContract=f);wrap('ctrCancel',ctrCancel,f=>ctrCancel=f);wrap('ctrRenew',ctrRenew,f=>ctrRenew=f);
  wrap('startConquest',startConquest,f=>startConquest=f);wrap('townFestival',townFestival,f=>townFestival=f);wrap('askHelp',askHelp,f=>askHelp=f);
  wrap('caravanSend',caravanSend,f=>caravanSend=f);wrap('trade',trade,f=>trade=f);wrap('barter',barter,f=>barter=f);
  wrap('econSetTax',econSetTax,f=>econSetTax=f);wrap('econOpenStall',econOpenStall,f=>econOpenStall=f);wrap('econFestival',econFestival,f=>econFestival=f);
  wrap('armyOrder',armyOrder,f=>armyOrder=f);wrap('sqCommand',sqCommand,f=>sqCommand=f);wrap('startSweep',startSweep,f=>startSweep=f);
  wrap('planApprove',planApprove,f=>planApprove=f);wrap('planReject',planReject,f=>planReject=f);wrap('cancelResearch',cancelResearch,f=>cancelResearch=f);
  wrap('placeWall',placeWall,f=>placeWall=f);wrap('demolish',demolish,f=>demolish=f);wrap('townRaid',townRaid,f=>townRaid=f);wrap('svcOrder',svcOrder,f=>svcOrder=f);
}
netWrap();
// ---- the guest: shows the host's world with the teams swapped and sends its orders
function netSwap(W){
  const sw=t=>t===1?2:t===2?1:t;
  for(const e of W.ents){e.team=sw(e.team);if(e.aid&&e.aid.team)e.aid.team=sw(e.aid.team);}
  for(const k of['teams','tech','honor','war','intel','armies','econ'])if(W[k]&&typeof W[k]==='object'){const a=W[k][1];W[k][1]=W[k][2];W[k][2]=a;}
  const a=W.engineerId;W.engineerId=W.redEngId;W.redEngId=a;
  for(const T of W.towns||[]){T.owner=sw(T.owner);if(T.siege)T.siege.team=sw(T.siege.team);if(T.rep){const r=T.rep[1];T.rep[1]=T.rep[2];T.rep[2]=r;}if(T.conq&&T.conq.team)T.conq.team=sw(T.conq.team);}
  for(const c of W.contracts||[])c.team=sw(c.team);
  if(W.svc)for(const m of W.svc.list||[])m.team=sw(m.team);
  W.over=W.over==='win'?'lose':W.over==='lose'?'win':W.over;
  return W;
}
async function netGuestMsg(o){
  if(o.t==='full'){
    let d;try{d=JSON.parse(o.j!=null?o.j:await edUncode(o.z),matchIn);}catch(e){return;}
    const keepSel=ui.sel.slice();S=netSwap(d.S);S.ask=null;S.asks=[];S.cfg=Object.assign({},S.cfg,{mp:true,fog:false});afterLoad();
    NET.base={};NET.known=new Set();for(const e of S.ents){if(e.team===1){if(DEF[e.kind].unit)NET.base[e.id]=e.order?JSON.stringify(e.order):'';else if(DEF[e.kind].building)NET.base['b'+e.id]=JSON.stringify(e.queue||[])+'|'+JSON.stringify(e.rally||null);}NET.known.add(e.id);}
    NET.res=S.teams[1].research?1:0;
    if(NET.first){NET.first=false;buildTerrain();buildMiniBase();const c=castleOf(1);
      ui.started=true;ui.paused=false;ui.speed=1;$('ov-start').hidden=true;$('ov-net').hidden=true;cam.z=VW<700?1.15:1.5;if(c)centerOn(c.x+30,c.y-10);
      banner('Dois jogadores','Você é o Reino Vermelho','Na sua tela, o seu reino aparece em azul. Quem roda a partida é o anfitrião.',false);}
    ui.sel=keepSel.filter(id=>{const e=byId.get(id);return e&&!e.dead;});refreshPanel(true);hud();
    if(S.over)netGuestOver();
  }else if(o.t==='d'){
    if(!S||NET.first)return;
    S.t=o.st;
    for(const[id,x,y,hp,face,mv,at,an]of o.e){const e=byId.get(id);if(!e)continue;e._x=x;e._y=y;e.hp=hp;e.face=face;e.moving=!!mv;if(at)e.atkT=.3;e.anim=an||null;if(hp<=0)e.dead=true;}
    if(o.r){S.teams[1].res=o.r[2];S.teams[2].res=o.r[1];}
    if(o.over&&!S.over){S.over=o.over==='win'?'lose':'win';netGuestOver();}
  }
}
function netGuestOver(){if(NET.ended)return;NET.ended=true;const w=S.over==='win';S.over=null;endGame(w,'castle');}
// every frame on the guest: glide the pieces, and send the orders the player gave
function netTick(dt){
  if(netHost()){NET.dT+=dt;NET.fT+=dt;if(NET.dT>=.15){NET.dT=0;netDelta();}if(NET.fT>=2.5){NET.fT=0;netFull();}return;}
  if(!netGuest()||!S||NET.first)return;
  for(const e of S.ents){if(e._x==null)continue;e.x+=(e._x-e.x)*.35;e.y+=(e._y-e.y)*.35;}
  NET.oT=(NET.oT||0)+dt;if(NET.oT<.1)return;NET.oT=0;
  const ords=[];
  for(const e of S.ents){
    if(e.dead||e.team!==1)continue;const D=DEF[e.kind];
    if(D.building&&!NET.known.has(e.id)){
      // a building placed on this device: the host places the real one; the builders go with it
      NET.known.add(e.id);const bl=S.ents.filter(u=>u.team===1&&u.order&&u.order.type==='build'&&u.order.id===e.id);
      for(const u of bl)NET.base[u.id]=JSON.stringify(u.order);
      netSend({t:'place',k:e.kind,x:e.tx,y:e.ty,b:bl.map(u=>u.id)});continue;
    }
    if(D.unit){const j=e.order?JSON.stringify(e.order):'';if(NET.base[e.id]!==j){NET.base[e.id]=j;if(!(e.order&&e.order.type==='build'&&!NET.known.has(e.order.id)))ords.push([e.id,e.order||null]);}}
    else if(D.building){const q=JSON.stringify(e.queue||[])+'|'+JSON.stringify(e.rally||null);if(NET.base['b'+e.id]!==q){NET.base['b'+e.id]=q;netSend({t:'bq',id:e.id,q:e.queue||[],rally:e.rally||null});}}
  }
  if(ords.length)netSend({t:'ord',l:ords});
  const r=S.teams[1].research?1:0;if(r&&!NET.res)netSend({t:'res'});NET.res=r;
}
{
  const el=id=>document.getElementById(id);
  el('b-net').addEventListener('click',()=>{netShow();if(!NET.pc)netStatus('');el('ov-net').hidden=false;});
  el('net-host').addEventListener('click',()=>{el('net-in').value='';netCreate().catch(()=>netStatus('Este aparelho não conseguiu criar a conexão (o navegador não tem WebRTC?).',true));});
  el('net-join').addEventListener('click',()=>{if(!el('net-in').value.trim()){netStatus('Cole primeiro, no campo de cima, o convite que o seu amigo mandou.',true);return;}netJoin().catch(()=>netStatus('Não consegui usar esse convite.',true));});
  el('net-go').addEventListener('click',()=>{if(NET.role!=='host'||!NET.pc){netStatus('Primeiro toque em "Criar convite".',true);return;}netAnswerIn();});
  el('net-close').addEventListener('click',()=>{el('ov-net').hidden=true;});
  el('net-new').addEventListener('click',()=>{netReset();el('net-in').value='';netShow();netStatus('Tudo limpo. Um cria o convite de novo e o outro entra com ele.');});
  el('net-copy').addEventListener('click',async()=>{const ok=await netCopy(el('net-out').value,el('net-out'));netStatus(ok?'Código copiado. Agora cole no WhatsApp (ou onde quiser) e mande.':'Não consegui copiar sozinho: o código está selecionado, copie com Ctrl+C (no celular, segure em cima e toque em Copiar).',!ok);});
  el('net-share').addEventListener('click',()=>{try{navigator.share({text:el('net-out').value}).catch(()=>{});}catch(e){}});
  el('net-test').addEventListener('click',()=>{netTest().catch(()=>{el('net-test-r').textContent='O teste não rodou neste navegador.';});});
  el('net-turn').value=netTurnCfg();
  el('net-turn').addEventListener('change',()=>{try{localStorage.setItem('rp.turn',el('net-turn').value.trim());}catch(e){}});
}
