// Update video 2.3: the Forja de Heróis, the new characters, the chapters of the dead and of the giant, the war council's
// tricks (ambush, pincer), the warship, two players and the live tools. Same machinery as the 2.2 trailer: builds the world,
// then for each video frame sets the camera, the action and the titles and steps the game's clock.
(()=>{
const R=window.__reino,FPS=30,BPM=128,BEAT=60/BPM;
const SHOTS=[['intro',8],['forja',12],['herois',8],['necro',8],['gigante',8],['conselho',8],['emboscada',8],['pinca',8],['navio',6],['dois',6],['live',6],['fim',12]];
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
const X={};
const keep={};
let RATE=1;
function stillAll(ids){for(const id of ids){const u=R.byId.get(id);if(u){u.order=null;u.path=null;u.cd=Math.max(u.cd||0,.3);}}}
function treeSpot(near){
  // walkable ground at the edge of a wood, between the castles
  const s=S(),T=s.tiles,MW=s.mw,MH=s.mh;let best=null,bs=-1;
  for(let y=4;y<MH-4;y+=2)for(let x=4;x<MW-4;x+=2){const i=y*MW+x;if(T[i]!==1&&T[i]!==2&&T[i]!==5)continue;let t=0;for(let j=-3;j<=3;j++)for(let k=-3;k<=3;k++)if(T[(y+j)*MW+x+k]===3)t++;
    const d=Math.hypot(x*32-near.x,y*32-near.y);const sc=t*10-d/40;if(t>=10&&t<=30&&sc>bs){bs=sc;best={x:x*32+16,y:y*32+16};}}
  return best||near;
}
function waterSpot(){
  const s=S(),T=s.tiles,MW=s.mw,MH=s.mh,c=W.c1;let best=null,bd=1e9;
  for(let y=3;y<MH-3;y++)for(let x=3;x<MW-3;x++){const i=y*MW+x;if(T[i]!==0)continue;let w=0,l=0;for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++){const v=T[(y+j)*MW+x+k];if(v===0)w++;else l++;}
    if(w<16||l<3)continue;const d=Math.hypot(x*32-c.x,y*32-c.y);if(d<bd){bd=d;best={x:x*32+16,y:y*32+16};}}
  return best;
}
const FJ_SEQ=[['armor','obsidiana'],['plume','fire'],['eyes','ouro'],['top','crown'],['aura','fire'],['base','archer'],['armor','ametista'],['aura','shadow'],['base','monk'],['hair','branco'],['top','halo'],['aura','holy']];
const SH={
  intro:{
    setup(){clearTr();hud(false);bars(110);dim(.5);const c=W.c1;camTo(c.x+40,c.y-40,1.0,1,true);},
    tick(u){const T4=4*BEAT;camTo(W.c1.x+40+u*30,W.c1.y-40,1.0+u*.03,.05);
      setText({kick:'ATUALIZAÇÃO',big:'REINO PEQUENO <i>2.3</i>',sub:'a maior de todas'});slam(u,T4,8*BEAT-.12);
      dim(u<T4?.5:.25);flash(u,T4,.28,.9);if(Math.abs(u-T4)<.04)shake(16,.03);}
  },
  forja:{
    setup(){clearTr();hud(false);bars(0);dim(0);const f=document.getElementById('b-forja');if(f)f.click();
      const n=document.getElementById('fj-name');if(n){n.value='Herói da Live';n.dispatchEvent(new Event('input',{bubbles:true}));}X.k=-1;
      const sh=document.querySelector('#ov-forja .sheet');if(sh)sh.style.zoom=innerWidth>innerHeight?1.42:1.2;dim(.3);},
    tick(u){const b=Math.floor(u/BEAT);
      if(b!==X.k&&b>=2){X.k=b;const st=FJ_SEQ[(b-2)%FJ_SEQ.length];const el=document.querySelector(`#fj-opts button[data-k="${st[0]}"][data-v="${st[1]}"]`);if(el)el.click();}
      setText({pos:'top',kick:'NOVO',big:'FORJA DE <i>HERÓIS</i>',sub:'crie um herói só seu'});slam(u,0,2.2*BEAT);},
    done(){const o=document.getElementById('ov-forja');if(o)o.hidden=true;dim(0);}
  },
  herois:{
    setup(){clearTr();hud(false);bars(80);dim(0);const p=W.open[0];X.p=p;
      {const s=S(),T=s.tiles,MW=s.mw,tx=Math.floor(p.x/32),ty=Math.floor(p.y/32);for(let y=ty-8;y<=ty+8;y++)for(let x=tx-14;x<=tx+14;x++){const i=y*MW+x;if(T[i]===3)T[i]=1;}
        for(const e of s.ents)if(!e.dead&&!e.tr&&R.DEF[e.kind].unit&&Math.hypot(e.x-p.x,e.y-p.y)<420)R.removeQuiet(e);}
      const H=['hchama','hrunico','hdruida','hsombra','hgelo','hanjo'],M=['necro','giant','skel','skelA','orc','skel'];X.ids=[];
      H.forEach((k,i)=>{const u=sp(k,1,p.x-250+i*100,p.y-40);u.face=1;X.ids.push(u.id);});
      M.forEach((k,i)=>{const u=sp(k,1,p.x-250+i*100,p.y+90);u.face=-1;X.ids.push(u.id);});
      ff(.3);cleanFx();stillAll(X.ids);camTo(p.x-230,p.y+20,1.9,1,true);},
    tick(u){stillAll(X.ids);const k=u/(8*BEAT);camTo(X.p.x-230+k*460,X.p.y+20,1.9,.08);
      setText({pos:'low',kick:'PERSONAGENS NOVOS',big:'HERÓIS E <em>MONSTROS</em>',sub:'feitos a partir da arte original'});slam(u,.2,8*BEAT-.1);}
  },
  necro:{nat:true,
    setup(){clearTr();hud(false);bars(80);const p=W.open[0];X.p=p;
      const B=[];for(let i=0;i<12;i++){const u=sp(i%3?'warrior':'archer',1,p.x-230+(i%4)*30,p.y-60+Math.floor(i/4)*45);rank(u,2);B.push(u.id);}
      const n=sp('necro',3,p.x+170,p.y);n.sumT=.5;X.n=n.id;const sk=[];for(let i=0;i<5;i++)sk.push(sp(i%2?'skel':'skelA',3,p.x+80+rnd(-30,30),p.y+rnd(-70,70)).id);
      attackMove(B,p.x+170,p.y);ff(.8);cleanFx();camTo(p.x,p.y,1.5,1,true);tint('rgba(60,255,90,.35)',.55);},
    tick(u){const c=centroid([X.n])||X.p;camTo((c.x+X.p.x)/2,c.y-10,1.5,.06);
      setText({pos:'low',kick:'CAPÍTULO 6',big:'MORVANA, A <i>NECROMANTE</i>',sub:'os mortos voltam a lutar'});slam(u,.3,8*BEAT-.1);}
  },
  gigante:{nat:true,
    setup(){clearTr();hud(false);bars(80);tint('transparent',0);const p=W.open[1]||W.open[0];X.p=p;
      const g=sp('giant',3,p.x+40,p.y);X.g=g.id;const B=[];for(let i=0;i<14;i++){const a=i/14*6.28,u=sp(['warrior','lancer','paladin'][i%3],1,p.x+40+Math.cos(a)*120,p.y+Math.sin(a)*80);rank(u,3);B.push(u.id);}
      attack(B,g);ff(.4);cleanFx();camTo(p.x+40,p.y-30,1.75,1,true);},
    tick(u){const g=R.byId.get(X.g);if(g&&g.atkT>.4&&!X.hit){X.hit=1;shake(14,.02);}if(g&&g.atkT<=0)X.hit=0;
      camTo(X.p.x+40,X.p.y-30,1.75-u*.03,.05);
      setText({pos:'low',kick:'CAPÍTULO 7',big:'O GIGANTE DE <i>PEDRA</i>',sub:'quebra muralhas com um golpe'});slam(u,.3,8*BEAT-.1);}
  },
  conselho:{nat:true,
    setup(){clearTr();hud(false);bars(110);const p=W.open[0];X.A=armies(p,14,14,300);attackMove(X.A.B,p.x+200,p.y);attackMove(X.A.R,p.x-200,p.y);ff(.6);camTo(p.x,p.y-20,1.1,1,true);dim(.62);},
    tick(u){const T=8*BEAT,n=Math.round(Math.min(1,u/(T*.8))**1.6*1000000);
      setText({kick:'CONSELHO DE GUERRA',big:`<i>${n.toLocaleString('pt-BR')}</i>`,sub:'planos avaliados numa partida',sub2:'pelo Mestre Rubro e pelos generais'});
      const v=overlay();v.tx.style.opacity=Math.min(1,u*4,(T-u)*6);v.big.style.transform='scale(1)';v.sub.style.opacity=1;v.sub2.style.opacity=Math.min(1,Math.max(0,u-1));}
  },
  emboscada:{nat:true,
    setup(){clearTr();hud(false);bars(80);dim(0);const t=treeSpot(W.open[0]);X.t=t;
      const Rd=[];for(let i=0;i<12;i++)Rd.push(sp(i%3?'warrior':'archer',2,t.x+rnd(-40,40),t.y+rnd(-30,30)).id);X.R=Rd;
      const B=[];for(let i=0;i<10;i++){const u=sp(i%2?'warrior':'lancer',1,t.x-420-(i%5)*30,t.y+150+Math.floor(i/5)*34);B.push(u.id);}X.B=B;
      moveTo(B,t.x+500,t.y+150,30,false);ff(.3);cleanFx();stillAll(Rd);camTo(t.x-120,t.y+70,1.45,1,true);},
    tick(u){const T4=4*BEAT,c=centroid(X.B)||X.t;
      if(u<T4){stillAll(X.R);camTo((c.x+X.t.x)/2,X.t.y+60,1.45,.06);setText({pos:'low',kick:'O MESTRE RUBRO ESPERA NA MATA',big:'',sub:''});const v=overlay();v.tx.style.opacity=Math.min(1,u*4);v.kick.style.opacity=1;}
      else{if(!X.go){X.go=1;attackMove(X.R,c.x,c.y);flash(0,0,.2,.6);shake(12,.025);}camTo(c.x,c.y-10,1.6,.08);
        setText({pos:'low',kick:'TEUTOBURGO, 9 d.C.',big:'EMBOSCADA NA <em>MATA</em>',sub:''});slam(u,T4,8*BEAT-.1);}}
  },
  pinca:{nat:true,
    setup(){clearTr();hud(false);bars(80);const p=W.open[0];X.p=p;
      const Rd=[];for(let i=0;i<12;i++)Rd.push(sp(i%3?'warrior':'archer',2,p.x+rnd(-60,60),p.y+rnd(-45,45)).id);X.R=Rd;
      const A=[],B=[];for(let i=0;i<9;i++){A.push(sp(i%3?'lancer':'warrior',1,p.x-330+rnd(-30,30),p.y-230+rnd(-30,30)).id);B.push(sp(i%3?'lancer':'warrior',1,p.x-330+rnd(-30,30),p.y+230+rnd(-30,30)).id);}
      X.A=A;X.B=B;moveTo(A,p.x-60,p.y-200,30,false);moveTo(B,p.x-60,p.y+200,30,false);ff(.2);cleanFx();stillAll(Rd);camTo(p.x-100,p.y,1.0,1,true);},
    tick(u){const T=3*BEAT;if(u<T)stillAll(X.R);else if(!X.go){X.go=1;attackMove(X.A,X.p.x+20,X.p.y-10);attackMove(X.B,X.p.x+20,X.p.y+10);shake(8,.015);}
      camTo(X.p.x-60+u*10,X.p.y,1.0+u*.03,.05);
      setText({pos:'low',kick:'CANAS, 216 a.C.',big:'ATAQUE EM <u>PINÇA</u>',sub:'o inimigo fechado pelos dois lados'});slam(u,T,8*BEAT-.1);}
  },
  navio:{nat:true,
    setup(){clearTr();hud(false);bars(80);const w=waterSpot();X.w=w;
      if(w){const sh=sp('warship',1,w.x,w.y);sh.face=1;X.s=sh.id;const shore=R.walkNear(w.x+150,w.y);for(let i=0;i<8;i++)sp(i%2?'warrior':'lancer',2,shore.x+rnd(-50,50),shore.y+rnd(-50,50));ff(.4);cleanFx();camTo(w.x+60,w.y-30,1.7,1,true);}},
    tick(u){if(X.w)camTo(X.w.x+60,X.w.y-30,1.7-u*.03,.05);setText({pos:'low',kick:'NOVO NO CAIS',big:'NAVIO DE <i>GUERRA</i>',sub:'flechas pesadas do mar'});slam(u,.2,6*BEAT-.1);}
  },
  dois:{nat:true,
    setup(){clearTr();hud(false);bars(110);const p=W.open[1]||W.open[0];X.A=armies(p,12,12,260);attackMove(X.A.B,p.x+150,p.y);attackMove(X.A.R,p.x-150,p.y);ff(.4);camTo(p.x,p.y-20,1.25,1,true);dim(.45);},
    tick(u){setText({kick:'NOVO',big:'DOIS <i>JOGADORES</i>',sub:'cada um no seu aparelho',sub2:'convite por código, sem servidor'});slam(u,.15,6*BEAT-.1);}
  },
  live:{nat:true,
    setup(){clearTr();hud(false,['toasts']);bars(0);dim(0);const p=W.open[0];X.A=armies(p,10,10,240);attackMove(X.A.B,p.x+140,p.y);attackMove(X.A.R,p.x-140,p.y);ff(.5);camTo(p.x,p.y-20,1.3,1,true);
      const L=R.LV;L.cfg.vote='manual';L.cfg.narr='jogo';R.lvVoteStart();X.k=-1;const vb=document.getElementById('vote');if(vb)vb.style.zoom=innerWidth>innerHeight?1.7:1.9;R.lvNarr('Os exércitos se chocam no meio do mapa! Que batalha, senhoras e senhores!',true);},
    tick(u){const b=Math.floor(u/(BEAT/2));const V=R.LV.vote;if(V&&b!==X.k){X.k=b;V.opts[b%3===2?0:1].n+=1+(b%2);R.lvVoteDraw();}
      setText({pos:'bottom',kick:'PARA LIVES',big:'O PÚBLICO <i>DECIDE</i>',sub:'votação · locutor · melhores momentos'});slam(u,.2,6*BEAT-.1);},
    done(){const v=document.getElementById('vote');if(v)v.hidden=true;R.LV.vote=null;R.LV.cfg.vote='off';R.LV.cfg.narr='off';const n=document.getElementById('narr');if(n)n.hidden=true;}
  },
  fim:{
    setup(){clearTr();hud(false);bars(110);dim(.55);camTo(W.c1.x,W.c1.y-30,1.1,1,true);},
    tick(u){camTo(W.c1.x+u*20,W.c1.y-30,1.1,.04);
      setText({kick:'JÁ DISPONÍVEL',big:'REINO <i>PEQUENO</i> 2.3',sub:'atualize pelo botão "Procurar atualização"',sub2:'braiantech-br.github.io/Reino-Pequeno · Braian Tech'});
      slam(u,.1,12*BEAT);flash(u,.1,.3,.8);if(Math.abs(u-.1)<.04)shake(18,.03);}
  },
};

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
