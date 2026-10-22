// virtual time for recording: the page only moves when the recorder steps the clock
(()=>{
  let vt=1000,tid=1,timers=[];const raf=[];
  const base=Date.now();
  performance.now=()=>vt;Date.now=()=>base+vt;
  window.requestAnimationFrame=cb=>{raf.push(cb);return raf.length;};window.cancelAnimationFrame=()=>{};
  window.setTimeout=(f,ms,...a)=>{const id=tid++;if(typeof f==='function')timers.push({id,at:vt+(+ms||0),f,a});return id;};
  window.clearTimeout=id=>{timers=timers.filter(t=>t.id!==id);};
  window.setInterval=(f,ms,...a)=>{const id=tid++;const rep=()=>{try{f(...a);}finally{timers.push({id,at:vt+Math.max(16,+ms||0),f:rep,a:[]});}};timers.push({id,at:vt+Math.max(16,+ms||0),f:rep,a:[]});return id;};
  window.clearInterval=window.clearTimeout;
  window.__clock={step(ms){vt+=ms;for(let k=0;k<50;k++){const due=timers.filter(t=>t.at<=vt);if(!due.length)break;timers=timers.filter(t=>t.at>vt);for(const t of due){try{t.f(...t.a);}catch(e){console.error(e);}}}
      const q=raf.splice(0);for(const cb of q){try{cb(vt);}catch(e){console.error(e);}}},get t(){return vt;}};
})();
