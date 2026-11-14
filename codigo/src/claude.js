// ================================================================ Claude commands the Red Kingdom (Batalha Rápida)
// Every minute of play the game sends Claude a situation report and Claude answers with orders (ai.js clApply).
// Two ways to reach Claude: inside claude.ai the page asks Claude on the player's own account (artifact `sample`);
// anywhere else (downloaded game, site) the player's own Anthropic API key, kept only in this browser.
const CLAUDE={on:false,sample:null,cfg:{foe:'pc',model:'esperto',key:''},busy:false,next:0,lastReal:-1e9,calls:0,fails:0,stopped:'',status:'',ctl:null,prevArmy:0};
const CL_MODELS={rapido:{api:'claude-haiku-5-5',tier:'quick',name:'Rápido'},esperto:{api:'claude-sonnet-5-5',tier:'default',name:'Esperto'}};
const CL_EVERY=60,CL_MIN_REAL=25000;
function clLoadCfg(){try{const c=JSON.parse(localStorage.getItem('rp.claude')||'{}');Object.assign(CLAUDE.cfg,c);}catch(e){}}
function clSaveCfg(){try{localStorage.setItem('rp.claude',JSON.stringify(CLAUDE.cfg));}catch(e){}}
function clVia(){return CLAUDE.sample?'conta':CLAUDE.cfg.key?'chave':'';}
const CL_RULES=`Você é o cérebro do Reino Vermelho no jogo de estratégia em tempo real Reino Pequeno (estilo Age of Empires) e joga contra uma pessoa, o Reino Azul. Objetivo: derrubar o castelo azul sem perder o seu. Você não move unidades uma a uma: seus generais e o engenheiro Mestre Rubro executam a sua estratégia e já coletam recursos, constroem casas e fazendas, consertam e defendem a base sozinhos. A cada minuto você recebe um relatório e responde com ordens que valem até o próximo relatório.

REGRAS
- Recursos: comida, madeira e ouro. Mais aldeões dão economia mais forte, mas ocupam população (casas dão +5).
- Eras (no castelo): II custa 300 comida e 100 madeira e pede quartel; III, 500 comida e 250 ouro, pede arquearia; IV, 800 comida, 250 madeira e 500 ouro, pede mosteiro; V, 1100 comida, 400 madeira e 800 ouro, pede torre e mosteiro. Cada era fortalece tudo e libera tropas.
- Tropas (nome em inglês, era): warrior guerreiro (I) vence arqueiros; archer arqueiro (II) vence lanceiros; lancer lanceiro (III) vence guerreiros; scout batedor (I), rápido, bom para saquear aldeões; monk monge (III) cura e converte; ram aríete (III) só derruba prédios; catapult catapulta (IV) acerta prédios e grupos de longe; royal arqueiro real (IV); paladin paladino (IV) cura quem está em volta; wizard mago (IV) fogo em área.
- Prédios (inglês): barracks quartel, archery arquearia, tower torre, monastery mosteiro, market mercado, house casa, farm fazenda, tavern taberna, wall muralha.
- Soldados sobem de patente matando; o de maior patente vira general. Exército veterano e misturado vence.
- Vilas neutras vendem contratos (tipo, preço, amizade mínima 0 a 5): merc 4 tropas de elite por 5, 10 ou 15 min (190, 320 ou 430 de ouro, 1); mercLife 4 tropas até a morte (500, 2); hero o herói da vila (650, 4); garrison guardas no seu castelo por 10 min (210, 2); protect a vila te defende (8% da produção por minuto, 2); loyalty aliança, a vila manda tropas para as suas guerras (120 mais 15% por minuto, 3); route caravana de recursos (1); liberate comprar de volta uma vila que o azul conquistou. Cumprir contratos dá honra; atacar vilas tira honra e as outras vilas ficam desconfiadas.
- Conquistar uma vila (alvo "vila:<nome>"): ela vira vassala e paga tributo.
- Impostos de 0 (sem imposto) a 4 (abusivo): mais ouro, porém o povo fica triste e trabalha devagar.
- Durante a trégua o exército não ataca o castelo azul.

RESPOSTA
Responda só com um objeto JSON neste formato, sem nenhum texto fora dele:
{"pensamento":"leitura da situação e plano, até 200 caracteres","estrategia":"economia","economia":{"comida":0.4,"madeira":0.3,"ouro":0.3},"aldeoes":0,"era":"normal","construir":["tower"],"treinar":{"warrior":3,"archer":2},"exercito":{"ordem":"normal","alvo":"castelo","minimo":12,"flanco":true},"contrato":null,"espionar":false,"impostos":2,"provocacao":""}
Campos: estrategia = economia, rush, defesa, tecnologia, cerco ou diplomacia. economia = pesos dos aldeões em cada recurso. aldeoes = ajuste na meta de aldeões, de -6 a 8. era = agora, esperar ou normal. construir = até 3 prédios prioritários. treinar = pesos da mistura de tropas (só tropas da sua era ou abaixo). exercito.ordem = atacar, esperar, recuar, saquear (atacar aldeões) ou normal; alvo = castelo, torres, economia, quartel ou vila:<nome>; minimo = tamanho do exército para partir; flanco = mandar um grupo pelo lado. contrato = {"tipo":"merc","vila":"<nome>","minutos":10} ou null (só com vilas que gostam de você e se houver ouro). espionar = mandar o batedor ver a base azul. impostos = 0 a 4. provocacao = uma frase curta e divertida do Mestre Rubro para o jogador, em português, sem palavrão nem ofensa pessoal; deixe vazio em metade das ordens.
Dicas: treine o que vence a maioria das tropas azuis; ataque quando estiver claramente mais forte e recue se estiver perdendo feio; avance de era quando a economia aguentar; contrate mercenários de uma vila amiga antes de um ataque grande; não fique parado com recursos sobrando.

RELATÓRIO`;
function clPrompt(){return CL_RULES+'\n'+JSON.stringify(clReport());}
// a reply from the API: the JSON object somewhere in the text
function clParse(text){
  try{return JSON.parse(text);}catch(e){}
  const m=String(text).match(/```(?:json)?\s*([\s\S]*?)```/);if(m){try{return JSON.parse(m[1]);}catch(e){}}
  const a=text.indexOf('{'),b=text.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(text.slice(a,b+1));}catch(e){}}
  return null;
}
async function clAsk(prompt){
  const M=CL_MODELS[CLAUDE.cfg.model]||CL_MODELS.esperto;
  if(CLAUDE.sample){
    CLAUDE.ctl=new AbortController();
    return await CLAUDE.sample.json(prompt,{modelTier:M.tier,cache:false,signal:CLAUDE.ctl.signal});
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
// one order from Claude
function clTurn(why){
  if(!CLAUDE.on||CLAUDE.busy||CLAUDE.stopped||!S||S.over)return;
  CLAUDE.busy=true;CLAUDE.lastReal=performance.now();clChip();
  const prompt=clPrompt(),gameId=CLAUDE.gid;
  clAsk(prompt).then(o=>{
    CLAUDE.busy=false;if(!S||CLAUDE.gid!==gameId||!CLAUDE.on)return;
    const p=clApply(o);
    if(!p){CLAUDE.fails++;CLAUDE.next=S.t+CL_EVERY;clChip();return;}
    CLAUDE.calls++;CLAUDE.fails=0;CLAUDE.next=S.t+(p.order==='atacar'?45:CL_EVERY);
    if(p.taunt)clSay(p.taunt);
    clChip();
  },e=>{
    CLAUDE.busy=false;if(!S||CLAUDE.gid!==gameId)return;
    const code=e&&e.code||'upstream_error';
    if(code==='cancelled'){clChip();return;}
    const stop={not_granted:'Você não autorizou o Claude. O computador assume o Reino Vermelho.',sampling_disabled:'O Claude não está disponível nesta conta. O computador assume o Reino Vermelho.',
      not_declared:'Esta versão não pode chamar o Claude. O computador assume o Reino Vermelho.',capability_disabled:'O Claude não pode ser chamado aqui. O computador assume o Reino Vermelho.',
      bad_key:'A chave da API foi recusada. Confira a chave no menu. O computador assume o Reino Vermelho.',no_key:'Falta a chave da API. O computador assume o Reino Vermelho.',
      session_expired:'Sua sessão no Claude expirou. Entre de novo e toque no selo do Claude.'}[code];
    if(stop){CLAUDE.stopped=code;toast(stop,'warn');cLog(stop,'bad');clChip();return;}
    if(code==='rate_limited'){CLAUDE.stopped='rate_limited';const m='O Claude atingiu o limite de uso por agora. O computador assume; toque no selo do Claude para chamá-lo de volta mais tarde.';toast(m,'warn');cLog(m,'bad');clChip();return;}
    CLAUDE.fails++;CLAUDE.next=S.t+CL_EVERY;
    if(CLAUDE.fails>=3){CLAUDE.stopped='fails';const m=code==='offline'?'Sem internet: o computador assume o Reino Vermelho. Toque no selo do Claude para tentar de novo.':'O Claude não respondeu três vezes seguidas. O computador assume; toque no selo do Claude para tentar de novo.';toast(m,'warn');cLog(m,'bad');}
    clChip();
  });
}
// called every frame: is it time for the next order?
function clTick(){
  if(!CLAUDE.on||!S||S.over||CLAUDE.busy||CLAUDE.stopped||ui.paused)return;
  const now=performance.now();if(now-CLAUDE.lastReal<CL_MIN_REAL)return;
  // something big happened: ask sooner (the army fell, or the base is under attack)
  const army=S.teams[2].stats.lost;
  if(army-CLAUDE.prevArmy>=8&&S.t<CLAUDE.next){CLAUDE.next=S.t;}
  if(S.t<CLAUDE.next)return;
  CLAUDE.prevArmy=army;clTurn('tempo');
}
function clSay(text){
  cLog(`Mestre Rubro (Claude): ${text}`,'bad');
  const g=byId.get(S.redEngId);
  if(alive(g))FX.speech.push({id:g.id,txt:text,t:0,dur:5});
  talk('rubro',text);
}
// the seal on the top bar: who commands the Red Kingdom right now
function clChip(){
  const ch=$('c-claude');if(!ch)return;
  ch.hidden=!(CLAUDE.on&&S);if(ch.hidden)return;
  const st=CLAUDE.stopped?'stop':CLAUDE.busy?'busy':'on';
  ch.dataset.st=st;
  $('cl-chip').textContent=st==='busy'?'Claude pensando…':st==='stop'?'Claude fora':'Claude no comando';
  ch.title=st==='stop'?'O computador está comandando o Reino Vermelho. Toque para chamar o Claude de volta.':`O Claude comanda o Reino Vermelho (${CL_MODELS[CLAUDE.cfg.model].name}). Ordens dadas: ${CLAUDE.calls}.`;
}
function clStart(fresh){
  CLAUDE.gid=(CLAUDE.gid||0)+1;if(CLAUDE.ctl)try{CLAUDE.ctl.abort();}catch(e){}
  CLAUDE.on=!!(S&&S.mode==='skirmish'&&S.cfg&&S.cfg.claude&&clVia());
  CLAUDE.busy=false;CLAUDE.stopped='';CLAUDE.fails=0;CLAUDE.lastReal=-1e9;
  if(fresh){CLAUDE.calls=0;CLAUDE.next=0;CLAUDE.prevArmy=0;}else CLAUDE.next=S?S.t:0;
  if(S&&S.cfg&&S.cfg.claude&&!CLAUDE.on){toast('O Claude não está disponível aqui: o computador comanda o Reino Vermelho.','warn');}
  clChip();
  if(CLAUDE.on){cLog(`O Claude comanda o Reino Vermelho (${CL_MODELS[CLAUDE.cfg.model].name}).`,'bad');clTurn('inicio');}   // the first call comes from the player's click
}
// the menu: who commands the Red Kingdom
function clMenu(){
  const box=$('cl-box');if(!box)return;
  const mode=(document.querySelector('input[name=mode]:checked')||{}).value;
  box.hidden=mode!=='skirmish';
  const c=CLAUDE.cfg,on=c.foe==='claude';
  document.querySelector(`input[name=foe][value=${on?'claude':'pc'}]`).checked=true;
  document.querySelector(`input[name=clm][value=${c.model}]`).checked=true;
  $('cl-cfg').hidden=!on;
  $('cl-keyrow').hidden=!!CLAUDE.sample;
  if($('cl-key')!==document.activeElement)$('cl-key').value=c.key||'';
  $('cl-how').textContent=CLAUDE.sample
    ?'O Claude usa a sua conta do Claude (o mesmo uso de uma conversa). Na primeira ordem ele pede a sua permissão. Uma partida de 30 minutos são umas 30 ordens.'
    :'Fora do claude.ai, o Claude precisa de uma chave da API da Anthropic (console.anthropic.com). A chave fica só neste aparelho e vai direto para a Anthropic. Cada ordem é cobrada na sua conta da API; o Rápido gasta bem menos que o Esperto. Uma partida de 30 minutos são umas 30 ordens.';
  if(on&&!clVia())$('cl-status').textContent='Cole a sua chave para jogar contra o Claude.';
}
function clBind(){
  clLoadCfg();
  FOES.push('rubro');CHAR.rubro={name:'Mestre Rubro (Claude)',av:'av06'};VPROF.rubro=VPROF.red;
  try{if(window.claude&&typeof window.claude.use==='function')window.claude.use('sample').then(s=>{CLAUDE.sample=s||null;clMenu();}).catch(()=>{});}catch(e){}
  document.querySelectorAll('input[name=foe]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.foe=r.value;clSaveCfg();clMenu();}));
  document.querySelectorAll('input[name=clm]').forEach(r=>r.addEventListener('change',()=>{CLAUDE.cfg.model=r.value;clSaveCfg();}));
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
  $('c-claude').addEventListener('click',()=>{
    if(!CLAUDE.on)return;
    if(CLAUDE.stopped&&!['not_granted','sampling_disabled','not_declared','capability_disabled'].includes(CLAUDE.stopped)){CLAUDE.stopped='';CLAUDE.fails=0;CLAUDE.lastReal=-1e9;CLAUDE.next=S.t;toast('Chamando o Claude de volta…','good');clTurn('volta');}
    else toast(CLAUDE.stopped?'O Claude não pode voltar nesta partida.':`O Claude comanda o Reino Vermelho. Ordens dadas: ${CLAUDE.calls}. O que ele pensou aparece no fim da partida.`);
    clChip();
  });
  clMenu();
}
// the end of the game: what Claude was thinking
function clEndLog(){
  const box=$('end-claude');if(!box)return;
  const L=S&&S.ai&&S.ai.clLog||[];
  box.hidden=!(S&&S.cfg&&S.cfg.claude&&L.length);if(box.hidden)return;
  const mm=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
  const ord={atacar:'atacar',esperar:'esperar',recuar:'recuar',saquear:'saquear',normal:''};
  $('end-claude-list').innerHTML=L.filter(x=>x.thought||x.taunt).map(x=>`<li><span>${mm(x.t)}</span> ${esc(x.thought)}${ord[x.order]?` <em>Ordem: ${ord[x.order]}${x.target?' · '+esc(x.target):''}.</em>`:''}${x.taunt?`<q>${esc(x.taunt)}</q>`:''}</li>`).join('');
  $('end-claude-n').textContent=`${L.length} ${L.length===1?'ordem':'ordens'}`;
}
