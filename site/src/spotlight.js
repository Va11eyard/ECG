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
