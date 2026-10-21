// ================================================================ scouts and the war council
// A scout rides around the kingdom; back home, the general (or the engineer) studies the land: where the enemy will come
// from, the narrow passages, the hills, the crossings and the forest edges along the roads. He proposes works, each with
// its reason, and you approve them one by one. A scout can also spy on the enemy base to find its weak side.
// Optional fog of war: you only see what your people see.
const PLAN_NAME={tower:'Torre no morro',raise:'Elevar o terreno para uma torre',wall:'Muralha com portão no estreito',pit:'Fosso no campo aberto',ambush:'Ponto de emboscada',attack:'Ataque pelo lado fraco'};
function intelOf(team){S.intel=S.intel||{};return S.intel[team]||(S.intel[team]={t:0,fronts:[],plan:[],n:0,sweep:0,asked:0,spy:null});}
const DIR8=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
// how many steps from every tile to the castle, walking on open ground (buildings ignored, cliffs and water respected)
function distField(c){
  const D=new Int32Array(N).fill(-1),q=new Int32Array(N);let h=0,t=0;
  const r=rectOf(c);
  for(let y=tileOf(r[1]);y<tileOf(r[1]+r[3]);y++)for(let x=tileOf(r[0]);x<tileOf(r[0]+r[2]);x++){if(!inB(x,y))continue;const i=idx(x,y);D[i]=0;q[t++]=i;}
  while(h<t){
    const i=q[h++],x=i%MW,y=(i/MW)|0;
    for(const[dx,dy]of DIR8){
      const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const j=idx(nx,ny);
      if(D[j]>=0||!groundOK(j))continue;
      if(dx&&dy&&(!groundOK(idx(x+dx,y))||!groundOK(idx(x,y+dy))))continue;
      if(!canStep(j,i))continue;
      D[j]=D[i]+1;q[t++]=j;
    }
  }
  return D;
}
function descend(D,i){const path=[i];let cur=i,g=0;while(D[cur]>0&&g++<600){const x=cur%MW,y=(cur/MW)|0;let best=cur;for(const[dx,dy]of DIR8){const nx=x+dx,ny=y+dy;if(!inB(nx,ny))continue;const j=idx(nx,ny);if(D[j]>=0&&D[j]<D[best])best=j;}if(best===cur)break;cur=best;path.push(cur);}return path;}
// where an attack comes from: the enemy castle, and the edges of the map where bandits and waves appear
function threatSources(team,D){
  const out=[],foe=castleOf(team===1?2:1);
  const near=(x,y,r)=>{let best=-1,bd=1e9;for(let yy=y-r;yy<=y+r;yy++)for(let xx=x-r;xx<=x+r;xx++){if(!inB(xx,yy))continue;const j=idx(xx,yy);if(D[j]<0)continue;const d=hyp(xx-x,yy-y);if(d<bd){bd=d;best=j;}}return best;};
  if(foe){const j=near(tileOf(foe.x),tileOf(foe.y)+2,6);if(j>=0)out.push({i:j,w:3,name:'o Reino Vermelho'});}
  const edges=[];
  for(const[sx,sy,nm]of[[MW/2,3,'o norte'],[MW/2,MH-4,'o sul'],[3,MH/2,'o oeste'],[MW-4,MH/2,'o leste']]){const j=near(Math.floor(sx),Math.floor(sy),12);if(j>=0)edges.push({i:j,w:1,name:nm,d:D[j]});}
  edges.sort((a,b)=>a.d-b.d);out.push(...edges.slice(0,out.length?1:2));
  return out;
}
// the width of the passage across the road at tile i (open tiles in a line across the way the road goes)
function passWidth(i,dir){
  const x=i%MW,y=(i/MW)|0,px=-dir[1],py=dir[0],tiles=[[x,y]];
  for(const s of[1,-1])for(let k=1;k<=7;k++){const tx=x+px*k*s,ty=y+py*k*s;if(!inB(tx,ty)||!groundOK(idx(tx,ty))||elev[idx(tx,ty)]!==elev[i])break;tiles.push([tx,ty]);}
  return tiles;
}
function dirName(team,x,y){const c=castleOf(team);if(!c)return '';const dx=x-c.x,dy=y-c.y;return Math.abs(dx)>Math.abs(dy)*1.3?(dx>0?'do leste':'do oeste'):Math.abs(dy)>Math.abs(dx)*1.3?(dy>0?'do sul':'do norte'):(dy>0?(dx>0?'do sudeste':'do sudoeste'):(dx>0?'do nordeste':'do noroeste'));}
// study the land around the castle and write the plan
function analyzeDefense(team){
  const c=castleOf(team);if(!c)return null;
  const I=intelOf(team),D=distField(c),srcs=threatSources(team,D),plan=[],fronts=[];
  const taken=new Set();
  const add=it=>{it.id=++I.n;it.team=team;it.st='new';plan.push(it);return it;};
  for(const src of srcs){
    const path=descend(D,src.i),stretch=path.filter(i=>D[i]>=9&&D[i]<=22);
    if(stretch.length<3)continue;
    const mid=stretch[Math.floor(stretch.length/2)],fx=(mid%MW)*TS+16,fy=((mid/MW)|0)*TS+16;
    const fr={x:fx,y:fy,from:src.name,dir:dirName(team,fx,fy)};fronts.push(fr);
    // 1. the narrowest passage: a wall across it with a gate on the road
    let best=null,bw=99;
    for(let k=1;k<stretch.length-1;k++){
      const i=stretch[k],a=stretch[k-1],b=stretch[k+1],dir=[Math.sign((b%MW)-(a%MW)),Math.sign(((b/MW)|0)-((a/MW)|0))];
      if(!dir[0]&&!dir[1])continue;
      const w=passWidth(i,dir);if(w.length<bw&&w.length>=2){bw=w.length;best={i,w};}
    }
    if(best&&bw<=8&&!taken.has(best.i)){
      const tiles=best.w.filter(([x,y])=>placeTileOK('wall',x,y,team)&&canPlace(team,'wall',x,y));
      if(tiles.length>=Math.max(2,best.w.length-1)){
        const g=tiles.find(([x,y])=>idx(x,y)===best.i)||tiles[Math.floor(tiles.length/2)];
        const blocked=best.w.length===tiles.length;
        const why=`A estrada ${fr.dir} passa por um estreito de ${best.w.length} passos entre ${blockerName(best.w,best.i)}. Uma muralha com portão ali segura quem vier de ${src.name}: suas tropas passam, os inimigos não.`;
        add({kind:'wall',x:g[0]*TS+16,y:g[1]*TS+16,tiles,gate:g,cost:{wood:(tiles.length-1)*DEF.wall.cost.wood+DEF.gate.cost.wood},why:blocked?why:why+' Sobra uma brecha pequena, que as torres vigiam.',front:fronts.length-1});
        taken.add(best.i);
      }
    }else if(stretch.length>=6){
      // open ground: a ditch makes them walk around under the towers
      const i=stretch[Math.floor(stretch.length*.4)],a=stretch[Math.max(0,Math.floor(stretch.length*.4)-1)],b=stretch[Math.floor(stretch.length*.4)+1];
      const dir=[Math.sign((b%MW)-(a%MW)),Math.sign(((b/MW)|0)-((a/MW)|0))];
      if(dir[0]||dir[1]){const w=passWidth(i,dir).filter(([x,y])=>buildable(x,y));if(w.length>=5){const keep=w.filter(([x,y])=>idx(x,y)!==i);add({kind:'pit',x:(i%MW)*TS+16,y:((i/MW)|0)*TS+16,tiles:keep,cost:{},why:`Campo aberto ${fr.dir}: um fosso de ${keep.length} buracos (só trabalho, sem custo) obriga quem vier de ${src.name} a passar pelo meio, bem na frente das torres.`,front:fronts.length-1});}}
    }
    // 2. high ground beside the road: a tower up there shoots much farther
    let hill=null,hs=-1e9;
    const pathSet=new Set(stretch);
    for(const i of stretch){
      const x=i%MW,y=(i/MW)|0;
      for(let dy=-6;dy<=6;dy++)for(let dx=-6;dx<=6;dx++){
        const tx=x+dx,ty=y+dy;if(!inB(tx,ty)||!inB(tx+1,ty+1))continue;
        const e=elev[idx(tx,ty)];if(e<1||e<=elev[i])continue;
        if(!canPlace(team,'tower',tx,ty))continue;
        const s=e*14-hyp(dx,dy)*2;if(s>hs){hs=s;hill={tx,ty,e,from:i};}
      }
    }
    if(hill&&!plan.some(p=>p.kind==='tower'&&hyp(p.tx-hill.tx,p.ty-hill.ty)<4)){
      fr.hill={x:(hill.tx+1)*TS,y:(hill.ty+2)*TS+10};
      add({kind:'tower',tx:hill.tx,ty:hill.ty,x:(hill.tx+1)*TS,y:(hill.ty+1)*TS,cost:Object.assign({},DEF.tower.cost),why:`Morro de altura ${hill.e+1} ao lado da estrada ${fr.dir}. Lá de cima a torre atira ${Math.round((towerReach(hill.e)-1)*100)}% mais longe e ${hill.e*15}% mais forte, e cobre o caminho de quem vem de ${src.name}.`,front:fronts.length-1});
    }else{
      // no hill: raise the ground beside the road and put a tower on it
      let spot=null;
      for(let k=0;k<stretch.length&&!spot;k+=2){const i=stretch[k],x=i%MW,y=(i/MW)|0;for(const[ox,oy]of[[3,0],[-4,0],[0,3],[0,-4],[3,3],[-4,-4]]){const tx=x+ox,ty=y+oy;if(inB(tx-1,ty-1)&&inB(tx+2,ty+2)&&canPlace(team,'tower',tx,ty)){const ts=rectTiles(tx-1,ty-1,4,4);if(terraOk(ts,true)){spot={tx,ty,ts};break;}}}}
      if(spot){const pl=terraPlan(spot.ts,true),cost=pl&&!pl.err?pl.cost:TERRA_COST.up;
        add({kind:'raise',tx:spot.tx,ty:spot.ty,x:(spot.tx+1)*TS,y:(spot.ty+1)*TS,tiles:spot.ts,cost:Object.assign({},cost),towerCost:Object.assign({},DEF.tower.cost),why:`Não há morro perto da estrada ${fr.dir}. O engenheiro ergue o terreno ali e uma torre em cima vigia quem vem de ${src.name}: cada nível dá 20% de alcance e 15% de dano.`,front:fronts.length-1});}
    }
    // 3. the forest edge along the road: archers hidden there catch the enemy from the side
    let amb=null,as=-1;
    for(const i of stretch){
      const x=i%MW,y=(i/MW)|0;
      for(let dy=-5;dy<=5;dy++)for(let dx=-5;dx<=5;dx++){
        const d=hyp(dx,dy);if(d<2||d>5)continue;const tx=x+dx,ty=y+dy;if(!inB(tx,ty)||!walkXY(tx,ty)||pathSet.has(idx(tx,ty)))continue;
        let trees=0;for(let yy=ty-2;yy<=ty+2;yy++)for(let xx=tx-2;xx<=tx+2;xx++)if(inB(xx,yy)&&S.tiles[idx(xx,yy)]===TREE)trees++;
        if(trees<4)continue;const s=trees*3-d;if(s>as){as=s;amb={x:tx*TS+16,y:ty*TS+16};}
      }
    }
    if(amb){fr.ambush=amb;add({kind:'ambush',x:amb.x,y:amb.y,cost:{},why:`Borda da mata junto à estrada ${fr.dir}. Arqueiros escondidos aqui pegam o inimigo de lado, antes que ele chegue às casas. Os grupos de arqueiros do general vão esperar ali.`,front:fronts.length-1});}
  }
  I.fronts=fronts;I.plan=plan.concat(I.plan.filter(p=>p.kind==='attack'&&p.st==='new'));I.t=S.t;
  return plan;
}
function blockerName(tiles,i){
  let w=0,t=0,c=0;
  for(const[x,y]of tiles)for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy;if(!inB(xx,yy))continue;const j=idx(xx,yy);if(S.tiles[j]===WATER)w++;else if(S.tiles[j]===TREE)t++;else if(cliff[j]||elev[j]!==elev[i])c++;}
  const n=[];if(w)n.push('a água');if(t)n.push('a mata');if(c)n.push('o penhasco');
  return n.length>1?n.slice(0,-1).join(', ')+' e '+n[n.length-1]:n[0]||'obstáculos';
}
// the spy's report on the enemy base: towers and walls on each side, and the weakest one
function analyzeEnemy(team){
  const foe=castleOf(team===1?2:1),c=castleOf(team);if(!foe||!c)return null;
  const I=intelOf(team),sides=[{n:'norte',x:0,y:-1},{n:'leste',x:1,y:0},{n:'sul',x:0,y:1},{n:'oeste',x:-1,y:0}];
  for(const s of sides){s.t=0;s.w=0;}
  for(const b of BLDS){
    if(b.dead||b.team!==foe.team)continue;const dx=b.x-foe.x,dy=b.y-foe.y,d=hyp(dx,dy);if(d>14*TS||d<1)continue;
    const s=sides.reduce((a,q)=>(dx*q.x+dy*q.y)/d>(dx*a.x+dy*a.y)/d?q:a);
    if(b.kind==='tower')s.t++;else if(DEF[b.kind].wall)s.w++;
  }
  for(const s of sides){s.score=s.t*3+s.w*.3;const p=walkNear(foe.x+s.x*9*TS,foe.y+s.y*7*TS);s.p=p;s.reach=reachPt(p.x,p.y);}
  const ok=sides.filter(s=>s.reach);if(!ok.length)return null;
  const weak=ok.sort((a,b)=>a.score-b.score)[0];
  const gates=BLDS.filter(b=>!b.dead&&b.team===foe.team&&b.kind==='gate'&&hyp(b.x-foe.x,b.y-foe.y)<14*TS).length;
  let hill=null;for(let r=3;r<8&&!hill;r++)for(let k=0;k<12&&!hill;k++){const a=k/12*Math.PI*2,x=tileOf(weak.p.x)+Math.round(Math.cos(a)*r),y=tileOf(weak.p.y)+Math.round(Math.sin(a)*r);if(inB(x,y)&&elev[idx(x,y)]>=1&&walkXY(x,y))hill={x:x*TS+16,y:y*TS+16};}
  const towers=sides.reduce((a,s)=>a+s.t,0);
  I.spy={t:S.t,sides:sides.map(s=>({n:s.n,t:s.t,w:s.w})),weak:weak.n,via:{x:weak.p.x,y:weak.p.y},towers,gates};
  const why=`O batedor contou ${towers} ${towers===1?'torre':'torres'} em volta do castelo vermelho${gates?` e ${gates} ${gates===1?'portão':'portões'}`:''}. O lado ${weak.n} é o mais fraco (${weak.t} ${weak.t===1?'torre':'torres'}). Plano: juntar o exército, entrar pelo ${weak.n}${gates?', com aríetes no portão':''}${hill?', arqueiros no morro ali perto':''}, e um grupo de flanco pelo outro lado.`;
  I.plan=I.plan.filter(p=>p.kind!=='attack');
  const it={id:++I.n,team,kind:'attack',x:weak.p.x,y:weak.p.y,via:{x:weak.p.x,y:weak.p.y},cost:{},why,st:'new'};I.plan.push(it);
  return it;
}

// ---------------------------------------------------------------- the ride: a scout visits a ring of points and comes back
function sweepPoints(team,kind){
  const c=castleOf(team);if(!c)return [];
  const pts=[];
  if(kind==='spy'){
    const foe=castleOf(team===1?2:1);if(!foe)return [];
    for(let k=0;k<7;k++){const a=k/7*Math.PI*2,p=walkNear(foe.x+Math.cos(a)*11*TS,foe.y+Math.sin(a)*8*TS);if(reachPt(p.x,p.y))pts.push(p);}
  }else{
    for(let k=0;k<9;k++){const a=k/9*Math.PI*2,p=walkNear(c.x+Math.cos(a)*17*TS,c.y+Math.sin(a)*12*TS);if(reachPt(p.x,p.y))pts.push(p);}
  }
  pts.push(walkNear(c.x,c.y+50));
  return pts;
}
function startSweep(team,kind,scout){
  const I=intelOf(team);
  if(!alive(scout)){scout=messengerFor(team);if(!scout)return 'noscout';}
  const pts=sweepPoints(team,kind);if(pts.length<3)return 'nopath';
  scout.order={type:'sweep',pts,i:0,kind,t0:S.t};scout.path=null;scout.cmdT=0;scout.sweeper=kind;
  I.sweep=scout.id;I.sweepKind=kind;I.sweepT=S.t;
  HOOK.scout('start',team,scout,{kind});
  return 'ok';
}
function doSweep(u,dt){
  const o=u.order,p=o.pts[o.i];
  if(!p){u.order=null;sweepDone(u);return;}
  // a scout does not fight: he runs past
  if(hyp(u.x-p.x,u.y-p.y)<50||S.t-(o.legT||o.t0)>70){o.i++;o.legT=S.t;u.path=null;if(o.i>=o.pts.length){u.order=null;sweepDone(u);}return;}
  u.rp=(u.rp||0)-dt;
  if((!u.path&&!u.detour)||u.rp<=0){u.rp=3;if(pathToPoint(u,p.x,p.y,false)===0){o.i++;}}
  followPath(u,dt);
}
function sweepDone(u){
  const team=u.team,I=intelOf(team),kind=u.sweeper;u.sweeper=null;I.sweep=0;I.sweeps=(I.sweeps||0)+1;
  if(kind==='spy'){const it=analyzeEnemy(team);HOOK.scout('spy',team,u,{item:it});}
  else{const plan=analyzeDefense(team);HOOK.scout('plan',team,u,{plan});
    if(team===1&&plan&&plan.length){const g=byId.get(armyOf(1).gen)||byId.get(S.engineerId);const who=g&&g.kind!=='engineer'?`${rankedName(g)}, ${(g.rank||0)>=3?"general":"chefe do exército"},`:'Mestre Gaspar';
      ask({kind:'planReady',who:`${who} tem um plano`,av:g&&g.kind!=='engineer'?'av01':'av05',text:`O batedor ${folkName(u)} voltou. Achei ${plan.length} ${plan.length===1?'ponto':'pontos'} para fortalecer a defesa: ${plan.map(p=>PLAN_NAME[p.kind].toLowerCase()).join(', ')}. Quer ver o plano, com o motivo de cada obra?`,loc:{x:plan[0].x,y:plan[0].y}});}}
  if(kind==='spy'&&team===1){const it=intelOf(1).plan.find(p=>p.kind==='attack'&&p.st==='new');if(it)ask({kind:'planReady',who:'O batedor voltou da base vermelha',av:'av28',text:it.why+' Quer ver o plano de ataque?',loc:{x:it.x,y:it.y}});}
}

// ---------------------------------------------------------------- carrying out the plan, item by item
function planApprove(team,id){
  const I=intelOf(team),it=I.plan.find(p=>p.id===id);if(!it||it.st!=='new')return 'gone';
  if(it.kind==='ambush'){it.st='done';return 'ok';}
  if(it.kind==='attack'){it.st='done';armyOrder(team,'attack',{via:it.via});return 'ok';}
  if(!afford(team,it.cost))return 'cost';
  if(it.kind==='tower'){
    if(!unlocked(team,'tower'))return 'era';
    const b=placeBuilding(team,'tower',it.tx,it.ty,nearestPawns((it.tx+1)*TS,(it.ty+2)*TS,2,team));if(!b)return 'place';
    it.st='done';it.bid=b.id;return 'ok';
  }
  if(it.kind==='raise'){
    if(!unlocked(team,'tower'))return 'era';
    const g=team===1?byId.get(S.engineerId):byId.get(S.redEngId);
    if(!alive(g))return 'noeng';
    if(!terraOk(it.tiles,true))return 'place';
    g.order={type:'terra',tiles:it.tiles,up:true,t:0};g.path=null;g.cmdT=S.t;
    it.st='raising';it.lv0=elev[idx(it.tx,it.ty)];return 'ok';
  }
  if(it.kind==='wall'||it.kind==='pit'){
    let n=0;
    for(const[x,y]of it.tiles){const k=it.kind==='pit'?'pit':(it.gate&&x===it.gate[0]&&y===it.gate[1]?'gate':'wall');if(placeBuilding(team,k,x,y,[]))n++;}
    if(!n)return 'place';
    it.st='done';return 'ok';
  }
  return 'gone';
}
function planReject(team,id){const it=intelOf(team).plan.find(p=>p.id===id);if(it&&it.st==='new')it.st='no';}

// ---------------------------------------------------------------- the Red Kingdom: its own engineer, Mestre Rubro
function redEngineer(dt){
  if(!S.ai)return;
  let g=byId.get(S.redEngId);
  if(!alive(g)||g.team!==2){
    if(S.redEngId&&!S.redLostT)S.redLostT=S.t;
    if(S.redEngId&&S.t-S.redLostT<60)return;
    const c=castleOf(2);if(!c||S.t<20)return;
    const p=freeSpotNear(c);g=spawnUnit('engineer',2,p.x,p.y,{title:'Mestre Rubro',rank:5,kills:RANKS[5].k});g.maxhp=g.hp=Math.round(g.maxhp*rankHp(5));
    S.redEngId=g.id;S.redLostT=0;HOOK.scout('rubro',2,g,{});return;
  }
  S.rubT=(S.rubT||0)-dt;if(S.rubT>0)return;S.rubT=3;
  if(g.order&&(g.order.type==='terra'||g.order.type==='build'))return;
  // 1. repairs, and foundations nobody works on
  const hurt=BLDS.filter(b=>!b.dead&&b.team===2&&(b.built?b.hp<b.maxhp*.7&&S.t-(b.lastHit||-99)>8:true)).sort((a,b)=>a.hp/a.maxhp-b.hp/b.maxhp)[0];
  if(hurt&&!threatNear(hurt.x,hurt.y,2,240)){g.order={type:'build',id:hurt.id};g.path=null;return;}
  // 2. the plan from his scouts: a raised tower by the road
  const I=intelOf(2),it=I.plan.find(p=>p.st==='new'&&p.kind==='raise');
  if(it&&eraOf(2)>=3&&afford(2,{wood:(it.cost.wood||0)+200,gold:(it.cost.gold||0)+150})&&terraOk(it.tiles,true)){g.order={type:'terra',tiles:it.tiles,up:true,t:0};g.path=null;it.st='raising';it.lv0=elev[idx(it.tx,it.ty)];return;}
  // 3. a walk around the village
  if(!g.order){const c=castleOf(2);if(c){const a=S.t*.3;g.order={type:'move',x:c.x+Math.cos(a)*6*TS,y:c.y+Math.sin(a)*4*TS};}}
}
// the Red scouts: a ride around home now and then, then the towers go where the land says
function aiScouting(){
  if(!S.ai||S.over)return;
  const I=intelOf(2);
  if(S.t>200&&(!I.t||S.t-I.t>480)&&!I.sweep){
    const sc=messengerFor(2);if(sc&&startSweep(2,'defense',sc)==='ok')return;
    // no scout: the Red general asks the barracks for one
    if(!sc&&S.t>(S.ai.scoutT||0)){const b=BLDS.find(b=>!b.dead&&b.team===2&&b.kind==='barracks'&&b.built);if(b&&b.queue.length<2&&trainAt(b,'scout')==='ok')S.ai.scoutT=S.t+240;}
  }
  // build the planned towers when the treasury allows
  if(eraOf(2)>=2)for(const it of I.plan){
    if(it.st!=='new'||it.kind!=='tower')continue;
    if(!afford(2,{wood:(it.cost.wood||0)+120,gold:(it.cost.gold||0)+80}))break;
    const pw=S.ents.filter(p=>!p.dead&&p.team===2&&p.kind==='pawn').sort((a,b)=>hyp(a.x-it.x,a.y-it.y)-hyp(b.x-it.x,b.y-it.y)).slice(0,2);
    const b=placeBuilding(2,'tower',it.tx,it.ty,pw);if(b)it.st='done';else it.st='no';
    break;
  }
}

// ---------------------------------------------------------------- fog of war (optional): seen once, seen now
let FOGV=null;
function fogOn(){return !!(S&&S.cfg&&S.cfg.fog);}
function fogUpdate(){
  if(!fogOn())return;
  if(!S.seen||S.seen.length!==N)S.seen=new Uint8Array(N);
  if(!FOGV||FOGV.length!==N)FOGV=new Uint8Array(N);else FOGV.fill(0);
  const mark=(x,y,r)=>{const cx=tileOf(x),cy=tileOf(y),rt=Math.ceil(r/TS);for(let dy=-rt;dy<=rt;dy++)for(let dx=-rt;dx<=rt;dx++){if(dx*dx+dy*dy>rt*rt)continue;const tx=cx+dx,ty=cy+dy;if(!inB(tx,ty))continue;const i=idx(tx,ty);FOGV[i]=1;S.seen[i]=1;}};
  for(const e of S.ents){
    if(e.dead||e.team!==1)continue;const D=DEF[e.kind];
    if(D.unit)mark(e.x,e.y,(D.sight||160)*.9);
    else if(D.building){const r=rectOf(e);mark(r[0]+r[2]/2,r[1]+r[3]/2,(D.range||150)+r[2]/2);}
  }
  // the neutral towns are known places: their surroundings start explored (not watched)
  if(!S.townsSeen&&S.towns){S.townsSeen=1;for(const T of S.towns){const cx=tileOf(T.x),cy=tileOf(T.y);for(let dy=-6;dy<=6;dy++)for(let dx=-7;dx<=7;dx++){const tx=cx+dx,ty=cy+dy;if(inB(tx,ty)&&dx*dx/49+dy*dy/36<=1)S.seen[idx(tx,ty)]=1;}}}
  // friends lend their eyes: allied and vassal towns
  for(const T of S.towns||[])if(T.owner===1||(typeof loyalTo==='function'&&loyalTo(T)===1))mark(T.x,T.y,10*TS);
}
function fogSees(x,y){if(!fogOn()||!FOGV)return true;const tx=tileOf(x),ty=tileOf(y);return inB(tx,ty)&&FOGV[idx(tx,ty)]===1;}
function fogKnown(x,y){if(!fogOn()||!S.seen)return true;const tx=tileOf(x),ty=tileOf(y);return inB(tx,ty)&&S.seen[idx(tx,ty)]===1;}

// ---------------------------------------------------------------- every few seconds: who should ride, and the advice
function scoutTick(dt){
  S.fogT=(S.fogT||0)-dt;if(S.fogT<=0){S.fogT=.25;fogUpdate();}
  S.scoutT=(S.scoutT||0)-dt;if(S.scoutT>0)return;S.scoutT=5;
  for(const team of[1,2]){
    const I=intelOf(team);
    // a raised tower: once the ground is up, the tower goes on top
    for(const it of I.plan){
      if(it.st!=='raising')continue;
      if(elev[idx(it.tx,it.ty)]>(it.lv0||0)){const pw=nearestPawns((it.tx+1)*TS,(it.ty+2)*TS,2,team);if(placeBuilding(team,'tower',it.tx,it.ty,pw))it.st='done';else if(S.t-(it.raiseT||(it.raiseT=S.t))>120)it.st='no';}
    }
    if(I.wantSweep&&!I.sweep){const sc=messengerFor(team);if(sc&&startSweep(team,'defense',sc)==='ok')I.wantSweep=0;else if(S.t-I.wantSweep>120)I.wantSweep=0;}
    if(I.sweep){const u=byId.get(I.sweep);if(!alive(u)||!u.order||u.order.type!=='sweep'){if(!alive(u))HOOK.scout('lost',team,null,{});I.sweep=0;}}
  }
  redEngineer(5);aiScouting();
  // the player's council: the general (or the engineer) asks to send a scout around
  if(S.over||!castleOf(1))return;
  const I=intelOf(1),A=armyOf(1),g=byId.get(A.gen)||byId.get(S.engineerId);
  if(!alive(g)||I.sweep||S.ask||(S.asks&&S.asks.length))return;
  if(S.t-(I.asked||-999)<240)return;
  if(eraOf(1)<2&&S.t<300)return;
  if(I.t&&S.t-I.t<600)return;
  const sc=messengerFor(1);I.asked=S.t;
  const who=g.kind==='engineer'?'Mestre Gaspar':`${rankedName(g)}, ${(g.rank||0)>=3?"general":"chefe do exército"},`;
  if(sc)ask({kind:'scoutAsk',scout:sc.id,who:`${who} pede autorização`,av:g.kind==='engineer'?'av05':'av01',text:`Mando o batedor ${folkName(sc)} dar uma volta em torno do reino? Ele vê por onde o inimigo pode chegar, os estreitos, os morros e as matas, e eu monto um plano de defesa: cada obra com o motivo, e você decide uma por uma.`,loc:{x:sc.x,y:sc.y,id:sc.id}});
  else if(BLDS.some(b=>!b.dead&&b.team===1&&b.kind==='barracks'&&b.built))ask({kind:'scoutTrain',who:`${who} pede autorização`,av:g.kind==='engineer'?'av05':'av01',cost:DEF.scout.cost,text:'Não temos batedor. Treino um no quartel? Ele dá a volta no reino e eu monto um plano de defesa: torres nos morros, muralhas nos estreitos e emboscadas nas matas.'});
}
