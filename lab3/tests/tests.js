import { reflectIndex, clampIndex, toGray, linearContrast, integralImage, localMean, niblack, sauvola, otsu, clahe } from '../src/processing/algorithms.js';

const tests=[]; const eq=(name,a,b)=>tests.push([name,a,b]);
const tiny=new Uint8ClampedArray([0,0,0,255, 100,100,100,255, 200,200,200,255, 255,255,255,255]);
eq('Reflect left edge',reflectIndex(-1,5),1); eq('Reflect right edge',reflectIndex(5,5),3); eq('Clamp low',clampIndex(-2,5),0); eq('Clamp high',clampIndex(9,5),4);
const gray=toGray(tiny); eq('toGray length',gray.length,4); eq('toGray black',gray[0],0); eq('toGray white',gray[3],255);
const lc=linearContrast(gray,0,100).gray; eq('Linear contrast min',lc[0],0); eq('Linear contrast max',lc[3],255);
const sat=integralImage(new Uint8ClampedArray([1,2,3,4]),2,2); eq('SAT total',sat[8],10); eq('SAT single',sat[4],1);
for(const fn of [localMean,niblack,sauvola]){const r=fn(new Uint8ClampedArray([0,0,0,0]),2,2,3);eq(fn.name+' binary',Array.from(r.gray).every(v=>v===0),true);}
const o=otsu(new Uint8ClampedArray([0,0,0,255,255,255])); eq('Otsu threshold sensible',o.info.threshold>=0&&o.info.threshold<255,true);
const c=clahe(new Uint8ClampedArray([10,10,20,20,30,30,40,40]),4,2,2,2);eq('CLAHE size',c.gray.length,8); eq('CLAHE range',Array.from(c.gray).every(v=>v>=0&&v<=255),true);
const out=document.querySelector('#out'); let passed=0; for(const [n,a,b] of tests){const ok=Object.is(a,b)||a===b; if(ok)passed++; const d=document.createElement('div');d.className='test '+(ok?'ok':'bad');d.textContent=(ok?'✓ ':'✗ ')+n+(ok?'':` — ожидалось ${b}, получено ${a}`);out.appendChild(d);} const summary=document.createElement('h2');summary.textContent=`Итог: ${passed}/${tests.length}`;summary.className=passed===tests.length?'ok':'bad';out.prepend(summary); if(passed!==tests.length)document.title='ЛР3 — есть ошибки';
