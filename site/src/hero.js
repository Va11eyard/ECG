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
