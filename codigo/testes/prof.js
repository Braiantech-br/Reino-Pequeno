const G=require('./load.js')(7);
G.newGame(7,'normal',{mode:'skirmish'});const S=G.S;
for(let i=0;i<30*60*9;i++){G.update(1/30);if(S.ask&&i%45===0)G.answerAsk(true);}
