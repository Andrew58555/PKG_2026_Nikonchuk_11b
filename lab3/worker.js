import { toGray, grayToRgba, histogram, processGray, processGrayTile } from './src/processing/algorithms.js';

self.onmessage = (event) => {
  const data = event.data;
  try {
    if (data.kind === 'tile') {
      const gray = new Uint8ClampedArray(data.grayBuffer);
      const started = performance.now();
      const core = processGrayTile(
        gray,
        data.tileWidth,
        data.tileHeight,
        data.coreWidth,
        data.coreHeight,
        data.radius,
        data.mode,
        data.params
      );
      self.postMessage({ kind: 'tile', id: data.id, coreBuffer: core.buffer, elapsed: performance.now() - started }, [core.buffer]);
      return;
    }

    const { id, rgbaBuffer, width, height, mode, params } = data;
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
    self.postMessage({ kind: data.kind || 'image', id: data.id, error: error?.message || String(error) });
  }
};
