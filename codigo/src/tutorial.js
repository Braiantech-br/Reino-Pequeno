// ================================================================ Tutorial: the first five minutes, one step at a time
// It runs on top of chapter 1 of the campaign: the attacks wait until the last step, an arrow shows where to look (on the map or
// on a button), and each step moves on by itself as soon as the player does what it asks.
const TUT_STEPS=[
  {txt:'Bem-vindo ao Reino Pequeno! Arraste o mapa com o dedo ou o mouse (ou use as setas do teclado) para olhar em volta.',done:T=>T.cam>140},
  {txt:'Estes são os seus aldeões. Toque em um deles para selecioná-lo.',at:()=>tutPawn(),done:()=>liveSel().some(e=>e.kind==='pawn'&&e.team===1)},
  {txt:'Com o aldeão selecionado, toque numa árvore: ele corta madeira e leva para o castelo.',at:()=>tutTree(),done:()=>tutGath('wood')},
  {txt:'Agora mande um aldeão para as pedras douradas: é a mina de ouro.',at:()=>tutGold(),done:()=>tutGath('gold')},
  {txt:'Casas aumentam a população. Selecione um aldeão, toque em Casa e escolha o lugar no mapa.',ui:'[data-act="build:house"]',done:()=>tutHave('house')>=1},
  {txt:'A comida vem das ovelhas e das fazendas. Construa uma fazenda do mesmo jeito.',ui:'[data-act="build:farm"]',done:()=>tutHave('farm')>=1},
  {txt:'Para ter soldados, construa um quartel.',ui:'[data-act="build:barracks"]',done:()=>tutHave('barracks')>=1},
  {txt:'Quando o quartel ficar pronto, toque nele e treine 3 guerreiros.',ui:'[data-act="train:warrior"]',at:()=>tutBld('barracks'),done:()=>tutCount('warrior')>=3},
  {txt:'Bandidos rondam a vila! Toque em Exército (lá em cima) para selecionar os soldados e depois toque nos bandidos.',ui:'#b-army',at:()=>tutFoes(),start:()=>tutBandits(),done:()=>!tutFoes()&&S.t-(S.tut.ts||0)>3},
  {txt:'O Conselho reúne tudo: mensagens, exército, contratos, economia e regras. Abra o Conselho.',ui:'#b-svc',done:()=>!$('ov-council').hidden},
  {txt:'Pronto! Você já sabe o básico. Agora cumpra os objetivos do capítulo (no canto da tela). Os bandidos do Corvo Negro vêm aí. Boa sorte!',end:true},
];
function tutPawn(){const c=castleOf(1);let b=null,bd=1e9;for(const e of S.ents)if(!e.dead&&e.team===1&&e.kind==='pawn'){const d=c?hyp(e.x-c.x,e.y-c.y):0;if(d<bd){bd=d;b=e;}}return b;}
function tutTree(){const c=castleOf(1);if(!c)return null;const tx=tileOf(c.x),ty=tileOf(c.y);let b=null,bd=1e9;
  for(let y=ty-14;y<=ty+14;y++)for(let x=tx-14;x<=tx+14;x++){if(!inB(x,y)||S.tiles[idx(x,y)]!==TREE)continue;const d=hyp(x-tx,y-ty);if(d<bd){bd=d;b={x:x*TS+16,y:y*TS+16};}}return b;}
function tutGold(){const c=castleOf(1);let b=null,bd=1e9;for(const e of S.ents)if(!e.dead&&e.kind==='gold'&&c){const d=hyp(e.x-c.x,e.y-c.y);if(d<bd){bd=d;b=e;}}return b&&centerOf(b);}
function tutGath(r){return S.ents.some(e=>!e.dead&&e.team===1&&e.kind==='pawn'&&e.order&&e.order.type==='gather'&&e.order.res===r);}
function tutHave(k){return S.ents.filter(e=>!e.dead&&e.team===1&&e.kind===k).length-(S.tut.base[k]||0);}
function tutCount(k){return S.ents.filter(e=>!e.dead&&e.team===1&&e.kind===k).length;}
function tutBld(k){const b=S.ents.find(e=>!e.dead&&e.team===1&&e.kind===k);return b&&centerOf(b);}
function tutFoes(){const l=S.ents.filter(e=>!e.dead&&e.tutFoe);return l.length?centroid(l):null;}
function tutBandits(){
  const c=castleOf(1);if(!c)return;S.tut.ts=S.t;
  const p=walkNear(c.x>MW*TS/2?c.x-8*TS:c.x+8*TS,c.y+3*TS);
  for(let i=0;i<2;i++){const u=spawnUnit('bandit',3,p.x+i*24,p.y);u.tutFoe=true;u.maxhp=u.hp=Math.round(u.maxhp*.6);u.order=null;}
}
function tutStart(){
  startGame({mode:'campaign',chapter:1,diff:'normal'});
  const base={};for(const e of S.ents)if(!e.dead&&e.team===1)base[e.kind]=(base[e.kind]||0)+1;
  S.tut={i:0,cam:0,cx:cam.x,cy:cam.y,base,t0:S.t};
  tutShow();
}
function tutSkip(){if(!S||!S.tut)return;S.tut.done=true;S.tutShift=S.t;$('tut').hidden=true;$('tut-arrow').hidden=true;tutGlow(null);ui.save.tutDone=true;writeSave();}
function tutGlow(sel){
  for(const el of document.querySelectorAll('.tut-glow'))el.classList.remove('tut-glow');
  if(sel)for(const el of document.querySelectorAll(sel))el.classList.add('tut-glow');
}
function tutShow(){
  const T=S.tut,st=TUT_STEPS[T.i];if(!st)return;
  $('tut').hidden=false;$('tut-n').textContent=`Tutorial · ${T.i+1} de ${TUT_STEPS.length}`;$('tut-t').textContent=st.txt;
  $('tut-skip').textContent=st.end?'Começar':'Pular tutorial';
  if(st.start&&!T.started){T.started=T.i;st.start();}
}
// every frame: did the player do it? and where does the arrow point?
function tutTick(){
  const T=S.tut;if(!T||T.done)return;
  const st=TUT_STEPS[T.i];if(!st){tutSkip();return;}
  T.cam=Math.max(T.cam,hyp(cam.x-T.cx,cam.y-T.cy)*cam.z);
  if(!st.end&&st.done(T)){T.i++;T.started=null;playSfx('build');tutShow();return;}
  tutGlow(st.ui||null);
  const ar=$('tut-arrow'),p=st.at&&st.at();
  if(p){const sx=(p.x-cam.x)*cam.z,sy=(p.y-cam.y)*cam.z-26*cam.z;ar.hidden=false;ar.style.transform=`translate(${Math.round(sx)}px,${Math.round(sy)}px)`;}
  else ar.hidden=true;
}
document.getElementById('tut-skip').addEventListener('click',()=>{const T=S&&S.tut;if(!T)return;const st=TUT_STEPS[T.i];tutSkip();if(st&&st.end)toast('Cumpra os objetivos do capítulo no canto da tela.','good');});
document.getElementById('b-tut').addEventListener('click',()=>{audioInit();tutStart();});
