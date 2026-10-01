import { MODEL_SPECS } from '../config/modelSpecs.js';
import { hexToRgb255, rgbToHex } from '../model/converter.js';

export class ColorController {
  constructor(view, converter) {
    this.view = view;
    this.converter = converter;
    this.busy = false;
    this.gradientFrame = null;

    // currentSource хранит исходное представление с полной точностью.
    // currentResult хранит истинные (не округленные для UI) координаты
    // текущего цвета во всех моделях.
    this.currentSource = { model: 'RGB', values: [255, 0, 0] };
    this.currentResult = null;
    this.view.setModelValues('RGB', [255, 0, 0]);

    this.view.onComponentChanged = (model, index, value) => this.onComponentChanged(model, index, value);
    this.view.onPaletteSelected = (hex) => this.onPaletteSelected(hex);
    this.view.onSettingsChanged = (settings) => this.onSettingsChanged(settings);

    this.onSettingsChanged(this.view.getSettings());
  }

  onSettingsChanged({ illuminantName, gamutStrategy }) {
    if (this.busy) return;
    this.converter.setIlluminant(illuminantName);
    this.converter.setGamutStrategy(gamutStrategy);
    this.#renderFromCurrentSource();
  }

  onPaletteSelected(hex) {
    if (this.busy) return;
    const rgb255 = hexToRgb255(hex);
    this.currentSource = { model: 'RGB', values: rgb255 };
    this.#render(this.converter.fromRgb255(rgb255));
  }

  onComponentChanged(model, index, value) {
    if (this.busy) return;

    // В View пользователь меняет целое число, но остальные координаты этой
    // модели берутся из последнего точного результата, а не из округленных полей.
    // Поэтому округление отображения не накапливает ошибку в вычислениях.
    const values = this.#exactValuesFor(model);
    values[index] = value;

    this.currentSource = { model, values: [...values] };
    this.#render(this.#convert(model, values));
  }

  #exactValuesFor(model) {
    if (!this.currentResult) return this.view.getModelValues(model);

    if (model === 'RGB') return this.currentResult.rgb.map((channel) => channel * 255);
    if (model === 'HSV') return [...this.currentResult.hsv];
    if (model === 'LAB') return [...this.currentResult.lab];
    throw new Error(`Неизвестная модель: ${model}`);
  }

  #convert(model, values) {
    if (model === 'RGB') return this.converter.fromRgb255(values);
    if (model === 'HSV') return this.converter.fromHsv(values);
    if (model === 'LAB') return this.converter.fromLab(values);
    throw new Error(`Неизвестная модель: ${model}`);
  }

  #renderFromCurrentSource() {
    const { model, values } = this.currentSource;
    this.#render(this.#convert(model, values));
  }

  #render(result) {
    // Сохраняем результат ДО округления отображаемых полей.
    this.currentResult = result;

    this.busy = true;
    try {
      // Только View получает округленные значения. result.rgb / hsv / lab
      // остаются исходными double-значениями для последующих вычислений.
      this.view.setModelValues('RGB', result.rgb.map((channel) => channel * 255));
      this.view.setModelValues('HSV', result.hsv);
      this.view.setModelValues('LAB', result.lab);

      const hex = rgbToHex(result.rgb);
      this.view.setPreview(hex);
      this.view.setDiagnostics({
        whitePoint: this.converter.context.whitePoint,
        xyz: result.xyz,
        matrix: this.converter.context.rgbToXyzMatrix,
      });

      if (result.outOfGamut) {
        const raw = result.rawLinearRgb.map((v) => v.toFixed(4)).join(', ');
        this.view.setStatus(
          `LAB-цвет выходит за gamut sRGB. Применено: ${this.converter.settings.gamutStrategy}. Линейный RGB до коррекции: (${raw}).`,
          true,
        );
      } else {
        this.view.setStatus('Цвет находится внутри gamut sRGB.', false);
      }
    } finally {
      this.busy = false;
    }

    this.#scheduleGradients();
  }

  #scheduleGradients() {
    if (this.gradientFrame !== null) cancelAnimationFrame(this.gradientFrame);
    this.gradientFrame = requestAnimationFrame(() => {
      this.gradientFrame = null;
      this.#redrawGradients();
    });
  }

  #redrawGradients() {
    const STEPS = 32;
    for (const [modelName, modelSpec] of Object.entries(MODEL_SPECS)) {
      // Градиенты также строятся от истинных координат текущего цвета,
      // а не от округленных чисел, показанных пользователю.
      const values = this.#exactValuesFor(modelName);

      modelSpec.components.forEach((componentSpec, componentIndex) => {
        const colors = [];
        for (let step = 0; step <= STEPS; step += 1) {
          const t = step / STEPS;
          const sampleValue = componentSpec.min + (componentSpec.max - componentSpec.min) * t;
          const rgb = this.converter.gradientRgb(modelName, values, componentIndex, sampleValue);
          colors.push(rgbToHex(rgb));
        }
        this.view.setGradient(modelName, componentIndex, colors);
      });
    }
  }
}
