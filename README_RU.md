# FUTURE BIOTECH — единая система документов

Один публичный адрес GitHub Pages используется как интерфейс. Авторизация и данные хранятся в Supabase.

## Безопасность

Пароли не находятся в исходном коде. Row Level Security (RLS) разрешает сотруднику читать только записи, где `owner_id` совпадает с его `auth.uid()`.

## Развёртывание

1. Создайте проект Supabase.
2. Выполните `supabase_schema.sql` в SQL Editor.
3. Укажите Project URL и anon/publishable key в `config.js`.
4. В Authentication создайте пользователя, например `fb001@futurebiotech.local`, и задайте индивидуальный пароль.
5. Добавьте UUID пользователя в таблицу `profiles`.
6. Добавьте документы в таблицу `documents`.
7. Опубликуйте `index.html`, `styles.css`, `app.js`, `config.js` через GitHub Pages.

Никогда не публикуйте `service_role` key в браузерном коде.
