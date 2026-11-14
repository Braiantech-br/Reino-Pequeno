// Trailer 2.2 director ("Claude × Claude"): builds the world, then for each video frame sets the camera, the action,
// the titles and the speed of time (slow motion), and steps the game's clock. The recorder screenshots every TR.frame(f).
(()=>{
const R=window.__reino,FPS=30,BPM=128,BEAT=60/BPM;
const SHOTS=[['cold',8],['nohuman',6],['vs',8],['logo',6],['aovivo',8],['planos',8],['provoca',8],['choque',12],
  ['montage',16],['quem',4],['rapid',8],['fim',16]];
const START=[];let acc=0;for(const [,b] of SHOTS){START.push(acc);acc+=b;}
const TOTAL=Math.round(acc*BEAT*FPS);
const S=()=>R.S;
const rnd=(a,b)=>a+Math.random()*(b-a);
const ease=t=>t<0?0:t>1?1:1-Math.pow(1-t,3);
const clamp=(x,a,b)=>x<a?a:x>b?b:x;
const BLUE='#3d7bff',RED='#ff4a36';

// ---------------------------------------------------------------- titles and cards overlay
const css=`#trv{position:fixed;inset:0;pointer-events:none;z-index:1000;overflow:hidden}
#trv .bar{position:absolute;left:0;right:0;height:0;background:#000;z-index:5}#trv .bt{top:0}#trv .bb{bottom:0}
#trv .dim{position:absolute;inset:0;background:#04060b;opacity:0}
#trv .vig{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(0,0,0,0) 48%,rgba(0,0,0,.65) 100%)}
#trv .tint{position:absolute;inset:0;opacity:0}
#trv .tx{position:absolute;left:0;right:0;text-align:center;z-index:4}
#trv .tx.p-center{top:50%;transform:translateY(-50%)}
#trv .tx.p-top{top:140px}
#trv .tx.p-low{left:110px;right:auto;bottom:140px;text-align:left}
#trv .tx.p-bottom{bottom:130px}
#trv .kick{font:700 34px "Pixelify Sans",sans-serif;letter-spacing:10px;color:#ffd23a;text-shadow:0 4px 0 #000,0 0 18px rgba(0,0,0,.8);margin-bottom:6px}
#trv .big{position:relative;font:400 184px/0.86 "Jersey 10",monospace;color:#fff;letter-spacing:3px;-webkit-text-stroke:5px #0d0812;paint-order:stroke fill;text-shadow:0 9px 0 #0d0812,0 0 50px rgba(0,0,0,.75);white-space:nowrap}
#trv .tx.p-low .big{font-size:140px}
#trv .big i{font-style:normal;color:#ffd23a}#trv .big em{font-style:normal;color:${RED}}#trv .big u{text-decoration:none;color:${BLUE}}
#trv .sub{font:700 40px "Pixelify Sans",sans-serif;color:#fff;text-shadow:0 4px 0 #000,0 0 16px rgba(0,0,0,.9);margin-top:16px;letter-spacing:1px}
#trv .sub2{font:600 30px "Pixelify Sans",sans-serif;color:#ffe9a8;text-shadow:0 3px 0 #000;margin-top:10px}
#trv .flash{position:absolute;inset:0;background:#fff;opacity:0;z-index:6}
#trv .scan{position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,.08) 0 2px,transparent 2px 4px);opacity:.2;z-index:3}
#trv .url{font-size:100px}
/* two terminals: the war report going to each Claude */
#trv .t2{position:absolute;inset:0;display:flex;align-items:center;justify-content:space-around;z-index:2;opacity:0}
#trv .t2 pre{font:500 34px/1.55 "DejaVu Sans Mono",monospace;margin:0;width:760px;white-space:pre;text-shadow:0 0 14px currentColor}
#trv .t2 .tb{color:#9cc2ff}#trv .t2 .tr{color:#ff9b8c}
#trv .t2 .h{font-weight:700;color:#fff}#trv .t2 .ok{color:#7dff9a}#trv .t2 .m{opacity:.55}
#trv .t2 .cur{display:inline-block;width:.6em;height:1em;background:currentColor;vertical-align:-.12em;margin-left:2px}
/* the versus screen */
#trv .vs{position:absolute;inset:0;z-index:2;opacity:0;overflow:hidden}
#trv .vs-h{position:absolute;top:0;bottom:0;width:62%;overflow:hidden}
#trv .vs-l{left:0;clip-path:polygon(0 0,100% 0,80% 100%,0 100%);background:linear-gradient(115deg,#0b1e57 0%,#1f49c9 55%,#5c8dff 100%)}
#trv .vs-r{right:0;clip-path:polygon(20% 0,100% 0,100% 100%,0 100%);background:linear-gradient(245deg,#4a0b07 0%,#c4261a 55%,#ff7a5c 100%)}
#trv .vs-h:before{content:"";position:absolute;inset:-50%;background:repeating-linear-gradient(100deg,rgba(255,255,255,.09) 0 6px,transparent 6px 46px);transform:translateX(var(--sl,0px))}
#trv .vs-spr{position:absolute;bottom:70px;width:192px;height:192px;image-rendering:pixelated;background-repeat:no-repeat;transform-origin:50% 100%}
#trv .vs-l .vs-spr{left:16%;transform:scale(3.6)}
#trv .vs-r .vs-spr{right:16%;transform:scale(-3.6,3.6)}
#trv .vs-n{position:absolute;top:130px;z-index:2}
#trv .vs-l .vs-n{left:90px;text-align:left}#trv .vs-r .vs-n{right:90px;text-align:right}
#trv .vs-n small{display:block;font:700 34px "Pixelify Sans",sans-serif;letter-spacing:10px;color:#ffd23a;text-shadow:0 4px 0 #000}
#trv .vs-n b{display:block;font:400 150px/0.85 "Jersey 10",monospace;color:#fff;-webkit-text-stroke:5px #0d0812;paint-order:stroke fill;text-shadow:0 8px 0 #0d0812}
#trv .vs-n span{display:block;font:700 30px "Pixelify Sans",sans-serif;color:#fff;text-shadow:0 3px 0 #000;margin-top:10px}
#trv .vs-x{position:absolute;left:50%;top:50%;font:400 330px/1 "Jersey 10",monospace;color:#ffd23a;-webkit-text-stroke:9px #0d0812;paint-order:stroke fill;text-shadow:0 14px 0 #0d0812,0 0 80px rgba(255,210,58,.6);transform:translate(-50%,-50%) scale(0);z-index:3}
/* the thinking cards (one per kingdom) */
#trv .think{position:absolute;top:50%;width:720px;transform:translateY(-58%);z-index:2;background:rgba(10,9,16,.93);border:3px solid var(--k);border-radius:16px;box-shadow:0 0 0 4px rgba(0,0,0,.55),0 0 46px color-mix(in srgb,var(--k) 55%,transparent),0 18px 50px rgba(0,0,0,.6);padding:22px 28px 24px;opacity:0;color:#fff}
#trv .think.k1{left:70px;--k:${BLUE}}#trv .think.k2{right:70px;--k:${RED}}
#trv .th-h{display:flex;align-items:center;gap:14px;border-bottom:2px solid color-mix(in srgb,var(--k) 40%,transparent);padding-bottom:12px;margin-bottom:14px}
#trv .th-h .dot{width:18px;height:18px;border-radius:50%;background:var(--k);box-shadow:0 0 16px var(--k);flex:none}
#trv .th-h b{font:400 56px/0.8 "Jersey 10",monospace;letter-spacing:3px;color:#fff}
#trv .th-who{font:700 24px/1.1 "Pixelify Sans",sans-serif;color:var(--k);flex:1;filter:brightness(1.35)}
#trv .th-st{font:700 22px "Pixelify Sans",sans-serif;color:#ffd23a;letter-spacing:1px;white-space:nowrap}
#trv .th-st.ok{color:#7dff9a}
#trv .th-t{font:600 30px/1.32 "Pixelify Sans",sans-serif;margin:0;min-height:160px}
#trv .th-t .cur{display:inline-block;width:14px;height:30px;background:var(--k);vertical-align:-4px;margin-left:3px}
#trv .th-o{list-style:none;margin:8px 0 0;padding:0}
#trv .th-o li{font:700 29px/1.5 "Pixelify Sans",sans-serif;color:#ffd23a;opacity:0}
#trv .th-o li b{color:#fff}
/* the commanders' taunts */
#trv .say{position:absolute;bottom:140px;display:flex;gap:24px;align-items:center;background:rgba(10,9,16,.94);border:4px solid var(--k);border-radius:18px;padding:18px 34px 18px 18px;z-index:2;opacity:0;width:1120px;box-shadow:0 0 0 4px rgba(0,0,0,.5),0 0 50px color-mix(in srgb,var(--k) 55%,transparent)}
#trv .say.k1{left:90px;--k:${BLUE}}#trv .say.k2{right:90px;--k:${RED};flex-direction:row-reverse;text-align:right;padding:18px 18px 18px 34px}
#trv .say img{width:136px;height:136px;image-rendering:pixelated;background:color-mix(in srgb,var(--k) 35%,#111);border-radius:12px;border:3px solid var(--k);flex:none}
#trv .say b{font:700 26px "Pixelify Sans",sans-serif;color:var(--k);display:block;margin-bottom:6px;filter:brightness(1.4)}
#trv .say p{font:700 50px/1.15 "Pixelify Sans",sans-serif;color:#fff;margin:0}
/* who plays (the quick battle menu) */
#trv .pick{position:absolute;left:50%;top:58%;transform:translate(-50%,-50%);z-index:2;opacity:0;zoom:2.05;max-width:none;width:470px;margin:0}
#trv .pick h4{margin:0 0 2px!important;font:700 22px "Pixelify Sans",sans-serif;color:var(--ink)}
#trv .pick .cl-side{margin:8px 0 -2px!important}
#trv .pick .cur{position:absolute;left:0;top:0;width:30px;height:30px;filter:drop-shadow(0 3px 0 rgba(0,0,0,.5))}
#trv .lines{position:absolute;inset:-20%;z-index:1;opacity:0;background:repeating-conic-gradient(from 0deg at 50% 50%,rgba(255,255,255,.0) 0deg 4deg,rgba(255,255,255,.18) 4deg 5deg);-webkit-mask-image:radial-gradient(circle at center,transparent 30%,#000 70%);mask-image:radial-gradient(circle at center,transparent 30%,#000 70%)}
@media (orientation:portrait){#trv .big{font-size:118px;white-space:normal;line-height:.92}#trv .tx.p-low{left:56px;right:56px;bottom:250px}#trv .tx.p-low .big{font-size:108px}#trv .kick{font-size:26px;letter-spacing:6px}#trv .sub{font-size:32px}#trv .sub2{font-size:24px}#trv .tx.p-top{top:230px}#trv .tx.p-center,#trv .tx.p-bottom{padding:0 40px}#trv .tx.p-bottom{bottom:240px}#trv .url{font-size:62px}
  #trv .t2{flex-direction:column;justify-content:center;gap:90px}#trv .t2 pre{font-size:27px;width:880px}
  #trv .vs-h{width:100%;height:58%}#trv .vs-l{top:0;bottom:auto;clip-path:polygon(0 0,100% 0,100% 80%,0 100%)}#trv .vs-r{top:auto;bottom:0;clip-path:polygon(0 20%,100% 0,100% 100%,0 100%)}
  #trv .vs-l .vs-spr{left:auto;right:8%;bottom:110px;transform:scale(2.9)}#trv .vs-r .vs-spr{right:auto;left:8%;bottom:60px;transform:scale(-2.9,2.9)}
  #trv .vs-n{top:auto}#trv .vs-l .vs-n{left:56px;top:250px}#trv .vs-r .vs-n{right:56px;bottom:250px}#trv .vs-n b{font-size:120px}#trv .vs-x{font-size:260px}
  #trv .think{width:auto;left:40px;right:40px;transform:none}#trv .think.k1{top:250px}#trv .think.k2{top:830px}#trv .th-t{min-height:0;font-size:28px}
  #trv .say{width:auto;left:40px;right:40px;bottom:300px}#trv .say p{font-size:40px}#trv .say img{width:110px;height:110px}
  #trv .pick{zoom:2.05;width:470px;top:56%}}
#app.watch #watch{zoom:1.5}#app.watch .panel{zoom:1.35}#app.watch .top-r{zoom:1.3}
@media (orientation:portrait){#app.watch #watch{zoom:1.6}}
#ask,#talk,#report,#goals,#banner,#sndpop,#ov-start,#ov-story,#ov-end,#ov-upd,#ov-confirm,#pausecard,#ov-council{display:none!important}`;
let V=null;
const CURSOR='<svg class="cur" viewBox="0 0 24 24"><path d="M4 2l16 10.5-7 1.6-3.3 6.9z" fill="#fff" stroke="#140b18" stroke-width="2.2" stroke-linejoin="round"/></svg>';
const SEG=(name,opts)=>`<div class="seg">${opts.map(([v,t,e],i)=>`<label><input type="radio" name="${name}" value="${v}"${i===0?' checked':''}><span class="o-${v}">${t}<em>${e}</em></span></label>`).join('')}</div>`;
function overlay(){
  if(V)return V;
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  const d=document.createElement('div');d.id='trv';
  d.innerHTML='<div class="dim"></div><div class="tint"></div><div class="lines"></div><div class="vig"></div><div class="scan"></div>'+
    '<div class="t2"><pre class="tb"></pre><pre class="tr"></pre></div>'+
    '<div class="vs"><div class="vs-h vs-l"><div class="vs-spr" style="background-image:url(assets/b_warrior_idle.png)"></div><div class="vs-n"><small>CLAUDE</small><b>AZUL</b><span>comanda o Reino Azul</span></div></div>'+
      '<div class="vs-h vs-r"><div class="vs-spr" style="background-image:url(assets/r_warrior_idle.png)"></div><div class="vs-n"><small>CLAUDE</small><b>VERMELHO</b><span>comanda o Reino Vermelho</span></div></div><div class="vs-x">VS</div></div>'+
    [1,2].map(k=>`<div class="think k${k}"><div class="th-h"><i class="dot"></i><b>CLAUDE</b><span class="th-who">${k===1?'Reino Azul':'Reino Vermelho'}</span><span class="th-st"></span></div><p class="th-t"></p><ul class="th-o"></ul></div>`).join('')+
    `<div class="say k1"><img alt="" src="assets/av05.png"><div><b>Mestre Gaspar (Claude)</b><p></p></div></div><div class="say k2"><img alt="" src="assets/av06.png"><div><b>Mestre Rubro (Claude)</b><p></p></div></div>`+
    '<div class="pick sheet"><h4>Quem joga</h4><p class="cl-side k1">Reino Azul</p>'+SEG('trb',[['voce','Você','Você comanda'],['pc','Computador','A IA do jogo'],['claude','Claude','Estratégia de verdade']])+
      '<p class="cl-side k2">Reino Vermelho</p>'+SEG('trr',[['pc','Computador','A IA do jogo'],['claude','Claude','Estratégia de verdade']])+CURSOR+'</div>'+
    '<div class="tx p-center"><div class="kick"></div><div class="big"><span class="m"></span></div><div class="sub"></div><div class="sub2"></div></div><div class="bar bt"></div><div class="bar bb"></div><div class="flash"></div>';
  document.body.appendChild(d);
  const q=s=>d.querySelector(s);
  V={d,dim:q('.dim'),tint:q('.tint'),lines:q('.lines'),tx:q('.tx'),kick:q('.kick'),big:q('.big'),m:q('.m'),sub:q('.sub'),sub2:q('.sub2'),bt:q('.bt'),bb:q('.bb'),flash:q('.flash'),
    t2:q('.t2'),tb:q('.t2 .tb'),trr:q('.t2 .tr'),vs:q('.vs'),vsl:q('.vs-l'),vsr:q('.vs-r'),vsx:q('.vs-x'),sprL:q('.vs-l .vs-spr'),sprR:q('.vs-r .vs-spr'),
    think:{1:q('.think.k1'),2:q('.think.k2')},say:{1:q('.say.k1'),2:q('.say.k2')},pick:q('.pick'),cur:q('.pick .cur'),last:{}};
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
  const a=u-t0,b=t1-u,s=1+1.9*Math.exp(-a*18),op=Math.min(1,a*16,b*8);
  const shift=a<.14?(1-a/.14)*24:0;
  v.tx.style.opacity=op;
  v.big.style.transform=`scale(${s.toFixed(3)})`;
  v.big.style.textShadow=`${shift}px 0 0 rgba(255,60,60,.85),${-shift}px 0 0 rgba(60,140,255,.85),0 9px 0 #0d0812,0 0 50px rgba(0,0,0,.75)`;
  v.kick.style.transform=`translateY(${(1-ease(a*5))*-20}px)`;v.kick.style.opacity=Math.min(1,a*6)*op;
  v.sub.style.opacity=Math.min(1,Math.max(0,(a-.16)*5))*op;v.sub2.style.opacity=Math.min(1,Math.max(0,(a-.36)*4))*op;
}
function bars(h){const v=overlay();v.bt.style.height=v.bb.style.height=(innerHeight>innerWidth?h*1.6:h)+'px';}
function dim(x){overlay().dim.style.opacity=x;}
function tint(color,x){const t=overlay().tint;t.style.background=`radial-gradient(ellipse at center,transparent 40%,${color} 100%)`;t.style.opacity=x;}
function flash(u,t0,dur,pk){const v=overlay();const a=u-t0;if(a>=0&&a<dur)v.flash.style.opacity=Math.max(+v.flash.style.opacity||0,(pk||.9)*(1-a/dur));}
let shakeK=0,punch=0;
function shake(k,p){shakeK=Math.max(shakeK,k);punch=Math.max(punch,p==null?k/400:p);}
function applyShake(){
  const app=document.getElementById('app'),v=overlay();
  const x=(Math.random()-.5)*shakeK,y=(Math.random()-.5)*shakeK,sc=1+punch;
  app.style.transform=shakeK>.3||punch>.002?`translate(${x}px,${y}px) scale(${sc.toFixed(4)})`:'';v.tx.style.translate=shakeK>.3?`${x*.6}px ${y*.6}px`:'';
  shakeK*=.8;punch*=.78;
}
function hud(on,extra){
  for(const id of ['top','panel','toasts'])document.getElementById(id).style.visibility=on||(extra&&extra.includes(id))?'visible':'hidden';
}
function cardsOff(){const v=overlay();v.t2.style.opacity=0;v.vs.style.opacity=0;v.think[1].style.opacity=0;v.think[2].style.opacity=0;v.say[1].style.opacity=0;v.say[2].style.opacity=0;v.pick.style.opacity=0;v.lines.style.opacity=0;v.flash.style.opacity=0;}
function typed(text,u,t0,cps){const n=Math.max(0,Math.floor((u-t0)*cps));return {s:text.slice(0,n),done:n>=text.length};}
const esc=s=>s.replace(/&/g,'&amp;').replace(/</g,'&lt;');

// the cold open: the same report reaches two Claudes
const TERMS={tb:[[['> CLAUDE AZUL','h']],[['  conectando ','m'],['.......... ','m'],['ok','ok']],[['  lendo o relatório da guerra','']],[['  inimigo: ','m'],['muitos arqueiros','']],[['  plano: ','m'],['lanceiros + flanco','h']]],
             tr:[[['> CLAUDE VERMELHO','h']],[['  conectando ','m'],['.......... ','m'],['ok','ok']],[['  lendo o relatório da guerra','']],[['  inimigo: ','m'],['torres no ouro','']],[['  plano: ','m'],['catapultas + castelo','h']]]};
function termRender(key,u,T0){
  const v=overlay(),el=key==='tb'?v.tb:v.trr,CPS=62;let html='';
  TERMS[key].forEach((segs,i)=>{
    if(u<T0[i])return;
    let left=Math.floor((u-T0[i])*CPS),line='';const full=segs.reduce((a,s)=>a+s[0].length,0);
    for(const [t,c] of segs){if(left<=0)break;const p=t.slice(0,left);left-=t.length;line+=c?`<span class="${c}">${esc(p)}</span>`:esc(p);}
    const next=T0[i+1];if(Math.floor((u-T0[i])*CPS)<full||next==null||u<next)line+=`<span class="cur" style="opacity:${Math.floor(u*5)%2?.25:1}"></span>`;
    html+=line+'\n';
  });
  if(html!==v.last[key]){v.last[key]=html;el.innerHTML=html;}
}
function think(k,o){
  const v=overlay(),c=v.think[k],L=v.last['th'+k]||(v.last['th'+k]={});
  c.style.opacity=o.op==null?1:o.op;
  const st=o.st||'';if(L.st!==st){L.st=st;const e=c.querySelector('.th-st');e.textContent=st;e.className='th-st'+(o.ok?' ok':'');}
  const t=esc(o.text||'')+(o.cursor?`<span class="cur" style="opacity:${Math.floor((o.u||0)*5)%2?.2:1}"></span>`:'');if(L.t!==t){L.t=t;c.querySelector('.th-t').innerHTML=t;}
  const H=(o.orders||[]).map(x=>`<li>▸ ${x}</li>`).join('');if(L.o!==H){L.o=H;c.querySelector('.th-o').innerHTML=H;}
  const lis=c.querySelector('.th-o').children;for(let i=0;i<lis.length;i++){const a=(o.oa||[])[i]||0;lis[i].style.opacity=clamp(a*6,0,1);lis[i].style.transform=`translateX(${(1-ease(a*5))*(k===1?-24:24)}px)`;}
  c.querySelector('.dot').style.opacity=o.ok?1:.45+.55*Math.abs(Math.sin((o.u||0)*7));
}
function sayCard(k,text,a,b,u){
  const v=overlay(),c=v.say[k];if(u<a||u>b)return;
  const s=u-a,e=b-u;c.style.opacity=Math.min(1,s*12,e*12);
  const tp=typed(text,u,a+.02,90),L=v.last;
  if(L['say'+k]!==tp.s){L['say'+k]=tp.s;c.querySelector('p').textContent=tp.s;}
  c.style.transform=`translateX(${(1-ease(s*7))*(k===1?-80:80)}px)`;
}
// the versus screen's fighters: sprite sheets of 192 px frames (idle 8 frames, attack 4)
function sprite(el,file,frame,n){const f=Math.floor(frame)%n;if(el.dataset.f!==file){el.dataset.f=file;el.style.backgroundImage=`url(assets/${file}.png)`;}el.style.backgroundPosition=`${-f*192}px 0`;}

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
  R.ui.seed=seed;R.startGame({mode:'skirmish',diff:'normal',fog:false,claude:false,blue:'voce'});
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

function engineerOf(team){
  const s=S(),c=team===1?W.c1:W.c2;let e=R.byId.get(team===1?s.engineerId:s.redEngId);
  if(!e||e.dead)e=s.ents.find(x=>!x.dead&&x.kind==='engineer'&&x.team===team);
  if(!e||e.dead){e=sp('engineer',team,c.x-120,c.y+110);e.civil=true;}
  return e;
}
// two armies face to face on open ground
function armies(p,nb,nr,gap,o){
  o=o||{};const B=[],Rd=[];const kb=o.kb||['warrior','lancer','warrior','archer','paladin','lancer','warrior','archer'],kr=o.kr||['warrior','lancer','warrior','archer','paladin','lancer','warrior','archer'];
  for(let i=0;i<nb;i++){const u=sp(kb[i%kb.length],1,p.x-gap/2-(i%4)*34-20,p.y-120+Math.floor(i/4)*38);rank(u,i<2?5:i<6?3:1);u.face=1;B.push(u.id);}
  for(let i=0;i<nr;i++){const u=sp(kr[i%kr.length],2,p.x+gap/2+(i%4)*34+20,p.y-120+Math.floor(i/4)*38);rank(u,i<2?5:i<6?3:1);Rd.push(u.id);}
  return {B,R:Rd};
}
function freeze(ids){for(const id of ids){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}}
function setWatch(on){
  // the observer mode's broadcast screen, exactly as the game shows it
  const s=S();
  s.cfg=Object.assign({},s.cfg,on?{watch:true,blue:'claude',claude:true}:{watch:false,blue:'voce',claude:false});
  for(const t of [1,2]){const C=R.CLAUDE.side[t];C.on=on;C.busy=false;C.stopped='';C.lastReal=1e15;}
  R.watchStart();if(on){R.WATCH.camAuto=false;}
  document.getElementById('app').classList.toggle('watch',on);document.getElementById('watch').hidden=!on;
}

// ---------------------------------------------------------------- the shots
const X={};   // per-shot state
const keep={};
let RATE=1;   // speed of time in the game (slow motion below 1)
const PLAN={1:{t:'O vermelho tem arqueiros demais e poucas lanças. Lanceiros na frente, guerreiros pelo flanco.',o:['treinar <b>10 lanceiros</b>','flanco pela <b>floresta</b>','atacar <b>as torres</b>']},
            2:{t:'O azul gastou tudo em torres. Catapultas de longe, depois o castelo.',o:['treinar <b>3 catapultas</b>','espionar <b>a base azul</b>','alvo: <b>o castelo</b>']}};
const TAUNTS=[[1,'Rubro, suas torres vão virar lenha de fogueira!'],[2,'Lenha? Gaspar, você nem tem muralha!'],[1,'Não preciso de muralha. Tenho lanceiros.'],[2,'E eu tenho catapultas. Boa sorte.']];
const SH={
  cold:{
    setup(){clearTr();hud(false);bars(110);
      const p=W.open[0];X.p=p;const A=armies(p,24,24,420);X.A=A;ff(2.5);cleanFx();freeze([...A.B,...A.R]);keep.A=A;
      camTo(p.x,p.y-40,1.15,1,true);},
    tick(u){
      const v=overlay(),T4=4*BEAT,T6=6*BEAT;camTo(X.p.x,X.p.y-40,1.15+u*.05,.05);
      termRender('tb',u,[.05,.32,.6,.95,1.3]);termRender('tr',u,[.15,.42,.72,1.07,1.42]);
      v.t2.style.opacity=u<T4?Math.min(1,u*10):Math.max(.0,.25-(u-T4)*.4);
      if(u<T6){setText({big:'DUAS <i>IAs.</i>'});slam(u,T4,T6-.03);}else{setText({big:'UMA <em>GUERRA.</em>'});slam(u,T6,3.73);}
      dim(u<T6?1:Math.max(.42,1-(u-T6)*3.5));if(u>=T6)tint('rgba(150,20,10,.55)',.8);
      if(Math.abs(u-T4)<.02||Math.abs(u-T6)<.02)shake(20,.035);flash(u,T4,.12,.45);flash(u,T6,.14,.6);}
  },
  nohuman:{
    setup(){hud(false);bars(110);X.A=keep.A;const p=W.open[0];X.p=p;},
    tick(u){
      const v=overlay();camTo(X.p.x+30,X.p.y-40,1.25,.04);dim(u<2.45?.62:Math.min(1,.62+(u-2.45)*3));
      v.pick.style.opacity=Math.min(1,u*9,Math.max(0,(2.55-u)*10));
      const P=v.pick,pr=P.getBoundingClientRect(),z=parseFloat(getComputedStyle(P).zoom)||1;
      const at=sel=>{const r=P.querySelector(sel).getBoundingClientRect();return {x:(r.left-pr.left)/z+r.width/z*.55,y:(r.top-pr.top)/z+r.height/z*.6};};
      const a=at('.o-claude'),b=P.querySelectorAll('.o-claude')[1]?(()=>{const r=P.querySelectorAll('.o-claude')[1].getBoundingClientRect();return {x:(r.left-pr.left)/z+r.width/z*.55,y:(r.top-pr.top)/z+r.height/z*.6};})():a;
      const s0={x:60,y:40};let c;
      if(u<.55){const k=ease((u-.05)/.45);c={x:s0.x+(a.x-s0.x)*k,y:s0.y+(a.y-s0.y)*k};}
      else if(u<1.05){const k=ease((u-.6)/.4);c={x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k};}else c=b;
      v.cur.style.left=c.x+'px';v.cur.style.top=c.y+'px';
      const c1=u>.55,c2=u>1.05;P.querySelector('input[name=trb][value=claude]').checked=c1;P.querySelector('input[name=trb][value=voce]').checked=!c1;
      P.querySelector('input[name=trr][value=claude]').checked=c2;P.querySelector('input[name=trr][value=pc]').checked=!c2;
      v.cur.style.transform=(u>.55&&u<.63)||(u>1.05&&u<1.13)?'scale(.82)':'';
      setText({pos:'top',kick:'MODO OBSERVADOR',big:'SÓ <i>MÁQUINAS.</i>',sub:'nenhum humano nos controles'});slam(u,3*BEAT,2.5);
      flash(u,.55,.08,.3);flash(u,1.05,.08,.3);if(Math.abs(u-3*BEAT)<.02)shake(16,.03);}
  },
  vs:{
    setup(){hud(false);bars(0);},
    tick(u,f){
      const v=overlay(),T1=BEAT;v.vs.style.opacity=1;
      const k=ease(u/T1),port=innerHeight>innerWidth;
      v.vsl.style.transform=port?`translateY(${(1-k)*-110}%)`:`translateX(${(1-k)*-110}%)`;v.vsr.style.transform=port?`translateY(${(1-k)*110}%)`:`translateX(${(1-k)*110}%)`;
      v.vs.style.setProperty('--sl',(f*14%460)+'px');
      const atk=u>=T1&&u<T1+.4||u>=6*BEAT&&u<6*BEAT+.4;
      if(atk){const a=(u-(u<6*BEAT?T1:6*BEAT))*10;sprite(v.sprL,'b_warrior_atk',a,4);sprite(v.sprR,'r_warrior_atk',a+1,4);}
      else{sprite(v.sprL,'b_warrior_idle',f/4,8);sprite(v.sprR,'r_warrior_idle',f/4+3,8);}
      const a=u-T1,s=u<T1?0:1+2.2*Math.exp(-a*14);v.vsx.style.transform=`translate(-50%,-50%) scale(${s.toFixed(3)}) rotate(${u<T1?0:(-8*Math.exp(-a*10)).toFixed(2)}deg)`;
      for(const n of v.vs.querySelectorAll('.vs-n')){n.style.opacity=clamp((u-T1*.6)*5,0,1);}
      if(Math.abs(u-T1)<.02){shake(34,.06);}if(Math.abs(u-6*BEAT)<.02)shake(14,.02);
      flash(u,T1,.18,1);flash(u,6*BEAT,.1,.35);
      setText({});v.tx.style.opacity=0;}
  },
  logo:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const p=W.open[0];X.p=p;const A=armies(p,26,26,520);X.A=A;ff(1.5);cleanFx();
      for(const q of [...squadsOf(1),...squadsOf(2)])R.sqCommand(q,'avante',true);
      attackMove(A.B,p.x+200,p.y-40);attackMove(A.R,p.x-200,p.y-40);camTo(p.x,p.y-60,1.0,1,true);},
    tick(u){camTo(X.p.x,X.p.y-60,1.0+u*.06,.05);dim(.45);v_lines(u<.8?.6*(1-u/.8):0);
      flash(u,0,.3,.95);if(u<.04)shake(30,.05);
      setText({kick:'BRAIAN TECH APRESENTA',big:'REINO PEQUENO <i>2.2</i>',sub:'CLAUDE × CLAUDE'});slam(u,0,2.75);}
  },
  aovivo:{
    setup(){clearTr();cleanFx();hud(false,['top','panel']);bars(0);
      const p=W.open[1]||W.open[0];X.p=p;const A=armies(p,16,16,300);X.A=A;ff(1);cleanFx();attackMove(A.B,p.x+120,p.y-40);attackMove(A.R,p.x-120,p.y-40);
      setWatch(true);camTo(p.x+60,p.y-30,1.25,1,true);X.n=0;},
    tick(u){camTo(X.p.x+60-u*12,X.p.y-30,1.25,.05);
      const C=R.CLAUDE.side;C[1].busy=u>.2&&u<1.0;C[2].busy=u>1.2&&u<2.2;
      const F=[[.35,1,'thought',{thought:PLAN[1].t,strategy:'rush',order:'atacar',target:'torres',build:['barracks']}],[1.3,2,'taunt','Gaspar, sua base parece uma horta. Vou colher!'],[2.25,2,'thought',{thought:PLAN[2].t,strategy:'cerco',order:'esperar',target:'castelo',build:['tower']}],[3.1,1,'event','O exército azul marcha contra o castelo Vermelho!']];
      while(X.n<F.length&&u>=F[X.n][0]){const [,t,k,d]=F[X.n];R.watchFeed(t,k,d);X.n++;}
      setText({pos:'low',kick:'MODO OBSERVADOR',big:'ASSISTA <i>AO VIVO.</i>',sub:'placar · câmera automática · o que cada IA pensa'});slam(u,.05,3.7);flash(u,0,.15,.5);},
    done(){setWatch(false);}
  },
  planos:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const m=W.mid;X.p=m;camTo(m.x,m.y,.72,1,true);},
    tick(u){camTo(X.p.x+u*30,X.p.y,.72+u*.02,.04);dim(.5);
      for(const k of [1,2]){
        const P=PLAN[k],t0=k===1?.1:.25,tp=typed(P.t,u,t0,48),ok=u>2.35;
        think(k,{u,op:Math.min(1,(u-(k===1?0:.12))*8),st:ok?'ordem enviada ✓':'pensando'+'.'.repeat(1+Math.floor(u*3)%3),ok,text:tp.s,cursor:!ok,orders:P.o,oa:P.o.map((_,i)=>u-(2.4+i*.28))});
      }
      setText({pos:'bottom',big:'DOIS <i>PLANOS.</i>',sub:'cada IA lê a guerra e decide sozinha'});slam(u,2*BEAT,3.7);if(Math.abs(u-2*BEAT)<.02)shake(12,.02);}
  },
  provoca:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      for(const t of [1,2]){const e=engineerOf(t),c=t===1?W.c1:W.c2,p=R.walkNear(c.x+(t===1?120:-110),c.y+120);e.x=p.x;e.y=p.y;e.order=null;e.path=null;X['e'+t]=e.id;
        const g=[];for(let i=0;i<6;i++){const u=sp(['warrior','lancer','archer'][i%3],t,p.x+(t===1?-80:70)+(i%3)*38,p.y+50+Math.floor(i/3)*38);g.push(u.id);}freeze(g);}
      ff(.6);cleanFx();X.line=-1;},
    tick(u){
      const L=Math.min(3,Math.floor(u/(2*BEAT))),lu=u-L*2*BEAT,[k,text]=TAUNTS[L];
      if(L!==X.line){X.line=L;const e=R.byId.get(X['e'+k]);if(e){e.order=null;e.path=null;camTo(e.x+(k===1?-40:40),e.y+20,2.3,1,true);}shake(12,.03);}
      const e=R.byId.get(X['e'+k]);if(e)camTo(e.x+(k===1?-40:40),e.y+20,2.3+lu*.08,.1);
      sayCard(k,text,L*2*BEAT+.02,L*2*BEAT+2*BEAT-.02,u);
      tint(k===1?'rgba(40,90,255,.45)':'rgba(255,50,30,.45)',.8);
      setText({pos:'top',kick:'E AINDA',big:'SE <em>PROVOCAM.</em>'});slam(u,.03,3.72);flash(u,L*2*BEAT,.1,.45);}
  },
  choque:{
    setup(){clearTr();cleanFx();hud(false);bars(110);
      const p=W.open[0];X.p=p;const A=armies(p,32,32,330,{kb:['lancer','warrior','lancer','paladin','archer','warrior','lancer','archer'],kr:['warrior','warrior','lancer','paladin','archer','warrior','archer','lancer']});X.A=A;
      ff(1.6);cleanFx();freeze([...A.B,...A.R]);
      for(const q of [...squadsOf(1),...squadsOf(2)])R.sqCommand(q,'avante',true);
      attackMove(A.B,p.x+260,p.y-40);attackMove(A.R,p.x-260,p.y-40);camTo(p.x,p.y-50,1.05,1,true);},
    tick(u){
      const b=u/BEAT,p=X.p;
      // time: full speed into the clash, slow motion as the lines meet, a burst when it lets go
      RATE=b<4?1:b<4.3?1-.82*(b-4)/.3:b<7.6?.18:b<8?.18+1.6*(b-7.6)/.4:b<9?1.6:1;
      const z=b<4?1.05+b*.02:b<8?1.13+(b-4)*.13:1.65-(b-8)*.12;camTo(p.x,p.y-50,z,.08);
      v_lines(b<4?.25+b*.08:0);
      if(b>=4&&b<8){dim(.18);tint('rgba(0,0,0,.6)',1);}else{dim(0);tint('rgba(0,0,0,0)',0);}
      if(Math.abs(b-4)<.04){shake(26,.05);X.f1=u;}
      if(Math.abs(b-8)<.04&&!X.bm){X.bm=1;shake(40,.07);for(let i=0;i<8;i++)R.FX.booms.push({x:p.x+rnd(-140,140),y:p.y-40+rnd(-110,110),t:-i*.03,s:1.4,k:i%2?'explosion':'explosion2'});}
      flash(u,4*BEAT,.16,.7);flash(u,8*BEAT,.18,.95);
      setText({pos:'top',kick:'CLAUDE × CLAUDE',big:'A GUERRA <em>COMEÇA.</em>'});slam(u,4*BEAT,8*BEAT-.03);}
  },
  montage:{nat:true,
    setup(){clearTr();hud(false);bars(110);cleanFx();X.cut=-1;RATE=1;},
    tick(u){
      const cut=Math.min(7,Math.floor(u/(BEAT*2)));const cu=u-cut*BEAT*2;
      if(cut!==X.cut){X.cut=cut;cutSetup(cut);shake(18,.04);}
      const t=X.focus&&R.byId.get(X.focus);if(t&&!t.dead)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.2);
      tint(cut%2?'rgba(40,90,255,.4)':'rgba(255,50,30,.4)',.7);
      const words=['<em>FOGO!</em>','<em>CATAPULTAS!</em>','<em>ARÍETE!</em>','<i>MAGIA!</i>','<i>HERÓIS!</i>','GRITO DE <i>GUERRA!</i>','<i>FLECHAS!</i>','<em>CONTRA-ATAQUE!</em>'];
      setText({big:words[cut]});slam(cu,.02,BEAT*2-.04);flash(cu,0,.14,.8);}
  },
  quem:{
    setup(){clearTr();hud(false);bars(140);cleanFx();
      const c2=W.c2;c2.hp=Math.min(c2.hp,c2.maxhp*.3);const p=R.walkNear(c2.x-130,c2.y+130);const g=[];for(let i=0;i<14;i++)g.push(sp(['warrior','lancer','paladin','archer'][i%4],1,p.x+rnd(-90,90),p.y+rnd(-60,60)).id);attack(g,c2);ff(.5);
      X.c=c2;camTo(c2.x,c2.y-20,1.25,1,true);},
    tick(u){RATE=.3;camTo(X.c.x,X.c.y-20,1.25+u*.18,.06);dim(.55+Math.max(0,u-1.6)*2);
      setText({big:'QUEM VAI <i>VENCER?</i>'});slam(u,.02,1.7);if(u<.03)shake(18,.03);flash(u,0,.12,.5);}
  },
  rapid:{nat:true,
    setup(){clearTr();hud(false);bars(110);cleanFx();X.cut=-1;RATE=1.25;},
    tick(u){
      const cut=Math.min(7,Math.floor(u/BEAT)),cu=u-cut*BEAT;
      if(cut!==X.cut){X.cut=cut;if(cut<7)cutSetup([0,3,1,5,2,4,6][cut]);else{clearTr();X.focus=null;const c2=W.c2;c2.hp=Math.max(1,c2.maxhp*.04);X.bx=c2.x;X.by=c2.y-20;camTo(c2.x,c2.y-30,1.35,1,true);}shake(cut===7?44:20,cut===7?.09:.04);}
      const t=X.focus&&R.byId.get(X.focus);if(t&&!t.dead)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.25);
      if(cut===7&&cu<.05)for(let i=0;i<16;i++)R.FX.booms.push({x:X.bx+rnd(-180,180),y:X.by+rnd(-120,100),t:-i*.035,s:1.7,k:i%2?'explosion':'explosion2'});
      dim(0);v_lines(.35);flash(cu,0,.1,cut===7?1:.6);overlay().tx.style.opacity=0;}
  },
  fim:{
    setup(){clearTr();hud(false);bars(110);cleanFx();RATE=1;camTo(W.c1.x-200,W.c1.y,.78,1,true);},
    tick(u){camTo(W.c1.x-200+u*40,W.c1.y+20,.78-u*.012,.03);dim(Math.min(.66,.2+u*1.2));
      const b=u/BEAT;
      if(b<6){setText({kick:'',big:'REINO PEQUENO <i>2.2</i>',sub:'Você, o computador ou o Claude: escolha quem joga.',sub2:'Windows · Mac · Linux · Android · iPhone · navegador'});slam(u,.05,6*BEAT-.05);}
      else if(b<11){setText({kick:'JOGUE AGORA',big:'<span class="url">braiantech-br.github.io</span>',sub:'/Reino-Pequeno',sub2:'Batalha Rápida → Quem joga → Claude × Claude'});slam(u,6*BEAT,11*BEAT-.05);}
      else{setText({kick:'UMA PRODUÇÃO',big:'<i>BRAIAN TECH</i>',sub:'www.braiantech.com.br',sub2:'Arte: Tiny Swords, de Pixel Frog · Claude: IA da Anthropic'});slam(u,11*BEAT,16*BEAT);}
      flash(u,0,.35,1);if(u<.04)shake(30,.06);if(b>15)dim(Math.min(1,.66+(b-15)*.5));if(b>15.2)overlay().tx.style.opacity=Math.max(0,1-(b-15.2)*1.5);}
  },
};
function v_lines(x){overlay().lines.style.opacity=x;overlay().lines.style.transform=`rotate(${(Math.random()*6).toFixed(1)}deg)`;}
function cutSetup(cut){
  clearTr();X.fx=0;
  const c1=W.c1,c2=W.c2,mid=W.open[0]||W.mid;
  if(cut===0){const p=R.walkNear(mid.x+120,mid.y);const reds=[];for(let i=0;i<14;i++)reds.push(sp(i%2?'warrior':'lancer',2,p.x+rnd(-80,80),p.y+rnd(-50,50)).id);
    const mo=sp('monk',1,p.x-260,p.y);const hits=[];for(let k=0;k<9;k++){const a=Math.random()*6.28,r=Math.sqrt(Math.random())*85;hits.push({x:p.x+Math.cos(a)*r,y:p.y+Math.sin(a)*r*.75,at:.08+k*.1,done:false});}
    S().spells=S().spells||[];S().spells.push({type:'meteor',team:1,src:mo.id,x:p.x,y:p.y,t:0,hits});X.focus=reds[0];X.z=1.55;}
  else if(cut===1){const tg=R.BLDS.filter(b=>!b.dead&&b.team===1&&b.kind!=='castle'&&b.kind!=='farm').sort((x,y)=>Math.hypot(x.x-c2.x,x.y-c2.y)-Math.hypot(y.x-c2.x,y.y-c2.y))[0]||c1;
    const dx=c2.x-tg.x,dy=c2.y-tg.y,dl=Math.hypot(dx,dy)||1;const p=R.walkNear(tg.x+dx/dl*240,tg.y+dy/dl*240);
    const cs=[];for(let i=0;i<3;i++)cs.push(sp('catapult',2,p.x+rnd(-20,20),p.y+i*50-50).id);attack(cs,tg);ff(1.2);X.focus=cs[1];X.fx=-dx/dl*110;X.z=1.35;}
  else if(cut===2){const dx=c2.x-c1.x,dy=c2.y-c1.y,dl=Math.hypot(dx,dy)||1;const p=R.walkNear(c1.x+dx/dl*150,c1.y+dy/dl*150+60);const r=sp('ram',2,p.x,p.y);attack([r.id],c1);
    const g=[];for(let i=0;i<5;i++)g.push(sp('warrior',2,p.x+rnd(-30,30),p.y+rnd(-30,30)).id);attack(g,c1);ff(1.5);X.focus=r.id;X.z=1.8;}
  else if(cut===3){const p=R.walkNear(mid.x-40,mid.y+180);const wz=[];for(let i=0;i<6;i++)wz.push(sp('wizard',1,p.x-150+rnd(-15,15),p.y+i*30-75).id);const rs=[];for(let i=0;i<16;i++)rs.push(sp(i%2?'warrior':'lancer',2,p.x+20+rnd(-60,60),p.y+rnd(-60,60)).id);
    for(const id of wz){const w=R.byId.get(id),t=R.byId.get(rs[Math.floor(Math.random()*rs.length)]);if(w&&t){w.order={type:'attack',id:t.id};w.cd=0;}}for(const id of rs){const u=R.byId.get(id);if(u){u.order=null;u.path=null;}}ff(1.4);X.focus=rs[0];X.fx=-50;X.z=1.55;}
  else if(cut===4){const p=R.walkNear(mid.x,mid.y+220);const t=sp('htora',1,p.x,p.y);const rs=[];for(let i=0;i<12;i++){const a=i/12*6.28,u=sp(i%2?'warrior':'lancer',2,p.x+Math.cos(a)*80,p.y+Math.sin(a)*55);u.hp=u.maxhp*.35;rs.push(u.id);}attack(rs,t);ff(.6);X.focus=t.id;X.z=2.1;}
  else if(cut===5){const p=R.walkNear(mid.x-150,mid.y+120);const a=[];for(let i=0;i<10;i++){const u=sp(['warrior','lancer','paladin','archer'][i%4],1,p.x+(i%5)*40-80,p.y+Math.floor(i/5)*40);if(i===0)rank(u,7);u.hp=u.maxhp*.5;a.push(u.id);}
    ff(3.2);cleanFx();for(const q of squadsOf(1)){const L=R.byId.get(q.lead);if(L&&a.includes(L.id)){rank(L,7);R.sqCommand(q,'grito',true);}}
    X.focus=a[0];X.z=1.9;}
  else if(cut===6){const p=R.walkNear(mid.x+60,mid.y-160);const o=sp('hourela',1,p.x,p.y);for(let i=0;i<5;i++)sp('royal',1,p.x+rnd(-50,0),p.y+rnd(-60,60));const rs=[];for(let i=0;i<10;i++)rs.push(sp(i%2?'warrior':'lancer',2,p.x+260+rnd(-40,40),p.y+rnd(-80,80)).id);attack(rs,o);ff(.8);X.focus=o.id;X.fx=120;X.z=1.75;}
  else if(cut===7){const tw=R.BLDS.filter(b=>!b.dead&&b.team===1&&b.kind==='tower').sort((x,y)=>Math.hypot(x.x-c2.x,x.y-c2.y)-Math.hypot(y.x-c2.x,y.y-c2.y))[0]||c1;
    const p=R.walkNear(tw.x+140,tw.y+90);const g=[];for(let i=0;i<14;i++)g.push(sp(['warrior','lancer','paladin','warrior'][i%4],2,p.x+rnd(-70,70),p.y+rnd(-50,50)).id);attack(g,tw);ff(.8);X.focus=g[0];X.fx=-70;X.z=1.6;}
  const t=X.focus&&R.byId.get(X.focus);if(t)camTo(t.x+(X.fx||0),t.y-20,X.z||1.7,.2,true);
}

let cur=-1;
function frame(f){
  const t=f/FPS,b=t/BEAT;let i=SHOTS.length-1;for(let k=0;k<SHOTS.length;k++){if(b<START[k]+SHOTS[k][1]){i=k;break;}}
  const id=SHOTS[i][0],u=t-START[i]*BEAT;
  if(i!==cur){if(cur>=0&&SH[SHOTS[cur][0]].done)SH[SHOTS[cur][0]].done();cur=i;for(const k in X)delete X[k];dim(0);tint('transparent',0);RATE=1;SH[id].setup();}
  cardsOff();NAT=!!SH[id].nat;
  SH[id].tick(u,f);
  const s=S();s.ask=null;if(s.asks)s.asks.length=0;
  camApply();applyShake();
  window.__clock.step(1000/FPS*RATE);
  return id;
}
window.TR={prep,frame,TOTAL,FPS,BEAT,SHOTS,START};
})();
