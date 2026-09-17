import { ColorConverter, rgbTo255 } from '../src/model/converter.js';
import { hsvToRgb, rgbToHsv } from '../src/model/hsv.js';
import { buildRgbXyzContext, whitePointXyz } from '../src/model/illuminants.js';
import { labToXyz, xyzToLab } from '../src/model/lab.js';
import { determinant3, inverse3, multiplyMatrices } from '../src/model/matrix.js';
import { mapGamut, rgbToXyz, xyzToRgb } from '../src/model/rgbXyz.js';

const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

function fail(message) {
  throw new Error(message);
}

function assert(condition, message = 'Условие не выполнено') {
  if (!condition) fail(message);
}

function equal(actual, expected, message = '') {
  if (!Object.is(actual, expected)) {
    fail(`${message ? `${message}: ` : ''}ожидалось ${expected}, получено ${actual}`);
  }
}

function notDeepEqual(actual, expected, message = '') {
  if (JSON.stringify(actual) === JSON.stringify(expected)) {
    fail(`${message ? `${message}: ` : ''}значения не должны совпадать`);
  }
}

function throws(fn, message = 'Ожидалось исключение') {
  let didThrow = false;
  try { fn(); } catch { didThrow = true; }
  if (!didThrow) fail(message);
}

function approx(actual, expected, tolerance = 1e-6, message = '') {
  const delta = Math.abs(actual - expected);
  if (delta > tolerance) {
    fail(`${message ? `${message}: ` : ''}ожидалось ${expected}, получено ${actual}, |Δ|=${delta}, допуск=${tolerance}`);
  }
}

function approxArray(actual, expected, tolerance = 1e-6, message = '') {
  equal(actual.length, expected.length, `${message} длина массива`);
  actual.forEach((value, index) => approx(value, expected[index], tolerance, `${message}[${index}]`));
}

// HSV — 6 тестов.
test('RGB red → HSV', () => approxArray(rgbToHsv([1, 0, 0]), [0, 100, 100], 1e-9));
test('RGB green → HSV', () => approxArray(rgbToHsv([0, 1, 0]), [120, 100, 100], 1e-9));
test('RGB blue → HSV', () => approxArray(rgbToHsv([0, 0, 1]), [240, 100, 100], 1e-9));
test('gray → HSV without saturation', () => approxArray(rgbToHsv([0.5, 0.5, 0.5]), [0, 0, 50], 1e-9));
test('HSV 0/100/100 → red', () => approxArray(hsvToRgb([0, 100, 100]), [1, 0, 0], 1e-9));
test('RGB → HSV → RGB round trip', () => {
  const rgb = [0.17, 0.63, 0.91];
  approxArray(hsvToRgb(rgbToHsv(rgb)), rgb, 1e-9);
});

// Illuminants / динамические матрицы — 4 теста.
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
  notDeepEqual(d65, d50);
  notDeepEqual(d65, e);
  notDeepEqual(d50, e);
});

// LAB — 4 теста.
test('D65 white → LAB(100,0,0)', () => {
  const context = buildRgbXyzContext('D65');
  approxArray(xyzToLab(context.whitePoint, context.whitePoint), [100, 0, 0], 1e-9);
});
test('black XYZ → LAB(0,0,0)', () => {
  const context = buildRgbXyzContext('D65');
  approxArray(xyzToLab([0, 0, 0], context.whitePoint), [0, 0, 0], 1e-9);
});
test('red D65 → known LAB coordinates', () => {
  const context = buildRgbXyzContext('D65');
  const xyz = rgbToXyz([1, 0, 0], context);
  approxArray(xyzToLab(xyz, context.whitePoint), [53.2371, 80.0901, 67.2033], 0.01);
});
test('LAB → XYZ → LAB round trip', () => {
  const context = buildRgbXyzContext('D50');
  const lab = [62.5, -18.2, 31.7];
  approxArray(xyzToLab(labToXyz(lab, context.whitePoint), context.whitePoint), lab, 1e-9);
});

// Матрицы — 3 теста.
test('determinant3', () => approx(determinant3([[1, 2, 3], [0, 1, 4], [5, 6, 0]]), 1, 1e-12));
test('inverse3 × matrix = identity', () => {
  const matrix = [[3, 0, 2], [2, 0, -2], [0, 1, 1]];
  const product = multiplyMatrices(matrix, inverse3(matrix));
  const identity = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  product.forEach((row, i) => approxArray(row, identity[i], 1e-10));
});
test('inverse3 rejects singular matrix', () => {
  throws(() => inverse3([[1, 2, 3], [2, 4, 6], [1, 0, 1]]));
});

// RGB ↔ XYZ / gamut — 5 тестов.
for (const illuminant of ['D65', 'D50', 'E']) {
  test(`RGB → XYZ → RGB round trip (${illuminant})`, () => {
    const context = buildRgbXyzContext(illuminant);
    const rgb = [0.12, 0.56, 0.91];
    const result = xyzToRgb(rgbToXyz(rgb, context), context, 'Clipping');
    approxArray(result.rgb, rgb, 1e-9);
    equal(result.outOfGamut, false);
  });
}
test('Clipping clamps each channel independently', () => {
  approxArray(mapGamut([-0.2, 0.5, 1.4], 'Clipping'), [0, 0.5, 1], 1e-12);
});
test('Scaling compresses all channels together', () => {
  approxArray(mapGamut([-0.2, 0.5, 1.4], 'Scaling'), [0, 0.4375, 1], 1e-12);
});

// Converter — 6 тестов.
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
  equal(converter.fromLab([50, 127, 127]).outOfGamut, true);
});
test('Clipping and Scaling produce different RGB for out-of-gamut LAB', () => {
  const clipping = new ColorConverter({ gamutStrategy: 'Clipping' }).fromLab([50, 127, 127]);
  const scaling = new ColorConverter({ gamutStrategy: 'Scaling' }).fromLab([50, 127, 127]);
  notDeepEqual(rgbTo255(clipping.rgb), rgbTo255(scaling.rgb));
});
test('changing illuminant rebuilds the matrix', () => {
  const converter = new ColorConverter({ illuminantName: 'D65' });
  const before = converter.context.rgbToXyzMatrix;
  converter.setIlluminant('D50');
  const after = converter.context.rgbToXyzMatrix;
  notDeepEqual(before, after);
});

const resultsElement = document.querySelector('#results');
const totalElement = document.querySelector('#total');
const passedElement = document.querySelector('#passed');
const failedElement = document.querySelector('#failed');
const statusElement = document.querySelector('#status');
const rerunButton = document.querySelector('#rerun');

async function runAllTests() {
  resultsElement.replaceChildren();
  totalElement.textContent = String(tests.length);
  passedElement.textContent = '0';
  failedElement.textContent = '0';
  statusElement.textContent = 'Выполняются тесты…';

  let passed = 0;
  let failed = 0;

  for (const entry of tests) {
    let error = null;
    try {
      await entry.fn();
      passed += 1;
    } catch (caught) {
      failed += 1;
      error = caught instanceof Error ? caught : new Error(String(caught));
    }

    const row = document.createElement('article');
    row.className = `test ${error ? 'failed' : 'pass'}`;

    const badge = document.createElement('div');
    badge.className = `badge ${error ? 'fail' : 'ok'}`;
    badge.textContent = error ? 'FAIL' : 'PASS';

    const content = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'test-name';
    name.textContent = entry.name;
    content.append(name);

    if (error) {
      const message = document.createElement('div');
      message.className = 'message';
      message.textContent = error.message;
      content.append(message);
    }

    row.append(badge, content);
    resultsElement.append(row);
  }

  passedElement.textContent = String(passed);
  failedElement.textContent = String(failed);
  statusElement.textContent = failed === 0
    ? `Готово: ${passed} из ${tests.length} тестов пройдены.`
    : `Готово: ${passed} пройдено, ${failed} с ошибкой.`;

  document.documentElement.dataset.testStatus = failed === 0 ? 'passed' : 'failed';
  document.documentElement.dataset.testPassed = String(passed);
  document.documentElement.dataset.testFailed = String(failed);
}

rerunButton.addEventListener('click', runAllTests);
runAllTests();
