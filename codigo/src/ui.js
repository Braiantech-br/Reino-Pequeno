// ================================================================ UI: HUD, panel, input, sound, loop
const $=id=>document.getElementById(id);
const ui={sel:[],placing:null,ghost:null,targeting:null,paused:false,started:false,mouse:{x:0,y:0,in:false},drag:null,actKey:'',alarmT:0,speed:1,touchPlace:false,lastClick:null,pan:null,lastAlarm:null,foeAttacking:false,idleToastT:0};

// ---------------------------------------------------------------- sound (synthesised, starts on the first click)
const SND={ac:null,on:true,last:{}};
function audioInit(){
  if(SND.ac){if(SND.ac.state==='suspended')SND.ac.resume().catch(()=>{});return;}
  try{const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;SND.ac=new AC();SND.master=SND.ac.createGain();SND.master.gain.value=.45;SND.master.connect(SND.ac.destination);}catch(e){SND.ac=null;}
  try{musInit();}catch(e){}
}
function tone(type,f0,f1,t,dur,vol){
  const ac=SND.ac,o=ac.createOscillator(),g=ac.createGain();
  o.type=type;o.frequency.setValueAtTime(f0,t);if(f1!==f0)o.frequency.exponentialRampToValueAtTime(Math.max(1,f1),t+dur);
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  o.connect(g);g.connect(SND.master);o.start(t);o.stop(t+dur+.05);
}
function noise(t,dur,vol,ft,freq){
  const ac=SND.ac,len=Math.max(1,Math.floor(ac.sampleRate*dur)),b=ac.createBuffer(1,len,ac.sampleRate),d=b.getChannelData(0);
  for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*(1-i/len);
  const s=ac.createBufferSource();s.buffer=b;const f=ac.createBiquadFilter();f.type=ft;f.frequency.value=freq;const g=ac.createGain();g.gain.value=vol;
  s.connect(f);f.connect(g);g.connect(SND.master);s.start(t);
}
function horn(t,f){
  const ac=SND.ac,o=ac.createOscillator(),fl=ac.createBiquadFilter(),g=ac.createGain();
  o.type='sawtooth';o.frequency.value=f;fl.type='lowpass';fl.frequency.value=900;
  g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(.22,t+.05);g.gain.setValueAtTime(.22,t+.22);g.gain.exponentialRampToValueAtTime(.0001,t+.3);
  o.connect(fl);fl.connect(g);g.connect(SND.master);o.start(t);o.stop(t+.35);
}
// a sung "wo-lo-lo": sawtooth voice through two formant filters, with vibrato
function wololo(t){
  const ac=SND.ac,o=ac.createOscillator();o.type='sawtooth';
  const lfo=ac.createOscillator();lfo.frequency.value=6;const lg=ac.createGain();lg.gain.value=7;lfo.connect(lg);lg.connect(o.frequency);
  const f1=ac.createBiquadFilter();f1.type='bandpass';f1.Q.value=5;
  const f2=ac.createBiquadFilter();f2.type='bandpass';f2.Q.value=8;f2.frequency.value=1050;
  const g=ac.createGain();g.gain.value=.0001;const g2=ac.createGain();g2.gain.value=.35;
  o.connect(f1);o.connect(f2);f1.connect(g);f2.connect(g2);g2.connect(g);g.connect(SND.master);
  const syl=[[0,.32,170,185,420,660],[.36,.26,215,212,330,720],[.66,.44,200,160,340,620]];
  for(const[s,d,p0,p1,fa,fb]of syl){
    o.frequency.setValueAtTime(p0,t+s);o.frequency.linearRampToValueAtTime(p1,t+s+d);
    f1.frequency.setValueAtTime(fa,t+s);f1.frequency.linearRampToValueAtTime(fb,t+s+d*.45);
    g.gain.setValueAtTime(.0001,t+s);g.gain.exponentialRampToValueAtTime(1.1,t+s+.05);g.gain.setValueAtTime(1.1,t+s+d-.08);g.gain.exponentialRampToValueAtTime(.0001,t+s+d);
  }
  o.start(t);lfo.start(t);o.stop(t+1.2);lfo.stop(t+1.2);
}
function playSfx(name){
  const ac=SND.ac;if(!ac||!SND.on||ac.state!=='running')return;
  const now=ac.currentTime;
  const gap={boom:.08,wololo:.9,alarm:3,ram:.25,catapult:.3,fireball:.2,bell:1.2}[name]||.15;
  if(SND.last[name]&&now-SND.last[name]<gap)return;SND.last[name]=now;
  try{
    switch(name){
      case 'wololo':wololo(now);break;
      case 'converted':tone('sine',880,1320,now,.25,.25);tone('sine',1320,1320,now+.12,.35,.18);break;
      case 'era':[523,659,784,1047].forEach((f,i)=>tone('triangle',f,f,now+i*.13,.32,.28));tone('triangle',1047,1047,now+.52,.8,.22);break;
      case 'foe-era':[392,370,330,262].forEach((f,i)=>tone('sawtooth',f,f*.98,now+i*.17,.3,.07));break;
      case 'alarm':horn(now,220);horn(now+.32,196);break;
      case 'march':horn(now,147);horn(now+.3,147);horn(now+.6,175);break;
      case 'build':tone('sine',660,660,now,.25,.2);tone('sine',990,990,now+.1,.35,.18);break;
      case 'train':tone('square',520,700,now,.09,.06);break;
      case 'bolt':noise(now,.35,.4,'highpass',1800);tone('sine',90,40,now,.4,.4);break;
      case 'meteor':tone('sawtooth',320,80,now,.7,.07);break;
      case 'boom':noise(now,.45,.28,'lowpass',600);tone('sine',70,35,now,.35,.3);break;
      case 'win':[523,659,784,1047,784,1047].forEach((f,i)=>tone('triangle',f,f,now+i*.14,.35,.25));break;
      case 'lose':[392,349,311,262].forEach((f,i)=>tone('triangle',f,f,now+i*.25,.45,.22));break;
      case 'click':tone('square',880,880,now,.04,.04);break;
      case 'rank':[659,880,1175].forEach((f,i)=>tone('triangle',f,f,now+i*.09,.22,.22));tone('sine',1760,1760,now+.27,.4,.12);break;
      case 'wild':horn(now,131);horn(now+.35,123);break;
      case 'ram':tone('sine',95,42,now,.28,.4);noise(now,.18,.25,'lowpass',380);break;
      case 'catapult':tone('triangle',230,120,now,.16,.06);noise(now,.32,.16,'bandpass',700);break;
      case 'fireball':noise(now,.42,.16,'highpass',900);tone('sawtooth',320,110,now,.35,.045);break;
      // a small village bell: two strokes, each a few inharmonic partials that ring out
      case 'bell':for(const [d,f] of [[0,988],[.42,880]])[[1,1.5,.2],[2,.9,.08],[2.76,.7,.06],[5.4,.35,.03]].forEach(([m,dur,v])=>tone('sine',f*m,f*m,now+d,dur,v));break;
    }
  }catch(e){}
}

// ---------------------------------------------------------------- toasts & banner
const toastBox=$('toasts');
// a toast with a place on the map can be clicked to jump there (and select the unit or building)
function toast(msg,kind,loc){
  const el=document.createElement(loc?'button':'div');el.className='toast'+(kind?' '+kind:'')+(loc?' go':'');
  el.textContent=msg;
  if(loc){
    el.type='button';el.title='Clique para ver no mapa';
    const s=document.createElement('span');s.className='see';s.textContent='Ver';el.appendChild(s);
    el.addEventListener('click',()=>{
      const e=loc.id!=null?byId.get(loc.id):null;
      const p=e&&!e.dead?centerOf(e):loc;
      centerOn(p.x,p.y);
      if(e&&!e.dead&&e.team===1)select([e]);
      FX.marks.push({x:p.x,y:p.y+10,col:'#ffe066',t:0});
      el.remove();
    });
  }
  toastBox.appendChild(el);while(toastBox.children.length>3)toastBox.firstChild.remove();
  setTimeout(()=>el.remove(),loc?5500:3800);
}
let bannerTimer=0;
function banner(kicker,title,text,foe){
  const b=$('banner');$('bn-kicker').textContent=kicker;$('bn-title').textContent=title;$('bn-text').textContent=text;
  b.classList.toggle('foe',!!foe);b.hidden=false;b.style.animation='none';void b.offsetWidth;b.style.animation='';
  clearTimeout(bannerTimer);bannerTimer=setTimeout(()=>{b.hidden=true;},foe?3200:4800);
}
function toastNeed(c){
  const T=S.teams[1];
  const miss=Object.keys(c).filter(k=>T.res[k]<c[k]).map(k=>`${c[k]-Math.floor(T.res[k])} de ${RES_NAME[k]}`);
  if(miss.length)toast(`Faltam ${miss.join(' e ')}.`,'warn');
}

// ---------------------------------------------------------------- hooks from the simulation
HOOK.toast=(m,k,loc)=>toast(m,k,loc);
HOOK.idle=(u,res)=>{if(u.team!==1||AT-ui.idleToastT<6)return;ui.idleToastT=AT;toast(`Um peão parou: acabou ${res==='food'?'a comida':res==='gold'?'o ouro':'a madeira'} por perto.`,null,{x:u.x,y:u.y,id:u.id});};
HOOK.tile=(x,y)=>miniTile(x,y);
HOOK.rank=un=>{if(un.team!==1)return;toast(`${unitName(un)} subiu para ${RANKS[un.rank].n}! (${un.kills} abates)`,'good',{x:un.x,y:un.y,id:un.id});playSfx('rank');voxSay(un,'rank',2,true);};
HOOK.trained=u=>{if(u.team===1)voxSay(u,'ready',1);};
HOOK.fear=u=>{if(u.team===1&&AT-(ui.fearT||-99)>7){ui.fearT=AT;voxSay(u,'fear',2,true);}};
// enemies shout when they come for you
function taunt(team,x,y){let b=null,bd=1e9;for(const e of S.ents){if(e.dead||e.team!==team||!DEF[e.kind].unit||!DEF[e.kind].mil)continue;const d=hyp(e.x-x,e.y-y);if(d<bd){bd=d;b=e;}}if(b&&bd<500)voxSay(b,'taunt',2,true);}
HOOK.wild=(x,y,n)=>{toast(`Um bando de ${n} saqueadores apareceu no mapa!`,'warn',{x,y});FX.pings.push({x,y,t:0,col:'#c78bff'});playSfx('wild');ui.lastAlarm={x,y};};
HOOK.loaded=()=>{buildTerrain();buildMiniBase();ui.actKey='';};
HOOK.sfx=(name,x,y,team,other)=>{
  const on=x>cam.x-80&&x<cam.x+VW/cam.z+80&&y>cam.y-80&&y<cam.y+VH/cam.z+80;
  if(name==='train'||name==='build'){if(team===1)playSfx(name);return;}
  if(name==='wololo'||name==='converted'){if(on||team===1||other===1)playSfx(name);return;}
  if(on)playSfx(name);
};
HOOK.alarm=(x,y)=>{
  ui.lastAlarm={x,y};
  if(ui.alarmT>0)return;ui.alarmT=15;
  toast('Sua vila está sob ataque!','warn',{x,y});
  FX.pings.push({x,y,t:0,col:'#ff5a4a'});playSfx('alarm');taunt(2,x,y);MUS.tenseT=AT;
};
HOOK.era=(t,era)=>{
  const E=ERAS[era];ui.actKey='';
  if(t===1){
    banner('Seu reino avançou',E.name,E.unlock,false);playSfx('era');
    const c=castleOf(1);if(c)for(let i=0;i<5;i++)FX.sparks.push({x:c.x+(Math.random()-.5)*140,y:c.y-60-Math.random()*60,t:-i*.25,team:1});
  }else{
    banner('O Reino Vermelho avançou',E.name,'Os inimigos ficaram mais fortes. Prepare as defesas.',true);playSfx('foe-era');
  }
};
HOOK.over=(win,why)=>{
  clearMatch();
  playSfx(win?'win':'lose');musOver(win);
  const C=chapter();
  if(S.mode==='campaign'&&C){
    if(win){
      const h=byId.get(S.heroId),hk=S.heroKey;
      if(hk){const kept=h&&!h.dead?{kills:h.kills||0,rank:h.rank||0}:S.heroDown?{kills:S.heroDown.kills,rank:S.heroDown.rank}:null;if(kept)ui.save.heroes[hk]=kept;}
      ui.save.unlocked=Math.max(ui.save.unlocked||1,C.n+1);writeSave();
      setTimeout(()=>showStory(C.outro,`Capítulo ${C.n} concluído`,C.title,showEnd),1200);
      return;
    }
  }
  if(S.mode==='survival'){const b=ui.save.best||(ui.save.best={});if(S.wavesBeaten>(b[S.diff.key]||0)){b[S.diff.key]=S.wavesBeaten;ui.newBest=true;}else ui.newBest=false;writeSave();}
  setTimeout(showEnd,1000);
};
function showEnd(){
  const win=S.over==='win',why=S.why,C=chapter();
  const m=Math.floor(S.t/60),s=Math.floor(S.t%60),A=S.teams[1],B=S.teams[2];
  const time=`${m}:${String(s).padStart(2,'0')}`;
  let kick,title,text,st;
  if(S.mode==='campaign'&&C){
    const h=byId.get(S.heroId),hr=h&&!h.dead?h.rank||0:S.heroDown?S.heroDown.rank:0,hk=h&&!h.dead?h.kills||0:S.heroDown?S.heroDown.kills:0;
    kick=`Capítulo ${C.n} · ${C.title}`;
    title=win?(C.n===5?'A coroa voltou!':'Capítulo concluído!'):why==='king'?'O rei caiu':'O castelo caiu';
    text=win?(C.n<5?`Próximo: ${CHAPTERS[C.n+1].title}. Seu herói leva as patentes para o próximo capítulo.`:'Você terminou a campanha A Coroa de Pedravale. Experimente a Defesa do Rei ou uma dificuldade maior.'):
      why==='king'?'O Rei Aldebrando caiu em batalha e Pedravale se rendeu. Mantenha o rei perto das torres, longe da linha de frente.':'O castelo de Pedravale foi derrubado. Construa torres perto dele e mantenha tropas em casa durante os ataques.';
    st=[[time,'tempo de jogo'],[A.stats.kills,'inimigos derrotados'],[A.stats.lost,'unidades perdidas'],[`${RANKS[hr].n}`,`${HEROES[S.heroKey]?HEROES[S.heroKey].name:'herói'}, ${hk} abates`],[Object.keys(S.items).filter(k=>ITEMS[k]&&ITEMS[k].cost&&S.items[k]).length,'itens forjados'],[A.stats.wood+A.stats.gold+A.stats.food,'recursos coletados']];
  }else if(S.mode==='survival'){
    const best=(ui.save.best||{})[S.diff.key]||0;
    kick='Defesa do Rei';title=`${S.wavesBeaten} ${S.wavesBeaten===1?'onda':'ondas'}`;
    text=(why==='king'?'O Rei Aldebrando caiu.':'O castelo caiu.')+(ui.newBest?` Novo recorde na dificuldade ${S.diff.name}!`:` Seu recorde na dificuldade ${S.diff.name}: ${best} ondas.`);
    st=[[time,'tempo de jogo'],[S.wavesBeaten,'ondas vencidas'],[best,'recorde'],[A.stats.kills,'inimigos derrotados'],[A.stats.lost,'unidades perdidas'],[ERAS[A.era].roman,'sua era']];
  }else{
    kick=win?'O reino está a salvo':'Fim de jogo';title=win?'Vitória!':'O castelo caiu';
    text=win?`O castelo vermelho caiu na dificuldade ${S.diff.name}. A ilha é toda sua.`:'O Reino Vermelho derrubou o seu castelo. Tente avançar de era mais cedo, construir torres perto do ouro e treinar tropas que vencem as deles.';
    st=[[time,'tempo de jogo'],[`${ERAS[A.era].roman} × ${ERAS[B.era].roman}`,'sua era × era inimiga'],[A.stats.kills,'inimigos derrotados'],[A.stats.conv,'convertidos por você'],[A.stats.lost,'unidades perdidas'],[A.stats.wood+A.stats.gold+A.stats.food,'recursos coletados']];
  }
  $('end-kicker').textContent=kick;$('end-title').textContent=title;$('end-text').textContent=text;
  $('end-stats').innerHTML=st.map(([b,l])=>`<div><b${String(b).length>6?' style="font-size:21px"':''}>${b}</b><span>${l}</span></div>`).join('');
  $('b-next').hidden=!(S.mode==='campaign'&&win&&C&&C.n<5);
  $('b-again').textContent=S.mode==='campaign'?(win?'Repetir capítulo':'Tentar de novo'):'Jogar de novo';
  $('ov-end').hidden=false;
}

// ---------------------------------------------------------------- story, talk and goals (campaign and Defesa do Rei)
const FOES=['duke','captain','crow','violet'];
function speaker(k){
  if(k==='hero'){const H=HEROES[S.heroKey]||HEROES.warrior;return {name:H.name,av:H.av};}
  return CHAR[k]||CHAR.king;
}
function showStory(pages,kicker,title,done){
  ui.story={pages,i:0,done,kicker,title,wasPaused:ui.paused};ui.paused=true;
  $('ov-story').hidden=false;storyPage();
  setTimeout(()=>{try{$('b-st-next').focus();}catch(e){}},50);
}
function storyPage(){
  const st=ui.story,p=st.pages[st.i],sp=speaker(p[0]);
  $('st-kicker').textContent=st.kicker;$('st-title').textContent=st.title;
  $('st-av').src=`assets/${sp.av}.png`;$('st-who').textContent=sp.name;$('st-text').textContent=heroText(p[1]);
  $('st-pg').textContent=`${st.i+1} de ${st.pages.length}`;
  $('b-st-next').textContent=st.i<st.pages.length-1?'Continuar':'Pronto';
  $('b-st-skip').hidden=st.i>=st.pages.length-1;
}
function endStory(){
  const st=ui.story;if(!st)return;ui.story=null;$('ov-story').hidden=true;
  ui.paused=false;
  if(st.done)st.done();
}
$('b-st-next').addEventListener('click',()=>{const st=ui.story;if(!st)return;playSfx('click');if(st.i<st.pages.length-1){st.i++;storyPage();}else endStory();});
$('b-st-skip').addEventListener('click',endStory);
const talkQ=[];let talkTimer=0;
function talk(who,text){talkQ.push([who,text]);if(talkQ.length===1)nextTalk();}
function nextTalk(){
  const el=$('talk');
  if(!talkQ.length){el.hidden=true;return;}
  const [who,text]=talkQ[0],sp=speaker(who);
  $('tk-av').src=`assets/${sp.av}.png`;$('tk-who').textContent=sp.name;$('tk-text').textContent=heroText(text);
  el.classList.toggle('foe',FOES.includes(who));
  el.style.bottom=($('panel').offsetHeight+10)+'px';
  el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';
  clearTimeout(talkTimer);
  const adv=()=>{clearTimeout(talkTimer);if(talkQ[0]&&talkQ[0][1]===text){talkQ.shift();nextTalk();}};
  const spoken=voxTalk(who,heroText(text),()=>{talkTimer=setTimeout(adv,700);});
  talkTimer=setTimeout(adv,spoken?Math.min(20000,4000+text.length*85):Math.min(9000,3500+text.length*45));
}
HOOK.talk=(who,text)=>talk(who,text);
HOOK.skill=(u,k,l)=>{if(u.team!==1)return;FX.floats.push({x:u.x,y:u.y-58,txt:`${SKILL_NAME[k]} nível ${l}!`,col:'#9fe07a',t:0});if(l>=3)toast(`Um aldeão virou ${SKILL_NAME[k].toLowerCase()} nível ${l}: trabalha ${l*10}% mais rápido.`,'good',{x:u.x,y:u.y,id:u.id});};
HOOK.tired=(u,tv)=>{if(AT-(ui.tiredT||-99)>40){ui.tiredT=AT;toast('Aldeões cansados estão indo descansar na taberna.',null,{x:tv.x,y:tv.y,id:tv.id});}};
HOOK.rested=u=>{if(u.team===1)FX.floats.push({x:u.x,y:u.y-58,txt:`Descansado! +${Math.round(u.fresh*100)}%`,col:'#9fe07a',t:0});};
HOOK.renovated=b=>{if(b.team!==1)return;toast(`Casa reformada: agora cabem ${housePop(b)} pessoas.`,'good',{x:b.x,y:b.y,id:b.id});playSfx('build');ui.actKey='';};
HOOK.raid=(team,lair,n,p)=>{
  if(team===1){toast(`Bandidos vêm saquear você: ${n} ${n===1?'bandido':'bandidos'}!`,'warn',p);FX.pings.push({x:p.x,y:p.y,t:0,col:'#c78bff'});playSfx('wild');ui.lastAlarm={x:p.x,y:p.y};taunt(3,p.x,p.y);}
  else{toast(`Bandidos saíram para saquear o Reino Vermelho (${n}).`,null,p);FX.pings.push({x:p.x,y:p.y,t:0,col:'#c78bff'});}
};
HOOK.wildNews=(k,l)=>{if(l)toast('Os bandidos juntaram tesouro e ergueram uma toca nova.','warn',{x:l.x,y:l.y,id:l.id});};
HOOK.ask=q=>renderAsk();
HOOK.terrain=()=>{buildTerrain();buildMiniBase();};
HOOK.village=(what,n,loc)=>{if(what==='defend'&&AT-(ui.defT||-99)>30){ui.defT=AT;toast(`${n===1?'Um soldado foi':`${n} soldados foram`} defender a vila sozinhos.`,null,loc);}};
function renderAsk(){
  const el=$('ask');const q=S&&S.ask;
  if(!q||!ui.started){el.hidden=true;ui.askId=null;return;}
  if(ui.askId===q.t)return;ui.askId=q.t;
  $('ak-text').textContent=q.text;$('ak-who').textContent=q.who||'Mestre Gaspar pede autorização';$('ak-av').src=`assets/${q.av||'av05'}.png`;
  if(q.loc)FX.pings.push({x:q.loc.x,y:q.loc.y,t:0,col:'#ffe066'});
  $('ak-cost').innerHTML=q.cost?'Custo: '+Object.entries(q.cost).map(([k,v])=>`${RES_IMG[k]}${v}`).join(' '):'';
  el.style.bottom=($('panel').offsetHeight+10)+'px';
  el.hidden=false;playSfx('click');
  if(!talkQ.length)voxSpeak(((q.text.match(/^[^.!?]*[.!?]/)||[q.text])[0]),q.av&&q.av!=='av05'?'warrior':'engineer',false,2,5);
}
$('b-ak-yes').addEventListener('click',()=>{audioInit();answerAsk(true);renderAsk();ui.actKey='';});
$('ak-text').addEventListener('click',()=>{const q=S&&S.ask;if(q&&q.loc)centerOn(q.loc.x,q.loc.y);});
$('b-ak-no').addEventListener('click',()=>{answerAsk(false);renderAsk();});
HOOK.engineer=(what,g,msg,loc)=>{
  if(what==='walls'||what==='terra'){talk('engineer',msg);toast(`Engenheiro: ${msg}`,'good',loc);return;}
  if(what==='promote'){talk('engineer',msg);toast('Mestre Gaspar foi promovido e passou a comandar o trabalho dos aldeões!','good',loc);playSfx('rank');return;}
  if(!g||!msg)return;
  if(what==='train'){if(AT-(ui.trainT||-99)<75)return;ui.trainT=AT;}
  if(what==='arrive'){talk('engineer','Cheguei, majestade! Sou o Mestre Gaspar. Deixe as obras comigo: casas, fazendas, depósitos e consertos, eu organizo os operários.');toast('O engenheiro-chefe chegou ao reino!','good',{x:g.x,y:g.y,id:g.id});playSfx('rank');return;}
  toast(`Engenheiro: ${msg}`,null,loc||{x:g.x,y:g.y,id:g.id});
  if(AT-(ui.engTalk||-99)>45){ui.engTalk=AT;talk('engineer',msg);}
};
HOOK.diplo=(what,c,u)=>{
  const l=byId.get(c.lair),loc=l?{x:l.x,y:l.y,id:l.id}:null,nm=l?DEF[l.kind].name:'covil';
  if(!u||u.team!==1)return;
  const G=giftFor(c);
  if(what==='trust'){talk('bandit',`Hmm... presente bom. Traga mais ${G.need-c.trust} e a gente conversa como amigos.`);toast(`${nm}: confiança ${c.trust}/${G.need}.`,'good',loc);playSfx('converted');}
  else if(what==='ally'){talk('bandit','Você cumpriu a palavra. Daqui pra frente, a gente luta do seu lado!');toast(`${nm} agora é seu aliado! Os guardas lutam por você e pagam tributo.`,'good',loc);playSfx('rank');if(l)for(let i=0;i<4;i++)FX.sparks.push({x:l.x+(Math.random()-.5)*60,y:l.y-30,t:-i*.2,team:1});}
  else if(what==='angry'){talk('bandit','Seus soldados atacaram a gente e agora você manda presente? Some daqui!');toast('Os bandidos recusaram: você atacou esse covil há pouco. Espere um minuto sem atacar.','warn',loc);}
  else if(what==='poor'){toast(`O mercador chegou sem o presente completo. Faltam recursos: ${Object.entries(G.cost).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(', ')}.`,'warn',loc);}
};
HOOK.built=b=>{if(b.kind==='market'&&!ui.marketTip){ui.marketTip=true;talk('marta','Mercado aberto! Aqui você troca comida e madeira por ouro. E um mercador com bons presentes pode fazer amizade com os bandidos.');}};
HOOK.goal=g=>{toast(`Objetivo cumprido: ${g.text}`,'good');playSfx('rank');ui.goalsHTML='';};
HOOK.item=(k,loc,forged)=>{
  const I=ITEMS[k];ui.actKey='';ui.goalsHTML='';
  if(forged){toast(`Forjado: ${I.name}! ${I.desc}`,'good');playSfx('era');const c=castleOf(1);if(c)for(let i=0;i<4;i++)FX.sparks.push({x:c.x+(Math.random()-.5)*120,y:c.y-50-Math.random()*50,t:-i*.2,team:1});}
  else{toast(`Você conseguiu: ${I.name}!`,'good',loc||null);playSfx('rank');if(loc)FX.floats.push({x:loc.x,y:loc.y-40,txt:I.name,col:'#ffe066',t:0});}
};
HOOK.wave=(w,spot)=>{
  const red=w.team===2;
  toast(`${red?'O exército vermelho':'Inimigos'} ${red?'está':'estão'} vindo: ${w.size} ${w.size===1?'inimigo':'inimigos'}!`,'warn',spot);
  FX.pings.push({x:spot.x,y:spot.y,t:0,col:red?'#ff5a4a':'#c78bff'});playSfx(red?'march':'wild');ui.lastAlarm={x:spot.x,y:spot.y};setTimeout(()=>{if(S)taunt(w.team,spot.x,spot.y);},1500);
  if(w.say)talk(w.say[0],w.say[1]);
  else if(S.mode==='survival'&&w.id%5===0){const b=Object.keys(w.units).find(k=>DEF[k].boss);if(b)talk(b,{crow:'Lembra de mim? O Corvo Negro nunca esquece.',violet:'Saqueadores! O tesouro do rei é nosso!',captain:'Pelo Duque! Derrubem aquele castelo!',duke:'Primo... vim buscar o que é meu.'}[b]);}
};
HOOK.waveDone=w=>{if(w.count)toast(S.mode==='survival'?`Onda ${w.id} derrotada!`:'Ataque derrotado!','good');};
function itemChip(k,n){const I=ITEMS[k];return `<span title="${I.name}: ${I.desc}">${I.icon?`<img alt="" src="assets/${I.icon}.png">`:`<b class="g" style="color:${I.col}">${I.glyph}</b>`}${n>1?n:''}</span>`;}
function renderGoals(){
  const el=$('goals');
  if(!S||!ui.started||S.mode==='skirmish'||S.over&&!$('ov-end').hidden){el.hidden=true;return;}
  const C=chapter();let h='';
  if(C){
    const done=C.goals.filter(g=>S.goalsDone[g.id]!=null).length;
    h+=`<h5 data-g="toggle">Cap. ${C.n} · ${C.title}<small>${done}/${C.goals.length} ${ui.goalsMin?'▾':'▴'}</small></h5><ul>`;
    for(const g of C.goals){
      const st=goalState(g),hid=g.hidden&&!st.done&&!S.ents.some(e=>!e.dead&&e.kind===g.kind);
      h+=`<li class="${st.done?'done':''}${hid?' hid':''}"><i>${st.done?'✓':''}</i><span>${g.text}${hid?`<br><small>${g.hidden}</small>`:''}</span><em>${st.n>1?st.have+'/'+st.n:''}</em></li>`;
    }
    h+='</ul>';
  }else{
    const wi=waveInfo(),best=(ui.save.best||{})[S.diff.key]||0;
    h+=`<h5 data-g="toggle">Defesa do Rei<small>recorde ${best} ${ui.goalsMin?'▾':'▴'}</small></h5><ul>`+
      `<li><i></i><span>Proteja o rei e o castelo</span><em></em></li>`+
      `<li class="${S.wavesBeaten?'done':''}"><i>${S.wavesBeaten?'✓':''}</i><span>Ondas vencidas</span><em>${S.wavesBeaten}</em></li>`+
      `<li><i></i><span>Forje armas e escudos no castelo</span><em>${['armas','escudos','ferramentas'].filter(has).length}/3</em></li></ul>`;
  }
  const k=byId.get(S.kingId);
  if(k&&!k.dead){const f=Math.max(0,k.hp/k.maxhp);h+=`<button class="king${f<.35?' low':''}" data-g="king" type="button" title="Ver o rei"><img src="assets/av11.png" alt=""><span>Rei</span><span class="hp"><i style="width:${Math.round(f*100)}%"></i></span></button>`;}
  const its=Object.keys(S.items).filter(x=>S.items[x]>0&&ITEMS[x]);
  if(its.length)h+=`<div class="items">${its.map(x=>itemChip(x,S.items[x])).join('')}</div>`;
  if(h!==ui.goalsHTML){el.innerHTML=h;ui.goalsHTML=h;}
  el.classList.toggle('min',!!ui.goalsMin);
  el.style.top=($('top').offsetHeight+4)+'px';
  el.hidden=false;
}
$('goals').addEventListener('pointerdown',ev=>{
  const b=ev.target.closest('[data-g]');if(!b||!S)return;
  if(b.dataset.g==='toggle'){ui.goalsMin=!ui.goalsMin;ui.goalsHTML='';renderGoals();}
  else if(b.dataset.g==='king'){const k=byId.get(S.kingId);if(k&&!k.dead){centerOn(k.x,k.y);select([k]);}}
});

// ---------------------------------------------------------------- selection & commands
function liveSel(){return ui.sel.map(id=>byId.get(id)).filter(alive);}
function ownUnits(){return liveSel().filter(e=>e.team===1&&DEF[e.kind].unit);}
function selPawns(){return liveSel().filter(e=>e.team===1&&(e.kind==='pawn'||e.kind==='engineer'));}
function selMonks(){return liveSel().filter(e=>e.team===1&&e.kind==='monk');}
function select(list,add){
  const ids=list.map(e=>e.id);
  if(list.length&&ui.started&&!add)voxSelect(list);
  ui.sel=add?[...new Set([...ui.sel,...ids])]:ids;
  ui.placing=null;ui.targeting=null;ui.moveId=null;ui.wallA=null;ui.actKey='';cv.classList.remove('placing');refreshPanel(true);
}
function pick(wx,wy){
  let best=null,bd=1e9;
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(D.unit||D.critter){
      const top=D.critter?18:(baseKind(e.kind)==='lancer'?50:42),w=D.r+9;
      if(wx<e.x-w||wx>e.x+w||wy<e.y-top||wy>e.y+8)continue;
      const d=hyp(e.x-wx,e.y-top/2-wy);if(d<bd){bd=d;best=e;}
    }
  }
  if(best)return best;
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(D.building&&!D.flat||D.resource){const r=rectOf(e);const top=D.building?r[1]-D.h*TS*.4:r[1];if(wx>=r[0]&&wx<=r[0]+r[2]&&wy>=top&&wy<=r[1]+r[3])return e;}
  }
  for(const e of S.ents){if(e.dead||e.kind!=='farm')continue;const r=rectOf(e);if(wx>=r[0]&&wx<=r[0]+r[2]&&wy>=r[1]&&wy<=r[1]+r[3])return e;}
  return null;
}
function mark(x,y,col){FX.marks.push({x,y,col,t:0});}
function clearU(u){u.path=null;u.stuck=0;u.work=0;u.detour=null;}
function command(wx,wy){
  let units=ownUnits();if(!units.length)return;
  for(const u of units)u.cmdT=S.t;
  {const h=pick(wx,wy),i=inB(tileOf(wx),tileOf(wy))?idx(tileOf(wx),tileOf(wy)):-1;
   const act=h&&(h.team===2||h.team===3)?'attack':h&&h.kind==='gold'?'gold':h&&DEF[h.kind].critter?'food':i>=0&&S.tiles[i]===TREE?'wood':h&&h.team===1&&h.kind==='farm'?'food':h&&h.team===1&&DEF[h.kind].building&&(!h.built||h.hp<h.maxhp)?'build':'move';
   voxCommand(units,act);}
  // the player's word is final: builders and farmers keep the job they were given
  const hit=pick(wx,wy),tx=tileOf(wx),ty=tileOf(wy);
  const isTree=inB(tx,ty)&&S.tiles[idx(tx,ty)]===TREE;
  if(units.some(u=>DEF[u.kind].cart&&u.mid)){units=units.filter(u=>!(DEF[u.kind].cart&&u.mid));if(!units.length){toast('A carroça segue a rota do serviço. Para protegê-la, mande soldados escoltar.');return;}}
  for(const u of units)if(u.svc)u.svc=null;
  if(hit&&hit.team===1&&DEF[hit.kind].cart&&hit.mid){
    const m=svcList().list.find(q=>q.id===hit.mid),sol=units.filter(u=>DEF[u.kind].mil&&!DEF[u.kind].mech&&!DEF[u.kind].holy);
    if(m&&m.state==='run'&&sol.length){for(const u of sol)svcJoin(m,u);toast(`${sol.length} ${sol.length===1?'soldado reforça':'soldados reforçam'} a escolta da carroça.`,'good');mark(hit.x,hit.y,'#ffe066');return;}
  }
  const merch=units.filter(u=>DEF[u.kind].envoy);
  if(merch.length){
    const camp=hit&&hit.team===3?campOf(hit):null;
    for(const u of merch){clearU(u);
      if(camp)u.order={type:'gift',camp:S.camps.indexOf(camp)};
      else u.order={type:'move',x:wx+(Math.random()-.5)*20,y:wy+(Math.random()-.5)*20};}
    if(hit&&hit.team===3&&!camp)toast('Esses bandidos não têm covil e não negociam. Leve o presente a um covil.','warn');
    else if(camp){const G=giftFor(camp);mark(wx,wy,'#ffe066');toast(`O mercador vai levar o presente: ${Object.entries(G.cost).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(', ')}.`);}
    units=units.filter(u=>!DEF[u.kind].envoy);
    if(!units.length)return;
  }
  const boats=units.filter(u=>DEF[u.kind].naval);
  if(boats.length){
    const water=inB(tx,ty)&&S.tiles[idx(tx,ty)]===WATER&&!bridgeA[idx(tx,ty)];
    for(const b of boats){clearU(b);b.order=water?{type:'move',x:wx,y:wy}:(b.cargo&&b.cargo.length?{type:'unload',x:wx,y:wy}:{type:'move',x:wx,y:wy});}
    mark(wx,wy,water?'#7fd4ff':'#ffe066');
    if(!water&&boats.some(b=>b.cargo&&b.cargo.length))toast('O barco vai até a praia mais perto e desembarca as tropas.');
    units=units.filter(u=>!DEF[u.kind].naval);if(!units.length)return;
  }
  if(hit&&hit.team===1&&DEF[hit.kind].naval){
    const room=DEF[hit.kind].cap-(hit.cargo?hit.cargo.length:0);
    units.slice(0,Math.max(0,room)).forEach(u=>{clearU(u);u.order={type:'board',id:hit.id};});
    if(units.length>room)toast(`Só cabem mais ${Math.max(0,room)} no barco.`,'warn');
    mark(hit.x,hit.y,'#7fd4ff');return;
  }
  for(const u of units)if(u.ally)u.home=null;
  const isB=u=>u.kind==='pawn'||u.kind==='engineer';const pawns=units.filter(isB),monks=units.filter(u=>u.kind==='monk'),army=units.filter(u=>!isB(u)&&u.kind!=='monk');
  for(const u of units)if(DEF[u.kind].king)u.home=null;
  // a neutral caravan: looting costs honour, so ask first
  if(hit&&!hit.team&&DEF[hit.kind].cart&&hit.trip&&army.length){
    const T=S.towns&&S.towns[hit.trip.from],go=()=>{for(const u of army){clearU(u);u.order={type:'attack',id:hit.id,loot:true};}mark(hit.x,hit.y,'#ff5a4a');};
    if(ui.lootOk)go();else confirmBox('Saquear a caravana?',`A caravana é de ${T?T.name:'uma vila neutra'}. Você fica com metade da carga, mas perde 10 de honra e todas as vilas vão saber.`,'Saquear',()=>{ui.lootOk=true;go();});
    return;
  }
  // a town: its guards and buildings are only targets during a conquest
  if(hit&&!hit.team&&hit.town!=null&&S.towns&&S.towns[hit.town]&&army.length&&(DEF[hit.kind].neutral&&DEF[hit.kind].mil||DEF[hit.kind].townb||hit.kind==='town'||DEF[hit.kind].building)){
    const T=S.towns[hit.town],go=()=>{for(const u of army){clearU(u);u.order=hit.kind==='town'?{type:'move',x:T.x+(Math.random()-.5)*90,y:T.y+40+(Math.random()-.5)*60,amove:true}:{type:'attack',id:hit.id};}mark(hit.x,hit.y,'#ff5a4a');};
    if(T.owner===1){/* our own vassal: just walk there */}
    else if(townFoe(T.i,1)){go();return;}
    else if(!T.siege){confirmBox(`Conquistar ${T.name}?`,`Atacar uma vila neutra custa 25 de honra no total, quebra os contratos com ela e todas as vilas vão desconfiar de você. Se o seu exército ficar 15 segundos na vila sem guardas por perto, ela vira sua vassala: paga tributo e manda guardas, mas pode se revoltar.`,'Atacar a vila',()=>{if(startConquest(1,T.i)==='ok')go();});return;}
    else{toast(`${T.name} já está sendo atacada pelo ${teamName(T.siege.team)}.`,'warn');}
  }
  if(hit&&(hit.team===2||hit.team===3)){
    for(const u of pawns.concat(army)){clearU(u);u.order={type:'attack',id:hit.id};}
    for(const u of monks){clearU(u);
      if(canConvert(u,hit))u.order={type:'convert',id:hit.id};
      else if((eraOf(1)>=4||u.hero)&&u.boltCd<=0)u.order={type:'cast',spell:'bolt',id:hit.id};
      else u.order={type:'move',x:wx,y:wy};
    }
    mark(wx,wy,'#ff5a4a');return;
  }
  let rest=units;
  if(hit&&hit.team===1&&DEF[hit.kind].unit&&monks.length&&hit.hp<hit.maxhp){
    for(const u of monks){clearU(u);u.order={type:'heal',id:hit.id};}
    rest=units.filter(u=>u.kind!=='monk');mark(wx,wy,'#7be06a');
  }else if(hit&&hit.kind==='gold'){for(const u of pawns){clearU(u);u.order={type:'gather',res:'gold',id:hit.id,phase:'go'};}rest=army.concat(monks);mark(wx,wy,'#ffd84a');}
  else if(hit&&DEF[hit.kind].critter){for(const u of pawns){clearU(u);u.order={type:'gather',res:'food',id:hit.id,phase:'go'};}rest=army.concat(monks);mark(wx,wy,'#ff9e86');}
  else if(isTree){for(const u of pawns){clearU(u);u.order={type:'gather',res:'wood',tx,ty,phase:'go'};}rest=army.concat(monks);mark(wx,wy,'#9fe07a');}
  else if(hit&&hit.team===1&&DEF[hit.kind].building&&(!hit.built||hit.hp<hit.maxhp)){for(const u of pawns){clearU(u);u.order={type:'build',id:hit.id};}rest=army.concat(monks);mark(wx,wy,'#ffffff');}
  else if(hit&&hit.team===1&&hit.kind==='farm'&&hit.built){
    const p=pawns[0];
    if(p){clearU(p);hit.worker=p.id;p.order={type:'gather',res:'food',id:hit.id,phase:'go'};rest=units.filter(u=>u!==p);}
    mark(wx,wy,'#e6c34a');
  }else if(hit&&hit.team===1&&DEF[hit.kind].drop&&hit.built){
    const carriers=pawns.filter(p=>p.carry&&p.carry.amt);
    for(const u of carriers){clearU(u);u.order={type:'gather',res:u.carry.type,phase:'return',lx:u.x,ly:u.y};}
    rest=units.filter(u=>!carriers.includes(u));
  }
  if(!rest.length)return;
  const n=rest.length,cols=Math.ceil(Math.sqrt(n));
  rest.forEach((u,k)=>{
    clearU(u);
    const ox=(k%cols-(cols-1)/2)*22,oy=(Math.floor(k/cols)-(Math.ceil(n/cols)-1)/2)*22;
    u.order={type:'move',x:wx+ox,y:wy+oy};
  });
  mark(wx,wy,'#ffffff');
}
function setRally(b,wx,wy){
  const hit=pick(wx,wy),tx=tileOf(wx),ty=tileOf(wy);
  if(b.kind==='castle'&&hit&&(hit.kind==='gold'||DEF[hit.kind].critter||hit.kind==='farm'))b.rally={x:hit.x,y:hit.y-10,res:hit.kind==='gold'?'gold':'food',id:hit.id};
  else if(b.kind==='castle'&&inB(tx,ty)&&S.tiles[idx(tx,ty)]===TREE)b.rally={x:wx,y:wy,res:'wood',tx,ty};
  else b.rally={x:wx,y:wy};
  mark(wx,wy,'#7fb3ff');toast('Ponto de encontro marcado.');
}
function stopUnits(){for(const u of ownUnits()){u.order=null;clearU(u);}}

// ---------------------------------------------------------------- building & spells
function startPlacing(k){
  const D=DEF[k];
  if(!selPawns().length){toast('Selecione um peão para construir.');return;}
  if(!unlocked(1,k)){toast(`${D.name} só na ${ERAS[D.era].name}.`,'warn');return;}
  if(!afford(1,D.cost)){toastNeed(D.cost);return;}
  ui.placing=k;ui.ghost=null;ui.targeting=null;ui.actKey='';
  cv.classList.add('placing');refreshPanel(true);
}
function cancelModes(){ui.placing=null;ui.ghost=null;ui.targeting=null;ui.moveId=null;ui.wallA=null;ui.actKey='';cv.classList.remove('placing');refreshPanel(true);}
function ghostFor(k,wx,wy){const D=DEF[k];return {tx:Math.round(wx/TS-D.w/2),ty:Math.round(wy/TS-D.h/2)};}
function startMove(b){
  if(!b||b.team!==1||b.kind==='castle')return;
  if(threatNear(b.x,b.y-20,1,220)){toast('Não dá para mudar de lugar com inimigos por perto.','warn');return;}
  ui.placing=b.kind;ui.moveId=b.id;ui.ghost=null;ui.targeting=null;ui.actKey='';cv.classList.add('placing');refreshPanel(true);
}
function askDemolish(b){
  if(!b||b.team!==1||!DEF[b.kind].building)return;
  if(b.kind==='castle'){toast('O castelo não pode ser demolido.','warn');return;}
  const D=DEF[b.kind],back=D.cost?Object.entries(D.cost).map(([k,v])=>`${Math.floor(v*(b.built?.5:1))} de ${RES_NAME[k]}`).join(' e '):'nada';
  confirmBox(`Demolir ${D.name.toLowerCase()}?`,`O prédio vira entulho e libera o caminho. Você recebe de volta ${back}.`,'Sim, demolir',()=>{if(demolish(b)){ui.sel=[];ui.actKey='';refreshPanel(true);toast(`${D.name} demolido.`);}});
}
function confirmBox(title,text,yes,cb){
  $('cf-title').textContent=title;$('cf-text').textContent=text;$('b-cf-yes').textContent=yes;
  ui.confirm={cb,wasPaused:ui.paused};ui.paused=true;$('ov-confirm').hidden=false;
  setTimeout(()=>{try{$('b-cf-no').focus();}catch(e){}},30);
}
function closeConfirm(ok){
  const c=ui.confirm;if(!c)return;ui.confirm=null;$('ov-confirm').hidden=true;ui.paused=c.wasPaused;
  if(ok)c.cb();
}
$('b-cf-yes').addEventListener('click',()=>closeConfirm(true));
$('b-cf-no').addEventListener('click',()=>closeConfirm(false));
function confirmPlace(){
  const k=ui.placing,g=ui.ghost;if(!k||!g)return false;
  if(ui.moveId){
    const b=byId.get(ui.moveId);
    if(!b||b.dead){cancelModes();return false;}
    if(!moveBuilding(b,g.tx,g.ty)){toast('Não cabe aí: precisa de chão livre.','warn');return false;}
    playSfx('build');mark(b.x,b.y-20,'#ffffff');toast(`${DEF[b.kind].name} mudou de lugar.`,'good');
    const id=b.id;cancelModes();select([b]);return true;
  }
  if(LINE_KINDS.includes(k)){
    const startMsg={wall:'A muralha precisa começar em chão livre.',pit:'O fosso precisa começar em chão livre.',bridge:'A ponte precisa começar na água ou num fosso, encostada na margem.'}[k];
    if(!ui.wallA){if(!canPlace(1,k,g.tx,g.ty)){toast(startMsg,'warn');return false;}ui.wallA={tx:g.tx,ty:g.ty};ui.actKey='';refreshPanel(true);return false;}
    const made=placeWall(1,wallLine(ui.wallA.tx,ui.wallA.ty,g.tx,g.ty),selPawns(),k);
    if(!made.length){toast('Nada para construir nessa linha.','warn');return false;}
    playSfx('click');toast(`${DEF[k].name} marcad${k==='pit'?'o':'a'}: ${made.length} ${k==='wall'?'pedaços':k==='pit'?'buracos para cavar':'trechos'}. Os peões já vão trabalhar.`);
    ui.wallA=null;cancelModes();return true;
  }
  if(!canPlace(1,k,g.tx,g.ty)){toast('Não dá para construir aí: precisa de chão livre, longe do castelo inimigo.','warn');return false;}
  if(!afford(1,DEF[k].cost)){toastNeed(DEF[k].cost);return false;}
  const b=placeBuilding(1,k,g.tx,g.ty,selPawns());
  if(b){mark(b.x,b.y-20,'#ffffff');playSfx('click');}
  cancelModes();
  return !!b;
}
function startTargeting(sp){
  const monks=selMonks();
  if(sp==='terra-up'||sp==='terra-down'){ui.targeting=sp;ui.placing=null;ui.actKey='';cv.classList.add('placing');refreshPanel(true);return;}
  if(sp==='rally'){ui.targeting='rally';ui.placing=null;ui.actKey='';cv.classList.add('placing');refreshPanel(true);return;}
  if(!monks.length)return;
  if(sp!=='convert'){
    const S_=SPELL[sp];
    if(eraOf(1)<S_.era&&!(sp==='bolt'&&monks.some(m=>m.hero))){toast(`${S_.name} só na ${ERAS[S_.era].name}.`,'warn');return;}
    const ready=monks.some(m=>(sp==='bolt'?m.boltCd:m.meteorCd)<=0);
    if(!ready){toast(`${S_.name} ainda está recarregando.`);return;}
  }
  ui.targeting=sp;ui.placing=null;ui.actKey='';cv.classList.add('placing');refreshPanel(true);
}
function terraTiles(wx,wy){return rectTiles(tileOf(wx)-1,tileOf(wy)-1,3,3);}
function castAt(wx,wy){
  const sp=ui.targeting,monks=selMonks(),hit=pick(wx,wy);
  if(sp==='terra-up'||sp==='terra-down'){
    const g=liveSel().find(e=>e.kind==='engineer'&&e.team===1),up=sp==='terra-up',ts=terraTiles(wx,wy);
    if(!g){cancelModes();return;}
    if(!terraOk(ts,up)){toast(terraWhy(ts,up),'warn');return;}
    const cost=terraPlan(ts,up).cost;if(!afford(1,cost)){toastNeed(cost);return;}
    g.order={type:'terra',tiles:ts,up,t:0};g.path=null;g.cmdT=S.t;mark(wx,wy,'#ffe066');cancelModes();
    toast(up?'Mestre Gaspar vai elevar o terreno.':'Mestre Gaspar vai aplainar o terreno.');return;
  }
  if(sp==='rally'){const b=liveSel().find(e=>e.team===1&&DEF[e.kind].trains);if(b)setRally(b,wx,wy);cancelModes();return;}
  if(sp==='convert'){
    if(!hit||!hit.team||hit.team===1){toast('Escolha um inimigo para converter.');return;}
    const ok=monks.filter(m=>canConvert(m,hit));
    if(!ok.length){toast(hit.kind==='castle'?'O castelo não pode ser convertido.':DEF[hit.kind].noConvert?`${unitName(hit)} não pode ser convertido.`:DEF[hit.kind].building?'Prédios só podem ser convertidos na Era Lendária, e covis nunca.':'Esse alvo não pode ser convertido.','warn');return;}
    for(const m of ok){clearU(m);m.order={type:'convert',id:hit.id};}
    mark(wx,wy,'#ffe95a');cancelModes();return;
  }
  const key=sp==='bolt'?'boltCd':'meteorCd';
  const ready=monks.filter(m=>m[key]<=0&&(eraOf(1)>=SPELL[sp].era||m.hero&&sp==='bolt')).sort((a,b)=>hyp(a.x-wx,a.y-wy)-hyp(b.x-wx,b.y-wy));
  if(!ready.length){cancelModes();return;}
  if(sp==='bolt'){
    if(!hit||!hit.team||hit.team===1){toast('Escolha um inimigo para o raio.');return;}
    clearU(ready[0]);ready[0].order={type:'cast',spell:'bolt',id:hit.id};
  }else{clearU(ready[0]);ready[0].order={type:'cast',spell:'meteor',x:wx,y:wy};}
  mark(wx,wy,sp==='bolt'?'#bfe4ff':'#ff7a3a');cancelModes();
}
function doTrain(b,k){
  const r=trainAt(b,k);
  if(r==='ok'){ui.actKey='';refreshPanel(true);playSfx('click');return;}
  if(r==='cost')toastNeed(DEF[k].cost);
  else if(r==='pop')toast('População no limite. Construa casas.','warn');
  else if(r==='full')toast('A fila de treino está cheia.');
  else if(r==='era')toast(`${DEF[k].name} só na ${ERAS[DEF[k].era].name}.`,'warn');
}
function tradeMsg(r,res){
  if(r==='ok'){playSfx('click');FX.floats.push({x:(liveSel()[0]||{x:0}).x,y:(liveSel()[0]||{y:0}).y-70,txt:'Negócio fechado!',col:'#ffe066',t:0});ui.actKey='';refreshPanel(true);}
  else if(r==='have')toast(`Você precisa de 100 de ${RES_NAME[res]} para vender.`,'warn');
  else if(r==='gold')toast('Falta ouro para essa compra.','warn');
  else if(r==='nomarket')toast('Construa um mercado primeiro.','warn');
}
function giftNearest(){
  const m=liveSel().filter(e=>e.team===1&&DEF[e.kind].envoy);if(!m.length)return;
  const u=m[0];let best=null,bd=1e9;
  for(const c of S.camps){const l=byId.get(c.lair);if(!alive(l)||l.team!==3)continue;const d=hyp(l.x-u.x,l.y-u.y);if(d<bd){bd=d;best=c;}}
  if(!best){toast('Não há covis de bandidos para visitar.');return;}
  const l=byId.get(best.lair),i=S.camps.indexOf(best);
  for(const e of m){clearU(e);e.order={type:'gift',camp:i};}
  mark(l.x,l.y-10,'#ffe066');const G=giftFor(best);
  toast(`O mercador vai até ${DEF[l.kind].name}. Presente: ${Object.entries(G.cost).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(', ')}.`,null,{x:l.x,y:l.y});
}
function doForge(k){
  const r=forgeItem(k),I=ITEMS[k];
  if(r==='ok'){ui.actKey='';refreshPanel(true);}
  else if(r==='cost')toastNeed(I.cost);
  else if(r==='need')toast(`Para forjar ${I.name} faltam: ${Object.entries(I.need).filter(([n,c])=>(S.items[n]||0)<c).map(([n,c])=>`${c-(S.items[n]||0)} × ${ITEMS[n].name}`).join(', ')}.`,'warn');
}
function doResearch(){
  const T=S.teams[1],next=T.era+1,E=ERAS[next];
  if(!E)return;
  if(T.research){cancelResearch(1);ui.actKey='';refreshPanel(true);toast('Avanço de era cancelado. Recursos devolvidos.');return;}
  const r=startResearch(1);
  if(r==='ok'){ui.actKey='';refreshPanel(true);playSfx('click');toast(`O castelo começou a avançar para a ${E.name}.`,'good');}
  else if(r==='req')toast(`Para a ${E.name} você precisa de: ${E.req.map(k=>DEF[k].name).join(' e ')}.`,'warn');
  else if(r==='cost')toastNeed(E.cost);
}

// ---------------------------------------------------------------- panel
const infoEl=$('info'),actEl=$('actions');
const RES_IMG={wood:'<img src="assets/ic_wood.png" alt="madeira">',gold:'<img src="assets/ic_gold.png" alt="ouro">',food:'<img src="assets/ic_food.png" alt="comida">'};
function costHTML(c){const T=S.teams[1];return Object.keys(c||{}).map(k=>`<span data-r="${k}" class="${T.res[k]<c[k]?'no':''}">${RES_IMG[k]}${c[k]}</span>`).join('');}
function rankText(e){
  if(!DEF[e.kind].unit||!DEF[e.kind].mil&&e.kind!=='pawn'&&e.kind!=='engineer')return '';
  if(e.kind==='pawn'){
    const sk=Object.keys(SKILL_NAME).map(k=>[k,skillLv(e,k)]).filter(x=>x[1]>0).map(([k,l])=>`${SKILL_NAME[k]} ${l} (+${l*10}%)`);
    const st=e.team===1?((e.fat||0)>.85?' · cansado':e.freshT>0?` · descansado (+${Math.round((e.fresh||0)*100)}%)`:''):'';
    return (sk.length?' · '+sk.join(', '):' · aprendiz')+st;
  }
  const r=e.rank||0,k=e.kills||0,nx=RANKS[r+1];
  return ` · ${RANKS[r].n}, ${k} XP`+(nx?` (próxima em ${nx.k-k})`:'');
}
function statusOf(e){
  const D=DEF[e.kind];
  if(e.kind==='town'&&S.towns&&S.towns[e.town]){const T=S.towns[e.town];return `${T.desc} Você: ${repStars(repOf(T,1))} · Vermelho: ${repStars(repOf(T,2))}`;}
  if(D.cart&&e.mid){const m=svcList().list.find(q=>q.id===e.mid);if(m){const L=m.legs&&m.legs[m.leg];const dest=L&&L.to==='home'?'de volta para casa':m.type==='supply'?'até a tropa':S.towns&&S.towns[L&&L.to==='B'?m.town2:m.town]?'até '+S.towns[L&&L.to==='B'?m.town2:m.town].name:'';return `${SVC_NAME[m.type]}: ${e.load?`leva ${cargoName(e.load)} `:'vazia, '}${dest}`;}}
  if(e.order&&e.order.type==='escort')return e.order.lead?'Lidera a comitiva':'Escoltando a carroça';
  if(D.building&&D.wild&&e.team===1)return `Acampamento aliado. Repõe guardas aliados e paga ${TRIBUTE.gold} de ouro e ${TRIBUTE.food} de comida por minuto.`;
  if(D.building&&D.wild&&e.team===3){
    const c=campOf(e),G=GIFT[e.kind]||GIFT.den,tr=c&&c.trust||0;
    const item=e.drop&&ITEMS[e.drop]?`Guarda: ${ITEMS[e.drop].name}. `:'';
    return `${item}Tesouro dos bandidos: ${Math.floor(S.teams[3].res.gold)} de ouro. Destrua, ou faça amizade: confiança ${tr}/${G.need}. Cada presente do mercador: ${Object.entries(G.cost).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(', ')}.`;
  }
  if(e.ally&&e.team===1)return 'Bandido aliado. Defende o acampamento; você pode dar ordens a ele.';
  if(D.king&&e.team===1&&!e.order)return 'Guarda o castelo. Se o rei cair, a partida acaba.';
  if(e.gate&&!has('ariete'))return 'Portão reforçado: só o Aríete Real derruba este castelo.';
  if(e.team===3)return (D.building?'Covil de criaturas: enquanto estiver de pé, repõe os guardas.':e.roam?'Bando errante: ataca qualquer reino.':'Guarda o covil e o ouro perto dele.')+(D.bounty?` Vale ${Object.entries(D.bounty).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(' e ')}.`:'');
  if(D.resource)return `${e.amount} de ouro restante`;
  if(D.critter)return `${e.amount} de comida`;
  if(D.naval)return `Levando ${e.cargo?e.cargo.length:0} de ${D.cap}. `+(e.order&&e.order.type==='unload'?'Indo desembarcar.':e.order?'Navegando.':'Parado.');
  if(e.kind==='pit'&&e.built)return 'Fosso: ninguém passa a pé. Faça uma ponte por cima para suas tropas atravessarem.';
  if(e.kind==='house'&&e.team===1&&e.built){
    if(e.reno)return `Reformando para ${HOUSE_LV[e.reno.lvl].pop} pessoas: ${Math.floor(e.reno.prog*100)}%`;
    return `Casa nível ${e.level||1}: abriga ${housePop(e)} pessoas. Os peões entregam recursos aqui.`;
  }
  if(e.kind==='tavern'&&e.built){const n=S.ents.filter(p=>!p.dead&&p.order&&p.order.type==='rest'&&p.order.id===e.id).length;return `${n}/5 descansando. Aldeões cansados vêm sozinhos e voltam mais rápidos.`;}
  if(D.building){
    if(!e.built)return `Em construção: ${Math.floor(e.prog*100)}%`;
    if(e.kind==='castle'&&e.team===1&&S.cfg&&S.cfg.forge&&!(e.queue&&e.queue.length)&&!S.teams[1].research)return 'Treina peões, avança de era e tem a forja: junte recursos e itens para forjar.';
    if(e.kind==='castle'&&S.teams[e.team].research){const R=S.teams[e.team].research;return `Avançando para a ${ERAS[R.era].name}: ${Math.floor(R.t/ERAS[R.era].time*100)}%`;}
    if(e.queue&&e.queue.length)return `Treinando ${DEF[e.queue[0]].name}: ${Math.floor(e.tp/DEF[e.queue[0]].time*100)}%`;
    if(e.kind==='farm')return e.worker?'Um peão está colhendo.':'Sem peão. Mande um peão trabalhar aqui.';
    if(e.team===2)return `Prédio do Reino Vermelho (${ERAS[eraOf(2)].name}).`;
    return D.desc||(e.kind==='castle'?'Treina peões e avança de era. Se cair, você perde.':'');
  }
  const o=e.order;
  const carry=e.carry&&e.carry.amt?` · carregando ${e.carry.amt} de ${RES_NAME[e.carry.type]}`:'';
  const faith=D.holy?` · fé ${Math.floor(e.faith*100)}%`:'';
  if(e.team===2&&D.boss)return 'Chefe inimigo. Junte o exército antes de atacar.';
  if(e.team===2)return (o&&o.type==='attack'?'Atacando':o&&o.type==='convert'?'Convertendo':o&&o.type==='gather'?'Coletando':'Patrulhando')+faith;
  if(e.stunT>0)return 'Atordoado';
  if(!o)return 'Ocioso'+carry+faith;
  if(o.type==='gather')return (o.phase==='return'?'Levando ':'Coletando ')+RES_NAME[o.res]+carry;
  if(o.type==='build')return 'Construindo';
  if(o.type==='attack')return 'Atacando';
  if(o.type==='flee')return 'Fugindo do perigo'+carry;
  if(o.type==='board')return 'Indo embarcar';
  if(o.type==='unload')return 'Indo desembarcar';
  if(o.type==='terra')return o.up?'Elevando o terreno':'Aplainando o terreno';
  if(o.type==='rest')return e.anim==='rest'?(o.heal&&!o.tired?'Bebendo na taberna e se curando':'Descansando na taberna'):(o.heal&&!o.tired?'Indo se curar na taberna':'Indo descansar na taberna');
  if(o.type==='heal'&&e.medic)return 'Cuidando de um ferido';
  if(o.type==='gift')return e.anim==='talk'?'Negociando com os bandidos...':'Levando um presente aos bandidos';
  if(o.type==='convert')return 'Convertendo: Wololo!'+faith;
  if(o.type==='heal')return 'Curando'+faith;
  if(o.type==='cast')return 'Lançando '+SPELL[o.spell].name;
  return 'Andando'+carry+faith;
}
function refreshPanel(force){
  if(!S)return;
  const sel=liveSel(),T=S.teams[1];
  let h='';
  if(!sel.length){
    h=`<img class="por" alt="" src="${iconFor('castle',1)}"><div class="txt"><h3>${ERAS[T.era].name}</h3><p>${ui.placing?'Escolha onde construir.':'Selecione peões para coletar e construir. No castelo você avança de era.'}</p></div>`;
  }else if(sel.length===1){
    const e=sel[0];
    const av=e.hero&&HEROES[S.heroKey]?`assets/${HEROES[S.heroKey].av}.png`:CHAR[e.kind]?`assets/${CHAR[e.kind].av}.png`:null;
    h=`<img class="por" alt="" src="${av||iconFor(e.kind,e.team||1)}"><div class="txt"><h3>${unitName(e)}</h3>`+
      (e.maxhp&&e.kind!=='town'?`<div class="hp"><i style="width:${Math.max(0,e.hp/e.maxhp*100)}%"></i></div>`:'')+
      `<p>${e.hero?'Herói · ':''}${statusOf(e)}${e.maxhp&&e.kind!=='town'?` · ${Math.ceil(e.hp)}/${e.maxhp} PV`:''}${rankText(e)}${squadText(e)}${e.ctr?' · <b>contratado</b>':''}</p></div>`;
  }else{
    const cnt={};for(const e of sel)cnt[e.kind]=(cnt[e.kind]||0)+1;
    const first=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a])[0];
    const label=(k,n)=>{const nm=unitName({kind:k,team:sel[0].team});return n>1?(k==='pawn'?'Peões':nm.replace(/^(\S+)/,'$1s')):nm;};
    h=`<img class="por" alt="" src="${iconFor(first,sel[0].team||1)}"><div class="txt"><h3>${sel.length} selecionados</h3><p>${Object.entries(cnt).map(([k,n])=>`${n} ${label(k,n)}`).join(', ')}</p></div>`;
  }
  infoEl.innerHTML=h;
  const pawns=selPawns(),monks=selMonks();
  const single=sel.length===1?sel[0]:null;
  const trainer=single&&single.team===1&&single.built&&DEF[single.kind].trains?single:null;
  const cds=monks.length?[Math.ceil(Math.min(...monks.map(m=>m.boltCd||0))),Math.ceil(Math.min(...monks.map(m=>m.meteorCd||0))),monks.some(m=>m.faith>=1)]:0;
  // the buttons are rebuilt only when what they offer changes; costs, cooldowns and bars update in place,
  // so a press is never lost because the panel was redrawn under the finger or the mouse
  const key=JSON.stringify([single&&single.kind==='town'&&S.towns&&S.towns[single.town]?[svcActive(1),repOf(S.towns[single.town],1),townPrice(S.towns[single.town],'wood',false,1),townPrice(S.towns[single.town],'food',false,1),townPrice(S.towns[single.town],'wood',true,1),townPrice(S.towns[single.town],'food',true,1),armsPrice(S.towns[single.town],1),S.towns[single.town].lvl,Math.floor(S.towns[single.town].gold/50),!!underAttack(1),Object.keys(S.tech&&S.tech[1]||{}).length,ui.townTab,ctrList().filter(c=>c.state==='active'&&c.town===single.town).map(c=>c.kind+c.team).join(),S.towns[single.town].owner,!!S.towns[single.town].siege,Math.floor((S.towns[single.town].loyal||0)/10),Math.round(honorOf(1)/5),friendOf(S.towns[single.town],1),svcList().list.some(m=>m.state==='run'&&m.type==='contract'&&m.town===single.town),S.t<(S.towns[single.town].festT||0)]:0,single&&single.reno?1:0,single&&single.level,single&&DEF[single.kind].building&&single.tx!=null?elev[idx(single.tx,single.ty)]:-1,ui.placing,ui.moveId,!!ui.wallA,S.autoBuild,ui.targeting,!!ui.ghost,ui.touchPlace,pawns.length>0,monks.length,trainer&&trainer.id,trainer&&trainer.queue.join(),T.era,T.research&&T.research.era,
    trainer&&trainer.kind==='castle'&&eraReqMet(1,T.era+1),sel.length===1&&sel[0].id,sel.some(e=>e.team===1&&DEF[e.kind].unit),S.itemsVer,monks.some(m=>m.hero),trainer&&trainer.kind==='market'&&S.market&&[S.market.wood,S.market.food],sel.some(e=>e.team===1&&DEF[e.kind].envoy),panelSqKey(sel)]);
  if((key===ui.actKey||ui.pressing)&&!force){updateLive(trainer);return;}
  ui.actKey=key;
  let a='';
  const btn=(act,k,title,inner,cls,extra)=>`<button class="act${cls?' '+cls:''}" type="button" data-act="${act}" title="${title}"${extra||''}>${inner}</button>`;
  const costAttr=(c,pop,lk)=>lk?' data-lk="1"':` data-cost='${JSON.stringify(c)}'${pop?' data-pop="1"':''}`;
  if(ui.placing){
    const D=DEF[ui.placing];
    if(ui.moveId)a+=`<div class="hint">Mudando <b>${D.name.toLowerCase()}</b> de lugar. ${ui.touchPlace?'Toque no novo lugar e confirme.':'Clique no novo lugar. Esc ou botão direito cancela.'}</div>`;
    else if(LINE_KINDS.includes(ui.placing)){const k=ui.placing,extra={wall:`Cada pedaço custa ${DEF.wall.cost.wood} de madeira. Depois, transforme um pedaço em portão.`,pit:'Cavar não custa nada, só tempo. Para suas tropas passarem, faça uma ponte por cima.',bridge:`Cada trecho custa ${DEF.bridge.cost.wood} de madeira. Comece na margem.`}[k];
      a+=`<div class="hint"><b>${DEF[k].name}</b>: ${ui.wallA?(ui.touchPlace?'agora toque onde termina e confirme.':'agora clique onde termina.'):(ui.touchPlace?'toque onde começa.':'clique onde começa.')} ${extra}</div>`;}
    else a+=`<div class="hint">Posicionando <b>${D.name}</b>. ${ui.touchPlace?'Toque no mapa para escolher o lugar e confirme.':'Clique no mapa para construir. Esc ou botão direito cancela.'}</div>`;
    if(ui.touchPlace&&ui.ghost&&(!LINE_KINDS.includes(ui.placing)||ui.wallA))a+=`<button class="act wide go" type="button" data-act="place-ok">${ui.moveId?'Mover para cá':'Construir aqui'}</button>`;
    a+=`<button class="act wide" type="button" data-act="cancel">Cancelar</button>`;
  }else if(ui.targeting){
    const txt={'terra-up':'Escolha onde elevar o terreno um nível (área 3×3). Clique de novo no mesmo lugar depois para subir mais: são até 4 alturas. Escadas e degraus em volta são feitos sozinhos.','terra-down':'Escolha onde aplainar o terreno (área 3×3).',convert:'Escolha um inimigo para converter.',bolt:'Escolha o inimigo que vai levar o raio.',meteor:'Escolha a área da chuva de fogo.',rally:'Escolha o ponto de encontro. Num recurso, os peões novos já vão coletar.'}[ui.targeting];
    a+=`<div class="hint">${txt}</div><button class="act wide" type="button" data-act="cancel">Cancelar</button>`;
  }else if(pawns.length){
    for(const k of BUILD_LIST){
      const D=DEF[k],lk=!unlocked(1,k);
      a+=btn('build:'+k,k,`${D.name}: ${D.desc}`,`<kbd>${D.key||""}</kbd><img alt="" src="${iconFor(k,1)}"><span>${D.name}</span>${lk?`<span class="lock">Era ${ERAS[D.era].roman}</span>`:`<span class="cost">${costHTML(D.cost)}</span>`}`,(lk||!afford(1,D.cost))?'off':'',costAttr(D.cost,false,lk));
    }
    if(pawns.some(p=>p.kind==='engineer')){
      a+=btn('spell:terra-up','tup','Elevar o terreno um nível (área 3×3, até 4 alturas). A encosta em volta vira degraus sozinha. Cada nível acima do inimigo dá mais dano, e torres no alto atiram bem mais longe',`<span class="glyph" style="color:#6d6a60">▲</span><span>Elevar terreno</span><span class="cost">${costHTML(TERRA_COST.up)}</span>`,'',` data-cost='${JSON.stringify(TERRA_COST.up)}'`);
      a+=btn('spell:terra-down','tdown','Aplainar o terreno (área 3×3)',`<span class="glyph" style="color:#6d6a60">▼</span><span>Aplainar</span><span class="cost">${costHTML(TERRA_COST.down)}</span>`,'',` data-cost='${JSON.stringify(TERRA_COST.down)}'`);
      a+=`<button class="act wide${S.autoBuild!==false?' go':''}" type="button" data-act="auto" title="O engenheiro decide e organiza as obras sozinho">Autonomia<br>${S.autoBuild!==false?'ligada':'desligada'}</button>`;
    }
    a+=`<button class="act wide" type="button" data-act="stop">Parar</button><button class="act wide" type="button" data-act="deselect">Desmarcar</button>`;
  }else if(trainer){
    const keys=['Q','W','Z','X','T'];
    DEF[trainer.kind].trains.filter(k=>k!=='merchant'||S.camps.length).forEach((k,i)=>{
      const D=DEF[k],lk=!unlocked(1,k);
      a+=btn('train:'+k,k,`${D.name}: ${D.desc}`,`<kbd>${keys[i]}</kbd><img alt="" src="${iconFor(k,1)}"><span>${unitName({kind:k,team:1})}</span>${lk?`<span class="lock">Era ${ERAS[D.era].roman}</span>`:`<span class="cost">${costHTML(D.cost)}</span>`}`,(lk||!afford(1,D.cost)||popUsed(1)>=popCap(1))?'off':'',costAttr(D.cost,true,lk));
    });
    if(trainer.kind==='castle'){
      const next=T.era+1,E=ERAS[next];
      if(T.research){
        const R=T.research;
        a+=`<button class="act research" type="button" data-act="research" title="Clique para cancelar e recuperar os recursos"><kbd>R</kbd><span>Rumo à Era ${ERAS[R.era].roman}</span><span class="bar"><i id="rbar" style="width:${R.t/ERAS[R.era].time*100}%"></i></span><span class="lock">Cancelar</span></button>`;
      }else if(E){
        const req=eraReqMet(1,next);
        a+=btn('research','era',`${E.name}: ${E.unlock}`,`<kbd>R</kbd><span class="rn">${E.roman}</span><span>${E.name}</span>${req?`<span class="cost">${costHTML(E.cost)}</span>`:`<span class="lock">Precisa: ${E.req.map(k=>DEF[k].name).join(' + ')}</span>`}`,'research'+(!req||!afford(1,E.cost)?' off':''),costAttr(E.cost,false,!req));
      }
    }
    if(trainer.kind==='castle'&&S.cfg&&S.cfg.forge){
      for(const k of S.cfg.recipes){
        if(has(k))continue;
        const I=ITEMS[k],r=canForge(k);
        const need=Object.entries(I.need||{}).map(([n,c])=>`<span class="${(S.items[n]||0)<c?'no':''}"><b style="color:${ITEMS[n].col};font:700 12px system-ui">${ITEMS[n].glyph}</b>${S.items[n]||0}/${c}</span>`).join('');
        const ic=I.icon?`<img alt="" src="assets/${I.icon}.png">`:`<span class="glyph it" style="color:${I.col}">${I.glyph}</span>`;
        a+=btn('forge:'+k,k,`Forjar ${I.name}: ${I.desc}`,`${ic}<span>${I.name.split(' ')[0]}</span><span class="cost">${costHTML(I.cost)}${need}</span>`,'forge'+(r!=='ok'?' off':''),r==='need'?' data-lk="1"':costAttr(I.cost));
      }
    }
    if(trainer.kind==='market'){
      const ic=k=>RES_IMG[k];
      for(const r of['food','wood']){
        a+=btn('sell:'+r,'s'+r,`Vender 100 de ${RES_NAME[r]} por ${sellGain(r)} de ouro`,`<span class="tr">${ic(r)}<b>→</b>${ic('gold')}</span><span>Vender ${r==='food'?'comida':'madeira'}</span><span class="cost"><span>-100 ${ic(r)}</span><span>+${sellGain(r)} ${ic('gold')}</span></span>`,T.res[r]<100?'off':'');
        a+=btn('buy:'+r,'b'+r,`Comprar 100 de ${RES_NAME[r]} por ${buyCost(r)} de ouro`,`<span class="tr">${ic('gold')}<b>→</b>${ic(r)}</span><span>Comprar ${r==='food'?'comida':'madeira'}</span><span class="cost"><span>-${buyCost(r)} ${ic('gold')}</span><span>+100 ${ic(r)}</span></span>`,T.res.gold<buyCost(r)?'off':'');
      }
      for(const[f,t]of[['food','wood'],['wood','food']]){
        const net=buyCost(t)-sellGain(f);
        a+=btn(`barter:${f}>${t}`,'x'+f,`Troca direta: 100 de ${RES_NAME[f]} por 100 de ${RES_NAME[t]}`+(net>0?`, pagando ${net} de ouro de diferença`:`, recebendo ${-net} de ouro de troco`),`<span class="tr">${ic(f)}<b>⇄</b>${ic(t)}</span><span>Trocar</span><span class="cost"><span>${net>0?'-'+net:'+'+(-net)} ${ic('gold')}</span></span>`,(T.res[f]<100||T.res.gold+sellGain(f)<buyCost(t))?'off':'');
      }
    }
    a+=`<button class="act wide" type="button" data-act="rally" title="Para onde vão as unidades novas">Ponto de<br>encontro</button>`;
    a+=`<button class="act wide" type="button" data-act="deselect">Desmarcar</button>`;
    if(trainer.queue.length){a+=`<div class="queue">`+trainer.queue.map((k,i)=>`<button class="qi" type="button" data-act="cancel-q:${i}" title="Cancelar ${DEF[k].name}"><img alt="" src="${iconFor(k,1)}">${i===0?'<b id="qbar"></b>':''}</button>`).join('')+`</div>`;}
    else if(trainer.kind==='castle'&&T.research)a+=`<div class="hint">Enquanto avança de era, o castelo não treina peões.</div>`;
  }else if(sel.length&&sel.every(e=>e.team===1&&DEF[e.kind].envoy)){
    a+=btn('gift-near','gift','Levar um presente ao covil de bandidos mais perto que ainda não é aliado',`<img alt="" src="assets/res_gold.png" style="object-fit:none;object-position:50% 50%"><span>Levar presente</span><span class="cost">covil mais perto</span>`,'');
    a+=`<button class="act wide" type="button" data-act="stop">Parar</button><button class="act wide" type="button" data-act="deselect">Desmarcar</button>`;
    a+=`<div class="hint">Toque (ou botão direito) num covil de bandidos para levar um presente. Toca: 1 presente. Covil: 2. Fortaleza: 3. Não ataque o covil antes: eles não confiam em quem acabou de atacar.</div>`;
  }else if(single&&DEF[single.kind].cart){
    a+=`<button class="act wide" type="button" data-act="svc-board">Serviços</button><button class="act wide" type="button" data-act="deselect">Desmarcar</button><div class="hint">A carroça segue a rota do serviço sozinha. Para reforçar a escolta, selecione soldados e toque (ou botão direito) na carroça.</div>`;
  }else if(monks.length){
    const era=eraOf(1);
    a+=btn('spell:convert','convert','Converter: o monge canta e o inimigo muda de lado',`<kbd>C</kbd><img alt="" src="${iconFor('monk',1)}"><span>Converter</span><span class="cost" data-faith="1">${cds[2]?'pronto':'sem fé'}</span>`,cds[2]?'':'off',' data-spell="convert"');
    const boltOK=era>=4||monks.some(m=>m.hero);
    a+=btn('spell:bolt','bolt',SPELL.bolt.desc,`<kbd>B</kbd><span class="glyph" style="color:#3d74c4">ϟ</span><span>Raio Divino</span>${!boltOK?'<span class="lock">Era IV</span>':`<span class="cd" data-cd="boltCd"${cds[0]>0?'':' hidden'}>${cds[0]}</span>`}`,!boltOK?'off':'');
    a+=btn('spell:meteor','meteor',SPELL.meteor.desc,`<kbd>F</kbd><span class="glyph" style="color:#d0582a">✹</span><span>Chuva de Fogo</span>${era<5?'<span class="lock">Era V</span>':`<span class="cd" data-cd="meteorCd"${cds[1]>0?'':' hidden'}>${cds[1]}</span>`}`,era<5?'off':'');
    a+=`<button class="act wide" type="button" data-act="stop">Parar</button>`;
    a+=`<div class="hint">Monges curam aliados e usam as magias sozinhos quando há inimigos perto.</div>`;
  }else if(sel.some(e=>e.team===1&&DEF[e.kind].unit)){
    const mk=sel.find(e=>DEF[e.kind].mech||DEF[e.kind].aura||e.kind==='wizard'||e.kind==='scout'||e.kind==='royal');
    const tip=mk?{ram:'Aríete: toque num prédio, muralha ou portão inimigo. Ele não ataca soldados, então proteja-o com tropas. Flechas quase não o ferem.',catapult:'Catapulta: atira pedras de muito longe e acerta todos em volta. Mantenha soldados na frente: de perto ela não acerta.',paladin:'Paladino: cura aos poucos os aliados em volta e não pode ser convertido. Ótimo na linha de frente.',wizard:'Mago: bolas de fogo que explodem em área. Deixe-o atrás dos guerreiros.',scout:'Batedor: muito rápido e enxerga longe. Use para espiar e caçar peões inimigos.',royal:'Arqueiro real: o mais longo alcance entre os arqueiros. No alto de um morro, vai ainda mais longe.'}[mk.kind]:'';
    a+=armyPanel(sel,btn);
    a+=`<button class="act wide" type="button" data-act="stop">Parar</button><button class="act wide" type="button" data-act="deselect">Desmarcar</button><div class="hint" style="flex:none;width:40ch">${tip||'Botão direito (ou toque) num inimigo para atacar, ou no chão para andar. Guerreiro vence arqueiro, arqueiro vence lanceiro, lanceiro vence guerreiro. A sua ordem vale mais que a do chefe.'}</div>`;
  }else if(sel.length&&sel.every(e=>e.team===1&&DEF[e.kind].naval)){
    a+=`<button class="act wide" type="button" data-act="unload-near" title="Desembarcar na praia mais próxima">Desembarcar<br>aqui perto</button><button class="act wide" type="button" data-act="stop">Parar</button><button class="act wide" type="button" data-act="deselect">Desmarcar</button>`;
    a+=`<div class="hint">Para embarcar: selecione tropas e toque (ou botão direito) no barco perto da margem. Com o barco selecionado, toque na água para navegar ou na terra para desembarcar lá.</div>`;
  }else if(single&&single.kind==='town'&&S.towns&&S.towns[single.town]){
    a+=townPanel(S.towns[single.town],btn);
  }else if(single&&single.team===1&&DEF[single.kind].wild&&DEF[single.kind].building){
    a+=`<div class="hint">Bandidos aliados. Os guardas defendem o acampamento; selecione um deles para dar ordens. Se o acampamento cair, a aliança acaba.</div>`;
  }else if(single&&single.team===3){
    a+=`<div class="hint">Bandidos. Derrote para ganhar ouro e comida, ou mande um mercador (treinado no mercado) com presentes ao covil para virarem seus aliados.</div>`;
  }else if(single&&single.team===2){
    a+=`<div class="hint">Do Reino Vermelho. Mande suas tropas atacar ou seus monges converterem.</div>`;
  }else if(single&&single.team===1&&DEF[single.kind].building&&single.kind!=='castle'){
    a+=`<div class="hint">${DEF[single.kind].desc||''} Para liberar o caminho, use Mover para trocar de lugar ou Demolir (tecla Delete).</div>`;
  }else{
    a+=`<div class="hint">Peões coletam madeira nas árvores, ouro nas pedras douradas e comida nas ovelhas e fazendas. Clique no indicador de era lá em cima para ver o caminho até a Era Lendária.</div>`;
  }
  if(!ui.placing&&!ui.targeting&&single&&single.team===1&&DEF[single.kind].building&&single.kind!=='castle'){
    if(single.kind==='house'&&single.built&&!single.reno){
      const L=HOUSE_LV[(single.level||1)+1];
      if(L){const lk=eraOf(1)<L.era;a+=btn('reno','reno',`Reformar a casa para caber ${L.pop} pessoas`,`<img alt="" src="${iconFor('house',1)}"><span>Reformar (${L.pop})</span>${lk?`<span class="lock">Era ${ERAS[L.era].roman}</span>`:`<span class="cost">${costHTML(L.cost)}</span>`}`,lk||!afford(1,L.cost)?'off':'',lk?' data-lk="1"':` data-cost='${JSON.stringify(L.cost)}'`);}
    }
    if(single.kind==='tower'&&single.built){
      const lv=elev[idx(single.tx,single.ty)],ts=rectTiles(single.tx-1,single.ty-1,4,4);
      a+=`<div class="hint">Altura da torre: <b>nível ${lv+1} de 4</b>. Alcance +${Math.round((towerReach(lv)-1)*100)}%, dano +${lv*15}%.</div>`;
      if(lv<MAXLV){const p=terraPlan(ts,true),ok=p&&!p.err&&terraOk(ts,true),c=ok?p.cost:TERRA_COST.up;
        a+=btn('tower-up','tup',ok?`Subir a torre para o nível ${lv+2}: o engenheiro ergue o terreno com degraus em volta`:terraWhy(ts,true),`<span class="glyph" style="color:#6d6a60">▲</span><span>Subir torre</span>${ok?`<span class="cost">${costHTML(c)}</span>`:'<span class="lock">sem espaço</span>'}`,ok&&afford(1,c)?'':'off',ok?` data-cost='${JSON.stringify(c)}'`:' data-lk="1"');}
    }
    if(single.kind==='wall')a+=btn('gate','gate','Transformar este pedaço de muralha em portão (22 de madeira)',`<img alt="" src="${iconFor('gate',1)}"><span>Virar portão</span><span class="cost">${costHTML({wood:22})}</span>`,'',` data-cost='{"wood":22}'`);
    a+=`<button class="act wide" type="button" data-act="move" title="Escolher outro lugar para este prédio">Mover</button>`;
    a+=`<button class="act wide warn" type="button" data-act="demolish" title="Demolir (tecla Delete)">Demolir</button>`;
  }
  actEl.innerHTML=a;
  updateLive(trainer);
}
function updateLive(tr){
  updateBars(tr);
  const T=S.teams[1],popFull=popUsed(1)>=popCap(1);
  for(const b of actEl.querySelectorAll('[data-cost]')){
    let c;try{c=JSON.parse(b.dataset.cost);}catch(e){continue;}
    const off=!afford(1,c)||(b.dataset.pop&&popFull);
    if(b.classList.contains('off')!==!!off)b.classList.toggle('off',!!off);
    for(const s of b.querySelectorAll('[data-r]')){const no=T.res[s.dataset.r]<c[s.dataset.r];if(s.classList.contains('no')!==no)s.classList.toggle('no',no);}
  }
  const monks=selMonks();
  if(monks.length){
    for(const s of actEl.querySelectorAll('[data-cd]')){const v=Math.ceil(Math.min(...monks.map(m=>m[s.dataset.cd]||0)));s.hidden=v<=0;if(v>0&&s.textContent!==String(v))s.textContent=v;}
    const f=actEl.querySelector('[data-faith]'),ready=monks.some(m=>m.faith>=1);
    if(f){const t=ready?'pronto':'sem fé';if(f.textContent!==t)f.textContent=t;const b=f.closest('.act');if(b.classList.contains('off')===ready)b.classList.toggle('off',!ready);}
  }
}
function updateBars(tr){
  const b=$('qbar');if(b&&tr&&tr.queue.length)b.style.width=Math.floor(tr.tp/DEF[tr.queue[0]].time*100)+'%';
  const r=$('rbar');const R=S.teams[1].research;if(r&&R)r.style.width=(R.t/ERAS[R.era].time*100)+'%';
}
actEl.addEventListener('pointerdown',()=>{ui.pressing=true;});
window.addEventListener('pointerup',()=>{if(ui.pressing){ui.pressing=false;setTimeout(()=>refreshPanel(false),60);}});
window.addEventListener('pointercancel',()=>{ui.pressing=false;});
actEl.addEventListener('click',ev=>{
  const b=ev.target.closest('[data-act]');if(!b||!S)return;
  audioInit();
  const [act,arg]=b.dataset.act.split(':');
  const sel=liveSel(),single=sel.length===1?sel[0]:null;
  if(act==='build')startPlacing(arg);
  else if(act==='train'&&single)doTrain(single,arg);
  else if(act==='cancel-q'&&single){cancelTrain(single,+arg);ui.actKey='';refreshPanel(true);}
  else if(act==='research')doResearch();
  else if(act==='svc'){const p=b.dataset.act.split(':');svcMsg(svcOrder(p[1],+p[2],p[3],p[4]));ui.actKey='';refreshPanel(true);renderSvc();}
  else if(act==='forge')doForge(arg);
  else if(act==='sell'||act==='buy'){const r=trade(1,arg,act==='buy');tradeMsg(r,arg);}
  else if(act==='barter'){const [f,t]=arg.split('>');tradeMsg(barter(1,f,t),f);}
  else if(act==='gift-near')giftNearest();
  else if(act==='unload-near'){for(const b of liveSel().filter(e=>DEF[e.kind].naval&&e.cargo&&e.cargo.length)){const sp=shoreSpot(b.x,b.y);if(sp){b.order={type:'unload',x:sp.lx*TS+16,y:sp.ly*TS+16,spot:sp};b.path=null;}}}
  else if(act==='move'&&single)startMove(single);
  else if(act==='tower-up'&&single){
    const ts=rectTiles(single.tx-1,single.ty-1,4,4),g=byId.get(S.engineerId);
    if(!alive(g)||g.team!==1){toast('Sem engenheiro-chefe agora. Um novo é escolhido logo.','warn');return;}
    if(!terraOk(ts,true)){toast(terraWhy(ts,true),'warn');return;}
    const c=terraPlan(ts,true).cost;if(!afford(1,c)){toastNeed(c);return;}
    g.order={type:'terra',tiles:ts,up:true,t:0};g.path=null;g.cmdT=S.t;
    HOOK.engineer('yes',g,`Vou subir a torre para o nível ${elev[idx(single.tx,single.ty)]+2}. Daqui a pouco ela enxerga o mapa todo!`,{x:single.x,y:single.y,id:single.id});
  }
  else if(act==='reno'&&single){const r=startRenovation(single,selPawns().length?selPawns():nearestPawns(single.x,single.y,2,1));if(r==='ok'){toast('Reforma começou. Os peões já estão indo.','good');ui.actKey='';refreshPanel(true);}else if(r==='cost')toastNeed(HOUSE_LV[(single.level||1)+1].cost);else if(r==='era')toast('Essa reforma pede uma era mais avançada.','warn');}
  else if(act==='demolish'&&single)askDemolish(single);
  else if(act==='gate'&&single){const r=wallToGate(single);if(r==='ok'){playSfx('build');toast('Agora é um portão: suas tropas passam, os inimigos não.','good');ui.actKey='';refreshPanel(true);}else if(r==='cost')toastNeed({wood:22});}
  else if(act==='auto'){S.autoBuild=S.autoBuild===false;ui.actKey='';refreshPanel(true);toast(S.autoBuild?'Mestre Gaspar volta a organizar as obras sozinho.':'Mestre Gaspar agora só obedece às suas ordens.');}
  else if(act==='rally')startTargeting('rally');
  else if(act==='spell')startTargeting(arg);
  else if(act==='stop')stopUnits();
  else if(act==='deselect')select([]);
  else if(act==='sos'){renderSos();$('ov-sos').hidden=false;}
  else if(act==='svc-board')openCouncil('road');
  else if(act==='genorders')openCouncil('army');
  else if(act==='sqcmd'){const k=b.dataset.act.split(':')[2];let n=0;for(const q of selSquads(liveSel())){const L=byId.get(q.lead);if(alive(L)&&(L.rank||0)>=CMD[k].rank&&(q.cd[k]||0)<=S.t&&sqCommand(q,k,true)==='ok')n++;}if(!n)toast(b.classList.contains('off')?'Nenhum chefe selecionado tem patente para isso, ou o comando ainda está recarregando.':'Nenhum grupo pôde usar esse comando agora.','warn');ui.actKey='';refreshPanel(true);}
  else if(act==='ttab'){ui.townTab=arg;ui.actKey='';refreshPanel(true);}
  else if(act==='ctr'){
    const p=b.dataset.act.split(':'),kind=p[1],T=S.towns[+p[2]],o={min:+p[3]||5},t=ctrTerms(kind,T,1,o);
    if(b.classList.contains('off')){const f=friendOf(T,1)+(favOf(T,1)>0?1:0);if(activeCtr(T,kind,1))toast('Esse contrato já está em vigor.','warn');else if(f<CTR[kind].need)toast(`${T.name} ainda não confia tanto: esse contrato pede amizade ${FRIEND[CTR[kind].need]} (${repStars(CTR[kind].need)}).`,'warn');else if(t.cost)toastNeed(t.cost);return;}
    confirmBox(`${CTR[kind].name} com ${T.name}?`,ctrConfirmText(kind,T,t),'Mandar o mensageiro',()=>{
      const r=proposeContract(1,kind,T.i,o);
      const msg={ok:`O mensageiro partiu para ${T.name} com a proposta.`,rep:'A vila ainda não confia tanto em você.',cost:'Faltam recursos para esse contrato.',dup:'Esse contrato já está em vigor.',busy:`Já há um mensageiro seu a caminho de ${T.name}.`}[r]||'Não foi possível mandar o mensageiro agora.';
      toast(msg,r==='ok'?'good':'warn',{x:T.x,y:T.y});ui.actKey='';refreshPanel(true);});
  }
  else if(act==='tfest'){const r=townFestival(1,+arg);toast(r==='ok'?'Festa na vila! A lealdade cresceu.':r==='cost'?'Faltam recursos para a festa.':'A última festa foi há pouco.',r==='ok'?'good':'warn');ui.actKey='';refreshPanel(true);}
  else if(act==='conquer'){const T=S.towns[+arg];confirmBox(`Conquistar ${T.name}?`,'Atacar uma vila neutra custa 25 de honra no total, quebra os contratos com ela e todas as vilas vão desconfiar de você. Selecione o exército e toque na vila: se ele ficar 15 segundos lá sem guardas da vila por perto, ela vira sua vassala.','Declarar o ataque',()=>{const r=startConquest(1,T.i);if(r==='ok'){toast(`Você declarou guerra a ${T.name}. Mande o exército!`,'warn',{x:T.x,y:T.y});armyOrder(1,'free');}ui.actKey='';refreshPanel(true);});}
  else if(act==='siegego'){const T=S.towns[+arg],U=armyUnits(1);for(const u of U){if(u.svc||u.ctr&&u.leaving)continue;clearU(u);u.order={type:'move',x:T.x+(Math.random()-.5)*90,y:T.y+40+(Math.random()-.5)*60,amove:true};}toast(`${U.length} soldados marcham contra ${T.name}.`,'warn',{x:T.x,y:T.y});}
  else if(act==='place-ok')confirmPlace();
  else if(act==='cancel')cancelModes();
});

// ---------------------------------------------------------------- delivery services: the town market, reports and the board
function cargoName(l){if(!l)return 'nada';return {wood:`${l.n} de madeira`,food:`${l.n} de comida`,gold:`${l.n} de ouro`,arms:'uma carga de armas',scroll:'pergaminhos de tecnologia',silk:'sedas do mercador',supply:'suprimentos'}[l.k]||'carga';}
// ---------------------------------------------------------------- the towns: growth news, envoys and calls for help
function townSay(t,u,msg){CHAR['env'+t.i]={name:`${u&&u.nm?u.nm:'Embaixador'}, de ${t.name}`,av:'av14'};talk('env'+t.i,msg);}
HOOK.envoy=(u,t,what,msg)=>{if(what==='say')townSay(t,u,msg);};
HOOK.townGrow=(t,what,x)=>{
  if(!t)return;const loc={x:t.x,y:t.y};
  if(what==='level')toast(`${t.name} cresceu: agora é ${TOWN_TITLE[t.lvl].toLowerCase()} (nível ${t.lvl}), com mais casas, guardas e comércio.`,null,loc);
  else if(what==='envoy')toast(`Um embaixador de ${t.name} está a caminho do seu castelo.`,null,x?{x:x.x,y:x.y,id:x.id}:loc);
  else if(what==='saved'){toast(`${t.name} agradece a defesa: amizade +1 (${FRIEND[friendOf(t,1)]}) e agora te deve um favor.`,'good',loc);townSay(t,null,'Vocês salvaram a nossa vila. Ficamos devendo essa: contem conosco!');}
  else if(what==='repay'){toast(`${t.name} lembrou do favor: ${x} guardas vêm te ajudar sem você pedir!`,'good',loc);townSay(t,null,'Vocês nos ajudaram uma vez. Agora é a nossa vez!');playSfx('bell');}
  else if(what==='tried'){toast(`Os bandidos escaparam, mas ${t.name} viu seus soldados lutando: agora te deve um favor.`,'good',loc);townSay(t,null,'Vocês vieram quando precisamos. Não vamos esquecer.');}
  else if(what==='refused'){toast(`Você recusou o pedido de ${t.name}.`,null,loc);townSay(t,null,'Entendemos. Vamos nos virar sozinhos desta vez.');}
  else if(what==='ingrate'){toast(`${t.name} te ajudou antes e você recusou: amizade -1 (${FRIEND[friendOf(t,1)]}).`,'warn',loc);townSay(t,null,'Mandamos nossos guardas quando vocês precisaram, e agora nos viram as costas?');}
  else if(what==='helpsRed')toast(`${t.name} mandou guardas para defender o Reino Vermelho!`,'warn',loc);
  else if(what==='helpPaid')toast(`${t.name} recebeu o pagamento: ${x} guardas marcham para ajudar.`,'good',loc);
  else if(what==='helpNoMoney')toast('Faltou ouro para pagar a ajuda.','warn');
  else if(what==='raid'){FX.pings.push({x:t.x,y:t.y,t:0,col:'#ff5a4a'});playSfx('bell');ui.bellRing=AT;sosTick();}
  renderSvc();
};
function requestHelp(i){
  const t=S.towns[i],ua=underAttack(1);$('ov-sos').hidden=true;
  if(!ua){toast('Não há ataque agora: as vilas só mandam ajuda durante um ataque.','warn');return;}
  toast(`Um mensageiro corre até ${t.name}...`);
  setTimeout(()=>{
    if(!S||!S.towns)return;const now=underAttack(1)||ua,r=askHelp(1,i,now.foe,now.p),f=FRIEND[friendOf(t,1)];
    if(r.kind==='free'){townSay(t,null,`Somos ${f.toLowerCase()}! ${r.n} guardas já estão a caminho.`);toast(`${t.name} mandou ${r.n} guardas de graça.`,'good',{x:t.x,y:t.y});playSfx('march');}
    else if(r.kind==='paid')ask({kind:'help',town:i,foe:now.foe,p:now.p,terms:r,cost:r.cost,who:`${t.name} responde ao pedido`,av:'av14',text:`Podemos mandar ${r.n} guardas, mas a guerra não é nossa: pedimos ${r.cost.gold} de ouro pela ajuda. (Amizade: ${f})`,loc:now.p});
    else townSay(t,null,{busy:'Nossos guardas acabaram de voltar de uma ajuda. Peçam daqui a pouco.',few:'Temos poucos guardas: não podemos deixar a vila sem proteção.',refuse:friendOf(t,1)<=1?'Não nos metemos em briga de reinos. Sejam nossos amigos, e quem sabe da próxima vez...':'Desta vez não podemos. Somos neutros.'}[r.kind]||'Não podemos ajudar agora.');
  },3500);
}
HOOK.sos=i=>requestHelp(i);
function favText(t){const f=favOf(t,1);return f>0?`<span class="fav owed">te deve ${f} favor${f>1?'es':''}</span>`:f<0?`<span class="fav owe">você deve ${-f} favor${f<-1?'es':''}</span>`:'<span class="fav">nenhum favor pendente</span>';}
const raidLeft=t=>t.raid?t.raid.ids.filter(id=>{const u=byId.get(id);return u&&!u.dead&&!u.leave;}).length:0;
function renderSos(){
  if(!S||!S.towns)return;const ua=underAttack(1),reqs=S.towns.filter(t=>t.raid);
  let h='';
  if(reqs.length)h+='<h3 class="sos-h">Pedidos de socorro</h3>'+reqs.map(t=>{
    const r=t.raid,st=r.ans==='yes'?`Você mandou ${r.helpers.length} soldado${r.helpers.length>1?'s':''}.`:r.ans==='no'?'Você recusou.':'Esperando a sua resposta.';
    return `<div class="svc-item sos-row ask"><img alt="" src="assets/av15.png"><div class="grow"><b>${t.name}</b> está sob ataque: ${raidLeft(t)} bandido${raidLeft(t)===1?'':'s'} · ${repStars(repOf(t,1))} ${FRIEND[friendOf(t,1)]}<br>${favText(t)} · ${st}</div>${r.ans?'':`<div class="btns"><button class="btn sm-btn" type="button" data-th="${t.i}" data-y="1">Mandar soldados</button><button class="btn alt sm-btn" type="button" data-th="${t.i}" data-y="0">Recusar</button></div>`}</div>`;}).join('');
  h+=`<h3 class="sos-h">${ua?'Pedir ajuda agora':'Pedir ajuda'}</h3>`+S.towns.map(t=>{const f=friendOf(t,1),U=townUnits(t),av=Math.max(0,U.g.length+U.a.length-2),cd=S.t<(t.helpCd[1]||0),fv=favOf(t,1);
    const g=f+clamp(fv,-2,2),guess=fv>0&&g>=4?'te deve: deve vir de graça':g>=4?'deve vir de graça':g>=2?'deve pedir ouro':g>=1?'talvez peça ouro, talvez recuse':'provavelmente recusa';
    return `<div class="svc-item sos-row"><img alt="" src="assets/av14.png"><div class="grow"><b>${t.name}</b> · ${TOWN_TITLE[t.lvl||1]} · ${repStars(repOf(t,1))} ${FRIEND[f]}<br>${favText(t)} · ${av} guardas livres · ${cd?'acabou de ajudar':t.raid?'está sendo atacada':guess}</div><button class="btn sm-btn" type="button" data-sos="${t.i}" ${!ua||cd||!av||t.raid?'disabled':''}>Pedir</button></div>`;}).join('')+(ua?'':'<p class="meta">Nenhum ataque à sua vila agora: o botão Pedir acende quando você for atacado.</p>');
  $('sos-list').innerHTML=h;
}
$('b-sos').addEventListener('click',()=>{audioInit();renderSos();$('ov-sos').hidden=false;});
$('b-sos-close').addEventListener('click',()=>{$('ov-sos').hidden=true;});
$('sos-list').addEventListener('click',ev=>{
  const a=ev.target.closest('[data-th]');
  if(a){townHelpAnswer({town:+a.dataset.th},a.dataset.y==='1');renderSos();sosTick();return;}
  const b=ev.target.closest('[data-sos]');if(b&&!b.disabled)requestHelp(+b.dataset.sos);});
function sosTick(){
  if(!S||!S.towns||!S.towns.length||!ui.started){$('b-sos').hidden=true;return;}
  // the bell: red when you are under attack, ringing gold while a town waits for your answer
  const ua=underAttack(1),reqs=S.towns.filter(t=>t.raid&&!t.raid.ans).length,b=$('b-sos');
  b.hidden=false;b.classList.toggle('sos',!!ua);b.classList.toggle('ring',!ua&&reqs>0);
  $('sos-lbl').textContent=ua?'Pedir ajuda':reqs?'Socorro!':'Vilas';
  $('sos-n').hidden=!reqs;$('sos-n').textContent=reqs;
  // the first time an attack starts, the advisor suggests asking the best friend
  if(ua&&AT-(ui.sosT||-999)>150&&!S.ask){
    const best=S.towns.filter(t=>S.t>=(t.helpCd[1]||0)).sort((a,b)=>repOf(b,1)-repOf(a,1))[0];
    if(best&&friendOf(best,1)>=2){ui.sosT=AT;ask({kind:'sosask',town:best.i,who:'Mestre Gaspar pede autorização',av:'av05',text:`Estamos sob ataque! Mando um mensageiro pedir ajuda a ${best.name}? Somos ${FRIEND[friendOf(best,1)].toLowerCase()}: ${friendOf(best,1)>=4?'devem vir de graça':'devem pedir ouro'}.`,loc:ua.p});}
  }
}
function svcMsg(r){
  if(r==='ok'){toast('Serviço encomendado: a carroça sai do mercado com a escolta.','good');playSfx('build');return;}
  toast({wait:'O seu embaixador esteve lá há pouco. Espere um pouco para voltar.',slots:`Todas as carroças estão na estrada (${svcActive(1)}/${svcSlots(1)}). Espere uma voltar.`,cost:'Faltam recursos para esse serviço.',rep:'A vila ainda não confia o bastante em vocês: faça mais entregas para ela.',pop:'Sem população livre para 3 mercenários.',era:'Armas só a partir da Era II.',nobody:'Não há soldados livres para ceder.',noescort:'Não há soldados livres para a escolta.'}[r]||'Não deu para começar esse serviço.','warn');
}
function townPanel(T,btn){
  const tab=ui.townTab||'com';let a=townTabs(T);
  if(tab==='ctr')return a+townCtrPanel(T,btn);
  if(tab==='dip')return a+townDipPanel(T,btn);
  const R=S.teams[1].res,free=svcActive(1)<svcSlots(1),rep=repOf(T,1),img=k=>RES_IMG[k];
  for(const r of['food','wood']){
    const g=Math.round(townPrice(T,r,false,1)*CART_LOAD/100),c=Math.round(townPrice(T,r,true,1)*CART_LOAD/100);
    a+=btn(`svc:sell:${T.i}:${r}`,'',`Vender ${CART_LOAD} de ${RES_NAME[r]} em ${T.name} por ${g} de ouro (o seu mercado paga ${Math.round(sellGain(r)*CART_LOAD/100)})`,`<span class="tr">${img(r)}<b>→</b>${img('gold')}</span><span>Vender ${r==='food'?'comida':'madeira'}</span><span class="cost"><span>-${CART_LOAD} ${img(r)}</span><span>+${g} ${img('gold')}</span></span>`,!free||R[r]<CART_LOAD?'off':'');
    a+=btn(`svc:buy:${T.i}:${r}`,'',`Comprar ${CART_LOAD} de ${RES_NAME[r]} em ${T.name} por ${c} de ouro, pagos na saída`,`<span class="tr">${img('gold')}<b>→</b>${img(r)}</span><span>Comprar ${r==='food'?'comida':'madeira'}</span><span class="cost"><span>-${c} ${img('gold')}</span><span>+${CART_LOAD} ${img(r)}</span></span>`,!free||R.gold<c?'off':'');
  }
  const ap=armsPrice(T,1),lkA=eraOf(1)<2;
  a+=btn(`svc:arms:${T.i}`,'',`Forjar e levar uma carga de armas: custa ${ARMS_COST.wood} de madeira e ${ARMS_COST.gold} de ouro, ${T.name} paga ${ap}. Risco alto de emboscada.`,`<span class="glyph" style="color:#5a6366">⚔</span><span>Vender armas</span>${lkA?'<span class="lock">Era II</span>':`<span class="cost">${costHTML(ARMS_COST)}<span>+${ap} ${img('gold')}</span></span>`}`,lkA||!free||!afford(1,ARMS_COST)?'off':'');
  for(const k of T.techs){
    if(techHas(1,k))continue;const r=T.want==='arms'?'gold':T.want,n=r==='gold'?180:250;
    a+=btn(`svc:tech:${T.i}:${k}`,'',`${TECHS[k].name}: ${TECHS[k].desc} Preço: levar ${n} de ${RES_NAME[r]} até ${T.name}.`,`<span class="glyph">${TECHS[k].glyph}</span><span>${TECHS[k].name}</span>${rep<2?'<span class="lock">★★</span>':`<span class="cost">${costHTML({[r]:n})}</span>`}`,rep<2||!free||R[r]<n?'off':'');
  }
  const mine=Object.keys(TECHS).filter(k=>techHas(1,k)&&!T.known[k]),theirs=T.techs.filter(k=>!techHas(1,k));
  if(mine.length&&theirs.length){const k=theirs[0],g=mine[0];a+=btn(`svc:swap:${T.i}:${k}:${g}`,'',`Trocar tecnologia: vocês ensinam ${TECHS[g].name} e aprendem ${TECHS[k].name}. Um sábio leva os pergaminhos de carroça.`,`<span class="glyph">⇄</span><span>Trocar: ${TECHS[k].name}</span>${rep<1?'<span class="lock">★</span>':'<span class="cost">só a viagem</span>'}`,rep<1||!free?'off':'');}
  a+=`<div class="hint" style="flex:none;width:36ch"><b>${TOWN_TITLE[T.lvl||1]} nível ${T.lvl||1}</b> · ${T.pop||0} moradores · tesouro ${Math.floor(T.gold||0)}. <b>Amizade: ${FRIEND[friendOf(T,1)]}</b> ${repStars(rep)}. ${FRIEND_PERKS[friendOf(T,1)]} Carroças: ${svcActive(1)}/${svcSlots(1)}.</div>`;
  return a;
}
// reports arrive one at a time on a card; the reporter reads the first lines aloud
const reportQ=[];
function showReport(){
  const el=$('report'),r=reportQ[0];
  if(!r){el.hidden=true;return;}
  $('rp-av').src=`assets/${r.av}.png`;$('rp-who').textContent=r.who+' traz um relatório';$('rp-title').textContent=r.title+(r.ok?' · cumprido':' · fracassou');
  $('rp-lines').innerHTML=r.lines.map(l=>`<li>${l.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</li>`).join('');
  el.classList.toggle('bad',!r.ok);$('b-rp-see').hidden=!r.loc;
  el.style.top=($('top').getBoundingClientRect().bottom+8)+'px';
  el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';
  playSfx(r.ok?'build':'foe-era');
  voxSpeak(r.lines.slice(0,1).concat(r.lines[r.lines.length-2]||[]).join(' '),'warrior',false,2,r.id);
}
HOOK.report=r=>{reportQ.push(r);if(reportQ.length===1)showReport();renderSvc();};
$('b-rp-ok').addEventListener('click',()=>{reportQ.shift();showReport();});
$('b-rp-see').addEventListener('click',()=>{const r=reportQ[0];if(r&&r.loc){const e=r.loc.id&&byId.get(r.loc.id);const p=e&&!e.dead?e:r.loc;centerOn(p.x,p.y);if(e&&!e.dead&&e.team===1)select([e]);}});
HOOK.ambush=(m,u)=>{
  ui.lastAlarm={x:u.x,y:u.y};FX.pings.push({x:u.x,y:u.y,t:0,col:'#ff5a4a'});playSfx('alarm');MUS.tenseT=AT;
  toast(`Emboscada! Bandidos atacam a carroça (${SVC_NAME[m.type].toLowerCase()}).`,'warn',{x:u.x,y:u.y});
  setTimeout(()=>{if(S&&!u.dead)voxSay(u,'taunt',3,true);},400);
};
HOOK.svc=(what,m,x)=>{
  const lead=byId.get(m.lead),loc=lead?{x:lead.x,y:lead.y,id:lead.id}:null;
  if(what==='start'){toast(`${SVC_NAME[m.type]}: a comitiva partiu${m.escCount?` com ${m.escCount} de escolta`:''}.`,'good',loc);const sp=svcEsc(m)[0]||lead;if(sp)voxSay(sp,'move',2,true);}
  else if(what==='paid'){const T=S.towns&&S.towns[m.town];toast(`${T?T.name:'A vila'} pagou: ${(m.got||[]).slice(-1)[0]||''}${S.t>m.deadline?' (com atraso)':''}.`,'good',loc);}
  else if(what==='lost')toast('A carroça foi destruída! Os sobreviventes voltam para contar o que houve.','warn',loc);
  else if(what==='supply')toast(`Suprimentos entregues: ${x} soldados mais fortes por 2 minutos e meio.`,'good',loc);
  renderSvc();
};
// the board: what is on the road and what came back
function renderSvc(){
  if(!S)return;
  const L=svcList(),run=L.list.filter(m=>m.team===1&&m.state==='run');
  councilBadge();
  if(!councilOpen()||COUNCIL.tab!=='road')return;
  $('svc-sum').textContent=`Carroças na estrada: ${run.length}/${svcSlots(1)}. ${S.towns&&S.towns.length?`Vilas neutras: ${S.towns.map(t=>`${t.name} (${TOWN_TITLE[t.lvl||1].toLowerCase()} nível ${t.lvl||1}, ${t.pop||0} moradores) ${repStars(repOf(t,1))} ${FRIEND[friendOf(t,1)]}`).join(' · ')}.`:'Neste modo não há vilas neutras: só os suprimentos para a tropa.'}`;
  $('svc-run').innerHTML=run.length?run.map(m=>{
    const lead=byId.get(m.lead),Lg=m.legs[m.leg],p=Lg&&lead?legPoint(m,Lg):null,prog=p&&Lg.len?Math.max(0,Math.min(1,1-hyp(lead.x-p.x,lead.y-p.y)/Lg.len)):0;
    const T=S.towns&&S.towns[m.town],stage=Lg?(Lg.to==='home'?'volta':Lg.to==='A'?'indo buscar o mercador':'ida'):'';
    return `<div class="svc-item"><div class="grow"><b>${SVC_NAME[m.type]}</b>${T?` · ${m.type==='escort'?T.name+' → '+S.towns[m.town2].name:T.name}`:''} · ${stage} · escolta ${svcEsc(m).length} · risco ${riskName(m.risk)} · prazo ${fmtT(m.deadline-S.t)}<div class="bar"><i style="width:${Math.round(prog*100)}%"></i></div></div><button class="btn alt sm-btn" type="button" data-see="${m.lead}">Ver</button></div>`;}).join(''):'<p class="meta">Nenhuma carroça na estrada agora.</p>';
  $('svc-log').innerHTML=L.log.length?L.log.slice(0,10).map(r=>`<div class="svc-item ${r.ok?'good':'bad'}"><div class="grow"><b>${r.title}</b> · ${r.who} · ${fmtT(r.t)}<ul>${r.lines.map(l=>`<li>${l}</li>`).join('')}</ul></div></div>`).join(''):'<p class="meta">Ainda não chegou nenhum relatório.</p>';
}
$('svc-run').addEventListener('click',ev=>{const b=ev.target.closest('[data-see]');if(!b)return;const e=byId.get(+b.dataset.see);if(e&&!e.dead){$('ov-council').hidden=true;centerOn(e.x,e.y);if(e.team===1)select([e]);}});

// ---------------------------------------------------------------- HUD
function fmt(s){s=Math.max(0,Math.ceil(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function hud(){
  if(!S)return;
  const T=S.teams[1],F=S.teams[2];
  $('r-wood').textContent=Math.floor(T.res.wood);$('r-gold').textContent=Math.floor(T.res.gold);$('r-food').textContent=Math.floor(T.res.food);
  $('r-pop').textContent=`${popUsed(1)}/${popCap(1)}`;
  $('r-era').innerHTML=`<b>Era ${ERAS[T.era].roman}</b>`+(T.research?` → ${ERAS[T.research.era].roman}`:'');
  $('r-era-bar').style.width=T.research?(T.research.t/ERAS[T.research.era].time*100)+'%':'0';
  const wi=waveInfo();
  if(wi&&!S.ai){
    const html=`<b>${wi.label}</b>`+(wi.inT!=null&&wi.inT>0?` · ${fmt(wi.inT)}`:'')+(wi.active?` · ${wi.active}<span class="lg"> inimigos</span>`:'');
    if($('r-foe').innerHTML!==html)$('r-foe').innerHTML=html;
    $('r-foe-bar').style.width='0';
    $('c-foe').classList.toggle('warn',wi.active>0);
  }else{
  const peace=S.t<S.diff.peace;
  $('r-foe').innerHTML=`<b><span class="lg">Vermelho</span><span class="sm">Verm.</span> ${ERAS[F.era].roman}</b>`+(peace?` · <span class="lg">trégua </span>${fmt(S.diff.peace-S.t)}`:S.ai&&S.ai.attacking?' · atacando':'');
  $('r-foe-bar').style.width=F.research?(F.research.t/ERAS[F.research.era].time*100)+'%':'0';
  const atk=!!(S.ai&&S.ai.attacking);
  $('c-foe').classList.toggle('warn',atk);
  if(atk&&!ui.foeAttacking&&!S.over){const tg=S.ai&&byId.get(S.ai.target);toast('O exército vermelho está marchando contra você!','warn',tg?centerOf(tg):null);playSfx('march');}
  ui.foeAttacking=atk;
  }
  renderGoals();renderAsk();
  const idle=S.ents.filter(e=>!e.dead&&e.kind==='pawn'&&e.team===1&&!e.order).length;
  $('b-idle').textContent=`Ociosos (${idle})`;
  $('b-pause').textContent=ui.paused?'Continuar':'Pausar';
  $('b-speed').textContent=ui.speed+'x';
  ui.svcT=(ui.svcT||0)+1;if(ui.svcT>=5){ui.svcT=0;renderSvc();sosTick();if(!$('ov-sos').hidden)renderSos();if(councilOpen())renderCouncil();}
  moodChip();
  {const tb=$('top').getBoundingClientRect().bottom+6,ts=$('toasts');if(Math.abs((parseFloat(ts.style.top)||0)-tb)>1)ts.style.top=tb+'px';}
  $('b-sound').textContent=SND.on||MUS.on?'Som':'Mudo';$('b-sound').classList.toggle('on',!SND.on&&!MUS.on);
}
function renderEras(){
  const T=S?S.teams[1]:{era:1};
  $('era-list').innerHTML=ERAS.slice(1).map(E=>{
    const st=E.n<T.era?'done':E.n===T.era?'now':'';
    const cost=E.cost?Object.entries(E.cost).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(', '):'Ponto de partida';
    const req=E.req?` · precisa de ${E.req.map(k=>DEF[k].name).join(' e ')}`:'';
    return `<li class="${st}"><div class="num">${E.roman}</div><div><h5>${E.name}${st==='now'?' (você está aqui)':''}</h5><p>${E.unlock||'Castelo, peões, casas, fazendas e quartel com guerreiros.'}</p><p class="meta">${cost}${req}${E.time?` · ${E.time}s no castelo`:''}</p></div></li>`;
  }).join('');
}
let idleIdx=0;
function selectIdle(){
  const idle=S.ents.filter(e=>!e.dead&&e.kind==='pawn'&&e.team===1&&!e.order);
  if(!idle.length){toast('Nenhum peão ocioso.');return;}
  const e=idle[idleIdx++%idle.length];select([e]);centerOn(e.x,e.y);
}
function selectArmy(){
  const army=S.ents.filter(e=>!e.dead&&e.team===1&&DEF[e.kind].mil);
  if(!army.length){toast('Você ainda não tem exército. Construa um quartel.');return;}
  select(army);
}
// ---------------------------------------------------------------- menu
const SAVE_KEY='reinoPequeno.v1';
function loadSave(){
  const def={unlocked:1,hero:'warrior',heroes:{},best:{}};
  try{const v=JSON.parse(localStorage.getItem(SAVE_KEY)||'null');if(v&&typeof v==='object')return Object.assign(def,v);}catch(e){}
  return def;
}
function writeSave(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(ui.save));}catch(e){}}
// the match in progress is kept on the device: every 40 s of play, and whenever the app goes to the background
const MATCH_KEY='reinoPequeno.partida',MATCH_INFO='reinoPequeno.partida.info',MODE_NAME={campaign:'Campanha',skirmish:'Batalha Rápida',survival:'Defesa do Rei'};
function matchOut(k,v){if(v instanceof Uint8Array)return {__u8:Array.from(v)};if(v instanceof Set)return {__set:[...v]};if(typeof v==='number'&&!isFinite(v))return {__num:String(v)};return v;}
function matchIn(k,v){if(v&&typeof v==='object'&&!Array.isArray(v)){if(v.__u8)return Uint8Array.from(v.__u8);if(v.__set)return new Set(v.__set);if(v.__num)return Number(v.__num);}return v;}
function saveMatch(){
  if(!S||!ui.started)return;
  if(S.over){clearMatch();return;}
  try{
    localStorage.setItem(MATCH_KEY,JSON.stringify({v:1,cam:{x:cam.x,y:cam.y,z:cam.z},last:ui.last||null,S},matchOut));
    localStorage.setItem(MATCH_INFO,JSON.stringify({mode:S.mode,chapter:S.chapter||0,diff:S.diff&&S.diff.name,t:S.t,when:Date.now()}));
    ui.savedT=S.t;
  }catch(e){ui.savedT=S.t;}
}
function clearMatch(){try{localStorage.removeItem(MATCH_KEY);localStorage.removeItem(MATCH_INFO);}catch(e){}}
function savedMatchInfo(){
  try{const i=JSON.parse(localStorage.getItem(MATCH_INFO)||'null');if(!i||!localStorage.getItem(MATCH_KEY))return null;
    const d=new Date(i.when),hm=`${d.getDate()}/${d.getMonth()+1} às ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`;
    return `${MODE_NAME[i.mode]||'Partida'}${i.mode==='campaign'&&i.chapter?' · capítulo '+i.chapter:''} · ${i.diff||''} · ${fmt(i.t)} de jogo · salva em ${hm}`;
  }catch(e){return null;}
}
// ---------------------------------------------------------------- updates for the downloaded game
// The offline package starts through a small loader that runs the newest copy kept on the device.
// "Procurar atualização" fetches a newer copy from the update address (the GitHub repository) and keeps it there.
const UPD={ver:+window.__RP_VER||0,name:window.__RP_NAME||'',src:'',busy:false,next:null};
try{UPD.src=localStorage.getItem('rp.src')||window.__RP_SRC||'';}catch(e){UPD.src=window.__RP_SRC||'';}
const updOn=()=>!!(UPD.ver&&UPD.src);
function idbOpen(){return new Promise((ok,no)=>{try{const r=indexedDB.open('reino-pequeno',1);r.onupgradeneeded=()=>r.result.createObjectStore('kv');r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error);}catch(e){no(e);}});}
async function keepVersion(ver,name,html){
  if(window.AndroidStore){if(!window.AndroidStore.save(ver,html))throw new Error('não coube na memória do celular');return;}
  const db=await idbOpen();
  await new Promise((ok,no)=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').put({ver,name,html,at:Date.now()},'jogo');tx.oncomplete=ok;tx.onerror=()=>no(tx.error);tx.onabort=()=>no(tx.error||new Error('sem espaço para guardar'));});
}
async function dropVersion(){
  if(window.AndroidStore){try{window.AndroidStore.clear();}catch(e){}return;}
  try{const db=await idbOpen();await new Promise(ok=>{const tx=db.transaction('kv','readwrite');tx.objectStore('kv').delete('jogo');tx.oncomplete=ok;tx.onerror=ok;});}catch(e){}
}
function restartGame(){if(window.AndroidStore&&window.AndroidStore.restart)window.AndroidStore.restart();else location.reload();}
function updDlg(title,text,o){
  o=o||{};$('ov-upd').hidden=false;$('upd-title').textContent=title;$('upd-text').textContent=text||'';
  const ul=$('upd-notes');ul.textContent='';for(const n of (o.notes||[]).slice(0,12)){const li=document.createElement('li');li.textContent=String(n);ul.appendChild(li);}
  $('b-upd-go').hidden=!o.go;$('upd-bar').hidden=!o.bar;$('b-upd-close').hidden=!!o.busy;
  $('b-upd-reset').hidden=!(o.reset&&window.__RP_FROM==='update');
}
function updButton(){
  const b=$('b-upd');if(!b)return;b.hidden=!updOn();if(!updOn())return;
  b.classList.toggle('new',!!UPD.next);
  $('upd-info').textContent=UPD.next?`Versão ${UPD.next.name} disponível!`:`Você tem a versão ${UPD.name}`;
  $('ver-info').textContent=` Versão ${UPD.name}${window.__RP_FROM==='update'?' (atualizada)':''}.`;
}
async function checkUpdate(manual){
  if(!updOn()||UPD.busy)return;
  if(manual)updDlg('Procurando atualização...','Conferindo se existe uma versão mais nova do Reino Pequeno.',{busy:true});
  if(navigator.onLine===false){if(manual)updDlg('Sem internet','Conecte o aparelho à internet só para baixar a atualização. Depois o jogo continua funcionando offline.',{reset:true});return;}
  UPD.busy=true;
  try{
    const r=await fetch(UPD.src+'versao.json?t='+Date.now(),{cache:'no-store'});
    if(!r.ok)throw new Error(r.status===404?'ainda não há atualizações publicadas':'o servidor respondeu '+r.status);
    const j=await r.json();
    try{localStorage.setItem('rp.check',String(Date.now()));}catch(e){}
    UPD.next=(+j.ver>UPD.ver)?j:null;updButton();
    if(manual){
      if(UPD.next)updDlg(`Versão ${j.name} disponível`,`Você tem a ${UPD.name}. A atualização baixa uns ${Math.max(1,Math.round((+j.bytes||3e6)/1e6))} MB e depois funciona sem internet. A partida em andamento fica salva.`,{go:true,notes:j.notas,reset:true});
      else updDlg('Você já tem a versão mais nova',`Versão ${UPD.name}. Quando sair uma nova, este botão fica verde.`,{reset:true});
    }else if(UPD.next)toast(`Nova versão ${j.name} do Reino Pequeno disponível: toque em Procurar atualização no menu.`,'good');
  }catch(e){
    if(manual)updDlg('Não deu para procurar agora',`Não consegui falar com o endereço de atualização: ${e.message||e}. Verifique a internet e tente de novo.`,{reset:true});
  }finally{UPD.busy=false;}
}
async function applyUpdate(){
  const j=UPD.next;if(!j||UPD.busy)return;UPD.busy=true;
  updDlg(`Baixando a versão ${j.name}...`,'Não feche o jogo.',{bar:true,busy:true});
  const fill=f=>{$('upd-fill').style.width=Math.round(Math.max(0,Math.min(1,f))*100)+'%';};fill(0);
  try{
    const r=await fetch(UPD.src+(j.file||'jogo.html')+'?v='+j.ver,{cache:'no-store'});
    if(!r.ok)throw new Error('o servidor respondeu '+r.status);
    const total=+j.bytes||+r.headers.get('content-length')||0;let bytes;
    if(r.body&&r.body.getReader){
      const rd=r.body.getReader(),parts=[];let got=0;
      for(;;){const {done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;if(total)fill(got/total);}
      bytes=new Uint8Array(got);let o=0;for(const q of parts){bytes.set(q,o);o+=q.length;}
    }else bytes=new Uint8Array(await r.arrayBuffer());
    fill(1);
    if(j.sha256&&window.crypto&&crypto.subtle){
      const h=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
      if(h!==j.sha256)throw new Error('o arquivo chegou incompleto');
    }
    const html=new TextDecoder('utf-8').decode(bytes);
    if(html.indexOf('__RP_VER='+j.ver+';')<0)throw new Error('o arquivo baixado não é o jogo');
    saveMatch();
    await keepVersion(+j.ver,j.name,html);
    try{localStorage.removeItem('rp.bad');localStorage.removeItem('rp.try');}catch(e){}
    updDlg(`Versão ${j.name} instalada!`,'Reiniciando o jogo...',{busy:true});
    setTimeout(restartGame,900);
  }catch(e){
    UPD.busy=false;
    updDlg('A atualização não terminou',`${e.message||e}. Nada foi alterado: você continua com a versão ${UPD.name}.`,{go:true,notes:j.notas,reset:true});
  }
}
$('b-upd').addEventListener('click',()=>{audioInit();if(UPD.next)updDlg(`Versão ${UPD.next.name} disponível`,`Você tem a ${UPD.name}. A partida em andamento fica salva.`,{go:true,notes:UPD.next.notas,reset:true});else checkUpdate(true);});
$('b-upd-go').addEventListener('click',applyUpdate);
$('b-upd-close').addEventListener('click',()=>{$('ov-upd').hidden=true;});
$('b-upd-reset').addEventListener('click',()=>{updDlg('Voltando à versão original...','',{busy:true});dropVersion().then(()=>{try{localStorage.removeItem('rp.try');}catch(e){}setTimeout(restartGame,500);});});
function loadBtn(){const inf=savedMatchInfo();$('b-load').hidden=!inf||!!(ui.started&&S&&!S.over);$('load-info').textContent=inf||'';}
function resumeMatch(){
  let d=null;try{d=JSON.parse(localStorage.getItem(MATCH_KEY)||'null',matchIn);}catch(e){d=null;}
  if(!d||!d.S){clearMatch();toast('Não consegui abrir a partida salva.');renderMenu();return;}
  S=d.S;afterLoad();
  if(d.cam)Object.assign(cam,d.cam);clampCam();
  ui.last=d.last||{mode:S.mode,diff:S.diff&&S.diff.key,chapter:S.chapter};
  audioInit();
  ui.started=true;ui.paused=true;ui.sel=[];ui.placing=null;ui.targeting=null;ui.foeAttacking=false;ui.speed=1;ui.goalsHTML='';ui.goalsMin=VW<760;ui.savedT=S.t;
  talkQ.length=0;$('talk').hidden=true;
  $('ov-start').hidden=true;$('ov-end').hidden=true;
  document.querySelector('#c-foe img').src=S.mode==='skirmish'?'assets/ic_enemy.png':'assets/ic_wild.png';
  $('c-foe').title=S.mode==='skirmish'?'Reino Vermelho':'Próximo ataque';
  refreshPanel(true);hud();
  banner('Partida retomada',MODE_NAME[S.mode]||'',`${fmt(S.t)} de jogo. O jogo está pausado: toque em Continuar quando estiver pronto.`,false);
}
ui.save=loadSave();
ui.chapter=Math.min(5,ui.save.unlocked||1);
const newSeed=()=>(Math.random()*1e9)|0;
ui.seed=newSeed();
const radio=n=>{const r=document.querySelector(`input[name="${n}"]:checked`);return r?r.value:null;};
function renderMenu(){
  const mode=radio('mode')||'campaign';
  $('hero-box').hidden=mode==='skirmish';
  $('chap-box').hidden=mode!=='campaign';
  const cur=radio('hero')||ui.save.hero||'warrior';
  $('hero-list').innerHTML=Object.entries(HEROES).map(([k,H])=>{
    const h=ui.save.heroes[k],rk=h&&(h.kills||h.rank)?`${RANKS[h.rank||0].n}, ${h.kills||0} abates`:H.desc;
    return `<label><input type="radio" name="hero" value="${k}"${k===cur?' checked':''}><span><img alt="" src="assets/${H.av}.png"><b>${H.name}</b><small>${H.role}</small><em class="rk">${rk}</em></span></label>`;
  }).join('');
  const un=ui.save.unlocked||1;
  $('chap-list').innerHTML=CHAPTERS.slice(1).map(C=>`<button type="button" data-ch="${C.n}" class="${C.n===ui.chapter?'on':''}${C.n<un?' done':''}"${C.n>un?' disabled title="Termine o capítulo anterior"':''}><b>${C.n}. ${C.title}</b>${C.n>un?'Bloqueado':C.place}</button>`).join('');
  drawPreview();
  $('b-start').textContent=mode==='campaign'?`Começar capítulo ${ui.chapter}`:mode==='survival'?'Defender o rei':'Começar batalha';
}
function drawPreview(){
  const mode=radio('mode')||'campaign';
  const M=previewMap(ui.seed,null,mode),c=$('map-prev'),g=c.getContext('2d'),s=Math.min(192/M.w,128/M.h),W=M.w;
  g.clearRect(0,0,c.width,c.height);
  const grass=BIOMES[M.biome].grass;
  for(let y=0;y<M.h;y++)for(let x=0;x<W;x++){const i=y*W+x,t=M.tiles[i],under=y>0&&M.elev[i-W]>M.elev[i];
    g.fillStyle=M.ramp[i]?'#e2dacb':under?'#6d6a60':t===WATER?'#47aba9':t===ROAD?'#d8b97e':t===TREE?'#2f6b4a':M.elev[i]?shade(grass,LV_SHADE[M.elev[i]]):grass;g.fillRect(x*s,y*s,s,s);}
  const red=mode==='skirmish'||mode==='campaign'&&ui.chapter===5;
  const mk=(p,col)=>{g.fillStyle='#2b2232';g.fillRect(p.tx*s-2,p.ty*s-2,5*s+4,4*s+4);g.fillStyle=col;g.fillRect(p.tx*s,p.ty*s,5*s,4*s);};
  mk(M.P,'#3f6fd4');if(red)mk(M.A,'#d6453a');
  $('map-name').textContent=`${SHAPES[M.shape]} · ${BIOMES[M.biome].name}`;
  $('map-desc').textContent=`Mapa nº ${ui.seed}. ${(()=>{const top=Math.max(...M.elev);return top>=3?'Montanhoso, com morros de até 4 alturas: cada nível acima do inimigo dá mais dano, e torres no alto atiram bem mais longe.':top?'Com colinas: tropas no alto causam mais dano e arqueiros atiram mais longe.':'Este mapa saiu plano.';})()} Cada partida sorteia um mapa novo: formato, terreno, florestas, ouro, covis e animais.`;
}
document.querySelectorAll('input[name="mode"]').forEach(r=>r.addEventListener('change',renderMenu));

$('hero-list').addEventListener('change',()=>{ui.save.hero=radio('hero');writeSave();});
$('chap-list').addEventListener('click',ev=>{const b=ev.target.closest('[data-ch]');if(!b||b.disabled)return;ui.chapter=+b.dataset.ch;renderMenu();});
$('b-reroll').addEventListener('click',()=>{ui.seed=newSeed();drawPreview();playSfx('click');
  if(!ui.started){const c=newGame(ui.seed,'dificil');centerOn(c.x+30,c.y-10);}});
function showMenu(){
  ui.paused=true;$('ov-end').hidden=true;
  $('b-resume').hidden=!(ui.started&&S&&!S.over);
  loadBtn();
  renderMenu();$('ov-start').hidden=false;
}
function startGame(p){
  p=p||{};
  const mode=p.mode||radio('mode')||'campaign',diff=p.diff||radio('diff')||'dificil';
  const opts={mode,relief:p.relief,fog:p.fog!=null?p.fog:!!$('opt-fog').checked};
  if(mode!=='skirmish'){const key=p.hero||radio('hero')||ui.save.hero||'warrior';ui.save.hero=key;writeSave();const h=ui.save.heroes[key]||{};opts.hero={key,kills:h.kills||0,rank:h.rank||0};}
  if(mode==='campaign')opts.chapter=p.chapter||ui.chapter;
  const c=newGame(ui.seed,diff,opts);
  ui.last={mode,diff,chapter:opts.chapter,hero:opts.hero&&opts.hero.key,fog:opts.fog};COUNCIL.log.length=0;COUNCIL.last='';ui.townTab='com';
  ui.seed=newSeed();
  audioInit();
  ui.started=true;ui.paused=false;ui.sel=[];ui.placing=null;ui.targeting=null;ui.foeAttacking=false;ui.speed=1;ui.goalsHTML='';ui.goalsMin=VW<760;
  talkQ.length=0;$('talk').hidden=true;
  cam.z=VW<700?1.15:1.5;centerOn(c.x+30,c.y-10);
  $('ov-start').hidden=true;$('ov-end').hidden=true;
  document.querySelector('#c-foe img').src=mode==='skirmish'?'assets/ic_enemy.png':'assets/ic_wild.png';
  $('c-foe').title=mode==='skirmish'?'Reino Vermelho':'Próximo ataque';
  refreshPanel(true);hud();
  if(mode==='campaign'){
    const C=CHAPTERS[opts.chapter];
    showStory(C.intro,`Capítulo ${C.n} · ${C.place}`,C.title,()=>{banner(`Capítulo ${C.n}`,C.title,`${SHAPES[S.shape]} · ${BIOMES[S.biome].name}. Os objetivos ficam no canto da tela.`,false);});
  }else if(mode==='survival'){
    banner('Defesa do Rei','Proteja o rei',`A primeira onda chega em ${fmt(waveInfo().inT)}. Forje armas e escudos no castelo.`,false);
    setTimeout(()=>talk('king','Eles vêm de todos os lados, onda após onda. Enquanto eu estiver de pé, Pedravale não cai.'),1800);
  }else banner('Começa a partida',ERAS[1].name,`Dificuldade ${S.diff.name}. Trégua de ${fmt(S.diff.peace)} antes do primeiro ataque grande.`,false);
}
$('b-idle').addEventListener('click',()=>S&&selectIdle());
$('b-army').addEventListener('click',()=>S&&selectArmy());
$('b-pause').addEventListener('click',()=>{ui.paused=!ui.paused;hud();});
$('b-speed').addEventListener('click',()=>{ui.speed=ui.speed===1?2:ui.speed===2?3:1;hud();});
// leaving the app (minimised, another tab, phone home button): pause the match and silence everything
function appAway(away){
  if(away){
    saveMatch();
    if(ui.started&&!ui.paused&&!(S&&S.over)){ui.paused=true;ui.awayPaused=true;try{hud();}catch(e){}}
    voxStop();
    if(SND.ac&&SND.ac.state==='running'){ui.awaySusp=true;SND.ac.suspend().catch(()=>{});}
  }else if(ui.awaySusp){ui.awaySusp=false;if(SND.ac)SND.ac.resume().catch(()=>{});}
}
document.addEventListener('visibilitychange',()=>appAway(document.visibilityState==='hidden'));
window.__appPause=h=>appAway(!!h);
// sound settings: effects, music (with volume) and the characters' voices
function sndApply(){
  const c=ui.save.snd||{};SND.on=c.sfx!==false;musSet(c.mus!==false,c.vol!=null?c.vol:.5);VOX.mode=c.vox||'voz';
  if(VOX.mode!=='voz'&&VOX.mode!=='murmurio')voxStop();
  const p=$('sndpop');if(!p)return;
  $('sp-sfx').checked=SND.on;$('sp-mus').checked=MUS.on;$('sp-vol').value=Math.round(MUS.vol*100);$('sp-vol').disabled=!MUS.on;
  for(const r of p.querySelectorAll('input[name="vox"]'))r.checked=r.value===VOX.mode;
  $('sp-novoice').hidden=!(VOX.mode==='voz'&&!VOX.ok);
}
function sndSave(patch){ui.save.snd=Object.assign(ui.save.snd||{},patch);writeSave();sndApply();hud();}
// the sound panel opens next to its button, always inside the screen
function openSnd(btn,above){
  audioInit();const p=$('sndpop');p.hidden=!p.hidden;if(p.hidden)return;sndApply();
  const r=btn.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;
  const left=Math.max(8,Math.min(innerWidth-w-8,r.right-w)),top=above?r.top-h-10:r.bottom+8;
  p.style.right='auto';p.style.left=left+'px';p.style.top=Math.max(8,Math.min(innerHeight-h-8,top))+'px';
}
$('b-sound').addEventListener('click',ev=>{openSnd($('b-sound'),false);ev.stopPropagation();});
document.addEventListener('pointerdown',ev=>{const p=$('sndpop');if(p&&!p.hidden&&!p.contains(ev.target)&&ev.target!==$('b-sound')&&ev.target!==$('b-sound2'))p.hidden=true;});
$('b-sound2').addEventListener('click',ev=>{openSnd($('b-sound2'),true);ev.stopPropagation();});
$('sp-sfx').addEventListener('change',e=>sndSave({sfx:e.target.checked}));
$('sp-mus').addEventListener('change',e=>{audioInit();sndSave({mus:e.target.checked});});
$('sp-vol').addEventListener('input',e=>sndSave({vol:+e.target.value/100}));
for(const r of document.querySelectorAll('#sndpop input[name="vox"]'))r.addEventListener('change',e=>{sndSave({vox:e.target.value});if(e.target.value!=='off'&&e.target.value!=='texto'){audioInit();voxSpeak(e.target.value==='voz'?'Olá! Assim eu falo.':'Olá! Assim eu falo.','pawn',false,3,2);}});
$('b-help').addEventListener('click',showMenu);
$('b-start').addEventListener('click',()=>startGame());
$('b-resume').addEventListener('click',()=>{ui.paused=false;$('ov-start').hidden=true;audioInit();});
$('b-load').addEventListener('click',resumeMatch);
window.addEventListener('pagehide',saveMatch);
$('b-again').addEventListener('click',()=>{const L=ui.last||{};startGame({mode:L.mode,diff:L.diff,chapter:L.chapter,hero:L.hero,fog:L.fog});});
$('b-next').addEventListener('click',()=>{const L=ui.last||{};ui.chapter=Math.min(5,(L.chapter||1)+1);startGame({mode:'campaign',diff:L.diff,chapter:ui.chapter,hero:L.hero,fog:L.fog});});
$('b-menu').addEventListener('click',showMenu);
$('c-era').addEventListener('click',()=>{renderEras();$('ov-eras').hidden=false;ui.erasPaused=!ui.paused;ui.paused=true;});
$('c-foe').addEventListener('click',()=>{if(!S)return;
  if(!S.ai){const w=S.ents.find(e=>!e.dead&&e.wave&&e.team!==1);if(w)centerOn(w.x,w.y);else{const i=waveInfo();toast(i&&i.inT!=null?`Próximo ataque em ${fmt(i.inT)}.`:'Nenhum ataque à vista.');}return;}
  const c=castleOf(2);if(S.ai&&S.ai.attacking&&ui.lastAlarm)centerOn(ui.lastAlarm.x,ui.lastAlarm.y);else if(c){toast(`Reino Vermelho: ${ERAS[eraOf(2)].name}. Dificuldade ${S.diff.name}.`);}});
$('b-eras').addEventListener('click',()=>{renderEras();$('ov-eras').hidden=false;});
$('b-eras-close').addEventListener('click',()=>{$('ov-eras').hidden=true;if(ui.erasPaused){ui.paused=false;ui.erasPaused=false;}});

// ---------------------------------------------------------------- input
const pts=new Map();let pinch=null;
function local(ev){const r=cv.getBoundingClientRect();return {x:ev.clientX-r.left,y:ev.clientY-r.top};}
cv.addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',ev=>{
  if(!S||!ui.started)return;
  audioInit();
  try{cv.setPointerCapture(ev.pointerId);}catch(e){}
  const p=local(ev);
  pts.set(ev.pointerId,{x:p.x,y:p.y,sx:p.x,sy:p.y,moved:false,type:ev.pointerType});
  if(ev.pointerType==='mouse'){
    ui.touchPlace=false;
    const w=toWorld(p.x,p.y);
    if(ev.button===2){
      if(ui.placing||ui.targeting){cancelModes();return;}
      const sel=liveSel();
      if(ownUnits().length)command(w.x,w.y);
      else if(sel.length===1&&sel[0].team===1&&DEF[sel[0].kind].trains)setRally(sel[0],w.x,w.y);
      return;
    }
    if(ev.button===1){ui.pan={x:p.x,y:p.y};ev.preventDefault();return;}
    if(ev.button===0){
      if(ui.targeting){castAt(w.x,w.y);return;}
      if(ui.placing){ui.ghost=ghostFor(ui.placing,w.x,w.y);confirmPlace();return;}
      ui.drag={x0:p.x,y0:p.y,x1:p.x,y1:p.y,active:false,shift:ev.shiftKey};
    }
  }else if(pts.size===2){const a=[...pts.values()];pinch={d:hyp(a[0].x-a[1].x,a[0].y-a[1].y),z:cam.z};}
});
cv.addEventListener('pointermove',ev=>{
  const p=local(ev);
  ui.mouse.x=p.x;ui.mouse.y=p.y;ui.mouse.in=true;
  if(S&&ui.placing&&ev.pointerType==='mouse'){const w=toWorld(p.x,p.y);ui.ghost=ghostFor(ui.placing,w.x,w.y);}
  const t=pts.get(ev.pointerId);if(!t)return;
  if(ev.pointerType==='mouse'){
    if(ui.pan){cam.x-=(p.x-ui.pan.x)/cam.z;cam.y-=(p.y-ui.pan.y)/cam.z;ui.pan={x:p.x,y:p.y};clampCam();}
    if(ui.drag){ui.drag.x1=p.x;ui.drag.y1=p.y;if(Math.abs(p.x-ui.drag.x0)+Math.abs(p.y-ui.drag.y0)>6)ui.drag.active=true;}
    return;
  }
  if(pts.size>=2&&pinch){
    t.x=p.x;t.y=p.y;const a=[...pts.values()];const d=hyp(a[0].x-a[1].x,a[0].y-a[1].y);
    zoomAt((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2,(pinch.z*d/pinch.d)/cam.z);
    for(const q of pts.values())q.moved=true;return;
  }
  if(!t.moved&&hyp(p.x-t.sx,p.y-t.sy)>9)t.moved=true;
  if(t.moved){cam.x-=(p.x-t.x)/cam.z;cam.y-=(p.y-t.y)/cam.z;clampCam();}
  t.x=p.x;t.y=p.y;
});
function endPointer(ev){
  const t=pts.get(ev.pointerId);pts.delete(ev.pointerId);
  if(pts.size<2)pinch=null;
  if(!S||!ui.started)return;
  const p=local(ev);
  if(ev.pointerType==='mouse'){
    if(ui.pan&&ev.button===1){ui.pan=null;return;}
    const d=ui.drag;ui.drag=null;if(!d||ev.button!==0)return;
    if(d.active){
      const a=toWorld(Math.min(d.x0,d.x1),Math.min(d.y0,d.y1)),b=toWorld(Math.max(d.x0,d.x1),Math.max(d.y0,d.y1));
      const inside=S.ents.filter(e=>!e.dead&&e.team===1&&DEF[e.kind].unit&&e.x>=a.x&&e.x<=b.x&&e.y-10>=a.y&&e.y-10<=b.y);
      if(inside.length)select(inside,d.shift);else if(!d.shift)select([]);
    }else{
      const w=toWorld(p.x,p.y),hit=pick(w.x,w.y),now=performance.now();
      if(hit&&hit.team===1&&DEF[hit.kind].unit&&ui.lastClick&&ui.lastClick.id===hit.id&&now-ui.lastClick.t<350){
        const vx0=cam.x,vy0=cam.y,vx1=cam.x+VW/cam.z,vy1=cam.y+VH/cam.z;
        select(S.ents.filter(e=>!e.dead&&e.team===1&&e.kind===hit.kind&&e.x>vx0&&e.x<vx1&&e.y>vy0&&e.y<vy1));
      }else select(hit?[hit]:[],d.shift);
      ui.lastClick={id:hit&&hit.id,t:now};
    }
    return;
  }
  if(t&&!t.moved&&ev.type==='pointerup'){
    const w=toWorld(p.x,p.y);
    if(ui.targeting){castAt(w.x,w.y);return;}
    if(ui.placing){ui.touchPlace=true;ui.ghost=ghostFor(ui.placing,w.x,w.y);if(LINE_KINDS.includes(ui.placing)&&!ui.wallA&&canPlace(1,ui.placing,ui.ghost.tx,ui.ghost.ty)){ui.wallA={...ui.ghost};}ui.actKey='';refreshPanel(true);return;}
    const hit=pick(w.x,w.y);
    // tapping anything of yours selects it, as in the first version; orders go to enemies, resources and the ground
    if(hit&&hit.team===1){select([hit]);return;}
    if(ownUnits().length){command(w.x,w.y);return;}
    select(hit?[hit]:[]);
  }
}
cv.addEventListener('pointerup',endPointer);
cv.addEventListener('pointercancel',endPointer);
cv.addEventListener('pointerleave',()=>{ui.mouse.in=false;});
cv.addEventListener('wheel',ev=>{ev.preventDefault();const p=local(ev);zoomAt(p.x,p.y,ev.deltaY<0?1.12:1/1.12);},{passive:false});
function miniJump(ev){const r=mini.getBoundingClientRect();centerOn((ev.clientX-r.left)/r.width*MW*TS,(ev.clientY-r.top)/r.height*MH*TS);}
mini.addEventListener('pointerdown',ev=>{if(!S)return;try{mini.setPointerCapture(ev.pointerId);}catch(e){}miniJump(ev);ui.miniDrag=true;});
mini.addEventListener('pointermove',ev=>{if(ui.miniDrag)miniJump(ev);});
mini.addEventListener('pointerup',()=>{ui.miniDrag=false;});
const keys=new Set();
window.addEventListener('keydown',ev=>{
  if(ev.target&&(ev.target.tagName==='INPUT'||ev.target.tagName==='TEXTAREA'))return;
  const k=ev.key.toLowerCase();keys.add(k);
  if(!S||!ui.started)return;
  const sel=liveSel(),single=sel.length===1?sel[0]:null;
  if(ui.confirm){if(k==='escape')closeConfirm(false);else if(k==='enter')closeConfirm(true);return;}
  if(k==='escape'){if(councilOpen())$('ov-council').hidden=true;else if(!$('ov-sos').hidden)$('ov-sos').hidden=true;else if(ui.placing||ui.targeting)cancelModes();else select([]);}
  else if((k==='delete'||k==='backspace')&&single&&single.team===1&&DEF[single.kind].building){ev.preventDefault();askDemolish(single);}
  else if(k==='p'){ui.paused=!ui.paused;hud();}
  else if(k===' '){ev.preventDefault();if(ui.lastAlarm)centerOn(ui.lastAlarm.x,ui.lastAlarm.y);}
  else if(k==='.')selectIdle();
  else if(k==='e')selectArmy();
  else if(k==='j'){if(councilOpen())$('ov-council').hidden=true;else openCouncil();}
  else if(k==='v'){ui.speed=ui.speed===1?2:ui.speed===2?3:1;hud();}
  else if(k==='m'){const on=!(SND.on||MUS.on);sndSave({sfx:on,mus:on});}
  else if(k==='h'){const c=castleOf(1);if(c)centerOn(c.x,c.y-40);}
  else if(k==='r'){if(single&&single.kind==='castle'&&single.team===1)doResearch();}
  else if('1234567890'.includes(k)&&k.length===1&&selPawns().length){const b=BUILD_LIST.find(x=>DEF[x].key===k);if(b)startPlacing(b);}
  else if((k==='q'||k==='w'||k==='z'||k==='x'||k==='t')&&single&&single.team===1&&single.built&&DEF[single.kind].trains){
    {const opt=DEF[single.kind].trains.filter(q=>q!=='merchant'||S.camps.length)['qwzxt'.indexOf(k)];if(opt)doTrain(single,opt);}
  }
  else if(k==='c'&&selMonks().length)startTargeting('convert');
  else if(k==='b'&&selMonks().length)startTargeting('bolt');
  else if(k==='f'&&selMonks().length)startTargeting('meteor');
  if(['arrowup','arrowdown','arrowleft','arrowright'].includes(k))ev.preventDefault();
});
window.addEventListener('keyup',ev=>keys.delete(ev.key.toLowerCase()));
window.addEventListener('blur',()=>keys.clear());
function panKeys(dt){
  const sp=650/cam.z*dt;let dx=0,dy=0;
  const single=liveSel().length===1;
  if(keys.has('a')||keys.has('arrowleft'))dx-=sp;if(keys.has('d')||keys.has('arrowright'))dx+=sp;
  if((keys.has('w')&&!(single&&DEF[liveSel()[0].kind].trains))||keys.has('arrowup'))dy-=sp;if(keys.has('s')||keys.has('arrowdown'))dy+=sp;
  if(dx||dy){cam.x+=dx;cam.y+=dy;clampCam();}
}

// ---------------------------------------------------------------- loop & boot
const STEP=1/30;
let last=performance.now(),hudT=0,acc=0;
function frame(now){
  const rdt=Math.min(.1,(now-last)/1000);last=now;AT+=rdt;
  if(S&&ui.started&&!ui.paused&&!S.over){
    acc+=rdt*ui.speed;let n=0;
    while(acc>=STEP&&n<10){update(STEP);acc-=STEP;n++;}
    if(n>=10)acc=0;
  }
  ui.alarmT-=rdt;
  ui.musT=(ui.musT||0)-rdt;if(ui.musT<=0){ui.musT=.5;try{musWatch();}catch(e){}}
  voxChatter(rdt);
  panKeys(rdt);
  if(!ui.paused)updFx(rdt);
  render();
  if(ui.started&&!ui.paused&&S&&!S.over&&S.t-(ui.savedT||0)>40)saveMatch();
  hudT-=rdt;if(hudT<=0&&S){hudT=.2;hud();refreshPanel(false);drawMini();ui.sel=ui.sel.filter(id=>{const e=byId.get(id);return e&&!e.dead;});}
  requestAnimationFrame(frame);
}
window.addEventListener('resize',resize);
function boot(data){
  resize();try{voxInit();}catch(e){}sndApply();
  if(data&&data.S){
    S=data.S;afterLoad();
    if(data.cam)Object.assign(cam,data.cam);
    ui.started=!!data.started;if(ui.started)$('ov-start').hidden=true;
  }else{
    const c=newGame(ui.seed,'dificil');
    cam.z=VW<700?1.15:1.5;centerOn(c.x+30,c.y-10);
  }
  councilBind();renderMenu();loadBtn();updButton();
  try{localStorage.removeItem('rp.try');}catch(e){}
  if(updOn()){let last=0;try{last=+localStorage.getItem('rp.check')||0;}catch(e){}if(Date.now()-last>6*3600e3)setTimeout(()=>checkUpdate(false),6000);}
  loadAssets(ok=>{
    assetsReady=ok;
    for(const k in iconCache)delete iconCache[k];
    if(S){buildTerrain();buildMiniBase();}
    ui.actKey='';refreshPanel(true);
  });
  refreshPanel(true);hud();
  requestAnimationFrame(t=>{last=t;frame(t);});
}
const hot=window.claude&&window.claude.hot;
if(hot&&typeof hot.snapshot==='function')hot.snapshot(()=>({S,cam:{x:cam.x,y:cam.y,z:cam.z},started:ui.started}));
if(hot&&typeof hot.ready==='function')hot.ready(boot);else boot((hot&&hot.data)||{});
window.__reino={get S(){return S},spawnFixed,playSfx,banner,toast,centerOn,musTick,startPlacing,townRaid,townHelpAnswer,svcOrder,svcList,MUS,musStep,musSection,musEnter,SND,musInit,MOODS,voxSay,VOX,startGame,showMenu,forgeItem,giveItem,waveInfo,goalState,CHAPTERS,ITEMS,talk,__addKill:addKill,spawnUnit,autoJob,afford,unlocked,castleOf,update,render,command,select,newGame,pick,confirmPlace,startPlacing,trainAt,ui,cam,DEF,byId,canPlace,refreshPanel,hud,drawMini,popUsed,popCap,startResearch,castAt,startTargeting,placeBuilding,ghostFor,ERAS,eraOf,FX,setRally,
  walkNear,armyUnits,damage,conquer,armyVoteShow,get BLDS(){return BLDS},sqOf,townFestival,removeQuiet,folkName,
  proposeContract,ctrList,ctrTerms,startConquest,armyOrder,armyOf,startSweep,planApprove,intelOf,econOpenStall,econOf,econSetTax,econFestival,addRep:(T,t,v)=>addRep(T,t,v),openCouncil,COUNCIL,sqCommand,honorOf,caravanSend,fogOn,
  setAT(v){AT=v;}};
