export class RasterEngine {
  static stepLine(target, x0, y0, x1, y1, trace = null) {
    RasterEngine.#assertTarget(target);
    const dx = x1 - x0;
    const dy = y1 - y0;
    let iteration = 0;

    if (dx === 0 && dy === 0) {
      target.setPixel(x0, y0, 1);
      trace?.({ i: 0, x: x0, y: y0, formula: 'точка' });
      return 1;
    }

    if (Math.abs(dx) >= Math.abs(dy)) {
      const sx = dx >= 0 ? 1 : -1;
      const k = dy / dx;
      for (let x = x0; ; x += sx) {
        const yReal = y0 + k * (x - x0);
        const y = Math.round(yReal);
        target.setPixel(x, y, 1);
        trace?.({ i: iteration, x, y, real: yReal, formula: `y=${yReal.toFixed(3)}` });
        iteration += 1;
        if (x === x1) break;
      }
    } else {
      const sy = dy >= 0 ? 1 : -1;
      const invK = dx / dy;
      for (let y = y0; ; y += sy) {
        const xReal = x0 + invK * (y - y0);
        const x = Math.round(xReal);
        target.setPixel(x, y, 1);
        trace?.({ i: iteration, x, y, real: xReal, formula: `x=${xReal.toFixed(3)}` });
        iteration += 1;
        if (y === y1) break;
      }
    }

    return iteration;
  }

  static ddaLine(target, x0, y0, x1, y1, trace = null) {
    RasterEngine.#assertTarget(target);
    const dx = x1 - x0;
    const dy = y1 - y0;
    const steps = Math.max(Math.abs(dx), Math.abs(dy));

    if (steps === 0) {
      target.setPixel(x0, y0, 1);
      trace?.({ i: 0, x: x0, y: y0, xReal: x0, yReal: y0 });
      return 1;
    }

    const xIncrement = dx / steps;
    const yIncrement = dy / steps;
    let x = x0;
    let y = y0;

    for (let i = 0; i <= steps; i += 1) {
      const px = Math.round(x);
      const py = Math.round(y);
      target.setPixel(px, py, 1);
      trace?.({ i, x: px, y: py, xReal: x, yReal: y, xIncrement, yIncrement });
      x += xIncrement;
      y += yIncrement;
    }

    return steps + 1;
  }

  static bresenhamLine(target, x0, y0, x1, y1, trace = null) {
    RasterEngine.#assertTarget(target);
    let x = x0;
    let y = y0;
    const dx = Math.abs(x1 - x0);
    const sx = x0 < x1 ? 1 : -1;
    const dy = -Math.abs(y1 - y0);
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    let iteration = 0;

    while (true) {
      target.setPixel(x, y, 1);
      const e2 = 2 * err;
      trace?.({ i: iteration, x, y, err, e2, dx, dy, sx, sy });
      iteration += 1;
      if (x === x1 && y === y1) break;
      if (e2 >= dy) {
        err += dy;
        x += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y += sy;
      }
    }

    return iteration;
  }

  static bresenhamCircle(target, xc, yc, radius, trace = null) {
    RasterEngine.#assertTarget(target);
    const r = Math.max(0, Math.trunc(radius));
    let x = 0;
    let y = r;
    let d = 3 - 2 * r;
    let iteration = 0;

    do {
      RasterEngine.#plotCircle8(target, xc, yc, x, y);
      trace?.({ i: iteration, x, y, d });
      iteration += 1;

      if (d < 0) {
        d += 4 * x + 6;
      } else {
        d += 4 * (x - y) + 10;
        y -= 1;
      }
      x += 1;
    } while (x <= y);

    return iteration;
  }

  static wuLine(target, x0, y0, x1, y1, trace = null) {
    RasterEngine.#assertTarget(target);

    if (x0 === x1 && y0 === y1) {
      target.setPixel(x0, y0, 1);
      trace?.({ i: 0, x: x0, y: y0, intensity: 1 });
      return 1;
    }

    const ipart = (x) => Math.floor(x);
    const round = (x) => Math.floor(x + 0.5);
    const fpart = (x) => x - Math.floor(x);
    const rfpart = (x) => 1 - fpart(x);

    let steep = Math.abs(y1 - y0) > Math.abs(x1 - x0);
    if (steep) {
      [x0, y0] = [y0, x0];
      [x1, y1] = [y1, x1];
    }
    if (x0 > x1) {
      [x0, x1] = [x1, x0];
      [y0, y1] = [y1, y0];
    }

    const dx = x1 - x0;
    const dy = y1 - y0;
    const gradient = dx === 0 ? 1 : dy / dx;
    let traceIndex = 0;

    const plot = (x, y, intensity) => {
      const px = steep ? y : x;
      const py = steep ? x : y;
      const alpha = Math.max(0, Math.min(1, intensity));
      target.setPixel(px, py, alpha);
      trace?.({ i: traceIndex++, x: px, y: py, intensity: alpha });
    };

    let xEnd = round(x0);
    let yEnd = y0 + gradient * (xEnd - x0);
    let xGap = rfpart(x0 + 0.5);
    const xPixel1 = xEnd;
    const yPixel1 = ipart(yEnd);
    plot(xPixel1, yPixel1, rfpart(yEnd) * xGap);
    plot(xPixel1, yPixel1 + 1, fpart(yEnd) * xGap);
    let interY = yEnd + gradient;

    xEnd = round(x1);
    yEnd = y1 + gradient * (xEnd - x1);
    xGap = fpart(x1 + 0.5);
    const xPixel2 = xEnd;
    const yPixel2 = ipart(yEnd);

    for (let x = xPixel1 + 1; x < xPixel2; x += 1) {
      plot(x, ipart(interY), rfpart(interY));
      plot(x, ipart(interY) + 1, fpart(interY));
      interY += gradient;
    }

    plot(xPixel2, yPixel2, rfpart(yEnd) * xGap);
    plot(xPixel2, yPixel2 + 1, fpart(yEnd) * xGap);
    return traceIndex;
  }

  // В формулировке ЛР используется название Castle-Piteway для целочисленной
  // генерации коник. Здесь реализована коническая кривая-эллипс через
  // инкрементный midpoint-критерий в стиле Pitteway. Решающие переменные
  // умножены на 4, поэтому во внутреннем цикле нет дробных вычислений.
  static castlePitewayEllipse(target, xc, yc, rx, ry, trace = null) {
    RasterEngine.#assertTarget(target);
    rx = Math.max(1, Math.trunc(Math.abs(rx)));
    ry = Math.max(1, Math.trunc(Math.abs(ry)));

    const rx2 = rx * rx;
    const ry2 = ry * ry;
    let x = 0;
    let y = ry;
    let dx = 0;
    let dy = 2 * rx2 * y;
    let p = 4 * ry2 - 4 * rx2 * ry + rx2;
    let iteration = 0;

    while (dx < dy) {
      RasterEngine.#plotEllipse4(target, xc, yc, x, y);
      trace?.({ i: iteration++, region: 1, x, y, p, dx, dy });

      x += 1;
      dx += 2 * ry2;
      if (p < 0) {
        p += 4 * (dx + ry2);
      } else {
        y -= 1;
        dy -= 2 * rx2;
        p += 4 * (dx - dy + ry2);
      }
    }

    p = ry2 * (2 * x + 1) * (2 * x + 1)
      + 4 * rx2 * (y - 1) * (y - 1)
      - 4 * rx2 * ry2;

    while (y >= 0) {
      RasterEngine.#plotEllipse4(target, xc, yc, x, y);
      trace?.({ i: iteration++, region: 2, x, y, p, dx, dy });

      y -= 1;
      dy -= 2 * rx2;
      if (p > 0) {
        p += 4 * (rx2 - dy);
      } else {
        x += 1;
        dx += 2 * ry2;
        p += 4 * (dx - dy + rx2);
      }
    }

    return iteration;
  }

  static #plotCircle8(target, xc, yc, x, y) {
    target.setPixel(xc + x, yc + y, 1);
    target.setPixel(xc - x, yc + y, 1);
    target.setPixel(xc + x, yc - y, 1);
    target.setPixel(xc - x, yc - y, 1);
    target.setPixel(xc + y, yc + x, 1);
    target.setPixel(xc - y, yc + x, 1);
    target.setPixel(xc + y, yc - x, 1);
    target.setPixel(xc - y, yc - x, 1);
  }

  static #plotEllipse4(target, xc, yc, x, y) {
    target.setPixel(xc + x, yc + y, 1);
    target.setPixel(xc - x, yc + y, 1);
    target.setPixel(xc + x, yc - y, 1);
    target.setPixel(xc - x, yc - y, 1);
  }

  static #assertTarget(target) {
    if (!target || typeof target.setPixel !== 'function') {
      throw new Error('RasterEngine ожидает IRasterTarget с методом setPixel(x, y, intensity)');
    }
  }
}
