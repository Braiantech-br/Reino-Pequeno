// Warships: a blue warship sinks a red boat and shoots units on the shore; land archers shoot back.
const G=require('./load.js')(11);
G.newGame(4242,'normal',{mode:'skirmish'});
const S=()=>G.S;
let water=null;for(let y=0;y<G.S.mh&&!water;y++)for(let x=0;x<G.S.mw&&!water;x++){const i=y*G.S.mw+x;if(G.S.tiles[i]===0){let ok=true;for(let j=-2;j<=2;j++)for(let k=-2;k<=2;k++){const ii=(y+j)*G.S.mw+(x+k);if(G.S.tiles[ii]!==0)ok=false;}if(ok)water={x:x*32+16,y:y*32+16};}}
console.log('water',water);
const w=G.spawnUnit('warship',1,water.x,water.y);
const b=G.spawnUnit('boat',2,water.x+90,water.y);
let errs=0;for(let i=0;i<20*20;i++){try{G.update(.05);}catch(e){errs++;if(errs<3)console.log(e.stack.split('\n').slice(0,3).join(' | '));}}
console.log('red boat hp',b.dead?'sunk':b.hp,'warship hp',w.hp,'errors',errs);
