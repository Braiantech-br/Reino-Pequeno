// ================================================================ village life: skills, tiredness and the tavern, house renovations,
// the chief engineer's management, and the bandits' own economy
const SKILL_LV=[0,40,120,250,450];
const SKILL_NAME={wood:'Lenhador',gold:'Minerador',food:'Coletor',build:'Construtor'};
function skillLv(u,k){const x=u.sk&&u.sk[k]||0;let l=0;for(let i=1;i<SKILL_LV.length;i++)if(x>=SKILL_LV[i])l=i;return l;}
function addSkill(u,k,n){
  if(!u.sk)u.sk={wood:0,gold:0,food:0,build:0};
  const before=skillLv(u,k);u.sk[k]+=n;
  const after=skillLv(u,k);if(after>before)HOOK.skill(u,k,after);
}
function bestSkill(u){let b=null,bl=0;for(const k in SKILL_NAME){const l=skillLv(u,k);if(l>bl){bl=l;b=k;}}return b?[b,bl]:null;}
// how fast a worker is: skill, tiredness and the rest taken at the tavern
function restMult(u){
  let m=1;const f=u.fat||0;if(f>.7)m*=1-Math.min(.25,(f-.7)/.3*.25);
  if(u.freshT>0)m*=1+(u.fresh||0);
  return m;
}
function workMult(u,k){return (1+.1*skillLv(u,k))*(u.team===1?restMult(u):1);}
const FATIGUE=210; // seconds of work before a villager is worn out
function tavernFor(u){
  let best=null,bd=1e9;
  for(const b of BLDS){
    if(b.dead||b.team!==u.team||b.kind!=='tavern'||!b.built)continue;
    const n=S.ents.filter(p=>!p.dead&&p.order&&p.order.type==='rest'&&p.order.id===b.id).length;if(n>=6)continue;
    const d=hyp(b.x-u.x,b.y-u.y);if(d<bd){bd=d;best=b;}
  }
  return best;
}
// called after a unit's order ran this tick
// villagers never leave a construction or a farm: tiredness sends them to the tavern only from other jobs
const onFarm=u=>!!(u.order&&u.order.type==='gather'&&u.order.res==='food'&&u.order.id&&byId.get(u.order.id)&&byId.get(u.order.id).kind==='farm');
const committed=u=>!!(u.order&&(u.order.type==='build'||onFarm(u)));
function lifeTick(u,dt){
  if(u.freshT>0)u.freshT-=dt;
  if(u.team!==1||u.kind!=='pawn')return;
  if(u.anim==='work'||u.anim==='build'){
    u.fat=Math.min(1.2,(u.fat||0)+dt/(committed(u)?FATIGUE*2:FATIGUE));
    if(u.fat>=1&&!committed(u)){u.restChk=(u.restChk||0)-dt;if(u.restChk<=0){u.restChk=4;const tv=tavernFor(u);if(tv){u.order={type:'rest',id:tv.id,tired:true,back:u.order};u.path=null;HOOK.tired(u,tv);}}}
  }else if(!u.order&&u.fat>0)u.fat=Math.max(0,u.fat-dt/90);
}
function doRest(u,dt){
  const o=u.order,b=byId.get(o.id);
  if(!alive(b)||b.team!==u.team||!b.built){finish(u);return;}
  const r=rectOf(b),d=distRect(u.x,u.y,r);
  if(d>26){
    u.rp=(u.rp||0)-dt;
    if(d<44&&!u.path&&approach(u,r,14,dt))return;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=2;if(pathToRect(u,r)===0){finish(u);return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.anim='rest';u.face=b.x>u.x?1:-1;
  o.t=(o.t||0)+dt;
  u.fat=Math.max(0,(u.fat||0)-dt/16);
  // a drink heals too
  if(u.hp<u.maxhp){u.hp=Math.min(u.maxhp,u.hp+u.maxhp*.05*dt);u.healT=.3;}
  const done=u.fat<=0&&u.hp>=u.maxhp*.95&&o.t>=(o.tired?8:3);
  if(done){
    // the longer the rest, the bigger the boost when they go back to work
    if(o.tired){u.fresh=Math.min(.35,.1+o.t*.012);u.freshT=180;HOOK.rested(u);}
    finish(u);if(!u.order&&u.kind==='pawn')autoJob(u);
  }
}

// ---------------------------------------------------------------- houses grow: 5, 10, 15 and 20 people
const HOUSE_LV=[null,{pop:5},{pop:10,cost:{wood:80,gold:20},time:14,era:1},{pop:15,cost:{wood:120,gold:60},time:18,era:2},{pop:20,cost:{wood:160,gold:100},time:22,era:3}];
function housePop(b){return (HOUSE_LV[b.level||1]||HOUSE_LV[1]).pop;}
function canRenovate(b){
  if(!alive(b)||b.kind!=='house'||!b.built||b.reno)return 'no';
  const L=HOUSE_LV[(b.level||1)+1];if(!L)return 'max';
  if(eraOf(b.team)<L.era)return 'era';
  if(!afford(b.team,L.cost))return 'cost';
  return 'ok';
}
function startRenovation(b,builders){
  const r=canRenovate(b);if(r!=='ok')return r;
  const L=HOUSE_LV[(b.level||1)+1];pay(b.team,L.cost);
  b.reno={lvl:(b.level||1)+1,prog:0};
  sendBuilders(b,builders||[]);
  return 'ok';
}
// part of doBuild: work on a renovation
function renovate(u,b,dt){
  const L=HOUSE_LV[b.reno.lvl];
  b.reno.prog=Math.min(1,b.reno.prog+dt/L.time*buildRate(u));
  if(b.reno.prog>=1){
    b.level=b.reno.lvl;b.reno=null;b.maxhp=Math.round(b.maxhp*1.2);b.hp=b.maxhp;
    engineerXp(1);HOOK.renovated(b);afterBuild(u,b);
  }
}

// ---------------------------------------------------------------- the chief engineer grows and starts running the workforce
function engineerXp(n){
  const g=S.engineerId&&byId.get(S.engineerId);if(!alive(g))return;
  g.xp=(g.xp||0)+n;
  if((g.rank||0)<6&&(g.xp>=6||eraOf(1)>=3))promoteEngineer(g,6);
  else if((g.rank||0)<7&&g.xp>=22)promoteEngineer(g,7);
}
function promoteEngineer(g,r){
  const f=rankHp(r)/rankHp(g.rank||0);
  g.maxhp=Math.round(g.maxhp*f);g.hp=Math.min(g.maxhp,g.hp*f+g.maxhp*.3);
  g.rank=r;g.kills=Math.max(g.kills||0,RANKS[r].k);
  FX.ranks.push({id:g.id,t:0});
  HOOK.engineer('promote',g,r===6?'Fui promovido a Major! De agora em diante eu organizo o trabalho de todo mundo: quem corta lenha, quem cuida da comida, e peço aldeões novos quando faltar gente.':'Comandante das obras! O reino está nas melhores mãos, majestade.',{x:g.x,y:g.y,id:g.id});
}
const engineerBoss=g=>alive(g)&&(g.rank||0)>=6;
const ENG_IDEAS=['barracks','archery','tower','monastery'];
// requests that need the player's yes
// the council's standing rules: what the king lets his people decide alone
const RULES_DEF={obras:false,gold:0,estradas:false,socorro:false,renovar:false,medicos:false,batedor:false,armyAuto:true,tolls:false,quiet:false};
function rulesOf(){return Object.assign({},RULES_DEF,S.rules||{});}
function autoRule(q){
  const R=rulesOf(),c=q.cost||{},gold=c.gold||0,other=Object.keys(c).some(k=>k!=='gold'&&c[k]>0);
  const cheap=gold<=R.gold&&(!other||R.gold>=200)&&afford(1,c);
  switch(q.kind){
    case 'build':case 'house':case 'tavern':case 'reno':case 'terra':return R.obras&&cheap;
    case 'svc':return R.estradas&&cheap;
    case 'townhelp':{const T=S.towns&&S.towns[q.town];return R.socorro&&!!T&&friendOf(T,1)>=3;}
    case 'genhelp':return R.socorro;
    case 'renew':return R.renovar&&afford(1,c);
    case 'medic':return R.medicos;
    case 'scoutAsk':return R.batedor;
  }
  return false;
}
function ask(req){
  req=Object.assign({who:'Mestre Gaspar pede autorização',av:'av05'},req,{t:S.t,id:(S.askN=(S.askN||0)+1)});
  if(autoRule(req)){HOOK.council('auto',req);answerQ(req,true);return;}
  // observer mode: nobody is there to answer, so the kingdom says yes to what it can pay for
  if(S.cfg&&S.cfg.watch){HOOK.council('auto',req);answerQ(req,afford(1,req.cost||{}));return;}
  if(S.ask){(S.asks=S.asks||[]).push(req);HOOK.council('queued',req);return;}
  S.ask=req;HOOK.ask(S.ask);
}
function nextAsk(){S.ask=(S.asks&&S.asks.length)?Object.assign(S.asks.shift(),{t:S.t}):null;HOOK.ask(S.ask);}
function answerAsk(yes){const q=S.ask;if(!q)return;nextAsk();answerQ(q,yes);}
// answer a question that is still waiting in the council's list
function answerQueued(id,yes){
  if(S.ask&&S.ask.id===id){answerAsk(yes);return;}
  const i=(S.asks||[]).findIndex(q=>q.id===id);if(i<0)return;
  const q=S.asks.splice(i,1)[0];answerQ(q,yes);
}
function answerQ(q,yes){
  if(q.kind==='counter'){if(!yes)return;const t=Object.assign({},q.terms,{cost:q.price,raised:true});if(q.outbid)t.outbid=q.outbid;
    if(!afford(1,t.cost)){HOOK.toast('Falta ouro para fechar o contrato.','warn');return;}const T=S.towns[q.town];if(!T||townFoe(q.town,1)){HOOK.toast('A vila não aceita mais a proposta.','warn');return;}ctrActivate(1,t);return;}
  if(q.kind==='renew'){if(!yes){HOOK.ctr('noRenew',ctrList().find(c=>c.id===q.cid)||{});return;}const r=ctrRenew(q.cid);if(r!=='ok')HOOK.toast(r==='cost'?'Falta ouro para renovar o contrato.':'O contrato já terminou.','warn');return;}
  if(q.kind==='bid'){bidResolve(q.bid,!!yes);return;}
  if(q.kind==='genorder'){if(yes)armyOrder(1,'defend');return;}
  if(q.kind==='genhelp'){if(yes){const r=proposeContract(1,'help',q.town,{foe:q.foe,p:q.p});if(r!=='ok')HOOK.toast('Não deu para mandar o mensageiro agora.','warn');}return;}
  if(q.kind==='scoutAsk'){if(yes){const r=startSweep(1,'defense',byId.get(q.scout));if(r!=='ok')HOOK.toast('O batedor não pôde sair agora.','warn');}return;}
  if(q.kind==='scoutTrain'){if(yes){const b=BLDS.find(b=>!b.dead&&b.team===1&&b.kind==='barracks'&&b.built);const r=b?trainAt(b,'scout'):'none';if(r==='ok')intelOf(1).wantSweep=S.t;else HOOK.toast(r==='cost'?'Faltam recursos para o batedor.':r==='pop'?'Sem população livre para o batedor.':'Não deu para treinar o batedor agora.','warn');}return;}
  if(q.kind==='planReady'){if(yes)HOOK.scout('openPlan',1,null,{});return;}
  if(q.kind==='svc'){svcAnswer(q,yes);return;}
  if(q.kind==='envoy'){envoyAnswer(q,yes);return;}
  if(q.kind==='townhelp'){townHelpAnswer(q,yes);return;}
  if(q.kind==='sosask'){if(yes)HOOK.sos(q.town);return;}
  if(q.kind==='help'){if(yes){const r=payHelp(1,q.town,q.foe,q.p,q.terms);HOOK.townGrow(S.towns[q.town],r==='ok'?'helpPaid':'helpNoMoney',q.terms.n);}return;}
  if(q.kind==='medic'){
    const u=byId.get(q.id);if(!alive(u))return;
    if(yes){u.medic=true;u.order=null;HOOK.toast(`${unitName(u)} agora cura os feridos em volta.`,'good',{x:u.x,y:u.y,id:u.id});FX.sparks.push({x:u.x,y:u.y-20,t:0,team:1});}
    else HOOK.toast(`${unitName(u)} continua na linha de frente.`,null,{x:u.x,y:u.y,id:u.id});
    return;
  }
  S.askCd=S.askCd||{};
  const g=byId.get(S.engineerId);
  if(!yes){S.askCd[q.kind]=S.t+90;HOOK.engineer('no',g,'Tudo bem, majestade. Pergunto de novo mais tarde.');return;}
  if(q.kind==='reno'){
    const b=byId.get(q.id);
    const crew=nearestPawns(b?b.x:0,b?b.y:0,2,1);if(alive(g)&&(!g.order||g.order.engIdle))crew.push(g);
    const r=b?startRenovation(b,crew):'no';
    if(r==='ok')HOOK.engineer('yes',g,`Obrigado! Vamos reformar a casa para caber ${HOUSE_LV[b.reno.lvl].pop} pessoas.`,{x:b.x,y:b.y,id:b.id});
    else{S.askCd.reno=S.t+30;HOOK.engineer('cant',g,r==='cost'?'Ainda faltam recursos para a reforma. Junto e pergunto de novo.':'Essa casa não pode ser reformada agora.');}
  }else if(q.kind==='terra'){
    if(alive(g)){g.order={type:'terra',tiles:q.tiles,up:q.up,t:0};g.path=null;HOOK.engineer('yes',g,q.up?'Vou elevar o terreno. Lá de cima a defesa fica bem mais forte.':'Vou aplainar esse morro para os aldeões passarem.',q.loc);}
  }else if(q.kind==='trade'){
    const r=q.to==='gold'?trade(1,q.from,false):barter(1,q.from,q.to);
    HOOK.engineer(r==='ok'?'yes':'cant',g,r==='ok'?'Negócio fechado no mercado!':'Não deu para fazer a troca agora.');
  }else if(q.kind==='build'){
    const c=castleOf(1),k=q.what;
    const near=k==='dock'?dockSpot():null;
    const ok=c&&(near?engPlan(g,k,near.x,near.y,0,3,'Vou construir o cais na beira da água.',true):engPlan(g,k,c.x,c.y-30,4,14,`Obrigado! Vou construir ${k==='tavern'?'a taberna':k==='market'?'o mercado':'isso'} agora.`,true));
    if(!ok){S.askCd[k]=S.t+30;HOOK.engineer('cant',g,'Não consegui começar: faltam recursos ou espaço.');}
  }else if(q.kind==='house'||q.kind==='tavern'){
    const c=castleOf(1);
    if(!c||!engPlan(g,q.kind,c.x,c.y-30,4,14,q.kind==='house'?'Casa nova a caminho!':'Uma taberna para o povo descansar. Já estou construindo.',true)){S.askCd[q.kind]=S.t+30;HOOK.engineer('cant',g,'Não consegui começar: faltam recursos ou espaço.');}
  }
}
// place a building and send a crew (the engineer goes too when he is free)
function engPlan(g,k,ax,ay,rmin,rmax,why,asked){
  const D=DEF[k];if(!unlocked(1,k)||!afford(1,D.cost))return false;
  const p=spotFor(1,k,ax,ay,rmin,rmax);if(!p)return false;
  const gIdle=alive(g)&&(!g.order||g.order.type==='move'&&g.order.engIdle);
  const crew=nearestPawns((p.tx+D.w/2)*TS,(p.ty+D.h)*TS,k==='farm'?1:2,1);if(!crew.length&&!gIdle)return false;
  const b=placeBuilding(1,k,p.tx,p.ty,crew);if(!b)return false;
  if(gIdle){g.order={type:'build',id:b.id};g.path=null;}
  S.engBuildT=S.t;HOOK.engineer(asked?'yes':'plan',g,why,{x:b.x,y:b.y});
  return true;
}
// after his promotion: talks to each villager and moves people where the kingdom needs them
function delegate(g){
  S.mgT=(S.mgT||0)-2;if(S.mgT>0)return false;S.mgT=6;
  const T=S.teams[1],c=castleOf(1);if(!c)return false;
  const pawns=S.ents.filter(p=>!p.dead&&p.team===1&&p.kind==='pawn');
  const cnt={wood:0,gold:0,food:0},by={wood:[],gold:[],food:[]},idle=[];
  for(const p of pawns){if(!p.order)idle.push(p);else if(p.order.type==='gather'&&cnt[p.order.res]!=null){cnt[p.order.res]++;if(!committed(p))by[p.order.res].push(p);}}
  const want={wood:250,food:250,gold:T.era>=2?220:80};
  const nx=ERAS[T.era+1];if(nx&&nx.cost)for(const k in nx.cost)want[k]=Math.max(want[k],nx.cost[k]);
  let short=null,best=0;
  for(const k of['food','wood','gold']){const need=Math.max(0,want[k]-T.res[k]),s=need/(cnt[k]+1);if(T.res[k]<want[k]*.55&&s>best){best=s;short=k;}}
  const tell=(p,res)=>FX.orders.push({g:g.id,p:p.id,res,t:0});
  // nobody stays idle: the engineer hands out jobs, matching each villager's best skill to what is missing
  const free=idle.filter(p=>freeUnit(p));
  if(free.length){
    const N=needs();
    for(const p of free){
      const hurt=BLDS.find(b=>!b.dead&&b.team===1&&b.built&&b.hp<b.maxhp*.8&&S.t-(b.lastHit||-99)>6&&distRect(p.x,p.y,rectOf(b))<8*TS);
      if(hurt){p.order={type:'build',id:hurt.id};p.path=null;tell(p,'wood');continue;}
      if(pickJob(p,N))tell(p,p.order.res);
    }
    HOOK.engineer('order',g,free.length===1?'Achei um aldeão parado e já dei serviço para ele.':`Achei ${free.length} aldeões parados e já dei serviço para todos.`,{x:free[0].x,y:free[0].y});
    return true;
  }
  // more villagers while there is room and food
  if(!c.queue.length&&!T.research&&popUsed(1)<popCap(1)&&pawns.length<[0,14,20,26,30,34][T.era]&&T.res.food>=120){
    if(trainAt(c,'pawn')==='ok'){HOOK.engineer('train',g,'Pedi mais um aldeão no castelo. Trabalho não falta.',{x:c.x,y:c.y,id:c.id});return true;}
  }
  if(!short)return false;
  if(short==='food'){
    let crit=0;for(const e of S.ents)if(!e.dead&&DEF[e.kind].critter&&hyp(e.x-c.x,e.y-c.y)<16*TS)crit++;
    const freeFarm=BLDS.some(b=>!b.dead&&b.team===1&&b.kind==='farm'&&b.built&&(!b.worker||!alive(byId.get(b.worker))));
    if(!crit&&!freeFarm)return false; // the farm planner takes over
  }
  let from=null,fb=-1e9;
  for(const k of['wood','gold','food']){if(k===short||by[k].length<2)continue;const sc=(T.res[k]-want[k])+cnt[k]*25;if(sc>fb){fb=sc;from=k;}}
  if(!from)return false;
  // farmers and builders are never moved
  const movers=by[from].filter(p=>p.order.phase!=='return'&&!(p.carry&&p.carry.amt>6)&&freeUnit(p)).slice(0,2);
  if(!movers.length)return false;
  for(const p of movers){p.order=null;p.path=null;if(autoJob(p,short))tell(p,short);}
  const msg={food:'Está faltando comida! Mandei {n} para caçar e colher.',wood:'Falta madeira! Mandei {n} para o corte.',gold:'Precisamos de ouro: {n} para a mina.'}[short].replace('{n}',movers.length===1?'um aldeão':`${movers.length} aldeões`);
  HOOK.engineer('order',g,msg,{x:movers[0].x,y:movers[0].y});
  return true;
}

// ---------------------------------------------------------------- bandits: they gather, recruit, grow, and raid both kingdoms
const WILD_COST={bandit:{gold:30,food:20},banditA:{gold:30,wood:25},shaman:{gold:55},chief:{gold:130,food:60},bpawn:{gold:25}};
function wildEconomy(){
  const W=S.teams[3];if(!W)return;
  if(!S.wildInit){S.wildInit=1;W.res={wood:120,gold:150,food:120};}
  S.wildE=(S.wildE||0)+1;
  const camps=[];
  S.camps.forEach((c,i)=>{const l=byId.get(c.lair);if(alive(l)&&l.team===3)camps.push({c,i,l});});
  let wild=0;for(const e of S.ents)if(!e.dead&&e.team===3&&DEF[e.kind].unit)wild++;
  // workers and new recruits, paid from what they gathered and stole
  if(S.wildE%5===0&&wild<60){
    for(const o of camps){
      const mine=S.ents.filter(e=>!e.dead&&e.team===3&&e.camp===o.i);
      const workers=mine.filter(e=>e.kind==='bpawn').length,guards=mine.length-workers;
      if(workers<(o.l.kind==='hideout'?2:1)&&afford(3,WILD_COST.bpawn)){pay(3,WILD_COST.bpawn);spawnGuard(o.c,'bpawn',mine.length);continue;}
      o.c.extra=Math.min({den:3,lair:5,hideout:7}[o.l.kind]||3,Math.floor(S.t/150));
      if(guards<o.c.kinds.length+o.c.extra){
        const pool=['bandit','bandit','banditA'].concat(S.t>480?['shaman']:[],S.t>900&&o.l.kind!=='den'?['chief']:[]);
        const k=pool[Math.floor(Math.random()*pool.length)];
        if(afford(3,WILD_COST[k])){pay(3,WILD_COST[k]);spawnGuard(o.c,k,mine.length);}
      }
    }
  }
  // a new den when the treasure is big enough
  S.wildX=(S.wildX||0)+1;
  if(S.t>300&&S.wildX>=200&&camps.length<14&&W.res.gold>=180&&W.res.wood>=150){
    S.wildX=0;
    for(let k=0;k<60;k++){
      const cx=4+Math.random()*(MW-8),cy=4+Math.random()*(MH-8),px=cx*TS,py=cy*TS;
      if([1,2].some(t=>{const cc=castleOf(t);return cc&&hyp(cc.x-px,cc.y-py)<16*TS;}))continue;
      if(camps.some(o=>hyp(o.l.x-px,o.l.y-py)<9*TS))continue;
      const sp=campSpot('den',cx,cy,false,S.home.road);if(!sp.length)continue;
      W.res.gold-=180;W.res.wood-=150;
      const nc=makeCamp('den',sp[0],['bandit','banditA']);spawnGuard(nc,'bpawn',2);
      const l=byId.get(nc.lair);HOOK.wildNews('den',l);
      break;
    }
  }
  // raids: from the first minute, one kingdom and then the other
  if(S.t<60)return;
  S.raidT=(S.raidT??0)-1;if(S.raidT>0)return;
  S.raidT=(({normal:110,dificil:85,insano:65})[S.diff.key]||85)*(S.mode==='skirmish'?1:1.5)*(camps.length?1:.75+Math.random()*.6);
  const teams=[1,2].filter(t=>castleOf(t));if(!teams.length)return;
  S.raidTurn=((S.raidTurn??-1)+1)%teams.length;
  let tt=teams[S.raidTurn];
  const tc=castleOf(tt);
  let best=null,bd=1e9;
  for(const o of camps){
    const g=S.ents.filter(e=>!e.dead&&e.team===3&&e.camp===o.i&&DEF[e.kind].mil&&!DEF[e.kind].healer&&!(e.raiding&&S.t-e.raiding<90));
    if(g.length<2)continue;
    const d=hyp(o.l.x-tc.x,o.l.y-tc.y);if(d<bd){bd=d;best={o,g};}
  }
  if(!best){if(!camps.length&&S.towns)edgeRaid(tt);return;}
  const size=Math.max(1,Math.min(best.g.length-1,2+Math.floor(S.t/150)));
  let tgt=null,td=1e9;
  for(const e of S.ents){
    if(e.dead||e.team!==tt||!(e.kind==='pawn'||DEF[e.kind].building&&!DEF[e.kind].wall&&e.kind!=='castle'))continue;
    const d=hyp(e.x-best.o.l.x,e.y-best.o.l.y);if(d<td){td=d;tgt=e;}
  }
  if(!tgt)tgt=tc;
  const p=centerOf(tgt),party=best.g.sort((a,b)=>b.hp-a.hp).slice(0,size);
  for(const u of party){u.raiding=S.t;u.order={type:'move',x:p.x+(Math.random()-.5)*50,y:p.y+(Math.random()-.5)*40,amove:true,raid:true};u.path=null;}
  HOOK.raid(tt,best.o.l,party.length,p);
}
// on maps with neutral towns there are no dens: raiders come in from the edge of the island, at random, and leave again
function edgeRaid(tt){
  let spot=null;
  for(let k=0;k<200&&!spot;k++){
    const x=tt===1?3+Math.floor(Math.random()*(MW/2-6)):Math.floor(MW/2)+Math.floor(Math.random()*(MW/2-6)),y=Math.random()<.5?3+Math.floor(Math.random()*7):MH-4-Math.floor(Math.random()*7);
    if(!reachT(x,y)||!walkXY(x,y))continue;const px=x*TS+16,py=y*TS+16;
    if([1,2].some(t=>{const c=castleOf(t);return c&&hyp(px-c.x,py-c.y)<18*TS;}))continue;
    if(S.towns.some(t=>hyp(t.x-px,t.y-py)<9*TS))continue;
    spot={x:px,y:py};
  }
  if(!spot)return;
  let tgt=null,td=1e9;
  for(const e of S.ents){if(e.dead||e.team!==tt||!(e.kind==='pawn'||e.kind==='cart'||DEF[e.kind].building&&!DEF[e.kind].wall&&e.kind!=='castle'))continue;const d=hyp(e.x-spot.x,e.y-spot.y);if(d<td){td=d;tgt=e;}}
  if(!tgt)tgt=castleOf(tt);if(!tgt)return;
  const size=Math.min(7,2+Math.floor(S.t/170)),pool=S.t>600?['bandit','banditA','bandit','chief']:['bandit','banditA','bandit'],p=centerOf(tgt);
  for(let i=0;i<size;i++){
    const k=pool[i%pool.length],u=spawnUnit(k,3,spot.x+(Math.random()-.5)*50,spot.y+(Math.random()-.5)*40,{roam:true,raiding:S.t,leaveAt:S.t+30+hyp(p.x-spot.x,p.y-spot.y)/50});
    u.order={type:'move',x:p.x+(Math.random()-.5)*50,y:p.y+(Math.random()-.5)*40,amove:true,raid:true};
  }
  HOOK.raid(tt,{x:spot.x,y:spot.y},size,p);
}
// bandit workers gather close to their camp
function wildWorker(u){
  const h=u.home||{x:u.x,y:u.y};
  for(const res of['gold','wood','food','wood'].sort(()=>Math.random()-.5)){
    const r=findResource(u,res,h.x,h.y,false);if(!r)continue;
    const p=r.id?byId.get(r.id):{x:r.tx*TS+16,y:r.ty*TS+16};
    if(p&&hyp(p.x-h.x,p.y-h.y)<13*TS){u.order=Object.assign({type:'gather',res,phase:'go'},r);u.path=null;return;}
  }
  if(hyp(u.x-h.x,u.y-h.y)>60)u.order={type:'move',x:h.x,y:h.y};
}
// raiders take a cut of what they hit
function loot(t,dmg,src){
  if(!src||src.team!==3||!(t.team===1||t.team===2)||!DEF[t.kind].building||DEF[t.kind].wall)return;
  const T=S.teams[t.team],k=['gold','food','wood'][Math.floor(Math.random()*3)],n=Math.min(Math.floor(T.res[k]),Math.max(1,Math.round(dmg*.3)));
  if(n<=0)return;
  T.res[k]-=n;S.teams[3].res[k]+=n;
  if(t.team===1&&S.t-(S.lootT||-9)>1.2){S.lootT=S.t;FX.floats.push({x:t.x,y:t.y-50,txt:`-${n} ${RES_NAME[k]} (saque)`,col:'#ff9e86',t:0});}
}

// ---------------------------------------------------------------- soldiers: medics (offered when a soldier reaches the third rank)
function rankUp(u){
  if(u.team!==1||(u.rank||0)!==3||u.medicAsked||u.medic||u.hero)return;
  const D=DEF[u.kind];if(!D.mil||D.holy||D.king||D.boss||D.look||D.mech)return;
  u.medicAsked=true;
  if(Math.random()<.3){HOOK.toast(`${RANKS[3].n} ${D.name.toLowerCase()} prefere seguir lutando.`,null,{x:u.x,y:u.y,id:u.id});return;}
  const av={warrior:'av01',lancer:'av02',archer:'av03'}[baseKind(u.kind)]||'av01';
  ask({kind:'medic',id:u.id,who:`${RANKS[3].n} ${D.name.toLowerCase()} pede autorização`,av,text:`Chegou à patente de ${RANKS[3].n} e quer virar médico de campo: para de atacar e passa a curar os feridos em volta (só se defende quando apanha). Autoriza?`,loc:{x:u.x,y:u.y,id:u.id}});
}
function medicBrain(u){
  let hurt=null,hd=190;
  forNear(u.x,u.y,190,e=>{if(e.dead||e===u||e.team!==u.team||!healable(e)||e.hp>=e.maxhp*.9)return;const d=hyp(e.x-u.x,e.y-u.y)-(1-e.hp/e.maxhp)*60;if(d<hd){hd=d;hurt=e;}});
  if(hurt){u.order={type:'heal',id:hurt.id,auto:true};return true;}
  const m=threatNear(u.x,u.y,u.team,70);
  if(m){const ax=u.x-m.x,ay=u.y-m.y,al=hyp(ax,ay)||1,kx=u.x+ax/al*70,ky=u.y+ay/al*70;if(walkPt(kx,ky))u.order={type:'move',x:kx,y:ky};}
  return false;
}

// ---------------------------------------------------------------- the village mind: one shared look at the kingdom's needs, each villager and soldier picks the most useful job
function needs(){
  const T=S.teams[1],want={wood:250,food:250,gold:T.era>=2?220:80};
  const nx=ERAS[T.era+1];if(nx&&nx.cost)for(const k in nx.cost)want[k]=Math.max(want[k],nx.cost[k]);
  const n={};for(const k in want)n[k]=Math.max(0,want[k]-T.res[k])/Math.max(1,want[k]);
  return n;
}
function pickJob(p,N){
  N=N||needs();
  const order=['wood','food','gold'].map(k=>[k,(.3+N[k])*(1+.3*skillLv(p,k))]).sort((a,b)=>b[1]-a[1]);
  for(const[k]of order){const r=findResource(p,k,p.x,p.y,true);if(r){p.order=Object.assign({type:'gather',res:k,phase:'go'},r);p.path=null;return true;}}
  return false;
}
const freeUnit=u=>!u.svc&&!(u.cmdT&&S.t-u.cmdT<25);
function villageMind(dt){
  S.vmT=(S.vmT||0)-dt;if(S.vmT>0)return;S.vmT=1;
  if(S.autoVillage===false)return;
  const c=castleOf(1);if(!c)return;
  const mine=S.ents.filter(e=>!e.dead&&e.team===1&&DEF[e.kind].unit);
  // 1. defend: enemy soldiers near our buildings or our workers
  const own=BLDS.filter(b=>!b.dead&&b.team===1&&!DEF[b.kind].wall);
  const threats=[];
  for(const e of S.ents){
    if(e.dead||!e.team||e.team===1||!DEF[e.kind].mil)continue;
    if(own.some(b=>distRect(e.x,e.y,rectOf(b))<7*TS)||mine.some(p=>p.kind==='pawn'&&hyp(p.x-e.x,p.y-e.y)<5*TS))threats.push(e);
  }
  if(threats.length){
    let sent=0;
    for(const u of mine){
      const D=DEF[u.kind];
      if(!D.mil||D.holy||u.medic||D.king||!freeUnit(u)||u.hp<u.maxhp*.35)continue;
      if(u.order&&!(u.order.type==='move'&&!u.order.amove)&&u.order.type!=='rest')continue;
      if(u.order&&u.order.type==='rest'&&u.hp<u.maxhp*.7)continue;
      let best=null,bs=20*TS;
      for(const e of threats){let d=hyp(e.x-u.x,e.y-u.y);if(bonus(u.kind,e.kind)>1)d-=60;if(d<bs){bs=d;best=e;}}
      if(best){u.order={type:'attack',id:best.id,auto:true,ax:u.x,ay:u.y};u.path=null;sent++;}
    }
    if(sent)HOOK.village('defend',sent,centerOf(threats[0]));
  }
  // 2. hurt soldiers (and idle villagers) go to drink at the tavern; nobody leaves a construction or a farm for it
  for(const u of mine){
    if(u.hp>=u.maxhp*.55||DEF[u.kind].king||DEF[u.kind].naval||DEF[u.kind].mech)continue;
    if(u.kind==='pawn'||u.kind==='engineer'){if(u.order)continue;}
    else if(u.order&&!(u.order.type==='move'&&!u.order.amove))continue;
    if(u.order&&!freeUnit(u))continue;
    if(threatNear(u.x,u.y,1,220))continue;
    const tv=tavernFor(u);if(!tv||hyp(tv.x-u.x,tv.y-u.y)>26*TS)continue;
    u.order={type:'rest',id:tv.id,heal:true};u.path=null;
  }
  // 3. without an engineer (he fell), the villagers keep their jobs and only the idle ones look for work
  const g=byId.get(S.engineerId);
  if(!alive(g)){let N=null;for(const p of mine){if(p.kind!=='pawn'||p.order||!freeUnit(p))continue;N=N||needs();pickJob(p,N);}}
}

// ---------------------------------------------------------------- the engineer closes the village with walls when it keeps being attacked
function planWalls(){
  const c=castleOf(1);if(!c)return null;
  const core=BLDS.filter(b=>!b.dead&&b.team===1&&!DEF[b.kind].wall&&hyp(b.x-c.x,b.y-c.y)<15*TS);
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  for(const b of core){const D=DEF[b.kind];x0=Math.min(x0,b.tx);y0=Math.min(y0,b.ty);x1=Math.max(x1,b.tx+D.w-1);y1=Math.max(y1,b.ty+D.h-1);}
  x0=clamp(x0-3,2,MW-3);y0=clamp(y0-3,2,MH-3);x1=clamp(x1+3,2,MW-3);y1=clamp(y1+3,2,MH-3);
  const line=(ax,ay,bx,by)=>wallLine(ax,ay,bx,by);
  const sides=[line(x0,y0,x1,y0),line(x1,y0,x1,y1),line(x1,y1,x0,y1),line(x0,y1,x0,y0)];
  const gates=new Set();
  for(const side of sides){
    side.forEach(([x,y],k)=>{const i=idx(x,y);if(S.tiles[i]===ROAD||k===Math.floor(side.length/2)||(k%9===4&&side.length>12))gates.add(i);});
  }
  return {sides:sides.map(s=>s.map(([x,y])=>idx(x,y))),gates:[...gates],i:0};
}
function wallStep(g){
  const P=S.wallPlan;if(!P||P.i>=P.sides.length)return false;
  const T=S.teams[1],side=P.sides[P.i];
  const cost=side.length*DEF.wall.cost.wood+60;
  if(T.res.wood<cost+80)return false;
  const made=[];
  for(const i of side){
    const x=i%MW,y=(i/MW)|0,k=P.gates.includes(i)?'gate':'wall';
    if(!canPlace(1,k,x,y)||!afford(1,DEF[k].cost)||!reachRect(x,y,1,1))continue;
    pay(1,DEF[k].cost);made.push(spawnFixed(k,1,x,y,{built:false,prog:0,hp:1}));
  }
  P.i++;
  if(made.length){sendBuilders(made[0],nearestPawns(made[0].x,made[0].y,2,1));if(made[1])sendBuilders(made[Math.floor(made.length/2)],nearestPawns(made[1].x,made[1].y,1,1));}
  return made.length>0;
}

// ---------------------------------------------------------------- terrain works: raise high ground or flatten it
const TERRA_COST={up:{wood:60,gold:20},down:{wood:40}};
function rectTiles(tx,ty,w,h){const t=[];for(let y=ty;y<ty+h;y++)for(let x=tx;x<tx+w;x++)if(inB(x,y))t.push(idx(x,y));return t;}
// Raising lifts the area one level above its lowest tile (up to level 3); lowering drops it one level below its highest.
// The slopes around are terraced on their own so no step is ever higher than one level. Returns the new levels or a reason.
function terraPlan(tiles,up){
  if(!tiles||!tiles.length)return {err:'area'};
  let lo=9,hi=-1;for(const i of tiles){lo=Math.min(lo,elev[i]);hi=Math.max(hi,elev[i]);}
  const T=up?lo+1:hi-1;
  if(up&&T>MAXLV)return {err:'max'};
  if(!up&&hi===0)return {err:'flat'};
  const nl=new Map(),lv=i=>nl.has(i)?nl.get(i):elev[i],q=[];
  for(const i of tiles){if(up?elev[i]<T:elev[i]>T){nl.set(i,T);q.push(i);}}
  while(q.length){
    const i=q.pop(),h=nl.get(i),x=i%MW,y=(i/MW)|0;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      if(!dx&&!dy||!inB(x+dx,y+dy))continue;const j=idx(x+dx,y+dy),c=lv(j);
      if(up&&c<h-1){nl.set(j,h-1);q.push(j);}else if(!up&&c>h+1){nl.set(j,h+1);q.push(j);}
    }
    if(nl.size>140)return {err:'big'};
  }
  if(!nl.size)return {err:'none'};
  for(const[i]of nl){
    const x=i%MW,y=(i/MW)|0;
    if(x<2||y<2||x>MW-3||y>MH-3)return {err:'edge'};
    const t=S.tiles[i];if(t===WATER||t===PIT)return {err:'water'};
  }
  // buildings move as a whole, and none may end up on a cliff face
  const touched=new Set();
  for(const[i]of nl){if(occ[i])touched.add(occ[i]);const s=i+MW;if(s<N&&occ[s])touched.add(occ[s]);}
  for(const id of touched){
    const b=byId.get(id);if(!b)return {err:'bld'};const D=DEF[b.kind];let h0=-1;
    for(let yy=b.ty;yy<b.ty+(D.h||1);yy++)for(let xx=b.tx;xx<b.tx+(D.w||1);xx++){
      const k=idx(xx,yy),h=lv(k);if(h0<0)h0=h;else if(h!==h0)return {err:'bld'};
      if(k>=MW&&lv(k-MW)>h)return {err:'bld'};
      if(D.building&&!b.built)return {err:'bld'};
    }
  }
  return {nl,T,n:nl.size,cost:terraCost(nl.size,up)};
}
function terraCost(n,up){return up?{wood:30+n*3,gold:10+Math.round(n*1.2)}:{wood:20+n*2};}
// stairs for every walkable part of a terrace; a part next to the work that cannot get stairs makes the work impossible
function rampsFor(E,RP,c,focus){
  const seen=new Uint8Array(N),out=[],clE=i=>i>=MW&&E[i-MW]>E[i];
  for(let i0=0;i0<N;i0++){
    const L=E[i0];if(!L||seen[i0]||clE(i0))continue;
    const cells=[],st=[i0];seen[i0]=1;
    while(st.length){const q=st.pop();cells.push(q);const x=q%MW,y=(q/MW)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const ni=idx(nx,ny);if(E[ni]===L&&!seen[ni]&&!clE(ni)){seen[ni]=1;st.push(ni);}}}
    if(cells.some(q=>q+MW<N&&RP[q+MW]&&E[q+MW]===L-1))continue;
    let best=-1,bd=1e9;
    for(const q of cells){const j=q+MW,k=j+MW;if(k>=N||E[j]!==L-1||E[k]!==L-1)continue;const t=S.tiles[j],t2=S.tiles[k];if(t===WATER||t2===WATER||t===PIT||t2===PIT||occ[j]||occ[k])continue;if(E[q-1]!==L&&E[q+1]!==L&&cells.length>2)continue;const d=c?hyp(j%MW*TS-c.x,((j/MW)|0)*TS-c.y):0;if(d<bd){bd=d;best=j;}}
    if(best<0){if(!focus||cells.some(q=>focus.has(q)))return null;continue;}
    out.push(best);
  }
  return out;
}
function terraOk(tiles,up){
  const p=terraPlan(tiles,up);if(!p||p.err)return false;
  const E=elev.slice();for(const[i,h]of p.nl)E[i]=h;
  const RP=ramp.slice();for(let i=0;i<N;i++)if(RP[i]&&!(i>=MW&&E[i-MW]===E[i]+1))RP[i]=0;
  const focus=new Set();for(const[i]of p.nl)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)focus.add(i+dy*MW+dx);
  return !!rampsFor(E,RP,castleOf(1),focus);
}
function terraWhy(tiles,up){
  const p=terraPlan(tiles,up),e=p&&p.err;
  return {max:'Esse terreno já está no nível máximo (4 alturas).',flat:'Não há terreno alto para aplainar aí.',big:'Obra grande demais: escolha um ponto mais perto da beira do morro.',edge:'Muito perto da borda do mapa.',water:'Não dá para mexer no terreno com água ou fosso no caminho.',bld:'Há um prédio no caminho da encosta (ou um prédio ainda em obra).',none:'Esse terreno já está assim.'}[e]||'Não há lugar para a escada dessa obra.';
}
// every terrace keeps at least one stair
function ensureRamps(){
  for(let i=0;i<N;i++)if(ramp[i]&&!(i>=MW&&elev[i-MW]===elev[i]+1))ramp[i]=0;
  const add=rampsFor(elev,ramp,castleOf(1),new Set())||[];
  for(const j of add)ramp[j]=1;
}
function terraform(tiles,up){
  const p=terraPlan(tiles,up);if(!p||p.err)return 0;
  for(const[i,h]of p.nl){elev[i]=h;if(S.tiles[i]===TREE){S.tiles[i]=GRASS;S.wood[i]=0;HOOK.tile(i%MW,(i/MW)|0);}}
  ensureRamps();computeCliffs();
  for(let i=0;i<N;i++)if(cliff[i]&&(S.tiles[i]===ROAD||S.tiles[i]===TREE)){S.tiles[i]=GRASS;S.wood[i]=0;}
  // nobody stays stuck inside a new cliff face
  for(const u of S.ents){
    if(u.dead||!(DEF[u.kind].unit||DEF[u.kind].critter)||DEF[u.kind].naval)continue;
    const i=tileIdx(u.x,u.y);if(!cliff[i])continue;
    for(let r=1;r<5;r++){let done=false;for(let dy=-r;dy<=r&&!done;dy++)for(let dx=-r;dx<=r&&!done;dx++){const x=(i%MW)+dx,y=((i/MW)|0)+dy;if(inB(x,y)&&walkXY(x,y)&&!cliff[idx(x,y)]){u.x=(x+.5)*TS;u.y=(y+.5)*TS;u.path=null;done=true;}}if(done)break;}
  }
  reachDirty=true;HOOK.terrain();
  return p.n;
}
function doTerra(u,dt){
  const o=u.order,ts=o.tiles;if(!ts||!ts.length){u.order=null;return;}
  let cx=0,cy=0;for(const i of ts){cx+=i%MW;cy+=(i/MW)|0;}cx=(cx/ts.length+.5)*TS;cy=(cy/ts.length+.5)*TS;
  if(hyp(u.x-cx,u.y-cy)>Math.sqrt(ts.length)*TS*.7+40){
    u.rp=(u.rp||0)-dt;
    if((!u.path&&!u.detour)||u.rp<=0){u.rp=2;if(pathToPoint(u,cx,cy,false)===0){u.order=null;HOOK.engineer('cant',u,'Não consigo chegar lá para mexer no terreno.');return;}}
    followPath(u,dt);return;
  }
  u.path=null;u.moving=false;u.anim='build';
  o.t=(o.t||0)+dt;
  if(o.t<4+ts.length*.25)return;
  u.order=null;
  if(!terraOk(ts,o.up)){HOOK.engineer('cant',u,'O terreno mudou e não dá mais para fazer essa obra.');return;}
  const cost=terraPlan(ts,o.up).cost;
  if(!afford(1,cost)){HOOK.engineer('cant',u,'Faltam recursos para a obra no terreno.');return;}
  pay(1,cost);terraform(ts,o.up);engineerXp(1);
  const lv=elev[ts[Math.floor(ts.length/2)]];
  HOOK.engineer('terra',u,o.up?`Pronto! Terreno no nível ${lv+1} de 4, com escada para subir.`:'Pronto! Terreno aplainado.',{x:cx,y:cy});
}
// the engineer's own ideas about the land, always asked to the player
function terraIdeas(g){
  if(S.ask||S.t<((S.askCd||{}).terra||0)||eraOf(1)<2)return false;
  S.terraChk=(S.terraChk||0)-2;if(S.terraChk>0)return false;S.terraChk=40;
  // a tower that can still climb: lift it one more level (four heights in all)
  for(const b of BLDS){
    if(b.dead||b.team!==1||b.kind!=='tower'||!b.built)continue;
    const lv=elev[idx(b.tx,b.ty)];if(lv>=MAXLV||(S.towerAsk||{})[b.id]>S.t)continue;
    const ts=rectTiles(b.tx-1,b.ty-1,4,4);
    if(terraOk(ts,true)){(S.towerAsk=S.towerAsk||{})[b.id]=S.t+240;const p=terraPlan(ts,true);ask({kind:'terra',tiles:ts,up:true,cost:p.cost,loc:{x:b.x,y:b.y,id:b.id},text:`Se eu subir esta torre para o nível ${lv+2} de 4, ela atira ${Math.round((towerReach(lv+1)-1)*100)}% mais longe e acerta mais forte. Posso fazer a obra?`});return true;}
  }
  // a small hill right next to the castle that only gets in the way
  const c=castleOf(1);if(!c)return false;
  const seen=new Uint8Array(N);
  for(let i0=0;i0<N;i0++){
    if(!elev[i0]||seen[i0])continue;
    const cells=[],st=[i0];seen[i0]=1;
    while(st.length){const q=st.pop();cells.push(q);const x=q%MW,y=(q/MW)|0;for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const ni=idx(nx,ny);if(elev[ni]&&!seen[ni]){seen[ni]=1;st.push(ni);}}}
    if(cells.length>36||cells.some(q=>occ[q]))continue;
    const near=cells.some(q=>hyp((q%MW+.5)*TS-c.x,(((q/MW)|0)+.5)*TS-c.y)<10*TS);
    if(near&&terraOk(cells,false)){const q=cells[0];ask({kind:'terra',tiles:cells,up:false,cost:terraPlan(cells,false).cost,loc:{x:(q%MW)*TS,y:((q/MW)|0)*TS},text:'Esse morro perto do castelo atrapalha o caminho dos aldeões. Posso aplainar o terreno?'});return true;}
  }
  return false;
}

// ---------------------------------------------------------------- the chief engineer: with the kingdom from the first minute
function engineerBrain(dt){
  let g=S.engineerId&&byId.get(S.engineerId);
  if(!alive(g)||g.team!==1){
    // a new chief is chosen among the villagers after a while
    if(S.engineerId&&!S.engLostT)S.engLostT=S.t;
    if(S.engLostT&&S.t-S.engLostT>45){S.engLostT=0;S.engineerId=0;makeEngineer();}
    return;
  }
  S.engT=(S.engT||0)-dt;if(S.engT>0)return;S.engT=2;
  if(S.ask&&S.t-S.ask.t>75){if(S.ask.kind!=='medic')(S.askCd=S.askCd||{})[S.ask.kind]=S.t+60;nextAsk();}
  if(S.autoBuild===false)return;
  const T=S.teams[1],c=castleOf(1);if(!c)return;
  const builders=id=>S.ents.filter(p=>!p.dead&&p.team===1&&p.order&&p.order.type==='build'&&p.order.id===id).length;
  const enemyNear=b=>!!threatNear(b.x,b.y-20,1,260);
  const say=(k,msg,loc)=>{if(S.t-(S.engSay||-99)>18){S.engSay=S.t;HOOK.engineer(k,g,msg,loc);}};
  const gIdle=!g.order||g.order.type==='move'&&g.order.engIdle;
  const pending=k=>BLDS.some(b=>!b.dead&&b.team===1&&b.kind===k&&!b.built);
  const count=k=>BLDS.filter(b=>!b.dead&&b.team===1&&b.kind===k).length;
  const askOk=k=>!S.ask&&S.t>((S.askCd||{})[k]||0);
  const room=(cost,keep)=>{for(const r in cost)if(T.res[r]<cost[r]+(keep||0))return false;return true;};
  // 1. foundations nobody is working on
  for(const b of BLDS){
    if(b.dead||b.team!==1||b.built||builders(b.id)||enemyNear(b))continue;
    const ps=nearestPawns(b.x,b.y,DEF[b.kind].wall||DEF[b.kind].bridge?1:2,1);
    if(gIdle&&hyp(g.x-b.x,g.y-b.y)<20*TS){g.order={type:'build',id:b.id};g.path=null;}
    else if(ps.length)sendBuilders(b,ps);
    say('found','Tem obra parada. Mandei gente terminar.',{x:b.x,y:b.y});
    return;
  }
  // 2. repairs once the fight is over
  const hurt=BLDS.filter(b=>!b.dead&&b.team===1&&b.built&&b.hp<b.maxhp*.75&&S.t-(b.lastHit||-99)>8&&!builders(b.id)).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];
  if(hurt){
    if(gIdle){g.order={type:'build',id:hurt.id};g.path=null;}
    else sendBuilders(hurt,nearestPawns(hurt.x,hurt.y,1,1));
    say('repair',`Hora de consertar: ${DEF[hurt.kind].name.toLowerCase()}. Os operários já estão indo.`,{x:hurt.x,y:hurt.y});
    return;
  }
  // 3. a new house every time the population gets within three of the limit
  const cap=popCap(1),used=popUsed(1);
  if(cap<100&&cap-used<=3&&!pending('house')&&engPlan(g,'house',c.x,c.y-30,4,15,`Estamos com ${used} de ${cap} pessoas. Vou levantar mais uma casa.`))return;
  // 4. hand out the work (idle villagers, shortages, new villagers)
  if(delegate(g))return;
  // 5. farms when the animals near home run out
  const pawns=S.ents.filter(p=>!p.dead&&p.team===1&&p.kind==='pawn');
  const food=pawns.filter(p=>p.order&&p.order.type==='gather'&&p.order.res==='food').length;
  let crit=0;for(const e of S.ents)if(!e.dead&&DEF[e.kind].critter&&hyp(e.x-c.x,e.y-c.y)<14*TS)crit++;
  if(S.t-(S.engBuildT||-99)>=10){
    if(food>=2&&crit<food&&count('farm')<Math.min(12,Math.ceil(pawns.length/2.5))&&!pending('farm')&&engPlan(g,'farm',c.x,c.y,3,9,'As ovelhas estão acabando. Vou abrir uma fazenda.'))return;
    // 6. at least one of every military building as soon as the era allows
    for(const k of ENG_IDEAS){
      if(!unlocked(1,k)||count(k)||pending(k))continue;
      if(!room(DEF[k].cost,40))continue;
      if(engPlan(g,k,c.x,c.y-20,5,13,`Ainda não temos ${DEF[k].name.toLowerCase()}. Já estou construindo um.`))return;
    }
    // 7. security: towers around the village, more with each era
    const towers=count('tower');
    if(unlocked(1,'tower')&&towers<Math.min(6,T.era+1)&&!pending('tower')&&room(DEF.tower.cost,60)){
      const p=perimeterPoint(towers);
      if(p&&engPlan(g,'tower',p.x,p.y,0,4,'Mais uma torre na borda da vila. Segurança em primeiro lugar.'))return;
    }
    // 8. a drop-off house next to workers who walk too far
    const far=pawns.filter(p=>p.order&&p.order.type==='gather'&&p.order.res!=='food'&&p.order.lx!=null&&(()=>{const d=nearestDrop(p,p.order.lx,p.order.ly);return !d||distRect(p.order.lx,p.order.ly,rectOf(d))>12*TS;})());
    if(far.length>=3&&!pending('house')&&S.t-(S.engDropT||-99)>90){
      let x=0,y=0;for(const p of far){x+=p.order.lx;y+=p.order.ly;}x/=far.length;y/=far.length;
      if(engPlan(g,'house',x,y,2,7,'Os operários andam demais até o depósito. Uma casa perto do trabalho resolve.')){S.engDropT=S.t;return;}
    }
  }
  // 9. walls and gates once the village has grown or been attacked (his own decision)
  if(!S.wallPlan&&T.era>=2&&((S.villageHits||0)>=1||pawns.length>=12)){S.wallPlan=planWalls();if(S.wallPlan)HOOK.engineer('walls',g,'A vila cresceu. Vou cercar tudo com muralha e portões, um lado de cada vez.',{x:c.x,y:c.y});}
  if(S.wallPlan&&S.t-(S.wallT||-99)>25&&wallStep(g)){S.wallT=S.t;return;}
  // 10. reminders that need the player: market, tavern, a dock by the water, trading, renovations, terrain works
  if(askOk('remind')){
    const ideas=[];
    if(!count('market'))ideas.push({kind:'build',what:'market',text:'Ainda não temos mercado. Com ele dá para vender o que sobra e comprar o que falta. Posso construir um?'});
    if(!count('tavern'))ideas.push({kind:'build',what:'tavern',text:'O povo trabalha sem parar e não tem onde descansar. Posso construir uma taberna? Quem descansa volta mais rápido e os feridos se curam bebendo.'});
    if(!count('dock')&&coastNear(c))ideas.push({kind:'build',what:'dock',text:'A água está perto da vila. Posso construir um cais? Com barcos dá para levar tropas pelo mar.'});
    const tr=tradeIdea();if(tr)ideas.push(tr);
    if(ideas.length){const q=ideas[Math.floor(S.t/7)%ideas.length];q.cost=q.what?DEF[q.what].cost:q.cost;ask(Object.assign({},q,{kind:q.kind==='build'?'build':q.kind}));S.askCd=S.askCd||{};S.askCd.remind=S.t+70;return;}
  }
  if(engineerBoss(g)&&askOk('reno')&&count('house')>=5&&cap<100){
    const h=BLDS.filter(b=>!b.dead&&b.team===1&&b.kind==='house'&&b.built&&!b.reno&&HOUSE_LV[(b.level||1)+1]&&HOUSE_LV[(b.level||1)+1].era<=T.era).sort((a,b)=>(a.level||1)-(b.level||1))[0];
    if(h){const L=HOUSE_LV[(h.level||1)+1];ask({kind:'reno',id:h.id,cost:L.cost,loc:{x:h.x,y:h.y,id:h.id},text:`Já temos muitas casas. Posso reformar esta para caber ${L.pop} pessoas em vez de ${housePop(h)}?`});return;}
  }
  if(terraIdeas(g))return;
  // 11. nothing urgent: walk around the village keeping an eye on everything
  if(gIdle&&(!g.order||hyp(g.x-g.order.x,g.y-g.order.y)<30)){const p=perimeterPoint(Math.floor(S.t/9));if(p)g.order={type:'move',x:p.x,y:p.y,engIdle:true};}
}
// points on a ring around the village, used for towers and for the engineer's rounds
function perimeterPoint(k){
  const c=castleOf(1);if(!c)return null;
  const core=BLDS.filter(b=>!b.dead&&b.team===1&&!DEF[b.kind].wall&&hyp(b.x-c.x,b.y-c.y)<15*TS);
  let r=7*TS;for(const b of core)r=Math.max(r,hyp(b.x-c.x,b.y-c.y)+2*TS);
  const a=k*2.4+.6,x=clamp(c.x+Math.cos(a)*r,3*TS,(MW-3)*TS),y=clamp(c.y-30+Math.sin(a)*r*.8,3*TS,(MH-3)*TS);
  return {x,y};
}
function coastNear(c){for(let r=3;r<12;r++)for(let k=0;k<16;k++){const a=k/16*Math.PI*2,x=tileOf(c.x+Math.cos(a)*r*TS),y=tileOf(c.y+Math.sin(a)*r*TS);if(inB(x,y)&&S.tiles[idx(x,y)]===WATER)return true;}return false;}
// a trade worth suggesting at the market
function tradeIdea(){
  if(!marketOf(1))return null;const T=S.teams[1].res;
  for(const[a,b]of[['food','wood'],['wood','food']]){if(T[a]>=700&&T[b]<150)return {kind:'trade',from:a,to:b,cost:null,text:`Sobra ${RES_NAME[a]} (${Math.floor(T[a])}) e falta ${RES_NAME[b]} (${Math.floor(T[b])}). Posso trocar 100 de ${RES_NAME[a]} por 100 de ${RES_NAME[b]} no mercado?`};}
  for(const a of['food','wood'])if(T[a]>=900&&T.gold<100)return {kind:'trade',from:a,to:'gold',cost:null,text:`Temos ${Math.floor(T[a])} de ${RES_NAME[a]} parados e quase nenhum ouro. Posso vender 100 de ${RES_NAME[a]} no mercado?`};
  return null;
}

// ---------------------------------------------------------------- boats: carry troops over the water
function waterSpotNear(b){
  PNAV=true;let best=null;
  const r=rectOf(b),cx=tileOf(r[0]+r[2]/2),cy=tileOf(r[1]+r[3]/2);
  for(let d=1;d<8&&!best;d++)for(let dy=-d;dy<=d&&!best;dy++)for(let dx=-d;dx<=d;dx++){const x=cx+dx,y=cy+dy;if(inB(x,y)&&walk(idx(x,y))){best={x:x*TS+16,y:y*TS+16};break;}}
  PNAV=false;
  return best||freeSpotNear(b);
}
// a water tile next to land, as close as possible to where the troops should go ashore
function shoreSpot(x,y){
  const tx=clamp(tileOf(x),0,MW-1),ty=clamp(tileOf(y),0,MH-1);
  for(let r=0;r<14;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const wx=tx+dx,wy=ty+dy;if(!inB(wx,wy)||S.tiles[idx(wx,wy)]!==WATER||blk[idx(wx,wy)])continue;
    for(const[ax,ay]of[[1,0],[-1,0],[0,1],[0,-1]]){const lx=wx+ax,ly=wy+ay;if(inB(lx,ly)&&groundOK(idx(lx,ly))&&!blk[idx(lx,ly)])return {wx,wy,lx,ly};}
  }
  return null;
}
function updBoat(u,dt){
  if(u.hitT>0)u.hitT-=dt;
  u.moving=false;
  if(!walkPt(u.x,u.y)){const w=nearestWalk(clamp(tileOf(u.x),0,MW-1),clamp(tileOf(u.y),0,MH-1));if(w){u.x=w[0]*TS+16;u.y=w[1]*TS+16;u.path=null;}}
  const o=u.order;if(!o)return;
  if(o.type==='move'){doMove(u,dt);return;}
  if(o.type==='unload'){
    if(!u.cargo||!u.cargo.length){u.order=null;return;}
    if(!o.spot){o.spot=shoreSpot(o.x,o.y);if(!o.spot){u.order=null;HOOK.toast('Não achei uma praia para desembarcar perto dali.','warn');return;}}
    const sx=o.spot.wx*TS+16,sy=o.spot.wy*TS+16;
    if(hyp(u.x-sx,u.y-sy)>20){
      if(!u.path&&!u.detour){const r=pathToPoint(u,sx,sy,true);if(r===0){u.order=null;HOOK.toast('O barco não consegue chegar até lá pela água.','warn');return;}if(r<0)return;}
      followPath(u,dt);return;
    }
    unloadBoat(u,o.spot.lx,o.spot.ly,o.x,o.y);
    return;
  }
  u.order=null;
}
function unloadBoat(u,lx,ly,gx,gy){
  PNAV=false;
  const spots=[];
  for(let r=0;r<5&&spots.length<u.cargo.length;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const x=lx+dx,y=ly+dy;if(inB(x,y)&&walk(idx(x,y)))spots.push([x,y]);
  }
  if(!spots.length)return;
  u.cargo.forEach((c,i)=>{const s=spots[i%spots.length];c.x=s[0]*TS+16+(Math.random()-.5)*8;c.y=s[1]*TS+18;c.aboard=false;c.path=null;c.detour=null;
    c.order=gx!=null&&!(c.kind==='pawn')?{type:'move',x:gx+(Math.random()-.5)*50,y:gy+(Math.random()-.5)*40}:null;addEnt(c);});
  const n=u.cargo.length;u.cargo=[];u.order=null;
  if(u.team===1)HOOK.toast(`${n} ${n===1?'unidade desembarcou':'unidades desembarcaram'}.`,'good',{x:lx*TS,y:ly*TS});
}
function doBoard(u,dt){
  const o=u.order,b=byId.get(o.id);
  if(!alive(b)||b.team!==u.team||!DEF[b.kind].naval){u.order=null;return;}
  b.cargo=b.cargo||[];
  if(b.cargo.length>=DEF[b.kind].cap){u.order=null;HOOK.toast('O barco já está cheio.','warn');return;}
  if(hyp(u.x-b.x,u.y-b.y)<=56){u.order=null;u.path=null;u.carry=u.carry;u.aboard=true;b.cargo.push(u);return;}
  u.rp=(u.rp||0)-dt;
  if((!u.path&&!u.detour)||u.rp<=0){u.rp=1.5;if(pathToPoint(u,b.x,b.y,false)===0){u.order=null;HOOK.toast('Não dá para chegar ao barco: leve-o até a margem.','warn');return;}}
  followPath(u,dt);
}

// a good spot for a dock: land touching water, near the castle
function dockSpot(){
  const c=castleOf(1);if(!c)return null;
  for(let r=3;r<16;r++)for(let k=0;k<24;k++){const a=k/24*Math.PI*2,tx=Math.round(c.x/TS+Math.cos(a)*r)-1,ty=Math.round(c.y/TS+Math.sin(a)*r)-1;if(canPlace(1,'dock',tx,ty))return {x:(tx+1)*TS,y:(ty+1)*TS};}
  return null;
}

