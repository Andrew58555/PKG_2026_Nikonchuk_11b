import {EPS,eq,normalizeRect,insideRect,outCode,clamp,area} from './geometry.js';
function base(){return {multiplications:0,divisions:0,comparisons:0,iterations:0};}
function finish(segment,ops,steps=[]){return {segment,ops,steps};}
export function cohenSutherland(x0,y0,x1,y1,raw,trace=false){
 const r=normalizeRect(raw),ops=base(),steps=[];let c0=outCode(x0,y0,r),c1=outCode(x1,y1,r);
 for(let i=0;i<16;i++){
  ops.iterations++;if(trace)steps.push(`Шаг ${i+1}: C₀=${c0.toString(2).padStart(4,'0')}, C₁=${c1.toString(2).padStart(4,'0')}`);
  ops.comparisons++;
  if(!(c0|c1))return finish([x0,y0,x1,y1],ops,steps);
  ops.comparisons++;
  if(c0&c1)return finish(null,ops,steps);
  const c=c0||c1,dx=x1-x0,dy=y1-y0;let x,y;
  if(c&8){if(Math.abs(dy)<=EPS)return finish(null,ops,steps);ops.multiplications++;ops.divisions++; y=r.ymax;x=x0+dx*(y-y0)/dy;}
  else if(c&4){if(Math.abs(dy)<=EPS)return finish(null,ops,steps);ops.multiplications++;ops.divisions++;y=r.ymin;x=x0+dx*(y-y0)/dy;}
  else if(c&2){if(Math.abs(dx)<=EPS)return finish(null,ops,steps);ops.multiplications++;ops.divisions++;x=r.xmax;y=y0+dy*(x-x0)/dx;}
  else {if(Math.abs(dx)<=EPS)return finish(null,ops,steps);ops.multiplications++;ops.divisions++;x=r.xmin;y=y0+dy*(x-x0)/dx;}
  if(c===c0){x0=x;y0=y;c0=outCode(x0,y0,r);}else{x1=x;y1=y;c1=outCode(x1,y1,r);}
 }
 return finish(null,ops,steps);
}
export function liangBarsky(x0,y0,x1,y1,raw,trace=false){
 const r=normalizeRect(raw),ops=base(),steps=[],dx=x1-x0,dy=y1-y0;
 if(Math.abs(dx)<=EPS&&Math.abs(dy)<=EPS)return finish(insideRect(x0,y0,r)?[x0,y0,x0,y0]:null,ops,trace?['Нулевая длина: проверка принадлежности точки окну']:[]);
 const p=[-dx,dx,-dy,dy],q=[x0-r.xmin,r.xmax-x0,y0-r.ymin,r.ymax-y0],names=['левая','правая','нижняя','верхняя'];let t0=0,t1=1;
 for(let i=0;i<4;i++){
  ops.iterations++;ops.comparisons++;
  if(Math.abs(p[i])<=EPS){if(q[i]<-EPS)return finish(null,ops,steps);if(trace)steps.push(`${names[i]}: параллелен, внутри полуплоскости`);continue;}
  const t=q[i]/p[i];ops.divisions++;ops.comparisons++;
  if(p[i]<0)t0=Math.max(t0,t);else t1=Math.min(t1,t);
  if(trace)steps.push(`${names[i]}: p=${p[i].toFixed(3)}, q=${q[i].toFixed(3)}, t=${t.toFixed(4)}, [${t0.toFixed(4)}; ${t1.toFixed(4)}]`);
  if(t0>t1+EPS)return finish(null,ops,steps);
 }
 ops.multiplications+=4;return finish([x0+clamp(t0,0,1)*dx,y0+clamp(t0,0,1)*dy,x0+clamp(t1,0,1)*dx,y0+clamp(t1,0,1)*dy],ops,steps);
}
export function midpointClip(x0,y0,x1,y1,raw){
 const r=normalizeRect(raw),ops=base(),pieces=[];
 function go(a,b,depth){ops.iterations++;let c0=outCode(a[0],a[1],r),c1=outCode(b[0],b[1],r);if((c0&c1)!==0)return;
  if(!(c0|c1)){pieces.push([a[0],a[1],b[0],b[1]]);return;}
  if(depth>=28||Math.hypot(a[0]-b[0],a[1]-b[1])<=1e-6){let m=[(a[0]+b[0])/2,(a[1]+b[1])/2];if(insideRect(...m,r))pieces.push([clamp(a[0],r.xmin,r.xmax),clamp(a[1],r.ymin,r.ymax),clamp(b[0],r.xmin,r.xmax),clamp(b[1],r.ymin,r.ymax)]);return;}
  const m=[(a[0]+b[0])/2,(a[1]+b[1])/2];go(a,m,depth+1);go(m,b,depth+1);
 }
 go([x0,y0],[x1,y1],0);
 if(!pieces.length)return finish(null,ops);
 return finish([pieces[0][0],pieces[0][1],pieces.at(-1)[2],pieces.at(-1)[3]],ops);
}
export function cyrusBeck(x0,y0,x1,y1,poly){
 const ops=base();if(poly.length<3||Math.abs(area(poly))<=EPS)return finish(null,ops);const ccw=area(poly)>0,dx=x1-x0,dy=y1-y0;
 if(Math.abs(dx)+Math.abs(dy)<=EPS){let inside=true;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],v=(b.x-a.x)*(y0-a.y)-(b.y-a.y)*(x0-a.x);if((ccw?v:-v)<-EPS)inside=false;}return finish(inside?[x0,y0,x0,y0]:null,ops);}
 let lo=0,hi=1;for(let i=0;i<poly.length;i++){let a=poly[i],b=poly[(i+1)%poly.length],ex=b.x-a.x,ey=b.y-a.y;
 const nx=ccw?-ey:ey,ny=ccw?ex:-ex;
 const num=nx*(a.x-x0)+ny*(a.y-y0),den=nx*dx+ny*dy;ops.multiplications+=4;ops.iterations++;
 if(Math.abs(den)<=EPS){if(num>EPS)return finish(null,ops);continue;}
 const t=num/den;ops.divisions++;if(den>0)lo=Math.max(lo,t);else hi=Math.min(hi,t);
 if(lo>hi+EPS)return finish(null,ops);
 }ops.multiplications+=4;return finish([x0+dx*lo,y0+dy*lo,x0+dx*hi,y0+dy*hi],ops);
}
export const CLIPPERS={cohen:cohenSutherland,liang:liangBarsky,midpoint:midpointClip};
