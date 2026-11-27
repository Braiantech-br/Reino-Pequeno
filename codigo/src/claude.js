// ================================================================ Claude commands a kingdom (Batalha Rápida)
// Every minute of play the game sends Claude a situation report and Claude answers with orders (ai.js clApply).
// Claude can command the Red Kingdom against the player, or either kingdom in the observer mode (machine against
// machine: the computer or Claude on each side, even Claude against Claude).
// Two ways to reach Claude: inside claude.ai the page asks Claude on the player's own account (artifact `sample`);
// anywhere else (downloaded game, site) the player's own Anthropic API key, kept only in this browser.
function clSide(){return {on:false,busy:false,next:0,lastReal:-1e9,calls:0,fails:0,stopped:'',ctl:null,prevArmy:0,gid:0};}
const CLAUDE={sample:null,cfg:{blue:'voce',foe:'pc',model:'esperto',modelBlue:'esperto',key:'',aide:'off'},side:{1:clSide(),2:clSide()}};
const CL_MODELS={rapido:{api:'claude-haiku-5-5',tier:'quick',name:'Rápido'},esperto:{api:'claude-sonnet-5-5',tier:'default',name:'Esperto'}};
const CL_EVERY=60,CL_MIN_REAL=25000;
const KNAME={1:'Reino Azul',2:'Reino Vermelho'},KCOLOR={1:'azul',2:'vermelho'},KENG={1:'Mestre Gaspar',2:'Mestre Rubro'},KVOICE={1:'gasparcl',2:'rubro'};
function clLoadCfg(){try{const c=JSON.parse(localStorage.getItem('rp.claude')||'{}');Object.assign(CLAUDE.cfg,c);}catch(e){}}
function clSaveCfg(){try{localStorage.setItem('rp.claude',JSON.stringify(CLAUDE.cfg));}catch(e){}}
function clVia(){return CLAUDE.sample?'conta':CLAUDE.cfg.key?'chave':'';}
function clWants(team){if(!S||S.mode!=='skirmish'||!S.cfg)return false;return team===2?!!S.cfg.claude:!!(S.cfg.watch&&S.cfg.blue==='claude'||clAide());}
// Claude in the player's own kingdom: an adviser, or the one who leads the generals and Mestre Gaspar
function clAide(){return S&&S.cfg&&!S.cfg.watch&&S.mode==='skirmish'&&['conselho','generais'].includes(CLAUDE.cfg.aide)?CLAUDE.cfg.aide:'';}
function clAideRules(){
  const g=clAide()==='generais';
  return `Você é o Claude, conselheiro de guerra do Reino Azul em Reino Pequeno, um jogo de estratégia medieval em tempo real (estilo Age of Empires). Quem joga o Reino Azul é uma pessoa: ela cuida da economia e das construções. ${g?'Você comanda os generais do exército dela (o Conselho de Guerra) e orienta o Mestre Gaspar, o engenheiro.':'Você só aconselha: dicas curtas, práticas e animadas.'}
O inimigo é o Reino Vermelho (o computador, com o Mestre Rubro). Unidades: guerreiro vence arqueiro, arqueiro vence lanceiro, lanceiro vence guerreiro; monges curam e convertem; torres no alto são fortes; muralhas e fossos seguram ataques.
${g?`O Conselho de Guerra pesa milhares de planos sozinho; você escolhe a direção. Táticas: assalto, pinca (cerco pelos dois lados), martelo (infantaria segura de frente, a tropa rápida bate por trás), emboscada (esconder o exército na mata no caminho do inimigo), fingida (retirada fingida até a armadilha), guerrilha (bater nos aldeões e sumir), sabotagem (fazendas, mercado, carroças, o engenheiro), diversao (atacar um lado e entrar pelo outro), decapitar (caçar o general ou o herói) e defesa.
Responda só com JSON: {"pensamento":"leitura da situação, até 200 caracteres","ordem":"normal","tatica":"","evacuar":true,"dicas":["dica curta para o jogador"]}
ordem = atacar, esperar, saquear ou normal. tatica = uma das táticas ou vazio para o Conselho escolher. evacuar = o Mestre Gaspar tira os aldeões do caminho dos saqueadores. dicas = até 2 dicas para o jogador (economia, prédios, tropas), até 120 caracteres cada.`
:`Responda só com JSON: {"pensamento":"leitura da situação, até 200 caracteres","dicas":["dica 1","dica 2","dica 3"]}
dicas = de 1 a 3 dicas para o jogador agora (o que construir, treinar, onde atacar, como se defender), até 120 caracteres cada, em português, diretas.`}
No relatório, "voce" é o Reino Azul (o jogador) e "inimigo" é o Reino Vermelho. O Reino Vermelho aprende com o jogador a cada partida: se o relatório trouxer "o_que_o_rubro_sabe_de_voce", ajude o jogador a surpreender o Rubro (mudar o lado, o horário e as tropas do ataque).
RELATÓRIO`;
}
function clAideApply(o){
  if(!o||typeof o!=='object')return null;
  const mode=clAide(),W=warOf(1);
  const p={t:S.t,thought:String(o.pensamento||'').replace(/\s+/g,' ').trim().slice(0,240),tips:(Array.isArray(o.dicas)?o.dicas:[]).map(x=>String(x).replace(/\s+/g,' ').trim().slice(0,140)).filter(Boolean).slice(0,3)};
  if(mode==='generais'){
    const ord=['atacar','esperar','saquear','normal'].includes(o.ordem)?o.ordem:'normal';
    W.cl={order:ord==='normal'?'':ord,tatica:WAR_PLANS[o.tatica]?o.tatica:'',until:S.t+150};
    if(armyOf(1).ord.type!=='plano')armyOrder(1,'plano');
    if(W.plan&&W.cl.tatica&&W.plan.type!==W.cl.tatica)withTeam(1,()=>warEnd(W,false,'ordem do Claude'));
    W.next=S.t;
    if(typeof o.evacuar==='boolean'){S.rules=S.rules||{};S.rules.evacuar=o.evacuar;}
    p.order=ord;p.tatica=W.cl.tatica;
  }
  (CLAUDE.aideLog=CLAUDE.aideLog||[]).push(p);if(CLAUDE.aideLog.length>60)CLAUDE.aideLog.shift();
  const head=mode==='generais'?(p.tatica?`Plano: ${WAR_PLANS[p.tatica].name}. `:p.order&&p.order!=='normal'?`Ordem: ${p.order}. `:''):'';
  cLog(`Claude (conselheiro): ${p.thought}`,'good');
  for(const t of p.tips)cLog(`Dica do Claude: ${t}`,'good');
  const say=(head+(p.tips[0]||p.thought)).slice(0,220);if(say)talk('gasparcl',say);
  return p;
}
function clModel(team){return CL_MODELS[team===1?CLAUDE.cfg.modelBlue:CLAUDE.cfg.model]||CL_MODELS.esperto;}
function clAnyOn(){return CLAUDE.side[1].on||CLAUDE.side[2].on;}
// the rules Claude reads, written for the kingdom it commands
function clRules(team){
  const me=KNAME[team],foe=KNAME[team===1?2:1],eng=KENG[team],watch=!!(S&&S.cfg&&S.cfg.watch);
  const vs=watch?`contra outro comandante, o ${foe} (que pode ser a IA do jogo ou outro Claude), numa partida transmitida para uma plateia`:`contra uma pessoa, o ${foe}`;
  const who=watch?'o comandante inimigo e a plateia':'o jogador';
  return `Você é o cérebro do ${me} no jogo de estratégia em tempo real Reino Pequeno (estilo Age of Empires) e joga ${vs}. Objetivo: derrubar o castelo inimigo sem perder o seu. Você não move unidades uma a uma: seus generais e o engenheiro ${eng} executam a sua estratégia e já coletam recursos, constroem casas e fazendas, consertam e defendem a base sozinhos. A cada minuto você recebe um relatório e responde com ordens que valem até o próximo relatório.

REGRAS
- Recursos: comida, madeira e ouro. Mais aldeões dão economia mais forte, mas ocupam população (casas dão +5).
- Eras (no castelo): II custa 300 comida e 100 madeira e pede quartel; III, 500 comida e 250 ouro, pede arquearia; IV, 800 comida, 250 madeira e 500 ouro, pede mosteiro; V, 1100 comida, 400 madeira e 800 ouro, pede torre e mosteiro. Cada era fortalece tudo e libera tropas.
- Tropas (nome em inglês, era): warrior guerreiro (I) vence arqueiros; archer arqueiro (II) vence lanceiros; lancer lanceiro (III) vence guerreiros; scout batedor (I), rápido, bom para saquear aldeões; monk monge (III) cura e converte; ram aríete (III) só derruba prédios; catapult catapulta (IV) acerta prédios e grupos de longe; royal arqueiro real (IV); paladin paladino (IV) cura quem está em volta; wizard mago (IV) fogo em área.
- Prédios (inglês): barracks quartel, archery arquearia, tower torre, monastery mosteiro, market mercado, house casa, farm fazenda, tavern taberna, wall muralha.
- Soldados sobem de patente matando; o de maior patente vira general. Exército veterano e misturado vence.
- Vilas neutras vendem contratos (tipo, preço, amizade mínima 0 a 5): merc 4 tropas de elite por 5, 10 ou 15 min (190, 320 ou 430 de ouro, 1); mercLife 4 tropas até a morte (500, 2); hero o herói da vila (650, 4); garrison guardas no seu castelo por 10 min (210, 2); protect a vila te defende (8% da produção por minuto, 2); loyalty aliança, a vila manda tropas para as suas guerras (120 mais 15% por minuto, 3); route caravana de recursos (1); liberate comprar de volta uma vila que o inimigo conquistou. Cumprir contratos dá honra; atacar vilas tira honra e as outras vilas ficam desconfiadas.
- Conquistar uma vila (alvo "vila:<nome>"): ela vira vassala e paga tributo.
- Impostos de 0 (sem imposto) a 4 (abusivo): mais ouro, porém o povo fica triste e trabalha devagar.
- Durante a trégua nenhum exército ataca o castelo inimigo.

RESPOSTA
Responda só com um objeto JSON neste formato, sem nenhum texto fora dele:
{"pensamento":"leitura da situação e plano, até 200 caracteres","estrategia":"economia","economia":{"comida":0.4,"madeira":0.3,"ouro":0.3},"aldeoes":0,"era":"normal","construir":["tower"],"treinar":{"warrior":3,"archer":2},"exercito":{"ordem":"normal","alvo":"castelo","minimo":12,"flanco":true,"tatica":""},"contrato":null,"espionar":false,"impostos":2,"provocacao":""}
Campos: estrategia = economia, rush, defesa, tecnologia, cerco ou diplomacia. economia = pesos dos aldeões em cada recurso. aldeoes = ajuste na meta de aldeões, de -6 a 8. era = agora, esperar ou normal. construir = até 3 prédios prioritários. treinar = pesos da mistura de tropas (só tropas da sua era ou abaixo). exercito.ordem = atacar, esperar, recuar, saquear (atacar aldeões) ou normal; alvo = castelo, torres, economia, quartel ou vila:<nome>; minimo = tamanho do exército para partir; flanco = mandar um grupo pelo lado. tatica = o plano que o seu Conselho de Guerra (o mestre e os generais) deve executar, ou vazio para ele escolher sozinho depois de pesar milhares de planos: assalto, pinca (cerco pelos dois lados), martelo (infantaria segura de frente e a tropa rápida bate por trás), emboscada (esconder o exército na mata no caminho do inimigo), fingida (retirada fingida para puxar o inimigo até a armadilha), guerrilha (bater nos aldeões e sumir), sabotagem (fazendas, mercado, carroças, o engenheiro), diversao (atacar um lado e entrar pelo outro), decapitar (caçar o general ou o herói) ou defesa. contrato = {"tipo":"merc","vila":"<nome>","minutos":10} ou null (só com vilas que gostam de você e se houver ouro). espionar = mandar o batedor ver a base inimiga. impostos = 0 a 4. provocacao = uma frase curta e divertida do ${eng} para ${who}, em português, sem palavrão nem ofensa pessoal; deixe vazio em metade das ordens.
Dicas: treine o que vence a maioria das tropas inimigas; ataque quando estiver claramente mais forte e recue se estiver perdendo feio; avance de era quando a economia aguentar; contrate mercenários de uma vila amiga antes de um ataque grande; não fique parado com recursos sobrando.${team===2&&!watch&&lrnOn()&&S.lrn.kind==='sk'?lrnClaudeRules():''}

RELATÓRIO`;
}
function clPrompt(team){team=team||2;return clRules(team)+'\n'+JSON.stringify(withTeam(team,()=>clReport()));}
// a reply from the API: the JSON object somewhere in the text
function clParse(text){
  try{return JSON.parse(text);}catch(e){}
  const m=String(text).match(/```(?:json)?\s*([\s\S]*?)```/);if(m){try{return JSON.parse(m[1]);}catch(e){}}
  const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(text.slice(a,b+1));}catch(e){}}
  return null;
}
async function clAsk(prompt,team){
  const M=clModel(team),C=CLAUDE.side[team];
  if(CLAUDE.sample){
    C.ctl=new AbortController();
    return await CLAUDE.sample.json(prompt,{modelTier:M.tier,cache:false,signal:C.ctl.signal});
  }
  const key=CLAUDE.cfg.key;if(!key)throw {code:'no_key'};
  let r;
  try{
    r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:M.api,max_tokens:900,messages:[{role:'user',content:prompt}]})});
  }catch(e){throw {code:'offline'};}
  if(!r.ok){const c=r.status===401||r.status===403?'bad_key':r.status===429||r.status===529?'rate_limited':r.status===400?'bad_request':'upstream_error';let msg='';try{msg=(await r.json()).error.message;}catch(e){}throw {code:c,message:msg};}
  const j=await r.json(),text=(j.content||[]).filter(c=>c.type==='text').map(c=>c.text).join('');
  const o=clParse(text);if(!o)throw {code:'invalid_json',text};
  return o;
}
// a problem with Claude: the computer takes over that kingdom; the message goes to the screen (or the live feed)
function clNotice(team,msg){toast(msg,'warn');cLog(msg,'bad');if(S&&S.cfg&&S.cfg.watch)watchFeed(team,'event',msg);}
// one order from Claude
function clTurn(team,why){
  const C=CLAUDE.side[team];
  if(!C.on||C.busy||C.stopped||!S||S.over)return;
  C.busy=true;C.lastReal=performance.now();clChip();
  const aide=team===1&&clAide(),prompt=aide?clAideRules()+'\n'+JSON.stringify(withTeam(1,()=>clReport())):clPrompt(team),gameId=C.gid,K=KNAME[team];
  clAsk(prompt,team).then(o=>{
    C.busy=false;if(!S||C.gid!==gameId||!C.on)return;
    if(aide){const q=clAideApply(o);if(!q){C.fails++;C.next=S.t+CL_EVERY;clChip();return;}C.calls++;C.fails=0;C.next=S.t+(aide==='conselho'?90:60);clChip();return;}
    const p=withTeam(team,()=>clApply(o));
    if(!p){C.fails++;C.next=S.t+CL_EVERY;clChip();return;}
    C.calls++;C.fails=0;C.next=S.t+(p.order==='atacar'?45:CL_EVERY);
    if(S.cfg&&S.cfg.watch)watchFeed(team,'thought',p);
    if(p.taunt)clSay(team,p.taunt);
    clChip();
  },e=>{
    C.busy=false;if(!S||C.gid!==gameId)return;
    const code=e&&e.code||'upstream_error';
    if(code==='cancelled'){clChip();return;}
    const stop={not_granted:`Você não autorizou o Claude. O computador assume o ${K}.`,sampling_disabled:`O Claude não está disponível nesta conta. O computador assume o ${K}.`,
      not_declared:`Esta versão não pode chamar o Claude. O computador assume o ${K}.`,capability_disabled:`O Claude não pode ser chamado aqui. O computador assume o ${K}.`,
      bad_key:`A chave da API foi recusada. Confira a chave no menu. O computador assume o ${K}.`,no_key:`Falta a chave da API. O computador assume o ${K}.`,
      session_expired:'Sua sessão no Claude expirou. Entre de novo e toque no selo do Claude.'}[code];
    if(stop){C.stopped=code;clNotice(team,stop);clChip();return;}
    if(code==='rate_limited'){C.stopped='rate_limited';clNotice(team,`O Claude atingiu o limite de uso por agora. O computador assume o ${K}; toque no selo do Claude para chamá-lo de volta mais tarde.`);clChip();return;}
    C.fails++;C.next=S.t+CL_EVERY;
    if(C.fails>=3){C.stopped='fails';clNotice(team,code==='offline'?`Sem internet: o computador assume o ${K}. Toque no selo do Claude para tentar de novo.`:`O Claude não respondeu três vezes seguidas. O computador assume o ${K}; toque no selo do Claude para tentar de novo.`);}
    clChip();
  });
}
// called every frame: is it time for the next order? (each kingdom on its own clock)
function clTick(){
  if(!S||S.over||ui.paused)return;
  const now=performance.now();
  for(const team of [1,2]){
    const C=CLAUDE.side[team];
    if(!C.on||C.busy||C.stopped||now-C.lastReal<CL_MIN_REAL)continue;
    // something big happened: ask sooner (the army fell, or the base is under attack)
    const army=S.teams[team].stats.lost;
    if(army-C.prevArmy>=8&&S.t<C.next)C.next=S.t;
    if(S.t<C.next)continue;
    C.prevArmy=army;clTurn(team,'tempo');
  }
}
function clSay(team,text){
  if(typeof team==='string'){text=team;team=2;}
  cLog(`${KENG[team]} (Claude): ${text}`,team===2?'bad':'good');
  const g=byId.get(team===2?S.redEngId:S.engineerId);
  if(alive(g))FX.speech.push({id:g.id,txt:text,t:0,dur:5});
  talk(KVOICE[team],text);
  if(S.cfg&&S.cfg.watch)watchFeed(team,'taunt',text);
}
// the seal on the top bar: who commands the Red Kingdom right now (the observer mode shows both on the scoreboard)
function clState(team){const C=CLAUDE.side[team];return !C.on?'':C.stopped?'stop':C.busy?'busy':'on';}
function clChip(){
  const ch=$('c-claude');if(!ch)return;
  const watch=!!(S&&S.cfg&&S.cfg.watch),C=CLAUDE.side[2];
  ch.hidden=!(C.on&&S)||watch;
  if(watch&&typeof watchScore==='function')watchScore();
  if(ch.hidden)return;
  const st=clState(2);
  ch.dataset.st=st;
  $('cl-chip').textContent=st==='busy'?'Claude pensando…':st==='stop'?'Claude fora':'Claude no comando';
  ch.title=st==='stop'?'O computador está comandando o Reino Vermelho. Toque para chamar o Claude de volta.':`O Claude comanda o Reino Vermelho (${clModel(2).name}). Ordens dadas: ${C.calls}.`;
}
function clStart(fresh){
  const via=clVia();let first=0;
  for(const team of [1,2]){
    const C=CLAUDE.side[team];
    C.gid++;if(C.ctl)try{C.ctl.abort();}catch(e){}
    const want=clWants(team);
    C.on=!!(want&&via);
    C.busy=false;C.stopped='';C.fails=0;C.lastReal=-1e9;
    if(fresh){C.calls=0;C.next=0;C.prevArmy=0;}else C.next=S?S.t:0;
    if(want&&!C.on)clNotice(team,`O Claude não está disponível aqui: o computador comanda o ${KNAME[team]}.`);
  }
  clChip();
  // the first call comes from the player's click (it may ask for permission); with two Claudes the second waits a bit
  for(const team of [2,1]){
    const C=CLAUDE.side[team];if(!C.on)continue;
    cLog(team===1&&clAide()?(clAide()==='generais'?`O Claude comanda os seus generais e o Mestre Gaspar (${clModel(1).name}).`:`O Claude é o seu conselheiro (${clModel(1).name}).`):`O Claude comanda o ${KNAME[team]} (${clModel(team).name}).`,team===2?'bad':'good');
    if(!first){first=team;clTurn(team,'inicio');}
    else C.lastReal=performance.now()-CL_MIN_REAL+12000;
  }
}
// the menu: who plays each kingdom
function clMenu(){
  const box=$('cl-box');if(!box)return;
  const mode=(document.querySelector('input[name=mode]:checked')||{}).value;
  box.hidden=mode!=='skirmish';
  const c=CLAUDE.cfg,red=c.foe==='claude'?'claude':'pc',blue=['voce','pc','claude'].includes(c.blue)?c.blue:'voce';
  document.querySelector(`input[name=foe][value=${red}]`).checked=true;
  document.querySelector(`input[name=blue][value=${blue}]`).checked=true;
  document.querySelector(`input[name=clm][value=${c.model}]`).checked=true;
  document.querySelector(`input[name=clmb][value=${c.modelBlue||'esperto'}]`).checked=true;
  const any=red==='claude'||blue==='claude'||blue==='voce'&&['conselho','generais'].includes(c.aide),two=red==='claude'&&(blue==='claude'||blue==='voce'&&['conselho','generais'].includes(c.aide));
  $('cl-watch').hidden=blue==='voce';
  const aide=['off','conselho','generais'].includes(c.aide)?c.aide:'off';document.querySelector(`input[name=aide][value=${aide}]`).checked=true;$('cl-aidebox').hidden=blue!=='voce';
  $('cl-cfg').hidden=!any;
  $('cl-mb').hidden=!(blue==='claude'||blue==='voce'&&['conselho','generais'].includes(c.aide));$('cl-mr').hidden=red!=='claude';
  $('cl-keyrow').hidden=!!CLAUDE.sample;
  if($('cl-key')!==document.activeElement)$('cl-key').value=c.key||'';
  const n=two?'São duas ordens por minuto de jogo (uma de cada Claude): uma partida de 30 minutos são umas 60 ordens.':'Uma partida de 30 minutos são umas 30 ordens.';
  $('cl-how').textContent=CLAUDE.sample
    ?`O Claude usa a sua conta do Claude (o mesmo uso de uma conversa). Na primeira ordem ele pede a sua permissão. ${n}`
    :`Fora do claude.ai, o Claude precisa de uma chave da API da Anthropic (console.anthropic.com). A chave fica só neste aparelho e vai direto para a Anthropic. Cada ordem é cobrada na sua conta da API; o Rápido gasta bem menos que o Esperto. ${n}`;
  if(any&&!clVia())$('cl-status').textContent='Cole a sua chave para usar o Claude.';
  const fog=$('opt-fog');if(fog){fog.disabled=blue!=='voce';fog.closest('label').classList.toggle('off',blue!=='voce');}
}
function clBind(){
  clLoadCfg();
  FOES.push('rubro');CHAR.rubro={name:'Mestre Rubro (Claude)',av:'av06'};VPROF.rubro=VPROF.red;
  CHAR.gasparcl={name:'Mestre Gaspar (Claude)',av:'av05'};VPROF.gasparcl=VPROF.engineer;
  try{if(window.claude&&typeof window.claude.use==='function')window.claude.use('sample').then(s=>{CLAUDE.sample=s||null;clMenu();}).catch(()=>{});}catch(e){}
  document.querySelectorAll('input[name=foe]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.foe=r.value;clSaveCfg();clMenu();}));
  document.querySelectorAll('input[name=blue]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.blue=r.value;clSaveCfg();clMenu();}));
  document.querySelectorAll('input[name=clm]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.model=r.value;clSaveCfg();}));
  document.querySelectorAll('input[name=aide]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.aide=r.value;clSaveCfg();clMenu();}));
  document.querySelectorAll('input[name=clmb]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.modelBlue=r.value;clSaveCfg();}));
  document.querySelectorAll('input[name=mode]').forEach(r=>r.addEventListener('change',clMenu));
  $('cl-key').addEventListener('change',()=>{CLAUDE.cfg.key=$('cl-key').value.trim();clSaveCfg();$('cl-status').textContent=CLAUDE.cfg.key?'Chave guardada neste aparelho.':'';});
  $('b-cl-test').addEventListener('click',async()=>{
    CLAUDE.cfg.key=$('cl-key').value.trim();clSaveCfg();
    if(!CLAUDE.cfg.key){$('cl-status').textContent='Cole a chave primeiro.';return;}
    $('cl-status').textContent='Testando…';
    try{
      const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':CLAUDE.cfg.key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
        body:JSON.stringify({model:CL_MODELS[CLAUDE.cfg.model].api,max_tokens:60,messages:[{role:'user',content:'Responda só com uma provocação curta e divertida, em português, do Mestre Rubro para um jogador que vai enfrentá-lo num jogo de estratégia medieval.'}]})});
      if(!r.ok){$('cl-status').textContent=r.status===401||r.status===403?'A Anthropic recusou a chave. Confira se copiou inteira.':`A Anthropic respondeu com erro ${r.status}. Tente de novo em instantes.`;return;}
      const j=await r.json();$('cl-status').textContent='Funcionou! O Mestre Rubro diz: '+((j.content||[]).map(c=>c.text||'').join('').trim().slice(0,160));
    }catch(e){$('cl-status').textContent='Sem conexão com a Anthropic. Confira a internet.';}
  });
  $('c-claude').addEventListener('click',()=>clWake(2));
  clMenu();
}
// a tap on a Claude seal: call Claude back after a pause (limit, no internet), or say how it is doing
function clWake(team){
  const C=CLAUDE.side[team];if(!C.on)return;
  if(C.stopped&&!['not_granted','sampling_disabled','not_declared','capability_disabled'].includes(C.stopped)){C.stopped='';C.fails=0;C.lastReal=-1e9;C.next=S.t;toast('Chamando o Claude de volta…','good');clTurn(team,'volta');}
  else toast(C.stopped?'O Claude não pode voltar nesta partida.':`O Claude comanda o ${KNAME[team]}. Ordens dadas: ${C.calls}. O que ele pensou aparece no fim da partida.`);
  clChip();
}
// the end of the game: what Claude was thinking (both kingdoms in the observer mode)
function clEndLog(){
  const box=$('end-claude');if(!box)return;
  const L=[];
  for(const team of [1,2]){const A=team===1?S&&S.ai1:S&&S.ai;for(const x of (A&&A.clLog)||[])L.push(Object.assign({team},x));}
  L.sort((a,b)=>a.t-b.t);
  const two=L.some(x=>x.team===1)&&L.some(x=>x.team===2);
  box.hidden=!(S&&S.cfg&&(S.cfg.claude||S.cfg.blue==='claude')&&L.length);if(box.hidden)return;
  const mm=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  const ord={atacar:'atacar',esperar:'esperar',recuar:'recuar',saquear:'saquear',normal:''};
  $('end-claude-sum').firstChild.textContent=two?'O que os Claudes pensaram ':'O que o Claude pensou ';
  $('end-claude-list').innerHTML=L.filter(x=>x.thought||x.taunt).map(x=>`<li${two?` class="t${x.team}"`:''}><span>${mm(x.t)}</span> ${two||x.team===1?`<b class="k${x.team}">${x.team===1?'Azul':'Vermelho'}</b> `:''}${esc(x.thought)}${ord[x.order]?` <em>Ordem: ${ord[x.order]}${x.target?' · '+esc(x.target):''}.</em>`:''}${x.taunt?`<q>${esc(x.taunt)}</q>`:''}</li>`).join('');
  $('end-claude-n').textContent=`${L.length} ${L.length===1?'ordem':'ordens'}`;
}
