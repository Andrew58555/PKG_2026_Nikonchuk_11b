import { reflectIndex, clampIndex, toGray, linearContrast, integralImage, localMean, niblack, sauvola, otsu, clahe, processGrayTile, processGray } from '../src/processing/algorithms.js';

const tests=[]; const eq=(name,a,b)=>tests.push([name,a,b]);
const tiny=new Uint8ClampedArray([0,0,0,255, 100,100,100,255, 200,200,200,255, 255,255,255,255]);
eq('Reflect left edge',reflectIndex(-1,5),1); eq('Reflect right edge',reflectIndex(5,5),3); eq('Clamp low',clampIndex(-2,5),0); eq('Clamp high',clampIndex(9,5),4);
const gray=toGray(tiny); eq('toGray length',gray.length,4); eq('toGray black',gray[0],0); eq('toGray white',gray[3],255);
const lc=linearContrast(gray,0,100).gray; eq('Linear contrast min',lc[0],0); eq('Linear contrast max',lc[3],255);
const sat=integralImage(new Uint8ClampedArray([1,2,3,4]),2,2); eq('SAT total',sat[8],10); eq('SAT single',sat[4],1);
for(const fn of [localMean,niblack,sauvola]){const r=fn(new Uint8ClampedArray([0,0,0,0]),2,2,3);eq(fn.name+' binary',Array.from(r.gray).every(v=>v===0),true);}

const source = new Uint8ClampedArray([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160]);
const width = 4, height = 4, radius = 1, tileWidth = width + 2 * radius, tileHeight = height + 2 * radius;
for (const borderMode of ['reflect', 'clamp']) {
  const tile = new Uint8ClampedArray(tileWidth * tileHeight);
  for (let y = 0; y < tileHeight; y++) for (let x = 0; x < tileWidth; x++) {
    const sx = borderMode === 'reflect' ? reflectIndex(x - radius, width) : clampIndex(x - radius, width);
    const sy = borderMode === 'reflect' ? reflectIndex(y - radius, height) : clampIndex(y - radius, height);
    tile[y * tileWidth + x] = source[sy * width + sx];
  }
  for (const [mode, params] of [['local-mean', { windowSize: 3, borderMode }], ['niblack', { windowSize: 3, k: -0.2, borderMode }], ['sauvola', { windowSize: 3, k: 0.05, R: 128, borderMode }]]) {
    const tileResult = processGrayTile(tile, tileWidth, tileHeight, width, height, radius, mode, params);
    const fullResult = processGray(source, width, height, mode, params).gray;
    eq('Parallel tile matches full-image result (' + mode + ', ' + borderMode + ')', Array.from(tileResult).join(','), Array.from(fullResult).join(','));
  }
}
const o=otsu(new Uint8ClampedArray([0,0,0,255,255,255])); eq('Otsu threshold sensible',o.info.threshold>=0&&o.info.threshold<255,true);
const c=clahe(new Uint8ClampedArray([10,10,20,20,30,30,40,40]),4,2,2,2);eq('CLAHE size',c.gray.length,8); eq('CLAHE range',Array.from(c.gray).every(v=>v>=0&&v<=255),true);
const out=document.querySelector('#out'); let passed=0; for(const [n,a,b] of tests){const ok=Object.is(a,b)||a===b; if(ok)passed++; const d=document.createElement('div');d.className='test '+(ok?'ok':'bad');d.textContent=(ok?'✓ ':'✗ ')+n+(ok?'':` — ожидалось ${b}, получено ${a}`);out.appendChild(d);} const summary=document.createElement('h2');summary.textContent=`Итог: ${passed}/${tests.length}`;summary.className=passed===tests.length?'ok':'bad';out.prepend(summary); if(passed!==tests.length)document.title='ЛР3 — есть ошибки';
