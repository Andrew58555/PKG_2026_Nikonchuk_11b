export class VirtualGrid {
  constructor(width = 81, height = 61) {
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 3 || height < 3) {
      throw new Error('VirtualGrid: width и height должны быть целыми числами >= 3');
    }

    this.width = width;
    this.height = height;
    this.originX = Math.floor(width / 2);
    this.originY = Math.floor(height / 2);
    this.rows = Array.from({ length: height }, () => new Float32Array(width));
    this.writeCount = 0;
  }

  clear() {
    for (const row of this.rows) row.fill(0);
    this.writeCount = 0;
  }

  inBounds(x, y) {
    const column = x + this.originX;
    const row = this.originY - y;
    return column >= 0 && column < this.width && row >= 0 && row < this.height;
  }

  setPixel(x, y, intensity = 1) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`SetPixel принимает только целые координаты, получено (${x}, ${y})`);
    }

    const column = x + this.originX;
    const row = this.originY - y;
    if (column < 0 || column >= this.width || row < 0 || row >= this.height) return false;

    const value = Math.max(0, Math.min(1, Number(intensity)));
    if (value > this.rows[row][column]) this.rows[row][column] = value;
    this.writeCount += 1;
    return true;
  }

  getPixel(x, y) {
    const column = x + this.originX;
    const row = this.originY - y;
    if (column < 0 || column >= this.width || row < 0 || row >= this.height) return 0;
    return this.rows[row][column];
  }

  countLitPixels() {
    let count = 0;
    for (const row of this.rows) {
      for (let x = 0; x < row.length; x += 1) {
        if (row[x] > 0) count += 1;
      }
    }
    return count;
  }

  getBounds() {
    return {
      minX: -this.originX,
      maxX: this.width - this.originX - 1,
      minY: -(this.height - this.originY - 1),
      maxY: this.originY,
    };
  }
}
