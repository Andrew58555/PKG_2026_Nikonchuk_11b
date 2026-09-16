import { GradientSlider } from './gradientSlider.js';

import { MODEL_SPECS } from '../config/modelSpecs.js';

function clampToSpec(value, spec) {
  return Math.min(spec.max, Math.max(spec.min, value));
}

export class AppView {
  constructor() {
    this.onComponentChanged = null;
    this.onPaletteSelected = null;
    this.onSettingsChanged = null;

    this.modelsGrid = document.querySelector('#modelsGrid');
    this.illuminantSelect = document.querySelector('#illuminantSelect');
    this.gamutSelect = document.querySelector('#gamutSelect');
    this.colorPreview = document.querySelector('#colorPreview');
    this.hexValue = document.querySelector('#hexValue');
    this.statusMessage = document.querySelector('#statusMessage');
    this.whitePointValue = document.querySelector('#whitePointValue');
    this.xyzValue = document.querySelector('#xyzValue');
    this.matrixValue = document.querySelector('#matrixValue');

    this.panels = new Map();
    this.#buildPanels();
    this.#bindSettings();
  }

  #buildPanels() {
    for (const [modelName, modelSpec] of Object.entries(MODEL_SPECS)) {
      const panel = document.createElement('article');
      panel.className = 'model-panel card';
      panel.dataset.model = modelName;

      const header = document.createElement('div');
      header.className = 'model-header';
      header.innerHTML = `
        <div>
          <p class="eyebrow">Модель</p>
          <h3>${modelName}</h3>
          <p class="model-description">${modelSpec.description}</p>
        </div>
      `;

      const paletteWrap = document.createElement('div');
      paletteWrap.className = 'palette-wrap';
      const paletteLabel = document.createElement('span');
      paletteLabel.className = 'palette-label';
      paletteLabel.textContent = 'Палитра';
      const paletteInput = document.createElement('input');
      paletteInput.type = 'color';
      paletteInput.value = '#ff0000';
      paletteInput.setAttribute('aria-label', `Выбрать цвет из палитры для ${modelName}`);
      paletteInput.addEventListener('input', () => this.onPaletteSelected?.(paletteInput.value));
      paletteWrap.append(paletteLabel, paletteInput);
      header.append(paletteWrap);
      panel.append(header);

      const componentControls = [];
      modelSpec.components.forEach((componentSpec, componentIndex) => {
        const row = document.createElement('div');
        row.className = 'component-row';

        const name = document.createElement('label');
        name.className = 'component-name';
        name.textContent = componentSpec.name;

        const range = document.createElement('input');
        range.className = 'gradient-range';
        range.type = 'range';
        range.min = String(componentSpec.min);
        range.max = String(componentSpec.max);
        range.step = String(componentSpec.step);
        range.value = String(componentSpec.min);
        range.setAttribute('aria-label', `${modelName} ${componentSpec.name}`);

        const exact = document.createElement('input');
        exact.className = 'component-input';
        exact.type = 'number';
        exact.min = String(componentSpec.min);
        exact.max = String(componentSpec.max);
        exact.step = String(componentSpec.step);
        exact.value = String(componentSpec.min);
        exact.setAttribute('aria-label', `Точное значение ${modelName} ${componentSpec.name}`);

        const commit = (rawValue) => {
          const parsed = Number(String(rawValue).replace(',', '.'));
          if (!Number.isFinite(parsed)) {
            this.#syncOneControl(modelName, componentIndex, Number(range.value));
            return;
          }
          const value = clampToSpec(parsed, componentSpec);
          this.#syncOneControl(modelName, componentIndex, value);
          this.onComponentChanged?.(modelName, componentIndex, value);
        };

        range.addEventListener('input', () => commit(range.value));
        exact.addEventListener('change', () => commit(exact.value));
        exact.addEventListener('keydown', (event) => {
          if (event.key === 'Enter') exact.blur();
        });

        row.append(name, range, exact);
        panel.append(row);
        componentControls.push({ range, exact, gradient: new GradientSlider(range), spec: componentSpec });
      });

      this.modelsGrid.append(panel);
      this.panels.set(modelName, { element: panel, paletteInput, componentControls });
    }
  }

  #bindSettings() {
    const notify = () => this.onSettingsChanged?.(this.getSettings());
    this.illuminantSelect.addEventListener('change', notify);
    this.gamutSelect.addEventListener('change', notify);
  }

  #syncOneControl(modelName, componentIndex, value) {
    const control = this.panels.get(modelName).componentControls[componentIndex];
    control.range.value = String(value);
    control.exact.value = value.toFixed(control.spec.decimals);
  }

  getSettings() {
    return {
      illuminantName: this.illuminantSelect.value,
      gamutStrategy: this.gamutSelect.value,
    };
  }

  getModelValues(modelName) {
    return this.panels.get(modelName).componentControls.map((control) => Number(control.exact.value));
  }

  setModelValues(modelName, values) {
    values.forEach((value, index) => this.#syncOneControl(modelName, index, value));
  }

  setPaletteColor(hex) {
    for (const panel of this.panels.values()) panel.paletteInput.value = hex;
  }

  setGradient(modelName, componentIndex, colors) {
    this.panels.get(modelName).componentControls[componentIndex].gradient.setGradient(colors);
  }

  setPreview(hex) {
    this.colorPreview.style.background = hex;
    this.hexValue.textContent = hex;
    this.setPaletteColor(hex);
  }

  setStatus(message, warning = false) {
    this.statusMessage.textContent = message;
    this.statusMessage.dataset.state = warning ? 'warning' : 'ok';
  }

  setDiagnostics({ whitePoint, xyz, matrix }) {
    this.whitePointValue.textContent = `(${whitePoint.map((v) => v.toFixed(4)).join(', ')})`;
    this.xyzValue.textContent = `(${xyz.map((v) => v.toFixed(4)).join(', ')})`;
    this.matrixValue.textContent = matrix
      .map((row) => `[ ${row.map((v) => v.toFixed(7).padStart(11, ' ')).join('  ')} ]`)
      .join('\n');
  }
}
