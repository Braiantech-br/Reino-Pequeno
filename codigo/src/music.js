// ================================================================ music: an adaptive medieval score, composed while you play
// Everything is synthesised: plucked lute and harp (Karplus-Strong), recorder, horns, strings, war drums.
// The mood follows the game: village calm, tension when enemies come near, battle when swords cross.
const MUS={on:true,vol:.5,out:null,bus:null,rev:null,send:{},noise:null,ks:new Map(),mood:'',want:'menu',nextT:0,step:0,bar:0,sec:null,secN:0,
  timer:0,rng:null,lastFight:-99,tenseT:-99,after:null,checkT:0,duckTo:1};
const mtof=m=>440*Math.pow(2,(m-69)/12);
// key of D everywhere; scales as pitch classes
const MOODS={
  menu:   {bpm:78, scale:[2,4,6,7,9,11,1],progs:[['D','G','A','D'],['Bm','G','Em','A'],['D','A','G','D'],['G','D','Em','A']]},
  paz:    {bpm:94, scale:[2,4,5,7,9,11,0],progs:[['Dm','C','G','Dm'],['F','C','Am','Dm'],['Dm','Am','C','G'],['Bb','F','C','Dm'],['Dm','G','Dm','C']]},
  tensao: {bpm:100,scale:[2,4,5,7,9,10,0],progs:[['Dm','Dm','Bb','A'],['Dm','Gm','Bb','A'],['Gm','Dm','Bb','A']]},
  batalha:{bpm:138,scale:[2,4,5,7,9,10,1],progs:[['Dm','Bb','C','A'],['Dm','F','Gm','A'],['Gm','Dm','Bb','A'],['Dm','C','Bb','A']]},
  vitoria:{bpm:108,scale:[2,4,6,7,9,11,1],progs:[['D','G','A','D'],['D','Bm','G','A'],['G','A','D','D']]},
  derrota:{bpm:62, scale:[2,4,5,7,9,10,0],progs:[['Dm','Bb','Gm','A'],['Dm','Gm','A','Dm']]},
};
const CHORD={D:[2,0],Dm:[2,1],C:[0,0],G:[7,0],Gm:[7,1],F:[5,0],Am:[9,1],A:[9,0],Bb:[10,0],Bm:[11,1],Em:[4,1],E:[4,0]};
const chordPcs=n=>{const[r,m]=CHORD[n];return [r,(r+(m?3:4))%12,(r+7)%12];};
const pcOf=m=>((m%12)+12)%12;
// the note with pitch class pc closest to m (at or below hi)
function nearPc(m,pc,lo,hi){let best=m,bd=99;for(let k=m-7;k<=m+7;k++)if(pcOf(k)===pc&&k>=(lo??0)&&k<=(hi??127)&&Math.abs(k-m)<bd){bd=Math.abs(k-m);best=k;}return best;}
// chord voiced from a given low note upward
function voicing(n,lo){const pcs=chordPcs(n),out=[];let m=nearPc(lo+3,pcs[0],lo,lo+11);out.push(m);for(const pc of[pcs[1],pcs[2]]){let k=m+1;while(pcOf(k)!==pc)k++;out.push(k);}return out;}
// two-bar melodic rhythms: [start in sixteenths, length]
const RHY={
  menu:   [[[0,8],[8,4],[12,4],[16,12]],[[0,4],[4,4],[8,8],[16,6],[22,2],[24,8]],[[0,6],[6,2],[8,8],[16,8],[24,8]]],
  paz:    [[[0,6],[6,2],[8,4],[12,4],[16,8],[24,4],[28,4]],[[0,4],[4,4],[8,2],[10,2],[12,4],[16,12]],[[2,2],[4,4],[8,4],[12,2],[14,2],[16,6],[22,2],[24,8]],[[0,3],[3,1],[4,4],[8,8],[16,4],[20,4],[24,8]]],
  tensao: [[[0,12],[16,8],[24,8]],[[4,4],[8,8],[20,12]],[[0,8],[12,4],[16,16]]],
  batalha:[[[0,3],[3,1],[4,4],[8,3],[11,1],[12,4],[16,6],[22,2],[24,4],[28,4]],[[0,2],[2,2],[4,4],[8,2],[10,2],[12,4],[16,8],[24,8]],[[0,6],[6,2],[8,6],[14,2],[16,4],[20,4],[24,8]],[[0,4],[4,2],[6,2],[8,4],[12,4],[16,3],[19,1],[20,4],[24,8]]],
  vitoria:[[[0,4],[4,2],[6,2],[8,8],[16,4],[20,4],[24,8]],[[0,3],[3,1],[4,4],[8,4],[12,4],[16,16]]],
  derrota:[[[0,8],[8,8],[16,16]],[[0,12],[12,4],[16,16]]],
};
function musRng(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
// ---------------------------------------------------------------- composition: an 8-bar section (A A' B cadence)
function musSection(mood){
  const M=MOODS[mood],r=MUS.rng,pick=a=>a[Math.floor(r()*a.length)];
  const p1=pick(M.progs),p2=r()<.5?p1:pick(M.progs),prog=[...p1,...p2];
  const R=RHY[mood],motif=pick(R),alt=pick(R);
  const lo=mood==='batalha'||mood==='tensao'?60:64,hi=mood==='batalha'?79:81;
  const scale=[];for(let m=lo;m<=hi;m++)if(M.scale.includes(pcOf(m)))scale.push(m);
  // a contour for the motif, reused in phrases 1 and 3 so the tune is recognisable
  const contour=motif.map(()=>r()<.5?-1:1);
  let prev=mood==='batalha'?69:mood==='tensao'?65:74;const mel=[];
  for(let ph=0;ph<4;ph++){
    const rh=ph===2?alt:motif;
    rh.forEach(([st,len],k)=>{
      const bar=ph*2+(st>=16?1:0),ch=chordPcs(prog[bar]),strong=st%8===0;
      let m;
      if(ph===3&&k===rh.length-1){m=nearPc(prev,CHORD[prog[7]][0],lo,hi);}
      else if(strong){const c=scale.filter(n=>ch.includes(pcOf(n))&&Math.abs(n-prev)<=7).sort((a,b)=>Math.abs(a-prev)-Math.abs(b-prev));m=c.length?c[r()<.72?0:Math.min(c.length-1,1)]:prev;}
      else{let i=scale.indexOf(prev);if(i<0)i=scale.findIndex(n=>n>=prev);if(i<0)i=scale.length-1;const dir=ph===2?(r()<.5?-1:1):contour[k];let j=i+dir*(r()<.78?1:2);if(j<0||j>=scale.length)j=i-dir;m=scale[Math.max(0,Math.min(scale.length-1,j))];}
      mel.push({bar,st:st%16,len,m});prev=m;
    });
  }
  MUS.secN++;
  return {mood,prog,mel,v:MUS.secN%2,perc:MUS.secN%3!==1};
}
// ---------------------------------------------------------------- audio graph
function musInit(){
  const ac=SND.ac;if(!ac||MUS.out)return;
  MUS.rng=musRng((Math.random()*1e9)|0);
  MUS.out=ac.createGain();MUS.out.gain.value=MUS.on?MUS.vol:0;
  const comp=ac.createDynamicsCompressor();comp.threshold.value=-16;comp.knee.value=12;comp.ratio.value=3.5;comp.attack.value=.008;comp.release.value=.25;
  MUS.out.connect(comp);comp.connect(ac.destination);
  MUS.duck=ac.createGain();MUS.duck.gain.value=1;MUS.duck.connect(MUS.out);
  MUS.bus=ac.createGain();MUS.bus.gain.value=1;MUS.bus.connect(MUS.duck);
  // a stone hall: a generated impulse response
  const sr=ac.sampleRate,len=Math.floor(sr*2.4),ir=ac.createBuffer(2,len,sr);
  for(let ch=0;ch<2;ch++){const d=ir.getChannelData(ch);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3)*(i<sr*.015?i/(sr*.015):1);}
  MUS.rev=ac.createConvolver();MUS.rev.buffer=ir;const rg=ac.createGain();rg.gain.value=.5;MUS.rev.connect(rg);rg.connect(MUS.duck);
  for(const[k,v]of Object.entries({pluck:.32,harp:.45,flute:.42,horn:.28,str:.35,pad:.5,drum:.12,bell:.6})){const g=ac.createGain();g.gain.value=v;g.connect(MUS.rev);MUS.send[k]=g;}
  const nb=ac.createBuffer(1,sr,sr),nd=nb.getChannelData(0);for(let i=0;i<sr;i++)nd[i]=Math.random()*2-1;MUS.noise=nb;
  MUS.timer=setInterval(musTick,50);
}
function musOut(node,inst){node.connect(MUS.bus);if(MUS.send[inst])node.connect(MUS.send[inst]);}
function musSet(on,vol){
  if(on!=null)MUS.on=on;if(vol!=null)MUS.vol=vol;
  if(MUS.out&&SND.ac){const t=SND.ac.currentTime;MUS.out.gain.cancelScheduledValues(t);MUS.out.gain.setTargetAtTime(MUS.on?MUS.vol:0,t,.25);}
}
// the voices of the characters push the music back a little while they speak
function musDuck(down){if(!MUS.duck||!SND.ac)return;const t=SND.ac.currentTime;MUS.duck.gain.cancelScheduledValues(t);MUS.duck.gain.setTargetAtTime(down?.42:1,t,down?.08:.5);}
// ---------------------------------------------------------------- instruments
function genv(g,t,a,peak,dur,rel){g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,peak),t+a);g.gain.setValueAtTime(Math.max(.0002,peak),t+Math.max(a,dur-rel));g.gain.exponentialRampToValueAtTime(.0001,t+dur);}
function ksBuf(m,bright){
  const key=m+(bright?'b':'');let b=MUS.ks.get(key);if(b)return b;
  const ac=SND.ac,sr=ac.sampleRate,f=mtof(m),N=Math.max(2,Math.floor(sr/f-.5)),len=Math.floor(sr*(bright?1.8:1.3));
  b=ac.createBuffer(1,len,sr);const d=b.getChannelData(0),ring=new Float32Array(N);
  let pv=0;for(let i=0;i<N;i++){pv=pv*.55+(Math.random()*2-1)*.45;ring[i]=pv;}
  const damp=bright?.9975:.994;let p=0,mx=0;
  for(let i=0;i<len;i++){const a=ring[p],nx=ring[(p+1)%N];d[i]=a;ring[p]=(a+nx)*.5*damp;p=(p+1)%N;if(Math.abs(a)>mx)mx=Math.abs(a);}
  if(mx>0)for(let i=0;i<len;i++)d[i]*=.8/mx;
  b.rate=f/(sr/(N+.5));MUS.ks.set(key,b);return b;
}
function pluck(t,m,vol,inst,bright,cut){
  const ac=SND.ac,b=ksBuf(m,bright),s=ac.createBufferSource(),g=ac.createGain(),fl=ac.createBiquadFilter();
  s.buffer=b;s.playbackRate.value=b.rate;fl.type='lowpass';fl.frequency.value=cut||(bright?5200:2600);g.gain.value=vol;
  s.connect(fl);fl.connect(g);musOut(g,inst||'pluck');s.start(t);s.stop(t+b.duration);
}
function flute(t,m,dur,vol){
  const ac=SND.ac,f=mtof(m),o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain(),g2=ac.createGain(),lf=ac.createOscillator(),lg=ac.createGain();
  o.type='sine';o.frequency.value=f;o2.type='triangle';o2.frequency.value=f*2;g2.gain.value=.1;
  lf.frequency.value=5.3;lg.gain.setValueAtTime(0,t);lg.gain.linearRampToValueAtTime(f*.007,t+Math.min(.45,dur*.7));lf.connect(lg);lg.connect(o.frequency);
  genv(g,t,.06,vol,dur,.12);o.connect(g);o2.connect(g2);g2.connect(g);musOut(g,'flute');
  // a breath at the start of the note
  const n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=MUS.noise;nf.type='bandpass';nf.frequency.value=f*1.5;nf.Q.value=1.2;genv(ng,t,.02,vol*.35,.14,.1);n.connect(nf);nf.connect(ng);musOut(ng,'flute');
  o.start(t);o2.start(t);lf.start(t);n.start(t,Math.random()*.5);o.stop(t+dur+.05);o2.stop(t+dur+.05);lf.stop(t+dur+.05);n.stop(t+.2);
}
function mhorn(t,m,dur,vol,bright){
  const ac=SND.ac,f=mtof(m),g=ac.createGain(),fl=ac.createBiquadFilter();fl.type='lowpass';fl.Q.value=.9;
  fl.frequency.setValueAtTime(260,t);fl.frequency.exponentialRampToValueAtTime(bright?2800:1700,t+.07);fl.frequency.exponentialRampToValueAtTime(bright?1700:1100,t+.3);
  for(const dt of[-7,6]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(fl);o.start(t);o.stop(t+dur+.05);}
  genv(g,t,.035,vol,dur,.1);fl.connect(g);musOut(g,'horn');
}
function strings(t,m,dur,vol,att,cut){
  const ac=SND.ac,f=mtof(m),g=ac.createGain(),fl=ac.createBiquadFilter();fl.type='lowpass';fl.frequency.value=cut||2200;fl.Q.value=.5;
  for(const dt of[-9,0,8]){const o=ac.createOscillator();o.type='sawtooth';o.frequency.value=f;o.detune.value=dt;o.connect(fl);o.start(t);o.stop(t+dur+.05);}
  genv(g,t,att||.012,vol,dur,Math.min(.25,dur*.5));fl.connect(g);musOut(g,att>.2?'pad':'str');
}
function taiko(t,vol,p){
  const ac=SND.ac,o=ac.createOscillator(),g=ac.createGain();o.type='sine';
  o.frequency.setValueAtTime(130*(p||1),t);o.frequency.exponentialRampToValueAtTime(48*(p||1),t+.32);genv(g,t,.002,vol,.5,.4);o.connect(g);musOut(g,'drum');o.start(t);o.stop(t+.55);
  const n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=MUS.noise;nf.type='lowpass';nf.frequency.value=700;genv(ng,t,.001,vol*.55,.09,.07);n.connect(nf);nf.connect(ng);musOut(ng,'drum');n.start(t,Math.random()*.5);n.stop(t+.12);
}
function snare(t,vol){
  const ac=SND.ac,n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=MUS.noise;nf.type='highpass';nf.frequency.value=1300;genv(ng,t,.001,vol,.15,.12);n.connect(nf);nf.connect(ng);musOut(ng,'drum');n.start(t,Math.random()*.5);n.stop(t+.18);
  const o=ac.createOscillator(),g=ac.createGain();o.type='triangle';o.frequency.setValueAtTime(210,t);o.frequency.exponentialRampToValueAtTime(140,t+.07);genv(g,t,.001,vol*.6,.09,.07);o.connect(g);musOut(g,'drum');o.start(t);o.stop(t+.1);
}
function shaker(t,vol){const ac=SND.ac,n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=MUS.noise;nf.type='highpass';nf.frequency.value=6500;genv(ng,t,.008,vol,.07,.05);n.connect(nf);nf.connect(ng);musOut(ng);n.start(t,Math.random()*.5);n.stop(t+.09);}
function crash(t,vol){const ac=SND.ac,n=ac.createBufferSource(),nf=ac.createBiquadFilter(),ng=ac.createGain();n.buffer=MUS.noise;nf.type='highpass';nf.frequency.value=4200;genv(ng,t,.004,vol,1.6,1.5);n.connect(nf);nf.connect(ng);musOut(ng,'drum');n.start(t);n.stop(t+1.7);}
function bell(t,m,vol){
  const ac=SND.ac,f=mtof(m);
  for(const[r,a,d]of[[1,1,2.4],[2.76,.45,1.2],[5.4,.25,.6]]){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=f*r;genv(g,t,.003,vol*a,d,d*.9);o.connect(g);musOut(g,'bell');o.start(t);o.stop(t+d+.05);}
}
// ---------------------------------------------------------------- the arrangement, step by step
function musStep(t){
  const sec=MUS.sec,bar=MUS.bar,st=MUS.step,mood=sec.mood,M=MOODS[mood],q=60/M.bpm/4,ch=sec.prog[bar],pcs=chordPcs(ch),r=MUS.rng;
  const bassM=nearPc(40,pcs[0],36,47),arp=voicing(ch,57),hiArp=voicing(ch,67);
  for(const n of sec.mel){
    if(n.bar!==bar||n.st!==st)continue;const d=n.len*q;
    if(mood==='paz'){flute(t,n.m,d*.95,.16);}
    else if(mood==='menu'){flute(t,n.m,d*.95,.14);if(n.len>=8)pluck(t,n.m-12,.12,'harp',true);}
    else if(mood==='tensao'){mhorn(t,n.m-12,d*.9,.1,false);}
    else if(mood==='batalha'){mhorn(t,n.m,d*.92,.15,true);strings(t,n.m-12,d*.9,.045,.02,1800);}
    else if(mood==='vitoria'){mhorn(t,n.m,d*.92,.16,true);flute(t,n.m+12,d*.9,.05);}
    else if(mood==='derrota'){flute(t,n.m,d*.95,.13);}
  }
  if(mood==='paz'){
    if(st===0){pluck(t,bassM,.3,'pluck',false,900);strings(t,arp[0],16*q,.022,.6,1100);strings(t,arp[2],16*q,.018,.6,1100);}
    if(st===8&&r()<.7)pluck(t,bassM+7,.2,'pluck',false,900);
    if(st%2===0){const seq=sec.v?[0,1,2,1,0,2,1,2]:[0,2,1,2,0,1,2,1];const k=seq[st/2];pluck(t,(k===2&&st%4===0?hiArp[0]:arp[k]),.15+(st%8===0?.04:0));}
    if(sec.perc){if(st===0||st===10)taiko(t,.16,1.4);if(st%4===2)shaker(t,.035);}
  }else if(mood==='menu'){
    if(st===0){pluck(t,bassM,.3,'harp',true,1400);strings(t,arp[0],16*q,.03,.9,1300);strings(t,arp[1],16*q,.022,.9,1300);strings(t,arp[2],16*q,.022,.9,1300);if(bar%4===0)bell(t,nearPc(74,pcs[0]),.05);}
    const seq=[0,1,2,3,4,5,4,3,2,1,2,3,4,3,2,1],notes=[arp[0],arp[1],arp[2],hiArp[0],hiArp[1],hiArp[2]];
    if(st%2===0||sec.v)pluck(t,notes[seq[st]],st%2?.07:.1,'harp',true);
    if(st===0&&bar%2===0)taiko(t,.12,1.1);
  }else if(mood==='tensao'){
    if(st===0){strings(t,bassM-12,16*q,.07,.4,500);strings(t,bassM-5,16*q,.04,.4,600);}
    if(st===0||st===3)taiko(t,st?.16:.24,st?1.15:1);
    if(bar%2===1&&st===8)taiko(t,.14,1.3);
    // trembling strings high up, swelling toward the end of the bar
    if(st%2===0)strings(t,nearPc(arp[1]+12,pcs[st%4?2:1]),q*1.8,.012+.02*st/16,.01,2600);
    if(st%4===0){const mi=CHORD[ch][1];pluck(t,bassM+12+[0,mi?3:4,mi?1:2,0][st/4],.1,'pluck',false,1200);}
  }else if(mood==='batalha'){
    const pat=sec.v?[0,3,6,8,11,14]:[0,2,4,8,10,12,14];
    if(pat.includes(st))taiko(t,st%8===0?.42:.26,st%8===0?.85:1.05);
    if(st===4||st===12)snare(t,.2);if(st===15&&r()<.5)snare(t,.09);
    if(bar===7&&st>=8)snare(t,.06+(st-8)*.025);
    if(bar===0&&st===0)crash(t,.12);
    // the strings drive the rhythm on the root
    if(st%2===0){const o=[0,0,12,0,0,7,12,7][st/2];strings(t,bassM+o,q*1.6,.05,.006,1500);}
    if(st===0||st===6||(bar%2===1&&st===12)){for(const m of voicing(ch,55))mhorn(t,m,q*(st===0?3:2),.05,false);}
  }else if(mood==='vitoria'){
    if(st===0){timpani(t,bassM,.3);strings(t,arp[0],16*q,.03,.4,1600);strings(t,arp[2],16*q,.025,.4,1600);if(bar===0)bell(t,74,.08);}
    if(st===8)timpani(t,bassM+7,.2);
    if(st%2===0)pluck(t,[arp[0],arp[1],arp[2],hiArp[0]][(st/2)%4],.1,'harp',true);
    if(st===12&&bar%2===1){snare(t,.08);snare(t+q/2,.1);}
  }else if(mood==='derrota'){
    if(st===0){strings(t,bassM,16*q,.05,1.2,700);strings(t,arp[1],16*q,.03,1.2,900);}
    if(st===0||st===8)pluck(t,arp[st?2:0],.12,'harp',false,1500);
    if(st===0&&bar%2===0)taiko(t,.12,.8);
  }
}
function timpani(t,m,vol){const ac=SND.ac,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(mtof(m)*1.02,t);o.frequency.exponentialRampToValueAtTime(mtof(m),t+.15);genv(g,t,.003,vol,1.1,1);o.connect(g);musOut(g,'drum');o.start(t);o.stop(t+1.2);taiko(t,vol*.3,1.6);}
// entering a mood: a war horn and a crash for battle, a bell when peace returns
function musEnter(mood,t){
  const from=MUS.mood;MUS.mood=mood;MUS.bar=0;MUS.step=0;MUS.sec=musSection(mood);
  if(!SND.ac||!MUS.on)return;
  if(mood==='batalha'&&from!=='batalha'){mhorn(t,50,.5,.16,true);mhorn(t+.55,57,.9,.18,true);crash(t+.55,.14);taiko(t+.55,.4,.8);MUS.nextT=t+1.6;}
  else if(mood==='paz'&&(from==='batalha'||from==='tensao'))bell(t,74,.07);
  else if(mood==='tensao'&&from==='paz')mhorn(t,45,1.2,.1,false);
}
function musTick(){
  const ac=SND.ac;if(!ac||ac.state!=='running'||!MUS.on||!MUS.out)return;
  const now=ac.currentTime;
  if(!MUS.mood||MUS.nextT<now-.5){MUS.nextT=now+.08;if(!MUS.mood){musEnter(MUS.want,MUS.nextT);}}
  let guard=0;
  while(MUS.nextT<now+.32&&guard++<16){
    try{musStep(MUS.nextT);}catch(e){}
    MUS.nextT+=60/MOODS[MUS.mood].bpm/4;MUS.step++;
    if(MUS.step>=16){
      MUS.step=0;MUS.bar++;
      const urgent=MUS.want==='batalha'||MUS.want==='vitoria'||MUS.want==='derrota'||MUS.want==='menu'||MUS.mood==='menu';
      if(MUS.want!==MUS.mood&&(urgent||MUS.bar%2===0)){musEnter(MUS.want,MUS.nextT);}
      else if(MUS.bar>=8){
        if(MUS.after){MUS.want=MUS.after;MUS.after=null;musEnter(MUS.want,MUS.nextT);}
        else{MUS.sec=musSection(MUS.mood);MUS.bar=0;}
      }
    }
  }
}
// what is happening in the kingdom right now, checked twice a second
function musWatch(){
  if(!S||!ui.started){MUS.want='menu';MUS.after=null;return;}
  if(S.over){return;}
  if(MUS.want==='vitoria'||MUS.want==='derrota'||MUS.want==='menu')MUS.want='paz';
  let fights=0,near=0;
  const mine=BLDS.filter(b=>!b.dead&&b.team===1);
  for(const e of S.ents){
    if(e.dead||!DEF[e.kind].unit)continue;
    const o=e.order,t=o&&o.type==='attack'?byId.get(o.id):null;
    if(e.team===1){if(t&&!t.dead&&t.team&&t.team!==1&&hyp(t.x-e.x,t.y-e.y)<320)fights++;continue;}
    if(!e.team||!DEF[e.kind].mil||(e.ally))continue;
    if(t&&!t.dead&&t.team===1)fights++;
    if(near<3)for(const b of mine){if(hyp(b.x-e.x,b.y-e.y)<15*TS){near++;break;}}
  }
  if(fights>=3)MUS.lastFight=AT;
  if(near>=2||ui.alarmT>0||(S.mode==='survival'&&S.nextWaveT&&S.nextWaveT-S.t<14))MUS.tenseT=AT;
  MUS.want=AT-MUS.lastFight<11?'batalha':AT-MUS.tenseT<9?'tensao':'paz';
}
function musOver(win){MUS.want=win?'vitoria':'derrota';MUS.after='menu';}

