import test from 'node:test';
import { hsvToRgb, rgbToHsv } from '../src/model/hsv.js';
import { approxArray } from './helpers.js';

test('RGB red -> HSV', () => approxArray(rgbToHsv([1, 0, 0]), [0, 100, 100], 1e-9));
test('RGB green -> HSV', () => approxArray(rgbToHsv([0, 1, 0]), [120, 100, 100], 1e-9));
test('RGB blue -> HSV', () => approxArray(rgbToHsv([0, 0, 1]), [240, 100, 100], 1e-9));
test('gray -> HSV without saturation', () => approxArray(rgbToHsv([0.5, 0.5, 0.5]), [0, 0, 50], 1e-9));
test('HSV 0/100/100 -> red', () => approxArray(hsvToRgb([0, 100, 100]), [1, 0, 0], 1e-9));
test('RGB -> HSV -> RGB round trip', () => {
  const rgb = [0.17, 0.63, 0.91];
  approxArray(hsvToRgb(rgbToHsv(rgb)), rgb, 1e-9);
});
