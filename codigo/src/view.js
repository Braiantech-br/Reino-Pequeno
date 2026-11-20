// ================================================================ view: sprites, terrain, effects, minimap
const cv=document.getElementById('game');
let ctx=cv.getContext('2d');
const cam={x:0,y:0,z:1.4};
let DPR=1,VW=1,VH=1;
function P(){ctx.beginPath();}
function fs(fill,stroke,lw){if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=lw||1.5;ctx.strokeStyle=stroke;ctx.stroke();}}
function circ(x,y,r,f,s,lw){P();ctx.arc(x,y,Math.max(.1,r),0,Math.PI*2);fs(f,s,lw);}
function ell(x,y,rx,ry,f,s,lw){P();ctx.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);fs(f,s,lw);}
function rr(x,y,w,h,r,f,s,lw){r=Math.max(0,Math.min(r,w/2,h/2));P();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();fs(f,s,lw);}
function line(x1,y1,x2,y2,col,lw){P();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=lw||1;ctx.stroke();}
function shadow(x,y,rx,ry){ell(x,y,rx,ry,'rgba(25,45,20,.28)');}
const TEAMC={0:'#e8e2d0',1:'#4a76d8',2:'#d6453a',3:'#8a5cc0'};

// ---------------------------------------------------------------- sprites (Tiny Swords)
// [frameW, frameH, frames, bboxX0, bboxY0, bboxX1, bboxY1]
const META=/*META*/{};
const SPS=.5; // sprite px -> world units (64px tile = one 32-unit map tile)
const IMG={};let assetsReady=false;
function loadAssets(done){
  const keys=[...Object.keys(META),'tiles1','tiles2','tiles3','tiles4','tiles5'];let left=keys.length,failed=0;
  for(const k of keys){
    const im=new Image();
    im.onload=()=>{IMG[k]=im;if(--left===0)done(failed===0);};
    im.onerror=()=>{failed++;if(--left===0)done(false);};
    im.src='assets/'+k+'.png';
  }
}
function spr(key,frame,x,y,o){
  const im=IMG[key],m=META[key];if(!im||!m)return false;
  o=o||{};
  const s=(o.s||1)*SPS,fw=m[0],fh=m[1],f=((frame|0)%m[2]+m[2])%m[2];
  const ax=o.ax!=null?o.ax:(m[3]+m[5])/2,ay=o.ay!=null?o.ay:m[6];
  ctx.save();ctx.translate(x,y);
  if(o.flip)ctx.scale(-1,1);
  if(o.alpha!=null)ctx.globalAlpha*=o.alpha;
  ctx.drawImage(im,f*fw,0,fw,fh,-ax*s,-ay*s,fw*s,fh*s);
  ctx.restore();
  return true;
}
const pre=t=>t===2?'r_':t===3?'k_':'b_';
// a look with v keeps the team colours and swaps the metal or the hair (see the generated sprite sheets)
function skin(e){const L=DEF[e.kind].look;return L?(L.f?fgPre(L.f,e.team):L.v?(e.team===2?'r':e.team===3?'k':'b')+L.v+'_':L.skin==='b'?pre(e.team):L.skin+'_'):pre(e.team);}
const UNIT_ANCHOR={merchant:[99,136,1],pawn:[96,136,1],warrior:[96,137,1],archer:[94,136,1],lancer:[150,198,.85],monk:[96,134,1]};
function unitAnim(e){
  const k=baseKind(e.kind),p=skin(e);
  if(k==='merchant')return [e.moving?'m_run':'m_idle',e.moving?12:8];
  if(k==='pawn'){
    if(e.anim==='build')return [p+'pawn_hammer',10];
    if(e.anim==='rest')return [p+'pawn_idle_food',6];
    if(e.anim==='work'){
      const o=e.order,res=o&&o.res;
      if(res==='gold')return [p+'pawn_pick',10];
      if(res==='food'){const s=byId.get(o.id),fm=s&&(s.kind==='farm'||s.kind==='tfarm');return [fm?p+'pawn_pick':p+'pawn_knife',fm?8:10];}
      return [p+'pawn_axe',10];
    }
    if(e.atkT>0){const L=DEF[e.kind].look,w=L&&L.atk;return [p+(w==='axe'?'pawn_axe':w==='pick'?'pawn_pick':'pawn_knife'),0];}
    const c=e.carry&&e.carry.amt?'_'+e.carry.type:'';
    return [p+(e.moving?'pawn_run':'pawn_idle')+c,e.moving?12:8];
  }
  if(k==='monk'){
    if(e.anim==='cast')return [p+'monk_atk',12];
    if(e.atkT>0)return [p+'monk_atk',0];
    return [p+(e.moving?'monk_run':'monk_idle'),e.moving?10:8];
  }
  if(e.atkT>0)return [p+k+'_atk',0];
  return [p+k+(e.moving?'_run':'_idle'),e.moving?12:8];
}
function drawUnit(e){
  const D=DEF[e.kind],an=UNIT_ANCHOR[baseKind(e.kind)],era=e.team<3?eraOf(e.team):1,sc=an[2]*(D.look&&D.look.s||1);
  // era auras: elite and legendary troops, glowing monks
  if(e.hero){const p=.5+.5*Math.sin(AT*4+e.id);ell(0,0,D.r+8,(D.r+8)*.42,`rgba(255,214,90,${.25+.2*p})`,'#ffd84a',2);}
  if(D.thero){const p=.5+.5*Math.sin(AT*3+e.id);ell(0,0,D.r+9,(D.r+9)*.42,`rgba(255,226,120,${.18+.18*p})`,TEAMC[e.team]||'#ffd84a',2.4);ell(0,0,D.r+13,(D.r+13)*.42,null,`rgba(255,214,90,${.35+.3*p})`,1.4);}
  if(e.trader&&!e.moving)drawStallBack(e);
  if(D.mil&&era>=4){
    const col=D.holy?(era>=5?'rgba(255,214,90,.45)':'rgba(140,200,255,.4)'):(era>=5?'rgba(255,214,90,.35)':'rgba(255,255,255,.18)');
    ell(0,0,D.r+6+Math.sin(AT*4+e.id)*1.5,(D.r+6)*.42,col);
  }
  const FL=D.look&&D.look.f&&FGR[D.look.f];
  if(FL)fgBack(e,FL,sc);
  shadow(0,0,D.r+2,3.4);
  // a converted creature keeps its looks, so mark whose side it is on now
  if((D.look&&D.look.skin||D.envoy)&&e.team!==3)ell(0,0,D.r+5,(D.r+5)*.42,null,TEAMC[e.team],2.5);
  if(D.aura){const p=.5+.5*Math.sin(AT*3+e.id);ell(0,0,D.r+10+(e.glowT>0?4:0),(D.r+10)*.42,`rgba(255,240,170,${(e.glowT>0?.35:.12)+.08*p})`,e.glowT>0?'rgba(255,230,140,.8)':null,1.5);}
  const [key,fps]=unitAnim(e),m=META[key];
  if(!assetsReady||!m){circ(0,-12,D.r,TEAMC[e.team],'#2b2232',2);return;}
  const frame=fps?Math.floor(AT*fps+e.id*1.7):Math.min(m[2]-1,Math.floor((1-Math.max(0,e.atkT)/.45)*m[2]));
  if(e.hitT>0)ctx.filter='brightness(1.9)';
  if(e.stunT>0)ctx.filter='saturate(.2) brightness(1.3)';
  spr(key,frame,0,0,{ax:an[0],ay:an[1],s:sc,flip:(e.face||1)<0,alpha:FL&&FL.alpha});
  ctx.filter='none';
  if(FL)fgFront(e,FL,sc);
  if(e.trader&&!e.moving)drawStallFront(e,sc);
  if(e.stunT>0)for(let i=0;i<3;i++){const a=AT*6+i*2.1;circ(Math.cos(a)*9,-44+Math.sin(a)*3,2.2,'#ffe066');}
  if(e.kind==='pawn'&&e.team===1){
    const hy=-46*sc;
    if(e.anim==='rest'){rr(-9,hy-16,18,14,5,'#fff6dd','#2b2232',1.3);rr(-4,hy-13,7,9,1.5,'#f2c230','#6b4a10',1);rr(3,hy-11,2.5,5,1,null,'#6b4a10',1);circ(-.5,hy-13,2.8,'#fffbe8');}
    else if((e.fat||0)>.85){const b=Math.sin(AT*5+e.id)*1.2;P();ctx.moveTo(8,hy+4+b);ctx.quadraticCurveTo(12,hy+11+b,8,hy+12+b);ctx.quadraticCurveTo(4,hy+11+b,8,hy+4+b);fs('#7fd4ff','#2b5a8a',1);}
    else if(e.freshT>0&&Math.sin(AT*2+e.id)>.6){P();ctx.moveTo(9,hy+10);ctx.lineTo(13,hy+4);ctx.lineTo(17,hy+10);ctx.closePath();fs('#7be06a','#2f6a24',1);}
  }
  if(e.kind==='envoyN'){const hy=-50*sc+Math.sin(AT*3+e.id)*1.5;rr(-8,hy-6,16,9,3,'#fff2d0','#8a6a40',1.2);circ(-8,hy-1.5,2.6,'#e7d7b0','#8a6a40',1);circ(8,hy-1.5,2.6,'#e7d7b0','#8a6a40',1);rr(-3,hy-3,6,4,1,'#d6453a');}
  if(e.aid&&S.t<e.aid.until){const hy=-50*sc;line(9,hy+12,9,hy-4,'#2b2232',1.3);P();ctx.moveTo(9,hy-4);ctx.lineTo(18,hy-1);ctx.lineTo(9,hy+2);ctx.closePath();fs(TEAMC[e.aid.team]||'#fff','#2b2232',1);}
  if(e.supT>S.t){const hy=-46*sc;circ(-11,hy,4,'#f2c230','#6b4a10',1.1);line(-13,hy,-9,hy,'#6b4a10',1.3);line(-11,hy-2,-11,hy+2,'#6b4a10',1.3);}
  if(e.medic){const hy=-48*sc;rr(-7,hy-7,14,14,3,'#ffffff','#2b2232',1.3);rr(-1.8,hy-5,3.6,10,1,'#e0302a');rr(-5,hy-1.8,10,3.6,1,'#e0302a');}
  if(e.kind==='engineer'){const hy=-31*sc+(e.moving?Math.sin(AT*20)*.6:0),hx=(e.face||1)<0?1:-1;P();ctx.ellipse(hx,hy,9,6,0,Math.PI,0);fs('#ffcf3a','#6b4a10',1.3);rr(hx-11,hy-1,22,3,1.5,'#ffcf3a','#6b4a10',1);}
  if(e.order&&e.order.type==='gift'&&e.anim==='talk'){
    // talking terms with the bandits: a speech bubble and a bag of gifts
    const q=Math.min(1,(e.order.t||0)/3.5);
    rr(-15,-66,30,18,7,'#fff6dd','#2b2232',1.6);P();ctx.moveTo(-4,-48);ctx.lineTo(0,-42);ctx.lineTo(4,-48);ctx.closePath();fs('#fff6dd');
    for(let i=0;i<3;i++)circ(-7+i*7,-57,2.2,Math.floor(AT*3)%3===i?'#2b2232':'#9a8a70');
    rr(-14,-72,28,4,2,'rgba(30,20,20,.6)');rr(-14,-72,28*q,4,2,'#ffd84a');
  }
  if(e.kind==='wizard'&&Math.sin(AT*3+e.id)>.3){const a=AT*5+e.id,fx=(e.face||1)*10;circ(fx+Math.cos(a)*3,-30*sc+Math.sin(a)*3,1.8,'#ffb347');circ(fx-Math.cos(a)*3,-30*sc-Math.sin(a)*3,1.3,'#ffe28a');}
  if(e.healT>0){const fk=(e.kind==='wizard'||D.look&&(D.look.v||D.look.f)?pre(e.team):skin(e))+'monk_fx';spr(fk,Math.floor(AT*14+e.id),0,4,{s:.7,alpha:.85});}
  if(D.king||D.boss&&!D.wild&&e.kind!=='captain')drawCrown(0,-44*sc-(baseKind(e.kind)==='lancer'?10:0)+Math.sin(AT*2)*1,1,D.king?'#ffd84a':'#ff8a6a');
}
// a cart of the delivery services: the driver pulls it, the load shows what it carries
function drawCart(e){
  const f=(e.face||1)<0?-1:1,tc=e.neutralCart?'#e3b23c':TEAMC[e.team]||'#888',L=e.load,mv=e.moving;
  shadow(0,0,24,6);
  if(e.team&&e.team!==3)ell(0,0,26,10,null,TEAMC[e.team],2);
  const bob=mv?Math.abs(Math.sin(AT*8))*.7:0,roll=mv?AT*6:0;
  ctx.save();if(e.hitT>0)ctx.filter='brightness(1.7)';ctx.translate(-f*6,-bob);ctx.scale(f,1);
  line(10,-15,24,-12,'#5a3a1a',2.2);line(10,-11,24,-9,'#5a3a1a',2.2);
  // the load
  const k=L&&L.k;
  if(k==='wood'){for(const[x,y]of[[-12,-22],[-2,-22],[8,-22],[-7,-28],[3,-28]]){rr(x-5,y-3,13,7,3.2,'#9a6a35','#3a2614',1.2);circ(x+7,y+.5,2.6,'#d8b27a','#3a2614',1);}}
  else if(k==='food'){ell(-10,-24,7,6,'#e7d7a8','#5a4a2a',1.3);ell(1,-25,7,6.5,'#efe0b5','#5a4a2a',1.3);ell(10,-22,6,5,'#e05a4a','#6a2a20',1.3);line(-10,-30,-10,-28,'#5a4a2a',1.2);line(1,-31,1,-29,'#5a4a2a',1.2);}
  else if(k==='gold'){rr(-14,-30,20,12,3,'#8a5a2b','#3a2614',1.3);rr(-14,-30,20,4,2,'#b07a3a','#3a2614',1);for(const[x,y]of[[9,-22],[12,-25],[6,-26],[10,-28]])circ(x,y,2.6,'#ffd84a','#8a6a10',1);}
  else if(k==='arms'){rr(-15,-29,13,11,2,'#7a4f26','#2b2232',1.3);rr(-1,-29,13,11,2,'#7a4f26','#2b2232',1.3);for(const x of[-8.5,5.5]){line(x-4,-27,x+4,-20,'#c9d2d6',1.6);line(x+4,-27,x-4,-20,'#c9d2d6',1.6);}line(-6,-36,10,-28,'#9aa3a8',2);circ(-6,-36,1.6,'#5a3a1a');}
  else if(k==='scroll'){rr(-10,-28,16,10,3,'#6b4423','#2b2232',1.3);rr(-6,-34,14,6,3,'#fff2d0','#8a6a40',1.2);circ(-6,-31,2.4,'#e7d7b0','#8a6a40',1);circ(8,-31,2.4,'#e7d7b0','#8a6a40',1);}
  else if(k==='silk'){rr(-15,-28,10,9,3,'#8a5cc0','#3a2650',1.2);rr(-5,-29,10,10,3,'#47aba9','#1f5250',1.2);rr(5,-27,9,8,3,'#d6453a','#5a1a14',1.2);rr(-10,-35,12,7,3,'#e3b23c','#6b4a10',1.1);}
  else if(k==='supply'){ell(-9,-24,7,6,'#e7d7a8','#5a4a2a',1.3);rr(-1,-30,13,11,2,'#7a4f26','#2b2232',1.3);ell(-2,-30,5,3,'#d8a55a','#6b4a10',1);}
  // the bed, the boards and the wheels
  rr(-19,-20,32,8,2,'#8a5a2b','#2b2232',1.6);rr(-19,-20,32,3,1.5,'#a8743f');
  line(-19,-24,-19,-14,'#5a3a1a',2);line(13,-24,13,-14,'#5a3a1a',2);
  for(const wx of[-12,7]){circ(wx,-7,7,'#6b4423','#2b2232',1.6);for(let q=0;q<3;q++){const a=roll+q*Math.PI/3;line(wx-Math.cos(a)*6,-7-Math.sin(a)*6,wx+Math.cos(a)*6,-7+Math.sin(a)*6,'#3a2614',1.2);}circ(wx,-7,1.8,'#c9c2b0','#2b2232',1);}
  line(-17,-20,-17,-42,'#2b2232',1.4);P();ctx.moveTo(-17,-42);ctx.lineTo(-7,-39);ctx.lineTo(-17,-36);ctx.closePath();fs(tc,'#2b2232',1);
  ctx.restore();ctx.filter='none';
  // the driver walks in front, pulling the shafts
  const key=e.neutralCart?(mv?'m_run':'m_idle'):pre(e.team)+(mv?'pawn_run':'pawn_idle');
  spr(key,Math.floor(AT*(mv?12:8)+e.id),f*22,0,{ax:96,ay:136,s:.92,flip:f<0});
}
// a neutral town: two yellow houses, a market stall under a striped awning, and its banner with the name
function drawTown(e){
  const D=DEF.town,bx=e.tx*TS,by=e.ty*TS,w=D.w*TS,h=D.h*TS,cx=bx+w/2,base=by+h+2;
  const T=S.towns&&S.towns[e.town];
  rr(bx+2,by+h*.42,w-4,h*.62,12,'rgba(214,190,140,.55)','rgba(150,120,80,.5)',1.5);
  if(assetsReady){spr('y_house3',0,bx+32,base-6,{s:.95});spr('y_house2',0,bx+w-30,base-10,{s:.9});}
  else{rr(bx+6,by+10,50,h-14,4,'#e3b23c','#2b2232',2);rr(bx+w-56,by+14,50,h-18,4,'#e3b23c','#2b2232',2);}
  // the stall
  const sx=cx-2,sy=base-10;
  line(sx-20,sy,sx-20,sy-30,'#5a3a1a',2.6);line(sx+20,sy,sx+20,sy-30,'#5a3a1a',2.6);
  for(let i=0;i<6;i++){P();ctx.moveTo(sx-26+i*8.7,sy-30);ctx.lineTo(sx-26+(i+1)*8.7,sy-30);ctx.lineTo(sx-24+(i+1)*8,sy-42);ctx.lineTo(sx-24+i*8,sy-42);ctx.closePath();fs(i%2?'#fff3cc':'#e3b23c','#6b4a10',1);}
  rr(sx-24,sy-14,48,9,3,'#a8743f','#3a2614',1.4);
  circ(sx-12,sy-17,4,'#e05a4a','#6a2a20',1);circ(sx-2,sy-18,4,'#9fd36a','#3a6a20',1);rr(sx+5,sy-22,11,8,2,'#7a4f26','#2b2232',1.1);circ(sx+10,sy-24,2.4,'#ffd84a','#8a6a10',1);
  // banner and name
  const fx=cx+44,fy=by-6,wv=Math.sin(AT*3+e.id)*2;
  line(fx,base-12,fx,fy-26,'#3a2614',2.2);P();ctx.moveTo(fx,fy-26);ctx.lineTo(fx+22,fy-21+wv);ctx.lineTo(fx,fy-14);ctx.closePath();fs('#e3b23c','#6b4a10',1.3);
  ctx.font='700 9px system-ui, sans-serif';ctx.textAlign='center';ctx.fillStyle='#6b4a10';ctx.fillText('⚖',fx+8,fy-17+wv*.5);
  if(T){
    const side=loyalTo(T),own=T.owner,lab=`${T.name} · ${own?'vassala':TOWN_TITLE[T.lvl||1]}`;
    ctx.font='700 12px system-ui, sans-serif';const tw=ctx.measureText(lab).width+16+(side?14:0);
    const bg=own?(own===1?'rgba(222,232,255,.96)':'rgba(255,226,220,.96)'):'rgba(255,246,221,.95)',bd=own?TEAMC[own]:side?TEAMC[side]:'#6b4a10';
    rr(cx-tw/2,by-30,tw,18,8,bg,bd,own||side?2.2:1.6);ctx.fillStyle='#4a3208';ctx.textBaseline='middle';ctx.fillText(lab,cx+(side?7:0),by-21);ctx.textBaseline='alphabetic';
    if(side){const sx2=cx-tw/2+11,sy2=by-21;P();ctx.moveTo(sx2-5,sy2-5);ctx.lineTo(sx2+5,sy2-5);ctx.lineTo(sx2+5,sy2);ctx.quadraticCurveTo(sx2+4,sy2+5,sx2,sy2+6);ctx.quadraticCurveTo(sx2-4,sy2+5,sx2-5,sy2);ctx.closePath();fs(TEAMC[side],'#2b2232',1.1);}
    if(T.siege){const p=.5+.5*Math.sin(AT*6);ctx.globalAlpha=.35+.35*p;ell(cx,base-20,w*.62,h*.5,null,'#ff5a4a',3);ctx.globalAlpha=1;
      const q=Math.min(1,(T.siege.hold||0)/15);if(q>0){rr(cx-30,by-8,60,5,2,'rgba(30,20,20,.7)');rr(cx-30,by-8,60*q,5,2,TEAMC[T.siege.team]);}
      ctx.font='700 16px system-ui, sans-serif';ctx.lineWidth=3;ctx.strokeStyle='#2b2232';ctx.strokeText('⚔',cx,by-36);ctx.fillStyle='#ff6a5a';ctx.fillText('⚔',cx,by-36);}
  }
}
// siege engines are drawn by hand: a covered ram on wheels and a catapult whose arm swings when it fires
function drawSiege(e){
  const D=DEF[e.kind],f=(e.face||1)<0?-1:1,tc=TEAMC[e.team]||'#888',dk=shade(tc.length===7?tc:'#888888',-.35);
  shadow(0,0,D.r+8,5);
  if(e.team!==3&&e.team)ell(0,0,D.r+9,(D.r+9)*.4,null,tc,2);
  ctx.save();if(e.hitT>0)ctx.filter='brightness(1.7)';ctx.scale(f,1);
  const roll=e.moving?AT*7:0,wheel=(x)=>{circ(x,-6,6.5,'#6b4423','#2b2232',1.6);for(let k=0;k<3;k++){const a=roll+k*Math.PI/3;line(x-Math.cos(a)*5.5,-6-Math.sin(a)*5.5,x+Math.cos(a)*5.5,-6+Math.sin(a)*5.5,'#3a2614',1.3);}circ(x,-6,1.8,'#c9c2b0','#2b2232',1);};
  const bob=e.moving?Math.abs(Math.sin(AT*7))*.8:0;ctx.translate(0,-bob);
  if(e.kind==='ram'){
    // the log swings out of the front when it strikes
    const hit=e.atkT>0?Math.sin((1-e.atkT/.45)*Math.PI)*12:0;
    rr(-22,-15,44,7,2,'#7a4f26','#2b2232',1.6);
    P();ctx.moveTo(-23,-14);ctx.lineTo(-15,-36);ctx.lineTo(15,-36);ctx.lineTo(23,-14);ctx.closePath();fs(dk,'#2b2232',1.8);
    P();ctx.moveTo(-17,-15);ctx.lineTo(-11,-33);ctx.lineTo(11,-33);ctx.lineTo(17,-15);ctx.closePath();fs(tc);
    for(let k=-1;k<=1;k++)line(k*7,-33,k*9,-15,'rgba(30,20,20,.35)',1.4);
    rr(-16,-38,32,4,2,'#8a5a2b','#2b2232',1.3);
    // the battering log hangs under the roof and sticks out at the front, with an iron head
    line(-6,-30,-6+hit*.4,-21,'#3a2614',1.3);line(8,-30,8+hit*.4,-21,'#3a2614',1.3);
    rr(-18+hit,-24,48,8,3.5,'#9a6a35','#2b2232',1.6);for(let k=0;k<3;k++)line(-8+hit+k*12,-24,-8+hit+k*12,-16,'rgba(40,25,10,.35)',1.2);
    P();ctx.moveTo(29+hit,-26.5);ctx.lineTo(38+hit,-23.5);ctx.lineTo(41+hit,-20);ctx.lineTo(38+hit,-16.5);ctx.lineTo(29+hit,-13.5);ctx.closePath();fs('#9aa3a8','#2b2232',1.6);circ(33+hit,-20,1.5,'#e7ecef');
    wheel(-14);wheel(14);
  }else{
    const cdMax=D.cd,c=e.cd||0;let k=0;
    if(e.atkT>0)k=1-e.atkT/.45;else if(c>cdMax-.45)k=1;else if(c>1)k=Math.min(1,(c-1)/(cdMax-1.45));
    rr(-19,-14,38,6,2,'#7a4f26','#2b2232',1.6);
    line(-6,-13,1,-31,'#6b4423',3.4);line(8,-13,1,-31,'#6b4423',3.4);rr(-3,-33,8,4,1.5,'#8a5a2b','#2b2232',1.2);
    const th=2.9+(4.95-2.9)*k,ax=-2,ay=-15,L=27,bx=ax+Math.cos(th)*L,by=ay+Math.sin(th)*L;
    line(ax,ay,bx,by,'#2b2232',5);line(ax,ay,bx,by,'#9a6a35',3);
    circ(bx,by,4.6,'#6b4423','#2b2232',1.4);
    if(k<.15)circ(bx,by-2.5,3.6,'#8c8678','#2b2232',1.2);
    circ(ax,ay,2.2,'#c9c2b0','#2b2232',1);
    line(1,-31,1,-44,'#2b2232',1.4);P();ctx.moveTo(1,-44);ctx.lineTo(11,-41);ctx.lineTo(1,-38);ctx.closePath();fs(tc,'#2b2232',1);
    wheel(-12);wheel(13);
  }
  ctx.restore();ctx.filter='none';
}
function drawSheep(e){
  const D=DEF[e.kind],a=D.art||'sheep',s=D.s||1;
  let key=a+'_idle',fps=8;
  if(e.moving){key=a+'_move';fps=10;}
  else if(!e.held&&hash(e.id)>.4){key=a+'_grass';fps=7;}
  shadow(0,0,9*s,3*s);
  if(a==='gsheep'&&!e.held){ctx.globalAlpha=.35+.2*Math.sin(AT*3+e.id);ell(0,-6,14,9,'#fff3a0');ctx.globalAlpha=1;}
  if(!spr(key,Math.floor(AT*fps+e.id*3),0,1,{flip:(e.face||1)<0,s}))circ(0,-8,8*s,'#fff','#555',1.5);
}
function drawCrown(x,y,s,col){
  ctx.save();ctx.translate(x,y);ctx.scale(s,s);
  P();ctx.moveTo(-8,0);ctx.lineTo(-9,-9);ctx.lineTo(-4,-4);ctx.lineTo(0,-11);ctx.lineTo(4,-4);ctx.lineTo(9,-9);ctx.lineTo(8,0);ctx.closePath();
  fs(col||'#ffd84a','#5a3a10',1.6);
  circ(0,-11,1.6,'#fff6c8');circ(-9,-9,1.3,'#fff6c8');circ(9,-9,1.3,'#fff6c8');circ(0,-3.5,1.6,'#d6453a');
  ctx.restore();
}
// the flag over a wild camp that holds a campaign item
function drawItemFlag(x,y,k){
  const I=ITEMS[k],b=Math.sin(AT*3)*3;
  line(x,y,x,y-30+b,'#2b2232',2);
  P();ctx.moveTo(x,y-30+b);ctx.lineTo(x+20,y-25+b);ctx.lineTo(x,y-19+b);ctx.closePath();fs('#4a76d8','#1d2f66',1.5);
  circ(x,y-38+b,9,'#fff6dd','#2b2232',2);
  ctx.font='700 12px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=I&&I.col||'#e9b434';ctx.fillText(I?I.glyph||'★':'★',x,y-37.5+b);ctx.textBaseline='alphabetic';
}
function buildingKey(e){
  const L=DEF[e.kind].look;if(L)return L.skin+'_'+L.base;
  if(e.kind==='house'){if(e.team===1)return 'b_house'+Math.min(3,e.level||1);const era=eraOf(e.team);return pre(e.team)+'house'+(era>=5?3:era>=3?2:1);}
  return pre(e.team)+e.kind;
}
function drawFarm(e){
  const r=rectOf(e),x0=r[0]+2,y0=r[1]+3,w=r[2]-4,h=r[3]-6,p=e.built?1:Math.max(.15,e.prog);
  ctx.save();ctx.globalAlpha=e.built?1:.5+.5*p;
  rr(x0,y0,w,h,5,'#a7713f','#6b4524',2);
  for(let i=1;i<5;i++)line(x0+3,y0+i*h/5,x0+w-3,y0+i*h/5,'#8a5b31',2);
  if(e.built){
    const ripe=e.worker?1:.75;
    for(let j=0;j<4;j++)for(let i=0;i<5;i++){
      const cx=x0+6+i*(w-12)/4,cy=y0+h*(j+.75)/4.4,sw=Math.sin(AT*2+i+j)*1.2;
      line(cx,cy,cx+sw,cy-7*ripe,'#6f9a2d',2);
      ell(cx+sw,cy-8*ripe,2.2,3.6,'#e6c34a');
    }
  }
  for(const[px,py]of[[x0,y0],[x0+w,y0],[x0,y0+h],[x0+w,y0+h]])rr(px-2,py-6,4,8,1,'#7a5230','#4a2d17',1);
  ctx.restore();
  // team flag
  line(x0+w-4,y0+2,x0+w-4,y0-12,'#4a2d17',1.6);
  P();ctx.moveTo(x0+w-4,y0-12);ctx.lineTo(x0+w+6,y0-9);ctx.lineTo(x0+w-4,y0-6);ctx.closePath();fs(TEAMC[e.team]);
}
// the market: a yellow merchant house with a striped stall full of goods
function drawMarket(e){
  const r=rectOf(e),x0=r[0],y0=r[1],w=r[2],h=r[3],base=y0+h+2,p=e.built?1:Math.max(.15,e.prog);
  ctx.save();ctx.globalAlpha=e.built?1:.45+.5*p;
  shadow(x0+w/2,base-2,w/2,7);
  spr('y_house2',0,x0+24,base-4,{s:.78});
  const sx=x0+38,sw=w-40,cy=base-20;
  // counter
  rr(sx,cy,sw,16,3,'#a8743f','#4a2d17',1.6);line(sx+2,cy+6,sx+sw-2,cy+6,'#7a4f2c',1.4);
  for(const px of[sx+3,sx+sw-3])line(px,cy+2,px,cy-30,'#4a2d17',2.6);
  // goods
  spr('res_meat',0,sx+12,cy+3,{s:.5});spr('res_wood',0,sx+sw/2,cy+3,{s:.5});spr('res_gold',0,sx+sw-11,cy+6,{s:.55});
  // striped awning in the owner's colour
  const ay=cy-34,n=6,sw2=(sw+10)/n;
  for(let i=0;i<n;i++){P();const ax=sx-5+i*sw2;ctx.moveTo(ax,ay);ctx.lineTo(ax+sw2,ay);ctx.lineTo(ax+sw2,ay+12);ctx.quadraticCurveTo(ax+sw2/2,ay+17,ax,ay+12);ctx.closePath();fs(i%2?'#fff6dd':TEAMC[e.team]||'#e9b434','#2b2232',1.2);}
  // sign with a coin
  circ(x0+w-6,y0-6,7,'#ffd84a','#5a3a10',1.6);ctx.font='700 9px system-ui';ctx.textAlign='center';ctx.fillStyle='#5a3a10';ctx.fillText('$',x0+w-6,y0-3);
  ctx.restore();
  if(!e.built){const sh=(h+20)*Math.max(.35,p);for(const px of[x0+6,x0+w-6])line(px,base-2,px,base-2-sh,'#8a5a2e',2.4);}
}
// stone walls drawn by hand (the free pack has none); each piece joins its neighbours
const isWallAt=(x,y,t)=>{if(!inB(x,y)||wallT[idx(x,y)]!==t)return false;const o=byId.get(occ[idx(x,y)]);return !!o&&(o.kind==='wall'||o.kind==='gate');};
function drawWall(e){
  const x=e.tx*TS,y=e.ty*TS,t=e.team,p=e.built?1:Math.max(.12,e.prog);
  const N=isWallAt(e.tx,e.ty-1,t),Sx=isWallAt(e.tx,e.ty+1,t),E=isWallAt(e.tx+1,e.ty,t),W=isWallAt(e.tx-1,e.ty,t);
  const H=24*p,top=y+30-H,face='#b8ad98',dark='#7d7262',topc='#d9d0bd';
  ctx.save();if(!e.built)ctx.globalAlpha=.55+.45*p;
  const x0=W?x:x+5,x1=E?x+TS:x+27;
  shadow(x+16,y+31,16,4);
  if(N){rr(x+5,y-6,22,H*.0+12,1,topc,dark,1);} // join to the piece behind
  rr(x0,top,x1-x0,H,2,face,dark,1.4);
  // stone courses
  for(let yy=top+7;yy<y+29;yy+=7){line(x0+1,yy,x1-1,yy,'rgba(90,80,65,.45)',1);}
  for(let yy=top+3,k=0;yy<y+29;yy+=7,k++)for(let xx=x0+(k%2?6:2);xx<x1-2;xx+=10)line(xx,yy+1,xx,yy+5,'rgba(90,80,65,.35)',1);
  // walkway and battlements
  rr(x0,top-5,x1-x0,6,1.5,topc,dark,1.2);
  if(e.built)for(let xx=x0+1;xx<x1-3;xx+=8)rr(xx,top-10,5,6,1,topc,dark,1);
  line(x0+1,top+1,x1-1,top+1,TEAMC[t],2);
  if(Sx)rr(x+5,y+28,22,6,1,face,dark,1);
  if(e.built&&e.hp<e.maxhp*.5){line(x+10,top+4,x+15,top+12,'#3b3226',1.4);line(x+15,top+12,x+12,top+18,'#3b3226',1.4);}
  ctx.restore();
}
function drawGate(e){
  const x=e.tx*TS,y=e.ty*TS,t=e.team,p=e.built?1:Math.max(.12,e.prog);
  const H=28*p,top=y+30-H,dark='#7d7262',stone='#b8ad98',topc='#d9d0bd';
  let open=false;
  if(e.built)forNear(x+16,y+20,40,u=>{if(!u.dead&&u.team===t&&DEF[u.kind].unit)open=true;});
  ctx.save();if(!e.built)ctx.globalAlpha=.55+.45*p;
  shadow(x+16,y+31,17,4);
  rr(x+1,top,7,H,2,stone,dark,1.3);rr(x+24,top,7,H,2,stone,dark,1.3);
  rr(x,top-6,TS,7,2,topc,dark,1.2);
  P();ctx.moveTo(x+8,y+30);ctx.lineTo(x+8,top+8);ctx.quadraticCurveTo(x+16,top+1,x+24,top+8);ctx.lineTo(x+24,y+30);ctx.closePath();fs(open?'#2b2232':'#3b2a1a');
  if(!open){
    rr(x+9,top+7,14,y+30-top-7,2,'#9a6a3a','#4a2d17',1.2);
    line(x+16,top+6,x+16,y+30,'#4a2d17',1.2);
    for(const yy of[top+12,y+24])line(x+9,yy,x+23,yy,'#5a5a66',2);
  }else{rr(x+7,top+8,3,y+30-top-8,1,'#9a6a3a','#4a2d17',1);rr(x+22,top+8,3,y+30-top-8,1,'#9a6a3a','#4a2d17',1);}
  P();ctx.moveTo(x+16,top-6);ctx.lineTo(x+16,top-18);fs(null,'#2b2232',1.5);
  P();ctx.moveTo(x+16,top-18);ctx.lineTo(x+26,top-15);ctx.lineTo(x+16,top-12);ctx.closePath();fs(TEAMC[t],'#2b2232',1);
  ctx.restore();
}
// the tavern: a yellow house with tables, mugs and barrels outside
function drawTavern(e){
  const r=rectOf(e),x0=r[0],y0=r[1],w=r[2],h=r[3],base=y0+h+2,p=e.built?1:Math.max(.15,e.prog);
  ctx.save();ctx.globalAlpha=e.built?1:.45+.5*p;
  shadow(x0+w/2,base-2,w/2,7);
  spr('y_house3',0,x0+26,base-4,{s:.8});
  // barrels
  for(const[bx,by]of[[x0+w-12,base-10],[x0+w-22,base-6]]){rr(bx-6,by-12,12,13,4,'#9a6a3a','#4a2d17',1.3);line(bx-6,by-8,bx+6,by-8,'#5a5a66',1.4);line(bx-6,by-3,bx+6,by-3,'#5a5a66',1.4);}
  // table with mugs
  const tx=x0+50,ty=base-14;
  rr(tx-12,ty,26,8,2,'#a8743f','#4a2d17',1.3);line(tx-9,ty+8,tx-9,ty+14,'#4a2d17',2);line(tx+11,ty+8,tx+11,ty+14,'#4a2d17',2);
  for(const mx of[tx-6,tx+5]){rr(mx-2.5,ty-6,5,6,1,'#f2c230','#6b4a10',1);circ(mx,ty-6.5,2.3,'#fffbe8');}
  // sign with a mug
  line(x0+8,y0-2,x0+8,y0-20,'#4a2d17',2);line(x0+8,y0-20,x0+26,y0-20,'#4a2d17',2);
  rr(x0+14,y0-18,14,12,2,'#fff6dd','#4a2d17',1.2);rr(x0+17,y0-15,6,7,1,'#f2c230','#6b4a10',1);
  ctx.restore();
  if(!e.built){const sh=(h+20)*Math.max(.35,p);for(const px of[x0+6,x0+w-6])line(px,base-2,px,base-2-sh,'#8a5a2e',2.4);}
}
function drawScaffold(e,p){
  const r=rectOf(e),x0=r[0]+2,x1=r[0]+r[2]-2,base=r[1]+r[3]+2,top=r[1]-r[3]*.6;
  for(const px of[x0,(x0+x1)/2,x1])line(px,base,px,top,'#8a5a2e',2.2);
  for(let y=base-10;y>top;y-=16)line(x0,y,x1,y,'#a8743f',2);
  rr(r[0]+r[2]/2-20,top-10,40,5,2,'rgba(30,20,20,.6)');rr(r[0]+r[2]/2-20,top-10,40*p,5,2,'#ffd84a');
}
// a dug pit: a dark hole with a dirt rim
function drawPitTile(x,y){
  const px=x*TS,py=y*TS;
  rr(px+1,py+2,TS-2,TS-3,7,'#7a5230');
  rr(px+4,py+5,TS-8,TS-9,6,'#2b1d12');
  rr(px+6,py+6,TS-12,6,3,'rgba(0,0,0,.35)');
  for(let k=0;k<3;k++)circ(px+6+k*10+hash(x*7+y*13+k)*4,py+3+hash(x+k)*2,2,'#a8743f');
}
function drawPitDig(e){
  const px=e.tx*TS,py=e.ty*TS,p=Math.max(.15,e.prog);
  ctx.globalAlpha=.55+.45*p;rr(px+4,py+6,TS-8,TS-10,6,`rgba(43,29,18,${.25+.6*p})`);ctx.globalAlpha=1;
  P();ctx.ellipse(px+TS-6,py+TS-6,8,5,0,Math.PI,0);fs('#a8743f','#6b4524',1.2);
  line(px+4,py+2,px+10,py+14,'#6b4524',2);rr(px+8,py+12,5,4,1,'#9aa7b8','#4a4a55',1);
}
// wooden planks over water or a pit
function drawBridge(e){
  const x=e.tx*TS,y=e.ty*TS,i=idx(e.tx,e.ty),p=e.built?1:Math.max(.2,e.prog);
  const solid=(xx,yy)=>{if(!inB(xx,yy))return false;const j=idx(xx,yy),t=S.tiles[j];if(t!==WATER&&t!==PIT)return true;const o=byId.get(occ[j]);return !!o&&o.kind==='bridge';};
  const hor=solid(e.tx-1,e.ty)||solid(e.tx+1,e.ty)||!(solid(e.tx,e.ty-1)||solid(e.tx,e.ty+1));
  ctx.save();ctx.globalAlpha=e.built?1:.5+.4*p;
  ell(x+16,y+30,15,4,'rgba(0,0,0,.18)');
  if(hor){rr(x-1,y+6,TS+2,20,2,'#a8743f','#4a2d17',1.4);for(let k=0;k<5;k++)line(x+3+k*6.5,y+7,x+3+k*6.5,y+25,'#6b4524',1.2);line(x-1,y+9,x+TS+1,y+9,'#4a2d17',1.4);line(x-1,y+23,x+TS+1,y+23,'#4a2d17',1.4);}
  else{rr(x+6,y-1,20,TS+2,2,'#a8743f','#4a2d17',1.4);for(let k=0;k<5;k++)line(x+7,y+3+k*6.5,x+25,y+3+k*6.5,'#6b4524',1.2);line(x+9,y-1,x+9,y+TS+1,'#4a2d17',1.4);line(x+23,y-1,x+23,y+TS+1,'#4a2d17',1.4);}
  ctx.restore();
}
// the dock: a wooden pier with posts and a little crane
function drawDock(e){
  const r=rectOf(e),x0=r[0],y0=r[1],w=r[2],h=r[3],p=e.built?1:Math.max(.15,e.prog);
  ctx.save();ctx.globalAlpha=e.built?1:.45+.5*p;
  shadow(x0+w/2,y0+h,w/2,6);
  rr(x0+2,y0+h*.35,w-4,h*.6,3,'#a8743f','#4a2d17',1.6);
  for(let k=1;k<7;k++)line(x0+2+k*(w-4)/7,y0+h*.35+1,x0+2+k*(w-4)/7,y0+h*.95-1,'#6b4524',1.2);
  for(const px of[x0+5,x0+w-5])rr(px-3,y0+h*.3,6,h*.72,2,'#7a5230','#4a2d17',1.2);
  line(x0+w*.3,y0+h*.35,x0+w*.3,y0-h*.25,'#4a2d17',3);line(x0+w*.3,y0-h*.25,x0+w*.75,y0-h*.1,'#4a2d17',2.4);
  line(x0+w*.75,y0-h*.1,x0+w*.75,y0+h*.15,'#2b2232',1);rr(x0+w*.75-4,y0+h*.15,8,7,1,'#9a6a3a','#4a2d17',1);
  P();ctx.moveTo(x0+w*.3,y0-h*.25);ctx.lineTo(x0+w*.3+12,y0-h*.25+4);ctx.lineTo(x0+w*.3,y0-h*.25+8);ctx.closePath();fs(TEAMC[e.team]||'#888','#2b2232',1);
  ctx.restore();
}
// a little boat with a sail in the team's colour; heads show who is aboard
function drawShip(e){
  const bob=Math.sin(AT*2.1+e.id)*1.4,f=(e.face||1)<0?-1:1,tc=TEAMC[e.team]||'#888';
  ctx.save();ctx.translate(0,bob);
  ctx.globalAlpha=.35;ell(0,5,32,7,'#ffffff');ctx.globalAlpha=1;
  // the hull, longer and higher than a boat, with a ram at the bow and shields along the side
  P();ctx.moveTo(-30*f,-10);ctx.lineTo(28*f,-10);ctx.lineTo(38*f,-4);ctx.quadraticCurveTo(26*f,10,10*f,11);ctx.lineTo(-20*f,11);ctx.quadraticCurveTo(-32*f,6,-30*f,-10);ctx.closePath();fs('#7a4f2a','#3a2414',2.2);
  line(-26*f,-4,30*f,-4,'#5a3a1c',1.6);
  for(let k=0;k<5;k++){circ(-20*f+k*10*f,-7,3.6,k%2?tc:'#e8dcc0','#2b2232',1.1);}
  // two masts, a striped sail in the team colour
  line(-6*f,-10,-6*f,-58,'#3a2414',2.6);line(16*f,-10,16*f,-44,'#3a2414',2);
  P();ctx.moveTo(-5*f,-56);ctx.quadraticCurveTo(14*f,-40,-5*f,-20);ctx.closePath();fs('#fff6dd','#2b2232',1.4);
  rr(-5*f-(f<0?13:0),-46,13,6,1,tc);rr(-5*f-(f<0?13:0),-34,13,6,1,tc);
  P();ctx.moveTo(17*f,-42);ctx.quadraticCurveTo(28*f,-32,17*f,-20);ctx.closePath();fs('#fff6dd','#2b2232',1.2);
  P();ctx.moveTo(-6*f,-58);ctx.lineTo(4*f,-55);ctx.lineTo(-6*f,-52);ctx.closePath();fs(tc,'#2b2232',1);
  // the archers on deck draw when it shoots
  const dr=e.atkT>0?1:0;for(const x of[-14,6]){circ(x*f,-15,3.4,'#f2d0a8','#2b2232',1);if(dr){line(x*f+3*f,-20,x*f+3*f,-10,'#5a3a1c',1.4);}}
  ctx.restore();
  if(e.hitT>0){ctx.globalAlpha=.4;ell(0,0,32,9,'#ffffff');ctx.globalAlpha=1;}
}
function drawBoat(e){
  if(DEF[e.kind]&&DEF[e.kind].warship){drawShip(e);return;}
  const bob=Math.sin(AT*2.4+e.id)*1.6,f=(e.face||1)<0?-1:1,n=e.cargo?e.cargo.length:0;
  ctx.save();ctx.translate(0,bob);
  ctx.globalAlpha=.35;ell(0,4,24,6,'#ffffff');ctx.globalAlpha=1;
  P();ctx.moveTo(-22*f,-6);ctx.lineTo(24*f,-6);ctx.quadraticCurveTo(20*f,8,8*f,9);ctx.lineTo(-14*f,9);ctx.quadraticCurveTo(-22*f,4,-22*f,-6);ctx.closePath();fs('#9a6a3a','#4a2d17',2);
  line(-18*f,-2,20*f,-2,'#6b4524',1.4);
  for(let k=0;k<Math.min(n,6);k++)circ(-12*f+k*5*f,-9,3.2,'#f2d0a8','#2b2232',1);
  line(2*f,-6,2*f,-46,'#4a2d17',2.4);
  P();ctx.moveTo(4*f,-44);ctx.quadraticCurveTo(22*f,-30,4*f,-12);ctx.closePath();fs('#fff6dd','#2b2232',1.4);
  rr(3*f-(f<0?12:0),-36,12,6,1,TEAMC[e.team]);
  ctx.restore();
  if(e.hitT>0){ctx.globalAlpha=.4;ell(0,0,24,8,'#ffffff');ctx.globalAlpha=1;}
}
function drawAllyFlag(x,y){
  const b=Math.sin(AT*3+x)*2;
  line(x,y,x,y-26,'#2b2232',2);
  P();ctx.moveTo(x,y-26+b);ctx.lineTo(x+18,y-21+b);ctx.lineTo(x,y-15+b);ctx.closePath();fs(TEAMC[1],'#1d2f66',1.4);
  // two hands shaking, drawn as a pair of small circles joined
  circ(x+6,y-21+b,2.2,'#ffe0b0','#2b2232',1);circ(x+10,y-21+b,2.2,'#ffe0b0','#2b2232',1);
}
function drawBuilding(e){
  if(e.kind==='town'){drawTown(e);return;}
  if(e.kind==='farm'||e.kind==='tfarm'){drawFarm(e);return;}
  if(e.kind==='wall'){drawWall(e);return;}
  if(e.kind==='pit'){if(!e.built)drawPitDig(e);return;}
  if(e.kind==='bridge')return;
  if(e.kind==='dock'){drawDock(e);return;}
  if(e.kind==='gate'){drawGate(e);return;}
  if(e.kind==='tavern'){drawTavern(e);return;}
  if(e.kind==='market'){drawMarket(e);if(e.built&&e.hp<e.maxhp*.5){const r=rectOf(e);spr('fire',Math.floor(AT*12),r[0]+r[2]*.6,r[1]+10,{s:1.1});}return;}
  const D=DEF[e.kind],key=buildingKey(e),m=META[key];
  const bx=e.tx*TS,by=e.ty*TS,w=D.w*TS,h=D.h*TS,cx=bx+w/2,base=by+h+2;
  if(!assetsReady||!m){rr(bx+2,by+2,w-4,h-4,4,TEAMC[e.team],'#2b2232',2);return;}
  const sc=e.kind==='monastery'?.95:1;
  if(!e.built){
    rr(bx+3,by+h*.35,w-6,h*.65-3,5,'rgba(120,85,50,.35)','#7d5230',1.6);
    const top=base-(m[6]-m[4])*SPS*sc-6,full=base-top,p=Math.max(.06,e.prog);
    ctx.save();P();ctx.rect(bx-20,top+full*(1-p),w+40,full*p+12);ctx.clip();spr(key,0,cx,base,{s:sc});ctx.restore();
    const sh=(h+16)*Math.max(.35,p);
    for(const px of[bx+6,bx+w/2,bx+w-6])line(px,base-2,px,base-2-sh,'#8a5a2e',2.4);
    for(let y=base-10;y>base-sh;y-=16)line(bx+4,y,bx+w-4,y,'#a8743f',2);
  }else spr(key,0,cx,base,{s:sc});
  if(e.reno)drawScaffold(e,e.reno.prog);
  if(e.kind==='house'&&(e.level||1)>1&&e.team===1)for(let i=1;i<e.level;i++)star5(cx-((e.level-2)*5)+(i-1)*10,by-6,4.5,'#ffd84a','#5a3a10');
  if(e.built&&e.hp<e.maxhp*.5){
    const n=e.hp<e.maxhp*.25?3:2;
    for(let k=0;k<n;k++){const x=bx+w*(.25+.5*hash(e.id*7+k)),y=by+h*.35+hash(e.id*3+k)*h*.35;spr('fire',Math.floor(AT*12+k*3),x,y,{s:1.1});}
  }
}
function drawGold(e){
  const f=e.amount/DEF.gold.amount,key=f>.75?'gold6':f>.5?'gold5':f>.25?'gold4':'gold3';
  const bx=e.tx*TS,by=e.ty*TS;
  shadow(bx+32,by+56,26,6);
  if(!spr(key,0,bx+32,by+58,{s:1.25}))rr(bx+6,by+10,52,46,10,'#f4c534','#8a6412',2);
}
function drawTree(tx,ty){
  const i=idx(tx,ty),h=hash(i),key='tree'+(1+Math.floor(h*4));
  const sk=treeShake.get(i);const shake=sk!=null&&AT-sk<.18?Math.sin(AT*80)*1.6:0;
  const x=tx*TS+16+shake,y=ty*TS+29;
  if(cam.z>=1)ell(x,y-1,13,4,'rgba(25,45,20,.25)');
  if(!spr(key,Math.floor(AT*6+h*8),x,y,{s:.9+h*.2}))circ(x,y-18,13,'#3f9139','#2b6a2c',2);
}
function drawStump(tx,ty){const h=hash(idx(tx,ty));if(!spr('stump'+(1+Math.floor(h*4)),0,tx*TS+16,ty*TS+24))circ(tx*TS+16,ty*TS+20,6,'#c08a52','#7d5230',1.5);}
function drawEntity(e){
  const D=DEF[e.kind];
  if(D.building){drawBuilding(e);return;}
  if(D.resource){drawGold(e);return;}
  ctx.save();ctx.translate(e.x,e.y);
  if(e.hitT>0)ctx.translate(Math.sin(AT*90)*1.2,0);
  if(D.naval)drawBoat(e);else if(D.cart)drawCart(e);else if(D.mech)drawSiege(e);else if(D.unit)drawUnit(e);else drawSheep(e);
  ctx.restore();
}

// ---------------------------------------------------------------- terrain
let terrainSpr=null,foamTiles=[],tileCR=null,roadList=[],plCR=null,cliffCol=null;
// a low-res map cache for zoomed-out views; when zoomed in, tiles are drawn at full resolution
function buildTerrain(){
  const land=(x,y)=>inB(x,y)&&S.tiles[idx(x,y)]!==WATER;
  tileCR=new Int16Array(N).fill(-1);foamTiles=[];roadList=[];
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    if(!land(x,y))continue;
    const n=land(x,y-1),e=land(x+1,y),s=land(x,y+1),w=land(x-1,y);
    tileCR[idx(x,y)]=(n&&s?1:!n&&s?0:n&&!s?2:3)*16+(w&&e?1:!w&&e?0:w&&!e?2:3);
    let edge=false;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)if(!land(x+dx,y+dy))edge=true;
    if(edge)foamTiles.push([x,y]);
  }
  for(let i=0;i<N;i++){
    if(S.tiles[i]!==ROAD)continue;
    const x=i%MW,y=(i/MW)|0,segs=[];
    for(const[dx,dy]of[[1,0],[0,1],[1,1],[1,-1]]){
      const nx=x+dx,ny=y+dy;if(!inB(nx,ny)||S.tiles[idx(nx,ny)]!==ROAD)continue;
      if(dx&&dy&&(S.tiles[idx(x+dx,y)]===ROAD||S.tiles[idx(x,y+dy)]===ROAD))continue;
      segs.push([nx,ny]);
    }
    roadList.push({x,y,segs});
  }
  // high ground: every level of a terrace is drawn on top of the one below with the raised tiles of the tileset,
  // and the rock face of a cliff sits on the tile just south of the higher ground
  plCR=new Int16Array(N*MAXLV).fill(-1);cliffCol=new Int8Array(N).fill(-1);
  const hi=(x,y,l)=>inB(x,y)&&elev[idx(x,y)]>=l,up=(x,y)=>inB(x,y)&&y>0?elev[idx(x,y-1)]:0,cl=(x,y,l)=>inB(x,y)&&(cliff[idx(x,y)]||ramp[idx(x,y)])&&up(x,y)===l;
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){
    const i=idx(x,y);
    for(let l=1;l<=elev[i];l++){const n=hi(x,y-1,l),e=hi(x+1,y,l),s=hi(x,y+1,l),w=hi(x-1,y,l);plCR[i*MAXLV+l-1]=(n&&s?1:!n&&s?0:n&&!s?2:3)*16+(w&&e?1:!w&&e?0:w&&!e?2:3);}
    if(cliff[i]||ramp[i]){const l=up(x,y),w=cl(x-1,y,l),e=cl(x+1,y,l);cliffCol[i]=w&&e?6:!w&&e?5:w&&!e?7:8;}
  }
  const R=MW*MH>8000?22:32,c=document.createElement('canvas');c.width=MW*R;c.height=MH*R;
  const g=c.getContext('2d');g.imageSmoothingEnabled=true;
  for(let i=0;i<N;i++){
    const v=tileCR[i];if(v<0)continue;const x=i%MW,y=(i/MW)|0;
    if(tileImg())g.drawImage(tileImg(),(v%16)*64,((v/16)|0)*64,64,64,x*R,y*R,R,R);
    else{g.fillStyle='#9fbf55';g.fillRect(x*R,y*R,R,R);}
  }
  drawRoads(g,R,roadList);
  for(let i=0;i<N;i++)drawElev(g,R,i%MW,(i/MW)|0);
  terrainSpr=c;
}
function drawElev(g,R,x,y){
  const i=idx(x,y);if(!tileImg()||!plCR)return;
  for(let l=1;l<=elev[i];l++){
    const v=plCR[i*MAXLV+l-1];
    if(v>=0)g.drawImage(tileImgL(l),((v%16)+5)*64,((v/16)|0)*64,64,64,x*R,y*R,R+.6,R+.6);
  }
  const c=cliffCol&&cliffCol[i];
  if(c>=0){
    g.drawImage(tileImgL(y>0?elev[i-MW]:1),c*64,4*64,64,64,x*R,y*R,R+.6,R+.6);
    if(ramp[i]){
      // stone stairs cut into the cliff
      const k=R/32;g.fillStyle='rgba(40,35,30,.35)';g.fillRect(x*R+7*k,y*R,18*k,R);
      for(let s=0;s<4;s++){g.fillStyle=s%2?'#cfc6b3':'#e2dacb';g.fillRect(x*R+8*k,y*R+s*8*k+1*k,16*k,6*k);g.fillStyle='rgba(60,50,40,.55)';g.fillRect(x*R+8*k,y*R+s*8*k+6*k,16*k,1.6*k);}
    }
  }
  // a soft shadow at the foot of the cliffs
  if(y>0&&(cliff[idx(x,y-1)]||ramp[idx(x,y-1)])&&!cliff[i]&&!ramp[i]){g.fillStyle='rgba(20,40,30,.18)';g.fillRect(x*R,y*R,R,R*.3);}
}
function drawRoads(g,R,list){
  g.lineCap='round';g.lineJoin='round';
  for(const[col,wd]of[['rgba(150,112,62,.55)',.78],['#d8b97e',.6]]){
    g.strokeStyle=col;g.lineWidth=R*wd;g.fillStyle=col;
    for(const r of list){
      const cx=(r.x+.5)*R,cy=(r.y+.5)*R;
      g.beginPath();g.arc(cx,cy,R*wd/2,0,7);g.fill();
      for(const[nx,ny]of r.segs){g.beginPath();g.moveTo(cx,cy);g.lineTo((nx+.5)*R,(ny+.5)*R);g.stroke();}
    }
  }
}
function tileImg(){return IMG['tiles'+(S&&S.biome||1)]||IMG.tiles1;}
// the higher terraces catch more sun: brighter copies of the tileset for levels 2 and 3
const tileLvCache={};
function tileImgL(l){
  const base=tileImg();if(l<=1||!base)return base;
  const k=(S&&S.biome||1)+':'+l;if(tileLvCache[k])return tileLvCache[k];
  try{
    const c=document.createElement('canvas');c.width=base.width;c.height=base.height;const g=c.getContext('2d');g.drawImage(base,0,0);
    const d=g.getImageData(0,0,c.width,c.height),a=d.data,f=l===2?1.12:1.25,w=l===2?6:14;
    for(let j=0;j<a.length;j+=4){if(!a[j+3])continue;a[j]=Math.min(255,a[j]*f+w);a[j+1]=Math.min(255,a[j+1]*f+w*.6);a[j+2]=Math.min(255,a[j+2]*(f-.04));}
    g.putImageData(d,0,0);tileLvCache[k]=c;return c;
  }catch(e){tileLvCache[k]=base;return base;}
}
function drawTerrainTiles(x0,y0,x1,y1){
  const TI=tileImg();
  if(!TI||!tileCR)return false;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){
    const v=tileCR[idx(x,y)];if(v<0)continue;
    ctx.drawImage(TI,(v%16)*64,((v/16)|0)*64,64,64,x*TS,y*TS,TS+.6,TS+.6);
  }
  drawRoads(ctx,TS,roadList.filter(r=>r.x>=x0-1&&r.x<=x1+1&&r.y>=y0-1&&r.y<=y1+1));
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)drawElev(ctx,TS,x,y);
  return true;
}
function drawClouds(){
  const span=MW*TS+700;
  for(let k=0;k<5;k++){
    const h=hash(k*977+3),x=((h*span+AT*(6+h*5))%span)-350,y=60+hash(k*31+7)*(MH*TS-160);
    spr('cloud'+(1+k%3),0,x,y,{alpha:.45,s:1+h*.4});
  }
}

// ---------------------------------------------------------------- minimap
const mini=document.getElementById('mini'),mctx=mini.getContext('2d');
const MS=3;let miniBase=null;
function miniCol(t,i){
  if(i!=null&&(cliff[i]||ramp[i]))return ramp[i]?'#e2dacb':'#6d6a60';
  if(t===PIT)return bridgeA[i]?'#a8743f':'#3b2a1a';
  const g=t===WATER?'#47aba9':t===ROAD?'#d8b97e':t===TREE?'#2f6b4a':(BIOMES[S&&S.biome||1]||BIOMES[1]).grass;
  return i!=null&&elev[i]&&t!==TREE?shade(g,LV_SHADE[elev[i]]):g;
}
const LV_SHADE=[0,-.18,-.05,.08];
function shade(hex,f){const n=parseInt(hex.slice(1),16);let r=n>>16,g=(n>>8)&255,b=n&255;r=Math.round(r*(1+f));g=Math.round(g*(1+f));b=Math.round(b*(1+f));return '#'+[r,g,b].map(v=>Math.max(0,Math.min(255,v)).toString(16).padStart(2,'0')).join('');}
function buildMiniBase(){
  miniBase=document.createElement('canvas');miniBase.width=MW*MS;miniBase.height=MH*MS;
  const c=miniBase.getContext('2d');
  for(let y=0;y<MH;y++)for(let x=0;x<MW;x++){c.fillStyle=miniCol(S.tiles[idx(x,y)],idx(x,y));c.fillRect(x*MS,y*MS,MS,MS);}
}
function miniTile(x,y){if(!miniBase)return;const c=miniBase.getContext('2d');c.fillStyle=miniCol(S.tiles[idx(x,y)],idx(x,y));c.fillRect(x*MS,y*MS,MS,MS);}
function drawMini(){
  if(!miniBase)return;
  mctx.setTransform(1,0,0,1,0,0);
  mctx.clearRect(0,0,mini.width,mini.height);
  mctx.drawImage(miniBase,0,0,mini.width,mini.height);
  const sx=mini.width/(MW*TS),sy=mini.height/(MH*TS),fog=fogOn();
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(fog&&fogHide(e))continue;
    if(D.building||D.resource){const r=rectOf(e);mctx.fillStyle=D.resource?'#ffd84a':e.kind==='town'||e.team===0&&D.townb?'#ffcf3a':e.team===1?'#2d5fd0':e.team===3?'#3b2a48':'#d63a2c';mctx.fillRect(r[0]*sx,r[1]*sy,Math.max(3,r[2]*sx),Math.max(3,r[3]*sy));}
  }
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(fog&&fogHide(e))continue;
    if(D.unit){mctx.fillStyle=D.cart?'#ffcf3a':e.team===1?'#dbe6ff':e.team===3?'#c78bff':e.team===0?'#f5e6a8':'#ff4a3a';mctx.fillRect(e.x*sx-1.5,e.y*sy-1.5,3,3);}
    else if(D.critter){mctx.fillStyle='#ffffff';mctx.fillRect(e.x*sx-1,e.y*sy-1,2,2);}
  }
  if(fog&&fogCv){mctx.imageSmoothingEnabled=true;mctx.drawImage(fogCv,0,0,MW,MH,0,0,mini.width,mini.height);}
  for(const e of S.ents){if(e.dead||!e.drop||!DEF[e.kind].building)continue;mctx.strokeStyle='#ffe066';mctx.lineWidth=2;mctx.beginPath();mctx.arc(e.x*sx,(e.y-24)*sy,4+Math.sin(AT*4)*1.5,0,7);mctx.stroke();}
  for(const p of FX.pings){const r=4+p.t*10;mctx.strokeStyle=p.col;mctx.globalAlpha=Math.max(0,1-p.t/2);mctx.lineWidth=2;mctx.beginPath();mctx.arc(p.x*sx,p.y*sy,r,0,7);mctx.stroke();mctx.globalAlpha=1;}
  mctx.strokeStyle='#fff';mctx.lineWidth=1.5;
  mctx.strokeRect(cam.x*sx,cam.y*sy,VW/cam.z*sx,VH/cam.z*sy);
}

// ---------------------------------------------------------------- camera
function resize(){
  DPR=Math.min(2,window.devicePixelRatio||1);
  const r=cv.getBoundingClientRect();VW=Math.max(1,r.width);VH=Math.max(1,r.height);
  cv.width=Math.round(VW*DPR);cv.height=Math.round(VH*DPR);
  clampCam();
}
function clampCam(){
  const cx=clamp(cam.x+VW/(2*cam.z),0,MW*TS),cy=clamp(cam.y+VH/(2*cam.z),0,MH*TS);
  cam.x=cx-VW/(2*cam.z);cam.y=cy-VH/(2*cam.z);
}
function centerOn(x,y){cam.x=x-VW/(2*cam.z);cam.y=y-VH/(2*cam.z);clampCam();}
function toWorld(sx,sy){return {x:cam.x+sx/cam.z,y:cam.y+sy/cam.z};}
function zoomAt(sx,sy,f){const w=toWorld(sx,sy);cam.z=clamp(cam.z*f,.6,2.6);cam.x=w.x-sx/cam.z;cam.y=w.y-sy/cam.z;clampCam();}

// ---------------------------------------------------------------- effects
const RAINBOW=['#ff5a5a','#ffb84a','#ffe95a','#7be06a','#5ac8ff','#a07bff'];
function drawConversion(f){
  const m=byId.get(f.mid),t=byId.get(f.tid);
  if(!alive(m)||!alive(t)||!m.order||m.order.type!=='convert'||m.order.id!==f.tid||!(m.order.ch>0)){f.done=true;return;}
  const tc=centerOf(t),p=m.order.ch/f.dur;
  // waves of colour travel from the monk to the target
  for(let k=0;k<3;k++){
    const u=((AT*1.4+k/3)%1),x=m.x+(tc.x-m.x)*u,y=m.y-26+(tc.y-(m.y-26))*u;
    ctx.globalAlpha=.75*(1-u*.5);
    circ(x,y,4+u*6,null,RAINBOW[(k+Math.floor(AT*6))%6],2.5);
  }
  ctx.globalAlpha=1;
  for(let k=0;k<2;k++){const u=((AT*1.2+k/2)%1);ctx.globalAlpha=.8*(1-u);ell(tc.x,tc.y+8,12+u*22,(12+u*22)*.5,null,RAINBOW[(k*2+Math.floor(AT*5))%6],3);}
  ctx.globalAlpha=1;
  // progress ring above the target
  P();ctx.arc(tc.x,tc.y-30,9,-Math.PI/2,-Math.PI/2+p*Math.PI*2);ctx.lineWidth=3.5;ctx.strokeStyle=TEAMC[m.team];ctx.stroke();
  circ(tc.x,tc.y-30,9,null,'rgba(255,255,255,.5)',1);
  // the chant
  const syl=['Wo','lo','lo!'][Math.floor(AT*3)%3];
  ctx.font='700 15px "Pixelify Sans", system-ui, sans-serif';ctx.textAlign='center';
  const by=m.y-54-Math.abs(Math.sin(AT*9))*3;
  ctx.lineWidth=4;ctx.strokeStyle='#2b2232';ctx.strokeText(syl,m.x,by);ctx.fillStyle=RAINBOW[Math.floor(AT*6)%6];ctx.fillText(syl,m.x,by);
}
function drawBolt(b){
  const u=b.t/.35;if(u>1)return;
  const rnd=mulberry(Math.floor(b.x*7+b.y*13+Math.floor(b.t*30)));
  const pts=[[b.x+(rnd()-.5)*40,b.y-340]];
  for(let i=1;i<9;i++){const k=i/9;pts.push([b.x+(rnd()-.5)*30*(1-k),b.y-340+340*k]);}
  pts.push([b.x,b.y-6]);
  for(const[lw,col,a]of[[9,'rgba(140,200,255,.35)',1],[4,'#bfe4ff',1],[1.6,'#ffffff',1]]){
    ctx.globalAlpha=(1-u)*a;P();ctx.moveTo(pts[0][0],pts[0][1]);for(const p of pts)ctx.lineTo(p[0],p[1]);ctx.lineWidth=lw;ctx.strokeStyle=col;ctx.lineJoin='round';ctx.stroke();
  }
  ctx.globalAlpha=(1-u)*.6;ell(b.x,b.y,26+u*20,(26+u*20)*.45,'rgba(200,230,255,.6)');
  ctx.globalAlpha=1;
}
function drawMeteors(s){
  // target ring while the spell is active
  ctx.setLineDash([6,5]);ell(s.x,s.y,80,60,null,'rgba(255,90,40,.7)',2);ctx.setLineDash([]);
  for(const h of s.hits){
    if(h.done)continue;
    const st=h.at-.45,u=(s.t-st)/.45;if(u<0)continue;
    const x=h.x+140*(1-u),y=h.y-300*(1-u);
    for(let k=1;k<6;k++){const q=Math.max(0,u-k*.05);ctx.globalAlpha=.35*(1-k/6);circ(h.x+140*(1-q),h.y-300*(1-q),9-k,'#ff9a3a');}
    ctx.globalAlpha=1;
    circ(x,y,9,'#ff6a2a');circ(x-1,y-1,5.5,'#ffd84a');
    ell(h.x,h.y,8*u+4,(8*u+4)*.45,'rgba(60,20,10,.25)');
  }
}
function drawSparks(f){
  const u=f.t/.9;if(u>1)return;
  ctx.globalAlpha=1-u;
  ell(f.x,f.y+6,10+u*50,(10+u*50)*.5,null,TEAMC[f.team],4);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2,r=8+u*46;circ(f.x+Math.cos(a)*r,f.y-10+Math.sin(a)*r*.7-u*10,3*(1-u)+1,RAINBOW[i%6]);}
  ctx.globalAlpha=1;
}
// rank insignia: chevrons for the first three ranks, stars above that, a big gold star for Comandante
function star5(x,y,r,fill,stroke){P();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,rr=i%2?r*.45:r;ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr);}ctx.closePath();fs(fill,stroke,1.2);}
function drawInsignia(r,x,y){
  if(r<=3){
    for(let i=0;i<r;i++){
      const yy=y-i*4;
      P();ctx.moveTo(x-6,yy-3);ctx.lineTo(x,yy+1.5);ctx.lineTo(x+6,yy-3);ctx.lineCap='round';ctx.lineJoin='round';
      ctx.lineWidth=4.2;ctx.strokeStyle='#2b2232';ctx.stroke();ctx.lineWidth=2.2;ctx.strokeStyle='#ffd84a';ctx.stroke();
    }
  }else if(r<=6){
    const n=r-3;for(let i=0;i<n;i++)star5(x+(i-(n-1)/2)*10,y-2,5,r===6?'#ffd84a':'#e6ecf5','#2b2232');
  }else{star5(x,y-3,8,'#ffd84a','#8a2a1a');circ(x,y-3,2,'#fff6c8');}
}
function hpBar(x,y,w,frac){
  rr(x-w/2-1,y-1,w+2,6,2,'rgba(30,20,20,.75)');
  rr(x-w/2,y,w*clamp(frac,0,1),4,1.5,frac>.6?'#62d14e':frac>.3?'#f2c230':'#ef4b3c');
}

// ---------------------------------------------------------------- frame
function render(){
  ctx=cv.getContext('2d');
  ctx.setTransform(DPR,0,0,DPR,0,0);
  ctx.fillStyle='#47aba9';ctx.fillRect(0,0,VW,VH);
  if(!S)return;
  const z=cam.z;
  ctx.setTransform(DPR*z,0,0,DPR*z,-cam.x*z*DPR,-cam.y*z*DPR);
  ctx.imageSmoothingEnabled=z<1.9;
  const x0=Math.max(0,Math.floor(cam.x/TS)-2),y0=Math.max(0,Math.floor(cam.y/TS)-2);
  const x1=Math.min(MW-1,Math.ceil((cam.x+VW/z)/TS)+2),y1=Math.min(MH-1,Math.ceil((cam.y+VH/z)/TS)+3);
  if(assetsReady){
    for(const[x,y]of foamTiles){if(x<x0||x>x1||y<y0||y>y1)continue;spr('foam',Math.floor(AT*8+hash(idx(x,y))*16),x*TS+16,y*TS+16,{ax:96,ay:96});}
    for(const d of S.decor){
      if(d.k==='wrock')spr('wrock'+d.v,Math.floor(AT*8+d.v*5),d.x,d.y);
      else if(d.k==='duck'){const dx=Math.sin(AT*.25+d.v)*30;spr('duck',Math.floor(AT*4),d.x+dx,d.y+Math.sin(AT*2)*1.5,{flip:Math.cos(AT*.25+d.v)<0});}
    }
  }
  if(!(cam.z*DPR>=(MW*MH>8000?.8:1.15)&&drawTerrainTiles(x0,y0,x1,y1))&&terrainSpr)ctx.drawImage(terrainSpr,0,0,terrainSpr.width,terrainSpr.height,0,0,MW*TS,MH*TS);
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const t=S.tiles[idx(x,y)];if(t===STUMP)drawStump(x,y);else if(t===PIT)drawPitTile(x,y);}
  // flat things under everyone
  for(const e of S.ents)if(!e.dead&&e.kind==='farm')drawFarm(e);
  for(const e of S.ents)if(!e.dead&&e.kind==='bridge')drawBridge(e);
  // rally point of the selected building
  const selSet=new Set(ui.sel);
  for(const id of ui.sel){const b=byId.get(id);if(b&&b.rally&&b.team===1){line(b.x,b.y-10,b.rally.x,b.rally.y,'rgba(255,255,255,.5)',1.5);line(b.rally.x,b.rally.y,b.rally.x,b.rally.y-18,'#2b2232',1.6);P();ctx.moveTo(b.rally.x,b.rally.y-18);ctx.lineTo(b.rally.x+11,b.rally.y-14);ctx.lineTo(b.rally.x,b.rally.y-10);ctx.closePath();fs(TEAMC[1]);}}
  for(const e of S.ents){
    if(e.dead||!selSet.has(e.id))continue;const D=DEF[e.kind];
    const col=e.team===2?'#ff6a5a':e.team===1?'#ffffff':e.team===3?'#d7a6ff':'#ffe28a';
    if(D.unit||D.critter)ell(e.x,e.y,D.r+5,(D.r+5)*.45,null,col,2);
    else{const r=rectOf(e);ell(r[0]+r[2]/2,r[1]+r[3]-5,r[2]/2+6,r[3]*.22+6,null,col,2.4);}
  }
  const list=[];
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)if(S.tiles[idx(x,y)]===TREE)list.push({y:y*TS+27,t:1,x,ty:y});
  const vx0=cam.x-140,vy0=cam.y-60,vx1=cam.x+VW/z+140,vy1=cam.y+VH/z+220;
  const fog=fogOn();
  for(const e of S.ents){if(e.dead||e.kind==='farm')continue;if(e.x<vx0||e.x>vx1||e.y<vy0||e.y>vy1)continue;if(fog&&fogHide(e))continue;list.push({y:e.y,e});}
  if(assetsReady)for(const d of S.decor){if((d.k==='bush'||d.k==='rock')&&d.x>vx0&&d.x<vx1&&d.y>vy0&&d.y<vy1)list.push({y:d.y-6,d});}
  list.sort((a,b)=>a.y-b.y);
  for(const d of list){
    if(d.t)drawTree(d.x,d.ty);
    else if(d.d){const q=d.d;if(q.k==='bush')spr('bush'+q.v,Math.floor(AT*7+q.v*3),q.x,q.y,{s:.8});else spr('rock'+q.v,0,q.x,q.y,{s:.8});}
    else drawEntity(d.e);
  }
  for(const p of S.proj){
    const ang=Math.atan2(p.y-(p.py??p.sy),p.x-(p.px??p.sx));
    if(p.k==='fire'){
      for(let i=1;i<=4;i++){const q=i/5;circ(p.x-(p.x-(p.px??p.x))*i*1.6,p.y-(p.y-(p.py??p.y))*i*1.6,5*(1-q*.6),`rgba(255,${150-i*20},40,${.55-q*.4})`);}
      circ(p.x,p.y,7,'rgba(255,170,60,.35)');circ(p.x,p.y,4.6,'#ff8a2a','#b2401a',1.2);circ(p.x-1,p.y-1,2,'#fff2a8');continue;
    }
    if(p.k==='rock'){const g=Math.min(1,p.t/p.dur);ell(p.sx+((p.tx??p.sx)-p.sx)*g,p.sy+((p.ty??p.sy)-p.sy)*g+26,6,2.5,'rgba(25,45,20,.25)');circ(p.x,p.y,5.5,'#8c8678','#2b2232',1.5);circ(p.x-1.5,p.y-1.5,1.6,'#b8b2a2');continue;}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(ang);
    if(!spr('arrow',0,0,0,{ax:40,ay:32})){line(-9,0,3,0,'#6b4423',1.8);}
    ctx.restore();
  }
  for(const f of FX.rings)drawConversion(f);
  FX.rings=FX.rings.filter(f=>!f.done);
  if(S.spells)for(const s of S.spells)drawMeteors(s);
  // bars
  for(const e of S.ents){
    if(e.dead)continue;const D=DEF[e.kind];
    if(!e.maxhp||e.kind==='town')continue;
    if(fog&&fogHide(e))continue;
    const show=selSet.has(e.id)||(e.hp<e.maxhp&&(D.unit||D.building))||e.hero||D.king||D.boss;
    if(D.unit){
      const top=(baseKind(e.kind)==='lancer'?52:44)*((D.look&&D.look.s)||1)+(D.king||D.boss&&!D.wild&&e.kind!=='captain'?12:0);
      if(show)hpBar(e.x,e.y-top,22,e.hp/e.maxhp);
      if(D.holy&&(selSet.has(e.id)||e.faith<1)){rr(e.x-11,e.y-top+6,22,3,1,'rgba(30,20,20,.6)');rr(e.x-11,e.y-top+6,22*e.faith,3,1,'#7fd4ff');}
      if(e.rank)drawInsignia(e.rank,e.x,e.y-top-(show?8:2));
    }else if(D.building&&show){
      const r=rectOf(e);hpBar(r[0]+r[2]/2,r[1]-(e.kind==='castle'?30:e.kind==='tower'||e.kind==='monastery'?44:e.kind==='farm'?8:16),Math.min(70,r[2]-12),e.hp/e.maxhp);
    }
  }
  for(const e of S.ents){
    if(e.dead)continue;
    if(DEF[e.kind].building&&DEF[e.kind].wild&&e.team!==3){const r=rectOf(e);drawAllyFlag(r[0]+r[2]/2+4,r[1]-(e.kind==='lair'?40:e.kind==='hideout'?26:12));}
    if(e.drop&&DEF[e.kind].building){const r=rectOf(e);drawItemFlag(r[0]+r[2]/2,r[1]-(e.kind==='lair'?40:e.kind==='hideout'?26:12),e.drop);}
    // names over the story characters
    const D=DEF[e.kind];
    if(D.unit&&(e.hero||D.king||D.boss||D.thero||e.title&&(e.kind==='engineer'&&e.team===2||selSet.has(e.id)))&&e.x>vx0&&e.x<vx1&&e.y>vy0&&e.y<vy1&&!(fog&&fogHide(e))){
      const sc=(D.look&&D.look.s)||1,top=(baseKind(e.kind)==='lancer'?52:44)*sc+(D.king||D.boss?14:0)+(e.rank?14:6);
      const nm=e.title||(D.thero?D.name.split(',')[0]:D.name.split(',')[0]);
      ctx.font='700 11px "Pixelify Sans", system-ui, sans-serif';ctx.textAlign='center';
      ctx.lineWidth=3;ctx.strokeStyle='#2b2232';ctx.strokeText(nm,e.x,e.y-top-6);ctx.fillStyle=e.team===1?(e.hero?'#ffe066':'#fff6dd'):'#ffb0a0';ctx.fillText(nm,e.x,e.y-top-6);
    }
  }
  drawSquads(selSet,vx0,vy0,vx1,vy1,fog);
  if(ui.showPlan||(typeof councilOpen==='function'&&councilOpen()&&COUNCIL.tab==='army'))drawPlan();
  // research banner over castles
  for(const t of[1,2]){
    const T=S.teams[t],c=castleOf(t);
    if(!T.research||!c)continue;
    const p=T.research.t/ERAS[T.research.era].time,r=rectOf(c),x=r[0]+r[2]/2,y=r[1]-56;
    rr(x-46,y-12,92,22,6,'rgba(43,34,50,.85)');
    rr(x-42,y+3,84*p,4,2,TEAMC[t]);
    ctx.font='700 11px "Pixelify Sans", system-ui, sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff6dd';
    ctx.fillText('Rumo à Era '+ERAS[T.research.era].roman,x,y);
  }
  // placement ghost
  if(LINE_KINDS.includes(ui.placing)&&(ui.ghost||ui.wallA)){
    const k=ui.placing,a=ui.wallA||ui.ghost,b=ui.ghost||ui.wallA,tiles=wallLine(a.tx,a.ty,b.tx,b.ty),oks=lineOK(1,k,tiles);
    let n=0;const per=(DEF[k].cost&&DEF[k].cost.wood)||0,have=S.teams[1].res.wood;
    tiles.forEach(([x,y],j)=>{const ok=oks[j];if(ok)n++;const paid=n*per<=have;
      ctx.fillStyle=ok&&paid?'rgba(110,230,90,.38)':'rgba(240,70,60,.42)';ctx.fillRect(x*TS+1,y*TS+1,TS-2,TS-2);
      if(ok&&paid){ctx.globalAlpha=.5;if(k==='wall')drawWall({tx:x,ty:y,team:1,built:true,hp:1,maxhp:1});else if(k==='bridge')drawBridge({tx:x,ty:y,team:1,built:true});else drawPitTile(x,y);ctx.globalAlpha=1;}});
    if(ui.wallA){const ax=(ui.wallA.tx+.5)*TS,ay=(ui.wallA.ty+.5)*TS;circ(ax,ay,6,'#fff','#2b2232',2);}
    ctx.font='700 12px "Pixelify Sans", system-ui';ctx.textAlign='center';const lx=(b.tx+.5)*TS,ly=b.ty*TS-8;
    const nm={wall:'muralha',pit:'fosso',bridge:'ponte'}[k];
    const txt=ui.wallA?`${n} ${k==='wall'?'pedaços':k==='pit'?'buracos':'trechos'}${per?` · ${n*per} madeira`:''}`:`Escolha o começo ${k==='wall'?'da':'do'} ${nm}`.replace('do ponte','da ponte');
    ctx.lineWidth=3;ctx.strokeStyle='#2b2232';ctx.strokeText(txt,lx,ly);ctx.fillStyle='#fff6dd';ctx.fillText(txt,lx,ly);
  }else if(ui.placing&&ui.ghost){
    const k=ui.placing,D=DEF[k],g=ui.ghost,mv=ui.moveId&&byId.get(ui.moveId),ok=mv?canMoveTo(mv,g.tx,g.ty):canPlace(1,k,g.tx,g.ty);
    ctx.globalAlpha=.55;
    if(k==='farm')drawFarm({tx:g.tx,ty:g.ty,kind:'farm',team:1,built:true,x:(g.tx+1)*TS,y:(g.ty+2)*TS});
    else if(k==='market')drawMarket({tx:g.tx,ty:g.ty,kind:'market',team:1,built:true});
    else if(k==='gate')drawGate({tx:g.tx,ty:g.ty,kind:'gate',team:1,built:true,hp:1,maxhp:1});
    else if(k==='wall')drawWall({tx:g.tx,ty:g.ty,kind:'wall',team:1,built:true,hp:1,maxhp:1});
    else if(mv&&DEF[k].look)spr(buildingKey(mv),0,(g.tx+D.w/2)*TS,(g.ty+D.h)*TS+2);
    else if(k==='tavern')drawTavern({tx:g.tx,ty:g.ty,kind:'tavern',team:1,built:true});
    else if(!spr((k==='house'?'b_house'+(mv?Math.min(3,mv.level||1):1):'b_'+k),0,(g.tx+D.w/2)*TS,(g.ty+D.h)*TS+2))rr(g.tx*TS,g.ty*TS,D.w*TS,D.h*TS,4,'#4a76d8');
    ctx.globalAlpha=1;
    for(let y=0;y<D.h;y++)for(let x=0;x<D.w;x++){const good=mv?ok:buildable(g.tx+x,g.ty+y);ctx.fillStyle=good&&ok?'rgba(110,230,90,.35)':'rgba(240,70,60,.4)';ctx.fillRect((g.tx+x)*TS+1,(g.ty+y)*TS+1,TS-2,TS-2);}
    if(D.range)ell((g.tx+D.w/2)*TS,(g.ty+D.h*.5)*TS,D.range,D.range*.75,null,'rgba(255,255,255,.5)',1.5);
  }
  if((ui.targeting==='terra-up'||ui.targeting==='terra-down')&&ui.mouse.in){
    const w=toWorld(ui.mouse.x,ui.mouse.y),up=ui.targeting==='terra-up',ts=rectTiles(tileOf(w.x)-1,tileOf(w.y)-1,3,3),ok=terraOk(ts,up),p=ok&&terraPlan(ts,up);
    if(ok){
      // the whole work: the area and the terraced slope around it, with the new level written on each tile
      ctx.font='700 11px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
      for(const[i,h]of p.nl){const x=(i%MW)*TS,y=((i/MW)|0)*TS,inA=ts.includes(i);ctx.fillStyle=inA?(up?'rgba(240,220,120,.45)':'rgba(120,200,255,.4)'):(up?'rgba(240,220,120,.2)':'rgba(120,200,255,.18)');ctx.fillRect(x+1,y+1,TS-2,TS-2);
        if(inA||p.nl.size<40){ctx.fillStyle='rgba(30,25,20,.75)';ctx.fillText(String(h+1),x+TS/2,y+TS/2+.5);}}
      ctx.textBaseline='alphabetic';
      const c=p.cost,lab=`Nível ${p.T+1} de 4 · ${Object.entries(c).map(([k,v])=>v+' '+RES_NAME[k]).join(', ')}`;
      ctx.font='700 12px system-ui, sans-serif';const tw=ctx.measureText(lab).width+14;rr(w.x-tw/2,w.y-62,tw,20,8,'rgba(255,246,221,.94)','#2b2232',1.4);ctx.fillStyle='#2b2232';ctx.fillText(lab,w.x,w.y-48);
    }else for(const i of ts){ctx.fillStyle='rgba(240,70,60,.4)';ctx.fillRect((i%MW)*TS+1,((i/MW)|0)*TS+1,TS-2,TS-2);}
  }else if(ui.targeting&&ui.mouse.in){
    const w=toWorld(ui.mouse.x,ui.mouse.y),sp=ui.targeting;
    const col=sp==='convert'?'#ffe95a':sp==='bolt'?'#bfe4ff':'#ff7a3a';
    ctx.setLineDash([5,4]);
    if(sp==='meteor')ell(w.x,w.y,80,60,null,col,2);else circ(w.x,w.y,14,null,col,2.5);
    ctx.setLineDash([]);
  }
  for(const m of FX.marks){const u=m.t/.6;ctx.globalAlpha=1-u;ell(m.x,m.y,6+u*12,(6+u*12)*.45,null,m.col,2.2);ctx.globalAlpha=1;}
  for(const p of FX.puffs){if(p.t<0)continue;const u=p.t/.7;if(!spr('dust',Math.floor(u*8),p.x,p.y,{s:p.r/9})){ctx.globalAlpha=.75*(1-u);circ(p.x,p.y-u*16,p.r*(.6+u*.8),'#efe7da');ctx.globalAlpha=1;}}
  for(const b of FX.booms){if(b.t<0)continue;const k=b.k||'explosion',m=META[k];if(!m)continue;const u=b.t/.8;spr(k,Math.floor(u*m[2]),b.x,b.y,{ax:96,ay:k==='explosion2'?110:96,s:b.s});}
  for(const b of FX.bolts)drawBolt(b);
  for(const f of FX.ranks){
    const u=byId.get(f.id);if(!u||u.dead)continue;const q=f.t/1.2;
    ctx.globalAlpha=1-q;
    ell(u.x,u.y,12+q*30,(12+q*30)*.45,null,'#ffd84a',3);
    rr(u.x-7,u.y-70*q-30,14,40,6,'rgba(255,230,120,.35)');
    for(let i=0;i<8;i++){const a=i/8*Math.PI*2+AT*3;circ(u.x+Math.cos(a)*16,u.y-20-q*30+Math.sin(a)*6,2,'#fff1a8');}
    ctx.globalAlpha=1;
  }
  for(const f of FX.sparks)drawSparks(f);
  for(const f of FX.orders){
    const g=byId.get(f.g),p=byId.get(f.p);if(!alive(g)||!alive(p))continue;
    const a=Math.max(0,1-f.t/1.8);ctx.globalAlpha=a;
    ctx.setLineDash([3,4]);line(g.x,g.y-30,p.x,p.y-30,'rgba(255,255,255,.8)',1.5);ctx.setLineDash([]);
    const col=f.res==='wood'?'#a8743f':f.res==='gold'?'#f2c230':'#e0604a';
    rr(p.x-9,p.y-72,18,16,5,'#fff6dd','#2b2232',1.3);P();ctx.moveTo(p.x-3,p.y-56);ctx.lineTo(p.x,p.y-51);ctx.lineTo(p.x+3,p.y-56);ctx.closePath();fs('#fff6dd');
    circ(p.x,p.y-64,4.5,col,'#2b2232',1);
    ctx.globalAlpha=1;
  }
  if(fog)drawFog();
  if(assetsReady)drawClouds();
  ctx.font='700 13px "Pixelify Sans", system-ui, sans-serif';ctx.textAlign='center';
  for(const f of FX.floats){ctx.globalAlpha=Math.max(0,1-f.t/1.3);ctx.lineWidth=3;ctx.strokeStyle='#2b2232';ctx.strokeText(f.txt,f.x,f.y-f.t*22);ctx.fillStyle=f.col;ctx.fillText(f.txt,f.x,f.y-f.t*22);ctx.globalAlpha=1;}
  drawSpeech();
  ctx.setTransform(DPR,0,0,DPR,0,0);
  if(ui.drag&&ui.drag.active){
    const d=ui.drag,x=Math.min(d.x0,d.x1),y=Math.min(d.y0,d.y1),w=Math.abs(d.x1-d.x0),h=Math.abs(d.y1-d.y0);
    ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x,y,w,h);ctx.strokeStyle='#fff';ctx.lineWidth=1.5;ctx.setLineDash([5,4]);ctx.strokeRect(x,y,w,h);ctx.setLineDash([]);
  }
}
// speech bubbles over the heads; the text keeps the same size on screen at any zoom
function wrapText(txt,maxW){const words=txt.split(' '),out=[];let line='';for(const w of words){const t=line?line+' '+w:w;if(ctx.measureText(t).width>maxW&&line){out.push(line);line=w;}else line=t;}if(line)out.push(line);return out;}
function drawSpeech(){
  if(!FX.speech||!FX.speech.length)return;
  const k=1/Math.max(.6,Math.min(1.6,cam.z)),fsz=11.5*k*1.25;
  ctx.font=`600 ${fsz}px system-ui, sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  const placed=[];
  for(const s of FX.speech){
    const e=byId.get(s.id);if(!e||e.dead||e.aboard)continue;if(fogOn()&&fogHide(e))continue;
    const D=DEF[e.kind],sc=D.look&&D.look.s||1,head=D.mech?50:D.naval?56:(baseKind(e.kind)==='lancer'?60:50)*sc;
    const lines=wrapText(s.txt,130*k),lh=fsz*1.2,w=Math.max(...lines.map(l=>ctx.measureText(l).width))+14*k,h=lines.length*lh+9*k;
    const a=Math.min(1,s.t/.12,(s.dur-s.t)/.35);if(a<=0)continue;
    const pop=s.t<.15?.85+s.t:1,x=e.x;let y=e.y-head-8*k;
    for(let g=0;g<6;g++){const hit=placed.find(q=>Math.abs(q.x-x)<(q.w+w)/2+2&&y>q.y-q.h-h-3&&y-h<q.y+3);if(!hit)break;y=hit.y-hit.h-4*k;}
    placed.push({x,y,w,h});
    ctx.save();ctx.globalAlpha=Math.max(0,a);ctx.translate(x,y);ctx.scale(pop,pop);
    const foe=e.team!==1,bg=foe?'#ffe9e2':'#fff8e6',bd=foe?'#8a2b22':'#2b2232';
    rr(-w/2,-h,w,h,7*k,bg,bd,1.6*k);P();ctx.moveTo(-5*k,-1);ctx.lineTo(0,7*k);ctx.lineTo(5*k,-1);ctx.closePath();fs(bg);line(-5*k,0,0,7*k,bd,1.6*k);line(5*k,0,0,7*k,bd,1.6*k);
    ctx.fillStyle=bd;lines.forEach((l,i)=>ctx.fillText(l,0,-h+4.5*k+lh*(i+.5)));
    ctx.restore();
  }
  ctx.textBaseline='alphabetic';
}
function updFx(dt){
  for(const k in FX)for(const f of FX[k])f.t+=dt;
  FX.speech=FX.speech.filter(f=>f.t<f.dur);FX.floats=FX.floats.filter(f=>f.t<1.3);FX.marks=FX.marks.filter(f=>f.t<.6);FX.puffs=FX.puffs.filter(f=>f.t<.7);
  FX.pings=FX.pings.filter(f=>f.t<2);FX.booms=FX.booms.filter(f=>f.t<.8);FX.bolts=FX.bolts.filter(f=>f.t<.35);FX.sparks=FX.sparks.filter(f=>f.t<.9);FX.ranks=FX.ranks.filter(f=>f.t<1.2);FX.orders=FX.orders.filter(f=>f.t<1.8);FX.cmds=FX.cmds.filter(f=>f.t<1.4);
}
// icons are drawn with the same sprites
const iconCache={};
function iconFor(kind,team){
  const key=kind+(team||1)+(assetsReady?'s':'');if(iconCache[key])return iconCache[key];
  const c=document.createElement('canvas');c.width=c.height=96;const prev=ctx;ctx=c.getContext('2d');
  const D=DEF[kind];
  let skey=null;
  if(D.look)skey=D.look.f?fgPre(D.look.f,team||1)+D.look.base+'_idle':D.look.v?(team===2?'r':'b')+D.look.v+'_'+D.look.base+'_idle':D.look.skin?(D.look.skin==='b'&&team===2?'r':D.look.skin)+'_'+D.look.base+(D.building?'':'_idle'):'m_idle';
  else if(D.mech)skey=null;
  else if(D.naval||kind==='dock'||kind==='bridge'||D.cart)skey=null;
  else if(kind==='town')skey='y_house3';
  else if(kind==='diplomat')skey='m_idle';
  else if(D.building)skey=kind==='farm'||kind==='market'||kind==='tavern'||D.wall?null:pre(team||1)+(kind==='house'?'house1':kind);
  else if(D.resource)skey='gold6';
  else if(D.critter)skey=(D.art||'sheep')+'_idle';
  else if(kind==='merchant')skey='m_idle';
  else skey=pre(team||1)+kind+'_idle';
  if(skey&&IMG[skey]){
    const m=META[skey],bw=m[5]-m[3],bh=m[6]-m[4],sc=Math.min(88/bw,88/bh)/SPS;
    ctx.imageSmoothingEnabled=sc*SPS<1;
    spr(skey,0,48,48+bh*sc*SPS/2,{s:sc,ax:(m[3]+m[5])/2,ay:m[6]});
  }else if(D.naval){ctx.save();ctx.translate(48,66);ctx.scale(D.warship?1.15:1.5,D.warship?1.15:1.5);drawBoat({id:1,team:team||1,face:1,kind});ctx.restore();}
  else if(D.cart){ctx.save();ctx.translate(52,72);ctx.scale(1.35,1.35);drawCart({id:1,kind,team:team||1,face:1,load:{k:'gold'}});ctx.restore();}
  else if(D.mech){ctx.save();ctx.translate(kind==='ram'?37:48,74);ctx.scale(kind==='ram'?1.3:1.55,kind==='ram'?1.3:1.55);drawSiege({id:1,kind,team:team||1,face:1,cd:0});ctx.restore();}
  else if(kind==='dock'){ctx.save();ctx.scale(1.25,1.25);ctx.translate(6,12);drawDock({tx:0,ty:0,kind,team:team||1,built:true});ctx.restore();}
  else if(kind==='bridge'){ctx.save();ctx.scale(2.4,2.4);ctx.translate(4,2);ctx.fillStyle='#47aba9';ctx.fillRect(0,0,32,32);drawBridge({tx:0,ty:0,kind,team:1,built:true});ctx.restore();}
  else if(kind==='pit'){ctx.save();ctx.scale(2.4,2.4);ctx.translate(4,4);drawPitTile(0,0);ctx.restore();}
  else if(D.wall){ctx.save();ctx.scale(2.2,2.2);ctx.translate(5.8,-3);(kind==='gate'?drawGate:drawWall)({tx:0,ty:0,kind,team:team||1,built:true,hp:1,maxhp:1});ctx.restore();}
  else if(kind==='tavern'){ctx.save();ctx.scale(.95,.95);ctx.translate(2,-4);drawTavern({tx:0,ty:1,kind:'tavern',team:team||1,built:true});ctx.restore();}
  else if(kind==='market'){ctx.save();ctx.scale(.95,.95);ctx.translate(2,-4);drawMarket({tx:0,ty:1,kind:'market',team:team||1,built:true});ctx.restore();}
  else if(kind==='farm'){ctx.save();ctx.scale(1.4,1.4);ctx.translate(2,8);drawFarm({tx:0,ty:0,kind:'farm',team:team||1,built:true});ctx.restore();}
  else circ(48,48,30,TEAMC[team||1],'#2b2232',3);
  ctx=prev;
  return iconCache[key]=c.toDataURL();
}


// ---------------------------------------------------------------- the market fair: a little stall around the trader
function drawStallBack(e){
  const c=e.team===2?'#d6453a':'#4a76d8';
  line(-15,-2,-15,-40,'#5a3a1a',2.4);line(15,-2,15,-40,'#5a3a1a',2.4);
  for(let i=0;i<5;i++){P();ctx.moveTo(-19+i*7.6,-40);ctx.lineTo(-19+(i+1)*7.6,-40);ctx.lineTo(-17+(i+1)*7,-50);ctx.lineTo(-17+i*7,-50);ctx.closePath();fs(i%2?'#fff3cc':c,'#3a2614',1);}
}
function drawStallFront(e,sc){
  rr(-18,-13,36,10,3,'#a8743f','#3a2614',1.4);rr(-18,-13,36,3,1.5,'#c99a62');
  const k=e.trader.saleT&&S.t-e.trader.saleT<1.2;
  circ(-10,-15,3.6,'#e05a4a','#6a2a20',1);rr(-3,-20,9,7,2,'#9a6a35','#3a2614',1);circ(10,-16,3.2,k?'#ffd84a':'#9fd36a',k?'#8a6a10':'#3a6a20',1);
  const f=Math.floor(e.trader.fame||0);for(let i=0;i<f;i++)star5(-((f-1)*4.5)+i*9,-58*sc,3.6,'#ffd84a','#5a3a10');
}
// ---------------------------------------------------------------- fog of war
let fogCv=null,fogImg=null,fogAt=-1;
function fogHide(e){
  if(e.team===1)return false;
  const D=DEF[e.kind];
  if(D.building||D.resource){const r=rectOf(e);return !fogKnown(r[0]+r[2]/2,r[1]+r[3]/2);}
  if(e.team===0&&e.ally===1||e.aid&&e.aid.team===1&&S.t<e.aid.until)return false;
  return !fogSees(e.x,e.y);
}
function fogPaint(){
  if(!fogCv||fogCv.width!==MW||fogCv.height!==MH){fogCv=document.createElement('canvas');fogCv.width=MW;fogCv.height=MH;fogImg=fogCv.getContext('2d').createImageData(MW,MH);}
  const d=fogImg.data,seen=S.seen;
  for(let i=0;i<N;i++){const v=FOGV&&FOGV[i]?0:seen&&seen[i]?120:238,o=i*4;d[o]=22;d[o+1]=26;d[o+2]=34;d[o+3]=v;}
  fogCv.getContext('2d').putImageData(fogImg,0,0);
}
function drawFog(){
  if(AT-fogAt>.2||!fogCv){fogAt=AT;fogPaint();}
  const sm=ctx.imageSmoothingEnabled;ctx.imageSmoothingEnabled=true;
  ctx.drawImage(fogCv,0,0,MW,MH,0,0,MW*TS,MH*TS);
  ctx.imageSmoothingEnabled=sm;
}
// ---------------------------------------------------------------- the army: banners over the leaders, rings on the squads
const SQ_RED=['#ff8a6a','#ffb08a','#ff6a8a','#ffa64a','#e0705a','#ff9ec0','#f07a3a','#ffc06a','#d85a5a','#ffd0b0'];
const BUF_COL={escudos:'#7fd4ff',avante:'#9fe07a',linha:'#ffd84a',grito:'#ff6a4a'};
function unitTop(e){const D=DEF[e.kind];return (baseKind(e.kind)==='lancer'?52:44)*((D.look&&D.look.s)||1);}
function drawPennant(x,y,col,big,tc){
  const wv=Math.sin(AT*4+x*.05)*2;
  line(x,y,x,y-(big?26:18),'#2b2232',1.6);
  if(big){
    P();ctx.moveTo(x,y-26);ctx.lineTo(x+20,y-24+wv);ctx.lineTo(x+15,y-18+wv*.6);ctx.lineTo(x+20,y-12+wv);ctx.lineTo(x,y-11);ctx.closePath();fs(tc,'#2b2232',1.3);
    rr(x+1,y-21,8,4,1,col);star5(x+10,y-18.5+wv*.5,3.2,'#ffd84a','#5a3a10');
  }else{P();ctx.moveTo(x,y-18);ctx.lineTo(x+13,y-15+wv);ctx.lineTo(x,y-11);ctx.closePath();fs(col,'#2b2232',1.2);}
}
function drawSquads(selSet,vx0,vy0,vx1,vy1,fog){
  if(!S.armies)return;
  for(const team of[1,2]){
    const A=S.armies[team];if(!A||!A.sq.length)continue;
    const pal=team===1?SQ_COL:SQ_RED;
    for(const q of A.sq){
      const L=byId.get(q.lead);if(!alive(L))continue;
      const col=pal[q.col%pal.length],picked=team===1&&(selSet.has(L.id)||q.mem.some(id=>selSet.has(id)));
      const buf=Object.keys(BUF_COL).find(k=>sqBuf(q,k));
      if(picked||buf){
        for(const id of q.mem){const u=byId.get(id);if(!alive(u)||u.x<vx0||u.x>vx1||u.y<vy0||u.y>vy1||fog&&fogHide(u))continue;const r=DEF[u.kind].r+4;
          if(buf){ctx.globalAlpha=.45+.25*Math.sin(AT*6+u.id);ell(u.x,u.y,r+2,(r+2)*.45,null,BUF_COL[buf],2.4);ctx.globalAlpha=1;}
          if(picked){ctx.setLineDash([3,3]);ell(u.x,u.y,r,r*.45,null,col,1.6);ctx.setLineDash([]);}}
        if(picked&&q.par){const P2=byId.get((A.sq.find(s=>s.id===q.par)||{}).lead);if(alive(P2)){ctx.globalAlpha=.5;ctx.setLineDash([2,5]);line(L.x,L.y-8,P2.x,P2.y-8,col,1.4);ctx.setLineDash([]);ctx.globalAlpha=1;}}
      }
      if(L.x<vx0||L.x>vx1||L.y<vy0||L.y>vy1||fog&&fogHide(L))continue;
      const gen=A.gen===L.id,top=unitTop(L)+(L.rank?14:4);
      drawPennant(L.x-12,L.y-top+16,col,gen,TEAMC[team]);
      if(buf){ctx.font='700 13px system-ui, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#2b2232';const g=CMD[buf].glyph;ctx.strokeText(g,L.x+12,L.y-top-2);ctx.fillStyle=BUF_COL[buf];ctx.fillText(g,L.x+12,L.y-top-2);}
      if(q.morT>S.t&&!sqBuf(q,'linha')){ctx.globalAlpha=.7;for(let i=0;i<3;i++)circ(L.x-6+i*6,L.y-top-8+Math.sin(AT*5+i)*1.5,2.2,'#c9c2b0');ctx.globalAlpha=1;}
    }
  }
  // a command shouted: a wave from the leader
  for(const f of FX.cmds){
    const L=byId.get(f.id);if(!alive(L)||fog&&fogHide(L))continue;const u=f.t/1.4,c=BUF_COL[f.k]||'#fff';
    ctx.globalAlpha=Math.max(0,1-u);ell(L.x,L.y,14+u*110,(14+u*110)*.45,null,c,3.5);
    ctx.font='700 15px "Pixelify Sans", system-ui, sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#2b2232';
    const t=CMD[f.k]?CMD[f.k].name:'';const y=L.y-unitTop(L)-30-u*16;ctx.strokeText(t,L.x,y);ctx.fillStyle=c;ctx.fillText(t,L.x,y);ctx.globalAlpha=1;
  }
}
// ---------------------------------------------------------------- the war plan on the map
const PLAN_GLYPH={tower:'▲',raise:'▲',wall:'▬',pit:'▒',ambush:'✦',attack:'➜'};
function drawPlan(){
  const I=S.intel&&S.intel[1];if(!I)return;
  const items=I.plan.filter(p=>p.st==='new'||p.st==='raising');
  ctx.font='700 12px system-ui, sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  items.forEach((p,n)=>{
    const pulse=.5+.5*Math.sin(AT*4+n);
    if(p.tiles)for(const t of p.tiles){const [x,y]=Array.isArray(t)?t:[t%MW,(t/MW)|0];ctx.fillStyle=p.kind==='pit'?'rgba(120,80,40,.38)':p.kind==='raise'?'rgba(240,220,120,.35)':'rgba(255,255,255,.35)';ctx.fillRect(x*TS+2,y*TS+2,TS-4,TS-4);}
    if(p.kind==='wall'&&p.gate){ctx.fillStyle='rgba(255,216,74,.55)';ctx.fillRect(p.gate[0]*TS+2,p.gate[1]*TS+2,TS-4,TS-4);}
    if(p.kind==='tower'||p.kind==='raise'){ctx.setLineDash([4,3]);rr(p.tx*TS,p.ty*TS,2*TS,2*TS,5,'rgba(110,230,90,.18)','#7be06a',2);ctx.setLineDash([]);ell(p.x,p.y,DEF.tower.range*.9,DEF.tower.range*.65,null,'rgba(255,255,255,.25)',1.2);}
    if(p.kind==='ambush'){ctx.setLineDash([5,4]);ell(p.x,p.y,46,22,'rgba(160,220,120,.15)','#9fe07a',2);ctx.setLineDash([]);}
    if(p.kind==='attack'){const c=castleOf(1);if(c){ctx.setLineDash([10,7]);ctx.lineDashOffset=-AT*20;line(c.x,c.y,p.x,p.y,'rgba(255,90,74,.8)',3);ctx.setLineDash([]);ctx.lineDashOffset=0;}}
    const y=p.y-28-pulse*3;
    circ(p.x,y,12,p.kind==='attack'?'#d6453a':'#24448f','#fff6dd',2.2);
    ctx.fillStyle='#fff';ctx.fillText(String(n+1),p.x,y+.5);
    line(p.x,y+12,p.x,p.y-6,'#fff6dd',1.6);
    const lab=PLAN_GLYPH[p.kind]+' '+PLAN_NAME[p.kind];const tw=ctx.measureText(lab).width+12;
    rr(p.x-tw/2,y-32,tw,17,7,'rgba(255,246,221,.94)','#2b2232',1.2);ctx.fillStyle='#2b2232';ctx.fillText(lab,p.x,y-23.5);
  });
  ctx.textBaseline='alphabetic';
}
