import { VirtualGrid } from './core/virtual-grid.js';
import { RasterEngine } from './core/raster-engine.js';
import { GridPainter } from './ui/grid-painter.js';
import { renderLineChart } from './ui/chart-painter.js';
import { runSelfTests } from './tests/self-test.js';

const $ = (selector) => document.querySelector(selector);
const grid = new VirtualGrid(81, 61);
const painter = new GridPainter($('#gridCanvas'), { cellSize: Number($('#zoom').value) });
let benchmarkData = null;
let benchmarkWorker = null;

const algorithmInfo = {
  stepLine: ['Пошаговый алгоритм', 'Подстановка целой ведущей координаты в уравнение прямой и округление второй координаты.'],
  ddaLine: ['ЦДА (DDA)', 'На каждом шаге прибавляются дробные приращения Δx/steps и Δy/steps.'],
  bresenhamLine: ['Брезенхем — отрезок', 'Обобщённая целочисленная ошибка работает во всех 8 октантах.'],
  bresenhamCircle: ['Брезенхем — окружность', 'Рассчитывается один октант, остальные точки получаются симметрией.'],
  wuLine: ['Ву — сглаженная линия', 'Дробная часть координаты задаёт интенсивность двух соседних пикселей.'],
  castlePitewayEllipse: ['Castle–Piteway — коника', 'Инкрементный midpoint-критерий для эллипса; решающие переменные масштабированы для целочисленного цикла.'],
};

function readInt(id) {
  return Math.trunc(Number($(id).value));
}

function updateInputVisibility() {
  const algorithm = $('#algorithm').value;
  $('#lineInputs').classList.toggle('hidden', ['bresenhamCircle', 'castlePitewayEllipse'].includes(algorithm));
  $('#circleInputs').classList.toggle('hidden', algorithm !== 'bresenhamCircle');
  $('#ellipseInputs').classList.toggle('hidden', algorithm !== 'castlePitewayEllipse');
  const [title, hint] = algorithmInfo[algorithm];
  $('#algorithmTitle').textContent = title;
  $('#algorithmHint').textContent = hint;
}

function drawCurrent() {
  grid.clear();
  const trace = [];
  const algorithm = $('#algorithm').value;
  const capture = (row) => { if (trace.length < 220) trace.push(row); };

  if (['stepLine', 'ddaLine', 'bresenhamLine', 'wuLine'].includes(algorithm)) {
    RasterEngine[algorithm](grid, readInt('#x0'), readInt('#y0'), readInt('#x1'), readInt('#y1'), capture);
  } else if (algorithm === 'bresenhamCircle') {
    RasterEngine.bresenhamCircle(grid, readInt('#circleX'), readInt('#circleY'), readInt('#radius'), capture);
  } else {
    RasterEngine.castlePitewayEllipse(grid, readInt('#ellipseX'), readInt('#ellipseY'), readInt('#rx'), readInt('#ry'), capture);
  }

  painter.paint(grid);
  $('#litPixels').textContent = grid.countLitPixels().toLocaleString('ru-RU');
  $('#writeCount').textContent = grid.writeCount.toLocaleString('ru-RU');
  renderTrace(algorithm, trace);
}

function renderTrace(algorithm, rows) {
  const head = $('#traceHead');
  const body = $('#traceBody');
  const intro = $('#traceIntro');
  const note = $('#traceNote');
  body.replaceChildren();

  let columns = [];
  if (algorithm === 'stepLine') {
    columns = [['i','Шаг'], ['x','x'], ['y','y'], ['real','Вычисленное'], ['formula','Формула']];
    intro.textContent = 'Ведущая координата меняется на 1. Вторая координата вычисляется из уравнения прямой и округляется до центра ближайшей ячейки.';
  } else if (algorithm === 'ddaLine') {
    columns = [['i','Шаг'], ['xReal','x (real)'], ['yReal','y (real)'], ['x','pixel x'], ['y','pixel y']];
    intro.textContent = 'ЦДА сначала вычисляет число шагов, затем дробные приращения. Перед SetPixel текущие x и y округляются.';
  } else if (algorithm === 'bresenhamLine') {
    columns = [['i','Шаг'], ['x','x'], ['y','y'], ['err','err'], ['e2','2·err']];
    intro.textContent = 'Ошибка err показывает положение идеальной прямой относительно ближайших растровых узлов. Два сравнения определяют шаг по x и/или y.';
  } else if (algorithm === 'bresenhamCircle') {
    columns = [['i','Шаг'], ['x','x'], ['y','y'], ['d','d']];
    intro.textContent = 'Вычисляется только один октант. Для каждой пары (x, y) в VirtualGrid ставятся восемь симметричных точек.';
  } else if (algorithm === 'wuLine') {
    columns = [['i','Запись'], ['x','x'], ['y','y'], ['intensity','Alpha']];
    intro.textContent = 'Для каждой ведущей координаты два соседних пикселя получают взаимодополняющие интенсивности. Поэтому граница визуально сглаживается.';
  } else {
    columns = [['i','Шаг'], ['region','Область'], ['x','x'], ['y','y'], ['p','P'], ['dx','Δx'], ['dy','Δy']];
    intro.textContent = 'Эллипс делится на две области по наклону касательной. Решающий параметр P выбирает соседнюю ячейку, а симметрия даёт остальные квадранты.';
  }

  head.innerHTML = `<tr>${columns.map(([, title]) => `<th>${title}</th>`).join('')}</tr>`;
  for (const row of rows) {
    const tr = document.createElement('tr');
    for (const [key] of columns) {
      const td = document.createElement('td');
      const value = row[key];
      td.textContent = typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(4) : String(value ?? '');
      tr.appendChild(td);
    }
    body.appendChild(tr);
  }
  note.textContent = rows.length >= 220 ? 'Показаны первые 220 записей, чтобы таблица оставалась удобной.' : `Показано записей: ${rows.length}.`;
}

function loadExample() {
  const algorithm = $('#algorithm').value;
  const examples = {
    stepLine: [-14, -5, 19, 8],
    ddaLine: [-9, 12, 15, -7],
    bresenhamLine: [-6, -3, 7, 5],
    wuLine: [-16, -8, 17, 6],
  };
  if (examples[algorithm]) {
    const [x0, y0, x1, y1] = examples[algorithm];
    $('#x0').value = x0; $('#y0').value = y0; $('#x1').value = x1; $('#y1').value = y1;
  } else if (algorithm === 'bresenhamCircle') {
    $('#circleX').value = 0; $('#circleY').value = 0; $('#radius').value = 13;
  } else {
    $('#ellipseX').value = 0; $('#ellipseY').value = 0; $('#rx').value = 18; $('#ry').value = 10;
  }
  drawCurrent();
}

function clearGrid() {
  grid.clear();
  painter.paint(grid);
  $('#litPixels').textContent = '0';
  $('#writeCount').textContent = '0';
  $('#traceBody').replaceChildren();
  $('#traceIntro').textContent = 'Выберите параметры и нажмите «Построить».';
  $('#traceNote').textContent = '';
}

function formatMs(value) {
  return `${value.toFixed(value < 10 ? 2 : 1)} мс`;
}

function renderBenchmark(result) {
  benchmarkData = result;
  $('#benchmarkResults').classList.remove('hidden');
  $('#step100k').textContent = formatMs(result.summary.step100k);
  $('#dda100k').textContent = formatMs(result.summary.dda100k);
  $('#bres100k').textContent = formatMs(result.summary.bresenham100k);
  $('#wu100k').textContent = formatMs(result.summary.wu100k);
  $('#circles50k').textContent = formatMs(result.summary.circles50k);

  const countSeries = Object.entries(result.lineByCount).map(([name, points]) => ({
    name,
    points: points.map((p) => ({ x: p.count, y: p.ms })),
  }));
  renderLineChart($('#countChart'), countSeries, {
    xLabel: 'Количество отрезков', yLabel: 'Время, мс', formatX: (x) => `${x / 1000}k`,
  });

  const lengthSeries = Object.entries(result.lineByLength).map(([name, points]) => ({
    name,
    points: points.map((p) => ({ x: p.length, y: p.ms })),
  }));
  renderLineChart($('#lengthChart'), lengthSeries, { xLabel: 'Длина ведущей координаты, px', yLabel: 'Время, мс' });

  renderLineChart($('#circleChart'), [{
    name: 'Брезенхем — окружность',
    points: result.circleByCount.map((p) => ({ x: p.count, y: p.ms })),
  }], { xLabel: 'Количество окружностей', yLabel: 'Время, мс', formatX: (x) => `${x / 1000}k` });

  const ratio = result.summary.ddaToBresenhamRatio;
  const comparison = ratio >= 1
    ? `В этом запуске ЦДА занял в ${ratio.toFixed(2)} раза больше времени, чем Брезенхем.`
    : `В этом конкретном запуске JIT браузера дал отношение ЦДА/Брезенхем ${ratio.toFixed(2)}; график длины показывает фактическое поведение на этом устройстве.`;
  $('#benchmarkAnalysis').textContent = `${comparison} Причина ожидаемого преимущества Брезенхема — во внутреннем цикле он использует целочисленные сложения, вычитания и сравнения, тогда как ЦДА на каждом шаге поддерживает дробные координаты и выполняет округление перед записью пикселя. Оба алгоритма имеют O(L), но константные затраты различаются.`;
}

function runBenchmark() {
  if (benchmarkWorker) benchmarkWorker.terminate();
  benchmarkWorker = new Worker('./js/benchmark/benchmark.worker.js', { type: 'module' });
  $('#benchmarkButton').disabled = true;
  $('#benchmarkProgressBox').classList.remove('hidden');
  $('#benchmarkProgress').value = 0;
  $('#benchmarkPercent').textContent = '0%';
  $('#benchmarkStatus').textContent = 'Прогрев JIT и подготовка тестовых данных...';

  benchmarkWorker.onmessage = (event) => {
    if (event.data?.type === 'progress') {
      const { progress } = event.data;
      $('#benchmarkProgress').value = progress.percent;
      $('#benchmarkPercent').textContent = `${progress.percent}%`;
      $('#benchmarkStatus').textContent = progress.label;
    } else if (event.data?.type === 'done') {
      $('#benchmarkButton').disabled = false;
      $('#benchmarkStatus').textContent = 'Benchmark завершён';
      $('#benchmarkProgress').value = 100;
      $('#benchmarkPercent').textContent = '100%';
      renderBenchmark(event.data.result);
      benchmarkWorker.terminate();
      benchmarkWorker = null;
    } else if (event.data?.type === 'error') {
      $('#benchmarkButton').disabled = false;
      $('#benchmarkStatus').textContent = `Ошибка: ${event.data.message}`;
      benchmarkWorker.terminate();
      benchmarkWorker = null;
    }
  };
  benchmarkWorker.postMessage({ type: 'run' });
}

function exportBenchmarkCsv() {
  if (!benchmarkData) return;
  const rows = [['category', 'algorithm', 'x', 'milliseconds']];
  for (const [algorithm, points] of Object.entries(benchmarkData.lineByCount)) {
    points.forEach((p) => rows.push(['line_count', algorithm, p.count, p.ms.toFixed(4)]));
  }
  for (const [algorithm, points] of Object.entries(benchmarkData.lineByLength)) {
    points.forEach((p) => rows.push(['line_length', algorithm, p.length, p.ms.toFixed(4)]));
  }
  benchmarkData.circleByCount.forEach((p) => rows.push(['circle_count', 'Брезенхем — окружность', p.count, p.ms.toFixed(4)]));
  const csv = rows.map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(';')).join('\n');
  const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lab4_benchmark.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function runTests() {
  const result = runSelfTests();
  const box = $('#selfTestResult');
  box.classList.remove('ok', 'bad');
  box.classList.add(result.passed === result.total ? 'ok' : 'bad');
  const failed = result.tests.filter((t) => !t.ok);
  box.textContent = failed.length === 0
    ? `Пройдено ${result.passed}/${result.total} тестов. Все 8 октантов, симметрия окружности/эллипса и дробная интенсивность Wu проверены.`
    : `Пройдено ${result.passed}/${result.total}. Ошибки: ${failed.map((t) => t.name).join(', ')}.`;
}

$('#algorithm').addEventListener('change', () => { updateInputVisibility(); drawCurrent(); });
$('#drawButton').addEventListener('click', drawCurrent);
$('#exampleButton').addEventListener('click', loadExample);
$('#clearButton').addEventListener('click', clearGrid);
$('#zoom').addEventListener('input', () => {
  $('#zoomValue').textContent = `${$('#zoom').value} px`;
  painter.setCellSize(Number($('#zoom').value));
  painter.paint(grid);
});
$('#benchmarkButton').addEventListener('click', runBenchmark);
$('#exportBenchmark').addEventListener('click', exportBenchmarkCsv);
$('#selfTestButton').addEventListener('click', runTests);

updateInputVisibility();
drawCurrent();
