// ================================================================ Editor de mapas: paint a Batalha Rápida map, keep it, share it, play it
// The editor works on a real match that is not running yet: the map of the menu is generated, then grass, water, trees, sand,
// gold, sheep and bandit camps are painted over it. Playing starts that very match. A map is kept like a saved game, and shared
// as a code (the match squeezed with gzip, in base64) that anyone can paste back in.
const ED={tool:'mover',size:2,painting:false,dirty:false,name:''};
const ED_TOOLS={mover:'✋ Mover',grama:'Grama',agua:'Água',arvore:'Árvores',areia:'Areia',ouro:'Ouro',ovelha:'Ovelhas',bandidos:'Bandidos',apagar:'Apagar'};
const MAP_PRE='reinoPequeno.mapa.';
function edOpen(){
  startGame({mode:'skirmish',diff:radio('diff')||'dificil',blue:'voce',claude:false,hero:'nenhum'});
  for(const t of[1,2]){const C=CLAUDE.side[t];C.gid++;C.on=false;C.busy=false;}clChip();
  S.editor=true;ui.paused=true;ED.tool='mover';ED.name='';
  $('edbar').hidden=false;edBar();$('app').classList.add('editing');
  banner('Editor de mapas','Pinte o seu mapa','Escolha uma ferramenta embaixo e arraste no mapa. Quando terminar, toque em Jogar.',false);
}
function edBar(){
  $('ed-tools').innerHTML=Object.entries(ED_TOOLS).map(([k,n])=>`<button type="button" data-ed="${k}" aria-pressed="${ED.tool===k}">${n}</button>`).join('')+
    `<span class="ed-sz">Pincel ${[1,2,3].map(n=>`<button type="button" data-sz="${n}" aria-pressed="${ED.size===n}">${n}</button>`).join('')}</span>`;
}
function edClose(){S.editor=false;$('edbar').hidden=true;$('app').classList.remove('editing');ui.started=false;S=null;showMenu();}
// paint one dab of the brush around a map point
function edDab(wx,wy){
  const tx=tileOf(wx),ty=tileOf(wy),r=ED.size-1,c1=castleOf(1),c2=castleOf(2);
  const nearCastle=(x,y)=>[c1,c2].some(c=>c&&hyp(x*TS+16-c.x,y*TS+16-c.y)<4.5*TS);
  if(['grama','agua','arvore','areia'].includes(ED.tool)){
    const T={grama:GRASS,agua:WATER,arvore:TREE,areia:SAND}[ED.tool];
    for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      const x=tx+dx,y=ty+dy;if(!inB(x,y)||x<1||y<1||x>MW-2||y>MH-2||hyp(dx,dy)>r+.5)continue;
      const i=idx(x,y);if(occ[i]||nearCastle(x,y)&&T!==GRASS)continue;
      if(T===TREE&&S.tiles[i]===WATER)continue;
      S.tiles[i]=T;S.wood[i]=T===TREE?60+Math.floor(Math.random()*30):0;
      if(T===WATER)for(const e of S.ents)if(!e.dead&&!DEF[e.kind].building&&tileOf(e.x)===x&&tileOf(e.y)===y)removeQuiet(e);
      HOOK.tile(x,y);ED.dirty=true;
    }
    reachDirty=true;return;
  }
  if(ED.tool==='ouro'){if(S.t0ed===S.t)return;S.t0ed=S.t;const ok=[0,1].every(a=>[0,1].every(b=>{const i=idx(tx+a,ty+b);return inB(tx+a,ty+b)&&!occ[i]&&walkXY(tx+a,ty+b)&&!nearCastle(tx+a,ty+b);}));
    if(ok){spawnFixed('gold',0,tx,ty);ED.dirty=true;}return;}
  if(ED.tool==='ovelha'){if(walkXY(tx,ty)){spawnUnit(ANIMALS[(Math.random()*ANIMALS.length)|0],0,wx,wy);}return;}
  if(ED.tool==='bandidos'){
    if(nearCastle(tx,ty)||hyp(wx-c1.x,wy-c1.y)<12*TS){toast('Longe demais dos castelos: os bandidos precisam de espaço.','warn');return;}
    const sp=campSpot('den',tx,ty,false,null);if(sp.length){makeCamp('den',sp[0],['bandit','bandit','banditA']);ED.dirty=true;}else toast('Não cabe um acampamento aqui.','warn');return;
  }
  if(ED.tool==='apagar'){
    let best=null,bd=40;for(const e of S.ents){if(e.dead||e.team===1||e.team===2||e.kind==='town'||DEF[e.kind].townb)continue;const c=DEF[e.kind].building||DEF[e.kind].resource?centerOf(e):e,d=hyp(c.x-wx,c.y-wy);if(d<bd){bd=d;best=e;}}
    if(best){removeQuiet(best);if(DEF[best.kind].building||DEF[best.kind].resource)reachDirty=true;ED.dirty=true;}
  }
}
function edPointer(ev,phase){
  if(!S||!S.editor||ED.tool==='mover')return false;
  const p=local(ev),w=toWorld(p.x,p.y);
  if(phase==='down'){ED.painting=true;edDab(w.x,w.y);}
  else if(phase==='move'&&ED.painting){if(!['ouro','bandidos','apagar'].includes(ED.tool)||ED.tool==='apagar')edDab(w.x,w.y);}
  else if(phase==='up'&&ED.painting){ED.painting=false;if(ED.dirty){buildTerrain();buildMiniBase();ED.dirty=false;}}
  return true;
}
// ---- keeping maps
function edPack(){return JSON.stringify({v:1,map:true,cam:{x:cam.x,y:cam.y,z:cam.z},S},matchOut);}
function edList(){const out=[];try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith(MAP_PRE)&&!k.endsWith('.info')){let inf={};try{inf=JSON.parse(localStorage.getItem(k+'.info')||'{}');}catch(e){}out.push({id:k.slice(MAP_PRE.length),name:inf.name||'Mapa',when:inf.when||0});}}}catch(e){}return out.sort((a,b)=>b.when-a.when);}
function edSave(){
  const nm=ED.name||`Mapa ${edList().length+1}`;
  const id=ED.id||String(Date.now());
  try{localStorage.setItem(MAP_PRE+id,edPack());localStorage.setItem(MAP_PRE+id+'.info',JSON.stringify({name:nm,when:Date.now()}));ED.id=id;ED.name=nm;toast(`Mapa guardado: ${nm}.`,'good');return id;}
  catch(e){toast('Não há espaço para guardar o mapa. Apague um mapa antigo.','warn');return null;}
}
function edPlayData(raw){
  let d=null;try{d=JSON.parse(raw,matchIn);}catch(e){d=null;}
  if(!d||!d.S){toast('Não consegui abrir esse mapa.','warn');return;}
  S=d.S;S.editor=false;afterLoad();if(d.cam)Object.assign(cam,d.cam);clampCam();
  buildTerrain();buildMiniBase();
  ui.last={mode:'skirmish',diff:S.diff&&S.diff.key};audioInit();
  ui.started=true;ui.paused=false;ui.sel=[];ui.placing=null;ui.targeting=null;ui.speed=1;
  $('ov-start').hidden=true;$('ov-maps').hidden=true;$('edbar').hidden=true;$('app').classList.remove('editing');refreshPanel(true);hud();
  banner('Começa a partida','Mapa do editor',`Dificuldade ${S.diff.name}. Trégua de ${fmt(S.diff.peace)}.`,false);
  watchStart();clStart(true);
}
function edPlay(){S.editor=false;$('edbar').hidden=true;$('app').classList.remove('editing');ui.paused=false;S.t=0;refreshPanel(true);hud();banner('Começa a partida','Mapa do editor',`Dificuldade ${S.diff.name}. Trégua de ${fmt(S.diff.peace)}.`,false);clStart(true);}
function edEdit(raw,id,name){
  let d=null;try{d=JSON.parse(raw,matchIn);}catch(e){}
  if(!d||!d.S){toast('Não consegui abrir esse mapa.','warn');return;}
  S=d.S;S.editor=true;afterLoad();if(d.cam)Object.assign(cam,d.cam);clampCam();buildTerrain();buildMiniBase();
  ui.started=true;ui.paused=true;ED.id=id||null;ED.name=name||'';ED.tool='mover';
  $('ov-start').hidden=true;$('ov-maps').hidden=true;$('edbar').hidden=false;$('app').classList.add('editing');edBar();refreshPanel(true);hud();
}
function edMaps(){
  const L=edList();
  $('mp-list').innerHTML=L.length?L.map(m=>`<div class="sv-row"><div><b>${esc(m.name)}</b><small>${m.when?new Date(m.when).toLocaleDateString('pt-BR'):''}</small></div><div class="btns"><button class="btn" type="button" data-mp="play:${m.id}">Jogar</button><button class="btn alt" type="button" data-mp="edit:${m.id}">Editar</button><button class="btn alt" type="button" data-mp="share:${m.id}">Compartilhar</button><button class="btn alt" type="button" data-mp="del:${m.id}">Apagar</button></div></div>`).join(''):'<p>Nenhum mapa guardado ainda. Toque em <b>Editor de mapas</b> para criar o primeiro, ou cole o código de um mapa abaixo.</p>';
  $('ov-maps').hidden=false;
}
// share codes: gzip + base64 (plain base64 when the browser has no CompressionStream)
async function edCode(raw){
  try{if(typeof CompressionStream==='function'){const s=new Blob([raw]).stream().pipeThrough(new CompressionStream('gzip'));const buf=new Uint8Array(await new Response(s).arrayBuffer());let bin='';for(let i=0;i<buf.length;i+=8192)bin+=String.fromCharCode.apply(null,buf.subarray(i,i+8192));return 'RPM1:'+btoa(bin);}}catch(e){}
  return 'RPM0:'+btoa(unescape(encodeURIComponent(raw)));
}
async function edUncode(code){
  code=String(code||'').trim().replace(/\s+/g,'');
  if(code.startsWith('RPM0:'))return decodeURIComponent(escape(atob(code.slice(5))));
  if(code.startsWith('RPM1:')){const bin=atob(code.slice(5)),buf=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)buf[i]=bin.charCodeAt(i);
    const s=new Blob([buf]).stream().pipeThrough(new DecompressionStream('gzip'));return await new Response(s).text();}
  throw new Error('código inválido');
}
{
  const el=id=>document.getElementById(id);
  el('ed-tools').addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;if(b.dataset.ed)ED.tool=b.dataset.ed;if(b.dataset.sz)ED.size=+b.dataset.sz;edBar();});
  el('ed-new').addEventListener('click',()=>{ui.seed=newSeed();edOpen();});
  el('ed-save').addEventListener('click',()=>{const n=window.prompt?window.prompt('Nome do mapa:',ED.name||`Mapa ${edList().length+1}`):null;if(n!=null)ED.name=n.trim().slice(0,30)||ED.name;edSave();});
  el('ed-play').addEventListener('click',edPlay);
  el('ed-exit').addEventListener('click',edClose);
  el('b-maps').addEventListener('click',edMaps);
  el('b-editor').addEventListener('click',()=>{audioInit();edOpen();});
  el('mp-close').addEventListener('click',()=>{el('ov-maps').hidden=true;});
  el('mp-list').addEventListener('click',async ev=>{
    const b=ev.target.closest('button[data-mp]');if(!b)return;const[a,id]=b.dataset.mp.split(':'),raw=localStorage.getItem(MAP_PRE+id);
    let inf={};try{inf=JSON.parse(localStorage.getItem(MAP_PRE+id+'.info')||'{}');}catch(e){}
    if(a==='play'&&raw)edPlayData(raw);
    else if(a==='edit'&&raw)edEdit(raw,id,inf.name);
    else if(a==='share'&&raw){el('mp-code').value='Gerando o código…';const code=await edCode(JSON.stringify({name:inf.name||'Mapa',data:raw}));el('mp-code').value=code;el('mp-code').select();try{navigator.clipboard&&navigator.clipboard.writeText(code);toast('Código do mapa copiado. Mande para um amigo colar em Meus mapas.','good');}catch(e){}}
    else if(a==='del'){if(b.dataset.ok){localStorage.removeItem(MAP_PRE+id);localStorage.removeItem(MAP_PRE+id+'.info');edMaps();}else{b.dataset.ok='1';b.textContent='Apagar mesmo?';b.classList.add('danger');}}
  });
  el('mp-import').addEventListener('click',async()=>{
    try{const o=JSON.parse(await edUncode(el('mp-code').value));const id=String(Date.now());localStorage.setItem(MAP_PRE+id,o.data);localStorage.setItem(MAP_PRE+id+'.info',JSON.stringify({name:(o.name||'Mapa')+' (recebido)',when:Date.now()}));el('mp-code').value='';edMaps();toast('Mapa recebido e guardado.','good');}
    catch(e){toast('Esse código não é de um mapa do Reino Pequeno (ou veio cortado).','warn');}
  });
}
