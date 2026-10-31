import { strict as assert } from 'node:assert';
import { reflectIndex, clampIndex, toGray, linearContrast, integralImage, localMean, niblack, sauvola, otsu, clahe, processGrayTile, processGray } from '../src/processing/algorithms.js';
assert.equal(reflectIndex(-1,5),1); assert.equal(reflectIndex(5,5),3); assert.equal(clampIndex(-2,5),0); assert.equal(clampIndex(9,5),4);
const g=toGray(new Uint8ClampedArray([0,0,0,255,255,255,255,255])); assert.deepEqual([...g],[0,255]);
assert.deepEqual([...linearContrast(g,0,100).gray],[0,255]);
const sat=integralImage(new Uint8ClampedArray([1,2,3,4]),2,2); assert.equal(sat[8],10);
for(const f of [localMean,niblack,sauvola]) assert.equal(f(new Uint8ClampedArray([0,0,0,0]),2,2,3).gray.every(v=>v===0),true);
assert.ok(otsu(new Uint8ClampedArray([0,0,0,255,255,255])).info.threshold<255);
assert.equal(clahe(new Uint8ClampedArray([10,10,20,20,30,30,40,40]),4,2,2,2).gray.length,8);
const tileSrc = new Uint8ClampedArray([10,20,30,40,50,60,70,80,90,100,110,120,130,140,150,160]);
let tileTests = 0;
for (const borderMode of ['reflect','clamp']) {
  const radius=1, w=4, h=4, tw=w+2*radius, th=h+2*radius, tile=new Uint8ClampedArray(tw*th);
  for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const sx=borderMode==='reflect'?reflectIndex(x-radius,w):clampIndex(x-radius,w);const sy=borderMode==='reflect'?reflectIndex(y-radius,h):clampIndex(y-radius,h);tile[y*tw+x]=tileSrc[sy*w+sx];}
  for (const [mode, params] of [['local-mean',{windowSize:3,borderMode}],['niblack',{windowSize:3,k:-0.2,borderMode}],['sauvola',{windowSize:3,k:0.05,R:128,borderMode}]]) {
    assert.deepEqual([...processGrayTile(tile,tw,th,w,h,radius,mode,params)],[...processGray(tileSrc,w,h,mode,params).gray]);
    tileTests++;
  }
}
console.log(`${12 + tileTests}/18 tests passed`);
