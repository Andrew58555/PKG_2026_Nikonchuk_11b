const $ = s => document.querySelector(s);
const state = {files:[], results:[], done:0, bad:0, start:0, workers:[], queue:[], active:0};

const input=$("#folderInput"), body=$("#resultsBody"), search=$("#search"), statusFilter=$("#statusFilter"), formatFilter=$("#formatFilter");

input.addEventListener("change", ()=>startScan([...input.files]));
$("#clearBtn").addEventListener("click", ()=>{ state.files=[];state.results=[];state.done=state.bad=0; state.queue=[]; state.workers.forEach(w=>w.terminate());state.workers=[];state.start=0; render(); updateProgress(); $("#clearBtn").disabled=true; $("#exportBtn").disabled=true; });
search.addEventListener("input",render); statusFilter.addEventListener("change",render); formatFilter.addEventListener("change",render);
$("#exportBtn").addEventListener("click", exportCSV);

function startScan(files){
  state.workers.forEach(w=>w.terminate()); state.workers=[];
  state.files=files; state.results=[]; state.done=state.bad=0; state.start=performance.now();
  state.queue=files.map((file,index)=>({file,index})); state.active=0;
  $("#clearBtn").disabled=false; $("#exportBtn").disabled=true;
  body.innerHTML='<tr class="empty"><td colspan="9">Идёт анализ…</td></tr>';
  const count=Math.min(Math.max(2,(navigator.hardwareConcurrency||4)-1),8);
  for(let i=0;i<count;i++) spawnWorker();
  updateProgress();
}
function spawnWorker(){
  const w=new Worker("worker.js"); state.workers.push(w);
  w.onmessage=e=>{
    const m=e.data;
    if(m.type==="ready"){ pump(w); return; }
    if(m.type==="result"){
      state.results[m.index]=m.result; state.done++; if(m.result.status!=="OK")state.bad++;
      updateProgress();
      if(state.done===state.files.length){state.workers.forEach(x=>x.terminate());$("#exportBtn").disabled=false;}
      else pump(w);
      if(state.done%20===0 || state.done===state.files.length) render();
    }
  };
  w.onerror=()=>{ if(state.queue.length) pump(w); };
}
function pump(w){
  const item=state.queue.pop();
  if(!item)return;
  state.active++;
  w.postMessage({type:"parse",index:item.index,file:item.file});
}
function updateProgress(){
  const total=state.files.length, pct=total?Math.round(state.done/total*100):0;
  $("#totalCount").textContent=total.toLocaleString();$("#doneCount").textContent=state.done.toLocaleString();$("#badCount").textContent=state.bad.toLocaleString();
  $("#progressBar").style.width=pct+"%";$("#progressPercent").textContent=pct+"%";
  $("#progressText").textContent=total?(state.done===total?"Анализ завершён":"Анализ файлов…"):"Ожидание файлов";
  $("#elapsed").textContent=state.start?((performance.now()-state.start)/1000).toFixed(1)+" c":"0.0 c";
}
function render(){
  const q=search.value.trim().toLowerCase(), sf=statusFilter.value, ff=formatFilter.value;
  const rows=state.results.map((r,i)=>({r,i})).filter(x=>{
    const r=x.r;if(!r)return false;
    return (!q||r.name.toLowerCase().includes(q)||r.format.toLowerCase().includes(q))
      &&(sf==="all"||(sf==="ok"&&r.status==="OK")||(sf==="bad"&&r.status!=="OK"))
      &&(ff==="all"||r.format===ff);
  });
  if(!rows.length){body.innerHTML='<tr class="empty"><td colspan="9">'+(state.results.length?'Нет совпадений':'Выберите папку для начала анализа')+'</td></tr>';return}
  body.innerHTML=rows.map(({r,i})=>`<tr>
    <td><button class="preview" data-index="${i}" title="Открыть изображение">👁</button></td><td><div class="name" title="${esc(r.name)}">${esc(r.name)}</div><div class="muted">${fmtBytes(r.fileSize)}</div></td>
    <td>${r.format}</td><td>${r.width&&r.height?r.width+" × "+r.height:"—"}</td>
    <td>${r.resolution||"—"}</td><td>${r.colorDepth||"—"}</td><td>${esc(r.compression||"—")}</td>
    <td><span class="pill ${r.status==="OK"?"ok":"bad"}">${esc(r.status)}</span></td>
    <td class="muted">${esc(r.details||"")}</td>
  </tr>`).join("");
  body.querySelectorAll(".preview").forEach(btn=>btn.addEventListener("click",()=>showPreview(Number(btn.dataset.index))));
}
function showPreview(index){
  const f=state.files[index]; const r=state.results[index]; if(!f||!r||r.status!=="OK")return;
  const url=URL.createObjectURL(f);
  const w=window.open("","_blank","width=1000,height=800");
  if(!w){URL.revokeObjectURL(url);return}
  w.document.write(`<title>${esc(r.name)}</title><body style="margin:0;background:#111;display:grid;place-items:center"><img src="${url}" style="max-width:100%;max-height:100vh;object-fit:contain"></body>`);
  w.addEventListener("beforeunload",()=>URL.revokeObjectURL(url));
}
function fmtBytes(n){if(n<1024)return n+" B";if(n<1048576)return(n/1024).toFixed(1)+" KB";if(n<1073741824)return(n/1048576).toFixed(1)+" MB";return(n/1073741824).toFixed(2)+" GB"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function exportCSV(){
  const cols=["name","format","width","height","resolution","colorDepth","compression","status","details","fileSize"];
  const lines=[cols.join(";")];
  for(const r of state.results) if(r) lines.push(cols.map(k=>`"${String(r[k]??"").replaceAll('"','""')}"`).join(";"));
  const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="image_metadata.csv";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
render();
setInterval(()=>{if(state.files.length&&state.done<state.files.length)updateProgress()},250);
