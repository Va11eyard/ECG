# Make this design yours — AIECG portable ECG

Build or edit this design for the user. Their current and later requests about content, brand, language and media take priority over the reference kit's sample content. This kit is adapted from the Liberty Walk F40 visual study: the three-section structure, motion skeleton, class names and interaction mechanics are inherited; every automotive element is replaced with code-drawn signal art. Do not restore the Ferrari, the Sketchfab viewer, Japanese calligraphy, or any bitmap media.

## My changes (locked 2026-11-03)
- Brand and purpose: AIECG product landing. Audience: buyers, clinics, partners. Honest copy only: no invented statistics, testimonials, qualifications or results.
- Language and audience: English now, i18n-ready. Every user-visible string also lives in `src/strings/en.js` as flat keys so ru/kz can be added later without touching markup.
- Headline, description and other text: hero "AIECG", handwritten signature "Every beat", six product-beat rows, outro "Built to be clear in every beat", screening disclaimer at the close. Copy rules: no em dashes, no text-arrow glyphs, no periods in titles.
- Button labels and destinations: signature link and story arrow scroll to the details panel. The outro CTA "Explore the live view" carries `data-deploy-slot="live-view-url"` and is pointed at the real app URL at deploy time by the owner.
- Images, logo or video: none. Zero bitmaps. All art is canvas, SVG or CSS-drawn signal art.
- Keep / change: keep the kit's sticky hero, night-to-day intro timings (2200 ms hold, 5200 ms fade), depth parallax, brush-ink reveal with seal stamp, spotlight morph list (Anton to Caveat, exact CustomEase, row-height math, card spring and reshuffle, pointer light, keyboard and touch fallbacks) and the light editorial outro. Change: the Ferrari 3D viewer becomes a live self-drawing ECG trace on canvas; photographic cards become canvas-drawn signal tiles; Japanese type becomes Caveat handwriting; Yuji fonts drop out.
Blank fields are not content to render. If no customization was requested, build this kit as the starting point.

## Editing rules
1. In an existing project, edit the current files in place. Do not recreate the folder, reset previous changes or reinstall everything for a text/media edit. For a new project use the setup below.
2. Treat the source below as baseline implementation and sample content. Keep the visual composition and working motion unless a change requires adapting them.
3. Replace requested text wherever it appears: visible headings, navigation, buttons, accessible labels, title and description. Use the user's language and real information; never invent testimonials, qualifications, sales or results. Adjust wrapping and spacing for new copy rather than clipping or forcing the old words. Keep selectors and IDs used by animation code; update their references consistently if necessary.
4. This kit contains no bitmap media. If imagery is ever requested, prefer code-drawn art; generated or supplied bitmaps need a stated concept, an on-page caption and an updated manifest entry with real byte counts and hashes computed from actual bytes.
5. Fonts are the only binary assets. They are downloaded and SHA-256 verified by `npm run assets`. Keep their filenames and OFL license notices. Never invent hashes.
6. Recheck intro timing, canvas scaling, parallax bounds and reduced-motion fallbacks after motion-affecting changes. Report a missing file or incompatible format clearly; do not silently substitute assets.
7. Run the project's existing build/checks where available and inspect desktop/mobile text, canvas loading, links, navigation and motion. Distinguish local demo behavior from working server features. Report what changed and what you actually tested.

## Where to edit this design
Start with `index.html`, `src/hero.js`, `src/hero.css`, `src/trace.js` and `src/spotlight.js`. The canvas engine lives in `src/trace.js`; the signal tiles live in `src/tiles.js`. All copy keys live in `src/strings/en.js`.

## Reference implementation — the AIECG visual study

Reproduce this complete three-section study. The full-viewport hero uses a **live self-drawing ECG trace on an HTML canvas** as its interactive centerpiece. No external service, model or network asset is required beyond the four fonts. The trace draws a continuous sinus-rhythm beat train left to right forever. Pointer drag changes tempo and amplitude, wheel and pinch zoom amplitude with hard clamps (40 to 160 bpm, 0.55 to 1.8 amplitude) so the signal can never be flattened or blown out. Arrow keys adjust tempo and amplitude, plus and minus zoom, Home resets. The canvas starts as a glowing trace on a dark monitor and the scene fades to ink on ivory ECG paper: hold 2200 ms, then fade 5200 ms with smoothstep easing, driving the `--day` custom property and the trace color in lockstep; user interaction must not interrupt this transition. Reduced motion renders one static ink strip instead of an animation loop. Layer the faint ECG paper grid, ghost "AIECG" lettering BEHIND the trace, a faint breathing-baseline SVG wave, handwritten "Every beat" in Caveat revealed by the uneven brush-edge clip-path with a rotated red "AIECG" seal landing at 2200 ms, and three drifting pulse marks in the foreground. Preserve depth parallax driven by pointer and scroll. Native page scrolling works outside the trace input and at amplitude bounds. Keep arrow-key control, reduced-motion support, the loading indicator and a canvas-failure fallback. Do not add automatic camera flights or scene resets.

The second section is the dark rounded Spotlight panel with six product beats: Pocket ECG, Live signal, Guided capture, Instant analysis, Doctor-ready report, Private by design. Titles are drawn in Anton uppercase and squash, blur and fade into Caveat handwriting on hover; hovered rows grow 50 px while other rows shrink by inverse distance, keeping total list height constant. Four glass-framed portrait tiles spring in, reshuffle and follow the active row. Each tile is a canvas-drawn signal motif (single beat, fast rhythm, slow wave, paper grid, report lines, radio arcs) chosen from six curated four-motif sets, one per row. Preserve the pointer light, exact GSAP CustomEase `sl-hop`, keyboard focus behavior, touch plain-list fallback and cleanup.

The final light editorial section reads "Built to be clear in every beat" with the screening disclaimer "AIECG is a screening companion. It does not replace diagnosis by a clinician." and a deploy-slot CTA. This is an honest product page: it makes no diagnostic claims and states no figures that were not measured. Write every file below and download the exact font assets; no redesign or additional sections.

This prompt is self-contained. Create a NEW folder on your own computer and write every file listed below using the indicated relative filename. No previous project, local reference folder, account, API key or separate handoff document is needed. The included source is authoritative: preserve the composition, copy, media and motion rather than inventing a new design.

## Fonts

Production media — public Cloudflare URLs, no sign-in required (identical binaries to the Liberty Walk kit):
- https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/league-gothic.woff
  Save as: public/fonts/league-gothic.woff
- https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/Anton-Regular.ttf
  Save as: public/fonts/Anton-Regular.ttf
- https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/Caveat-SemiBold.ttf
  Save as: public/fonts/Caveat-SemiBold.ttf
- https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/DMSans-Medium.ttf
  Save as: public/fonts/DMSans-Medium.ttf

The Yuji Japanese fonts and all image assets from the original kit are intentionally absent.

## Build on a new computer

Use Node.js 22.12 or newer. After writing ALL the files below, run:

```sh
npm install
npm run assets
npm run dev
```

The asset script downloads and verifies the exact fonts with SHA-256 before saving them into this new project. Keep these filenames: the source uses them. If a URL fails, report that URL; do not invent substitute media. Use the included local League Gothic, Anton, Caveat 600 and DM Sans 500 font files. Preserve their OFL license notices. No external font account is needed. No backend or payment service is supplied: preserve the kit's existing local interactions.

## Check the result

Inspect at 1440x900, 768x1024 and 390x844. Check complete scene/section order, fonts, canvas drawing at device pixel ratio, forward interactions (drag, wheel, pinch, keyboard, Home reset), the night-to-day intro, spotlight hover morph and tile reshuffle, keyboard focus, touch plain-list fallback, reduced motion, resize and horizontal overflow. Do not add new sections, statistics, decorative labels or other UI absent from the source.

## Complete source files

### index.html

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="theme-color" content="#10141a" />
  <title>AIECG Portable ECG</title>
  <link rel="stylesheet" href="./src/hero.css" />
</head>
<body>
  <main class="trace-track">
    <section class="trace-stage" aria-label="AIECG live signal study">
      <div class="night-set" aria-hidden="true"></div>
      <div class="day-set" aria-hidden="true">
        <div class="paper-art"></div>
        <span class="ghost-type">AIECG</span>
        <svg class="baseline-art" viewBox="0 0 1200 400" preserveAspectRatio="none" aria-hidden="true"><path d="M0 224 C 140 208, 265 238, 405 224 S 690 208, 845 230 S 1115 212, 1200 226" fill="none"/></svg>
        <svg class="pulse-frame" viewBox="0 0 1200 110" preserveAspectRatio="xMidYMin meet" aria-hidden="true">
          <defs><path id="qrs" d="M0 0 l7 -6 l5 34 l6 -44 l5 52 l6 -38 l4 2" fill="none"/></defs>
          <use href="#qrs" x="40" y="18"/><use href="#qrs" x="150" y="10"/><use href="#qrs" x="330" y="22"/><use href="#qrs" x="520" y="12"/><use href="#qrs" x="700" y="20"/><use href="#qrs" x="860" y="8"/><use href="#qrs" x="1010" y="18"/><use href="#qrs" x="1140" y="12"/>
        </svg>
        <div class="pulse-type"><span>Every</span><span>beat</span></div>
      </div>
      <canvas id="ecg-trace"></canvas>
      <div class="foreground-art" aria-hidden="true"><i class="pulse-dot pulse-dot-one"></i><i class="pulse-dot pulse-dot-two"></i><i class="pulse-dot pulse-dot-three"></i></div>
      <div class="trace-input" tabindex="0" role="region" aria-label="Signal view. Drag to change pace, scroll or pinch to zoom the trace. Arrow keys adjust, plus and minus zoom, Home resets."></div>
      <div class="hero-signature"><span class="hero-kicker">AIECG / PORTABLE ECG</span><h1>AIECG</h1><a class="hero-cta" href="#the-details">See how it works</a></div>
      <a class="story-arrow" href="#the-details" aria-label="Explore the details"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4v15m-6-6 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg><span>THE DETAILS</span></a>
      <div class="trace-credit"><span>LIVE SIGNAL</span><strong>Drawn in canvas</strong></div>
      <div class="loading-status" role="status"><span class="loading-title">AIECG</span><span class="loading-label">READING THE SIGNAL</span><span class="loader"></span><span class="sr-only">Loading the live signal view</span></div>
      <div class="fallback" hidden>Signal view unavailable in this browser</div>
    </section>
  </main>
  <div class="sl">
    <section class="sl-spotlight" id="the-details" tabindex="-1" aria-labelledby="details-heading">
      <div class="sl-panel">
        <p class="sl-panel__eyebrow" id="details-heading">One device. The whole picture.</p>
        <div class="sl-stage">
          <div class="sl-cards" aria-hidden="true">
            <canvas class="sl-card sl-card--1" data-rotation="-10" width="420" height="630"></canvas>
            <canvas class="sl-card sl-card--2" data-rotation="10" width="420" height="630"></canvas>
            <canvas class="sl-card sl-card--3" data-rotation="8" width="420" height="630"></canvas>
            <canvas class="sl-card sl-card--4" data-rotation="-8" width="420" height="630"></canvas>
          </div>
          <div class="sl-list" aria-label="Explore what AIECG does">
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Pocket ECG</span><span class="sl-label__alt" aria-hidden="true">Pocket ECG</span></span></button>
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Live signal</span><span class="sl-label__alt" aria-hidden="true">Live signal</span></span></button>
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Guided capture</span><span class="sl-label__alt" aria-hidden="true">Guided capture</span></span></button>
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Instant analysis</span><span class="sl-label__alt" aria-hidden="true">Instant analysis</span></span></button>
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Doctor-ready report</span><span class="sl-label__alt" aria-hidden="true">Doctor-ready report</span></span></button>
            <button class="sl-item" type="button"><span class="sl-label"><span class="sl-label__default">Private by design</span><span class="sl-label__alt" aria-hidden="true">Private by design</span></span></button>
          </div>
        </div>
        <p class="sl-panel__note">A familiar trace, rewritten for the pocket.<br />Hover a title to see the signal in a different state.</p>
      </div>
    </section>
    <section class="sl-outro" aria-labelledby="outro-heading">
      <p class="sl-outro__eyebrow">AIECG PORTABLE ECG</p>
      <h2 id="outro-heading">Built to be<br /><em>clear in every beat</em></h2>
      <p>A pocket ECG that pairs with your phone over Bluetooth, shows the signal as it happens and turns a capture into a report a clinician can read.</p>
      <a class="sl-outro__link" href="#" data-deploy-slot="live-view-url">Explore the live view</a>
      <span class="sl-outro__disclaimer">AIECG is a screening companion. It does not replace diagnosis by a clinician.</span>
      <span class="sl-outro__credit">Product study · Type set in League Gothic, Anton, Caveat and DM Sans under the SIL Open Font License</span>
    </section>
  </div>
  <script type="module" src="./src/hero.js"></script>
</body>
</html>
```

### package.json

```json
{
  "name": "aiecg-site",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "assets": "node download-assets.mjs"
  },
  "dependencies": {
    "gsap": "^3.15.0"
  },
  "devDependencies": {
    "vite": "6.4.2"
  }
}
```

### assets.json

```json
[
  {
    "file": "public/fonts/league-gothic.woff",
    "url": "https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/league-gothic.woff",
    "bytes": 19548,
    "sha256": "9e7726e2d42ed412e308d089ecffe3fd211fb56b4b273a3caeaa2a175fba744f"
  },
  {
    "file": "public/fonts/Anton-Regular.ttf",
    "url": "https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/Anton-Regular.ttf",
    "bytes": 130324,
    "sha256": "fd9301f2837c99df2be07cc7f0be66e9470f5354d8fcf1606027c67fcd637a53"
  },
  {
    "file": "public/fonts/Caveat-SemiBold.ttf",
    "url": "https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/Caveat-SemiBold.ttf",
    "bytes": 251816,
    "sha256": "e5be0a7ef2eb97414937cb70d079c8c9fb2e472cf74eab5b8fe9dfa2f6fb2704"
  },
  {
    "file": "public/fonts/DMSans-Medium.ttf",
    "url": "https://media.prettysites.io/products/liberty-walk-f40/v1/fonts/DMSans-Medium.ttf",
    "bytes": 48308,
    "sha256": "376427b5322148d8de1e03f263bcca4935a2d60ba71d9f94f4947ab664c711ae"
  }
]
```

### download-assets.mjs

```js
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=import.meta.dirname;
const assets=JSON.parse(await fs.readFile(new URL('./assets.json',import.meta.url),'utf8'));
for(const asset of assets){
 const target=path.resolve(root,asset.file);
 if(!target.startsWith(path.join(root,'public')+path.sep))throw Error('Unsafe asset path');
 const valid=bytes=>bytes&&bytes.length===asset.bytes&&createHash('sha256').update(bytes).digest('hex')===asset.sha256;
 if(valid(await fs.readFile(target).catch(()=>null)))continue;
 if(new URL(asset.url).origin!=='https://media.prettysites.io')throw Error('Unexpected media origin');
 const response=await fetch(asset.url,{signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error(asset.url+' HTTP '+response.status);
 const data=Buffer.from(await response.arrayBuffer());
 if(!valid(data))throw Error('Asset verification failed: '+asset.url);
 await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,data);
 console.log('Ready: '+asset.file);
}
console.log('All '+assets.length+' assets verified');
```

### src/strings/en.js

```js
// Single source of truth for user-visible copy. index.html holds the same
// English text for no-JS rendering; locales swap this module per language.
export default {
  title: 'AIECG Portable ECG',
  kicker: 'AIECG / PORTABLE ECG',
  heroHeading: 'AIECG',
  signatureCta: 'See how it works',
  storyArrowLabel: 'THE DETAILS',
  storyArrowAria: 'Explore the details',
  traceInputAria: 'Signal view. Drag to change pace, scroll or pinch to zoom the trace. Arrow keys adjust, plus and minus zoom, Home resets.',
  creditKicker: 'LIVE SIGNAL',
  creditStrong: 'Drawn in canvas',
  loadingTitle: 'AIECG',
  loadingLabel: 'READING THE SIGNAL',
  loadingSr: 'Loading the live signal view',
  fallbackText: 'Signal view unavailable in this browser',
  stageAria: 'AIECG live signal study',
  detailsEyebrow: 'One device. The whole picture.',
  detailsListAria: 'Explore what AIECG does',
  rows: [
    ['Pocket ECG', 'Pocket ECG'],
    ['Live signal', 'Live signal'],
    ['Guided capture', 'Guided capture'],
    ['Instant analysis', 'Instant analysis'],
    ['Doctor-ready report', 'Doctor-ready report'],
    ['Private by design', 'Private by design'],
  ],
  detailsNote: 'A familiar trace, rewritten for the pocket.\nHover a title to see the signal in a different state.',
  outroEyebrow: 'AIECG PORTABLE ECG',
  outroHeadingPlain: 'Built to be',
  outroHeadingAccent: 'clear in every beat',
  outroBody: 'A pocket ECG that pairs with your phone over Bluetooth, shows the signal as it happens and turns a capture into a report a clinician can read.',
  outroCta: 'Explore the live view',
  outroDisclaimer: 'AIECG is a screening companion. It does not replace diagnosis by a clinician.',
  outroCredit: 'Product study · Type set in League Gothic, Anton, Caveat and DM Sans under the SIL Open Font License',
};
```

### src/trace.js

```js
// Live self-drawing ECG trace. Pure canvas, no assets. Sinus rhythm only:
// the art never simulates pathology.
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
export const TEMPO_LIMITS={min:40,max:160};
export const AMPLITUDE_LIMITS={min:.55,max:1.8};
export const INITIAL_STATE={bpm:72,amplitude:1};
const PX_PER_SEC=340;
const NIGHT={r:126,g:244,b:178},DAY={r:38,g:35,b:31};
function gauss(x,mu,sigma,a){const d=(x-mu)/sigma;return a*Math.exp(-.5*d*d);}
function beat(p){
  return gauss(p,.16,.032,.11)-gauss(p,.30,.010,.055)+gauss(p,.315,.011,1)
    -gauss(p,.34,.014,.24)+gauss(p,.56,.055,.2);
}
const mix=(a,b,t)=>Math.round(a+(b-a)*t);
function strokeColor(day){return `rgb(${mix(NIGHT.r,DAY.r,day)},${mix(NIGHT.g,DAY.g,day)},${mix(NIGHT.b,DAY.b,day)})`;}
export function createTrace(canvas,input,{reduced=false}={}){
  const ctx=canvas.getContext('2d');
  if(!ctx)return null;
  const state={...INITIAL_STATE};
  let phase=0,day=0,raf=0,previous=0,carry=0,buffer=[],w=0,h=0,destroyed=false;
  const listeners=[];
  const on=(el,name,fn,opts)=>{el.addEventListener(name,fn,opts);listeners.push(()=>el.removeEventListener(name,fn,opts));};
  function resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    w=Math.max(1,canvas.clientWidth);h=Math.max(1,canvas.clientHeight);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.ceil(w);
    buffer=Array.from({length:count},(_,i)=>{
      const back=(count-1-i)*(PX_PER_SEC*(60/state.bpm));
      return phase-back+Math.sin(i*.015)*.02;
    });
    if(reduced)draw(0);
  }
  function push(pixels){
    const count=Math.ceil(w);
    for(let i=0;i<pixels;i++){
      const perBeat=PX_PER_SEC*(60/state.bpm);
      const step=(1/perBeat)*(1+.03*Math.sin(phase*TAU));
      phase=(phase+step)%1;
      buffer.push(phase);
    }
    if(buffer.length>count)buffer.splice(0,buffer.length-count);
  }
  const TAU=Math.PI*2;
  function yAt(i,amp){
    const mid=h*.52;
    const breathe=Math.sin(i/240)*.02;
    return mid-amp*h*.30*beat(buffer[i])-amp*h*.06*breathe;
  }
  function pass(color,width,alpha,blur){
    ctx.beginPath();
    for(let i=0;i<buffer.length;i+=3)i===0?ctx.moveTo(0,yAt(i,state.amplitude)):ctx.lineTo(i,yAt(i,state.amplitude));
    ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.strokeStyle=color;
    ctx.shadowColor=color;ctx.shadowBlur=blur;
    ctx.lineJoin='round';ctx.lineCap='round';
    ctx.stroke();ctx.shadowBlur=0;ctx.globalAlpha=1;
  }
  function draw(dt){
    if(dt){
      const total=carry+dt*PX_PER_SEC;
      const pixels=Math.floor(total);
      carry=total-pixels;
      if(pixels)push(pixels);
    }
    ctx.clearRect(0,0,w,h);
    const color=strokeColor(day);
    pass(color,3.2,.28,mix(18,0,day));
    pass(color,1.5,.94,0);
  }
  function tick(now){
    raf=0;
    const dt=Math.min(.05,(now-previous)/1000||0);previous=now;
    draw(dt);
    raf=requestAnimationFrame(tick);
  }
  function update(){if(!raf&&!document.hidden&&!reduced){previous=performance.now();raf=requestAnimationFrame(tick);}}
  function apply(){if(reduced)draw(0);else update();}
  function onVisibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else update();}
  function onPointerDown(event){
    if(event.button!==0)return;
    input.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    input.classList.add('is-dragging');
  }
  const pointers=new Map();
  function onPointerMove(event){
    const old=pointers.get(event.pointerId);if(!old)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){
      state.bpm=clamp(state.bpm-(event.clientX-old.x)*.12,TEMPO_LIMITS.min,TEMPO_LIMITS.max);
      state.amplitude=clamp(state.amplitude+(event.clientY-old.y)*.003,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    }else{
      const pts=[...pointers.values()];
      const dist=()=>Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y);
      const next=dist(),prev=pinch;pinch=next;
      if(prev>0&&next>0)state.amplitude=clamp(state.amplitude*prev/next,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    }
    apply();
  }
  let pinch=0;
  function release(event){pointers.delete(event.pointerId);const pts=[...pointers.values()];pinch=pts.length===2?Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y):0;if(!pointers.size)input.classList.remove('is-dragging');}
  on(input,'pointerdown',onPointerDown);
  on(input,'pointermove',onPointerMove);
  for(const name of ['pointerup','pointercancel','lostpointercapture'])on(input,name,release);
  on(input,'wheel',event=>{
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
    const next=clamp(state.amplitude*Math.exp(clamp(delta,-300,300)*.0012),AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    if(next===state.amplitude)return;
    event.preventDefault();state.amplitude=next;apply();
  },{passive:false});
  on(input,'keydown',event=>{
    if(event.key==='ArrowLeft')state.bpm=clamp(state.bpm+5,TEMPO_LIMITS.min,TEMPO_LIMITS.max);
    else if(event.key==='ArrowRight')state.bpm=clamp(state.bpm-5,TEMPO_LIMITS.min,TEMPO_LIMITS.max);
    else if(event.key==='ArrowUp')state.amplitude=clamp(state.amplitude+.08,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    else if(event.key==='ArrowDown')state.amplitude=clamp(state.amplitude-.08,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    else if(['+','='].includes(event.key))state.amplitude=clamp(state.amplitude*.92,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    else if(event.key==='-')state.amplitude=clamp(state.amplitude/.92,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    else if(event.key==='Home'){state.bpm=INITIAL_STATE.bpm;state.amplitude=INITIAL_STATE.amplitude;}
    else return;
    event.preventDefault();apply();
  });
  on(window,'resize',resize);
  on(document,'visibilitychange',onVisibility);
  resize();
  function stop(){destroyed=true;cancelAnimationFrame(raf);raf=0;listeners.forEach(remove=>remove());}
  on(window,'pagehide',stop,{once:true});
  if(!reduced)update();
  return {
    setDay(value){day=clamp(value,0,1);if(reduced)draw(0);},
    isDestroyed:()=>destroyed,
    stop,
  };
}
```

### src/parallax.js

```js
// Artwork moves independently of the grounded trace, in depth planes.
export function installParallax(stage,track,reducedMotion){
  let pointerX=0,pointerY=0,scroll=0,x=0,y=0,raf=0,previous=0;
  const fine=matchMedia('(pointer:fine)');
  function target(){
    return reducedMotion.matches?[0,0]:[pointerX*.68,pointerY*.5-scroll*.5];
  }
  function tick(now){
    raf=0;
    const [tx,ty]=target();
    const blend=1-Math.exp(-Math.min(64,now-previous||16)/130);previous=now;
    x+=(tx-x)*blend;y+=(ty-y)*blend;
    stage.style.setProperty('--parallax-x',x.toFixed(4));
    stage.style.setProperty('--parallax-y',y.toFixed(4));
    if(Math.abs(tx-x)+Math.abs(ty-y)>.001)raf=requestAnimationFrame(tick);
  }
  function update(){if(!raf&&!document.hidden){previous=performance.now();raf=requestAnimationFrame(tick);}}
  function onPointer(event){
    if(!fine.matches||event.pointerType==='touch')return;
    pointerX=(event.clientX/innerWidth-.5)*2;pointerY=(event.clientY/innerHeight-.5)*2;update();
  }
  function leave(){pointerX=0;pointerY=0;update();}
  function onScroll(){scroll=Math.max(0,Math.min(1,window.scrollY/Math.max(1,track.offsetHeight-stage.offsetHeight)));update();}
  function onVisibility(){if(document.hidden){cancelAnimationFrame(raf);raf=0;}else update();}
  window.addEventListener('pointermove',onPointer,{passive:true});
  document.documentElement.addEventListener('pointerleave',leave);
  window.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('visibilitychange',onVisibility);
  reducedMotion.addEventListener('change',update);
  window.addEventListener('pagehide',()=>{
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove',onPointer);
    document.documentElement.removeEventListener('pointerleave',leave);
    window.removeEventListener('scroll',onScroll);
    document.removeEventListener('visibilitychange',onVisibility);
    reducedMotion.removeEventListener('change',update);
  },{once:true});
  onScroll();
}
```

### src/tiles.js

```js
// Canvas-drawn spotlight tiles. Abstract signal motifs, no clinical labels.
const INK='#26231f',PAPER='#f4f2ec',RED='#b2362d';
function grid(ctx,w,h){
  ctx.save();
  ctx.strokeStyle='rgba(38,35,31,.09)';ctx.lineWidth=1;
  for(let x=.5;x<w;x+=10){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=.5;y<h;y+=10){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.strokeStyle='rgba(178,54,45,.14)';
  for(let x=.5;x<w;x+=50){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
  for(let y=.5;y<h;y+=50){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
  ctx.restore();
}
function qrs(ctx,cx,cy,amp){
  ctx.beginPath();
  ctx.moveTo(cx-60,cy);
  ctx.lineTo(cx-40,cy-amp*.10);
  ctx.quadraticCurveTo(cx-32,cy-amp*.16,cx-26,cy+amp*.02);
  ctx.lineTo(cx-18,cy+amp*.55);
  ctx.lineTo(cx-8,cy-amp);
  ctx.lineTo(cx+2,cy+amp*.30);
  ctx.lineTo(cx+14,cy);
  ctx.quadraticCurveTo(cx+34,cy-amp*.05,cx+48,cy-amp*.18);
  ctx.lineTo(cx+70,cy-amp*.14);
  ctx.stroke();
}
function seal(ctx,w,h){
  ctx.save();ctx.translate(w-44,h-40);ctx.rotate(.07);
  ctx.fillStyle=RED;ctx.fillRect(-9,-7,22,15);
  ctx.restore();
}
export const MOTIFS=['beat','fast','slow','grid','report','radio'];
export function drawTile(kind,canvas){
  const ctx=canvas.getContext('2d');if(!ctx)return;
  const w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle=PAPER;ctx.fillRect(0,0,w,h);
  grid(ctx,w,h);
  ctx.strokeStyle=INK;ctx.lineWidth=4;ctx.lineJoin='round';ctx.lineCap='round';
  if(kind==='beat'){qrs(ctx,w*.5,h*.46,h*.24);}
  else if(kind==='fast'){for(let x=60;x<w-40;x+=64)qrs(ctx,x,h*.42,h*.10);}
  else if(kind==='slow'){
    ctx.beginPath();
    for(let x=0;x<=w;x+=4){const y=h*.45-Math.sin(x/90)*h*.10-Math.sin(x/37)*h*.02;x===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}
    ctx.stroke();
  }
  else if(kind==='grid'){qrs(ctx,w*.5,h*.5,h*.3);}
  else if(kind==='report'){
    ctx.strokeStyle='rgba(38,35,31,.28)';ctx.lineWidth=2;
    for(let y=90;y<h-60;y+=52){ctx.beginPath();ctx.moveTo(48,y);ctx.lineTo(w-48,y);ctx.stroke();}
    ctx.fillStyle='rgba(38,35,31,.5)';
    for(let y=104;y<h-70;y+=52)ctx.fillRect(48,y,90,6);
    ctx.fillStyle=RED;ctx.fillRect(30,84,6,180);
  }
  else if(kind==='radio'){
    ctx.lineWidth=5;
    for(let r=36;r<=132;r+=32){ctx.beginPath();ctx.arc(w*.72,h*.30,r,-.9,.9);ctx.stroke();}
    ctx.fillStyle=INK;ctx.beginPath();ctx.arc(w*.72,h*.30,10,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=3;
    for(let x=40;x<w*.6;x+=52)qrs(ctx,x,h*.78,h*.07);
  }
  seal(ctx,w,h);
}
```

### src/spotlight.js

```js
import {gsap} from 'gsap';
import {CustomEase} from 'gsap/CustomEase';
import {drawTile,MOTIFS} from './tiles.js';
import './spotlight.css';
gsap.registerPlugin(CustomEase);
CustomEase.create('sl-hop','0.35, 0.75, 0, 1');
const DEFAULTS={hoverGrowth:50,cardXRange:100,cardYJitter:50,cardRotationJitter:20,cardFollow:.75,cardsDuration:1,labelDuration:.25,entryBlur:6};
// Six curated four-motif sets, indexes into MOTIFS.
const SETS=[[0,4,1,3],[2,0,4,5],[1,3,0,4],[5,2,3,0],[3,1,5,2],[0,5,2,1]];
export function rowHeights(count,index,base,growth){
  const weights=Array.from({length:count},(_,i)=>i===index?0:1/Math.abs(i-index));
  const total=weights.reduce((a,b)=>a+b,0);
  return weights.map((weight,i)=>i===index?base+growth:base-growth*weight/total);
}
export function mountSpotlight(root,config={}){
  if(!root)return()=>{};
  const cfg={...DEFAULTS,...config},panel=root.querySelector('.sl-panel'),list=root.querySelector('.sl-list');
  const items=[...root.querySelectorAll('.sl-item')],cards=[...root.querySelectorAll('.sl-card')],labels=[...root.querySelectorAll('.sl-label span')];
  const motion=matchMedia('(prefers-reduced-motion: reduce)'),hover=matchMedia('(hover:hover) and (pointer:fine)');
  let baseHeight=0,active=-1,destroyed=false;
  const listeners=[];
  const on=(el,name,fn)=>{el.addEventListener(name,fn);listeners.push(()=>el.removeEventListener(name,fn));};
  const duration=value=>motion.matches?0:value;
  function measure(){
    gsap.killTweensOf(items);gsap.set(items,{clearProps:'height'});
    baseHeight=Math.round(Math.max(...items.map(el=>el.offsetHeight))+10);
    gsap.set(items,{height:baseHeight});
  }
  cards.forEach((card,i)=>{drawTile(MOTIFS[SETS[0][i]],card);gsap.set(card,{rotation:Number(card.dataset.rotation),scale:0,filter:`blur(${cfg.entryBlur}px)`});});
  gsap.set(root.querySelectorAll('.sl-label__alt'),{scaleX:.75,scaleY:1.25,opacity:0,filter:'blur(1px)'});
  function animateLabel(el,{opacity,scaleX,scaleY,blur}){
    gsap.to(el,{opacity,duration:duration(cfg.labelDuration*.4),delay:motion.matches?0:.025,ease:'sl-hop',overwrite:'auto'});
    gsap.to(el,{scaleX,scaleY,duration:duration(cfg.labelDuration),ease:'back.out(1.75)',overwrite:'auto'});
    gsap.to(el,{filter:`blur(${blur}px)`,duration:duration(cfg.labelDuration),ease:'sl-hop',overwrite:'auto'});
  }
  function swap(item,enter){
    animateLabel(item.querySelector('.sl-label__default'),enter?{opacity:0,scaleX:.75,scaleY:1.25,blur:1}:{opacity:1,scaleX:1,scaleY:1,blur:0});
    animateLabel(item.querySelector('.sl-label__alt'),enter?{opacity:1,scaleX:1,scaleY:1,blur:0}:{opacity:0,scaleX:.75,scaleY:1.25,blur:1});
  }
  function placeCards(item,index){
    const rect=item.getBoundingClientRect(),listRect=list.getBoundingClientRect();
    const followY=(rect.top+rect.height/2-listRect.top-listRect.height/2)*cfg.cardFollow;
    cards.forEach((card,i)=>{
      drawTile(MOTIFS[SETS[index][i]],card);
      gsap.to(card,{x:gsap.utils.random(-cfg.cardXRange,cfg.cardXRange),y:followY+gsap.utils.random(-cfg.cardYJitter,cfg.cardYJitter),rotation:Number(card.dataset.rotation)+gsap.utils.random(-cfg.cardRotationJitter,cfg.cardRotationJitter),duration:duration(cfg.cardsDuration),ease:'elastic.out(1, 0.5)',overwrite:'auto'});
    });
  }
  function show(){if(!hover.matches)return;gsap.to(cards,{scale:1,filter:'blur(0px)',duration:duration(.75),ease:'elastic.out(1, 0.6)',overwrite:'auto'});}
  function hide(){
    if(active>=0)swap(items[active],false);active=-1;
    gsap.to(cards,{scale:0,filter:`blur(${cfg.entryBlur}px)`,duration:duration(.5),ease:'power3.out',overwrite:'auto'});
    gsap.to(items,{height:baseHeight,duration:duration(.35),ease:'power3.out',overwrite:'auto'});
  }
  function enter(item,index){
    if(!hover.matches)return;
    if(active>=0&&active!==index)swap(items[active],false);
    active=index;swap(item,true);placeCards(item,index);
    const heights=rowHeights(items.length,index,baseHeight,cfg.hoverGrowth);
    items.forEach((row,i)=>gsap.to(row,{height:heights[i],duration:duration(.5),ease:'power2.out',overwrite:'auto'}));
  }
  on(list,'mouseenter',show);on(list,'mouseleave',hide);
  items.forEach((item,index)=>{
    on(item,'mouseenter',()=>enter(item,index));on(item,'mouseleave',()=>swap(item,false));
    on(item,'focus',()=>{show();enter(item,index);});
  });
  on(list,'focusout',event=>{if(!list.contains(event.relatedTarget))hide();});
  on(panel,'pointermove',event=>{if(!hover.matches)return;const r=panel.getBoundingClientRect();panel.style.setProperty('--sl-mx',`${(event.clientX-r.left)/r.width*100}%`);panel.style.setProperty('--sl-my',`${(event.clientY-r.top)/r.height*100}%`);});
  on(panel,'pointerenter',()=>{if(hover.matches)panel.classList.add('is-lit');});
  on(panel,'pointerleave',()=>panel.classList.remove('is-lit'));
  on(window,'resize',()=>{hide();measure();});
  on(hover,'change',hide);on(motion,'change',hide);
  measure();document.fonts.ready.then(()=>{if(!destroyed)measure();});
  function destroy(){destroyed=true;listeners.forEach(remove=>remove());gsap.killTweensOf([...cards,...items,...labels]);gsap.set([...cards,...items,...labels],{clearProps:'all'});panel.classList.remove('is-lit');panel.style.removeProperty('--sl-mx');panel.style.removeProperty('--sl-my');}
  on(window,'pagehide',destroy);
  return destroy;
}
```

### src/hero.js

```js
import {createTrace} from './trace.js';
import {installParallax} from './parallax.js';
import {mountSpotlight} from './spotlight.js';
import strings from './strings/en.js';
document.title=strings.title;
const stage=document.querySelector('.trace-stage');
const track=document.querySelector('.trace-track');
const input=document.querySelector('.trace-input');
const canvas=document.querySelector('#ecg-trace');
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
installParallax(stage,track,reducedMotion);
mountSpotlight(document.querySelector('.sl'));
document.querySelector('.story-arrow').addEventListener('click',event=>{
  event.preventDefault();
  const story=document.querySelector('#the-details');
  story.scrollIntoView({behavior:reducedMotion.matches?'instant':'smooth'});
  story.focus({preventScroll:true});
});
const introAbort=new AbortController();
function fail(){stage.classList.add('load-failed');document.querySelector('.fallback').hidden=false;}
const trace=createTrace(canvas,input,{reduced:reducedMotion.matches});
if(!trace){fail();}
const loadingTimeout=setTimeout(fail,45000);
reducedMotion.addEventListener('change',()=>{if(reducedMotion.matches)introAbort.abort();});
window.addEventListener('pagehide',()=>{introAbort.abort();clearTimeout(loadingTimeout);},{once:true});
function ready(){
  clearTimeout(loadingTimeout);
  stage.classList.remove('load-failed');
  document.querySelector('.fallback').hidden=true;
  stage.classList.add('is-ready');
}
Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,2500))]).then(()=>{
  if(trace&&!trace.isDestroyed())ready();
});
if(trace&&!reducedMotion.matches&&!introAbort.signal.aborted){
  stage.dataset.phase='night';
  setTimeout(()=>{
    if(introAbort.signal.aborted||trace.isDestroyed())return;
    let raf=0,done=false;
    const started=performance.now();
    const finish=()=>{
      if(done)return;
      done=true;cancelAnimationFrame(raf);
      stage.style.setProperty('--day','1');
      trace.setDay(1);
      stage.classList.add('intro-complete');
      stage.dataset.phase='day';
      introAbort.signal.removeEventListener('abort',finish);
    };
    introAbort.signal.addEventListener('abort',finish,{once:true});
    const tick=now=>{
      const raw=Math.max(0,Math.min(1,(now-started)/5200));
      const t=raw*raw*(3-2*raw);
      stage.style.setProperty('--day',String(t));
      trace.setDay(t);
      if(raw>0)stage.dataset.phase='dawn';
      if(raw===1)finish();else raf=requestAnimationFrame(tick);
    };
    raf=requestAnimationFrame(tick);
  },2200);
}else{
  stage.style.setProperty('--day','1');
  trace?.setDay(1);
  stage.classList.add('intro-complete');
  stage.dataset.phase='day';
}
```

### src/hero.css

```css
@font-face{font-family:League;src:url('/fonts/league-gothic.woff') format('woff');font-display:swap}
:root{color:#26231f;background:#f3f1ea;font-family:Arial,sans-serif}*{box-sizing:border-box}body{margin:0;min-width:320px}.trace-track{height:100svh}.trace-stage{--day:0;--parallax-x:0;--parallax-y:0;position:sticky;top:0;height:100svh;overflow:hidden;background:#f3f1ea;isolation:isolate}
.night-set,.day-set{position:absolute;inset:0;pointer-events:none}
.night-set{background:radial-gradient(ellipse at 50% 55%,#12241d 0%,#0d1a18 34%,transparent 68%),linear-gradient(180deg,#10141a,#0c1216 60%,#0b0e12);opacity:calc(1 - var(--day))}
.night-set:after{content:'';position:absolute;inset:61% 0 0;background:linear-gradient(180deg,transparent,#080d1dde)}
.day-set{background:#f3f1ea;opacity:var(--day)}
.paper-art{position:absolute;inset:-3%;width:106%;height:106%;opacity:.9;background:
 repeating-linear-gradient(0deg,rgba(38,35,31,.05) 0 1px,transparent 1px 8px),
 repeating-linear-gradient(90deg,rgba(38,35,31,.05) 0 1px,transparent 1px 8px),
 repeating-linear-gradient(0deg,rgba(178,54,45,.09) 0 1.5px,transparent 1.5px 40px),
 repeating-linear-gradient(90deg,rgba(178,54,45,.09) 0 1.5px,transparent 1.5px 40px);
 mask-image:linear-gradient(#000 0%,#000 40%,transparent 80%);
 transform:translate3d(calc(var(--parallax-x)*-12px),calc(var(--parallax-y)*-10px),0)}
.ghost-type{position:absolute;left:38%;top:9%;font-family:League,Impact,sans-serif;font-size:clamp(130px,28vw,500px);line-height:1;letter-spacing:-.02em;color:#26231f14;opacity:1;text-shadow:0 1px 0 #ffffff30;transform:translate3d(calc(var(--parallax-x)*-25px),calc(var(--parallax-y)*-24px),0)}
.baseline-art{position:absolute;left:0;top:24%;width:100%;height:56%;opacity:.16;stroke:#26231f;stroke-width:2.5;mask-image:linear-gradient(#000 0%,#000 60%,transparent 96%);transform:translate3d(calc(var(--parallax-x)*-7px),calc(var(--parallax-y)*-6px),0)}
.pulse-frame{position:absolute;left:0;top:0;width:100%;height:auto;opacity:.5;stroke:#26231f;stroke-width:1.6;transform:translate3d(calc(var(--parallax-x)*38px),calc(var(--parallax-y)*32px),0)}
.pulse-type{position:absolute;left:16%;top:15%;display:flex;flex-direction:column;align-items:center;font-family:Caveat,cursive;font-weight:600;font-size:clamp(96px,10.5vw,170px);line-height:.9;letter-spacing:-.02em;color:#26231f;transform:translate3d(calc(var(--parallax-x)*-39px),calc(var(--parallax-y)*-35px),0) rotate(-4deg)}
.pulse-type span{clip-path:polygon(0 0,100% 0,100% 0,0 0);will-change:clip-path}
.intro-complete .pulse-type span{animation:write-ink 1.3s cubic-bezier(.35,.05,.22,1) both}
.intro-complete .pulse-type span:nth-child(2){animation-delay:1.05s}
.pulse-type:after{content:'AIECG';align-self:flex-end;margin:14px -8px 0 0;padding:4px 6px 2px;background:#a93228;color:#f5e9dc;font:24px/.9 League,Impact,sans-serif;letter-spacing:.04em;transform:rotate(4deg);border-radius:2px;opacity:0}
.intro-complete .pulse-type:after{animation:seal-ink .45s ease-out 2.2s both}
@keyframes write-ink{
 0%{clip-path:polygon(0 0,100% 0,100% 0,80% 0,60% 0,40% 0,20% 0,0 0)}
 24%{clip-path:polygon(0 0,100% 0,100% 20%,80% 26%,60% 22%,40% 30%,20% 24%,0 28%)}
 48%{clip-path:polygon(0 0,100% 0,100% 51%,80% 46%,60% 55%,40% 49%,20% 57%,0 50%)}
 76%{clip-path:polygon(0 0,100% 0,100% 72%,80% 82%,60% 75%,40% 84%,20% 77%,0 86%)}
 100%{clip-path:polygon(0 0,100% 0,100% 100%,80% 100%,60% 100%,40% 100%,20% 100%,0 100%)}
}
@keyframes seal-ink{from{opacity:0;transform:rotate(4deg) scale(1.16)}to{opacity:1;transform:rotate(4deg) scale(1)}}
.foreground-art{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:var(--day);transform:translate3d(calc(var(--parallax-x)*78px),calc(var(--parallax-y)*64px),0)}
.pulse-dot{position:absolute;display:block;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff,#b2362d 62%,#7d2019);box-shadow:inset 1px 1px 4px #fff6}
.pulse-dot-one{width:26px;height:26px;left:6%;top:70%;filter:blur(1px);opacity:.7}
.pulse-dot-two{width:14px;height:14px;right:9%;top:34%;opacity:.65}
.pulse-dot-three{width:10px;height:10px;right:17%;top:82%;filter:blur(1px);opacity:.45}
#ecg-trace{position:absolute;z-index:1;inset:0;width:100%;height:100%;opacity:0;transition:opacity 1s}
.is-ready #ecg-trace{opacity:1}
.trace-input{position:absolute;z-index:3;inset:70px 0 52px;touch-action:none;outline-offset:-5px;cursor:grab}
.trace-input:focus-visible{outline:1px solid #8a857c}
.trace-input.is-dragging{cursor:grabbing}
.loading-status{position:absolute;z-index:4;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:18px;color:#e8f4ec;pointer-events:none;transition:opacity .7s,visibility .7s}
.loading-title{font-family:League,Impact,sans-serif;font-size:clamp(80px,13vw,190px);line-height:1;letter-spacing:.015em}
.loading-label{font-size:10px;letter-spacing:.3em}
.loader{width:90px;height:1px;background:linear-gradient(90deg,transparent,#e8f4ec,transparent);background-size:200% 100%;animation:loading 1.7s ease-in-out infinite}
.is-ready .loading-status{opacity:0;visibility:hidden}
.load-failed .loading-status{display:none}
.fallback{position:absolute;z-index:5;bottom:70px;left:50%;transform:translateX(-50%);padding:15px;background:#f3f1ea;color:#26231f;font-size:14px;white-space:nowrap}
.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)}
@keyframes loading{to{background-position:-200% 0}}
.hero-signature,.story-arrow,.trace-credit{position:absolute;z-index:6;color:#26231f;opacity:var(--day);font-family:DMSans,Arial,sans-serif}
.hero-signature{left:6%;bottom:5.5%}
.hero-kicker{font-size:11px;letter-spacing:.14em}
.hero-signature h1{font:clamp(26px,3vw,48px)/1.08 League,Impact,sans-serif;letter-spacing:.035em;margin:6px 0 9px}
.hero-signature>a{font-size:12px;display:inline-flex;align-items:center;gap:24px;padding:9px 14px;border:1px solid #aaa59d;border-radius:99px;text-decoration:none;color:inherit;background:#f4f2edab;transition:background .2s}
.hero-signature>a:hover{background:#fff}
.story-arrow{bottom:5.5%;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;flex-direction:column;text-decoration:none}
.story-arrow svg{width:48px;height:48px;padding:12px;border:1px solid #aaa59d;border-radius:50%;transition:transform .25s,background .25s}
.story-arrow:hover svg{transform:translateY(5px);background:#fff}
.story-arrow span{font-size:9px;letter-spacing:.2em}
.trace-credit{right:5%;bottom:5.5%;display:flex;flex-direction:column;gap:5px}
.trace-credit span{font-size:8px;letter-spacing:.14em;opacity:.65}
.trace-credit strong{font-size:14px;font-weight:500}
@media(max-width:760px){
 .paper-art{opacity:.7}.ghost-type{top:24%;left:15%;font-size:62vw}
 .pulse-type{left:12%;top:17%;font-size:76px}
 .pulse-type:after{font-size:17px;margin-top:8px}
 .pulse-dot-one{width:17px;height:17px;left:5%;top:72%}
 .pulse-dot-two{right:9%;top:40%;width:10px;height:10px}
 .pulse-dot-three{display:none}
 .baseline-art{top:30%;height:46%}
 .hero-signature{left:24px;bottom:64px}
 .hero-signature h1{font-size:30px}.hero-kicker{font-size:8px}
 .hero-signature>a{font-size:10px;padding:7px 12px}
 .story-arrow{left:auto;right:24px;bottom:80px;transform:none}
 .story-arrow span{font-size:8px}
 .trace-credit{right:24px;bottom:22px;flex-direction:row;gap:8px;align-items:center}
 .trace-credit strong{font-size:11px}
}
@media(prefers-reduced-motion:reduce){
 *{animation:none!important;transition:none!important}
 .paper-art,.ghost-type,.pulse-type,.baseline-art,.pulse-frame,.foreground-art{transform:none}
 .pulse-type{transform:rotate(-4deg)}
 .pulse-type span{clip-path:none!important;will-change:auto}
 .pulse-type:after{opacity:1}
}
```

### src/spotlight.css

```css
@font-face{font-family:Anton;src:url('/fonts/Anton-Regular.ttf')}
@font-face{font-family:Caveat;src:url('/fonts/Caveat-SemiBold.ttf');font-weight:600}
@font-face{font-family:DMSans;src:url('/fonts/DMSans-Medium.ttf');font-weight:500}
.sl{--sl-paper:#efefeb;--sl-ink:#151618;--sl-panel:#101114;--sl-panel-ink:#f4f2ee;--sl-glow:#a24736;--sl-line:rgba(255,255,255,.22);--sl-card-w:clamp(90px,15vw,210px);background:var(--sl-paper);color:var(--sl-ink);font-family:DMSans,Arial,sans-serif;font-weight:500}
.sl section{position:relative;min-height:100svh;padding:1.5rem;overflow:hidden}
.sl-spotlight{outline:none}
.sl-panel{position:relative;min-height:calc(100svh - 3rem);padding:8rem 2rem;border-radius:2.5rem;background:var(--sl-panel);color:var(--sl-panel-ink);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:2rem;overflow:hidden;isolation:isolate}
.sl-panel:before{content:'';position:absolute;inset:0;pointer-events:none;background:radial-gradient(38rem 38rem at var(--sl-mx,50%) var(--sl-my,50%),color-mix(in srgb,var(--sl-glow) 22%,transparent),transparent 70%);opacity:0;transition:opacity .8s}
.sl-panel.is-lit:before{opacity:1}
.sl-panel__eyebrow{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;opacity:.6;margin:0}
.sl-stage{position:relative;width:100%;display:flex;justify-content:center;align-items:center;z-index:1}
.sl-list{display:flex;flex-direction:column;align-items:center;position:relative;z-index:1}
.sl-item{width:100%;display:flex;justify-content:center;align-items:center;background:none;border:0;padding:0;color:inherit;font:inherit;cursor:pointer;outline-offset:6px}
.sl-label{display:grid;place-items:center}
.sl-label span{grid-area:1/1;white-space:nowrap;transform-origin:center}
.sl-label__default{font-family:Anton,sans-serif;font-size:clamp(1.6rem,6vw,8rem);text-transform:uppercase;line-height:1}
.sl-label__alt{font-family:Caveat,cursive;font-weight:600;font-size:clamp(2.2rem,8vw,10.5rem);line-height:.7;letter-spacing:-.03em;transform:translateY(12%);opacity:0}
.sl-cards{position:absolute;inset:0;z-index:2;pointer-events:none}
.sl-card{position:absolute;display:block;width:var(--sl-card-w);aspect-ratio:2/3;border-radius:1rem;border:1px solid var(--sl-line);padding:5px;background:rgba(255,255,255,.06);box-shadow:0 30px 60px -28px rgba(0,0,0,.8),inset 0 1px 0 rgba(255,255,255,.3);transform:scale(0)}
.sl-card--1{top:7.5%;left:7.5%}
.sl-card--2{top:5%;right:7.5%}
.sl-card--3{bottom:12.5%;left:12.5%}
.sl-card--4{bottom:15%;right:12.5%}
.sl-panel__note{font-size:13px;line-height:1.6;opacity:.5;margin:0;max-width:380px;white-space:pre-line}
.sl-outro{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;gap:28px}
.sl-outro__eyebrow{font-size:12px;letter-spacing:.16em}
.sl-outro h2{font-family:Anton,sans-serif;font-size:clamp(64px,11vw,180px);text-transform:uppercase;line-height:1;margin:0;font-weight:400}
.sl-outro h2 em{font-family:Caveat,cursive;font-size:1.08em;text-transform:none;font-style:normal;color:#aa352a}
.sl-outro>p:not(.sl-outro__eyebrow){max-width:470px;font-size:17px;line-height:1.6;margin:0}
.sl-outro__link{color:inherit;text-decoration:none;border-bottom:1px solid #888;padding:10px 0;display:flex;gap:35px;align-items:center}
.sl-outro__disclaimer{font-size:12px;opacity:.6;max-width:420px;line-height:1.5}
.sl-outro__credit{font-size:11px;opacity:.55;margin-top:10px}
@media(max-width:1000px){.sl section{padding:1rem}.sl-panel{padding:6rem 1rem;border-radius:1.5rem}.sl-panel__eyebrow{max-width:260px;line-height:1.5}}
@media(hover:none),(pointer:coarse){.sl-cards{display:none}.sl-item{padding:9px 0}.sl-panel__note{display:none}}
@media(prefers-reduced-motion:reduce){.sl-panel:before{transition:none}}
.sl-item:focus-visible{outline:1px solid #f4f2ee88;outline-offset:8px;border-radius:6px}
```

### public/fonts/OFL-NOTES.md

```md
# Font licenses

All four bundled fonts are licensed under the SIL Open Font License, Version 1.1
(http://scripts.sil.org/OFL). The full license text applies to each family below.

- League Gothic, (c) 2010 Caroline Hadilaksono & Micah Rich, Reserved Font Name "League Gothic"
- Anton, (c) 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont)
- Caveat, (c) 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat)
- DM Sans, (c) 2014 The DM Sans Project Authors (https://github.com/googlefonts/dm-fonts)

SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007

PREAMBLE: The goals of the Open Font License are to stimulate worldwide development of
collaborative font projects, to support the font creation efforts of academic and
linguistic communities, and to provide a free and open framework in which fonts may be
shared and improved in partnership with others.

PERMISSION & CONDITIONS: Permission is hereby granted, free of charge, to any person
obtaining a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font Software, subject to
the following conditions: (1) Neither the Font Software nor any of its individual
components, in Original or Modified Versions, may be sold by itself. (2) Original or
Modified Versions of the Font Software may be bundled, redistributed and/or sold with
any software, provided that each copy contains the above copyright notice and this
license. (3) No Modified Version of the Font Software may use the Reserved Font
Name(s) of the Original Version. (4) The name(s) of the Copyright Holder(s) and the
Author(s) shall not be used to promote or endorse Modified Versions. (5) The Font
Software, modified or unmodified, in part or in whole, must be distributed entirely
under this license.

TERMINATION: This license becomes null and void if any of the above conditions are not met.

DISCLAIMER: THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

## Provenance map (Liberty Walk F40 kit to AIECG kit)

| F40 element | AIECG replacement |
|---|---|
| Sketchfab Ferrari F40 viewer + orbit controls | Canvas ECG trace, drag tempo/amplitude, wheel and pinch zoom, keyboard, Home reset |
| Night lighting intro, 2200 ms hold, 5200 ms fade | Dark monitor to ivory ECG paper, identical timings and `--day` variable |
| Porcelain waves art | CSS ECG paper grid |
| Mount Fuji art | Breathing-baseline SVG wave |
| Japanese calligraphy + brush reveal + F40 seal | Caveat "Every beat" + identical clip-path reveal + red AIECG seal |
| Sakura frame + petals | QRS pulse frame SVG + pulse dots |
| Eight Ferrari photos, six sets | Six canvas signal motifs, six sets |
| vecarz attribution | OFL font credit |
| three, sharp, meshoptimizer devDeps | dropped |
| Yuji fonts | dropped |
