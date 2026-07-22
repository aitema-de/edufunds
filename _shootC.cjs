const { chromium } = require('playwright');
(async()=>{
  const OUT='/home/kolja/edufunds-werbespot-demo/_pruef';
  const exe='/home/kolja/.cache/ms-playwright/chromium-1226/chrome-linux/chrome';
  const b=await chromium.launch({executablePath:exe, headless:true, args:['--no-sandbox','--force-color-profile=srgb']});
  const p=await b.newPage({viewport:{width:540,height:960}, deviceScaleFactor:2});
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.goto('file:///home/kolja/edufunds-werbespot-demo/edufunds-demo-overlays.artifact.html');
  await p.waitForTimeout(900);
  await p.evaluate(()=>document.getElementById('chrome').classList.add('hide'));
  await p.evaluate(async()=>{await goForward();await goForward();await goForward();}); // -> Antrag
  await p.waitForTimeout(500);
  const cap=await p.evaluate(()=>{const c=document.querySelector('#overlay .cap');return {text:c.textContent,big:c.classList.contains('big'),shown:document.getElementById('overlay').classList.contains('show')};});
  await p.screenshot({path:`${OUT}/burn-antrag-climax.png`});
  console.log('Climax-Bauchbinde:', JSON.stringify(cap), '| Fehler:', errs.length?errs:'keine');
  await b.close();
})().catch(e=>{console.error('FEHLER:',e.message);process.exit(1)});
