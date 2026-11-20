// ================================================================ Forja: new characters made in the device from the Tiny Swords sheets
// The pixel art uses a tiny palette and every colour has a job (outline, team cloth, armour, skin, hair...). A recipe swaps those
// jobs for new colours and paints small accessories on every frame (crown, horns, antlers, glowing eyes, a burning plume).
// No new image is shipped: the sheets are rebuilt from the ones that already travel inside the game, the first time they show up.
const FG_CODE={'161c2e':1,'485884':2,'4697ac':3,'688c8a':4,'9cbeaa':5,'d4edc2':6,'c8a876':7,'efe1ab':8,'5e5455':9,'977b6b':10,'ffffff':11};
const FG_KEY=[null,'o','td','tl','ad','am','al','sd','sl','hd','hl','w'];
// the team palettes (blue is the original drawing)
const FG_TEAM={1:{},2:{td:'#924159',tl:'#e76161',ad:'#947467',am:'#cf9c71',al:'#e8ce91'},3:{td:'#434055',tl:'#5e6f86',ad:'#5a6366',am:'#8c9695',al:'#b8c1c3'},
  4:{td:'#886049',tl:'#dcaa46',ad:'#ac9256',am:'#d5cc45',al:'#fffaba'},5:{td:'#5c547e',tl:'#ab6e9c',ad:'#998585',am:'#c4b6b1',al:'#f6e2ca'}};
const FG_ANIMS={warrior:['idle','run','atk'],archer:['idle','run','atk'],lancer:['idle','run','atk'],monk:['idle','run','atk'],
  pawn:['idle','run','axe','hammer','knife','pick','idle_food','idle_gold','idle_wood','run_food','run_gold','run_wood']};
// where the head is: the topmost blob of these colours (warrior: the helmet; archer and lancer: the helmet; monk and pawn: the hair)
const FG_HEAD={warrior:[7,8],archer:[4,5,6],lancer:[4,5,6],monk:[9,10],pawn:[9,10]};
const FG_PLUME={fire:['#b8321a','#ff9a1f','#ffe066'],ice:['#4f8fd0','#bfeaff','#ffffff'],void:['#2a1640','#7b3fe4','#e9c8ff'],gold:['#a8741a','#f2c230','#fff2a8'],
  moss:['#3f5a2a','#6f8f3a','#a8c86a'],bone:['#8f8a7a','#d9d2bd','#ffffff'],blood:['#5a0f1a','#b0202e','#ff6b6b']};
// small accessories, drawn pixel by pixel over the head (o outline, H highlight, Y main, y shade, R/B/G gems)
const FG_TOP={
  crown:{w:11,rows:['.o...o...o.','oHo.oHo.oHo','oYYoYYYoYYo','oYYYYYYYYYo','oyRyyByyRyo','ooooooooooo'],col:{H:'#fff6b0',Y:'#f2c230',y:'#b8861a',R:'#e0302a',B:'#3fa8ff'}},
  circlet:{w:11,rows:['.....o.....','....oBo....','ooooyByoooo','oHHYYYYYHHo','ooooooooooo'],col:{H:'#fff6b0',Y:'#e9e3d0',y:'#9aa3b4',B:'#5ff2ff'}},
  horns:{side:true,rows:['o....','Ho...','oHo..','oYHo.','.oyYo','..oYY','...oo'],col:{H:'#fffaf0',Y:'#e8dcc0',y:'#a8977a'}},
  antlers:{side:true,at:.12,rows:['o.o...','Y.Yo..','oYoY.o','.oYYoY','..oYY.','...oY.','...oY.'],col:{Y:'#a8743f',y:'#6b4423'}},
  devil:{side:true,rows:['o....','Ro...','oRo..','oRRo.','.oRRo','..oRR','...oo'],col:{R:'#c62828'}},
};
const FGR={};          // recipes by name
const FG_DONE={};      // prefixes already built
const fgRGB=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];};
function fgShade(h,k){const c=fgRGB(h);return '#'+c.map(v=>Math.round(clamp(k<0?v*(1+k):v+(255-v)*k,0,255)).toString(16).padStart(2,'0')).join('');}
// the colour of each job for this recipe and team
function fgRoles(rc,base,team){
  const r=Object.assign({},FG_TEAM[team]||FG_TEAM[3]),war=base==='warrior';
  const td=r.td||'#485884',tl=r.tl||'#4697ac';
  if(rc.cloth==='dark'){r.td=fgShade(td,-.35);r.tl=fgShade(tl,-.32);}
  else if(Array.isArray(rc.cloth)){r.td=rc.cloth[0];r.tl=rc.cloth[1];}
  if(rc.armor){if(war){r.sd=rc.armor[1];r.sl=rc.armor[2];}else{r.ad=rc.armor[0];r.am=rc.armor[1];r.al=rc.armor[2];}}
  if(rc.blade&&war){r.ad=rc.blade[0];r.am=rc.blade[1];r.al=rc.blade[2];}
  if(rc.skin&&!war){r.sd=rc.skin[0];r.sl=rc.skin[1];}
  if(rc.hair){r.hd=rc.hair[0];r.hl=rc.hair[1];}
  if(rc.out)r.o=rc.out;
  if(rc.shine)r.w=rc.shine;
  const lut=new Array(12).fill(null);
  for(let i=1;i<12;i++)if(r[FG_KEY[i]])lut[i]=fgRGB(r[FG_KEY[i]]);
  return lut;
}
// one sheet: recolour every frame, then paint the accessories
function fgSheet(rc,base,anim,team){
  const src=IMG['b_'+base+'_'+anim],m=META['b_'+base+'_'+anim];if(!src||!m)return null;
  const cv=document.createElement('canvas');cv.width=src.width;cv.height=src.height;
  const g=cv.getContext('2d');g.drawImage(src,0,0);
  let img;try{img=g.getImageData(0,0,cv.width,cv.height);}catch(e){return null;}
  const d=img.data,W=cv.width,H=cv.height,role=new Uint8Array(W*H);
  for(let i=0,p=0;i<d.length;i+=4,p++){
    if(d[i+3]<200)continue;
    const h=((d[i]<<16)|(d[i+1]<<8)|d[i+2]).toString(16).padStart(6,'0');role[p]=FG_CODE[h]||12;
  }
  const lut=fgRoles(rc,base,team),out=d.slice();
  for(let p=0;p<role.length;p++){const c=lut[role[p]];if(c){const i=p*4;out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];}}
  const put=(x,y,c)=>{if(x<0||y<0||x>=W||y>=H)return;const i=(y*W+x)*4,v=fgRGB(c);out[i]=v[0];out[i+1]=v[1];out[i+2]=v[2];out[i+3]=255;};
  const fw=m[0],nf=m[2],headSet=FG_HEAD[base];
  const heads=[];
  for(let f=0;f<nf;f++){
    const X0=f*fw,hd=fgHead(role,W,X0,fw,H,headSet);
    heads[f]=hd;if(!hd)continue;
    // the eyes (or the slit of the helmet) light up
    if(rc.eyes){
      // dark bits closed in by the face or the helmet (the eyes, the slit of the visor): looking both ways along a row or a
      // column, past the dark pixels, both sides are skin or helmet; and nothing transparent touches them
      const bx0=Math.max(X0+1,hd.x0-1),bx1=Math.min(X0+fw-2,hd.x1+1),by0=Math.max(1,hd.y0),by1=Math.min(H-2,hd.y1+(base==='warrior'?0:Math.round((hd.y1-hd.y0)*.9)));
      const isS=p=>role[p]===7||role[p]===8,lit=[];
      const hit=(p,st,n)=>{for(let k=0;k<n;k++){p+=st;if(role[p]!==1)return isS(p);}return false;};
      for(let y=by0;y<=by1;y++)for(let x=bx0;x<=bx1;x++){
        const p=y*W+x;if(role[p]!==1)continue;
        let edge=false;for(const q of[p-1,p+1,p-W,p+W,p-W-1,p-W+1,p+W-1,p+W+1])if(!role[q]){edge=true;break;}
        if(edge)continue;
        if(hit(p,-1,12)&&hit(p,1,12)||hit(p,-W,12)&&hit(p,W,12))lit.push(p);
      }
      if(lit.length<=(base==='warrior'?420:44))for(const p of lit)put(p%W,(p/W)|0,rc.eyes);
    }
    // a plume of fire, ice, shadow... (the team plume of the warriors)
    if(rc.plume&&base==='warrior'){
      const P=FG_PLUME[rc.plume]||rc.plume;
      for(let y=Math.max(0,hd.y0-30);y<hd.y0+3;y++)for(let x=Math.max(X0,hd.x0-16);x<Math.min(X0+fw,hd.x1+16);x++){
        const p=y*W+x,r=role[p];if(r!==2&&r!==3)continue;
        const tip=r===3&&(!role[p-W]||role[p-W]===1),fl=((x*7+y*3+f*5)%9)<2;
        put(x,y,tip?P[2]:fl?(r===2?P[1]:P[2]):(r===2?P[0]:P[1]));
      }
    }
    // a crown, horns or antlers on the head
    const T=rc.top&&FG_TOP[rc.top];
    if(T){
      // the art has chunky pixels, so each pixel of an accessory is drawn as a 2x2 block
      const oc=rc.out||'#161c2e',col=c=>c==='o'?oc:T.col[c]||T.col.Y,Z=2,blk=(x,y,c)=>{for(let a=0;a<Z;a++)for(let b=0;b<Z;b++)put(x+a,y+b,c);};
      const rows=T.rows,h=rows.length,w=rows[0].length;
      if(T.side){
        // each horn grows from the side of the head, a quarter of the way down
        const ay=hd.y0+Math.max(2,Math.round((hd.y1-hd.y0)*(T.at||.22))),ex=hd.rows[ay]||[hd.x0,hd.x1];
        for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=rows[j][i];if(c==='.')continue;
          blk(ex[0]+3-(w-i)*Z,ay-(h-j)*Z+3,col(c));blk(ex[1]-3+(w-i-1)*Z,ay-(h-j)*Z+3,col(c));}
      }else{
        const cx=Math.round((hd.x0+hd.x1)/2-w*Z/2),by=hd.y0+(T.sink||3);
        for(let j=0;j<h;j++)for(let i=0;i<w;i++){const c=rows[j][i];if(c&&c!=='.')blk(cx+i*Z,by-(h-j)*Z,col(c));}
      }
    }
  }
  img.data.set(out);g.putImageData(img,0,0);
  cv.heads=heads;
  return cv;
}
// the topmost blob of the head colours in one frame (small bits like the tip of a spear are skipped)
function fgHead(role,W,X0,fw,H,set){
  const seen=new Uint8Array(fw*H),ok=r=>set.includes(r);let best=null;
  for(let y=0;y<H;y++)for(let x=0;x<fw;x++){
    const p=y*W+X0+x;if(seen[y*fw+x]||!ok(role[p]))continue;
    const st=[[x,y]];seen[y*fw+x]=1;let n=0,x0=x,x1=x,y0=y,y1=y;const rows={};
    while(st.length){const[a,b]=st.pop();n++;if(a<x0)x0=a;if(a>x1)x1=a;if(b<y0)y0=b;if(b>y1)y1=b;const R=rows[b]||(rows[b]=[a+X0,a+X0]);if(a+X0<R[0])R[0]=a+X0;if(a+X0>R[1])R[1]=a+X0;
      for(const[c,e]of[[a-1,b],[a+1,b],[a,b-1],[a,b+1]]){if(c<0||e<0||c>=fw||e>=H||seen[e*fw+c])continue;if(ok(role[e*W+X0+c])){seen[e*fw+c]=1;st.push([c,e]);}}}
    if(n>=40&&x1-x0>=12&&(!best||y0<best.y0))best={x0:x0+X0,x1:x1+X0,y0,y1,n,rows};
  }
  return best;
}
// the prefix of a recipe's sheets for a team; built the first time it is asked for
function fgPre(name,team){
  const k='F'+name+'_'+(team||1)+'_';
  if(!FG_DONE[k]&&assetsReady&&FGR[name])fgMake(name,team||1,k);
  return k;
}
function fgMake(name,team,k){
  FG_DONE[k]=1;const rc=FGR[name],base=rc.base;
  for(const a of FG_ANIMS[base]){const cv=fgSheet(rc,base,a,team),src='b_'+base+'_'+a;IMG[k+base+'_'+a]=cv||IMG[pre(team)+base+'_'+a]||IMG[src];META[k+base+'_'+a]=META[src];}
  if(base==='monk'){IMG[k+'monk_fx']=IMG[pre(team)+'monk_fx'];META[k+'monk_fx']=META['b_monk_fx'];}
}
function fgForget(name){for(const k in FG_DONE)if(k.startsWith('F'+name+'_'))delete FG_DONE[k];for(const k in iconCache)delete iconCache[k];}

// ---- what is drawn around a forged character: auras, halo
const FG_AURA={
  fire:{name:'Fogo',ring:'rgba(255,120,40,.28)'},ice:{name:'Gelo',ring:'rgba(150,220,255,.3)'},shadow:{name:'Sombra',ring:'rgba(60,20,90,.35)'},
  holy:{name:'Luz',ring:'rgba(255,230,140,.3)'},nature:{name:'Natureza',ring:'rgba(110,200,90,.28)'},storm:{name:'Raio',ring:'rgba(120,170,255,.3)'},
  necro:{name:'Morte',ring:'rgba(110,255,120,.22)'},
};
function fgBack(e,rc,sc){
  const A=rc.aura&&FG_AURA[rc.aura];if(!A)return;
  const D=DEF[e.kind],p=.5+.5*Math.sin(AT*3+e.id),r=D.r+9+p*2;
  ell(0,0,r,r*.42,A.ring);
  if(rc.aura==='shadow'||rc.aura==='necro')for(let i=0;i<3;i++){const t=(AT*.6+i/3+e.id*.13)%1;ctx.globalAlpha=.35*(1-t);circ(Math.sin(i*2.1+e.id)*D.r,-t*36*sc-4,5+t*7,rc.aura==='necro'?'#2f6b3a':'#2a1640');ctx.globalAlpha=1;}
}
function fgFront(e,rc,sc){
  const D=DEF[e.kind],top=-52*sc;
  if(rc.halo){const y=top-4+Math.sin(AT*2+e.id);ctx.save();ctx.globalAlpha=.9;P();ctx.ellipse(0,y,8*sc,2.6*sc,0,0,Math.PI*2);ctx.strokeStyle='#fff2a0';ctx.lineWidth=2.4;ctx.stroke();ctx.globalAlpha=.35;ctx.lineWidth=5;ctx.stroke();ctx.restore();}
  const a=rc.aura;if(!a)return;
  const n=5,seed=e.id*1.37;
  for(let i=0;i<n;i++){
    const t=(AT*(a==='ice'?.35:.7)+i/n+seed)%1,x=Math.sin(i*2.4+seed*3)*(D.r+4)+Math.sin(AT*2+i)*2;
    if(a==='fire'){const y=-4-t*44*sc;ctx.globalAlpha=1-t;rr(x-1.5,y-1.5,3,3,.5,t<.4?'#ffe066':'#ff7a1a');}
    else if(a==='ice'){const y=top+t*48*sc;ctx.globalAlpha=.9-.6*t;line(x-2,y,x+2,y,'#e6f8ff',1.2);line(x,y-2,x,y+2,'#e6f8ff',1.2);}
    else if(a==='holy'){const y=-6-t*46*sc;ctx.globalAlpha=.8*(1-t);circ(x,y,1.6,'#fff2a0');}
    else if(a==='nature'){const ang=AT*1.5+i*1.26+seed,y=-18*sc+Math.sin(ang*2)*8;const lx=Math.cos(ang)*(D.r+6);ctx.globalAlpha=.9;ctx.save();ctx.translate(lx,y);ctx.rotate(ang*2);P();ctx.moveTo(0,-3);ctx.quadraticCurveTo(3,0,0,3);ctx.quadraticCurveTo(-3,0,0,-3);fs('#7bd86a','#2f6a24',.8);ctx.restore();}
    else if(a==='storm'){if(((AT*3+i*.37+seed)%1)<.12){const y=top+8+i*6;ctx.globalAlpha=1;P();ctx.moveTo(x,y);ctx.lineTo(x+3,y+4);ctx.lineTo(x-1,y+6);ctx.lineTo(x+2,y+11);ctx.strokeStyle='#bfe0ff';ctx.lineWidth=1.6;ctx.stroke();}else{ctx.globalAlpha=.7*(1-t);circ(x,-6-t*40*sc,1.3,'#8fc4ff');}}
    else if(a==='necro'){const y=-6-t*42*sc;ctx.globalAlpha=.8*(1-t);circ(x,y,1.8,'#7cff6b');}
    else if(a==='shadow'){const y=-6-t*40*sc;ctx.globalAlpha=.7*(1-t);rr(x-1.5,y-1.5,3,3,.5,'#c08cff');}
  }
  ctx.globalAlpha=1;
}

// ---- the characters of the Forja (used by the new chapters, the bosses and the elite troops)
Object.assign(FGR,{
  chama:  {name:'Cavaleiro em Chamas',base:'warrior',armor:['#2a1a16','#7a3b22','#c0632e'],blade:['#b8321a','#ff8a1f','#ffe066'],plume:'fire',eyes:'#ffd23f',aura:'fire'},
  runico: {name:'Cavaleiro Rúnico',base:'warrior',armor:['#1f2433','#3b4256','#646e8c'],blade:['#1d6f8a','#38c6e8','#d4fbff'],plume:'ice',eyes:'#5ff2ff',top:'circlet',aura:'storm'},
  druida: {name:'Druida do Bosque',base:'monk',hair:['#3f5a2a','#76a03c'],top:'antlers',eyes:'#b8ff6a',aura:'nature'},
  sombra: {name:'Caçadora das Sombras',base:'archer',cloth:'dark',armor:['#241a35','#46316a','#7a5aa8'],eyes:'#f08cff',aura:'shadow'},
  gelo:   {name:'Lanceira de Gelo',base:'lancer',armor:['#4f86b3','#a6d8f2','#f2fcff'],skin:['#b9c8d6','#e6eef5'],aura:'ice'},
  necro:  {name:'Necromante',base:'monk',cloth:['#1d1828','#3c2f58'],skin:['#8e9a8e','#c3ccc0'],hair:['#2c2c36','#4d4d5c'],out:'#0b0d14',eyes:'#7cff6b',top:'devil',aura:'necro'},
  esqueleto:{name:'Esqueleto',base:'warrior',armor:['#7f7a6a','#c9c2ad','#efe9d8'],blade:['#4f3f31','#80634a','#b0957a'],cloth:['#3a3836','#5a5852'],plume:'bone',eyes:'#7cff6b'},
  esqarq: {name:'Esqueleto arqueiro',base:'archer',cloth:['#3a3836','#5a5852'],armor:['#3e3630','#5f5246','#837363'],skin:['#c9c2ad','#efe9d8'],eyes:'#7cff6b'},
  gigante:{name:'Gigante de Pedra',base:'warrior',armor:['#3d3f46','#7a7d86','#a9acb4'],blade:['#3f5a2a','#5f7f3a','#93b25e'],cloth:['#4d4f57','#757881'],out:'#17181d',plume:'moss',eyes:'#ffb02e'},
  orc:    {name:'Orc Brutamontes',base:'pawn',skin:['#4f7a34','#82b34c'],hair:['#262222','#463c3c'],cloth:'dark',top:'horns',eyes:'#ff5a3a'},
  anjo:   {name:'Guardiã Celeste',base:'lancer',armor:['#c9a84a','#f2d978','#fffbe0'],shine:'#fffbe0',halo:true,aura:'holy'},
});

// ---- portraits: the head of a forged character, for the hero cards and the speech boxes
const AVF={};
function fgPortrait(name){
  const rc=FGR[name];if(!rc||!assetsReady)return null;
  const k=fgPre(name,1)+rc.base+'_idle',im=IMG[k],m=META[k];if(!im||!m)return null;
  const c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d');g.imageSmoothingEnabled=false;
  g.fillStyle='#f3e3b8';g.beginPath();g.arc(48,48,46,0,7);g.fill();
  const hd=im.heads&&im.heads[0];let cx,cy,sz;
  if(hd){const hw=hd.x1-hd.x0;sz=Math.max(hw*2,46);cx=(hd.x0+hd.x1)/2;cy=hd.y0-(rc.top?11:6);}
  else{sz=Math.min(m[5]-m[3],m[6]-m[4]);cx=(m[3]+m[5])/2;cy=m[4];}
  g.save();g.beginPath();g.arc(48,48,44,0,7);g.clip();g.drawImage(im,cx-sz/2,cy,sz,sz,4,6,88,88);g.restore();
  g.strokeStyle='#8a6232';g.lineWidth=4;g.beginPath();g.arc(48,48,45,0,7);g.stroke();
  return c.toDataURL();
}
// every avatar goes through here: the Tiny Swords portraits, or 'F'+recipe for a forged one
function avURL(k){
  if(k&&k[0]==='F'){const n=k.slice(1);if(!AVF[k])AVF[k]=fgPortrait(n);return AVF[k]||'assets/av01.png';}
  return `assets/${k||'av05'}.png`;
}

// ---- Forja de Heróis: the player builds a hero of their own
const FJ_COL={orig:null,ouro:['#7a5410','#c8901e','#f6d466'],prata:['#5d6575','#a7b0bf','#eef1f5'],bronze:['#5a3420','#a0602e','#e0a060'],
  obsidiana:['#1f2433','#3b4256','#646e8c'],rubi:['#5a1020','#b02838','#f07080'],esmeralda:['#14502e','#2f9a56','#9ee6a8'],safira:['#16306a','#2f63c8','#8fc0ff'],
  ametista:['#3a1f5c','#6e44a8','#c09ae6'],osso:['#7f7a6a','#c9c2ad','#efe9d8'],gelo:['#4f86b3','#a6d8f2','#f2fcff'],fogo:['#b8321a','#ff8a1f','#ffe066'],musgo:['#3f5a2a','#5f7f3a','#93b25e']};
const FJ_SKIN={clara:null,morena:['#9a6a45','#c99268'],escura:['#5e3f2c','#8a5f42'],palida:['#b9c8d6','#e6eef5'],verde:['#4f7a34','#82b34c'],cinza:['#8e9a8e','#c3ccc0'],azul:['#4a6fa8','#7fa6e0'],vermelha:['#a8443a','#e07a6a']};
const FJ_HAIR={castanho:null,preto:['#262222','#463c3c'],ruivo:['#923f1c','#d9843f'],loiro:['#a87a2a','#e8c45a'],branco:['#a2a8b4','#e3e6ec'],verde:['#3f5a2a','#76a03c'],azul:['#2a3f8a','#5a7ae0'],roxo:['#4a2a6a','#9a5ad0']};
const FJ_EYES={normal:null,ouro:'#ffd23f',ciano:'#5ff2ff',verde:'#7cff6b',vermelho:'#ff4b3a',violeta:'#f08cff',branco:'#ffffff'};
const FJ_CLASS={warrior:['Guerreiro','Espada e escudo. Forte contra arqueiros.'],archer:['Arqueiro','Ataca de longe. Forte contra lanceiros.'],lancer:['Lanceiro','Resistente e com alcance. Forte contra guerreiros.'],
  monk:['Monge','Cura quem está perto e ataca de longe.'],pawn:['Lenhador','Machado que acerta vários de uma vez.']};
const FJ_TOP={nenhum:'Nada',crown:'Coroa',circlet:'Diadema',horns:'Chifres',devil:'Chifres de demônio',antlers:'Galhada',halo:'Auréola'};
const FJ_PLUME={time:'Cor do reino',fire:'Fogo',ice:'Gelo',void:'Sombra',gold:'Ouro',moss:'Musgo',blood:'Sangue',bone:'Osso'};
const FJ_AURA={nenhuma:['Nenhuma','Um pouco mais de vida e de dano.'],fire:['Fogo','+30% de dano.'],ice:['Gelo','Quem ele acerta fica lento.'],storm:['Raio','Ataca 33% mais rápido.'],
  shadow:['Sombra','Mais rápido e enxerga mais longe.'],holy:['Luz','Cura quem luta ao lado dele.'],nature:['Natureza','Recupera a vida bem depressa.'],necro:['Morte','Rouba vida a cada golpe.']};
const FJ_BASE={warrior:{hp:125,speed:58,r:9,dmg:12,range:18,cd:1,sight:215},archer:{ranged:true,hp:65,speed:61,r:8,dmg:9,range:160,cd:1.25,sight:230},
  lancer:{hp:155,speed:55,r:10,dmg:15,range:30,cd:1.35,sight:215},monk:{ranged:true,aura:true,hp:72,speed:52,r:9,dmg:9,range:155,cd:1.3,sight:240},
  pawn:{hp:145,speed:56,r:10,dmg:15,range:22,cd:1.2,sight:210,cleave:28}};
const FJ_DEFAULT={name:'Meu Herói',base:'warrior',armor:'orig',blade:'orig',skin:'clara',hair:'castanho',plume:'time',eyes:'normal',top:'nenhum',aura:'nenhuma',big:false,fem:false};
function fjRecipe(c){
  const r={name:c.name,base:c.base},metal=c.base==='warrior'||c.base==='archer'||c.base==='lancer';
  if(metal&&FJ_COL[c.armor])r.armor=FJ_COL[c.armor];
  if(c.base==='warrior'&&FJ_COL[c.blade])r.blade=FJ_COL[c.blade];
  if(c.base!=='warrior'&&FJ_SKIN[c.skin])r.skin=FJ_SKIN[c.skin];
  if((c.base==='monk'||c.base==='pawn')&&FJ_HAIR[c.hair])r.hair=FJ_HAIR[c.hair];
  if(c.base==='warrior'&&c.plume!=='time'&&FG_PLUME[c.plume])r.plume=c.plume;
  if(FJ_EYES[c.eyes])r.eyes=FJ_EYES[c.eyes];
  if(c.top==='halo')r.halo=true;else if(FG_TOP[c.top])r.top=c.top;
  if(FG_AURA[c.aura])r.aura=c.aura;
  return r;
}
function fjStats(c){
  const D=Object.assign({},FJ_BASE[c.base]||FJ_BASE.warrior);
  switch(c.aura){
    case 'fire':D.dmg*=1.3;break;case 'ice':D.chill=1.5;D.hp*=1.1;break;case 'storm':D.cd*=.75;break;
    case 'shadow':D.speed*=1.22;D.sight+=40;break;case 'holy':D.aura=true;D.regen=2;break;case 'nature':D.regen=6;D.hp*=1.1;break;
    case 'necro':D.drain=.3;break;default:D.hp*=1.1;D.dmg*=1.1;
  }
  if(c.big){D.hp*=1.2;D.speed*=.92;D.r+=2;}
  D.hp=Math.round(D.hp);D.dmg=Math.round(D.dmg*10)/10;
  return D;
}
let fjSig='';
// makes the player's hero real: its recipe, its unit and its card in the list of heroes
function fjSync(){
  const c=ui&&ui.save&&ui.save.forja;
  const sig=c?JSON.stringify(c):'';if(sig===fjSig)return;fjSig=sig;
  if(!c){delete HEROES.forja;return;}
  FGR.my=fjRecipe(c);fgForget('my');delete AVF.Fmy;
  DEF.myhero=Object.assign({name:c.name,unit:true,mil:true,noConvert:true,look:{f:'my',base:c.base,s:c.big?1.25:1,atk:c.base==='pawn'?'axe':undefined},desc:'O herói que você criou na Forja.'},fjStats(c));
  HEROES.forja={kind:'myhero',name:c.name,av:'Fmy',role:FJ_CLASS[c.base][0]+' da Forja',desc:FJ_AURA[c.aura][1],fem:!!c.fem};
}
const FJ={c:null,team:1,anim:0,raf:0};
function openForja(){
  FJ.c=Object.assign({},FJ_DEFAULT,ui.save.forja||{});FJ.team=1;FJ.anim=0;
  $('ov-forja').hidden=false;fjRender();fjPreview(true);
  cancelAnimationFrame(FJ.raf);const loop=()=>{if($('ov-forja').hidden)return;fjDraw();FJ.raf=requestAnimationFrame(loop);};loop();
}
function fjRender(){
  const c=FJ.c,metal=c.base==='warrior'||c.base==='archer'||c.base==='lancer';
  const chips=(key,opts,lab)=>`<div class="fj-row"><b>${lab}</b><div class="fj-chips">${Object.entries(opts).map(([k,v])=>`<button type="button" data-k="${key}" data-v="${k}" aria-pressed="${c[key]===k}">${Array.isArray(v)?v[0]:v}</button>`).join('')}</div></div>`;
  const sw=(key,opts,lab,first)=>`<div class="fj-row"><b>${lab}</b><div class="fj-chips sw">${Object.entries(opts).map(([k,v])=>{const col=v?(Array.isArray(v)?(v[1]||v[0]):v):null;
    return `<button type="button" class="swc" data-k="${key}" data-v="${k}" aria-pressed="${c[key]===k}" title="${k===Object.keys(opts)[0]?first:k}" aria-label="${k===Object.keys(opts)[0]?first:k}" style="${col?`background:${col}`:''}">${col?'':'✕'}</button>`;}).join('')}</div></div>`;
  let h=`<div class="fj-row"><b>Nome</b><input id="fj-name" maxlength="18" value="${c.name.replace(/"/g,'&quot;')}" aria-label="Nome do herói"></div>`;
  h+=chips('base',FJ_CLASS,'Classe');
  if(metal)h+=sw('armor',FJ_COL,c.base==='warrior'?'Elmo e escudo':'Elmo e armadura','Original');
  if(c.base==='warrior')h+=sw('blade',FJ_COL,'Espada','Original');
  if(c.base==='warrior')h+=chips('plume',FJ_PLUME,'Pluma');
  if(c.base!=='warrior')h+=sw('skin',FJ_SKIN,'Pele','Original');
  if(c.base==='monk'||c.base==='pawn')h+=sw('hair',FJ_HAIR,'Cabelo','Original');
  h+=sw('eyes',FJ_EYES,'Olhos que brilham','Normais');
  h+=chips('top',FJ_TOP,'Na cabeça');
  h+=chips('aura',FJ_AURA,'Aura e poder');
  h+=`<div class="fj-row"><b>Porte e voz</b><div class="fj-chips"><button type="button" data-k="big" data-v="0" aria-pressed="${!c.big}">Normal</button><button type="button" data-k="big" data-v="1" aria-pressed="${!!c.big}">Grande</button>
    <button type="button" data-k="fem" data-v="0" aria-pressed="${!c.fem}">Voz grave</button><button type="button" data-k="fem" data-v="1" aria-pressed="${!!c.fem}">Voz aguda</button></div></div>`;
  $('fj-opts').innerHTML=h;
  const D=fjStats(c);
  $('fj-perk').innerHTML=`<b>${FJ_CLASS[c.base][0]}</b> · ${FJ_CLASS[c.base][1]} <b>${FJ_AURA[c.aura][0]}:</b> ${FJ_AURA[c.aura][1]}<br><small>Vida ${Math.round(D.hp*2.5)} · dano ${D.dmg} · alcance ${D.range} · velocidade ${Math.round(D.speed)}</small>`;
}
function fjPreview(){FGR.fjprev=fjRecipe(FJ.c);fgForget('fjprev');}
function fjDraw(){
  const cv=$('fj-cv'),g=cv.getContext('2d'),c=FJ.c,rc=FGR.fjprev;if(!rc)return;
  g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,cv.width,cv.height);
  const gr=g.createLinearGradient(0,0,0,cv.height);gr.addColorStop(0,'#5d9c4f');gr.addColorStop(1,'#3f7a3a');g.fillStyle=gr;g.fillRect(0,0,cv.width,cv.height);
  if(!assetsReady)return;
  const anims=c.base==='pawn'?['idle','run','axe']:['idle','run','atk'],a=anims[Math.floor(AT/2.6)%3];
  const pre=fgPre('fjprev',FJ.team),k=pre+c.base+'_'+a,m=META[k];if(!m)return;
  const prev=ctx;ctx=g;
  const an=UNIT_ANCHOR[c.base],sc=an[2]*(c.big?1.25:1),z=c.base==='lancer'?2.6:3.4;
  ctx.setTransform(z,0,0,z,cv.width/2,cv.height-28);ctx.imageSmoothingEnabled=false;
  const e={id:3,kind:'myhero',team:FJ.team,face:1};
  const D0=DEF.myhero;DEF.myhero=Object.assign({},fjStats(c),{look:{f:'fjprev',base:c.base}});
  try{fgBack(e,rc,sc);shadow(0,0,DEF.myhero.r+2,3.4);spr(k,Math.floor(AT*(a==='run'?12:a==='idle'?8:10)),0,0,{ax:an[0],ay:an[1],s:sc});fgFront(e,rc,sc);}
  finally{if(D0)DEF.myhero=D0;else delete DEF.myhero;ctx=prev;}
}
function fjSet(k,v){
  const c=FJ.c;
  if(k==='big'||k==='fem')c[k]=v==='1';else c[k]=v;
  fjRender();fjPreview();
}
function fjRandom(){
  const pick=o=>{const ks=Object.keys(o);return ks[(Math.random()*ks.length)|0];};
  const NAMES=['Brann','Kael','Lyra','Tor','Aurora','Draven','Selene','Bento','Yara','Orion','Vesna','Ícaro','Nara','Gael','Zuri','Fenrir'];
  FJ.c=Object.assign({},FJ.c,{base:pick(FJ_CLASS),armor:pick(FJ_COL),blade:pick(FJ_COL),skin:pick(FJ_SKIN),hair:pick(FJ_HAIR),plume:pick(FJ_PLUME),eyes:Math.random()<.6?pick(FJ_EYES):'normal',top:pick(FJ_TOP),aura:pick(FJ_AURA),big:Math.random()<.3});
  FJ.c.name=NAMES[(Math.random()*NAMES.length)|0];
  fjRender();fjPreview();
}
function fjSave(){
  const c=FJ.c;c.name=(($('fj-name')&&$('fj-name').value)||'').trim().slice(0,18)||'Meu Herói';
  ui.save.forja=Object.assign({},c);if((radio('mode')||'campaign')==='skirmish')ui.save.heroSk='forja';else ui.save.hero='forja';writeSave();fjSync();
  $('ov-forja').hidden=true;renderMenu();
  const r=document.querySelector('input[name="hero"][value="forja"]');if(r){r.checked=true;r.closest('label').scrollIntoView({block:'nearest'});}
  toast(`${c.name} está pronto para a batalha.`);
}

{ // the Forja screen's buttons
  const el=id=>document.getElementById(id);
  el('fj-opts').addEventListener('click',ev=>{const b=ev.target.closest('button[data-k]');if(b)fjSet(b.dataset.k,b.dataset.v);});
  el('fj-opts').addEventListener('input',ev=>{if(ev.target.id==='fj-name')FJ.c.name=ev.target.value;});
  el('fj-t1').addEventListener('click',()=>{FJ.team=1;el('fj-t1').setAttribute('aria-pressed','true');el('fj-t2').setAttribute('aria-pressed','false');});
  el('fj-t2').addEventListener('click',()=>{FJ.team=2;el('fj-t2').setAttribute('aria-pressed','true');el('fj-t1').setAttribute('aria-pressed','false');});
  el('fj-save').addEventListener('click',fjSave);
  el('fj-rand').addEventListener('click',fjRandom);
  el('fj-close').addEventListener('click',()=>{el('ov-forja').hidden=true;});
  el('b-forja').addEventListener('click',openForja);
}
