/**
 * Диапазоны компонентов для интерфейса.
 * ВАЖНО: пользователь вводит и видит только целые значения.
 * Внутренние вычисления Model при этом остаются в double precision и не округляются.
 */
export const MODEL_SPECS = Object.freeze({
  RGB: Object.freeze({
    description: 'Аддитивная модель экрана',
    components: Object.freeze([
      { name: 'R', min: 0, max: 255, step: 1, decimals: 0 },
      { name: 'G', min: 0, max: 255, step: 1, decimals: 0 },
      { name: 'B', min: 0, max: 255, step: 1, decimals: 0 },
    ]),
  }),
  HSV: Object.freeze({
    description: 'Тон, насыщенность, значение',
    components: Object.freeze([
      { name: 'H', min: 0, max: 360, step: 1, decimals: 0 },
      { name: 'S', min: 0, max: 100, step: 1, decimals: 0 },
      { name: 'V', min: 0, max: 100, step: 1, decimals: 0 },
    ]),
  }),
  LAB: Object.freeze({
    description: 'CIELAB относительно выбранной точки белого',
    components: Object.freeze([
      { name: 'L*', min: 0, max: 100, step: 1, decimals: 0 },
      { name: 'a*', min: -128, max: 127, step: 1, decimals: 0 },
      { name: 'b*', min: -128, max: 127, step: 1, decimals: 0 },
    ]),
  }),
});
