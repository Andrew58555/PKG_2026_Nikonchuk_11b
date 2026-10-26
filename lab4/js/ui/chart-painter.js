const NS = 'http://www.w3.org/2000/svg';

function node(name, attrs = {}, text = '') {
  const el = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attrs)) el.setAttribute(key, String(value));
  if (text) el.textContent = text;
  return el;
}

export function renderLineChart(svg, series, options = {}) {
  svg.replaceChildren();
  const width = Number(svg.getAttribute('width')) || 760;
  const height = Number(svg.getAttribute('height')) || 320;
  const pad = { left: 58, right: 20, top: 22, bottom: 48 };
  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) return;

  const xMin = Math.min(...allPoints.map((p) => p.x));
  const xMax = Math.max(...allPoints.map((p) => p.x));
  const yMin = 0;
  const yMaxRaw = Math.max(...allPoints.map((p) => p.y), 1);
  const yMax = yMaxRaw * 1.12;

  const sx = (x) => pad.left + ((x - xMin) / Math.max(1, xMax - xMin)) * (width - pad.left - pad.right);
  const sy = (y) => height - pad.bottom - ((y - yMin) / Math.max(1, yMax - yMin)) * (height - pad.top - pad.bottom);

  const root = node('g');
  svg.appendChild(root);
  root.appendChild(node('rect', { x: 0, y: 0, width, height, fill: '#fff' }));

  for (let i = 0; i <= 5; i += 1) {
    const y = (yMax / 5) * i;
    const py = sy(y);
    root.appendChild(node('line', { x1: pad.left, y1: py, x2: width - pad.right, y2: py, stroke: '#e2e8f0', 'stroke-width': 1 }));
    root.appendChild(node('text', { x: pad.left - 8, y: py + 4, 'text-anchor': 'end', 'font-size': 11, fill: '#64748b' }, y.toFixed(yMax < 10 ? 1 : 0)));
  }

  const xTicks = [...new Set(allPoints.map((p) => p.x))].sort((a, b) => a - b);
  for (const x of xTicks) {
    const px = sx(x);
    root.appendChild(node('line', { x1: px, y1: pad.top, x2: px, y2: height - pad.bottom, stroke: '#f1f5f9', 'stroke-width': 1 }));
    root.appendChild(node('text', { x: px, y: height - pad.bottom + 18, 'text-anchor': 'middle', 'font-size': 11, fill: '#64748b' }, options.formatX ? options.formatX(x) : String(x)));
  }

  root.appendChild(node('line', { x1: pad.left, y1: pad.top, x2: pad.left, y2: height - pad.bottom, stroke: '#64748b', 'stroke-width': 1.2 }));
  root.appendChild(node('line', { x1: pad.left, y1: height - pad.bottom, x2: width - pad.right, y2: height - pad.bottom, stroke: '#64748b', 'stroke-width': 1.2 }));

  const colors = ['#2563eb', '#059669', '#dc2626', '#7c3aed', '#d97706'];
  series.forEach((item, index) => {
    const color = colors[index % colors.length];
    const points = item.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ');
    root.appendChild(node('polyline', { points, fill: 'none', stroke: color, 'stroke-width': 2.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    item.points.forEach((p) => root.appendChild(node('circle', { cx: sx(p.x), cy: sy(p.y), r: 3.5, fill: color })));
  });

  const legend = node('g');
  series.forEach((item, index) => {
    const x = pad.left + index * 145;
    const color = colors[index % colors.length];
    legend.appendChild(node('rect', { x, y: 6, width: 16, height: 4, rx: 2, fill: color }));
    legend.appendChild(node('text', { x: x + 22, y: 12, 'font-size': 11, fill: '#334155' }, item.name));
  });
  root.appendChild(legend);

  root.appendChild(node('text', { x: width / 2, y: height - 7, 'text-anchor': 'middle', 'font-size': 12, fill: '#334155' }, options.xLabel || 'X'));
  const yLabel = node('text', { x: 14, y: height / 2, 'text-anchor': 'middle', 'font-size': 12, fill: '#334155', transform: `rotate(-90 14 ${height / 2})` }, options.yLabel || 'мс');
  root.appendChild(yLabel);
}
