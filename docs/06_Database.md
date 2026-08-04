# 06 — 数据设计（Database）

版本：`0.7`　｜　最后更新：2026-08-04

---

## 1. 现状：全本地持久化（无后端）

0.7 的所有用户数据存于浏览器 `localStorage`，通过 Zustand `persist` 中间件管理。
**优点**：零成本、零隐私风险、零运维。**缺点**：换设备即丢失、我们看不到任何数据。

| Store | 存储 Key | 内容 |
|---|---|---|
| `userStore` | `phoenix-user`* | 画像、持仓、自选、模式 |
| `aimsMemoryStore` | `phoenix-aims-memory` | 投资目标、历史操作、错误识别 |
| `aimsGrowthStore` | `phoenix-aims-growth` | 经验值、连续天数、勋章 |
| `aimsAccuracyStore` | `phoenix-aims-accuracy` | AI 推荐记录与胜负 |
| `aimsDiaryStore` | `phoenix-aims-diary` | 每日投资日记 |
| `feedbackStore` | `phoenix-feedback` | 本地反馈缓存 |

\* 以代码实际 `persist name` 为准。

---

## 2. 本地数据结构

### 2.1 UserProfile（画像）

```ts
{
  principal: number;                       // 本金（元）
  riskTolerance: '低' | '中' | '高';
  period: '短线' | '中线' | '长线';
  targetReturn: string;
  age: string;
  experience: '小白' | '1-3年' | '3年以上';
  style: '稳健' | '价值' | '成长' | '激进';
  profileType: '保守型' | '价值型' | '成长型' | '激进型';   // 由 style 推导
}
```

### 2.2 Holding（持仓）

```ts
{ secid: string; code: string; name: string; cost: number; shares: number }
```

### 2.3 OperationRecord（AI 记忆 — 操作流水）

```ts
{
  ts: number;
  secid: string; name: string;
  action: '买入' | '加仓' | '持有' | '减仓' | '卖出';
  price: number;
  changePercent: number;
  chasedHigh: boolean;     // 买入/加仓 且 当日涨幅 > 5%
}
```

> `chasedHigh` 是行为矫正的核心字段，**禁止**在任何重构中删除。

### 2.4 RecRecord（准确率）

```ts
{ id: string; ts: number; secid: string; name: string;
  priceAtRec: number; composite: number; action: AiAction;
  result?: 'win' | 'loss'; settledAt?: number }
```

### 2.5 GrowthState（成长）

```ts
{ xp: number;
  streaks: { learning; correct; stop; review; noChase; trade }  // 各为 number
  medals: string[] }
```

### 2.6 Feedback（反馈）

```ts
{ id; ts; type; rating?; content; screenshot?; contact?; page; version }
```

---

## 3. 0.8 云端表设计（Supabase，**仅 2 张表**）

> 已否决"用户账号体系"（见 [02_Roadmap §4.1](./02_Roadmap.md)）。
> 用匿名 `device_id` 串联，零注册摩擦。

### 3.1 `analytics_events`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `bigserial` PK | |
| `device_id` | `uuid` | 匿名设备 ID |
| `event` | `text` | 事件名，见 [10_Analytics](./10_Analytics.md) |
| `props` | `jsonb` | 事件参数 |
| `version` | `text` | 应用版本 |
| `created_at` | `timestamptz` | 默认 `now()` |

索引：`(device_id, created_at)`、`(event, created_at)`

### 3.2 `feedback`

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` | `bigserial` PK | |
| `device_id` | `uuid` | |
| `type` | `text` | bug / suggestion / feature / experience / ai_error / page_error |
| `rating` | `int` | 1–5，可空 |
| `content` | `text` | |
| `screenshot_url` | `text` | 存 Supabase Storage，可空 |
| `contact` | `text` | 可空 |
| `page` | `text` | 提交时所在路由 |
| `version` | `text` | |
| `status` | `text` | new / triaged / fixed / wontfix，默认 `new` |
| `created_at` | `timestamptz` | |

### 3.3 安全（RLS）

| 表 | anon 权限 |
|---|---|
| `analytics_events` | **INSERT only**（禁止 SELECT，防数据被拖） |
| `feedback` | **INSERT only** |

读取一律走 service_role（仅服务端 / 管理后台）。

> ⚠️ 若使用 Supabase：**必须显式开启 RLS 并只授予 INSERT**。
> 默认策略错误会导致全表可读，这是最常见的严重事故。

---

## 4. 明确不入库的数据（隐私红线）

- ❌ 持仓明细（成本价、股数）— 属敏感财务信息，永远只存本地
- ❌ 真实姓名、手机号、身份证
- ❌ 精确地理位置

反馈中的 `contact` 为**用户自愿填写**，需在表单上注明用途。

---

## 5. 数据迁移

localStorage 结构变更时，`persist` 必须提供 `version` + `migrate`，
**禁止**直接改字段导致老用户数据损坏（老用户会直接白屏或丢画像）。

> 当前各 store 尚未设置 `version`，记入 Backlog `TECH-02`。
