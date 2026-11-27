// ================================================================ Memória do Rubro on screen: the dossier, the end of the match, the Rubro's lines
const LRN_DIFF={normal:'Normal',dificil:'Difícil',insano:'Insano'};
const LRN_RES={win:'Você venceu',lose:'O Rubro venceu',quit:'Desistiu',time:'Sem fim'};
function lrnPct(v){return Math.round(clamp(v,0,1)*100)+'%';}
function lrnN(x,one,many){const n=Math.round(x);return `${n} ${n===1?one:many}`;}
// the line under the menu button
function lrnMenuInfo(){
  const L=lrnLoad(),b=$('lrn-info');if(!b)return;
  b.textContent=!L.on?'aprendizado desligado':L.games?`geração ${L.gen} · ${L.games} ${L.games===1?'partida estudada':'partidas estudadas'}`:'a IA aprende com você';
}
function lrnShow(){lrnRender();$('ov-lrn').hidden=false;playSfx('click');}
function lrnRender(){
  const L=lrnLoad(),P=L.P,n=L.games,know=lrnKnow(),cp=lrnPreview(),st=lrnStyle(P);
  $('lrn-lead').textContent=!n?'O Mestre Rubro ainda não te conhece. Jogue uma Batalha Rápida contra o Reino Vermelho: a cada partida ele estuda como você joga (as tropas, os horários, o caminho do seu exército, como você defende os aldeões) e muda a própria estratégia para te vencer. Na Defesa do Rei, as ondas também aprendem.'
    :`O Mestre Rubro já estudou ${n} ${n===1?'partida sua':'partidas suas'} (${Math.round(L.min)} minutos de jogo). Antes de cada partida ele lê o seu jeito de jogar e se prepara; durante a partida continua aprendendo; no fim, guarda o que funcionou e testa algo novo. Quando o Claude comanda o Reino Vermelho, ele lê esta mesma memória e escreve as próprias lições. Para vencer, você vai ter que surpreendê-lo.`;
  $('lrn-stats').innerHTML=[[n,'partidas estudadas'],[L.gen,'geração do Rubro'],[`${L.w} × ${L.l}`,'suas vitórias × derrotas'],[lrnPct(know),'conhecimento'],[L.surv.n,'Defesas do Rei estudadas']].map(([b,l])=>`<div><b>${b}</b><span>${l}</span></div>`).join('');
  // style
  const sty=st?Object.entries(st).sort((a,b)=>b[1]-a[1]):[];
  $('lrn-style').innerHTML=sty.length?sty.map(([k,v],i)=>`<div class="lrn-bar${i===0&&v>=.25?' best':''}"><span>${LRN_STYLE[k]}</span><i style="width:${Math.max(3,Math.round(v*100))}%"></i><b>${lrnPct(v)}</b></div>`).join(''):'<p class="lrn-none">Ainda sem dados. Jogue uma partida.</p>';
  // predictions
  const pr=[];
  if(P.atkRel!=null)pr.push(`Seu primeiro ataque costuma chegar <b>${lrnMM(Math.abs(P.atkRel))} ${P.atkRel<0?'antes':'depois'} do fim da trégua</b> (±${lrnMM(P.atkSd||90)})${P.atkN?`, com uns <b>${Math.round(P.atkN)} soldados</b>`:''}.`);
  else if(P.noAtk>.5)pr.push('Você quase nunca ataca o castelo vermelho: prefere esperar.');
  if(P.v!=null)pr.push(`Você chega <b>${lrnSide(P.v)}</b> (olhando do seu castelo para o castelo vermelho).`);
  const fe=[];for(const e of[1,2,3,4,5]){const t=P.mixE&&P.mixE[e]&&lrnTop(P.mixE[e],2);if(t&&t.length)fe.push(`Era ${['','I','II','III','IV','V'][e]}: ${t.map(([k,v])=>`${LRN_NAME[k]} ${Math.round(v*100)}%`).join(', ')}`);}
  if(fe.length)pr.push(`Tropas favoritas: ${fe.join('; ')}.`);
  const er=[2,3,4].filter(e=>P['era'+e]!=null).map(e=>`Era ${['','I','II','III','IV'][e]} aos ${lrnMM(P['era'+e])}`);if(er.length)pr.push(er.join(', ')+'.');
  if(P.pawns)pr.push(`No auge, uns ${Math.round(P.pawns)} aldeões e ${Math.round(P.towers||0)} ${Math.round(P.towers||0)===1?'torre':'torres'}.`);
  if(cp.weakT)pr.push(`Momento fraco: por volta de <b>${lrnMM(cp.weakT)}</b>, poucos soldados perto de muitos aldeões.`);
  if(P.vulnR!=null)pr.push((P.vulnR>=.5?`Cada saque do Rubro mata uns ${String(Math.round(P.vulnR*10)/10).replace('.',',')} aldeões seus`:'Os saques do Rubro quase não matam os seus aldeões')+(P.react!=null?`; você manda o exército em uns ${Math.round(P.react)} segundos.`:'.'));
  if(L.notes)pr.push(`<span class="lrn-cl">Claude</span> ${esc(L.notes)}`);
  $('lrn-pred').innerHTML=pr.length?pr.map(x=>`<li>${x}</li>`).join(''):'<li class="lrn-none">Nada ainda.</li>';
  const pl=cp.lines.slice();if(L.next)pl.push(`<span class="lrn-cl">Claude</span> ${esc(L.next)}`);
  $('lrn-plan').innerHTML=pl.length?pl.map(x=>`<li>${x}</li>`).join(''):'<li class="lrn-none">Ele ainda não tem um plano contra você.</li>';
  // tactics
  const tac=Object.entries(L.plans).filter(([k,b])=>b.s+b.f>=.9&&WAR_PLANS[k]).map(([k,b])=>[k,(b.s+.5)/(b.s+b.f+1),b]).sort((a,b)=>b[1]-a[1]);
  $('lrn-tac').innerHTML=tac.length?tac.map(([k,v,b])=>`<div class="lrn-bar${v>=.6?' best':''}"><span>${WAR_PLANS[k].name}</span><i style="width:${Math.round(v*100)}%"></i><b>${lrnPct(v)}</b><small>${lrnN(b.s,'deu certo','deram certo')}, ${lrnN(b.f,'falhou','falharam')}</small></div>`).join(''):'<p class="lrn-none">O Conselho de Guerra ainda não testou planos contra você.</p>';
  // the genome
  $('lrn-gen').textContent=L.gen;
  const d=L.dna,fmtG={pawns:v=>(v>=0?'+':'')+Math.round(v),rush:lrnPct,army:v=>'×'+v.toFixed(2).replace('.',','),towers:v=>'+'+Math.round(v),harass:lrnPct,siege:lrnPct,tech:v=>(v>=0?'+':'')+Math.round(v*100)+'%',gold:v=>(v>=0?'+':'')+Math.round(v*100)+'%',risk:v=>lrnPct((v-.3)/.45),care:v=>lrnPct(v/.5)};
  $('lrn-dna').innerHTML=Object.keys(LRN_GENES).map(k=>`<span><b>${fmtG[k](d[k])}</b>${LRN_GNAME[k]}</span>`).join('');
  // lessons
  $('lrn-less').innerHTML=L.lessons.length?L.lessons.slice(0,10).map(x=>`<li>${x.by==='claude'?'<span class="lrn-cl">Claude</span> ':'<span class="lrn-pc">Rubro</span> '}${esc(x.txt)}</li>`).join(''):'<li class="lrn-none">Nenhuma lição ainda.</li>';
  // matches
  $('lrn-hist').innerHTML=L.hist.length?`<table class="lrn-h"><tr><th>Quando</th><th>Dificuldade</th><th>Resultado</th><th>Tempo</th><th>Suas tropas</th><th>Geração</th></tr>${L.hist.slice(0,30).map(h=>{const dt=new Date(h.when);return `<tr class="${h.res}"><td>${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}</td><td>${LRN_DIFF[h.diff]||h.diff}</td><td>${LRN_RES[h.res]||h.res}${h.cl?' (Claude)':''}</td><td>${lrnMM(h.dur)}</td><td>${h.fav?LRN_NAME[h.fav]:'-'}</td><td>${h.gen}</td></tr>`;}).join('')}</table>`:'<p class="lrn-none">Nenhuma partida ainda.</p>';
  $('lrn-on').checked=!!L.on;
  const rb=$('b-lrn-reset');rb.textContent='Apagar a memória';rb.classList.remove('danger');delete rb.dataset.ok;rb.disabled=!n&&!L.surv.n;
  lrnDrawMap();
}
// the player's usual path between the two castles
function lrnDrawMap(){
  const c=$('lrn-map');if(!c)return;const g=c.getContext('2d'),W=c.width,H=c.height,P=lrnLoad().P,h=P.heat||[];
  g.clearRect(0,0,W,H);g.fillStyle='#e9dcb3';g.fillRect(0,0,W,H);
  const X=u=>(u+.1)/1.2*W,Y=v=>(v+.7)/1.4*H,mx=Math.max(...h,0)||1;
  for(let i=0;i<HU*HV;i++){const q=lrnCellUV(i),a=(h[i]||0)/mx;if(a<.04)continue;g.fillStyle=`rgba(200,70,60,${(.15+a*.75).toFixed(2)})`;g.fillRect(X(q.u-.075)+1,Y(q.v-.1)+1,W/HU-2,H/HV-2);}
  g.strokeStyle='rgba(74,45,23,.35)';g.setLineDash([4,4]);g.beginPath();g.moveTo(X(0),Y(0));g.lineTo(X(1),Y(0));g.stroke();g.setLineDash([]);
  const castle=(u,col,lbl)=>{const x=X(u),y=Y(0);g.fillStyle=col;g.fillRect(x-11,y-11,22,22);g.fillStyle='#fff';g.fillRect(x-7,y-15,4,6);g.fillRect(x+3,y-15,4,6);g.fillStyle=col;g.fillRect(x-7,y-15,4,4);g.fillRect(x+3,y-15,4,4);
    g.font='600 12px system-ui';g.fillStyle='#36230f';g.textAlign='center';g.fillText(lbl,x,y+26);};
  castle(0,'#3f6fd4','Você');castle(1,'#c8463c','Rubro');
  if(P.v!=null){const y=Y(P.v);g.strokeStyle='#83241c';g.lineWidth=3;g.beginPath();g.moveTo(X(.12),Y(0));g.quadraticCurveTo(X(.5),y*2-Y(0),X(.88),Y(0));g.stroke();g.lineWidth=1;
    g.fillStyle='#83241c';g.beginPath();g.moveTo(X(.88),Y(0));g.lineTo(X(.84),Y(0)-6);g.lineTo(X(.84),Y(0)+6);g.fill();}
  $('lrn-map-t').textContent=h.some(x=>x>0)?'Quanto mais vermelho, mais o seu exército passa por ali. A seta é o caminho de costume.':'O caminho do seu exército aparece aqui depois da primeira partida.';
}
// the end of the match: what the Rubro learned (and Claude's lessons, when Claude commanded red)
function lrnEndUI(){
  const box=$('end-lrn');if(!box)return;
  const O=S&&S.lrn,D=O&&O.done;box.hidden=!(D&&(D.M||D.surv));if(box.hidden)return;
  const L=lrnLoad();
  if(D.surv){$('end-lrn-t').textContent='As ondas aprenderam com esta defesa';$('end-lrn-p').textContent=`${L.surv.n} ${L.surv.n===1?'Defesa do Rei estudada':'Defesas do Rei estudadas'}. Na próxima, as ondas chegam pelo lado que você defende menos e com as tropas que vencem as suas.`;$('end-lrn-l').innerHTML='';return;}
  const st=(D.style||[]).map(([k,v])=>`${LRN_STYLE[k]} (${lrnPct(v)})`).join(', ');
  $('end-lrn-t').textContent=D.res==='win'?'Você venceu, e o Rubro aprendeu com isso':'O Rubro aprendeu com esta partida';
  $('end-lrn-p').textContent=`Geração ${D.gen0} → ${D.gen} · ${L.games} ${L.games===1?'partida estudada':'partidas estudadas'} · conhecimento ${lrnPct(lrnKnow())}.${st?` Seu estilo: ${st}.`:''}`;
  $('end-lrn-l').innerHTML=(D.lessons||[]).map(t=>`<li><span class="lrn-pc">Rubro</span> ${esc(t)}</li>`).join('')+(D.cl?D.cl.map(t=>`<li><span class="lrn-cl">Claude</span> ${esc(t)}</li>`).join(''):'')+(D.clWait?'<li class="lrn-none">O Claude está escrevendo as lições dele…</li>':'');
  lrnClaudeLesson();
}
// one more call to Claude after a match it commanded: its lessons for the next time
function lrnClaudeLesson(){
  const O=S&&S.lrn,D=O&&O.done;if(!D||!D.M||O.clAsked)return;
  const C=CLAUDE.side[2];if(!C||!C.on||C.stopped||!O.claude)return;
  O.clAsked=true;D.clWait=true;lrnEndUI();
  const gid=C.gid;
  clAsk(lrnClaudeLessonPrompt(D),2).then(o=>{
    D.clWait=false;const r=lrnClaudeApply(o);if(!r){lrnEndUI();return;}
    D.cl=r.lessons;lrnEndUI();if(r.taunt&&C.gid===gid)talk('rubro',r.taunt);
  },()=>{D.clWait=false;D.cl=null;lrnEndUI();const l=$('end-lrn-l');if(l)l.insertAdjacentHTML('beforeend','<li class="lrn-none">O Claude não respondeu agora; as lições do computador ficaram guardadas.</li>');});
}
// the Rubro greets you with what he knows (the computer's Rubro; Claude has its own taunts)
function lrnIntro(){
  if(!S||!S.lrn||!S.lrn.on)return;
  const L=lrnLoad();
  if(S.lrn.kind==='sv'){if(L.surv.n)setTimeout(()=>toast(`As ondas já estudaram ${L.surv.n} ${L.surv.n===1?'defesa sua':'defesas suas'}: elas vão procurar o seu lado mais fraco.`,'warn'),5000);return;}
  const top=lrnStyleTop(L.P)[0],k=top&&top[0];
  const line=!L.games?'Vamos ver como você joga. Eu estou anotando tudo.':({
    rush:'Já sei que você ataca cedo. Desta vez o meu quartel fica pronto antes.',
    boom:'Você gosta de crescer em paz, não é? Paz é a primeira coisa que eu vou tirar.',
    turtle:'Torres e muralhas de novo? Eu trouxe aríetes.',
    raid:'Os meus aldeões já sabem correr dos seus batedores.',
    tech:'Corre para a Era III? Eu chego antes.',
    diplo:'As vilas já estão comigo. Eu cheguei primeiro.',
    siege:'Aríetes? Os meus guerreiros adoram lenha.',
    naval:'Navios? Eu também sei nadar.',
    dive:'Você sempre vem direto no meu castelo. Agora ele está bem guardado.',
    trade:'Suas caravanas passam pela minha estrada. Que pena.',
  }[k]||`Estudei as suas ${L.games} partidas. Eu sei como você joga.`);
  setTimeout(()=>{if(S&&S.lrn&&S.lrn.on&&ui.started&&!S.over)lrnSay(line);},4200);
}
function lrnBindUI(){
  lrnLoad();
  CHAR.rubropc={name:'Mestre Rubro',av:'av06'};VPROF.rubropc=VPROF.red;FOES.push('rubropc');
  $('b-lrn').addEventListener('click',lrnShow);
  $('b-lrn-close').addEventListener('click',()=>{$('ov-lrn').hidden=true;lrnMenuInfo();});
  $('b-end-lrn').addEventListener('click',lrnShow);
  $('lrn-on').addEventListener('change',()=>{const L=lrnLoad();L.on=$('lrn-on').checked;lrnSave();lrnMenuInfo();toast(L.on?'O Rubro volta a aprender com você na próxima partida.':'O Rubro não vai mais estudar as suas partidas. A memória fica guardada.');});
  $('b-lrn-reset').addEventListener('click',()=>{const b=$('b-lrn-reset');
    if(!b.dataset.ok){b.dataset.ok='1';b.textContent='Apagar tudo mesmo?';b.classList.add('danger');return;}
    lrnReset();lrnRender();lrnMenuInfo();toast('Memória apagada. O Rubro esqueceu tudo sobre você.');});
  lrnMenuInfo();
}
