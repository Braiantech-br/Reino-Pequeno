// ================================================================ Lives: the audience votes, a commentator narrates, the best moments become a video
// Votação do público: every few minutes three events go up on screen; the chat of a Twitch channel votes with !1 !2 !3 (read
// anonymously, nothing is sent), or the streamer presses 1 2 3 for the votes of any other chat. Locutor: a commentator calls the
// battles out loud (the game's own lines, or Claude's when Claude is connected). Melhores momentos: the battles are recorded from
// the screen while they happen, and at the end they are joined into one short video (horizontal or vertical) to download.
const LV={cfg:{vote:'off',chan:'',every:180,narr:'off',rec:false},ws:null,vote:null,next:0,narrT:0,said:{},clips:[],rec:null,seen:{}};
function lvLoad(){try{Object.assign(LV.cfg,JSON.parse(localStorage.getItem('rp.live')||'{}'));}catch(e){}}
function lvSave(){try{localStorage.setItem('rp.live',JSON.stringify(LV.cfg));}catch(e){}}
const KN=t=>t===1?'Reino Azul':'Reino Vermelho';
// ---- the events the audience can pick
const LV_EVENTS=[
  {k:'fogo',txt:t=>`Chuva de fogo no ${KN(t)}`,go:t=>{const A=S.ents.filter(e=>!e.dead&&e.team===t&&DEF[e.kind].mil&&DEF[e.kind].unit);const c=centroid(A)||castleOf(t);if(!c)return;
    for(let i=0;i<5;i++){const x=c.x+(Math.random()-.5)*180,y=c.y+(Math.random()-.5)*120;FX.booms.push({x,y,t:-i*.25,s:1.2});forNear(x,y,70,e=>{if(!e.dead&&e.team===t&&DEF[e.kind].unit&&hyp(e.x-x,e.y-y)<70)damage(e,38);});}playSfx('meteor');}},
  {k:'merc',txt:t=>`4 mercenários para o ${KN(t)}`,go:t=>{const c=castleOf(t);if(!c)return;for(let i=0;i<4;i++){const p=openSpot(c);spawnUnit('merc',t,p.x,p.y);}}},
  {k:'ouro',txt:t=>`300 de ouro para o ${KN(t)}`,go:t=>{S.teams[t].res.gold+=300;}},
  {k:'cura',txt:t=>`Bênção: o ${KN(t)} cura todo o exército`,go:t=>{for(const e of S.ents)if(!e.dead&&e.team===t&&DEF[e.kind].unit)e.hp=e.maxhp;}},
  {k:'bandidos',txt:t=>`Bandidos atacam o ${KN(t)}`,go:t=>{const c=castleOf(t);if(!c)return;const p=walkNear(c.x+(Math.random()<.5?-1:1)*9*TS,c.y+6*TS);for(let i=0;i<6;i++){const u=spawnUnit(i%3?'bandit':'banditA',3,p.x+i*14,p.y);u.order={type:'move',x:c.x,y:c.y+40,amove:true};}}},
  {k:'esqueletos',txt:t=>`Os mortos se levantam perto do ${KN(t)}`,go:t=>{const A=S.ents.filter(e=>!e.dead&&e.team===t&&DEF[e.kind].unit);const c=centroid(A)||castleOf(t);if(!c)return;for(let i=0;i<6;i++){const p=walkNear(c.x+(Math.random()-.5)*220,c.y+(Math.random()-.5)*160);const u=spawnUnit(i%3?'skel':'skelA',3,p.x,p.y);u.order={type:'move',x:c.x,y:c.y,amove:true};}playSfx('summon');}},
  {k:'gigante',txt:()=>'O Gigante de Pedra acorda no meio do mapa!',both:true,go:()=>{const p=walkNear(MW*TS/2,MH*TS/2);const g=spawnUnit('giant',3,p.x,p.y);const c=castleOf(Math.random()<.5?1:2);if(c)g.order={type:'move',x:c.x,y:c.y,amove:true};}},
  {k:'tempestade',txt:()=>'Tempestade: todos ficam lentos por 20 segundos',both:true,go:()=>{for(const e of S.ents)if(!e.dead&&DEF[e.kind].unit)e.slowT=Math.max(e.slowT||0,20);}},
];
function lvOn(){return S&&ui.started&&!S.over&&!S.editor&&S.mode==='skirmish';}
function lvVoteStart(){
  const pool=LV_EVENTS.slice().sort(()=>Math.random()-.5).slice(0,3);
  const opts=pool.map(ev=>{const t=ev.both?0:Math.random()<.5?1:2;return {ev,t,txt:ev.txt(t),n:0};});
  LV.vote={opts,until:S.t+30,voters:new Set()};
  lvVoteDraw();$('vote').hidden=false;
  if(S.cfg&&S.cfg.watch)watchFeed(0,'event','Votação do público: '+opts.map((o,i)=>`${i+1} · ${o.txt}`).join(' | '));
}
function lvVoteDraw(){
  const V=LV.vote;if(!V)return;const tot=V.opts.reduce((a,o)=>a+o.n,0)||1;
  $('vote').innerHTML=`<b>Votação do público</b><small>${LV.cfg.vote==='twitch'&&LV.cfg.chan?`Digite !1, !2 ou !3 no chat de twitch.tv/${esc(LV.cfg.chan)}`:'Votem no chat! (1, 2 ou 3)'} · ${Math.max(0,Math.ceil(V.until-S.t))} s</small>`+
    V.opts.map((o,i)=>`<div class="vo"><i style="width:${Math.round(o.n/tot*100)}%"></i><span><kbd>${i+1}</kbd>${esc(o.txt)}</span><em>${o.n}</em></div>`).join('');
}
function lvVoteAdd(i,who){const V=LV.vote;if(!V||!V.opts[i])return;if(who){if(V.voters.has(who))return;V.voters.add(who);}V.opts[i].n++;lvVoteDraw();}
function lvVoteEnd(){
  const V=LV.vote;LV.vote=null;$('vote').hidden=true;if(!V||!lvOn())return;
  const best=V.opts.slice().sort((a,b)=>b.n-a.n||Math.random()-.5)[0];
  best.ev.go(best.t);
  banner('O público decidiu',best.txt,`${best.n} ${best.n===1?'voto':'votos'}.`,false);
  if(S.cfg&&S.cfg.watch)watchFeed(0,'event',`O público escolheu: ${best.txt}.`);
  lvNarr(`O público decidiu: ${best.txt}!`,true);
}
// Twitch chat, read anonymously (the "justinfan" login of Twitch's own web chat): nothing is ever sent to the channel
function lvTwitch(){
  if(LV.ws){try{LV.ws.close();}catch(e){}LV.ws=null;}
  const ch=(LV.cfg.chan||'').toLowerCase().replace(/[^a-z0-9_]/g,'');if(LV.cfg.vote!=='twitch'||!ch)return;
  try{
    const ws=new WebSocket('wss://irc-ws.chat.twitch.tv:443');LV.ws=ws;
    ws.onopen=()=>{ws.send('PASS SCHMOOPIIE');ws.send('NICK justinfan'+(10000+((Math.random()*80000)|0)));ws.send('JOIN #'+ch);};
    ws.onmessage=ev=>{for(const line of String(ev.data).split('\r\n')){
      if(line.startsWith('PING')){ws.send('PONG :tmi.twitch.tv');continue;}
      const m=line.match(/^:([^!]+)![^ ]+ PRIVMSG #[^ ]+ :(.*)$/);if(!m)continue;
      const v=m[2].trim().match(/^!?([1-3])\b/);if(v)lvVoteAdd(+v[1]-1,m[1]);}};
    ws.onclose=()=>{if(LV.ws===ws)LV.ws=null;};
  }catch(e){toast('Não consegui ligar no chat da Twitch.','warn');}
}
// ---- the commentator
function lvNarr(text,force){
  if(LV.cfg.narr==='off'||!text)return;
  if(!force&&S.t-LV.narrT<7)return;LV.narrT=S.t;
  const el=$('narr');el.textContent='🎙 '+text;el.hidden=false;clearTimeout(LV.narrHide);LV.narrHide=setTimeout(()=>{el.hidden=true;},4500+text.length*40);
  voxSpeak(text,'locutor',false,3,7);
}
const LV_PLACE=(x,y)=>{const c1=castleOf(1),c2=castleOf(2);if(c1&&hyp(x-c1.x,y-c1.y)<10*TS)return 'perto do castelo azul';if(c2&&hyp(x-c2.x,y-c2.y)<10*TS)return 'perto do castelo vermelho';
  const T=(S.towns||[]).find(t=>hyp(t.x-x,t.y-y)<9*TS);return T?`perto da vila ${T.name}`:'no meio do mapa';};
function lvWatch(){
  // what is going on, every two seconds: big fights, heavy losses, eras, castles on fire
  const lost={1:S.teams[1].stats.lost,2:S.teams[2].stats.lost},prev=LV.seen.lost||lost;LV.seen.lost=lost;
  const fights=[];for(const e of S.ents){if(e.dead||!(e.team===1||e.team===2)||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;if(e.atkT>0)fights.push(e);}
  let score=0;
  if(fights.length>=8){const c=centroid(fights),n1=fights.filter(e=>e.team===1).length,n2=fights.length-n1;score=fights.length;
    if(n1>=3&&n2>=3&&S.t-(LV.said.fight||-99)>40){LV.said.fight=S.t;lvNarr(LV_LINES.fight[(Math.random()*LV_LINES.fight.length)|0].replace('{p}',LV_PLACE(c.x,c.y)).replace('{a}',n1).replace('{b}',n2));}}
  for(const t of[1,2]){const d=lost[t]-prev[t];score+=d*3;if(d>=5&&S.t-(LV.said['m'+t]||-99)>25){LV.said['m'+t]=S.t;lvNarr(`Que estrago! O ${KN(t)} perdeu ${d} soldados em segundos!`);}
    const era=S.teams[t].era;if(LV.seen['e'+t]&&era>LV.seen['e'+t])lvNarr(`O ${KN(t)} chegou à ${ERAS[era].name}!`,true);LV.seen['e'+t]=era;
    const c=castleOf(t);if(c&&c.hp<c.maxhp*.5&&!LV.said['c'+t]){LV.said['c'+t]=S.t;lvNarr(`O castelo ${t===1?'azul':'vermelho'} está pegando fogo! Metade das muralhas já caiu!`,true);}}
  return score;
}
const LV_LINES={fight:['E começa a pancadaria {p}! {a} azuis contra {b} vermelhos!','Os exércitos se chocam {p}! Que batalha, senhoras e senhores!','Batalha {p}: {a} contra {b}, ninguém recua!']};
// Claude as the commentator: one line every 40 seconds from a short summary of the match
function lvClaudeNarr(){
  if(LV.cfg.narr!=='claude'||!clVia()||LV.busy||S.t-(LV.clT||-99)<40)return;LV.clT=S.t;LV.busy=true;
  const sum={tempo:fmt(S.t),azul:{era:S.teams[1].era,abates:S.teams[1].stats.kills,perdas:S.teams[1].stats.lost,plano:warNow(1)&&warNow(1).plano},vermelho:{era:S.teams[2].era,abates:S.teams[2].stats.kills,perdas:S.teams[2].stats.lost,plano:warNow(2)&&warNow(2).plano},
    castelos:{azul:castleOf(1)?Math.round(castleOf(1).hp/castleOf(1).maxhp*100)+'%':'caiu',vermelho:castleOf(2)?Math.round(castleOf(2).hp/castleOf(2).maxhp*100)+'%':'caiu'}};
  const prompt='Você é o locutor animado de uma transmissão ao vivo de Reino Pequeno, um jogo de estratégia medieval: o Reino Azul contra o Reino Vermelho. Narre o momento em UMA frase curta (até 140 caracteres), em português do Brasil, empolgante como um locutor de futebol, sem inventar nomes. Responda só com JSON {"fala":"..."}.\nSituação: '+JSON.stringify(sum);
  clAsk(prompt,2).then(o=>{LV.busy=false;const f=o&&String(o.fala||'').trim().slice(0,160);if(f&&lvOn())lvNarr(f,true);},()=>{LV.busy=false;});
}
// ---- the best moments: record the screen while a fight goes on, keep the best clips, join them at the end
function lvRecOk(){return LV.cfg.rec&&typeof MediaRecorder==='function'&&cv.captureStream;}
function lvRecMime(){for(const m of['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'])try{if(MediaRecorder.isTypeSupported(m))return m;}catch(e){}return '';}
function lvRecStream(c){
  const st=c.captureStream(30);
  try{if(SND.ac&&SND.master){if(!LV.dst){LV.dst=SND.ac.createMediaStreamDestination();SND.master.connect(LV.dst);}for(const t of LV.dst.stream.getAudioTracks())st.addTrack(t);}}catch(e){}
  return st;
}
function lvRecTick(score){
  if(!lvRecOk()||!lvOn())return;
  const R=LV.rec;
  if(!R&&score>=10){
    try{const mime=lvRecMime(),mr=new MediaRecorder(lvRecStream(cv),mime?{mimeType:mime,videoBitsPerSecond:2200000}:undefined),parts=[];
      LV.rec={mr,parts,t0:S.t,score:0,calm:0,at:fmt(S.t),mime:mr.mimeType||mime};mr.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data);};mr.start(1000);}catch(e){LV.cfg.rec=false;}
    return;
  }
  if(R){R.score+=score;R.calm=score<6?R.calm+2:0;if(R.calm>=6||S.t-R.t0>22)lvRecStop();}
}
function lvRecStop(){
  const R=LV.rec;LV.rec=null;if(!R)return;
  R.mr.onstop=()=>{const blob=new Blob(R.parts,{type:R.mime||'video/webm'});LV.clips.push({blob,score:R.score,at:R.at,mime:R.mime});LV.clips.sort((a,b)=>b.score-a.score);LV.clips.length=Math.min(LV.clips.length,5);};
  try{R.mr.stop();}catch(e){}
}
// joins the clips into one video, with a title and the time of each fight (it plays them once, so it takes as long as the video)
async function lvReel(vertical,status){
  const clips=LV.clips.slice().sort((a,b)=>a.at.localeCompare(b.at,undefined,{numeric:true}));if(!clips.length)return null;
  const W=vertical?720:1280,H=vertical?1280:720,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  const mime=lvRecMime(),mr=new MediaRecorder(c.captureStream(30),mime?{mimeType:mime,videoBitsPerSecond:3000000}:undefined),parts=[];
  mr.ondataavailable=e=>{if(e.data&&e.data.size)parts.push(e.data);};mr.start(1000);
  const title=(t,s,ms)=>new Promise(r=>{const t0=performance.now();const f=()=>{const k=(performance.now()-t0)/ms;g.fillStyle='#1b2a1e';g.fillRect(0,0,W,H);g.fillStyle='#ffe9a8';g.textAlign='center';g.font=`${vertical?64:72}px "Jersey 10", sans-serif`;g.fillText(t,W/2,H/2-10);g.font=`${vertical?34:36}px "Jersey 10", sans-serif`;g.fillStyle='#fff6dd';g.fillText(s,W/2,H/2+44);if(k<1)requestAnimationFrame(f);else r();};f();});
  await title('Reino Pequeno','Melhores momentos',1800);
  for(let i=0;i<clips.length;i++){
    status&&status(`Juntando a batalha ${i+1} de ${clips.length}…`);
    const v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(clips[i].blob);
    await new Promise(r=>{v.onloadeddata=r;v.onerror=r;setTimeout(r,3000);});
    try{await v.play();}catch(e){}
    await new Promise(r=>{const f=()=>{if(v.ended||v.error||v.paused&&v.currentTime>0){r();return;}
      const vw=v.videoWidth||W,vh=v.videoHeight||H,s=Math.max(W/vw,H/vh);g.fillStyle='#000';g.fillRect(0,0,W,H);g.drawImage(v,(W-vw*s)/2,(H-vh*s)/2,vw*s,vh*s);
      g.fillStyle='rgba(0,0,0,.45)';g.fillRect(0,H-(vertical?120:70),W,vertical?120:70);g.fillStyle='#ffe9a8';g.textAlign='left';g.font=`${vertical?44:38}px "Jersey 10", sans-serif`;g.fillText(`Batalha aos ${clips[i].at}`,24,H-(vertical?50:24));
      requestAnimationFrame(f);};f();setTimeout(r,26000);});
    URL.revokeObjectURL(v.src);
  }
  await title(S&&S.over==='win'?'Vitória azul!':S&&S.over?'Vitória vermelha!':'Reino Pequeno','braiantech.com.br',1600);
  await new Promise(r=>{mr.onstop=r;mr.stop();});
  return new Blob(parts,{type:mr.mimeType||mime||'video/webm'});
}
async function lvMakeReel(vertical){
  const st=$('lv-reel-st');if(LV.rec)lvRecStop();await new Promise(r=>setTimeout(r,400));
  if(!LV.clips.length){st.textContent='Nenhuma batalha foi gravada nesta partida (ligue "Gravar melhores momentos" em Som e avisos antes de jogar).';return;}
  st.textContent='Montando o vídeo… (leva o tempo do próprio vídeo)';
  const blob=await lvReel(vertical,t=>{st.textContent=t;});if(!blob){st.textContent='Não consegui montar o vídeo.';return;}
  const url=URL.createObjectURL(blob),ext=(blob.type||'').includes('mp4')?'mp4':'webm',a=document.createElement('a');a.href=url;a.download=`ReinoPequeno-melhores-momentos${vertical?'-vertical':''}.${ext}`;document.body.appendChild(a);a.click();a.remove();
  st.textContent=`Vídeo pronto (${(blob.size/1048576).toFixed(1)} MB). Se o download não abriu, toque de novo.`;
}
// ---- every frame (cheap) and every two seconds
function lvTick(){
  if(!lvOn()){if(LV.vote){LV.vote=null;$('vote').hidden=true;}return;}
  if(LV.vote){if(S.t>=LV.vote.until)lvVoteEnd();else if(((S.t*4)|0)!==LV.vDraw){LV.vDraw=(S.t*4)|0;lvVoteDraw();}}
  else if(LV.cfg.vote!=='off'&&S.t>=Math.max(LV.next,S.diff.peace*.5)&&S.t>60){LV.next=S.t+LV.cfg.every;lvVoteStart();}
  LV.tick=(LV.tick||0)+1;if(LV.tick%120)return;   // about every two seconds
  const sc=lvWatch();lvRecTick(sc);lvClaudeNarr();
}
function lvReset(){LV.vote=null;LV.next=0;LV.said={};LV.seen={};LV.clips=[];if(LV.rec){try{LV.rec.mr.stop();}catch(e){}LV.rec=null;}$('vote').hidden=true;$('narr').hidden=true;}
{
  lvLoad();
  VPROF.locutor=VPROF.king||VPROF.engineer;
  const el=id=>document.getElementById(id),sync=()=>{
    for(const r of document.querySelectorAll('input[name="lvvote"]'))r.checked=r.value===LV.cfg.vote;
    for(const r of document.querySelectorAll('input[name="lvnarr"]'))r.checked=r.value===LV.cfg.narr;
    el('lv-chan').value=LV.cfg.chan||'';el('lv-chanrow').hidden=LV.cfg.vote!=='twitch';el('lv-rec').checked=!!LV.cfg.rec;
  };
  sync();
  for(const r of document.querySelectorAll('input[name="lvvote"]'))r.addEventListener('change',()=>{LV.cfg.vote=r.value;lvSave();sync();lvTwitch();});
  for(const r of document.querySelectorAll('input[name="lvnarr"]'))r.addEventListener('change',()=>{LV.cfg.narr=r.value;lvSave();});
  el('lv-chan').addEventListener('change',()=>{LV.cfg.chan=el('lv-chan').value.trim().replace(/^.*twitch\.tv\//,'').replace(/^#/,'');lvSave();lvTwitch();});
  el('lv-rec').addEventListener('change',()=>{LV.cfg.rec=el('lv-rec').checked;lvSave();if(LV.cfg.rec&&!(typeof MediaRecorder==='function'&&cv.captureStream))toast('Este navegador não grava vídeo. Use o Chrome, o Edge ou o Firefox.','warn');});
  el('lv-reel-h').addEventListener('click',()=>lvMakeReel(false));
  el('lv-reel-v').addEventListener('click',()=>lvMakeReel(true));
  document.addEventListener('keydown',ev=>{if(!LV.vote||ev.target&&/INPUT|TEXTAREA/.test(ev.target.tagName))return;const n=+ev.key;if(n>=1&&n<=3){lvVoteAdd(n-1);ev.stopPropagation();}},true);
  if(LV.cfg.vote==='twitch')lvTwitch();
}
