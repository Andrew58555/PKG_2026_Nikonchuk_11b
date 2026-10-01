import { clamp } from './matrix.js';

/** RGB [0..1] -> HSV [H degrees, S %, V %]. */
export function rgbToHsv([r, g, b]) {
  const cMax = Math.max(r, g, b);
  const cMin = Math.min(r, g, b);
  const delta = cMax - cMin;

  let h = 0;
  if (delta !== 0) {
    if (cMax === r) {
      h = 60 * (((g - b) / delta) % 6);
    } else if (cMax === g) {
      h = 60 * ((b - r) / delta + 2);
    } else {
      h = 60 * ((r - g) / delta + 4);
    }
  }
  if (h < 0) h += 360;

  const s = cMax === 0 ? 0 : delta / cMax;
  return [h, s * 100, cMax * 100];
}

/** HSV [H degrees, S %, V %] -> RGB [0..1]. */
export function hsvToRgb([h, sPercent, vPercent]) {
  const hNormalized = ((h % 360) + 360) % 360;
  const s = clamp(sPercent / 100);
  const v = clamp(vPercent / 100);

  const c = v * s;
  const x = c * (1 - Math.abs(((hNormalized / 60) % 2) - 1));
  const m = v - c;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hNormalized < 60) [rp, gp, bp] = [c, x, 0];
  else if (hNormalized < 120) [rp, gp, bp] = [x, c, 0];
  else if (hNormalized < 180) [rp, gp, bp] = [0, c, x];
  else if (hNormalized < 240) [rp, gp, bp] = [0, x, c];
  else if (hNormalized < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];

  return [rp + m, gp + m, bp + m];
}
