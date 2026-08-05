# 02 — 产品路线图（Roadmap）

最后更新：2026-08-04　｜　负责人：产品负责人
本次修订依据：**PO 批复「Project Phoenix Product Owner Approval」（2026-08-04）**

> **铁律一：一个版本，只解决一个目标。**
> **铁律二：小版本、小迭代、可发布。每个版本必须能独立上线、独立验证、独立回滚。**

---

## 0. Beta 阶段唯一目标

```
找到真正用户 → 收集反馈 → 修复 Bug → 验证 AI 价值
```

**不是**继续增加功能。任何"加功能"的提议，默认拒绝，进 Backlog。

---

## 1. 版本总览（PO 批复版）

| 版本 | 代号 | 唯一目标 | 状态 | RFC |
|---|---|---|---|---|
| 0.7 | AIMS | 建立 AI 护城河（AIMS 决策引擎成型） | ✅ 已完成 | — |
| **0.8** | **Beta Online** | **让真实用户能够访问并开始测试** | ✅ 代码完成，待部署 | [RFC-001](./rfc/RFC-001-V0.8-Beta-Online.md) |
| 0.81 | Feedback | 收集真实用户反馈 | ⬜ 未启动 | 待提 |
| 0.82 | Analytics | 用数据而非感觉做决策 | ⬜ 未启动 | 待提 |
| 0.83 | CI/CD | 发布流程自动化与可回滚 | ⬜ 未启动 | 待提 |
| 0.9 | AI Quality | AI 决策质量与可信度验证 | ⬜ 计划中 | 待提 |
| 1.0 | Retention | 把用户变成每日习惯 | ⬜ 计划中 | 待提 |

> **PO 决策记录**：原 0.8 方案将「部署 + 反馈 + 分析 + CI/CD」打包在一个版本，
> **范围过大，已被 PO 驳回**，拆分为 0.8 / 0.81 / 0.82 / 0.83 四个可独立发布的小版本。

---

## 2. Version 0.8 — Beta Online

**唯一目标：让真实用户能够访问并开始测试。**

### 2.1 为什么是这个目标

已逐文件核对的事实：

- ~~项目**当前不在 git 版本控制下** → 零回滚能力。~~
  ✅ **已解决**：2026-08-05 建仓并推送 → https://github.com/pingyuechuan/gupiao
- ~~8 条行情代理只写在 `vite.config.ts` 的 `server.proxy` → **只在 `vite dev` 下生效**。~~
  ✅ **已解决**：`api/gw/[...slug].ts` + `vercel.json` rewrites，前端零改动。

> **陌生用户现在拿到的会是「界面完整、数据全空」的壳子。AI 再强，用户用不到 = 0。**

### 2.2 范围（PO 批复 9 项）· 执行进度

| # | 项目 | 状态 | 备注 |
|---|---|---|---|
| 1 | GitHub Repository | ✅ **已完成** | https://github.com/pingyuechuan/gupiao（Public，`main`，含 tag `v0.7.0`/`v0.8.0`） |
| 2 | Vercel Frontend | ⬜ 待 PO 操作 | 代码已 deploy-ready，需导入仓库 + 配环境变量 |
| 3 | Railway Backend | 🔄 **方案变更** | 改用 Vercel Serverless（`api/gw/[...slug].ts`）做 https→http 桥接，无需独立后端与额外账单 |
| 4 | Supabase Production DB | ⬜ 待 PO 操作 | 代码已接入（Auth only），需建项目 + 关邮箱验证 |
| 5 | HTTPS | ⬜ 随 Vercel 自动 | Vercel 默认签发 |
| 6 | 自定义域名 | ⬜ 可延后 | 暂用 `*.vercel.app` |
| 7 | 登录认证 | ✅ **已完成** | AuthGate + LoginPage（邮箱+密码），双路径测试 7/7 + 5/5 |
| 8 | Beta Banner | ✅ **已完成** | `BetaBadge`（首页 / 我的 / 登录页） |
| 9 | 基础健康检查 | ✅ **已完成** | `/api/health?deep=1`，可实测上游可达性（验证 R1） |

完整拆解、风险、回滚、工期、验收标准 → **[RFC-001](./rfc/RFC-001-V0.8-Beta-Online.md)**
部署操作步骤 → **[DEPLOY_GUIDE](./DEPLOY_GUIDE.md)**

### 2.3 明确不做

❌ Feedback Center（→0.81）　❌ Analytics（→0.82）　❌ CI/CD 流水线（→0.83）
❌ 新页面　❌ UI 变更　❌ AIMS 逻辑变更　❌ 技术债重构　❌ 用户数据云端同步

### 2.4 关键风险（详见 RFC-001 §4）

| 等级 | 风险 |
|---|---|
| 🔴 P0 | 海外服务器访问国内行情源可能被限流/拒绝 → **Day-1 Spike 作为开工门禁** |
| 🔴 P0 | Vercel 在中国大陆访问不稳定，而目标用户 100% 在国内 |
| 🟠 P1 | 「登录认证」与「让用户能访问」目标冲突（登录是漏斗最大摩擦） |

---

## 3. Version 0.81 — Feedback

**唯一目标：收集真实用户反馈。**

| 范围 | 说明 |
|---|---|
| 意见反馈 / Bug 反馈 | 现有 `BetaFeedback` 组件由 localStorage 改为写入云端 |
| 页面评分 | 复用现有评分交互 |
| 上传截图（可选） | Supabase Storage |
| 联系方式（可选） | 匿名可留空 |
| 后台查看反馈 | 最小可用：Supabase Dashboard 直接查表，**不做自建后台页面** |

**前置**：0.8 已上线且 Supabase 就绪。
**明确不做**：反馈分类自动化、情感分析、工单流转。

> ⚠️ 现状提醒：反馈目前只写 localStorage，**我们永远收不到**。这是 0.81 存在的全部理由。

---

## 4. Version 0.82 — Analytics

**唯一目标：用数据而非开发者感觉做决策。**

| 范围 |
|---|
| 页面访问 / 点击率 / DAU / MAU / 7 日留存 / 30 日留存 |
| Discover 使用率 · Coach 使用率 · Portfolio 使用率 · Feedback 提交率 |

**用户标识**：匿名 `device_id`（首次访问生成 UUID 存 localStorage），零摩擦即可算留存。
**前置**：0.8 上线，且已有一定真实访问量（否则数据无意义）。
**明确不做**：漏斗可视化后台、A/B 实验平台、用户分群。

### 4.1 北极星指标

```
次日回访率（Day-1 Return Rate）
```

不是 DAU。**如果用户明天不回来，说明我们没有成为他的每日决策依赖，其他数字都是虚的。**

---

## 5. Version 0.83 — CI/CD

**唯一目标：发布流程自动化与可回滚。**

| 范围 |
|---|
| GitHub Actions（`typecheck` + `build` + 冒烟测试 作为门禁） |
| Preview Environment（PR 自动预览） |
| Production Environment（`main` 自动部署） |
| 一键 Rollback |
| Release Pipeline（自动生成 Release Note 草稿） |

**明确不做**：多环境矩阵、蓝绿发布、金丝雀发布（Beta 用户量不需要）。

---

## 6. Version 0.9 — AI 决策质量（Beta 之后）

前置：0.82 已上线且累积 ≥50 名真实用户的行为数据。

| # | 任务 |
|---|---|
| 1 | AIMS 历史回测框架：用过去 N 个交易日验证五维权重是否合理 |
| 2 | **修复 BUG-004**：准确率口径固化（当前"推荐后上涨即胜"过于粗糙，需定义持有周期与阈值）<br>⚠️ 在修复前，**该胜率数字不得对外宣传** |
| 3 | 首页接入 AIMS 大盘总判（今日可否操作 / 建议总仓位） |
| 4 | 根据 Analytics 砍掉使用率 < 5% 的功能 |
| 5 | 补 `aims/scoring.ts` 单元测试（TECH-05：产品命脉目前零测试覆盖） |

---

## 7. 部署架构决策记录

| 项 | 方案 | 状态 | 备注 |
|---|---|---|---|
| Frontend | Vercel | ✅ PO 批准 | 存在国内可达性风险，Spike 验证（RFC-001 R2） |
| Backend | Railway 独立网关 | ✅ PO 批准 | 我原建议 Vercel Serverless，**PO 决定用 Railway，执行**。<br>补充理由：同花顺上游是 **http 明文**，必须由后端做 https→http 桥接，纯前端方案不可行 |
| Database | Supabase | ✅ PO 批准 | 0.8 只建 project 不建表；`feedback`→0.81，`analytics_events`→0.82 |
| 登录认证 | Supabase 邮箱+密码 | ✅ 已实现 | 采用邮箱密码登录（非 Magic Link，避免 Supabase 免费邮件频控）<br>AuthGate 门禁：未配置时自动放行（本地开发不阻断） |

---

## 8. Sprint 节奏

- **周期**：2 周 / Sprint
- **发布**：版本完成即发布，**禁止每天改线上版本**
- **例外**：仅 P0（无法使用）允许热修，且必须补 Release Note

| Sprint | 目标版本 | 状态 |
|---|---|---|
| S1 | 0.7 AIMS | ✅ 已结束 |
| S2 | 0.8 Beta Online | ✅ 代码完成，待部署 |
| S3 | 0.81 Feedback + 0.82 Analytics | ⬜ |
| S4 | 0.83 CI/CD | ⬜ |
| S5 | 0.9 AI Quality | ⬜ |

---

## 9. 长期护城河（1.0 之后思考，不进当前开发）

1. **AI 记忆 × 时间** — 用得越久，AI 越懂你。竞品无法复制的数据资产。
2. **公开准确率** — 敢于长期公开胜率，是信任的最强背书。
3. **行为矫正** — 不只是荐股，而是修正用户的坏习惯（追高、不止损）。

> 这三点，才是 Project Phoenix 的真正壁垒。功能数量不是。
