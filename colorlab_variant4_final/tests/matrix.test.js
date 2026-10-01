import test from 'node:test';
import assert from 'node:assert/strict';
import { determinant3, inverse3, multiplyMatrices } from '../src/model/matrix.js';
import { approx, approxArray } from './helpers.js';

test('determinant3', () => approx(determinant3([[1,2,3],[0,1,4],[5,6,0]]), 1, 1e-12));

test('inverse3 * matrix = identity', () => {
  const matrix = [[3,0,2],[2,0,-2],[0,1,1]];
  const product = multiplyMatrices(matrix, inverse3(matrix));
  const identity = [[1,0,0],[0,1,0],[0,0,1]];
  product.forEach((row, i) => approxArray(row, identity[i], 1e-10));
});

test('inverse3 rejects singular matrix', () => {
  assert.throws(() => inverse3([[1,2,3],[2,4,6],[1,0,1]]));
});
