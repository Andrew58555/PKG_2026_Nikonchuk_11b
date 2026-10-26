import { runBenchmark } from './benchmark-core.js';

self.onmessage = async (event) => {
  if (event.data?.type !== 'run') return;
  try {
    const result = await runBenchmark((progress) => self.postMessage({ type: 'progress', progress }));
    self.postMessage({ type: 'done', result });
  } catch (error) {
    self.postMessage({ type: 'error', message: error?.message || String(error) });
  }
};
