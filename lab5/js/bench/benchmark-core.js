import {generateSegments,WORLD} from '../core/dataset.js';
import {Quadtree,indexBounds,queryBrute} from '../core/quadtree.js';
import {liangBarsky,cohenSutherland} from '../core/clip-lines.js';
const t=()=>performance.now();
function median(a){let b=[...a].sort((x,y)=>x-y);return b[Math.floor(b.length/2)];}
function makeWindows(count,spacing=1){const a=[];for(let i=0;i<count;i++){
 const u=i*2.3999632,rad=(i%11)/11;const x=Math.cos(u)*620*rad,y=Math.sin(u)*430*rad;
 const w=48*spacing,h=38*spacing;a.push({xmin:x-w,ymin:y-h,xmax:x+w,ymax:y+h});
 }return a;}
function processSelected(data,ids,rect,kind='liang'){
 const fn=kind==='cohen'?cohenSutherland:liangBarsky;let visible=0,mult=0,div=0;
 for(const id of ids){let i=id*4,r=fn(data[i],data[i+1],data[i+2],data[i+3],rect);if(r.segment)visible++;mult+=r.ops.multiplications;div+=r.ops.divisions;}
 return {visible,mult,div};
}
export function testOnce(data,index,windows,{brute=false,method='liang'}={}){
 let total=0,visible=0,candidates=0,checks=0,nodes=0,mult=0,div=0;const start=t();
 for(const rect of windows){const s={nodes:0,aabbChecks:0,candidates:0};const ids=brute?queryBrute(data,rect,s):index.query(rect,s);const r=processSelected(data,ids,rect,method);
  visible+=r.visible;mult+=r.mult;div+=r.div;candidates+=ids.length;checks+=s.aabbChecks;nodes+=s.nodes;total++;
 }
 const ms=t()-start;return {ms,msPerFrame:ms/total,fpsEquivalent:1000/(ms/total),visible,candidates,checks,nodes,mult,div,frames:total};
}
export async function runBenchmark({n=500000,seed=2026,windowsCount=100,onProgress=()=>{}}={}){
 const data=generateSegments(n,{seed,mode:'mixed',world:WORLD}),bounds=indexBounds(data,2),windows=makeWindows(windowsCount);
 const depths=[4,6,8,10,12],depthResults=[];onProgress('Данные созданы, построение индексов…');
 for(const depth of depths){const buildStart=t(),tree=new Quadtree(data,bounds,{maxDepth:depth,capacity:80}).build(),buildMs=t()-buildStart;
  // warm-up a few queries separately
  testOnce(data,tree,windows.slice(0,Math.min(10,windows.length)));
  const times=[testOnce(data,tree,windows),testOnce(data,tree,windows),testOnce(data,tree,windows)];const mid=times.sort((a,b)=>a.ms-b.ms)[1];
  depthResults.push({depth,nodes:tree.nodes,buildMs,...mid});onProgress(`Глубина ${depth}: ${mid.msPerFrame.toFixed(2)} мс/кадр`);
 }
 // Same window positions and number of repetitions in both strategies.
 onProgress('Сравнение с полным перебором…');const bruteWindows=windows;
 testOnce(data,null,bruteWindows.slice(0,5),{brute:true});const bruteRuns=[testOnce(data,null,bruteWindows,{brute:true}),testOnce(data,null,bruteWindows,{brute:true}),testOnce(data,null,bruteWindows,{brute:true})];
 const brute=bruteRuns.sort((a,b)=>a.ms-b.ms)[1];
 const best=depthResults.reduce((a,b)=>b.msPerFrame<a.msPerFrame?b:a);
 // density experiment, fixed 1700x1200 world extent, 3 dataset sizes
 const densities=[50000,150000,500000],densityResults=[];
 for(const size of densities){const arr=generateSegments(size,{seed:seed+size,mode:'mixed',world:WORLD}),ti=t(),tree=new Quadtree(arr,indexBounds(arr,2),{maxDepth:best.depth,capacity:80}).build(),buildMs=t()-ti;
  testOnce(arr,tree,windows.slice(0,5));const t1=testOnce(arr,tree,windows),t2=testOnce(arr,tree,windows);const med=t2.ms<t1.ms?t2:t1;
  densityResults.push({n:size,buildMs,depth:best.depth,...med});onProgress(`Плотность ${size.toLocaleString('ru-RU')} отрезков обработана`);
 }
 // operation-count experiment with same 100k candidate line samples, all algorithms on same data
 const opsCount=Math.min(n,100000),rect={xmin:-140,ymin:-90,xmax:140,ymax:90};let cohen={multiplications:0,divisions:0,iterations:0,visible:0},liang={multiplications:0,divisions:0,iterations:0,visible:0};
 for(let i=0;i<opsCount;i++){const x=data[4*i],y=data[4*i+1],z=data[4*i+2],w=data[4*i+3];for(const [method,sum] of [[cohenSutherland,cohen],[liangBarsky,liang]]){
  const r=method(x,y,z,w,rect);sum.multiplications+=r.ops.multiplications;sum.divisions+=r.ops.divisions;sum.iterations+=r.ops.iterations;if(r.segment)sum.visible++;
 }}
 return {params:{n,seed,windowsCount,eps:1e-7,algorithms:'Cohen–Sutherland / Liang–Barsky'},depthResults,densityResults,brute,bestDepth:best.depth,ops:{n:opsCount,cohen,liang}};
}
