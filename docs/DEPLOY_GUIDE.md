# V0.8 部署操作清单

> **预计耗时**：15~20 分钟（含等待时间）
> **前置条件**：GitHub 账号、Vercel 账号（免费）、Supabase 账号（免费）
> **不需要**：Railway / 域名 / 信用卡（Vercel Hobby + Supabase Free 都免费）

---

## 第一步：创建 Supabase 项目（5 分钟）

1. 打开 https://supabase.com ，用 GitHub 登录
2. 点击 **New Project**
3. Organization 选默认，Project name 输入 `phoenix-beta`
4. Database Password 随机生成一个（记下来，本版本用不到但以后需要）
5. Region 选择 **Singapore (ap-southeast-1)** 或 **Tokyo (ap-northeast-1)**
   - ⚠️ **不要选 US East/West**：离中国越近越好
6. Pricing 选 **Free**，点击 **Create new project**
7. 等待 ~2 分钟项目就绪

### 关闭邮箱验证（重要！）

> Supabase 免费版每小时只能发 3 封邮件。Beta 测试用户注册时链接会大面积发不出去。
> **关闭后用户注册即可直接登录，零邮件依赖。**

1. 进入 Dashboard → **Authentication** → **Providers**
2. 找到 **Email** provider → 点击展开
3. 关闭 **Confirm email** 开关
4. 点 **Save**

### 复制两个值

进入 **Settings** → **API**：

| 变量名 | 取值位置 | 示例 |
|---|---|---|
| `VITE_SUPABASE_URL` | Project URL (next to "Project URL" label) | `https://xxxxxxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Project API keys > public (anon) key | `eyJhbGciOiJIUzI1NiIs...` |

⚠️ **只复制 anon (public) key，不要复制 service_role key。**

---

## 第二步：推送到 GitHub（3 分钟）

```bash
cd E:\PWB\2026-07-29-23-18-46

# 如果还没有 GitHub remote：
git remote add origin https://github.com/<你的用户名>/project-phoenix.git

# 推送全部代码与 tag
git push -u origin main --tags
```

如果还没有 GitHub 仓库：

1. 打开 https://github.com/new
2. Repository name: `project-phoenix`
3. **不要勾选** README / .gitignore / License（本地已有）
4. 点击 **Create repository**
5. 按页面提示执行 `git remote add` 和 `git push`

---

## 第三步：部署到 Vercel（5 分钟）

1. 打开 https://vercel.com ，用 GitHub 登录
2. 点击 **Add New…** → **Project**
3. 选择刚推送的 `project-phoenix` 仓库
4. **Framework Preset**：选 **Vite**（应自动识别）
5. **Root Directory**：保持 `./` 不变
6. **Build Command**：`npm run build`（应自动填入）
7. **Output Directory**：`dist`（应自动填入）
8. 点击 **Environment Variables**，添加两条：

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | 第一步复制的 Project URL |
| `VITE_SUPABASE_ANON_KEY` | 第一步复制的 anon key |

9. 点击 **Deploy**

10. 等待 ~2 分钟构建完成，Vercel 会给你一个类似 `https://project-phoenix-xxx.vercel.app` 的域名

---

## 第四步：验收检查（必须做！）

### 4.1 能否打开？

在浏览器访问 Vercel 给的域名。

预期结果：看到 **登录页**（Project Phoenix logo + 登录/注册切换 + 邮箱/密码输入框）。

如果看到白屏或报错 → 截图发给我。

### 4.2 能否注册登录？

1. 切换到「注册」标签
2. 输入你的真实邮箱和密码（≥6 位）
3. 点击「注册并开始」

预期结果：自动跳转到引导页（"先花 30 秒让 AI 认识你"），说明认证链路通畅。

### 4.3 行情数据是否加载？（关键！）

完成引导后观察首页：

- ✅ 看到指数数据（上证 / 深证 / 创业板）→ **网关正常，国内行情源可达**
- ❌ 全部显示加载中或空 → **上游不可达（风险 R1 触发）**

### 4.4 运行健康检查 Deep 模式

在浏览器地址栏输入：

```
https://你的域名.vercel.app/api/health?deep=1
```

预期结果：返回 JSON，其中 `status` 字段为 `"ok"` 或 `"degraded"`（至少主数据源同花顺可达）。

如果 `status: "down"` 且所有 upstream 的 `ok: false` → **境外机房无法访问国内行情源，需要换架构**。截图发给我。

---

## 第五步：邀请测试用户

把域名发给测试用户时附上说明：

```
🚀 Project Phoenix Beta 内测

访问地址：https://你的域名.vercel.app

使用方式：
1. 用邮箱注册账号（密码 ≥ 6 位）
2. 完成 7 步画像引导
3. 即可体验 AI 投资教练

注意：
- 这是 Beta 版本，AI 建议仅供参考，不构成投资建议
- 如遇问题请点右下角 🐞 反馈（目前反馈存本地，下个版本会上云）
```

---

## 回滚方案

如果上线后发现严重问题：

```bash
# 方案 A：回退到 v0.7.0（无登录门禁，纯前端）
git checkout v0.7.0
# 在 Vercel Dashboard → Deployments → 找到 v0.7.0 的 deployment → Promote to Production

# 方案 B：紧急关闭登录（临时放行所有人）
# 在 Vercel Settings → Environment Variables 中删除两条 SUPABASE 变量
# 重新部署 → AuthGate 自动放行，回到无登录状态
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|---|---|---|
| 注册后没反应，提示"请查收验证邮件" | Supabase 还开着邮箱验证 | 去 Dashboard → Authentication → Providers → Email → 关闭 Confirm email |
| 页面白屏 | 构建失败 | Vercel Dashboard → Deployments → 点最新一次 → 看 Build Log |
| 登录后立刻被踢回登录页 | Session 未持久化 | 检查浏览器是否禁用了 localStorage |
| 行情数据全空 | 上游不可达 | 先跑 `/api/health?deep=1` 确认，截图发给我 |
| Vercel 域名打不开 | 国内 DNS 解析慢 | 等 1~2 分钟再试；若持续不行考虑加自定义域名 |

---

*文档版本：V0.8 · 最后更新：2026-08-04*
