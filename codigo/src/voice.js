// ================================================================ voices: what the little people say
// Speech bubbles over their heads, spoken aloud with the browser's Portuguese voice when there is one,
// or as a sung murmur synthesised here. Modes: 'voz', 'murmurio', 'texto' (bubbles only), 'off'.
const VOX={mode:'voz',vol:.9,ok:false,list:[],male:null,female:null,cur:null,curPrio:0,lastAny:-99,lastSel:-99,chatT:18,lastLine:{},talkEnd:null};
const LINES={
  pawn:{
    select:['Sim?','Pois não?','Às ordens!','Diga, senhor!','Tô aqui!','O que precisa?','Pode falar!'],
    move:['Tô indo!','Já vou!','Certo!','Lá vou eu!','Entendido!'],
    build:['Martelo na mão!','Vou construir!','Deixa comigo!','Bora levantar isso!'],
    wood:['Vou cortar lenha!','Machado afiado!','Madeira boa, essa!'],
    gold:['Ouro, lá vou eu!','Vou minerar!','Brilha que é uma beleza!'],
    food:['Vou buscar comida!','Hora da colheita!','Ninguém passa fome aqui!'],
    attack:['Com essa faquinha?','Tá bom, tá bom!','Lá vou eu, com coragem!'],
    ready:['Pronto pra trabalhar!','Mais um par de mãos!','Cheguei, chefe!'],
    fear:['Socorro!','Corre, gente!','Inimigos!','Me ajudem!'],
    rank:['Olha só, subi de nível!'],
    chat:['Que sol bonito hoje.','Minhas costas doem...','Essa vila tá crescendo!','Alguém viu meu machado?','Uma cerveja na taberna ia bem.','Dizem que o engenheiro nunca dorme.','Ô trabalho que não acaba!','Será que chove amanhã?'],
    hungry:['Tô com fome...','Precisamos de mais comida!','Meu estômago tá roncando.'],
    nervous:['Ouvi barulho de espadas...','Fiquem perto do castelo!','Tomara que os soldados deem conta.'],
  },
  engineer:{
    select:['Mestre Gaspar, às ordens!','Tem obra pra mim?','Fala, chefe!','Planta na mão, pronto!'],
    move:['Vou ver isso de perto.','Já estou indo.','Certo, chefe.'],
    build:['Vou organizar a obra!','Deixa que eu coordeno.'],
    chat:['Mais uma casa e a vila respira.','Uma torre ali em cima seria perfeita.','Cadê a madeira, pessoal?','Esse morro dava uma ótima muralha.'],
  },
  warrior:{
    select:['Espada pronta!','Senhor!','Às suas ordens!','Pela coroa!','Diga, comandante!'],
    move:['Marchando!','Em frente!','Entendido!','A caminho!'],
    attack:['Ao ataque!','Por Pedravale!','Atacar!','Eles vão ver só!','Avante!'],
    ready:['Guerreiro pronto para a batalha!','Minha espada é sua!'],
    rank:['Subi de patente!','Mais uma estrela!'],
    chat:['Afiei a espada de novo.','Que venham!','Ninguém passa por aqui.','Esse escudo já viu muita coisa.'],
  },
  archer:{
    select:['Arco pronto!','Flechas no alvo!','Sim, senhor?','Olho de águia!'],
    move:['Mudando de posição!','Entendido!','Indo pro alto!'],
    attack:['Fogo!','Soltar flechas!','Mirando!','Na mosca!'],
    ready:['Arqueiro a postos!'],
    rank:['Pontaria de veterano!'],
    chat:['Do alto do morro eu acerto qualquer um.','Preciso de mais flechas.','O vento está a nosso favor.'],
  },
  royal:{
    select:['Arco real pronto.','Ninguém atira mais longe.','Ordens, senhor?'],
    move:['Procurando o ponto mais alto.','A caminho.'],
    attack:['Flechas pesadas, já!','Disparar!','Daqui eu alcanço!'],
    ready:['Arqueiro real a serviço da coroa!'],
    chat:['Um elmo de ferro faz toda a diferença.'],
  },
  lancer:{
    select:['Lança em riste!','Pronto!','Firme como rocha!'],
    move:['Avançando!','Em formação!','Certo!'],
    attack:['Lanças à frente!','Firme!','Segurem a linha!'],
    ready:['Lanceiro pronto!'],
    chat:['Nenhum cavalo passa por esta lança.'],
  },
  monk:{
    select:['Que a luz te guie.','Paz, irmão.','Estou ouvindo.'],
    move:['Sigo em paz.','Com calma, chegarei.'],
    attack:['Venha para a luz!','Wololo!','Que os céus decidam!'],
    heal:['Fique bem, filho.','Respira fundo.'],
    ready:['Que os céus nos protejam.'],
    chat:['Oremos pela colheita.','Até os bandidos têm salvação.'],
  },
  paladin:{
    select:['A luz me protege.','Escudo erguido!','Às ordens, com fé.'],
    move:['Avante, com fé!','Sigo na frente.'],
    attack:['Pela luz e pela coroa!','Ninguém cai ao meu lado!','Avante!'],
    ready:['Paladino pronto para proteger!'],
    chat:['Fiquem perto de mim e suas feridas fecham.','Esta armadura brilha até de noite.'],
  },
  wizard:{
    select:['Hmm? Estava lendo.','Magia pronta!','Fale logo, tenho feitiços a estudar.'],
    move:['Lá vamos nós...','Meus joelhos já não são os mesmos.'],
    attack:['Bola de fogo!','Queime!','Sintam o calor!'],
    ready:['O mago chegou. Afastem-se!'],
    chat:['Quem mexeu no meu chapéu?','Fogo resolve quase tudo.'],
  },
  scout:{
    select:['Olhos atentos!','Veloz como o vento!','Na escuta!'],
    move:['Já cheguei!','Voando!','Deixa comigo!'],
    attack:['Peguei você!','Surpresa!','Rapidinho!'],
    ready:['Batedor na área, pronto pra espiar!'],
    chat:['Vi fumaça lá pros lados do inimigo.','Ninguém me alcança!'],
  },
  ram:{
    select:['Pronto pra derrubar!','Aríete a postos!'],
    move:['Empurra, pessoal!','Devagar e sempre!'],
    attack:['Força! Um, dois... já!','Bate de novo!','Esse portão vai cair!'],
    ready:['Aríete pronto. Cadê o portão?'],
  },
  catapult:{
    select:['Carregada!','Catapulta pronta!'],
    move:['Empurrando a catapulta!','Cuidado com a roda!'],
    attack:['Lançar!','Pedra a caminho!','Lá vai!'],
    ready:['Catapulta montada!'],
  },
  boat:{select:['Barco pronto!','Todos a bordo?'],move:['Içar velas!','Remando!'],ready:['Barco na água!']},
  merchant:{select:['Bons negócios!','Tenho mercadorias!'],move:['Pela estrada!','Com cuidado com a carga.'],ready:['Mercador pronto para negociar!']},
  king:{select:['O rei escuta.','Fale, súdito.','Sim?'],move:['Sigam o seu rei!','Abram caminho!'],attack:['Por Pedravale!','Comigo, soldados!'],chat:['Um reino se faz com gente feliz.']},
  bandit:{taunt:['Passa o ouro!','Isso aqui agora é nosso!','Peguem tudo!','Ha! Vila fácil!','Ninguém segura a gente!']},
  red:{taunt:['Pelo Duque!','Ao ataque, Reino Vermelho!','Avante!','Esta terra é nossa!']},
};
// how each character sounds: speech pitch and rate, the murmur's base note, and a female voice when there is one
const VPROF={pawn:[1.15,1.1,210],engineer:[1,1.08,165],warrior:[.82,1.04,140],archer:[1,1.1,170],royal:[.92,1.04,160],lancer:[.74,1,120],monk:[.9,.92,150],
  paladin:[.8,.98,135],wizard:[.6,.88,105],scout:[1.2,1.2,250],ram:[.8,1.1,130],catapult:[.85,1.1,135],boat:[.9,1.05,150],merchant:[1.1,1.12,190],king:[.68,.9,115],
  bandit:[.68,1.05,120],red:[.82,1.05,135],
  // story characters (talk)
  duke:[.52,.92,100],captain:[.7,1,125],crow:[.58,.98,110],violet:[.95,1.05,240,1],marta:[1.15,1.08,250,1]};
function voxInit(){
  // the Android app has no Web Speech: it lends us the phone's own text-to-speech
  if(window.AndroidTTS){VOX.droid=true;VOX.ok=true;VOX.dN=0;window.__ttsDone=id=>{if(VOX.cur&&VOX.cur.droid===+id)voxEnded();};return;}
  if(!('speechSynthesis' in window))return;
  const load=()=>{
    let v=[];try{v=speechSynthesis.getVoices()||[];}catch(e){}
    const pt=v.filter(x=>/^pt/i.test(x.lang||'')),br=pt.filter(x=>/BR/i.test(x.lang));const L=br.length?br:pt;
    VOX.list=L;VOX.ok=L.length>0;VOX.local=L.filter(x=>x.localService!==false);
    const isF=x=>/female|mulher|feminin|luciana|francisca|maria|vit[oó]ria|leila|brenda|yara|thalita|raquel|camila|fernanda|google portugu/i.test(x.name);
    const isM=x=>/male|masculin|daniel|felipe|ant[oô]nio|ricardo|f[aá]bio|thiago|donato|j[uú]lio|humberto|joaquim/i.test(x.name)&&!/female/i.test(x.name);
    VOX.female=L.find(isF)||null;VOX.male=L.find(isM)||null;
    if(!VOX.male&&!VOX.female)VOX.male=VOX.female=L[0]||null;
  };
  load();try{speechSynthesis.addEventListener('voiceschanged',load);}catch(e){speechSynthesis.onvoiceschanged=load;}
}
function voxKey(e){
  if(!e)return 'pawn';const k=e.kind,D=DEF[k];
  if(e.team===3&&D.unit&&!e.ally)return 'bandit';
  if(e.team===2&&D.mil&&!LINES[k])return 'red';
  if(D.king)return 'king';if(D.naval)return 'boat';if(D.envoy)return 'merchant';
  if(LINES[k])return k;const b=baseKind(k);return LINES[b]?b:'warrior';
}
function voxFem(e,key){
  if(e&&e.hero&&HEROES[S.heroKey]&&/Dona|Dama|Ruiva|Capitã/.test(HEROES[S.heroKey].name))return true;
  const P=VPROF[key];if(P&&P[3])return true;
  if(key==='pawn')return hash((e?e.id:1)*7+3)<.5;
  return false;
}
function pickLine(key,cat){
  const L=LINES[key]&&LINES[key][cat]||(LINES.pawn[cat]&&key==='engineer'?LINES.pawn[cat]:null);if(!L||!L.length)return null;
  const lk=key+cat;let i=Math.floor(Math.random()*L.length);if(L.length>1&&i===VOX.lastLine[lk])i=(i+1)%L.length;VOX.lastLine[lk]=i;return L[i];
}
// a unit says a line: the bubble always (unless voices are off), the voice when it is on screen or it is ours
function voxSay(e,cat,prio,force){
  if(!e||e.dead||VOX.mode==='off'||!ui.started)return false;
  const key=voxKey(e),txt=pickLine(key,cat);if(!txt)return false;
  if(!force&&AT-VOX.lastAny<1.3&&(prio||0)<2)return false;
  VOX.lastAny=AT;
  FX.speech=(FX.speech||[]).filter(s=>s.id!==e.id);FX.speech.push({id:e.id,txt,t:0,dur:1.8+txt.length*.05});
  while(FX.speech.length>5)FX.speech.shift();
  const vis=e.x>cam.x-60&&e.x<cam.x+VW/cam.z+60&&e.y>cam.y-60&&e.y<cam.y+VH/cam.z+60;
  if(vis||e.team===1)voxSpeak(txt,key,voxFem(e,key),prio||1,e.id);
  return true;
}
function voxEnded(){VOX.cur=null;VOX.curPrio=0;musDuck(false);if(VOX.talkEnd){const f=VOX.talkEnd;VOX.talkEnd=null;f();}}
function voxStop(){try{if(window.speechSynthesis)speechSynthesis.cancel();}catch(e){}try{if(VOX.droid)window.AndroidTTS.stop();}catch(e){}if(VOX.cur)voxEnded();}
function voxSpeak(text,key,fem,prio,seed){
  if(VOX.mode==='off'||VOX.mode==='texto'||!SND.on)return;
  const P=VPROF[key]||VPROF.pawn,vary=1+(hash((seed||1)*13+5)-.5)*.14;
  const mum=()=>{murmur(text,P[2]*vary*(fem&&!P[3]?1.45:1));if(VOX.talkEnd){const f=VOX.talkEnd;VOX.talkEnd=null;setTimeout(f,700+text.length*55);}};
  if(VOX.mode==='voz'&&VOX.droid){
    try{
      const A=window.AndroidTTS;
      if(A.ok()){
        if(VOX.cur&&A.busy()&&prio<VOX.curPrio)return;
        const id=++VOX.dN;VOX.cur={droid:id};VOX.curPrio=prio;
        A.speak(text,Math.max(.3,Math.min(2,P[0]*vary*(fem?1.25:1))),Math.max(.6,Math.min(1.6,P[1])),id);
        musDuck(true);
        setTimeout(()=>{if(VOX.cur&&VOX.cur.droid===id)voxEnded();},2500+text.length*110);
        return;
      }
    }catch(e){}
    mum();return;
  }
  if(VOX.mode==='voz'&&VOX.ok){
    try{
      let v=fem?(VOX.female||VOX.male):(VOX.male||VOX.female);
      // offline, the online voices (Edge's "Natural" ones, say) cannot speak: use one that lives on this machine
      if(v&&v.localService===false&&(navigator.onLine===false||VOX.netFail)){const L=VOX.local||[];v=L.find(x=>fem===/female|mulher|feminin|luciana|francisca|maria|vit[oó]ria|leila|brenda|yara|thalita|raquel|camila|fernanda/i.test(x.name))||L[0]||null;if(!v){mum();return;}}
      if(speechSynthesis.speaking||speechSynthesis.pending){if(prio<VOX.curPrio)return;speechSynthesis.cancel();}
      const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';if(v)u.voice=v;
      // with a single voice for everyone, pitch does the work of telling characters apart
      const one=VOX.male===VOX.female;u.pitch=Math.max(.1,Math.min(2,P[0]*vary*(fem&&one?1.25:1)));u.rate=Math.max(.6,Math.min(1.6,P[1]));u.volume=VOX.vol;
      VOX.cur=u;VOX.curPrio=prio;
      u.onstart=()=>musDuck(true);
      u.onend=()=>{if(VOX.cur===u)voxEnded();};
      u.onerror=ev=>{if(VOX.cur!==u)return;const er=ev&&ev.error||'';
        if(!/interrupted|canceled/.test(er)){if(/network|unavailable|failed/.test(er))VOX.netFail=true;VOX.cur=null;VOX.curPrio=0;musDuck(false);mum();return;}
        voxEnded();};
      speechSynthesis.speak(u);return;
    }catch(e){}
  }
  mum();
}
// the murmur: a few sung syllables through vowel formants, rising on questions
const VOWELS=[[800,1150],[400,2000],[300,2300],[450,800],[350,700]];
function murmur(text,base){
  const ac=SND.ac;if(!ac||ac.state!=='running')return;
  const n=Math.max(2,Math.min(9,Math.round(text.replace(/[^a-zà-ú]/gi,'').length/3.2))),q=/\?$/.test(text.trim()),ex=/!$/.test(text.trim());
  let t=ac.currentTime+.02;
  const o=ac.createOscillator();o.type='sawtooth';const f1=ac.createBiquadFilter(),f2=ac.createBiquadFilter(),g=ac.createGain(),g2=ac.createGain();
  f1.type='bandpass';f1.Q.value=6;f2.type='bandpass';f2.Q.value=9;g2.gain.value=.5;g.gain.value=.0001;
  o.connect(f1);o.connect(f2);f1.connect(g);f2.connect(g2);g2.connect(g);g.connect(SND.master);
  const t0=t;
  for(let i=0;i<n;i++){
    const d=.075+Math.random()*.05,last=i===n-1,V=VOWELS[Math.floor(Math.random()*VOWELS.length)];
    let p=base*(1+(Math.random()-.5)*.25)*(ex&&i===0?1.2:1);if(last)p*=q?1.3:.82;
    o.frequency.setValueAtTime(p,t);o.frequency.linearRampToValueAtTime(p*(last&&q?1.15:.97),t+d);
    f1.frequency.setValueAtTime(V[0],t);f2.frequency.setValueAtTime(V[1],t);
    g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(ex?1.5:1.1,t+.015);g.gain.setValueAtTime(ex?1.5:1.1,t+d-.025);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    t+=d+.025;
  }
  o.start(t0);o.stop(t+.05);
}
// story dialogue: the character reads the whole line
function voxTalk(who,text,done){
  if(VOX.mode==='off'||VOX.mode==='texto')return false;
  const key=who==='engineer'?'engineer':who==='king'?'king':who==='bandit'?'bandit':VPROF[who]?who:'pawn';
  const fem=!!(VPROF[who]&&VPROF[who][3]);
  if(VOX.mode==='voz'&&VOX.ok&&SND.on){VOX.talkEnd=done||null;voxSpeak(text,key,fem,3,who.length);return true;}
  voxSpeak(text,key,fem,3,who.length);return false;
}
// the player's commands get an answer from one of the units
function voxCommand(units,act){
  if(!units.length)return;
  let u=units[0];
  if(act==='wood'||act==='gold'||act==='food'||act==='build')u=units.find(e=>e.kind==='pawn'||e.kind==='engineer')||u;
  const key=voxKey(u),cat=LINES[key]&&LINES[key][act]?act:act==='heal'?'move':(act==='wood'||act==='gold'||act==='food')?'move':act;
  voxSay(u,cat,2,true);
}
function voxSelect(list){
  const own=list.filter(e=>e&&e.team===1&&DEF[e.kind].unit);if(!own.length)return;
  if(AT-VOX.lastSel<.6)return;VOX.lastSel=AT;
  const pri=own.find(e=>e.hero||DEF[e.kind].king)||own.find(e=>e.kind==='engineer')||own[Math.floor(Math.random()*Math.min(3,own.length))];
  voxSay(pri,'select',2,true);
}
// now and then someone near the camera says something about life in the village
function voxChatter(dt){
  if(!S||!ui.started||S.over||VOX.mode==='off')return;
  VOX.chatT-=dt;if(VOX.chatT>0)return;VOX.chatT=16+Math.random()*16;
  if(AT-VOX.lastAny<6)return;
  const x0=cam.x,y0=cam.y,x1=cam.x+VW/cam.z,y1=cam.y+VH/cam.z;
  const vis=S.ents.filter(e=>!e.dead&&e.team===1&&DEF[e.kind].unit&&!DEF[e.kind].naval&&e.x>x0&&e.x<x1&&e.y>y0&&e.y<y1);
  if(!vis.length)return;
  const u=vis[Math.floor(Math.random()*vis.length)],key=voxKey(u);
  const T=S.teams[1];let cat='chat';
  if(MUS.want==='batalha'||MUS.want==='tensao')cat=key==='pawn'?'nervous':'attack';
  else if(key==='pawn'&&T.res.food<60&&Math.random()<.6)cat='hungry';
  if(!(LINES[key]&&LINES[key][cat]))cat='chat';
  voxSay(u,cat,1);
}

