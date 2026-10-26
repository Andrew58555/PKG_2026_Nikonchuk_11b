import { RasterEngine } from '../core/raster-engine.js';

class CaptureTarget {
  constructor() {
    this.points = new Map();
  }
  setPixel(x, y, intensity = 1) {
    const key = `${x},${y}`;
    this.points.set(key, Math.max(this.points.get(key) || 0, intensity));
  }
  has(x, y) { return this.points.has(`${x},${y}`); }
}

function checkLine(method, x1, y1) {
  const t = new CaptureTarget();
  RasterEngine[method](t, 0, 0, x1, y1);
  if (!t.has(0, 0) || !t.has(x1, y1)) return false;
  const pts = [...t.points.keys()].map((key) => key.split(',').map(Number));
  if (pts.length < Math.max(Math.abs(x1), Math.abs(y1)) + 1) return false;
  return true;
}

export function runSelfTests() {
  const tests = [];
  const add = (name, fn) => {
    try { tests.push({ name, ok: Boolean(fn()) }); }
    catch (error) { tests.push({ name, ok: false, error: error.message }); }
  };

  const octants = [[13, 5], [5, 13], [-5, 13], [-13, 5], [-13, -5], [-5, -13], [5, -13], [13, -5]];
  for (const method of ['ddaLine', 'bresenhamLine']) {
    octants.forEach(([x, y], index) => add(`${method}: октант ${index + 1}`, () => checkLine(method, x, y)));
  }

  add('Брезенхем: вертикальная линия', () => checkLine('bresenhamLine', 0, 17));
  add('Брезенхем: горизонтальная линия', () => checkLine('bresenhamLine', -17, 0));

  add('Окружность: 8-кратная симметрия', () => {
    const t = new CaptureTarget();
    RasterEngine.bresenhamCircle(t, 0, 0, 9);
    for (const key of t.points.keys()) {
      const [x, y] = key.split(',').map(Number);
      const variants = [[x,y],[-x,y],[x,-y],[-x,-y],[y,x],[-y,x],[y,-x],[-y,-x]];
      if (!variants.every(([vx, vy]) => t.has(vx, vy))) return false;
    }
    return true;
  });

  add('Wu: есть дробная интенсивность', () => {
    const t = new CaptureTarget();
    RasterEngine.wuLine(t, -10, -3, 12, 7);
    return [...t.points.values()].some((v) => v > 0 && v < 1);
  });

  add('Castle-Piteway: 4-кратная симметрия', () => {
    const t = new CaptureTarget();
    RasterEngine.castlePitewayEllipse(t, 0, 0, 13, 7);
    for (const key of t.points.keys()) {
      const [x, y] = key.split(',').map(Number);
      if (![ [x,y],[-x,y],[x,-y],[-x,-y] ].every(([vx, vy]) => t.has(vx, vy))) return false;
    }
    return true;
  });

  return { total: tests.length, passed: tests.filter((t) => t.ok).length, tests };
}
