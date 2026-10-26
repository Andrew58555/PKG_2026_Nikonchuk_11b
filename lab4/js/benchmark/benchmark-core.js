import { RasterEngine } from '../core/raster-engine.js';
import { VirtualGrid } from '../core/virtual-grid.js';

function rng(seed = 0x51f15e) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function octantVector(octant, major, minor) {
  switch (octant & 7) {
    case 0: return [major, minor];
    case 1: return [minor, major];
    case 2: return [-minor, major];
    case 3: return [-major, minor];
    case 4: return [-major, -minor];
    case 5: return [-minor, -major];
    case 6: return [minor, -major];
    default: return [major, -minor];
  }
}

function makeFan(count, maxLength = 220, seed = 1, fixedLength = null) {
  const random = rng(seed);
  const result = new Int16Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const major = fixedLength ?? (8 + Math.floor(random() * Math.max(1, maxLength - 7)));
    const minor = Math.floor(random() * (major + 1));
    const [dx, dy] = octantVector(i, major, minor);
    result[i * 2] = dx;
    result[i * 2 + 1] = dy;
  }
  return result;
}

function makeCircles(count, seed = 2) {
  const random = rng(seed);
  const result = new Int16Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const radius = 2 + Math.floor(random() * 63);
    const cx = Math.floor(random() * 321) - 160;
    const cy = Math.floor(random() * 321) - 160;
    result[i * 3] = cx;
    result[i * 3 + 1] = cy;
    result[i * 3 + 2] = radius;
  }
  return result;
}

function timeLines(grid, segments, count, method) {
  grid.clear();
  const fn = RasterEngine[method];
  const started = performance.now();
  for (let i = 0; i < count; i += 1) {
    fn(grid, 0, 0, segments[i * 2], segments[i * 2 + 1]);
  }
  return performance.now() - started;
}

function timeCircles(grid, circles, count) {
  grid.clear();
  const started = performance.now();
  for (let i = 0; i < count; i += 1) {
    const offset = i * 3;
    RasterEngine.bresenhamCircle(grid, circles[offset], circles[offset + 1], circles[offset + 2]);
  }
  return performance.now() - started;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function stableLineTime(grid, segments, count, method, repeats = 3) {
  const samples = [];
  for (let i = 0; i < repeats; i += 1) samples.push(timeLines(grid, segments, count, method));
  return median(samples);
}

function stableCircleTime(grid, circles, count, repeats = 3) {
  const samples = [];
  for (let i = 0; i < repeats; i += 1) samples.push(timeCircles(grid, circles, count));
  return median(samples);
}

export async function runBenchmark(onProgress = () => {}) {
  const grid = new VirtualGrid(513, 513);
  const algorithms = [
    ['Пошаговый', 'stepLine'],
    ['ЦДА', 'ddaLine'],
    ['Брезенхем', 'bresenhamLine'],
    ['Ву', 'wuLine'],
  ];
  const lineCounts = [10000, 25000, 50000, 100000];
  const circleCounts = [5000, 10000, 25000, 50000];
  const lengths = [16, 32, 64, 128, 256];
  const maxLines = lineCounts.at(-1);
  const maxCircles = circleCounts.at(-1);
  const fan = makeFan(maxLines, 220, 0x12345678);
  const circles = makeCircles(maxCircles, 0x87654321);

  // JIT warm-up не входит в измерения.
  const warmup = makeFan(1200, 64, 7);
  for (const [, method] of algorithms) timeLines(grid, warmup, 1200, method);
  timeCircles(grid, circles, 500);

  const totalMeasurements = lineCounts.length * algorithms.length + circleCounts.length + lengths.length * 2;
  let completed = 0;
  const tick = (label) => {
    completed += 1;
    onProgress({ completed, total: totalMeasurements, label, percent: Math.round((completed / totalMeasurements) * 100) });
  };

  const lineByCount = {};
  for (const [label, method] of algorithms) {
    lineByCount[label] = [];
    for (const count of lineCounts) {
      const ms = stableLineTime(grid, fan, count, method);
      lineByCount[label].push({ count, ms });
      tick(`${label}: ${count.toLocaleString('ru-RU')} отрезков`);
      await Promise.resolve();
    }
  }

  const circleByCount = [];
  for (const count of circleCounts) {
    const ms = stableCircleTime(grid, circles, count);
    circleByCount.push({ count, ms });
    tick(`Окружности: ${count.toLocaleString('ru-RU')}`);
    await Promise.resolve();
  }

  const lineByLength = { 'ЦДА': [], 'Брезенхем': [] };
  const lengthSampleCount = 5000;
  for (const length of lengths) {
    const segments = makeFan(lengthSampleCount, length, 1000 + length, length);
    const dda = stableLineTime(grid, segments, lengthSampleCount, 'ddaLine');
    lineByLength['ЦДА'].push({ length, ms: dda });
    tick(`ЦДА: длина ${length}`);
    await Promise.resolve();

    const bres = stableLineTime(grid, segments, lengthSampleCount, 'bresenhamLine');
    lineByLength['Брезенхем'].push({ length, ms: bres });
    tick(`Брезенхем: длина ${length}`);
    await Promise.resolve();
  }

  const dda100k = lineByCount['ЦДА'].at(-1).ms;
  const bres100k = lineByCount['Брезенхем'].at(-1).ms;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      timer: 'performance.now()',
      grid: '513 x 513 VirtualGrid',
      lineCount: 100000,
      circleCount: 50000,
      allOctants: true,
      uiExcluded: true,
    },
    lineCounts,
    circleCounts,
    lengths,
    lineByCount,
    circleByCount,
    lineByLength,
    summary: {
      step100k: lineByCount['Пошаговый'].at(-1).ms,
      dda100k,
      bresenham100k: bres100k,
      wu100k: lineByCount['Ву'].at(-1).ms,
      circles50k: circleByCount.at(-1).ms,
      ddaToBresenhamRatio: bres100k > 0 ? dda100k / bres100k : 0,
    },
  };
}
