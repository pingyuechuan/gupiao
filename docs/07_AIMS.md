# 07 — AIMS（AI Investment Management System）

版本：`0.7`　｜　最后更新：2026-08-04　｜　**全产品唯一 AI 来源**

---

## 1. 铁律

```
所有 AI 结论，必须且只能来自 analyzeAIMS()
```

- **禁止**任何页面自己做技术分析、自己算评分、自己下操作结论
- **禁止**出现"同一只股票，A 页面说买、B 页面说卖"
- 新增任何 AI 能力，必须以"新增维度 / 新增上下文"的方式并入 AIMS，不得旁路

---

## 2. 代码位置

| 文件 | 职责 |
|---|---|
| `src/aims/types.ts` | 类型定义（`AIMSResult` / `DimensionScore` / `AIMSContext`） |
| `src/aims/context.ts` | 市场上下文（指数 + 板块，30s 内存缓存） |
| `src/aims/scoring.ts` | 五维打分纯函数 + 用户匹配度 |
| `src/aims/engine.ts` | **唯一入口** `analyzeAIMS(secid)` |

调用适配层（不得包含决策逻辑，只做形状转换）：

| 文件 | 面向页面 |
|---|---|
| `src/ai/advice.ts` → `getStockAdvice` / `getBatchAdvice` | 个股详情 / 持仓 |
| `src/ai/recommend.ts` → `getRecommendations` | AI 发现 / 教练 / 首页 |
| `src/queries.ts` → `useAIMS(secid)` | React Query 封装（staleTime 15s） |

---

## 3. 评分结构（五维等权，各 20%）

| 维度 | key | 输入 | 打分函数 |
|---|---|---|---|
| 市场 | `market` | 四大指数平均涨跌 | `scoreMarket()` |
| 行业 | `industry` | 所属板块实时涨跌 | `scoreIndustry()` |
| 资金 | `capital` | 换手率 + 量比 | `scoreCapital()` |
| 趋势 | `trend` | MA / MACD / KDJ / RSI / 趋势结构 | `scoreTrend()` |
| 风险 | `risk` | 波动率 + 当日涨幅 + RSI 超买 | `scoreRisk()` |

> ⚠️ **风险维度取反**：`DimensionScore.score = 100 - riskLevel`（即"安全度"），
> 保证五维统一为"越高越好"；原始危险度存 `rawLevel`，UI 用 `invertColor` 反色显示。

### 3.1 计算公式

```
finalScore = Σ(每维 score × 0.2)                 // 五维加权分
userMatch  = scoreUserMatch(quote, klines, ctx)  // 用户匹配度 0-100
composite  = clamp(finalScore × 0.7 + userMatch × 0.3, 0, 100)
```

**为什么加 userMatch？** 同一只票，对激进短线用户和保守长线用户，结论必须不同。
这是"AI 投资教练"与"荐股软件"的本质区别。

---

## 4. 最终输出（五项，全产品统一口径）

| 输出 | 字段 | 计算 |
|---|---|---|
| 可以买指数 | `buyIndex` | `= composite` |
| 上涨概率 | `upProb` | `clamp(50 + (composite-50) × 0.9, 30, 92)` |
| 建议仓位 | `suggestedPosition` | 按 composite 分档，再受风险等级与用户风险偏好**双重封顶** |
| 风险指数 | `riskIndex` | 风险维度 `rawLevel`（越高越危险） |
| 一句话建议 | `oneLiner` | 由 action + 关键维度生成的人话 |

附加输出：`action`（买入/加仓/持有/减仓/卖出/观望）、`actionText`、`stopLoss`、`takeProfit`、
`behavioralNote`（行为提示）、`usedMemory`。

> **上涨概率上限锁定 92%、下限 30%**：任何声称"95% 必涨"的 AI 都是在骗人。
> 保留不确定性，是建立长期信任的前提。

---

## 5. 记忆系统联动（护城河核心）

`analyzeAIMS` 在打分后会读取 `useAimsMemoryStore.getContext()`，注入 `AIMSContext`：

```ts
{ riskTolerance, period, style, chaseHighStreak, goals }
```

### 5.1 行为矫正规则（已实现）

| 条件 | 干预 |
|---|---|
| `chaseHighStreak >= 2` 且当日涨幅 > 5% | 仓位 × 0.4，`action` 强制改为 **观望**，写入 `behavioralNote` |

示例输出：

> 「你之前连续 3 次追高失败，今天这只已涨 6.2%，建议不要追高。」

这条规则是 Project Phoenix 与所有荐股软件的分水岭：
**我们不只预测股票，我们纠正用户。**

### 5.2 错误类型识别

| 类型 | 判定 |
|---|---|
| `chase_high` | 买入/加仓 且 当日涨幅 > 5% |
| `no_stop` | 亏损持仓未设置止损 |
| `overtrade` | 短周期内交易次数异常 |

---

## 6. 准确率闭环

```
AIMS 产出推荐 → recordAIMS() 落库（含推荐时价格）
              → reconcile() 拉取现价判定胜负
              → stats(30) 输出「近30天：推荐38 上涨29 成功率76%」
```

Store：`src/store/aimsAccuracyStore.ts`　｜　UI：`components/aims/AccuracyPanel.tsx`

> **口径待固化（GAP-04，0.9 处理）**：当前"推荐后价格上涨即算胜"，
> 未定义持有周期与最小涨幅阈值，统计口径偏宽松，不得对外宣传该数字。

---

## 7. 可解释性规范

任何 AI 建议，UI 上**必须**提供"为什么"展开，内容固定为：

1. 五维评分（含每维人话 note）
2. 用户匹配度
3. 最终评分（composite）
4. 行为提示（若有）

组件：`components/aims/WhyExpansion.tsx`（禁止各页面自行实现解释 UI）

---

## 8. 页面接入现状（AI 联动核查表）

| 页面 | 入口 | 是否统一 |
|---|---|---|
| 首页 Today | `getRecommendations` | ✅ |
| AI 发现 | `getRecommendations` | ✅ |
| 持仓 | `getBatchAdvice` | ✅ |
| AI 教练 | `getRecommendations` | ✅ |
| 个股详情 | `getStockAdvice` | ✅ |

**核查方法**：任何新页面/新组件提交前，全局搜索 `computeTradeSignal`、`deriveMetrics`，
若在页面层直接调用即为**违规**，必须改走 AIMS。

---

## 9. 变更管控

修改 AIMS 的任何评分逻辑、权重、阈值，必须：

1. 在 PRD 记录变更动机
2. 在本文档更新公式
3. 在 09_ReleaseNote 声明"AI 结论可能变化"
4. 跑 08_TestPlan 的 AIMS 一致性用例

> **禁止**为了让某个页面"好看"而临时调参。
