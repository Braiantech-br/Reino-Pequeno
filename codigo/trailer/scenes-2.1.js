// Trailer 2.1 director ("o Claude comanda o Reino Vermelho"): builds the world, then for each video frame sets the
// camera, the action and the titles, and steps the game's clock by one frame. The recorder screenshots every TR.frame(f).
(()=>{
const R=window.__reino,FPS=30,BPM=128,BEAT=60/BPM;
const SHOTS=[['intro',8],['logo',8],['relatorio',8],['decide',8],['ataca',8],['flanco',6],['recua',6],['cerco',8],
  ['provoca',8],['voce',8],['montage',16],['fim',16]];
const START=[];let acc=0;for(const [,b] of SHOTS){START.push(acc);acc+=b;}
const TOTAL=Math.round(acc*BEAT*FPS);
const S=()=>R.S;
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3);
const clamp=(x,a,b)=>x<a?a:x>b?b:x;

// ---------------------------------------------------------------- titles and cards overlay
const css=`#trv{position:fixed;inset:0;pointer-events:none;z-index:1000;overflow:hidden}
#trv .bar{position:absolute;left:0;right:0;height:0;background:#000;z-index:3}#trv .bt{top:0}#trv .bb{bottom:0}
#trv .dim{position:absolute;inset:0;background:#05070c;opacity:0}
#trv .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 50%,rgba(0,0,0,.6) 100%)}
#trv .redv{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(120,0,0,0) 45%,rgba(150,10,0,.55) 100%);opacity:0}
#trv .tx{position:absolute;left:0;right:0;text-align:center;z-index:2}
#trv .tx.p-center{top:50%;transform:translateY(-50%)}
#trv .tx.p-top{top:150px}
#trv .tx.p-low{left:110px;right:auto;bottom:150px;text-align:left}
#trv .kick{font:700 34px "Pixelify Sans",sans-serif;letter-spacing:10px;color:#ffd23a;text-shadow:0 4px 0 #000,0 0 18px rgba(0,0,0,.8);margin-bottom:6px}
#trv .big{position:relative;font:400 168px/0.86 "Jersey 10",monospace;color:#fff;letter-spacing:3px;-webkit-text-stroke:4px #140b18;paint-order:stroke fill;text-shadow:0 8px 0 #140b18,0 0 40px rgba(0,0,0,.7);white-space:nowrap}
#trv .tx.p-low .big{font-size:132px}
#trv .big i{font-style:normal;color:#ffd23a}#trv .big em{font-style:normal;color:#ff4a36}
#trv .sub{font:700 38px "Pixelify Sans",sans-serif;color:#fff;text-shadow:0 4px 0 #000,0 0 16px rgba(0,0,0,.9);margin-top:16px;letter-spacing:1px}
#trv .sub2{font:600 30px "Pixelify Sans",sans-serif;color:#ffe9a8;text-shadow:0 3px 0 #000;margin-top:10px}
#trv .flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:4}
#trv .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 2px,transparent 2px 4px);opacity:.22;z-index:1}
#trv .url{font-size:96px}
#trv .term{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);display:flex;justify-content:center;z-index:2;opacity:0}
#trv .term pre{font:500 42px/1.5 "DejaVu Sans Mono",monospace;color:#d8f5d0;text-shadow:0 0 14px rgba(120,255,140,.35);margin:0;width:1000px;white-space:pre}
#trv .term .k-g{color:#7dff9a}#trv .term .k-c{color:#8fd8ff}#trv .term .k-r{color:#ff6a55;text-shadow:0 0 16px rgba(255,80,60,.6)}#trv .term .k-y{color:#ffd23a}#trv .term .k-m{color:#8a9a8a}
#trv .term .cur{display:inline-block;width:.6em;height:1em;background:#7dff9a;vertical-align:-.12em;margin-left:2px}
#trv .think{position:absolute;right:90px;top:50%;width:680px;transform:translateY(-50%);z-index:2;background:rgba(16,9,14,.92);border:3px solid #ff4a36;border-radius:16px;box-shadow:0 0 0 4px rgba(0,0,0,.55),0 0 46px rgba(255,74,54,.45),0 18px 50px rgba(0,0,0,.6);padding:22px 28px 26px;opacity:0;color:#fff}
#trv .th-h{display:flex;align-items:center;gap:14px;border-bottom:2px solid rgba(255,74,54,.35);padding-bottom:14px;margin-bottom:16px}
#trv .th-h .dot{width:18px;height:18px;border-radius:50%;background:#ff4a36;box-shadow:0 0 16px #ff4a36;flex:none}
#trv .th-h b{font:400 58px/0.8 "Jersey 10",monospace;letter-spacing:3px;color:#fff}
#trv .th-who{font:600 21px/1.15 "Pixelify Sans",sans-serif;color:#ffb3a8;flex:1}
#trv .th-st{font:700 22px "Pixelify Sans",sans-serif;color:#ffd23a;letter-spacing:1px;white-space:nowrap}
#trv .th-st.ok{color:#7dff9a}
#trv .th-t{font:600 31px/1.32 "Pixelify Sans",sans-serif;margin:0;min-height:164px}
#trv .th-t .cur{display:inline-block;width:14px;height:30px;background:#ff4a36;vertical-align:-4px;margin-left:3px}
#trv .th-o{list-style:none;margin:10px 0 0;padding:0}
#trv .th-o li{font:700 30px/1.55 "Pixelify Sans",sans-serif;color:#ffd23a;opacity:0}
#trv .th-o li b{color:#fff}
#trv .say{position:absolute;left:50%;bottom:150px;transform:translateX(-50%);display:flex;gap:24px;align-items:center;background:rgba(16,9,14,.93);border:3px solid #ff4a36;border-radius:18px;padding:18px 34px 18px 18px;z-index:2;opacity:0;width:1240px;box-shadow:0 0 0 4px rgba(0,0,0,.5),0 0 46px rgba(255,74,54,.45)}
#trv .say img{width:132px;height:132px;image-rendering:pixelated;background:#4a1d1a;border-radius:12px;border:3px solid #ff4a36;flex:none}
#trv .say b{font:700 26px "Pixelify Sans",sans-serif;color:#ffb3a8;display:block;margin-bottom:6px}
#trv .say p{font:700 46px/1.18 "Pixelify Sans",sans-serif;color:#fff;margin:0}
#trv .pick{position:absolute;left:50%;top:60%;transform:translate(-50%,-50%);z-index:2;opacity:0;zoom:2.1;max-width:none;width:420px;margin:0}
#trv .pick h4{margin:0!important;font:700 22px "Pixelify Sans",sans-serif;color:var(--ink)}
#trv .pick .seg span{min-width:150px}
#trv .pick .pm{transition:none}
#trv .pick .cur{position:absolute;left:0;top:0;width:30px;height:30px;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
#ov-council{justify-content:flex-end;padding-right:90px!important;background:rgba(18,40,48,.35)!important}#ov-council .sheet{zoom:1.32;margin:auto 0!important}
@media (orientation:portrait){#trv .big{font-size:112px;white-space:normal;line-height:.92}#trv .tx.p-low{left:56px;right:56px;bottom:250px}#trv .tx.p-low .big{font-size:104px}#trv .kick{font-size:26px;letter-spacing:6px}#trv .sub{font-size:30px}#trv .sub2{font-size:24px}#trv .tx.p-top{top:230px}#trv .tx.p-center{padding:0 40px}#trv .url{font-size:62px}
  #trv .term pre{font-size:25px;width:600px}#trv .think{left:40px;right:40px;width:auto;top:250px;transform:none}#trv .say{left:40px;right:40px;width:auto;transform:none;bottom:300px}#trv .say p{font-size:38px}#trv .say img{width:110px;height:110px}#trv .pick{zoom:2.2;width:440px;top:55%}}
#ask,#talk,#report,#goals,#banner,#sndpop,#ov-start,#ov-story,#ov-end,#ov-upd,#ov-confirm{display:none!important}`;
let V=null;
const CURSOR='<svg class="cur" viewBox="0 0 24 24"><path d="M4 2l16 10.5-7 1.6-3.3 6.9z" fill="#fff" stroke="#140b18" stroke-width="2.2" stroke-linejoin="round"/></svg>';
function overlay(){
  if(V)return V;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const d=document.createElement('div');d.id='trv';
  d.innerHTML='<div class="dim"></div><div class="redv"></div><div class="vig"></div><div class="scan"></div>'+
    '<div class="term"><pre></pre></div>'+
    '<div class="think"><div class="th-h"><i class="dot"></i><b>CLAUDE</b><span class="th-who">comanda o<br>Reino Vermelho</span><span class="th-st"></span></div><p class="th-t"></p><ul class="th-o"></ul></div>'+
    '<div class="say"><img alt="" src="assets/av06.png"><div><b>Mestre Rubro (Claude)</b><p></p></div></div>'+
    '<div class="pick sheet"><h4>Quem comanda o Reino Vermelho</h4><div class="seg"><label><input type="radio" name="trfoe" value="pc" checked><span class="o1">Computador<em>A IA do jogo</em></span></label><label><input type="radio" name="trfoe" value="claude"><span class="o2">Claude<em>Estratégia de verdade</em></span></label></div>'+
    '<div class="seg pm"><label><input type="radio" name="trclm" checked><span>Esperto<em>Pensa mais, joga melhor</em></span></label><label><input type="radio" name="trclm"><span>Rápido<em>Responde na hora, gasta menos</em></span></label></div>'+CURSOR+'</div>'+
    '<div class="tx p-center"><div class="kick"></div><div class="big"><span class="m"></span></div><div class="sub"></div><div class="sub2"></div></div><div class="bar bt"></div><div class="bar bb"></div><div class="flash"></div>';
  document.body.appendChild(d);
  const q=s=>d.querySelector(s);
  V={d,dim:q('.dim'),redv:q('.redv'),tx:q('.tx'),kick:q('.kick'),big:q('.big'),m:q('.m'),sub:q('.sub'),sub2:q('.sub2'),bt:q('.bt'),bb:q('.bb'),flash:q('.flash'),
    term:q('.term'),pre:q('.term pre'),think:q('.think'),thSt:q('.th-st'),thT:q('.th-t'),thO:q('.th-o'),say:q('.say'),sayP:q('.say p'),
    pick:q('.pick'),pm:q('.pick .pm'),cur:q('.pick .cur'),last:{}};
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
function redv(x){overlay().redv.style.opacity=x;}
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
// the seal on the top bar, as the game shows it while Claude commands the Red Kingdom
function chip(st){
  const ch=document.getElementById('c-claude');if(!ch)return;
  ch.hidden=!st;if(!st)return;ch.dataset.st=st;
  document.getElementById('cl-chip').textContent=st==='busy'?'Claude pensando…':'Claude no comando';
}
// cards: everything off unless a shot turns it on this frame
function cardsOff(){const v=overlay();v.term.style.opacity=0;v.think.style.opacity=0;v.say.style.opacity=0;v.pick.style.opacity=0;}
function typed(text,u,t0,cps){const n=Math.max(0,Math.floor((u-t0)*cps));return {s:text.slice(0,n),done:n>=text.length};}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

// the intro terminal: the war report going to Claude
const TERM=[
  [['> ','k-g'],['conectando ao Claude ','k-g'],['.......... ','k-m'],['ok','k-g']],
  [['> ','k-g'],['relatório da guerra · minuto 12','']],
  [['    azul.exército  ','k-m'],['≈ 25','k-c'],['   arqueiros 60%','k-c']],
  [['    azul.fazendas  ','k-m'],['6','k-c'],['      sem guarda','k-y']],
  [['    azul.castelo   ','k-m'],['78%','k-c']],
  [['> ','k-g'],['pensando ...','k-g']],
  [['> ','k-r'],['ORDEM: SAQUEAR · alvo: fazendas','k-r']],
];
function termRender(u){
  const v=overlay();const T0=[.05,.42,.78,1.02,1.26,1.5,2.05],CPS=70;let html='',curOn=false;
  TERM.forEach((segs,i)=>{
    if(u<T0[i])return;
    let left=Math.floor((u-T0[i])*CPS),line='';const full=segs.reduce((a,s)=>a+s[0].length,0);
    for(const [t,c] of segs){if(left<=0)break;const p=t.slice(0,left);left-=t.length;line+=c?`<span class="${c}">${esc(p)}</span>`:esc(p);}
    const typing=Math.floor((u-T0[i])*CPS)<full,next=T0[i+1];
    if(typing||next==null||u<next){line+='<span class="cur"></span>';curOn=true;}
    html+=line+'\n';
  });
  if(html!==v.last.term){v.last.term=html;v.pre.innerHTML=html;}
  if(curOn){const c=v.pre.querySelector('.cur');if(c)c.style.opacity=Math.floor(u*5)%2?.25:1;}
}
// the thinking card
function think(o){
  const v=overlay();
  v.think.style.opacity=o.op==null?1:o.op;
  const st=o.st||'';if(v.last.thSt!==st){v.last.thSt=st;v.thSt.textContent=st;v.thSt.className='th-st'+(o.ok?' ok':'');}
  const t=esc(o.text||'')+(o.cursor?'<span class="cur"></span>':'');if(v.last.thT!==t){v.last.thT=t;v.thT.innerHTML=t;}
  const L=(o.orders||[]).map(x=>`<li>▸ ${x}</li>`).join('');if(v.last.thO!==L){v.last.thO=L;v.thO.innerHTML=L;}
  const lis=v.thO.children;for(let i=0;i<lis.length;i++){const a=(o.oa||[])[i]||0;lis[i].style.opacity=clamp(a*6,0,1);lis[i].style.transform=`translateX(${(1-ease(a*5))*-24}px)`;}
  const c=v.thT.querySelector('.cur');if(c)c.style.opacity=Math.floor((o.u||0)*5)%2?.2:1;
  v.think.querySelector('.dot').style.opacity=o.ok?1:.45+.55*Math.abs(Math.sin((o.u||0)*7));
}
function sayCard(text,a,b,u){
  const v=overlay();if(u<a||u>b){return;}
  const k=u-a,e=b-u;v.say.style.opacity=Math.min(1,k*8,e*8);
  const tp=typed(text,u,a+.05,48);
  if(v.last.say!==tp.s){v.last.say=tp.s;v.sayP.textContent=tp.s;}
  const port=innerHeight>innerWidth;v.say.style.transform=(port?'':'translateX(-50%) ')+`translateY(${(1-ease(k*5))*40}px)`;
}

// ---------------------------------------------------------------- the world
const cam={x:0,y:0,z:1.4,tx:0,ty:0,tz:1.4,k:.12};
function camTo(x,y,z,k,snap){cam.tx=x;cam.ty=y;cam.tz=z;cam.k=k||.12;if(snap){cam.x=x;cam.y=y;cam.z=z;}}
function camApply(){cam.x+=(cam.tx-cam.x)*cam.k;cam.y+=(cam.ty-cam.y)*cam.k;cam.z+=(cam.tz-cam.z)*cam.k;R.cam.z=Math.min(3,cam.z*1.75);R.centerOn(cam.x,cam.y);}
const tr=[];
function sp(kind,team,x,y,o){const p=R.walkNear(x,y);const u=R.spawnUnit(kind,team,p.x+rnd(-6,6),p.y+rnd(-6,6),o||{});u.tr=1;tr.push(u.id);return u;}
function rank(u,r){u.rank=r;u.kills=Math.max(u.kills||0,r*3);u.maxhp=Math.round(u.maxhp*(1+.1*r));u.hp=u.maxhp;return u;}
function clearTr(){for(const id of tr){const e=R.byId.get(id);if(e&&!e.dead)R.removeQuiet(e);}tr.length=0;}
let NAT=false,SPA=[];
function speechHook(){const F=R.FX;SPA=F.speech||[];Object.defineProperty(F,'speech',{configurable:true,enumerable:true,get(){return NAT?SPA:SPA.filter(x=>x.tr);},set(v){SPA=v||[];}});}
function say(u,t,d){if(u&&!u.dead)SPA.push({id:u.id,txt:t,t:0,dur:d||2.2,tr:1});}
function cleanFx(){const F=R.FX;for(const k in F)if(Array.isArray(F[k]))F[k].length=0;SPA.length=0;}
function ff(sec){const S0=S();for(let i=0;i<sec*30;i++){R.update(1/30);S0.ask=null;if(S0.asks)S0.asks.length=0;}}
function centroid(ids){let x=0,y=0,n=0;for(const id of ids){const e=R.byId.get(id);if(e&&!e.dead){x+=e.x;y+=e.y;n++;}}return n?{x:x/n,y:y/n,n}:null;}
function moveTo(ids,x,y,spread,amove){for(const id of ids){const u=R.byId.get(id);if(u&&!u.dead){u.order={type:'move',x:x+rnd(-spread,spread),y:y+rnd(-spread*.8,spread*.8),amove:!!amove};u.path=null;u.cmdT=S().t;}}}
function attackMove(ids,x,y){moveTo(ids,x,y,50,true);}
function attack(ids,t){for(const id of ids){const u=R.byId.get(id);if(u&&!u.dead&&t&&!t.dead){u.order={type:'attack',id:t.id};u.path=null;u.cmdT=S().t;}}}
function squadsOf(team){return (S().armies&&S().armies[team]?S().armies[team].sq:[]).filter(q=>{const L=R.byId.get(q.lead);return L&&!L.dead;});}
function genOf(team,ids){const A=S().armies&&S().armies[team];const g=A&&R.byId.get(A.gen);if(g&&!g.dead&&(!ids||ids.includes(g.id)))return g;
  let best=null;for(const id of ids||[]){const u=R.byId.get(id);if(u&&!u.dead&&(!best||(u.rank||0)>(best.rank||0)))best=u;}return best;}
const W={};   // places

function redEngineer(){
  const s=S(),c=W.c2;let e=R.byId.get(s.redEngId);
  if(!e||e.dead)e=s.ents.find(x=>!x.dead&&x.kind==='engineer'&&x.team===2);
  if(!e||e.dead){e=sp('engineer',2,c.x-120,c.y+110);e.title='Mestre Rubro';e.civil=true;}
  return e;
}
function ensureFarms(){
  const c=W.c1,c2=W.c2;let F=R.BLDS.filter(b=>!b.dead&&b.team===1&&b.kind==='farm');
  const dir=Math.atan2(c2.y-c.y,c2.x-c.x);
  for(let r=5;r<15&&F.length<4;r++)for(let k=-3;k<=3&&F.length<4;k++){
    const a=dir+k*.28,tx=Math.round(c.tx+1+Math.cos(a)*r),ty=Math.round(c.ty+1+Math.sin(a)*r*.8);
    if(R.canPlace(1,'farm',tx,ty)){const b=R.placeBuilding(1,'farm',tx,ty,[]);if(b){b.built=true;b.prog=1;b.hp=b.maxhp;F.push(b);}}
  }
  return F;
}
// the most open patch of grass between the kingdoms (few trees and no water), away from towns and castles
function openSpots(){
  const s=S(),T=s.tiles,len=T.length,MW=len===136*92?136:Math.round(Math.sqrt(len*136/92)),MH=Math.round(len/MW),out=[];
  const c1=W.c1,c2=W.c2,dx=c2.x-c1.x,dy=c2.y-c1.y,dl=Math.hypot(dx,dy),nx=-dy/dl,ny=dx/dl;
  for(let t=.22;t<=.78;t+=.04)for(let o=-700;o<=700;o+=100){
    const cx=c1.x+dx*t+nx*o,cy=c1.y+dy*t+ny*o,tx=Math.floor(cx/32),ty=Math.floor(cy/32),E=s.elev,e0=E?E[ty*MW+tx]:0;let bad=0;
    for(let y=-9;y<=9;y++)for(let x=-11;x<=11;x++){const X=tx+x,Y=ty+y;if(X<0||Y<0||X>=MW||Y>=MH){bad++;continue;}const v=T[Y*MW+X];if(v===0||v===3||v===6)bad++;}
    for(const tw of s.towns)if(Math.hypot(tw.x-cx,tw.y-cy)<420)bad+=200;
    if(Math.hypot(c1.x-cx,c1.y-cy)<480||Math.hypot(c2.x-cx,c2.y-cy)<480)bad+=200;
    for(const b of R.BLDS)if(!b.dead&&Math.hypot(b.x-cx,b.y-cy)<260)bad+=30;
    out.push({x:cx,y:cy,bad});
  }
  out.sort((a,b)=>a.bad-b.bad);
  const pick=[out[0]];for(const c of out)if(pick.length<2&&Math.hypot(c.x-pick[0].x,c.y-pick[0].y)>500)pick.push(c);
  return pick.map(c=>Object.assign(R.walkNear(c.x,c.y),{bad:c.bad}));
}
function prep(seed){
  overlay();
  R.ui.seed=seed;R.startGame({mode:'skirmish',diff:'normal',fog:false,claude:false});
  try{R.SND.on=false;R.MUS.on=false;}catch(e){}
  speechHook();
  const s=S();s.rules=Object.assign(s.rules||{},{obras:true,estradas:true,socorro:true,renovar:true,medicos:true,batedor:false,armyAuto:false,quiet:true,gold:400});
  const T1=s.teams[1];
  for(let m=0;m<5;m++){T1.res.gold+=900;T1.res.wood+=900;T1.res.food+=900;ff(50);}
  T1.era=4;s.teams[2].era=4;
  for(const T of s.towns)R.addRep(T,1,4.6);
  W.c1=R.castleOf(1);W.c2=R.castleOf(2);
  W.farms=ensureFarms();
  // a farmer on every farm
  for(const b of W.farms){const p=sp('pawn',1,b.x,b.y+20);p.tr=0;tr.pop();b.worker=p.id;p.order={type:'gather',res:'food',id:b.id,phase:'go'};}
  W.mid=R.walkNear((W.c1.x+W.c2.x)/2,(W.c1.y+W.c2.y)/2);
  W.towns=s.towns.slice().sort((a,b)=>(b.lvl||1)-(a.lvl||1));
  W.rbar=R.BLDS.find(b=>!b.dead&&b.team===2&&b.kind==='barracks')||W.c2;
  ff(4);
  W.open=openSpots();
  s.ai=null;                                         // the red king's own AI stops: the trailer directs the war (as Claude would)
  if(s.armies&&s.armies[2])s.armies[2].ord={type:'free'};
  T1.res.gold+=5000;T1.res.wood+=5000;T1.res.food+=5000;
  cleanFx();
  return {open:W.open.map(o=>o.bad),farms:W.farms.length,towns:W.towns.map(t=>t.name+t.lvl),rbar:W.rbar.kind,t:Math.round(s.t)};
}

// ---------------------------------------------------------------- the shots
const X={};   // per-shot state
const keep={};
const THOUGHT='O azul tem muitos arqueiros e quase nenhuma lança. As fazendas dele estão sem guarda.';
const ORDERS=['treinar <b>8 guerreiros</b>','avançar para a <b>Era IV</b>','saquear <b>as fazendas do azul</b>'];
const SH={
  intro:{
    setup(){clearTr();hud(false);bars(110);chip(null);
      const red=['warrior','warrior','lancer','archer','warrior','lancer','archer','warrior','lancer','warrior','archer','paladin','warrior','lancer','archer','warrior','catapult','ram','warrior','lancer','archer','warrior'];
      const o={x:W.mid.x+260,y:W.mid.y-80};X.red=[];
      red.forEach((k,i)=>{const u=sp(k,2,o.x+(i%6)*34,o.y+Math.floor(i/6)*30);if(i===0)rank(u,6);else if(i<4)rank(u,4);else if(i<8)rank(u,2);X.red.push(u.id);});
      ff(3.4);cleanFx();
      const go={x:W.mid.x-500,y:W.mid.y+40};moveTo(X.red,go.x,go.y,80);
      const m=centroid(X.red);camTo(m.x,m.y-20,1.2,1,true);keep.red=X.red;},
    tick(u){const m=centroid(X.red);if(m)camTo(m.x-40,m.y-30,1.2+u*.06,.06);
      const v=overlay();
      const T6=6*BEAT;                                // the slam lands on beat 6, with the music's hit
      if(u<T6-.06){termRender(u);v.term.style.opacity=Math.min(1,u*10);}
      else v.term.style.opacity=Math.max(0,1-(u-T6+.06)*16);
      setText({kick:'',big:'O INIMIGO <em>PENSA.</em>',sub:''});slam(u,T6,3.72);
      dim(u<T6?1:Math.max(.25,1-(u-T6)*4));redv(u<T6?0:.8);if(u>T6&&u<T6+.04)shake(22);flash(u,T6,.14,.6);}
  },
  logo:{
    setup(){X.red=keep.red;hud(false);bars(110);},
    tick(u){const m=centroid(X.red);if(m)camTo(m.x-60,m.y-20,1.45,.05);
      dim(.5);redv(.5);flash(u,0,.35);if(u<.05)shake(28);
      setText({kick:'BRAIAN TECH APRESENTA',big:'REINO PEQUENO <i>2.1</i>',sub:'agora o Claude comanda o Reino Vermelho'});slam(u,0,3.6);}
  },
  relatorio:{
    setup(){clearTr();cleanFx();hud(false,['top']);bars(0);chip('busy');
      const c=W.c2;X.p={x:c.x-60,y:c.y+40};camTo(X.p.x-170,X.p.y,1.5,1,true);},
    tick(u){camTo(X.p.x-170+u*25,X.p.y,1.5,.05);redv(.25);
      const tp=typed(THOUGHT,u,.25,34);
      think({u,op:Math.min(1,u*7),st:'pensando'+'.'.repeat(1+Math.floor(u*3)%3),text:tp.s,cursor:true});
      setText({pos:'low',kick:'A CADA MINUTO',big:'ELE LÊ <i>A GUERRA.</i>',sub:'um relatório dos dois reinos'});slam(u,.05,3.7);flash(u,0,.15,.5);}
  },
  decide:{
    setup(){clearTr();cleanFx();hud(false,['top']);bars(0);chip('on');
      const b=W.rbar;X.b=b;X.w=[];X.eng=redEngineer().id;
      const e=R.byId.get(X.eng);const p=R.walkNear(b.x-90,b.y+70);e.x=p.x;e.y=p.y;e.order=null;e.path=null;
      camTo(b.x-120,b.y+40,1.75,1,true);},
    tick(u,f){camTo(X.b.x-120+u*20,X.b.y+40,1.75,.05);redv(.25);
      if(u>.5&&f%7===0&&X.w.length<8){const b=X.b,w=sp('warrior',2,b.x,b.y+40);w.order={type:'move',x:b.x-260+rnd(-40,40),y:b.y+110+X.w.length*14};w.path=null;X.w.push(w.id);}
      if(u>.3&&!X.s){X.s=1;say(R.byId.get(X.eng),'Ordem do Claude: guerreiros, agora!',2.6);}
      const oa=ORDERS.map((_,i)=>u-(.25+i*.42));
      think({u,st:'ordem enviada ✓',ok:true,text:THOUGHT,orders:ORDERS,oa});
      setText({pos:'low',kick:'ESTRATÉGIA DE VERDADE',big:'ELE <i>DECIDE.</i>',sub:'economia · eras · tropas · construções'});slam(u,.05,3.7);flash(u,0,.15,.4);}
  },
  ataca:{
    setup(){clearTr();cleanFx();hud(false,['toasts']);bars(110);chip(null);
      const F=W.farms.slice().sort((a,b)=>Math.hypot(a.x-W.c2.x,a.y-W.c2.y)-Math.hypot(b.x-W.c2.x,b.y-W.c2.y));
      X.f=F[0]||W.c1;const f=X.f;for(const b of F.slice(0,3)){b.hp=b.maxhp*.45;}
      const dx=W.c2.x-f.x,dy=W.c2.y-f.y,dl=Math.hypot(dx,dy)||1;X.from={x:f.x+dx/dl*330,y:f.y+dy/dl*330};
      X.r=[];for(let i=0;i<13;i++){const u=sp(['warrior','lancer','warrior','paladin'][i%4],2,X.from.x+rnd(-70,70),X.from.y+rnd(-50,50));rank(u,i<2?4:1);X.r.push(u.id);}
      for(let i=0;i<X.r.length;i++){const u=R.byId.get(X.r[i]);const t=F[i%Math.min(3,F.length)]||f;if(u&&t){u.order={type:'attack',id:t.id};u.path=null;}}
      const m=centroid(X.r);camTo((m.x+f.x)/2,(m.y+f.y)/2-20,1.55,1,true);},
    tick(u){const m=centroid(X.r);if(m)camTo(m.x*.45+X.f.x*.55,m.y*.45+X.f.y*.55-20,1.6,.06);redv(.3);
      if(u>.25&&!X.s){X.s=1;const g=genOf(2,X.r);say(g,'Queimem as fazendas!',1.8);}
      if(u>.7&&!X.t){X.t=1;R.toast('O Reino Vermelho está saqueando as suas fazendas!','bad',{x:X.f.x,y:X.f.y});}
      setText({pos:'low',kick:'ORDEM DO CLAUDE',big:'ATACA ONDE <em>DÓI.</em>',sub:'fazendas, torres, quartéis ou o seu castelo'});slam(u,.05,3.7);flash(u,0,.2,.7);if(u<.05)shake(14);}
  },
  flanco:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const o=W.open[0],p=R.walkNear(o.x-60,o.y+120);X.p=p;X.b=[];X.a=[];X.f=[];
      for(let i=0;i<14;i++){const u=sp(['warrior','archer','lancer','archer'][i%4],1,p.x-140+(i%5)*40,p.y+40+Math.floor(i/5)*42);u.face=1;X.b.push(u.id);}
      for(let i=0;i<10;i++){const u=sp(['warrior','lancer'][i%2],2,p.x+270+(i%4)*36,p.y+40+Math.floor(i/4)*42);if(i===0)rank(u,5);X.a.push(u.id);}
      for(let i=0;i<8;i++){const u=sp(['warrior','paladin','lancer','warrior'][i%4],2,p.x+130+(i%4)*36,p.y+330+Math.floor(i/4)*40);if(i===0)rank(u,4);X.f.push(u.id);}
      ff(2.2);cleanFx();for(const id of [...X.b,...X.a,...X.f]){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}
      attackMove(X.a,p.x-60,p.y+90);moveTo(X.f,p.x-30,p.y+300,30);
      camTo(p.x+60,p.y+120,1.12,1,true);},
    tick(u){camTo(X.p.x+60-u*20,X.p.y+120,1.15,.05);redv(.25);
      if(u>.15&&!X.s){X.s=1;say(genOf(2,X.a),'Segurem a frente!',1.4);}
      if(u>1.0&&!X.s2){X.s2=1;const L=R.byId.get(X.f[0]);say(L,'Grupo dois, pelo flanco!',1.6);attackMove(X.f,X.p.x-100,X.p.y+110);shake(10);}
      setText({pos:'top',kick:'ORDEM DO CLAUDE',big:'<em>FLANCO.</em>',sub:'o general vermelho executa o plano'});slam(u,.05,2.75);flash(u,0,.2,.7);}
  },
  recua:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const o=W.open[1]||W.open[0],p=R.walkNear(o.x,o.y);X.p=p;X.r=[];X.b=[];
      for(let i=0;i<9;i++){const u=sp(['warrior','lancer','archer'][i%3],2,p.x+40+(i%3)*36,p.y-40+Math.floor(i/3)*40);if(i===0)rank(u,6);u.hp=u.maxhp*.4;X.r.push(u.id);}
      for(let i=0;i<20;i++){const u=sp(['warrior','lancer','archer','paladin'][i%4],1,p.x-210+(i%5)*36,p.y-90+Math.floor(i/5)*40);rank(u,i<3?4:1);X.b.push(u.id);}
      ff(1.2);cleanFx();attackMove(X.b,p.x+60,p.y);
      camTo(p.x-20,p.y-20,1.35,1,true);},
    tick(u){const m=centroid(X.r);if(m)camTo(m.x-90,m.y-20,1.35,.06);redv(.25);
      if(u>.55&&!X.go){X.go=1;const g=genOf(2,X.r);say(g,'Recuar! O Claude mandou poupar a tropa!',2.2);
        const home=R.walkNear(W.c2.x-160,W.c2.y+80);moveTo(X.r,home.x,home.y,60);attackMove(X.b,home.x,home.y);}
      setText({pos:'top',kick:'ORDEM DO CLAUDE',big:'E SABE <i>RECUAR.</i>',sub:'quando a batalha está perdida'});slam(u,.05,2.75);flash(u,0,.2,.5);}
  },
  cerco:{
    setup(){clearTr();cleanFx();hud(false,['toasts']);bars(110);
      const T=W.towns[1]||W.towns[0];X.T=T;X.a=[];
      for(let i=0;i<18;i++){const a=i/18*6.283,u=sp(['warrior','lancer','archer','paladin'][i%4],2,T.x+Math.cos(a)*260,T.y+20+Math.sin(a)*190);rank(u,i<2?4:1);X.a.push(u.id);}
      R.startConquest(2,T.i);ff(.4);for(const id of X.a){const u=R.byId.get(id);if(u){const a=Math.atan2(u.y-T.y,u.x-T.x);u.order={type:'move',x:T.x+Math.cos(a)*90,y:T.y+20+Math.sin(a)*70,amove:true};u.path=null;}}
      ff(1.2);cleanFx();camTo(T.x,T.y+10,1.2,1,true);R.ui.speed=2;},
    tick(u){camTo(X.T.x,X.T.y+10,1.2+u*.05,.05);redv(.3);
      if(u>2.4&&X.T.owner!==2){R.conquer(X.T,2);shake(18);X.fl=u;if(!X.t){X.t=1;R.toast(`${X.T.name} virou vassala do Reino Vermelho!`,'bad',{x:X.T.x,y:X.T.y});}}
      setText({pos:'low',kick:'ORDEM DO CLAUDE',big:'CERCA <em>AS VILAS.</em>',sub:X.T.owner===2?`${X.T.name} agora paga tributo ao Vermelho`:'contratos, mercenários e conquistas'});slam(u,.05,3.7);
      flash(u,0,.2,.7);if(X.fl)flash(u,X.fl,.2,.6);}
  },
  provoca:{
    setup(){clearTr();cleanFx();R.ui.speed=1;hud(false);bars(110);
      const e=redEngineer();X.eng=e.id;const p=R.walkNear(W.c2.x-110,W.c2.y+120);e.x=p.x;e.y=p.y;e.order=null;e.path=null;
      X.g=[];for(let i=0;i<8;i++){const u=sp(['warrior','lancer','archer','warrior'][i%4],2,p.x+70+(i%4)*40,p.y+50+Math.floor(i/4)*40);u.order=null;X.g.push(u.id);}
      ff(.8);cleanFx();for(const id of X.g){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}e.order=null;e.path=null;
      camTo(e.x+40,e.y+25,2.25,1,true);},
    tick(u){const e=R.byId.get(X.eng);if(e)camTo(e.x+40,e.y+25,2.25+u*.04,.08);redv(.35);
      sayCard('Pode plantar à vontade, azul. Eu colho depois!',.15,1.85,u);
      sayCard('Bela muralha. Vai ficar ótima no chão.',1.9,3.7,u);
      setText({pos:'top',kick:'O MESTRE RUBRO FALA PELO CLAUDE',big:'E AINDA <em>PROVOCA.</em>',sub:''});slam(u,.05,3.7);flash(u,0,.15,.5);flash(u,1.875,.12,.35);}
  },
  voce:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const c=W.c1,p=R.walkNear(c.x+40,c.y+200);X.p=p;X.army=[];
      const ks=['warrior','warrior','lancer','archer','warrior','paladin','lancer','archer','warrior','archer','lancer','warrior','warrior','archer','lancer','warrior','archer','warrior'];
      const rk=[6,4,4,3,3,2,2,2,1,1,1,1,0,0,0,0,0,0];
      ks.forEach((k,i)=>{const u=sp(k,1,p.x-170+(i%6)*62,p.y-40+Math.floor(i/6)*48);rank(u,rk[i]);u.face=1;X.army.push(u.id);});
      ff(3.3);cleanFx();for(const id of X.army){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}
      camTo(p.x-120,p.y-20,1.75,1,true);},
    tick(u){
      const v=overlay();
      if(u<1.875){camTo(X.p.x-120+u*30,X.p.y-20,1.6,.05);dim(.6);
        v.pick.style.opacity=Math.min(1,u*8,(1.86-u)*12);
        const o2=v.pick.querySelector('.o2'),r1=v.pick.querySelector('input[value=pc]'),r2=v.pick.querySelector('input[value=claude]');
        const tx=o2.offsetParent===null?0:o2.getBoundingClientRect(),pk=v.pick.getBoundingClientRect(),z=parseFloat(getComputedStyle(v.pick).zoom)||1;
        const gx=(tx.left-pk.left)/z+tx.width/z*.55,gy=(tx.top-pk.top)/z+tx.height/z*.6;
        const k=ease((u-.15)/.55),sx=40,sy=150;
        v.cur.style.left=(sx+(gx-sx)*k)+'px';v.cur.style.top=(sy+(gy-sy)*k)+'px';
        const on=u>.8;r2.checked=on;r1.checked=!on;v.pm.style.display=on?'':'none';
        o2.style.transform=u>.8&&u<.9?'scale(.94)':'';v.cur.style.transform=u>.8&&u<.9?'scale(.85)':'';
        setText({pos:'top',kick:'BATALHA RÁPIDA',big:'ESCOLHA <em>O CLAUDE.</em>',sub:''});slam(u,.05,1.85);flash(u,.8,.1,.35);
      }else{
        if(!X.go){X.go=1;dim(0);for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&(L.rank||0)<5)rank(L,5);R.sqCommand(q,'avante',true);}
          const g=genOf(1,X.army);say(g,'Por Pedravale! Avante!',1.6);attackMove(X.army,X.p.x+520,X.p.y-40);shake(20);}
        const m=centroid(X.army);if(m)camTo(m.x+150,m.y-20,1.55,.1);
        setText({big:'VOCÊ <em>AGUENTA?</em>',sub:'Normal · Difícil · Insano'});slam(u,1.9,3.7);flash(u,1.875,.2,.8);}
    }
  },
  montage:{nat:true,
    setup(){clearTr();hud(false);bars(110);cleanFx();X.cut=-1;},
    tick(u){
      const cut=Math.min(7,Math.floor(u/(BEAT*2)));const cu=u-cut*BEAT*2;
      if(cut!==X.cut){X.cut=cut;cutSetup(cut);shake(cut===7?30:16);}
      const t=X.focus&&R.byId.get(X.focus);if(t&&!t.dead)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.2);
      redv(cut<3?.4:0);
      const words=['<em>FOGO!</em>','<em>CATAPULTAS!</em>','<em>ARÍETE!</em>','GRITO DE <i>GUERRA!</i>','<i>HERÓIS!</i>','<i>FLECHAS!</i>','<i>CONTRA-ATAQUE!</i>','VENÇA <em>O CLAUDE.</em>'];
      setText({big:words[cut]});slam(cu,.03,cut===7?BEAT*2+.2:BEAT*2-.04);flash(cu,0,.16,cut===7?1:.75);
      if(cut===7&&cu<.05)for(let i=0;i<10;i++)R.FX.booms.push({x:X.bx+rnd(-160,160),y:X.by+rnd(-100,100),t:-i*.06,s:1.6,k:i%2?'explosion':'explosion2'});}
  },
  fim:{
    setup(){clearTr();hud(false);bars(110);cleanFx();R.ui.speed=1;camTo(W.c1.x-200,W.c1.y,.78,1,true);},
    tick(u){camTo(W.c1.x-200+u*40,W.c1.y+20,.78-u*.012,.03);dim(Math.min(.62,u*1.2));
      const b=u/BEAT;
      if(b<6){setText({kick:'',big:'REINO PEQUENO <i>2.1</i>',sub:'O Claude no comando do Reino Vermelho',sub2:'Windows · Mac · Linux · Android · iPhone · navegador'});slam(u,.1,6*BEAT-.05);}
      else if(b<11){setText({kick:'JOGUE AGORA',big:'<span class="url">braiantech-br.github.io</span>',sub:'/Reino-Pequeno',sub2:'Batalha Rápida → Quem comanda o Reino Vermelho → Claude'});slam(u,6*BEAT,11*BEAT-.05);}
      else{setText({kick:'UMA PRODUÇÃO',big:'<i>BRAIAN TECH</i>',sub:'www.braiantech.com.br',sub2:'Arte: Tiny Swords, de Pixel Frog · Claude: IA da Anthropic'});slam(u,11*BEAT,16*BEAT);}
      flash(u,0,.3,.9);if(b>15)dim(Math.min(1,.62+(b-15)*.5));if(b>15.2)overlay().tx.style.opacity=Math.max(0,1-(b-15.2)*1.5);}
  },
};
function cutSetup(cut){
  clearTr();X.fx=0;
  const c1=W.c1,c2=W.c2,mid=W.mid;
  if(cut===0){const p=R.walkNear(mid.x+120,mid.y);const reds=[];for(let i=0;i<14;i++)reds.push(sp(i%2?'warrior':'lancer',2,p.x+rnd(-80,80),p.y+rnd(-50,50)).id);
    const mo=sp('monk',1,p.x-260,p.y);const hits=[];for(let k=0;k<9;k++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*85;hits.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.75,at:.1+k*.12,done:false});}
    S().spells=S().spells||[];S().spells.push({type:'meteor',team:1,src:mo.id,x:p.x,y:p.y,t:0,hits});X.focus=reds[0];X.z=1.55;}
  else if(cut===1){const tg=R.BLDS.filter(b=>!b.dead&&b.team===1&&b.kind!=='castle'&&b.kind!=='farm').sort((x,y)=>Math.hypot(x.x-c2.x,x.y-c2.y)-Math.hypot(y.x-c2.x,y.y-c2.y))[0]||c1;
    const dx=c2.x-tg.x,dy=c2.y-tg.y,dl=Math.hypot(dx,dy)||1;const p=R.walkNear(tg.x+dx/dl*240,tg.y+dy/dl*240);
    const cs=[];for(let i=0;i<3;i++)cs.push(sp('catapult',2,p.x+rnd(-20,20),p.y+i*50-50).id);attack(cs,tg);ff(1.2);X.focus=cs[1];X.fx=-dx/dl*110;X.z=1.35;}
  else if(cut===2){const dx=c2.x-c1.x,dy=c2.y-c1.y,dl=Math.hypot(dx,dy)||1;const p=R.walkNear(c1.x+dx/dl*150,c1.y+dy/dl*150+60);const r=sp('ram',2,p.x,p.y);attack([r.id],c1);
    const g=[];for(let i=0;i<5;i++)g.push(sp('warrior',2,p.x+rnd(-30,30),p.y+rnd(-30,30)).id);attack(g,c1);ff(1.5);X.focus=r.id;X.z=1.8;}
  else if(cut===3){const p=R.walkNear(mid.x-150,mid.y+120);const a=[];for(let i=0;i<10;i++){const u=sp(['warrior','lancer','paladin','archer'][i%4],1,p.x+(i%5)*40-80,p.y+Math.floor(i/5)*40);if(i===0)rank(u,7);u.hp=u.maxhp*.5;a.push(u.id);}
    ff(3.2);cleanFx();for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&a.includes(L.id)){rank(L,7);R.sqCommand(q,'grito',true);}}
    X.focus=a[0];X.z=1.9;}
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
  if(i!==cur){cur=i;for(const k in X)delete X[k];dim(0);redv(0);SH[id].setup();}
  cardsOff();NAT=!!SH[id].nat;
  SH[id].tick(u,f);
  const s=S();s.ask=null;if(s.asks)s.asks.length=0;
  camApply();applyShake();
  window.__clock.step(1000/FPS);
  return id;
}
window.TR={prep,frame,TOTAL,FPS,BEAT,SHOTS,START};
})();
