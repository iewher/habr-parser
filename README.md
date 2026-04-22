# Habr-parser

Полностью автоматизированный сбор адресов электронной почты работодателей и рассылка объявлений о вакансиях.

## Настройка

1. Создать файл `.env` в корне проекта:

```bash
MAIL="your-mail@yandex.ru"
PASSWORD="your-mail-password"
```

> **Важно:** Используйте пароль приложения, а не основной пароль от почты.

## Запуск

В корне проекта:

```bash
# Запуск парсера
make parser

# Запуск рассылки
make mailer
```

или

```bash
# Запуск парсера
go run ./cmd/parser

# Запуск рассылки
go run ./cmd/mailer
```

## Описание модели данных

Все данные сохраняются в файле `data.json`:

```json
{
    "vacancies": [
        {
            "title": "Название вакансии",
            "url": "https://career.habr.com/..."
        }
    ],
    "sites": ["https://company1.com", "https://company2.com"],
    "emails": ["email1@company.com", "email2@company.com"]
}
```

> **Важно:** Не удаляйте файл `data.json` после работы парсера — он нужен для рассылки.
