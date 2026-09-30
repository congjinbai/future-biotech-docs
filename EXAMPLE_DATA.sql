-- 示例：创建 Auth 用户后，在 Supabase Dashboard -> Authentication -> Users 中复制该用户 UUID，替换下面 UUID。
-- 注意：不要把真实密码写在 SQL 文件或 GitHub 仓库里。

insert into public.profiles (id, employee_code, display_name_ru, display_name_zh)
values ('00000000-0000-0000-0000-000000000001','FB001','Иванов Иван Иванович','伊万诺夫·伊万·伊万诺维奇');

insert into public.documents(owner_id,type,title_ru,title_zh,payload)
values (
'00000000-0000-0000-0000-000000000001',
'salary_global',
'Расписка о получении зарплаты · сентябрь 2026',
'工资收条 · 2026年9月',
'{
  "person_ru":"Иванов Иван Иванович",
  "person_zh":"伊万诺夫·伊万·伊万诺维奇",
  "passport_ru":"паспорт серия XXXX № XXXXXX, выдан ...",
  "passport_zh":"护照：系列 XXXX，编号 XXXXXX，签发机关：...",
  "amount_ru":"80 000 рублей",
  "amount_zh":"80000卢布",
  "amount_words_ru":"Восемьдесят тысяч рублей",
  "amount_words_zh":"八万卢布",
  "company_ru":"ООО «Здоровое будущее глобал»",
  "company_zh":"环球健康未来有限公司",
  "summary":{"ru":"Заполните период, дату и подпишите документ.","zh":"填写工作期间、日期并签字。"},
  "fields":{}
}'::jsonb
);
