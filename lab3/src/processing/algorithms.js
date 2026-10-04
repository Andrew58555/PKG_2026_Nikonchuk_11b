export function clamp(value, min = 0, max = 255) {
  return value < min ? min : value > max ? max : value;
}

export function reflectIndex(i, n) {
  if (n <= 1) return 0;
  const period = 2 * n - 2;
  let x = i % period;
  if (x < 0) x += period;
  return x < n ? x : period - x;
}

export function clampIndex(i, n) {
  return i < 0 ? 0 : i >= n ? n - 1 : i;
}

export function windowBounds(x, y, radius, width, height, borderMode) {
  const x0 = borderMode === 'reflect' ? reflectIndex(x - radius, width) : clampIndex(x - radius, width);
  const x1 = borderMode === 'reflect' ? reflectIndex(x + radius, width) : clampIndex(x + radius, width);
  const y0 = borderMode === 'reflect' ? reflectIndex(y - radius, height) : clampIndex(y - radius, height);
  const y1 = borderMode === 'reflect' ? reflectIndex(y + radius, height) : clampIndex(y + radius, height);
  return [Math.min(x0, x1), Math.max(x0, x1), Math.min(y0, y1), Math.max(y0, y1)];
}

export function toGray(rgba) {
  const n = rgba.length / 4;
  const gray = new Uint8ClampedArray(n);
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    gray[i] = Math.round(0.299 * rgba[p] + 0.587 * rgba[p + 1] + 0.114 * rgba[p + 2]);
  }
  return gray;
}

export function grayToRgba(gray) {
  const rgba = new Uint8ClampedArray(gray.length * 4);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    const v = gray[i]; rgba[p] = v; rgba[p + 1] = v; rgba[p + 2] = v; rgba[p + 3] = 255;
  }
  return rgba;
}

export function histogram(gray) {
  const h = new Uint32Array(256);
  for (const v of gray) h[v]++;
  return h;
}

function percentileBounds(gray, lowPercent, highPercent) {
  const h = histogram(gray), total = gray.length;
  const lowTarget = Math.floor(total * lowPercent / 100);
  const highTarget = Math.floor(total * highPercent / 100);
  let c = 0, low = 0, high = 255;
  for (let i = 0; i < 256; i++) { c += h[i]; if (c > lowTarget) { low = i; break; } }
  c = 0;
  for (let i = 0; i < 256; i++) { c += h[i]; if (c > highTarget) { high = i; break; } }
  if (high <= low) { low = 0; high = 255; }
  return [low, high];
}

export function linearContrast(gray, lowPercent = 2, highPercent = 98) {
  const [a, b] = percentileBounds(gray, lowPercent, highPercent);
  const out = new Uint8ClampedArray(gray.length);
  const scale = 255 / Math.max(1, b - a);
  for (let i = 0; i < gray.length; i++) out[i] = clamp(Math.round((gray[i] - a) * scale));
  return { gray: out, info: { a, b } };
}

export function integralImage(gray, width, height) {
  const W = width + 1, H = height + 1;
  const sat = new Float64Array(W * H);
  for (let y = 1; y <= height; y++) {
    let row = 0;
    const src = (y - 1) * width;
    for (let x = 1; x <= width; x++) {
      row += gray[src + x - 1];
      sat[y * W + x] = sat[(y - 1) * W + x] + row;
    }
  }
  return sat;
}

export function integralSquare(gray, width, height) {
  const W = width + 1, H = height + 1;
  const sat = new Float64Array(W * H);
  for (let y = 1; y <= height; y++) {
    let row = 0;
    const src = (y - 1) * width;
    for (let x = 1; x <= width; x++) {
      const v = gray[src + x - 1]; row += v * v;
      sat[y * W + x] = sat[(y - 1) * W + x] + row;
    }
  }
  return sat;
}

function rectSum(sat, stride, x0, y0, x1, y1) {
  const ax = x0, ay = y0, bx = x1 + 1, by = y1 + 1;
  return sat[by * stride + bx] - sat[ay * stride + bx] - sat[by * stride + ax] + sat[ay * stride + ax];
}

function paddedForBorder(gray, width, height, radius, borderMode) {
  const padW = width + 2 * radius, padH = height + 2 * radius;
  const padded = new Uint8ClampedArray(padW * padH);
  for (let y = 0; y < padH; y++) {
    const syRaw = y - radius;
    const sy = borderMode === 'reflect' ? reflectIndex(syRaw, height) : clampIndex(syRaw, height);
    for (let x = 0; x < padW; x++) {
      const sxRaw = x - radius;
      const sx = borderMode === 'reflect' ? reflectIndex(sxRaw, width) : clampIndex(sxRaw, width);
      padded[y * padW + x] = gray[sy * width + sx];
    }
  }
  return { padded, padW, padH };
}

function binaryFromThreshold(gray, width, height, windowSize, borderMode, thresholdFn) {
  const radius = Math.floor(windowSize / 2);
  const { padded, padW, padH } = paddedForBorder(gray, width, height, radius, borderMode);
  const sum = integralImage(padded, padW, padH);
  const sq = integralSquare(padded, padW, padH);
  const stride = padW + 1, out = new Uint8ClampedArray(gray.length);
  const area = windowSize * windowSize;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const x0 = x, y0 = y, x1 = x + windowSize - 1, y1 = y + windowSize - 1;
      const mean = rectSum(sum, stride, x0, y0, x1, y1) / area;
      const meanSquare = rectSum(sq, stride, x0, y0, x1, y1) / area;
      const std = Math.sqrt(Math.max(0, meanSquare - mean * mean));
      const threshold = thresholdFn(mean, std);
      out[i] = gray[i] > threshold ? 255 : 0;
    }
  }
  return out;
}

export function localMean(gray, width, height, windowSize = 21, borderMode = 'reflect') {
  const out = binaryFromThreshold(gray, width, height, windowSize, borderMode, (mean) => mean);
  return { gray: out, info: { windowSize, borderMode } };
}

export function niblack(gray, width, height, windowSize = 21, k = -0.2, borderMode = 'reflect') {
  const out = binaryFromThreshold(gray, width, height, windowSize, borderMode, (mean, std) => mean + k * std);
  return { gray: out, info: { windowSize, k, borderMode } };
}

export function sauvola(gray, width, height, windowSize = 21, k = 0.34, R = 128, borderMode = 'reflect') {
  const out = binaryFromThreshold(gray, width, height, windowSize, borderMode, (mean, std) => mean * (1 + k * (std / R - 1)));
  return { gray: out, info: { windowSize, k, R, borderMode } };
}

export function otsu(gray) {
  const h = histogram(gray), total = gray.length;
  let sumTotal = 0;
  for (let t = 0; t < 256; t++) sumTotal += t * h[t];
  let weightBack = 0, sumBack = 0, best = -1, bestVar = -1;
  for (let t = 0; t < 256; t++) {
    weightBack += h[t]; if (!weightBack) continue;
    const weightFore = total - weightBack; if (!weightFore) break;
    sumBack += t * h[t];
    const meanBack = sumBack / weightBack;
    const meanFore = (sumTotal - sumBack) / weightFore;
    const between = weightBack * weightFore * (meanBack - meanFore) ** 2;
    if (between > bestVar) { bestVar = between; best = t; }
  }
  const out = new Uint8ClampedArray(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] > best ? 255 : 0;
  return { gray: out, info: { threshold: best, betweenClassVariance: bestVar } };
}

function clipHistogram(hist, clipLimit) {
  let excess = 0;
  for (let i = 0; i < 256; i++) { if (hist[i] > clipLimit) { excess += hist[i] - clipLimit; hist[i] = clipLimit; } }
  const add = Math.floor(excess / 256), rem = excess % 256;
  for (let i = 0; i < 256; i++) hist[i] += add + (i < rem ? 1 : 0);
  return hist;
}

function claheMappings(gray, width, height, tiles, clipLimit) {
  const tileW = Math.ceil(width / tiles), tileH = Math.ceil(height / tiles);
  const maps = Array.from({length: tiles * tiles}, () => new Uint8ClampedArray(256));
  for (let ty = 0; ty < tiles; ty++) {
    const y0 = ty * tileH, y1 = Math.min(height, y0 + tileH);
    for (let tx = 0; tx < tiles; tx++) {
      const x0 = tx * tileW, x1 = Math.min(width, x0 + tileW);
      const area = Math.max(1, (x1 - x0) * (y1 - y0));
      const limit = Math.max(1, Math.floor(clipLimit * area / 256));
      const h = new Uint32Array(256);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) h[gray[y * width + x]]++;
      clipHistogram(h, limit);
      const m = maps[ty * tiles + tx];
      let c = 0;
      for (let i = 0; i < 256; i++) { c += h[i]; m[i] = Math.round(255 * c / area); }
    }
  }
  return { maps, tileW, tileH };
}

export function clahe(gray, width, height, tiles = 8, clipLimit = 2) {
  tiles = Math.max(2, Math.min(12, Math.round(tiles)));
  const { maps, tileW, tileH } = claheMappings(gray, width, height, tiles, clipLimit);
  const out = new Uint8ClampedArray(gray.length);
  for (let y = 0; y < height; y++) {
    const gy = (y + 0.5) / tileH - 0.5;
    const yA = Math.max(0, Math.min(tiles - 1, Math.floor(gy))), yB = Math.max(0, Math.min(tiles - 1, yA + 1));
    const fy = Math.max(0, Math.min(1, gy - yA));
    for (let x = 0; x < width; x++) {
      const gx = (x + 0.5) / tileW - 0.5;
      const xA = Math.max(0, Math.min(tiles - 1, Math.floor(gx))), xB = Math.max(0, Math.min(tiles - 1, xA + 1));
      const fx = Math.max(0, Math.min(1, gx - xA));
      const v = gray[y * width + x];
      const m00 = maps[yA * tiles + xA][v], m10 = maps[yA * tiles + xB][v];
      const m01 = maps[yB * tiles + xA][v], m11 = maps[yB * tiles + xB][v];
      const top = m00 * (1 - fx) + m10 * fx, bottom = m01 * (1 - fx) + m11 * fx;
      out[y * width + x] = Math.round(top * (1 - fy) + bottom * fy);
    }
  }
  return { gray: out, info: { tiles, clipLimit } };
}

export function processGray(gray, width, height, mode, params = {}) {
  switch (mode) {
    case 'linear': return linearContrast(gray, params.lowPercent ?? 2, params.highPercent ?? 98);
    case 'local-mean': return localMean(gray, width, height, params.windowSize ?? 21, params.borderMode ?? 'reflect');
    case 'niblack': return niblack(gray, width, height, params.windowSize ?? 21, params.k ?? -0.2, params.borderMode ?? 'reflect');
    case 'sauvola': return sauvola(gray, width, height, params.windowSize ?? 21, params.k ?? 0.34, params.R ?? 128, params.borderMode ?? 'reflect');
    case 'otsu': return otsu(gray);
    case 'clahe': return clahe(gray, width, height, params.tiles ?? 8, params.clipLimit ?? 2);
    default: throw new Error(`Unknown mode: ${mode}`);
  }
}
