import { clamp, multiplyMatrixVector } from './matrix.js';

export function srgbChannelToLinear(channel) {
  const c = clamp(channel);
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function linearChannelToSrgb(channel) {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

/** RGB [0..1] -> XYZ, Y scale = 100. */
export function rgbToXyz(rgb, context) {
  const linearRgb = rgb.map(srgbChannelToLinear);
  const xyz1 = multiplyMatrixVector(context.rgbToXyzMatrix, linearRgb);
  return xyz1.map((value) => value * 100);
}

export function isOutOfGamut(linearRgb, epsilon = 1e-10) {
  return linearRgb.some((value) => value < -epsilon || value > 1 + epsilon);
}

export function mapGamut(linearRgb, strategy) {
  if (!isOutOfGamut(linearRgb)) {
    return linearRgb.map((value) => clamp(value));
  }

  if (strategy === 'Clipping') {
    return linearRgb.map((value) => clamp(value));
  }

  if (strategy !== 'Scaling') {
    throw new Error(`Неизвестная стратегия gamut mapping: ${strategy}`);
  }

  const min = Math.min(...linearRgb);
  const max = Math.max(...linearRgb);
  let scaled;

  if (min >= 0 && max > 1) {
    scaled = linearRgb.map((value) => value / max);
  } else if (min < 0 && max <= 1) {
    scaled = linearRgb.map((value) => (value - min) / (1 - min));
  } else if (min < 0 && max > 1) {
    const range = max - min;
    scaled = range < 1e-14 ? linearRgb.map(() => 0) : linearRgb.map((value) => (value - min) / range);
  } else {
    scaled = linearRgb;
  }

  return scaled.map((value) => clamp(value));
}

/** XYZ -> RGB [0..1], с диагностикой gamut. */
export function xyzToRgb(xyz, context, strategy) {
  const xyz1 = xyz.map((value) => value / 100);
  const rawLinearRgb = multiplyMatrixVector(context.xyzToRgbMatrix, xyz1);
  const outOfGamut = isOutOfGamut(rawLinearRgb);
  const mappedLinearRgb = mapGamut(rawLinearRgb, strategy);
  const rgb = mappedLinearRgb.map((value) => clamp(linearChannelToSrgb(value)));

  return { rgb, rawLinearRgb, mappedLinearRgb, outOfGamut };
}
