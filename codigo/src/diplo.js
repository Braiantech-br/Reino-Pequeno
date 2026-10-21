// ================================================================ diplomacy: every relation between a kingdom and a neutral town is a contract
// Mercenaries (for a time or until death), the town's hero, a garrison, protection, a sworn alliance (loyalty) and a fixed
// trade route. A messenger walks to the town to propose it and the town decides. Contracts are renewed, broken (honour
// falls) or outbid by the other kingdom. A town can also be conquered and kept as a vassal, or bought back.

// ---------------------------------------------------------------- the towns' own soldiers: one elite troop and one hero each
Object.assign(DEF,{
  tshield:{name:'Guarda de escudo',unit:true,mil:true,elite:true,look:{skin:'y',base:'warrior',s:1.12},hp:230,speed:52,r:10,dmg:12,range:20,cd:1.1,sight:220,armor:.3,desc:'Soldado de Moinho. O escudo grande faz ele receber 30% menos dano. O melhor para guarnição.'},
  taxe:   {name:'Machadeiro',unit:true,mil:true,elite:true,look:{skin:'y',base:'pawn',s:1.25,atk:'axe'},hp:165,speed:58,r:9,dmg:17,range:20,cd:1.1,sight:210,desc:'Soldado da Serraria. Machado pesado: forte contra tudo e derruba prédios em dobro.'},
  txbow:  {name:'Besteiro',unit:true,mil:true,ranged:true,elite:true,pierce:true,look:{skin:'y',base:'archer',s:1.1},hp:85,speed:52,r:8,dmg:17,range:215,cd:2.1,sight:250,desc:'Soldado de Ouroverde. A besta atira de muito longe e o virote fura escudos e armaduras.'},
  tsapper:{name:'Sapador',unit:true,mil:true,elite:true,look:{skin:'y',base:'pawn',s:1.2,atk:'pick'},hp:150,speed:56,r:9,dmg:11,range:20,cd:1.1,sight:200,wallx:3.2,desc:'Soldado de Rochedo. Picareta de mineiro: abre muralhas e portões três vezes mais rápido.'},
  hmoleira:{name:'Mãe Moleira',unit:true,mil:true,ranged:true,thero:true,noConvert:true,aura:true,feed:true,look:{skin:'y',base:'monk',s:1.3},hp:460,speed:52,r:11,dmg:11,range:160,cd:1.2,sight:240,desc:'Heroína de Moinho. Cura quem está em volta e alimenta a tropa: os aliados perto dela batem 15% mais forte.'},
  htora:  {name:'Tora, o Lenhador',unit:true,mil:true,thero:true,noConvert:true,look:{skin:'y',base:'pawn',s:1.5,atk:'axe'},hp:760,speed:56,r:12,dmg:30,range:24,cd:1.3,sight:220,cleave:44,desc:'Herói da Serraria. Cada machadada acerta todos em volta.'},
  hourela:{name:'Capitã Ourela',unit:true,mil:true,ranged:true,thero:true,noConvert:true,pierce:true,look:{skin:'y',base:'archer',s:1.32},hp:400,speed:58,r:10,dmg:19,range:235,cd:1.1,sight:260,volley:3,desc:'Heroína de Ouroverde. Atira em três inimigos de uma vez.'},
  hmineiro:{name:'Grão-Mineiro',unit:true,mil:true,thero:true,noConvert:true,look:{skin:'y',base:'pawn',s:1.5,atk:'pick'},hp:700,speed:50,r:12,dmg:26,range:22,cd:1.4,sight:210,wallx:6,stun:1,desc:'Herói de Rochedo. Derruba portões e atordoa quem ele acerta.'},
});
BONUS.taxe={building:2,unit:1.1};BONUS.htora={building:2};
const TOWN_ELITE=['tshield','taxe','txbow','tsapper'],TOWN_HERO=['hmoleira','htora','hourela','hmineiro'];
const eliteOf=T=>TOWN_ELITE[T.i%4],heroOf=T=>TOWN_HERO[T.i%4];
const TEAM_NAME={1:'você',2:'o Reino Vermelho'};
const teamName=(t,cap)=>{const n=TEAM_NAME[t]||'ninguém';return cap?n[0].toUpperCase()+n.slice(1):n;};

// ---------------------------------------------------------------- honour: every town sees whether a kingdom keeps its word
function honorOf(t){return S&&S.honor&&S.honor[t]!=null?S.honor[t]:50;}
function addHonor(t,v,why){
  if(!S||(t!==1&&t!==2))return;S.honor=S.honor||{1:50,2:50};
  const old=honorOf(t);S.honor[t]=clamp(old+v,0,100);
  if(why&&Math.round(S.honor[t])!==Math.round(old))HOOK.honor(t,v,why);
}
const HONOR_NAME=h=>h>=80?'Palavra de ouro':h>=60?'Confiável':h>=40?'Comum':h>=20?'Duvidosa':'Traiçoeira';
const honorF=t=>1+(50-honorOf(t))/200;

// ---------------------------------------------------------------- the kinds of contract
const CTR={
  merc:    {name:'Mercenários por tempo',short:'Mercenários',need:1,desc:'4 soldados de elite da vila lutam por você durante o tempo do contrato. Não ocupam população.'},
  mercLife:{name:'Mercenários até a morte',short:'Mercenários fiéis',need:2,desc:'4 soldados de elite que ficam com você para sempre e ganham patente. Mais caro e sem renovação.'},
  hero:    {name:'Herói da vila',short:'Herói',need:4,desc:'O herói da vila luta ao seu lado até cair. Só para os grandes amigos.'},
  garrison:{name:'Guarnição',short:'Guarnição',need:1,desc:'4 soldados da vila ficam de guarda nas suas torres e portões por 10 minutos. Você não comanda: eles defendem o posto.'},
  protect: {name:'Proteção',short:'Proteção',need:2,desc:'Você paga 8% da sua produção por minuto e a vila manda guardas sozinha sempre que você for atacado.'},
  loyalty: {name:'Aliança juramentada',short:'Aliança',need:3,desc:'15% da sua produção por minuto. A vila não negocia com o inimigo, manda tropas para as suas guerras, faz 15% de desconto e ajuda quando você é atacado.'},
  route:   {name:'Rota fixa',short:'Rota',need:1,desc:'Por 10 minutos, uma caravana chega a cada 1 min 40 s com 150 da especialidade da vila, por um preço travado.'},
  liberate:{name:'Libertação',short:'Libertação',need:0,desc:'Compra a vila de volta do reino que a conquistou: ela passa para o seu lado.'},
  help:    {name:'Pedido de socorro',short:'Socorro',need:0,desc:'O mensageiro corre até a vila pedir guardas contra um ataque.'},
};
const CTR_MIN=[5,10,15];
function ctrList(){return S.contracts||(S.contracts=[]);}
function activeCtr(T,kind,team){return ctrList().find(c=>c.state==='active'&&c.town===T.i&&(!kind||c.kind===kind)&&(!team||c.team===team));}
// the town on whose side it stands: a vassal belongs to its owner, a sworn town to its ally
function loyalTo(T){if(T.owner)return T.owner;const c=activeCtr(T,'loyalty');return c?c.team:0;}
function ctrPrice(T,team,base){return Math.round(base*(1-.04*friendOf(T,team))*honorF(team)*(loyalTo(T)===team?.85:1));}
function routeRes(T){return T.spec;}
function ctrTerms(kind,T,team,o){
  o=o||{};const t={kind,town:T.i,team,cost:{}};
  if(kind==='merc'){const m=CTR_MIN.includes(o.min)?o.min:5;t.min=m;t.unit=eliteOf(T);t.n=4;t.dur=m*60;t.cost={gold:ctrPrice(T,team,{5:190,10:320,15:430}[m])};}
  else if(kind==='mercLife'){t.unit=eliteOf(T);t.n=4;t.dur=0;t.cost={gold:ctrPrice(T,team,500)};}
  else if(kind==='hero'){t.unit=heroOf(T);t.n=1;t.dur=0;t.cost={gold:ctrPrice(T,team,650)};}
  else if(kind==='garrison'){t.unit=eliteOf(T);t.n=4;t.dur=600;t.cost={gold:ctrPrice(T,team,210)};}
  else if(kind==='protect'){t.pct=.08;t.min=15;t.period=60;}
  else if(kind==='loyalty'){t.pct=.15;t.min=25;t.period=60;t.cost={gold:ctrPrice(T,team,120)};}
  else if(kind==='route'){
    const k=routeRes(T);t.res=k;t.n=150;t.period=100;t.dur=600;t.left=6;
    if(k==='gold'){const w=T.want==='arms'?'wood':T.want;t.pay={[w]:Math.round(150*1.05*honorF(team))};}
    else t.pay={gold:Math.max(40,Math.round(townPrice(T,k,true,team)*1.5*.85))};
  }
  else if(kind==='liberate'){t.cost={gold:Math.round(260+(T.loyal||50)*6+(T.lvl||1)*40)};}
  else if(kind==='help'){t.foe=o.foe;t.p=o.p;}
  return t;
}
// what the town will say: yes, no (and why), or a higher price
function townDecide(T,team,t){
  const kind=t.kind,f=friendOf(T,team)+(favOf(T,team)>0?1:0),other=team===1?2:1;
  if(kind==='help')return {ok:true};
  if(T.siege&&T.siege.team===team)return {ok:false,why:'Vocês estão atacando a nossa vila. Nada de acordo agora.'};
  if(T.hostile&&T.hostile.team===team&&S.t<T.hostile.until)return {ok:false,why:'Ainda estamos de luto pelo ataque de vocês. Voltem depois.'};
  if(kind==='liberate'){
    if(T.owner!==other)return {ok:false,why:'A vila não está nas mãos do inimigo.'};
    if((T.loyal||0)>=70)return {ok:false,why:`Somos fiéis a ${teamName(other)}. Não há ouro que pague isso.`};
    return afford(team,t.cost)?{ok:true}:{ok:false,why:'O mensageiro não trouxe o ouro combinado.'};
  }
  if(T.owner&&T.owner!==team)return {ok:false,why:`Somos vassalos de ${teamName(T.owner)} e não podemos negociar com vocês.`};
  if(honorOf(team)<20)return {ok:false,why:'Ninguém faz contrato com quem quebra a palavra. A honra de vocês está baixa demais.'};
  const need=CTR[kind].need;
  if(f<need)return {ok:false,why:`Ainda não confiamos tanto em vocês: esse contrato pede amizade ${FRIEND[need]} (${repStars(need)}).`};
  if(kind==='hero'&&T.heroOut&&T.heroOut!==team)return {ok:false,why:'O nosso herói já luta por outro reino.'};
  if(kind==='hero'&&T.heroCd&&S.t<T.heroCd)return {ok:false,why:'O nosso herói ainda está se recuperando. Voltem daqui a pouco.'};
  if(kind==='mercLife'||kind==='merc'){const busy=ctrList().filter(c=>c.state==='active'&&c.town===T.i&&(c.kind==='merc'||c.kind==='mercLife')).length;if(busy>=2)return {ok:false,why:'Todos os nossos soldados de aluguel já estão em serviço.'};}
  // a sworn town only breaks its oath for a lot more
  if(kind==='loyalty'||kind==='protect'){
    const oc=activeCtr(T,'loyalty',other)||(kind==='loyalty'?null:activeCtr(T,'protect',other));
    if(oc&&!t.outbid)return {ok:false,counter:{gold:Math.round((t.cost.gold||0)+260+120*(friendOf(T,other)))},why:`Já juramos ${CTR[oc.kind].short.toLowerCase()} a ${teamName(other)}. Para quebrar o juramento, só pagando bem mais.`,outbid:oc.id};
  }
  if(!afford(team,t.cost))return {ok:false,why:'O mensageiro chegou sem o ouro combinado.'};
  if(honorOf(team)<40&&t.cost.gold&&!t.raised)return {ok:false,counter:{gold:Math.round(t.cost.gold*1.25)},why:'Com a fama que vocês têm, só por um preço maior.'};
  return {ok:true};
}

// ---------------------------------------------------------------- the messenger: a scout (or an envoy) takes the proposal to the town
function messengerFor(team){
  const c=castleOf(team);if(!c)return null;
  let best=null,bd=1e9;
  for(const u of S.ents){
    if(u.dead||u.team!==team||u.kind!=='scout'||u.svc||u.sq&&sqLeads(u))continue;
    if(u.order&&(u.order.type==='attack'||u.order.type==='sweep'))continue;
    if(team===1&&u.cmdT&&S.t-u.cmdT<20)continue;
    const d=hyp(u.x-c.x,u.y-c.y);if(d<bd){bd=d;best=u;}
  }
  return best;
}
// team proposes a contract to a town: 'ok' or why not
function proposeContract(team,kind,townI,o){
  const T=S.towns&&S.towns[townI];if(!T)return 'notown';
  o=o||{};
  const t=ctrTerms(kind,T,team,o);
  if(kind!=='help'&&kind!=='liberate'&&CTR[kind].need>friendOf(T,team)+(favOf(T,team)>0?1:0))return 'rep';
  if(!afford(team,t.cost))return 'cost';
  if((kind==='protect'||kind==='loyalty'||kind==='route'||kind==='garrison')&&activeCtr(T,kind,team))return 'dup';
  if(svcList().list.some(m=>m.state==='run'&&m.type==='contract'&&m.team===team&&m.town===townI))return 'busy';
  const scout=messengerFor(team);
  const m=svcNew('contract',team,{town:townI,who:o.who||(team===1?'Você':'Reino Vermelho'),extra:{terms:t,scoutId:scout?scout.id:0}});
  if(!m)return 'fail';
  m.escN=0;m.risk=svcRisk(m,0)*(scout?.7:1);
  m.eta=hyp(m.to.x-m.from.x,m.to.y-m.from.y)*2.9/(scout?DEF.scout.speed:DEF.diplomat.speed)+30;
  return svcStart(m);
}
// the town said yes: pay and set it in motion
function ctrActivate(team,t,o){
  const T=S.towns[t.town];o=o||{};
  if(o.price)t.cost=o.price;
  if(t.outbid){const oc=ctrList().find(c=>c.id===t.outbid);if(oc&&oc.state==='active')ctrEnd(oc,'outbid');}
  pay(team,t.cost);T.gold=(T.gold||0)+(t.cost.gold||0);
  const c={id:(S.cn=(S.cn||0)+1),kind:t.kind,team,town:T.i,t0:S.t,end:t.dur?S.t+t.dur:0,ids:[],state:'active',terms:t,strikes:0,paid:t.cost.gold||0,next:S.t+(t.period||0)};
  const st=S.teams[team].stats;c.last={wood:st.wood,food:st.food,gold:st.gold};
  ctrList().push(c);
  if(t.kind==='merc'||t.kind==='mercLife'||t.kind==='hero'){
    const home=homePoint(team)||{x:T.x,y:T.y};
    for(let i=0;i<t.n;i++){
      const p=walkNear(T.x+(i-1.5)*22,T.y+16),u=spawnUnit(t.unit,team,p.x,p.y,{ctr:c.id,from:T.i});
      u.nm=FOLK[(c.id*5+i*3)%FOLK.length];
      if(t.kind==='hero'){u.title=DEF[t.unit].name;T.heroOut=team;}
      u.order={type:'move',x:home.x+(i-1.5)*20,y:home.y+30};c.ids.push(u.id);
    }
  }else if(t.kind==='garrison'){
    const posts=garrisonPosts(team,t.n);
    for(let i=0;i<t.n;i++){
      const p=walkNear(T.x+(i-1.5)*22,T.y+16),q=posts[i%posts.length];
      const u=spawnUnit(t.unit,0,p.x,p.y,{town:T.i,ctr:c.id,home:{x:T.x,y:T.y}});u.nm=FOLK[(c.id*5+i*3)%FOLK.length];
      u.aid={team,foes:[team===1?2:1,3],until:c.end,x:q.x,y:q.y,t0:S.t,post:true};u.order={type:'move',x:q.x,y:q.y};c.ids.push(u.id);
    }
  }else if(t.kind==='route'){c.next=S.t+12;c.left=t.left;}
  else if(t.kind==='liberate'){
    const old=T.owner;T.owner=team;T.loyal=55;T.rep[team]=Math.max(T.rep[team]||0,2);
    for(const k of ctrList())if(k.state==='active'&&k.town===T.i&&k.team===old)ctrEnd(k,'outbid');
    c.state='ended';c.why='done';HOOK.town(T,'freed',team,old);
  }
  if(t.kind!=='liberate')addRep(T,team,.4);
  HOOK.ctr('start',c);
  return c;
}
// where a garrison stands guard: towers and gates first, then around the castle
function garrisonPosts(team,n){
  const c=castleOf(team),out=[];
  for(const b of BLDS)if(!b.dead&&b.team===team&&b.built&&(b.kind==='tower'||b.kind==='gate')){out.push(walkNear(b.x,b.y+18));if(out.length>=n)break;}
  for(let k=0;out.length<n&&c;k++){const a=k*2.2+.4;out.push(walkNear(c.x+Math.cos(a)*7*TS,c.y+Math.sin(a)*5*TS));}
  return out.length?out:[{x:0,y:0}];
}
// production share: a part of everything gathered since the last payment
function ctrTribute(c){
  const TT=S.teams[c.team],st=TT.stats,T=S.towns[c.town],t=c.terms;
  const due={};let val=0;
  for(const k of['wood','food','gold']){const d=Math.max(0,(st[k]-(c.last[k]||0))*t.pct);due[k]=Math.floor(d);val+=due[k];}
  c.last={wood:st.wood,food:st.food,gold:st.gold};
  if(val<t.min)due.gold=(due.gold||0)+(t.min-val);
  for(const k in due)if(!due[k])delete due[k];
  if(!afford(c.team,due)){
    c.strikes++;HOOK.ctr('unpaid',c);
    if(c.strikes>=2){addHonor(c.team,-10,'unpaid');ctrEnd(c,'unpaid');}
    return;
  }
  pay(c.team,due);c.strikes=0;
  T.gold=(T.gold||0)+(due.gold||0);T.stock.wood+=due.wood||0;T.stock.food+=due.food||0;
  const sum=Object.values(due).reduce((a,b)=>a+b,0);c.paid=(c.paid||0)+sum;
  addRep(T,c.team,c.kind==='loyalty'?.15:.06);
  HOOK.ctr('tribute',c,due);
}
// the end of a contract: done, broken by the kingdom, unpaid, outbid by the other kingdom, or everyone died
function ctrEnd(c,why){
  if(c.state!=='active')return;
  c.state='ended';c.why=why;c.t1=S.t;
  const T=S.towns[c.town];
  for(const id of c.ids){
    const u=byId.get(id);if(!alive(u))continue;
    if(c.kind==='merc'||c.kind==='garrison'||(why==='outbid'&&c.kind!=='mercLife'&&c.kind!=='hero')){
      // they go back to their town
      u.team=0;u.ctr=0;u.town=c.town;u.sq=0;u.aid=null;u.leaving=S.t;u.svc=null;u.rank=u.rank||0;
      u.order={type:'move',x:T.x,y:T.y};u.path=null;
    }
  }
  if(c.kind==='hero'){T.heroOut=0;T.heroCd=S.t+240;}
  if(why==='done'){addHonor(c.team,3,'kept');addRep(T,c.team,.3);}
  else if(why==='broken'){addHonor(c.team,-15,'broken');addRep(T,c.team,-1);}
  HOOK.ctr('end',c);
}
function ctrRenew(cid){
  const c=ctrList().find(k=>k.id===cid);if(!c||c.state!=='active'||!c.end)return 'gone';
  const T=S.towns[c.town],base=c.kind==='route'?{}:{gold:Math.round((c.terms.cost.gold||0)*.9)};
  if(!afford(c.team,base))return 'cost';
  pay(c.team,base);T.gold=(T.gold||0)+(base.gold||0);c.paid+=base.gold||0;
  c.end+=c.terms.dur;c.renewAsked=false;c.renewals=(c.renewals||0)+1;if(c.kind==='route')c.left+=c.terms.left;
  for(const id of c.ids){const u=byId.get(id);if(alive(u)&&u.aid)u.aid.until=c.end;}
  addRep(T,c.team,.3);HOOK.ctr('renew',c);
  return 'ok';
}
function ctrCancel(cid){const c=ctrList().find(k=>k.id===cid);if(!c||c.state!=='active')return 'gone';ctrEnd(c,'broken');return 'ok';}
const ctrLeft=c=>c.end?Math.max(0,c.end-S.t):Infinity;

// ---------------------------------------------------------------- the fixed route: a town caravan comes on schedule
function routeCaravan(c){
  const T=S.towns[c.town],home=homePoint(c.team);if(!home)return;
  const p=walkNear(T.x,T.y+14),cart=spawnUnit('cart',0,p.x,p.y,{town:T.i,route:c.id,load:{k:c.terms.res,n:c.terms.n},neutralCart:true,face:home.x<p.x?-1:1});
  cart.nm='carroça de '+T.name;cart.dest={x:home.x,y:home.y};cart.order={type:'haul'};
  const g=spawnUnit(eliteOf(T),0,p.x+16,p.y+8,{town:T.i,home:{x:T.x,y:T.y},guardOf:cart.id});g.order=null;
  cart.guards=[g.id];
}

// ---------------------------------------------------------------- conquest: a kingdom may take a town by force
// who the town's own people fight: bandits, whoever they were sent against, and whoever attacks their town
function neuFoes(u){
  const f=u.aid&&S.t<u.aid.until?u.aid.foes.slice():[3];
  if(u.town!=null&&S.towns){const T=S.towns[u.town];if(T){if(T.siege&&!f.includes(T.siege.team))f.push(T.siege.team);if(T.hostile&&S.t<T.hostile.until&&!f.includes(T.hostile.team))f.push(T.hostile.team);}}
  return f;
}
function townFoe(ti,team){const T=S.towns&&S.towns[ti];return !!T&&!!team&&((T.siege&&T.siege.team===team)||(T.hostile&&T.hostile.team===team&&S.t<T.hostile.until));}
function startConquest(team,ti){
  const T=S.towns[ti];if(!T||T.owner===team)return 'own';
  if(T.siege)return 'busy';
  T.siege={team,t:S.t,hold:0,last:S.t};
  addHonor(team,-15,'attack');
  for(const o of S.towns)if(o!==T)addRep(o,team,-.5);
  addRep(T,team,-5);
  for(const k of ctrList())if(k.state==='active'&&k.town===T.i&&k.team===team)ctrEnd(k,'broken');
  HOOK.town(T,'siege',team);
  return 'ok';
}
function townGuardsNear(T,r){let n=0;for(const e of S.ents){if(e.dead||e.team!==0||e.town!==T.i||!DEF[e.kind].mil||e.leaving||e.guardOf)continue;if(hyp(e.x-T.x,e.y-T.y)<r)n++;}return n;}
function siegeTick(T){
  const sg=T.siege,team=sg.team;
  let near=0;for(const e of S.ents){if(e.dead||e.team!==team||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;const d=hyp(e.x-T.x,e.y-T.y);if(d<6*TS)near++;if(d<20*TS)sg.last=S.t;}
  const guards=townGuardsNear(T,16*TS);
  if(!guards&&near>=4){sg.hold++;if(sg.hold>=15)conquer(T,team);}
  else sg.hold=Math.max(0,sg.hold-1);
  if(S.t-sg.last>60){T.siege=null;T.hostile={team,until:S.t+150};HOOK.town(T,'lifted',team);}
}
function conquer(T,team){
  const old=T.owner;T.owner=team;T.loyal=30;T.siege=null;T.hostile=null;T.rep[team]=Math.max(1,Math.min(T.rep[team]||0,2));
  addHonor(team,-10,'conquer');
  for(const o of S.towns)if(o!==T)addRep(o,team,-1);
  for(const k of ctrList())if(k.state==='active'&&k.town===T.i&&k.team!==team)ctrEnd(k,'outbid');
  HOOK.town(T,'conquered',team,old);
}
// a vassal pays tribute and sends guards; it grows loyal when protected, and rises up when neglected
function vassalTick(T){
  const team=T.owner;if(!team)return;
  let guard=0;for(const e of S.ents){if(e.dead||e.team!==team||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;if(hyp(e.x-T.x,e.y-T.y)<18*TS)guard++;}
  T.loyal=clamp((T.loyal||30)+(guard>=3?.25:-.17)+(T.raid?-.15:0),0,100);
  T.tribT=(T.tribT||0)+10;
  if(T.tribT>=60){T.tribT=0;const g=Math.min(Math.floor(T.gold||0),20+(T.lvl||1)*10);if(g>0){T.gold-=g;S.teams[team].res.gold+=g;S.teams[team].stats.gold+=g;HOOK.town(T,'tribute',team,g);}}
  if(T.loyal<15&&guard===0){
    T.owner=0;T.rep[team]=0;T.hostile={team,until:S.t+180};
    HOOK.town(T,'revolt',team);
  }
}
function townFestival(team,ti){
  const T=S.towns[ti],cost={food:100,gold:50};
  if(!T||T.owner!==team)return 'own';if(S.t<(T.festT||0))return 'wait';if(!afford(team,cost))return 'cost';
  pay(team,cost);T.loyal=clamp((T.loyal||30)+12,0,100);T.festT=S.t+150;T.stock.food+=100;HOOK.town(T,'festival',team);
  return 'ok';
}

// ---------------------------------------------------------------- a kingdom outbids the other for a town (the auction)
function bidFor(team,ti){
  const T=S.towns[ti],other=team===1?2:1,oc=activeCtr(T,'loyalty',other)||activeCtr(T,'protect',other);
  if(!oc)return null;
  const offer=Math.round(260+140*friendOf(T,team)+(oc.kind==='loyalty'?160:60));
  return {town:ti,team,offer,oc:oc.id,cover:Math.round(offer*.55),kind:oc.kind};
}
function bidResolve(b,covered){
  const T=S.towns[b.town],oc=ctrList().find(c=>c.id===b.oc),other=b.team===1?2:1;
  if(!oc||oc.state!=='active')return 'gone';
  if(covered){
    if(!afford(other,{gold:b.cover}))return 'cost';
    pay(other,{gold:b.cover});T.gold=(T.gold||0)+b.cover;addRep(T,other,.5);oc.paid+=b.cover;
    HOOK.ctr('kept',oc,b);return 'kept';
  }
  // the town weighs gold, friendship, favours, fear and honour
  const fe=fearOf(T,b.team)-fearOf(T,other);
  const p=clamp(.2+b.offer/900+.08*(friendOf(T,b.team)-friendOf(T,other))-.1*favOf(T,other)+.1*fe+(honorOf(b.team)-honorOf(other))/250,.05,.9);
  if(Math.random()<p&&afford(b.team,{gold:b.offer})){
    ctrEnd(oc,'outbid');
    const t=ctrTerms(oc.kind,T,b.team);t.cost={gold:b.offer};t.outbid=0;
    ctrActivate(b.team,t);HOOK.ctr('lost',oc,b);return 'switched';
  }
  addRep(T,other,.2);HOOK.ctr('stayed',oc,b);return 'stayed';
}
// a big army close by makes a town nervous
function fearOf(T,team){let n=0;for(const e of S.ents){if(e.dead||e.team!==team||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;if(hyp(e.x-T.x,e.y-T.y)<22*TS)n++;}return Math.min(1,n/10);}

// ---------------------------------------------------------------- once per second
function diploTick(dt){
  if(!S.towns||!S.towns.length)return;
  S.dipT=(S.dipT||0)+dt;if(S.dipT<1)return;S.dipT=0;
  for(const c of ctrList()){
    if(c.state!=='active')continue;
    const T=S.towns[c.town];if(!T){c.state='ended';continue;}
    c.ids=c.ids.filter(id=>alive(byId.get(id)));
    if((c.kind==='mercLife'||c.kind==='hero'||c.kind==='merc')&&!c.ids.length){ctrEnd(c,'dead');continue;}
    if(c.end&&S.t>=c.end&&!(c.kind==='route'&&c.left>0&&S.t<c.end+120)){ctrEnd(c,'done');continue;}
    if(c.end&&!c.renewAsked&&c.end-S.t<=60&&(c.kind==='merc'||c.kind==='garrison'||c.kind==='route')){
      c.renewAsked=true;
      if(c.team===1){const cost=c.kind==='route'?{}:{gold:Math.round((c.terms.cost.gold||0)*.9)};
        ask({kind:'renew',cid:c.id,cost,who:`${T.name} avisa`,av:'av14',loc:{x:T.x,y:T.y},text:`${CTR[c.kind].name} com ${T.name} termina em 1 minuto. Renovar por mais ${Math.round(c.terms.dur/60)} minutos${cost.gold?` por ${cost.gold} de ouro (10% de desconto para cliente fiel)`:''}?`});}
      else if(S.ai&&(S.ai.attacking||S.ai.defending)&&afford(2,{gold:Math.round((c.terms.cost.gold||0)*.9)+150}))ctrRenew(c.id);
    }
    if((c.kind==='protect'||c.kind==='loyalty')&&S.t>=c.next){c.next=S.t+c.terms.period;ctrTribute(c);if(c.state!=='active')continue;}
    // protection and alliance: guards come by themselves when the kingdom is attacked
    if(c.kind==='protect'||c.kind==='loyalty'){
      const ua=underAttack(c.team);
      if(ua&&S.t>(c.helpT||0)){
        const U=townUnits(T),n=Math.min(Math.max(0,U.g.length+U.a.length-1),2+(T.lvl||1));
        if(n>0){sendHelp(T,c.team,ua.foe,ua.p,n,true);c.helpT=S.t+110;HOOK.ctr('help',c,n);}
      }
      // the sworn town sends troops to its ally's war
      if(c.kind==='loyalty'&&S.t>(c.warT||0)){
        const foe=castleOf(c.team===1?2:1);
        if(foe){let n=0,sx=0,sy=0;for(const e of S.ents){if(e.dead||e.team!==c.team||!DEF[e.kind].mil||!DEF[e.kind].unit)continue;if(hyp(e.x-foe.x,e.y-foe.y)<18*TS){n++;sx+=e.x;sy+=e.y;}}
          if(n>=6){const U=townUnits(T),k=Math.min(Math.max(0,U.g.length+U.a.length-2),2+(T.lvl||1));if(k>0){sendHelp(T,c.team,c.team===1?2:1,{x:sx/n,y:sy/n},k,true);c.warT=S.t+180;HOOK.ctr('war',c,k);}}}
      }
    }
    if(c.kind==='route'&&c.left>0&&S.t>=c.next){c.next=S.t+c.terms.period;c.left--;routeCaravan(c);}
  }
  for(const T of S.towns){if(T.siege)siegeTick(T);}
  S.vasT=(S.vasT||0)+1;if(S.vasT>=10){S.vasT=0;for(const T of S.towns)if(T.owner)vassalTick(T);}
  // town soldiers sent home walk back and rejoin their town
  for(const u of S.ents){
    if(u.dead||!u.leaving)continue;const T=S.towns[u.town];
    if(!T||hyp(u.x-T.x,u.y-T.y)<60||S.t-u.leaving>100)removeQuiet(u);
    else if(!u.order)u.order={type:'move',x:T.x,y:T.y};
  }
  // route caravans: arrive, pay, unload
  for(const u of S.ents){
    if(u.dead||u.kind!=='cart'||!u.route)continue;
    const c=ctrList().find(k=>k.id===u.route);
    if(!c){removeQuiet(u);continue;}
    if(u.dest&&hyp(u.x-u.dest.x,u.y-u.dest.y)<60){
      const T=S.towns[c.town],TT=S.teams[c.team];
      if(c.state==='active'&&afford(c.team,c.terms.pay)){
        pay(c.team,c.terms.pay);TT.res[c.terms.res]+=c.terms.n;TT.stats[c.terms.res]+=c.terms.n;
        for(const k in c.terms.pay){if(k==='gold')T.gold=(T.gold||0)+c.terms.pay[k];else T.stock[k]=(T.stock[k]||0)+c.terms.pay[k];}
        T.stock[c.terms.res]=Math.max(40,(T.stock[c.terms.res]||0)-c.terms.n);c.delivered=(c.delivered||0)+1;
        HOOK.ctr('route',c,u);
      }else{c.strikes++;HOOK.ctr('routeUnpaid',c,u);if(c.strikes>=2){addHonor(c.team,-6,'unpaid');ctrEnd(c,'unpaid');}}
      for(const id of u.guards||[]){const g=byId.get(id);if(alive(g)){g.leaving=S.t;g.order={type:'move',x:T.x,y:T.y};}}
      removeQuiet(u);
    }
  }
}
// a town cart walks the road on its own; its guards keep close
function doHaul(u,dt){
  if(!u.dest){u.order=null;return;}
  if(hyp(u.x-u.dest.x,u.y-u.dest.y)<40){u.moving=false;return;}
  u.rp=(u.rp||0)-dt;
  if((!u.path&&!u.detour)||u.rp<=0){u.rp=4;if(pathToPoint(u,u.dest.x,u.dest.y,false)===0){u.badHaul=(u.badHaul||0)+1;if(u.badHaul>4)removeQuiet(u);}}
  followPath(u,dt);
}
function cartGuardBrain(u){
  const c=byId.get(u.guardOf);
  if(!alive(c)){u.guardOf=0;u.leaving=S.t;return;}
  const th=pickTarget(u,200,{unitsOnly:true});
  if(th){u.order={type:'attack',id:th.id,auto:true,ax:c.x,ay:c.y};return;}
  if(hyp(u.x-c.x,u.y-c.y)>40)u.order={type:'move',x:c.x-(c.face||1)*20,y:c.y+12};
}
