export const EPS = 1e-7;
export const eq = (a,b,eps=EPS) => Math.abs(a-b)<=eps;
export const clamp = (v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export function normalizeRect(r) {return {xmin:Math.min(r.xmin,r.xmax), ymin:Math.min(r.ymin,r.ymax), xmax:Math.max(r.xmin,r.xmax), ymax:Math.max(r.ymin,r.ymax)};}
export const insideRect=(x,y,r)=>x>=r.xmin-EPS&&x<=r.xmax+EPS&&y>=r.ymin-EPS&&y<=r.ymax+EPS;
export function pointOnSegment(p,a,b){let cross=(p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x); let scale=Math.max(1,Math.hypot(b.x-a.x,b.y-a.y)); return Math.abs(cross)<=EPS*scale && p.x>=Math.min(a.x,b.x)-EPS && p.x<=Math.max(a.x,b.x)+EPS && p.y>=Math.min(a.y,b.y)-EPS && p.y<=Math.max(a.y,b.y)+EPS;}
export function outCode(x,y,r){let c=0;if(x<r.xmin-EPS)c|=1;else if(x>r.xmax+EPS)c|=2;if(y<r.ymin-EPS)c|=4;else if(y>r.ymax+EPS)c|=8;return c;}
export const cross=(a,b)=>a.x*b.y-a.y*b.x;
export const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
export function area(ring) {let s=0;for(let i=0;i<ring.length;i++){let a=ring[i],b=ring[(i+1)%ring.length];s+=a.x*b.y-a.y*b.x;}return s/2;}
export function pipEvenOdd(p,rings){let odd=false;for(const ring of rings){for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a.y>p.y)!==(b.y>p.y)){const x=a.x+(p.y-a.y)*(b.x-a.x)/(b.y-a.y);if(x>p.x)odd=!odd;}}}return odd;}
export function intersections(a,b,c,d){ // all shared parameter endpoints; collinear handled by projecting endpoints
 const r=sub(b,a),s=sub(d,c),q=sub(c,a),den=cross(r,s),res=[];
 const rr=r.x*r.x+r.y*r.y,ss=s.x*s.x+s.y*s.y;
 if(rr<=EPS*EPS||ss<=EPS*EPS)return [];
 if(Math.abs(den)>EPS*Math.sqrt(rr*ss)){
  const t=cross(q,s)/den,u=cross(q,r)/den;
  if(t>=-EPS&&t<=1+EPS&&u>=-EPS&&u<=1+EPS)res.push([clamp(t,0,1),clamp(u,0,1)]);
 } else if(Math.abs(cross(q,r))<=EPS*Math.sqrt(rr)) {
  for(const p of [c,d]){const t=((p.x-a.x)*r.x+(p.y-a.y)*r.y)/rr;if(t>=-EPS&&t<=1+EPS){const u=((p.x-c.x)*s.x+(p.y-c.y)*s.y)/ss;res.push([clamp(t,0,1),clamp(u,0,1)]);}}
  for(const p of [a,b]){const u=((p.x-c.x)*s.x+(p.y-c.y)*s.y)/ss;if(u>=-EPS&&u<=1+EPS){const t=((p.x-a.x)*r.x+(p.y-a.y)*r.y)/rr;res.push([clamp(t,0,1),clamp(u,0,1)]);}}
 }
 return res;
}
export const lerpPoint=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
export function polygonRect(r){return [{x:r.xmin,y:r.ymin},{x:r.xmax,y:r.ymin},{x:r.xmax,y:r.ymax},{x:r.xmin,y:r.ymax}];}
