// ================================================================ economy inside the kingdom: taxes, the people's mood, the fair, caravans and upkeep
// Stronghold style: taxes bring gold and cost popularity; a happy people works faster, an angry one leaves.
// Villagers can open a stall at the market and sell what the kingdom has too much of; each sale makes them better known,
// and famous merchants sell for more and bring caravans from the towns. Towns trade with each other on the roads (bandits
// lie in wait, a kingdom can charge toll at its gates and bridges, or rob them at the cost of honour). Soldiers want pay.
const TAX=[{n:'Sem imposto',g:0,p:3},{n:'Baixo',g:1,p:1},{n:'Normal',g:2,p:0},{n:'Alto',g:3.5,p:-3},{n:'Abusivo',g:5,p:-6}];
const FEST_COST={food:150,gold:60};
function econOf(team){S.econ=S.econ||{};return S.econ[team]||(S.econ[team]={tax:2,pop:60,festT:0,unpaid:false,unpaidT:0,leaveT:0,upAcc:0,taxAcc:0,income:0,upkeep:0,why:{}});}
function econWork(t){const E=S.econ&&S.econ[t];if(!E)return 1;const p=E.pop;return p>=75?1.1:p>=45?1:p>=25?.9:.8;}
const POP_NAME=p=>p>=75?'Feliz':p>=45?'Tranquilo':p>=25?'Insatisfeito':'Revoltado';
function popWorkers(team){return S.ents.filter(e=>!e.dead&&e.team===team&&e.kind==='pawn');}
// who costs pay: every soldier who is not paid by a contract
function upkeepOf(team){
  let w=0;
  for(const u of S.ents){
    if(u.dead||u.team!==team)continue;const D=DEF[u.kind];
    if(!D.unit||!D.mil||D.king||D.boss||u.hero||D.thero||u.ctr||u.wave||u.ally||u.aid)continue;
    w+=D.mech?2:(u.kind==='paladin'||u.kind==='wizard')?1.5:1;
  }
  return w*.6;
}
function econFestival(team){
  const E=econOf(team);
  if(S.t<E.festT)return 'wait';if(!afford(team,FEST_COST))return 'cost';
  pay(team,FEST_COST);E.pop=clamp(E.pop+18,0,100);E.festT=S.t+180;E.festNow=S.t+20;
  HOOK.econ('festival',team);
  return 'ok';
}
function econSetTax(team,k){econOf(team).tax=clamp(k|0,0,4);HOOK.econ('tax',team);}
function econStep(team){
  const E=econOf(team),T=S.teams[team],c=castleOf(team);if(!c)return;
  const pawns=popWorkers(team),n=pawns.length;
  // taxes, every 10 seconds
  E.taxAcc+=n*TAX[E.tax].g/6;
  const g=Math.floor(E.taxAcc);if(g>0){E.taxAcc-=g;T.res.gold+=g;T.stats.gold+=g;}
  E.income=Math.round(n*TAX[E.tax].g);
  // the people's mood
  const why={tax:TAX[E.tax].p};
  why.food=T.res.food>=Math.max(60,n*8)?1:-2;
  why.tavern=BLDS.some(b=>!b.dead&&b.team===team&&b.kind==='tavern'&&b.built)?1:0;
  why.homes=popCap(team)>0&&popUsed(team)/popCap(team)>.95?-1:0;
  const hitT=team===1?(S.hitT||-999):(S.ai&&S.ai.alarm?S.ai.alarm.t:-999);
  why.safety=S.t-hitT<60?-2:0;
  why.fair=Math.min(2,S.ents.filter(e=>!e.dead&&e.team===team&&e.trader&&e.trader.fame>=2).length*.5);
  why.pay=E.unpaid?-2:0;
  why.party=E.festNow&&S.t<E.festNow?3:0;
  E.why=why;
  const d=Object.values(why).reduce((a,b)=>a+b,0);
  E.pop=clamp(E.pop+d/6,0,100);
  // an angry people leaves
  if(E.pop<15&&n>6&&S.t>(E.leaveT||0)){
    E.leaveT=S.t+45;
    const p=pawns.find(q=>!q.order||q.order.type==='gather');
    if(p){removeQuiet(p);HOOK.econ('leave',team,p);}
  }
  // soldiers' pay
  const up=upkeepOf(team);E.upkeep=Math.round(up);
  E.upAcc+=up/6;
  const due=Math.floor(E.upAcc);
  if(due>0){
    if(T.res.gold>=due){T.res.gold-=due;E.upAcc-=due;if(E.unpaid){E.unpaid=false;HOOK.econ('paid',team);}E.unpaidT=0;}
    else{
      if(!E.unpaid){E.unpaid=true;HOOK.econ('unpaid',team);}
      E.upAcc=Math.min(E.upAcc,30);E.unpaidT+=10;
      if(E.unpaidT>=60){E.unpaidT=0;const s=S.ents.filter(u=>!u.dead&&u.team===team&&DEF[u.kind].mil&&DEF[u.kind].unit&&!u.ctr&&!u.hero&&!DEF[u.kind].thero&&!DEF[u.kind].king&&(u.rank||0)<2&&!u.wave).sort((a,b)=>(a.rank||0)-(b.rank||0))[0];if(s){removeQuiet(s);HOOK.econ('desert',team,s);}}
    }
  }
}

// ---------------------------------------------------------------- the fair: villagers with a stall at the market
function stallSlots(team){return BLDS.some(b=>!b.dead&&b.team===team&&b.kind==='market'&&b.built)?1+Math.floor(eraOf(team)/2):0;}
function traders(team){return S.ents.filter(e=>!e.dead&&e.team===team&&e.trader);}
function econOpenStall(team){
  const mk=BLDS.filter(b=>!b.dead&&b.team===team&&b.kind==='market'&&b.built)[0];if(!mk)return 'nomarket';
  if(traders(team).length>=stallSlots(team))return 'full';
  const p=S.ents.filter(e=>!e.dead&&e.team===team&&e.kind==='pawn'&&!e.trader&&!(e.order&&(e.order.type==='build'||e.order.type==='rest'))).sort((a,b)=>(skillLv(b,'food')+skillLv(b,'gold'))-(skillLv(a,'food')+skillLv(a,'gold'))||hyp(a.x-mk.x,a.y-mk.y)-hyp(b.x-mk.x,b.y-mk.y))[0];
  if(!p)return 'nobody';
  p.trader={mk:mk.id,fame:0,sold:0,slot:traders(team).length,t:S.t};p.order={type:'trade',id:mk.id};p.path=null;p.carry=null;
  HOOK.econ('stall',team,p);
  return 'ok';
}
function econCloseStall(u){if(!u||!u.trader)return;u.trader=null;u.order=null;HOOK.econ('close',u.team,u);}
function stallPoint(u){const mk=byId.get(u.trader.mk);if(!alive(mk))return null;const r=rectOf(mk);return {x:r[0]+18+(u.trader.slot%3)*30,y:r[1]+r[3]+14};}
function doTrader(u,dt){
  if(!u.trader){u.order=null;return;}
  const p=stallPoint(u);if(!p){u.trader=null;u.order=null;return;}
  if(hyp(u.x-p.x,u.y-p.y)>14){u.rp=(u.rp||0)-dt;if((!u.path&&!u.detour)||u.rp<=0){u.rp=2;pathToPoint(u,p.x,p.y,true);}followPath(u,dt);return;}
  u.path=null;u.moving=false;u.face=1;
}
function traderIdle(u){u.order={type:'trade',id:u.trader.mk};}
// a sale: the most plentiful good goes to market; fame grows; famous sellers get better prices
function traderSell(u){
  const T=S.teams[u.team],tr=u.trader;
  let k=null,most=350;for(const r of['wood','food'])if(T.res[r]>most){most=T.res[r];k=r;}
  if(!k)return;
  const n=25,fame=Math.floor(tr.fame),gold=Math.max(4,Math.round(n*price(k)/100*(.78+.06*fame)))+fame;
  T.res[k]-=n;T.res.gold+=gold;T.stats.gold+=gold;
  if(S.market)S.market[k]=Math.max(30,S.market[k]-.6);
  tr.sold+=n;tr.fame=Math.min(5,tr.fame+.05);tr.earned=(tr.earned||0)+gold;
  HOOK.econ('sale',u.team,u,{k,n,gold});
}

// ---------------------------------------------------------------- caravans: towns trade with each other (and visit famous fairs)
function caravanSend(from,to,o){
  o=o||{};
  const A=S.towns[from],dest=o.dest||{x:S.towns[to].x,y:S.towns[to].y};
  const k=o.k||A.spec,n=o.n||150,p=walkNear(A.x,A.y+14);
  const cart=spawnUnit('cart',0,p.x,p.y,{town:A.i,trip:{from,to,k,n,kind:o.kind||'trade',team:o.team||0,value:Math.round(n*(k==='gold'?1:.9))},load:{k,n},neutralCart:true,face:dest.x<p.x?-1:1});
  cart.nm='caravana de '+A.name;cart.dest=dest;cart.order={type:'haul'};cart.tolled={};
  const g=spawnUnit(eliteOf(A),0,p.x+18,p.y+8,{town:A.i,home:{x:A.x,y:A.y},guardOf:cart.id});
  cart.guards=[g.id];
  // the risk of the road: bandits wait somewhere halfway
  cart.ambAt=Math.random()<.3?.35+Math.random()*.35:0;cart.len=Math.max(1,hyp(dest.x-p.x,dest.y-p.y));
  if(A.stock[k]!=null)A.stock[k]=Math.max(40,A.stock[k]-n);
  return cart;
}
function caravanAmbush(cart){
  let spot=null;
  for(let k=0;k<50&&!spot;k++){const a=Math.random()*Math.PI*2,r=(5+Math.random()*3)*TS,x=cart.x+Math.cos(a)*r,y=cart.y+Math.sin(a)*r,tx=tileOf(x),ty=tileOf(y);if(inB(tx,ty)&&walkXY(tx,ty)&&reachT(tx,ty)&&!S.towns.some(t=>hyp(t.x-x,t.y-y)<8*TS))spot={x:tx*TS+16,y:ty*TS+16};}
  if(!spot)return;
  const n=2+Math.floor(Math.random()*2)+(S.t>900?1:0);
  for(let i=0;i<n;i++){const u=spawnUnit(i%3===2?'banditA':'bandit',3,spot.x+(Math.random()-.5)*40,spot.y+(Math.random()-.5)*30,{roam:true,leaveAt:S.t+70});u.order={type:'attack',id:cart.id,raid:true};}
  HOOK.econ('ambush',0,cart);
}
function caravanLost(t,src){
  const tr=t.trip,T=S.towns[t.town];
  if(src&&(src.team===1||src.team===2)){
    const g=t.load?{[t.load.k]:Math.round(t.load.n*.5)}:{};
    for(const r in g){S.teams[src.team].res[r]+=g[r];S.teams[src.team].stats[r]+=g[r];}
    addHonor(src.team,-10,'loot');
    if(T)addRep(T,src.team,-2);if(tr&&S.towns[tr.to])addRep(S.towns[tr.to],src.team,-1);
    HOOK.econ('looted',src.team,t,{g});
  }else HOOK.econ('caravanLost',0,t);
  for(const id of t.guards||[]){const g=byId.get(id);if(alive(g)){g.guardOf=0;g.leaving=S.t;g.order={type:'move',x:T.x,y:T.y};}}
}
// a toll at the gates and bridges of a kingdom that chose to charge it
function caravanTolls(cart){
  const tx=tileOf(cart.x),ty=tileOf(cart.y);
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const x=tx+dx,y=ty+dy;if(!inB(x,y))continue;const o=occ[idx(x,y)]&&byId.get(occ[idx(x,y)]);
    if(!o||o.dead||(o.kind!=='gate'&&o.kind!=='bridge')||!o.built||(o.team!==1&&o.team!==2))continue;
    const team=o.team;if(cart.tolled[team])continue;
    const on=team===1?!!(S.rules&&S.rules.tolls):eraOf(2)>=2;
    if(!on)continue;
    cart.tolled[team]=1;
    const v=Math.max(6,Math.round(((cart.trip&&cart.trip.value)||120)*.08));
    S.teams[team].res.gold+=v;S.teams[team].stats.gold+=v;
    const T=S.towns[cart.town];if(T)addRep(T,team,-.1);
    HOOK.econ('toll',team,cart,{v});
  }
}
function caravanTick(){
  if(!S.towns||S.towns.length<2)return;
  for(const u of S.ents){
    if(u.dead||u.kind!=='cart'||u.team!==0||(!u.trip&&!u.route))continue;
    caravanTolls(u);
    if(u.trip&&u.ambAt&&!u.ambushed&&u.dest&&1-hyp(u.x-u.dest.x,u.y-u.dest.y)/u.len>=u.ambAt){u.ambushed=true;caravanAmbush(u);}
    if(!u.trip||!u.dest||hyp(u.x-u.dest.x,u.y-u.dest.y)>60)continue;
    const tr=u.trip,A=S.towns[tr.from],B=S.towns[tr.to];
    if(tr.kind==='visit'){
      // a famous fair: the town buys the kingdom's surplus at a good price
      const team=tr.team,TT=S.teams[team],best=traders(team).reduce((a,t)=>Math.max(a,t.trader.fame),0);
      let k=null,most=250;for(const r of['wood','food'])if(TT.res[r]>most){most=TT.res[r];k=r;}
      if(k){const n=Math.min(150,Math.floor(TT.res[k]-120)),g=Math.round(n*townPrice(A,k,false,team)/100*(1+.06*best));TT.res[k]-=n;TT.res.gold+=g;TT.stats.gold+=g;A.stock[k]+=n;HOOK.econ('visit',team,u,{k,n,g});}
      addRep(A,team,.2);
    }else{
      if(tr.k==='gold')B.gold=(B.gold||0)+tr.n*.4;else B.stock[tr.k]=(B.stock[tr.k]||0)+tr.n;
      A.gold=(A.gold||0)+tr.value*.5;B.gold=(B.gold||0)+tr.value*.15;
      HOOK.econ('caravanIn',0,u,{A,B});
    }
    for(const id of u.guards||[]){const g=byId.get(id);if(alive(g)){g.guardOf=0;g.leaving=S.t;g.order={type:'move',x:A.x,y:A.y};}}
    removeQuiet(u);
  }
  // a new caravan now and then: surplus goes where it is wanted
  S.carT=(S.carT??60)-1;
  if(S.carT<=0){
    S.carT=70+Math.random()*50;
    const busy=S.ents.filter(e=>!e.dead&&e.kind==='cart'&&e.trip).length;
    if(busy<3){
      const pairs=[];
      for(const A of S.towns)for(const B of S.towns){if(A===B||A.siege||B.siege)continue;const k=A.spec,have=k==='gold'?A.gold:A.stock[k];if((k==='gold'?have>260:have>650)&&(B.want===k||(B.stock[k]||0)<450||k==='gold'))pairs.push([A,B]);}
      if(pairs.length){const [A,B]=pairs[Math.floor(Math.random()*pairs.length)];if(A.spec==='gold')A.gold-=60;caravanSend(A.i,B.i);}
    }
    // famous fairs draw buyers from the towns
    for(const team of[1,2]){
      const fame=traders(team).reduce((a,t)=>Math.max(a,t.trader.fame),0),mk=BLDS.find(b=>!b.dead&&b.team===team&&b.kind==='market'&&b.built);
      if(fame<2||!mk||S.t<(econOf(team).visitT||0))continue;
      const T=S.towns.filter(t=>!townFoe(t.i,team)&&(!loyalTo(t)||loyalTo(t)===team)).sort((a,b)=>hyp(a.x-mk.x,a.y-mk.y)-hyp(b.x-mk.x,b.y-mk.y))[0];
      if(!T)continue;econOf(team).visitT=S.t+150-fame*12;
      const r=rectOf(mk);caravanSend(T.i,T.i,{kind:'visit',team,dest:walkNear(r[0]+r[2]/2,r[1]+r[3]+20),k:'gold',n:0});
      HOOK.econ('visitor',team,T);
    }
  }
}

// ---------------------------------------------------------------- the Red Kingdom manages its people too
function aiEcon(){
  const E=econOf(2),T=S.teams[2];
  if(E.pop>65&&T.res.gold<150)E.tax=3;else if(E.pop<40)E.tax=1;else E.tax=2;
  if(E.pop<35&&afford(2,{food:FEST_COST.food+150,gold:FEST_COST.gold+80}))econFestival(2);
  if(stallSlots(2)>traders(2).length&&popWorkers(2).length>=14)econOpenStall(2);
}

// ---------------------------------------------------------------- the clock
function econTick(dt){
  S.ecT=(S.ecT||0)+dt;
  if(S.ecT>=1){
    S.ecT=0;caravanTick();
    S.ecN=(S.ecN||0)+1;
    for(const team of[1,2])for(const u of traders(team)){u.trader.acc=(u.trader.acc||0)+1;if(u.trader.acc>=15){u.trader.acc=0;const p=stallPoint(u);if(p&&hyp(u.x-p.x,u.y-p.y)<40)traderSell(u);}}
    if(S.ecN%10===0){for(const team of[1,2])if(castleOf(team))econStep(team);if(S.ai)aiEcon();}
  }
}
