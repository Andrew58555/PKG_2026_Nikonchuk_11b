# Лабораторная работа №4 — Базовые растровые алгоритмы

Статическое веб-приложение без сборщика и сторонних библиотек. Готово для GitHub Pages.

## Реализовано

- пошаговый алгоритм линии;
- ЦДА (DDA);
- обобщённый Брезенхем для линии — все 8 октантов;
- Брезенхем для окружности;
- Xiaolin Wu с реальной интенсивностью двух соседних пикселей;
- целочисленная коника Castle–Piteway / Pitteway-style midpoint ellipse;
- VirtualGrid: алгоритмы работают только через `setPixel(x, y, intensity)`;
- GridPainter: отдельно отображает сетку, оси, подписи и увеличенные пиксели;
- автоматический benchmark: 100 000 линий + 50 000 окружностей;
- графики зависимости времени от количества примитивов и длины линий;
- встроенные проверки всех 8 октантов и симметрии;
- `report.html` — сопроводительная документация.

## Структура

```text
lab4/
├── index.html
├── report.html
├── README.md
├── REPORT.md
├── css/
│   └── style.css
└── js/
    ├── app.js
    ├── core/
    │   ├── raster-engine.js
    │   └── virtual-grid.js
    ├── ui/
    │   ├── grid-painter.js
    │   └── chart-painter.js
    ├── benchmark/
    │   ├── benchmark-core.js
    │   └── benchmark.worker.js
    └── tests/
        └── self-test.js
```

## GitHub Pages

Если репозиторий уже опубликован через Pages, достаточно положить эту папку как `lab4/` в корень репозитория. Адрес будет примерно:

```text
https://USERNAME.github.io/REPOSITORY/lab4/
```

Если Pages ещё не включён:

1. GitHub → **Settings** → **Pages**.
2. Source: **Deploy from a branch**.
3. Branch: `main`, folder: `/ (root)`.
4. Сохранить настройки.
5. Открыть `/lab4/` в опубликованном сайте.

## Важно для защиты

Главное архитектурное правило: `RasterEngine` не знает о Canvas и не рисует линии/окружности браузерными примитивами. Он только вызывает `VirtualGrid.setPixel()`. Canvas используется только `GridPainter` для показа уже готовой матрицы.
