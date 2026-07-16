// Förderlücken-Rechner — Client-Logik (ausgelagert aus index.html, damit die
// nonce-CSP der EduFunds-App greift: script-src 'self' erlaubt diese same-origin
// Datei, blockiert aber Inline-Scripts ohne Nonce). Daten kommen aus dem
// <script type="application/json" id="edufunds-data">-Block, den build.mjs einbettet.
(function(){
  const D = JSON.parse(document.getElementById('edufunds-data').textContent);
  const $ = (s)=>document.querySelector(s);
  const track = (e,d)=>{ try{ if(window.umami) window.umami.track(e, d||{}); }catch(_){} };
  const fmtEur = (n)=> n.toLocaleString('de-DE')+' €';

  // Optionen füllen
  const sf = $('#schulform');
  sf.innerHTML = D.schulformen.map(([v,l])=>'<option value="'+v+'">'+l+'</option>').join('');
  const bl = $('#bundesland');
  bl.innerHTML = D.bundeslaender.map(([l,c])=>'<option value="'+c+'">'+l+'</option>').join('');
  const themesEl = $('#themes');
  themesEl.innerHTML = D.themen.map(([id,label])=>
    '<label class="chip" data-theme="'+id+'"><input type="checkbox" value="'+id+'">'+label+'</label>').join('');
  // Natives <label> toggelt die Checkbox bereits — wir spiegeln nur den .on-Zustand
  // per change-Event (kein manuelles Toggle, sonst Double-Toggle).
  themesEl.querySelectorAll('.chip').forEach(c=>{
    const cb=c.querySelector('input');
    cb.addEventListener('change',()=>c.classList.toggle('on',cb.checked));
  });
  $('#f-count').textContent = D.programme.length;

  // Theme → Kategorien-Map
  const themeCats = {};
  D.themen.forEach(([id,_l,cats])=>themeCats[id]=cats);
  const sekundar = new Set(D.sekundar);

  function matchProgramme(schulform, bundesland, themen){
    const wantCats = new Set();
    themen.forEach(t=> (themeCats[t]||[]).forEach(c=>wantCats.add(c)));
    return D.programme.filter(p=>{
      // Bundesland: leer = bundesweit
      const blOk = !p.bundeslaender.length || p.bundeslaender.includes(bundesland);
      if(!blOk) return false;
      // Schulform: leer = alle; weiterführende erben 'sekundarstufe'
      let sfOk = !p.schulformen.length || p.schulformen.includes(schulform);
      if(!sfOk && sekundar.has(schulform) && p.schulformen.includes('sekundarstufe')) sfOk=true;
      if(!sfOk) return false;
      // Themen: nur filtern wenn welche gewählt
      if(wantCats.size){ if(!p.kategorien.some(c=>wantCats.has(c))) return false; }
      return true;
    });
  }

  function potential(list){
    return list.reduce((s,p)=> s + (p.max ? Math.min(p.max, D.perProgramCap) : 0), 0);
  }

  let lastSum = 0;
  function render(schulform, bundesland, themen){
    const list = matchProgramme(schulform, bundesland, themen)
      .sort((a,b)=>(b.max||0)-(a.max||0));
    const sum = potential(list);
    lastSum = sum;
    const blName = D.bundeslaender.find(([l,c])=>c===bundesland)?.[0] || '';
    const sfName = D.schulformen.find(([v,l])=>v===schulform)?.[1] || '';

    if(!list.length){
      $('#r-num').textContent = '0 €';
      $('#r-sub').textContent = 'Keine exakten Treffer — aber bundesweite Programme passen fast immer.';
      $('#r-fine').textContent = 'Tipp: Thema weglassen oder breiter wählen.';
      $('#r-list').innerHTML = '';
    } else {
      $('#r-num').innerHTML = 'bis zu <br>'+fmtEur(sum);
      $('#r-sub').textContent = list.length+' passende Förderprogramme für eure '+sfName+' in '+blName;
      $('#r-fine').textContent = 'Schätzung auf Basis der maximalen Fördersummen (pro Programm gedeckelt auf '+fmtEur(D.perProgramCap)+' für eine realistische Summe). Einzelne Programme können mehr ausschütten.';
      $('#r-list').innerHTML = list.slice(0,8).map(p=>{
        const sumTxt = p.summeText || (p.max?('bis '+fmtEur(p.max)):'Höhe variabel');
        return '<div class="prog"><div class="top"><span class="pname">'+esc(p.name)+'</span>'+
          '<span class="psum">'+esc(p.max?('bis '+fmtEur(p.max)):'variabel')+'</span></div>'+
          '<div class="pmeta">'+esc(p.geber)+(p.frist?(' · Frist: '+esc(p.frist)):'')+'</div>'+
          '<div class="pkurz">'+esc(p.kurz)+'</div>'+
          '<div class="plinks">'+
            '<a href="'+D.appUrl+'/antrag/start'+D.utm+'" target="_blank" rel="noopener">✍️ Mit EduFunds beantragen</a>'+
            (p.link?('<a href="'+esc(p.link)+'" target="_blank" rel="noopener">ℹ️ Programm-Info</a>'):'')+
          '</div></div>';
      }).join('') + (list.length>8?('<div class="hint" style="text-align:center;margin-top:14px">… und '+(list.length-8)+' weitere passende Programme.</div>'):'');
    }
    $('#r-cta').href = D.appUrl+'/antrag/start'+D.utm;
    track('rechner-berechnung', {schulform, bundesland, themen:themen.length, treffer:list.length, summe:sum});
    $('#form').style.display='none';
    $('#result').style.display='block';
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function esc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));}

  $('#go').addEventListener('click',()=>{
    const themen = [...themesEl.querySelectorAll('input:checked')].map(i=>i.value);
    render(sf.value, bl.value, themen);
  });
  $('#back').addEventListener('click',()=>{ $('#result').style.display='none'; $('#form').style.display='block'; window.scrollTo({top:0,behavior:'smooth'}); });
  $('#r-cta').addEventListener('click',()=>track('rechner-cta',{summe:lastSum}));
  document.querySelector('#r-list').addEventListener('click',(e)=>{ if(e.target.closest('a')&&/beantragen/.test(e.target.textContent)) track('rechner-karte-cta'); });

  // Teilen
  function shareText(){
    const t = lastSum>0
      ? 'Unsere Schule könnte bis zu '+fmtEur(lastSum)+' Fördergeld abrufen 😮 Check eure Förderlücke (30 Sek, kostenlos):'
      : 'Wie viel Fördergeld verschenkt eure Schule? Find es heraus (30 Sek, kostenlos):';
    return t;
  }
  const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);};
  document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',async()=>{
    const url=D.toolUrl, txt=shareText();
    const mode=b.dataset.share;
    track('rechner-share', {mode, summe:lastSum});
    if(mode==='native' && navigator.share){ try{await navigator.share({title:'Förderlücken-Rechner',text:txt,url});}catch(e){} }
    else if(mode==='whatsapp'){ window.open('https://wa.me/?text='+encodeURIComponent(txt+' '+url),'_blank'); }
    else { try{ await navigator.clipboard.writeText(txt+' '+url); toast('Link kopiert ✓'); }catch(e){ toast('Kopieren nicht möglich'); } }
  }));
})();
