# 04 — 组件规范（Component System）

版本：`0.7`

> **第一原则：禁止重复开发组件。**
> 写任何新 UI 之前，先查本文档；已有的必须复用，不够用的先扩展、再新建。

---

## 1. 目录分层（职责边界）

| 目录 | 职责 | 允许依赖 |
|---|---|---|
| `components/ui/` | **基础原子组件**，无业务语义 | 仅 React / Tailwind / Motion |
| `components/aims/` | **AIMS 业务组件**，AI 结论的唯一表达层 | ui + aims 类型 + store |
| `components/charts/` | 图表封装（ECharts） | ui + constants |
| `components/common/` | 跨页复用的业务卡片 | ui + aims |
| `components/layout/` | 骨架：侧边栏 / 顶栏 / 图标 / 错误边界 | ui |
| `pages/` | **只做编排**，不放通用逻辑 | 以上全部 |

**红线**：`pages/` 里出现可复用的 UI 片段 → 必须下沉到 `components/`。

---

## 2. 基础组件清单（`components/ui/index.tsx`）

| 组件 | 用途 | 备注 |
|---|---|---|
| `GlassCard` | 标准玻璃卡片容器 | **所有卡片必须用它**，禁止手写 div + 玻璃样式 |
| `SectionTitle` | 区块标题 | 统一标题字号与间距 |
| `ScoreRing` | 环形评分 | AIMS composite 展示 |
| `SignalBadge` | 信号徽章 | 买/卖/观望信号 |
| `ActionBadge` | 操作动作徽章 | AIMS `action` 专用 |
| `Stars` | 星级 | 反馈评分 |
| `Stat` | 指标块（标题+数值） | 四大输出统一用它 |
| `UpDown` | 涨跌数值 | 自动涨红跌绿 |
| `Meter` | 条形进度/量表 | 仓位、维度分 |
| `Skeleton` / `SkeletonCard` | 骨架屏 | **所有异步区域必须有** |
| `EmptyHint` | 空态 | 必带 title，建议带 desc |
| `scoreColor` / `changeTone` | 颜色语义函数 | 禁止各页自算 |
| `cn` | 类名合并 | 禁止自行实现 |

---

## 3. AIMS 业务组件（`components/aims/`）

| 组件 | 用途 | 使用约束 |
|---|---|---|
| `AIMSCard` | **AI 结论统一卡片**（评分环 + 动作 + 四大指标 + 为什么） | 任何页面展示 AI 结论**只能用它** |
| `WhyExpansion` | 可解释性展开（五维 + 匹配度 + 复合分） | 已内嵌于 AIMSCard，禁止单独重写 |
| `GrowthPanel` | 成长系统（等级 / 经验 / 连续 / 勋章） | 仅「我的」页 |
| `MedalWall` | 勋章墙 | 被 GrowthPanel 使用 |
| `AccuracyPanel` | 历史准确率 | 仅「我的」页 |
| `DiaryPanel` | 投资日记 | 仅「我的」页 |
| `FeedbackList` | 反馈列表 | 仅「我的」页 |
| `BetaFeedback` | 🐞 全局反馈悬浮入口 | **只在 `App.tsx` 挂载一次** |
| `BetaBadge` | 版本标识 | 首页 + 我的页 |

---

## 4. 组件设计规则

### 4.1 尺寸红线

| 类型 | 上限 |
|---|---|
| 单个组件文件 | **250 行** |
| 单个页面文件 | **300 行** |
| 单个函数 | **60 行** |

超出即视为"超长组件"，必须拆分。

**当前超标监控**（0.7 实测，需在 0.8 前处理）：

| 文件 | 行数 | 状态 |
|---|---|---|
| `utils/indicators.ts` | 329 | ⚠️ 纯算法工具，可豁免（按指标拆分为 backlog） |
| `pages/TodayPage.tsx` | 298 | 🟡 接近上限，禁止再加内容 |
| `pages/StockDetailPage.tsx` | 274 | 🟡 同上 |
| `pages/PortfolioPage.tsx` | 252 | 🟡 同上 |
| `components/ui/index.tsx` | 251 | 🟡 建议 0.9 拆成多文件 |

> 记入 [FEATURE_BACKLOG](./FEATURE_BACKLOG.md) `TECH-01`，**不在 0.8 处理**（0.8 只做上线）。

### 4.2 Props 规范

- Props 必须有显式 TypeScript 接口，**禁止 `any`**
- 布尔 Props 用肯定式：`disabled` ✅ / `notEnabled` ❌
- 超过 6 个 Props → 说明组件职责过重，需拆分

### 4.3 状态归属

| 状态类型 | 存放位置 |
|---|---|
| 纯 UI 局部状态（展开/hover） | 组件内 `useState` |
| 跨页面用户数据 | Zustand store（`src/store/`） |
| 服务端/接口数据 | React Query（`src/queries.ts`） |

**禁止**：把接口数据塞进 Zustand；**禁止**：用 Context 传业务数据。

### 4.4 异步三态

任何异步组件必须处理：**加载（Skeleton）/ 空（EmptyHint）/ 错误（降级文案）**。
**禁止**出现白屏或无限 loading。

---

## 5. 新增组件准入流程

```
1. 全局搜索：是否已有同类组件？        → 有则复用
2. 能否通过扩展现有组件 Props 满足？   → 能则扩展
3. 是否会被 ≥2 处使用？               → 否则留在页面内，不进 components/
4. 通过后：新建 + 更新本文档清单
```

**未更新本文档的新组件，视为违规，评审不通过。**

---

## 6. 命名规范

| 类型 | 规则 | 示例 |
|---|---|---|
| 组件文件 | PascalCase.tsx | `AIMSCard.tsx` |
| 工具/store | camelCase.ts | `aimsMemoryStore.ts` |
| 类型 | PascalCase | `AIMSResult` |
| 常量 | UPPER_SNAKE | `APP_VERSION` |
| Store Hook | `use` + 名词 + `Store` | `useAimsGrowthStore` |
