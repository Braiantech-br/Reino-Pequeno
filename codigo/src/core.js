// ================================================================ core: rules, map, simulation (no DOM)
const TS=32;let MW=96, MH=64, N=MW*MH;
// Batalha Rápida plays on a bigger island (twice the area and more); the story chapters keep the classic size
const mapSizeFor=mode=>mode==='skirmish'?[136,92]:[96,64];
const WATER=0, GRASS=1, SAND=2, TREE=3, STUMP=4, ROAD=5, PIT=6;
const HOOK={war(){},council(){},honor(){},ctr(){},town(){},army(){},scout(){},econ(){},sos(){},townGrow(){},envoy(){},report(){},ambush(){},svc(){},trained(){},fear(){},village(){},terrain(){},skill(){},tired(){},rested(){},renovated(){},ask(){},raid(){},wildNews(){},engineer(){},diplo(){},built(){},toast(){},sfx(){},tile(){},loaded(){},era(){},over(){},alarm(){},idle(){},rank(){},wild(){},talk(){},goal(){},item(){},wave(){},waveDone(){}};
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const hyp=Math.hypot;
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeNoise(rng,scale){
  const gw=Math.ceil(MW/scale)+3, gh=Math.ceil(MH/scale)+3, g=[];
  for(let i=0;i<gw*gh;i++) g.push(rng());
  const s=t=>t*t*(3-2*t);
  return (x,y)=>{const fx=x/scale,fy=y/scale,ix=Math.floor(fx),iy=Math.floor(fy),tx=s(fx-ix),ty=s(fy-iy);
    const a=g[iy*gw+ix],b=g[iy*gw+ix+1],c=g[(iy+1)*gw+ix],d=g[(iy+1)*gw+ix+1];
    return a+(b-a)*tx+(c-a)*ty+(a-b-c+d)*tx*ty;};
}
function hash(i){let x=(i*374761393)|0;x=Math.imul(x^(x>>>13),1274126177);return ((x^(x>>>16))>>>0)/4294967296;}
const idx=(x,y)=>y*MW+x;
const inB=(x,y)=>x>=0&&y>=0&&x<MW&&y<MH;
const tileOf=v=>Math.floor(v/TS);

// ================================================================ rules
const ERAS=[null,
  {n:1,name:'Era das Aldeias',roman:'I'},
  {n:2,name:'Era Feudal',roman:'II',cost:{food:300,wood:100},time:35,req:['barracks'],
    unlock:'Torre, Arquearia e Arqueiro. Peões coletam 15% mais rápido.'},
  {n:3,name:'Era dos Castelos',roman:'III',cost:{food:500,gold:250},time:45,req:['archery'],
    unlock:'Mosteiro, Monge (conversão) e Lanceiro. Tropas com +15% de vida, peões carregam mais.'},
  {n:4,name:'Era Imperial',roman:'IV',cost:{food:800,wood:250,gold:500},time:55,req:['monastery'],
    unlock:'Monges viram Sacerdotes, com Raio Divino e cura mais forte. Tropas +20% de dano, torres mais fortes, coleta +15%.'},
  {n:5,name:'Era Lendária',roman:'V',cost:{food:1100,wood:400,gold:800},time:65,req:['tower','monastery'],
    unlock:'Sumo-sacerdotes lançam Chuva de Fogo e convertem prédios. Tropas lendárias, coleta +10%.'},
];
const DEF={
  pawn:   {name:'Peão',unit:true,hp:40,speed:64,r:8,dmg:3,range:18,cd:1.2,sight:140,cost:{food:50},time:10,era:1,desc:'Coleta recursos, constrói e conserta.'},
  warrior:{name:'Guerreiro',unit:true,mil:true,hp:120,speed:58,r:9,dmg:11,range:18,cd:1.0,sight:210,cost:{food:50,wood:15,gold:20},time:13,era:1,desc:'Corpo a corpo. Forte contra arqueiros.'},
  archer: {name:'Arqueiro',unit:true,mil:true,ranged:true,hp:60,speed:60,r:8,dmg:8,range:150,cd:1.3,sight:220,cost:{wood:45,gold:25},time:13,era:2,desc:'Ataca de longe. Forte contra lanceiros.'},
  lancer: {name:'Lanceiro',unit:true,mil:true,hp:150,speed:54,r:10,dmg:14,range:30,cd:1.4,sight:210,cost:{food:60,gold:40},time:16,era:3,desc:'Lança longa. Forte contra guerreiros.'},
  scout:  {name:'Batedor',unit:true,mil:true,look:{v:'g',base:'pawn'},hp:75,speed:96,r:8,dmg:6,range:18,cd:.8,sight:300,cost:{food:45,gold:10},time:9,era:1,desc:'O mais rápido do reino e enxerga longe. Bom para espiar e para caçar peões e mercadores inimigos.'},
  royal:  {name:'Arqueiro real',unit:true,mil:true,ranged:true,look:{v:'i',base:'archer'},hp:85,speed:58,r:8,dmg:12,range:190,cd:1.5,sight:250,cost:{wood:60,gold:55},time:16,era:4,desc:'Elmo de ferro e flechas pesadas: atira mais longe e mais forte que o arqueiro comum.'},
  paladin:{name:'Paladino',unit:true,mil:true,noConvert:true,aura:true,look:{v:'s',base:'warrior'},hp:290,speed:56,r:10,dmg:17,range:20,cd:1.0,sight:220,cost:{food:90,gold:110},time:24,era:4,desc:'Cavaleiro sagrado de armadura prateada. Cura aos poucos os aliados em volta e não pode ser convertido.'},
  wizard: {name:'Mago',unit:true,mil:true,ranged:true,look:{v:'w',base:'monk'},hp:65,speed:50,r:8,dmg:15,range:175,cd:2.6,sight:240,splash:46,proj:'fire',cost:{food:40,gold:120},time:22,era:4,desc:'Lança bolas de fogo que explodem e ferem todos em volta. Frágil de perto.'},
  ram:    {name:'Aríete',unit:true,mil:true,siege:true,mech:true,hp:480,speed:36,r:14,dmg:70,range:26,cd:2.6,sight:200,cost:{wood:180,gold:40},time:26,era:3,desc:'Derruba muralhas, portões e prédios. Flechas quase não o arranham, mas ele não ataca soldados.'},
  catapult:{name:'Catapulta',unit:true,mil:true,ranged:true,mech:true,hp:220,speed:30,r:14,dmg:44,range:290,minRange:70,cd:4.6,sight:310,splash:54,proj:'rock',cost:{wood:220,gold:120},time:32,era:4,desc:'Atira pedras de muito longe: arrasa prédios e grupos. Não acerta quem chega muito perto.'},
  monk:   {name:'Monge',unit:true,mil:true,holy:true,hp:55,speed:50,r:8,dmg:0,range:130,cd:1,sight:240,cost:{gold:90},time:18,era:3,desc:'Converte inimigos (Wololo!) e cura aliados.'},
  sheep:  {name:'Ovelha',critter:true,art:'sheep',hp:10,speed:16,r:8,food:100},
  lamb:   {name:'Cordeiro',critter:true,art:'sheep',s:.72,hp:6,speed:20,r:6,food:50},
  bsheep: {name:'Ovelha negra',critter:true,art:'bsheep',hp:14,speed:15,r:8,food:160},
  gsheep: {name:'Ovelha dourada',critter:true,art:'gsheep',hp:10,speed:18,r:8,food:100,gold:80},
  castle: {name:'Castelo',building:true,w:5,h:4,hp:2200,pop:10,drop:true,trains:['pawn'],dmg:7,range:190,cd:1.4},
  house:  {name:'Casa',building:true,w:2,h:2,hp:350,pop:5,drop:true,cost:{wood:50},time:14,era:1,key:'1',desc:'+5 de população. Os peões entregam recursos aqui.'},
  farm:   {name:'Fazenda',building:true,flat:true,w:2,h:2,hp:150,cost:{wood:60},time:8,era:1,key:'2',desc:'Comida sem fim para um peão de cada vez.'},
  barracks:{name:'Quartel',building:true,w:3,h:3,hp:700,trains:['warrior','lancer','scout','ram','catapult'],cost:{wood:120},time:24,era:1,key:'3',desc:'Treina guerreiros, batedores e, nas eras seguintes, lanceiros, aríetes e catapultas.'},
  tower:  {name:'Torre',building:true,w:2,h:2,hp:550,dmg:10,range:200,cd:1.1,cost:{wood:80,gold:40},time:20,era:2,key:'4',desc:'Atira flechas nos inimigos por perto.'},
  archery:{name:'Arquearia',building:true,w:3,h:3,hp:600,trains:['archer','royal'],cost:{wood:110,gold:20},time:24,era:2,key:'5',desc:'Treina arqueiros e, na Era IV, arqueiros reais.'},
  market: {name:'Mercado',building:true,w:3,h:2,hp:500,trains:['merchant'],cost:{wood:150},time:22,era:1,key:'7',desc:'Troca madeira e comida por ouro e treina mercadores.'},
  pit:    {name:'Fosso',building:true,wall:true,pit:true,w:1,h:1,hp:260,cost:{},time:7,era:1,desc:'Um buraco que ninguém atravessa a pé. Arraste para cavar uma linha. Construa uma ponte por cima para as suas tropas passarem.'},
  bridge: {name:'Ponte',building:true,flat:true,bridge:true,w:1,h:1,hp:320,cost:{wood:20},time:5,era:1,desc:'Atravessa água estreita ou um fosso. Comece na margem e arraste até o outro lado.'},
  dock:   {name:'Cais',building:true,w:2,h:2,hp:450,trains:['boat','warship'],cost:{wood:120},time:20,era:1,desc:'Constrói barcos. Precisa ficar na beira da água.'},
  warship:{name:'Navio de guerra',unit:true,mil:true,naval:true,warship:true,ranged:true,hp:420,speed:66,r:16,dmg:15,range:200,cd:1.7,sight:270,volley:2,cost:{wood:170,gold:70},time:24,era:2,desc:'Atira flechas pesadas do mar: afunda barcos e acerta tudo o que está perto da praia. Torres e arqueiros revidam.'},
  boat:   {name:'Barco',unit:true,naval:true,hp:220,speed:72,r:13,dmg:0,range:0,cd:1,sight:220,cost:{wood:110,gold:10},time:18,era:1,cap:6,desc:'Leva até 6 unidades pela água. Toque no barco com tropas selecionadas para embarcar.'},
  wall:   {name:'Muralha',building:true,wall:true,w:1,h:1,hp:450,cost:{wood:8},time:4,era:1,key:'8',desc:'Bloqueia a passagem. Arraste para construir uma linha. Arqueiros encostados nela atiram mais longe.'},
  gate:   {name:'Portão',building:true,wall:true,gate:true,w:1,h:1,hp:650,cost:{wood:30},time:8,era:1,key:'9',desc:'Suas tropas passam, os inimigos não. Também dá para transformar um pedaço de muralha em portão.'},
  engineer:{name:'Engenheiro-chefe',unit:true,civil:true,builder:true,noPop:true,noConvert:true,look:{skin:'b',base:'pawn',s:1.18},hp:160,speed:68,r:9,dmg:5,range:18,cd:1,sight:200,desc:'Organiza os operários: constrói casas, fazendas e consertos sozinho quando faltam.'},
  tavern: {name:'Taberna',building:true,w:3,h:2,hp:500,cost:{wood:150,gold:40},time:22,era:1,key:'0',desc:'Aldeões cansados descansam aqui e voltam mais rápidos. Quanto mais descansam, maior o bônus. Cabem 5 por vez.'},
  bpawn:  {name:'Bandido coletor',unit:true,civil:true,wild:true,look:{skin:'k',base:'pawn'},hp:40,speed:62,r:8,dmg:3,range:18,cd:1.2,sight:140,bounty:{gold:6}},
  merchant:{name:'Mercador',unit:true,civil:true,envoy:true,hp:50,speed:66,r:8,dmg:0,range:18,cd:1,sight:160,cost:{food:50,gold:60},time:14,era:1,desc:'Leva presentes aos bandidos para conquistar a confiança deles. Os bandidos não atacam o mercador.'},
  monastery:{name:'Mosteiro',building:true,w:3,h:3,hp:650,trains:['monk','paladin','wizard'],cost:{wood:150,gold:80},time:28,era:3,key:'6',desc:'Treina monges e, na Era IV, paladinos e magos.'},
  gold:   {name:'Mina de ouro',resource:true,w:2,h:2,amount:800},
  // neutral kingdoms (team 0): a market town with its guard; carts and mercenaries for the delivery services
  town:   {name:'Vila neutra',building:true,neutral:true,w:5,h:3,hp:9999,desc:'Uma vila livre que compra e vende com todos os reinos.'},
  guard:  {name:'Guarda da vila',unit:true,mil:true,neutral:true,noConvert:true,look:{skin:'y',base:'warrior'},hp:260,speed:56,r:9,dmg:16,range:20,cd:1,sight:240},
  merc:   {name:'Mercenário',unit:true,mil:true,look:{skin:'y',base:'warrior'},hp:165,speed:58,r:9,dmg:13,range:18,cd:1,sight:210,desc:'Soldado de aluguel das vilas neutras.'},
  npawn:  {name:'Aldeão da vila',unit:true,civil:true,neutral:true,noConvert:true,look:{skin:'y',base:'pawn'},hp:50,speed:60,r:8,dmg:3,range:18,cd:1.2,sight:140},
  garcher:{name:'Arqueiro da vila',unit:true,mil:true,ranged:true,neutral:true,noConvert:true,look:{skin:'y',base:'archer'},hp:80,speed:58,r:8,dmg:10,range:165,cd:1.3,sight:240},
  envoyN: {name:'Embaixador',unit:true,civil:true,neutral:true,noConvert:true,look:{skin:'y',base:'monk'},hp:140,speed:62,r:8,dmg:0,range:0,cd:1,sight:120},
  diplomat:{name:'Embaixador do reino',unit:true,civil:true,noPop:true,noConvert:true,look:{base:'merchant'},hp:120,speed:64,r:8,dmg:0,range:0,cd:1,sight:140,desc:'Leva presentes e conversa com as vilas neutras.'},
  thouse: {name:'Casa da vila',building:true,townb:true,w:2,h:2,hp:420,time:16,look:{skin:'y',base:'house2'}},
  tfarm:  {name:'Fazenda da vila',building:true,townb:true,flat:true,w:2,h:2,hp:160,time:10},
  ttower: {name:'Torre da vila',building:true,townb:true,w:2,h:2,hp:650,time:24,dmg:9,range:210,cd:1.2,look:{skin:'y',base:'tower'}},
  tbarracks:{name:'Quartel da vila',building:true,townb:true,w:3,h:3,hp:850,time:30,look:{skin:'y',base:'barracks'}},
  cart:   {name:'Carroça',unit:true,civil:true,cart:true,mech:true,noPop:true,noConvert:true,hp:450,speed:46,r:13,dmg:0,range:0,cd:1,sight:180,desc:'Leva a carga dos serviços de entrega.'},
  // wild creatures (team 3): hostile to both kingdoms; 'look' picks the sprite set so it can be swapped for orcs/skeletons later
  bandit: {name:'Bandido',unit:true,mil:true,wild:true,look:{skin:'k',base:'warrior'},hp:95,speed:56,r:9,dmg:9,range:18,cd:1.0,sight:190,bounty:{gold:8,food:4}},
  banditA:{name:'Bandido arqueiro',unit:true,mil:true,wild:true,ranged:true,look:{skin:'k',base:'archer'},hp:55,speed:58,r:8,dmg:7,range:140,cd:1.4,sight:200,bounty:{gold:8}},
  chief:  {name:'Chefe bandido',unit:true,mil:true,wild:true,look:{skin:'k',base:'lancer',s:1.15},hp:360,speed:48,r:12,dmg:18,range:32,cd:1.5,sight:210,bounty:{gold:45,food:20}},
  shaman: {name:'Xamã bandido',unit:true,mil:true,wild:true,healer:true,look:{skin:'k',base:'monk'},hp:60,speed:50,r:8,dmg:0,range:110,cd:1,sight:220,bounty:{gold:14}},
  raider: {name:'Saqueador',unit:true,mil:true,wild:true,look:{skin:'p',base:'warrior'},hp:110,speed:60,r:9,dmg:10,range:18,cd:1.0,sight:230,bounty:{gold:10,food:6}},
  raiderA:{name:'Saqueador arqueiro',unit:true,mil:true,wild:true,ranged:true,look:{skin:'p',base:'archer'},hp:60,speed:60,r:8,dmg:8,range:145,cd:1.35,sight:230,bounty:{gold:10}},
  raiderL:{name:'Saqueador lanceiro',unit:true,mil:true,wild:true,look:{skin:'p',base:'lancer'},hp:170,speed:54,r:10,dmg:14,range:30,cd:1.4,sight:230,bounty:{gold:16,food:8}},
  den:    {name:'Toca dos bandidos',building:true,wild:true,w:2,h:2,hp:450,look:{skin:'k',base:'house1'},drop:true,bounty:{gold:70,food:50}},
  lair:   {name:'Covil dos bandidos',building:true,wild:true,w:2,h:2,hp:800,look:{skin:'k',base:'tower'},drop:true,bounty:{gold:150,food:100}},
  // story characters
  king:   {name:'Rei Aldebrando',unit:true,mil:true,king:true,noConvert:true,look:{skin:'y',base:'warrior',s:1.25},hp:800,speed:52,r:11,dmg:16,range:20,cd:1.0,sight:150,regen:4,desc:'O rei de Pedravale. Se ele cair, o reino cai junto.'},
  duke:   {name:'Malvar, o Duque Rubro',unit:true,mil:true,boss:true,noConvert:true,look:{skin:'r',base:'lancer',s:1.3},hp:1500,speed:50,r:13,dmg:26,range:34,cd:1.4,sight:200,regen:2,bounty:{gold:300}},
  captain:{name:'Capitão Rubro',unit:true,mil:true,boss:true,noConvert:true,look:{skin:'r',base:'warrior',s:1.2},hp:750,speed:54,r:11,dmg:20,range:20,cd:1.1,sight:210,bounty:{gold:120,food:60}},
  crow:   {name:'Corvo Negro',unit:true,mil:true,wild:true,boss:true,noConvert:true,look:{skin:'k',base:'warrior',s:1.3},hp:950,speed:52,r:12,dmg:22,range:20,cd:1.0,sight:220,regen:2,bounty:{gold:200,food:100}},
  violet: {name:'Capitã Violeta',unit:true,mil:true,wild:true,boss:true,noConvert:true,look:{skin:'p',base:'lancer',s:1.25},hp:850,speed:54,r:12,dmg:22,range:32,cd:1.3,sight:220,bounty:{gold:180,food:80}},
  hideout:{name:'Fortaleza dos bandidos',building:true,wild:true,w:3,h:3,hp:1300,look:{skin:'k',base:'barracks'},drop:true,bounty:{gold:280,food:160}},
  // creatures of the Forja (their sheets are rebuilt in the device from the Tiny Swords ones, see forge.js)
  skel:   {name:'Esqueleto',unit:true,mil:true,wild:true,noConvert:true,undead:true,look:{f:'esqueleto',base:'warrior'},hp:115,speed:54,r:9,dmg:11,range:18,cd:1.05,sight:200,bounty:{gold:5}},
  skelA:  {name:'Esqueleto arqueiro',unit:true,mil:true,wild:true,ranged:true,noConvert:true,undead:true,look:{f:'esqarq',base:'archer'},hp:65,speed:56,r:8,dmg:9,range:150,cd:1.4,sight:220,bounty:{gold:6}},
  orc:    {name:'Orc brutamontes',unit:true,mil:true,wild:true,look:{f:'orc',base:'pawn',s:1.35,atk:'axe'},hp:230,speed:52,r:11,dmg:18,range:22,cd:1.3,sight:200,cleave:28,bounty:{gold:14,food:6}},
  necro:  {name:'Morvana, a Necromante',unit:true,mil:true,wild:true,boss:true,ranged:true,noConvert:true,undead:true,look:{f:'necro',base:'monk',s:1.35},hp:1150,speed:48,r:12,dmg:17,range:170,cd:1.6,sight:250,proj:'fire',splash:30,drain:.4,summon:{kind:'skel',alt:'skelA',n:2,cd:15,max:8},regen:2,bounty:{gold:260,food:80}},
  giant:  {name:'Gorm, o Gigante de Pedra',unit:true,mil:true,wild:true,boss:true,noConvert:true,look:{f:'gigante',base:'warrior',s:1.85},hp:2600,speed:38,r:17,dmg:40,range:32,cd:1.9,sight:230,cleave:48,stun:.8,wallx:4,regen:3,bounty:{gold:320,food:120}},
  // heroes of the Forja (Campanha and Defesa do Rei)
  hchama: {name:'Cavaleiro em Chamas',unit:true,mil:true,noConvert:true,look:{f:'chama',base:'warrior'},hp:130,speed:58,r:10,dmg:13,range:20,cd:1.0,sight:215,cleave:34},
  hrunico:{name:'Cavaleiro Rúnico',unit:true,mil:true,noConvert:true,look:{f:'runico',base:'warrior'},hp:145,speed:56,r:10,dmg:12,range:20,cd:1.0,sight:215,stun:.6},
  hdruida:{name:'Druida do Bosque',unit:true,mil:true,ranged:true,noConvert:true,aura:true,look:{f:'druida',base:'monk',s:1.1},hp:75,speed:52,r:9,dmg:9,range:160,cd:1.3,sight:245,chill:1.6},
  hsombra:{name:'Caçadora das Sombras',unit:true,mil:true,ranged:true,noConvert:true,look:{f:'sombra',base:'archer'},hp:70,speed:68,r:8,dmg:10,range:200,cd:1.15,sight:260,volley:2},
  hgelo:  {name:'Lanceira de Gelo',unit:true,mil:true,noConvert:true,look:{f:'gelo',base:'lancer'},hp:160,speed:55,r:10,dmg:15,range:32,cd:1.35,sight:215,chill:2},
  hanjo:  {name:'Guardiã Celeste',unit:true,mil:true,noConvert:true,aura:true,look:{f:'anjo',base:'lancer'},hp:165,speed:55,r:10,dmg:14,range:32,cd:1.35,sight:220,regen:3},
};
const baseKind=k=>DEF[k]&&DEF[k].look?DEF[k].look.base:k;
// veterancy, Command & Conquer style: a new rank every 3 enemy soldiers defeated; from the third rank on, wounds heal by themselves
const RANKS=[{n:'Recruta',k:0},{n:'Soldado',k:3},{n:'Cabo',k:6},{n:'Sargento',k:9},{n:'Tenente',k:12},{n:'Capitão',k:15},{n:'Major',k:18},{n:'Comandante',k:21}];
const rankHp=r=>1+.1*r, rankDmg=r=>1+.12*r;
const BUILD_LIST=['house','farm','barracks','tower','archery','monastery','market','tavern','wall','gate','pit','bridge','dock'];
const SPELL={
  bolt:  {name:'Raio Divino',era:4,cd:12,range:190,desc:'Raio do céu: dano alto e atordoa o alvo.'},
  meteor:{name:'Chuva de Fogo',era:5,cd:28,range:230,desc:'Bolas de fogo caem numa área.'},
};
// counters: warrior > archer > lancer > warrior
const BONUS={warrior:{archer:1.6,monk:1.3},archer:{lancer:1.6,monk:1.3,building:.35},lancer:{warrior:1.6,monk:1.3,building:.9},pawn:{building:.7},
  scout:{pawn:2.2,merchant:2,monk:1.5,building:.4},wizard:{building:.6},ram:{building:1},catapult:{building:2.2,unit:.75}};
function bonus(ak,tk){if(DEF[ak]&&DEF[ak].wallx&&DEF[tk]&&DEF[tk].wall)return DEF[ak].wallx;const b=BONUS[ak]||BONUS[baseKind(ak)];if(!b)return 1;if(DEF[tk].building)return b.building!=null?b.building:1;const m=DEF[tk].mech&&!DEF[ak].mech?.8:1;return (b[tk]||b[baseKind(tk)]||b.unit||1)*m;}
const healable=e=>!!DEF[e.kind].unit&&!DEF[e.kind].mech;
const DIFF={
  normal: {key:'normal',name:'Normal',gather:.9,think:1.6,attackBase:12,start:0,harass:false,pawnBonus:-3,monks:1,peace:480,eraMin:[0,0,300,660,1020,1380]},
  dificil:{key:'dificil',name:'Difícil',gather:1.1,think:.8,attackBase:9,start:50,harass:true,pawnBonus:1,monks:2,peace:300,eraMin:[0,0,180,420,720,1020]},
  insano: {key:'insano',name:'Insano',gather:1.4,think:.45,attackBase:7,start:150,harass:true,pawnBonus:5,monks:3,peace:200,eraMin:[0,0,0,0,0,0]},
};
const RES_NAME={wood:'madeira',gold:'ouro',food:'comida'};
// friendship with the bandit camps: gifts the merchant must deliver, and how many
const GIFT={den:{cost:{food:80,gold:60},need:1},lair:{cost:{food:120,gold:100},need:2},hideout:{cost:{food:150,gold:150,wood:100},need:3}};
const TRIBUTE={gold:20,food:20};

// ================================================================ state
let S=null;
let occ=new Int32Array(N), blk=new Uint8Array(N), reach=new Uint8Array(N), reachDirty=true;
// wallT: team owning the wall or gate on a tile; gateM: 1 when it is a gate. PT is the team whose unit is moving or pathing now.
let wallT=new Int8Array(N), gateM=new Uint8Array(N), PT=0, PBREACH=false;
// elevation: levels 0..3 (MAXLV). A cliff face sits on the tile just south of a higher tile (blocked); stairs (ramp) cut into a
// one-level cliff join the two levels. Neighbouring tiles never differ by more than one level.
let elev=new Uint8Array(N), ramp=new Uint8Array(N), cliff=new Uint8Array(N);
// bridges over water or pits; PNAV is true while a boat moves or plans its route (it sails on water only)
let bridgeA=new Uint8Array(N), PNAV=false;
function recomputeBridges(){bridgeA=new Uint8Array(N);for(const e of S.ents)if(!e.dead&&e.kind==='bridge'&&e.built)bridgeA[idx(e.tx,e.ty)]=1;reachDirty=true;}
function linkElev(){
  const fix=a=>a instanceof Uint8Array?a:(a?Uint8Array.from(Object.values(a)):new Uint8Array(N));
  S.elev=fix(S.elev);S.ramp=fix(S.ramp);elev=S.elev;ramp=S.ramp;computeCliffs();
}
const MAXLV=3;
function computeCliffs(){
  cliff=new Uint8Array(N);
  for(let i=0;i<N;i++){
    const d=i>=MW?elev[i-MW]-elev[i]:0;
    if(d<=0){ramp[i]=0;continue;}
    if(d>1)ramp[i]=0;
    if(!ramp[i])cliff[i]=1;
  }
}
// can a unit step from tile a to the neighbouring tile b? Only stairs join two levels.
function canStep(a,b){const ea=elev[a],eb=elev[b];if(ea===eb)return true;if(ramp[a]&&b===a-MW&&eb===ea+1)return true;if(ramp[b]&&a===b-MW&&ea===eb+1)return true;return false;}
const tileIdx=(x,y)=>idx(clamp(tileOf(x),0,MW-1),clamp(tileOf(y),0,MH-1));
const elevAt=(x,y)=>elev[tileIdx(x,y)];
const byId=new Map();
const FX={speech:[],orders:[],floats:[],marks:[],puffs:[],pings:[],booms:[],rings:[],bolts:[],meteors:[],banners:[],sparks:[],ranks:[],cmds:[]};
const treeShake=new Map();
let AT=0;

const eraOf=t=>(S&&S.teams[t])?S.teams[t].era:1;
const has=k=>!!(S&&S.items&&S.items[k]);
function gatherMult(t){const e=eraOf(t);return econWork(t)*(1+(e>=2?.15:0)+(e>=4?.15:0)+(e>=5?.1:0))*(t===2||t===1&&S.cfg&&S.cfg.watch?S.diff.gather:1)*(t===1&&has('ferramentas')?1.2:1);}
function atkMult(u){return (u.sq?sqAtk(u):1)*(u.team&&u.team<3&&S.econ&&S.econ[u.team]&&S.econ[u.team].unpaid&&DEF[u.kind].mil?.9:1)*(u.hero?1.8:1)*(u.team===1&&has('armas')?1.15:1)*(u.medic?.5:1)*(u.supT>S.t?1.15:1)*(DEF[u.kind].ranged&&techHas(u.team,'flechas')?1.12:1);}
function carryCap(t){const e=eraOf(t);return e>=5?16:e>=3?13:10;}
// wild creatures grow tougher as the game goes on
function wildMult(){return 1+Math.min(1,(S?S.t:0)/1800)*.8;}
function hpMult(t,k){if(t===3)return wildMult();if(!DEF[k].mil)return 1;const e=eraOf(t);return 1+(e>=3?.15:0)+(e>=5?.15:0);}
function dmgMult(t){if(t===3)return wildMult();const e=eraOf(t);return 1+(e>=4?.2:0)+(e>=5?.15:0);}
function towerMult(t){const e=eraOf(t);return 1+(e>=4?.35:0)+(e>=5?.25:0);}
function bldMult(t){const e=eraOf(t);return 1+(e>=3?.2:0)+(e>=5?.2:0);}
function convertTime(team,target){const e=eraOf(team);return (DEF[target.kind].building?8:e>=5?3:e>=4?4:5)*(team===1&&has('relicario')?.6:1);}
function unlocked(t,k){return (DEF[k].era||1)<=eraOf(t);}
function unitName(e){
  const k=e.kind,D=DEF[k];if(e.title)return e.title;
  if(k==='town'&&S.towns&&S.towns[e.town])return S.towns[e.town].name;
  if(!e.team)return D.name;
  if(e.medic)return 'Médico de campo';
  const era=eraOf(e.team);
  if(k==='monk')return era>=5?'Sumo-sacerdote':era>=4?'Sacerdote':'Monge';
  if(D.mech)return D.name;
  if(D.mil&&era>=5)return D.name+(k==='catapult'?'':(D.name.endsWith('a')?' lendária':' lendário'));
  if(D.mil&&era>=4&&(D.era||1)<4)return D.name+' de elite';
  return D.name;
}
function walk(i){
  const t=S.tiles[i];
  if(PNAV)return t===WATER&&!blk[i];
  if(t===TREE||cliff[i])return false;
  if((t===WATER||t===PIT)&&!bridgeA[i])return false;
  if(!blk[i])return true;return gateM[i]===1&&wallT[i]===PT;
}
const groundOK=i=>{const t=S.tiles[i];return t!==TREE&&!cliff[i]&&(t!==WATER&&t!==PIT||bridgeA[i]===1);};
// attackers may plan a route through an enemy wall: they will break it on the way
const breachable=i=>PBREACH&&blk[i]&&wallT[i]!==0&&wallT[i]!==PT&&S.tiles[i]!==WATER&&S.tiles[i]!==TREE;
// can a building of kind k go on this tile? (bridges over water or pits, pits and docks on land)
function placeTileOK(k,x,y,team){
  if(!inB(x,y))return false;const i=idx(x,y),t=S.tiles[i];
  if(k==='bridge'){
    if(!(t===WATER||t===PIT)||bridgeA[i])return false;
    if(occ[i]){const o=byId.get(occ[i]);if(!o||o.kind!=='pit'||o.team!==team||!o.built)return false;}
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const j=idx(nx,ny),tj=S.tiles[j],o=occ[j]&&byId.get(occ[j]);
      if(o&&o.kind==='bridge')return true;if(tj!==WATER&&tj!==PIT&&tj!==TREE&&!cliff[j]&&elev[j]===0)return true;}
    return false;
  }
  return buildable(x,y);
}
function walkXY(x,y){return inB(x,y)&&walk(idx(x,y));}
function walkPt(x,y){return walkXY(tileOf(x),tileOf(y));}
function buildable(x,y){if(!inB(x,y))return false;const i=idx(x,y),t=S.tiles[i];return (t===GRASS||t===SAND||t===STUMP||t===ROAD)&&occ[i]===0&&!cliff[i]&&!ramp[i];}
function rectOf(e){const D=DEF[e.kind];return [e.tx*TS,e.ty*TS,D.w*TS,D.h*TS];}
function distRect(x,y,r){const dx=Math.max(r[0]-x,0,x-(r[0]+r[2])),dy=Math.max(r[1]-y,0,y-(r[1]+r[3]));return hyp(dx,dy);}
const alive=e=>!!e&&!e.dead;
const isFixed=e=>!!(DEF[e.kind].building||DEF[e.kind].resource);
function distTo(u,t){return isFixed(t)?distRect(u.x,u.y,rectOf(t)):hyp(t.x-u.x,t.y-u.y)-(DEF[t.kind].r||0);}
function centerOf(e){if(!isFixed(e))return {x:e.x,y:e.y-8};const r=rectOf(e);return {x:r[0]+r[2]/2,y:r[1]+r[3]/2};}

// ================================================================ entities
function occupy(e,on){
  const D=DEF[e.kind],block=!D.flat;
  for(let y=0;y<D.h;y++)for(let x=0;x<D.w;x++){
    if(!inB(e.tx+x,e.ty+y))continue;
    const i=idx(e.tx+x,e.ty+y);
    if(on){occ[i]=e.id;if(block)blk[i]=1;if(D.wall){wallT[i]=e.team;gateM[i]=D.gate?1:0;}}
    else if(occ[i]===e.id){occ[i]=0;blk[i]=0;wallT[i]=0;gateM[i]=0;}
  }
}
function addEnt(e){S.ents.push(e);byId.set(e.id,e);return e;}
function spawnUnit(kind,team,x,y,extra){
  const D=DEF[kind];
  const hp=Math.round(D.hp*(team?hpMult(team,kind):1));
  const e={id:S.nextId++,born:S.t,kind,team,x,y,hp:Math.round(hp*(D.cart&&techHas(team,'rodas')?1.3:1)),maxhp:Math.round(hp*(D.cart&&techHas(team,'rodas')?1.3:1)),order:null,path:null,carry:null,cd:0,face:team===2?-1:1,scan:Math.random()*.4};
  if(D.critter){e.amount=D.food;e.team=0;}
  if(D.boss||D.king)e.face=team===1?1:-1;
  if(D.holy){e.faith=1;e.boltCd=0;e.meteorCd=0;}
  return addEnt(Object.assign(e,extra||{}));
}
// a summoner (the Necromancer) raises the dead around it while there are foes in sight
function summonTick(u,M,dt){
  u.sumT=(u.sumT==null?M.cd*.5:u.sumT)-dt;if(u.sumT>0)return;
  u.sumT=M.cd;
  let foe=false;forNear(u.x,u.y,DEF[u.kind].sight,e=>{if(!foe&&!e.dead&&e.team&&e.team!==u.team&&e.team<3&&DEF[e.kind].unit)foe=true;});
  if(!foe)return;
  u.raised=(u.raised||[]).filter(id=>alive(byId.get(id)));
  for(let k=0;k<M.n&&u.raised.length<M.max;k++){
    const a=Math.random()*Math.PI*2,x=u.x+Math.cos(a)*34,y=u.y+Math.sin(a)*24;if(!walkPt(x,y))continue;
    const s=spawnUnit(M.alt&&Math.random()<.35?M.alt:M.kind,u.team,x,y,{summoned:u.id});u.raised.push(s.id);
    HOOK.sfx('summon',x,y,u.team);
  }
}
function spawnFixed(kind,team,tx,ty,extra){
  const D=DEF[kind];
  const hp=D.hp?Math.round(D.hp*(team&&team<3?bldMult(team):1)*(team&&(kind==='wall'||kind==='gate'||kind==='tower')&&techHas(team,'cantaria')?1.25:1)):0;
  const e={id:S.nextId++,kind,team,tx,ty,x:(tx+D.w/2)*TS,y:(ty+D.h)*TS,hp,maxhp:hp,built:true,prog:1,queue:[],tp:0,cd:0};
  if(D.resource){e.amount=D.amount;e.team=0;}
  Object.assign(e,extra||{});
  addEnt(e);occupy(e,true);
  if(S.decor)S.decor=S.decor.filter(d=>!(d.tx!=null&&d.tx>=tx-1&&d.tx<tx+D.w+1&&d.ty>=ty-1&&d.ty<ty+D.h));
  return e;
}

// ================================================================ map generation: a new random map every game (mirrored left/right so both sides are fair)
const BIOMES=[null,{name:'Campos Dourados',grass:'#b4b65a'},{name:'Vale Verde',grass:'#93ba4f'},{name:'Bosque Úmido',grass:'#74b363'},{name:'Terras Secas',grass:'#969f64'},{name:'Planície Fria',grass:'#63a486'}];
const SHAPES={ilha:'Ilha',continente:'Continente com lagos',gemeas:'Ilhas gêmeas'};
const mirX=x=>MW-1-x;
function genMap(){
  const rng=mulberry(S.seed);
  S.biome=1+Math.floor(rng()*5);
  S.shape=['ilha','continente','gemeas'][Math.floor(rng()*3)];
  const n1=makeNoise(rng,12),n2=makeNoise(rng,4.8),n3=makeNoise(rng,2.6),n4=makeNoise(rng,7);
  const sym=(f,x,y)=>(f(x,y)+f(mirX(x),y))/2;
  const tiles=new Array(N).fill(WATER),wood=new Array(N).fill(0);
  const inner=(x,y)=>x>1&&y>1&&x<MW-2&&y<MH-2;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    if(!inner(x,y))continue;
    const nx=(x+.5-MW/2)/(MW/2-1.5),ny=(y+.5-MH/2)/(MH/2-1.5),nz=sym(n1,x,y)-.5;
    let land;
    if(S.shape==='ilha')land=hyp(nx,ny*1.02)-nz*.55<.86;
    else if(S.shape==='continente'){
      const edge=Math.min(x,y,MW-1-x,MH-1-y)+nz*6;
      land=edge>3.2&&sym(n4,x,y)<.7;
    }else{
      const lx=(Math.abs(nx)-.52)/.5,ly=ny/.95;
      land=hyp(lx,ly)-nz*.6<.98;
    }
    if(land)tiles[idx(x,y)]=GRASS;
  }
  const cy=Math.round(MH*.3)+Math.floor(rng()*MH*.34),cx=8+Math.floor(rng()*3),AREA=MW*MH/6144;
  const P={tx:cx,ty:cy},A={tx:MW-cx-5,ty:cy};
  const pc={x:P.tx+2.5,y:P.ty+2},ac={x:A.tx+2.5,y:A.ty+2};
  const disc=(x0,y0,r)=>{for(let y=Math.floor(y0-r);y<=y0+r;y++)for(let x=Math.floor(x0-r);x<=x0+r;x++)if(inner(x,y)&&hyp(x+.5-x0,y+.5-y0)<=r)tiles[idx(x,y)]=GRASS;};
  disc(pc.x,pc.y,10.5);disc(ac.x,ac.y,10.5);
  // road across the island (left half generated, right half mirrored); land around it so the halves always connect
  const road=new Set();
  const ax=pc.x,ay=P.ty+4.6,bx=MW/2-.5,midY=clamp(MH/2+(rng()-.5)*14,12,MH-12);
  const amp=2+rng()*4,freq=1.4+rng()*1.6;
  const steps=Math.ceil((bx-ax)*3);let px=-1,py=-1;
  for(let i=0;i<=steps;i++){
    const u=i/steps;
    const x=Math.round(ax+(bx-ax)*u),y=Math.round(ay+(midY-ay)*u*u+Math.sin(u*Math.PI*freq)*amp*Math.sin(u*Math.PI*.9));
    if(x===px&&y===py)continue;
    if(px>=0&&x!==px&&y!==py){road.add(idx(x,py));road.add(idx(mirX(x),py));}
    road.add(idx(x,y));road.add(idx(mirX(x),y));px=x;py=y;
  }
  for(const i of road){const x=i%MW,y=(i/MW)|0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(inner(x+dx,y+dy)&&tiles[idx(x+dx,y+dy)]===WATER)tiles[idx(x+dx,y+dy)]=GRASS;}
  for(const i of road)tiles[i]=ROAD;
  // keep land connected to the blue castle
  const seen=new Uint8Array(N),st=[idx(Math.floor(pc.x),Math.floor(pc.y))];seen[st[0]]=1;
  while(st.length){const c=st.pop(),qx=c%MW,qy=(c/MW)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=qx+dx,ny=qy+dy;if(!inB(nx,ny))continue;const ni=idx(nx,ny);if(!seen[ni]&&tiles[ni]!==WATER){seen[ni]=1;st.push(ni);}}}
  for(let i=0;i<N;i++)if(!seen[i])tiles[i]=WATER;
  // high ground: plateaus with stairs, mirrored for both sides; in the mountains they climb up to level 3
  const E=new Uint8Array(N),RP=new Uint8Array(N);
  const roadNear=(i,r)=>{const x=i%MW,y=(i/MW)|0;for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){const xx=x+dx,yy=y+dy;if(inB(xx,yy)&&road.has(idx(xx,yy)))return true;}return false;};
  const setE=(i,v)=>{E[i]=v;E[idx(mirX(i%MW),(i/MW)|0)]=v;};
  const N4=[[1,0],[-1,0],[0,1],[0,-1]],N8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
  if(S.relief!=='plano'){
    const mtn=S.relief==='montanhas';
    const nb=makeNoise(rng,3.2),want=Math.round((mtn?3+Math.floor(rng()*2):3+Math.floor(rng()*3))*AREA);let made=0;
    for(let k=0;k<80*AREA&&made<want;k++){
      const r=mtn?4.4+rng()*3:2.6+rng()*2.8,cx=3+r+rng()*(MW/2-7-2*r),cy=3+r+rng()*(MH-6-2*r);
      if(hyp(cx-pc.x,cy-pc.y)<r+11.5)continue;
      const cells=[];
      for(let y=Math.floor(cy-r-1);y<=cy+r+1;y++)for(let x=Math.floor(cx-r-1);x<=cx+r+1;x++){
        if(!inB(x,y))continue;const d=hyp(x+.5-cx,(y+.5-cy)*1.15)/r;
        if(d>.72+nb(x,y)*.55)continue;
        const i=idx(x,y);if(tiles[i]!==WATER&&!roadNear(i,1))cells.push(i);
      }
      if(cells.length<9)continue;
      for(const i of cells)setE(i,1);
      made++;
    }
    // tidy: no thin spikes, no cliff on a road or in the water, stay off the borders
    for(let pass=0;pass<4;pass++)for(let i=0;i<N;i++){
      if(!E[i])continue;const x=i%MW,y=(i/MW)|0;
      let n=0;for(const[dx,dy]of N4)if(inB(x+dx,y+dy)&&E[idx(x+dx,y+dy)])n++;
      const s=y+1<MH?idx(x,y+1):-1;
      const bad=n<2||y<2||y>MH-4||x<2||x>MW-3||tiles[i]===WATER||s<0||(!E[s]&&(tiles[s]===WATER||roadNear(s,0)))||(E[idx(x,y-1)]===0&&E[s]===0);
      if(bad)setE(i,0);
    }
    // higher terraces inside the big plateaus: every tile of level L sits on ground of level L-1 all around it
    const top=mtn?MAXLV:2;
    for(let L=2;L<=top;L++){
      const nz=makeNoise(rng,2.6),mark=[];
      for(let i=0;i<N;i++){
        if(E[i]!==L-1||i%MW>=MW/2)continue;const x=i%MW,y=(i/MW)|0;
        let ok=inB(x,y+2)&&E[idx(x,y+2)]>=L-1;for(const[dx,dy]of N8){if(!ok)break;if(!inB(x+dx,y+dy)||E[idx(x+dx,y+dy)]<L-1)ok=false;}
        if(ok&&nz(x,y)>(mtn?(L===2?.18:.26):.42))mark.push(i);
      }
      for(const i of mark)setE(i,L);
      for(let pass=0;pass<4;pass++)for(let i=0;i<N;i++){
        if(E[i]!==L||i%MW>=MW/2)continue;const x=i%MW,y=(i/MW)|0;
        let n=0;for(const[dx,dy]of N4)if(E[idx(x+dx,y+dy)]>=L)n++;
        if(n<2||(E[idx(x,y-1)]<L&&E[idx(x,y+1)]<L))setE(i,L-1);
      }
    }
    // stairs: every walkable part of a terrace gets one (two when big) down to the level below, on the side facing home.
    // A part with no room for stairs, or that still cannot be reached from the castle, is lowered and the stairs placed again.
    const clG=i=>i>=MW&&E[i-MW]>E[i];
    for(let round=0;round<10;round++){
      RP.fill(0);let lowered=false;
      const comp=new Int32Array(N).fill(-1),parts=[];
      for(let i0=0;i0<N;i0++){
        const L=E[i0];if(!L||comp[i0]>=0||i0%MW>=MW/2||clG(i0))continue;
        const cells=[],stk=[i0];comp[i0]=i0;
        while(stk.length){const c=stk.pop();cells.push(c);const x=c%MW,y=(c/MW)|0;for(const[dx,dy]of N4){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const ni=idx(nx,ny);if(E[ni]===L&&comp[ni]<0&&!clG(ni)){comp[ni]=i0;stk.push(ni);}}}
        parts.push(cells);
        const cand=[];
        for(const c of cells){const x=c%MW,y=(c/MW)|0;if(y+2>=MH)continue;const j=idx(x,y+1),k2=idx(x,y+2);
          if(E[j]===L-1&&E[k2]===L-1&&tiles[j]!==WATER&&tiles[k2]!==WATER&&!RP[j]&&E[idx(x-1,y)]===L&&E[idx(x+1,y)]===L)cand.push(j);}
        if(!cand.length){for(const c of cells)setE(c,L-1);lowered=true;continue;}
        cand.sort((a,b)=>hyp(a%MW-pc.x,((a/MW)|0)-pc.y)-hyp(b%MW-pc.x,((b/MW)|0)-pc.y));
        const pick=[cand[0]];
        if(cells.length>28){const far=cand.slice().sort((a,b)=>hyp(b%MW-cand[0]%MW,0)-hyp(a%MW-cand[0]%MW,0))[0];if(Math.abs(far%MW-cand[0]%MW)>=4)pick.push(far);}
        for(const j of pick){RP[j]=1;RP[idx(mirX(j%MW),(j/MW)|0)]=1;}
      }
      if(!lowered){
        // walk from the castle: any high ground still out of reach is lowered
        const seen=new Uint8Array(N),s0=idx(Math.floor(pc.x),Math.floor(pc.y)+3),stk=[s0];seen[s0]=1;
        const pass=i=>tiles[i]!==WATER&&(!clG(i)||RP[i]);
        while(stk.length){const a=stk.pop(),x=a%MW,y=(a/MW)|0;for(const[dx,dy]of N4){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const b=idx(nx,ny);if(seen[b]||!pass(b))continue;
          const ok=E[a]===E[b]||(RP[a]&&b===a-MW&&E[b]===E[a]+1)||(RP[b]&&a===b-MW&&E[a]===E[b]+1);if(!ok)continue;seen[b]=1;stk.push(b);}}
        for(const cells of parts)if(!seen[cells[0]]){const L=E[cells[0]];for(const c of cells)setE(c,L-1);lowered=true;}
      }
      if(!lowered)break;
      // lowering a terrace may leave a step of two levels next to it: settle those
      for(let changed=true,g=0;changed&&g<6;g++){changed=false;
        for(let i=0;i<N;i++){const x=i%MW,y=(i/MW)|0;if(x>=MW/2||!E[i])continue;
          for(const[dx,dy]of N8){if(!inB(x+dx,y+dy))continue;if(E[i]-E[idx(x+dx,y+dy)]>1){setE(i,E[i]-1);changed=true;break;}}}}
    }
  }
  S.elev=E;S.ramp=RP;
  const cliffAt=i=>i>=MW&&E[i-MW]>E[i];
  for(let i=0;i<N;i++)if(cliffAt(i)&&tiles[i]===ROAD)tiles[i]=GRASS;
  // forests
  const thr=.56+rng()*.08;
  const nearRoad=(x,y)=>{for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(road.has(idx(x+dx,y+dy)))return true;return false;};
  const tree=(x,y)=>{
    if(!inB(x,y))return;const i=idx(x,y);
    if(tiles[i]!==GRASS||nearRoad(x,y))return;
    if(cliffAt(i)||RP[i]||(i+MW<N&&RP[i+MW])||(i>=MW&&RP[i-MW]))return;
    if(E[i]>=2&&hash(i*5+S.seed)>.22)return;
    if(hyp(x-pc.x,y-pc.y)<8||hyp(x-ac.x,y-ac.y)<8)return;
    tiles[i]=TREE;wood[i]=60+Math.floor(hash(i*3+S.seed)*30);
  };
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){const v=sym(n2,x,y)*.75+sym(n3,x,y)*.25;if(v>thr)tree(x,y);}
  for(let k=0;k<6;k++){
    const a=rng()*Math.PI*2,d=10+rng()*9,r=2.6+rng()*1.2;
    const dx=Math.cos(a)*d,dy=Math.sin(a)*d*.8;
    for(const side of[1,-1]){
      const qx=side>0?pc.x+dx:ac.x-dx,qy=pc.y+dy;
      for(let y=Math.floor(qy-r);y<=qy+r;y++)for(let x=Math.floor(qx-r);x<=qx+r;x++)
        if(inB(x,y)&&hyp(x-qx,y-qy)<=r&&hash(idx(Math.min(x,mirX(x)),y)+S.seed)<.86)tree(x,y);
    }
  }
  S.tiles=tiles;S.wood=wood;
  return {P,A,pc,ac,rng,road};
}
// a free spot for a building near a point (used for the AI and for campaign start buildings)
function spotFor(team,kind,ax,ay,rmin,rmax){
  const D=DEF[kind];
  for(let r=rmin;r<=rmax;r++){
    const tries=Math.max(8,Math.round(r*7));
    for(let k=0;k<tries;k++){
      const a=k/tries*Math.PI*2+r*.9;
      const tx=Math.round(ax/TS+Math.cos(a)*r-D.w/2),ty=Math.round(ay/TS+Math.sin(a)*r*.85-D.h/2);
      if(!canPlace(team,kind,tx,ty))continue;
      if(!D.flat&&kind!=='dock'&&!ringClear(tx,ty,D.w,D.h))continue;
      if(!reachRect(tx,ty,D.w,D.h))continue;
      return {tx,ty};
    }
  }
  return null;
}
const ANIMALS=['sheep','sheep','sheep','lamb','lamb','bsheep','bsheep','gsheep'];
function setupWorld(){
  occ=new Int32Array(N);blk=new Uint8Array(N);wallT=new Int8Array(N);gateM=new Uint8Array(N);byId.clear();
  const C=S.cfg;
  const {P,A,pc,ac,rng,road}=genMap();
  linkElev();
  const castles={1:spawnFixed('castle',1,P.tx,P.ty)};
  if(C.redCastle)castles[2]=spawnFixed('castle',2,A.tx,A.ty);
  computeReach();
  // gold mines: pick for the blue side, mirror for the red side
  const goldOK=(tx,ty)=>{
    for(let y=-1;y<=2;y++)for(let x=-1;x<=2;x++){
      if(!inB(tx+x,ty+y))return false;
      const i=idx(tx+x,ty+y),inn=y>=0&&y<2&&x>=0&&x<2;
      if(inn&&(S.tiles[i]!==GRASS||occ[i]||road.has(i)||cliff[i]||ramp[i]))return false;
      if(!inn&&(occ[i]||road.has(i)||ramp[i]))return false;
      if(!cliff[i]&&elev[i]!==elev[idx(tx,ty)])return false;
    }
    return true;
  };
  const placeGold=(qx,qy,rmin,rmax)=>{
    for(let k=0;k<300;k++){
      const a=rng()*Math.PI*2,r=rmin+rng()*(rmax-rmin);
      const tx=Math.round(qx+Math.cos(a)*r-1),ty=Math.round(qy+Math.sin(a)*r-1),mx=MW-tx-2;
      if(tx+2>=MW/2-1)continue;
      if(goldOK(tx,ty)&&goldOK(mx,ty)&&reachRect(tx,ty,2,2)&&reachRect(mx,ty,2,2)){spawnFixed('gold',0,tx,ty);spawnFixed('gold',0,mx,ty);return true;}
    }
    return false;
  };
  placeGold(pc.x,pc.y,6,8.5);placeGold(pc.x,pc.y,6.5,9.5);placeGold(pc.x,pc.y,10,13);
  for(let k=0;k<Math.round(3*(MW*MH/6144));k++)placeGold(MW/2-8-rng()*(MW/6),8+rng()*(MH-16),0,8);
  computeReach();
  // animals: herds of sheep, lambs, black sheep and the rare golden sheep, all over the island (mirrored)
  const animal=()=>ANIMALS[Math.floor(rng()*ANIMALS.length)];
  const herd=(qx,qy,rmin,rmax,n,fixed)=>{
    let made=0;
    for(let k=0;k<400&&made<n;k++){
      const a=rng()*Math.PI*2,r=rmin+rng()*(rmax-rmin),tx=Math.round(qx+Math.cos(a)*r),ty=Math.round(qy+Math.sin(a)*r);
      if(tx>=MW/2-1)continue;
      if(walkXY(tx,ty)&&walkXY(mirX(tx),ty)&&reachT(tx,ty)&&reachT(mirX(tx),ty)&&S.tiles[idx(tx,ty)]===GRASS&&S.tiles[idx(mirX(tx),ty)]===GRASS){
        const k1=fixed||animal();
        spawnUnit(k1,0,tx*TS+16,ty*TS+20);spawnUnit(k1,0,mirX(tx)*TS+16,ty*TS+20);made++;
      }
    }
  };
  herd(pc.x,pc.y,5,9,5,'sheep');herd(pc.x,pc.y,5,10,3);
  for(let k=0;k<Math.round(9*MW*MH/6144);k++){const qx=6+rng()*(MW/2-12),qy=6+rng()*(MH-12);if(hyp(qx-pc.x,qy-pc.y)<8)continue;herd(qx,qy,0,4,2+Math.floor(rng()*3));}
  // people
  for(const t of[1,2]){
    const c=castles[t];if(!c)continue;
    const gx=(c.tx+2.5)*TS,gy=(c.ty+4)*TS+22,f=t===1?1:-1;
    for(let i=0;i<4;i++)spawnUnit('pawn',t,gx+f*(-48+i*32),gy+(i%2)*14);
    spawnUnit('warrior',t,gx+f*72,gy-6);
  }
  if(C.camps!==false)setupCamps(pc,rng,road,goldOK);
  else S.camps=[];
  if(C.towns)setupTowns(pc,rng,road);
  // without bandit dens their treasure mines would be missing: put that gold back where the dens used to be
  if(C.camps===false){placeGold(pc.x+15,pc.y-12,0,6);placeGold(MW/2-14,10,0,6);placeGold(MW/2-14,MH-11,0,6);computeReach();}
  // decoration
  S.decor=[];
  const landAt=(x,y)=>inB(x,y)&&S.tiles[idx(x,y)]!==WATER;
  for(let y=1;y<MH-1;y++)for(let x=1;x<MW-1;x++){
    const i=idx(x,y),t=S.tiles[i];
    if(t===GRASS&&!occ[i]&&!road.has(i)&&!cliff[i]&&!ramp[i]){
      const r=rng();
      if(r<.03)S.decor.push({k:'bush',v:1+Math.floor(rng()*4),x:x*TS+16,y:y*TS+26,tx:x,ty:y});
      else if(r<.045)S.decor.push({k:'rock',v:1+Math.floor(rng()*4),x:x*TS+16,y:y*TS+24,tx:x,ty:y});
    }else if(t===WATER){
      let near=false,touch=false;
      for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(landAt(x+dx,y+dy)){near=true;if(Math.abs(dx)<=1&&Math.abs(dy)<=1)touch=true;}
      if(near&&!touch&&rng()<.05)S.decor.push({k:'wrock',v:1+Math.floor(rng()*4),x:x*TS+16,y:y*TS+22});
    }
  }
  let ducks=0;
  for(let k=0;k<2000&&ducks<7;k++){
    const x=2+Math.floor(rng()*(MW-4)),y=2+Math.floor(rng()*(MH-4));
    if(S.tiles[idx(x,y)]!==WATER)continue;
    let near=false,touch=false;
    for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)if(landAt(x+dx,y+dy)){near=true;if(Math.abs(dx)<=1&&Math.abs(dy)<=1)touch=true;}
    if(near&&!touch){S.decor.push({k:'duck',v:rng()*6,x:x*TS+16,y:y*TS+20});ducks++;}
  }
  S.home={pc,ac,road};
  return castles;
}

// ---------------------------------------------------------------- wild camps: a lair, its guards and a treasure of gold
function campSpot(kind,cx,cy,mirror,road){
  const D=DEF[kind];
  const ok=(tx,ty)=>{
    for(let y=ty-1;y<=ty+D.h;y++)for(let x=tx-1;x<=tx+D.w;x++){
      if(!inB(x,y))return false;const i=idx(x,y),inner=x>=tx&&x<tx+D.w&&y>=ty&&y<ty+D.h;
      if(inner&&(S.tiles[i]!==GRASS||occ[i]||road.has(i)||cliff[i]||ramp[i]||elev[i]!==elev[idx(tx,ty)]))return false;
      if(!inner&&(S.tiles[i]===WATER||occ[i]||ramp[i]))return false;
    }
    return reachRect(tx,ty,D.w,D.h);
  };
  for(let r=0;r<9;r++)for(let k=0;k<Math.max(1,r*8);k++){
    const a=k/Math.max(1,r*8)*Math.PI*2;
    const tx=Math.round(cx+Math.cos(a)*r-D.w/2),ty=Math.round(cy+Math.sin(a)*r-D.h/2);
    if(!ok(tx,ty))continue;
    if(mirror){const mx=MW-tx-D.w;if(mx<=tx+D.w+2||!ok(mx,ty))continue;return [{tx,ty},{tx:mx,ty}];}
    return [{tx,ty}];
  }
  return [];
}
function makeCamp(kind,spot,guards){
  const b=spawnFixed(kind,3,spot.tx,spot.ty);
  const D=DEF[kind],c={lair:b.id,kinds:guards,x:(spot.tx+D.w/2)*TS,y:(spot.ty+D.h)*TS+18,t:0};
  S.camps.push(c);
  guards.forEach((k,i)=>spawnGuard(c,k,i));
  return c;
}
function spawnGuard(c,k,i,team){
  const a=(i||0)*1.7,x=c.x+Math.cos(a)*34,y=c.y+Math.abs(Math.sin(a))*24;
  const w=nearestWalk(clamp(tileOf(x),0,MW-1),clamp(tileOf(y),0,MH-1));if(!w)return null;
  const px=w[0]*TS+16,py=w[1]*TS+16,tm=team||3;
  return spawnUnit(k,tm,px,py,{home:{x:px,y:py},camp:S.camps.indexOf(c),ally:tm!==3});
}
function campOf(e){
  if(!S.camps)return null;
  if(e.camp!=null&&S.camps[e.camp])return S.camps[e.camp];
  return S.camps.find(c=>c.lair===e.id)||null;
}
// ---------------------------------------------------------------- market and the merchant's diplomacy
function marketOf(t){return S.ents.some(e=>!e.dead&&e.team===t&&e.kind==='market'&&e.built);}
function price(res){if(!S.market)S.market={wood:100,food:100};return S.market[res];}
const buyCost=res=>Math.round(price(res)*1.12),sellGain=res=>Math.round(price(res)*.82);
function trade(t,res,buy){
  if(!marketOf(t))return 'nomarket';
  const T=S.teams[t].res,p=price(res);
  if(buy){const c=buyCost(res);if(T.gold<c)return 'gold';T.gold-=c;T[res]+=100;S.market[res]=Math.min(300,p+7);}
  else{if(T[res]<100)return 'have';T[res]-=100;T.gold+=sellGain(res);S.market[res]=Math.max(25,p-7);}
  return 'ok';
}
// sell 100 of one and buy 100 of the other in one go
function barter(t,from,to){
  if(!marketOf(t))return 'nomarket';
  const T=S.teams[t].res;
  if(T[from]<100)return 'have';
  if(T.gold+sellGain(from)<buyCost(to))return 'gold';
  trade(t,from,false);trade(t,to,true);return 'ok';
}
function updMarket(){
  if(!S.market)return;
  S.mktT=(S.mktT||0)+1;if(S.mktT<3)return;S.mktT=0;
  for(const k in S.market){const p=S.market[k];S.market[k]=p<100?p+1:p>100?p-1:p;}
}
function giftFor(c){const l=byId.get(c.lair);return l?GIFT[l.kind]||GIFT.den:GIFT.den;}
function doGift(u,dt){
  const o=u.order,c=S.camps[o.camp],lair=c&&byId.get(c.lair);
  if(!alive(lair)||lair.team!==3){u.order=null;u.path=null;return;}
  const r=rectOf(lair),d=distRect(u.x,u.y,r);
  if(d>46){
    o.t=0;u.rp=(u.rp||0)-dt;
    if(d<70&&!u.path&&approach(u,r,30,dt))return;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=2.5;if(pathToRect(u,r)===0){u.order=null;return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.face=centerOf(lair).x>u.x?1:-1;u.anim='talk';
  o.t=(o.t||0)+dt;if(o.t<3.5)return;
  const G=giftFor(c),home=castleOf(u.team);
  u.order=home?{type:'move',x:home.x+(Math.random()-.5)*60,y:home.y+50}:null;
  if(c.hitBy===u.team&&S.t-(c.hitT||-999)<60){HOOK.diplo('angry',c,u);return;}
  if(!afford(u.team,G.cost)){HOOK.diplo('poor',c,u);return;}
  pay(u.team,G.cost);
  c.trust=(c.trust||0)+1;
  if(c.trust>=G.need)allyCamp(c,u.team,u);else HOOK.diplo('trust',c,u);
}
function allyCamp(c,team,u){
  const i=S.camps.indexOf(c),lair=byId.get(c.lair);if(!lair)return;
  lair.team=team;c.ally=team;c.t=0;c.tribT=0;
  for(const e of S.ents)if(!e.dead&&e.team===3&&e.camp===i){e.team=team;e.ally=true;e.order=null;e.path=null;}
  if(lair.drop&&S.got){const k=lair.drop;lair.drop=null;S.got['_'+k]=(S.got['_'+k]||0)+1;giveItem(k,centerOf(lair));}
  if(S.teams[team])S.teams[team].stats.allies=(S.teams[team].stats.allies||0)+1;
  HOOK.diplo('ally',c,u);
}
function setupCamps(pc,rng,road,goldOK){
  S.camps=[];
  const near=['bandit','bandit','banditA'];
  const mid=['bandit','bandit','bandit','banditA','banditA','shaman'];
  const big=['chief','bandit','bandit','bandit','banditA','banditA','shaman'];
  const treasure=(sp,D)=>{ // a gold mine next to the camp, mirrored when needed
    for(const s of sp){
      for(let k=0;k<40;k++){
        const a=rng()*Math.PI*2,r=2.5+rng()*2;
        const tx=Math.round(s.tx+D.w/2+Math.cos(a)*r-1),ty=Math.round(s.ty+D.h/2+Math.sin(a)*r-1);
        if(goldOK(tx,ty)&&reachRect(tx,ty,2,2)){spawnFixed('gold',0,tx,ty);break;}
      }
    }
  };
  let sp=campSpot('den',pc.x+15,pc.y-12,true,road);for(const s of sp)makeCamp('den',s,near);treasure(sp,DEF.den);
  sp=campSpot('den',pc.x+13,pc.y+13,true,road);for(const s of sp)makeCamp('den',s,near);
  sp=campSpot('lair',MW/2-14,10,true,road);for(const s of sp)makeCamp('lair',s,mid);treasure(sp,DEF.lair);
  sp=campSpot('lair',MW/2-14,MH-11,true,road);for(const s of sp)makeCamp('lair',s,mid);treasure(sp,DEF.lair);
  sp=campSpot('hideout',MW/2,MH/2-11,false,road);for(const s of sp)makeCamp('hideout',s,big);
  if(sp.length){const s=sp[0];for(const dx of[-5,4]){for(let k=0;k<30;k++){const tx=s.tx+dx+Math.round((rng()-.5)*2),ty=s.ty+Math.round((rng()-.5)*4);if(goldOK(tx,ty)&&reachRect(tx,ty,2,2)){spawnFixed('gold',0,tx,ty);break;}}}}
}
function wildTarget(){
  const pool=S.ents.filter(e=>!e.dead&&(e.team===1||e.team===2)&&(DEF[e.kind].building||e.kind==='pawn'));
  if(!pool.length)return null;
  const t=pool[Math.floor(Math.random()*pool.length)];
  return centerOf(t);
}
function updWild(dt){
  S.wildT=(S.wildT||0)-dt;
  if(S.wildT>0)return;
  S.wildT=1;
  wildEconomy();
  let wild=0;for(const e of S.ents)if(!e.dead&&e.team===3&&DEF[e.kind].unit)wild++;
  // camps refill their guards while the lair stands
  for(let i=0;i<S.camps.length;i++){
    const c=S.camps[i],lair=byId.get(c.lair);
    if(alive(lair)&&c.ally&&lair.team===c.ally){
      const have=S.ents.filter(e=>!e.dead&&e.team===c.ally&&e.camp===i).length;
      if(have<c.kinds.length){c.t+=1;if(c.t>=60){c.t=0;spawnGuard(c,c.kinds[have%c.kinds.length],have,c.ally);}}else c.t=0;
      c.tribT=(c.tribT||0)+1;
      if(c.tribT>=60){c.tribT=0;const T=S.teams[c.ally];for(const k in TRIBUTE){T.res[k]+=TRIBUTE[k];T.stats[k]+=TRIBUTE[k];}
        if(c.ally===1)FX.floats.push({x:lair.x,y:lair.y-60,txt:`Tributo +${TRIBUTE.gold} ouro +${TRIBUTE.food} comida`,col:'#ffe066',t:0});}
      continue;
    }
    if(!alive(lair)||lair.team!==3)continue;
    const have=S.ents.filter(e=>!e.dead&&e.team===3&&e.camp===i);
    if(have.length>=c.kinds.length){c.t=0;continue;}
    c.t+=1;
    if(c.t>=45&&wild<60){
      c.t=0;
      const cnt={};for(const e of have)cnt[e.kind]=(cnt[e.kind]||0)+1;
      const need={};for(const k of c.kinds)need[k]=(need[k]||0)+1;
      const k=c.kinds.find(k=>(cnt[k]||0)<need[k]);
      if(k){spawnGuard(c,k,have.length);wild++;}
    }
  }
  // roaming bands of raiders appear at the edge of the island (quick battle only; the other modes send waves)
  if(!S.cfg||!S.cfg.bands)return;
  S.bandT=(S.bandT??S.diff.peace*.85)-1;
  if(S.bandT>0||wild>=60)return;
  S.bandT={normal:170,dificil:120,insano:85}[S.diff.key]||120;
  const size=Math.min(9,3+Math.floor(S.t/300));
  const c1=castleOf(1),c2=castleOf(2);
  let spot=null;
  for(let k=0;k<200&&!spot;k++){
    const x=3+Math.floor(Math.random()*(MW-6)),y=Math.random()<.5?3+Math.floor(Math.random()*8):MH-4-Math.floor(Math.random()*8);
    if(!reachT(x,y)||!walkXY(x,y))continue;
    const px=x*TS+16,py=y*TS+16;
    if(c1&&hyp(px-c1.x,py-c1.y)<22*TS)continue;
    if(c2&&hyp(px-c2.x,py-c2.y)<22*TS)continue;
    spot={x:px,y:py};
  }
  if(!spot)return;
  const tgt=wildTarget();
  const band=[];
  for(let i=0;i<size;i++){
    const r=Math.random(),k=S.t>600&&r<.25?'raiderL':r<.6?'raider':'raiderA';
    const u=spawnUnit(k,3,spot.x+(Math.random()-.5)*50,spot.y+(Math.random()-.5)*40,{roam:true});
    if(tgt)u.order={type:'move',x:tgt.x+(Math.random()-.5)*40,y:tgt.y+(Math.random()-.5)*40,amove:true,raid:true};
    band.push(u);
  }
  S.bands=(S.bands||0)+1;
  HOOK.wild(spot.x,spot.y,band.length);
}

// about two maps in three have hills; the rest are flat
const reliefFor=seed=>{const h=hash((seed>>>0)*31+7);return h<.2?'plano':h<.58?'colinas':'montanhas';};
function newTeam(start){return {res:{wood:200+start,gold:100+start,food:200+start},era:1,research:null,stats:{kills:0,lost:0,conv:0,wood:0,gold:0,food:0}};}
// opts: {mode:'skirmish'|'campaign'|'survival', chapter, hero:{kind,kills,rank}}
function newGame(seed,diffKey,opts){
  opts=opts||{};
  const diff=DIFF[diffKey]||DIFF.dificil;
  const mode=opts.mode||'skirmish';
  S={seed:seed>>>0,relief:opts.relief||reliefFor(seed),t:0,diff,mode,chapter:opts.chapter||0,teams:{1:newTeam(0),2:newTeam(diff.start),3:newTeam(0)},ents:[],nextId:1,proj:[],over:null,sheepT:30,decor:[],ai:null,camps:[],bands:0,
    items:{},bonus:{},flags:{},destroyed:{},pickups:[]};
  S.cfg=modeConfig(mode,S.chapter);
  {const sz=opts.size||mapSizeFor(mode);setMapSize(sz[0],sz[1]);S.mw=MW;S.mh=MH;}
  if(opts.oldWild){S.cfg.towns=false;S.cfg.camps=true;}
  if(opts.fog)S.cfg=Object.assign({},S.cfg,{fog:true});
  const castles=setupWorld();
  if(S.cfg.redAI)aiInit();
  afterLoad();
  modeInit(opts);
  makeEngineer();
  return castles[1];
}
function afterLoad(){
  // games saved by older versions have no mode
  if(!S.mode){S.mode='skirmish';S.cfg=modeConfig('skirmish');}
  if(!S.cfg)S.cfg=modeConfig(S.mode,S.chapter);
  setMapSize(S.mw||96,S.mh||64);
  for(const k of['items','got','killed','goalsDone'])if(!S[k])S[k]={};
  if(!S.waveList)S.waveList=[];
  occ=new Int32Array(N);blk=new Uint8Array(N);wallT=new Int8Array(N);gateM=new Uint8Array(N);byId.clear();treeShake.clear();
  linkElev();
  for(const e of S.ents){byId.set(e.id,e);if(!e.dead&&isFixed(e))occupy(e,true);}
  recomputeBridges();
  for(const k in FX)FX[k].length=0;
  if(!S.decor)S.decor=[];
  computeReach();
  HOOK.loaded();
}

// ================================================================ reachable land (ignores buildings; trees and water block)
function computeReach(){
  reach.fill(0);reachDirty=false;
  const st=[];
  for(const e of S.ents){if(e.dead||e.kind!=='castle')continue;for(let y=e.ty-1;y<=e.ty+DEF.castle.h;y++)for(let x=e.tx-1;x<=e.tx+DEF.castle.w;x++){if(!inB(x,y))continue;const i=idx(x,y),t=S.tiles[i];if(t!==WATER&&t!==TREE&&!cliff[i]&&!reach[i]&&elev[i]===elev[idx(e.tx,e.ty)]){reach[i]=1;st.push(i);}}}
  while(st.length){const c=st.pop(),cx=c%MW,cy=(c/MW)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=cx+dx,ny=cy+dy;if(!inB(nx,ny))continue;const ni=idx(nx,ny);if(!reach[ni]&&groundOK(ni)&&canStep(c,ni)){reach[ni]=1;st.push(ni);}}}
}
const reachT=(x,y)=>inB(x,y)&&reach[idx(x,y)]===1;
const reachPt=(x,y)=>reachT(tileOf(x),tileOf(y));
function reachRect(tx,ty,w,h){for(let y=ty-1;y<=ty+h;y++)for(let x=tx-1;x<=tx+w;x++)if(reachT(x,y))return true;return false;}
function badTarget(u,key){return u.bad&&u.bad[key]&&u.bad[key]>S.t;}
function markBad(u,key){u.bad=u.bad||{};u.bad[key]=S.t+25;}

// ================================================================ spatial grid
const GC=64;let GW=Math.ceil(MW*TS/GC),GH=Math.ceil(MH*TS/GC);
const grid=Array.from({length:GW*GH},()=>[]);
let BLDS=[];
function buildGrid(){
  for(const c of grid)c.length=0;
  BLDS=[];
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(D.building){BLDS.push(e);continue;}
    if(!(D.unit||D.critter))continue;
    grid[clamp(Math.floor(e.y/GC),0,GH-1)*GW+clamp(Math.floor(e.x/GC),0,GW-1)].push(e);
  }
}
function forNear(x,y,r,fn){
  const x0=clamp(Math.floor((x-r)/GC),0,GW-1),x1=clamp(Math.floor((x+r)/GC),0,GW-1);
  const y0=clamp(Math.floor((y-r)/GC),0,GH-1),y1=clamp(Math.floor((y+r)/GC),0,GH-1);
  for(let cy=y0;cy<=y1;cy++)for(let cx=x0;cx<=x1;cx++){
    const c=grid[cy*GW+cx];
    for(let k=0;k<c.length;k++){const e=c[k];if(Math.abs(e.x-x)<=r&&Math.abs(e.y-y)<=r)fn(e);}
  }
}

// ================================================================ pathfinding: A* on tiles, 8 directions, no corner cutting, per-tick budget
const DIRS=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.414],[1,-1,1.414],[-1,1,1.414],[-1,-1,1.414]];
const PF={g:new Float32Array(N),came:new Int32Array(N),stamp:new Uint32Array(N),closed:new Uint32Array(N),gen:0,hv:[],hp:[]};
let pathBudget=1e9;
// a new map size: every per-tile array is made again
function setMapSize(w,h){
  MW=w;MH=h;N=w*h;
  occ=new Int32Array(N);blk=new Uint8Array(N);reach=new Uint8Array(N);wallT=new Int8Array(N);gateM=new Uint8Array(N);
  elev=new Uint8Array(N);ramp=new Uint8Array(N);cliff=new Uint8Array(N);bridgeA=new Uint8Array(N);
  PF.g=new Float32Array(N);PF.came=new Int32Array(N);PF.stamp=new Uint32Array(N);PF.closed=new Uint32Array(N);PF.gen=0;
  GW=Math.ceil(MW*TS/GC);GH=Math.ceil(MH*TS/GC);grid.length=0;for(let i=0;i<GW*GH;i++)grid.push([]);
  reachDirty=true;
}
// generate with another size without touching the arrays of the game being played (map previews)
function withMapSize(w,h,fn){const o=[MW,MH,N];MW=w;MH=h;N=w*h;try{return fn();}finally{MW=o[0];MH=o[1];N=o[2];}}
function findPath(sx,sy,goals,hx,hy){
  sx=clamp(sx,0,MW-1);sy=clamp(sy,0,MH-1);
  const start=idx(sx,sy);
  if(goals.has(start))return [];
  if(!goals.size)return null;
  if(pathBudget<=0)return undefined;
  const gen=++PF.gen,G=PF.g,came=PF.came,st=PF.stamp,cl=PF.closed,hv=PF.hv,hp=PF.hp;
  hv.length=0;hp.length=0;
  const H=i=>{const dx=Math.abs(i%MW-hx),dy=Math.abs(((i/MW)|0)-hy);return Math.max(dx,dy)+.414*Math.min(dx,dy);};
  const push=(v,p)=>{hv.push(v);hp.push(p);let i=hv.length-1;while(i>0){const q=(i-1)>>1;if(hp[q]<=hp[i])break;let t=hv[q];hv[q]=hv[i];hv[i]=t;t=hp[q];hp[q]=hp[i];hp[i]=t;i=q;}};
  const pop=()=>{const v=hv[0],lv=hv.pop(),lp=hp.pop();if(hv.length){hv[0]=lv;hp[0]=lp;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<hv.length&&hp[l]<hp[m])m=l;if(r<hv.length&&hp[r]<hp[m])m=r;if(m===i)break;let t=hv[m];hv[m]=hv[i];hv[i]=t;t=hp[m];hp[m]=hp[i];hp[i]=t;i=m;}}return v;};
  st[start]=gen;G[start]=0;came[start]=-1;push(start,H(start));
  let best=start,bestH=H(start),it=0,found=-1;
  while(hv.length&&it<(N>8000?11000:8000)){
    const cur=pop();if(cl[cur]===gen)continue;cl[cur]=gen;it++;
    if(goals.has(cur)){found=cur;break;}
    const hc=H(cur);if(hc<bestH){bestH=hc;best=cur;}
    const cx=cur%MW,cy=(cur/MW)|0,gc=G[cur];
    for(const[dx,dy,c]of DIRS){
      const nx=cx+dx,ny=cy+dy;if(!inB(nx,ny))continue;
      const ni=idx(nx,ny);if(cl[ni]===gen)continue;
      let extra=0;
      if(!walk(ni)){if(!breachable(ni)||dx&&dy)continue;extra=14;}
      if(!canStep(cur,ni))continue;
      if(dx&&dy){const o1=idx(nx,cy),o2=idx(cx,ny);if(!walk(o1)||!walk(o2)||elev[o1]!==elev[cur]||elev[o2]!==elev[cur])continue;}
      const ng=gc+c+extra;
      if(st[ni]!==gen||ng<G[ni]){st[ni]=gen;G[ni]=ng;came[ni]=cur;push(ni,ng+H(ni));}
    }
  }
  pathBudget-=it+20;
  const end=found>=0?found:best;
  if(end===start)return null;
  const p=[];let c=end;while(c!==start&&c>=0){p.push(c);c=came[c];}
  return p.reverse();
}
function setPath(u,list,dest){
  const pts=list.map(i=>({x:(i%MW)*TS+16,y:((i/MW)|0)*TS+16}));
  if(dest){if(pts.length)pts[pts.length-1]=dest;else pts.push(dest);}
  u.path=pts;
}
function nearestWalk(tx,ty){
  if(walkXY(tx,ty))return [tx,ty];
  for(let r=1;r<9;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;if(walkXY(tx+dx,ty+dy))return [tx+dx,ty+dy];}
  return null;
}
// 1 = path set, 0 = unreachable, -1 = try again next tick
function pathTeam(u){PT=u.team||0;const D=DEF[u.kind];PNAV=!!D.naval;PBREACH=(u.team===2||u.team===3)&&!!D.mil;}
function pathToPoint(u,x,y,exact){
  pathTeam(u);
  const tx=clamp(tileOf(x),0,MW-1),ty=clamp(tileOf(y),0,MH-1);
  const w=nearestWalk(tx,ty);if(!w){PNAV=false;return 0;}
  const p=findPath(tileOf(u.x),tileOf(u.y),new Set([idx(w[0],w[1])]),w[0],w[1]);
  PBREACH=false;PNAV=false;
  if(p===undefined)return -1;
  if(p===null){if(hyp(u.x-x,u.y-y)<40){u.path=[{x,y}];return 1;}return 0;}
  setPath(u,p,exact&&w[0]===tx&&w[1]===ty?{x,y}:null);
  return 1;
}
function pathToRect(u,r){
  pathTeam(u);
  const x0=tileOf(r[0]),y0=tileOf(r[1]),x1=Math.ceil((r[0]+r[2])/TS)-1,y1=Math.ceil((r[1]+r[3])/TS)-1;
  const goals=new Set();
  for(let y=y0-1;y<=y1+1;y++)for(let x=x0-1;x<=x1+1;x++){if(x>=x0&&x<=x1&&y>=y0&&y<=y1&&!walkXY(x,y))continue;if(walkXY(x,y))goals.add(idx(x,y));}
  const p=findPath(tileOf(u.x),tileOf(u.y),goals,(x0+x1)/2,(y0+y1)/2);
  PBREACH=false;PNAV=false;
  if(p===undefined)return -1;
  if(p===null)return 0;
  setPath(u,p,null);return 1;
}

// ================================================================ movement: right-hand avoidance, mass-based separation, anti-stuck
function speedOf(u){const D=DEF[u.kind];return D.speed*(u.sq?sqSpeed(u):1)*(u.slowT>0?.5:1)*(D.cart&&techHas(u.team,'rodas')?1.25:1)*(D.mil&&!D.mech&&techHas(u.team,'botas')?1.08:1);}
function avoid(u,nx,ny){
  let sx=0,sy=0;const ru=DEF[u.kind].r;
  forNear(u.x,u.y,30,o=>{
    if(o===u||o.dead)return;
    const dx=o.x-u.x,dy=o.y-u.y,ahead=dx*nx+dy*ny;
    if(ahead<=0||ahead>30)return;
    const lat=-dx*ny+dy*nx,rr=ru+DEF[o.kind].r;
    if(Math.abs(lat)>rr)return;
    const w=(1-ahead/30)*(o.moving?.7:1.2);
    const side=lat<-2?-1:1; // obstacle on my left or straight ahead -> go right; on my right -> go left
    sx+=ny*side*w;sy+=-nx*side*w;
  });
  return [sx,sy];
}
function tryMove(u,mx,my){
  PT=u.team||0;PNAV=!!DEF[u.kind].naval;
  if(!walkPt(mx,my)){PNAV=false;return false;}
  if(PNAV){PNAV=false;u.x=mx;u.y=my;return true;}
  const a=tileIdx(u.x,u.y),b=tileIdx(mx,my);
  if(a!==b&&!canStep(a,b)){
    // a diagonal step across a corner: allow only when one of the two orthogonal routes works
    const ax=a%MW,ay=(a/MW)|0,bx=b%MW,by=(b/MW)|0;
    if(ax===bx||ay===by)return false;
    const c1=idx(bx,ay),c2=idx(ax,by);
    if(!((walk(c1)&&canStep(a,c1)&&canStep(c1,b))||(walk(c2)&&canStep(a,c2)&&canStep(c2,b))))return false;
  }
  u.x=mx;u.y=my;return true;
}
// boats: who is aboard rides along and leaves the map until unloaded
function followPath(u,dt){
  u.moving=false;
  if(u.detour){
    const d=u.detour;d.t-=dt;
    const dx=d.x-u.x,dy=d.y-u.y,dd=hyp(dx,dy),step=speedOf(u)*dt;
    if(dd<3||d.t<=0){u.detour=null;u.path=null;u.stuck=0;return false;}
    const mx=u.x+dx/dd*Math.min(step,dd),my=u.y+dy/dd*Math.min(step,dd);
    if(!tryMove(u,mx,my)){u.detour=null;u.path=null;return false;}
    u.moving=true;if(Math.abs(dx)>.5)u.face=dx>0?1:-1;
    return false;
  }
  if(!u.path)return true;
  let step=speedOf(u)*dt,guard=4;
  while(step>.01&&guard-->0){
    if(!u.path.length){u.path=null;return true;}
    const t=u.path[0],dx=t.x-u.x,dy=t.y-u.y,d=hyp(dx,dy);
    if(d<48){const ti=idx(clamp(tileOf(t.x),0,MW-1),clamp(tileOf(t.y),0,MH-1));if(blk[ti]&&wallT[ti]&&wallT[ti]!==u.team&&!(gateM[ti]&&wallT[ti]===u.team)){u.breach=occ[ti];u.path=null;return true;}}
    if(d<=Math.max(step,2)){u.x=t.x;u.y=t.y;step-=d;u.path.shift();u.moving=true;continue;}
    let nx=dx/d,ny=dy/d;
    const av=avoid(u,nx,ny);
    let sx=nx+av[0]*.9,sy=ny+av[1]*.9;const n=hyp(sx,sy)||1;sx/=n;sy/=n;
    if(!tryMove(u,u.x+sx*step,u.y+sy*step)&&!tryMove(u,u.x+nx*step,u.y+ny*step)&&!tryMove(u,u.x+nx*step,u.y)&&!tryMove(u,u.x,u.y+ny*step)){}
    if(Math.abs(sx)>.25)u.face=sx>0?1:-1;
    u.moving=true;step=0;
  }
  if(u.path&&!u.path.length){u.path=null;return true;}
  return false;
}
// last few pixels toward a footprint; false when the straight line is blocked (caller paths instead)
function approach(u,r,dist,dt){
  const px=clamp(u.x,r[0],r[0]+r[2]),py=clamp(u.y,r[1],r[1]+r[3]);
  const dx=u.x-px,dy=u.y-py,d=hyp(dx,dy)||1;
  const tx=px+dx/d*dist,ty=py+dy/d*dist;
  if(!walkPt(tx,ty)||!walkPt((u.x+tx)/2,(u.y+ty)/2))return false;
  u.path=[{x:tx,y:ty}];followPath(u,dt);
  return true;
}
function mass(e){
  if(DEF[e.kind].critter)return e.held?4:1;
  if(e.anim||e.atkT>0)return 5;
  if(e.moving)return 2;
  return 1;
}
function separate(){
  for(const a of S.ents){
    if(a.dead)continue;const DA=DEF[a.kind];if(!(DA.unit||DA.critter))continue;
    forNear(a.x,a.y,26,b=>{
      if(b.id<=a.id||b.dead)return;
      const dx=b.x-a.x,dy=b.y-a.y,min=(DA.r+DEF[b.kind].r)*.85;
      let d=hyp(dx,dy);if(d>=min)return;
      let nx,ny;if(d<.01){const ang=(a.id*7+b.id)%6;nx=Math.cos(ang);ny=Math.sin(ang);d=0;}else{nx=dx/d;ny=dy/d;}
      let k=.3;
      if(a.team&&a.team===b.team&&a.kind==='pawn'&&b.kind==='pawn'&&a.moving&&b.moving)k=.12; // workers slide past each other
      const ma=mass(a),mb=mass(b),push=(min-d)*k;
      const pa=push*mb/(ma+mb)*2,pb=push*ma/(ma+mb)*2;
      tryMove(a,a.x-nx*pa,a.y-ny*pa);tryMove(b,b.x+nx*pb,b.y+ny*pb);
    });
  }
}
function wantsToMove(u){return !!(u.path&&u.path.length)||!!u.detour;}
function antiStuck(u,dt){
  u.chk=(u.chk||0)+dt;
  if(u.chk<.5)return;
  u.chk=0;
  const moved=hyp(u.x-(u.lx??u.x),u.y-(u.ly??u.y));u.lx=u.x;u.ly=u.y;
  if(wantsToMove(u)&&moved<7)u.stuckT=(u.stuckT||0)+.5;
  else u.stuckT=Math.max(0,(u.stuckT||0)-1);
  if(u.stuckT>=2){u.stuckT=0;resolveCrowd(u);}
}
// two (or more) units jammed for 2s: each one picks a different side and walks around
function resolveCrowd(u){
  let o=null,bd=24;
  forNear(u.x,u.y,24,e=>{if(e===u||e.dead||!DEF[e.kind].unit&&!DEF[e.kind].critter)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<bd){bd=d;o=e;}});
  let dx=1,dy=0;
  const tgt=u.path&&u.path[0];
  if(tgt){const d=hyp(tgt.x-u.x,tgt.y-u.y)||1;dx=(tgt.x-u.x)/d;dy=(tgt.y-u.y)/d;}
  else if(o){const d=hyp(o.x-u.x,o.y-u.y)||1;dx=(o.x-u.x)/d;dy=(o.y-u.y)/d;}
  const pick=(unit,side)=>{
    for(const dist of[30,22,40]){
      for(const s of[side,-side]){
        const x=unit.x+dy*s*dist-dx*8,y=unit.y-dx*s*dist-dy*8;
        if(walkPt(x,y)){unit.detour={x,y,t:1.3};unit.stuck=0;return true;}
      }
    }
    return false;
  };
  if(o){
    const side=u.id<o.id?1:-1;
    pick(u,side);
    if(DEF[o.kind].unit&&o.team===u.team&&!o.detour&&(o.order||o.path))pick(o,-side);
  }else{u.path=null;u.stuck=0;}
}

// ================================================================ queries
function popUsed(t){let n=0;for(const e of S.ents){if(e.dead||e.team!==t)continue;if(e.cargo)n+=e.cargo.length;if(DEF[e.kind].unit&&!DEF[e.kind].king&&!DEF[e.kind].boss&&!DEF[e.kind].noPop&&!e.hero&&!e.ally&&!e.ctr)n++;if(e.queue)n+=e.queue.length;}return n;}
function popCap(t){let n=0;for(const e of S.ents)if(!e.dead&&e.team===t&&e.built&&DEF[e.kind].pop)n+=e.kind==='house'?housePop(e):DEF[e.kind].pop;return Math.min(100,n);}
function afford(t,c){if(!c)return true;const r=S.teams[t].res;for(const k in c)if(r[k]<c[k])return false;return true;}
function pay(t,c){const r=S.teams[t].res;for(const k in c)r[k]-=c[k];}
function refund(t,c){const r=S.teams[t].res;for(const k in c)r[k]+=c[k];}
function castleOf(t){return S.ents.find(e=>!e.dead&&e.kind==='castle'&&e.team===t);}
function hasBuilt(t,k,n){let c=0;for(const e of S.ents)if(!e.dead&&e.team===t&&e.kind===k&&e.built)c++;return c>=(n||1);}
function eraReqMet(t,era){const E=ERAS[era];if(!E)return false;const need={};for(const k of E.req)need[k]=(need[k]||0)+1;for(const k in need)if(!hasBuilt(t,k,need[k]))return false;return true;}
function pickTarget(u,range,opts){
  let best=null,bs=1e9;const D=DEF[u.kind]||{},raid=opts&&opts.raid;
  if(D.siege&&opts&&opts.unitsOnly)return null;
  // town folk only fight bandits (or whoever they were sent against); bandits on a raid may go for a town
  const neu=u.team===0,foes=neu?neuFoes(u):null,focus=u.sq?sqFocus(u):0;
  if(!D.siege)forNear(u.x,u.y,range,e=>{
    if(e.dead||e.team===u.team||!DEF[e.kind].unit)return;
    if(neu){if(!foes.includes(e.team))return;}
    else if(!e.team&&!(u.vsTown!=null&&DEF[e.kind].neutral&&e.town===u.vsTown)&&!(e.aid&&S.t<e.aid.until&&e.aid.foes.includes(u.team))&&!(e.town!=null&&townFoe(e.town,u.team))&&!(u.team===3&&DEF[e.kind].cart))return;
    if(u.team===3&&DEF[e.kind].envoy)return;
    if(DEF[e.kind].naval&&!D.ranged&&!D.naval)return;
    const d=hyp(e.x-u.x,e.y-u.y);if(d>range)return;
    let s=d-(1-e.hp/e.maxhp)*(D.ranged?70:35);
    if(bonus(u.kind,e.kind)>1)s-=45;
    if(e.kind==='monk')s-=60;
    if(e.kind==='pawn')s+=raid?-50:70;
    if(e.order&&e.order.type==='attack'){const tt=byId.get(e.order.id);if(tt&&tt.team===u.team)s-=35;}
    if(focus&&e.id===focus)s-=70;
    if(s<bs){bs=s;best=e;}
  });
  if(best||(opts&&opts.unitsOnly))return best;
  if(neu)return null;
  for(const b of BLDS){
    if(b.dead||b.team===u.team)continue;
    if(!b.team&&!(u.vsTown!=null&&DEF[b.kind].townb&&b.town===u.vsTown)&&!(DEF[b.kind].townb&&b.town!=null&&townFoe(b.town,u.team)))continue;
    let d=distRect(u.x,u.y,rectOf(b));if(d>range)continue;
    if(DEF[b.kind].dmg)d-=30;
    if(b.kind==='farm')d+=20;
    if(DEF[b.kind].wall)d+=35;
    if(d<bs){bs=d;best=b;}
  }
  return best;
}
function threatNear(x,y,team,r){
  let best=null,bd=r;
  forNear(x,y,r,e=>{if(e.dead||!e.team||e.team===team||!DEF[e.kind].mil)return;const d=hyp(e.x-x,e.y-y);if(d<bd){bd=d;best=e;}});
  return best;
}
function nearestDrop(u,x,y){
  x=x??u.x;y=y??u.y;let best=null,bd=1e9;
  for(const e of BLDS){if(e.dead||e.team!==u.team||!e.built||!DEF[e.kind].drop)continue;const d=distRect(x,y,rectOf(e));if(d<bd){bd=d;best=e;}}
  return best;
}
function claims(team,res){
  const m=new Map();
  for(const e of S.ents){
    if(e.dead||e.team!==team||e.kind!=='pawn'||!e.order||e.order.type!=='gather'||e.order.res!==res)continue;
    const k=res==='wood'?idx(e.order.tx,e.order.ty):e.order.id;m.set(k,(m.get(k)||0)+1);
  }
  return m;
}
function findTree(u,x,y,maxT){
  const cx=tileOf(x),cy=tileOf(y),cl=claims(u.team,'wood');let best=null,bd=1e9;
  for(let dy=-maxT;dy<=maxT;dy++)for(let dx=-maxT;dx<=maxT;dx++){
    const tx=cx+dx,ty=cy+dy;if(!inB(tx,ty))continue;const i=idx(tx,ty);
    if(S.tiles[i]!==TREE||S.wood[i]<=0)continue;
    let open=false;for(const[ax,ay]of[[1,0],[-1,0],[0,1],[0,-1]])if(walkXY(tx+ax,ty+ay)&&reachT(tx+ax,ty+ay))open=true;if(!open||badTarget(u,'t'+i))continue;
    let d=hyp(dx,dy);const c=cl.get(i)||0;if(u.order&&u.order.tx===tx&&u.order.ty===ty)d-=1;else d+=c*2.5;
    const th=threatNear(tx*TS+16,ty*TS+16,u.team,120);if(th)d+=12;
    if(d<bd){bd=d;best={tx,ty};}
  }
  return best;
}
function findGold(u,x,y,maxPx){
  const cl=claims(u.team,'gold');let best=null,bd=maxPx;
  for(const e of S.ents){
    if(e.dead||e.kind!=='gold'||badTarget(u,e.id)||!reachRect(e.tx,e.ty,2,2))continue;
    const c=cl.get(e.id)||0;let d=hyp(e.x-x,e.y-y)+(c>=5?400:c*40);
    if(threatNear(e.x,e.y-20,u.team,140))d+=500;
    if(d<bd){bd=d;best=e;}
  }
  return best;
}
function findFood(u,x,y,maxPx){
  let best=null,bd=maxPx;const cl=claims(u.team,'food');
  for(const e of S.ents){
    if(e.dead)continue;
    if(badTarget(u,e.id))continue;
    if(DEF[e.kind].critter){
      if(!reachPt(e.x,e.y))continue;
      const c=u.order&&u.order.id===e.id?0:(cl.get(e.id)||0);if(c>=3)continue;
      const d=hyp(e.x-x,e.y-y)+c*45;if(d<bd&&!threatNear(e.x,e.y,u.team,120)){bd=d;best=e;}}
    else if(e.kind==='farm'&&e.team===u.team&&e.built&&(!e.worker||e.worker===u.id)){const d=hyp(e.x-x,e.y-y)*1.25+30;if(d<bd){bd=d;best=e;}}
  }
  return best;
}
function findResource(u,res,x,y,far){
  if(res==='wood'){const r=findTree(u,x,y,far?18:11);return r?{tx:r.tx,ty:r.ty}:null;}
  const e=res==='gold'?findGold(u,x,y,far?2200:700):findFood(u,x,y,far?900:520);
  return e?{id:e.id}:null;
}
function freeSpotNear(b){
  const D=DEF[b.kind],cx=b.tx+Math.floor(D.w/2),y0=b.ty+D.h;
  for(let r=0;r<6;r++){
    for(let dy=0;dy<=r;dy++)for(let dx=-r-1;dx<=r+1;dx++){
      const x=cx+dx,y=y0+dy;
      if(walkXY(x,y)){let crowd=0;forNear(x*TS+16,y*TS+16,16,e=>{if(DEF[e.kind].unit)crowd++;});if(crowd<2)return {x:x*TS+16,y:y*TS+18};}
    }
  }
  const w=nearestWalk(cx,y0)||[cx,y0];return {x:w[0]*TS+16,y:w[1]*TS+18};
}

// ================================================================ simulation
function update(dt){
  S.t+=dt;PNAV=false;
  pathBudget=N>8000?22000:15000;
  if(reachDirty)computeReach();
  buildGrid();
  for(const t of[1,2]){
    const T=S.teams[t];
    if(T.research){
      const c=castleOf(t);
      if(c){T.research.t+=dt;if(T.research.t>=ERAS[T.research.era].time)advanceEra(t);}
    }
  }
  S.sheepT-=dt;if(S.sheepT<=0){S.sheepT=24;respawnSheep();}
  for(const e of S.ents){
    if(e.dead)continue;
    const D=DEF[e.kind];
    if(D.unit)updUnit(e,dt);
    else if(D.critter)updSheep(e,dt);
    else if(D.building)updBuilding(e,dt);
  }
  separate();
  updProj(dt);
  updSpells(dt);
  if(S.ents.some(e=>e.dead||e.aboard)){
    for(const e of S.ents)if(e.dead||e.aboard)byId.delete(e.id);
    S.ents=S.ents.filter(e=>!e.dead&&!e.aboard);
  }
  updWild(dt);
  tradeTick(dt);
  townsTick(dt);
  diploTick(dt);
  armyTick(dt);
  scoutTick(dt);
  econTick(dt);
  S.mkt1=(S.mkt1||0)+dt;if(S.mkt1>=1){S.mkt1=0;updMarket();}
  engineerBrain(dt);
  villageMind(dt);
  if(!S.over&&S.ai)aiUpdate(dt);
  if(!S.over)warUpdate(dt);
  if(!S.over)modeUpdate(dt);
}

function advanceEra(t){
  const T=S.teams[t],old={};
  for(const e of S.ents)if(!e.dead&&e.team===t){if(DEF[e.kind].mil)old[e.id]=hpMult(t,e.kind);else if(DEF[e.kind].building)old[e.id]=bldMult(t);}
  T.era=T.research.era;T.research=null;
  for(const e of S.ents){
    if(e.dead||e.team!==t||old[e.id]==null)continue;
    const nm=DEF[e.kind].mil?hpMult(t,e.kind):bldMult(t),f=nm/old[e.id];
    e.maxhp=Math.round(e.maxhp*f);e.hp=Math.min(e.maxhp,e.hp*f);
  }
  HOOK.era(t,T.era);
}
function startResearch(t){
  const T=S.teams[t],next=T.era+1,E=ERAS[next];
  if(!E||T.research)return 'busy';
  if(!eraReqMet(t,next))return 'req';
  if(!afford(t,E.cost))return 'cost';
  pay(t,E.cost);T.research={era:next,t:0};
  return 'ok';
}
function cancelResearch(t){const T=S.teams[t];if(!T.research)return;refund(t,ERAS[T.research.era].cost);T.research=null;}

// ---------------------------------------------------------------- units
function updUnit(u,dt){
  const D=DEF[u.kind];
  u.cd=Math.max(0,u.cd-dt);
  if(u.atkT>0)u.atkT-=dt;
  if(u.hitT>0)u.hitT-=dt;
  if(u.slowT>0)u.slowT-=dt;
  if(D.holy){
    u.faith=Math.min(1,(u.faith??1)+dt/(eraOf(u.team)>=4?11:14));
    if(u.boltCd>0)u.boltCd-=dt;if(u.meteorCd>0)u.meteorCd-=dt;
  }
  if(D.aura){u.auraT=(u.auraT||0)-dt;if(u.auraT<=0){u.auraT=1;let n=0;forNear(u.x,u.y,85,e=>{if(e.dead||e.team!==u.team||!healable(e)||e.hp>=e.maxhp||hyp(e.x-u.x,e.y-u.y)>85)return;e.hp=Math.min(e.maxhp,e.hp+(eraOf(u.team)>=5?6:4));e.healT=.25;n++;});if(n)u.glowT=.6;}}
  if(u.glowT>0)u.glowT-=dt;
  u.anim=null;PT=u.team||0;PNAV=!!D.naval;
  if(D.naval){updBoat(u,dt);PNAV=false;return;}
  if(u.breach){const w=byId.get(u.breach);u.breach=0;if(alive(w)&&w.team!==u.team&&DEF[u.kind].mil){const bk=u.order&&u.order.type!=='attack'?u.order:(u.order&&u.order.type==='attack'?u.order:null);u.order={type:'attack',id:w.id,back:bk};u.path=null;}}
  if((D.regen||u.hero||D.thero||(u.rank||0)>=3||u.supT>S.t)&&u.hp<u.maxhp){
    const calm=S.t-(u.lastHit||-99)>4,rk=u.rank||0,rf=REGEN[rk]||1;
    if(calm)u.hp=Math.min(u.maxhp,u.hp+(D.regen||u.maxhp*(u.supT>S.t?.018:.012)*Math.max(1,rf))*dt);
    else if(rk>=6)u.hp=Math.min(u.maxhp,u.hp+u.maxhp*.012*rf*.4*dt);
  }
  if(D.feed){u.feedT=(u.feedT||0)-dt;if(u.feedT<=0){u.feedT=4;forNear(u.x,u.y,120,e=>{if(e.dead||e.team!==u.team||!DEF[e.kind].mil||!healable(e)||hyp(e.x-u.x,e.y-u.y)>120)return;e.supT=Math.max(e.supT||0,S.t+6);});}}
  if(D.summon)summonTick(u,D.summon,dt);
  if(u.stunT>0){u.stunT-=dt;u.moving=false;return;}
  if(!walkPt(u.x,u.y)){const w=nearestWalk(clamp(tileOf(u.x),0,MW-1),clamp(tileOf(u.y),0,MH-1));if(w){u.x=w[0]*TS+16;u.y=w[1]*TS+16;u.path=null;}}
  if(u.kind==='pawn'||u.kind==='engineer'||u.kind==='bpawn')pawnSafety(u,dt);
  if(D.king&&u.order&&u.order.auto&&u.hp<u.maxhp*.4&&u.team===1){u.order=null;u.scan=0;}
  const o=u.order;
  if(!o)idleBrain(u,dt);
  const o2=u.order;
  if(!o2){followPath(u,dt);}
  else if(o2.type==='move')doMove(u,dt);
  else if(o2.type==='attack')doAttack(u,dt);
  else if(o2.type==='gather')doGather(u,dt);
  else if(o2.type==='build')doBuild(u,dt);
  else if(o2.type==='convert')doConvert(u,dt);
  else if(o2.type==='heal')doHeal(u,dt);
  else if(o2.type==='cast')doCast(u,dt);
  else if(o2.type==='flee')doFlee(u,dt);
  else if(o2.type==='gift')doGift(u,dt);
  else if(o2.type==='rest')doRest(u,dt);
  else if(o2.type==='terra')doTerra(u,dt);
  else if(o2.type==='board')doBoard(u,dt);
  else if(o2.type==='convoy')doConvoy(u,dt);
  else if(o2.type==='escort')doEscort(u,dt);
  else if(o2.type==='twork')doTWork(u,dt);
  else if(o2.type==='tbuild')doTBuild(u,dt);
  else if(o2.type==='envoy')doEnvoy(u,dt);
  else if(o2.type==='haul')doHaul(u,dt);
  else if(o2.type==='sweep')doSweep(u,dt);
  else if(o2.type==='trade')doTrader(u,dt);
  lifeTick(u,dt);
  antiStuck(u,dt);
}
function finish(u){const o=u.order;u.order=o&&o.back&&validOrder(o.back)?o.back:null;u.path=null;}
function validOrder(o){
  if(!o)return false;
  if(o.type==='attack'||o.type==='convert'||o.type==='heal'||o.type==='build')return alive(byId.get(o.id));
  return true;
}

function idleBrain(u,dt){
  const D=DEF[u.kind];
  u.scan-=dt;if(u.scan>0)return;
  u.scan=.4;
  if(D.cart)return;
  if(D.neutral||u.team===0&&D.unit){
    if(u.leaving)return;
    if(u.guardOf){cartGuardBrain(u);return;}
    if(u.kind==='npawn'){if(u.master)masterBrain(u);else townPawnBrain(u);}else if(u.kind==='envoyN'){}else if(aidActive(u))aidBrain(u);else{u.aid=null;neutralBrain(u);}return;}
  if(u.kind==='diplomat')return;
  if(u.trader){traderIdle(u);return;}
  if(u.kind==='bpawn'){if(u.team===3)wildWorker(u);else autoJob(u);return;}
  if(u.medic){medicBrain(u);return;}
  if(D.king||u.guard||u.ally){guardBrain(u);return;}
  if(u.team===3){wildBrain(u);return;}
  if(D.holy){monkBrain(u,null);return;}
  if(D.mil){
    const e=pickTarget(u,D.sight);
    if(e)u.order={type:'attack',id:e.id,auto:true,ax:u.x,ay:u.y};
  }
}
// the king and the duke defend the ground around them and come back home
function guardBrain(u){
  const D=DEF[u.kind];
  if(!u.home)u.home={x:u.x,y:u.y};
  if(D.healer){
    let hurt=null,hd=170;
    forNear(u.x,u.y,170,e=>{if(e.dead||e===u||e.team!==u.team||!healable(e)||e.hp>=e.maxhp*.85)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<hd){hd=d;hurt=e;}});
    if(hurt){u.order={type:'heal',id:hurt.id,auto:true};return;}
    if(hyp(u.x-u.home.x,u.y-u.home.y)>60)u.order={type:'move',x:u.home.x,y:u.home.y};
    return;
  }
  // a hurt king hides behind his castle
  if(D.king&&u.hp<u.maxhp*.4){
    const th=threatNear(u.x,u.y,u.team,170),c=castleOf(u.team);
    if(th&&c){
      const r=rectOf(c),cx=r[0]+r[2]/2,cy=r[1]+r[3]/2,dx=cx-th.x,dy=cy-th.y,l=hyp(dx,dy)||1;
      for(const f of[1,1.3,.8]){const tx=cx+dx/l*(r[2]/2+44)*f,ty=cy+dy/l*(r[3]/2+40)*f;if(walkPt(tx,ty)&&hyp(tx-u.x,ty-u.y)>30){u.order={type:'move',x:tx,y:ty};return;}}
    }
    if(th)return;
  }
  const e=pickTarget(u,D.sight,{unitsOnly:true});
  if(e&&hyp(e.x-u.home.x,e.y-u.home.y)<D.sight+60){u.order={type:'attack',id:e.id,auto:true,ax:u.home.x,ay:u.home.y};return;}
  if(hyp(u.x-u.home.x,u.y-u.home.y)>50)u.order={type:'move',x:u.home.x,y:u.home.y};
}
function wildBrain(u){
  const D=DEF[u.kind];
  if(D.healer){
    let hurt=null,hd=170;
    forNear(u.x,u.y,170,e=>{if(e.dead||e===u||e.team!==3||!healable(e)||e.hp>=e.maxhp*.85)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<hd){hd=d;hurt=e;}});
    if(hurt){u.order={type:'heal',id:hurt.id,auto:true};return;}
  }else{
    const raiding=u.raiding&&S.t-u.raiding<60;
    const e=pickTarget(u,D.sight,{raid:!!u.roam||raiding});
    if(e){u.order={type:'attack',id:e.id,auto:true,ax:raiding||!u.home?u.x:u.home.x,ay:raiding||!u.home?u.y:u.home.y};return;}
  }
  if(u.home&&hyp(u.x-u.home.x,u.y-u.home.y)>70){u.order={type:'move',x:u.home.x,y:u.home.y};return;}
  if(u.home)u.raiding=0;
  if(u.roam){const t=wildTarget();if(t)u.order={type:'move',x:t.x+(Math.random()-.5)*60,y:t.y+(Math.random()-.5)*60,amove:true,raid:true};}
}
function doMove(u,dt){
  const o=u.order,D=DEF[u.kind];
  if(o.amove&&D.mil){
    u.scan-=dt;
    if(u.scan<=0){
      u.scan=.4;
      if(u.medic){if(medicBrain(u)){u.order.back=o;return;}}
      else if(D.holy&&u.team!==3){if(monkBrain(u,o))return;}
      else{const e=pickTarget(u,D.sight*.9,{raid:o.raid});if(e){u.order={type:'attack',id:e.id,auto:true,back:o};u.path=null;return;}}
    }
  }
  if(!u.path&&!u.detour){
    if(hyp(u.x-o.x,u.y-o.y)<14){u.order=null;return;}
    const r=pathToPoint(u,o.x,o.y,true);
    if(r===0){u.order=null;return;}
    if(r<0)return;
  }
  if(followPath(u,dt)&&!u.detour){
    // long trips across the big map may need several path segments
    if(hyp(u.x-o.x,u.y-o.y)<40)u.order=null;
    else{o.tries=(o.tries||0)+1;if(o.tries>10)u.order=null;}
  }
}

// high ground: each level above the target adds damage, each level below takes some away
function hiMult(u,t){const c=centerOf(t),d=elevAt(u.x,u.y)-elevAt(c.x,c.y+4);return d>0?1.05+.15*d:d<0?Math.max(.76,1+.08*d):1;}
const towerReach=lv=>1+.2*lv;
function onWall(u){
  const tx=tileOf(u.x),ty=tileOf(u.y);
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=tx+dx,y=ty+dy;if(inB(x,y)&&wallT[idx(x,y)]===u.team)return true;}
  return false;
}
function doAttack(u,dt){
  const o=u.order,D=DEF[u.kind],t=byId.get(o.id);
  const tAid=t&&t.aid&&S.t<t.aid.until&&t.aid.foes.includes(u.team),uAid=u.aid&&S.t<u.aid.until&&t&&u.aid.foes.includes(t.team);
  const tTown=t&&((u.vsTown!=null&&t.town===u.vsTown&&(DEF[t.kind].neutral||DEF[t.kind].townb))||(!t.team&&t.town!=null&&t.kind!=='town'&&townFoe(t.town,u.team))||(o.loot&&DEF[t.kind].cart)||(u.team===3&&DEF[t.kind].cart));
  const uTown=u.team===0&&u.town!=null&&t&&townFoe(u.town,t.team);
  if(!alive(t)||t.team===u.team||(!t.team&&!tAid&&!tTown)||(D.neutral&&t.team!==3&&!uAid&&!uTown)){finish(u);return;}
  const TD=DEF[t.kind],tb=!!TD.building;
  if(D.siege&&!tb){finish(u);return;}
  // smarter target choice while auto-fighting: switch to units that threaten us
  if((o.auto||tb)&&!D.siege&&!D.neutral){
    o.re=(o.re||0)-dt;
    if(o.re<=0){
      o.re=.6;
      const n=pickTarget(u,D.ranged?D.range+30:110,{unitsOnly:true});
      if(n&&n!==t&&(tb||(o.auto&&distTo(u,n)+25<distTo(u,t)))){
        if(tb&&!o.back)o.back={type:'attack',id:t.id,auto:o.auto};
        o.id=n.id;o.auto=true;u.path=null;return;
      }
    }
  }
  const d=distTo(u,t);
  // archers keep melee units at arm's length while reloading
  if(D.ranged&&u.cd>.35){
    let m=null,md=56;
    forNear(u.x,u.y,56,e=>{if(e.dead||!e.team||e.team===u.team||!DEF[e.kind].mil||DEF[e.kind].ranged||DEF[e.kind].holy)return;const dd=hyp(e.x-u.x,e.y-u.y);if(dd<md){md=dd;m=e;}});
    if(m){
      const ax=u.x-m.x,ay=u.y-m.y,al=hyp(ax,ay)||1;
      const kx=u.x+ax/al*34,ky=u.y+ay/al*34;
      if(walkPt(kx,ky)){u.path=[{x:kx,y:ky}];followPath(u,dt);return;}
    }
  }
  const onW=D.ranged&&onWall(u),dl=elevAt(u.x,u.y)-elevAt(t.x,t.y),hiR=D.ranged&&dl>0?10+30*dl:0;
  // a catapult cannot hit what stands right next to it: roll back a little
  if(D.minRange&&d<D.minRange&&!tb){
    const ax=u.x-t.x,ay=u.y-t.y,al=hyp(ax,ay)||1,kx=u.x+ax/al*40,ky=u.y+ay/al*40;
    if(walkPt(kx,ky)){u.path=[{x:kx,y:ky}];followPath(u,dt);return;}
    const n=pickTarget(u,D.range,{unitsOnly:true});if(n&&n!==t&&distTo(u,n)>=D.minRange){o.id=n.id;return;}
    finish(u);return;
  }
  if(d<=D.range+(onW?40:0)+hiR){
    u.path=null;u.moving=false;u.face=centerOf(t).x>u.x?1:-1;
    if(u.cd<=0){
      u.cd=D.cd;u.atkT=.45;
      const dmg=D.dmg*dmgMult(u.team)*rankDmg(u.rank||0)*bonus(u.kind,t.kind)*atkMult(u)*hiMult(u,t);
      if(D.ranged)shoot(u,t,dmg,u,D.proj,D.splash);else damage(t,dmg,u);
      if(D.cleave&&!tb)forNear(t.x,t.y,D.cleave+10,e=>{if(e===t||e.dead||!e.team||e.team===u.team||!DEF[e.kind].unit||hyp(e.x-t.x,e.y-t.y)>D.cleave)return;damage(e,dmg*.55,u);});
      if(D.volley&&!tb){let k=D.volley-1;forNear(u.x,u.y,D.range,e=>{if(k<=0||e===t||e.dead||!e.team||e.team===u.team||!DEF[e.kind].unit||hyp(e.x-u.x,e.y-u.y)>D.range)return;k--;shoot(u,e,dmg*.7,u);});}
      if(D.stun&&!tb&&DEF[t.kind].unit&&!DEF[t.kind].boss)t.stunT=Math.max(t.stunT||0,D.stun);
      if(D.chill&&!tb&&DEF[t.kind].unit&&!DEF[t.kind].boss)t.slowT=Math.max(t.slowT||0,D.chill);
      if(D.drain&&u.hp<u.maxhp)u.hp=Math.min(u.maxhp,u.hp+dmg*D.drain);
      if(D.siege)HOOK.sfx('ram',t.x,t.y,u.team);

    }
    return;
  }
  if(o.auto&&o.ax!=null&&hyp(u.x-o.ax,u.y-o.ay)>380){u.order=null;if(pathToPoint(u,o.ax,o.ay,true)===1)u.order={type:'move',x:o.ax,y:o.ay};return;}
  if(!tb&&d<46){u.path=[{x:t.x,y:t.y}];followPath(u,dt);return;}
  if(tb&&d<44&&!u.path&&approach(u,rectOf(t),Math.max(4,D.range-6),dt))return;
  u.rp=(u.rp||0)-dt;
  if((!u.path&&!u.detour)||u.rp<=0){
    u.rp=tb?2.5:.8;
    const r=tb?pathToRect(u,rectOf(t)):pathToPoint(u,t.x,t.y,false);
    if(r===0){finish(u);return;}
  }
  followPath(u,dt);
}

// ---------------------------------------------------------------- gathering
function srcOf(o){
  if(o.res==='wood'){if(o.tx==null)return null;const i=idx(o.tx,o.ty);return (S.tiles[i]===TREE&&S.wood[i]>0)?{rect:[o.tx*TS,o.ty*TS,TS,TS],cx:o.tx*TS+16}:null;}
  const e=byId.get(o.id);if(!alive(e))return null;
  if(e.kind==='gold')return {e,rect:rectOf(e),cx:e.x};
  if(e.kind==='farm'){if(!e.built)return null;const r=rectOf(e);return {e,farm:true,x:r[0]+r[2]/2+((o.fo||0)),y:r[1]+r[3]/2+6,cx:e.x};}
  return {e,x:e.x,y:e.y-4,cx:e.x};
}
function retarget(u,o){
  const r=findResource(u,o.res,o.lx??u.x,o.ly??u.y,false)||findResource(u,o.res,u.x,u.y,true);if(!r)return false;
  if(o.res==='wood'){o.tx=r.tx;o.ty=r.ty;o.id=null;}else{o.id=r.id;o.tx=o.ty=null;}
  return true;
}
function doGather(u,dt){
  const o=u.order;
  if(u.carry&&u.carry.amt>0&&u.carry.type!==o.res)o.phase='return';
  if(o.phase==='return'){
    const d=nearestDrop(u);
    if(!d){u.order=null;return;}
    const r=rectOf(d),dr=distRect(u.x,u.y,r);
    if(dr<=28){deposit(u);o.phase='go';u.path=null;return;}
    if(dr<44&&!u.path&&approach(u,r,14,dt))return;
    if(!u.path&&!u.detour){const p=pathToRect(u,r);if(p===0){u.order=null;return;}if(p<0)return;}
    if(followPath(u,dt))u.path=null;
    return;
  }
  let s=srcOf(o);
  if(!s){
    if(!retarget(u,o)){if(u.carry&&u.carry.amt>0){o.phase='return';return;}u.order=null;u.path=null;HOOK.idle(u,o.res);return;}
    s=srcOf(o);u.path=null;
  }
  if(s.farm){
    if(s.e.worker&&s.e.worker!==u.id&&alive(byId.get(s.e.worker))){if(!retarget(u,o)){u.order=null;return;}return;}
    s.e.worker=u.id;
  }
  const d=s.rect?distRect(u.x,u.y,s.rect):hyp(u.x-s.x,u.y-s.y)-(s.farm?0:8);
  if(d<=(s.farm?8:24)){
    u.path=null;u.moving=false;u.anim='work';u.stuck=0;u.face=s.cx>u.x?1:-1;
    if(s.e&&DEF[s.e.kind].critter)s.e.held=true;
    o.lx=u.x;o.ly=u.y;
    u.work=(u.work||0)+dt;
    const base=s.farm?.75:o.res==='gold'?.6:o.res==='food'?.45:.5,rate=base/gatherMult(u.team)/workMult(u,o.res)/techGather(u.team,o.res),cap=carryCap(u.team);
    while(u.work>=rate){
      u.work-=rate;
      if(!take(o,s,u))break;
      if(u.kind==='pawn')addSkill(u,o.res,1);
      if(!u.carry||u.carry.type!==o.res)u.carry={type:o.res,amt:0};
      u.carry.amt++;
      if(u.carry.amt>=cap){o.phase='return';u.path=null;break;}
    }
    return;
  }
  if(!s.rect&&d<48){const ax=s.x-(s.farm?0:(s.x>u.x?12:-12)),ay=s.y+2;if(walkPt(ax,ay)){u.path=[{x:ax,y:ay}];followPath(u,dt);return;}}
  if(s.rect&&d<40&&!u.path&&approach(u,s.rect,12,dt))return;
  if(!u.path&&!u.detour){
    u.stuck=(u.stuck||0)+1;
    if(u.stuck>6){u.stuck=0;markBad(u,o.res==='wood'?'t'+idx(o.tx,o.ty):o.id);if(!retarget(u,o))u.order=null;return;}
    const p=s.rect?pathToRect(u,s.rect):pathToPoint(u,s.x,s.y,false);
    if(p===0){markBad(u,o.res==='wood'?'t'+idx(o.tx,o.ty):o.id);if(!retarget(u,o))u.order=null;return;}
    if(p<0)return;
  }
  if(followPath(u,dt))u.path=null;
}
function take(o,s,u){
  if(o.res==='wood'){
    const i=idx(o.tx,o.ty);if(S.wood[i]<=0)return false;
    S.wood[i]--;treeShake.set(i,AT);
    if(S.wood[i]<=0){S.tiles[i]=STUMP;reachDirty=true;HOOK.tile(o.tx,o.ty);}
    return true;
  }
  const e=s.e;
  if(s.farm)return true;
  if(e.amount<=0)return false;
  e.amount--;
  if(e.amount<=0){
    e.dead=true;if(isFixed(e))occupy(e,false);
    const g=DEF[e.kind].gold;
    if(g&&u&&S.teams[u.team]){S.teams[u.team].res.gold+=g;S.teams[u.team].stats.gold+=g;if(u.team===1){FX.floats.push({x:e.x,y:e.y-30,txt:`+${g} ouro`,col:'#ffe066',t:0});HOOK.toast(`A ovelha dourada rendeu ${g} de ouro!`,'good');}}
  }
  return true;
}
function deposit(u){
  if(!u.carry||!u.carry.amt)return;
  const {type}=u.carry,T=S.teams[u.team],amt=u.team===3?Math.ceil(u.carry.amt*.5):u.carry.amt;
  T.res[type]+=amt;T.stats[type]+=amt;
  if(u.team===1)FX.floats.push({x:u.x,y:u.y-34,txt:'+'+amt,col:type==='wood'?'#f3c991':type==='gold'?'#ffe066':'#ff9e86',t:0});
  u.carry=null;
}

// ---------------------------------------------------------------- building and repairing
function doBuild(u,dt){
  const o=u.order,b=byId.get(o.id);
  if(!alive(b)||b.team!==u.team){finish(u);return;}
  const D=DEF[b.kind];
  if(b.built&&b.hp>=b.maxhp&&!b.reno){afterBuild(u,b);return;}
  const r=rectOf(b);
  const dr=D.flat?distRect(u.x,u.y,[r[0]-6,r[1]-6,r[2]+12,r[3]+12]):distRect(u.x,u.y,r);
  if(dr<=24){
    u.path=null;u.moving=false;u.anim='build';u.stuck=0;u.face=b.x>u.x?1:-1;
    if(u.kind==='pawn')addSkill(u,'build',dt);
    if(b.reno&&b.built){renovate(u,b,dt);return;}
    if(!b.built){
      b.prog=Math.min(1,b.prog+dt/D.time*buildRate(u));
      b.hp=Math.max(b.hp,Math.round(b.maxhp*b.prog));
      if(b.prog>=1){b.built=true;b.hp=b.maxhp;onBuilt(b);afterBuild(u,b);}
    }else b.hp=Math.min(b.maxhp,b.hp+20*dt*buildRate(u));
    return;
  }
  if(dr<40&&!u.path&&approach(u,r,10,dt))return;
  if(!u.path&&!u.detour){
    u.stuck=(u.stuck||0)+1;
    if(u.stuck>6){u.stuck=0;resolveCrowd(u);}
    const p=pathToRect(u,r);
    if(p===0){o.fail=(o.fail||0)+1;if(o.fail>40){u.order=null;if(!b.built&&b.prog<.05&&(D.wall||D.bridge))demolish(b);return;}u.detour={x:u.x+(Math.random()-.5)*40,y:u.y+(Math.random()-.5)*40,t:.6};if(!walkPt(u.detour.x,u.detour.y))u.detour=null;return;}
    if(p<0)return;
  }
  if(followPath(u,dt))u.path=null;
}
function buildRate(u){
  if(u.kind==='engineer')return 2.5;
  const g=S.engineerId&&byId.get(S.engineerId);
  return (g&&!g.dead&&g.team===u.team&&hyp(g.x-u.x,g.y-u.y)<7*TS?1.4:1)*(1+.1*skillLv(u,'build'))*(u.team===1?restMult(u):1);
}
function afterBuild(u,b){
  const back=u.order&&u.order.back;
  u.order=null;u.path=null;
  if(back&&validOrder(back)){u.order=back;return;}
  if(b.kind==='farm'&&(!b.worker||!alive(byId.get(b.worker)))){b.worker=u.id;u.order={type:'gather',res:'food',id:b.id,phase:'go'};return;}
  // help an unfinished building nearby that nobody is working on
  for(const o of BLDS){
    if(o.dead||o.built||o.team!==u.team||hyp(o.x-u.x,o.y-u.y)>9*TS)continue;
    if(S.ents.some(p=>!p.dead&&p.team===u.team&&p.order&&p.order.type==='build'&&p.order.id===o.id))continue;
    u.order={type:'build',id:o.id};return;
  }
  if(u.kind==='pawn')autoJob(u,b.kind==='house'?'wood':null);
}
function onBuilt(b){
  HOOK.sfx('build',b.x,b.y,b.team);HOOK.built(b);
  if(b.kind==='pit'){S.tiles[idx(b.tx,b.ty)]=PIT;reachDirty=true;HOOK.tile(b.tx,b.ty);}
  if(b.kind==='bridge')recomputeBridges();
  if(b.team===1&&!DEF[b.kind].wall)engineerXp(1);
  if(b.team===1)HOOK.toast(`Construção concluída: ${DEF[b.kind].name}`,'good',{x:b.x,y:b.y,id:b.id});
  for(let i=0;i<8;i++)FX.puffs.push({x:b.x+(Math.random()-.5)*DEF[b.kind].w*TS,y:b.y-Math.random()*20,t:0,r:6+Math.random()*8});
}
// pick the most useful job near this pawn
function autoJob(u,prefer){
  const T=S.teams[u.team],cnt={wood:0,gold:0,food:0};
  for(const e of S.ents)if(!e.dead&&e.team===u.team&&e.kind==='pawn'&&e.order&&e.order.type==='gather')cnt[e.order.res]++;
  const want={wood:1.0,food:1.15,gold:eraOf(u.team)>=2?.85:.35};
  const nx=ERAS[T.era+1];
  if(nx)for(const k in nx.cost)if(T.res[k]<nx.cost[k])want[k]+=.4;
  const order=prefer?[prefer]:Object.keys(want).sort((a,b)=>cnt[a]/want[a]-cnt[b]/want[b]);
  for(const res of[...order,'wood','food','gold']){
    const r=findResource(u,res,u.x,u.y,true);
    if(r){u.order=Object.assign({type:'gather',res,phase:'go'},r);u.path=null;return true;}
  }
  return false;
}

// ---------------------------------------------------------------- pawns run from danger and go back to work
function pawnSafety(u,dt){
  u.safeT=(u.safeT||0)-dt;if(u.safeT>0)return;u.safeT=.35;
  const o=u.order;
  if(o&&(o.type==='flee'||o.type==='attack'))return;
  const e=threatNear(u.x,u.y,u.team,100);
  if(!e)return;
  startFlee(u,e);
}
function startFlee(u,e){
  HOOK.fear(u,e);
  let ref=null,bd=1e9;
  for(const b of BLDS){
    if(b.dead||b.team!==u.team||!b.built||!(b.kind==='castle'||b.kind==='tower'))continue;
    const c=centerOf(b),d=hyp(c.x-u.x,c.y-u.y),de=hyp(c.x-e.x,c.y-e.y);
    if(de<90&&d>60)continue; // enemy sits on that refuge
    if(d<bd){bd=d;ref=b;}
  }
  const resume=u.order&&u.order.type!=='flee'?u.order:null;
  u.order={type:'flee',resume,calm:0,ref:ref&&ref.id,fx:e.x,fy:e.y};
  u.path=null;
  if(u.team===1)HOOK.alarm(u.x,u.y);
}
function doFlee(u,dt){
  const o=u.order;
  const ref=o.ref&&byId.get(o.ref);
  if(!u.path&&!u.detour){
    if(alive(ref)){
      const r=rectOf(ref);
      if(distRect(u.x,u.y,r)>40){const p=pathToRect(u,r);if(p===0)o.ref=null;}
    }else{
      const ax=u.x-o.fx,ay=u.y-o.fy,al=hyp(ax,ay)||1;
      const x=u.x+ax/al*150,y=u.y+ay/al*150;
      if(hyp(u.x-o.fx,u.y-o.fy)<200)pathToPoint(u,x,y,false);
    }
  }
  followPath(u,dt);
  o.chk=(o.chk||0)-dt;
  if(o.chk<=0){
    o.chk=.5;
    const e=threatNear(u.x,u.y,u.team,170);
    if(e){o.calm=0;o.fx=e.x;o.fy=e.y;}else o.calm+=.5;
    if(o.calm>=3){
      u.path=null;
      u.order=o.resume&&validOrder(o.resume)?o.resume:null;
      if(u.order&&u.order.type==='gather')u.order.phase=u.carry&&u.carry.amt>=carryCap(u.team)?'return':'go';
      if(!u.order&&u.kind==='pawn')autoJob(u);
    }
  }
}

// ---------------------------------------------------------------- monks: conversion, healing, spells
function monkBrain(u,amove){
  const D=DEF.monk,era=eraOf(u.team);
  // heal a hurt friend first
  let hurt=null,hd=170;
  forNear(u.x,u.y,170,e=>{if(e.dead||e===u||e.team!==u.team||!healable(e)||e.hp>=e.maxhp*.8)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<hd){hd=d;hurt=e;}});
  const foe=pickTarget(u,D.sight,{unitsOnly:true});
  if(foe&&era>=5&&u.meteorCd<=0){const c=bestCluster(u,SPELL.meteor.range+40);if(c&&c.n>=3){u.order={type:'cast',spell:'meteor',x:c.x,y:c.y,auto:true,back:amove||null};return true;}}
  if(foe&&(era>=4||u.hero)&&u.boltCd<=0&&distTo(u,foe)<SPELL.bolt.range+60){u.order={type:'cast',spell:'bolt',id:foe.id,auto:true,back:amove||null};return true;}
  if(foe&&u.faith>=1&&(u.team===2||u.autoConvert!==false)){
    const best=convertPick(u,D.sight);
    if(best){u.order={type:'convert',id:best.id,auto:true,back:amove||null};return true;}
  }
  if(hurt){u.order={type:'heal',id:hurt.id,auto:true,back:amove||null};return true;}
  // stay away from melee enemies
  let m=null,md=70;
  forNear(u.x,u.y,70,e=>{if(e.dead||!e.team||e.team===u.team||!DEF[e.kind].mil||DEF[e.kind].ranged||DEF[e.kind].holy)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<md){md=d;m=e;}});
  if(m){const ax=u.x-m.x,ay=u.y-m.y,al=hyp(ax,ay)||1,kx=u.x+ax/al*60,ky=u.y+ay/al*60;if(walkPt(kx,ky)){u.path=[{x:kx,y:ky}];}}
  return false;
}
function convertPick(u,range){
  let best=null,bs=-1e9;
  forNear(u.x,u.y,range,e=>{
    if(e.dead||!e.team||e.team===u.team||!DEF[e.kind].unit)return;
    const d=hyp(e.x-u.x,e.y-u.y);if(d>range)return;
    const val={lancer:160,warrior:120,archer:100,monk:150,pawn:40}[e.kind]||50;
    const s=val*(e.hp/e.maxhp*.5+.5)-d*.5;
    if(s>bs){bs=s;best=e;}
  });
  return best;
}
function bestCluster(u,range){
  const foes=[];forNear(u.x,u.y,range,e=>{if(!e.dead&&e.team&&e.team!==u.team&&DEF[e.kind].unit&&hyp(e.x-u.x,e.y-u.y)<range)foes.push(e);});
  let best=null;
  for(const a of foes){let n=0;for(const b of foes)if(hyp(a.x-b.x,a.y-b.y)<70)n++;if(!best||n>best.n)best={x:a.x,y:a.y,n};}
  return best;
}
function canConvert(u,t){
  if(!alive(t)||!t.team||t.team===u.team)return false;
  if(t.kind==='castle'||DEF[t.kind].resource||DEF[t.kind].critter||DEF[t.kind].noConvert||t.hero)return false;
  if(DEF[t.kind].building&&(eraOf(u.team)<5||DEF[t.kind].wild))return false;
  return true;
}
function doConvert(u,dt){
  const o=u.order,t=byId.get(o.id);
  if(!canConvert(u,t)){finish(u);return;}
  const d=distTo(u,t),range=DEF.monk.range;
  if(d>range){
    if(o.ch>0&&d>range+40){o.ch=0;}
    u.rp=(u.rp||0)-dt;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=.8;const r=isFixed(t)?pathToRect(u,rectOf(t)):pathToPoint(u,t.x,t.y,false);if(r===0){finish(u);return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.face=centerOf(t).x>u.x?1:-1;
  if(u.faith<1){if(o.auto){finish(u);}return;}
  if(!o.ch){o.ch=0;HOOK.sfx('wololo',u.x,u.y,u.team,t.team);FX.rings.push({mid:u.id,tid:t.id,t:0,dur:convertTime(u.team,t)});}
  u.anim='cast';
  o.ch+=dt;
  if(o.ch>=convertTime(u.team,t)){
    convert(t,u.team,u);u.faith=0;o.ch=0;finish(u);
  }
}
function convert(t,team,monk){
  const from=t.team;
  t.team=team;t.order=null;t.path=null;t.detour=null;t.home=null;t.roam=false;t.camp=null;
  if(monk)addKill(monk);
  if(t.queue&&t.queue.length){t.queue=[];t.tp=0;}
  if(t.kind==='farm')t.worker=0;
  if(isFixed(t)){occupy(t,false);occupy(t,true);}
  S.teams[team].stats.conv++;
  if(S.teams[from])S.teams[from].stats.lost++;
  FX.sparks.push({x:centerOf(t).x,y:centerOf(t).y,t:0,team});
  FX.floats.push({x:centerOf(t).x,y:centerOf(t).y-36,txt:'Convertido!',col:team===1?'#9fc3ff':'#ff9e86',t:0});
  HOOK.sfx('converted',t.x,t.y,team,from);
  if(from===1&&team===2)HOOK.toast(`Um ${unitName(t).toLowerCase()} seu foi convertido pelo Reino Vermelho!`,'warn',{x:t.x,y:t.y});
}
function doHeal(u,dt){
  const o=u.order,t=byId.get(o.id);
  if(!alive(t)||t.team!==u.team||t.hp>=t.maxhp||!healable(t)){finish(u);return;}
  const d=hyp(t.x-u.x,t.y-u.y);
  if(d>90){
    u.rp=(u.rp||0)-dt;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=.8;if(pathToPoint(u,t.x,t.y,false)===0){finish(u);return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.anim='cast';u.face=t.x>u.x?1:-1;
  const era=eraOf(u.team),rate=u.medic?10:(era>=4?14:8)*(u.team===1&&has('relicario')?2:1)*(u.hero?1.5:1);
  t.hp=Math.min(t.maxhp,t.hp+rate*dt);t.healT=.3;
  if(era>=4)forNear(t.x,t.y,80,e=>{if(!e.dead&&e!==t&&e.team===u.team&&healable(e)&&e.hp<e.maxhp){e.hp=Math.min(e.maxhp,e.hp+rate*.5*dt);e.healT=.3;}});
}
function doCast(u,dt){
  const o=u.order,sp=SPELL[o.spell],era=eraOf(u.team);
  if(!sp||era<sp.era){finish(u);return;}
  if((o.spell==='bolt'?u.boltCd:u.meteorCd)>0){finish(u);return;}
  let tx=o.x,ty=o.y,t=null;
  if(o.id!=null){t=byId.get(o.id);if(!alive(t)||t.team===u.team||!t.team){finish(u);return;}const c=centerOf(t);tx=c.x;ty=c.y;}
  const d=t?distTo(u,t):hyp(tx-u.x,ty-u.y);
  if(d>sp.range){
    u.rp=(u.rp||0)-dt;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=.8;if(pathToPoint(u,tx,ty,false)===0){finish(u);return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.face=tx>u.x?1:-1;u.anim='cast';
  o.ch=(o.ch||0)+dt;
  if(o.ch<.5)return;
  if(o.spell==='bolt'){
    u.boltCd=era>=5?9:12;
    const dmg=(t&&DEF[t.kind].building?80:45)*dmgMult(u.team)*rankDmg(u.rank||0);
    FX.bolts.push({x:tx,y:ty,t:0});HOOK.sfx('bolt',tx,ty,u.team);
    if(t){damage(t,dmg,u);if(alive(t)&&DEF[t.kind].unit){t.stunT=1.2;}}
  }else{
    u.meteorCd=SPELL.meteor.cd;
    const hits=[];
    for(let k=0;k<7;k++){const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*75;hits.push({x:tx+Math.cos(a)*r,y:ty+Math.sin(a)*r*.75,at:.35+k*.22,done:false});}
    S.spells=S.spells||[];S.spells.push({type:'meteor',team:u.team,src:u.id,x:tx,y:ty,t:0,hits});
    HOOK.sfx('meteor',tx,ty,u.team);
  }
  finish(u);
}
function updSpells(dt){
  if(!S.spells||!S.spells.length)return;
  for(const s of S.spells){
    s.t+=dt;
    for(const h of s.hits){
      if(h.done||s.t<h.at)continue;
      h.done=true;
      FX.booms.push({x:h.x,y:h.y,t:0,s:1.1,k:'explosion2'});
      HOOK.sfx('boom',h.x,h.y,s.team);
      const src=byId.get(s.src)||{team:s.team,kind:'monk',x:s.x,y:s.y};
      const dm=20*dmgMult(s.team);
      forNear(h.x,h.y,40,e=>{if(!e.dead&&e.team&&e.team!==s.team&&DEF[e.kind].unit&&hyp(e.x-h.x,e.y-h.y)<38)damage(e,dm,src);});
      for(const b of BLDS)if(!b.dead&&b.team&&b.team!==s.team&&distRect(h.x,h.y,rectOf(b))<20)damage(b,dm*.7,src);
    }
  }
  S.spells=S.spells.filter(s=>s.hits.some(h=>!h.done));
}

// ---------------------------------------------------------------- buildings
function updBuilding(b,dt){
  if(!b.built)return;
  const D=DEF[b.kind],T=S.teams[b.team];
  if(b.kind==='farm'&&b.worker){const w=byId.get(b.worker);if(!alive(w)||w.team!==b.team||!w.order||w.order.id!==b.id)b.worker=0;}
  const blocked=b.kind==='castle'&&T&&T.research;
  if(b.queue&&b.queue.length&&!blocked){
    b.tp+=dt*(b.team===1&&has('estandarte')?1.3:1);const k=b.queue[0];
    if(b.tp>=DEF[k].time){
      b.tp=0;b.queue.shift();
      const p=DEF[k].naval?waterSpotNear(b):freeSpotNear(b),u=spawnUnit(k,b.team,p.x,p.y);
      onTrained(u,b);
    }
  }
  if(D.dmg){
    b.cd-=dt;
    if(b.cd<=0){
      const c=centerOf(b),ox=c.x,oy=c.y-D.h*TS*.3;
      const lv=elev[idx(b.tx,b.ty)];
      const e=pickTarget({x:ox,y:oy,team:b.team,kind:'archer',town:b.town},D.range*towerReach(lv),{unitsOnly:true});
      if(e){b.cd=D.cd;shoot({x:ox,y:oy,team:b.team},e,D.dmg*towerMult(b.team)*(1+.15*lv)*(techHas(b.team,'flechas')?1.12:1),b);}else b.cd=.3;
    }
  }
}
function onTrained(u,b){
  if(u.team===1){HOOK.toast(`${unitName(u)} pronto!`,'good',{x:u.x,y:u.y,id:u.id});HOOK.sfx('train',u.x,u.y,1);HOOK.trained(u);}
  if(DEF[u.kind].naval)return;
  const rp=b.rally;
  if(u.kind==='pawn'){
    if(rp&&rp.res){u.order=Object.assign({type:'gather',res:rp.res,phase:'go'},rp.res==='wood'?{tx:rp.tx,ty:rp.ty}:{id:rp.id});return;}
    if(rp){u.order={type:'move',x:rp.x,y:rp.y};return;}
    if(u.team===1)autoJob(u);
    return;
  }
  if(rp)u.order={type:'move',x:rp.x,y:rp.y,amove:true};
  else{const p=freeSpotNear(b);u.order={type:'move',x:p.x+(Math.random()-.5)*60,y:p.y+20+Math.random()*30};}
}

function updSheep(e,dt){
  e.moving=false;PT=0;
  if(!walkPt(e.x,e.y)){const w=nearestWalk(clamp(tileOf(e.x),0,MW-1),clamp(tileOf(e.y),0,MH-1));if(w){e.x=w[0]*TS+16;e.y=w[1]*TS+18;e.path=null;}}
  if(e.held)return;
  e.wT=(e.wT||Math.random()*3)-dt;
  if(e.wT<=0){
    e.wT=2+Math.random()*5;
    const nx=e.x+(Math.random()-.5)*70,ny=e.y+(Math.random()-.5)*50;
    if(walkPt(nx,ny))e.path=[{x:nx,y:ny}];
  }
  if(e.path)followPath(e,dt);
}
function respawnSheep(){
  if(S.ents.filter(e=>!e.dead&&DEF[e.kind].critter).length>=40)return;
  for(const t of[1,2]){
    const c=castleOf(t);if(!c)continue;
    for(let k=0;k<60;k++){
      const a=Math.random()*Math.PI*2,r=(7+Math.random()*9)*TS,x=c.x+Math.cos(a)*r,y=c.y+Math.sin(a)*r;
      const tx=tileOf(x),ty=tileOf(y);
      if(walkXY(tx,ty)&&reachT(tx,ty)&&S.tiles[idx(tx,ty)]===GRASS){spawnUnit(ANIMALS[Math.floor(Math.random()*ANIMALS.length)],0,x,y);break;}
    }
  }
}

// ---------------------------------------------------------------- combat
function shoot(src,t,dmg,owner,kind,splash){
  const c=centerOf(t),d=hyp(c.x-src.x,c.y-src.y);
  const p={x:src.x,y:src.y-12,sx:src.x,sy:src.y-12,tid:t.id,dmg,t:0,dur:Math.max(.15,d/(kind==='rock'?260:kind==='fire'?300:380)),src:owner?owner.id:0,team:src.team};
  if(kind){p.k=kind;p.splash=splash||0;p.sy=p.y=src.y-(kind==='rock'?26:18);HOOK.sfx(kind==='rock'?'catapult':'fireball',src.x,src.y,src.team);}
  // a boulder flies to where the target stood: a quick unit can dodge it
  if(kind==='rock'){p.tx=c.x;p.ty=c.y;p.fixed=true;}
  S.proj.push(p);
}
function splashHit(p){
  const owner=byId.get(p.src)||{team:p.team,kind:p.k==='rock'?'catapult':'wizard',x:p.sx,y:p.sy};
  const R=p.splash,hit=new Set();
  forNear(p.x,p.y,R+20,e=>{if(e.dead||!e.team||e.team===p.team||!DEF[e.kind].unit||e.aboard)return;const d=hyp(e.x-p.x,e.y-p.y);if(d>R)return;hit.add(e.id);damage(e,p.dmg*(1-.5*d/R)*bonus(owner.kind||'catapult',e.kind),owner);});
  for(const b of BLDS){if(b.dead||!b.team||b.team===p.team||hit.has(b.id))continue;const d=distRect(p.x,p.y,rectOf(b));if(d>R*.6)continue;damage(b,p.dmg*bonus(owner.kind||'catapult',b.kind)*(1-.4*d/R),owner);}
  FX.booms.push({x:p.x,y:p.y+(p.k==='rock'?8:4),t:0,s:p.k==='rock'?.75:.65,k:p.k==='rock'?'explosion2':'explosion'});
  HOOK.sfx('boom',p.x,p.y,p.team);
}
function updProj(dt){
  for(const p of S.proj){
    p.t+=dt;
    const t=byId.get(p.tid);
    if(alive(t)&&!p.fixed){const c=centerOf(t);p.tx=c.x;p.ty=c.y-(isFixed(t)?0:2);}
    const u=Math.min(1,p.t/p.dur);
    p.px=p.x;p.py=p.y;
    p.x=p.sx+((p.tx??p.sx)-p.sx)*u;p.y=p.sy+((p.ty??p.sy)-p.sy)*u-Math.sin(u*Math.PI)*(p.k==='rock'?70:p.k==='fire'?14:22);
    if(u>=1){p.done=true;if(p.splash)splashHit(p);else if(alive(t)&&t.team!==p.team)damage(t,p.dmg,byId.get(p.src)||{team:p.team,kind:'archer',x:p.sx,y:p.sy});}
  }
  S.proj=S.proj.filter(p=>!p.done);
}
function damage(t,dmg,src){
  if(!alive(t))return;
  const TD=DEF[t.kind];
  if(t.team===1&&TD.unit&&has('escudos'))dmg*=.85;
  const SDp=src&&DEF[src.kind];
  if(TD.armor&&!(SDp&&SDp.pierce))dmg*=1-TD.armor;
  if(t.sq&&TD.unit)dmg*=sqGuard(t,SDp);
  if(TD.unit&&DEF[t.kind].ranged&&src&&DEF[src.kind]&&DEF[src.kind].ranged&&onWall(t))dmg*=.7;
  if(TD.mech&&src&&DEF[src.kind]){const SD=DEF[src.kind];if((SD.ranged||SD.building)&&!SD.splash)dmg*=SD.pierce?.9:t.kind==='ram'?.2:.6;else if(!SD.ranged&&!SD.building&&!TD.cart)dmg*=1.3;}
  else if(TD.mech&&src&&!DEF[src.kind])dmg*=t.kind==='ram'?.2:.6;
  if(t.gate&&!has('ariete')&&!(src&&DEF[src.kind]&&(DEF[src.kind].siege||DEF[src.kind].wallx>=6))){dmg*=.08;if(src&&src.team===1&&S.t-(S.gateT||-99)>12){S.gateT=S.t;HOOK.toast('O portão do castelo vermelho é reforçado demais. Forje o Aríete Real.','warn',{x:t.x,y:t.y});}}
  t.hp-=dmg;t.hitT=.18;t.lastHit=S.t;
  loot(t,dmg,src);
  if(t.team===3&&src&&src.team&&src.team!==3){const c=campOf(t);if(c){c.hitT=S.t;c.hitBy=src.team;}}
  if(TD.unit&&src&&src.id!=null&&alive(src)&&DEF[src.kind]&&DEF[src.kind].unit&&src.team!==t.team){
    const cur=t.order&&byId.get(t.order.id);
    if(TD.cart){}
    else if(t.kind==='pawn'||TD.civil){if(DEF[src.kind].mil&&!(t.order&&(t.order.type==='flee'||t.order.type==='attack')))startFlee(t,src);}
    else if(DEF[t.kind].holy){if(!t.order||t.order.type==='heal')monkBrain(t,null);}
    else if(t.medic&&t.order&&t.order.type==='heal'){}
    else if(TD.siege||TD.minRange&&hyp(src.x-t.x,src.y-t.y)<TD.minRange){}
    else if(!t.order||t.order.type==='gather'||(t.order.type==='attack'&&cur&&DEF[cur.kind].building)||(t.order.type==='move'&&t.order.amove)){
      t.order={type:'attack',id:src.id,auto:true,ax:t.x,ay:t.y,back:t.order&&t.order.type!=='gather'?t.order:null};t.path=null;
    }
  }
  if(t.team&&src&&src.team&&src.team!==t.team){
    if(t.team===1){HOOK.alarm(t.x,t.y);if(S.t-(S.hitT||-99)>40){S.hitT=S.t;S.villageHits=(S.villageHits||0)+1;}}
    if(t.team===2&&S.ai){S.ai.alarm={x:t.x,y:t.y,t:S.t};}else if(t.team===1&&S.ai1){S.ai1.alarm={x:t.x,y:t.y,t:S.t};}
  }
  if(t.hp<=0)kill(t,src);
}
function kill(t,src){
  if(t.dead)return;
  t.dead=true;t.hp=0;
  const D=DEF[t.kind];
  if(isFixed(t))occupy(t,false);
  if(t.svc||t.amb||t.kind==='cart')svcOnDeath(t,src);
  if(t.sq)armyOnDeath(t,src);
  if(t.kind==='cart'&&!t.team&&(t.route||t.trip))caravanLost(t,src);
  if(t.kind==='pit'&&t.built){S.tiles[idx(t.tx,t.ty)]=GRASS;reachDirty=true;HOOK.tile(t.tx,t.ty);}
  if(t.kind==='bridge'){recomputeBridges();HOOK.tile(t.tx,t.ty);}
  if(t.cargo&&t.cargo.length){for(const c of t.cargo){c.aboard=false;c.dead=true;if(S.teams[c.team])S.teams[c.team].stats.lost++;}t.cargo=[];}
  if(t.queue&&t.queue.length&&t.team)for(const k of t.queue)refund(t.team,DEF[k].cost);
  const n=D.building?10:3;
  for(let i=0;i<n;i++)FX.puffs.push({x:t.x+(Math.random()-.5)*(D.building?D.w*TS:16),y:t.y-Math.random()*(D.building?30:6),t:-Math.random()*(D.building?.4:0),r:6+Math.random()*(D.building?8:4)});
  if(D.building){for(let i=0;i<4;i++)FX.booms.push({x:t.x+(Math.random()-.5)*D.w*TS*.7,y:t.y-D.h*TS*(.2+Math.random()*.5),t:-i*.15,s:1+Math.random()*.6});HOOK.sfx('boom',t.x,t.y,t.team);}
  if(t.team&&D.unit){S.teams[t.team].stats.lost++;if(src&&src.team&&src.team!==t.team&&S.teams[src.team])S.teams[src.team].stats.kills++;}
  if(D.mil&&t.team&&src&&src.team!==t.team)addKill(src);
  if(src&&src.team===3&&t.carry&&t.carry.amt&&S.teams[3]){S.teams[3].res[t.carry.type]+=t.carry.amt;t.carry=null;}
  if(D.bounty&&src&&(src.team===1||src.team===2)){
    const T=S.teams[src.team],c=centerOf(t);
    for(const k in D.bounty){T.res[k]+=D.bounty[k];T.stats[k]+=D.bounty[k];}
    if(src.team===1){
      FX.floats.push({x:c.x,y:c.y-30,txt:Object.entries(D.bounty).map(([k,v])=>`+${v} ${k==='gold'?'ouro':'comida'}`).join(' '),col:'#ffe066',t:0});
      if(D.building)HOOK.toast(`${D.name} destruído! Recompensa: ${Object.entries(D.bounty).map(([k,v])=>`${v} de ${RES_NAME[k]}`).join(' e ')}.`,'good',{x:c.x,y:c.y});
    }
  }
  if(t.kind==='castle'){if(t.team===1)endGame(false,'castle');else if(S.mode==='skirmish')endGame(true);}
  if(D.king&&t.team===1)endGame(false,'king');
  modeKill(t,src);
}
function addKill(u){
  if(!u||u.id==null||!alive(u)||!DEF[u.kind]||!DEF[u.kind].unit)return;
  u.kills=(u.kills||0)+1;
  const r=u.rank||0;
  if(r<RANKS.length-1&&u.kills>=RANKS[r+1].k){
    const f=rankHp(r+1)/rankHp(r);
    u.maxhp=Math.round(u.maxhp*f);u.hp=Math.min(u.maxhp,u.hp*f+u.maxhp*.5);
    u.rank=r+1;
    FX.ranks.push({id:u.id,t:0});
    if(u.team===1)FX.floats.push({x:u.x,y:u.y-58,txt:RANKS[u.rank].n+'!',col:'#ffd84a',t:0});
    HOOK.rank(u);rankUp(u);
  }
}
function endGame(win,why){
  if(S.over)return;
  S.over=win?'win':'lose';S.why=why||'';
  HOOK.over(win,why);
}

// ================================================================ the chief engineer: organises the workers on his own (from the second era)
// one of the villagers is chosen as chief engineer
function makeEngineer(){
  if(S.engineerId&&alive(byId.get(S.engineerId)))return null;
  const ps=S.ents.filter(e=>!e.dead&&e.team===1&&e.kind==='pawn');
  if(!ps.length)return spawnEngineer();
  const u=ps[Math.floor(Math.random()*ps.length)];
  u.kind='engineer';u.title='Mestre Gaspar';u.rank=5;u.kills=RANKS[5].k;u.order=null;u.carry=null;
  u.maxhp=u.hp=Math.round(DEF.engineer.hp*rankHp(5));
  S.engineerId=u.id;if(S.autoBuild==null)S.autoBuild=true;
  HOOK.engineer('arrive',u);
  return u;
}
function spawnEngineer(){
  if(S.engineerId&&alive(byId.get(S.engineerId)))return null;
  const c=castleOf(1);if(!c)return null;
  const p=typeof openSpot==='function'?openSpot(c):freeSpotNear(c);
  const u=spawnUnit('engineer',1,p.x,p.y,{title:'Mestre Gaspar',rank:5,kills:RANKS[5].k});
  u.maxhp=u.hp=Math.round(u.maxhp*rankHp(5));
  S.engineerId=u.id;if(S.autoBuild==null)S.autoBuild=true;
  HOOK.engineer('arrive',u);
  return u;
}
function builderFree(p){return p.kind==='pawn'&&!p.dead&&(!p.order||p.order.type==='gather'&&p.order.phase!=='return'&&!onFarm(p))&&!(p.carry&&p.carry.amt>=carryCap(p.team));}
function nearestPawns(x,y,n,team){
  return S.ents.filter(p=>p.team===team&&builderFree(p)).sort((a,b)=>{
    const wa=a.order&&a.order.res==='wood'?-60:0,wb=b.order&&b.order.res==='wood'?-60:0;
    return hyp(a.x-x,a.y-y)+wa-(hyp(b.x-x,b.y-y)+wb);}).slice(0,n);
}
function sendBuilders(b,list){for(const p of list){p.order={type:'build',id:b.id,back:p.order&&p.order.type==='gather'?p.order:null};p.path=null;p.stuck=0;}}
// ================================================================ orders (used by the player UI and by the AI)
function trainAt(b,k){
  const t=b.team,D=DEF[k];
  if(!b.built)return 'unbuilt';
  if(!unlocked(t,k))return 'era';
  if(b.queue.length>=5)return 'full';
  if(popUsed(t)+1>popCap(t))return 'pop';
  if(!afford(t,D.cost))return 'cost';
  pay(t,D.cost);b.queue.push(k);
  return 'ok';
}
function cancelTrain(b,i){const k=b.queue[i];if(!k)return;b.queue.splice(i,1);if(i===0)b.tp=0;refund(b.team,DEF[k].cost);}
function canPlace(team,k,tx,ty){
  const D=DEF[k];
  for(let y=0;y<D.h;y++)for(let x=0;x<D.w;x++)if(!placeTileOK(k,tx+x,ty+y,team))return false;
  if(k==='dock'){let w=0;for(let y=ty-1;y<=ty+D.h;y++)for(let x=tx-1;x<=tx+D.w;x++)if(inB(x,y)&&S.tiles[idx(x,y)]===WATER)w++;if(w<2)return false;}
  const e0=elev[idx(tx,ty)];for(let y=0;y<D.h;y++)for(let x=0;x<D.w;x++)if(elev[idx(tx+x,ty+y)]!==e0)return false;
  const cx=(tx+D.w/2)*TS,cy=(ty+D.h/2)*TS;
  for(const b of S.ents)if(!b.dead&&b.kind==='castle'&&b.team!==team&&hyp(cx-b.x,cy-b.y)<9*TS)return false;
  return true;
}
// demolish: a built building gives back half its cost, a foundation all of it
function demolish(b){
  if(!alive(b)||b.kind==='castle'||!DEF[b.kind].building)return false;
  const D=DEF[b.kind];
  if(D.cost&&b.team&&S.teams[b.team]){const f=b.built?.5:1;for(const k in D.cost)S.teams[b.team].res[k]+=Math.floor(D.cost[k]*f);}
  if(b.queue&&b.queue.length)for(const k of b.queue)refund(b.team,DEF[k].cost);
  b.queue=[];b.dead=true;occupy(b,false);
  if(b.kind==='pit'&&b.built){S.tiles[idx(b.tx,b.ty)]=GRASS;reachDirty=true;HOOK.tile(b.tx,b.ty);}
  if(b.kind==='bridge')recomputeBridges();
  for(let i=0;i<6;i++)FX.puffs.push({x:b.x+(Math.random()-.5)*D.w*TS,y:b.y-Math.random()*20,t:-Math.random()*.2,r:6+Math.random()*7});
  const c=campOf(b);if(c&&c.ally===b.team)c.ally=0;
  HOOK.sfx('boom',b.x,b.y,b.team);
  return true;
}
function canMoveTo(b,tx,ty){
  if(!alive(b))return false;
  occupy(b,false);const ok=canPlace(b.team,b.kind,tx,ty);occupy(b,true);
  return ok;
}
function moveBuilding(b,tx,ty){
  if(!canMoveTo(b,tx,ty))return false;
  const D=DEF[b.kind];
  for(let i=0;i<5;i++)FX.puffs.push({x:b.x+(Math.random()-.5)*D.w*TS,y:b.y-Math.random()*16,t:0,r:6+Math.random()*6});
  occupy(b,false);
  b.tx=tx;b.ty=ty;b.x=(tx+D.w/2)*TS;b.y=(ty+D.h)*TS;
  occupy(b,true);
  if(S.decor)S.decor=S.decor.filter(d=>!(d.tx!=null&&d.tx>=tx-1&&d.tx<tx+D.w+1&&d.ty>=ty-1&&d.ty<ty+D.h));
  for(let i=0;i<5;i++)FX.puffs.push({x:b.x+(Math.random()-.5)*D.w*TS,y:b.y-Math.random()*16,t:-.1,r:6+Math.random()*6});
  if(b.rally&&!b.rally.res)b.rally=null;
  return true;
}
// a straight wall line between two tiles, 4-connected so nothing slips through the corners
function wallLine(ax,ay,bx,by){
  const out=[];let x=ax,y=ay;const dx=Math.abs(bx-ax),dy=Math.abs(by-ay),sx=ax<bx?1:-1,sy=ay<by?1:-1;let err=dx-dy;
  out.push([x,y]);
  while((x!==bx||y!==by)&&out.length<40){
    const e2=2*err;
    if(e2>-dy&&(e2<dx?Math.abs(err-dy)<=Math.abs(err+dx):true)){err-=dy;x+=sx;}else{err+=dx;y+=sy;}
    out.push([x,y]);
  }
  return out;
}
const LINE_KINDS=['wall','pit','bridge'];
// which tiles of a line can take a piece (a bridge may grow from the piece placed just before it)
function lineOK(team,k,tiles){
  const ok=[],virt=new Set();
  for(const[x,y]of tiles){
    let v=canPlace(team,k,x,y);
    if(!v&&k==='bridge'&&virt.size&&inB(x,y)){const i=idx(x,y),t=S.tiles[i],o=occ[i]&&byId.get(occ[i]);
      if((t===WATER||t===PIT)&&!bridgeA[i]&&(!occ[i]||o&&o.kind==='pit'&&o.team===team&&o.built)&&[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>virt.has(idx(x+dx,y+dy))))v=true;}
    if(v)virt.add(idx(x,y));ok.push(v);
  }
  return ok;
}
function placeWall(team,tiles,builders,kind){
  const k=kind||'wall',made=[];
  for(const[x,y]of tiles){
    if(!canPlace(team,k,x,y))continue;
    if(!afford(team,DEF[k].cost))break;
    pay(team,DEF[k].cost);
    if(k==='bridge'&&occ[idx(x,y)]){const o=byId.get(occ[idx(x,y)]);if(o&&o.kind==='pit'){o.dead=true;occupy(o,false);}}
    made.push(spawnFixed(k,team,x,y,{built:false,prog:0,hp:1}));
  }
  builders.forEach((p,i)=>{const b=made[Math.floor(i*made.length/Math.max(1,builders.length))];if(b){p.order={type:'build',id:b.id,back:p.order&&p.order.type==='gather'?p.order:null};p.path=null;p.stuck=0;}});
  return made;
}
function wallToGate(w){
  if(!alive(w)||w.kind!=='wall')return 'no';
  const c={wood:22};if(!afford(w.team,c))return 'cost';
  pay(w.team,c);occupy(w,false);w.kind='gate';const f=w.hp/w.maxhp;w.maxhp=Math.round(DEF.gate.hp*bldMult(w.team));w.hp=Math.max(1,Math.round(w.maxhp*f));occupy(w,true);
  return 'ok';
}
function placeBuilding(team,k,tx,ty,builders){
  const D=DEF[k];
  if(!unlocked(team,k))return null;
  if(!canPlace(team,k,tx,ty)||!afford(team,D.cost))return null;
  pay(team,D.cost);
  const b=spawnFixed(k,team,tx,ty,{built:false,prog:0,hp:1});
  for(const p of builders){p.order={type:'build',id:b.id,back:p.order&&(p.order.type==='gather'||p.order.type==='build')?p.order:null};p.path=null;p.stuck=0;}
  return b;
}

