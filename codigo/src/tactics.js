// ================================================================ Conselho de Guerra: the masters and the generals plan like the great captains
// Every few seconds a side's war council looks at the map (armies, workers, forests, hills, towers, leaders) and weighs every plan
// of its book (taken from real battles) against a fast battle model: Lanchester's square law, unit counters, terrain, surprise,
// towers and the enemy's likely answer. Each plan is played out hundreds of times with chance in it (Monte Carlo), so a single
// decision weighs tens of thousands of futures; the count is kept and shown. The best plan is then carried out by groups of
// soldiers, phase by phase: they hide in the woods, split and close in from two sides, run away on purpose, raid and vanish...
const WAR_PLANS={
  assalto:  {name:'Assalto direto',hist:'atacar de frente quando a força é bem maior'},
  pinca:    {name:'Ataque em pinça',hist:'Canas, 216 a.C.: Aníbal fechou os romanos pelos dois lados'},
  martelo:  {name:'Martelo e bigorna',hist:'Alexandre, o Grande: a infantaria segura de frente e a tropa rápida bate por trás'},
  emboscada:{name:'Emboscada na mata',hist:'Teutoburgo, 9 d.C.: os germanos esperaram as legiões escondidos na floresta'},
  fingida:  {name:'Retirada fingida',hist:'Hastings, 1066, e os mongóis: fingir fuga para puxar o inimigo para a armadilha'},
  guerrilha:{name:'Guerrilha',hist:'Fábio Máximo contra Aníbal: bater e sumir, sem aceitar a batalha grande'},
  sabotagem:{name:'Sabotagem',hist:'cortar o sustento do inimigo: fazendas, mercado, carroças e o engenheiro'},
  diversao: {name:'Ataque de diversão',hist:'atacar um lado para puxar os defensores e entrar pelo outro'},
  decapitar:{name:'Caçar o comandante',hist:'sem o general, o exército inimigo se desorganiza'},
  defesa:   {name:'Defesa em profundidade',hist:'esperar nas torres e no alto e contra-atacar quando o inimigo cansar'},
};
const WAR_ROLL=900;          // futures played for each plan in a decision
function warOf(team){S.war=S.war||{};return S.war[team]||(S.war[team]={next:4+team,evals:0,plan:null,n:0,hist:[],evacT:0,mood:0});}
// who the council thinks for: the AI kingdoms, and the player's army when the general has the order "Plano do general"
function warActive(team){
  if(!S||S.over)return false;
  if(team===2)return !!S.ai;
  if(team===1)return !!S.ai1||!!(S.armies&&S.armies[1]&&S.armies[1].ord&&S.armies[1].ord.type==='plano');
  return false;
}
function warUpdate(dt){
  for(const t of[1,2]){
    if(!warActive(t))continue;
    const W=warOf(t);
    W.tick=(W.tick||0)-dt;if(W.tick>0)continue;W.tick=1;
    withTeam(t,()=>{const I=aiScan();if(!I.castle)return;warMasters(I,W);if(t===1&&!S.ai1)warArmy(I);});
  }
}

// ---------------------------------------------------------------- the picture of the battlefield
const WAR_VAL={pawn:55,engineer:420,farm:90,house:110,market:320,tavern:160,dock:150,tower:260,barracks:300,archery:280,monastery:300};
function unitVal(u){const D=DEF[u.kind];if(WAR_VAL[u.kind])return WAR_VAL[u.kind];if(D.boss||D.king)return 600;if(u.hero||D.thero)return 450;
  const c=D.cost||{};return Math.max(40,(c.food||0)+(c.wood||0)+(c.gold||0)*1.3)*(1+(u.rank||0)*.15);}
function warForce(list){
  let hp=0,dps=0,n=0,val=0;
  for(const u of list){const D=DEF[u.kind];
    if(D.building){if(D.dmg&&u.built){hp+=u.hp*.6;dps+=D.dmg*towerMult(u.team)/D.cd;}continue;}
    hp+=u.hp;val+=unitVal(u);n++;
    dps+=(D.holy?4:D.dmg*dmgMult(u.team)*rankDmg(u.rank||0)/D.cd)*(D.splash?1.4:1)*(D.volley?1+(D.volley-1)*.6:1)*(D.cleave?1.3:1);
  }
  return {hp,dps,n,val};
}
const fadd=(a,b,k)=>({hp:a.hp+b.hp*k,dps:a.dps+b.dps*k,n:a.n+b.n*k,val:a.val+b.val*k});
const fscale=(a,k)=>({hp:a.hp*k,dps:a.dps*k,n:a.n*k,val:a.val*k});
// square law: who wins, and what share each side loses
function warFight(a,b,ma,mb){
  const A=a.hp*a.dps*ma,B=b.hp*b.dps*mb;
  if(A<=0)return [1,0,false];if(B<=0)return [0,1,true];
  if(A>=B){const r=Math.sqrt(1-B/A);return [1-r,1,true];}
  const r=Math.sqrt(1-A/B);return [1,1-r,false];
}
// how well one army's kinds do against the other's (warriors beat archers, archers lancers, lancers warriors...)
function warCounter(mine,theirs){
  const cnt=l=>{const m={};for(const u of l)m[u.kind]=(m[u.kind]||0)+1;return m;},a=cnt(mine),b=cnt(theirs);
  let s=0,w=0;for(const ka in a)for(const kb in b){const n=a[ka]*b[kb];s+=n*bonus(ka,kb);w+=n;}
  return w?clamp(s/w,.6,1.8):1;
}
function warClusters(list,r){
  const out=[],used=new Set();
  for(const u of list){if(used.has(u.id))continue;const g=[];for(const v of list)if(!used.has(v.id)&&hyp(v.x-u.x,v.y-u.y)<r){g.push(v);used.add(v.id);}
    const c=centroid(g);out.push({x:c.x,y:c.y,units:g});}
  return out.sort((a,b)=>b.units.length-a.units.length);
}
function foesNear(x,y,r,team){const out=[];forNear(x,y,r,e=>{if(!e.dead&&e.team&&e.team!==team&&e.team!==0&&DEF[e.kind].mil&&DEF[e.kind].unit&&hyp(e.x-x,e.y-y)<r)out.push(e);});return out;}
function towersNear(x,y,r,team){return BLDS.filter(b=>!b.dead&&b.built&&b.team===team&&DEF[b.kind].dmg&&hyp(b.x-x,b.y-y)<r);}
// a walkable spot with trees all around (cover for an ambush), near a point
function coverNear(x,y,rad){
  const tx=tileOf(x),ty=tileOf(y);let best=null,bs=-1;
  for(let dy=-rad;dy<=rad;dy++)for(let dx=-rad;dx<=rad;dx++){
    const X=tx+dx,Y=ty+dy;if(!inB(X,Y)||!walkXY(X,Y))continue;
    let t=0;for(let j=-2;j<=2;j++)for(let i=-2;i<=2;i++){const a=X+i,b=Y+j;if(inB(a,b)&&S.tiles[idx(a,b)]===TREE)t++;}
    const s=t-hyp(dx,dy)*.4+(elev[idx(X,Y)]||0)*2;
    if(t>=6&&s>bs){bs=s;best={x:X*TS+16,y:Y*TS+16,trees:t};}
  }
  return best&&reachPt(best.x,best.y)?best:null;
}
function warSnap(I,W){
  const team=ME,foe=FO,fc=castleOf(foe);
  const army=I.army.filter(u=>!DEF[u.kind].naval&&!u.svc);
  const foeArmy=I.foeArmy.filter(u=>!DEF[u.kind].naval);
  const fast=army.filter(u=>DEF[u.kind].speed>=60||u.kind==='scout');
  const mob=army.filter(u=>['lancer','scout','paladin','hgelo','hanjo','hchama'].includes(u.kind)||DEF[u.kind].speed>=66);
  const clusters=warClusters(foeArmy,280);
  // the enemy's workers, grouped where they work, with what guards them
  const work=warClusters(I.foePawns.filter(p=>p.kind==='pawn'||DEF[p.kind].civil),220).map(c=>{c.guard=warForce(foesNear(c.x,c.y,320,team).concat(towersNear(c.x,c.y,260,foe)));return c;});
  // what feeds the enemy: farms, houses, market, carts, the engineer
  const econ=[];
  for(const b of I.foeBlds)if(['farm','house','market','tavern','dock'].includes(b.kind)&&b.built)econ.push(b);
  for(const e of S.ents)if(!e.dead&&e.team===foe&&(e.kind==='engineer'||DEF[e.kind].cart))econ.push(e);
  // leaders: the general, heroes, the engineer
  const AF=S.armies&&S.armies[foe],gen=AF&&byId.get(AF.gen);
  const leaders=foeArmy.filter(u=>u.hero||DEF[u.kind].thero||(u.rank||0)>=6);if(alive(gen)&&!leaders.includes(gen))leaders.unshift(gen);
  // ambush spots: cover on the way between the enemy and us (refreshed now and then)
  if(!W.cov||S.t-W.covT>40){
    W.covT=S.t;W.cov=[];const c=I.castle,from=clusters[0]||fc||{x:c.x+I.dir.x*800,y:c.y+I.dir.y*800};
    for(const f of[.3,.45,.6]){const p={x:c.x+(from.x-c.x)*f,y:c.y+(from.y-c.y)*f},q=coverNear(p.x,p.y,6);if(q)W.cov.push(q);}
    for(const w of work.slice(0,2)){const q=coverNear(w.x,w.y,6);if(q)W.cov.push(Object.assign(q,{work:true}));}
  }
  const me=warForce(army),them=warForce(foeArmy);
  return {army,foeArmy,fast,mob,clusters,work,econ,leaders,cov:W.cov,me,them,cmod:warCounter(army,foeArmy),fc,
    attacking:foeArmy.filter(u=>u.order&&u.order.amove&&hyp(u.x-I.castle.x,u.y-I.castle.y)<14*TS).length>=3};
}

// ---------------------------------------------------------------- weighing the plans
// each candidate is played out WAR_ROLL times; chance decides how fast the enemy answers, if the surprise works, the dice of battle
function warCandidates(I,P){
  const W0=S.war&&S.war[ME],C=[],c=I.castle,n=P.army.length,cl=clPlan()||(W0&&W0.cl&&S.t<W0.cl.until&&(W0.cl.order||W0.cl.tatica)?W0.cl:null);
  const tgt=P.clusters[0];
  const castle=P.fc;
  const mainT=tgt?{x:tgt.x,y:tgt.y,units:tgt.units,kind:'army'}:castle?{x:castle.x,y:castle.y,units:[],kind:'castle',id:castle.id}:null;
  if(n>=4&&mainT){
    C.push({type:'assalto',t:mainT});
    if(n>=8)C.push({type:'pinca',t:mainT});
    if(P.mob.length>=3&&n-P.mob.length>=3)C.push({type:'martelo',t:mainT});
    if(castle&&tgt)C.push({type:'assalto',t:{x:castle.x,y:castle.y,units:[],kind:'castle',id:castle.id}});
  }
  for(const q of P.cov.slice(0,4))if(n>=4)C.push({type:'emboscada',p:q});
  if(P.fast.length>=3&&tgt&&P.cov.length&&n>=7)C.push({type:'fingida',p:P.cov[0],t:mainT});
  for(const w of P.work.slice(0,4))if(P.fast.length>=3||n>=6)C.push({type:'guerrilha',w});
  for(const b of P.econ.filter(b=>b.kind==='engineer'||b.kind==='market'||DEF[b.kind].cart||b.kind==='farm').slice(0,4))if(n>=3)C.push({type:'sabotagem',b});
  if(n>=9&&castle){const side=P.econ.find(b=>hyp(b.x-castle.x,b.y-castle.y)>5*TS);if(side)C.push({type:'diversao',a:side,t:{x:castle.x,y:castle.y,units:[],kind:'castle',id:castle.id}});}
  for(const L of P.leaders.slice(0,2))if(n>=4)C.push({type:'decapitar',l:L});
  C.push({type:'defesa'});
  // Claude's orders steer the book: attack, wait or raid
  if(cl){
    const only={atacar:['assalto','pinca','martelo','diversao','decapitar','fingida'],esperar:['defesa','emboscada','fingida','sabotagem'],saquear:['guerrilha','sabotagem','decapitar']}[cl.order];
    if(cl.tatica&&WAR_PLANS[cl.tatica])return C.filter(k=>k.type===cl.tatica).concat(C.filter(k=>k.type==='defesa'));
    if(only)return C.filter(k=>only.includes(k.type));
  }
  return C;
}
function warTravel(I,x,y){return hyp(x-I.castle.x,y-I.castle.y)/55;}
function warScore(I,P,k,R){
  const me=P.me,them=P.them,cm=P.cmod,peace=S.t<S.diff.peace;
  const group=f=>fscale(me,f);
  let sum=0,sq=0;
  for(let r=0;r<R;r++){
    const luck=.85+Math.random()*.3,react=Math.random(),seen=Math.random();
    let g=0;
    switch(k.type){
      case 'assalto':case 'pinca':case 'martelo':{
        if(peace){g=-1e4;break;}
        const T=k.t,def=warForce(T.units).val?warForce(T.units):{hp:0,dps:0,n:0,val:0};
        const tw=warForce(towersNear(T.x,T.y,320,FO));
        const reinf=fscale(them,Math.max(0,(1-(T.units.length/Math.max(1,P.foeArmy.length))))*(react<.6?.7:.3));
        let foeF=fadd(fadd(def,tw,1),reinf,1),m=cm*luck;
        if(k.type==='pinca')m*=react<.75?1.28:.85;                 // both arms must arrive together
        if(k.type==='martelo')m*=react<.7?1.33:.92;                // the hammer must find the back
        if(T.kind==='castle'){foeF=fadd(foeF,{hp:2400,dps:4,n:0,val:0},1);}
        const [la,lb,win]=warFight(me,foeF,m,1);
        g=lb*(foeF.val+(T.kind==='castle'&&win?3000:0))-la*me.val-(warTravel(I,T.x,T.y)*4);
        break;}
      case 'emboscada':{
        const p=k.p,pass=P.attacking?.75:(k.p.work?.4:.3)*(them.n>2?1:.3);
        if(react>pass){g=-20;break;}
        const surprise=seen<.8?1.55:1.0,hostF=fscale(them,.55+Math.random()*.45);
        const [la,lb]=warFight(me,hostF,cm*luck*surprise*(1+(elev[idx(tileOf(p.x),tileOf(p.y))]||0)*.12),1);
        g=lb*hostF.val-la*me.val+10;
        break;}
      case 'fingida':{
        const lure=react<.55,tw=warForce(towersNear(k.p.x,k.p.y,300,ME));
        if(!lure){g=-35;break;}
        const hostF=fscale(them,.5+Math.random()*.4);
        const [la,lb]=warFight(fadd(me,tw,1),hostF,cm*luck*(seen<.75?1.4:1.05),1);
        g=lb*hostF.val-la*me.val;
        break;}
      case 'guerrilha':{
        if(peace){g=-1e4;break;}
        const raid=group(Math.min(1,5/Math.max(1,P.army.length))),w=k.w,gd=w.guard;
        const [la,lb,win]=warFight(raid,gd,luck*1.15,1);
        const kills=win?Math.min(w.units.length,3+Math.random()*4):0,flee=react<.5;   // the enemy army arrives, the raiders vanish
        g=kills*65*1.5+lb*gd.val-la*raid.val*(flee?.5:1)-warTravel(I,w.x,w.y)*2;
        break;}
      case 'sabotagem':{
        if(peace){g=-1e4;break;}
        const b=k.b,gd=warForce(foesNear(b.x,b.y,300,ME).concat(towersNear(b.x,b.y,260,FO))),sq6=group(Math.min(1,6/Math.max(1,P.army.length)));
        const [la,,win]=warFight(sq6,gd,luck,1);
        g=(win?unitVal(b)*1.6:0)-la*sq6.val-warTravel(I,b.x,b.y)*2;
        break;}
      case 'diversao':{
        if(peace){g=-1e4;break;}
        const pulled=.3+Math.random()*.4,def=fscale(them,1-pulled),tw=warForce(towersNear(k.t.x,k.t.y,320,FO));
        const [la,lb,win]=warFight(group(.75),fadd(fadd(def,tw,1),{hp:2400,dps:4,n:0,val:0},1),cm*luck*(react<.65?1.15:.9),1);
        g=lb*def.val+(win?2600:0)-la*me.val*.75-me.val*.25*.3;
        break;}
      case 'decapitar':{
        if(peace){g=-1e4;break;}
        const L=k.l,esc=warForce(foesNear(L.x,L.y,220,ME)),st=group(Math.min(1,7/Math.max(1,P.army.length)));
        const [la,lb,win]=warFight(st,esc,luck*1.1,1);
        g=(win?unitVal(L)+them.val*.18:0)+lb*esc.val*.5-la*st.val;
        break;}
      case 'defesa':{
        const att=P.attacking?1:react<.35?1:0,tw=warForce(towersNear(I.castle.x,I.castle.y,9*TS,ME));
        if(!att){g=8;break;}
        const [la,lb]=warFight(fadd(me,tw,1),them,cm*luck*1.25,1);
        g=lb*them.val-la*me.val;
        break;}
    }
    sum+=g;sq+=g*g;
  }
  const mean=sum/R,sd=Math.sqrt(Math.max(0,sq/R-mean*mean));
  return mean-sd*.25;                                            // a careful captain: a sure gain beats a wild gamble
}
function warDecide(I,W){
  const P=warSnap(I,W),C=warCandidates(I,P);if(!C.length)return null;
  let best=null,bs=-1e9;
  // the council learns: a plan that just failed is trusted less for a while, one that worked a bit more
  const memo=t=>{let m=1;for(const h of W.hist.slice(0,5))if(h.type===t&&S.t-h.t<300)m*=h.ok===false?.6:h.ok?1.1:1;return m;};
  for(const k of C){const raw=warScore(I,P,k,WAR_ROLL),m=memo(k.type),s=raw>0?raw*m:raw/m;k.score=s;if(s>bs){bs=s;best=k;}}
  W.evals+=C.length*WAR_ROLL;W.lastN=C.length*WAR_ROLL;W.lastC=C.map(k=>({type:k.type,score:Math.round(k.score)})).sort((a,b)=>b.score-a.score).slice(0,4);
  return best&&{k:best,P};
}

// ---------------------------------------------------------------- carrying it out
function warGo(u,x,y,amove){u.order={type:'move',x:x+(Math.random()-.5)*36,y:y+(Math.random()-.5)*30,amove:!!amove,war:true};u.path=null;}
function warHit(u,t){u.order={type:'attack',id:t.id,war:true};u.path=null;}
function warIds(l){return l.map(u=>u.id);}
function warLive(ids){return ids.map(id=>byId.get(id)).filter(u=>alive(u)&&u.team===ME);}
function warStart(I,W,d){
  const k=d.k,P=d.P,all=P.army.filter(u=>!u.svc&&!u.ctr);
  const pl={id:++W.n,type:k.type,t0:S.t,ph:'go',g:{}},fast=all.slice().sort((a,b)=>DEF[b.kind].speed-DEF[a.kind].speed);
  const dir=k.t?{x:k.t.x-I.castle.x,y:k.t.y-I.castle.y}:I.dir,dl=hyp(dir.x,dir.y)||1;pl.dir={x:dir.x/dl,y:dir.y/dl};
  switch(k.type){
    case 'assalto':pl.g.main=warIds(all);pl.t=k.t;break;
    case 'pinca':{const n=Math.ceil(all.length/2),side=all.slice().sort((a,b)=>(a.x*pl.dir.y-a.y*pl.dir.x)-(b.x*pl.dir.y-b.y*pl.dir.x));pl.g.a=warIds(side.slice(0,n));pl.g.b=warIds(side.slice(n));pl.t=k.t;break;}
    case 'martelo':{const mob=P.mob.filter(u=>all.includes(u));pl.g.ham=warIds(mob);pl.g.anv=warIds(all.filter(u=>!mob.includes(u)));pl.t=k.t;break;}
    case 'emboscada':pl.g.main=warIds(all);pl.p=k.p;break;
    case 'fingida':{const bait=fast.slice(0,Math.min(4,fast.length-3));pl.g.bait=warIds(bait);pl.g.main=warIds(all.filter(u=>!bait.includes(u)));pl.p=k.p;pl.t=k.t;break;}
    case 'guerrilha':pl.g.raid=warIds(fast.slice(0,5));pl.w={x:k.w.x,y:k.w.y};pl.hits=0;break;
    case 'sabotagem':pl.g.sab=warIds(fast.slice(0,Math.min(6,Math.max(3,Math.ceil(all.length/3)))));pl.b=k.b.id;break;
    case 'diversao':{const n=Math.max(2,Math.round(all.length*.25)),f=fast.slice(0,n);pl.g.feint=warIds(f);pl.g.main=warIds(all.filter(u=>!f.includes(u)));pl.a=k.a.id;pl.t=k.t;break;}
    case 'decapitar':{const st=all.slice().sort((a,b)=>(b.hp*DEF[b.kind].dmg)-(a.hp*DEF[a.kind].dmg)).slice(0,7);pl.g.strike=warIds(st);pl.l=k.l.id;break;}
    case 'defesa':pl.g.main=warIds(all);break;
  }
  for(const gk in pl.g)for(const id of pl.g[gk]){const u=byId.get(id);if(u)u.war=pl.id;}
  pl.score=Math.round(k.score);
  W.plan=pl;W.hist.unshift({t:S.t,type:k.type,score:pl.score});W.hist.length=Math.min(W.hist.length,12);
  HOOK.war(ME,'start',pl,W);
  return pl;
}
function warEnd(W,ok,why){
  const pl=W.plan;if(!pl)return;
  for(const gk in pl.g)for(const id of pl.g[gk]){const u=byId.get(id);if(u&&u.war===pl.id){u.war=0;if(u.order&&u.order.war)u.order=null;}}
  if(W.hist[0]&&W.hist[0].type===pl.type)W.hist[0].ok=ok;
  HOOK.war(ME,ok?'done':'fail',pl,W,why);
  W.plan=null;W.next=S.t+(ok?3:6);
}
// is this group losing? (then it runs home)
function warLosing(units,k){const m=centroid(units);if(!m)return true;const f=foesNear(m.x,m.y,330,ME);const tw=towersNear(m.x,m.y,260,FO);return strength(f.concat(tw))>strength(units)*(k||1.6);}
function warHome(I,units){for(const u of units)warGo(u,I.rally.x,I.rally.y,false);}
// returns 'all' when the plan drives the whole army, 'some' when only a few are busy
function warArmy(I){
  const W=warOf(ME);
  if(W.plan)return warRun(I,W);
  if(S.t<W.next)return '';
  W.next=S.t+(S.diff.key==='insano'?6:S.diff.key==='dificil'?8:11);
  if(I.army.length<3&&!I.threats.length)return '';
  const d=warDecide(I,W);if(!d||d.k.type==='defesa'&&!d.P.attacking)return '';
  warStart(I,W,d);
  return warRun(I,W);
}
function warRun(I,W){
  const pl=W.plan,el=S.t-pl.t0,G={};for(const gk in pl.g)G[gk]=warLive(pl.g[gk]);
  const all=[].concat(...Object.values(G));
  if(!all.length){warEnd(W,false,'sem tropas');return '';}
  if(el>(pl.type==='emboscada'||pl.type==='defesa'?100:150)){warHome(I,all);warEnd(W,false,'tempo');return '';}
  const tgtXY=()=>{if(pl.t&&pl.t.kind==='army'){const m=centroid(pl.t.units.filter(alive));if(m){pl.t.x=m.x;pl.t.y=m.y;}else return null;}return pl.t;};
  switch(pl.type){
    case 'assalto':case 'defesa':{
      if(pl.type==='defesa'){
        const th=I.threats.length?centroid(I.threats):null;
        if(th){for(const u of G.main)if(!u.order||!u.order.amove)warGo(u,th.x,th.y,true);}
        else if(el>20){warEnd(W,true,'ameaça afastada');return '';}
        else{const f=(armyFronts(ME)[0])||I.rally;for(const u of G.main)if(!u.order)warGo(u,f.x,f.y,false);}
        return 'all';
      }
      const T=tgtXY();if(!T){warEnd(W,true,'alvo destruído');return '';}
      if(T.kind==='castle'&&!alive(byId.get(T.id))){warEnd(W,true,'castelo caiu');return '';}
      for(const u of G.main)if(!u.order||!u.order.amove||hyp(u.order.x-T.x,u.order.y-T.y)>80)warGo(u,T.x,T.y,true);
      if(el>15&&warLosing(G.main,2)){warHome(I,all);warEnd(W,false,'recuo');}
      return 'all';}
    case 'pinca':case 'martelo':{
      const T=tgtXY();if(!T){warEnd(W,true,'alvo destruído');return '';}
      const A=pl.type==='pinca'?G.a:G.anv,B=pl.type==='pinca'?G.b:G.ham;
      const rot=(a)=>({x:pl.dir.x*Math.cos(a)-pl.dir.y*Math.sin(a),y:pl.dir.x*Math.sin(a)+pl.dir.y*Math.cos(a)});
      if(pl.ph==='go'){
        // pincer: each arm to its side; hammer and anvil: the anvil goes straight in, the hammer goes round to the back
        const wa=pl.type==='pinca'?rot(-1.15):null,wb=pl.type==='pinca'?rot(1.15):rot(Math.PI*.62);
        const pa=wa?walkNear(T.x-wa.x*240,T.y-wa.y*240):T,pb=walkNear(T.x-wb.x*(pl.type==='pinca'?240:-200),T.y-wb.y*(pl.type==='pinca'?240:-200));
        pl.pa=pa;pl.pb=pb;pl.ph='flank';
      }
      if(pl.ph==='flank'){
        const ma=centroid(A),mb=centroid(B);
        if(pl.type==='martelo'){for(const u of A)if(!u.order||!u.order.amove)warGo(u,T.x,T.y,true);}
        else{for(const u of A)if(!u.order)warGo(u,pl.pa.x,pl.pa.y,true);}
        for(const u of B)if(!u.order)warGo(u,pl.pb.x,pl.pb.y,pl.type==='pinca');
        const ra=pl.type==='martelo'||!ma||hyp(ma.x-pl.pa.x,ma.y-pl.pa.y)<120,rb=!mb||hyp(mb.x-pl.pb.x,mb.y-pl.pb.y)<120;
        if(ra&&rb||el>40){pl.ph='strike';HOOK.war(ME,'strike',pl,W);}
        return 'all';
      }
      for(const u of all)if(!u.order||!u.order.amove||hyp(u.order.x-T.x,u.order.y-T.y)>80)warGo(u,T.x,T.y,true);
      if(el>25&&warLosing(all,2)){warHome(I,all);warEnd(W,false,'recuo');}
      return 'all';}
    case 'emboscada':{
      const p=pl.p;
      if(pl.ph==='go'){for(const u of G.main)if(!u.order)warGo(u,p.x,p.y,false);const m=centroid(G.main);if(m&&hyp(m.x-p.x,m.y-p.y)<90){pl.ph='wait';pl.tw=S.t;for(const u of G.main){u.order=null;u.lurk=true;}}}
      const near=foesNear(p.x,p.y,300,ME);
      if(pl.ph!=='strike'&&near.length>=2&&pl.ph==='wait'){pl.ph='strike';HOOK.war(ME,'strike',pl,W);}
      if(pl.ph==='strike'){
        if(!near.length&&S.t-(pl.ts||(pl.ts=S.t))>10){warEnd(W,true,'emboscada feita');for(const u of G.main)u.lurk=false;return '';}
        const m=centroid(near);if(m)for(const u of G.main)if(!u.order||!u.order.amove)warGo(u,m.x,m.y,true);
      }else if(pl.ph==='wait'&&S.t-pl.tw>70){for(const u of G.main)u.lurk=false;warEnd(W,false,'ninguém passou');return '';}
      return 'all';}
    case 'fingida':{
      const p=pl.p,bait=G.bait,main=G.main,T=tgtXY();
      if(pl.ph==='go'){for(const u of main)if(!u.order)warGo(u,p.x,p.y,false);if(T)for(const u of bait)if(!u.order||!u.order.amove)warGo(u,T.x,T.y,true);
        const mb=centroid(bait);if(mb&&foesNear(mb.x,mb.y,200,ME).length>=2){pl.ph='flee';pl.tf=S.t;HOOK.war(ME,'flee',pl,W);for(const u of bait)warGo(u,p.x,p.y,false);}
        if(!T){warEnd(W,false,'sem alvo');return '';}}
      else if(pl.ph==='flee'){for(const u of bait)if(!u.order)warGo(u,p.x,p.y,false);
        const near=foesNear(p.x,p.y,260,ME);if(near.length>=2||S.t-pl.tf>25){pl.ph='strike';HOOK.war(ME,'strike',pl,W);}}
      else{const near=foesNear(p.x,p.y,360,ME);if(!near.length&&S.t-(pl.ts||(pl.ts=S.t))>10){warEnd(W,true,'armadilha fechada');return '';}
        const m=centroid(near);if(m)for(const u of all)if(!u.order||!u.order.amove)warGo(u,m.x,m.y,true);}
      return 'all';}
    case 'guerrilha':{
      const R=G.raid,m=centroid(R);if(!m){warEnd(W,false,'sem tropas');return '';}
      const danger=foesNear(m.x,m.y,300,ME);
      if(strength(danger)>strength(R)*.8&&pl.ph!=='flee'){pl.ph='flee';pl.hits++;
        // vanish, then strike somewhere else
        const others=warClusters(I.foePawns,220).filter(c=>hyp(c.x-m.x,c.y-m.y)>9*TS&&!foesNear(c.x,c.y,320,ME).length);
        if(others.length&&pl.hits<4){pl.w={x:others[0].x,y:others[0].y};for(const u of R)warGo(u,pl.w.x,pl.w.y,false);pl.ph='go';HOOK.war(ME,'vanish',pl,W);}
        else{warHome(I,R);warEnd(W,pl.hits>=2,'a guerrilha voltou');return '';}
        return 'some';}
      const w=pl.w;if(hyp(m.x-w.x,m.y-w.y)<220)pl.ph='strike';
      if(pl.ph==='strike'){const pw=[];forNear(m.x,m.y,260,e=>{if(!e.dead&&e.team===FO&&(e.kind==='pawn'||DEF[e.kind].cart))pw.push(e);});
        if(!pw.length){const others=warClusters(I.foePawns,220).filter(c=>!foesNear(c.x,c.y,320,ME).length);if(others.length&&pl.hits<4){pl.hits++;pl.w={x:others[0].x,y:others[0].y};pl.ph='go';}else{warHome(I,R);warEnd(W,true,'a guerrilha voltou');return '';}}
        else for(const u of R)if(!u.order||u.order.type!=='attack')warHit(u,pw[(Math.random()*pw.length)|0]);}
      else for(const u of R)if(!u.order)warGo(u,w.x,w.y,false);
      return 'some';}
    case 'sabotagem':{
      const b=byId.get(pl.b),R=G.sab;if(!alive(b)||b.team!==FO){warHome(I,R);warEnd(W,true,'alvo destruído');return '';}
      if(el>12&&warLosing(R,1.1)){warHome(I,R);warEnd(W,false,'defesa forte');return '';}
      for(const u of R)if(!u.order||u.order.id!==b.id)warHit(u,b);
      return 'some';}
    case 'diversao':{
      const a=byId.get(pl.a),T=pl.t;
      if(pl.ph==='go'){if(alive(a))for(const u of G.feint)if(!u.order)warHit(u,a);const m=centroid(G.main);
        for(const u of G.main)if(!u.order){const p=walkNear(T.x-pl.dir.x*9*TS,T.y-pl.dir.y*9*TS);warGo(u,p.x,p.y,false);}
        if(el>18||!alive(a)){pl.ph='strike';HOOK.war(ME,'strike',pl,W);}}
      else{if(!alive(byId.get(T.id))){warEnd(W,true,'castelo caiu');return '';}
        for(const u of G.main)if(!u.order||!u.order.amove)warGo(u,T.x,T.y,true);
        if(el>35&&warLosing(G.main,2)){warHome(I,all);warEnd(W,false,'recuo');}}
      return 'all';}
    case 'decapitar':{
      const L=byId.get(pl.l),R=G.strike;if(!alive(L)){warHome(I,R);warEnd(W,true,'comandante caiu');return '';}
      if(el>15&&warLosing(R,1.4)){warHome(I,R);warEnd(W,false,'escolta forte');return '';}
      for(const u of R)if(!u.order||u.order.id!==L.id)warHit(u,L);
      return 'some';}
  }
  return '';
}

// ---------------------------------------------------------------- the masters (Gaspar and Rubro): workers run from raiders and come back
function warMasters(I,W){
  W.evacT=(W.evacT||0)-1;if(W.evacT>0)return;W.evacT=2;
  if(ME===1&&S.rules&&S.rules.evacuar===false)return;
  const c=I.castle;let fled=0;
  for(const p of I.pawns){
    if(p.fleeT>S.t)continue;
    const f=foesNear(p.x,p.y,200,ME).filter(e=>!DEF[e.kind].civil);
    if(f.length&&!foesNear(p.x,p.y,1,0).length){
      const guard=strength(I.army.filter(u=>hyp(u.x-p.x,u.y-p.y)<260));
      if(guard>strength(f)*.8)continue;
      const tw=towersNear(p.x,p.y,12*TS,ME)[0],safe=tw?{x:tw.x,y:tw.y+30}:{x:c.x,y:c.y+50};
      if(hyp(p.x-safe.x,p.y-safe.y)<90)continue;
      if(p.order&&p.order.type==='gather')p.back=p.order;
      p.order={type:'move',x:safe.x+(Math.random()-.5)*40,y:safe.y+(Math.random()-.5)*30};p.path=null;p.fleeT=S.t+10;fled++;
    }else if(p.back&&!p.order&&!f.length){p.order=p.back;p.back=null;p.path=null;}
  }
  if(fled>=2&&S.t-(W.evacSaid||-99)>40){W.evacSaid=S.t;HOOK.war(ME,'evac',{n:fled},W);}
}
// what the council is doing, in words (for the Conselho, the watch feed and Claude's report)
function warNow(team){
  const W=S.war&&S.war[team];if(!W)return null;
  const pl=W.plan;
  return {plano:pl?WAR_PLANS[pl.type].name:null,fase:pl?pl.ph:null,planos_avaliados:W.evals,ultimos:W.hist.slice(0,4).map(h=>WAR_PLANS[h.type].name+(h.ok==null?'':h.ok?' (deu certo)':' (falhou)'))};
}
