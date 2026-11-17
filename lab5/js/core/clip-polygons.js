import {EPS,normalizeRect,polygonRect,intersections,lerpPoint,insideRect,pipEvenOdd,area} from './geometry.js';
/* Topological edge-following variant of polygon clipping (Weiler–Atherton principle).
   Instead of relying on a convex subject polygon, every edge is split at all
   intersections. Boundary pieces are retained only if their left/right sides
   differ under the even-odd fill rule. Closed oriented contours are traced
   through the resulting planar graph. This supports concave contours, holes
   and self-crossings, without rasterization. Complexity O(E^2). */
function uniq(ts){return ts.sort((a,b)=>a-b).filter((t,i,a)=>i===0||t-a[i-1]>EPS);}
const k=p=>`${Math.round(p.x/EPS)},${Math.round(p.y/EPS)}`;
export function clipPolygon(rings,raw){
 const rect=normalizeRect(raw),contours=rings.filter(r=>r.length>=3),segs=[];
 for(const ring of [...contours,polygonRect(rect)]){for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length];if(Math.hypot(a.x-b.x,a.y-b.y)>EPS)segs.push({a,b,ts:[0,1]});}}
 if(!segs.length)return [];
 for(let i=0;i<segs.length;i++)for(let j=i+1;j<segs.length;j++){
  for(const [t,u] of intersections(segs[i].a,segs[i].b,segs[j].a,segs[j].b)){segs[i].ts.push(t);segs[j].ts.push(u);}
 }
 const inShape=p=>insideRect(p.x,p.y,rect)&&pipEvenOdd(p,contours);
 const edges=[],dedup=new Set(),out=new Map();
 for(const seg of segs){const ts=uniq(seg.ts);for(let i=0;i<ts.length-1;i++){
  const a=lerpPoint(seg.a,seg.b,ts[i]),b=lerpPoint(seg.a,seg.b,ts[i+1]);const len=Math.hypot(b.x-a.x,b.y-a.y);if(len<=EPS)continue;
  const nx=-(b.y-a.y)/len,ny=(b.x-a.x)/len,m={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
  const delta=Math.min(len/10,Math.max(2e-5,Math.min(rect.xmax-rect.xmin,rect.ymax-rect.ymin)*1e-5));
  const left=inShape({x:m.x+nx*delta,y:m.y+ny*delta}),right=inShape({x:m.x-nx*delta,y:m.y-ny*delta});
  if(left===right)continue;
  const u=left?a:b,v=left?b:a,ak=k(u),bk=k(v),id=`${ak}|${bk}`;
  if(dedup.has(id))continue;dedup.add(id);const e={a:u,b:v,ak,bk,angle:Math.atan2(v.y-u.y,v.x-u.x),used:false};
  edges.push(e);if(!out.has(ak))out.set(ak,[]);out.get(ak).push(e);
 }}
 const contoursOut=[];
 for(const edge of edges){if(edge.used)continue;let cur=edge,loop=[],ok=false;
  for(let step=0;step<edges.length+1;step++){
   if(cur.used){ok=cur===edge;break;}
   cur.used=true;loop.push(cur.a);
   const next=out.get(cur.bk)||[];
   if(cur.bk===edge.ak){ok=true;break;}
   const rev=cur.angle+Math.PI;
   // walk the face on the left; select first clockwise outgoing edge from reverse
   const sorted=next.filter(e=>!e.used).map(e=>({e,turn:((rev-e.angle)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)})).sort((a,b)=>a.turn-b.turn);
   if(!sorted.length)break;cur=sorted[0].e;
  }
  if(ok&&loop.length>=3&&Math.abs(area(loop))>EPS)contoursOut.push(loop);
 }
 return contoursOut;
}
