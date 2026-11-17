import assert from 'node:assert/strict';
import {cohenSutherland,liangBarsky,midpointClip,cyrusBeck} from '../js/core/clip-lines.js';
import {clipPolygon} from '../js/core/clip-polygons.js';
import {area,pointOnSegment} from '../js/core/geometry.js';
import {Quadtree,indexBounds,queryBrute} from '../js/core/quadtree.js';
import {generateSegments,seeded,parseSegmentText,generateExampleText} from '../js/core/dataset.js';
const W={xmin:-3,ymin:-3,xmax:3,ymax:3};let count=0;
function check(name,fn){fn();count++;console.log('OK',name);}
const equalSeg=(a,b)=>{if(a===null||b===null)assert.equal(a,b);else for(let i=0;i<4;i++)assert.ok(Math.abs(a[i]-b[i])<1e-5,`${JSON.stringify(a)} != ${JSON.stringify(b)}`);};
for(const [name,x0,y0,x1,y1,expected] of [
 ['cross',-6,0,6,0,[-3,0,3,0]],['edge',-3,-3,3,-3,[-3,-3,3,-3]],['vertical',0,-8,0,8,[0,-3,0,3]],
 ['outside',-9,-9,-4,-4,null],['point corner',-3,-3,-3,-3,[-3,-3,-3,-3]],['point outside',-4,-3,-4,-3,null],
 ['touch diagonal',-8,-8,-3,-3,[-3,-3,-3,-3]],['reverse',9,6,-9,-6,[3,2,-3,-2]],
 ['parallel outside',-5,-4,5,-4,null],['tangent top',-8,3,8,3,[-3,3,3,3]]]){
 check(name,()=>{equalSeg(cohenSutherland(x0,y0,x1,y1,W).segment,expected);equalSeg(liangBarsky(x0,y0,x1,y1,W).segment,expected);});}
check('random pairwise Cohen vs Liang 10000',()=>{const rand=seeded(1920);for(let j=0;j<10000;j++){const v=Array.from({length:4},()=>rand()*30-15);const a=cohenSutherland(...v,W).segment,b=liangBarsky(...v,W).segment;equalSeg(a,b);}});
check('midpoint approximate',()=>{let a=midpointClip(-6,0,6,0,W).segment;assert.ok(a&&Math.abs(a[0]+3)<1e-3&&Math.abs(a[2]-3)<1e-3);});
check('cyrus beck convex',()=>{const square=[{x:-3,y:-3},{x:3,y:-3},{x:3,y:3},{x:-3,y:3}];equalSeg(cyrusBeck(-6,0,6,0,square).segment,[-3,0,3,0]);});
const p=(x,y)=>({x,y});
const poly={
 outer:[[p(-5,-5),p(5,-5),p(5,5),p(-5,5)]],
 inside:[[p(-2,-2),p(2,-2),p(2,2),p(-2,2)]],
 hole:[[p(-6,-6),p(6,-6),p(6,6),p(-6,6)],[p(-1,-1),p(1,-1),p(1,1),p(-1,1)]],
 bowtie:[[p(-4,-4),p(4,4),p(-4,4),p(4,-4)]],
 split:[[p(-5,-5),p(-1,-5),p(-1,5),p(1,5),p(1,-5),p(5,-5),p(5,6),p(-5,6)]]};
for(const [name,num,total] of [['outer',1,36],['inside',1,16],['hole',2,32],['bowtie',2,18],['split',2,24]])check('polygon '+name,()=>{
 let rings=clipPolygon(poly[name],W);assert.equal(rings.length,num);const v=rings.reduce((s,x)=>s+area(x),0);assert.ok(Math.abs(v-total)<1e-4,`${name}: area=${v}`);
});
check('quadtree matches brute force on moving windows',()=>{const data=generateSegments(10000),tree=new Quadtree(data,indexBounds(data),{maxDepth:9,capacity:80}).build();const rand=seeded(42);for(let i=0;i<200;i++){const x=(rand()-.5)*1500,y=(rand()-.5)*1000,r={xmin:x-40,xmax:x+40,ymin:y-35,ymax:y+35};const a=tree.query(r).sort((a,b)=>a-b),b=queryBrute(data,r).sort((a,b)=>a-b);assert.deepEqual(a,b);}});
check('file format sample',()=>{const r=parseSegmentText(generateExampleText());assert.equal(r.data.length/4,15);assert.equal(r.rect.xmin,-30);});
check('point on window segment',()=>assert.equal(pointOnSegment(p(-3,-3),p(-5,-3),p(3,-3)),true));
console.log('ALL PASS',count);
