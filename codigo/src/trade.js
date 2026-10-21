// ================================================================ trade: neutral kingdoms, a free market and the delivery services
// Neutral towns (team 0) buy and sell with both kingdoms; prices follow their stock. Every trade travels by cart with an
// escort, bandits may ambush it on the road, the villagers and commanders ask before they go, and whoever comes back
// brings a report.
const TOWN_DEF=[
  {name:'Moinho',spec:'food',want:'wood',techs:['arado','rodas','botas'],arms:240,desc:'Vila de moleiros: vende comida barata e paga bem por madeira.'},
  {name:'Serraria',spec:'wood',want:'food',techs:['serra','cantaria','mapas'],arms:240,desc:'Vila de lenhadores: vende madeira barata e paga bem por comida.'},
  {name:'Ouroverde',spec:'gold',want:'arms',techs:['picareta','flechas','mapas'],arms:340,desc:'Cidade dos mercadores: paga caro por armas, aluga mercenários e vende conhecimento.'},
  {name:'Rochedo',spec:'gold',want:'food',techs:['cantaria','picareta','botas'],arms:290,desc:'Vila de mineiros nas pedras: rica em ouro, paga bem por comida e madeira.'},
];
const TECHS={
  arado:{name:'Arado de ferro',glyph:'⚒',desc:'Fazendas e coleta de comida 15% mais rápidas.'},
  serra:{name:'Serra de aço',glyph:'🪚',desc:'Corte de madeira 15% mais rápido.'},
  picareta:{name:'Picareta fina',glyph:'⛏',desc:'Mineração de ouro 15% mais rápida.'},
  flechas:{name:'Flechas de aço',glyph:'➶',desc:'Arqueiros e torres causam 12% mais dano.'},
  cantaria:{name:'Cantaria',glyph:'▦',desc:'Muralhas, portões e torres com 25% mais vida.'},
  rodas:{name:'Rodas reforçadas',glyph:'◎',desc:'Carroças 25% mais rápidas e 30% mais resistentes.'},
  mapas:{name:'Mapas das estradas',glyph:'🗺',desc:'Emboscadas na estrada 35% menos prováveis.'},
  botas:{name:'Botas de marcha',glyph:'👢',desc:'Soldados andam 8% mais rápido.'},
};
const SVC_NAME={contract:'Mensageiro',garrison:'Guarda da vila',embassy:'Embaixada',sell:'Venda',buy:'Compra',arms:'Transporte de armas',escort:'Escolta de mercador',supply:'Suprimentos para a tropa',merc:'Mercenários',soldiers:'Cessão de soldados',tech:'Compra de tecnologia',swap:'Troca de tecnologia'};
const ARMS_COST={wood:80,gold:40},MERC_COST={gold:260},CART_LOAD=200;
const FOLK=['Bento','Lia','Tomé','Inês','Joana','Duarte','Rui','Beatriz','Afonso','Leonor','Nuno','Teresa','Vasco','Clara','Gil','Mafalda','Álvaro','Isaura','Fernão','Brites','Martim','Urraca'];
function folkName(u){if(!u)return 'alguém';if(!u.nm)u.nm=FOLK[Math.floor(hash(u.id*31+7)*FOLK.length)];return u.nm;}
function rankedName(u){return (RANKS[u.rank||0]?RANKS[u.rank||0].n+' ':'')+folkName(u);}
const techHas=(t,k)=>!!(S.tech&&S.tech[t]&&S.tech[t][k]);
function techGather(t,res){return (res==='food'&&techHas(t,'arado'))||(res==='wood'&&techHas(t,'serra'))||(res==='gold'&&techHas(t,'picareta'))?1.15:1;}
function learnTech(team,k,from){
  S.tech=S.tech||{};S.tech[team]=S.tech[team]||{};if(S.tech[team][k])return false;S.tech[team][k]=1;
  for(const e of S.ents){
    if(e.dead||e.team!==team)continue;
    if(k==='cantaria'&&(e.kind==='wall'||e.kind==='gate'||e.kind==='tower')){e.maxhp=Math.round(e.maxhp*1.25);e.hp=Math.min(e.maxhp,e.hp*1.25);}
    if(k==='rodas'&&e.kind==='cart'){e.maxhp=Math.round(e.maxhp*1.3);e.hp=Math.min(e.maxhp,e.hp*1.3);}
  }
  if(team===1)HOOK.toast(`Nova tecnologia: ${TECHS[k].name}! ${TECHS[k].desc}`,'good');
  else if(team===2&&from)HOOK.toast(`O Reino Vermelho aprendeu ${TECHS[k].name} em ${from}.`,null);
  return true;
}
const repOf=(t,team)=>Math.min(5,Math.max(0,t.rep[team]||0));
const repStars=n=>{n=Math.floor(n);return '★'.repeat(n)+'☆'.repeat(5-n);};
// gold paid (or asked) for 100 of a resource: the fuller the town's stock, the cheaper it gets; reputation helps both ways
function townPrice(t,r,buy,team){
  const st=Math.max(40,t.stock[r]||450),f=Math.pow(500/st,.55),rep=repOf(t,team||1),side=typeof loyalTo==='function'&&loyalTo(t)===(team||1);
  return Math.round(clamp(buy?100*f*(1-.04*rep)*(side?.85:1):88*f*(1+.04*rep)*(side?1.12:1),buy?40:35,buy?200:200));
}
function armsPrice(t,team){return Math.round(t.arms*(1+.05*repOf(t,team||1)));}

// ---------------------------------------------------------------- the neutral towns on the map
function setupTowns(pc,rng,road){
  S.towns=[];S.tech=S.tech||{1:{},2:{}};
  const clearAround=(cx,cy)=>{for(let y=Math.floor(cy-4);y<=cy+4;y++)for(let x=Math.floor(cx-5);x<=cx+5;x++){if(!inB(x,y))continue;const i=idx(x,y);if(S.tiles[i]===TREE){S.tiles[i]=GRASS;S.wood[i]=0;}}};
  const make=(sp,ti)=>{
    const D=DEF.town,T=TOWN_DEF[ti],b=spawnFixed('town',0,sp.tx,sp.ty);
    const gate=nearestWalk(clamp(sp.tx+Math.floor(D.w/2),0,MW-1),clamp(sp.ty+D.h,0,MH-1))||[sp.tx+2,sp.ty+D.h];
    const t={id:b.id,i:S.towns.length,name:T.name,desc:T.desc,spec:T.spec,want:T.want,techs:T.techs.slice(),known:{},arms:T.arms,base:T.arms,rep:{1:0,2:0},
      stock:{wood:T.spec==='wood'?1100:T.want==='wood'?180:520,food:T.spec==='food'?1100:T.want==='food'?180:520},x:gate[0]*TS+16,y:gate[1]*TS+16};
    for(const k of t.techs)t.known[k]=1;
    S.towns.push(t);b.town=t.i;
    for(let g=0;g<3;g++){const a=-.6+g*.6,w=nearestWalk(clamp(tileOf(t.x+Math.sin(a)*70),0,MW-1),clamp(tileOf(t.y+10+Math.cos(a)*14),0,MH-1));if(w)spawnUnit('guard',0,w[0]*TS+16,w[1]*TS+16,{home:{x:w[0]*TS+16,y:w[1]*TS+16},town:t.i,face:g?-1:1});}
  };
  // a pair on the flanks (mirrored, so both kingdoms have one near home) and the big market town in the middle
  const fx=pc.x+Math.round(MW*.17),fy=pc.y+(rng()<.5?-1:1)*Math.round(MH*.2);
  clearAround(fx,fy);clearAround(MW-fx,fy);computeReach();
  let sp=campSpot('town',fx,fy,true,road);
  if(sp.length<2){clearAround(fx,MH-fy);clearAround(MW-fx,MH-fy);computeReach();sp=campSpot('town',fx,pc.y*2-fy,true,road);}
  if(sp.length===2){make(sp[0],0);make(sp[1],1);}
  let ry=MH/2;for(let d=0;d<MH/2;d++){if(road.has(idx(Math.floor(MW/2),Math.floor(MH/2+d)))){ry=MH/2+d;break;}if(road.has(idx(Math.floor(MW/2),Math.floor(MH/2-d)))){ry=MH/2-d;break;}}
  // the big market town north of the crossroads and, on a big island, a mining town to the south; both with gold nearby
  const far=sp=>S.towns.every(t=>hyp(t.x/TS-(sp.tx+2.5),t.y/TS-(sp.ty+3))>=15);
  const centre=(offs,ti)=>{for(const dx of[0,-7,7])for(const off of offs){const cy=ry+off,cx=MW/2+dx;if(cy<5||cy>MH-6)continue;clearAround(cx,cy);computeReach();const s2=campSpot('town',cx,cy,false,road);if(s2.length&&far(s2[0])){make(s2[0],ti);
    const g=campSpot('gold',cx+(off<0?-5:5),cy+(off<0?-4:4),false,road);if(g.length)spawnFixed('gold',0,g[0].tx,g[0].ty);return true;}}return false;};
  centre([-7,-10,-13,-16,7,10],2);
  if(MW*MH>8000)centre([9,12,15,18,-18,-21],3);
}
function neutralBrain(u){
  if(!u.home)u.home={x:u.x,y:u.y};
  const t=S.towns&&S.towns[u.town],cx=t?t.x:u.home.x,cy=t?t.y:u.home.y;
  let best=null,bd=280;
  forNear(cx,cy,280,e=>{if(e.dead||e.team!==3||!DEF[e.kind].unit)return;const d=hyp(e.x-cx,e.y-cy);if(d<bd){bd=d;best=e;}});
  if(best){u.order={type:'attack',id:best.id,auto:true,ax:u.home.x,ay:u.home.y};return;}
  if(hyp(u.x-u.home.x,u.y-u.home.y)>30){
    // a guard who cannot get back to his post takes a new post where he stands
    if(S.t<(u.homeT||0))return;u.homeT=S.t+6;u.homeTry=(u.homeTry||0)+1;
    if(u.homeTry>3){u.home={x:u.x,y:u.y};u.homeTry=0;return;}
    u.order={type:'move',x:u.home.x,y:u.home.y};
  }else u.homeTry=0;
}
// stocks drift: each town makes its specialty and uses up what it wants
function updTowns(){
  for(const t of S.towns||[]){
    for(const r of['wood','food']){
      const s=t.stock[r];
      if(t.spec===r)t.stock[r]=Math.min(1400,s+5);
      else if(t.want===r)t.stock[r]=Math.max(60,s-4);
      else t.stock[r]=s+(s<520?2:s>520?-2:0);
    }
    if(t.arms<t.base)t.arms=Math.min(t.base,t.arms+1);
  }
}

// ---------------------------------------------------------------- missions
const SVC_ACTIVE=m=>m.state==='run';
function svcList(){S.svc=S.svc||{list:[],log:[],n:0,offerT:70,cd:{}};return S.svc;}
function svcSlots(team){return 1+Math.floor(eraOf(team)/2);}
function svcActive(team){return svcList().list.filter(m=>m.team===team&&SVC_ACTIVE(m)&&m.type!=='contract').length;}
function walkNear(x,y){const w=nearestWalk(clamp(tileOf(x),0,MW-1),clamp(tileOf(y),0,MH-1));return w?{x:w[0]*TS+16,y:w[1]*TS+16}:{x,y};}
function homePoint(team){
  const mk=BLDS.find(b=>!b.dead&&b.team===team&&b.kind==='market'&&b.built),c=mk||castleOf(team);if(!c)return null;
  const r=rectOf(c);const p=walkNear(r[0]+r[2]/2,r[1]+r[3]+20);p.id=c.id;return p;
}
function townPoint(t){return {x:t.x,y:t.y,town:t.i};}
// chance of an ambush on a loaded stretch of road
function svcRisk(m,esc){
  const d=hyp(m.to.x-m.from.x,m.to.y-m.from.y)/TS;
  let r=.16+d*.011+(m.type==='arms'?.25:0)+((m.value||0)>350?.1:0)-.08*(esc??m.escN??0);
  if(m.type==='soldiers'||m.type==='merc')r-=.08;
  // a road that ends next to the enemy castle is dangerous whatever the bandits do
  const foe=castleOf(m.team===1?2:1);if(foe&&hyp(m.to.x-foe.x,m.to.y-foe.y)<24*TS)r+=.2;
  if(techHas(m.team,'mapas'))r*=.65;
  return clamp(r,.05,.85);
}
const riskName=r=>r<.25?'baixo':r<.5?'médio':'alto';
function etaOf(m){const d=hyp(m.to.x-m.from.x,m.to.y-m.from.y)*1.35;return d/(DEF.cart.speed*(techHas(m.team,'rodas')?1.25:1));}
function fmtT(s){s=Math.max(0,Math.round(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}
function freeSoldiers(team,x,y){
  const out=[];
  for(const u of S.ents){
    if(u.dead||u.team!==team||u.aboard)continue;const D=DEF[u.kind];
    if(!D.unit||!D.mil||D.holy||D.mech||D.king||D.naval||D.healer||u.hero||u.medic||u.svc||u.wave||u.ally)continue;
    const o=u.order;if(o&&(o.type==='attack'||o.type==='flee'||o.type==='rest'||o.type==='board'))continue;
    if(team===1&&u.cmdT&&S.t-u.cmdT<20)continue;
    if(threatNear(u.x,u.y,team,220))continue;
    out.push(u);
  }
  out.sort((a,b)=>hyp(a.x-x,a.y-y)-hyp(b.x-x,b.y-y));
  return out;
}
// a mission: who asks, what goes where, what it pays, and the stretches of road (legs) it takes
function svcNew(type,team,o){
  const L=svcList(),T=o.town!=null&&S.towns?S.towns[o.town]:null,home=homePoint(team);if(!home)return null;
  const m={id:++L.n,type,team,town:o.town,state:'offer',who:o.who||'Tropeiro',av:o.av||'av05',esc:[],escN:o.escN??2,stats:{amb:[],killed:0,fled:0,lost:[]},from:home,to:T?townPoint(T):home,cost:o.cost||{},value:o.value||0};
  Object.assign(m,o.extra||{});
  if(type==='sell'){m.load={k:o.res,n:o.n};m.cost={[o.res]:o.n};m.pay={gold:Math.round(townPrice(T,o.res,false,team)*o.n/100)};m.value=m.pay.gold;}
  else if(type==='buy'){m.load=null;m.goods={k:o.res,n:o.n};m.cost={gold:Math.round(townPrice(T,o.res,true,team)*o.n/100)};m.value=o.n;}
  else if(type==='arms'){m.load={k:'arms',n:1};m.cost=Object.assign({},ARMS_COST);m.pay={gold:armsPrice(T,team)};m.value=m.pay.gold;m.escN=Math.max(m.escN,3);}
  else if(type==='tech'){const r=T.want==='arms'?'gold':T.want;m.load={k:r,n:Math.round((r==='gold'?180:250)*(T.disc||1))};m.cost={[r]:m.load.n};m.tech=o.tech;m.value=250;}
  else if(type==='swap'){m.load={k:'scroll',n:1};m.cost={};m.tech=o.tech;m.give=o.give;m.value=120;m.escN=Math.min(m.escN,1);}
  else if(type==='escort'){const B=S.towns[o.town2];m.town2=o.town2;m.from=townPoint(T);m.to=townPoint(B);m.pay={gold:Math.round(80+hyp(B.x-T.x,B.y-T.y)/TS*3)};m.value=300;m.load=null;}
  else if(type==='supply'){m.load={k:'supply',n:1};m.cost={food:100,gold:40};m.cmdId=o.cmdId;const c=byId.get(o.cmdId);m.to=c?{x:c.x,y:c.y}:home;m.value=140;m.escN=Math.min(m.escN,1);}
  else if(type==='merc'){m.cost=Object.assign({},MERC_COST);m.from=townPoint(T);m.to=home;m.value=200;m.escN=0;}
  else if(type==='soldiers'){m.ids=o.ids;m.pay={gold:o.pay};m.value=100;m.escN=0;}
  else if(type==='garrison'){m.pay={gold:150};m.value=60;m.escN=0;}
  else if(type==='embassy'){m.cost={gold:60};m.value=60;m.escN=0;}
  m.risk=svcRisk(m);m.eta=etaOf(m)*(type==='merc'||type==='soldiers'?.8:2)+20;
  if(type==='garrison')m.eta+=150;
  if(type==='escort')m.eta=(hyp(m.from.x-home.x,m.from.y-home.y)/58+hyp(m.to.x-m.from.x,m.to.y-m.from.y)/DEF.cart.speed)*1.4+40;
  return m;
}
// what each kind of service does, stretch by stretch
function svcLegs(m){
  const home='home',town='town';
  switch(m.type){
    case 'sell':case 'arms':return [{to:town,amb:true,act:'drop'},{to:home,act:'home'}];
    case 'tech':return [{to:town,amb:true,act:'learn'},{to:home,act:'home'}];
    case 'swap':return [{to:town,amb:true,act:'swap'},{to:home,act:'home'}];
    case 'buy':return [{to:town,act:'load'},{to:home,amb:true,act:'unload'}];
    case 'escort':return [{to:'A',act:'meet',walk:true},{to:'B',amb:true,act:'merchant'},{to:home,act:'home',walk:true}];
    case 'supply':return [{to:'cmd',amb:true,act:'supply'},{to:home,act:'home'}];
    case 'merc':return [{to:home,amb:true,act:'arrive',walk:true}];
    case 'soldiers':return [{to:town,amb:true,act:'enlist',walk:true}];
    case 'garrison':return [{to:town,act:'stay',walk:true},{to:town,act:'stayend',walk:true,stay:true},{to:home,act:'home',walk:true}];
    case 'embassy':return [{to:town,amb:true,act:'visit',walk:true},{to:home,act:'home',walk:true}];
    case 'contract':return [{to:town,amb:true,act:'propose',walk:true},{to:home,act:'home',walk:true}];
  }
  return [];
}
function legPoint(m,L){
  const T=S.towns&&S.towns[m.town];
  if(L.to==='home'){const h=homePoint(m.team)||m.from;return h;}
  if(L.to==='town'||L.to==='A')return T?townPoint(T):m.to;
  if(L.to==='B')return townPoint(S.towns[m.town2]);
  if(L.to==='cmd'){const c=byId.get(m.cmdId);if(alive(c))m.to={x:c.x,y:c.y};return m.to;}
  return m.to;
}
// the player said yes (or ordered it at the town): pay, pick the escort, load the cart and go
function svcStart(m){
  const T=S.teams[m.team];
  if(svcActive(m.team)>=svcSlots(m.team))return 'slots';
  if(m.type==='soldiers'){m.ids=(m.ids||[]).filter(id=>alive(byId.get(id)));if(!m.ids.length)return 'nobody';}
  if(m.type==='escort'&&freeSoldiers(m.team,m.from.x,m.from.y).length<1)return 'noescort';
  if(!afford(m.team,m.cost))return 'cost';
  pay(m.team,m.cost);
  const L=svcList();if(!L.list.includes(m))L.list.push(m);
  m.state='run';m.t0=S.t;m.deadline=S.t+m.eta;m.legs=svcLegs(m);m.leg=0;
  const home=homePoint(m.team)||m.from;
  // the escort: the free soldiers closest to where the convoy starts
  const startP=m.type==='escort'?home:m.type==='merc'?home:m.from;
  if(m.escN>0)for(const u of freeSoldiers(m.team,startP.x,startP.y).slice(0,m.escN))svcJoin(m,u);
  if(m.type==='merc'){
    const T0=S.towns[m.town];m.ids=[];
    for(let i=0;i<3;i++){const p=walkNear(T0.x+(i-1)*24,T0.y+14);const u=spawnUnit('merc',m.team,p.x,p.y,{svc:m.id});u.nm=FOLK[(m.id*3+i)%FOLK.length];m.ids.push(u.id);}
    m.lead=m.ids[0];for(const id of m.ids.slice(1))svcJoin(m,byId.get(id));
  }else if(m.type==='soldiers'){
    m.lead=m.ids[0];for(const id of m.ids){const u=byId.get(id);u.svc=m.id;u.path=null;}for(const id of m.ids.slice(1))svcJoin(m,byId.get(id));
  }else if(m.type==='garrison'){
    const sol=freeSoldiers(m.team,m.from.x,m.from.y).slice(0,3);if(sol.length<2){refund(m.team,m.cost);L.list.splice(L.list.indexOf(m),1);m.state='declined';return 'noescort';}
    m.ids=sol.map(u=>u.id);m.lead=m.ids[0];sol[0].svc=m.id;for(const u of sol.slice(1))svcJoin(m,u);m.escCount=sol.length;m.bossName=rankedName(sol.sort((a,b)=>(b.rank||0)-(a.rank||0))[0]);
  }else if(m.type==='embassy'||m.type==='contract'){
    const sc=m.type==='contract'&&m.scoutId&&byId.get(m.scoutId);
    if(alive(sc)&&!sc.svc&&sc.team===m.team){sc.svc=m.id;sc.order=null;sc.path=null;m.lead=sc.id;m.ids=[sc.id];m.driver=`${RANKS[sc.rank||0].n} ${folkName(sc)}`;m.byScout=true;}
    else{const p=walkNear(m.from.x,m.from.y),d=spawnUnit('diplomat',m.team,p.x,p.y,{svc:m.id});d.nm=['Dom Gil','Dona Inês','Mestre Rui','Dona Beatriz'][m.id%4];m.lead=d.id;m.ids=[d.id];m.driver=d.nm;}
  }else if(m.type==='escort'){
    const lead=m.esc.map(id=>byId.get(id)).find(alive);m.lead=lead?lead.id:0;
  }else{
    const p=walkNear(m.from.x,m.from.y),c=spawnUnit('cart',m.team,p.x,p.y,{mid:m.id,load:m.load?Object.assign({},m.load):null,face:m.to.x<p.x?-1:1});
    c.nm=FOLK[(m.id*7)%FOLK.length];m.cart=c.id;m.lead=c.id;m.driver=c.nm;
  }
  svcLeg(m);
  if(m.team===1)HOOK.svc('start',m);
  return 'ok';
}
function svcJoin(m,u){if(!alive(u))return;u.svc=m.id;u.order={type:'escort',mid:m.id,slot:m.esc.length};u.path=null;if(!m.esc.includes(u.id))m.esc.push(u.id);m.escCount=(m.escCount||0)+(DEF[u.kind].mil&&u.kind!=='merc'?1:0);m.boss=bossOf(m);const b=byId.get(m.boss);if(b)m.bossName=rankedName(b);}
function bossOf(m){let b=null;for(const id of m.esc){const u=byId.get(id);if(alive(u)&&(!b||(u.rank||0)>(b.rank||0)))b=u;}return b?b.id:0;}
function svcLeg(m){
  const L=m.legs[m.leg],lead=byId.get(m.lead);if(!L)return;
  const p=legPoint(m,L);L.len=lead?Math.max(1,hyp(p.x-lead.x,p.y-lead.y)):1;L.t0=S.t;
  L.roll=L.amb&&Math.random()<svcRisk(m,m.esc.filter(id=>alive(byId.get(id))).length);L.at=.3+Math.random()*.4;L.done=false;
  if(lead){lead.order=lead.kind==='cart'?{type:'convoy',mid:m.id}:{type:'escort',mid:m.id,lead:true};lead.path=null;}
}
function svcEsc(m){return m.esc.map(id=>byId.get(id)).filter(u=>alive(u)&&u.svc===m.id);}
// the cart keeps to the road and waits for its escort when it falls behind
function doConvoy(u,dt){
  const m=svcList().list.find(q=>q.id===u.order.mid);
  if(!m||m.state!=='run'||m.lead!==u.id){u.order=null;return;}
  const L=m.legs[m.leg];if(!L){u.order=null;return;}
  const p=legPoint(m,L);
  const esc=svcEsc(m);
  if(esc.length&&!esc.some(e=>hyp(e.x-u.x,e.y-u.y)<170)){u.wait=(u.wait||0)+dt;if(u.wait<5){u.moving=false;return;}}else u.wait=0;
  if(hyp(u.x-p.x,u.y-p.y)<46){u.path=null;u.moving=false;return;}
  u.rp=(u.rp||0)-dt;
  if((!u.path&&!u.detour)||u.rp<=0){u.rp=L.to==='cmd'?1.2:4;if(pathToPoint(u,p.x,p.y,false)===0){u.stuckSvc=(u.stuckSvc||0)+1;}}
  followPath(u,dt);
}
// escorts walk beside the cart and fight whatever threatens it; on foot stretches one of them leads
function doEscort(u,dt){
  const o=u.order,m=svcList().list.find(q=>q.id===o.mid);
  if(!m||m.state!=='run'||u.svc!==m.id){u.order=null;u.svc=null;return;}
  const lead=byId.get(m.lead);
  if(lead===u){
    const L=m.legs[m.leg];if(!L){u.order=null;return;}const p=legPoint(m,L);
    const th=threatNear(u.x,u.y,u.team,180);
    if(th&&DEF[u.kind].mil&&m.type!=='soldiers'){u.order={type:'attack',id:th.id,auto:true,ax:u.x,ay:u.y,back:{type:'escort',mid:m.id,lead:true}};u.path=null;return;}
    if(hyp(u.x-p.x,u.y-p.y)<40){u.path=null;u.moving=false;return;}
    u.rp=(u.rp||0)-dt;if((!u.path&&!u.detour)||u.rp<=0){u.rp=3;pathToPoint(u,p.x,p.y,false);}
    followPath(u,dt);return;
  }
  if(!alive(lead)){u.moving=false;return;}
  const th=threatNear(lead.x,lead.y,u.team,200);
  if(th){u.order={type:'attack',id:th.id,auto:true,ax:lead.x,ay:lead.y,back:{type:'escort',mid:m.id,slot:o.slot}};u.path=null;return;}
  const a=(o.slot||0)*2.1+1.2,tx=lead.x-(lead.face||1)*18+Math.cos(a)*30,ty=lead.y+Math.sin(a)*18;
  const d=hyp(u.x-tx,u.y-ty);
  if(d<14){u.path=null;u.moving=false;u.face=lead.face;return;}
  u.rp=(u.rp||0)-dt;
  if(d<90&&walkPt(tx,ty)){u.path=[{x:tx,y:ty}];}
  else if((!u.path&&!u.detour)||u.rp<=0){u.rp=1;pathToPoint(u,tx,ty,false);}
  followPath(u,dt);
}
// bandits come out of the trees ahead of the convoy
function svcAmbush(m,lead,dest){
  const ang0=Math.atan2(dest.y-lead.y,dest.x-lead.x);let spot=null,best=-1;
  for(let k=0;k<70;k++){
    const a=ang0+(Math.random()-.5)*2.4,r=(5.5+Math.random()*3.5)*TS,x=lead.x+Math.cos(a)*r,y=lead.y+Math.sin(a)*r,tx=tileOf(x),ty=tileOf(y);
    if(!inB(tx,ty)||!walkXY(tx,ty)||!reachT(tx,ty))continue;
    let s=Math.random();for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(inB(tx+dx,ty+dy)&&S.tiles[idx(tx+dx,ty+dy)]===TREE)s+=.4;
    if(S.towns&&S.towns.some(t=>hyp(t.x-x,t.y-y)<8*TS))continue;
    if(s>best){best=s;spot={x:tx*TS+16,y:ty*TS+16};}
  }
  if(!spot)return;
  const mult={normal:.8,dificil:1,insano:1.25}[S.diff.key]||1;
  const n=Math.round(clamp((1+(m.value||150)/240+S.t/400)*mult,2,8));
  const pool=S.t>900?['bandit','bandit','banditA','chief','banditA']:S.t>420?['bandit','banditA','bandit','banditA']:['bandit','bandit','banditA'];
  const party=[];
  for(let i=0;i<n;i++){
    const k=pool[i%pool.length]==='chief'&&party.some(p=>p.kind==='chief')?'bandit':pool[i%pool.length];
    const u=spawnUnit(k,3,spot.x+(Math.random()-.5)*44,spot.y+(Math.random()-.5)*36,{amb:m.id,roam:true});
    // half go for the cart, the rest tie up the escort
    const esc=svcEsc(m),t=i%2&&esc.length?esc[i%esc.length]:lead;
    u.order={type:'attack',id:t.id,raid:true};party.push(u);
  }
  m.stats.amb.push({n,t:S.t});m.ambIds=(m.ambIds||[]).concat(party.map(u=>u.id));
  if(m.team===1)HOOK.ambush(m,party[0]);
}
// bandits who got the cart run away with the loot and leave the map
function svcBandits(){
  for(const u of S.ents){
    if(u.dead||!(u.amb||u.leaveAt))continue;
    const m=u.amb?svcList().list.find(q=>q.id===u.amb):null;
    const lead=m&&byId.get(m.lead);
    const go=u.amb?(!m||m.state!=='run'||!alive(lead)||(m.ambIds&&m.ambIds.filter(id=>alive(byId.get(id))).length<=1&&m.ambIds.length>=3)):S.t>u.leaveAt;
    if(!u.leave&&go){
      u.leave=S.t;const ex=u.x<MW*TS/2?2*TS:(MW-2)*TS,ey=u.y;const p=walkNear(ex,ey);u.order={type:'move',x:p.x,y:p.y};u.path=null;
      if(m&&alive(lead)===false)u.loot=true;
    }
    if(u.leave&&(S.t-u.leave>75||u.x<3*TS||u.x>(MW-3)*TS)){u.dead=true;if(m&&!u.counted){u.counted=true;m.stats.fled++;}}
  }
}
function svcOnDeath(t,src){
  const L=svcList();
  if(t.amb){const m=L.list.find(q=>q.id===t.amb);if(m&&!t.counted){t.counted=true;m.stats.killed++;}}
  if(t.svc){const m=L.list.find(q=>q.id===t.svc);if(m&&(t.team===m.team))m.stats.lost.push(`${unitName(t).toLowerCase()} ${folkName(t)}`);}
  if(t.kind==='cart'&&t.mid){const m=L.list.find(q=>q.id===t.mid);if(m)m.killer=src&&src.team||0;}
  if(t.kind==='cart'&&t.load&&src&&src.team&&src.team!==t.team&&S.teams[src.team]&&(src.team===1||src.team===2)){
    const T=S.teams[src.team],k=t.load.k,g=k==='wood'||k==='food'||k==='gold'?{[k]:Math.round(t.load.n*.5)}:{gold:k==='arms'?110:40};
    for(const r in g){T.res[r]+=g[r];T.stats[r]+=g[r];}
    if(src.team===1){FX.floats.push({x:t.x,y:t.y-40,txt:'Saque! '+Object.entries(g).map(([r,v])=>`+${v} ${RES_NAME[r]}`).join(' '),col:'#ffe066',t:0});HOOK.toast(`Vocês saquearam uma carroça do Reino Vermelho: ${Object.entries(g).map(([r,v])=>`${v} de ${RES_NAME[r]}`).join(', ')}.`,'good',{x:t.x,y:t.y});}
  }
}
function removeQuiet(u){if(u&&!u.dead){u.dead=true;if(isFixed(u))occupy(u,false);}}
// each tick: move the missions along, trigger ambushes, settle arrivals
function svcUpdate(dt){
  const L=svcList();
  for(const m of L.list){
    if(m.state!=='run')continue;
    const legs=m.legs,lg=legs[m.leg];if(!lg){svcDone(m,true);continue;}
    let lead=byId.get(m.lead);
    if(!alive(lead)||(lead.kind!=='cart'&&lead.svc!==m.id)){
      if(m.cart&&m.lead===m.cart){svcFail(m,'cart');continue;}
      // on foot: the next one takes the lead
      const next=svcEsc(m).concat((m.ids||[]).map(id=>byId.get(id)).filter(u=>alive(u)&&u.svc===m.id))[0];
      if(!next){svcFail(m,'all');continue;}
      m.esc=m.esc.filter(id=>id!==next.id);m.lead=next.id;lead=next;lead.order={type:'escort',mid:m.id,lead:true};lead.path=null;
    }
    // whoever lost their orders (a fight, the enemy AI, a hiccup) gets them back
    if(lead.kind==='cart'){if(!lead.order||lead.order.type!=='convoy')lead.order={type:'convoy',mid:m.id};}
    else if(!lead.order||(lead.order.type!=='escort'&&lead.order.type!=='attack')){lead.order={type:'escort',mid:m.id,lead:true};lead.path=null;}
    svcEsc(m).forEach((u,i)=>{if(u!==lead&&(!u.order||(u.order.type!=='escort'&&u.order.type!=='attack'))){u.order={type:'escort',mid:m.id,slot:i};u.path=null;}});
    const p=legPoint(m,lg),d=hyp(lead.x-p.x,lead.y-p.y);
    if(lg.amb&&!lg.done&&lg.len>0&&1-d/lg.len>=lg.at){lg.done=true;if(lg.roll)svcAmbush(m,lead,p);}
    if(lg.stay&&S.t<(m.stayUntil||0)){continue;}
    if(d<56&&!threatNear(lead.x,lead.y,m.team,150)){
      lg.wait=(lg.wait||0)+dt;if(lg.wait<2.5){lead.moving=false;continue;}
      svcArrive(m,lg,lead);
    }else if(S.t-m.t0>m.eta+300){svcFail(m,'stuck');}
  }
  // the board keeps only what is still useful
  if(L.list.length>30)L.list=L.list.filter(m=>m.state==='run'||m.state==='offer');
}
function svcArrive(m,lg,lead){
  const T=S.towns&&S.towns[m.town],team=m.team,TT=S.teams[team],late=S.t>m.deadline;
  const give=(g,why)=>{for(const r in g){const v=Math.round(g[r]*(late?.7:1));TT.res[r]+=v;TT.stats[r]+=v;m.got=(m.got||[]).concat(`${v} de ${RES_NAME[r]||r}`);}
    if(team===1){FX.floats.push({x:lead.x,y:lead.y-40,txt:Object.entries(g).map(([r,v])=>`+${Math.round(v*(late?.7:1))} ${RES_NAME[r]}`).join(' '),col:'#ffe066',t:0});HOOK.svc('paid',m,why);}};
  const cart=byId.get(m.cart);
  switch(lg.act){
    case 'drop':
      if(m.load.k==='arms')T.arms=Math.max(150,T.arms-45);else T.stock[m.load.k]+=m.load.n;
      give(m.pay);T.rep[team]=(T.rep[team]||0)+1;if(cart)cart.load=null;m.delivered=true;break;
    case 'load':T.stock[m.goods.k]=Math.max(40,T.stock[m.goods.k]-m.goods.n);if(cart)cart.load=Object.assign({},m.goods);break;
    case 'unload':give({[m.goods.k]:m.goods.n});m.delivered=true;T.rep[team]=(T.rep[team]||0)+1;if(cart)cart.load=null;svcDone(m,true);return;
    case 'learn':T.stock[m.load.k]=(T.stock[m.load.k]||0)+(m.load.k==='gold'?0:m.load.n);learnTech(team,m.tech,T.name);m.got=[TECHS[m.tech].name];T.rep[team]=(T.rep[team]||0)+1;if(cart)cart.load=null;m.delivered=true;break;
    case 'swap':learnTech(team,m.tech,T.name);T.known[m.give]=1;if(!T.techs.includes(m.give))T.techs.push(m.give);m.got=[TECHS[m.tech].name];T.rep[team]=(T.rep[team]||0)+1;if(cart)cart.load=null;m.delivered=true;break;
    case 'meet':{
      // the merchant joins: his cart now travels with our escort
      const pp=walkNear(T.x,T.y+10),c=spawnUnit('cart',team,pp.x,pp.y,{mid:m.id,load:{k:'silk',n:1},neutralCart:true});c.nm='mercador de '+T.name;
      m.cart=c.id;m.driver=c.nm;for(const id of m.esc)if(id===lead.id){const u=byId.get(id);u.order={type:'escort',mid:m.id,slot:0};}
      m.lead=c.id;break;}
    case 'merchant':{const B=S.towns[m.town2];give(m.pay);T.rep[team]=(T.rep[team]||0)+1;B.rep[team]=(B.rep[team]||0)+1;m.delivered=true;
      removeQuiet(cart);m.cart=0;const nx=svcEsc(m)[0];if(!nx){svcDone(m,true);return;}m.lead=nx.id;m.esc=m.esc.filter(id=>id!==nx.id);break;}
    case 'supply':{
      let n=0;for(const e of S.ents){if(e.dead||e.team!==team||!DEF[e.kind].mil||!healable(e)||hyp(e.x-lead.x,e.y-lead.y)>280)continue;e.supT=S.t+150;n++;}
      m.got=[`${n} soldados abastecidos: +15% de dano e cura por 2 minutos e meio`];m.delivered=true;if(cart)cart.load=null;
      if(team===1)HOOK.svc('supply',m,n);break;}
    case 'stay':m.stayUntil=S.t+120;break;
    case 'stayend':if(S.t<m.stayUntil)return;give(m.pay);addRep(T,team,1);m.delivered=true;m.got=[`${m.pay.gold} de ouro`];break;
    case 'visit':{
      const inv=T.invite&&S.t<T.invite;T.invite=0;addRep(T,team,inv?1.6:1);m.delivered=true;
      const f=friendOf(T,team);
      if(f>=5&&!T.disc){T.disc=.8;m.got=[`a amizade mais alta: 20% de desconto em tecnologia em ${T.name}`];}
      else if(f>=4){m.got=[`a promessa de ajuda de graça se formos atacados`];}
      else m.got=[`a amizade de ${T.name} (agora: ${FRIEND[f]})`];
      break;}
    case 'propose':{
      const t=m.terms;m.delivered=true;
      if(t.kind==='help'){const r=askHelp(team,T.i,t.foe,t.p);m.helpRes=r.kind;m.got=[r.kind==='free'?`${r.n} guardas de graça`:r.kind==='paid'?`uma proposta: ${r.n} guardas por ${r.cost.gold} de ouro`:'uma recusa'];
        if(r.kind==='paid'){if(team===1)ask({kind:'help',town:T.i,foe:t.foe,p:t.p,terms:r,cost:r.cost,who:`${T.name} responde ao mensageiro`,av:'av14',text:`Podemos mandar ${r.n} guardas, mas a guerra não é nossa: pedimos ${r.cost.gold} de ouro pela ajuda. (Amizade: ${FRIEND[friendOf(T,team)]})`,loc:t.p});else if(afford(2,r.cost))payHelp(2,T.i,t.foe,t.p,r);}
        HOOK.ctr('helpAnswer',{team,town:T.i},r);break;}
      const d=townDecide(T,team,t);m.decision=d;
      if(d.ok){const c=ctrActivate(team,t);m.ctrId=c.id;m.got=[CTR[t.kind].name];}
      else if(d.counter){
        m.got=[`uma contraproposta: ${d.counter.gold} de ouro`];
        if(team===1)ask({kind:'counter',town:T.i,terms:t,price:d.counter,outbid:d.outbid,who:`${T.name} responde ao mensageiro`,av:'av14',text:`${d.why} Pedem ${d.counter.gold} de ouro por: ${CTR[t.kind].name}. Fechar?`,cost:d.counter,loc:{x:T.x,y:T.y}});
        else if(afford(2,d.counter)&&d.counter.gold<=S.teams[2].res.gold*.6){t.cost=d.counter;t.raised=true;if(d.outbid)t.outbid=d.outbid;ctrActivate(2,t);}
      }else m.failedWhy=d.why;
      if(team===1)HOOK.ctr('answer',{team,town:T.i,terms:t},d);
      break;}
    case 'arrive':for(const id of m.ids||[]){const u=byId.get(id);if(alive(u)){u.svc=null;u.order=null;}}m.delivered=true;svcDone(m,true);return;
    case 'enlist':{
      let n=0;for(const id of m.ids){const u=byId.get(id);if(!alive(u))continue;const g=spawnUnit('guard',0,u.x,u.y,{home:{x:u.x,y:u.y},town:m.town});g.nm=folkName(u);removeQuiet(u);n++;}
      const pay=Math.round(m.pay.gold*n/Math.max(1,m.ids.length));give({gold:pay});T.rep[team]=(T.rep[team]||0)+1;m.delivered=true;m.enlisted=n;svcDone(m,true);return;}
    case 'home':svcDone(m,!m.failed);return;
  }
  m.leg++;
  if(m.leg>=m.legs.length){svcDone(m,true);return;}
  svcLeg(m);
}
function svcFail(m,why){
  m.failed=why;m.delivered=m.delivered||false;
  const T=S.towns&&S.towns[m.town];if(T&&!m.delivered)T.rep[m.team]=Math.max(0,(T.rep[m.team]||0)-1);
  // the survivors walk home before telling what happened
  const esc=svcEsc(m);
  if(esc.length&&why!=='stuck'){m.lead=esc[0].id;m.esc=m.esc.filter(id=>id!==esc[0].id);m.legs=[{to:'home',act:'home',walk:true}];m.leg=0;svcLeg(m);if(m.team===1)HOOK.svc('lost',m,why);return;}
  svcDone(m,false);
}
function svcDone(m,ok){
  if(m.state!=='run')return;
  m.state='done';m.ok=ok&&!m.failed;m.t1=S.t;
  const cand=[byId.get(m.boss),...svcEsc(m),byId.get(m.lead)].find(u=>alive(u));
  const T0=S.towns&&S.towns[m.town];
  const reporter=m.type==='soldiers'&&T0?{kind:'pawn',x:T0.x,y:T0.y,id:0,rank:0,nm:`Mensageiro de ${T0.name}`,mil:false}:cand?{kind:cand.kind,x:cand.x,y:cand.y,id:cand.kind==='cart'?0:cand.id,rank:cand.rank||0,nm:folkName(cand),mil:!!DEF[cand.kind].mil}:null;
  const cart=byId.get(m.cart);if(cart&&cart.mid===m.id)removeQuiet(cart);
  for(const id of m.esc.concat(m.ids||[],[m.lead])){const u=byId.get(id);if(alive(u)&&u.svc===m.id){u.svc=null;if(u.order&&(u.order.type==='escort'||u.order.type==='convoy'))u.order=null;}}
  if(m.team===1)svcReport(m,reporter);
}
// the report brought home by whoever came back
function svcReport(m,rep){
  const T=S.towns&&S.towns[m.town],B=m.town2!=null&&S.towns?S.towns[m.town2]:null,dur=(m.t1||S.t)-m.t0;
  const lines=[];
  const route=m.type==='escort'?`de ${T.name} até ${B.name}`:m.type==='merc'?`de ${T.name} até o castelo`:m.type==='supply'?'até a tropa na frente':T?`até ${T.name}`:'';
  lines.push(`${SVC_NAME[m.type]} ${route}. Duração ${fmtT(dur)} (prazo ${fmtT(m.eta)}${dur>m.eta?', atrasamos':''}).`);
  const escN=m.escCount||0;
  if(m.type==='merc')lines.push(`Três mercenários vieram a pé de ${T.name}.`);
  else if(m.type==='garrison')lines.push(`${m.escCount||m.ids.length} soldados guardaram ${T.name} por dois minutos${m.bossName?`, sob o comando de ${m.bossName}`:''}.`);
  else if(m.type==='embassy')lines.push(`${m.driver||'Nosso embaixador'} levou ${m.cost.gold} de ouro de presente a ${T.name}.`);
  else if(m.type==='contract'){const t=m.terms,d=m.decision;
    lines.push(`${m.byScout?'O batedor':'O mensageiro'} ${m.driver||''} levou a proposta: ${CTR[t.kind].name}.`);
    if(t.kind==='help')lines.push(m.helpRes==='free'?`${T.name} mandou guardas de graça.`:m.helpRes==='paid'?`${T.name} pediu ouro para mandar guardas.`:`${T.name} não pôde ajudar desta vez.`);
    else if(d&&d.ok)lines.push(`${T.name} aceitou. ${{merc:'Os mercenários já estão a caminho.',mercLife:'Os mercenários já estão a caminho.',hero:'O herói já está a caminho.',garrison:'A guarnição já marcha para os seus postos.',protect:'A partir de agora, a vila manda guardas quando vocês forem atacados.',loyalty:'Juraram lealdade: não negociam mais com o inimigo.',route:'A primeira caravana já está saindo.',liberate:'A vila agora está do nosso lado.'}[t.kind]||''}`);
    else if(d&&d.counter)lines.push(`${T.name} fez uma contraproposta: ${d.counter.gold} de ouro.`);
    else if(d)lines.push(`${T.name} recusou: ${d.why}`);}
  else if(m.type==='soldiers')lines.push(`${m.ids.length} ${m.ids.length===1?'soldado foi':'soldados foram'} servir a guarda de ${T.name}.`);
  else lines.push(escN?`Escolta de ${escN} ${escN===1?'soldado':'soldados'}${m.bossName?`, comandada por ${m.bossName}`:''}. Carroça de ${m.driver||'um tropeiro'}.`:`Sem escolta. Carroça de ${m.driver||'um tropeiro'}.`);
  if(m.stats.amb.length){const n=m.stats.amb.reduce((a,b)=>a+b.n,0);lines.push(`Emboscada na estrada: ${n} bandidos. Derrubamos ${m.stats.killed}${m.stats.fled?`, ${m.stats.fled} fugiram`:''}.`);}
  else lines.push('Estrada tranquila: nenhuma emboscada.');
  lines.push(m.stats.lost.length?`Perdas: ${m.stats.lost.join(', ')}.`:'Ninguém da comitiva morreu.');
  if(m.ok){
    if(m.got&&m.got.length&&m.type!=='contract')lines.push(`${m.type==='tech'||m.type==='swap'?'Aprendemos':m.type==='supply'?'Resultado:':m.type==='embassy'?'Conquistamos':'Recebemos'} ${m.got.join(' e ')}${m.type==='swap'?` em troca de ${TECHS[m.give].name}`:''}.`);
  }else{
    const by2=m.killer===2?'o Reino Vermelho':m.killer===3?'os bandidos':'o inimigo';
    const why={cart:m.type==='escort'?`A carroça do mercador foi destruída por ${by2}: não recebemos nada.`:`A carroça foi destruída e a carga ficou com ${by2}.`,all:'Ninguém chegou ao destino.',stuck:'A carroça não achou caminho e voltou.'}[m.failed]||'O serviço fracassou.';
    lines.push(why+(m.delivered?' Mas a entrega já tinha sido paga.':''));
  }
  if(T)lines.push(`Reputação com ${T.name}: ${repStars(repOf(T,1))}${B?` · com ${B.name}: ${repStars(repOf(B,1))}`:''}`);
  const by=rep;
  const who=by?(by.mil?`${RANKS[by.rank]?RANKS[by.rank].n+' ':''}${by.nm}`:by.kind==='cart'?`Tropeiro ${m.driver||by.nm}`:by.nm):'Um caçador da vila';
  const av=by?({warrior:'av01',lancer:'av02',archer:'av03',monk:'av04',paladin:'av26',wizard:'av27',scout:'av28',royal:'av29',merc:'av11'}[by.kind]||'av05'):'av15';
  const r={id:m.id,ok:m.ok,title:`Relatório: ${SVC_NAME[m.type]}`,who,av,lines,t:S.t,loc:by?{x:by.x,y:by.y,id:by.id||undefined}:null};
  const L=svcList();L.log.unshift(r);if(L.log.length>25)L.log.pop();
  HOOK.report(r);
}

// ---------------------------------------------------------------- who asks for what: villagers, commanders, merchants, the engineer
function svcOffers(dt){
  const L=svcList();
  L.offerT-=dt;if(L.offerT>0)return;L.offerT=60+Math.random()*40;
  // an offer nobody answered (the question timed out) is dropped
  for(const m of L.list)if(m.state==='offer'&&m.team===1&&!(S.ask&&S.ask.mid===m.id)&&!(S.asks||[]).some(q=>q.mid===m.id)){m.state='declined';L.cd[m.type]=S.t+90;}
  if(S.ask||(S.asks&&S.asks.length)||svcActive(1)>=svcSlots(1)||!castleOf(1))return;
  const TT=S.teams[1],R=TT.res,era=eraOf(1),cands=[],cd=k=>(L.cd[k]||0)>S.t;
  const pawns=S.ents.filter(e=>!e.dead&&e.team===1&&e.kind==='pawn');
  const villager=pawns[Math.floor(Math.random()*pawns.length)];
  const vname=villager?`Tropeiro ${folkName(villager)}`:'Um tropeiro';
  const soldiers=freeSoldiers(1,castleOf(1).x,castleOf(1).y);
  const cmdr=soldiers.slice().sort((a,b)=>(b.rank||0)-(a.rank||0))[0];
  const escFor=r=>r>.5?3:r>.25?2:1;
  for(const T of S.towns||[]){
    for(const r of['wood','food']){
      const p=townPrice(T,r,false,1);
      if(!cd('sell')&&R[r]>=430&&p>=100)cands.push({w:p/50,type:'sell',town:T.i,res:r,n:CART_LOAD,who:vname});
      const b=townPrice(T,r,true,1);
      if(!cd('buy')&&R[r]<140&&R.gold>=b*2+80&&b<=95)cands.push({w:2.5,type:'buy',town:T.i,res:r,n:CART_LOAD,who:vname});
    }
    if(!cd('arms')&&era>=2&&BLDS.some(b=>!b.dead&&b.team===1&&b.kind==='barracks'&&b.built)&&afford(1,ARMS_COST)&&armsPrice(T,1)>=250)
      cands.push({w:armsPrice(T,1)/90,type:'arms',town:T.i,who:cmdr?`${rankedName(cmdr)}, do quartel`:'O mestre de armas',av:'av01'});
    if(!cd('tech')&&repOf(T,1)>=2){const k=T.techs.find(q=>!techHas(1,q));if(k){const rr=T.want==='arms'?'gold':T.want;if(R[rr]>=(rr==='gold'?180:250)+60)cands.push({w:2,type:'tech',town:T.i,tech:k,who:'Mestre Gaspar',av:'av05'});}}
  }
  if(!cd('escort')&&S.towns&&S.towns.length>=2&&soldiers.length>=2){
    const a=Math.floor(Math.random()*S.towns.length);let b=(a+1+Math.floor(Math.random()*(S.towns.length-1)))%S.towns.length;
    cands.push({w:2.2,type:'escort',town:a,town2:b,who:`Um mercador de ${S.towns[a].name}`,av:'av15'});
  }
  // the army out in the field asks for food and arrows
  if(!cd('supply')&&R.food>=160&&R.gold>=60){
    const c=castleOf(1),away=S.ents.filter(e=>!e.dead&&e.team===1&&DEF[e.kind].mil&&healable(e)&&!e.svc&&hyp(e.x-c.x,e.y-c.y)>18*TS);
    if(away.length>=5){const boss=away.slice().sort((a,b)=>(b.rank||0)-(a.rank||0))[0];cands.push({w:3,type:'supply',cmdId:boss.id,who:rankedName(boss),av:'av01'});}
  }
  if(!cands.length)return;
  let tot=cands.reduce((a,c)=>a+c.w,0),x=Math.random()*tot,c=cands[0];for(const q of cands){x-=q.w;if(x<=0){c=q;break;}}
  const m=svcNew(c.type,1,{town:c.town,town2:c.town2,res:c.res,n:c.n,tech:c.tech,cmdId:c.cmdId,who:c.who,av:c.av});
  if(!m)return;
  // somebody always stays home to guard the village
  const spare=Math.max(0,soldiers.length-(soldiers.length<=3?1:2));
  m.escN=c.type==='supply'?1:Math.min(spare,c.type==='escort'?Math.min(3,Math.max(2,escFor(m.risk))):escFor(m.risk)+(c.type==='arms'?1:0));
  if(c.type==='escort'&&m.escN<1)return;
  m.risk=svcRisk(m,m.escN);
  L.list.push(m);
  ask({kind:'svc',mid:m.id,who:`${c.who} pede autorização`,av:c.av||'av05',text:svcText(m),cost:Object.keys(m.cost).length?m.cost:null,loc:m.type==='supply'?m.to:{x:m.to.x,y:m.to.y}});
}
function svcText(m){
  const T=S.towns&&S.towns[m.town],B=m.town2!=null?S.towns[m.town2]:null,eta=fmtT(m.eta);
  const esc=m.escN?`Levo ${m.escN} ${m.escN===1?'soldado':'soldados'} de escolta.`:'Vamos sem escolta.';
  const foe=castleOf(2),near=foe&&hyp(m.to.x-foe.x,m.to.y-foe.y)<24*TS;
  const risk=`Risco ${riskName(m.risk)}${near?' (a vila fica perto do Reino Vermelho)':''}. Prazo ${eta}.`;
  switch(m.type){
    case 'sell':return `Temos ${m.load.n} de ${RES_NAME[m.load.k]} sobrando. ${T.name} paga ${m.pay.gold} de ouro (o nosso mercado pagaria ${Math.round(sellGain(m.load.k)*m.load.n/100)}). ${esc} ${risk} Posso levar?`;
    case 'buy':return `Estamos com pouca ${RES_NAME[m.goods.k]}. ${T.name} vende ${m.goods.n} por ${m.cost.gold} de ouro, pago na saída. ${esc} ${risk} Posso buscar?`;
    case 'arms':return `O quartel tem uma carga de armas pronta (custa ${ARMS_COST.wood} de madeira e ${ARMS_COST.gold} de ouro). ${T.name} paga ${m.pay.gold} de ouro. Bandidos adoram armas: ${esc} ${risk} Autoriza?`;
    case 'tech':return `${T.name} ensina ${TECHS[m.tech].name} (${TECHS[m.tech].desc.toLowerCase()}) em troca de ${m.load.n} de ${RES_NAME[m.load.k]}. ${esc} ${risk} Posso fechar o negócio?`;
    case 'escort':return `Preciso levar sedas de ${T.name} até ${B.name}. Pago ${m.pay.gold} de ouro e as duas vilas vão gostar mais de vocês. Peço ${m.escN} soldados de escolta. ${risk} Aceita?`;
    case 'supply':return `A tropa está longe de casa e cansada. Mande ${m.cost.food} de comida e ${m.cost.gold} de ouro numa carroça: cada soldado perto de mim ganha +15% de dano e se cura por 2 minutos e meio. ${risk} Manda?`;
  }
  return '';
}
function svcAnswer(q,yes){
  const L=svcList(),m=L.list.find(x=>x.id===q.mid);if(!m)return;
  if(!yes){m.state='declined';L.cd[m.type]=S.t+150;HOOK.toast('Pedido recusado. Eles vão esperar outra oportunidade.');return;}
  const r=svcStart(m);
  if(r!=='ok'){m.state='declined';L.cd[m.type]=S.t+60;HOOK.toast({cost:'Faltam recursos para esse serviço.',slots:'Todas as carroças estão ocupadas agora.',noescort:'Não há soldados livres para a escolta.',nobody:'Não há ninguém para ir.'}[r]||'Não deu para começar o serviço.','warn');}
}
// the player orders a service straight from the town's market
function svcOrder(type,townI,arg,arg2){
  const T=S.towns[townI];if(!T)return 'notown';
  {const side=loyalTo(T);if(side&&side!==1&&type!=='embassy')return 'sworn';}
  if(townFoe(townI,1))return 'hostile';
  if(svcActive(1)>=svcSlots(1))return 'slots';
  const c=castleOf(1);const sol=freeSoldiers(1,c.x,c.y);
  let m=null;
  if(type==='sell')m=svcNew('sell',1,{town:townI,res:arg,n:CART_LOAD,who:'Você'});
  else if(type==='buy')m=svcNew('buy',1,{town:townI,res:arg,n:CART_LOAD,who:'Você'});
  else if(type==='arms'){if(eraOf(1)<2)return 'era';m=svcNew('arms',1,{town:townI,who:'Você'});}
  else if(type==='tech'){if(repOf(T,1)<2)return 'rep';m=svcNew('tech',1,{town:townI,tech:arg,who:'Você'});}
  else if(type==='swap'){if(repOf(T,1)<1)return 'rep';m=svcNew('swap',1,{town:townI,tech:arg,give:arg2,who:'Você'});}
  else if(type==='merc'){if(repOf(T,1)<2)return 'rep';if(popUsed(1)+3>popCap(1))return 'pop';m=svcNew('merc',1,{town:townI,who:'Você'});}
  else if(type==='embassy'){if(S.t<(T.embT||0))return 'wait';T.embT=S.t+150;m=svcNew('embassy',1,{town:townI,who:'Você'});}
  else if(type==='soldiers'){
    const pick=sol.slice(0,2);if(pick.length<1)return 'nobody';
    const pay=pick.reduce((a,u)=>a+Math.round(((DEF[u.kind].cost&&(DEF[u.kind].cost.gold||0)+(DEF[u.kind].cost.food||0)+(DEF[u.kind].cost.wood||0))||80)*.8+25*(u.rank||0)),0);
    m=svcNew('soldiers',1,{town:townI,ids:pick.map(u=>u.id),pay,who:'Você'});
  }
  if(!m)return 'fail';
  const R=svcRisk(m,0);m.escN=type==='merc'||type==='soldiers'||type==='embassy'||type==='garrison'?0:type==='swap'?1:Math.min(sol.length,R>.5?3:R>.25?2:1)+(type==='arms'&&sol.length>3?1:0);m.risk=svcRisk(m,m.escN);
  return svcStart(m);
}

// ---------------------------------------------------------------- the Red Kingdom trades too (and its carts can be robbed)
function aiTrade(dt){
  if(!S.ai||!S.towns||!S.towns.length||!castleOf(2)||S.noAiTrade)return;
  S.aiTradeT=(S.aiTradeT??240)-dt;if(S.aiTradeT>0)return;S.aiTradeT=150+Math.random()*80;
  if(svcActive(2)>=1)return;
  const R=S.teams[2].res;let best=null,bp=0;
  for(const T of S.towns)for(const r of['wood','food']){if(R[r]<380||(loyalTo(T)&&loyalTo(T)!==2)||townFoe(T.i,2))continue;const p=townPrice(T,r,false,2);if(p>bp){bp=p;best={T,r};}}
  if(!best||bp<90)return;
  const m=svcNew('sell',2,{town:best.T.i,res:best.r,n:CART_LOAD});if(!m)return;m.escN=2;
  if(svcStart(m)==='ok'){m.aiTech=true;}
}
function aiTradeDone(){
  for(const m of svcList().list){
    if(m.team!==2||m.state!=='done'||m.aiSeen)continue;m.aiSeen=true;
    const T=S.towns[m.town];if(m.ok&&T&&repOf(T,2)>=3){const k=T.techs.find(q=>!techHas(2,q));if(k&&Math.random()<.5)learnTech(2,k,T.name);}
  }
}
// called once per frame by the simulation
function tradeTick(dt){
  if(!S.svc&&!S.towns)svcList();
  S.townT=(S.townT||0)+dt;if(S.townT>=5){S.townT=0;updTowns();aiTradeDone();}
  svcUpdate(dt);svcBandits();
  if(!S.over){svcOffers(dt);aiTrade(dt);}
}

