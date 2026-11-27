// ================================================================ Memória do Rubro: the Red Kingdom learns how YOU play, match after match
// Every Batalha Rápida against the Red Kingdom is watched second by second: when you build, how many workers you keep, which
// troops you like in each age, where your army walks, when and from which side you attack, what you go for, how fast you answer
// a raid, which deals you make with the towns. It all stays on this device and is folded into a profile of your style (recent
// matches weigh more, but every match counts). Before each match, and again every minute while you play, the Red Kingdom reads
// the profile and draws a counter-plan: troops that beat yours ready before you arrive, towers on the side you come from, the
// army waiting in the woods you walk through, raids where your workers are left alone, its big push at the minute your army is
// usually smallest, and the tactics of the war council that already worked against you trusted more.
// Its own way of playing (a genome of ten genes) also evolves: after each match it keeps the best version and tries a new one,
// like an evolution, so the next match is always a little harder. Claude, when it commands red, reads the same dossier and
// writes its own lessons. Defesa do Rei learns too: the waves come from the side you defend less, with the troops that beat yours.
const LRN_KEY='rp.learn',LRN_PKEY='rp.learn.pend';
const LRN_KINDS=['warrior','archer','lancer','scout','monk','ram','catapult','royal','paladin','wizard','warship'];
const LRN_NAME={warrior:'guerreiros',archer:'arqueiros',lancer:'lanceiros',scout:'batedores',monk:'monges',ram:'aríetes',catapult:'catapultas',royal:'arqueiros reais',paladin:'paladinos',wizard:'magos',warship:'navios de guerra',other:'outras tropas'};
const LRN_BEAT={warrior:'lancer',archer:'warrior',lancer:'archer',scout:'lancer',monk:'warrior',ram:'warrior',catapult:'scout',royal:'warrior',paladin:'lancer',wizard:'scout',warship:'warship'};
// the genes of the Red Kingdom's way of playing: [lowest, highest, start]
const LRN_GENES={pawns:[-3,6,0],rush:[0,1,0],army:[.6,1.5,1],towers:[0,3,0],harass:[0,1,.3],siege:[0,1,.3],tech:[-1,1,0],gold:[-.1,.12,0],risk:[.3,.75,.5],care:[0,.5,.25]};
const LRN_GNAME={pawns:'Aldeões a mais',rush:'Ataque logo depois da trégua',army:'Exército mínimo para atacar',towers:'Torres a mais',harass:'Saques nos seus aldeões',siege:'Gosto por cerco',tech:'Pressa para avançar de era',gold:'Peso no ouro',risk:'Coragem antes de recuar',care:'Cautela nos planos'};
const LRN_STYLE={rush:'Ataque relâmpago',boom:'Economia primeiro',turtle:'Fortaleza: torres e muralhas',raid:'Saqueador de aldeões',tech:'Corrida de eras',diplo:'Diplomata das vilas',siege:'Mestre do cerco',naval:'Almirante',dive:'Vai direto no castelo',trade:'Comerciante'};
const HU=8,HV=7;                                   // the path map: along the way between the castles (u) and to each side (v)
let LRN=null;
function lrnBase(){const d={};for(const k in LRN_GENES)d[k]=LRN_GENES[k][2];return d;}
function lrnNew(){return {v:1,on:true,games:0,w:0,l:0,q:0,min:0,gen:1,dna:lrnBase(),best:null,sig:.12,P:{},plans:{},lessons:[],hist:[],ids:[],notes:'',next:'',since:Date.now(),surv:{n:0,side:new Array(8).fill(0),mix:{},best:0}};}
function lrnLoad(){
  if(LRN)return LRN;
  let o=null;try{if(typeof localStorage!=='undefined')o=JSON.parse(localStorage.getItem(LRN_KEY)||'null');}catch(e){o=null;}
  LRN=Object.assign(lrnNew(),o&&o.v===1?o:{});
  LRN.dna=Object.assign(lrnBase(),LRN.dna||{});LRN.P=LRN.P||{};LRN.surv=Object.assign(lrnNew().surv,LRN.surv||{});
  return LRN;
}
function lrnSave(){try{if(typeof localStorage!=='undefined')localStorage.setItem(LRN_KEY,JSON.stringify(LRN));}catch(e){}}
function lrnReset(){LRN=lrnNew();lrnSave();try{localStorage.removeItem(LRN_PKEY);}catch(e){}}
function lrnOn(){return !!(S&&S.lrn&&S.lrn.on&&!S.over);}
// the counter-plan for the kingdom being thought for (only the Red Kingdom against you)
function lrnCP(){return ME===2&&S&&S.lrn&&S.lrn.on&&S.lrn.kind==='sk'&&S.lrn.cp?S.lrn.cp:null;}
const lrnMM=t=>{t=Math.max(0,Math.round(t));return `${Math.floor(t/60)}:${String(t%60).padStart(2,'0')}`;};
function lrnMed(l){const a=l.filter(x=>x!=null&&isFinite(x)).sort((p,q)=>p-q);if(!a.length)return null;const m=a.length>>1;return a.length%2?a[m]:(a[m-1]+a[m])/2;}
function lrnSpread(l,m){const a=l.filter(x=>x!=null&&isFinite(x));if(a.length<2||m==null)return 90;return Math.max(30,lrnMed(a.map(x=>Math.abs(x-m)))*1.5);}
function lrnTop(m,n){return Object.entries(m||{}).filter(e=>e[1]>.04).sort((a,b)=>b[1]-a[1]).slice(0,n||3);}
function lrnShare(m){const o={};let s=0;for(const k in m)s+=m[k];if(!s)return null;for(const k in m)o[k]=m[k]/s;return o;}

// ---------------------------------------------------------------- the frame between the two castles (maps change, the habit stays)
function lrnFrame(){const a=castleOf(1),b=castleOf(2);if(!a||!b)return null;const dx=b.x-a.x,dy=b.y-a.y,L=hyp(dx,dy)||1;return {ax:a.x,ay:a.y,bx:b.x,by:b.y,ex:dx/L,ey:dy/L,L};}
const lrnUV=(F,x,y)=>{const rx=x-F.ax,ry=y-F.ay;return {u:(rx*F.ex+ry*F.ey)/F.L,v:(-rx*F.ey+ry*F.ex)/F.L};};
const lrnXY=(F,u,v)=>({x:F.ax+F.ex*u*F.L-F.ey*v*F.L,y:F.ay+F.ey*u*F.L+F.ex*v*F.L});
function lrnCell(u,v){const iu=Math.floor((u+.1)/.15),iv=Math.floor((v+.7)/.2);return iu<0||iu>=HU||iv<0||iv>=HV?-1:iu*HV+iv;}
const lrnCellUV=i=>({u:-.1+(Math.floor(i/HV)+.5)*.15,v:-.7+(i%HV+.5)*.2});
function lrnSide(v){return v>.13?'pela direita':v<-.13?'pela esquerda':'pela frente';}
// the same side in compass words on this map, seen from the Red castle
function lrnCompass(F,u,v){const p=lrnXY(F,u,v),dx=p.x-F.bx,dy=p.y-F.by;if(Math.abs(dx)>Math.abs(dy)*1.3)return dx>0?'leste':'oeste';if(Math.abs(dy)>Math.abs(dx)*1.3)return dy>0?'sul':'norte';return (dy>0?'sul':'norte')+'-'+(dx>0?'leste':'oeste');}

// ---------------------------------------------------------------- a new match: who is watched, and the counter-plan
function lrnBegin(resume){
  lrnLoad();
  // a match left halfway (closed window, new game) still teaches: it is kept as a quit
  let pend=null;try{if(typeof localStorage!=='undefined')pend=JSON.parse(localStorage.getItem(LRN_PKEY)||'null');}catch(e){pend=null;}
  if(pend&&(!S||!S.lrn||pend.id!==S.lrn.id)){try{localStorage.removeItem(LRN_PKEY);}catch(e){}if(pend.M&&!LRN.ids.includes(pend.id))lrnCommit(pend.M,pend.plans||{},pend.dna);}
  if(!S)return;
  if(resume&&S.lrn){if(S.lrn.on&&S.lrn.kind==='sk')lrnPlan();return;}
  const net=typeof NET!=='undefined'&&NET.on;
  const kind=S.mode==='skirmish'&&S.ai&&!(S.cfg&&S.cfg.watch)&&!net?'sk':S.mode==='survival'&&!net?'sv':'';
  S.lrn={on:!!(LRN.on&&kind),kind,id:String(Date.now())+'-'+Math.floor(Math.random()*1e6),diff:S.diff.key,gen:LRN.gen,games0:LRN.games,dna:Object.assign({},LRN.dna),
    tk:0,t10:0,t60:0,tp:0,mk:{},era:{},mix:{},heat:new Array(HU*HV).fill(0),atk:[],cur:null,kills:{pawn:0,eng:0,mil:0,gen:0,eco:0,milb:0,def:0,castle:0},lost:{pawn:0,mil:0},
    raidEv:0,raidK:0,lastRaidK:-99,raidLost:0,raids:0,react:[],rk:null,curve:[],mx:{pawns:0,towers:0,walls:0,farms:0,ships:0,army:0},dip:{},dipIds:[],svcIds:[],trade:0,conq:0,conqT:[],tax:[0,0],
    plans:{},said:{},brk:-99,hero:!!(S.heroId&&byId.get(S.heroId)),claude:!!(S.cfg&&S.cfg.claude),cp:null};
  if(S.lrn.on&&kind==='sk')lrnPlan();
}
function lrnKnow(){const n=lrnLoad().games;return 1-Math.exp(-n/4);}

// ---------------------------------------------------------------- watching (called every frame from update)
function lrnTick(dt){
  if(!lrnOn())return;
  const O=S.lrn;O.tk-=dt;if(O.tk>0)return;O.tk=2;
  if(O.kind==='sv'){lrnSurvSample(O);return;}
  const F=lrnFrame();if(!F)return;
  const mine=[],c2=castleOf(2);
  for(const e of S.ents){if(e.dead||e.team!==1)continue;const D=DEF[e.kind];if(D.unit&&D.mil&&!D.naval&&!D.king&&!D.boss&&!e.wave&&!e.svc&&!e.retreat)mine.push(e);}
  const cl=warClusters(mine,260);
  // where the army walks
  for(const c of cl){if(c.units.length<3)continue;const q=lrnUV(F,c.x,c.y);if(q.u<.12||q.u>1.1)continue;const i=lrnCell(q.u,q.v);if(i>=0)O.heat[i]+=c.units.length*.1;}
  // an attack on the Red Kingdom: a group of three or more marching on its castle, or fighting it on its half of the map
  let hit=null,hd=1e9;const H=O.hit&&S.t-O.hit.t<6?O.hit:null;
  for(const c of cl){if(c.units.length<3)continue;const d=hyp(c.x-F.bx,c.y-F.by);
    if(d>12*TS&&!(H&&hyp(H.x-c.x,H.y-c.y)<420&&lrnUV(F,c.x,c.y).u>.5))continue;if(d<hd){hd=d;hit=c;}}
  const T1=S.teams[1].stats,T2=S.teams[2].stats;
  if(hit){
    const q=lrnUV(F,hit.x,hit.y);
    if(!O.cur){
      const mix={};for(const u of hit.units){const k=LRN_KINDS.includes(u.kind)?u.kind:baseKind(u.kind);mix[k]=(mix[k]||0)+1;}
      O.cur={t:S.t,n:hit.units.length,u:q.u,v:q.v,mix,l1:T1.lost,l2:T2.lost,b2:O.kills.eco+O.kills.milb+O.kills.def,dive:false,last:S.t};
      lrnAttackSeen(O,F,q);
    }else{O.cur.n=Math.max(O.cur.n,hit.units.length);O.cur.last=S.t;}
    if(hyp(hit.x-F.bx,hit.y-F.by)<7*TS)O.cur.dive=true;
  }
  if(O.cur&&S.t-O.cur.last>20){
    const c=O.cur,pl=T1.lost-c.l1,al=T2.lost-c.l2,bl=O.kills.eco+O.kills.milb+O.kills.def-c.b2;
    O.atk.push({t:Math.round(c.t),dur:Math.round(c.last-c.t),n:c.n,u:+c.u.toFixed(2),v:+c.v.toFixed(2),mix:c.mix,dive:c.dive,pl,al,bl,ok:al+bl*3>pl});
    if(pl>al+bl*3&&pl>=4)O.brk=S.t;            // the attack broke: the Red Kingdom answers right away
    O.cur=null;
  }
  // the Red Kingdom's raids: how fast does the player answer once the raiders reach his side of the map?
  const A=S.ai,W=S.war&&S.war[2],rp=W&&W.plan&&['guerrilha','sabotagem'].includes(W.plan.type)?W.plan:null;
  const rkey=A&&A.raid?'r'+A.raid.t:rp?'w'+rp.id:null;
  if(rkey&&(!O.rk||O.rk.k!==rkey)){if(O.rk&&!O.rk.done&&O.rk.t!=null)O.react.push(60);O.rk={k:rkey,t:null,done:false};O.raids++;}
  if(O.rk&&!O.rk.done){
    if(!rkey){O.rk.done=true;if(O.rk.t!=null)O.react.push(60);}
    else{
      const ids=rkey[0]==='r'?A.raid.ids:[].concat(...Object.values(rp.g));
      const m=centroid(ids.map(id=>byId.get(id)).filter(u=>alive(u)));
      if(m&&O.rk.t==null&&lrnUV(F,m.x,m.y).u<.6)O.rk.t=S.t;
      if(m&&O.rk.t!=null&&mine.some(u=>hyp(u.x-m.x,u.y-m.y)<300)){O.rk.done=true;O.react.push(Math.round(S.t-O.rk.t));}
    }
  }
  O.t10-=2;if(O.t10<=0){O.t10=10;lrnSample10(O);}
  O.t60-=2;if(O.t60<=0){O.t60=60;
    let pa=0,aa=0,pp=0;for(const e of S.ents){if(e.dead)continue;const D=DEF[e.kind];if(!D.unit)continue;if(e.team===1){if(e.kind==='pawn')pp++;else if(D.mil&&!D.king)pa++;}else if(e.team===2&&D.mil&&!e.wave)aa++;}
    O.curve.push([pa,aa,pp]);if(O.curve.length>60)O.curve.shift();
    lrnPlan();}
  O.tp-=2;if(O.tp<=0){O.tp=30;lrnPendSave();}
}
function lrnSample10(O){
  const T=S.teams[1];
  for(let e=2;e<=5;e++)if(T.era>=e&&O.era[e]==null)O.era[e]=Math.round(S.t);
  let tw=0,wl=0,fm=0,sh=0,pw=0,ar=0;
  for(const e of S.ents){if(e.dead||e.team!==1)continue;const D=DEF[e.kind];
    if(D.building){if(e.built&&O.mk[e.kind]==null)O.mk[e.kind]=Math.round(S.t);if(e.kind==='tower'&&e.built)tw++;else if(D.wall)wl++;else if(e.kind==='farm')fm++;}
    else if(D.unit){if(e.kind==='pawn')pw++;else if(D.warship)sh++;else if(D.mil&&!D.king)ar++;}}
  const M=O.mx;M.towers=Math.max(M.towers,tw);M.walls=Math.max(M.walls,wl);M.farms=Math.max(M.farms,fm);M.ships=Math.max(M.ships,sh);M.pawns=Math.max(M.pawns,pw);M.army=Math.max(M.army,ar);
  const E=S.econ&&S.econ[1];if(E){O.tax[0]+=E.tax;O.tax[1]++;}
  for(const c of ctrList())if(c.team===1&&!O.dipIds.includes(c.id)){O.dipIds.push(c.id);O.dip[c.kind]=(O.dip[c.kind]||0)+1;}
  for(const m of svcList().list)if(m.team===1&&m.type!=='contract'&&!O.svcIds.includes(m.id)){O.svcIds.push(m.id);if(['sell','buy','swap','tech','arms','embassy'].includes(m.type))O.trade++;else O.dip[m.type]=(O.dip[m.type]||0)+1;}
  if(O.svcIds.length>300)O.svcIds.splice(0,100);
  for(const Tn of S.towns||[])if(Tn.siege&&Tn.siege.team===1&&!O.conqT.includes(Tn.i+':'+Tn.siege.t)){O.conqT.push(Tn.i+':'+Tn.siege.t);O.conq++;}
}
// the first attack of the match: was it the one the Red Kingdom expected?
function lrnAttackSeen(O,F,q){
  const cp=O.cp;if(O.atk.length||!cp||O.said.atk)return;O.said.atk=1;
  if(cp.know<.2||cp.atkT==null)return;
  const onTime=Math.abs(S.t-cp.atkT)<Math.max(75,cp.atkSd),sameSide=lrnSide(q.v)===lrnSide(cp.v);
  O.pred={time:onTime,side:sameSide};
  if(onTime&&sameSide)lrnSay('Na hora de sempre, pelo lado de sempre. Eu estava esperando você.');
  else if(sameSide)lrnSay(S.t<cp.atkT?'Veio mais cedo hoje... mas pelo caminho de sempre.':'Demorou hoje. E veio pelo caminho de sempre.');
  else if(onTime)lrnSay(`Mudou de lado? Veio ${lrnSide(q.v)}. Anotado.`);
  else lrnSay('Hum, isso é novo. Vou guardar essa.');
}
// units the player trains, by age
function lrnTrained(u){
  if(!lrnOn()||u.team!==1)return;const D=DEF[u.kind];if(!D.mil||D.king)return;
  const O=S.lrn,e=S.teams[1].era,k=LRN_KINDS.includes(u.kind)?u.kind:LRN_KINDS.includes(baseKind(u.kind))?baseKind(u.kind):'other';
  const m=O.mix[e]||(O.mix[e]={});m[k]=(m[k]||0)+1;
}
// what each side loses to the other
function lrnKill(t,src){
  if(!lrnOn()||!src)return;
  const O=S.lrn,D=DEF[t.kind];
  if(O.kind==='sv')return;
  if(t.team===2&&src.team===1){
    if(t.kind==='pawn'||t.kind==='engineer'){if(t.kind==='engineer')O.kills.eng++;else O.kills.pawn++;if(S.t-O.lastRaidK>40)O.raidEv++;O.lastRaidK=S.t;O.raidK++;}
    else if(D.building){const k=t.kind;if(k==='castle')O.kills.castle++;else if(['farm','house','market','tavern','dock'].includes(k))O.kills.eco++;else if(['barracks','archery','monastery'].includes(k))O.kills.milb++;else if(k==='tower'||D.wall)O.kills.def++;}
    else if(D.mil){O.kills.mil++;if(S.armies&&S.armies[2]&&S.armies[2].gen===t.id)O.kills.gen++;}
  }else if(t.team===1&&src.team===2){
    if(t.kind==='pawn'){O.lost.pawn++;const A=S.ai,W=S.war&&S.war[2];
      if(A&&A.raid&&A.raid.ids.includes(src.id)||W&&W.plan&&['guerrilha','sabotagem'].includes(W.plan.type)&&src.war===W.plan.id)O.raidLost++;}
    else if(D.mil)O.lost.mil++;
  }
}
// a plan of the Red war council ended (tactics.js warEnd)
function lrnPlanEnd(type,ok){if(ME!==2||!lrnOn()||S.lrn.kind!=='sk'||ok==null)return;const p=S.lrn.plans[type]||(S.lrn.plans[type]=[0,0]);p[ok?0:1]++;}
// the Red engineer speaks (only when Claude is not the one commanding red; Claude has its own voice)
function lrnSay(text){
  if(!S||S.cfg&&S.cfg.watch)return;
  if(typeof CLAUDE!=='undefined'&&CLAUDE.side&&CLAUDE.side[2].on&&!CLAUDE.side[2].stopped)return;
  const g=byId.get(S.redEngId);if(alive(g)&&typeof FX!=='undefined')FX.speech.push({id:g.id,txt:text,t:0,dur:5});
  HOOK.talk('rubropc',text);
}

// ---------------------------------------------------------------- the profile: every match folded in, the recent ones weigh more
function lrnStyle(P){
  P=P||lrnLoad().P;if(P.n==null)return null;
  const rel=P.atkRel,s={};
  s.rush=rel!=null?clamp(1-rel/360,0,1)*(1-(P.noAtk||0)):0;
  s.boom=clamp(((P.pawns||0)-15)/14,0,1)*(.4+.6*(rel!=null?clamp((rel-240)/600,0,1):1));
  s.turtle=clamp(((P.towers||0)+(P.walls||0)/25)/7,0,1);
  s.raid=clamp((P.raidK||0)/10,0,1);
  s.tech=P.era3!=null?clamp((1080-P.era3)/480,0,1):0;
  s.diplo=clamp(((P.dipN||0)+(P.conq||0)*2)/4,0,1);
  const mx=P.mixAll||{};s.siege=clamp(((mx.ram||0)+(mx.catapult||0))*4,0,1);
  s.naval=clamp((P.ships||0)/3,0,1);
  s.dive=clamp((P.dive||0)*1.2,0,1);
  s.trade=clamp((P.trade||0)/4,0,1);
  return s;
}
function lrnStyleTop(P){const s=lrnStyle(P);if(!s)return [];return Object.entries(s).filter(e=>e[1]>=.25).sort((a,b)=>b[1]-a[1]).slice(0,3);}
function lrnFav(P,era){P=P||lrnLoad().P;const m=era&&P.mixE&&P.mixE[era]||P.mixAll||{};const t=lrnTop(m,3);return t;}
// the player's army share by kind expected in an age (falls back to the overall mix)
function lrnPredMix(era){
  const P=lrnLoad().P,O=S&&S.lrn;let m=null;
  for(let e=era;e>=1&&!m;e--)if(P.mixE&&P.mixE[e])m=P.mixE[e];
  m=Object.assign({},m||P.mixAll||{});
  // this match counts too (what the player trains right now)
  if(O&&O.mix){const cur={};for(const e in O.mix)for(const k in O.mix[e])cur[k]=(cur[k]||0)+O.mix[e][k]*(+e===era?2:1);const sh=lrnShare(cur);if(sh)for(const k of new Set([...Object.keys(m),...Object.keys(sh)]))m[k]=(m[k]||0)*.45+(sh[k]||0)*.55;}
  return m;
}
// the counter-plan, the part that does not depend on the map: what the Red Kingdom will do against this player
// (also shown on the dossier screen before a match)
function lrnCounter(o){
  const L=lrnLoad(),P=L.P,know=o.know,st=lrnStyle(P)||{},dna=o.dna,K=k=>(st[k]||0)*know,cp={know,k2:o.k2!=null?o.k2:know,lines:[],st};
  cp.atkSd=P.atkSd||90;cp.atkN=P.atkN?Math.round(P.atkN):null;
  cp.early=K('rush')>.35||K('dive')>.45;
  cp.pawns=Math.round(dna.pawns+K('boom')*2+K('turtle')*2-K('rush')*2);
  cp.towers=Math.round(dna.towers+(K('rush')>.4?1:0)+(K('raid')>.4?1:0)+(K('dive')>.4?1:0));
  cp.siege=clamp(dna.siege+K('turtle')*.8,0,1.5);
  cp.harass=clamp(dna.harass+clamp(((P.vulnR||0)-.5)/2,0,1)*know*.7+K('boom')*.3,0,1);
  cp.rushNow=dna.rush>.55||K('boom')>.45||K('tech')>.5;
  cp.raid=K('raid');cp.diplo=K('diplo')+K('trade')*.5;cp.naval=K('naval');cp.dive=K('dive');cp.trade=K('trade');
  cp.tech=dna.tech;cp.gold=dna.gold;cp.risk=dna.risk;cp.care=dna.care;cp.army=dna.army;
  // the player's answer to raids: slow → raid more; fast and eager → a feigned retreat pulls the army into a trap
  const rt=P.react;cp.chase=rt!=null?clamp((25-rt)/20,0,1)*know:0;cp.vuln=clamp(((P.vulnR||0)-.3)/2,0,1)*know;
  // the minute the player's army is usually smallest next to the workers: the big push goes there
  const cv=P.curve||[];let wm=null,wr=1e9;for(let m=Math.ceil(o.peace/60)+1;m<Math.min(cv.length,26);m++){const c=cv[m];if(!c||c[2]<6)continue;const r=(c[0]+1)/(c[2]+1);if(r<wr){wr=r;wm=m;}}
  cp.weakT=wm!=null&&know>.2?wm*60:null;
  // war council: the plans that worked against this player
  cp.planW={};for(const k in WAR_PLANS){const b=L.plans[k];if(!b)continue;const n=b.s+b.f,mean=(b.s+1)/(n+2),conf=n/(n+2);cp.planW[k]=clamp(1+(mean-.5)*1.3*conf,.45,1.6);}
  cp.roll=Math.round(WAR_ROLL+120*Math.min(L.games,12));
  // what the dossier says the Red Kingdom will do
  const fav=lrnTop(o.mix||P.mixAll||{},2),atkT=o.atkT,side=o.v!=null?lrnSide(o.v):null;
  if(fav.length&&cp.k2>.15){const b=LRN_BEAT[fav[0][0]]||'warrior';cp.lines.push(`Treinar ${LRN_NAME[b]} desde cedo, porque você gosta de ${LRN_NAME[fav[0][0]]} (${Math.round(fav[0][1]*100)}% das suas tropas).`);}
  if(atkT!=null&&know>.15)cp.lines.push(o.rel?`Ter o exército pronto um minuto antes do seu primeiro ataque, que costuma chegar ${lrnMM(Math.abs(atkT))} ${atkT<0?'antes':'depois'} do fim da trégua${cp.atkN?`, com uns ${cp.atkN} soldados`:''}.`:`Ter o exército pronto antes de ${lrnMM(atkT-60)}: o seu primeiro ataque costuma chegar por volta de ${lrnMM(atkT)}${cp.atkN?`, com uns ${cp.atkN} soldados`:''}.`);
  if(side&&cp.k2>.2)cp.lines.push(`Torre e exército esperando ${side}, o lado por onde você costuma chegar.`);
  if(o.cover&&cp.k2>.2)cp.lines.push('Emboscada na mata do caminho que você mais usa.');
  if(cp.weakT)cp.lines.push(`Ataque grande por volta de ${lrnMM(cp.weakT)}, quando o seu exército costuma estar menor perto dos aldeões.`);
  if(cp.harass>.5)cp.lines.push('Saques frequentes nos seus aldeões: eles costumam ficar sem guarda.');
  if(cp.chase>.4)cp.lines.push('Retirada fingida: você corre atrás de quem foge, e a armadilha fica no fim do caminho.');
  if(cp.siege>.6)cp.lines.push('Aríetes e catapultas a mais contra as suas torres e muralhas.');
  if(cp.rushNow&&know>.15)cp.lines.push('Atacar logo depois da trégua, antes de a sua economia crescer.');
  if(cp.raid>.35)cp.lines.push('Torre perto do ouro e aldeões que fogem mais cedo dos seus saques.');
  if(cp.diplo>.4)cp.lines.push('Alianças com as vilas antes de você, e lances maiores quando você tentar.');
  if(cp.dive>.4)cp.lines.push('Guarda no castelo: você costuma ir direto nele.');
  const bp=Object.entries(cp.planW).filter(e=>e[1]>1.1).sort((a,b)=>b[1]-a[1])[0];
  if(bp)cp.lines.push(`Repetir o que já funcionou contra você: ${WAR_PLANS[bp[0]].name}.`);
  return cp;
}
// the dossier screen, before any match: the same plan, without a map
function lrnPreview(){const L=lrnLoad(),P=L.P,know=lrnKnow();return lrnCounter({know,dna:L.dna,peace:300,atkT:P.atkRel,rel:true,v:P.v,cover:!!(P.heat&&P.heat.some(h=>h>.05))});}
// the counter-plan for this match (recomputed every minute: what red sees in this match counts as much as the profile)
function lrnPlan(){
  const L=lrnLoad(),P=L.P,O=S.lrn,F=lrnFrame();if(!O||!F)return null;
  const know=lrnKnow(),peace=S.diff.peace,seen=O.atk,curK=Math.min(1,seen.length*.5),k2=know+curK*(1-know);
  // from which side (this match first, then the profile)
  let v=P.v;if(seen.length){const cv=seen.reduce((s,a)=>s+a.v*a.n,0)/Math.max(1,seen.reduce((s,a)=>s+a.n,0));v=v==null?cv:v*(1-curK)+cv*curK;}
  // the woods the player walks through: ambush spots on the usual path (this match counts double)
  const heat=new Array(HU*HV).fill(0),ph=P.heat||[],sumO=O.heat.reduce((a,b)=>a+b,0)||1;
  for(let i=0;i<heat.length;i++)heat[i]=(ph[i]||0)*know+O.heat[i]/sumO*2*curK;
  const cover=[],cells=heat.map((h,i)=>[h,i]).filter(x=>x[0]>0).sort((a,b)=>b[0]-a[0]);
  for(const [h,i] of cells){if(cover.length>=2)break;const q=lrnCellUV(i);if(q.u<.35||q.u>.95)continue;const p=lrnXY(F,q.u,q.v);if(!inB(tileOf(p.x),tileOf(p.y)))continue;cover.push({x:p.x,y:p.y,h});}
  // the troops to have ready: what beats the player's favourites in this age
  const pred=lrnPredMix(S.teams[1].era),atkT=P.atkRel!=null?peace+P.atkRel:null;
  const cp=lrnCounter({know,k2,dna:O.dna,peace,atkT,v,cover:cover.length>0,mix:P.mixAll||pred});
  cp.v=v;cp.atkT=atkT;cp.pred=pred;cp.heat=heat;cp.heatMax=Math.max(...heat)||0;cp.cover=cover;cp.tw=[];
  // the next attack: the first one when it is due, later about the usual gap after the last one
  const lastA=seen.length?seen[seen.length-1]:null;
  cp.nextT=!seen.length&&!O.cur?atkT:lastA&&!O.cur?lastA.t+lastA.dur+(P.atkGap||240):null;
  if(v!=null&&k2>.15){
    const ent=lrnXY(F,.84,v),c=castleOf(2),dx=ent.x-c.x,dy=ent.y-c.y,dl=hyp(dx,dy)||1;
    cp.rally=walkNear(c.x+dx/dl*150,c.y+40+dy/dl*150);
    cp.tw.push(walkNear(c.x+dx/dl*Math.min(dl*.6,8*TS),c.y+dy/dl*Math.min(dl*.6,8*TS)));
    cp.sideName=lrnSide(v);cp.compass=lrnCompass(F,.84,v);
  }
  if(cp.raid>.35){const c=castleOf(2),g=S.ents.filter(e=>!e.dead&&e.kind==='gold'&&hyp(e.x-c.x,e.y-c.y)<14*TS).sort((a,b)=>hyp(a.x-c.x,a.y-c.y)-hyp(b.x-c.x,b.y-c.y))[0];if(g)cp.tw.push({x:g.x,y:g.y-20});}
  if(cp.dive>.4){const c=castleOf(2);cp.tw.push({x:c.x-F.ex*90,y:c.y+50});}
  O.cp=cp;
  return cp;
}
// how close the predicted attack is (0..1), for the war council
function lrnSoon(){const cp=lrnCP();if(!cp||cp.nextT==null)return 0;const d=(S.t-cp.nextT)/Math.max(50,cp.atkSd||60);return cp.k2*Math.exp(-d*d);}
function lrnPlanMult(type){const cp=lrnCP();return cp&&cp.planW&&cp.planW[type]||1;}
// how often the player walks near a point (0..1)
function lrnHeatAt(x,y){const cp=lrnCP();if(!cp||!cp.heat||!cp.heatMax)return 0;const F=lrnFrame();if(!F)return 0;const q=lrnUV(F,x,y);const i=lrnCell(q.u,q.v);return i<0?0:clamp(cp.heat[i]/cp.heatMax,0,1)*cp.k2;}
function lrnCover(){const cp=lrnCP();if(!cp)return [];const out=[];for(const p of cp.cover){const q=coverNear(p.x,p.y,6);if(q)out.push(Object.assign(q,{path:true}));}return out;}

// ---------------------------------------------------------------- the end of a match: fold it in, evolve, write lessons
function lrnSummary(res){
  const O=S.lrn,T1=S.teams[1],T2=S.teams[2],st=T1.stats;
  const eco=lrnShare({food:st.food,wood:st.wood,gold:st.gold});
  const all={},mixE={};for(const e in O.mix){mixE[e]=lrnShare(O.mix[e]);for(const k in O.mix[e])all[k]=(all[k]||0)+O.mix[e][k];}
  const A=O.atk.slice();if(O.cur)A.push({t:Math.round(O.cur.t),dur:Math.round(O.cur.last-O.cur.t),n:O.cur.n,u:O.cur.u,v:O.cur.v,mix:O.cur.mix,dive:O.cur.dive,pl:0,al:0,bl:0,ok:null});
  const wsum=A.reduce((s,a)=>s+a.n,0)||1;
  const hs=O.heat.reduce((a,b)=>a+b,0);
  const gaps=[];for(let i=1;i<A.length;i++)gaps.push(A[i].t-(A[i-1].t+A[i-1].dur));
  const sid=['merc','mercLife','hero','garrison','protect','loyalty','route','soldiers'];
  return {id:O.id,when:Date.now(),diff:O.diff,res,dur:Math.round(S.t),peace:S.diff.peace,era1:T1.era,era2:T2.era,k1:st.kills,l1:st.lost,k2:T2.stats.kills,l2:T2.stats.lost,
    atk:A.length?A[0].t:null,atkN:A.length?Math.round(wsum/A.length):null,nAtk:A.length,v:A.length?+(A.reduce((s,a)=>s+a.v*a.n,0)/wsum).toFixed(2):null,dive:A.length?A.filter(a=>a.dive).length/A.length:null,
    gap:gaps.length?lrnMed(gaps):null,atkOk:A.filter(a=>a.ok).length,
    mix:lrnShare(all),mixE,eco,mx:Object.assign({},O.mx),eraT:Object.assign({},O.era),bT:Object.assign({},O.mk),kills:Object.assign({},O.kills),lost:Object.assign({},O.lost),
    raidEv:O.raidEv,raidK:O.raidK,raids:O.raids,vulnR:O.raids?O.raidLost/O.raids:null,react:O.react.length?lrnMed(O.react):null,
    dipN:sid.reduce((s,k)=>s+(O.dip[k]||0),0),dip:Object.assign({},O.dip),conq:O.conq,trade:O.trade,tax:O.tax[1]?O.tax[0]/O.tax[1]:null,hero:O.hero,claude:O.claude,
    curve:O.curve.slice(0,40),heat:hs?O.heat.map(h=>+(h/hs).toFixed(3)):null,pred:O.pred||null,gen:O.gen};
}
function lrnFold(M){
  const L=lrnLoad(),P=L.P,a=Math.max(.25,1/((P.n||0)+1));
  const ew=(k,x)=>{if(x==null||!isFinite(x))return;P[k]=P[k]==null?x:P[k]*(1-a)+x*a;};
  const ewm=(o,m)=>{for(const q of new Set([...Object.keys(o),...Object.keys(m)]))o[q]=(o[q]==null?0:o[q])*(1-a)+(m[q]||0)*a;return o;};
  P.n=(P.n||0)+1;
  // the first attack: a list of recent ones, relative to the end of the truce
  P.atkRelL=(P.atkRelL||[]);P.atkRelL.push(M.atk!=null?M.atk-M.peace:null);if(P.atkRelL.length>15)P.atkRelL.shift();
  P.atkRel=lrnMed(P.atkRelL);P.atkSd=lrnSpread(P.atkRelL,P.atkRel);
  ew('noAtk',M.atk==null&&M.dur>M.peace+240?1:0);
  ew('atkN',M.atkN);ew('atkGap',M.gap);ew('dive',M.dive);
  if(M.v!=null){ew('v',M.v);}
  if(M.heat){P.heat=P.heat||new Array(HU*HV).fill(0);for(let i=0;i<M.heat.length;i++)P.heat[i]=P.heat[i]*(1-a*.8)+M.heat[i]*a;}
  if(M.mix)P.mixAll=ewm(P.mixAll||{},M.mix);
  P.mixE=P.mixE||{};for(const e in M.mixE)if(M.mixE[e])P.mixE[e]=ewm(P.mixE[e]||{},M.mixE[e]);
  if(M.eco)P.eco=ewm(P.eco||{},M.eco);
  ew('pawns',M.mx.pawns);ew('towers',M.mx.towers);ew('walls',M.mx.walls);ew('farms',M.mx.farms);ew('ships',M.mx.ships);ew('army',M.mx.army);
  for(const e of[2,3,4,5])if(M.eraT[e]!=null)ew('era'+e,M.eraT[e]);
  for(const k of['barracks','archery','tower','monastery','market','dock'])if(M.bT[k]!=null)ew('b_'+k,M.bT[k]);
  ew('raidK',M.raidK);ew('vulnR',M.vulnR);ew('react',M.react);ew('dipN',M.dipN);ew('conq',M.conq);ew('trade',M.trade);ew('tax',M.tax);
  P.hunt=ewm(P.hunt||{},{eco:M.kills.eco,mil:M.kills.milb,def:M.kills.def,army:M.kills.mil/5});
  if(M.curve&&M.curve.length){P.curve=P.curve||[];for(let m=0;m<M.curve.length;m++){const c=M.curve[m],o=P.curve[m];P.curve[m]=o?o.map((x,j)=>+(x*(1-a)+c[j]*a).toFixed(2)):c.slice();}}
}
// the Red Kingdom's own score for the match: did its way of playing work against this player?
function lrnFit(M){
  const adv=Math.tanh(((M.k2-M.l2)-(M.k1-M.l1))/30);
  if(M.res==='lose')return 1+.3*Math.max(0,1-M.dur/2400)+.1*adv;
  if(M.res==='win')return -1+.5*Math.min(1,M.dur/2400)+.25*adv;
  if(M.res==='quit')return M.dur>300?.4+.2*adv:0;
  return .6*adv;
}
// a few genes change a little each time: the Red Kingdom never throws away what already works against you
function lrnMutate(d,sig){
  const o=Object.assign({},d),ks=Object.keys(LRN_GENES).sort(()=>Math.random()-.5).slice(0,3);
  for(const k of ks){const [lo,hi]=LRN_GENES[k],r=hi-lo;let g=0;for(let i=0;i<4;i++)g+=Math.random();g=(g-2)*1.73;o[k]=+clamp(d[k]+g*sig*r,lo,hi).toFixed(3);}
  return o;
}
// the lessons the computer writes for itself
function lrnLessonsPC(M,cp){
  const out=[],fav=lrnTop(M.mix,1)[0],side=M.v!=null?lrnSide(M.v):null;
  if(M.res==='win'){
    if(M.nAtk&&fav)out.push(`Ele venceu com ${LRN_NAME[fav[0]]} atacando ${side||'pela frente'}${M.atk!=null?` a partir de ${lrnMM(M.atk)}`:''}. Próxima: ${LRN_NAME[LRN_BEAT[fav[0]]]} prontos antes${M.atk!=null?` de ${lrnMM(M.atk-60)}`:''}.`);
    else if(M.raidK>=5)out.push(`Ele venceu matando ${M.raidK} aldeões nossos. Próxima: torres no ouro e fugir mais cedo.`);
    else out.push(`Ele venceu em ${lrnMM(M.dur)}.${M.era1<5?` Próxima: atacar antes de ele chegar na Era ${['','I','II','III','IV','V'][M.era1+1]}.`:' Próxima: mais pressão desde o começo.'}`);
  }else if(M.res==='lose'){
    const best=Object.entries(S.lrn.plans).sort((a,b)=>b[1][0]-a[1][0])[0];
    out.push(`Vencemos em ${lrnMM(M.dur)}.${best&&best[1][0]?` O que mais funcionou: ${WAR_PLANS[best[0]].name}.`:''} Manter a pressão.`);
  }else if(M.res==='quit')out.push(`Ele desistiu aos ${lrnMM(M.dur)}. O plano estava funcionando.`);
  if(M.pred&&cp&&cp.know>.2){if(!M.pred.side&&side)out.push(`Ele mudou de lado: veio ${side}. Não confiar só no costume.`);if(!M.pred.time&&M.atk!=null)out.push(`Ele mudou o horário do ataque para ${lrnMM(M.atk)}.`);}
  if(M.vulnR!=null&&M.vulnR>=1.5)out.push(`Cada saque nosso matou uns ${Math.round(M.vulnR)} aldeões dele: saquear mais.`);
  if(M.react!=null&&M.react<12&&M.raids>=2)out.push(`Ele responde aos saques em ${Math.round(M.react)} s: usar a retirada fingida.`);
  if(M.mx.towers>=4)out.push(`Ele ergueu ${M.mx.towers} torres: levar aríetes e catapultas.`);
  return out.slice(0,3);
}
function lrnCommit(M,plans,dna){
  const L=lrnLoad();if(L.ids.includes(M.id))return null;
  L.ids.push(M.id);if(L.ids.length>80)L.ids.shift();
  lrnFold(M);
  for(const k in plans){const b=L.plans[k]||(L.plans[k]={s:0,f:0});b.s+=plans[k][0];b.f+=plans[k][1];}
  for(const k in L.plans){if(!(k in plans)){L.plans[k].s*=.93;L.plans[k].f*=.93;}}
  // evolution: keep the best way of playing, try a new one next time
  const fit=lrnFit(M),gen0=L.gen;
  if(L.best)L.best.F-=.08;                                   // the player changes too: old victories count a little less
  if(!L.best||fit>=L.best.F){L.best={dna:Object.assign({},dna||L.dna),F:fit};L.sig=Math.min(.2,L.sig*1.15);}else L.sig=Math.max(.04,L.sig*.85);
  L.dna=lrnMutate(L.best.dna,L.sig);L.gen++;
  L.games++;L.min+=M.dur/60;if(M.res==='win')L.w++;else if(M.res==='lose')L.l++;else L.q++;
  M.fit=+fit.toFixed(2);
  L.hist.unshift({when:M.when,diff:M.diff,res:M.res,dur:M.dur,atk:M.atk,nAtk:M.nAtk,fav:(lrnTop(M.mix,1)[0]||[''])[0],side:M.v!=null?lrnSide(M.v):'',k1:M.k1,l1:M.l1,gen:M.gen,fit:M.fit,cl:M.claude?1:0});
  if(L.hist.length>200)L.hist.length=200;
  lrnSave();
  return {gen0,gen:L.gen,fit};
}
function lrnEnd(res){
  if(!S||!S.lrn||!S.lrn.on)return null;
  const O=S.lrn;if(O.done)return O.done;
  if(O.kind==='sv'){O.done=lrnSurvEnd();return O.done;}
  const L=lrnLoad();if(L.ids.includes(O.id)){O.done={};return O.done;}
  const M=lrnSummary(res),cp=O.cp,lessons=lrnLessonsPC(M,cp);
  const r=lrnCommit(M,O.plans,O.dna);if(!r){O.done={};return O.done;}
  for(const t of lessons.slice().reverse())L.lessons.unshift({t:Date.now(),txt:t,by:'pc',res});
  if(L.lessons.length>14)L.lessons.length=14;
  lrnSave();try{localStorage.removeItem(LRN_PKEY);}catch(e){}
  O.done={res,gen0:r.gen0,gen:r.gen,lessons,M,style:lrnStyleTop(L.P)};
  return O.done;
}
// a match in progress is saved now and then as a quit, in case the window closes
function lrnPendSave(){
  if(!lrnOn()||S.lrn.kind!=='sk'||S.t<150)return;
  try{if(typeof localStorage!=='undefined')localStorage.setItem(LRN_PKEY,JSON.stringify({id:S.lrn.id,M:lrnSummary('quit'),plans:S.lrn.plans,dna:S.lrn.dna}));}catch(e){}
}

// ---------------------------------------------------------------- what the Red Kingdom knows, in words (for Claude, the dossier screen and the advisor)
function lrnDossier(short){
  const L=lrnLoad(),P=L.P,O=S&&S.lrn;if(!L.games&&!(O&&O.atk&&O.atk.length))return null;
  const st=lrnStyleTop(P),cp=O&&O.cp,mm=lrnMM;
  const d={partidas_analisadas:L.games,geracao_do_rubro:L.gen,retrospecto_do_jogador:{vitorias:L.w,derrotas:L.l,desistencias:L.q},
    estilo:st.map(([k,v])=>`${LRN_STYLE[k]} (${Math.round(v*100)}%)`)};
  const pv={};
  if(P.atkRel!=null&&S)pv.primeiro_ataque=`por volta de ${mm(S.diff.peace+P.atkRel)} (±${mm(P.atkSd||90)})`;
  if(P.atkN)pv.tamanho_do_ataque=Math.round(P.atkN);
  if(P.v!=null)pv.lado_de_chegada=lrnSide(P.v)+' (visto do castelo dele para o seu)';
  const fe={};for(const e of[1,2,3,4,5]){const t=P.mixE&&P.mixE[e]&&lrnTop(P.mixE[e],3);if(t&&t.length)fe['era'+e]=t.map(([k,v])=>`${LRN_NAME[k]} ${Math.round(v*100)}%`).join(', ');}
  if(Object.keys(fe).length)pv.tropas_favoritas=fe;
  for(const e of[2,3,4])if(P['era'+e]!=null)pv['chega_na_era_'+['','I','II','III','IV'][e]]=mm(P['era'+e]);
  if(cp&&cp.weakT)pv.momento_fraco=`por volta de ${mm(cp.weakT)} (exército pequeno perto dos aldeões)`;
  if(P.pawns)pv.aldeoes_no_auge=Math.round(P.pawns);
  if(P.towers!=null)pv.torres=Math.round(P.towers*10)/10;
  d.previsoes=pv;
  const fr=[];
  if(P.vulnR!=null&&P.vulnR>=.8)fr.push(`perde uns ${Math.round(P.vulnR*10)/10} aldeões a cada saque`);
  if(P.react!=null)fr.push(`responde aos saques em uns ${Math.round(P.react)} segundos`);
  if(P.noAtk>.4)fr.push('muitas vezes não ataca: fica esperando');
  if((P.towers||0)<1.5)fr.push('quase não faz torres');
  if(fr.length)d.fraquezas=fr;
  const pl={};for(const k in L.plans){const b=L.plans[k];if(b.s+b.f>=.9)pl[WAR_PLANS[k].name]=`${Math.round((b.s+.5)/(b.s+b.f+1)*100)}% de sucesso`;}
  if(Object.keys(pl).length)d.taticas_contra_ele=pl;
  if(L.lessons.length)d.licoes=L.lessons.slice(0,short?3:6).map(x=>x.txt);
  if(L.notes)d.suas_anotacoes=L.notes;
  if(L.next)d.plano_que_voce_deixou=L.next;
  if(O&&O.atk&&O.atk.length)d.nesta_partida={ataques_dele:O.atk.length,primeiro:mm(O.atk[0].t),lado:lrnSide(O.atk[O.atk.length-1].v),tropas:lrnTop(lrnShare(Object.assign({},...O.atk.map(a=>a.mix))),3).map(([k])=>LRN_NAME[k]).join(', ')};
  return d;
}
function lrnClaudeRules(){
  return `\nMEMÓRIA: você já jogou contra esta mesma pessoa. O relatório traz "dossie_do_jogador" com o que o Reino Vermelho aprendeu dela em todas as partidas (estilo, horário e lado dos ataques, tropas favoritas por era, fraquezas, táticas que funcionaram) e as suas próprias anotações das partidas passadas. Use para se antecipar: tenha as tropas que vencem as dela prontas antes do ataque previsto, defenda o lado de onde ela vem, ataque no momento fraco dela e repita o que já funcionou. Se ela mudar de jeito nesta partida, perceba e adapte-se.`;
}
// after a match Claude commanded: one more call, to write what it learned (kept for the next matches)
function lrnClaudeLessonPrompt(info){
  const M=info.M,res={win:'o jogador venceu (o seu castelo caiu)',lose:'você venceu (o castelo do jogador caiu)',quit:'o jogador desistiu'}[M.res]||M.res;
  const sum={resultado:res,duracao:lrnMM(M.dur),ataques_dele:M.nAtk,primeiro_ataque_dele:M.atk!=null?lrnMM(M.atk):'nenhum',lado:M.v!=null?lrnSide(M.v):'-',tropas_dele:lrnTop(M.mix,3).map(([k,v])=>`${LRN_NAME[k]} ${Math.round(v*100)}%`).join(', '),
    aldeoes_seus_mortos_por_ele:M.raidK,aldeoes_dele_mortos_nos_seus_saques:M.lost.pawn,torres_dele:M.mx.towers,era_final_dele:M.era1,
    suas_ordens:(S.ai&&S.ai.clLog||[]).slice(-8).map(x=>`${lrnMM(x.t)} ${x.strategy||''} ${x.order||''} ${x.thought||''}`.slice(0,160))};
  return `Você comandou o Reino Vermelho (Mestre Rubro) em Reino Pequeno, um jogo de estratégia medieval, contra a mesma pessoa de sempre. A partida acabou: ${res}. Leia o resumo desta partida e o dossiê de todas as anteriores e escreva o que aprendeu para vencer essa pessoa na próxima.
Responda só com JSON: {"licoes":["até 3 lições curtas e práticas, até 140 caracteres cada"],"perfil":"como essa pessoa joga, até 240 caracteres","plano":"o seu plano para a próxima partida contra ela, até 200 caracteres","provocacao":"uma frase curta e divertida do Mestre Rubro para ela, sem palavrão"}
PARTIDA ${JSON.stringify(sum)}
DOSSIE ${JSON.stringify(lrnDossier()||{})}`;
}
function lrnClaudeApply(o){
  if(!o||typeof o!=='object')return null;
  const L=lrnLoad(),cut=(s,n)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
  const ls=(Array.isArray(o.licoes)?o.licoes:[]).map(x=>cut(x,160)).filter(Boolean).slice(0,3);
  for(const t of ls.slice().reverse())L.lessons.unshift({t:Date.now(),txt:t,by:'claude'});
  if(L.lessons.length>14)L.lessons.length=14;
  if(o.perfil)L.notes=cut(o.perfil,280);if(o.plano)L.next=cut(o.plano,240);
  lrnSave();
  return {lessons:ls,notes:L.notes,next:L.next,taunt:cut(o.provocacao,160)};
}

// ---------------------------------------------------------------- Defesa do Rei: the waves learn where you defend and what you field
function lrnSurvSample(O){
  const c=castleOf(1);if(!c)return;
  O.sec=O.sec||new Array(8).fill(0);O.smix=O.smix||{};
  for(const e of S.ents){if(e.dead||e.team!==1)continue;const D=DEF[e.kind];
    if(D.building&&D.dmg&&e.built)O.sec[lrnSec(c,e.x,e.y)]+=.1;
    else if(D.unit&&D.mil&&!D.king){const k=LRN_KINDS.includes(e.kind)?e.kind:baseKind(e.kind);if(LRN_KINDS.includes(k))O.smix[k]=(O.smix[k]||0)+.02;}}
}
// how weak the defence is in each of the eight directions around the castle (bigger = weaker), for the wave's starting spot
const lrnSec=(c,x,y)=>((Math.round(Math.atan2(y-c.y,x-c.x)/(Math.PI/4))%8)+8)%8;
function lrnWaveSectors(){
  if(!lrnOn()||S.lrn.kind!=='sv')return null;
  const c=castleOf(1);if(!c)return null;
  const L=lrnLoad(),def=new Array(8).fill(0);
  for(const b of BLDS)if(b.team===1&&!b.dead&&b.built&&DEF[b.kind].dmg){const s=lrnSec(c,b.x,b.y);def[s]+=1.5;def[(s+1)%8]+=.5;def[(s+7)%8]+=.5;}
  for(const e of S.ents)if(!e.dead&&e.team===1&&DEF[e.kind].mil&&DEF[e.kind].unit&&hyp(e.x-c.x,e.y-c.y)<16*TS)def[lrnSec(c,e.x,e.y)]+=.25;
  const tot=L.surv.side.reduce((x,y)=>x+y,0)||1,know=1-Math.exp(-L.surv.n/3);
  return def.map((d,s)=>clamp(10-d*1.2-L.surv.side[s]/tot*8*know*3,-6,10)*(.5+know*.5));
}
// the Red waves bring what beats your army
function lrnWaveMix(units){
  if(!lrnOn()||S.lrn.kind!=='sv')return units;
  const L=lrnLoad(),O=S.lrn,m=Object.assign({},L.surv.mix||{});for(const k in O.smix||{})m[k]=(m[k]||0)*.5+(O.smix[k]||0);
  const sh=lrnShare(m);if(!sh)return units;
  const want={warrior:(sh.archer||0)+(sh.royal||0)+(sh.monk||0)*.5,lancer:(sh.warrior||0)+(sh.paladin||0)*.5,archer:(sh.lancer||0)+(sh.scout||0)};
  const base=['warrior','archer','lancer'].filter(k=>units[k]);if(base.length<2)return units;
  const tot=base.reduce((s,k)=>s+units[k],0),ws=base.reduce((s,k)=>s+.6+want[k],0);
  for(const k of base)units[k]=Math.max(1,Math.round(tot*(.6+want[k])/ws));
  return units;
}
function lrnSurvEnd(){
  const L=lrnLoad(),O=S.lrn,a=Math.max(.3,1/(L.surv.n+1));
  if(O.sec){const t=O.sec.reduce((x,y)=>x+y,0);if(t)for(let i=0;i<8;i++)L.surv.side[i]=L.surv.side[i]*(1-a)+O.sec[i]/t*a;}
  const sh=lrnShare(O.smix||{});if(sh){const m=L.surv.mix;for(const k of new Set([...Object.keys(m),...Object.keys(sh)]))m[k]=(m[k]||0)*(1-a)+(sh[k]||0)*a;}
  L.surv.n++;L.surv.best=Math.max(L.surv.best||0,S.wavesBeaten||0);lrnSave();
  return {surv:true,n:L.surv.n};
}
