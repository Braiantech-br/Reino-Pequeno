// ================================================================ Dois jogadores: a match between two devices, straight from one to the other (WebRTC)
// No game server: the host makes an invitation code, the friend answers with a reply code (sent by WhatsApp, for example), and the
// two devices talk directly (public STUN servers only help them find each other). The host's device runs the match: the host plays
// the Blue Kingdom, the friend the Red one. The friend's device receives the whole world every few seconds and the moving pieces
// several times a second; it shows the world with the colours swapped, so each player sees their own kingdom in blue, and it sends
// back the orders given to its troops and buildings.
const NET={pc:null,dc:null,role:'',on:false,base:{},known:new Set(),dT:0,fT:0,res:null,parts:{},seq:0,first:true};
const NET_ICE=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'},{urls:'stun:stun.cloudflare.com:3478'}];
const NET_ORD=['move','attack','gather','build','convert','repair','unload','heal'];
function netGuest(){return NET.on&&NET.role==='guest';}
function netHost(){return NET.on&&NET.role==='host';}
function netStatus(t){const el=$('net-st');if(el)el.textContent=t;}
function netIce(pc){return new Promise(r=>{if(pc.iceGatheringState==='complete')return r();const t=setTimeout(r,5000);pc.addEventListener('icegatheringstatechange',()=>{if(pc.iceGatheringState==='complete'){clearTimeout(t);r();}});});}
function netReset(){try{NET.dc&&NET.dc.close();}catch(e){}try{NET.pc&&NET.pc.close();}catch(e){}Object.assign(NET,{pc:null,dc:null,role:'',on:false,base:{},known:new Set(),parts:{},first:true,ended:false});}
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
  dc.onopen=()=>{NET.on=true;netStatus('Conectado!');if(NET.role==='host')netHostStart();else netStatus('Conectado! Esperando o anfitrião começar a partida…');};
  dc.onmessage=ev=>netRecv(ev.data);
  dc.onclose=()=>{const was=NET.on;NET.on=false;if(!was)return;
    if(NET.role==='host'&&S&&!S.over){aiInit(2);toast('O seu amigo saiu. O computador assume o Reino Vermelho.','warn');}
    else if(NET.role==='guest'){toast('A conexão com o anfitrião caiu.','warn');setTimeout(()=>{ui.started=false;S=null;showMenu();},1500);}
    NET.role='';};
}
async function netCreate(){
  netReset();NET.role='host';
  const pc=new RTCPeerConnection({iceServers:NET_ICE});NET.pc=pc;netChannel(pc.createDataChannel('reino',{ordered:true}));
  netStatus('Preparando o convite…');
  await pc.setLocalDescription(await pc.createOffer());await netIce(pc);
  $('net-out').value=await edCode(JSON.stringify(pc.localDescription));$('net-out').select();
  try{navigator.clipboard&&navigator.clipboard.writeText($('net-out').value).catch(()=>{});}catch(e){}
  netStatus('Convite pronto (já copiado). Mande para o seu amigo e cole abaixo o código de resposta que ele mandar de volta.');
  $('net-ans').hidden=false;
}
async function netAnswerIn(){
  try{const d=JSON.parse(await edUncode($('net-in').value));await NET.pc.setRemoteDescription(d);netStatus('Conectando…');}
  catch(e){netStatus('Esse código de resposta não funcionou. Confira se copiou inteiro.');}
}
async function netJoin(){
  netReset();NET.role='guest';
  let offer;try{offer=JSON.parse(await edUncode($('net-in').value));}catch(e){netStatus('Esse convite não funcionou. Confira se copiou inteiro.');return;}
  const pc=new RTCPeerConnection({iceServers:NET_ICE});NET.pc=pc;pc.ondatachannel=ev=>netChannel(ev.channel);
  await pc.setRemoteDescription(offer);await pc.setLocalDescription(await pc.createAnswer());await netIce(pc);
  $('net-out').value=await edCode(JSON.stringify(pc.localDescription));$('net-out').select();
  try{navigator.clipboard&&navigator.clipboard.writeText($('net-out').value).catch(()=>{});}catch(e){}
  netStatus('Resposta pronta (já copiada). Mande para o anfitrião. A partida começa assim que ele colar.');
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
  netSend({t:'full',z:await edCode(raw)});
}
function netDelta(){
  const e=[];for(const u of S.ents){if(u.dead||!DEF[u.kind].unit)continue;e.push([u.id,Math.round(u.x),Math.round(u.y),Math.round(u.hp),u.face||1,u.moving?1:0,u.atkT>0?1:0,u.anim||0]);}
  netSend({t:'d',st:S.t,e,r:{1:S.teams[1].res,2:S.teams[2].res},over:S.over||null});
}
function netHostMsg(o){
  if(!S||S.over)return;
  if(o.t==='ord')for(const[id,ord]of o.l){const u=byId.get(id);if(!u||u.dead||u.team!==2)continue;if(ord&&!NET_ORD.includes(ord.type))continue;u.order=ord;u.path=null;u.stuck=0;}
  else if(o.t==='bq'){const b=byId.get(o.id);if(!b||b.dead||b.team!==2)return;if(o.rally)b.rally=o.rally;const add=(o.q||[]).slice((b.queue||[]).length);for(const k of add)if(DEF[k])trainAt(b,k);}
  else if(o.t==='place'){const bl=(o.b||[]).map(id=>byId.get(id)).filter(u=>u&&!u.dead&&u.team===2);placeBuilding(2,o.k,o.x,o.y,bl);}
  else if(o.t==='res')startResearch(2);
}
// ---- the guest: shows the host's world with the teams swapped and sends its orders
function netSwap(W){
  const sw=t=>t===1?2:t===2?1:t;
  for(const e of W.ents){e.team=sw(e.team);if(e.aid&&e.aid.team)e.aid.team=sw(e.aid.team);}
  for(const k of['teams','tech','honor','war','intel','armies','econ'])if(W[k]&&typeof W[k]==='object'){const a=W[k][1];W[k][1]=W[k][2];W[k][2]=a;}
  const a=W.engineerId;W.engineerId=W.redEngId;W.redEngId=a;
  for(const T of W.towns||[]){T.owner=sw(T.owner);if(T.siege)T.siege.team=sw(T.siege.team);}
  W.over=W.over==='win'?'lose':W.over==='lose'?'win':W.over;
  return W;
}
async function netGuestMsg(o){
  if(o.t==='full'){
    let d;try{d=JSON.parse(await edUncode(o.z),matchIn);}catch(e){return;}
    const keepSel=ui.sel.slice();S=netSwap(d.S);S.cfg=Object.assign({},S.cfg,{mp:true,fog:false});afterLoad();
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
  el('b-net').addEventListener('click',()=>{netReset();el('net-out').value='';el('net-in').value='';el('net-ans').hidden=true;netStatus('');el('ov-net').hidden=false;});
  el('net-host').addEventListener('click',()=>{el('net-in').value='';netCreate().catch(()=>netStatus('Este aparelho não conseguiu criar a conexão.'));});
  el('net-join').addEventListener('click',()=>{if(!el('net-in').value.trim()){netStatus('Cole primeiro o convite que o seu amigo mandou.');return;}netJoin().catch(()=>netStatus('Não consegui usar esse convite.'));});
  el('net-go').addEventListener('click',()=>{if(NET.role!=='host'){netStatus('Primeiro crie o convite.');return;}netAnswerIn();});
  el('net-close').addEventListener('click',()=>{if(!NET.on)netReset();el('ov-net').hidden=true;});
  el('net-copy').addEventListener('click',()=>{el('net-out').select();try{navigator.clipboard.writeText(el('net-out').value).catch(()=>{});toast('Código copiado.','good');}catch(e){document.execCommand&&document.execCommand('copy');}});
}
