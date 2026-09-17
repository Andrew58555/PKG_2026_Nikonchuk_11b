import { MODEL_SPECS } from '../config/modelSpecs.js';
import { hexToRgb255, rgbTo255, rgbToHex } from '../model/converter.js';

export class ColorController {
  constructor(view, converter) {
    this.view = view;
    this.converter = converter;
    this.busy = false;
    this.gradientFrame = null;

    // Храним исходное представление, чтобы смена Clipping/Scaling могла
    // заново примениться к тому же LAB, а не к уже скорректированному RGB.
    this.currentSource = { model: 'RGB', values: [255, 0, 0] };
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
    this.#render(this.converter.fromRgb255(rgb255), null);
  }

  onComponentChanged(model, index, value) {
    if (this.busy) return;
    const values = this.view.getModelValues(model);
    values[index] = value;
    this.currentSource = { model, values: [...values] };
    this.#render(this.#convert(model, values), model);
  }

  #convert(model, values) {
    if (model === 'RGB') return this.converter.fromRgb255(values);
    if (model === 'HSV') return this.converter.fromHsv(values);
    if (model === 'LAB') return this.converter.fromLab(values);
    throw new Error(`Неизвестная модель: ${model}`);
  }

  #renderFromCurrentSource() {
    const { model, values } = this.currentSource;
    this.#render(this.#convert(model, values), model);
  }

  #render(result, preserveModel) {
    this.busy = true;
    try {
      const rgb255 = rgbTo255(result.rgb);
      if (preserveModel !== 'RGB') this.view.setModelValues('RGB', rgb255);
      if (preserveModel !== 'HSV') this.view.setModelValues('HSV', result.hsv);
      if (preserveModel !== 'LAB') this.view.setModelValues('LAB', result.lab);

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
      const values = this.view.getModelValues(modelName);

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
