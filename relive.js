// Relive: animated slideshow for memories
(function(){
  const STORAGE_KEY = 'vaulted_memories';
  const slideshow = document.getElementById('slideshow');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const speedSelect = document.getElementById('speedSelect');
  const emptyState = document.getElementById('emptyState');
  const shuffleBtn = document.getElementById('shuffleBtn');
  const fullscreenBtn = document.getElementById('fullscreenBtn');
  const progressBar = document.getElementById('progressBar');
  const thumbnailsEl = document.getElementById('thumbnails');
  const durationRange = document.getElementById('durationRange');
  const durationLabel = document.getElementById('durationLabel');
  const musicFile = document.getElementById('musicFile');
  const musicPlay = document.getElementById('musicPlay');
  const volumeRange = document.getElementById('volumeRange');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const loopBtn = document.getElementById('loopBtn');
  const reverseBtn = document.getElementById('reverseBtn');
  const captionsBtn = document.getElementById('captionsBtn');
  const downloadBtn = document.getElementById('downloadBtn');

  let memories = [];
  let order = [];
  let current = -1;
  let timer = null;
  let shuffleMode = false;
  let playing = true;
  let loopMode = true;
  let direction = 1; // 1 forward, -1 reverse
  let captionsOn = true;
  let audio = null;
  let audioUrl = null;

  function getMemories() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch (e){ return []; }
  }

  function isValidImageDataUrl(dataUrl) { if (!dataUrl || typeof dataUrl !== 'string') return false; const validPattern = /^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/; return validPattern.test(dataUrl); }

  function createSlide(memory) {
    const slide = document.createElement('div');
    slide.className = 'slide';
    // set ken-burns placeholder style variable duration
    slide.style.setProperty('--kb-duration', `${Math.max(4, parseInt(durationRange.value,10)/1000)}s`);
    if (memory.image && isValidImageDataUrl(memory.image)) slide.style.backgroundImage = `url('${memory.image}')`;
    else slide.style.background = `linear-gradient(135deg,var(--p2),var(--p3))`;
    const meta = document.createElement('div'); meta.className = 'meta';
    const title = document.createElement('h3'); title.textContent = memory.title || 'Untitled';
    const date = document.createElement('p'); date.textContent = (new Date(memory.date)).toDateString();
    const desc = document.createElement('p'); desc.textContent = memory.description || '';
    meta.appendChild(title); meta.appendChild(date); meta.appendChild(desc); slide.appendChild(meta);
    return slide;
  }

  function buildSlides() {
    slideshow.innerHTML = '';
    memories.forEach(mem => slideshow.appendChild(createSlide(mem)));
    // prepare order
    order = memories.map((_,i)=>i);
    if (shuffleMode) shuffleArray(order);
    buildThumbnails();
  }

  function buildThumbnails(){
    thumbnailsEl.innerHTML = '';
    memories.forEach((m,idx)=>{
      const t = document.createElement('div'); t.className='thumbnail'; t.dataset.idx = idx;
      if (m.image && isValidImageDataUrl(m.image)){
        const img = document.createElement('img'); img.src = m.image; t.appendChild(img);
      } else {
        t.style.background = 'linear-gradient(90deg,var(--p2),var(--p3))';
        const tt = document.createElement('div'); tt.className='t-title'; tt.textContent = m.title || 'Untitled'; t.appendChild(tt);
      }
      t.addEventListener('click', ()=>{
        const pos = order.indexOf(parseInt(t.dataset.idx,10));
        if (pos!==-1) { current = pos-1; nextSlide(); if (timer){ restartTimer(); } }
      });
      thumbnailsEl.appendChild(t);
    });
    highlightThumbnail();
  }

  function highlightThumbnail(){
    const thumbs = thumbnailsEl.children; for (let i=0;i<thumbs.length;i++){ thumbs[i].classList.remove('active'); }
    if (current>=0 && order[current]!==undefined){ const idx = order[current]; const el = thumbnailsEl.querySelector(`.thumbnail[data-idx="${idx}"]`); if (el) el.classList.add('active'); }
  }

  function shuffleArray(a){ for (let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } }

  const effects = ['kb-zoom-in','kb-zoom-out','kb-pan-left','kb-pan-right','effect-fade'];
  function pickEffect(){ return effects[Math.floor(Math.random()*effects.length)]; }

  function applyEffectToSlide(slide){
    const eff = pickEffect();
    slide.classList.remove(...effects, 'show');
    slide.classList.add(eff);
    requestAnimationFrame(()=> slide.classList.add('show'));
  }

  function showSlideByOrder(pos){
    const slides = slideshow.children; if (!slides || slides.length===0) return;
    for (let i=0;i<slides.length;i++){ slides[i].classList.remove('show', ...effects); }
    const idx = order[pos]; const inSlide = slides[idx]; applyEffectToSlide(inSlide);
    // captions toggle
    if (!captionsOn) document.documentElement.classList.add('captions-hidden'); else document.documentElement.classList.remove('captions-hidden');
    // highlight thumbnail
    highlightThumbnail();
  }

  function nextSlide(){ if (!order.length) return; current = (current + direction + order.length) % order.length; showSlideByOrder(current); }
  function prevSlide(){ if (!order.length) return; current = (current - direction + order.length) % order.length; showSlideByOrder(current); }

  function start(interval){ stop(); playing = true; nextSlide(); timer = setInterval(()=>{ nextSlide(); }, interval); }
  function stop(){ if (timer){ clearInterval(timer); timer = null; } playing = false; }
  function restartTimer(){ if (timer){ const ms = parseInt(durationRange.value,10) || 3500; clearInterval(timer); timer = setInterval(()=> nextSlide(), ms); } }

  // controls wiring
  startBtn.addEventListener('click', ()=>{ const ms = parseInt(durationRange.value,10) || 3500; start(ms); if (audio) { audio.play(); } });
  pauseBtn.addEventListener('click', ()=>{ stop(); if (audio) { audio.pause(); } });
  durationRange.addEventListener('input', ()=>{ durationLabel.textContent = (parseInt(durationRange.value,10)/1000).toFixed(1)+'s'; document.querySelectorAll('.slide').forEach(s=> s.style.setProperty('--kb-duration', `${Math.max(4, parseInt(durationRange.value,10)/1000)}s`)); restartTimer(); });

  shuffleBtn.addEventListener('click', ()=>{ shuffleMode = !shuffleMode; shuffleBtn.textContent = shuffleMode ? 'Shuffle: ON' : 'Shuffle'; if (shuffleMode) shuffleArray(order); else order = memories.map((_,i)=>i); current = -1; buildThumbnails(); });
  prevBtn.addEventListener('click', ()=>{ prevSlide(); if (timer) restartTimer(); });
  nextBtn.addEventListener('click', ()=>{ nextSlide(); if (timer) restartTimer(); });

  loopBtn.addEventListener('click', ()=>{ loopMode = !loopMode; loopBtn.textContent = loopMode ? 'Loop: On' : 'Loop: Off'; });
  reverseBtn.addEventListener('click', ()=>{ direction *= -1; reverseBtn.textContent = direction===1 ? 'Direction: →' : 'Direction: ←'; });
  captionsBtn.addEventListener('click', ()=>{ captionsOn = !captionsOn; captionsBtn.textContent = captionsOn ? 'Captions: On' : 'Captions: Off'; if (!captionsOn) document.documentElement.classList.add('captions-hidden'); else document.documentElement.classList.remove('captions-hidden'); });

  // audio
  musicFile.addEventListener('change', (e)=>{
    const f = e.target.files[0]; if (!f) return; if (audio) { audio.pause(); audio = null; URL.revokeObjectURL(audioUrl); }
    audioUrl = URL.createObjectURL(f); audio = new Audio(audioUrl); audio.loop = true; audio.volume = parseFloat(volumeRange.value); musicPlay.textContent = 'Play';
  });
  musicPlay.addEventListener('click', ()=>{
    if (!audio) return alert('Choose an audio file first');
    if (audio.paused){ audio.play(); musicPlay.textContent = 'Pause'; } else { audio.pause(); musicPlay.textContent = 'Play'; }
  });
  volumeRange.addEventListener('input', ()=>{ if (audio) audio.volume = parseFloat(volumeRange.value); });

  // download current slide image
  downloadBtn.addEventListener('click', ()=>{
    if (current<0 || !order.length) return alert('No slide to download');
    const idx = order[current]; const mem = memories[idx]; if (!mem) return;
    if (mem.image && isValidImageDataUrl(mem.image)){
      const a = document.createElement('a'); a.href = mem.image; a.download = `${(mem.title||'memory').replace(/\s+/g,'_')}.png`; document.body.appendChild(a); a.click(); a.remove();
    } else alert('This slide has no image to download');
  });

  // keyboard navigation
  document.addEventListener('keydown', (e)=>{
    if (e.key === 'ArrowRight') { nextSlide(); if (timer) restartTimer(); }
    else if (e.key === 'ArrowLeft') { prevSlide(); if (timer) restartTimer(); }
    else if (e.key === ' ') { e.preventDefault(); if (timer) { stop(); if (audio) audio.pause(); } else { start(parseInt(durationRange.value,10)||3500); if (audio) audio.play(); } }
    else if (e.key.toLowerCase() === 'f') { fullscreenBtn.click(); }
  });

  fullscreenBtn.addEventListener('click', async ()=>{
    try{ if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }catch(e){ console.warn('Fullscreen failed', e); }
  });

  // init
  function init(){
    memories = getMemories();
    if (!memories || memories.length===0){ emptyState.style.display='block'; slideshow.style.display='none'; return; }
    emptyState.style.display='none'; slideshow.style.display='block'; buildSlides(); const ms = parseInt(durationRange.value,10) || 3500; start(ms);
  }

  init();
})();
