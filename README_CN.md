# FUTURE BIOTECH 统一文件系统

这是把原来的多个 GitHub Pages 链接合并成一个统一入口的安全版方案。

## 架构

- GitHub Pages：网页界面、俄中双语、表单、手写签名、打印 / PDF、生成 PNG。
- Supabase Auth：每个人独立 ID + 密码登录。
- Supabase Database + RLS：每个人只能读取 `owner_id = 自己` 的文件。
- 真实密码、护照信息、金额等不再写进公开 GitHub 源代码。

## 1. 创建 Supabase 项目

1. 打开 Supabase，新建 Project。
2. 进入 `SQL Editor`，运行 `supabase_schema.sql`。
3. 进入 `Project Settings -> API`，复制：
   - Project URL
   - anon / publishable key
4. 把它们填入 `config.js`。

> `anon key` 可以放在前端。真正的数据访问由 RLS 控制。绝对不要把 `service_role` key 放进 GitHub。

## 2. 创建员工账号

进入：`Authentication -> Users -> Add user`。

假设员工编号是：`FB001`

邮箱填写：

`fb001@futurebiotech.local`

密码填写该员工自己的密码。

建议关闭邮件确认，或者管理员直接创建为已确认用户。这个邮箱仅作为 Supabase Auth 的内部登录标识，不需要是真实邮箱。

创建后复制用户 UUID。

## 3. 创建员工 Profile

在 SQL Editor：

```sql
insert into public.profiles(id,employee_code,display_name_ru,display_name_zh)
values('员工UUID','FB001','俄文姓名','中文姓名');
```

## 4. 给员工添加文件

参考 `EXAMPLE_DATA.sql`。

支持的 `type`：

- `salary_two_companies`：两家公司共同支付工资的收条
- `salary_global`：单家公司支付工资的收条
- `consulting_receipt`：咨询/服务费收条
- `application`：申请书

员工登陆后只会看到自己的记录。

## 5. 发布到 GitHub Pages

建议新建一个仓库，例如：

`documents`

把以下文件上传到仓库根目录：

- index.html
- styles.css
- app.js
- config.js

然后：`Settings -> Pages -> Deploy from a branch -> main / root`。

最终只有一个地址，例如：

`https://congjinbai.github.io/documents/`

## 6. 以后新增员工

无需新建 GitHub 仓库，也无需新链接。

只需要：

1. Supabase Auth 新增用户（ID 对应内部邮箱 + 独立密码）；
2. `profiles` 新增一条；
3. `documents` 给这个 UUID 新增文件。

统一链接永远不变。

## 7. 重要安全说明

- 不要在 GitHub 里保存员工密码。
- 不要使用前端 JavaScript 数组做“密码判断”。那种密码可以直接通过查看源代码绕过。
- 不要把 Supabase `service_role` key 放在网页中。
- 旧的公开页面中如果仍包含真实护照信息，建议在新系统上线后停止 GitHub Pages 或删除敏感内容。

## 下一阶段建议

目前管理员通过 Supabase Dashboard 添加员工和文件，优点是安全、简单。

如果使用人数多，可以第二阶段增加 `/admin` 管理后台：

- 添加员工
- 重置密码
- 创建文件
- 停用文件
- 查看员工列表

管理员后台需要使用 Supabase Edge Function 或其他服务器端函数，不能把管理员密钥直接放在 GitHub Pages。
