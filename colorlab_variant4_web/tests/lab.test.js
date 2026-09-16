import test from 'node:test';
import { buildRgbXyzContext } from '../src/model/illuminants.js';
import { labToXyz, xyzToLab } from '../src/model/lab.js';
import { rgbToXyz } from '../src/model/rgbXyz.js';
import { approxArray } from './helpers.js';

test('D65 white -> LAB(100,0,0)', () => {
  const context = buildRgbXyzContext('D65');
  approxArray(xyzToLab(context.whitePoint, context.whitePoint), [100, 0, 0], 1e-9);
});

test('black XYZ -> LAB(0,0,0)', () => {
  const context = buildRgbXyzContext('D65');
  approxArray(xyzToLab([0, 0, 0], context.whitePoint), [0, 0, 0], 1e-9);
});

test('red D65 -> known LAB coordinates', () => {
  const context = buildRgbXyzContext('D65');
  const xyz = rgbToXyz([1, 0, 0], context);
  approxArray(xyzToLab(xyz, context.whitePoint), [53.2371, 80.0901, 67.2033], 0.01);
});

test('LAB -> XYZ -> LAB round trip', () => {
  const context = buildRgbXyzContext('D50');
  const lab = [62.5, -18.2, 31.7];
  approxArray(xyzToLab(labToXyz(lab, context.whitePoint), context.whitePoint), lab, 1e-9);
});
