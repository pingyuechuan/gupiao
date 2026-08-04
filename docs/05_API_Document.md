# 05 — API 接口规范

版本：`0.7`　｜　最后更新：2026-08-04

---

## 1. 架构概览

```
页面 (pages)
   │  只调用 ↓
React Query (src/queries.ts)
   │
   ├── AIMS 引擎 (src/aims/engine.ts)        ← 所有 AI 结论
   └── StockService (src/services/StockService.ts)  ← 所有行情数据
            │  多源容灾
            ├── TonghuashunProvider  (默认)
            ├── TencentProvider      (兜底 1)
            ├── SinaProvider         (兜底 2)
            ├── EastMoneyProvider    (本机 502，已降级)
            └── AKShareProvider      (可选自建后端)
                     │  HTTP
                     ↓
              代理层（见 §3）→ 第三方公开行情接口
```

**红线**：页面**禁止**直接 `axios` 请求第三方接口，必须经 `StockService`。

---

## 2. 内部服务契约

### 2.1 `IDataProvider`（所有数据源必须实现）

```ts
interface IDataProvider {
  readonly name: DataProviderName;
  search(keyword: string): Promise<StockInfo[]>;
  getQuote(secid: string): Promise<Quote>;
  getKline(secid: string, period: KlinePeriod): Promise<Kline[]>;
  getTimeShare(secid: string): Promise<TimeSharePoint[]>;
  getRankList(type: RankType, limit?: number): Promise<RankItem[]>;
  getSectors(): Promise<Sector[]>;
}
```

新增数据源：实现该接口 → 在 `providers/index.ts` 注册 → **无需改任何业务代码**。

### 2.2 `StockService`（业务唯一数据入口）

| 方法 | 说明 |
|---|---|
| `setProvider(name)` / `getProviderName()` / `listProviders()` | 数据源切换 |
| `search(keyword)` | 股票搜索 |
| `getQuote(secid)` | 单只实时行情 |
| `getQuotes(secids[])` | **批量行情**（批量走 `batchQuote.ts`，避免 N 次请求） |
| `getKline(secid, period)` | K 线（内含多源 fallback，见 `klineSources.ts`） |
| `getTimeShare(secid)` | 分时 |
| `getRankList(type, limit)` | 排行榜 |
| `getSectors()` | 板块列表 |

**容灾策略**：主源失败 → 自动切兜底源 → 全失败则抛错，由页面降级为空态（**禁止崩溃**）。

### 2.3 `secid` 统一格式

```
<市场前缀>.<代码>      1 = 沪市 / 0 = 深市
例：1.600519（贵州茅台）、0.300750（宁德时代）
```

所有跨模块传参一律使用 `secid`，**禁止**裸传 6 位代码。

---

## 3. 代理层规范 ⚠️ P0

第三方行情接口均有 CORS 与 Referer 校验，浏览器无法直连，必须经代理。

### 3.1 开发环境（已实现，`vite.config.ts`）

| 路径 | 目标 | 特殊头 |
|---|---|---|
| `/em` | `https://push2.eastmoney.com` | Referer + UA |
| `/emh` | `https://push2his.eastmoney.com` | Referer + UA |
| `/ems` | `https://searchapi.eastmoney.com` | Referer + UA |
| `/sina` | `https://hq.sinajs.cn` | Referer + UA |
| `/tc` | `https://qt.gtimg.cn` | — |
| `/tk` | `https://web.ifzq.gtimg.cn` | Referer + UA |
| `/sk` | `https://quotes.sina.cn` | Referer + UA |
| `/ths` | `http://d.10jqka.com.cn` | Referer + UA |

### 3.2 生产环境（**未实现 — GAP-01，0.8 必须交付**）

> 🔴 **当前风险**：`vite.config.ts` 的 proxy **只在 `vite dev` 生效**。
> 静态部署到 Vercel 后，以上 8 条路径全部 404 → **产品对真实用户完全不可用**。

**0.8 方案**：`api/proxy/[...path].ts`（Vercel Serverless Function），要求：

1. 完整复刻上表 8 条转发规则与请求头伪装
2. 增加**白名单**：仅允许上表 target 域名，防止被当开放代理滥用
3. 增加**限流**：单 IP 60 req/min
4. 响应加 `Cache-Control: s-maxage=5`（行情 5 秒边缘缓存，降低回源压力）
5. 超时 5s，失败返回结构化错误 `{ code, message }`

---

## 4. 未来云端接口（0.8 引入，仅 2 个）

> 遵循 Less but Better：Beta 阶段**只做**观测与反馈，不做账号、不做同步。

### 4.1 `POST /api/analytics`

```jsonc
{
  "deviceId": "uuid",        // 匿名设备 ID，localStorage 生成
  "event": "page_view",
  "props": { "page": "/discover" },
  "ts": 1754300000000
}
```
响应：`204 No Content`（埋点失败**不得**影响用户体验，前端静默忽略错误）

### 4.2 `POST /api/feedback`

```jsonc
{
  "deviceId": "uuid",
  "type": "bug | suggestion | feature | experience | ai_error | page_error",
  "rating": 4,               // 可选 1-5
  "content": "文本",
  "screenshot": "data:image/jpeg;base64,...",  // 可选，压缩后 ≤ 200KB
  "contact": "可选",
  "page": "/portfolio",
  "version": "0.7",
  "ua": "..."
}
```
响应：`{ "ok": true, "id": "..." }`

---

## 5. 错误处理约定

| 场景 | 行为 |
|---|---|
| 单源失败 | 静默切换兜底源 |
| 全源失败 | 页面显示 `EmptyHint`，提供"重试"，**禁止白屏** |
| AIMS 计算异常 | 该股跳过，不影响其他推荐 |
| 埋点失败 | 静默丢弃 |

---

## 6. 缓存策略

| 数据 | 策略 |
|---|---|
| 实时行情 | React Query `staleTime` 15s |
| AIMS 结果 | `staleTime` 15s（`useAIMS`） |
| 市场上下文 | 引擎内存缓存 30s（`aims/context.ts`） |
| K 线 | `staleTime` 60s |

---

## 7. 合规

- 仅使用**公开、免费**的行情接口，不破解、不绕过付费墙
- 不高频轮询，尊重目标站点负载
- 页面显著位置标注数据来源与免责声明
