import {runBenchmark} from './benchmark-core.js';
self.onmessage=async event=>{if(event.data?.type!=='run')return;try{const result=await runBenchmark({...event.data.options,onProgress:(message)=>self.postMessage({type:'progress',message})});self.postMessage({type:'done',result});}catch(e){self.postMessage({type:'error',message:String(e.stack||e)});}};
