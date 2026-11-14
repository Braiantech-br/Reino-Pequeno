// The Red Kingdom under Claude's orders (Claude's replies are simulated here): no errors, and the orders change what it does.
const G=require('./load.js')(77);
const fs=require('fs');
G.newGame(4242,'dificil',{mode:'skirmish'});
const S=()=>G.S;
let errs=0;
function run(sec){for(let i=0;i<sec*20;i++){try{G.update(.05);}catch(e){errs++;if(errs<4)console.log('ERR',e.stack.split('\n').slice(0,3).join(' | '));}}}
run(240);
const rep=G.clReport();
fs.writeFileSync(__dirname+'/../../../relatorio-claude.json',JSON.stringify(rep,null,1));
console.log('report bytes',JSON.stringify(rep).length,'keys',Object.keys(rep).join(','));
const towns=S().towns.map(t=>t.name);
// order 1: rush lancers and archers, attack the towers, mercs from a town, spy
let p=G.clApply({pensamento:'Teste',estrategia:'rush',economia:{comida:.5,madeira:.2,ouro:.3},aldeoes:4,era:'agora',construir:['barracks','tower'],
  treinar:{lancer:3,archer:2,ram:1},exercito:{ordem:'atacar',alvo:'torres',minimo:6,flanco:true},contrato:{tipo:'merc',vila:towns[1],minutos:10},espionar:true,impostos:3,provocacao:'Vou derrubar suas torres!'});
console.log('plan',JSON.stringify({order:p.order,target:p.target,min:p.min,mix:p.mix,build:p.build,ctr:p.ctr,tax:G.econOf(2).tax}));
const before={army:G.aiScan().army.length};
run(150);
const I=G.aiScan(),A=S().ai;
const kinds={};for(const u of I.army)kinds[u.kind]=(kinds[u.kind]||0)+1;
console.log('after 150s: attacking',A.attacking,'waves',A.waves,'army',I.army.length,JSON.stringify(kinds),'ctr',A.cl&&A.cl.ctrResult,'spy sweep',!!(S().intel&&S().intel[2]&&(S().intel[2].sweep||S().intel[2].spy)),'era',S().teams[2].era,'research',!!S().teams[2].research);
// order 2: retreat and wait
p=G.clApply({pensamento:'Recuar',exercito:{ordem:'recuar'},provocacao:''});
run(5);console.log('retreat: attacking',S().ai.attacking);
p=G.clApply({exercito:{ordem:'esperar',minimo:40},treinar:{warrior:1}});run(120);
console.log('wait: attacking',S().ai.attacking,'army',G.aiScan().army.length);
// order 3: conquer a town
p=G.clApply({exercito:{ordem:'atacar',alvo:'vila:'+towns[0]}});run(90);
console.log('town siege',JSON.stringify(S().towns.map(t=>t.name+':'+(t.siege?t.siege.team:'-')+':'+(t.owner||0))),'siegeTown',S().ai.siegeTown);
// garbage in: nothing breaks
for(const bad of [null,'texto',{exercito:'x',treinar:'y',economia:[1,2],contrato:{tipo:'bomba'},impostos:'muito',aldeoes:1e9}])G.clApply(bad);
run(60);
console.log('log',S().ai.clLog.length,'errors',errs,'t',Math.round(S().t));
