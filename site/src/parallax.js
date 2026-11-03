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
