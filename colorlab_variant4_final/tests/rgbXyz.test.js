import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRgbXyzContext } from '../src/model/illuminants.js';
import { mapGamut, rgbToXyz, xyzToRgb } from '../src/model/rgbXyz.js';
import { approxArray } from './helpers.js';

for (const illuminant of ['D65', 'D50', 'E']) {
  test(`RGB -> XYZ -> RGB round trip (${illuminant})`, () => {
    const context = buildRgbXyzContext(illuminant);
    const rgb = [0.12, 0.56, 0.91];
    const result = xyzToRgb(rgbToXyz(rgb, context), context, 'Clipping');
    approxArray(result.rgb, rgb, 1e-9);
    assert.equal(result.outOfGamut, false);
  });
}

test('Clipping clamps each channel independently', () => {
  approxArray(mapGamut([-0.2, 0.5, 1.4], 'Clipping'), [0, 0.5, 1], 1e-12);
});

test('Scaling compresses all channels together', () => {
  approxArray(mapGamut([-0.2, 0.5, 1.4], 'Scaling'), [0, 0.4375, 1], 1e-12);
});
