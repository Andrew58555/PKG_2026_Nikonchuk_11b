import { clamp } from './matrix.js';
import { buildRgbXyzContext, ILLUMINANTS } from './illuminants.js';
import { hsvToRgb, rgbToHsv } from './hsv.js';
import { labToXyz, xyzToLab } from './lab.js';
import { rgbToXyz, xyzToRgb } from './rgbXyz.js';

export const GAMUT_STRATEGIES = Object.freeze(['Clipping', 'Scaling']);

export class ColorConverter {
  constructor({ illuminantName = 'D65', gamutStrategy = 'Clipping' } = {}) {
    this.settings = { illuminantName: '', gamutStrategy: '' };
    this.context = null;
    this.setIlluminant(illuminantName);
    this.setGamutStrategy(gamutStrategy);
  }

  setIlluminant(name) {
    if (!ILLUMINANTS[name]) throw new Error(`Неизвестный источник освещения: ${name}`);
    this.settings.illuminantName = name;
    // Ключевое требование: матрица пересчитывается именно в момент смены стандарта.
    this.context = buildRgbXyzContext(name);
  }

  setGamutStrategy(strategy) {
    if (!GAMUT_STRATEGIES.includes(strategy)) throw new Error(`Неизвестная стратегия: ${strategy}`);
    this.settings.gamutStrategy = strategy;
  }

  fromRgb(rgb) {
    const safeRgb = rgb.map((value) => clamp(value));
    const xyz = rgbToXyz(safeRgb, this.context);
    return {
      rgb: safeRgb,
      hsv: rgbToHsv(safeRgb),
      xyz,
      lab: xyzToLab(xyz, this.context.whitePoint),
      outOfGamut: false,
      rawLinearRgb: null,
    };
  }

  fromRgb255(rgb255) {
    return this.fromRgb(rgb255.map((value) => clamp(value, 0, 255) / 255));
  }

  fromHsv(hsv) {
    const normalizedHsv = [
      ((hsv[0] % 360) + 360) % 360,
      clamp(hsv[1], 0, 100),
      clamp(hsv[2], 0, 100),
    ];
    const result = this.fromRgb(hsvToRgb(normalizedHsv));
    result.hsv = normalizedHsv;
    return result;
  }

  fromLab(lab) {
    const normalizedLab = [
      clamp(lab[0], 0, 100),
      clamp(lab[1], -128, 127),
      clamp(lab[2], -128, 127),
    ];
    const xyz = labToXyz(normalizedLab, this.context.whitePoint);
    const gamutResult = xyzToRgb(xyz, this.context, this.settings.gamutStrategy);
    const result = this.fromRgb(gamutResult.rgb);

    // Сохраняем именно введенные LAB/XYZ, даже если RGB пришлось скорректировать.
    result.lab = normalizedLab;
    result.xyz = xyz;
    result.outOfGamut = gamutResult.outOfGamut;
    result.rawLinearRgb = gamutResult.rawLinearRgb;
    return result;
  }

  /** Возвращает RGB [0..1] для одной точки динамического градиента. */
  gradientRgb(model, values, componentIndex, sampleValue) {
    const sample = [...values];
    sample[componentIndex] = sampleValue;

    if (model === 'RGB') return sample.map((value) => clamp(value, 0, 255) / 255);
    if (model === 'HSV') return hsvToRgb(sample);
    if (model === 'LAB') {
      const xyz = labToXyz(sample, this.context.whitePoint);
      return xyzToRgb(xyz, this.context, this.settings.gamutStrategy).rgb;
    }
    throw new Error(`Неизвестная модель: ${model}`);
  }
}

export function rgbTo255(rgb) {
  return rgb.map((value) => Math.round(clamp(value) * 255));
}

export function rgbToHex(rgb) {
  return `#${rgbTo255(rgb).map((value) => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function hexToRgb255(hex) {
  const normalized = hex.replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) throw new Error('Некорректный HEX-цвет.');
  return [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
}
