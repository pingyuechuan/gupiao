# Project Phoenix — 文档中心

> **AI Investment Coach**：不做股票软件，不做行情软件，不做看盘软件。
> 只做一件事——帮普通投资者每天知道：**今天应该怎么操作**。

当前版本：`Phoenix Beta 0.7`（已发布）　｜　开发中：`0.8 Beta Online`（🟡 RFC 待批准）
阶段：Beta（稳定 / 可靠 / 真实）

---

## 一、文档索引

| 编号 | 文档 | 作用 | 变更需谁批准 |
|---|---|---|---|
| 01 | [PRD](./01_PRD.md) | 产品需求文档：定位、用户、信息架构、功能清单 | 产品负责人 |
| 02 | [Roadmap](./02_Roadmap.md) | 版本路线图：每个版本**只有一个目标** | 产品负责人 |
| 03 | [UI_System](./03_UI_System.md) | 设计规范：颜色 / 字体 / 间距 / 圆角 / 动效 | 设计 + 前端 |
| 04 | [Component_System](./04_Component_System.md) | 组件规范：禁止重复造轮子 | 前端 |
| 05 | [API_Document](./05_API_Document.md) | 接口规范：行情源、代理、内部服务契约 | 前端 + 后端 |
| 06 | [Database](./06_Database.md) | 数据结构：本地持久化 + 未来云端表设计 | 后端 |
| 07 | [AIMS](./07_AIMS.md) | **全产品唯一 AI 来源**，决策引擎规范 | 产品 + 算法 |
| 08 | [TestPlan](./08_TestPlan.md) | 测试计划与准入门槛 | QA |
| 09 | [ReleaseNote](./09_ReleaseNote.md) | 版本更新日志 | 产品负责人 |
| 10 | [Analytics](./10_Analytics.md) | 数据指标与埋点规范 | 产品负责人 |
| — | [BUG_CENTER](./BUG_CENTER.md) | Bug 台账（P0–P3） | QA |
| — | [FEATURE_BACKLOG](./FEATURE_BACKLOG.md) | 需求池（**禁止未审批直接开发**） | 产品负责人 |
| — | [rfc/](./rfc/) | **变更申请（RFC）**：任何开发的唯一入口 | 产品负责人 |

### RFC 台账

| RFC | 版本 | 目标 | 状态 |
|---|---|---|---|
| [RFC-001](./rfc/RFC-001-V0.8-Beta-Online.md) | 0.8 Beta Online | 让真实用户能够访问并开始测试 | 🟡 待 PO 批准 |

---

## 二、开发流程（强制）

> 依据 **PO 批复（2026-08-04）** 更新为 9 步 RFC 流程。

```
RFC → PO Approval → Update PRD → Update Roadmap → Architecture Review
    → Development → Testing → Release Notes → Deploy
```

| # | 步骤 | 产出物 | 卡点 |
|---|---|---|---|
| 1 | **RFC** | `docs/rfc/RFC-XXX-*.md`，含 7 个必需章节 | 事实必须已核对，禁止推测 |
| 2 | **PO Approval** | RFC §9 签字 | ❌ **未批准 → 不允许修改任何业务代码** |
| 3 | Update PRD | 01_PRD | |
| 4 | Update Roadmap | 02_Roadmap | 必须符合"一个版本一个目标" |
| 5 | Architecture Review | 影响面清单（页面/组件/数据/AIMS） | 遵循 03 / 04 / 05 规范 |
| 6 | Development | 代码 | 禁止顺手做 Out of Scope 的事 |
| 7 | Testing | 08_TestPlan 准入门槛 | Acceptance Criteria 逐条打勾 |
| 8 | Release Notes | 09_ReleaseNote | |
| 9 | Deploy | 线上版本 | Go / No-Go 判定 |

**RFC 的 7 个必需章节**（模板见 [RFC_TEMPLATE](./rfc/RFC_TEMPLATE.md)）：

1. RFC（变更申请与理由）　2. Scope（本版本范围）　3. Out of Scope（明确不做什么）
4. Risk Assessment（风险评估）　5. Rollback Plan（回滚方案）
6. Estimated Timeline（预计工期）　7. Acceptance Criteria（验收标准）

> **禁止**：想到什么做什么 · 随意增加页面 · 修改信息架构 · **未经 PO 批准直接改代码**

---

## 二·五、小版本铁律

> **每个版本必须能独立上线、独立验证、独立回滚。**

范围过大的版本一律拆分。判据：**如果一个版本的任意一项延期会阻塞其他项发布，说明它该拆了。**

---

## 三、需求五问（未通过则拒绝开发）

每个新功能必须逐条回答，**≥3 个「否」直接拒绝**，并给出替代方案。

| # | 问题 | 判定 |
|---|---|---|
| 1 | 用户真的需要吗？ | 是 / 否 |
| 2 | 用户每天会打开吗？ | 是 / 否 |
| 3 | 能提高留存吗？ | 是 / 否 |
| 4 | 能形成竞争优势吗？ | 是 / 否 |
| 5 | 以后容易维护吗？ | 是 / 否 |

评审记录统一留在 [FEATURE_BACKLOG](./FEATURE_BACKLOG.md)。

---

## 四、三条铁律

1. **一个版本只解决一个目标** — 不允许「一边加页面一边改 UI」。
2. **任何功能必须能回答"用户为什么需要 / 每天会不会用 / 能否提高留存"** — 答不上来就砍。
3. **所有页面必须 3 秒内告诉用户"现在该怎么办"** — 展示数据不是价值，给出建议才是。

---

## 五、AI 铁律

全产品**只有一个 AI 来源**：`src/aims/engine.ts → analyzeAIMS()`。

Today / Discover / Coach / Portfolio / StockDetail **全部调用 AIMS**，
**禁止**任何页面自己做分析、自己算评分、自己下结论。

详见 [07_AIMS](./07_AIMS.md)。

---

## 六、免责声明

本产品数据来自公开行情接口整合，**仅供学习与研究参考，不构成任何投资建议**。
投资有风险，入市需谨慎。所有 AI 输出均为算法推演结果，不对收益作任何承诺。
