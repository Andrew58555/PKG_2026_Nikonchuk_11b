import {clamp} from '../core/geometry.js';
const GRID='#dce6ed';
export class CanvasPainter{
 constructor(base,overlay){this.base=base;this.overlay=overlay;this.ctx=base.getContext('2d');this.fg=overlay.getContext('2d');this.view={cx:0,cy:0,zoom:4};this.width=800;this.height=570;}
 resize(){const bounds=this.base.parentElement.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);this.width=bounds.width;this.height=bounds.height;
  for(const c of [this.base,this.overlay]){c.width=Math.round(bounds.width*dpr);c.height=Math.round(bounds.height*dpr);c.getContext('2d').setTransform(dpr,0,0,dpr,0,0);}
 }
 screen(x,y){return {x:this.width/2+(x-this.view.cx)*this.view.zoom,y:this.height/2-(y-this.view.cy)*this.view.zoom};}
 world(x,y){return {x:(x-this.width/2)/this.view.zoom+this.view.cx,y:(this.height/2-y)/this.view.zoom+this.view.cy};}
 getRectPixels(r){const a=this.screen(r.xmin,r.ymax),b=this.screen(r.xmax,r.ymin);return {x:a.x,y:a.y,w:b.x-a.x,h:b.y-a.y};}
 grid(){const ctx=this.ctx,{width:w,height:h}=this;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fbfcfd';ctx.fillRect(0,0,w,h);
  const candidates=[1,2,5,10,20,25,50,100,200,250,500,1000],step=candidates.find(s=>s*this.view.zoom>=38)||1000;
  const ll=this.world(0,h),ur=this.world(w,0);ctx.lineWidth=1;ctx.strokeStyle=GRID;ctx.beginPath();
  for(let x=Math.ceil(ll.x/step)*step;x<=ur.x;x+=step){const p=this.screen(x,0);ctx.moveTo(Math.round(p.x)+.5,0);ctx.lineTo(Math.round(p.x)+.5,h);}
  for(let y=Math.ceil(ll.y/step)*step;y<=ur.y;y+=step){const p=this.screen(0,y);ctx.moveTo(0,Math.round(p.y)+.5);ctx.lineTo(w,Math.round(p.y)+.5);}ctx.stroke();
  ctx.strokeStyle='#8b9eae';ctx.lineWidth=1.4;ctx.beginPath();const z=this.screen(0,0);ctx.moveTo(z.x,0);ctx.lineTo(z.x,h);ctx.moveTo(0,z.y);ctx.lineTo(w,z.y);ctx.stroke();
  ctx.font='11px system-ui';ctx.fillStyle='#728596';
  for(let x=Math.ceil(ll.x/step)*step;x<=ur.x;x+=step){if(Math.abs(x)<1e-8)continue;const p=this.screen(x,0);if(p.x<25||p.x>w-25)continue;ctx.fillText(String(x),p.x+3,clamp(z.y+13,14,h-9));}
  for(let y=Math.ceil(ll.y/step)*step;y<=ur.y;y+=step){if(Math.abs(y)<1e-8)continue;const p=this.screen(0,y);if(p.y<8||p.y>h-5)continue;ctx.fillText(String(y),clamp(z.x+5,5,w-42),p.y-4);}ctx.fillText('x',w-13,clamp(z.y-7,15,h-12));ctx.fillText('y',clamp(z.x+9,10,w-19),13);
 }
 sourceSegments(data){const ctx=this.ctx,n=data.length/4,stride=Math.max(1,Math.ceil(n/24000));ctx.strokeStyle='rgba(74,107,153,.32)';ctx.lineWidth=1.2;ctx.beginPath();
  for(let i=0;i<n;i+=stride){const j=4*i,a=this.screen(data[j],data[j+1]),b=this.screen(data[j+2],data[j+3]);if((a.x<-100&&b.x<-100)||(a.x>this.width+100&&b.x>this.width+100)||(a.y<-100&&b.y<-100)||(a.y>this.height+100&&b.y>this.height+100))continue;ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);}ctx.stroke();
 }
 pathRings(ctx,rings){ctx.beginPath();for(const ring of rings){if(ring.length<2)continue;const p=this.screen(ring[0].x,ring[0].y);ctx.moveTo(p.x,p.y);
  for(let i=1;i<ring.length;i++){const q=this.screen(ring[i].x,ring[i].y);ctx.lineTo(q.x,q.y);}ctx.closePath();}}
 sourcePolygon(rings){const ctx=this.ctx;this.pathRings(ctx,rings);ctx.fillStyle='#6883ac30';ctx.fill('evenodd');ctx.strokeStyle='#7a92b9';ctx.lineWidth=1.6;ctx.stroke();}
 renderBase(data,rings,mode){this.grid();if(mode==='lines'&&data)this.sourceSegments(data);else if(mode==='polygons')this.sourcePolygon(rings);}
 clearOverlay(){this.fg.clearRect(0,0,this.width,this.height);}
 clipperPolygon(poly){const ctx=this.fg;this.pathRings(ctx,[poly]);ctx.fillStyle='#ed9d4330';ctx.fill('evenodd');ctx.strokeStyle='#db8728';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.stroke();ctx.setLineDash([]);}
 rect(r){const ctx=this.fg,p=this.getRectPixels(r);ctx.fillStyle='#ed9d4330';ctx.fillRect(p.x,p.y,p.w,p.h);ctx.strokeStyle='#db8728';ctx.lineWidth=2;ctx.setLineDash([8,4]);ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.setLineDash([]);}
 clippedSegments(segments){const ctx=this.fg;ctx.strokeStyle='#238a70';ctx.lineWidth=3.2;ctx.lineCap='round';ctx.beginPath();for(const s of segments){const a=this.screen(s[0],s[1]),b=this.screen(s[2],s[3]);ctx.moveTo(a.x,a.y);if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)<.01){ctx.lineTo(a.x+.5,a.y+.5);}else ctx.lineTo(b.x,b.y);}ctx.stroke();
 }
 clippedPolygons(rings){const ctx=this.fg;this.pathRings(ctx,rings);ctx.fillStyle='#278c7355';ctx.fill('evenodd');ctx.lineWidth=2.2;ctx.strokeStyle='#238a70';ctx.stroke();}
 activePolygon(points){if(points.length<1)return;const ctx=this.fg;ctx.strokeStyle='#365f9c';ctx.lineWidth=1.4;ctx.beginPath();const p=this.screen(points[0].x,points[0].y);ctx.moveTo(p.x,p.y);for(let i=1;i<points.length;i++){let q=this.screen(points[i].x,points[i].y);ctx.lineTo(q.x,q.y);}ctx.stroke();for(const v of points){const p=this.screen(v.x,v.y);ctx.fillStyle='#365f9c';ctx.beginPath();ctx.arc(p.x,p.y,3.5,0,2*Math.PI);ctx.fill();}}
}
