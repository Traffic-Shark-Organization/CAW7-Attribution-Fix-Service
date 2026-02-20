# CAW7 Attribution Fix Service

Минимальный веб-сервис для iOS WebView-сценария:
- приложение отправляет `HEAD` на URL сервиса и получает ответ от сервиса (без редиректа);
- при `GET` сервис делает редирект на целевой URL;
- все входящие query-параметры (кроме служебных) добавляются в целевой URL.

## Быстрый старт

```bash
npm install
npm test
npm start
```

Сервис по умолчанию стартует на `http://localhost:3000`.

## Эндпоинты

### `HEAD /redirect`

Проверяет корректность запроса и возвращает:
- `200 OK`, если запрос валиден;
- `X-Redirect-URL` с итоговой ссылкой редиректа;
- **без** `Location` и без фактического редиректа.

Если передать `head_redirect=true`, тогда `HEAD` будет вести себя как редирект:
- статус редиректа (`302` по умолчанию или значение `status`);
- заголовок `Location` с итоговым URL.

### `GET /redirect`

Выполняет редирект на вычисленную ссылку.

## Параметры запроса

- `target` (обязательный): абсолютный URL (`http` или `https`), куда редиректить.
- `status` (опциональный): код редиректа (`301`, `302`, `303`, `307`, `308`), по умолчанию `302`.
- `head_redirect` (опциональный): флаг для `HEAD`-режима (`true/false`, `1/0`, `yes/no`, `on/off`).
  - `false` (по умолчанию): `HEAD` не редиректит, отвечает `200` + `X-Redirect-URL`.
  - `true`: `HEAD` возвращает редирект (`Location` + статус).
- любые другие query-параметры: будут добавлены в `target`.

## Пример

Исходный запрос:

```text
GET /redirect?target=https%3A%2F%2Fexample.com%2Flanding&campaign=summer&click_id=abc123
```

Ответ:

```text
302 Location: https://example.com/landing?campaign=summer&click_id=abc123
```

Проверка итоговой ссылки без редиректа по `HEAD`:

```text
HEAD /redirect?target=https%3A%2F%2Fexample.com%2Flanding&campaign=summer
200 X-Redirect-URL: https://example.com/landing?campaign=summer
```

Проверка доступности по цепочке редиректов через `HEAD`:

```text
HEAD /redirect?target=https%3A%2F%2Fexample.com%2Flanding&head_redirect=true&status=307
307 Location: https://example.com/landing
```

## Безопасность

Опционально можно ограничить разрешенные домены назначения:

```bash
ALLOWED_REDIRECT_HOSTS=example.com,partners.example.org npm start
```

Если переменная задана, редирект разрешен только на указанные домены и их поддомены.

## Проверка здоровья

`GET /health` → `{ "status": "ok" }`

## Деплой на Render

В проект добавлен Blueprint-файл:

- `render.yaml`

Шаги:

1. Создайте Git-репозиторий для этой папки и запушьте код в GitHub/GitLab/Bitbucket.
2. Откройте Render Blueprint import:
   `https://dashboard.render.com/blueprint/new`
3. Выберите ваш репозиторий, убедитесь, что найден `render.yaml`, нажмите **Apply**.
4. После деплоя проверьте:
   - `GET /health` → `200`
   - `HEAD /redirect?...` и `GET /redirect?...` в нужном режиме.

Если хотите ограничить редиректы по доменам, добавьте переменную окружения
`ALLOWED_REDIRECT_HOSTS` в настройках сервиса Render (через запятую).
