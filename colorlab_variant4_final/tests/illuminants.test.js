import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRgbXyzContext, whitePointXyz } from '../src/model/illuminants.js';
import { approxArray } from './helpers.js';

test('D65 white point is computed from xy', () => {
  approxArray(whitePointXyz('D65'), [95.0455927, 100, 108.9057751], 1e-5);
});

test('E white point is equal-energy XYZ', () => {
  approxArray(whitePointXyz('E'), [100, 100, 100], 1e-9);
});

test('D65 matrix is dynamically reconstructed close to standard sRGB matrix', () => {
  const m = buildRgbXyzContext('D65').rgbToXyzMatrix;
  const expected = [
    [0.4123908, 0.3575843, 0.1804808],
    [0.2126390, 0.7151687, 0.0721923],
    [0.0193308, 0.1191948, 0.9505322],
  ];
  m.forEach((row, i) => approxArray(row, expected[i], 2e-6));
});

test('matrix changes with illuminant', () => {
  const d65 = buildRgbXyzContext('D65').rgbToXyzMatrix;
  const d50 = buildRgbXyzContext('D50').rgbToXyzMatrix;
  const e = buildRgbXyzContext('E').rgbToXyzMatrix;
  assert.notDeepEqual(d65, d50);
  assert.notDeepEqual(d65, e);
  assert.notDeepEqual(d50, e);
});
