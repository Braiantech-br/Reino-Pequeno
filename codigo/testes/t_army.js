const G=require('./load.js')(3);
const ev=[];for(const k of['army'])G.HOOK[k]=(w,t,u,x)=>ev.push(`${(G.S.t).toFixed(0)}s ${w} t${t} ${u?G.rankedName(u):''} ${x&&x.vote?`votos ${x.vote.votes}/${x.vote.total}`:''}${x&&x.next?' -> '+G.rankedName(x.next):''}${x&&x.k?' '+x.k:''}`);
G.newGame(3,'normal',{mode:'skirmish'});const S=G.S;S.ai.think=1e9;
const c1=G.castleOf(1),c2=G.castleOf(2);
const mk=(team,list,x,y)=>{const out=[];let i=0;for(const [k,n,r] of list)for(let j=0;j<n;j++){const u=G.spawnUnit(k,team,x+(i%6)*24,y+Math.floor(i/6)*24);u.rank=r||0;u.kills=G.RANKS[u.rank].k;out.push(u);i++;}return out;};
const blue=mk(1,[['warrior',6,0],['archer',4,0],['lancer',3,1],['warrior',1,4],['archer',2,2],['warrior',1,6]],c1.x+150,c1.y+80);
for(let i=0;i<30*5;i++)G.update(1/30);
const A=S.armies[1];
console.log('gen',G.rankedName(G.byId.get(A.gen)),'squads',A.sq.map(q=>`[${G.rankedName(G.byId.get(q.lead))} cap${q.cap} m${q.mem.length} par${q.par}]`).join(' '));
// equal recruits: a vote
const reds=mk(2,[['warrior',5,0],['archer',3,0]],c2.x-200,c2.y+80);
for(let i=0;i<30*5;i++)G.update(1/30);
console.log('red gen',G.rankedName(G.byId.get(S.armies[2].gen)),'squads',S.armies[2].sq.length);
// a battle: the major's men vs red; kill the general and see who takes over
G.armyOrder(1,'attack');
const foes=mk(2,[['warrior',10,1],['archer',6,0]],c1.x+700,c1.y+60);for(const u of foes)u.order={type:'move',x:c1.x+200,y:c1.y+80,amove:true};
for(let i=0;i<30*40;i++){G.update(1/30);if(i===30*20){const g=G.byId.get(A.gen);if(g){G.kill(g,foes[0]);}}}
console.log('after: gen',G.rankedName(G.byId.get(A.gen)),'squads',A.sq.length,'ord',A.ord.type,A.ord.phase);
console.log(ev.join('\n'));
