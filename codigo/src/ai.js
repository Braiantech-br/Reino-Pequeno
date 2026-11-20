// ================================================================ AI: the Red Kingdom plays by the same rules as the player
function aiInit(team){
  const st={think:1,attacking:false,target:null,lastAttack:0,harassEra:0,raid:null,retreatT:-99,alarm:null,waves:0,rebalanceT:8,lumberT:40,repairT:0};
  if(team===1)S.ai1=st;else S.ai=st;
}
// The same AI plays either kingdom: ME is the team it is thinking for, FO the other one.
// Red is S.ai (always, in the quick battle); Blue is S.ai1 only in the observer mode (machine against machine).
let ME=2,FO=1;
function AIX(){return ME===1?S.ai1:S.ai;}
function withTeam(t,fn){const a=ME,b=FO;ME=t;FO=t===1?2:1;try{return fn();}finally{ME=a;FO=b;}}
const watching=()=>!!(S&&S.cfg&&S.cfg.watch);
function strength(list){
  let s=0;
  for(const u of list){
    const D=DEF[u.kind];
    if(D.building){if(D.dmg&&u.built)s+=u.hp*(D.dmg*towerMult(u.team)/D.cd)*.25;continue;}
    const dps=D.holy?7:(D.dmg*dmgMult(u.team)/D.cd);
    s+=u.hp*dps;
  }
  return s;
}
function centroid(list){let x=0,y=0;for(const u of list){x+=u.x;y+=u.y;}return list.length?{x:x/list.length,y:y/list.length}:null;}
function aiScan(){
  const T=S.teams[ME];
  const I={T,era:T.era,res:T.res,pawns:[],idle:[],army:[],monks:[],blds:{},unbuilt:[],castle:castleOf(ME),
    ships:[],foeArmy:[],foePawns:[],foeBlds:[],foeMil:{warrior:0,archer:0,lancer:0,monk:0},gath:{wood:0,gold:0,food:0},threats:[],wild:[],lairs:[]};
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(e.team===ME){
      if(D.unit){
        if(e.kind==='pawn'){I.pawns.push(e);if(!e.order)I.idle.push(e);else if(e.order.type==='gather')I.gath[e.order.res]++;}
        else if(D.naval)I.ships.push(e);else if(D.holy)I.monks.push(e);else if(!D.boss&&!e.wave&&!D.cart&&!e.svc&&!D.civil&&!e.retreat)I.army.push(e);
      }else if(D.building){(I.blds[e.kind]=I.blds[e.kind]||[]).push(e);if(!e.built)I.unbuilt.push(e);}
    }else if(e.team===FO){
      if(D.unit){if(D.mil){I.foeArmy.push(e);I.foeMil[baseKind(e.kind)]=(I.foeMil[baseKind(e.kind)]||0)+1;}else I.foePawns.push(e);}
      else if(D.building)I.foeBlds.push(e);
    }else if(e.team===3){if(D.unit)I.wild.push(e);else if(D.building)I.lairs.push(e);}
  }
  I.pop=popUsed(ME);I.cap=popCap(ME);
  const c=I.castle;
  if(c){
    const fc=castleOf(FO)||{x:c.x-800,y:c.y};
    const dx=fc.x-c.x,dy=fc.y-c.y,dl=hyp(dx,dy)||1;
    I.dir={x:dx/dl,y:dy/dl};
    I.home={x:c.x,y:c.y-40};
    I.rally={x:c.x+I.dir.x*150,y:c.y+40+I.dir.y*150};
  }
  const mine=[];for(const k in I.blds)mine.push(...I.blds[k]);
  for(const f of I.foeArmy.concat(I.wild)){for(const b of mine){if(distRect(f.x,f.y,rectOf(b))<10*TS){I.threats.push(f);break;}}}
  return I;
}
const aiCount=(I,k)=>(I.blds[k]||[]).length;
const aiBuilt=(I,k)=>(I.blds[k]||[]).filter(b=>b.built).length;

function aiUpdate(dt){
  if(S.ai)withTeam(2,()=>aiStep(dt));
  if(S.ai1)withTeam(1,()=>aiStep(dt));
}
function aiStep(dt){
  const A=AIX();if(!A)return;
  A.think-=dt;if(A.think>0)return;
  const step=S.diff.think;A.think=step;
  const I=aiScan();
  if(!I.castle)return;
  I.goal=aiGoal(I);
  aiDefense(I);
  aiEconomy(I,step);
  aiBuildings(I,step);
  if(I.goal&&!I.T.research&&afford(ME,I.goal.cost)){if(startResearch(ME)==='ok')I.goal=null;}
  aiTrain(I);
  aiArmy(I);
  aiDiplo(I);
}
// ---------------------------------------------------------------- diplomacy: the Red Kingdom hires, protects, swears, outbids, conquers
function aiDiplo(I){
  const A=AIX();
  if(clDiplo(I))return;
  if(!S.towns||!S.towns.length||S.t<(A.dipNext||200))return;A.dipNext=S.t+22;
  if(svcList().list.some(m=>m.team===ME&&m.type==='contract'&&m.state==='run'))return;
  const gold=I.res.gold,mine=ctrList().filter(c=>c.team===ME&&c.state==='active'),c=I.castle;
  const ok=S.towns.filter(T=>!townFoe(T.i,ME)&&(!T.owner||T.owner===ME));
  if(!ok.length)return;
  const fav=ok.slice().sort((a,b)=>(friendOf(b,ME)-friendOf(a,ME))||(hyp(a.x-c.x,a.y-c.y)-hyp(b.x-c.x,b.y-c.y)));
  const best=fav[0];
  // 1. mercenaries for a big push, or when the village is in trouble
  if((A.attacking||I.threats.length>=4)&&!mine.some(k=>k.kind==='merc'||k.kind==='mercLife')&&gold>=300){
    const T=fav.find(t=>friendOf(t,ME)>=1);if(T&&proposeContract(ME,'merc',T.i,{min:A.attacking?5:10})==='ok')return;
  }
  // 2. protection from the friendliest town
  if(!mine.some(k=>k.kind==='protect'||k.kind==='loyalty')&&friendOf(best,ME)>=2&&gold>=280&&S.t>480){
    if(!loyalTo(best)&&proposeContract(ME,'protect',best.i)==='ok')return;
  }
  // 3. rich and well liked: swear an alliance, outbidding the player if needed
  if(friendOf(best,ME)>=3&&gold>=650&&!mine.some(k=>k.kind==='loyalty')&&S.t>720){
    const pc=activeCtr(best,'loyalty',FO)||activeCtr(best,'protect',FO);
    if(pc&&FO===1&&!watching()&&S.t>(A.bidT||0)){A.bidT=S.t+300;const b=bidFor(ME,best.i);if(b&&afford(ME,{gold:b.offer})){
      ask({kind:'bid',bid:b,cost:{gold:b.cover},who:`${best.name} avisa`,av:'av14',loc:{x:best.x,y:best.y},text:`O Reino Vermelho ofereceu ${b.offer} de ouro para ${best.name} quebrar ${CTR[pc.kind].name.toLowerCase()} com vocês e jurar com ele. Se vocês cobrirem com ${b.cover} de ouro, ficamos do seu lado. Cobrem?`});return;}}
    if(!pc&&proposeContract(ME,'loyalty',best.i)==='ok')return;
  }
  // 4. a hero for the hard and insane generals
  if(S.diff.key!=='normal'&&friendOf(best,ME)>=4&&gold>=900&&!mine.some(k=>k.kind==='hero')&&proposeContract(ME,'hero',best.i)==='ok')return;
  // 5. buy back a town the player conquered
  for(const T of S.towns)if(T.owner===FO&&(T.loyal||0)<55&&gold>=ctrTerms('liberate',T,ME).cost.gold+200&&S.t>(A.libT||0)){A.libT=S.t+400;if(proposeContract(ME,'liberate',T.i)==='ok')return;}
  // 6. conquest: late, rarely, a weak town close to home
  if(S.diff.key!=='normal'&&S.t>1500&&I.army.length>=16&&!A.attacking&&!S.towns.some(T=>T.siege)&&Math.random()<(S.diff.key==='insano'?.25:.1)){
    const T=S.towns.filter(t=>!t.owner&&loyalTo(t)!==ME&&hyp(t.x-c.x,t.y-c.y)<45*TS&&townGuardsNear(t,16*TS)<=6).sort((a,b)=>hyp(a.x-c.x,a.y-c.y)-hyp(b.x-c.x,b.y-c.y))[0];
    if(T&&startConquest(ME,T.i)==='ok'){A.siegeTown=T.i;for(const u of I.army.slice(0,Math.ceil(I.army.length*.6))){u.order={type:'move',x:T.x+(Math.random()-.5)*60,y:T.y+(Math.random()-.5)*40,amove:true};u.path=null;}}
  }
}
// the next age is the long-term goal once the economy is big enough for it
function aiGoal(I){
  const next=I.era+1,E=ERAS[next];if(!E||I.T.research)return null;
  if(S.t<S.diff.eraMin[next]-E.time)return null;
  const need=[0,9,15,21,26][I.era]-(S.diff.key==='insano'?2:0);
  const cl=clPlan();if(cl&&cl.era==='esperar'&&I.threats.length<3)return null;
  if(I.pawns.length<need-(cl&&cl.era==='agora'?4:0))return null;
  if(!eraReqMet(ME,next))return null;
  return {era:next,cost:E.cost};
}
function aiReserve(I){
  if(!I.goal||I.threats.length>=3)return {};
  return I.goal.cost;
}
function aiCanBuy(I,cost,ignoreReserve){
  const rs=ignoreReserve?{}:aiReserve(I);
  for(const k in cost)if(I.res[k]-(rs[k]||0)<cost[k])return false;
  return true;
}

// ---------------------------------------------------------------- defense: answer any raid on the town
function aiDefense(I){
  const A=AIX();
  if(!I.threats.length){A.defending=false;return;}
  A.defending=true;
  const c=centroid(I.threats),tStr=strength(I.threats);
  const home=I.army.filter(u=>hyp(u.x-c.x,u.y-c.y)<900);
  const away=I.army.filter(u=>hyp(u.x-c.x,u.y-c.y)>=900);
  if(A.attacking&&(tStr>strength(home)*.8||I.castle.hp<I.castle.maxhp*.7)){
    A.attacking=false;A.retreatT=S.t;
    for(const u of away)u.order={type:'move',x:c.x,y:c.y,amove:true};
  }
  for(const u of home.concat(I.monks)){
    if(u.order&&(u.order.type==='attack'||u.order.type==='convert'||u.order.type==='cast'||u.order.type==='heal'))continue;
    u.order={type:'move',x:c.x+(Math.random()-.5)*40,y:c.y+(Math.random()-.5)*40,amove:true};u.path=null;
  }
}

// ---------------------------------------------------------------- economy
function aiWeights(I){
  const base=[null,{food:.5,wood:.42,gold:.08},{food:.42,wood:.33,gold:.25},{food:.38,wood:.27,gold:.35},{food:.36,wood:.28,gold:.36},{food:.36,wood:.28,gold:.36}][I.era];
  const w={...base};
  const cl=clPlan();if(cl&&cl.eco){for(const k in w)w[k]=w[k]*.4+(cl.eco[k]||0)*.6;}
  if(I.goal)for(const k in I.goal.cost){const short=Math.max(0,I.goal.cost[k]-I.res[k]);w[k]+=short/1500;}
  for(const k in w)if(I.res[k]>1500)w[k]*=.4;
  let s=0;for(const k in w)s+=w[k];for(const k in w)w[k]/=s;
  return w;
}
function aiAssign(p,res,I){
  const c=I.castle,ox=p.x,oy=p.y;
  if(res==='food'){
    const f=findFood(p,c.x,c.y-30,640)||findFood(p,ox,oy,500);
    if(!f){I.needFarm=true;return false;}
    if(f.kind==='farm')f.worker=p.id;
    p.order={type:'gather',res,id:f.id,phase:'go'};p.path=null;return true;
  }
  const r=findResource(p,res,ox,oy,false)||findResource(p,res,c.x,c.y,true);
  if(!r)return false;
  p.order=Object.assign({type:'gather',res,phase:'go'},r);p.path=null;return true;
}
function aiEconomy(I,step){
  const A=AIX(),c=I.castle,T=I.T;
  const cl=clPlan(),target=[0,12,19,25,30,34][I.era]+S.diff.pawnBonus+(cl?cl.pawns:0);
  if(!T.research&&c.queue.length<2&&I.pawns.length+c.queue.length<target&&I.pop<I.cap)trainAt(c,'pawn');
  // farms take over once the sheep near home run low
  let sheepHome=0;for(const e of S.ents)if(!e.dead&&DEF[e.kind].critter&&hyp(e.x-c.x,e.y-c.y)<10*TS)sheepHome++;
  const farms=(I.blds.farm||[]).length;
  if(I.gath.food>sheepHome*2+farms)I.needFarm=true;
  const w=aiWeights(I),n=I.pawns.length,want={};
  for(const k in w)want[k]=w[k]*n;
  for(const p of I.idle){
    const order=Object.keys(want).sort((a,b)=>(want[b]-I.gath[b])-(want[a]-I.gath[a]));
    for(const res of order){if(aiAssign(p,res,I)){I.gath[res]++;break;}}
  }
  A.rebalanceT-=step;
  if(A.rebalanceT<=0){
    A.rebalanceT=10;
    const ks=Object.keys(want);
    const over=ks.filter(k=>I.gath[k]-want[k]>=1.5).sort((a,b)=>(I.gath[b]-want[b])-(I.gath[a]-want[a]));
    const under=ks.filter(k=>want[k]-I.gath[k]>=1.5).sort((a,b)=>(want[b]-I.gath[b])-(want[a]-I.gath[a]));
    let moves=S.diff.key==='normal'?1:2;
    for(const from of over)for(const to of under){
      if(moves<=0)break;
      const p=I.pawns.find(q=>q.order&&q.order.type==='gather'&&q.order.res===from&&(!q.carry||!q.carry.amt));
      if(p&&aiAssign(p,to,I)){I.gath[from]--;I.gath[to]++;moves--;}
    }
  }
  // repair damaged buildings when it is calm
  A.repairT-=step;
  if(A.repairT<=0&&!I.threats.length){
    A.repairT=6;
    for(const k in I.blds)for(const b of I.blds[k]){
      if(!b.built||b.hp>=b.maxhp*.65)continue;
      if(I.pawns.some(p=>p.order&&p.order.type==='build'&&p.order.id===b.id))continue;
      const p=aiNearestPawn(I,b.x,b.y);if(p){p.order={type:'build',id:b.id,back:p.order&&p.order.type==='gather'?p.order:null};p.path=null;}
      return;
    }
  }
}
function aiNearestPawn(I,x,y){
  let best=null,bd=1e9;
  for(const p of I.pawns){
    if(p.order&&(p.order.type==='build'||p.order.type==='flee'))continue;
    let d=hyp(p.x-x,p.y-y);if(p.carry&&p.carry.amt>5)d+=150;if(p.order&&p.order.res==='wood')d-=60;
    if(d<bd){bd=d;best=p;}
  }
  return best;
}

// ---------------------------------------------------------------- construction
function ringClear(tx,ty,w,h){
  for(let y=ty-1;y<=ty+h;y++)for(let x=tx-1;x<=tx+w;x++){
    if(x>=tx&&x<tx+w&&y>=ty&&y<ty+h)continue;
    if(!inB(x,y))return false;
    const i=idx(x,y);if(S.tiles[i]===WATER)return false;
    if(occ[i]){const o=byId.get(occ[i]);if(o&&!DEF[o.kind].flat)return false;}
  }
  return true;
}
function aiSpot(kind,ax,ay,rmin,rmax){
  const D=DEF[kind];
  for(let r=rmin;r<=rmax;r++){
    const tries=Math.max(8,Math.round(r*7));
    for(let k=0;k<tries;k++){
      const a=k/tries*Math.PI*2+r*.9;
      const tx=Math.round(ax/TS+Math.cos(a)*r-D.w/2),ty=Math.round(ay/TS+Math.sin(a)*r*.85-D.h/2);
      if(!canPlace(ME,kind,tx,ty))continue;
      if(!D.flat&&!ringClear(tx,ty,D.w,D.h))continue;
      return {tx,ty};
    }
  }
  return null;
}
function aiBuild(I,kind,spot){
  if(!spot)return false;
  const D=DEF[kind];
  const p=aiNearestPawn(I,(spot.tx+D.w/2)*TS,(spot.ty+D.h/2)*TS);if(!p)return false;
  const b=placeBuilding(ME,kind,spot.tx,spot.ty,[p]);
  if(b){I.unbuilt.push(b);(I.blds[kind]=I.blds[kind]||[]).push(b);
    if(S.diff.key!=='normal'&&D.w>=3){const q=aiNearestPawn(I,b.x,b.y);if(q){q.order={type:'build',id:b.id,back:q.order&&q.order.type==='gather'?q.order:null};q.path=null;}}
  }
  return !!b;
}
function aiPlan(I){
  const e=I.era,ins=S.diff.key==='insano',hard=S.diff.key!=='normal';
  const p=[];
  if(I.pawns.length>=7)p.push(['barracks',1]);
  if(e>=2){p.push(['archery',1]);if(I.pawns.length>=13)p.push(['tower',1]);if(ins)p.push(['barracks',2]);if(I.pawns.length>=16)p.push(['market',1]);}
  if(e>=3){p.push(['monastery',1]);p.push(['tower',2]);if(hard)p.push(['barracks',2]);}
  if(e>=4){p.push(['archery',2]);p.push(['tower',3]);if(ins)p.push(['barracks',3]);}
  if(e>=5){if(hard)p.push(['monastery',2]);p.push(['tower',4]);}
  const cl=clPlan();if(cl&&cl.build.length){const extra=[];for(const k of cl.build){const have=p.filter(q=>q[0]===k).reduce((m,q)=>Math.max(m,q[1]),0);extra.push([k,Math.max(have,0)+1]);}return extra.concat(p);}
  return p;
}
function aiBuildings(I,step){
  const A=AIX(),c=I.castle;
  // every construction site needs a builder
  for(const b of I.unbuilt){
    if(I.pawns.some(p=>p.order&&p.order.type==='build'&&p.order.id===b.id))continue;
    const p=aiNearestPawn(I,b.x,b.y);if(p){p.order={type:'build',id:b.id,back:p.order&&p.order.type==='gather'?p.order:null};p.path=null;}
  }
  const sites=I.unbuilt.filter(b=>b.kind!=='farm').length;
  const maxSites=I.era>=3||S.diff.key==='insano'?2:1;
  // houses before anything else
  if(I.cap<100&&I.cap-I.pop<=3+I.era&&!I.unbuilt.some(b=>b.kind==='house')&&aiCanBuy(I,DEF.house.cost,true)){
    aiBuild(I,'house',aiSpot('house',c.x,c.y-40,4,10));return;
  }
  // farms when sheep run out
  if(I.needFarm&&aiCount(I,'farm')<14&&I.unbuilt.filter(b=>b.kind==='farm').length<2&&aiCanBuy(I,DEF.farm.cost,true)){
    aiBuild(I,'farm',aiSpot('farm',c.x,c.y-30,3,8));
  }
  if(sites>=maxSites)return;
  // a house next to a far-away forest works as a lumber camp
  A.lumberT-=step;
  if(A.lumberT<=0){
    A.lumberT=35;
    const cut=I.pawns.filter(p=>p.order&&p.order.type==='gather'&&p.order.res==='wood'&&p.order.tx!=null);
    if(cut.length>=4){
      let sx=0,sy=0,far=0;
      for(const p of cut){const x=p.order.tx*TS+16,y=p.order.ty*TS+16;sx+=x;sy+=y;const d=nearestDrop(p,x,y);if(!d||distRect(x,y,rectOf(d))>7*TS)far++;}
      if(far>=cut.length/2&&I.cap<100&&aiCanBuy(I,DEF.house.cost,true)){aiBuild(I,'house',aiSpot('house',sx/cut.length,sy/cut.length,1,5));return;}
    }
  }
  const front={x:c.x+I.dir.x*5*TS,y:c.y-30+I.dir.y*5*TS};
  for(const [k,n] of aiPlan(I)){
    if(aiCount(I,k)>=n)continue;
    if(!unlocked(ME,k))continue;
    if(I.unbuilt.some(b=>b.kind===k))continue;
    const isReq=ERAS[I.era+1]&&ERAS[I.era+1].req.includes(k);
    if(!aiCanBuy(I,DEF[k].cost,isReq))return;
    let spot;
    if(k==='tower'){
      const mines=S.ents.filter(g=>!g.dead&&g.kind==='gold'&&hyp(g.x-c.x,g.y-c.y)<14*TS);
      const m=mines[aiCount(I,'tower')%Math.max(1,mines.length)];
      spot=aiCount(I,'tower')%2===0||!m?aiSpot('tower',c.x+I.dir.x*8*TS,c.y+I.dir.y*8*TS,0,5):aiSpot('tower',m.x,m.y-20,2,5);
    }else spot=aiSpot(k,front.x,front.y,2,10);
    aiBuild(I,k,spot);
    return;
  }
}

// ---------------------------------------------------------------- army production: counter what the player fields
function aiTrain(I){
  if(I.pop>=I.cap)return;
  const f=I.foeMil,tot=f.warrior+f.archer+f.lancer+1;
  const own={warrior:0,archer:0,lancer:0};for(const u of I.army)own[u.kind]=(own[u.kind]||0)+1;
  const want={warrior:1+3*f.archer/tot,archer:1+3*f.lancer/tot+(I.era>=2?.3:0),lancer:1+3*f.warrior/tot};
  const qmax=S.diff.key==='insano'?3:2;
  const score=k=>want[k]/(1+own[k]*.35);
  // warships from a dock, when the enemy sails or once the kingdom can afford them
  for(const d of I.blds.dock||[]){if(!d.built||d.queue.length)continue;const fs=I.foeArmy.filter(u=>DEF[u.kind].naval).length;
    if(unlocked(ME,'warship')&&I.ships.filter(u=>DEF[u.kind].warship).length<Math.min(4,1+fs)&&aiCanBuy(I,DEF.warship.cost)&&(fs||I.era>=3))trainAt(d,'warship');}
  for(const kind of['barracks','archery','monastery']){
    for(const b of I.blds[kind]||[]){
      if(!b.built||b.queue.length>=qmax)continue;
      let k=null;
      const cnt=kk=>I.army.filter(u=>u.kind===kk).length+(I.blds[kind]||[]).reduce((n,q)=>n+q.queue.filter(x=>x===kk).length,0);
      if(kind==='barracks'){
        // siege for the big pushes: rams from the Era of Castles, catapults later
        if(I.era>=3&&I.army.length>=6&&cnt('ram')<(I.era>=4?2:1))k='ram';
        else if(I.era>=4&&I.army.length>=9&&cnt('catapult')<(S.diff.key==='normal'?1:2))k='catapult';
        else if(S.diff.harass&&I.era<=2&&cnt('scout')<1)k='scout';
        else k=unlocked(ME,'lancer')&&score('lancer')>score('warrior')?'lancer':'warrior';
        const ck=clPick(I,'barracks',cnt);if(ck)k=ck;
      }
      else if(kind==='archery')k=clPick(I,'archery',cnt)||(I.era>=4&&Math.random()<.55?'royal':'archer');
      else if(clPick(I,'monastery',cnt))k=clPick(I,'monastery',cnt);
      else if(I.monks.length+b.queue.length<S.diff.monks+(I.era>=4?1:0))k='monk';
      else if(I.era>=4&&cnt('wizard')<2)k='wizard';
      else if(I.era>=4&&cnt('paladin')<(S.diff.key==='normal'?2:4))k='paladin';
      if(!k)continue;
      if(!aiCanBuy(I,DEF[k].cost,I.threats.length>0))continue;
      if(trainAt(b,k)==='ok'){own[k]=(own[k]||0)+1;I.pop++;}
    }
  }
}

// ---------------------------------------------------------------- army: rally, harass, attack, retreat
function aiAttackTarget(I,from,big){
  let best=null,bs=1e9;
  for(const b of I.foeBlds){
    if(b.dead)continue;
    let s=hyp(b.x-from.x,b.y-from.y);
    if(b.kind==='tower')s+=260;
    if(b.kind==='farm')s+=120;
    if(b.kind==='castle')s+=big?-400:300;
    if(DEF[b.kind].wall)s+=600;
    if(s<bs){bs=s;best=b;}
  }
  return best;
}
function aiRaidTarget(I){
  let best=null,bs=0;
  const guards=I.foeBlds.filter(b=>b.built&&(b.kind==='tower'||b.kind==='castle'));
  for(const p of I.foePawns){
    if(!p.order||p.order.type!=='gather')continue;
    let safe=1e9;for(const g of guards){const d=distRect(p.x,p.y,rectOf(g));if(d<safe)safe=d;}
    for(const a of I.foeArmy){const d=hyp(a.x-p.x,a.y-p.y);if(d<safe)safe=d;}
    let n=0;for(const q of I.foePawns)if(hyp(q.x-p.x,q.y-p.y)<120)n++;
    const s=Math.min(safe,500)*n;
    if(safe>210&&s>bs){bs=s;best={x:p.x,y:p.y};}
  }
  return best;
}
function aiArmy(I){
  const A=AIX();
  if(A.siegeTown!=null){const T=S.towns&&S.towns[A.siegeTown];if(!T||!T.siege||T.siege.team!==ME){A.siegeTown=null;}else if(!A.defending){for(const u of I.army){if(!u.order||u.order.type==='move'&&!u.order.amove){u.order={type:'move',x:T.x+(Math.random()-.5)*60,y:T.y+(Math.random()-.5)*40,amove:true};u.path=null;}}return;}}
  if(A.defending||!I.rally)return;
  if(clArmy(I))return;
  // the war council (tactics.js) leads the army when it has a plan; the AI below handles the rest
  const wr=warArmy(I);if(wr==='all')return;
  if(wr==='some'){I.army=I.army.filter(u=>!u.war);}
  const raidIds=new Set(A.raid?A.raid.ids:[]);
  const main=I.army.filter(u=>!raidIds.has(u.id));
  // raid party: come home when it is spent
  if(A.raid){
    const party=I.army.filter(u=>raidIds.has(u.id));
    if(!party.length||S.t-A.raid.t>70||party.every(u=>!u.order)){
      for(const u of party)u.order={type:'move',x:I.rally.x,y:I.rally.y};
      A.raid=null;
    }
  }
  if(!A.attacking&&!A.creep){
    for(const u of main.concat(I.monks)){
      if(u.order)continue;
      if(hyp(u.x-I.rally.x,u.y-I.rally.y)>150)u.order={type:'move',x:I.rally.x+(Math.random()-.5)*90,y:I.rally.y+(Math.random()-.5)*70};
    }
  }
  // early harassment of the player's workers
  const peace=S.t<S.diff.peace,cl=clPlan(),clRaid=cl&&cl.order==='saquear'&&!cl.raidDone;
  if((S.diff.harass||clRaid)&&!peace&&!A.raid&&!A.attacking&&(clRaid||I.era>=2&&A.harassEra<I.era)&&main.length>=(clRaid?3:5)&&S.t>A.retreatT+(clRaid?10:40)){
    const tgt=aiRaidTarget(I);
    if(tgt){
      const party=main.filter(u=>u.kind!=='lancer').sort((a,b)=>DEF[b.kind].speed-DEF[a.kind].speed).slice(0,S.diff.key==='insano'?5:4);
      if(party.length>=3){
        for(const u of party){u.order={type:'move',x:tgt.x,y:tgt.y,amove:true,raid:true};u.path=null;}
        A.raid={ids:party.map(u=>u.id),t:S.t};A.harassEra=I.era;if(clRaid)cl.raidDone=true;
        return;
      }
    }
  }
  // clear bandit camps near home for their gold, and to make veterans
  if(!A.attacking&&!A.raid){
    let creep=A.creep&&byId.get(A.creep);
    if(!alive(creep)||creep.team!==3){
      creep=null;A.creep=null;
      if(main.length>=7&&S.t>A.retreatT+30){
        let bd=30*TS;for(const l of I.lairs){const d=hyp(l.x-I.castle.x,l.y-I.castle.y);if(d<bd){bd=d;creep=l;}}
        if(creep)A.creep=creep.id;
      }
    }
    if(creep){
      const c=centerOf(creep);
      for(const u of main.concat(I.monks)){const o=u.order;if(!o||(o.type==='move'&&!o.amove)){u.order={type:'move',x:c.x+(Math.random()-.5)*50,y:c.y+(Math.random()-.5)*50,amove:true};u.path=null;}}
      const mid=centroid(main);
      if(mid){
        const near=main.filter(u=>hyp(u.x-mid.x,u.y-mid.y)<320);
        const foes=[];forNear(mid.x,mid.y,340,e=>{if(!e.dead&&e.team===3&&DEF[e.kind].mil)foes.push(e);});
        if(foes.length&&strength(near)<strength(foes)*.6){A.creep=null;A.retreatT=S.t;for(const u of main.concat(I.monks)){u.order={type:'move',x:I.rally.x,y:I.rally.y};u.path=null;}}
      }
    }
  }
  let thr=S.diff.attackBase+I.era*2;
  if(cl&&cl.min)thr=cl.min;
  let ready=main.length>=thr||(main.length>=6&&S.t-A.lastAttack>220)||(I.pop>=I.cap-1&&I.cap>=60&&main.length>=8);
  if(cl&&cl.order==='esperar')ready=I.pop>=I.cap-1&&I.cap>=80&&main.length>=thr;
  if(cl&&cl.order==='atacar'&&main.length>=Math.min(thr,6))ready=true;
  if(!A.attacking&&ready&&!peace&&S.t>A.retreatT+30){
    A.creep=null;
    const tgt=clTarget(I)||aiAttackTarget(I,I.castle,main.length>=thr*1.6);
    if(tgt){A.attacking=true;A.lastAttack=S.t;A.waves++;A.target=tgt.id;A.big=main.length>=thr*1.6;}
  }
  if(!A.attacking)return;
  let tgt=byId.get(A.target);
  if(!alive(tgt)||tgt.team!==FO){
    const mid=centroid(main)||I.rally;
    tgt=aiAttackTarget(I,mid,A.big);
    if(!tgt){A.attacking=false;return;}
    A.target=tgt.id;
  }
  const c=centerOf(tgt);
  const fl=main.length>=10&&!(cl&&cl.flank===false)||cl&&cl.flank&&main.length>=6?armyFlank(ME,main,c):null;
  if(fl&&!A.flankSaid){A.flankSaid=S.t;HOOK.army('flank',ME,byId.get(fl.q.lead),{});}
  for(const u of main.concat(I.monks)){
    const o=u.order;
    if(fl&&fl.ids.has(u.id)&&!u.flankDone){
      if(hyp(u.x-fl.wp.x,u.y-fl.wp.y)<90){u.flankDone=true;}
      else{if(!o||o.type==='move'&&(!o.flank)){u.order={type:'move',x:fl.wp.x+(Math.random()-.5)*40,y:fl.wp.y+(Math.random()-.5)*40,amove:true,flank:true};u.path=null;}continue;}
    }
    if(!o||(o.type==='move'&&(!o.amove||hyp(o.x-c.x,o.y-c.y)>60))){u.order={type:'move',x:c.x+(Math.random()-.5)*50,y:c.y+(Math.random()-.5)*50,amove:true};u.path=null;}
  }
  // retreat when the fight is lost, to save the army
  const mid=centroid(main);
  if(mid){
    const near=main.filter(u=>hyp(u.x-mid.x,u.y-mid.y)<320).concat(I.monks.filter(u=>hyp(u.x-mid.x,u.y-mid.y)<320));
    const foes=[];forNear(mid.x,mid.y,340,e=>{if(!e.dead&&e.team&&e.team!==ME&&DEF[e.kind].mil)foes.push(e);});
    for(const b of I.foeBlds)if(DEF[b.kind].dmg&&distRect(mid.x,mid.y,rectOf(b))<260)foes.push(b);
    const mine=strength(near),theirs=strength(foes);
    if(main.length<=2||(theirs>0&&mine<theirs*(cl&&cl.order==='atacar'?.35:.5))){
      A.attacking=false;A.retreatT=S.t;A.flankSaid=0;for(const u of main)u.flankDone=false;
      for(const u of main.concat(I.monks)){u.order={type:'move',x:I.rally.x+(Math.random()-.5)*80,y:I.rally.y+(Math.random()-.5)*60};u.path=null;}
    }
  }
}


// ================================================================ Claude commands the Red Kingdom
// (either kingdom: ME/FO say which one is being thought for; red by default)
// Claude sends a plan every minute or so (the strategy); the AI above keeps doing the hands-on work
// (gathering, houses, farms, repairs, defending the town) and follows the plan where it says something.
const CL_UNITS={barracks:['warrior','lancer','scout','ram','catapult'],archery:['archer','royal'],monastery:['monk','paladin','wizard']};
const CL_BUILD=['house','farm','barracks','archery','tower','monastery','market','tavern','wall','gate'];
const CL_CTR=['merc','mercLife','hero','garrison','protect','loyalty','route','liberate'];
function clPlan(){const A=AIX();return A&&A.cl&&S.t<A.cl.until?A.cl:null;}
function clNum(v,a,b,d){v=Number(v);return isFinite(v)?clamp(v,a,b):d;}
function clTown(name){if(!S.towns||!name)return null;const n=String(name).toLowerCase().replace(/^vila[:\s]*/,'').trim();return S.towns.find(T=>T.name.toLowerCase()===n)||S.towns.find(T=>T.name.toLowerCase().startsWith(n.slice(0,4)))||null;}
// read Claude's answer, keep only what the rules allow, and make it the plan for the next minutes
function clApply(o){
  if(!S||!AIX()||!o||typeof o!=='object')return null;
  const A=AIX(),old=A.cl||{};
  const p={t:S.t,until:S.t+150,pawns:0,build:[],mix:null,eco:null,era:'normal',order:'normal',target:null,min:0,flank:null,ctr:null,spy:false,tax:null,taunt:'',thought:'',strategy:''};
  p.thought=String(o.pensamento||o.thought||'').slice(0,240);
  p.strategy=String(o.estrategia||'').slice(0,20);
  if(o.economia&&typeof o.economia==='object'){const e={food:clNum(o.economia.comida,0,1,0),wood:clNum(o.economia.madeira,0,1,0),gold:clNum(o.economia.ouro,0,1,0)};const s=e.food+e.wood+e.gold;if(s>0.05){for(const k in e)e[k]/=s;p.eco=e;}}
  p.pawns=Math.round(clNum(o.aldeoes,-6,8,0));
  if(['agora','esperar','normal'].includes(o.era))p.era=o.era;
  if(Array.isArray(o.construir))p.build=o.construir.map(String).filter(k=>CL_BUILD.includes(k)).slice(0,3);
  if(o.treinar&&typeof o.treinar==='object'){const m={};for(const k in o.treinar){const v=clNum(o.treinar[k],0,20,0);if(v>0&&DEF[k]&&DEF[k].unit&&DEF[k].mil)m[k]=v;}if(Object.keys(m).length)p.mix=m;}
  const ex=o.exercito||{};
  if(['atacar','esperar','recuar','saquear','normal'].includes(ex.ordem))p.order=ex.ordem;
  if(ex.alvo)p.target=String(ex.alvo).slice(0,40);
  if(ex.tatica&&WAR_PLANS[ex.tatica])p.tatica=ex.tatica;
  p.min=Math.round(clNum(ex.minimo,0,80,0));
  if(typeof ex.flanco==='boolean')p.flank=ex.flanco;
  const c=o.contrato;
  if(c&&typeof c==='object'&&CL_CTR.includes(c.tipo)){const T=clTown(c.vila);if(T)p.ctr={kind:c.tipo,town:T.i,min:[5,10,15].includes(+c.minutos)?+c.minutos:10};}
  p.spy=!!o.espionar;
  if(o.impostos!=null)p.tax=Math.round(clNum(o.impostos,0,4,2));
  p.taunt=String(o.provocacao||'').replace(/\s+/g,' ').trim().slice(0,140);
  if(p.tax!=null&&p.tax!==econOf(ME).tax)econSetTax(ME,p.tax);
  if(p.spy&&!(S.intel&&S.intel[ME]&&S.intel[ME].sweep))p.spyResult=startSweep(ME,'spy');
  if(p.order==='recuar'||p.tatica&&warOf(ME).plan&&warOf(ME).plan.type!==p.tatica){const W=warOf(ME);if(W.plan)warEnd(W,false,'ordem do Claude');W.next=S.t;}
  if(p.order==='recuar'){const I=aiScan();A.attacking=false;A.retreatT=S.t;A.raid=null;if(I.rally)for(const u of I.army.concat(I.monks)){u.order={type:'move',x:I.rally.x+(Math.random()-.5)*80,y:I.rally.y+(Math.random()-.5)*60};u.path=null;}}
  if(p.order==='atacar'&&old.order!=='atacar')A.target=null;
  A.cl=p;
  (A.clLog=A.clLog||[]).push({t:S.t,thought:p.thought,strategy:p.strategy,order:p.order,target:p.target,taunt:p.taunt});
  if(A.clLog.length>80)A.clLog.shift();
  return p;
}
// which unit a building trains, following Claude's mix
function clPick(I,kind,cnt){
  const p=clPlan();if(!p||!p.mix)return null;
  const opts=CL_UNITS[kind].filter(k=>p.mix[k]&&unlocked(ME,k));if(!opts.length)return null;
  const tot=opts.reduce((s,k)=>s+p.mix[k],0)||1,have=opts.reduce((s,k)=>s+cnt(k),0)+1;
  let best=null,bd=-1e9;
  for(const k of opts){const d=p.mix[k]/tot-cnt(k)/have;if(d>bd){bd=d;best=k;}}
  if(best==='ram'&&cnt('ram')>=3||best==='catapult'&&cnt('catapult')>=3)return null;
  return best;
}
// the target Claude named: the castle, towers, the economy, the barracks or a town
function clTarget(I){
  const p=clPlan();if(!p||!p.target)return null;
  const t=p.target.toLowerCase(),from=I.castle;
  const near=list=>{let b=null,bd=1e9;for(const e of list){if(e.dead)continue;const d=hyp(e.x-from.x,e.y-from.y);if(d<bd){bd=d;b=e;}}return b;};
  if(t.startsWith('castelo'))return castleOf(FO);
  if(t.startsWith('torre'))return near(I.foeBlds.filter(b=>b.kind==='tower'))||castleOf(FO);
  if(t.startsWith('econ')||t.startsWith('fazenda'))return near(I.foeBlds.filter(b=>b.kind==='farm'||b.kind==='house'||b.kind==='market'));
  if(t.startsWith('quartel')||t.startsWith('militar'))return near(I.foeBlds.filter(b=>['barracks','archery','monastery'].includes(b.kind)));
  return null;
}
// army orders that the AI above does not have: march on a town
function clArmy(I){
  const p=clPlan();if(!p||!p.target||p.order!=='atacar')return false;
  const t=p.target.toLowerCase();if(!t.startsWith('vila'))return false;
  const T=clTown(t);if(!T||T.owner===ME)return false;
  if(!T.siege&&!p.siegeAsked){p.siegeAsked=true;if(startConquest(ME,T.i)!=='ok')return false;AIX().siegeTown=T.i;}
  return false;   // the siege branch of aiArmy now leads the army there
}
// one contract per plan, sent with the AI's own messenger
function clDiplo(I){
  const p=clPlan();if(!p||!p.ctr||p.ctrSent||!S.towns)return false;
  p.ctrSent=true;
  const r=proposeContract(ME,p.ctr.kind,p.ctr.town,{min:p.ctr.min});
  p.ctrResult=r;return r==='ok';
}
// the situation report Claude reads before each order
function clReport(){
  const I=aiScan(),T2=S.teams[ME],T1=S.teams[FO],A=AIX()||{},E=econOf(ME);
  const cnt=list=>{const o={};for(const u of list){o[u.kind]=(o[u.kind]||0)+1;}return o;};
  const bl={};for(const k in I.blds)bl[k]=I.blds[k].filter(b=>b.built).length;
  const fb={};for(const b of I.foeBlds)if(b.built)fb[b.kind]=(fb[b.kind]||0)+1;
  const round=n=>n<5?n:Math.round(n/5)*5;
  const fm={};for(const u of I.foeArmy)fm[u.kind]=(fm[u.kind]||0)+1;for(const k in fm)fm[k]=round(fm[k]);
  const c2=castleOf(ME),c1=castleOf(FO);
  const pct=e=>e?Math.round(e.hp/e.maxhp*100)+'%':'destruído';
  const mm=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  const r={
    tempo:mm(S.t),dificuldade:S.diff.name,
    tregua:S.t<S.diff.peace?`até ${mm(S.diff.peace)} (antes disso nenhum exército ataca o castelo inimigo)`:'acabou',
    voce:{era:T2.era,tropas_disponiveis:Object.keys(DEF).filter(k=>DEF[k].unit&&DEF[k].mil&&DEF[k].cost&&!DEF[k].elite&&!DEF[k].thero&&unlocked(ME,k)),pesquisando_era:!!T2.research,recursos:{comida:Math.round(I.res.food),madeira:Math.round(I.res.wood),ouro:Math.round(I.res.gold)},
      populacao:`${I.pop}/${I.cap}`,aldeoes:I.pawns.length,exercito:cnt(I.army.concat(I.monks)),total_exercito:I.army.length+I.monks.length,
      predios:bl,castelo:pct(c2),honra:Math.round(honorOf(ME)),impostos:TAX[E.tax].n,humor_do_povo:Math.round(E.pop),
      inimigos_dentro_da_base:I.threats.length,atacando_agora:!!A.attacking,mortes:T2.stats.lost,abates:T2.stats.kills},
    inimigo:{era:T1.era,exercito_aprox:round(I.foeArmy.length),composicao_aprox:fm,predios:fb,castelo:pct(c1),honra:Math.round(honorOf(FO)),aldeoes_aprox:round(I.foePawns.length)},
    vilas:(S.towns||[]).map(T=>({nome:T.name,nivel:T.lvl||1,amizade_com_voce:friendOf(T,ME),amizade_com_inimigo:friendOf(T,FO),dona:T.owner?teamName(T.owner):null,jurada_a:loyalTo(T)?teamName(loyalTo(T)):null,sob_ataque:!!T.siege})),
    seus_contratos:ctrList().filter(c=>c.state==='active'&&c.team===ME).map(c=>({tipo:c.kind,vila:S.towns[c.town].name})),
    contratos_do_inimigo:ctrList().filter(c=>c.state==='active'&&c.team===FO).map(c=>({tipo:c.kind,vila:S.towns[c.town].name})),
  };
  const wn=warNow(ME);if(wn){const W=warOf(ME);r.conselho_de_guerra=Object.assign(wn,{melhores_opcoes_agora:(W.lastC||[]).map(c=>c.type)});}
  const sp=S.intel&&S.intel[ME]&&S.intel[ME].spy;if(sp)r.espionagem={torres_do_inimigo:sp.towers,lado_mais_fraco:sp.weak};
  const last=A.cl;if(last){r.sua_ordem_anterior={estrategia:last.strategy,exercito:last.order,alvo:last.target,contrato:last.ctr?`${last.ctr.kind} com ${S.towns[last.ctr.town].name}: ${{ok:'mensageiro enviado',rep:'recusado, falta amizade',cost:'faltou ouro',dup:'já estava em vigor',busy:'já havia um mensageiro a caminho',hostile:'a vila está em guerra com você',sworn:'a vila é jurada ao inimigo'}[last.ctrResult]||last.ctrResult||'na fila'}`:null,espionagem:last.spy?({ok:'batedor enviado',noscout:'sem batedor livre (treine um scout)'}[last.spyResult]||last.spyResult||'já em andamento'):null};}
  // what changed since the last report
  const prev=A.clPrev||{lost:0,kills:0,blds:0,fblds:0};
  const nb=Object.values(bl).reduce((a,b)=>a+b,0),nf=Object.values(fb).reduce((a,b)=>a+b,0);
  r.desde_o_ultimo_relatorio={unidades_perdidas:T2.stats.lost-prev.lost,inimigos_derrotados:T2.stats.kills-prev.kills,predios_seus:nb-prev.blds,predios_do_inimigo:nf-prev.fblds};
  A.clPrev={lost:T2.stats.lost,kills:T2.stats.kills,blds:nb,fblds:nf};
  return r;
}
