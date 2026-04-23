![logo](public/logo-new.png)

# Habr-parser

Полностью автоматизированный сбор адресов электронной почты работодателей и массовая рассылка резюме.

## Настройка

1. Создать файл `.env` в корне проекта:

```bash
# Mail settings
MAIL=your_email@yandex.ru
PASSWORD=your_app_password

# Message settings
MESSAGE_SUBJECT="subject for email message"
MESSAGE_TEXT="text for email message"
MESSAGE_HTML_TEMPLATE="C:/Users/user/Downloads/resume.html" # Опционально
```

> **Важно:** Используйте пароль приложения, а не основной пароль от почты.

Предпочтительным способом остается `HTML`-вариант, так что если вы укажите `MESSAGE_HTML_TEMPLATE`, `MESSAGE_TEXT` не будет отправлен.

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
