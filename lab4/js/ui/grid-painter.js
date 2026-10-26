export class GridPainter {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cellSize = options.cellSize ?? 18;
    this.marginLeft = 42;
    this.marginTop = 24;
    this.marginRight = 18;
    this.marginBottom = 34;
  }

  setCellSize(size) {
    this.cellSize = Math.max(8, Math.min(36, Math.trunc(size)));
  }

  paint(grid) {
    const ctx = this.ctx;
    const cell = this.cellSize;
    const width = this.marginLeft + grid.width * cell + this.marginRight;
    const height = this.marginTop + grid.height * cell + this.marginBottom;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const gridX = this.marginLeft;
    const gridY = this.marginTop;
    const gridW = grid.width * cell;
    const gridH = grid.height * cell;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(gridX, gridY, gridW, gridH);

    // Линии сетки рисуются как тонкие прямоугольники. Алгоритмы примитивов
    // никогда не вызывают canvas line/arc: UI лишь отображает VirtualGrid.
    ctx.fillStyle = '#e2e8f0';
    for (let c = 0; c <= grid.width; c += 1) {
      ctx.fillRect(gridX + c * cell, gridY, 1, gridH);
    }
    for (let r = 0; r <= grid.height; r += 1) {
      ctx.fillRect(gridX, gridY + r * cell, gridW, 1);
    }

    const axisX = gridX + (grid.originX + 0.5) * cell;
    const axisY = gridY + (grid.originY + 0.5) * cell;
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(Math.round(axisX), gridY, 2, gridH);
    ctx.fillRect(gridX, Math.round(axisY), gridW, 2);

    for (let row = 0; row < grid.height; row += 1) {
      for (let column = 0; column < grid.width; column += 1) {
        const intensity = grid.rows[row][column];
        if (intensity <= 0) continue;
        ctx.fillStyle = `rgba(37, 99, 235, ${Math.max(0.08, intensity)})`;
        ctx.fillRect(
          gridX + column * cell + 1,
          gridY + row * cell + 1,
          Math.max(1, cell - 1),
          Math.max(1, cell - 1),
        );
      }
    }

    const labelEvery = cell >= 18 ? 5 : 10;
    ctx.fillStyle = '#475569';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const bounds = grid.getBounds();
    for (let x = Math.ceil(bounds.minX / labelEvery) * labelEvery; x <= bounds.maxX; x += labelEvery) {
      const px = gridX + (x + grid.originX + 0.5) * cell;
      ctx.fillText(String(x), px, gridY + gridH + 7);
    }

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let y = Math.ceil(bounds.minY / labelEvery) * labelEvery; y <= bounds.maxY; y += labelEvery) {
      const py = gridY + (grid.originY - y + 0.5) * cell;
      ctx.fillText(String(y), gridX - 8, py);
    }

    ctx.fillStyle = '#0f172a';
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('x', gridX + gridW + 4, axisY);
    ctx.fillText('y', axisX + 6, gridY - 10);
  }
}
