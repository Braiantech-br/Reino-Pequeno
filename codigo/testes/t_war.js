// War council: both kingdoms pick plans from the book, carry them out, and the match still ends without errors.
const seed=+(process.argv[2]||5),diff=process.argv[3]||'dificil',maxMin=+(process.argv[4]||40);
const G=require('./load.js')(seed);
G.newGame(1000+seed,diff,{mode:'skirmish'});
const S=()=>G.S;
S().cfg=Object.assign({},S().cfg,{watch:true,blue:'pc',fog:false});
G.aiInit(1);
for(const k in S().teams[1].res)S().teams[1].res[k]+=S().diff.start;
S().rules=Object.assign({},S().rules||{},{obras:true,estradas:true,socorro:true,renovar:true,medicos:true,batedor:true,armyAuto:true,gold:2000});
const log=[],cnt={};
G.HOOK.war=(team,ev,pl,W,why)=>{const k=team+':'+(pl&&pl.type||'')+':'+ev;cnt[k]=(cnt[k]||0)+1;if(ev!=='evac'&&log.length<60)log.push(`${(S().t/60).toFixed(1)} T${team} ${ev} ${pl&&pl.type||''} ${why||''} ${pl&&pl.score!=null?'score '+pl.score:''}`);};
let errs=0;const seen=new Set();
function run(sec){for(let i=0;i<sec*20&&!S().over;i++){try{G.update(.05);}catch(e){errs++;const k=e.message;if(!seen.has(k)){seen.add(k);console.log('ERR',e.stack.split('\n').slice(0,4).join(' | '));}}}}
const t0=Date.now();
for(let m=5;m<=maxMin&&!S().over;m+=5){run(300);const w1=S().war&&S().war[1],w2=S().war&&S().war[2];console.log(`${m} min | evals azul ${w1?w1.evals:0} verm ${w2?w2.evals:0} | plano azul ${w1&&w1.plan?w1.plan.type+'/'+w1.plan.ph:'-'} verm ${w2&&w2.plan?w2.plan.type+'/'+w2.plan.ph:'-'}`);}
console.log(log.join('\n'));
console.log(cnt);
console.log('over',S().over||'no',Math.round(S().t/60),'min errors',errs,'real',((Date.now()-t0)/1000).toFixed(0)+'s');
