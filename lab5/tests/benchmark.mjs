import fs from 'node:fs';
import {runBenchmark} from '../js/bench/benchmark-core.js';
const p=process.argv[2]||'benchmark-results.json';
const res=await runBenchmark({n:500000,seed:2026,windowsCount:100,onProgress:console.log});
fs.writeFileSync(p,JSON.stringify({environment:{runtime:`Node ${process.version}`,platform:process.platform,arch:process.arch,date:new Date().toISOString()},...res},null,2));
console.log('FILE',p);
