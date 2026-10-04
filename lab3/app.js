import { histogram, toGray, grayToRgba, reflectIndex, clampIndex } from './src/processing/algorithms.js';

const $ = (s) => document.querySelector(s);
const state = {
  file: null,
  rgba: null,
  gray: null,
  width: 0,
  height: 0,
  result: null,
  worker: new Worker('worker.js', {type:'module'}),
  tileWorkers: [],
  busy: false,
  jobId: 0
};
const samples = [
  ['samples/shadow_document.png','Документ + тень','неравномерный фон'],
  ['samples/uneven_lighting.png','Неравномерное освещение','локальный порог'],
  ['samples/low_contrast.png','Низкий контраст','контрастирование'],
  ['samples/noise.png','Импульсный шум','шумовой фон'],
  ['samples/blurred_text.png','Размытый текст','размытие'],
  ['samples/texture.png','Текстура + объект','локальная статистика'],
  ['samples/gradient.png','Сильный градиент','адаптивный порог'],
  ['samples/night_sign.png','Тёмная сцена','CLAHE / Sauvola']
];
const modeNames = {
  linear:'Линейное контрастирование',
  'local-mean':'Локальный порог — среднее',
  niblack:'Локальный порог — Niblack',
  sauvola:'Адаптивный порог — Sauvola',
  otsu:'Оцу',
  clahe:'CLAHE'
};

function setStatus(text, loading=false){
  const el=$('#status'); el.textContent=text; el.classList.toggle('loading',loading);
}
function updateControls(){
  const mode=$('#mode').value;
  $('#windowGroup').classList.toggle('hidden', !['local-mean','niblack','sauvola'].includes(mode));
  $('#kGroup').classList.toggle('hidden', !['niblack','sauvola'].includes(mode));
  $('#rGroup').classList.toggle('hidden', mode !== 'sauvola');
  $('#contrastGroup').classList.toggle('hidden', mode !== 'linear');
  $('#claheGroup').classList.toggle('hidden', mode !== 'clahe');
  if(mode === 'sauvola') $('#kValueRange').value='0.34';
  $('#kValue').textContent=Number($('#kValueRange').value).toFixed(2);
  $('#modeBadge').textContent=modeNames[mode];
}
function drawImage(canvas, rgba, width, height){
  const maxW=900,maxH=700,scale=Math.min(1,maxW/width,maxH/height);
  canvas.width=Math.max(1,Math.round(width*scale)); canvas.height=Math.max(1,Math.round(height*scale));
  const ctx=canvas.getContext('2d');
  if(scale===1){ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);return;}
  const off=document.createElement('canvas'); off.width=width;off.height=height;
  off.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(rgba),width,height),0,0);
  ctx.drawImage(off,0,0,canvas.width,canvas.height);
}
function drawHist(canvas, h){
  const ctx=canvas.getContext('2d'), W=canvas.width,H=canvas.height;
  ctx.clearRect(0,0,W,H); ctx.fillStyle='#08111e';ctx.fillRect(0,0,W,H);
  const max=Math.max(1,...h);ctx.strokeStyle='#78a8ff';ctx.lineWidth=1;ctx.beginPath();
  for(let i=0;i<256;i++){const x=i/255*(W-1),y=H-6-(h[i]/max)*(H-18);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  ctx.fillStyle='#8fa2ba';ctx.font='11px Segoe UI,Arial';ctx.fillText('0',5,H-5);ctx.fillText('255',W-28,H-5);ctx.fillText(String(max),5,12);
}
async function decodeFile(file){
  const bitmap=await createImageBitmap(file); const maxPixels=16_000_000;
  let w=bitmap.width,h=bitmap.height; const scale=Math.min(1,Math.sqrt(maxPixels/(w*h)));
  const dw=Math.max(1,Math.round(w*scale)),dh=Math.max(1,Math.round(h*scale));
  const canvas=document.createElement('canvas');canvas.width=dw;canvas.height=dh;
  canvas.getContext('2d').drawImage(bitmap,0,0,dw,dh); bitmap.close();
  return {width:dw,height:dh,rgba:canvas.getContext('2d').getImageData(0,0,dw,dh).data};
}
function luminanceHistogram(rgba){
  return histogram(toGray(new Uint8ClampedArray(rgba)));
}
async function loadFile(file,label=file.name){
  stopTileWorkers(); setStatus('Декодирование изображения…',true); state.file=file; state.result=null;
  $('#downloadBtn').disabled=true;
  try{
    const decoded=await decodeFile(file); state.width=decoded.width;state.height=decoded.height;
    state.rgba=decoded.rgba.buffer.slice(0); state.gray=toGray(decoded.rgba);
    drawImage($('#beforeCanvas'),state.rgba,state.width,state.height);
    drawImage($('#afterCanvas'),state.rgba,state.width,state.height);
    $('#sourceLabel').textContent=`Выбрано: ${label} • ${state.width} × ${state.height}`;
    $('#pixelCount').textContent=(state.width*state.height).toLocaleString('ru-RU');
    drawHist($('#histBefore'),histogram(state.gray));drawHist($('#histAfter'),new Uint32Array(256));
    $('#elapsed').textContent='0 ms';$('#thresholdInfo').textContent='—';
    setStatus('Изображение готово.');
  }catch(e){setStatus('Ошибка загрузки: '+e.message);}
}
function params(){
  return {windowSize:Number($('#windowSize').value),k:Number($('#kValueRange').value),R:Number($('#rRange').value),lowPercent:Number($('#lowPercent').value),highPercent:Number($('#highPercent').value),borderMode:$('#borderMode').value,tiles:Number($('#tileGrid').value),clipLimit:Number($('#clipLimit').value)};
}
function extractTileGray(gray,width,height,y0,y1,radius,borderMode){
  const tileHeight=(y1-y0)+2*radius,tileWidth=width+2*radius,tile=new Uint8ClampedArray(tileWidth*tileHeight);
  for(let ty=0;ty<tileHeight;ty++){
    const gyRaw=y0-radius+ty,gy=borderMode==='reflect'?reflectIndex(gyRaw,height):clampIndex(gyRaw,height);
    for(let tx=0;tx<tileWidth;tx++){
      const gxRaw=tx-radius,gx=borderMode==='reflect'?reflectIndex(gxRaw,width):clampIndex(gxRaw,width);
      tile[ty*tileWidth+tx]=gray[gy*width+gx];
    }
  }
  return {tile,tileWidth,tileHeight};
}
function stopTileWorkers(){state.tileWorkers.forEach(w=>w.terminate());state.tileWorkers=[];}
async function processLocalParallel(mode,p){
  const radius=Math.floor(p.windowSize/2),width=state.width,height=state.height;
  const target=Math.min(Math.max(2,(navigator.hardwareConcurrency||4)-1),6);
  const chunkCount=Math.min(target,Math.max(2,Math.ceil(height/600)));
  const chunks=[];for(let i=0;i<chunkCount;i++){const y0=Math.floor(height*i/chunkCount),y1=Math.floor(height*(i+1)/chunkCount);if(y1>y0)chunks.push([y0,y1]);}
  const out=new Uint8ClampedArray(width*height);let completed=0;const start=performance.now();
  const tasks=chunks.map(([y0,y1])=>new Promise((resolve,reject)=>{
    const {tile,tileWidth,tileHeight}=extractTileGray(state.gray,width,height,y0,y1,radius,p.borderMode);
    const worker=new Worker('worker.js',{type:'module'});state.tileWorkers.push(worker);const id=++state.jobId;
    const cleanup=()=>{worker.terminate();state.tileWorkers=state.tileWorkers.filter(w=>w!==worker)};
    worker.onmessage=(e)=>{if(e.data.error){cleanup();reject(new Error(e.data.error));return;}const core=new Uint8ClampedArray(e.data.coreBuffer);out.set(core,y0*width);completed++;setStatus(`Параллельная обработка: ${completed}/${chunks.length} полос…`,true);cleanup();resolve();};
    worker.onerror=()=>{cleanup();reject(new Error('Worker завершился с ошибкой.'));};
    worker.postMessage({kind:'tile',id,grayBuffer:tile.buffer,tileWidth,tileHeight,coreWidth:width,coreHeight:y1-y0,radius,y0,mode,params:p},[tile.buffer]);
  }));
  await Promise.all(tasks);
  return {rgba:grayToRgba(out),afterHist:histogram(out),elapsed:performance.now()-start,threads:chunks.length};
}
async function process(){
  if(!state.rgba){setStatus('Сначала выбери тестовое или собственное изображение.');return;}
  if(state.busy)return; state.busy=true; $('#processBtn').disabled=true;$('#downloadBtn').disabled=true;stopTileWorkers();
  const mode=$('#mode').value,p=params();
  try{
    if(['local-mean','niblack','sauvola'].includes(mode) && state.width*state.height>=1200000){
      const r=await processLocalParallel(mode,p);state.result=r.rgba.buffer.slice(0);
      drawImage($('#afterCanvas'),r.rgba,state.width,state.height);drawHist($('#histBefore'),histogram(state.gray));drawHist($('#histAfter'),r.afterHist);
      $('#elapsed').textContent=r.elapsed.toFixed(1)+' ms';$('#thresholdInfo').textContent=`окно ${p.windowSize}, ${r.threads} потока`;setStatus('Готово. Большое изображение обработано параллельно по полосам с гало.');
      state.busy=false;$('#processBtn').disabled=false;$('#downloadBtn').disabled=false;return;
    }
    setStatus('Обработка в Web Worker…',true);const id=++state.jobId,rgbaBuffer=state.rgba.slice(0);
    state.worker.postMessage({id,rgbaBuffer,width:state.width,height:state.height,mode,params:p},[rgbaBuffer]);
  }catch(e){setStatus('Ошибка: '+e.message);state.busy=false;$('#processBtn').disabled=false;}
}
state.worker.onmessage=(e)=>{
  if(e.data.kind==='tile')return;
  if(e.data.error){state.busy=false;$('#processBtn').disabled=false;setStatus('Ошибка: '+e.data.error);return;}
  const {rgbaBuffer,width,height,beforeHist,afterHist,info,elapsed}=e.data;state.result=new Uint8ClampedArray(rgbaBuffer);
  drawImage($('#afterCanvas'),state.result,width,height);drawHist($('#histBefore'),new Uint32Array(beforeHist));drawHist($('#histAfter'),new Uint32Array(afterHist));
  $('#elapsed').textContent=elapsed.toFixed(1)+' ms';$('#thresholdInfo').textContent=info?.threshold!==undefined?String(info.threshold):(info?.windowSize?`окно ${info.windowSize}`:'готово');
  setStatus('Готово. Результат рассчитан вручную по массиву интенсивностей.');state.busy=false;$('#processBtn').disabled=false;$('#downloadBtn').disabled=false;
};
function setupSamples(){
  const grid=$('#sampleGrid');grid.innerHTML='';
  for(const [src,title,subtitle] of samples){
    const b=document.createElement('button');b.className='sample';b.innerHTML=`<img src="${src}" alt="${title}"><div class="sample-meta"><b>${title}</b><span>${subtitle}</span></div>`;
    b.addEventListener('click',()=>fetch(src).then(r=>r.blob()).then(blob=>loadFile(new File([blob],src.split('/').pop(),{type:blob.type||'image/png'}),title)).catch(e=>setStatus('Ошибка тестового файла: '+e.message)));
    grid.appendChild(b);
  }
}
$('#fileInput').addEventListener('change',e=>{const f=e.target.files[0];if(f)loadFile(f);});
$('#processBtn').addEventListener('click',process);$('#mode').addEventListener('change',updateControls);
$('#windowSize').addEventListener('input',()=>$('#windowValue').textContent=`${$('#windowSize').value} × ${$('#windowSize').value}`);
$('#kValueRange').addEventListener('input',()=>$('#kValue').textContent=Number($('#kValueRange').value).toFixed(2));
$('#rRange').addEventListener('input',()=>$('#rValue').textContent=$('#rRange').value);
$('#lowPercent').addEventListener('input',()=>$('#contrastValue').textContent=`${$('#lowPercent').value}% — ${$('#highPercent').value}%`);
$('#highPercent').addEventListener('input',()=>$('#contrastValue').textContent=`${$('#lowPercent').value}% — ${$('#highPercent').value}%`);
$('#tileGrid').addEventListener('input',()=>$('#tileValue').textContent=`${$('#tileGrid').value} × ${$('#tileGrid').value}`);
$('#clipLimit').addEventListener('input',()=>$('#clipValue').textContent=Number($('#clipLimit').value).toFixed(1));
$('#swapBtn').addEventListener('click',()=>{if(!state.result||!state.rgba)return;const before=state.rgba;state.rgba=state.result.buffer.slice(0);state.result=before;drawImage($('#beforeCanvas'),new Uint8ClampedArray(state.rgba),state.width,state.height);drawImage($('#afterCanvas'),new Uint8ClampedArray(state.result),state.width,state.height);setStatus('Изображения поменяны местами для визуального сравнения.');});
$('#downloadBtn').addEventListener('click',()=>{if(!state.result)return;const c=document.createElement('canvas');c.width=state.width;c.height=state.height;c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(state.result),state.width,state.height),0,0);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='lab3_result.png';a.click();});
$('#resetBtn').addEventListener('click',()=>location.reload());
const dz=$('#dropZone');['dragenter','dragover'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add('drag')}));['dragleave','drop'].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove('drag')}));dz.addEventListener('drop',e=>{const f=e.dataTransfer.files[0];if(f&&f.type.startsWith('image/'))loadFile(f);});
$('#windowValue').textContent='21 × 21';$('#contrastValue').textContent='2% — 98%';$('#tileValue').textContent='8 × 8';$('#clipValue').textContent='2.0';updateControls();setupSamples();
fetch(samples[0][0]).then(r=>r.blob()).then(blob=>loadFile(new File([blob],'shadow_document.png',{type:blob.type||'image/png'}),samples[0][1])).catch(()=>setStatus('Выберите тестовое изображение или загрузите свой файл.'));
