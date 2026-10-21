const G=require('./load.js')(7);
const ev=[];const note=(k)=>(...a)=>ev.push(`${(G.S.t/60).toFixed(1)} ${k} ${a.map(x=>typeof x==='object'&&x?(x.kind||x.name||x.title||x.id||''):x).join(' ')}`);
for(const k of['ctr','town','army','scout','econ','honor','council'])G.HOOK[k]=note(k);
G.newGame(7,'normal',{mode:'skirmish'});const S=G.S;
const t0=Date.now();let errs=0;
for(let i=0;i<30*60*12;i++){
  try{G.update(1/30);}catch(e){errs++;if(errs<4)console.log('ERR',e.stack.split('\n').slice(0,4).join(' | '));if(errs>20)break;}
  if(S.ask&&i%45===0)G.answerAsk(true);
  if(i===30*60*3){S.teams[1].res.gold+=2000;for(const T of S.towns){T.rep[1]=3.2;}
    for(const [k,o] of [['merc',{min:5}],['protect'],['route'],['garrison']]){console.log('propose',k,G.proposeContract(1,k,(['merc','route'].includes(k)?0:1),o));}}
}
console.log('errors',errs,'ms/simsec',((Date.now()-t0)/720).toFixed(1));
console.log('contracts',(S.contracts||[]).map(c=>`${c.team}:${c.kind}@${S.towns[c.town].name}=${c.state}${c.why?'/'+c.why:''} ids${c.ids.length}`).join(' | '));
const A=S.armies;for(const t of[1,2])if(A&&A[t])console.log('army',t,'gen',A[t].gen,'squads',A[t].sq.map(q=>`${q.id}:L${q.lead}r${(G.byId.get(q.lead)||{}).rank}m${q.mem.length}p${q.par}`).join(' '),'ord',A[t].ord.type);
for(const t of[1,2]){const I=S.intel&&S.intel[t];if(I)console.log('intel',t,'t',Math.round(I.t),'fronts',I.fronts.length,'plan',I.plan.map(p=>p.kind+':'+p.st).join(','));}
for(const t of[1,2]){const E=S.econ&&S.econ[t];if(E)console.log('econ',t,'tax',E.tax,'pop',E.pop.toFixed(1),'income',E.income,'upkeep',E.upkeep,'unpaid',E.unpaid,'gold',Math.round(S.teams[t].res.gold));}
console.log('honor',JSON.stringify(S.honor||{}),'caravans',S.ents.filter(e=>e.kind==='cart'&&e.trip).length,'traders',S.ents.filter(e=>e.trader).length);
console.log(ev.slice(0,60).join('\n'));
