// Memória do Rubro: a "player" with a fixed style (the blue AI steered like Claude steers it) plays several matches in a row
// against the Red Kingdom, which learns between matches. Prints what red learned, its counter-plan and how each match went.
// node t_learn.js [seed] [dificil] [games] [maxMin] [style]
const seed=+(process.argv[2]||7),diff=process.argv[3]||'dificil',games=+(process.argv[4]||4),maxMin=+(process.argv[5]||35),style=process.argv[6]||'lanca';
const G=require('./load.js')(seed);
const STY={
  lanca:{treinar:{lancer:4,warrior:1},exercito:{ordem:'atacar',minimo:8},economia:{comida:.45,madeira:.3,ouro:.25}},
  arco:{treinar:{archer:4,warrior:1},exercito:{ordem:'atacar',minimo:10}},
  eco:{aldeoes:6,era:'agora',construir:['tower'],exercito:{ordem:'esperar',minimo:25},treinar:{warrior:2,archer:2,lancer:1}},
  saque:{treinar:{scout:3,warrior:2},exercito:{ordem:'saquear',minimo:5}},
};
const out=[];
for(let g=0;g<games;g++){
  if(process.env.CONTROL)G.lrnReset();
  G.newGame(900+seed*13+g*7,diff,{mode:'skirmish'});
  const S=()=>G.S;
  G.aiInit(1);
  S().rules=Object.assign({},S().rules||{},{obras:true,estradas:true,socorro:true,renovar:true,medicos:true,batedor:true,armyAuto:true,gold:2000});
  G.lrnBegin(false);
  if(!S().lrn.on)throw new Error('learning is off');
  // FAIR=1: the blue "player" gets the same help as red (like the observer mode), so only the learning makes a difference
  if(process.env.FAIR){S().cfg=Object.assign({},S().cfg,{watch:true,blue:'pc',fog:false});for(const k in S().teams[1].res)S().teams[1].res[k]+=S().diff.start;}
  const cp=S().lrn.cp;
  let errs=0;const seen=new Set(),t0=Date.now();
  for(let i=0;i<maxMin*60*20&&!S().over;i++){
    if(i%1200===0)G.withTeam(1,()=>G.clApply(JSON.parse(JSON.stringify(STY[style]))));
    try{G.update(.05);}catch(e){errs++;if(!seen.has(e.message)){seen.add(e.message);console.log('ERR',e.stack.split('\n').slice(0,4).join(' | '));}}
  }
  const L=G.lrnLoad(),O=S().lrn,res=S().over||'time';
  const r=S().over?O.done:G.lrnEnd('time');
  const T1=S().teams[1],T2=S().teams[2];
  const rm={};for(const e of S().ents)if(!e.dead&&e.team===2&&G.DEF[e.kind].unit&&G.DEF[e.kind].mil)rm[e.kind]=(rm[e.kind]||0)+1;
  const bm={};for(const e in O.mix)for(const k in O.mix[e])bm[k]=(bm[k]||0)+O.mix[e][k];
  console.log('  tropas azul treinadas',JSON.stringify(bm),'| exército vermelho no fim',JSON.stringify(rm),'| torres verm',S().ents.filter(e=>!e.dead&&e.team===2&&e.kind==='tower').length,'| castelo azul',Math.round((G.castleOf(1)||{hp:0}).hp),'verm',Math.round((G.castleOf(2)||{hp:0}).hp));
  const line=`partida ${g+1}: ${res==='win'?'AZUL venceu':res==='lose'?'VERMELHO venceu':'sem fim'} ${Math.round(S().t/60)} min | abates azul ${T1.stats.kills} verm ${T2.stats.kills} | perdas azul ${T1.stats.lost} verm ${T2.stats.lost} | era ${T1.era}x${T2.era} | ataques azul ${O.atk.length} | geração ${L.gen} | fit ${r&&r.M?r.M.fit:'-'} | erros ${errs} | ${((Date.now()-t0)/1000).toFixed(0)}s`;
  console.log(line);out.push(line);
  if(cp)console.log('  plano usado:',cp.lines.join(' / '));
  console.log('  estilo:',JSON.stringify(G.lrnStyleTop(L.P).map(([k,v])=>k+':'+v.toFixed(2))),'| previsão ataque',L.P.atkRel!=null?Math.round(L.P.atkRel+S().diff.peace)+'s':'-','| lado',L.P.v!=null?L.P.v.toFixed(2):'-','| mix',JSON.stringify(G.lrnTop(L.P.mixAll||{},3).map(([k,v])=>k+':'+v.toFixed(2))));
  console.log('  planos:',JSON.stringify(Object.fromEntries(Object.entries(L.plans).map(([k,b])=>[k,b.s.toFixed(1)+'/'+b.f.toFixed(1)]))),'| dna',JSON.stringify(L.dna));
  if(r&&r.lessons)console.log('  lições:',r.lessons.join(' / '));
}
console.log(out.join('\n'));
