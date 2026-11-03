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
