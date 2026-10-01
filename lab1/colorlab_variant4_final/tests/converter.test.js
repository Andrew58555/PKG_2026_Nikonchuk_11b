import test from 'node:test';
import assert from 'node:assert/strict';
import { ColorConverter, rgbTo255 } from '../src/model/converter.js';
import { approxArray } from './helpers.js';

test('RGB(255,0,0) gives strict HSV and expected LAB', () => {
  const converter = new ColorConverter({ illuminantName: 'D65' });
  const result = converter.fromRgb255([255, 0, 0]);
  approxArray(result.hsv, [0, 100, 100], 1e-9);
  approxArray(result.lab, [53.2371, 80.0901, 67.2033], 0.01);
});

test('HSV conversion produces RGB', () => {
  const converter = new ColorConverter();
  approxArray(rgbTo255(converter.fromHsv([210, 66.6666667, 75.2941176]).rgb), [64, 128, 192], 0);
});

test('LAB red converts back close to RGB red', () => {
  const converter = new ColorConverter({ illuminantName: 'D65' });
  const result = converter.fromLab([53.2371, 80.0901, 67.2033]);
  approxArray(rgbTo255(result.rgb), [255, 0, 0], 1);
});

test('extreme LAB is reported as out of gamut', () => {
  const converter = new ColorConverter({ gamutStrategy: 'Clipping' });
  assert.equal(converter.fromLab([50, 127, 127]).outOfGamut, true);
});

test('Clipping and Scaling produce different RGB for out-of-gamut LAB', () => {
  const clipping = new ColorConverter({ gamutStrategy: 'Clipping' }).fromLab([50, 127, 127]);
  const scaling = new ColorConverter({ gamutStrategy: 'Scaling' }).fromLab([50, 127, 127]);
  assert.notDeepEqual(rgbTo255(clipping.rgb), rgbTo255(scaling.rgb));
});

test('changing illuminant rebuilds the matrix', () => {
  const converter = new ColorConverter({ illuminantName: 'D65' });
  const before = converter.context.rgbToXyzMatrix;
  converter.setIlluminant('D50');
  const after = converter.context.rgbToXyzMatrix;
  assert.notDeepEqual(before, after);
});
