// ================================================================ living towns: they grow, send envoys, and may come to your aid
// Every neutral town has villagers who gather around it, a treasury, houses, farms, towers and a guard that grows level by level.
// Friendship (0 to 5) decides what a town does for you: better prices, gifts, envoys with news, and help when you are attacked.
const FRIEND=['Estranhos','Conhecidos','Parceiros','Amigos','Aliados','Irmãos de armas'];
const FRIEND_PERKS=[
  'Preços normais. A vila não se mete nas suas brigas.',
  'Preços 4% melhores. Já aceitam trocar tecnologia.',
  'Mercenários e tecnologias liberados. Ajudam na guerra se você pagar.',
  'Mandam presentes e notícias do inimigo. A ajuda sai mais barata.',
  'Ajudam de graça contra bandidos, e contra o Reino Vermelho se não forem amigos dele.',
  'Ajudam de graça sempre e dão 20% de desconto em tecnologia.',
];
const TOWN_TITLE=['','Aldeia','Vila','Burgo','Cidade','Grande cidade'];
const LVL_COST=[0,0,260,520,850,1250];
// what each level adds around the town hall
const TOWN_PLAN=[[],['thouse','tfarm','thouse'],['thouse','ttower','tfarm'],['thouse','tbarracks','ttower','thouse'],['tfarm','thouse','ttower'],['thouse','ttower','thouse']];
const TB_COST={thouse:110,tfarm:70,ttower:200,tbarracks:280};
const friendOf=(t,team)=>Math.floor(repOf(t,team));
function addRep(t,team,v){if(!t)return;t.rep[team]=clamp((t.rep[team]||0)+v,0,5.99);}
// favors: help goes both ways. Positive: the town owes this kingdom; negative: the kingdom owes the town
const favOf=(t,team)=>(t&&t.fav&&t.fav[team])||0;
function addFav(t,team,v){if(!t)return;t.fav=t.fav||{1:0,2:0};t.fav[team]=clamp((t.fav[team]||0)+v,-3,3);}
// a request from a town that was answered elsewhere leaves no card behind
function dropTownAsk(i){
  if(S.asks)S.asks=S.asks.filter(q=>!(q.kind==='townhelp'&&q.town===i));
  if(S.ask&&S.ask.kind==='townhelp'&&S.ask.town===i)nextAsk();
}

// ---------------------------------------------------------------- setup: a fourth town, starting villagers and treasury
function initTown(t){
  t.lvl=1;t.gold=180;t.blds=[];t.growT=6+t.i*3;t.envT=110+t.i*45;t.target=500;t.helpCd={1:0,2:0};t.fav={1:0,2:0};
  const T0=byId.get(t.id);
  for(let k=0;k<3;k++){const p=walkNear(t.x+(k-1)*30,t.y+18);spawnUnit('npawn',0,p.x,p.y,{town:t.i,home:{x:p.x,y:p.y}});}
  {const p=walkNear(t.x+44,t.y+20),m=spawnUnit('npawn',0,p.x,p.y,{town:t.i,master:true,home:{x:p.x,y:p.y}});m.nm=MASTER_NAMES[t.i%MASTER_NAMES.length];m.title='Mestre de obras '+m.nm;m.maxhp=m.hp=140;t.master=m.id;}
  if(T0)T0.town=t.i;
}
// walking with patience: paths are asked for again only now and then, and a place that cannot be reached is given up
function walkTo(u,x,y,dt,r){
  const d=hyp(u.x-x,u.y-y);
  if(d<=r){u.path=null;u.moving=false;u.wf=0;return 'here';}
  u.rp=(u.rp||0)-dt;
  if((!u.path||!u.path.length)&&!u.detour){
    u.moving=false;if(u.rp>0)return 'wait';
    u.rp=2.5;if(u.wd!=null&&d>=u.wd-6)u.wf=(u.wf||0)+1;u.wd=d;
    if(u.wf>=3){u.wf=0;u.wd=null;return 'fail';}
    const ok=pathToPoint(u,x,y,false);if(ok===0){u.wf=(u.wf||0)+1;return u.wf>=3?'fail':'wait';}
  }
  followPath(u,dt);return 'moving';
}
// ---------------------------------------------------------------- villagers: gather around the town and bring the goods home
function townJob(u,t){
  const want=t.spec==='gold'?(Math.random()<.6?'gold':'food'):t.spec==='wood'?(Math.random()<.7?'wood':'food'):(Math.random()<.65?'food':'wood');
  if(want==='gold'){let best=null,bd=15*TS;for(const e of S.ents){if(e.dead||e.kind!=='gold'||e.amount<=0)continue;const d=hyp(e.x-t.x,e.y-t.y);if(d<bd){bd=d;best=e;}}if(best)return {res:'gold',id:best.id,x:best.x,y:best.y+6};}
  if(want==='food'||want==='gold'){
    const f=t.blds.map(id=>byId.get(id)).find(b=>alive(b)&&b.kind==='tfarm'&&b.built&&!(b.worker&&alive(byId.get(b.worker))&&b.worker!==u.id));
    if(f){f.worker=u.id;const r=rectOf(f);return {res:'food',id:f.id,x:r[0]+r[2]/2,y:r[1]+r[3]/2,farm:true};}
  }
  // the nearest tree that still has wood
  const cx=tileOf(t.x),cy=tileOf(t.y);let bt=null,bd=1e9;
  for(let y=cy-12;y<=cy+12;y++)for(let x=cx-12;x<=cx+12;x++){
    if(!inB(x,y))continue;const i=idx(x,y);if(S.tiles[i]!==TREE||S.wood[i]<=0||(u.badT&&u.badT[i]>S.t))continue;
    const d=hyp(x-cx,y-cy)+hash(i+u.id)*2;if(d>=bd)continue;
    let w=null;for(const[dx,dy]of[[0,1],[1,0],[-1,0],[0,-1]]){const xx=x+dx,yy=y+dy;if(inB(xx,yy)&&walkXY(xx,yy)&&reachT(xx,yy)){w=[xx,yy];break;}}
    if(w){bd=d;bt=[x,y,w[0],w[1]];}
  }
  if(bt)return {res:'wood',tx:bt[0],ty:bt[1],x:bt[2]*TS+16,y:bt[3]*TS+16};
  return null;
}
function doTWork(u,dt){
  const o=u.order,t=S.towns&&S.towns[u.town];if(!t){u.order=null;return;}
  // bandits close by: run to the town hall
  const th=banditNear(u.x,u.y,150);
  if(th&&o.phase!=='flee'){o.phase='flee';u.path=null;}
  if(o.phase==='flee'){
    if(!banditNear(u.x,u.y,220)&&hyp(u.x-t.x,u.y-t.y)<60){o.phase=u.carry?'back':'go';}
    else if(walkTo(u,t.x,t.y-10,dt,40)==='fail'){o.phase=u.carry?'back':'go';}
    return;
  }
  const tgt=o.phase==='back'?{x:t.x,y:t.y}:{x:o.x,y:o.y};
  const w=walkTo(u,tgt.x,tgt.y,dt,o.phase==='back'?40:24);
  if(w==='fail'){if(o.tx!=null){u.badT=u.badT||{};u.badT[idx(o.tx,o.ty)]=S.t+120;}if(o.phase==='back'){u.carry=null;}u.order=null;u.scan=1+Math.random();return;}
  if(w!=='here')return;
  if(o.phase==='go'){
    if(o.res==='wood'&&(S.tiles[idx(o.tx,o.ty)]!==TREE||S.wood[idx(o.tx,o.ty)]<=0)){u.order=null;return;}
    o.phase='work';o.t=0;
  }
  if(o.phase==='work'){
    u.anim='work';o.t+=dt;if(o.res==='wood')u.face=o.tx*TS+16>u.x?1:-1;
    if(o.t<7)return;
    if(o.res==='wood'){const i=idx(o.tx,o.ty);S.wood[i]=Math.max(0,S.wood[i]-8);treeShake.set(i,AT);if(S.wood[i]<=0){S.tiles[i]=STUMP;reachDirty=true;HOOK.tile(o.tx,o.ty);}}
    if(o.res==='gold'){const m=byId.get(o.id);if(m&&!m.dead){m.amount-=8;if(m.amount<=0)kill(m);}}
    u.carry={type:o.res,amt:10};o.phase='back';return;
  }
  if(o.phase==='back'){
    if(u.carry){if(u.carry.type==='gold')t.gold+=9;else t.stock[u.carry.type]=Math.min(1600,t.stock[u.carry.type]+10);t.gold+=1;}
    u.carry=null;u.order=null;
  }
}
function banditNear(x,y,r){let b=null,bd=r;forNear(x,y,r,e=>{if(e.dead||e.team!==3||!DEF[e.kind].mil)return;const d=hyp(e.x-x,e.y-y);if(d<bd){bd=d;b=e;}});return b;}
const MASTER_NAMES=['Ambrósio','Celeste','Valdemar','Rosinda','Quitéria','Bartolomeu'];
// the master builder: first on every building site; plans what the town needs after a raid
function masterBrain(u){
  const t=S.towns&&S.towns[u.town];if(!t)return;
  const b=t.blds.map(id=>byId.get(id)).find(q=>alive(q)&&!q.built);
  if(b){b.builder=u.id;const r=rectOf(b);u.order={type:'tbuild',id:b.id,x:r[0]+r[2]/2,y:r[1]+r[3]+8};return;}
  const hurt=t.blds.map(id=>byId.get(id)).find(q=>alive(q)&&q.built&&q.hp<q.maxhp*.8);
  if(hurt){hurt.prog=1;const r=rectOf(hurt);u.order={type:'tbuild',id:hurt.id,x:r[0]+r[2]/2,y:r[1]+r[3]+8,fix:true};return;}
  if(hyp(u.x-t.x,u.y-t.y)>90||Math.random()<.2){const a=Math.random()*Math.PI*2;u.order={type:'move',x:t.x+Math.cos(a)*70,y:t.y+10+Math.sin(a)*30};}
}
function townPawnBrain(u){
  const t=S.towns&&S.towns[u.town];if(!t)return;
  const b=t.blds.map(id=>byId.get(id)).find(q=>alive(q)&&!q.built);
  if(b&&Math.random()<.5&&!t.blds.some(id=>{const q=byId.get(id);return q&&q.builder===u.id;})){b.builder=u.id;const r=rectOf(b);u.order={type:'tbuild',id:b.id,x:r[0]+r[2]/2,y:r[1]+r[3]+8};return;}
  const j=townJob(u,t);if(j){u.order=Object.assign({type:'twork',phase:'go'},j);u.path=null;}
}
function doTBuild(u,dt){
  const o=u.order,b=byId.get(o.id);if(!alive(b)||(b.built&&!o.fix)||(o.fix&&b.hp>=b.maxhp)){u.order=null;return;}
  const w=walkTo(u,o.x,o.y,dt,30);
  if(w==='fail'){b.builder=0;u.order=null;b.prog=Math.min(1,b.prog+.25);return;}
  if(w!=='here')return;
  u.anim='build';u.face=b.x>u.x?1:-1;
  if(o.fix){b.hp=Math.min(b.maxhp,b.hp+b.maxhp*.04*dt);return;}
  b.prog=Math.min(1,b.prog+dt/(DEF[b.kind].time||20));b.hp=Math.max(b.hp,b.maxhp*b.prog);
  if(b.prog>=1){b.built=true;b.hp=b.maxhp;b.builder=0;u.order=null;HOOK.townGrow(S.towns[u.town],'built',b);}
}
// ---------------------------------------------------------------- growth: the treasury pays for people, buildings and new levels
function townSpot(t,k){
  const D=DEF[k],cx=tileOf(t.x),cy=tileOf(t.y)-1;
  for(let r=3;r<11;r++)for(let a=0;a<r*6;a++){
    const ang=a/(r*6)*Math.PI*2+t.i,tx=Math.round(cx+Math.cos(ang)*r-D.w/2),ty=Math.round(cy+Math.sin(ang)*r*.8-D.h/2);
    if(!canPlace(0,k,tx,ty))continue;
    let ok=true;for(let y=ty-1;y<=ty+D.h&&ok;y++)for(let x=tx-1;x<=tx+D.w;x++){if(!inB(x,y)){ok=false;break;}const i=idx(x,y);if(S.tiles[i]===ROAD&&(x>=tx&&x<tx+D.w&&y>=ty&&y<ty+D.h)){ok=false;break;}}
    if(ok&&reachRect(tx,ty,D.w,D.h))return {tx,ty};
  }
  return null;
}
function townUnits(t){const v=[],g=[],a=[],el=[];for(const e of S.ents){if(e.dead||e.team!==0||e.town!==t.i||e.leaving||e.guardOf||e.ctr)continue;if(e.kind==='npawn')v.push(e);else if(e.kind==='guard'&&!e.aid)g.push(e);else if(e.kind==='garcher'&&!e.aid)a.push(e);else if(DEF[e.kind].elite&&!e.aid){el.push(e);g.push(e);}}return {v,g,a,e:el};}
function townGrowth(t){
  const hall=byId.get(t.id);if(!hall)return;
  t.blds=t.blds.filter(id=>alive(byId.get(id)));
  const B=t.blds.map(id=>byId.get(id)),houses=B.filter(b=>b.kind==='thouse'&&b.built).length;
  const cap=4+houses*3+(t.lvl-1)*2,U=townUnits(t),pop=U.v.length+U.g.length+U.a.length;
  t.pop=pop;t.cap=cap;t.target=500+t.lvl*140;
  // the people eat, and pay a little tax
  t.stock.food=Math.max(40,t.stock.food-pop*.35);t.gold+=pop*.5;
  if(pop<cap&&t.stock.food>=70&&t.gold>=35){
    const wantG=2+t.lvl*2+(t.raidedT&&S.t-t.raidedT<300?2:0),wantA=t.lvl>=3?t.lvl-1:0,wantV=2+t.lvl*2,wantE=t.lvl>=3?t.lvl-2:0;
    const gate=walkNear(t.x,t.y+16);
    if(U.e.length<wantE&&t.gold>=110){t.gold-=110;t.stock.food-=50;const g=spawnUnit(eliteOf(t),0,gate.x,gate.y,{town:t.i});g.home=walkNear(t.x+(Math.random()-.5)*110,t.y+20+Math.random()*30);return;}
    if(U.g.length<wantG&&t.gold>=60){t.gold-=60;t.stock.food-=40;const g=spawnUnit('guard',0,gate.x,gate.y,{town:t.i});g.home=walkNear(t.x+(Math.random()-.5)*130,t.y+10+Math.random()*40);return;}
    if(U.a.length<wantA&&t.gold>=80){t.gold-=80;t.stock.food-=30;const g=spawnUnit('garcher',0,gate.x,gate.y,{town:t.i});g.home=walkNear(t.x+(Math.random()-.5)*150,t.y-30+Math.random()*30);return;}
    if(U.v.length<wantV){t.gold-=35;t.stock.food-=50;spawnUnit('npawn',0,gate.x,gate.y,{town:t.i});return;}
  }
  // the next building of this level, then the next level
  const plan=[];for(let l=1;l<=t.lvl;l++)plan.push(...TOWN_PLAN[l]);
  const have={};for(const b of B)have[b.kind]=(have[b.kind]||0)+1;
  const need={},missing=[];for(const k of plan){need[k]=(need[k]||0)+1;if(need[k]>(have[k]||0))missing.push(k);}
  if(missing.length){
    if(B.some(b=>!b.built))return;
    const k=missing[0];if(t.gold<TB_COST[k])return;
    const sp=townSpot(t,k);if(!sp)return;
    t.gold-=TB_COST[k];const b=spawnFixed(k,0,sp.tx,sp.ty);b.built=false;b.prog=0;b.hp=Math.round(b.maxhp*.1);b.town=t.i;t.blds.push(b.id);return;
  }
  if(t.lvl<5&&t.gold>=LVL_COST[t.lvl+1]+80){t.gold-=LVL_COST[t.lvl+1];t.lvl++;HOOK.townGrow(t,'level');}
}
// ---------------------------------------------------------------- the town guard: defend the town, or march to help a friend
function aidActive(u){return u.aid&&S.t<u.aid.until;}
function aidBrain(u){
  const a=u.aid;
  let best=null,bd=300;
  forNear(a.x,a.y,320,e=>{if(e.dead||!a.foes.includes(e.team)||!DEF[e.kind].unit)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<bd){bd=d;best=e;}});
  if(!best)forNear(u.x,u.y,200,e=>{if(e.dead||!a.foes.includes(e.team)||!DEF[e.kind].unit)return;const d=hyp(e.x-u.x,e.y-u.y);if(d<bd){bd=d;best=e;}});
  if(best){a.seen=S.t;u.order={type:'attack',id:best.id,auto:true,ax:a.x,ay:a.y};return;}
  if(S.t-(a.seen||a.t0)>30){u.aid=null;return;}
  if(hyp(u.x-a.x,u.y-a.y)>70)u.order={type:'move',x:a.x+(Math.random()-.5)*60,y:a.y+(Math.random()-.5)*40};
}
// a town answers a call for help: free, for a price, or not at all
function helpTerms(t,team,foe){
  const f=friendOf(t,team),other=team===1?2:1;
  // each favor the town owes counts as a step of friendship; each one you owe counts against
  let eff=f+(foe===3?1:0)-(foe===other&&repOf(t,other)>=repOf(t,team)?1:0)+clamp(favOf(t,team),-2,2);
  const U=townUnits(t),avail=Math.max(0,U.g.length+U.a.length-2),n=Math.min(avail,2+t.lvl);
  if(S.t<(t.helpCd[team]||0))return {kind:'busy'};
  if(n<1)return {kind:'few'};
  if(f>=5||eff>=4)return {kind:'free',n};
  if(eff>=2)return {kind:'paid',n,cost:{gold:Math.round((260-40*eff)*(1+.1*n))}};
  if(eff>=1&&Math.random()<.5)return {kind:'paid',n,cost:{gold:Math.round(320*(1+.1*n))}};
  return {kind:'refuse'};
}
function sendHelp(t,team,foe,p,n,paid){
  const U=townUnits(t),pool=U.a.concat(U.g).sort((a,b)=>hyp(a.x-p.x,a.y-p.y)-hyp(b.x-p.x,b.y-p.y)).slice(0,n);
  for(const u of pool){u.aid={team,foes:foe===0?[team===1?2:1,3]:[foe],until:S.t+170,x:p.x,y:p.y,t0:S.t};u.order={type:'move',x:p.x+(Math.random()-.5)*60,y:p.y+(Math.random()-.5)*40};u.path=null;}
  t.helpCd[team]=S.t+150;
  if(foe&&foe!==3)addRep(t,foe,-1);
  // help that was paid for is a deal; help for free is a favor to be returned
  if(!paid)addFav(t,team,-1);
  return pool.length;
}
// called from the UI or the AI: ask a town for help against an attack at p
function askHelp(team,ti,foe,p){
  const t=S.towns&&S.towns[ti];if(!t)return {kind:'none'};
  const terms=helpTerms(t,team,foe);
  if(terms.kind==='free'){const n=sendHelp(t,team,foe,p,terms.n);return {kind:'free',n,t};}
  return Object.assign(terms,{t});
}
function payHelp(team,ti,foe,p,terms){
  const t=S.towns[ti];if(!afford(team,terms.cost))return 'cost';
  pay(team,terms.cost);t.gold+=terms.cost.gold||0;sendHelp(t,team,foe,p,terms.n,true);addRep(t,team,.25);return 'ok';
}
// who is attacking us, and where
function underAttack(team){
  let foe=0,p=null,n=0;const mine=BLDS.filter(b=>!b.dead&&b.team===team);
  for(const e of S.ents){
    if(e.dead||!e.team||e.team===team||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;
    if(e.team!==3&&e.team!==(team===1?2:1))continue;
    const near=mine.find(b=>hyp(b.x-e.x,b.y-e.y)<12*TS);
    if(near){n++;if(!p){p={x:near.x,y:near.y};foe=e.team;}}
  }
  return n>=3?{foe,p,n}:null;
}

// ---------------------------------------------------------------- envoys: the towns come to talk, and you can go to them
function townEnvoys(dt){
  for(const t of S.towns){
    t.envT-=dt;if(t.envT>0)continue;t.envT=170+Math.random()*120;
    if(S.ents.some(e=>!e.dead&&e.kind==='envoyN'&&e.town===t.i))continue;
    const to=S.ai&&castleOf(2)&&(repOf(t,2)>repOf(t,1)+1||Math.random()<.35)?2:1;
    const h=homePoint(to);if(!h)continue;
    const g=walkNear(t.x,t.y+14),u=spawnUnit('envoyN',0,g.x,g.y,{town:t.i,visit:to,phase:'go'});u.nm=['Dom Afonso','Dona Leonor','Mestre Vasco','Dona Clara','Senhor Nuno'][(t.i*2+Math.floor(S.t/300))%5];
    u.order={type:'envoy'};
    if(to===1)HOOK.townGrow(t,'envoy',u);
  }
}
function doEnvoy(u,dt){
  const t=S.towns[u.town];if(!t){u.dead=true;return;}
  const h=u.phase==='back'?{x:t.x,y:t.y}:homePoint(u.visit);if(!h){u.phase='back';return;}
  const w=walkTo(u,h.x,h.y,dt,50);
  if(w==='fail'){removeQuiet(u);return;}
  if(w!=='here')return;
  if(u.phase==='back'){removeQuiet(u);return;}
  if(u.phase==='go'){u.phase='talk';u.talkT=S.t;if(u.visit===1)envoyPropose(u,t);else aiEnvoy(u,t);return;}
  if(u.phase==='talk'&&(u.answered||S.t-u.talkT>70)){u.phase='back';u.path=null;}
}
// what the envoy proposes to you
function envoyPropose(u,t){
  const f=friendOf(t,1),R=S.teams[1].res,c=castleOf(1),sol=c?freeSoldiers(1,c.x,c.y):[];
  const opts=[];
  if(f>=3)opts.push(['gift-in',3]);
  const wr=t.want==='arms'?'gold':t.want;
  opts.push(['gift',2.5]);
  if(t.want!=='arms'&&R[t.want]>=CART_LOAD+50)opts.push(['contract',3]);
  if(sol.length>=4)opts.push(['guard',1.5]);
  if(S.ai&&castleOf(2))opts.push(['news',f>=3?2.5:1.2]);
  if(f>=1&&!activeCtr(t,'merc',1)&&R.gold>=200)opts.push(['offerMerc',2.2]);
  {const vets=sol.filter(q=>(q.rank||0)>=1&&!q.ctr&&!DEF[q.kind].elite);if(vets.length>=3&&f>=1)opts.push(['buyVets',1.6]);}
  if(f>=2&&!activeCtr(t,'protect',1)&&!activeCtr(t,'loyalty',1)&&!loyalTo(t))opts.push(['offerProtect',1.4]);
  let tot=opts.reduce((a,o)=>a+o[1],0),x=Math.random()*tot,k=opts[0][0];for(const o of opts){x-=o[1];if(x<=0){k=o[0];break;}}
  const who=`${u.nm}, embaixador de ${t.name}`,lvl=FRIEND[f];
  if(k==='gift-in'){
    const g=t.spec==='gold'?{gold:70}:{[t.spec]:120};for(const r in g){S.teams[1].res[r]+=g[r];S.teams[1].stats[r]+=g[r];}
    u.answered=true;HOOK.envoy(u,t,'say',`${t.name} manda um presente para os amigos: ${Object.entries(g).map(([r,v])=>`${v} de ${RES_NAME[r]}`).join(', ')}. Que a amizade dure!`);return;
  }
  if(k==='news'){
    const F=S.teams[2],army=S.ents.filter(e=>!e.dead&&e.team===2&&DEF[e.kind].mil).length,trades=svcList().list.filter(m=>m.team===2&&m.ok).length;
    const msg=f>=3?`Notícias da estrada: o Reino Vermelho está na Era ${ERAS[F.era].roman}, tem ${army} soldados e já fez ${trades} negócios com as vilas. Amizade dele com ${t.name}: ${repStars(friendOf(t,2))}.`:`Dizem que o Reino Vermelho anda comprando e vendendo nas vilas. Seja amigo de ${t.name} e contaremos mais.`;
    u.answered=true;HOOK.envoy(u,t,'say',msg);addRep(t,1,.25);return;
  }
  const q={kind:'envoy',eid:u.id,town:t.i,who:`${who} (${lvl})`,av:'av14',loc:{x:u.x,y:u.y,id:u.id}};
  if(k==='gift'){const g=wr==='gold'?{gold:60}:{[wr]:90};q.what='gift';q.gift=g;q.cost=g;q.text=`${t.name} vai fazer a festa da colheita. Um presente de ${Object.entries(g).map(([r,v])=>`${v} de ${RES_NAME[r]}`).join(', ')} aproximaria os nossos povos. Podemos contar com vocês?`;}
  else if(k==='contract'){const p=Math.round(townPrice(t,t.want,false,1)*1.35*CART_LOAD/100);q.what='contract';q.pay=p;q.text=`${t.name} precisa de ${CART_LOAD} de ${RES_NAME[t.want]} com urgência e paga ${p} de ouro, bem acima do preço de hoje. Vocês levam com escolta? Cumprindo, a amizade cresce em dobro.`;}
  else if(k==='offerMerc'){const tm=ctrTerms('merc',t,1,{min:10});q.what='merc';q.terms=tm;q.cost=tm.cost;q.text=`${t.name} tem 4 ${DEF[tm.unit].name.toLowerCase()}s livres. Eles lutam por vocês durante 10 minutos por ${tm.cost.gold} de ouro, sem ocupar casa. Fechamos?`;}
  else if(k==='buyVets'){const vets=sol.filter(q2=>(q2.rank||0)>=1&&!q2.ctr&&!DEF[q2.kind].elite).sort((a,b)=>(b.rank||0)-(a.rank||0)).slice(0,2);const pay=vets.reduce((a,v)=>a+90+40*(v.rank||0),0);
    q.what='vets';q.ids=vets.map(v=>v.id);q.pay=pay;q.text=`A guarda de ${t.name} precisa de experiência. Compramos ${vets.map(v=>rankedName(v)).join(' e ')} por ${pay} de ouro. Eles servem na nossa vila e a amizade cresce. Vendem?`;q.loc={x:vets[0].x,y:vets[0].y,id:vets[0].id};}
  else if(k==='offerProtect'){q.what='protect';q.text=`Os tempos estão perigosos. ${t.name} oferece proteção: vocês dão 8% da produção por minuto e nós mandamos guardas sempre que vocês forem atacados. Aceitam?`;}
  else if(k==='guard'){q.what='guard';q.text=`Bandidos rondam ${t.name}. Mandem 3 soldados para guardar a vila por dois minutos: pagamos 150 de ouro e não esquecemos o favor.`;}
  ask(q);
}
// the Red Kingdom answers its envoys on its own
function aiEnvoy(u,t){
  const R=S.teams[2].res;u.answered=true;
  if(R.gold>=200||R.food>=400){const g=R.gold>=200?{gold:60}:{food:90};pay(2,g);t.gold+=g.gold||0;addRep(t,2,.6);}
}
function envoyAnswer(q,yes){
  const t=S.towns[q.town],u=byId.get(q.eid);if(u)u.answered=true;if(!t)return;
  if(!yes){HOOK.envoy(u,t,'say',q.what==='gift'?'Entendemos. Fica para a próxima festa.':'Que pena. Procuraremos outro reino.');addRep(t,1,-.1);return;}
  if(q.what==='gift'){if(!afford(1,q.gift)){HOOK.toast('Faltam recursos para o presente.','warn');return;}pay(1,q.gift);t.gold+=q.gift.gold||20;addRep(t,1,.6);HOOK.envoy(u,t,'say',`Obrigado! ${t.name} não esquece quem lembra dela. (amizade ${FRIEND[friendOf(t,1)]})`);}
  else if(q.what==='contract'){const m=svcNew('sell',1,{town:t.i,res:t.want,n:CART_LOAD,who:'Contrato'});if(!m)return;m.pay={gold:q.pay};m.value=q.pay;m.contract=true;const sol=freeSoldiers(1,m.from.x,m.from.y);m.escN=Math.min(Math.max(0,sol.length-1),2);m.risk=svcRisk(m,m.escN);const r=svcStart(m);if(r!=='ok')HOOK.toast({cost:'Faltam recursos para o contrato.',slots:'Todas as carroças estão ocupadas: o contrato ficou para depois.'}[r]||'Não deu para cumprir o contrato agora.','warn');else HOOK.envoy(u,t,'say','Combinado! Esperamos a carroça.');}
  else if(q.what==='merc'){if(!afford(1,q.terms.cost)){HOOK.toast('Falta ouro para os mercenários.','warn');return;}const d=townDecide(t,1,q.terms);if(d.ok||d.counter){ctrActivate(1,q.terms);HOOK.envoy(u,t,'say','Combinado! Os nossos já estão indo para o seu castelo.');}else HOOK.envoy(u,t,'say',d.why);}
  else if(q.what==='protect'){const tm=ctrTerms('protect',t,1);const c=ctrActivate(1,tm);if(c)HOOK.envoy(u,t,'say','Fechado. Quando precisarem, estaremos lá.');}
  else if(q.what==='vets'){const m=svcNew('soldiers',1,{town:t.i,ids:(q.ids||[]).filter(id=>alive(byId.get(id))),pay:q.pay,who:`Guarda de ${t.name}`});if(!m)return;m.escN=0;const r=svcStart(m);if(r==='ok'){addRep(t,1,.5);HOOK.envoy(u,t,'say','Obrigado! Eles vão ensinar muito à nossa guarda.');}else HOOK.toast('Os soldados não puderam ir agora.','warn');}
  else if(q.what==='guard'){const m=svcNew('garrison',1,{town:t.i,who:'Pedido da vila'});if(!m)return;const r=svcStart(m);if(r!=='ok')HOOK.toast(r==='slots'?'Todas as comitivas estão ocupadas.':'Não há 3 soldados livres agora.','warn');else HOOK.envoy(u,t,'say','Obrigado! Os soldados de vocês serão bem recebidos.');}
}

// ---------------------------------------------------------------- bandits sometimes go for a town: the town asks you for help
function townRaid(){
  if(!S.towns||!S.towns.length)return false;
  const free=S.towns.filter(q=>!q.raid);if(!free.length)return false;
  const t=free[Math.floor(Math.random()*free.length)];
  let spot=null;
  for(let k=0;k<120&&!spot;k++){const a=Math.random()*Math.PI*2,r=(13+Math.random()*6)*TS,x=t.x+Math.cos(a)*r,y=t.y+Math.sin(a)*r,tx=tileOf(x),ty=tileOf(y);if(!inB(tx,ty)||!walkXY(tx,ty)||!reachT(tx,ty))continue;if([1,2].some(q=>{const c=castleOf(q);return c&&hyp(c.x-x,c.y-y)<16*TS;}))continue;spot={x:tx*TS+16,y:ty*TS+16};}
  if(!spot)return false;
  const n=Math.min(8,3+Math.floor(S.t/240)),pool=S.t>600?['bandit','banditA','bandit','chief']:['bandit','banditA','bandit'];
  const ids=[];
  for(let i=0;i<n;i++){const u=spawnUnit(pool[i%pool.length],3,spot.x+(Math.random()-.5)*50,spot.y+(Math.random()-.5)*40,{roam:true,vsTown:t.i,leaveAt:S.t+150});u.order={type:'move',x:t.x+(Math.random()-.5)*80,y:t.y+(Math.random()-.5)*50,amove:true,raid:true};ids.push(u.id);}
  t.raid={ids,t:S.t,helpers:[],ans:null};
  const fv=favOf(t,1),plea=fv<0?` Nós ajudamos vocês antes: contamos com vocês agora.`:fv>0?` Sabemos que já devemos um favor, mas precisamos de vocês.`:` Se mandarem soldados agora, a vila não vai esquecer.`;
  ask({kind:'townhelp',town:t.i,who:`Um mensageiro de ${t.name} pede socorro`,av:'av15',text:`Bandidos estão atacando ${t.name}! São ${n}.${plea}`,loc:{x:t.x,y:t.y}});
  HOOK.townGrow(t,'raid');
  return true;
}
function townHelpAnswer(q,yes){
  const t=S.towns[q.town];if(!t||!t.raid||t.raid.ans)return;
  if(!yes){
    t.raid.ans='no';dropTownAsk(t.i);
    // nobody is obliged to go; but turning down someone who helped you hurts
    const owed=favOf(t,1)<0;addRep(t,1,owed?-1:-.25);if(owed)addHonor(1,-5,'ingrate');HOOK.townGrow(t,owed?'ingrate':'refused');
    return;
  }
  const c=castleOf(1),sol=c?freeSoldiers(1,t.x,t.y).slice(0,5):[];
  if(!sol.length){HOOK.toast('Não há soldados livres para mandar. Junte tropas e tente de novo pelo sino.','warn');return;}
  for(const u of sol){u.order={type:'move',x:t.x+(Math.random()-.5)*70,y:t.y+(Math.random()-.5)*50,amove:true};u.path=null;u.cmdT=S.t;}
  t.raid.helpers=sol.map(u=>u.id);t.raid.ans='yes';dropTownAsk(t.i);
  HOOK.toast(`${sol.length} soldados marcham para defender ${t.name}.`,'good',{x:t.x,y:t.y});
}
function townRaidCheck(){
  for(const t of S.towns){
    if(!t.raid)continue;
    const left=t.raid.ids.filter(id=>{const u=byId.get(id);return u&&!u.dead&&!u.leave;}).length;
    if(left===0||S.t-t.raid.t>200){
      const sent=t.raid.ans==='yes'&&t.raid.helpers.length>0;
      // whoever came to help is owed a favor, even if the bandits got away
      if(sent){addFav(t,1,1);addHonor(1,2,'saved');if(left===0)addRep(t,1,1);HOOK.townGrow(t,left===0?'saved':'tried');}
      else if(!t.raid.ans&&favOf(t,1)<0)addRep(t,1,-.5);
      t.raidedT=S.t;
      dropTownAsk(t.i);
      t.raid=null;
    }
  }
}

// ---------------------------------------------------------------- a town that owes you may come on its own to return the favor
function townRepay(){
  const ua=underAttack(1);if(!ua||!ua.n)return;
  if(S.t<(S.repayT||0))return;
  const t=S.towns.filter(q=>favOf(q,1)>=1&&!q.raid&&S.t>=(q.helpCd[1]||0)).sort((a,b)=>favOf(b,1)-favOf(a,1))[0];
  if(!t||Math.random()>.35)return;
  const r=helpTerms(t,1,ua.foe);if(r.kind!=='free'&&r.kind!=='paid')return;
  const n=sendHelp(t,1,ua.foe,ua.p,r.n,false);S.repayT=S.t+90;
  if(n)HOOK.townGrow(t,'repay',n);
}
// ---------------------------------------------------------------- the Red Kingdom also calls the towns when you attack it
function aiAskHelp(){
  if(!S.ai||!S.towns)return;
  const ua=underAttack(2);if(!ua||ua.foe!==1||S.t<(S.ai.helpMsgT||0))return;
  const c=castleOf(2);
  const t=S.towns.filter(t=>S.t>=(t.helpCd[2]||0)&&friendOf(t,2)>=2&&!townFoe(t.i,2)&&(!loyalTo(t)||loyalTo(t)===2)).sort((a,b)=>(friendOf(b,2)-friendOf(a,2))||(hyp(a.x-c.x,a.y-c.y)-hyp(b.x-c.x,b.y-c.y)))[0];
  if(!t)return;
  if(proposeContract(2,'help',t.i,{foe:1,p:ua.p})==='ok'){S.ai.helpMsgT=S.t+150;HOOK.townGrow(t,'redMessenger');}
}

// ---------------------------------------------------------------- once per tick
function townsTick(dt){
  if(!S.towns||!S.towns.length)return;
  if(!S.towns[0].lvl)for(const t of S.towns)initTown(t);
  S.townG=(S.townG||0)+dt;
  if(S.townG>=4){S.townG=0;for(const t of S.towns)townGrowth(t);townRaidCheck();aiAskHelp();townRepay();}
  townEnvoys(dt);
  // bandits sometimes go for a town instead of a kingdom
  S.townRaidT=(S.townRaidT??420+Math.random()*200)-dt;
  if(S.townRaidT<=0){S.townRaidT=260+Math.random()*220;townRaid();}
}

