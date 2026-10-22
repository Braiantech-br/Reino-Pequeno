// Trailer 2 director: builds the world, then for each video frame sets the camera, the action and the titles,
// and steps the game's clock by one frame. The recorder takes a screenshot after every TR.frame(f).
(()=>{
const R=window.__reino,D=R.DEF,FPS=30,BPM=128,BEAT=60/BPM;
const SHOTS=[['intro',8],['logo',8],['contrate',8],['herois',8],['patente',8],['escudos',6],['avante',6],['espione',8],
  ['planeje',8],['conquiste',8],['governe',8],['inimigo',8],['montage',16],['fim',16]];
const START=[];let acc=0;for(const [,b] of SHOTS){START.push(acc);acc+=b;}
const TOTAL=Math.round(acc*BEAT*FPS);
const S=()=>R.S;
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3);

// ---------------------------------------------------------------- titles overlay
const css=`#trv{position:fixed;inset:0;pointer-events:none;z-index:1000;overflow:hidden}
#trv .bar{position:absolute;left:0;right:0;height:0;background:#000;z-index:3}#trv .bt{top:0}#trv .bb{bottom:0}
#trv .dim{position:absolute;inset:0;background:#05070c;opacity:0}
#trv .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(0,0,0,.6) 100%)}
#trv .tx{position:absolute;left:0;right:0;text-align:center;z-index:2}
#trv .tx.p-center{top:50%;transform:translateY(-50%)}
#trv .tx.p-top{top:150px}
#trv .tx.p-low{left:110px;right:auto;bottom:150px;text-align:left}
#trv .kick{font:700 34px "Pixelify Sans",sans-serif;letter-spacing:10px;color:#ffd23a;text-shadow:0 4px 0 #000,0 0 18px rgba(0,0,0,.8);margin-bottom:6px}
#trv .big{position:relative;font:400 168px/0.86 "Jersey 10",monospace;color:#fff;letter-spacing:3px;-webkit-text-stroke:4px #140b18;paint-order:stroke fill;text-shadow:0 8px 0 #140b18,0 0 40px rgba(0,0,0,.7);white-space:nowrap}
#trv .tx.p-low .big{font-size:132px}
#trv .big i{font-style:normal;color:#ffd23a}#trv .big em{font-style:normal;color:#ff4a36}
#trv .gh{position:absolute;inset:0;opacity:0;mix-blend-mode:screen}
#trv .sub{font:700 38px "Pixelify Sans",sans-serif;color:#fff;text-shadow:0 4px 0 #000,0 0 16px rgba(0,0,0,.9);margin-top:16px;letter-spacing:1px}
#trv .sub2{font:600 30px "Pixelify Sans",sans-serif;color:#ffe9a8;text-shadow:0 3px 0 #000;margin-top:10px}
#trv .flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:4}
#trv .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 2px,transparent 2px 4px);opacity:.22;z-index:1}
#ov-council{justify-content:flex-end;padding-right:90px!important;background:rgba(18,40,48,.35)!important}#ov-council .sheet{zoom:1.32;margin:auto 0!important}
#trv .url{font-size:96px}
@media (orientation:portrait){#trv .big{font-size:112px;white-space:normal;line-height:.92}#trv .tx.p-low{left:56px;right:56px;bottom:250px}#trv .tx.p-low .big{font-size:104px}#trv .kick{font-size:26px;letter-spacing:6px}#trv .sub{font-size:30px}#trv .sub2{font-size:24px}#trv .tx.p-top{top:230px}#trv .tx.p-center{padding:0 40px}#trv .url{font-size:62px}#ov-council{justify-content:center!important;padding-right:0!important;align-items:flex-start;padding-top:330px!important}#ov-council .sheet{zoom:1.12;margin:0 auto!important}}
#ask,#talk,#report,#goals,#banner,#sndpop,#ov-start,#ov-story,#ov-end,#ov-upd,#ov-confirm{display:none!important}`;
let V=null;
function overlay(){
  if(V)return V;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const d=document.createElement('div');d.id='trv';
  d.innerHTML='<div class="dim"></div><div class="vig"></div><div class="scan"></div><div class="tx p-center"><div class="kick"></div><div class="big"><span class="m"></span></div><div class="sub"></div><div class="sub2"></div></div><div class="bar bt"></div><div class="bar bb"></div><div class="flash"></div>';
  document.body.appendChild(d);
  V={d,dim:d.querySelector('.dim'),tx:d.querySelector('.tx'),kick:d.querySelector('.kick'),big:d.querySelector('.big'),m:d.querySelector('.m'),sub:d.querySelector('.sub'),sub2:d.querySelector('.sub2'),bt:d.querySelector('.bt'),bb:d.querySelector('.bb'),flash:d.querySelector('.flash'),last:{}};
  return V;
}
function setText(o){
  const v=overlay(),k=JSON.stringify([o.pos,o.kick,o.big,o.sub,o.sub2]);
  if(k!==v.last.k){v.last.k=k;v.tx.className='tx p-'+(o.pos||'center');v.kick.textContent=o.kick||'';v.kick.style.display=o.kick?'':'none';
    v.m.innerHTML=o.big||'';v.sub.textContent=o.sub||'';v.sub.style.display=o.sub?'':'none';v.sub2.textContent=o.sub2||'';v.sub2.style.display=o.sub2?'':'none';}
}
// a title slams in at time t0 (seconds into the shot) and leaves at t1
function slam(u,t0,t1){
  const v=overlay();
  if(u<t0||u>t1){v.tx.style.opacity=0;return;}
  const a=u-t0,b=t1-u,s=1+1.6*Math.exp(-a*16),op=Math.min(1,a*14,b*8);
  const shift=a<.12?(1-a/.12)*18:0;
  v.tx.style.opacity=op;
  v.big.style.transform=`scale(${s.toFixed(3)})`;
  v.big.style.textShadow=`${shift}px 0 0 rgba(255,60,60,.8),${-shift}px 0 0 rgba(60,220,255,.8),0 8px 0 #140b18,0 0 40px rgba(0,0,0,.7)`;
  v.kick.style.transform=`translateY(${(1-ease(a*5))*-20}px)`;v.kick.style.opacity=Math.min(1,a*6)*op;
  v.sub.style.opacity=Math.min(1,Math.max(0,(a-.18)*5))*op;v.sub2.style.opacity=Math.min(1,Math.max(0,(a-.4)*4))*op;
}
function bars(h){const v=overlay();v.bt.style.height=v.bb.style.height=(innerHeight>innerWidth?h*1.6:h)+'px';}
function dim(x){overlay().dim.style.opacity=x;}
function flash(u,t0,dur,pk){const v=overlay();const a=u-t0;v.flash.style.opacity=a>=0&&a<dur?(pk||.9)*(1-a/dur):0;}
let shakeK=0;
function shake(k){shakeK=Math.max(shakeK,k);}
function applyShake(){
  const app=document.getElementById('app'),v=overlay();
  const x=(Math.random()-.5)*shakeK,y=(Math.random()-.5)*shakeK;
  app.style.transform=shakeK>.3?`translate(${x}px,${y}px)`:'';v.tx.style.translate=shakeK>.3?`${x*.6}px ${y*.6}px`:'';
  shakeK*=.82;
}
function hud(on,extra){
  for(const id of ['top','panel','toasts'])document.getElementById(id).style.visibility=on||(extra&&extra.includes(id))?'visible':'hidden';
  document.getElementById('ov-council').hidden=!(extra&&extra.includes('council'));
}

// ---------------------------------------------------------------- the world
const cam={x:0,y:0,z:1.4,tx:0,ty:0,tz:1.4,k:.12};
function camTo(x,y,z,k,snap){cam.tx=x;cam.ty=y;cam.tz=z;cam.k=k||.12;if(snap){cam.x=x;cam.y=y;cam.z=z;}}
function camApply(){cam.x+=(cam.tx-cam.x)*cam.k;cam.y+=(cam.ty-cam.y)*cam.k;cam.z+=(cam.tz-cam.z)*cam.k;R.cam.z=Math.min(3,cam.z*1.75);R.centerOn(cam.x,cam.y);}
const tr=[];
function sp(kind,team,x,y,o){const p=R.walkNear(x,y);const u=R.spawnUnit(kind,team,p.x+rnd(-6,6),p.y+rnd(-6,6),o||{});u.tr=1;tr.push(u.id);return u;}
function rank(u,r){u.rank=r;u.kills=Math.max(u.kills||0,r*3);u.maxhp=Math.round(u.maxhp*(1+.1*r));u.hp=u.maxhp;return u;}
function clearTr(){for(const id of tr){const e=R.byId.get(id);if(e&&!e.dead)R.removeQuiet(e);}tr.length=0;}
function say(u,t,d){if(u&&!u.dead)R.FX.speech.push({id:u.id,txt:t,t:0,dur:d||2.2});}
function cleanFx(){const F=R.FX;for(const k in F)if(Array.isArray(F[k]))F[k].length=0;}
function ff(sec){const S0=S();for(let i=0;i<sec*30;i++){R.update(1/30);S0.ask=null;if(S0.asks)S0.asks.length=0;}}
function centroid(ids){let x=0,y=0,n=0;for(const id of ids){const e=R.byId.get(id);if(e&&!e.dead){x+=e.x;y+=e.y;n++;}}return n?{x:x/n,y:y/n,n}:null;}
function attackMove(ids,x,y){for(const id of ids){const u=R.byId.get(id);if(u&&!u.dead){u.order={type:'move',x:x+rnd(-50,50),y:y+rnd(-40,40),amove:true};u.path=null;u.cmdT=S().t;}}}
function attack(ids,t){for(const id of ids){const u=R.byId.get(id);if(u&&!u.dead&&t&&!t.dead){u.order={type:'attack',id:t.id};u.path=null;u.cmdT=S().t;}}}
function squadsOf(team){return (S().armies&&S().armies[team]?S().armies[team].sq:[]).filter(q=>{const L=R.byId.get(q.lead);return L&&!L.dead;});}
const W={};   // places
const TOWN_ELITE=['tshield','taxe','txbow','tsapper'],TOWN_HERO=['hmoleira','htora','hourela','hmineiro'];
function townKind(T,list){const n=['Moinho','Serraria','Ouroverde','Rochedo'].indexOf(T.name);return list[n<0?T.i%4:n];}

function prep(seed){
  overlay();
  R.ui.seed=seed;R.startGame({mode:'skirmish',diff:'normal',fog:false});
  try{R.SND.on=false;R.MUS.on=false;}catch(e){}
  const s=S();s.rules=Object.assign(s.rules||{},{obras:true,estradas:true,socorro:true,renovar:true,medicos:true,batedor:false,armyAuto:false,quiet:true,gold:400});
  const T1=s.teams[1];
  for(let m=0;m<5;m++){T1.res.gold+=900;T1.res.wood+=900;T1.res.food+=900;ff(50);}
  T1.era=4;s.teams[2].era=4;
  for(const T of s.towns)R.addRep(T,1,4.6);
  // a market for the fair
  const c=R.castleOf(1);W.c1=c;W.c2=R.castleOf(2);
  let mk=R.BLDS.find(b=>!b.dead&&b.team===1&&b.kind==='market');
  if(!mk){
    for(let r=6;r<16&&!mk;r++)for(let a=0;a<16&&!mk;a++){const tx=Math.round(c.tx+2+Math.cos(a/16*6.28)*r),ty=Math.round(c.ty+2+Math.sin(a/16*6.28)*r*.8);
      if(R.canPlace(1,'market',tx,ty)){mk=R.placeBuilding(1,'market',tx,ty,[]);}}
  }
  if(mk){mk.built=true;mk.prog=1;mk.hp=mk.maxhp;}
  W.mk=mk;
  T1.res.gold+=3000;T1.res.wood+=3000;T1.res.food+=3000;
  ff(2);R.econOpenStall(1);R.econOpenStall(1);
  // the scout studies the land: a plan for the war council
  const sc=sp('scout',1,c.x,c.y+90);R.startSweep(1,'defense',sc);
  for(let i=0;i<120&&!(R.intelOf(1).plan.length&&!R.intelOf(1).sweep);i++)ff(1);
  // the field between the kingdoms
  W.mid=R.walkNear((W.c1.x+W.c2.x)/2,(W.c1.y+W.c2.y)/2);
  W.towns=s.towns.slice().sort((a,b)=>(b.lvl||1)-(a.lvl||1));
  s.ai=null;                                         // the red king stops thinking: we direct the war now
  if(s.armies&&s.armies[2])s.armies[2].ord={type:'free'};
  T1.res.gold+=5000;T1.res.wood+=5000;T1.res.food+=5000;
  cleanFx();
  return {plan:R.intelOf(1).plan.length,towns:W.towns.map(t=>t.name+t.lvl),market:!!mk,t:Math.round(s.t)};
}

// ---------------------------------------------------------------- the shots
const X={};   // per-shot state
const SH={
  intro:{
    setup(){clearTr();hud(false);bars(110);
      const red=['warrior','warrior','lancer','archer','warrior','lancer','archer','warrior','lancer','warrior','archer','paladin','warrior','lancer','archer','warrior','catapult','ram','warrior','lancer','archer','warrior'];
      const o={x:W.mid.x+260,y:W.mid.y-80};X.red=[];
      red.forEach((k,i)=>{const u=sp(k,2,o.x+(i%6)*34,o.y+Math.floor(i/6)*30);if(i===0)rank(u,6);else if(i<4)rank(u,4);else if(i<8)rank(u,2);X.red.push(u.id);});
      ff(3.4);cleanFx();
      const go={x:W.mid.x-500,y:W.mid.y+40};for(const id of X.red){const u=R.byId.get(id);if(u){u.order={type:'move',x:go.x+rnd(-80,80),y:go.y+rnd(-60,60)};u.path=null;}}
      const m=centroid(X.red);camTo(m.x,m.y-20,1.2,1,true);},
    tick(u){const m=centroid(X.red);if(m)camTo(m.x-40,m.y-30,1.2+u*.06,.06);
      setText({kick:'',big:'O <em>REINO VERMELHO</em>',sub:'está marchando.'});slam(u,.15,1.8);
      dim(u<1.85?1:Math.max(.12,1-(u-1.85)*3));if(u>1.85&&u<1.9)shake(10);}
  },
  logo:{
    setup(){hud(false);bars(110);},
    tick(u){const m=centroid(X.red);if(m)camTo(m.x-60,m.y-20,1.45,.05);
      dim(.5);flash(u,0,.35);if(u<.05)shake(28);
      setText({kick:'BRAIAN TECH APRESENTA',big:'REINO PEQUENO <i>2.0</i>',sub:'contrate · comande · conquiste'});slam(u,0,3.6);}
  },
  contrate:{
    setup(){clearTr();bars(0);hud(true);
      const T=W.towns[0];X.T=T;const h=R.byId.get(T.id);R.select([h]);R.ui.townTab='ctr';R.ui.actKey='';R.refreshPanel(true);
      X.k=townKind(T,TOWN_ELITE);X.m=[];
      camTo(T.x+120,T.y-10,1.7,1,true);},
    tick(u,f){
      if(f%9===0&&X.m.length<4&&u>.4){const T=X.T,e=sp(X.k,1,T.x,T.y+30);e.order={type:'move',x:T.x+420,y:T.y+60+X.m.length*26};X.m.push(e.id);}
      if(u>1.2&&!X.toast){X.toast=1;R.toast(`Contrato fechado com ${X.T.name}: Mercenários por 10 minutos.`,'good');}
      setText({pos:'top',kick:'VILAS NEUTRAS',big:'CONTRATE <i>MERCENÁRIOS</i>',sub:'por 5, 10 ou 15 minutos · ou até a morte'});slam(u,.1,3.65);flash(u,0,.2,.6);
      camTo(X.T.x+160+u*30,X.T.y,1.7,.05);}
  },
  herois:{
    setup(){clearTr();hud(false);bars(110);R.select([]);
      const p=R.walkNear(W.mid.x-200,W.mid.y+180);X.p=p;
      X.tora=sp('htora',1,p.x,p.y).id;X.our=sp('hourela',1,p.x+220,p.y+30).id;
      X.b=[];for(let i=0;i<14;i++){const a=i/14*6.28,u=sp(i%3?'bandit':'raider',3,p.x+Math.cos(a)*90,p.y+Math.sin(a)*60);u.hp=u.maxhp*.45;X.b.push(u.id);}
      X.b2=[];for(let i=0;i<9;i++){const u=sp(i%2?'raiderA':'raider',3,p.x+380+rnd(-40,40),p.y+rnd(-70,70));X.b2.push(u.id);}
      attack(X.b,R.byId.get(X.tora));attack(X.b2,R.byId.get(X.our));
      const t=R.byId.get(X.tora);camTo(t.x,t.y-20,2.1,1,true);},
    tick(u){const half=u>1.9;const t=R.byId.get(half?X.our:X.tora);if(t&&!t.dead)camTo(t.x+(half?60:0),t.y-20,half?1.9:2.1,half?.2:.15);
      if(u>.1&&u<.15)say(R.byId.get(X.tora),'Pra trás, bandidos!',1.6);
      if(half&&!X.s2){X.s2=1;say(R.byId.get(X.our),'Três flechas de uma vez!',1.6);flashAt=u;}
      if(!half){setText({pos:'low',kick:'HERÓIS DAS VILAS',big:'TORA, <i>O LENHADOR</i>',sub:'cada machadada acerta todos em volta'});slam(u,.05,1.85);}
      else{setText({pos:'low',kick:'HERÓIS DAS VILAS',big:'CAPITÃ <i>OURELA</i>',sub:'três flechas de uma vez'});slam(u,1.9,3.7);}
      flash(u,1.875,.18,.7);if(Math.abs(u-1.875)<.02)shake(14);}
  },
  patente:{
    setup(){clearTr();hud(false);bars(110);
      const c=W.c1,p=R.walkNear(c.x+40,c.y+200);X.p=p;X.army=[];
      const ks=['warrior','warrior','lancer','archer','warrior','paladin','lancer','archer','warrior','archer','lancer','warrior','warrior','archer','lancer','warrior','archer','warrior'];
      const rk=[6,4,4,3,3,2,2,2,1,1,1,1,0,0,0,0,0,0];
      ks.forEach((k,i)=>{const u=sp(k,1,p.x-170+(i%6)*62,p.y-40+Math.floor(i/6)*48);rank(u,rk[i]);u.face=1;X.army.push(u.id);});
      ff(3.3);cleanFx();
      for(const id of X.army){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}
      const A=R.armyOf(1);X.gen=A.gen;camTo(p.x-200,p.y-20,1.75,1,true);},
    tick(u){camTo(X.p.x-120+u*70,X.p.y-10,1.75,.06);
      if(u>.2&&!X.v){X.v=1;const g=R.byId.get(X.gen);const nm=g?R.folkName(g):'Fernão';const ids=X.army.filter(id=>id!==X.gen);
        ['Eu voto no '+nm+'!','Meu voto é do '+nm+'!',nm+'! '+nm+'!','Eu voto no '+nm+'!'].forEach((t,i)=>say(R.byId.get(ids[(i*4+1)%ids.length]),t,1.8));}
      if(u>2.1&&!X.v2){X.v2=1;say(R.byId.get(X.gen),'Obrigado, companheiros! Sigam-me!',1.7);}
      if(u<1.9){setText({pos:'low',kick:'EXÉRCITO COM HIERARQUIA',big:'A PATENTE <i>MANDA.</i>',sub:'o de maior patente vira general'});slam(u,.05,1.85);}
      else{setText({pos:'low',kick:'EXÉRCITO COM HIERARQUIA',big:'A TROPA <i>VOTA.</i>',sub:'chefes, subchefes e grupos'});slam(u,1.9,3.7);}
      flash(u,1.875,.15,.5);}
  },
  escudos:{
    setup(){hud(false);bars(110);
      const m=centroid(X.army);X.r=[];
      for(let i=0;i<10;i++){const u=sp(i<7?'archer':'royal',2,m.x+320+rnd(-30,30),m.y+rnd(-110,110));X.r.push(u.id);}
      const tg=R.byId.get(X.army[3]);attack(X.r,tg);
      for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&(L.rank||0)<4)rank(L,4);}
      camTo(m.x+60,m.y-20,1.65,1,true);},
    tick(u){const m=centroid(X.army);if(m)camTo(m.x+90,m.y-20,1.75,.08);
      if(u>.55&&!X.e){X.e=1;for(const q of squadsOf(1))R.sqCommand(q,'escudos',true);shake(16);}
      setText({big:'PAREDE DE <i>ESCUDOS!</i>',sub:'flechas e torres: −40%'});slam(u,.5,2.75);flash(u,.5,.18,.6);}
  },
  avante:{
    setup(){hud(false);bars(110);
      const r=centroid(X.r);X.goal=r;
      for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&(L.rank||0)<5)rank(L,5);R.sqCommand(q,'avante',true);}
      attackMove(X.army,r.x,r.y);shake(20);},
    tick(u){const m=centroid(X.army);if(m)camTo(m.x+140,m.y-20,1.55,.1);
      setText({big:'<em>AVANTE!</em>',sub:'+35% de velocidade'});slam(u,0,2.75);flash(u,0,.2,.8);}
  },
  espione:{
    setup(){clearTr();hud(false);bars(110);cleanFx();
      const s=S();s.cfg.fog=true;s.seen=null;
      const c=W.c1;const sc=sp('scout',1,c.x+60,c.y+120);X.sc=sc.id;
      const far=R.walkNear(W.mid.x+(W.c2.x-W.mid.x)*.4,W.mid.y+(W.c2.y-W.mid.y)*.4);sc.order={type:'move',x:far.x,y:far.y};sc.path=null;sc.cmdT=s.t;
      R.ui.speed=2;camTo(sc.x,sc.y,1.0,1,true);},
    tick(u){const sc=R.byId.get(X.sc);if(sc&&!sc.dead)camTo(sc.x,sc.y-10,1.0,.12);
      setText({pos:'low',kick:'NÉVOA DE GUERRA',big:'<i>ESPIONE.</i>',sub:'o batedor revela o mapa'});slam(u,.05,3.7);flash(u,0,.15,.5);}
  },
  planeje:{
    setup(){clearTr();R.ui.speed=1;const s=S();s.cfg.fog=false;hud(false);bars(110);R.ui.showPlan=true;
      const P=R.intelOf(1).plan.filter(p=>p.st==='new');const m=P.length?{x:P.reduce((a,p)=>a+p.x,0)/P.length,y:P.reduce((a,p)=>a+p.y,0)/P.length}:W.c1;
      X.pm=m;camTo(m.x,m.y,.95,1,true);},
    tick(u){
      if(u<1.875){camTo(X.pm.x+u*30,X.pm.y,.95,.05);hud(false);bars(110);}
      else{if(!X.open){X.open=1;R.openCouncil('army');hud(false,['council']);bars(0);}}
      setText({pos:'low',kick:'CONSELHO DE GUERRA',big:'<i>PLANEJE.</i>',sub:u<1.875?'muralhas, torres no morro, fossos, emboscadas':'você autoriza cada obra'});
      if(u<1.875)slam(u,.05,1.85);else slam(u,1.9,3.7);
      flash(u,1.875,.15,.5);}
  },
  conquiste:{
    setup(){document.getElementById('ov-council').hidden=true;R.ui.showPlan=false;clearTr();hud(false,['toasts']);bars(110);
      const T=W.towns.find(t=>t!==W.towns[0])||W.towns[0];X.T=T;X.a=[];
      for(let i=0;i<16;i++){const u=sp(['warrior','lancer','archer','paladin'][i%4],1,T.x-260+rnd(-40,40),T.y+120+rnd(-60,60));rank(u,i<2?4:1);X.a.push(u.id);}
      R.startConquest(1,T.i);attackMove(X.a,T.x,T.y+40);ff(5);cleanFx();
      camTo(T.x-20,T.y+10,1.45,1,true);R.ui.speed=2;},
    tick(u){camTo(X.T.x-10,X.T.y+10,1.45+u*.05,.05);
      if(u>2.4&&!X.T.owner){R.conquer(X.T,1);shake(18);}
      if(X.T.owner&&!X.fl){X.fl=u;}
      setText({pos:'low',kick:'CONQUISTA',big:'<em>CONQUISTE.</em>',sub:X.T.owner?`${X.T.name} agora é sua vassala`:'vilas podem ser tomadas à força'});slam(u,.05,3.7);
      flash(u,0,.2,.7);if(X.fl)flash(u,X.fl,.2,.6);}
  },
  governe:{
    setup(){clearTr();R.ui.speed=1;hud(false);bars(110);cleanFx();
      const mk=W.mk||W.c1;const r={x:mk.x,y:mk.y};X.mk=r;
      for(const u of S().ents)if(!u.dead&&u.trader&&u.team===1){const p=R.walkNear(r.x-40+(u.trader.slot%3)*30,r.y+40);u.x=p.x;u.y=p.y;u.trader.fame=3+u.trader.slot;}
      camTo(r.x,r.y+10,2.0,1,true);},
    tick(u,f){camTo(X.mk.x+u*20,X.mk.y+10,2.0,.05);
      if(f%10===0)for(const t of S().ents)if(!t.dead&&t.trader&&t.team===1&&!t.moving){R.FX.floats.push({x:t.x+rnd(-6,6),y:t.y-50,txt:'+'+Math.round(rnd(9,24))+' ouro',col:'#ffe066',t:0});t.trader.saleT=S().t;}
      if(u>1.9&&!X.fe){X.fe=1;const c=X.mk;for(let i=0;i<8;i++)R.FX.sparks.push({x:c.x+rnd(-140,140),y:c.y-rnd(20,90),t:-i*.12,team:1});shake(6);}
      setText({pos:'low',kick:'ECONOMIA INTERNA',big:'<i>GOVERNE.</i>',sub:'impostos · humor do povo · feira · soldo'});slam(u,.05,3.7);flash(u,0,.15,.5);}
  },
  inimigo:{
    setup(){clearTr();hud(false);bars(110);cleanFx();
      const c=W.c2;let eng=S().ents.find(e=>!e.dead&&e.kind==='engineer'&&e.team===2);
      if(!eng){eng=sp('engineer',2,c.x-120,c.y+110);eng.title='Mestre Rubro';eng.civil=true;}
      X.eng=eng.id;X.red=[];
      const p=R.walkNear(c.x-60,c.y+170);
      ['warrior','lancer','archer','warrior','lancer','archer','warrior','paladin','archer','warrior','lancer','warrior'].forEach((k,i)=>{const u=sp(k,2,p.x-150+(i%6)*55,p.y+Math.floor(i/6)*46);rank(u,[6,4,3,2,2,1,1,1,0,0,0,0][i]);X.red.push(u.id);});
      ff(3.3);cleanFx();for(const id of X.red){const u=R.byId.get(id);if(u){u.order=null;}}
      const e=R.byId.get(X.eng);camTo(e.x,e.y-20,2.0,1,true);},
    tick(u){
      if(u<1.875){const e=R.byId.get(X.eng);if(e)camTo(e.x,e.y-20,2.0,.1);if(!X.s){X.s=1;say(e,'O general quer uma torre no morro. Já vou!',1.8);}}
      else{const m=centroid(X.red);if(m)camTo(m.x,m.y-20,1.6,.1);if(!X.s2){X.s2=1;const A=S().armies[2];const g=A&&R.byId.get(A.gen);say(g,'Grupo dois, pelo flanco!',1.6);}}
      setText({pos:'low',kick:'O REINO VERMELHO',big:'TAMBÉM <em>PENSA.</em>',sub:u<1.875?'Mestre Rubro, o engenheiro inimigo':'generais, flancos, contratos e cercos'});
      if(u<1.875)slam(u,.05,1.85);else slam(u,1.9,3.7);flash(u,1.875,.15,.6);}
  },
  montage:{
    setup(){clearTr();hud(false);bars(110);cleanFx();X.cut=-1;},
    tick(u){
      const cut=Math.min(7,Math.floor(u/(BEAT*2)));const cu=u-cut*BEAT*2;
      if(cut!==X.cut){X.cut=cut;cutSetup(cut);shake(cut===7?30:16);}
      const t=X.focus&&R.byId.get(X.focus);if(t&&!t.dead)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.2);
      const words=['<em>FOGO!</em>','GRITO DE <i>GUERRA!</i>','<i>CATAPULTAS!</i>','<em>ARÍETE!</em>','<i>HERÓIS!</i>','<i>FLECHAS!</i>','O CASTELO <em>QUEIMA!</em>',''];
      setText({big:words[cut]});slam(cu,.03,BEAT*2-.04);flash(cu,0,.16,cut===7?1:.75);
      if(cut===7){for(const id of X.boomT||[]){}if(cu<.05)for(let i=0;i<10;i++)R.FX.booms.push({x:X.bx+rnd(-160,160),y:X.by+rnd(-100,100),t:-i*.06,s:1.6,k:i%2?'explosion':'explosion2'});}}
  },
  fim:{
    setup(){clearTr();hud(false);bars(110);cleanFx();R.ui.speed=1;camTo(W.c1.x-200,W.c1.y,.78,1,true);},
    tick(u){camTo(W.c1.x-200+u*40,W.c1.y+20,.78-u*.012,.03);dim(Math.min(.62,u*1.2));
      const b=u/BEAT;
      if(b<6){setText({kick:'',big:'REINO PEQUENO <i>2.0</i>',sub:'Jogue grátis no navegador',sub2:'Windows · Mac · Linux · Android · iPhone'});slam(u,.1,6*BEAT-.05);}
      else if(b<11){setText({kick:'JOGUE AGORA',big:'<span class="url">braiantech-br.github.io</span>',sub:'/Reino-Pequeno',sub2:'e baixe para jogar sem internet'});slam(u,6*BEAT,11*BEAT-.05);}
      else{setText({kick:'UMA PRODUÇÃO',big:'<i>BRAIAN TECH</i>',sub:'www.braiantech.com.br',sub2:'Arte: Tiny Swords, de Pixel Frog'});slam(u,11*BEAT,16*BEAT);}
      flash(u,0,.3,.9);if(b>15)dim(Math.min(1,.62+(b-15)*.5));if(b>15.2)overlay().tx.style.opacity=Math.max(0,1-(b-15.2)*1.5);}
  },
};
function cutSetup(cut){
  clearTr();X.fx=0;
  const c2=W.c2,mid=W.mid;
  if(cut===0){const p=R.walkNear(mid.x+120,mid.y);const reds=[];for(let i=0;i<14;i++)reds.push(sp(i%2?'warrior':'lancer',2,p.x+rnd(-80,80),p.y+rnd(-50,50)).id);
    const mo=sp('monk',1,p.x-260,p.y);const hits=[];for(let k=0;k<9;k++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*85;hits.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.75,at:.1+k*.12,done:false});}
    S().spells=S().spells||[];S().spells.push({type:'meteor',team:1,src:mo.id,x:p.x,y:p.y,t:0,hits});X.focus=reds[0];X.z=1.55;X.fx=0;}
  else if(cut===1){const p=R.walkNear(mid.x-150,mid.y+120);const a=[];for(let i=0;i<10;i++){const u=sp(['warrior','lancer','paladin','archer'][i%4],1,p.x+(i%5)*40-80,p.y+Math.floor(i/5)*40);if(i===0)rank(u,7);u.hp=u.maxhp*.5;a.push(u.id);}
    ff(3.2);cleanFx();for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&a.includes(L.id)){rank(L,7);R.sqCommand(q,'grito',true);}}
    X.focus=a[0];X.z=1.9;}
  else if(cut===2){const tg=R.BLDS.filter(b=>!b.dead&&b.team===2&&b.kind!=='castle').sort((x,y)=>Math.hypot(x.x-c2.x,x.y-c2.y)-Math.hypot(y.x-c2.x,y.y-c2.y))[0]||c2;
    const p=R.walkNear(tg.x-230,tg.y+60);const cs=[];for(let i=0;i<3;i++)cs.push(sp('catapult',1,p.x,p.y+i*50-50).id);attack(cs,tg);ff(1.2);X.focus=cs[1];X.fx=110;X.z=1.35;}
  else if(cut===3){const p=R.walkNear(c2.x-140,c2.y+90);const r=sp('ram',1,p.x,p.y);attack([r.id],c2);const g=[];for(let i=0;i<5;i++)g.push(sp('warrior',1,p.x-40+rnd(-30,30),p.y+rnd(-30,30)).id);attack(g,c2);ff(1.5);X.focus=r.id;X.z=1.8;}
  else if(cut===4){const p=R.walkNear(mid.x,mid.y+220);const t=sp('htora',1,p.x,p.y);const rs=[];for(let i=0;i<12;i++){const a=i/12*6.28,u=sp(i%2?'warrior':'lancer',2,p.x+Math.cos(a)*80,p.y+Math.sin(a)*55);u.hp=u.maxhp*.35;rs.push(u.id);}attack(rs,t);ff(.6);X.focus=t.id;X.z=2.1;}
  else if(cut===5){const p=R.walkNear(mid.x+60,mid.y-160);const o=sp('hourela',1,p.x,p.y);const a2=[];for(let i=0;i<5;i++)a2.push(sp('royal',1,p.x+rnd(-50,0),p.y+rnd(-60,60)).id);const rs=[];for(let i=0;i<10;i++)rs.push(sp(i%2?'warrior':'lancer',2,p.x+260+rnd(-40,40),p.y+rnd(-80,80)).id);attack(rs,o);ff(.8);X.focus=o.id;X.fx=120;X.z=1.75;}
  else if(cut===6){c2.hp=Math.min(c2.hp,c2.maxhp*.22);const p=R.walkNear(c2.x-120,c2.y+120);const g=[];for(let i=0;i<12;i++)g.push(sp(['warrior','lancer','paladin','archer'][i%4],1,p.x+rnd(-90,90),p.y+rnd(-60,60)).id);attack(g,c2);ff(.6);X.focus=null;camTo(c2.x,c2.y-40,1.3,1,true);}
  else if(cut===7){X.focus=null;X.bx=c2.x;X.by=c2.y-20;camTo(c2.x,c2.y-30,1.6,.3);}
  const t=X.focus&&R.byId.get(X.focus);if(t)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.2,true);
}

let cur=-1;
function frame(f){
  const t=f/FPS,b=t/BEAT;let i=SHOTS.length-1;for(let k=0;k<SHOTS.length;k++){if(b<START[k]+SHOTS[k][1]){i=k;break;}}
  const id=SHOTS[i][0],u=t-START[i]*BEAT;
  if(i!==cur){cur=i;for(const k in X)delete X[k];if(['escudos','avante'].includes(id))0;SH[id].setup();}
  SH[id].tick(u,f);
  const s=S();s.ask=null;if(s.asks)s.asks.length=0;
  camApply();applyShake();
  window.__clock.step(1000/FPS);
  return id;
}
// the army state passes from one shot to the next (escudos -> avante), so keep those across shots
const keep={};
const _setup=SH.escudos.setup;SH.escudos.setup=function(){X.army=keep.army;_setup();keep.r=X.r;};
const _setup2=SH.avante.setup;SH.avante.setup=function(){X.army=keep.army;X.r=keep.r;_setup2();};
const _setupP=SH.patente.setup;SH.patente.setup=function(){_setupP();keep.army=X.army;};
const _setupI=SH.intro.setup;SH.intro.setup=function(){_setupI();keep.red=X.red;};
SH.logo.setup=(f=>function(){X.red=keep.red;f();})(SH.logo.setup);
let flashAt=0;
window.TR={prep,frame,TOTAL,FPS,BEAT,SHOTS,START};
})();
