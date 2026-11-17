import {EPS} from './geometry.js';
function intersects(a,b){return a.xmin<=b.xmax+EPS&&a.xmax>=b.xmin-EPS&&a.ymin<=b.ymax+EPS&&a.ymax>=b.ymin-EPS;}
function node(xmin,ymin,xmax,ymax,depth){return {xmin,ymin,xmax,ymax,depth,ids:[],children:null};}
export function separationMask(x0,y0,x1,y1,r){
 let mask=0;
 if(Math.max(x0,x1)<r.xmin-EPS)mask|=1;
 if(Math.min(x0,x1)>r.xmax+EPS)mask|=2;
 if(Math.max(y0,y1)<r.ymin-EPS)mask|=4;
 if(Math.min(y0,y1)>r.ymax+EPS)mask|=8;
 return mask;
}
export function segmentAABB(data,id){const i=id*4,x=data[i],y=data[i+1],z=data[i+2],w=data[i+3];return {xmin:Math.min(x,z),xmax:Math.max(x,z),ymin:Math.min(y,w),ymax:Math.max(y,w)};}
function quadrant(n,b){const mx=(n.xmin+n.xmax)/2,my=(n.ymin+n.ymax)/2;
 const xi=b.xmax<=mx?0:(b.xmin>=mx?1:-1),yi=b.ymax<=my?0:(b.ymin>=my?1:-1);
 return xi<0||yi<0?-1:xi+2*yi;
}
export class Quadtree{
 constructor(data,bounds,{maxDepth=9,capacity=72}={}){this.data=data;this.maxDepth=maxDepth;this.capacity=capacity;this.root=node(bounds.xmin,bounds.ymin,bounds.xmax,bounds.ymax,0);this.nodes=1;this.size=0;}
 _split(n){const mx=(n.xmin+n.xmax)/2,my=(n.ymin+n.ymax)/2;
  n.children=[node(n.xmin,n.ymin,mx,my,n.depth+1),node(mx,n.ymin,n.xmax,my,n.depth+1),node(n.xmin,my,mx,n.ymax,n.depth+1),node(mx,my,n.xmax,n.ymax,n.depth+1)];this.nodes+=4;
  const old=n.ids;n.ids=[];for(const id of old)this._insert(n,id,segmentAABB(this.data,id));
 }
 _insert(n,id,b){if(n.children){const q=quadrant(n,b);if(q>=0){this._insert(n.children[q],id,b);return;}}
  n.ids.push(id);if(n.ids.length>this.capacity&&n.depth<this.maxDepth&&!n.children)this._split(n);
 }
 insert(id){const b=segmentAABB(this.data,id);this._insert(this.root,id,b);this.size++;}
 build(onProgress){const n=this.data.length/4;for(let i=0;i<n;i++){this.insert(i);if(onProgress&&i%10000===0)onProgress(i,n);}return this;}
 query(rect,stats){const result=[],s=stats||{nodes:0,candidates:0,aabbChecks:0};
  const go=n=>{if(!intersects(n,rect))return;s.nodes++;for(const id of n.ids){s.aabbChecks++;const i=id*4,x=this.data[i],y=this.data[i+1],z=this.data[i+2],w=this.data[i+3];
   if(separationMask(x,y,z,w,rect)===0){result.push(id);s.candidates++;}}
   if(n.children)for(const c of n.children)go(c);
  };go(this.root);return result;
 }
}
export function indexBounds(data,padding=1){let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;
 for(let i=0;i<data.length;i+=2){const x=data[i],y=data[i+1];if(x<xmin)xmin=x;if(x>xmax)xmax=x;if(y<ymin)ymin=y;if(y>ymax)ymax=y;}
 if(!isFinite(xmin))return {xmin:-1,ymin:-1,xmax:1,ymax:1};return {xmin:xmin-padding,ymin:ymin-padding,xmax:xmax+padding,ymax:ymax+padding};
}
export function queryBrute(data,rect,stats){const out=[];for(let i=0;i<data.length;i+=4){if(stats)stats.aabbChecks++;
 const x=data[i],y=data[i+1],z=data[i+2],w=data[i+3];if(separationMask(x,y,z,w,rect)!==0)continue;
 out.push(i/4);if(stats)stats.candidates=(stats.candidates||0)+1;
 }return out;
}
