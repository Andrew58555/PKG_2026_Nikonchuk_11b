import { diagonal3, inverse3, multiplyMatrices, multiplyMatrixVector } from './matrix.js';

/**
 * Хроматические координаты стандартных источников.
 * Здесь НЕТ готовых XYZ-белых точек и НЕТ готовых RGB<->XYZ-матриц.
 */
export const ILLUMINANTS = Object.freeze({
  D65: Object.freeze({ name: 'D65', x: 0.3127, y: 0.3290 }),
  D50: Object.freeze({ name: 'D50', x: 0.34567, y: 0.35850 }),
  E: Object.freeze({ name: 'E', x: 1 / 3, y: 1 / 3 }),
});

/** Хроматические координаты первичных цветов sRGB. */
export const SRGB_PRIMARIES = Object.freeze({
  R: Object.freeze({ x: 0.64, y: 0.33 }),
  G: Object.freeze({ x: 0.30, y: 0.60 }),
  B: Object.freeze({ x: 0.15, y: 0.06 }),
});

export function xyToXyz(x, y, luminanceY = 1) {
  if (y === 0) throw new Error('Координата y не может быть равна нулю.');
  return [
    (x * luminanceY) / y,
    luminanceY,
    ((1 - x - y) * luminanceY) / y,
  ];
}

export function whitePointXyz(illuminantName, luminanceY = 100) {
  const illuminant = ILLUMINANTS[illuminantName];
  if (!illuminant) throw new Error(`Неизвестный источник освещения: ${illuminantName}`);
  return xyToXyz(illuminant.x, illuminant.y, luminanceY);
}

/**
 * Строит матрицы RGB<->XYZ на лету.
 * 1) переводим sRGB primaries из xy в XYZ при Y=1;
 * 2) решаем P*S=W;
 * 3) M = P*diag(S);
 * 4) обратную матрицу получаем собственным inverse3().
 */
export function buildRgbXyzContext(illuminantName) {
  const illuminant = ILLUMINANTS[illuminantName];
  if (!illuminant) throw new Error(`Неизвестный источник освещения: ${illuminantName}`);

  const r = xyToXyz(SRGB_PRIMARIES.R.x, SRGB_PRIMARIES.R.y, 1);
  const g = xyToXyz(SRGB_PRIMARIES.G.x, SRGB_PRIMARIES.G.y, 1);
  const b = xyToXyz(SRGB_PRIMARIES.B.x, SRGB_PRIMARIES.B.y, 1);

  const p = [
    [r[0], g[0], b[0]],
    [r[1], g[1], b[1]],
    [r[2], g[2], b[2]],
  ];

  const white1 = whitePointXyz(illuminantName, 1);
  const scale = multiplyMatrixVector(inverse3(p), white1);
  const rgbToXyzMatrix = multiplyMatrices(p, diagonal3(scale));
  const xyzToRgbMatrix = inverse3(rgbToXyzMatrix);

  return Object.freeze({
    illuminantName,
    whitePoint: Object.freeze(whitePointXyz(illuminantName, 100)),
    rgbToXyzMatrix: Object.freeze(rgbToXyzMatrix.map((row) => Object.freeze([...row]))),
    xyzToRgbMatrix: Object.freeze(xyzToRgbMatrix.map((row) => Object.freeze([...row]))),
  });
}
