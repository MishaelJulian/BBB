// Desktop-only map art: halftone dots computed from vectors at load, then main roads slowly redrawn from the centre outward.
// Everything is drawn from assets/map-vectors.json (a static file, no database). Metrics are exposed on window.__bbbmap.
(function(){
const BM={church:["0000110000","0000110000","0000110000","1111111111","1111111111","0000110000","0000110000","0000110000","0000110000"],hospital:["0111111110","1111001111","1111001111","1100000011","1100000011","1111001111","1111001111","0111111110"],station:["0111111110","1100110011","1100110011","1111111111","1111111111","1100000011","1111111111","0110000110"],culture:["0000110000","0001111000","0111111110","1111111111","0110110110","0110110110","0110110110","1111111111"],school:["0000110000","0011111100","1111111111","0011111100","0001001000","0001001000"],pin:["0011100","0111110","1111111","1110111","1111111","0111110","0011100","0001000","0001000"]};
function paintIcon(ctx,name,cx,cy,cell,color){const r=BM[name];if(!r)return;ctx.fillStyle=color;const w=r[0].length*cell,h=r.length*cell;r.forEach((row,j)=>[...row].forEach((c,i)=>{if(c==='1')ctx.fillRect(Math.round(cx-w/2+i*cell),Math.round(cy-h/2+j*cell),cell,cell)}))}
function pathsTo(ctx,paths,q,close){ctx.beginPath();for(const p of paths){ctx.moveTo(p[0]/q,p[1]/q);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i]/q,p[i+1]/q);if(close)ctx.closePath()}}
function sat(data,w,h){const s=new Uint32Array((w+1)*(h+1));for(let y=0;y<h;y++){let row=0;for(let x=0;x<w;x++){row+=data[(y*w+x)*4]>127?1:0;s[(y+1)*(w+1)+x+1]=s[y*(w+1)+x+1]+row}}return s}
function box(s,w,h,x0,y0,x1,y1){x0=Math.max(0,Math.floor(x0));y0=Math.max(0,Math.floor(y0));x1=Math.min(w,Math.ceil(x1));y1=Math.min(h,Math.ceil(y1));if(x1<=x0||y1<=y0)return 0;const W1=w+1;return (s[y1*W1+x1]-s[y0*W1+x1]-s[y1*W1+x0]+s[y0*W1+x0])/((x1-x0)*(y1-y0))}
window.BBBDesktopMap={async mount(host,opts){
  opts=opts||{};const M={};const t0=performance.now();
  const V=await (await fetch(opts.src||'assets/map-vectors.json')).json();M.loadMs=Math.round(performance.now()-t0);
  const q=V.q,VW=V.w,VH=V.h,scale=opts.scale||1.9,dpr=Math.min(window.devicePixelRatio||1,2),CW=Math.round(VW*scale),CH=Math.round(VH*scale);
  const mk=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c};
  // 1) coverage maps at vector resolution (white on black), one per colour family
  const t1=performance.now();
  const layers={};
  const draw=(name,fn)=>{const c=mk(VW,VH),x=c.getContext('2d',{willReadFrequently:true});x.fillStyle='#000';x.fillRect(0,0,VW,VH);x.fillStyle='#fff';x.strokeStyle='#fff';x.lineCap='round';x.lineJoin='round';fn(x);layers[name]=sat(x.getImageData(0,0,VW,VH).data,VW,VH)};
  draw('green',x=>{pathsTo(x,V.grass,q,true);x.fill('evenodd');pathsTo(x,V.wood,q,true);x.fill('evenodd');pathsTo(x,V.park,q,true);x.fill('evenodd')});
  draw('blue',x=>{pathsTo(x,V.water,q,true);x.fill('evenodd');x.lineWidth=1.6;pathsTo(x,V.wtw,q,false);x.stroke()});
  draw('road',x=>{x.lineWidth=0.9;pathsTo(x,V.res,q,false);x.stroke();x.lineWidth=1.3;pathsTo(x,V.tert,q,false);x.stroke();x.lineWidth=1.9;pathsTo(x,V.sec,q,false);x.stroke();x.lineWidth=2.6;pathsTo(x,V.pri,q,false);x.stroke();x.lineWidth=1.2;pathsTo(x,V.rail,q,false);x.stroke()});
  M.coverageMs=Math.round(performance.now()-t1);
  // 2) halftone screen rotated 45 degrees: dot radius follows covered area
  const t2=performance.now();
  const base=mk(Math.round(CW*dpr),Math.round(CH*dpr)),b=base.getContext('2d');b.scale(dpr*scale,dpr*scale);
  const step=opts.cell||4.2,ang=Math.PI/4,ca=Math.cos(ang),sa=Math.sin(ang),diag=Math.hypot(VW,VH);let dots=0;
  const cols={green:'#8fa882',blue:'#8aa4c2',road:'#8b95b0'};
  for(let u=-diag;u<diag;u+=step)for(let v=-diag;v<diag;v+=step){
    const x=VW/2+u*ca-v*sa,y=VH/2+u*sa+v*ca;if(x<0||y<0||x>VW||y>VH)continue;
    const h=step*0.72,cg=box(layers.green,VW,VH,x-h,y-h,x+h,y+h),cb=box(layers.blue,VW,VH,x-h,y-h,x+h,y+h),cr=box(layers.road,VW,VH,x-h,y-h,x+h,y+h);
    let k='road',c=cr*1.35;if(cb>0.12&&cb>=cg){k='blue';c=cb}else if(cg>0.14&&cg>cr*0.6){k='green';c=cg}
    if(c<0.04)continue;const r=Math.min(step*0.62,step*0.62*Math.sqrt(Math.min(1,c)));
    b.fillStyle=cols[k];b.beginPath();b.arc(x,y,r,0,6.2832);b.fill();dots++}
  (V.poi||[]).forEach(([n,px,py])=>paintIcon(b,n,px/q,py/q,1.6,'#6f7a99'));
  (V.pins||[]).forEach(([px,py])=>paintIcon(b,'pin',px/q,py/q-5,2.6,'#c93a14'));
  M.dotsMs=Math.round(performance.now()-t2);M.dots=dots;
  // 3) layers in the page: static halftone + overlay for the slowly redrawn lines
  host.innerHTML='';host.style.position='relative';base.style.cssText='position:absolute;left:0;top:0;width:'+CW+'px;height:'+CH+'px';
  const over=mk(Math.round(CW*dpr),Math.round(CH*dpr));over.style.cssText=base.style.cssText;
  host.append(base,over);const o=over.getContext('2d');o.scale(dpr*scale,dpr*scale);o.lineCap='round';o.lineJoin='round';
  // segment list of main roads ordered by distance from the club venues (centre), so lines grow outward
  const cx=(V.pins&&V.pins.length?V.pins.reduce((s,p)=>s+p[0],0)/V.pins.length:VW*q/2)/q,cy=(V.pins&&V.pins.length?V.pins.reduce((s,p)=>s+p[1],0)/V.pins.length:VH*q/2)/q;
  const lines=[];for(const [cls,w,col] of [['pri',2.4,'rgba(18,41,90,.55)'],['sec',1.6,'rgba(18,41,90,.40)'],['tert',1.0,'rgba(18,41,90,.28)']])for(const p of V[cls]){const d=Math.hypot(p[0]/q-cx,p[1]/q-cy);lines.push({p,w,col,d})}
  lines.sort((a,b)=>a.d-b.d);const segs=[];let total=0;for(const L of lines)for(let i=2;i<L.p.length;i+=2){const x0=L.p[i-2]/q,y0=L.p[i-1]/q,x1=L.p[i]/q,y1=L.p[i+1]/q,len=Math.hypot(x1-x0,y1-y0);segs.push([x0,y0,x1,y1,L.w,L.col,total,len]);total+=len}
  M.segments=segs.length;M.lineLengthPx=Math.round(total);
  const dur=(opts.duration||90)*1000,RM=matchMedia('(prefers-reduced-motion: reduce)').matches;let drawn=0,t00=performance.now(),last=0,frames=0,cost=0,worst=0;
  const paint=upto=>{while(drawn<segs.length&&segs[drawn][6]<=upto){const s=segs[drawn++];o.strokeStyle=s[5];o.lineWidth=s[4];o.beginPath();o.moveTo(s[0],s[1]);o.lineTo(s[2],s[3]);o.stroke()}};
  M.fullyDrawnAt=null;
  if(RM||opts.instant){paint(total+1)}else{(function frame(now){if(now-last>=50){last=now;const a=performance.now();paint(total*Math.min(1,(now-t00)/dur));const c=performance.now()-a;cost+=c;frames++;worst=Math.max(worst,c);M.frames=frames;M.avgFrameMs=+(cost/frames).toFixed(3);M.worstFrameMs=+worst.toFixed(2);if(drawn>=segs.length&&!M.fullyDrawnAt)M.fullyDrawnAt=Math.round(performance.now()-t00)}if(drawn<segs.length)requestAnimationFrame(frame)})(performance.now())}
  M.canvasCssPx=[CW,CH];M.devicePixelRatio=dpr;window.__bbbmap=M;return {metrics:M,size:[CW,CH]}}};
})();
