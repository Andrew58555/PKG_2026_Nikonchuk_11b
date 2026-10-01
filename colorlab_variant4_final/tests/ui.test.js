import test from 'node:test';
import assert from 'node:assert/strict';
import { MODEL_SPECS } from '../src/config/modelSpecs.js';

test('all user-facing components use integer steps', () => {
  for (const model of Object.values(MODEL_SPECS)) {
    for (const component of model.components) {
      assert.equal(component.step, 1, `${component.name}: step`);
      assert.equal(component.decimals, 0, `${component.name}: decimals`);
    }
  }
});
