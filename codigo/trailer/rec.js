// Records the trailer: node rec.js <out-dir> [every=1] [from=0] [to=end] [w=1920] [h=1080]
// CENAS=scenes-2.0.js picks another script (default: the newest trailer, scenes-2.1.js)
const {chromium}=require(process.env.PLAYWRIGHT||'playwright');
const fs=require('fs'),path=require('path');
const [OUT,EVERY='1',FROM='0',TO='',W='1920',H='1080']=process.argv.slice(2);
(async()=>{
  fs.mkdirSync(OUT,{recursive:true});
  const b=await chromium.launch({executablePath:process.env.CHROMIUM||undefined,args:['--disable-gpu-vsync','--force-device-scale-factor=1']});
  const p=await b.newPage({viewport:{width:+W,height:+H},deviceScaleFactor:1});
  const errs=[];p.on('pageerror',e=>errs.push(e.message+' '+(e.stack||'').split('\n')[1]));p.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text());});
  await p.addInitScript({path:path.join(__dirname,'clock.js')});
  await p.goto('http://localhost:8765/preview.html');
  await p.waitForTimeout(1500);
  await p.evaluate(()=>document.fonts.ready);
  await p.addScriptTag({path:path.join(__dirname,process.env.CENAS||'scenes-2.1.js')});
  const info=await p.evaluate(()=>TR.prep(4242));
  console.log('prep',JSON.stringify(info));
  const total=await p.evaluate(()=>TR.TOTAL),end=TO?+TO:total;
  console.log('frames',total);
  const t0=Date.now();let shot='';
  for(let f=0;f<end;f++){
    const id=await p.evaluate(f=>TR.frame(f),f);
    if(id!==shot){shot=id;console.log(f,id,((Date.now()-t0)/1000).toFixed(0)+'s');}
    if(f>=+FROM&&(f-+FROM)%+EVERY===0)await p.screenshot({path:path.join(OUT,String(f).padStart(5,'0')+'.jpg'),type:'jpeg',quality:92});
  }
  console.log('errors',errs.length);for(const e of [...new Set(errs)].slice(0,12))console.log(e);
  await b.close();
})();
