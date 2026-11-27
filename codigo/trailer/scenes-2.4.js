// Update video 2.4: the Memória do Rubro, the Red Kingdom that learns how you play. The Rubro watches a match, writes the
// dossier (the real screen of the game), evolves generation after generation, waits in the woods on your usual path, fields
// the troops that beat yours, Claude reads the dossier and writes its lessons, and the waves of the Defesa do Rei find your
// weak side. Same machinery as the 2.3 video. The memory shown is staged by the script (12 matches of a lancer player who
// comes from the right), like the Claude orders of the 2.1 and 2.2 trailers.
(()=>{
const R=window.__reino,FPS=30,BPM=128,BEAT=60/BPM;
const SHOTS=[['intro',8],['observa',10],['dossie',12],['evolui',8],['previsto',10],['contra',8],['claude',10],['defesa',6],['voce',6],['fim',12]];
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
#ask,#talk,#report,#goals,#banner,#sndpop,#ov-start,#ov-story,#ov-end,#ov-upd,#ov-confirm,#pausecard,#ov-council{display:none!important}
/* the Rubro's eye on the player's army */
#trv .scan2{position:absolute;z-index:2;border:4px solid ${RED};box-shadow:0 0 0 3px rgba(0,0,0,.5),0 0 34px rgba(255,74,54,.55);opacity:0;background:rgba(255,74,54,.06)}
#trv .scan2:before{content:"MESTRE RUBRO · ANALISANDO";position:absolute;left:-4px;top:-46px;font:700 26px "Pixelify Sans",sans-serif;letter-spacing:4px;color:#fff;background:${RED};padding:4px 12px;white-space:nowrap}
#trv .scan2 .ln{position:absolute;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,#ffd23a,transparent)}
#trv .tags{position:absolute;z-index:3;display:flex;flex-direction:column;gap:10px}
#trv .tag{font:700 34px "Pixelify Sans",sans-serif;color:#fff;background:rgba(10,9,16,.92);border-left:8px solid ${RED};padding:8px 18px;box-shadow:0 0 0 3px rgba(0,0,0,.5);white-space:nowrap;opacity:0}
#trv .tag b{color:#ffd23a}
/* evolution: the genes */
#trv .evo{position:absolute;left:50%;top:64%;transform:translateX(-50%);width:1500px;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;z-index:4;opacity:0}
#trv .evo span{background:rgba(10,9,16,.92);border:3px solid ${RED};border-radius:12px;padding:8px 16px;font:700 26px "Pixelify Sans",sans-serif;color:#fff;box-shadow:0 0 0 3px rgba(0,0,0,.45)}
#trv .evo b{font:400 44px/1 "Jersey 10",monospace;color:#ffd23a;margin-right:10px}
#trv .evo span.ch{border-color:#ffd23a;transform:scale(1.08)}
@media (orientation:portrait){#trv .evo{width:960px;top:60%}#trv .evo span{font-size:22px}#trv .tag{font-size:30px}}
#ov-lrn{background:rgba(6,8,14,.55)!important}`;
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
    '<div class="scan2"><i class="ln"></i></div><div class="tags"></div><div class="evo"></div>'+
    '<div class="tx p-center"><div class="kick"></div><div class="big"><span class="m"></span></div><div class="sub"></div><div class="sub2"></div></div><div class="bar bt"></div><div class="bar bb"></div><div class="flash"></div>';
  document.body.appendChild(d);
  const q=s=>d.querySelector(s);
  V={d,dim:q('.dim'),tint:q('.tint'),lines:q('.lines'),tx:q('.tx'),kick:q('.kick'),big:q('.big'),m:q('.m'),sub:q('.sub'),sub2:q('.sub2'),bt:q('.bt'),bb:q('.bb'),flash:q('.flash'),
    t2:q('.t2'),tb:q('.t2 .tb'),trr:q('.t2 .tr'),vs:q('.vs'),vsl:q('.vs-l'),vsr:q('.vs-r'),vsx:q('.vs-x'),sprL:q('.vs-l .vs-spr'),sprR:q('.vs-r .vs-spr'),
    think:{1:q('.think.k1'),2:q('.think.k2')},say:{1:q('.say.k1'),2:q('.say.k2')},pick:q('.pick'),cur:q('.pick .cur'),scan:q('.scan2'),sln:q('.scan2 .ln'),tags:q('.tags'),evo:q('.evo'),last:{}};
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
function cardsOff(){const v=overlay();v.scan.style.opacity=0;v.tags.style.opacity=0;v.evo.style.opacity=0;v.t2.style.opacity=0;v.vs.style.opacity=0;v.think[1].style.opacity=0;v.think[2].style.opacity=0;v.say[1].style.opacity=0;v.say[2].style.opacity=0;v.pick.style.opacity=0;v.lines.style.opacity=0;v.flash.style.opacity=0;}
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
function camApply(){cam.x+=(cam.tx-cam.x)*cam.k;cam.y+=(cam.ty-cam.y)*cam.k;cam.z+=(cam.tz-cam.z)*cam.k;R.cam.z=Math.min(3,cam.z*1.75*(innerHeight>innerWidth?.8:1));R.centerOn(cam.x,cam.y);}
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
// ---------------------------------------------------------------- the staged memory: twelve matches of a player who loves lancers and comes from the right
function stageMemory(){
  const L=R.lrnLoad();
  const heat=new Array(56).fill(0);
  // the usual path: from the blue castle, bending to the right, then back to the red castle
  for(let iu=0;iu<8;iu++){const u=-.1+(iu+.5)*.15;if(u<.12)continue;const v=.42*Math.sin(Math.PI*Math.min(1,u/.95));const iv=Math.max(0,Math.min(6,Math.floor((v+.7)/.2)));
    heat[iu*7+iv]+=.11;if(iv+1<7)heat[iu*7+iv+1]+=.03;if(iv>0)heat[iu*7+iv-1]+=.02;}
  heat[3*7+3]+=.02;heat[4*7+2]+=.015;
  const curve=[];for(let m=0;m<30;m++){const pp=Math.min(30,4+m*2.4),pa=m<5?2:m<9?3+m*.6:m===9?4:8+m*.9;curve.push([+pa.toFixed(1),+(m*.9).toFixed(1),+pp.toFixed(1)]);}
  const day=86400e3,now=Date.now();
  const H=[];const res=['lose','lose','win','lose','quit','lose','win','lose','lose','win','lose','win'];
  for(let i=0;i<12;i++)H.push({when:now-(12-i)*day*.8,diff:i<5?'normal':'dificil',res:res[i],dur:900+((i*137)%700),atk:440+((i*53)%120),nAtk:2+(i%3),fav:i%4===3?'warrior':'lancer',side:'pela direita',k1:40+i*6,l1:60+i*3,gen:i+1,fit:res[i]==='lose'?1.2:-.6,cl:i%3===2?1:0});
  Object.assign(L,{v:1,on:true,games:12,w:4,l:7,q:1,min:286,gen:13,sig:.1,
    dna:{pawns:2,rush:.38,army:.86,towers:2,harass:.64,siege:.42,tech:.3,gold:.04,risk:.46,care:.31},best:{dna:{},F:.9},
    P:{n:12,atkRelL:[150,120,160,140,135,145,130,150,140,125,145,140],atkRel:140,atkSd:42,noAtk:0,atkN:14,atkGap:260,dive:.55,v:.34,heat,
      mixAll:{lancer:.48,warrior:.22,archer:.17,scout:.08,monk:.05},
      mixE:{1:{warrior:.72,scout:.28},2:{warrior:.46,archer:.38,scout:.16},3:{lancer:.62,warrior:.18,archer:.13,monk:.07},4:{lancer:.52,paladin:.2,archer:.18,monk:.1}},
      eco:{food:.46,wood:.34,gold:.2},pawns:27,towers:1.1,walls:4,farms:9,ships:0,army:34,era2:205,era3:470,era4:830,b_barracks:95,b_archery:260,b_tower:640,
      raidK:3,vulnR:2.3,react:24,dipN:1.2,conq:.2,trade:.6,tax:2,hunt:{eco:2,mil:1,def:.5,army:4},curve},
    plans:{emboscada:{s:6.2,f:1.1},fingida:{s:3.6,f:1.2},guerrilha:{s:4.1,f:2.1},pinca:{s:2.2,f:1.4},assalto:{s:1,f:3.3},decapitar:{s:1.3,f:1.1}},
    lessons:[{t:now,by:'claude',txt:'Ele sempre vem pela direita com lanceiros, uns 2 minutos depois da trégua. Arqueiros e torre na direita antes disso.'},
      {t:now,by:'pc',txt:'Ele venceu com lanceiros atacando pela direita a partir de 7:20. Próxima: arqueiros prontos antes de 6:20.'},
      {t:now,by:'claude',txt:'Quando o exército dele sai, os aldeões do ouro ficam sozinhos: saquear nessa hora.'},
      {t:now,by:'pc',txt:'Ele responde aos saques em 24 s: dá tempo de matar uns 2 aldeões e sumir.'},
      {t:now,by:'pc',txt:'Vencemos em 16:40. O que mais funcionou: Emboscada na mata. Manter a pressão.'}],
    notes:'Agressivo e previsível: lanceiros pela direita logo depois da trégua; deixa os aldeões do ouro sem guarda.',
    next:'Arqueiros às 6:30, emboscada na mata da direita, saque no ouro quando o exército dele sair.',
    hist:H.reverse(),ids:[],surv:{n:3,side:[.3,.25,.05,.02,.03,.05,.1,.2],mix:{archer:.5,warrior:.3,lancer:.2},best:14}});
  R.lrnSave();
}
const TAGS=[['TROPAS','lanceiros 62%'],['ATAQUE','7:20, sempre'],['CAMINHO','pela direita'],['EXÉRCITO','14 soldados'],['FRAQUEZA','aldeões sem guarda']];
const GENES=[['Aldeões a mais',v=>(v>=0?'+':'')+Math.round(v),[0,2]],['Saques',v=>Math.round(v*100)+'%',[.3,.64]],['Torres a mais',v=>'+'+Math.round(v),[0,2]],['Cerco',v=>Math.round(v*100)+'%',[.3,.42]],['Ataque cedo',v=>Math.round(v*100)+'%',[0,.38]],['Exército mínimo',v=>'×'+v.toFixed(2).replace('.',','),[1,.86]],['Pressa de era',v=>(v>=0?'+':'')+Math.round(v*100)+'%',[0,.3]],['Coragem',v=>Math.round(v*100)+'%',[.5,.46]],['Cautela',v=>Math.round(v*100)+'%',[.25,.31]]];
function screenBox(ids){const z=R.cam.z;let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9,n=0;for(const id of ids){const u=R.byId.get(id);if(!u||u.dead)continue;n++;const sx=(u.x-R.cam.x)*z,sy=(u.y-R.cam.y)*z;x0=Math.min(x0,sx);y0=Math.min(y0,sy-40*z);x1=Math.max(x1,sx);y1=Math.max(y1,sy);}return n?{x0:x0-30,y0:y0-20,x1:x1+30,y1:y1+20}:null;}
function lrnScroll(y){const o=document.getElementById('ov-lrn');if(o)o.scrollTop=y;}
const SH={
  intro:{
    setup(){clearTr();hud(false);bars(110);dim(.5);const c=W.c2;camTo(c.x-40,c.y-40,1.0,1,true);},
    tick(u){const T4=4*BEAT;camTo(W.c2.x-40-u*30,W.c2.y-40,1.0+u*.03,.05);
      setText({kick:'ATUALIZAÇÃO',big:'REINO PEQUENO <i>2.4</i>',sub:'a IA que aprende com você'});slam(u,T4,8*BEAT-.12);
      dim(u<T4?.5:.25);flash(u,T4,.28,.9);if(Math.abs(u-T4)<.04)shake(16,.03);}
  },
  observa:{nat:true,
    setup(){clearTr();hud(false);bars(80);dim(0);const p=W.open[0];X.p=p;
      const B=[];for(let i=0;i<14;i++){const u=sp(i%7===3?'archer':i%5===4?'warrior':'lancer',1,p.x-420-(i%5)*34,p.y-60+Math.floor(i/5)*42);rank(u,i<3?3:1);B.push(u.id);}X.B=B;
      moveTo(B,p.x+600,p.y-40,30,false);ff(.4);cleanFx();camTo(p.x-260,p.y-30,1.5,1,true);},
    tick(u){const c=centroid(X.B)||X.p;camTo(c.x+60,c.y-20,1.5,.07);
      const v=overlay(),bx=screenBox(X.B);
      if(bx){bx.x0=Math.max(24,bx.x0);bx.x1=Math.min(innerWidth-24,bx.x1);}
      if(bx&&u>.3){v.scan.style.opacity=Math.min(1,(u-.3)*5);v.scan.style.left=bx.x0+'px';v.scan.style.top=bx.y0+'px';v.scan.style.width=(bx.x1-bx.x0)+'px';v.scan.style.height=(bx.y1-bx.y0)+'px';
        v.sln.style.top=((u*1.3)%1*100)+'%';
        v.tags.style.opacity=1;const port=innerHeight>innerWidth;v.tags.style.left=(port?Math.max(40,bx.x0):Math.min(innerWidth-560,bx.x1+40))+'px';v.tags.style.top=(port?bx.y1+40:Math.max(120,bx.y0))+'px';
        const H=TAGS.map(([a,b])=>`<div class="tag">${a}: <b>${b}</b></div>`).join('');if(v.last.tags!==H){v.last.tags=H;v.tags.innerHTML=H;}
        [...v.tags.children].forEach((t,i)=>{const a=u-(1.2+i*1.25)*BEAT;t.style.opacity=clamp(a*6,0,1);t.style.transform=`translateX(${(1-ease(a*5))*40}px)`;});}
      setText({pos:'top',kick:'PARTIDA 1',big:'ELE <em>OBSERVA</em>',sub:'cada tropa, cada horário, cada caminho'});slam(u,.1,10*BEAT-.1);}
  },
  dossie:{
    setup(){clearTr();hud(false);bars(0);dim(.2);R.lrnShow();const sh=document.querySelector('#ov-lrn .sheet');if(sh)sh.style.zoom=innerWidth>innerHeight?1.3:1.25;lrnScroll(0);},
    tick(u){const T=12*BEAT,k=ease(Math.max(0,(u-2.2*BEAT)/(T-3*BEAT)));const o=document.getElementById('ov-lrn'),max=o?o.scrollHeight*.52:900;lrnScroll(Math.round(k*max));
      dim(.6*clamp((2.6*BEAT-u)/(.4*BEAT),0,1));
      setText({pos:'center',kick:'NOVO NO MENU',big:'MEMÓRIA DO <em>RUBRO</em>',sub:'um dossiê sobre o seu jeito de jogar'});slam(u,.05,2.4*BEAT);},
    done(){document.getElementById('ov-lrn').hidden=true;dim(0);}
  },
  evolui:{nat:true,
    setup(){clearTr();hud(false);bars(110);const p=W.open[1]||W.open[0];X.A=armies(p,12,12,280);attackMove(X.A.B,p.x+150,p.y);attackMove(X.A.R,p.x-150,p.y);ff(.6);camTo(p.x,p.y-20,1.2,1,true);dim(.62);X.g=0;},
    tick(u){const T=8*BEAT,g=Math.min(13,1+Math.floor(u/(T*.72)*12)),k=Math.min(1,u/(T*.72));
      if(g!==X.g){X.g=g;X.ch=Math.floor(Math.random()*GENES.length);if(g>1)shake(3,.004);}
      setText({kick:'EVOLUÇÃO',big:`GERAÇÃO <i>${g}</i>`,sub:'guarda o que funcionou e testa algo novo'});
      const v=overlay();v.tx.style.opacity=Math.min(1,u*4,(T-u)*6);v.big.style.transform=`scale(${(1+.06*Math.exp(-((u*12)%1)*6)).toFixed(3)})`;v.sub.style.opacity=1;v.tx.className='tx p-top';
      v.evo.style.opacity=Math.min(1,Math.max(0,(u-.4)*4),(T-u)*6);
      const H=GENES.map(([n,f,[a,b]],i)=>{const w=a+(b-a)*k+(g<13?Math.sin(g*1.7+i)*(b-a)*.25:0);return `<span class="${i===X.ch&&g<13?'ch':''}"><b>${f(w)}</b>${n}</span>`;}).join('');if(v.last.evo!==H){v.last.evo=H;v.evo.innerHTML=H;}}
  },
  previsto:{
    setup(){clearTr();hud(false);bars(80);dim(0);const t=treeSpot(W.open[0]);X.t=t;
      const Rd=[];for(let i=0;i<13;i++)Rd.push(sp(i%3?'archer':'warrior',2,t.x+rnd(-40,40),t.y+rnd(-30,30)).id);X.R=Rd;
      // the blue army walks straight past the wood where red waits (its usual path)
      const st=R.walkNear(t.x-300,t.y+60);X.st=st;
      const B=[];for(let i=0;i<12;i++){const u=sp(i%4===3?'warrior':'lancer',1,st.x-(i%4)*30,st.y-40+Math.floor(i/4)*34);B.push(u.id);}X.B=B;
      moveTo(B,t.x+40,t.y+30,40,false);ff(.3);cleanFx();stillAll(Rd);camTo(t.x-150,t.y+20,1.45,1,true);
      const s=overlay().say[2];s.querySelector('b').textContent='Mestre Rubro';},
    tick(u){const T4=4*BEAT,c=centroid(X.B)||X.t;
      sayCard(2,'Na hora de sempre, pelo lado de sempre. Eu estava esperando você.',.2,T4-.08,u);
      if(u<T4){stillAll(X.R);camTo((c.x+X.t.x)/2,(c.y+X.t.y)/2,1.45,.06);setText({pos:'top',kick:'PARTIDA 12',big:'',sub:''});const v=overlay();v.tx.style.opacity=Math.min(1,u*4);v.kick.style.opacity=1;}
      else{if(!X.go){X.go=1;X.R.forEach((id,i)=>{const b=R.byId.get(X.B[i%X.B.length]);if(b&&!b.dead)attack([id],b);});attackMove(X.B,X.t.x,X.t.y);flash(0,0,.2,.6);shake(12,.025);}
        if(Math.floor(u*2)!==X.re){X.re=Math.floor(u*2);for(const id of X.R){const e=R.byId.get(id);if(e&&!e.dead&&!e.order){const b=X.B.map(q=>R.byId.get(q)).find(q=>q&&!q.dead);if(b)attack([id],b);}}}
        const r=centroid(X.R)||X.t;camTo((c.x+r.x)/2,(c.y+r.y)/2-10,1.4,.08);
        setText({pos:'low',kick:'EMBOSCADA NO SEU CAMINHO DE SEMPRE',big:'ELE JÁ <em>SABIA</em>',sub:''});slam(u,T4,10*BEAT-.1);}}
  },
  contra:{
    setup(){clearTr();hud(false);bars(80);const p=W.open[1]||W.open[0];X.p=p;
      const Rd=[];for(let i=0;i<14;i++){const u=sp(i%5===4?'warrior':'archer',2,p.x+140+(i%5)*30,p.y-90+Math.floor(i/5)*44);rank(u,2);Rd.push(u.id);}X.R=Rd;
      const B=[];for(let i=0;i<12;i++){const u=sp('lancer',1,p.x-380-(i%4)*32,p.y-80+Math.floor(i/4)*44);rank(u,1);B.push(u.id);}X.B=B;
      attackMove(B,p.x+160,p.y);ff(.2);cleanFx();stillAll(Rd);camTo(p.x-40,p.y-10,1.35,1,true);},
    tick(u){if(u<1.4*BEAT)stillAll(X.R);else if(!X.go){X.go=1;for(const id of X.R){const e=R.byId.get(id);if(e)e.order=null;}}
      const c=centroid(X.B)||X.p,r=centroid(X.R)||X.p;camTo((c.x+r.x)/2,(c.y+r.y)/2-10,innerHeight>innerWidth?1.05:1.35,.05);
      setText({pos:'top',kick:'ARQUEIROS CONTRA OS SEUS LANCEIROS',big:'PRONTOS <i>ANTES</i>',sub:'as tropas que vencem as suas, antes de você chegar'});slam(u,.2,8*BEAT-.1);}
  },
  claude:{
    setup(){clearTr();hud(false);bars(110);const p=W.open[0];camTo(W.c2.x-60,W.c2.y-30,1.15,1,true);dim(.62);},
    tick(u){const T=10*BEAT,txt='Dossiê: 12 partidas. Ele vem pela direita com lanceiros, uns 2 minutos depois da trégua, e deixa os aldeões do ouro sem guarda.',
      tp=typed(txt,u,.4,62),O=['arqueiros prontos às 6:30','emboscada na mata da direita','saque no ouro quando ele sair','lição guardada para a próxima'];
      const t0=.4+txt.length/62+.2,oa=O.map((x,i)=>Math.max(0,u-(t0+i*.55)));
      think(2,{u,text:tp.s,cursor:!tp.done,st:oa[3]>0?'LIÇÃO GUARDADA':'lendo o dossiê…',ok:oa[3]>0,orders:O,oa});
      const port=innerHeight>innerWidth;
      setText({pos:port?'top':'low',kick:'O CLAUDE TAMBÉM',big:'CLAUDE <em>APRENDE</em>',sub:'lê o dossiê e escreve as próprias lições'});slam(u,.1,T-.1);}
  },
  defesa:{nat:true,
    setup(){clearTr();hud(false);bars(80);const c=W.c1;X.c=c;
      // the wave comes from the side with open land and no towers; the towers stand on the other side
      let best=null,bs=-1e9;for(let k=0;k<16;k++){const a=k/16*Math.PI*2,p={x:c.x+Math.cos(a)*620,y:c.y+Math.sin(a)*500},w=R.walkNear(p.x,p.y),d=Math.hypot(w.x-p.x,w.y-p.y);const sc=-d-Math.hypot(w.x-W.c2.x,w.y-W.c2.y)*.02;if(sc>bs){bs=sc;best={a,w};}}
      const from=best.w;X.f=from;
      let nt=0;for(const r of[260,320,380,440])for(const da of[Math.PI,Math.PI*.82,Math.PI*1.18,Math.PI*.7,Math.PI*1.3]){if(nt>=3)break;const a=best.a+da,tx=Math.round((c.x+Math.cos(a)*r)/32),ty=Math.round((c.y+Math.sin(a)*r*.8)/32);
        if(R.canPlace(1,'tower',tx,ty)){const b=R.placeBuilding(1,'tower',tx,ty,[]);if(b){b.built=true;b.prog=1;b.hp=b.maxhp;tr.push(b.id);nt++;}}}
      X.nt=nt;
      const Rd=[];for(let i=0;i<14;i++)Rd.push(sp(['warrior','lancer','archer','warrior'][i%4],2,from.x+rnd(-70,70),from.y+rnd(-50,50)).id);X.R=Rd;
      attackMove(Rd,c.x,c.y+40);ff(.4);cleanFx();camTo((from.x+c.x)/2,(from.y+c.y)/2-20,1.0,1,true);tint('rgba(255,60,40,.35)',.5);},
    tick(u){const m=centroid(X.R)||X.f;camTo((m.x+X.c.x)/2,(m.y+X.c.y)/2-20,1.1,.05);
      setText({pos:'top',kick:'DEFESA DO REI',big:'AS ONDAS <em>APRENDEM</em>',sub:'chegam pelo lado que você defende menos'});slam(u,.15,6*BEAT-.1);},
    done(){tint('transparent',0);}
  },
  voce:{nat:true,
    setup(){clearTr();hud(false);bars(110);const p=W.open[0];X.A=armies(p,16,16,220);attackMove(X.A.B,p.x+120,p.y);attackMove(X.A.R,p.x-120,p.y);ff(.7);camTo(p.x,p.y-20,1.3,1,true);dim(.35);},
    tick(u){const b=Math.floor(u/(2*BEAT));if(b!==X.b){X.b=b;shake(10,.02);}
      setText({kick:'A CADA PARTIDA',big:'MAIS <em>DIFÍCIL</em>',sub:'para vencer, você vai ter que surpreendê-lo'});slam(u,.1,6*BEAT-.1);}
  },
  fim:{
    setup(){clearTr();hud(false);bars(110);dim(.55);camTo(W.c2.x,W.c2.y-30,1.1,1,true);},
    tick(u){camTo(W.c2.x-u*20,W.c2.y-30,1.1,.04);
      setText({kick:'JÁ DISPONÍVEL',big:'REINO <i>PEQUENO</i> 2.4',sub:'atualize pelo botão "Procurar atualização"',sub2:'braiantech-br.github.io/Reino-Pequeno · Braian Tech'});
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
function prep24(seed){stageMemory();const r=prep(seed);r.lrn={games:R.lrnLoad().games,gen:R.lrnLoad().gen,on:!!(S().lrn&&S().lrn.on)};return r;}
window.TR={prep:prep24,frame,TOTAL,FPS,BEAT,SHOTS,START};
})();
