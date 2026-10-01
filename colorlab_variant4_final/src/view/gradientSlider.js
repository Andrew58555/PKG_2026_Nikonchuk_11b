/** Небольшая обертка над <input type="range"> для динамического цветного трека. */
export class GradientSlider {
  constructor(input) {
    this.input = input;
  }

  setGradient(colors) {
    if (!colors.length) return;
    const last = colors.length - 1;
    const stops = colors.map((color, index) => `${color} ${(index / last) * 100}%`);
    this.input.style.background = `linear-gradient(90deg, ${stops.join(', ')})`;
  }
}
