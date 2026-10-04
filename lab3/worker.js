import { toGray, grayToRgba, histogram, processGray } from './src/processing/algorithms.js';

self.onmessage = (event) => {
  const { id, rgbaBuffer, width, height, mode, params } = event.data;
  try {
    const rgba = new Uint8ClampedArray(rgbaBuffer);
    const gray = toGray(rgba);
    const beforeHist = histogram(gray);
    const t0 = performance.now();
    const result = processGray(gray, width, height, mode, params);
    const afterHist = histogram(result.gray);
    const elapsed = performance.now() - t0;
    const out = grayToRgba(result.gray);
    self.postMessage({ id, width, height, rgbaBuffer: out.buffer, beforeHist, afterHist, info: result.info, elapsed }, [out.buffer]);
  } catch (error) {
    self.postMessage({ id, error: error?.message || String(error) });
  }
};
