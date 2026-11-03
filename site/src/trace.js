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
  const TAU=Math.PI*2;
  let phase=0,day=0,raf=0,previous=0,carry=0,buffer=[],w=0,h=0,destroyed=false;
  const pointers=new Map();
  let pinch=0;
  const listeners=[];
  const on=(el,name,fn,opts)=>{el.addEventListener(name,fn,opts);listeners.push(()=>el.removeEventListener(name,fn,opts));};
  function resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    w=Math.max(1,canvas.clientWidth);h=Math.max(1,canvas.clientHeight);
    canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    const count=Math.ceil(w);
    buffer=Array.from({length:count},(_,i)=>{
      const back=(count-1-i)/(PX_PER_SEC*(60/state.bpm));
      return (((phase-back)%1)+1)%1+Math.sin(i*.015)*.02;
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
  function pointerDistance(){
    const pts=[...pointers.values()];
    return pts.length===2?Math.hypot(pts[0].x-pts[1].x,pts[0].y-pts[1].y):0;
  }
  function onPointerDown(event){
    if(event.button!==0)return;
    input.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    pinch=pointerDistance();
    input.classList.add('is-dragging');
  }
  function onPointerMove(event){
    const old=pointers.get(event.pointerId);if(!old)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===1){
      state.bpm=clamp(state.bpm-(event.clientX-old.x)*.12,TEMPO_LIMITS.min,TEMPO_LIMITS.max);
      state.amplitude=clamp(state.amplitude+(event.clientY-old.y)*.003,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
    }else{
      const next=pointerDistance();
      if(pinch>0&&next>0)state.amplitude=clamp(state.amplitude*pinch/next,AMPLITUDE_LIMITS.min,AMPLITUDE_LIMITS.max);
      pinch=next;
    }
    apply();
  }
  function release(event){
    pointers.delete(event.pointerId);
    pinch=pointerDistance();
    if(!pointers.size)input.classList.remove('is-dragging');
  }
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
