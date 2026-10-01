import assert from 'node:assert/strict';

export function approx(actual, expected, tolerance = 1e-6, message = '') {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${message} expected ${expected}, got ${actual}, tolerance ${tolerance}`,
  );
}

export function approxArray(actual, expected, tolerance = 1e-6, message = '') {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => approx(value, expected[index], tolerance, `${message}[${index}]`));
}
