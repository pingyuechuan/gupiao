# 环境变量说明（Project Phoenix V0.8）

> 所有变量均为 **前端构建期注入**（Vite `import.meta.env.*`），不存在运行时服务端私密配置。
> 生产环境只在 **Vercel → Settings → Environment Variables** 中配置；本地开发放在 `.env.local`（已被 `.gitignore` 排除，绝不会进仓库）。

---

## 一、Supabase 认证（V0.8 必填，否则登录门禁自动放行）

| 变量名 | 取值位置 | 示例 | 缺失时的行为 |
|---|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API → **Project URL** | `https://xxxx.supabase.co` | AuthGate 判定为「未配置」→ **自动放行所有人**，回到无登录状态 |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → **Project API keys → anon (public)** | `eyJhbGci...` | 同上，自动放行 |

⚠️ **只填 anon (public) key，绝对不要填 service_role key**（它拥有绕过 RLS 的超级权限，泄露即数据库裸奔）。

如何获取：见 `docs/DEPLOY_GUIDE.md` 第一步「复制两个值」。

---

## 二、行情数据源（可选，有默认值）

| 变量名 | 默认值 | 说明 |
|---|---|---|
| `VITE_DEFAULT_PROVIDER` | `tonghuashun` | 主数据源：`eastmoney` / `sina` / `tencent` / `akshare` / `tonghuashun`。生产走 Vercel Serverless 网关 `api/gw/*`，前端零改动。 |
| `VITE_AKSHARE_BASE_URL` | `http://localhost:8000` | 仅当 `provider=akshare` 时需要，指向自建 AKShare 后端。 |

> 注意：V0.8 实际数据通路由 `vercel.json` rewrites + `api/gw/[...slug].ts` 网关决定，`VITE_DEFAULT_PROVIDER` 仅作前端兜底标识，一般不改。

---

## 三、Vercel 自动注入（无需配置，供健康检查使用）

| 变量名 | 来源 | 用途 |
|---|---|---|
| `VERCEL_REGION` | Vercel 运行时 | `/api/health` 返回当前机房区域，用于判断 R1 风险 |
| `VERCEL_GIT_COMMIT_SHA` | Vercel 运行时 | `/api/health` 返回部署 commit，便于回滚定位 |

---

## 四、配置对照表

| 场景 | VITE_SUPABASE_URL | VITE_SUPABASE_ANON_KEY | 效果 |
|---|---|---|---|
| 生产（已配） | 真实 URL | 真实 anon key | 邮箱+密码注册登录门禁生效 |
| 本地 dev 未配 | 空 | 空 | 自动放行，免登录本地调试 |
| 紧急回滚 | 在 Vercel 删除这两条 | 删除 | 重新部署后 AuthGate 放行，回到无登录状态 |

---

## 五、常见错误

| 现象 | 原因 | 解决 |
|---|---|---|
| 登录页注册后提示「查收验证邮件」 | Supabase 还开着 Confirm email | Supabase → Authentication → Providers → Email → 关闭 Confirm email |
| 部署后白屏 | 环境变量未注入 / 构建失败 | Vercel → Deployments → 最新 → Build Log；确认两条变量已加在 Environment Variables |
| 健康检查返回 `down` | 境外机房拉不到国内行情 | 跑 `node scripts/health_check.mjs <域名>` 看明细，截图发我 |

*文档版本：V0.8 · 最后更新：2026-08-05*
