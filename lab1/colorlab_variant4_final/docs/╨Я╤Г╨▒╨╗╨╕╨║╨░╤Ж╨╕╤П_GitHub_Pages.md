# Публикация проекта на GitHub Pages

Проект является полностью статическим: HTML, CSS и JavaScript. Сборка не требуется. GitHub Pages может отдавать его напрямую.

## 1. Создать репозиторий

1. На GitHub создать новый **public**-репозиторий, например `colorlab-variant4`.
2. Загрузить в корень репозитория **содержимое** папки проекта: `index.html`, `src`, `styles`, `tests`, `docs`, `.nojekyll` и остальные файлы.
3. Убедиться, что `index.html` лежит в корне репозитория, а не во вложенной папке.

## 2. Включить GitHub Pages

1. Открыть репозиторий -> **Settings** -> **Pages**.
2. В блоке **Build and deployment** выбрать **Deploy from a branch**.
3. Branch: `main`, folder: `/(root)`.
4. Нажать **Save**.
5. Подождать публикацию. GitHub покажет готовую ссылку.

Обычно адрес имеет вид:

```text
https://USERNAME.github.io/REPOSITORY/
```

Например, если пользователь `student123`, а репозиторий `colorlab-variant4`:

```text
https://student123.github.io/colorlab-variant4/
```

## 3. Проверить опубликованную версию

Основное приложение:

```text
https://USERNAME.github.io/REPOSITORY/
```

Браузерные автотесты:

```text
https://USERNAME.github.io/REPOSITORY/tests/
```

На странице тестов должно быть:

```text
Всего: 28
Успешно: 28
Ошибок: 0
```

## 4. Локальный запуск без Node.js

Из корня проекта:

```bash
python -m http.server 8000
```

Затем открыть:

```text
http://localhost:8000/
http://localhost:8000/tests/
```

Python используется только как статический HTTP-сервер. Все расчеты приложения выполняются JavaScript-кодом в браузере.
