import {normalizeRect} from './core/geometry.js';
import {cohenSutherland,liangBarsky,cyrusBeck,CLIPPERS} from './core/clip-lines.js';
import {clipPolygon} from './core/clip-polygons.js';
import {defaultSegments,generateSegments,parseSegmentText} from './core/dataset.js';
import {Quadtree,indexBounds,queryBrute} from './core/quadtree.js';
import {CanvasPainter} from './ui/canvas-painter.js';
import {drawChart} from './ui/charts.js';
const $=id=>document.getElementById(id),painter=new CanvasPainter($('scene'),$('overlay'));
const state={convex:[{x:-32,y:-10},{x:-22,y:-27},{x:18,y:-31},{x:37,y:4},{x:12,y:30},{x:-29,y:22}],mode:'lines',data:new Float64Array(defaultSegments),tree:null,rect:{xmin:-30,ymin:-24,xmax:30,ymax:24},polygon:[],clipped:[],visible:[],benchmark:null,building:false,editVertices:false,newVertices:[],frameRequest:0,drag:null,frameTimes:[],lastFrame:0};
const samples={
 convex:`-50 -36\n50 -36\n50 36\n-50 36`,
 concave:`-50 -55\n-8 -55\n-8 55\n8 55\n8 -55\n50 -55\n50 62\n-50 62`,
 hole:`-52 -45\n52 -45\n52 45\n-52 45\n\n-13 -11\n13 -11\n13 11\n-13 11`,
 self:`-45 -35\n45 35\n-45 35\n45 -35`,
 corner:`-65 -50\n-30 -24\n-65 0\n-77 -26`
};
function parsePolygonInput(value){let rings=value.trim().split(/\n\s*\n/).map(chunk=>chunk.split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(line=>{
 const v=line.split(/[\s,;]+/).map(Number);if(v.length!==2||!v.every(Number.isFinite))throw Error('Каждая вершина должна иметь ровно две координаты: x y');return {x:v[0],y:v[1]};
 })).filter(a=>a.length>0);if(!rings.length||rings.some(r=>r.length<3))throw Error('В каждом контуре должно быть не менее трёх вершин');return rings;}
function polygonBounds(poly){let xmin=Infinity,ymin=Infinity,xmax=-Infinity,ymax=-Infinity;for(const v of poly){xmin=Math.min(xmin,v.x);ymin=Math.min(ymin,v.y);xmax=Math.max(xmax,v.x);ymax=Math.max(ymax,v.y);}return {xmin,ymin,xmax,ymax};}
function clipRect(){return $('lineAlgorithm').value==='cyrus'&&state.mode==='lines'?polygonBounds(state.convex):state.rect;}
function selectedClipper(){return $('lineAlgorithm').value==='cyrus'?(x,y,z,w)=>cyrusBeck(x,y,z,w,state.convex):CLIPPERS[$('lineAlgorithm').value];}
function safeRect(){const r={};for(const n of ['xmin','ymin','xmax','ymax']){r[n]=Number($(n).value);if(!Number.isFinite(r[n]))throw Error('Неверные координаты окна');}if(r.xmax-r.xmin<1e-7||r.ymax-r.ymin<1e-7)throw Error('Ширина и высота окна должны быть положительными');return normalizeRect(r);}
function syncInputs(){for(const k of Object.keys(state.rect))$(k).value=+state.rect[k].toFixed(3);}
function setInfo(message){$('infoText').textContent=message;}
function renderBase(){painter.renderBase(state.data,state.polygon,state.mode);}
function scheduleRender(){if(!state.frameRequest)state.frameRequest=requestAnimationFrame(()=>{state.frameRequest=0;drawOverlay();});}
function drawOverlay(){const start=performance.now();painter.clearOverlay();const rect=clipRect();let visible=[],candidateCount=0,stats={nodes:0,aabbChecks:0,candidates:0};
 if(state.mode==='lines'&&!state.building){let ids=state.tree&&$('useIndex').checked?state.tree.query(rect,stats):queryBrute(state.data,rect,stats);candidateCount=ids.length;
  const fn=selectedClipper();for(const id of ids){const i=id*4,r=fn(state.data[i],state.data[i+1],state.data[i+2],state.data[i+3],rect);if(r.segment)visible.push({id,line:r.segment});}
  state.visible=visible;painter.clippedSegments(visible.map(x=>x.line));$('metricTotal').textContent=(state.data.length/4).toLocaleString('ru-RU');$('metricCandidates').textContent=candidateCount.toLocaleString('ru-RU');$('metricVisible').textContent=visible.length.toLocaleString('ru-RU');
  $('resultDescription').textContent=`AABB отобрал ${candidateCount.toLocaleString('ru-RU')} кандидатов, после точного отсечения осталось ${visible.length.toLocaleString('ru-RU')} видимых отрезков. Проверено габаритных рамок: ${stats.aabbChecks.toLocaleString('ru-RU')}.`;
 }else if(state.mode==='polygons'){
  const clips=clipPolygon(state.polygon,rect);state.clipped=clips;painter.clippedPolygons(clips);if(state.editVertices)painter.activePolygon(state.newVertices);
  $('metricTotal').textContent=state.polygon.reduce((s,a)=>s+a.length,0);$('metricCandidates').textContent='—';$('metricVisible').textContent=clips.length;
  $('resultDescription').textContent=`Получено замкнутых контуров: ${clips.length}. Положительная площадь — внешняя граница, отрицательная — отверстие. Заливка учитывает чётность вложения.`;
 }
 if(state.mode==='lines'&&$('lineAlgorithm').value==='cyrus')painter.clipperPolygon(state.convex);else painter.rect(state.rect);const ms=performance.now()-start;$('metricMs').textContent=ms.toFixed(2)+' мс';
 const now=performance.now();if(state.drag&&state.lastFrame){const delta=now-state.lastFrame;state.frameTimes.push(delta);if(state.frameTimes.length>25)state.frameTimes.shift();const avg=state.frameTimes.reduce((s,v)=>s+v,0)/state.frameTimes.length;$('metricFps').textContent=(1000/avg).toFixed(0)+' FPS';}else if(!state.drag){$('metricFps').textContent='—';}state.lastFrame=now;
 if(!$('stepsPanel').hidden)renderSteps();
}
function renderSteps(){if(state.mode==='polygons'){$('stepsText').textContent='Для многоугольника вычисляются пересечения рёбер с границей окна и рёбер друг с другом. Затем строятся замкнутые контуры по правилу чётности (even-odd).';return;}
 const fn=selectedClipper(),id=state.visible.find(v=>{const i=v.id*4;return v.line.some((x,j)=>Math.abs(x-state.data[i+j])>1e-5);})?.id??state.visible[0]?.id??0;const i=id*4;
 if(!state.data.length){$('stepsText').textContent='Нет отрезков';return;}const {segment,ops,steps}=fn(state.data[i],state.data[i+1],state.data[i+2],state.data[i+3],clipRect(),true);
 $('stepsText').textContent=`Отрезок №${id+1}: (${state.data[i].toFixed(2)}; ${state.data[i+1].toFixed(2)}) → (${state.data[i+2].toFixed(2)}; ${state.data[i+3].toFixed(2)})\n${steps.join('\n')}\n\nРезультат: ${segment?segment.map(x=>x.toFixed(3)).join(' ; '):'вне окна'}\nУмножений: ${ops.multiplications}, делений: ${ops.divisions}, итераций: ${ops.iterations}`;
}
function modeTo(mode){state.mode=mode;document.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));$('lineSettings').hidden=mode!=='lines';$('polygonSettings').hidden=mode!=='polygons';$('sceneTitle').textContent=mode==='lines'?'Отсечение отрезков':'Отсечение многоугольника';$('metricTotal').previousElementSibling.textContent=mode==='lines'?'Всего отрезков':'Всего вершин';$('metricVisible').previousElementSibling.textContent=mode==='lines'?'Видимых':'Контуров';$('exportSegments').textContent=mode==='lines'?'Экспорт видимых .txt':'Экспорт контуров .txt';$('rectPanel').hidden=mode==='lines'&&$('lineAlgorithm').value==='cyrus';renderBase();scheduleRender();}
async function createData(n){if(!Number.isInteger(n)||n<10||n>500000)throw Error('Допустимо от 10 до 500 000 отрезков');state.building=true;setInfo('Генерация и построение Quadtree…');$('generateBtn').disabled=true;
 await new Promise(resolve=>setTimeout(resolve,10));state.data=generateSegments(n);state.tree=new Quadtree(state.data,indexBounds(state.data),{maxDepth:10,capacity:80});
 for(let i=0;i<n;i+=3000){const end=Math.min(n,i+3000);for(let j=i;j<end;j++)state.tree.insert(j);if(i%30000===0){setInfo(`Индекс: ${Math.round(end/n*100)}%`);await new Promise(requestAnimationFrame);}}
 state.building=false;$('generateBtn').disabled=false;setInfo(`${n.toLocaleString('ru-RU')} отрезков; ${state.tree.nodes.toLocaleString('ru-RU')} узлов. Фон: выборка до 24 000 линий.`);renderBase();scheduleRender();}
function eventPos(ev){const b=painter.overlay.getBoundingClientRect();return {x:ev.clientX-b.left,y:ev.clientY-b.top};}
function pointerDown(ev){if(ev.button!==0)return;const pos=eventPos(ev),world=painter.world(pos.x,pos.y),r=painter.getRectPixels(clipRect());if(state.mode==='polygons'&&state.editVertices){state.newVertices.push({x:+world.x.toFixed(1),y:+world.y.toFixed(1)});scheduleRender();return;}
 let drag='pan',endpoint=-1;
 if(state.mode==='lines'&&state.data.length<=8000){let best=9*9;for(let i=0;i<state.data.length;i+=2){const q=painter.screen(state.data[i],state.data[i+1]),d=(q.x-pos.x)**2+(q.y-pos.y)**2;if(d<best){best=d;endpoint=i;}}}
 if(endpoint>=0)drag='endpoint';else if(pos.x>=r.x-9&&pos.x<=r.x+r.w+9&&pos.y>=r.y-9&&pos.y<=r.y+r.h+9)drag='window';
 state.drag={type:drag,endpoint,begin:world,origRect:{...state.rect},origConvex:state.convex.map(v=>({...v})),origView:{...painter.view}};state.frameTimes=[];state.lastFrame=0;painter.overlay.setPointerCapture(ev.pointerId);}
function pointerMove(ev){if(!state.drag)return;const pos=eventPos(ev),world=painter.world(pos.x,pos.y),dx=world.x-state.drag.begin.x,dy=world.y-state.drag.begin.y;
 if(state.drag.type==='endpoint'){state.data[state.drag.endpoint]=world.x;state.data[state.drag.endpoint+1]=world.y;state.tree=null;renderBase();}
 else if(state.drag.type==='window'){if(state.mode==='lines'&&$('lineAlgorithm').value==='cyrus'){state.convex=state.drag.origConvex.map(v=>({x:v.x+dx,y:v.y+dy}));$('convexText').value=state.convex.map(v=>`${v.x.toFixed(1)} ${v.y.toFixed(1)}`).join('\n');}else{for(const k of ['xmin','xmax'])state.rect[k]=state.drag.origRect[k]+dx;for(const k of ['ymin','ymax'])state.rect[k]=state.drag.origRect[k]+dy;syncInputs();}}
 else{painter.view.cx=state.drag.origView.cx-dx;painter.view.cy=state.drag.origView.cy-dy;renderBase();}
 scheduleRender();}
function pointerUp(){state.drag=null;state.frameTimes=[];scheduleRender();}
function zoom(ev){ev.preventDefault();const pos=eventPos(ev),before=painter.world(pos.x,pos.y);painter.view.zoom=Math.max(.18,Math.min(40,painter.view.zoom*(ev.deltaY>0?.86:1.16)));const after=painter.world(pos.x,pos.y);painter.view.cx+=before.x-after.x;painter.view.cy+=before.y-after.y;renderBase();scheduleRender();}
function saveFile(filename,body,mime='text/plain;charset=utf-8'){const blob=new Blob([body],{type:mime}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function csvLine(fields){return fields.map(v=>String(v??'').replaceAll('"','""')).map(v=>'"'+v+'"').join(';');}
function showBenchmark(res){state.benchmark=res;const best=res.depthResults.find(x=>x.depth===res.bestDepth);
 $('benchStatus').textContent=`Обработано ${res.params.n.toLocaleString('ru-RU')} отрезков. Оптимальная измеренная глубина: ${res.bestDepth}; среднее время запроса + точного отсечения: ${best.msPerFrame.toFixed(2)} мс/окно. Полный перебор: ${res.brute.msPerFrame.toFixed(2)} мс/окно. Результаты зависят от оборудования.`;
 drawChart($('depthChart'),res.depthResults,'depth','msPerFrame',{titleX:'Максимальная глубина',unit:'мс / окно'});drawChart($('densityChart'),res.densityResults,'n','msPerFrame',{titleX:'Число отрезков',unit:'мс / окно'});
 const o=res.ops;$('opsSummary').textContent=`На ${o.n.toLocaleString('ru-RU')} отрезках: Сазерленд — Коэн — ${o.cohen.multiplications.toLocaleString('ru-RU')} умножений и ${o.cohen.divisions.toLocaleString('ru-RU')} делений; Лианг — Барски — ${o.liang.multiplications.toLocaleString('ru-RU')} умножений и ${o.liang.divisions.toLocaleString('ru-RU')} делений. Это счётчики выполненных операций, а не измерение скорости.`;
 $('benchTable').innerHTML=`<table><thead><tr><th>Глубина</th><th>Узлов</th><th>Построение, мс</th><th>Отсечение, мс/окно</th><th>Кандидатов/окно</th></tr></thead><tbody>${res.depthResults.map(x=>`<tr><td>${x.depth}</td><td>${x.nodes}</td><td>${x.buildMs.toFixed(1)}</td><td>${x.msPerFrame.toFixed(3)}</td><td>${(x.candidates/x.frames).toFixed(0)}</td></tr>`).join('')}</tbody></table>`;$('csvBtn').disabled=false;
}
function setup(){painter.resize();$('polygonText').value=samples.concave;state.polygon=parsePolygonInput(samples.concave);renderBase();scheduleRender();
 window.addEventListener('resize',()=>{painter.resize();renderBase();scheduleRender();});
 document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>modeTo(b.dataset.mode)));
 for(const id of ['xmin','ymin','xmax','ymax'])$(id).addEventListener('change',()=>{try{state.rect=safeRect();setInfo('Отсекающее окно обновлено');scheduleRender();}catch(e){alert(e.message);syncInputs();}});
 $('lineAlgorithm').addEventListener('change',()=>{$('convexSettings').hidden=$('lineAlgorithm').value!=='cyrus';$('rectPanel').hidden=state.mode==='lines'&&$('lineAlgorithm').value==='cyrus';scheduleRender();});$('useIndex').addEventListener('change',()=>scheduleRender());
 $('generateBtn').addEventListener('click',async()=>{try{await createData(Number($('lineCount').value));}catch(e){state.building=false;$('generateBtn').disabled=false;alert(e.message);}});
 $('lineExample').addEventListener('click',()=>{state.data=new Float64Array(defaultSegments);state.tree=null;painter.view={cx:0,cy:0,zoom:4};renderBase();setInfo('Демонстрационный набор');scheduleRender();});
 $('loadBtn').addEventListener('click',()=>$('fileInput').click());$('fileInput').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{const {data,rect}=parseSegmentText(await file.text());state.data=data;state.rect=rect;syncInputs();state.tree=null;setInfo(`Файл: ${file.name}`);renderBase();scheduleRender();}catch(err){alert(err.message);}});
 $('applyConvex').addEventListener('click',()=>{try{const rings=parsePolygonInput($('convexText').value);if(rings.length!==1)throw Error('Нужен один выпуклый контур');const ring=rings[0];let sign=0;for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],c=ring[(i+2)%ring.length];const cross=(b.x-a.x)*(c.y-b.y)-(b.y-a.y)*(c.x-b.x);if(Math.abs(cross)>1e-7){if(sign&&cross*sign<0)throw Error('Вершины должны образовывать выпуклый многоугольник');sign=Math.sign(cross);}}state.convex=ring;scheduleRender();}catch(e){alert(e.message);}});
 $('polygonPreset').addEventListener('change',()=>{$('polygonText').value=samples[$('polygonPreset').value];state.polygon=parsePolygonInput($('polygonText').value);painter.view={cx:0,cy:0,zoom:4};renderBase();scheduleRender();});
 $('applyPolygon').addEventListener('click',()=>{try{state.polygon=parsePolygonInput($('polygonText').value);state.editVertices=false;state.newVertices=[];$('editPolygon').textContent='Добавлять вершины';renderBase();scheduleRender();}catch(e){alert(e.message);}});
 $('editPolygon').addEventListener('click',()=>{if(state.editVertices){if(state.newVertices.length>=3){state.polygon=[state.newVertices];$('polygonText').value=state.newVertices.map(p=>`${p.x} ${p.y}`).join('\n');renderBase();}state.newVertices=[];}state.editVertices=!state.editVertices;$('editPolygon').textContent=state.editVertices?'Закончить контур':'Добавлять вершины';scheduleRender();});
 $('resetView').addEventListener('click',()=>{painter.view={cx:0,cy:0,zoom:4};renderBase();scheduleRender();});$('centerWindow').addEventListener('click',()=>{const r=state.rect,cx=(r.xmin+r.xmax)/2,cy=(r.ymin+r.ymax)/2;painter.view.cx=cx;painter.view.cy=cy;renderBase();scheduleRender();});
 $('overlay').addEventListener('pointerdown',pointerDown);$('overlay').addEventListener('pointermove',pointerMove);$('overlay').addEventListener('pointerup',pointerUp);$('overlay').addEventListener('pointercancel',pointerUp);$('overlay').addEventListener('wheel',zoom,{passive:false});
 $('showSteps').addEventListener('click',()=>{$('stepsPanel').hidden=!$('stepsPanel').hidden;if(!$('stepsPanel').hidden)renderSteps();});
 $('exportSegments').addEventListener('click',()=>{if(state.mode==='polygons'){const text=state.clipped.map(r=>r.map(p=>`${p.x.toFixed(6)} ${p.y.toFixed(6)}`).join('\n')).join('\n\n');saveFile('visible_contours.txt',text);return;}const a=state.visible.map(v=>v.line);const body=[a.length,...a.map(s=>s.map(x=>x.toFixed(6)).join(' ')),Object.values(state.rect).map(x=>x.toFixed(6)).join(' ')].join('\n')+'\n';saveFile('visible_segments.txt',body);});
 $('benchmarkBtn').addEventListener('click',()=>{$('benchmarkBtn').disabled=true;$('benchStatus').textContent='Запуск benchmark в отдельном потоке…';const w=new Worker('./js/bench/benchmark.worker.js',{type:'module'});
  w.onmessage=e=>{const m=e.data;if(m.type==='progress')$('benchStatus').textContent=m.message;else if(m.type==='done'){showBenchmark(m.result);$('benchmarkBtn').disabled=false;w.terminate();}else if(m.type==='error'){$('benchStatus').textContent='Ошибка: '+m.message;$('benchmarkBtn').disabled=false;w.terminate();}};
  w.onerror=e=>{$('benchStatus').textContent='Ошибка Worker: '+e.message;$('benchmarkBtn').disabled=false;w.terminate();};w.postMessage({type:'run',options:{n:500000,seed:2026,windowsCount:100}});
 });
 $('csvBtn').addEventListener('click',()=>{const r=state.benchmark;if(!r)return;const rows=[['тип','глубина/количество','построение_мс','мс_на_окно','кандидатов_на_окно'],...r.depthResults.map(x=>['depth',x.depth,x.buildMs,x.msPerFrame,x.candidates/x.frames]),...r.densityResults.map(x=>['density',x.n,x.buildMs,x.msPerFrame,x.candidates/x.frames])];saveFile('benchmark_lab5.csv','\ufeff'+rows.map(csvLine).join('\r\n'),'text/csv;charset=utf-8');});
 drawChart($('depthChart'),[]);drawChart($('densityChart'),[]);
}
setup();
