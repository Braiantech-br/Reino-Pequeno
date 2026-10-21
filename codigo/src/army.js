// ================================================================ army: the ranks command, the general leads the squads
// From Cabo up, a soldier leads a squad; the higher the rank, the more soldiers (and sub-leaders) he commands. The highest
// rank is the general: you give him an order (defend, attack, retreat, patrol) and he splits the army into fronts, puts a
// leader on each and decides who goes where. Equal ranks hold a vote. When a leader falls the next in line takes over
// and the squad wavers for a moment. Leaders shout commands that only their rank knows.
const CAP=[0,3,4,6,8,12,16,99],SUBS=[0,0,0,0,1,2,3,99],REGEN=[1,1,1,1,1.5,2,2.5,3];
const SQ_COL=['#ffd84a','#7fd4ff','#9fe07a','#ff9e86','#d7a6ff','#ffb347','#7be0c8','#f08ad0','#c9e265','#e8e8e8'];
const CMD={
  escudos:{name:'Parede de escudos',rank:4,dur:10,cd:40,glyph:'▦',desc:'Por 10 segundos, flechas e torres causam 40% menos dano no grupo.'},
  avante: {name:'Avante!',rank:5,dur:8,cd:45,glyph:'»',desc:'Por 8 segundos, o grupo corre 35% mais rápido.'},
  linha:  {name:'Segurar a linha',rank:6,dur:12,cd:60,glyph:'⛨',desc:'Por 12 segundos, o grupo recebe 15% menos dano e não perde o moral.'},
  grito:  {name:'Grito de guerra',rank:7,dur:10,cd:70,glyph:'✷',desc:'Cura 20% da vida de todo o exército em volta e dá +20% de dano por 10 segundos.'},
};
const ARMY_ORD={free:'Livre (você comanda)',defend:'Defender a base',attack:'Atacar o inimigo',retreat:'Recuar para o castelo',patrol:'Patrulhar as vilas aliadas'};
function armyOf(team){S.armies=S.armies||{};return S.armies[team]||(S.armies[team]={sq:[],n:0,gen:0,ord:{type:'free'},orgT:0,taskT:0,helpT:0,asked:{}});}
function sqOf(u){if(!u||!u.sq||!S.armies)return null;const A=S.armies[u.team];if(!A)return null;for(const q of A.sq)if(q.id===u.sq)return q;return null;}
function sqLeads(u){const q=sqOf(u);return !!q&&q.lead===u.id;}
const sqBuf=(q,k)=>!!q&&!!q.buf&&(q.buf[k]||0)>S.t;
function sqAtk(u){const q=sqOf(u);if(!q)return 1;let m=1;if(q.morT>S.t&&!sqBuf(q,'linha'))m*=.85;if(sqBuf(q,'grito'))m*=1.2;return m;}
function sqSpeed(u){const q=sqOf(u);if(!q)return 1;let m=1;if(sqBuf(q,'avante'))m*=1.35;if(q.morT>S.t&&!sqBuf(q,'linha'))m*=.9;return m;}
function sqGuard(t,SD){
  const q=sqOf(t);if(!q)return 1;let m=1;
  if(SD&&(SD.ranged||SD.building)&&sqBuf(q,'escudos'))m*=.6;
  if(sqBuf(q,'linha'))m*=.85;
  // a sergeant or better keeps his men close together and covered
  const L=byId.get(q.lead);if(L&&!L.dead&&(L.rank||0)>=3&&(q.form||0)>=3&&hyp(t.x-L.x,t.y-L.y)<150)m*=.92;
  return m;
}
function sqFocus(u){const q=sqOf(u);return q?q.focus||0:0;}
const canLead=u=>(u.rank||0)>=1&&!DEF[u.kind].mech&&!DEF[u.kind].holy;
const canChief=u=>!DEF[u.kind].mech&&!DEF[u.kind].holy;
const seniority=(a,b)=>(b.rank||0)-(a.rank||0)||(b.kills||0)-(a.kills||0)||(a.born||0)-(b.born||0)||a.id-b.id;
function armyUnits(team){
  const out=[];
  for(const u of S.ents){
    if(u.dead||u.team!==team)continue;const D=DEF[u.kind];
    if(!D.unit||!D.mil||D.naval||D.king||D.boss||u.svc||u.wave||u.aboard||u.leaving||u.ally||u.medic||u.aid)continue;
    out.push(u);
  }
  return out;
}
const isRanged=u=>!!DEF[u.kind].ranged||!!DEF[u.kind].holy;
function sqSay(u,txt){if(!u||u.dead)return;FX.speech=(FX.speech||[]).filter(s=>s.id!==u.id);FX.speech.push({id:u.id,txt,t:0,dur:1.8+txt.length*.05});while(FX.speech.length>6)FX.speech.shift();}

// ---------------------------------------------------------------- the vote: soldiers pick the chief among leaders of equal rank
function armyVote(cands,U){
  // the four most experienced stand; everyone votes for the best of the others (nobody votes for himself)
  cands=cands.slice().sort((a,b)=>(b.kills||0)-(a.kills||0)||(a.born||0)-(b.born||0)||a.id-b.id).slice(0,4);
  const votes=new Map(cands.map(c=>[c.id,0]));
  for(const u of U){
    let best=null,bs=-1e9;
    for(const c of cands){if(c===u)continue;const s=(c.kills||0)*2+(S.t-(c.born||0))/90+(baseKind(c.kind)===baseKind(u.kind)?1.5:0)-hyp(c.x-u.x,c.y-u.y)/250;if(s>bs){bs=s;best=c;}}
    if(best)votes.set(best.id,votes.get(best.id)+1);
  }
  const win=cands.slice().sort((a,b)=>votes.get(b.id)-votes.get(a.id)||seniority(a,b))[0];
  return {win,votes:votes.get(win.id),total:U.length,cands:cands.length};
}

// ---------------------------------------------------------------- organise: who leads, who follows, who answers to whom
function armyOrganize(team){
  const A=armyOf(team),U=armyUnits(team),inArmy=new Set(U.map(u=>u.id));
  const leaders=U.filter(canLead).sort(seniority);
  let gen=null,vote=null;
  // the chief of the army: the highest rank; among equals (even plain recruits) the soldiers vote
  const chiefs=U.filter(canChief).sort(seniority);
  if(chiefs.length&&U.length>=4){
    const top=chiefs.filter(l=>(l.rank||0)===(chiefs[0].rank||0));
    const prev=byId.get(A.gen);
    if(prev&&inArmy.has(prev.id)&&top.includes(prev))gen=prev;          // the chief keeps his post among equals
    else if(top.length>1){vote=armyVote(top,U);gen=vote.win;}
    else gen=top[0];
  }
  if((gen?gen.id:0)!==A.gen){
    const old=A.gen;A.gen=gen?gen.id:0;
    if(gen)HOOK.army('general',team,gen,{old,vote});
    if(gen&&vote)armyVoteShow(gen,U);
  }
  // leaders are named only as needed: sergeants and up when there are enough men for real squads (3 or more each),
  // lower ranks only when the others are full; a leader keeps his squad while it still makes sense
  const cand=gen?[gen,...leaders.filter(l=>l!==gen)]:leaders,n=U.length,L=[];let cap=0;
  const was=new Set(A.sq.map(q=>q.lead));
  for(const l of cand){
    const k=L.length,c=Math.max(CAP[l.rank||0],gen&&l===gen?5:0);
    const room=n-(k+1)>=(was.has(l.id)?2:3)*(k+1);
    if(!k||n-k>cap&&(l.rank||0)>=1||(l.rank||0)>=3&&room){L.push(l);cap+=c;}
  }
  const prev=new Map(A.sq.map(q=>[q.lead,q])),used=new Set(A.sq.map(q=>q.col));
  const sq=[];
  for(const l of L){
    let q=prev.get(l.id);
    if(!q){let col=0;while(used.has(col)&&col<SQ_COL.length-1)col++;used.add(col);q={id:++A.n,team,lead:l.id,mem:[],col,buf:{},cd:{},morT:0,par:0};}
    q.mem=[];q.cap=Math.max(CAP[l.rank||0],gen&&l===gen?5:0);sq.push(q);
  }
  const leadSq=new Map(sq.map(q=>[q.lead,q])),byId2=new Map(sq.map(q=>[q.id,q]));
  const rest=[];
  for(const u of U){
    if(leadSq.has(u.id)){u.sq=leadSq.get(u.id).id;continue;}
    const q=byId2.get(u.sq);
    if(q&&q.mem.length<q.cap)q.mem.push(u.id);else rest.push(u);
  }
  // new soldiers go to the nearest leader with room; archers are spread so every squad has some
  rest.sort((a,b)=>isRanged(a)-isRanged(b));
  for(const u of rest){
    let best=null,bd=1e9;
    for(const q of sq){
      if(q.mem.length>=q.cap)continue;const l=byId.get(q.lead);
      const rn=q.mem.filter(id=>{const m=byId.get(id);return m&&isRanged(m);}).length;
      const d=hyp(l.x-u.x,l.y-u.y)+q.mem.length*20+(isRanged(u)?rn*60:0);
      if(d<bd){bd=d;best=q;}
    }
    if(best){best.mem.push(u.id);u.sq=best.id;}else u.sq=0;
  }
  // the chain of command: each squad answers to the nearest higher-ranked leader with a free place, the general first
  const slots=new Map(sq.map(q=>[q.id,Math.max(SUBS[byId.get(q.lead).rank||0],gen&&q.lead===gen.id?1:0)]));
  for(const q of sq)q.par=0;
  for(const q of sq){
    if(gen&&q.lead===gen.id)continue;
    const l=byId.get(q.lead);let best=null,bd=1e9;
    for(const p of sq){
      if(p===q)continue;const pl=byId.get(p.lead);
      if(((pl.rank||0)<=(l.rank||0)&&!(gen&&p.lead===gen.id))||(slots.get(p.id)||0)<=0)continue;
      const d=(gen&&p.lead===gen.id?-1e6:0)+hyp(pl.x-l.x,pl.y-l.y);
      if(d<bd){bd=d;best=p;}
    }
    if(best){q.par=best.id;slots.set(best.id,slots.get(best.id)-1);}
  }
  for(const u of S.ents)if(u.sq&&u.team===team&&!inArmy.has(u.id))u.sq=0;
  A.sq=sq;
}
// the vote, out loud: a few soldiers say whom they chose
function armyVoteShow(gen,U){
  const name=rankedName(gen);let k=0;
  for(const u of U){if(u===gen||k>=3)continue;if(hyp(u.x-gen.x,u.y-gen.y)>500)continue;sqSay(u,['Eu voto no '+folkName(gen)+'!','Meu voto é do '+folkName(gen)+'.','Vai, '+folkName(gen)+'!'][k%3]);k++;}
  sqSay(gen,'Obrigado, companheiros! Sigam-me!');
}
// a leader fell: the next in line takes over, and the squad wavers for a moment
function armyOnDeath(t,src){
  const A=S.armies&&S.armies[t.team];if(!A)return;
  const q=A.sq.find(x=>x.lead===t.id);if(!q)return;
  const mem=q.mem.map(id=>byId.get(id)).filter(u=>alive(u)&&u.id!==t.id).sort(seniority),nx=mem[0];
  if(nx){q.lead=nx.id;q.mem=q.mem.filter(id=>id!==nx.id);sqSay(nx,'Eu assumo! Ninguém recua!');}
  if(!sqBuf(q,'linha'))q.morT=S.t+8;
  const wasGen=A.gen===t.id;
  if(wasGen)A.gen=0;
  HOOK.army('fallen',t.team,t,{next:nx||null,general:wasGen});
  A.orgT=0;
}

// ---------------------------------------------------------------- commands only a rank knows
function sqCommand(q,k,manual){
  const L=byId.get(q.lead),C=CMD[k];if(!alive(L))return 'nolead';
  if((L.rank||0)<C.rank)return 'rank';
  if((q.cd[k]||0)>S.t)return 'cd';
  q.cd[k]=S.t+C.cd;q.buf[k]=S.t+C.dur;
  if(k==='grito'){
    const A=armyOf(q.team),hit=new Set();
    forNear(L.x,L.y,240,e=>{if(e.dead||e.team!==q.team||!DEF[e.kind].mil||!healable(e)||hyp(e.x-L.x,e.y-L.y)>240)return;e.hp=Math.min(e.maxhp,e.hp+e.maxhp*.2);e.healT=.4;if(e.sq)hit.add(e.sq);});
    for(const s of A.sq)if(hit.has(s.id))s.buf.grito=S.t+C.dur;
  }
  sqSay(L,{escudos:'Escudos! Parede de escudos!',avante:'Avante! Corram!',linha:'Segurem a linha! Ninguém recua!',grito:'Pelo reino! AVANTEEE!'}[k]);
  HOOK.army('cmd',q.team,L,{k,manual});
  return 'ok';
}
// leaders choose their command on their own: arrows coming in, a charge, a hard fight
function sqAuto(q,L,foes,mine){
  const r=L.rank||0;if(r<4||!foes.length)return;
  const ranged=foes.filter(e=>DEF[e.kind].ranged).length,close=foes.filter(e=>hyp(e.x-L.x,e.y-L.y)<120).length;
  if(r>=7&&foes.length>=6&&sqCommand(q,'grito')==='ok')return;
  if(r>=6&&close>=4&&mine<=foes.length&&sqCommand(q,'linha')==='ok')return;
  if(r>=5&&close===0&&foes.length>=3&&sqCommand(q,'avante')==='ok')return;
  if(r>=4&&ranged>=3&&sqCommand(q,'escudos')==='ok')return;
}

// ---------------------------------------------------------------- the general's orders
function armyOrder(team,type,o){
  const A=armyOf(team);o=o||{};
  A.ord=Object.assign({type,t:S.t,phase:type==='attack'?'gather':''},o);A.taskT=0;
  for(const q of A.sq){q.task=null;q.pat=0;}
  if(type==='free'){for(const u of armyUnits(team))if(u.order&&u.order.sq){u.order=null;u.path=null;}}
  HOOK.army('order',team,byId.get(A.gen),{type});
  return 'ok';
}
// where to hold the line: the approaches found by the scouts, or toward the enemy and the middle of the map
function armyFronts(team){
  const c=castleOf(team);if(!c)return [];
  const I=S.intel&&S.intel[team];
  if(I&&I.fronts&&I.fronts.length)return I.fronts.map(f=>({x:f.x,y:f.y,ambush:f.ambush,hill:f.hill}));
  const foe=castleOf(team===1?2:1),pts=[];
  const dirTo=(x,y)=>{const dx=x-c.x,dy=y-c.y,l=hyp(dx,dy)||1;return {x:dx/l,y:dy/l};};
  const d1=foe?dirTo(foe.x,foe.y):dirTo(MW*TS/2,MH*TS/2),d2=dirTo(MW*TS/2,MH*TS/2);
  for(const d of[d1,{x:d1.x*.6-d1.y*.8,y:d1.y*.6+d1.x*.8},{x:d1.x*.6+d1.y*.8,y:d1.y*.6-d1.x*.8},d2]){const p=walkNear(c.x+d.x*10*TS,c.y+d.y*8*TS);if(!pts.some(q=>hyp(q.x-p.x,q.y-p.y)<5*TS))pts.push(p);}
  return pts;
}
function sqCentre(q){let x=0,y=0,n=0;for(const id of [q.lead,...q.mem]){const u=byId.get(id);if(alive(u)){x+=u.x;y+=u.y;n++;}}return n?{x:x/n,y:y/n,n}:null;}
// move a squad: the leader goes to the point, the others take their places around him (archers behind)
function sqGo(q,p,amove,face){
  const L=byId.get(q.lead);if(!alive(L))return;
  const fighting=u=>u.order&&(u.order.type==='attack'||u.order.type==='convert'||u.order.type==='heal'||u.order.type==='cast'||u.order.type==='flee'||u.order.type==='rest');
  const manual=u=>u.team===1&&u.cmdT&&S.t-u.cmdT<25;
  if(!fighting(L)&&!manual(L)&&hyp(L.x-p.x,L.y-p.y)>40&&!(L.order&&L.order.sq&&hyp(L.order.x-p.x,L.order.y-p.y)<30)){L.order={type:'move',x:p.x,y:p.y,amove:!!amove,sq:true};L.path=null;}
  const fx=face?face.x:0,fy=face?face.y:1;
  q.mem.forEach((id,i)=>{
    const u=byId.get(id);if(!alive(u)||fighting(u)||manual(u)||u.retreat)return;
    const back=isRanged(u)?-46:20,side=((i%5)-2)*24,row=Math.floor(i/5)*22;
    const tx=p.x+fx*(back-row)-fy*side,ty=p.y+fy*(back-row)+fx*side*.7;
    if(hyp(u.x-tx,u.y-ty)<40)return;
    if(u.order&&u.order.sq&&hyp(u.order.x-tx,u.order.y-ty)<30)return;
    u.order={type:'move',x:tx,y:ty,amove:!!amove,sq:true};u.path=null;
  });
}
function armyTask(team){
  const A=armyOf(team),o=A.ord,c=castleOf(team);if(!c||o.type==='free'||!A.sq.length)return;
  const foeT=team===1?2:1,foe=castleOf(foeT);
  const live=A.sq.filter(q=>alive(byId.get(q.lead)));
  const ua=underAttack(team);
  if(o.type==='retreat'){
    const p=walkNear(c.x,c.y+50);for(const q of live)sqGo(q,p,false,null);
    if(S.t-o.t>25)armyOrder(team,'defend');
    return;
  }
  if(o.type==='defend'||(o.type==='patrol'&&ua)){
    // under attack: everyone to the threat
    if(ua){const d={x:ua.p.x-c.x,y:ua.p.y-c.y},l=hyp(d.x,d.y)||1;for(const q of live)sqGo(q,ua.p,true,{x:d.x/l,y:d.y/l});return;}
    const fr=armyFronts(team);if(!fr.length)return;
    live.forEach((q,i)=>{
      const ranged=q.mem.filter(id=>{const u=byId.get(id);return u&&isRanged(u);}).length>q.mem.length/2;
      let f=fr[i%fr.length];if(ranged){const a=fr.find(f2=>f2.ambush||f2.hill);if(a)f=a.ambush||a.hill||f;}
      const d={x:f.x-c.x,y:f.y-c.y},l=hyp(d.x,d.y)||1;sqGo(q,f,true,{x:d.x/l,y:d.y/l});
    });
    return;
  }
  if(o.type==='patrol'){
    const towns=(S.towns||[]).filter(T=>T.owner===team||activeCtr(T,'protect',team)||activeCtr(T,'loyalty',team));
    const stops=towns.map(T=>({x:T.x,y:T.y+30})).concat([walkNear(c.x,c.y+60)]);
    for(const q of live){
      q.pat=q.pat||0;const p=stops[q.pat%stops.length],m=sqCentre(q);
      if(m&&hyp(m.x-p.x,m.y-p.y)<120)q.pat++;
      sqGo(q,stops[q.pat%stops.length],true,null);
    }
    return;
  }
  if(o.type==='attack'){
    let tgt=byId.get(o.target);
    if(!alive(tgt)||tgt.team!==foeT){
      tgt=foe;if(!alive(tgt)){let bd=1e9;for(const b of BLDS){if(b.dead||b.team!==foeT)continue;const d=hyp(b.x-c.x,b.y-c.y);if(d<bd){bd=d;tgt=b;}}}
      if(!alive(tgt)){armyOrder(team,'defend');return;}
      o.target=tgt.id;
    }
    const T=centerOf(tgt),d={x:T.x-c.x,y:T.y-c.y},l=hyp(d.x,d.y)||1,dir={x:d.x/l,y:d.y/l};
    const rally=walkNear(c.x+dir.x*9*TS,c.y+dir.y*7*TS);
    const order=live.slice().sort((a,b)=>(b.mem.length-a.mem.length));
    const reserve=order.length>=4?order[order.length-1]:null,flank=order.length>=3?order[1]:null;
    if(o.phase==='gather'){
      for(const q of live)sqGo(q,rally,true,dir);
      let n=0,near=0;for(const q of live){const m=sqCentre(q);if(!m)continue;n+=m.n;if(hyp(m.x-rally.x,m.y-rally.y)<220)near+=m.n;}
      if(near>=n*.7||S.t-o.t>30){o.phase='march';o.start=n;HOOK.army('march',team,byId.get(A.gen),{});}
      return;
    }
    // the weak side found by the scout, if there is one
    const via=o.via&&hyp(o.via.x-T.x,o.via.y-T.y)<20*TS?o.via:null;
    for(const q of live){
      if(q===reserve){sqGo(q,rally,true,dir);continue;}
      let p=T;
      if(q===flank||via){
        const wp=via||walkNear(T.x-dir.x*6*TS-dir.y*9*TS,T.y-dir.y*6*TS+dir.x*9*TS),m=sqCentre(q);
        if(!q.flankDone&&m&&hyp(m.x-wp.x,m.y-wp.y)>140)p=wp;else q.flankDone=true;
      }
      sqGo(q,p,true,dir);
    }
    // losing badly: the general calls the retreat to save the army
    let alive2=0;for(const q of live){const m=sqCentre(q);if(m)alive2+=m.n;}
    if(o.start&&alive2<o.start*.35){HOOK.army('fallback',team,byId.get(A.gen),{});armyOrder(team,'retreat');}
  }
}

// ---------------------------------------------------------------- every half second
function armyTick(dt){
  for(const team of[1,2]){
    if(!S.teams[team]||!castleOf(team))continue;
    const A=armyOf(team);
    A.orgT-=dt;if(A.orgT<=0){A.orgT=3;armyOrganize(team);}
    A.tickT=(A.tickT||0)-dt;if(A.tickT>0)continue;A.tickT=.5;
    const auto=team===2||!S.rules||S.rules.armyAuto!==false;
    for(const q of A.sq){
      const L=byId.get(q.lead);if(!alive(L))continue;
      let form=0;for(const id of q.mem){const u=byId.get(id);if(alive(u)&&hyp(u.x-L.x,u.y-L.y)<150)form++;}q.form=form;
      // the leader picks the target for everyone
      const foes=[];forNear(L.x,L.y,300,e=>{if(e.dead||!e.team||e.team===team||!DEF[e.kind].mil||!DEF[e.kind].unit)return;if(hyp(e.x-L.x,e.y-L.y)<=300)foes.push(e);});
      const ft=L.order&&L.order.type==='attack'&&byId.get(L.order.id);
      if(ft&&!ft.dead&&DEF[ft.kind].unit)q.focus=ft.id;
      else if(foes.length){let best=null,bs=1e9;for(const e of foes){const s=hyp(e.x-L.x,e.y-L.y)-(1-e.hp/e.maxhp)*90-(DEF[e.kind].holy||DEF[e.kind].ranged?50:0);if(s<bs){bs=s;best=e;}}q.focus=best?best.id:0;}
      else q.focus=0;
      if(auto&&foes.length>=3)sqAuto(q,L,foes,form+1);
      // badly hurt soldiers fall back to the castle and come back healed (only when the general is in charge)
      if(A.ord.type!=='free'||team===2){
        const c=castleOf(team);
        for(const id of q.mem){
          const u=byId.get(id);if(!alive(u))continue;
          if(u.retreat){if(u.hp>u.maxhp*.7||!c){u.retreat=false;if(u.order&&u.order.retreat)u.order=null;}continue;}
          if(u.hp<u.maxhp*.25&&!u.hero&&!DEF[u.kind].thero&&(u.rank||0)<5&&!DEF[u.kind].mech&&foes.length&&c){u.retreat=true;u.order={type:'move',x:c.x,y:c.y+50,retreat:true};u.path=null;}
        }
      }
    }
    A.taskT-=.5;if(A.taskT<=0){A.taskT=2;armyTask(team);}
    if(team===1)armyAdvice(A);
  }
}
// the general talks to the king: take charge of the defence, call for help, scout the land
function armyAdvice(A){
  const g=byId.get(A.gen);if(!alive(g)||S.over)return;
  if(!A.asked.first&&A.ord.type==='free'){A.asked.first=S.t;ask({kind:'genorder',who:`${rankedName(g)} pede a palavra`,av:'av01',text:`Agora sou o general do exército: ${armyUnits(1).length} soldados em ${A.sq.length} ${A.sq.length===1?'grupo':'grupos'}. Posso organizar a defesa da vila? Cada grupo guarda uma entrada e, se atacarem, todos vão juntos. Você continua mandando em quem quiser.`,loc:{x:g.x,y:g.y,id:g.id}});return;}
  const ua=underAttack(1);
  if(ua&&S.towns&&S.towns.length&&S.t>A.helpT){
    let mine=0,theirs=0;
    forNear(ua.p.x,ua.p.y,520,e=>{if(e.dead||!DEF[e.kind].mil||!DEF[e.kind].unit)return;if(e.team===1)mine+=e.hp;else if(e.team===ua.foe)theirs+=e.hp;});
    if(theirs>mine*1.15){
      const T=S.towns.filter(t=>!townFoe(t.i,1)&&(!loyalTo(t)||loyalTo(t)===1)&&S.t>=(t.helpCd[1]||0)).sort((a,b)=>(friendOf(b,1)+favOf(b,1))-(friendOf(a,1)+favOf(a,1)))[0];
      if(T){
        A.helpT=S.t+200;const sc=messengerFor(1);
        ask({kind:'genhelp',town:T.i,foe:ua.foe,p:ua.p,who:`${rankedName(g)} pede reforço`,av:'av01',text:`Eles são mais fortes que nós aqui. Mando ${sc?'o batedor '+folkName(sc):'um mensageiro'} correndo pedir socorro a ${T.name}? (Amizade ${FRIEND[friendOf(T,1)]}${favOf(T,1)>0?', eles nos devem um favor':''}.) A vila decide se vem.`,loc:{x:ua.p.x,y:ua.p.y}});
      }
    }
  }
}
// the Red general sends a flank around the target when he has enough squads
function armyFlank(team,units,target){
  const A=armyOf(team),order=A.sq.filter(q=>alive(byId.get(q.lead))).sort((a,b)=>b.mem.length-a.mem.length);
  if(order.length<3)return null;
  const fq=order[1],c=castleOf(team);if(!c)return null;
  const d={x:target.x-c.x,y:target.y-c.y},l=hyp(d.x,d.y)||1,dx=d.x/l,dy=d.y/l;
  const wp=walkNear(target.x-dx*6*TS-dy*9*TS,target.y-dy*6*TS+dx*9*TS);
  return {ids:new Set([fq.lead,...fq.mem]),wp,q:fq};
}
