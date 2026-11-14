// Observer mode: the computer plays both kingdoms. No errors, both sides grow and fight, and the match ends.
const seed=+(process.argv[2]||5),diff=process.argv[3]||'normal',maxMin=+(process.argv[4]||50);
const G=require('./load.js')(seed);
G.newGame(1000+seed,diff,{mode:'skirmish'});
const S=()=>G.S;
S().cfg=Object.assign({},S().cfg,{watch:true,blue:'pc',fog:false});
G.aiInit(1);
for(const k in S().teams[1].res)S().teams[1].res[k]+=S().diff.start;
S().rules=Object.assign({},S().rules||{},{obras:true,estradas:true,socorro:true,renovar:true,medicos:true,batedor:true,armyAuto:true,gold:2000});
let errs=0;const seen=new Set();
function run(sec){for(let i=0;i<sec*20&&!S().over;i++){try{G.update(.05);}catch(e){errs++;const k=e.message;if(!seen.has(k)){seen.add(k);console.log('ERR',e.stack.split('\n').slice(0,3).join(' | '));}}}}
const info=t=>{let army=0,pawns=0;for(const e of S().ents){if(e.dead||e.team!==t)continue;const D=G.DEF[e.kind];if(!D.unit)continue;if(e.kind==='pawn')pawns++;else if(D.mil)army++;}
  const c=G.castleOf(t),A=t===1?S().ai1:S().ai;return `era ${S().teams[t].era} army ${army} pawns ${pawns} castle ${c?Math.round(c.hp/c.maxhp*100):0}% kills ${S().teams[t].stats.kills} atk ${A&&A.attacking?1:0} waves ${A?A.waves:0}`;};
const t0=Date.now();
for(let m=5;m<=maxMin&&!S().over;m+=5){run(300);console.log(`${m} min | AZUL ${info(1)} | VERM ${info(2)}`);}
console.log('over',S().over||'no',Math.round(S().t/60),'min errors',errs,'real',((Date.now()-t0)/1000).toFixed(0)+'s');
