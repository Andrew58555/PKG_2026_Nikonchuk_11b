const DELTA = 6 / 29;
const DELTA_CUBED = DELTA ** 3;

function f(t) {
  return t > DELTA_CUBED ? Math.cbrt(t) : t / (3 * DELTA ** 2) + 4 / 29;
}

function fInverse(value) {
  return value > DELTA ? value ** 3 : 3 * DELTA ** 2 * (value - 4 / 29);
}

/** XYZ (Y scale 100) -> CIELAB для указанной точки белого. */
export function xyzToLab([x, y, z], whitePoint) {
  const [xw, yw, zw] = whitePoint;
  const fx = f(x / xw);
  const fy = f(y / yw);
  const fz = f(z / zw);

  return [
    116 * fy - 16,
    500 * (fx - fy),
    200 * (fy - fz),
  ];
}

/** CIELAB -> XYZ (Y scale 100) для указанной точки белого. */
export function labToXyz([l, a, b], whitePoint) {
  const [xw, yw, zw] = whitePoint;
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  return [
    xw * fInverse(fx),
    yw * fInverse(fy),
    zw * fInverse(fz),
  ];
}
