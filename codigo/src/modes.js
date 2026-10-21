// ================================================================ game modes: Campanha (A Coroa de Pedravale), Defesa do Rei and Batalha Rápida
const ITEMS={
  ferramentas:{name:'Ferramentas de Ferro',icon:'icon01',desc:'Peões coletam 20% mais rápido.',cost:{wood:150,gold:50}},
  armas:     {name:'Armas Forjadas',icon:'icon05',desc:'Suas tropas causam 15% mais dano.',cost:{wood:100,gold:150}},
  escudos:   {name:'Escudos Reforçados',icon:'icon06',desc:'Suas tropas recebem 15% menos dano.',cost:{wood:200,gold:100}},
  pano:      {name:'Retalho do Estandarte',glyph:'⚑',col:'#3f6fd4',drop:true,desc:'Pedaço do Estandarte Real, rasgado pelos bandidos.'},
  estandarte:{name:'Estandarte Real',glyph:'⚑',col:'#e9b434',desc:'Castelo e quartéis treinam 30% mais rápido.',cost:{food:150,gold:100},need:{pano:2}},
  reliquia:  {name:'Relíquia Sagrada',glyph:'✚',col:'#e9b434',drop:true,desc:'Tesouro do mosteiro, roubado pelos saqueadores.'},
  relicario: {name:'Relicário Sagrado',glyph:'✚',col:'#7fd4ff',desc:'Monges curam em dobro e convertem 40% mais rápido.',cost:{gold:150},need:{reliquia:3}},
  aco:       {name:'Lingote de Aço',glyph:'▬',col:'#9aa7b8',drop:true,desc:'Aço dos ferreiros do Corvo Negro.'},
  ariete:    {name:'Aríete Real',glyph:'⚒',col:'#a8744a',desc:'Derruba o portão do castelo vermelho.',cost:{wood:300,gold:150},need:{aco:2}},
  coroa:     {name:'Coroa de Pedravale',glyph:'♛',col:'#e9b434',drop:true,desc:'A coroa roubada pelo Duque.'},
};
const CHAR={
  king:{name:'Rei Aldebrando',av:'av11'},
  duke:{name:'Malvar, o Duque Rubro',av:'av07'},
  captain:{name:'Capitão Rubro',av:'av06'},
  crow:{name:'Corvo Negro',av:'av21'},
  violet:{name:'Capitã Violeta',av:'av16'},
  marta:{name:'Marta, a aldeã',av:'av15'},
  engineer:{name:'Mestre Gaspar, engenheiro-chefe',av:'av05'},
  bandit:{name:'Chefe dos bandidos',av:'av25'},
};
const HEROES={
  warrior:{kind:'warrior',name:'Sir Tomás',av:'av01',role:'Guerreiro',desc:'Muita vida e golpe pesado. Vence arqueiros.'},
  lancer: {kind:'lancer',name:'Dona Isolda',av:'av02',role:'Lanceira',desc:'A mais resistente, com o alcance da lança. Vence guerreiros.'},
  archer: {kind:'archer',name:'Robério',av:'av03',role:'Arqueiro',desc:'Ataca de longe e corre bem. Vence lanceiros.'},
  monk:   {kind:'monk',name:'Irmão Bento',av:'av04',role:'Monge',desc:'Cura, converte e já sabe o Raio Divino.'},
  paladin:{kind:'paladin',name:'Dama Celeste',av:'av26',role:'Paladina',desc:'Armadura prateada: cura quem luta ao lado dela e ninguém a converte.'},
  wizard: {kind:'wizard',name:'Mestre Alvar',av:'av27',role:'Mago',desc:'Bolas de fogo que explodem em área. Frágil de perto.'},
  scout:  {kind:'scout',name:'Ruiva',av:'av28',role:'Batedora',desc:'A mais rápida do reino. Caça peões e mercadores e enxerga longe.'},
};
const CHAPTERS=[null,
{n:1,title:'Cinzas na Aldeia',place:'Aldeia de Pedravale',
  start:{res:{wood:250,gold:150,food:250},era:1,blds:[]},
  recipes:['ferramentas'],
  intro:[
    ['king','Pedravale vivia em paz até a noite em que meu primo, o Duque Malvar, roubou a Coroa e fugiu para o leste. Sem a coroa, o povo perdeu a fé, e os bandidos do Corvo Negro saíram das florestas.'],
    ['king','Eles queimaram a nossa aldeia. {hero}, preciso de você. Reconstrua as casas, plante comida e erga um quartel antes que eles voltem.'],
    ['crow','Um rei sem coroa e uma aldeia sem paredes... Vou voltar três vezes. Quero ver o que sobra no fim.'],
  ],
  goals:[
    {id:'house',text:'Construa 2 casas',type:'build',kind:'house',n:2},
    {id:'farm',text:'Construa uma fazenda',type:'build',kind:'farm',n:1},
    {id:'barracks',text:'Construa um quartel',type:'build',kind:'barracks',n:1},
    {id:'tools',text:'Forje as Ferramentas de Ferro no castelo',type:'item',item:'ferramentas',say:['marta','Com ferramentas de ferro a gente corta lenha na metade do tempo!']},
    {id:'waves',text:'Sobreviva aos 3 ataques do Corvo Negro',type:'waves',n:3},
  ],
  waves:[
    {t:150,team:3,from:'edge',units:{bandit:3,banditA:1},say:['crow','Primeiro ataque! Peguem a comida deles!']},
    {t:300,team:3,from:'edge',units:{bandit:4,banditA:2,shaman:1},say:['crow','Ainda de pé? Meus arqueiros resolvem isso.']},
    {t:450,team:3,from:'edge',units:{bandit:5,banditA:3,chief:1},say:['crow','Meu tenente vai acabar com essa brincadeira.']},
  ],
  outro:[['king','A aldeia vive de novo! Mas os bandidos fugiram pela trilha do norte, e levaram o nosso Estandarte Real.']],
},
{n:2,title:'A Trilha dos Bandidos',place:'Florestas do Norte',
  start:{res:{wood:300,gold:200,food:300},era:1,blds:['house','house','farm','barracks'],units:{warrior:2}},
  recipes:['ferramentas','estandarte'],
  marks:[{kinds:['den'],n:2,drop:'pano'}],
  intro:[
    ['king','Sem o Estandarte Real, as outras aldeias não acreditam que ainda existe um rei. Os bandidos rasgaram o estandarte em dois pedaços.'],
    ['king','Cada pedaço está numa toca dos bandidos, marcada com a bandeira azul. Destrua as duas, recupere os retalhos e forje o estandarte de novo.'],
    ['crow','Venha buscar, se tiver coragem. Minhas tocas mordem.'],
    ['marta','Nem todo bandido é leal ao Corvo. Construa um mercado e mande um mercador com presentes: uma toca amiga entrega o retalho sem briga.'],
  ],
  goals:[
    {id:'dens',text:'Conquiste as 2 tocas marcadas: destrua ou faça amizade com presentes',type:'destroy',tag:'pano',n:2},
    {id:'banner',text:'Forje o Estandarte Real',type:'item',item:'estandarte',say:['king','O estandarte tremula de novo! O povo vai voltar a acreditar.']},
    {id:'crow',text:'Derrote o Corvo Negro',type:'kill',kind:'crow',hidden:'Ele vai aparecer quando o estandarte voltar'},
  ],
  waves:[
    {t:260,team:3,from:'edge',units:{bandit:3,banditA:2},count:false,say:['crow','Atrás deles! Ninguém entra na minha floresta.']},
    {t:520,team:3,from:'edge',units:{bandit:4,banditA:3,shaman:1},count:false},
    {after:'banner',delay:45,team:3,from:'edge',units:{crow:1,bandit:5,banditA:3,shaman:1},count:false,say:['crow','Esse pano não vale nada! Eu mesmo vou rasgá-lo de novo!']},
  ],
  deaths:{crow:['crow','Isso... não acaba aqui. O Duque... vai vingar...']},
  outro:[['king','O Corvo Negro caiu e as aldeias do norte voltaram para nós. Mas os saqueadores da Capitã Violeta, pagos pelo Duque, atacaram o velho mosteiro.']],
},
{n:3,title:'O Mosteiro Esquecido',place:'Colinas do Mosteiro',
  start:{res:{wood:350,gold:250,food:400},era:2,blds:['house','house','house','farm','farm','barracks','archery'],units:{warrior:2,archer:2}},
  recipes:['ferramentas','armas','relicario'],
  marks:[{kinds:['lair','hideout'],n:3,drop:'reliquia'}],
  intro:[
    ['king','Os saqueadores da Capitã Violeta levaram as três Relíquias Sagradas do mosteiro e as esconderam nos covis marcados.'],
    ['king','Sem monges, os nossos feridos não se curam. Avance para a Era dos Castelos, erga um mosteiro e recupere as relíquias.'],
    ['violet','As relíquias valem mais ouro do que o seu reino inteiro, majestade. Venha negociar... com a ponta da lança.'],
  ],
  goals:[
    {id:'era',text:'Avance para a Era dos Castelos',type:'era',era:3},
    {id:'monastery',text:'Construa um mosteiro',type:'build',kind:'monastery',n:1},
    {id:'relics',text:'Recupere as 3 relíquias dos covis marcados',type:'got',item:'reliquia',n:3},
    {id:'reliquary',text:'Forje o Relicário Sagrado',type:'item',item:'relicario',say:['king','As relíquias voltaram ao altar. Ouço os monges cantando de novo.']},
    {id:'violet',text:'Derrote a Capitã Violeta',type:'kill',kind:'violet',hidden:'Ela vai aparecer quando o relicário ficar pronto'},
  ],
  waves:[
    {t:210,team:3,from:'edge',units:{raider:3,raiderA:2},count:false,say:['violet','Saqueadores! Tragam tudo que brilha!']},
    {t:420,team:3,from:'edge',units:{raider:4,raiderA:3,raiderL:1},count:false},
    {t:630,team:3,from:'edge',units:{raider:5,raiderA:3,raiderL:2},count:false},
    {after:'reliquary',delay:45,team:3,from:'edge',units:{violet:1,raider:5,raiderA:4,raiderL:2},count:false,say:['violet','Vocês pegaram o meu tesouro. Agora eu pego o seu rei!']},
  ],
  deaths:{violet:['violet','Fiquem com as relíquias... O Duque paga melhor do que vocês, e já marcha para cá.']},
  outro:[['king','A Capitã Violeta caiu, e com as relíquias os nossos monges voltaram a curar. Mas os batedores trazem notícias ruins: o exército vermelho do Duque marcha para Pedravale.']],
},
{n:4,title:'O Cerco de Pedravale',place:'Muralhas de Pedravale',
  start:{res:{wood:350,gold:220,food:450},era:3,foeEra:3,blds:['house','house','house','house','farm','farm','farm','barracks','archery','monastery','tower'],units:{warrior:3,archer:3,lancer:2,monk:1}},
  recipes:['ferramentas','armas','escudos','relicario'],
  intro:[
    ['king','O Duque cansou de esperar. A vanguarda vermelha vem do leste para cercar Pedravale.'],
    ['king','Construa torres, forje armas e escudos para os soldados e aguente as seis ondas. Eu fico no castelo. Se eu cair, Pedravale cai comigo.'],
    ['captain','Em nome do Duque Rubro: abram os portões, ou nós vamos derrubá-los!'],
  ],
  goals:[
    {id:'towers',text:'Tenha 3 torres prontas',type:'build',kind:'tower',n:3},
    {id:'arms',text:'Forje as Armas Forjadas',type:'item',item:'armas'},
    {id:'shields',text:'Forje os Escudos Reforçados',type:'item',item:'escudos'},
    {id:'waves',text:'Sobreviva às 6 ondas do exército vermelho',type:'waves',n:6},
    {id:'captain',text:'Derrote o Capitão Rubro',type:'kill',kind:'captain',hidden:'Ele lidera a última onda'},
  ],
  waves:[
    {t:130,team:2,from:'east',units:{warrior:4,archer:2},say:['captain','Primeira linha, avançar!']},
    {t:220,team:2,from:'east',units:{warrior:4,archer:3,lancer:1}},
    {t:310,team:2,from:'east',units:{warrior:3,archer:4,lancer:3,monk:1},say:['captain','Monges, convertam os soldados deles!']},
    {t:400,team:2,from:'east',units:{warrior:5,archer:4,lancer:3,monk:1}},
    {t:490,team:2,from:'east',units:{warrior:5,archer:5,lancer:4,monk:2},say:['captain','Mais força! O Duque está olhando!']},
    {t:590,team:2,from:'east',units:{captain:1,warrior:6,archer:5,lancer:4,monk:2},say:['captain','Eu mesmo vou abrir esse portão!']},
  ],
  deaths:{captain:['captain','Chega! Eu me rendo... O Duque esconde a coroa no castelo vermelho, atrás de um portão de ferro.']},
  outro:[['king','Pedravale resistiu! Agora sabemos onde está a coroa. Chegou a hora de ir até o Duque.']],
},
{n:5,title:'A Queda do Duque Rubro',place:'Fortaleza Vermelha',
  cfg:{redCastle:true,redAI:true},
  start:{res:{wood:400,gold:300,food:400},era:3,foeEra:3,foeRes:200,blds:['house','house','house','house','farm','farm','farm','barracks','archery','monastery','tower','tower'],units:{warrior:4,archer:3,lancer:3,monk:2},
    foeBlds:['house','house','house','house','farm','farm','farm','barracks','barracks','archery','monastery','tower','tower','tower'],foeUnits:{pawn:8,warrior:5,archer:5,lancer:4,monk:2}},
  recipes:['ferramentas','armas','escudos','relicario','ariete'],
  marks:[{kinds:['hideout','lair'],n:2,drop:'aco'}],
  intro:[
    ['king','O castelo do Duque tem um portão de ferro que nenhuma espada derruba. Só um aríete.'],
    ['king','Os ferreiros do Corvo Negro guardavam lingotes de aço nos covis marcados. Traga dois, forje o Aríete Real, derrube o portão e traga a minha coroa de volta.'],
    ['duke','Primo, você mandou {hero} fazer o trabalho de um rei? Venha. Pedravale é minha.'],
  ],
  goals:[
    {id:'steel',text:'Recupere 2 lingotes de aço dos covis marcados',type:'got',item:'aco',n:2},
    {id:'ram',text:'Forje o Aríete Real',type:'item',item:'ariete',say:['king','O aríete está pronto. Agora aquele portão cai!']},
    {id:'duke',text:'Derrote Malvar, o Duque Rubro',type:'kill',kind:'duke'},
    {id:'castle',text:'Derrube o castelo vermelho',type:'castle'},
  ],
  waves:[],
  deaths:{duke:['duke','A coroa... nunca foi... sua...']},
  outro:[['king','A Coroa de Pedravale voltou para casa. {hero}, de hoje em diante você é o Campeão do Reino, e o seu nome vai ser cantado em todas as aldeias.'],['marta','Fim da campanha. Obrigada por jogar Reino Pequeno!']],
},
];

function modeConfig(mode,ch){
  if(mode==='campaign'){
    const C=CHAPTERS[ch]||CHAPTERS[1];
    return Object.assign({redCastle:false,redAI:false,camps:true,bands:false,king:true,forge:true,recipes:C.recipes},C.cfg||{});
  }
  if(mode==='survival')return {redCastle:false,redAI:false,camps:true,bands:false,king:true,forge:true,recipes:['ferramentas','armas','escudos'],endless:true};
  return {redCastle:true,redAI:true,camps:false,towns:true,bands:true,king:false,forge:false,recipes:[]};
}
const chapter=()=>S&&S.mode==='campaign'?CHAPTERS[S.chapter]:null;
function heroText(s){const H=S&&HEROES[S.heroKey];return s.replace(/\{hero\}/g,H?H.name:'campeão');}
function rescaleTeam(t){
  for(const e of S.ents){
    if(e.dead||e.team!==t)continue;const D=DEF[e.kind];
    if(D.unit&&D.mil){e.maxhp=e.hp=Math.round(D.hp*hpMult(t,e.kind));}
    else if(D.building){e.maxhp=e.hp=Math.round(D.hp*bldMult(t));}
  }
}
function modeInit(opts){
  S.got={};S.killed={};S.goalsDone={};S.waveList=[];S.waveN=0;S.wavesBeaten=0;S.itemsVer=0;S.heroDown=null;S.winAt=null;
  if(S.mode==='skirmish')return;
  const c1=castleOf(1),C=chapter();
  const near=(k,n)=>{for(let i=0;i<n;i++){const p=openSpot(c1);spawnUnit(k,1,p.x,p.y);}};
  if(C){
    const st=C.start;
    Object.assign(S.teams[1].res,st.res);
    S.teams[1].era=st.era||1;
    if(st.foeEra)S.teams[2].era=st.foeEra;
    if(st.foeRes)for(const k in S.teams[2].res)S.teams[2].res[k]+=st.foeRes;
    for(const k of st.blds||[]){const p=spotFor(1,k,c1.x,c1.y-40,4,13);if(p)spawnFixed(k,1,p.tx,p.ty);}
    if(st.blds&&st.blds.includes('farm'))near('pawn',2);
    for(const k in st.units||{})near(k,st.units[k]);
    rescaleTeam(1);rescaleTeam(2);
    for(const m of C.marks||[])markCamps(m);
    C.waves.forEach((w,i)=>S.waveList.push(Object.assign({},w,{id:i+1,spawned:false,beaten:false,count:w.count!==false})));
    const c2=castleOf(2);
    if(c2&&st.foeBlds){
      for(const k of st.foeBlds){const p=spotFor(2,k,c2.x,c2.y-40,4,13);if(p)spawnFixed(k,2,p.tx,p.ty);}
      for(const k in st.foeUnits)for(let i=0;i<st.foeUnits[k];i++){const p=openSpot(c2);spawnUnit(k,2,p.x,p.y);}
      rescaleTeam(2);
    }
    if(S.chapter===5){
      if(c2){c2.gate=true;const p=freeSpotNear(c2);spawnUnit('duke',2,p.x-30,p.y+10,{guard:true,drop:'coroa'});}
    }
  }else{
    Object.assign(S.teams[1].res,{wood:300,gold:200,food:300});
    near('warrior',2);near('archer',1);
  }
  if(!C)for(const k of['house','farm']){const p=spotFor(1,k,c1.x,c1.y-40,4,12);if(p)spawnFixed(k,1,p.tx,p.ty);}

  // the king guards the castle gate
  const kp=walkPt(c1.x+56,c1.y+20)?{x:c1.x+56,y:c1.y+20}:openSpot(c1);
  S.kingId=spawnUnit('king',1,kp.x,kp.y,{home:{x:kp.x,y:kp.y}}).id;
  if(opts.hero&&HEROES[opts.hero.key])spawnHero(opts.hero.key,opts.hero.kills||0,opts.hero.rank||0);
}
// a free spot in front of a castle, away from other units
function openSpot(c){
  for(let k=0;k<300;k++){
    const a=Math.PI*(.04+.92*Math.random()),r=(2.2+Math.random()*4.5)*TS,x=c.x+Math.cos(a)*r*1.3,y=c.y+12+Math.sin(a)*r;
    if(!walkPt(x,y)||!reachPt(x,y))continue;
    let crowd=false;for(const e of S.ents)if(!e.dead&&(DEF[e.kind].unit||DEF[e.kind].critter)&&hyp(e.x-x,e.y-y)<22){crowd=true;break;}
    if(!crowd)return {x,y};
  }
  return freeSpotNear(c);
}
function spawnHero(key,kills,rank){
  const H=HEROES[key],c1=castleOf(1);if(!H||!c1)return null;
  S.heroKey=key;
  const p=walkPt(c1.x-56,c1.y+24)&&!S.heroDown?{x:c1.x-56,y:c1.y+24}:openSpot(c1);
  const u=spawnUnit(H.kind,1,p.x,p.y,{hero:true,title:H.name,kills,rank});
  u.maxhp=u.hp=Math.round(u.maxhp*2.5*rankHp(rank));
  S.heroId=u.id;
  return u;
}
// pick the wild camps that hold the chapter's items (closest to the player first); make new ones if the map is short of camps
function markCamps(m){
  const c=castleOf(1);
  const pool=S.ents.filter(e=>!e.dead&&e.team===3&&m.kinds.includes(e.kind)&&!e.drop).sort((a,b)=>hyp(a.x-c.x,a.y-c.y)-hyp(b.x-c.x,b.y-c.y));
  const got=pool.slice(0,m.n);
  const guards={den:['bandit','bandit','banditA'],lair:['bandit','bandit','bandit','banditA','banditA','shaman'],hideout:['chief','bandit','bandit','bandit','banditA','banditA','shaman']};
  for(let k=0;k<80&&got.length<m.n;k++){
    const kind=m.kinds[0],cx=6+Math.random()*(MW-12),cy=6+Math.random()*(MH-12);
    if(hyp(cx*TS-c.x,cy*TS-c.y)<16*TS)continue;
    const sp=campSpot(kind,cx,cy,false,S.home.road);
    if(sp.length){const camp=makeCamp(kind,sp[0],guards[kind]);got.push(byId.get(camp.lair));}
  }
  for(const b of got){
    b.drop=m.drop;
    const ci=S.camps.findIndex(cp=>cp.lair===b.id);
    if(ci>=0){const cp=S.camps[ci],extra=b.kind==='den'?['bandit','banditA']:['bandit','banditA','bandit'];for(const k of extra){cp.kinds.push(k);spawnGuard(cp,k,cp.kinds.length);}}
  }
}

// ---------------------------------------------------------------- items and the forge
function giveItem(k,loc){
  S.items[k]=(S.items[k]||0)+1;S.got[k]=(S.got[k]||0)+1;S.itemsVer++;
  HOOK.item(k,loc,false);
}
function canForge(k){
  const I=ITEMS[k];if(!I||!I.cost)return 'no';
  if(has(k))return 'done';
  for(const n in I.need||{})if((S.items[n]||0)<I.need[n])return 'need';
  if(!afford(1,I.cost))return 'cost';
  return 'ok';
}
function forgeItem(k){
  const r=canForge(k);if(r!=='ok')return r;
  const I=ITEMS[k];
  pay(1,I.cost);for(const n in I.need||{})S.items[n]-=I.need[n];
  S.items[k]=1;S.got[k]=(S.got[k]||0)+1;S.itemsVer++;
  HOOK.item(k,null,true);
  return 'ok';
}

// ---------------------------------------------------------------- waves
const waveMult=()=>({normal:.75,dificil:1,insano:1.35})[S.diff.key]||1;
function waveSpot(from){
  const c=castleOf(1)||{x:MW*TS/2,y:MH*TS/2};
  let best=null,bs=-1e9;
  for(let k=0;k<500;k++){
    const x=2+Math.floor(Math.random()*(MW-4)),y=2+Math.floor(Math.random()*(MH-4));
    if(from==='east'&&x<MW*.7)continue;
    if(!walkXY(x,y)||!reachT(x,y))continue;
    const px=x*TS+16,py=y*TS+16,d=hyp(px-c.x,py-c.y)/TS;
    if(d<22)continue;
    let near=false;for(const b of BLDS)if(b.team===1&&!b.dead&&hyp(b.x-px,b.y-py)<12*TS){near=true;break;}
    if(near)continue;
    const s=from==='east'?x+Math.random()*10:-Math.abs(d-32)+Math.random()*8;
    if(s>bs){bs=s;best={x:px,y:py};}
  }
  return best;
}
function invTarget(u){
  let best=null,bd=1e9;
  for(const e of S.ents){
    if(e.dead||e.team!==1)continue;const D=DEF[e.kind];
    if(!D.building&&!D.king)continue;
    const c=centerOf(e),d=hyp(c.x-u.x,c.y-u.y)+(D.king?150:0);
    if(d<bd){bd=d;best=c;}
  }
  return best;
}
function spawnWave(w){
  w.spawned=true;w.at=S.t;
  const spot=waveSpot(w.from);if(!spot){w.beaten=true;return;}
  const m=w.mult||waveMult();
  let made=0;
  for(const k in w.units){
    const n=DEF[k].boss?w.units[k]:Math.max(1,Math.round(w.units[k]*m));
    for(let i=0;i<n;i++){
      const a=Math.random()*Math.PI*2,r=Math.random()*48;
      const u=spawnUnit(k,w.team,spot.x+Math.cos(a)*r,spot.y+Math.sin(a)*r*.7,{wave:w.id,roam:w.team===3});
      if(w.bossHp&&DEF[k].boss){u.maxhp=u.hp=Math.round(u.maxhp*w.bossHp);}
      const t=invTarget(u);
      if(t)u.order={type:'move',x:t.x+(Math.random()-.5)*60,y:t.y+(Math.random()-.5)*50,amove:true,raid:true};
      made++;
    }
  }
  w.size=made;
  HOOK.wave(w,spot);
}
function waveReady(w){
  if(w.spawned)return false;
  if(w.after){const d=S.goalsDone[w.after];return d!=null&&S.t>=d+(w.delay||15);}
  return S.t>=w.t*({normal:1.15,dificil:1,insano:.9}[S.diff.key]||1);
}
function waveDueIn(w){
  if(w.after){const d=S.goalsDone[w.after];return d==null?null:d+(w.delay||15)-S.t;}
  return w.t*({normal:1.15,dificil:1,insano:.9}[S.diff.key]||1)-S.t;
}
// Defesa do Rei: endless waves that grow; every fifth wave brings a boss
const BOSSES=[['crow',3],['violet',3],['captain',2],['duke',2]];
function survivalWave(){
  const n=S.waveN+1;S.waveN=n;
  const mult=waveMult(),size=Math.round((3+n*1.5)*mult);
  const era=Math.min(5,1+Math.floor((n-1)/4));S.teams[2].era=era;
  const units={};const add=(k,c)=>{if(c>0)units[k]=(units[k]||0)+c;};
  let team,fac;
  if(n%5===0){const b=BOSSES[(n/5-1)%4];team=b[1];add(b[0],1);fac=b[0]==='crow'?'bandit':b[0]==='violet'?'raider':'red';}
  else{fac=['bandit','raider','red'][(n-1)%3];team=fac==='red'?2:3;}
  const sz=n%5===0?Math.round(size*.8):size;
  if(fac==='bandit'){add('bandit',Math.ceil(sz*.55));add('banditA',Math.floor(sz*.3));add('shaman',Math.floor(sz/7));if(n>=6&&n%5)add('chief',1);}
  else if(fac==='raider'){add('raider',Math.ceil(sz*.45));add('raiderA',Math.floor(sz*.35));add(n>=4?'raiderL':'raider',Math.floor(sz*.2));}
  else{add('warrior',Math.ceil(sz*.4));add(era>=2?(era>=4&&n%2?'royal':'archer'):'warrior',Math.floor(sz*.3));add(era>=3?'lancer':'warrior',Math.floor(sz*.25));if(era>=3)add('monk',Math.floor(sz/8));
    // the Red Kingdom brings its new troops as the waves grow
    if(era>=3)add('ram',1+Math.floor(n/12));if(era>=4){add('paladin',1+Math.floor(n/10));add('wizard',Math.floor(n/9));}if(era>=5)add('catapult',1);}
  const w={id:n,team,from:'edge',units,mult:1,count:true,bossHp:1+n/25,fac};
  S.waveList.push(w);
  spawnWave(w);
  const gap=Math.max(48,({normal:88,dificil:75,insano:62}[S.diff.key]||75)-n*.8);
  S.nextWaveT=S.t+gap;
}

// ---------------------------------------------------------------- goals
function countBuilt(t,k){let n=0;for(const e of S.ents)if(!e.dead&&e.team===t&&e.kind===k&&e.built)n++;return n;}
function goalProgress(g){
  switch(g.type){
    case 'build':return countBuilt(1,g.kind);
    case 'item':return has(g.item)?1:0;
    case 'got':return S.got[g.item]||0;
    case 'waves':return S.wavesBeaten;
    case 'kill':return S.killed[g.kind]?1:0;
    case 'era':return eraOf(1)>=g.era?1:0;
    case 'castle':return S.killed.redCastle?1:0;
    case 'destroy':return S.got['_'+g.tag]||0;
  }
  return 0;
}
function goalState(g){
  const n=g.n||1,done=S.goalsDone[g.id]!=null;
  return {done,have:done?n:Math.min(n,goalProgress(g)),n};
}
function checkGoals(){
  const C=chapter();if(!C)return;
  let all=true;
  for(const g of C.goals){
    if(S.goalsDone[g.id]!=null)continue;
    if(goalProgress(g)>=(g.n||1)){S.goalsDone[g.id]=S.t;HOOK.goal(g);if(g.say)HOOK.talk(g.say[0],heroText(g.say[1]));}
    else all=false;
  }
  if(all&&S.winAt==null)S.winAt=S.t+3;
}

// ---------------------------------------------------------------- per-tick work
function modeUpdate(dt){
  if(S.mode==='skirmish')return;
  if(S.heroDown&&S.t>=S.heroDown.at){
    const h=S.heroDown;S.heroDown=null;
    const u=spawnHero(S.heroKey,h.kills,h.rank);
    if(u)HOOK.toast(`${u.title} voltou para a luta!`,'good',{x:u.x,y:u.y,id:u.id});
  }
  if(S.mode==='survival'){
    if(S.nextWaveT==null)S.nextWaveT=({normal:150,dificil:120,insano:95}[S.diff.key]||120);
    if(S.t>=S.nextWaveT)survivalWave();
  }else for(const w of S.waveList){
    if(waveReady(w))spawnWave(w);
    else if(w.after&&!w.warned&&S.goalsDone[w.after]!=null){
      w.warned=true;const b=Object.keys(w.units).find(k=>DEF[k].boss);
      HOOK.toast(`${b?DEF[b].name.split(',')[0]:'Os inimigos'} ${b?'ataca':'atacam'} em ${w.delay||15} segundos! Traga o exército para perto do rei.`,'warn');
    }
  }
  S.modeTick=(S.modeTick||0)-dt;if(S.modeTick>0)return;S.modeTick=1;
  for(const w of S.waveList){
    if(!w.spawned||w.beaten)continue;
    let left=0;for(const e of S.ents)if(!e.dead&&e.wave===w.id&&e.team===w.team)left++;
    w.left=left;
    if(!left){w.beaten=true;if(w.count)S.wavesBeaten++;HOOK.waveDone(w);}
  }
  // invaders without orders march on the nearest building of the kingdom
  for(const e of S.ents){
    if(e.dead||!e.wave||e.order||e.team!==2)continue;
    const t=invTarget(e);if(t)e.order={type:'move',x:t.x+(Math.random()-.5)*50,y:t.y+(Math.random()-.5)*50,amove:true,raid:true};
  }
  if(S.mode==='campaign'){
    checkGoals();
    if(S.winAt!=null&&S.t>=S.winAt){
      if(S.chapter===5&&!has('coroa'))giveItem('coroa',null);
      endGame(true,'goals');
    }
  }
}
function modeKill(t,src){
  if(!S.mode||S.mode==='skirmish')return;
  const D=DEF[t.kind];
  if(D.boss||D.king)S.killed[t.kind]=(S.killed[t.kind]||0)+1;
  if(t.kind==='castle'&&t.team===2)S.killed.redCastle=1;
  if(t.drop){
    S.got['_'+t.drop]=(S.got['_'+t.drop]||0)+1;
    giveItem(t.drop,centerOf(t));
  }
  const C=chapter();
  if(C&&C.deaths&&C.deaths[t.kind]){const d=C.deaths[t.kind];HOOK.talk(d[0],heroText(d[1]));}
  if(t.hero&&t.team===1){
    S.heroDown={at:S.t+35,kills:t.kills||0,rank:t.rank||0};
    HOOK.toast(`${t.title} caiu! Volta ao castelo em 35 segundos.`,'warn',{x:t.x,y:t.y});
  }
}
// what the HUD shows about the next wave
function waveInfo(){
  if(!S||S.mode==='skirmish')return null;
  if(S.mode==='survival'){
    const next=S.nextWaveT==null?({normal:150,dificil:120,insano:95}[S.diff.key]||120):S.nextWaveT;
    const active=S.waveList.filter(w=>!w.beaten).reduce((a,w)=>a+(w.left??w.size??0),0);
    return {label:`Onda ${S.waveN+1}`,inT:next-S.t,active,beaten:S.wavesBeaten};
  }
  const list=S.waveList;
  const active=list.filter(w=>w.spawned&&!w.beaten).reduce((a,w)=>a+(w.left??w.size??0),0);
  let nx=null,nt=1e9;
  for(const w of list){if(w.spawned)continue;const d=waveDueIn(w);if(d!=null&&d<nt){nt=d;nx=w;}}
  const counted=list.filter(w=>w.count),total=counted.length;
  return {label:nx?(nx.count&&total?`Onda ${counted.indexOf(nx)+1}/${total}`:'Ataque'):active?'Em combate':'Sem ataques',inT:nx?nt:null,active,beaten:S.wavesBeaten};
}
// a quick look at a map without starting a game (for the menu preview)
function previewMap(seed,relief,mode){
  const keep=S,sz=mapSizeFor(mode||'skirmish');S={seed:seed>>>0,relief:relief||reliefFor(seed)};
  try{return withMapSize(sz[0],sz[1],()=>{const r=genMap();return {tiles:S.tiles,biome:S.biome,shape:S.shape,P:r.P,A:r.A,elev:S.elev,ramp:S.ramp,w:sz[0],h:sz[1]};});}
  finally{S=keep;}
}

