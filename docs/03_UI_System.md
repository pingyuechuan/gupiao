# 03 — UI 设计规范（UI System）

版本：`0.7`　｜　唯一真源：`tailwind.config.js` + `src/styles`

> **禁止**在业务代码里写死十六进制颜色、任意间距、任意圆角。
> 一律使用本文档定义的 Token（即 Tailwind 类名）。

---

## 1. 主题

深色玻璃拟态（Dark Glassmorphism）。**Beta 阶段不提供浅色主题**
（理由：投资场景多在夜间复盘，且双主题会让维护成本翻倍 — Less but Better）。

---

## 2. 颜色 Token

### 2.1 涨跌色（A 股惯例：涨红跌绿）

| Token | 值 | 用途 |
|---|---|---|
| `up` | `#ff5470` | 上涨 / 买入倾向 |
| `down` | `#19c37d` | 下跌 / 卖出倾向 |

> ⚠️ **严禁**使用欧美惯例（涨绿跌红）。这是中国用户的认知底线。

### 2.2 背景层级

| Token | 值 | 用途 |
|---|---|---|
| `ink-900` | `#06080f` | 页面最底 |
| `ink-800` | `#0a0e18` | 主背景 |
| `ink-700` | `#10141f` | 区块 |
| `ink-600` | `#161b29` | 卡片底 |
| `ink-500` | `#1d2233` | 悬浮层 |

### 2.3 玻璃与描边

| Token | 值 |
|---|---|
| `glass` | `rgba(255,255,255,0.045)` |
| `glass-strong` | `rgba(255,255,255,0.07)` |
| `line` | `rgba(255,255,255,0.08)` |

### 2.4 强调色

| Token | 值 | 语义 |
|---|---|---|
| `accent` | `#5b8cff` | 主强调（AI / 交互） |
| `accent-cyan` | `#37e6c9` | 次强调（正向 / 成长） |
| `accent-violet` | `#a06bff` | 点缀（高级感 / 勋章） |

### 2.5 文字

| Token | 值 | 用途 |
|---|---|---|
| `txt` | `#e8ebf2` | 主文字 |
| `txt-dim` | `#8b93a7` | 次要说明 |
| `txt-faint` | `#5a6478` | 弱提示 / 占位 |

### 2.6 图表色（`src/constants/index.ts → COLORS`）

图表**不使用** Tailwind Token，统一读 `COLORS` 常量（ECharts 需要字符串色值）。
MA5 `#e8c64a` / MA10 `#39a0ff` / MA20 `#ff7ac3` / MA60 `#9d7bff`。

---

## 3. 字体

| 场景 | 字体栈 |
|---|---|
| 正文 `font-sans` | Inter → system-ui → PingFang SC → Microsoft YaHei |
| 数字/代码 `font-mono` | JetBrains Mono → ui-monospace → SFMono-Regular |

**规则**：所有**价格、涨跌幅、评分、仓位百分比**必须用 `font-mono`，防止数字跳动。

### 3.1 字号阶梯

| 用途 | 类名 |
|---|---|
| 页面主标题 | `text-[20px] font-semibold` |
| 区块标题 | `text-[15px] font-semibold` |
| 正文 | `text-[13.5px]` |
| 说明/次要 | `text-[12px] text-txt-dim` |
| 弱提示 | `text-[11px] text-txt-faint` |
| 关键数字 | `text-[22px] font-bold font-mono` |

---

## 4. 圆角

| Token | 值 | 用途 |
|---|---|---|
| `rounded-xl` | 16px | 小卡片 / 按钮 |
| `rounded-2xl` | 20px | 标准卡片 |
| `rounded-3xl` | 26px | 大容器 / 弹层 |

**禁止**使用 `rounded-md` / `rounded-sm` 等默认档位。

---

## 5. 间距

| 场景 | 规则 |
|---|---|
| 页面级区块纵向间距 | `space-y-5` |
| 卡片内部 padding | `p-4`（标准）/ `p-5`（重点卡） |
| 卡片内元素间距 | `gap-3` |
| 栅格间距 | `gap-3` / `gap-4` |

只允许 `3 / 4 / 5` 三档，禁止出现 `p-[13px]` 之类的魔法值。

---

## 6. 阴影与背景

| Token | 用途 |
|---|---|
| `shadow-glass` | 所有 GlassCard 的默认阴影 |
| `shadow-glow` | 主强调发光（AI 结论、关键 CTA） |
| `shadow-glow-cyan` | 正向状态发光 |
| `bg-accent-grad` | 青→蓝→紫渐变，仅用于 **AI 相关**元素 |
| `bg-glass-grad` | 卡片玻璃渐变 |
| `bg-radial-glow` | 页面顶部氛围光，**每页最多一处** |

> `bg-accent-grad` 是 AI 的视觉签名，**禁止**用在非 AI 元素上，否则强调失效。

---

## 7. 动效

| 类名 | 时长 | 用途 |
|---|---|---|
| `animate-shimmer` | 1.6s | 骨架屏加载 |
| `animate-pulse-soft` | 2.4s | 实时数据心跳 |
| `animate-float` | 5s | 空态插画 |
| `animate-gradient-x` | 6s | AI 渐变流动 |

Framer Motion 规范：

- 页面切换：`opacity` + `y: 8px`，`duration: 0.22`，`ease: easeOut`
- 卡片入场：`stagger 0.04s`，**最多 stagger 前 8 个**（再多会显得卡顿）
- **禁止**：弹跳（spring bounce）、旋转、缩放 > 1.05 的夸张动效
  — 投资产品的动效必须"稳"，花哨会削弱信任感

---

## 8. 状态色语义（评分 / 建议）

由 `src/components/ui/index.tsx` 统一提供，禁止各页面重复实现：

| 函数 | 作用 |
|---|---|
| `scoreColor(score)` | 评分 → 颜色 |
| `changeTone(value)` | 涨跌值 → 颜色（自动遵循涨红跌绿） |

---

## 9. 无障碍与可读性下限

- 正文对比度 ≥ 4.5:1；`txt-faint` 仅可用于非关键信息
- 关键结论（action / 一句话建议）**不得**只靠颜色区分，必须有文字
- 最小可点击区域 32×32px

---

## 10. 变更流程

修改任何 Token：

1. 改 `tailwind.config.js`（唯一真源）
2. 同步更新本文档
3. 全局回归截图对比
4. 写入 09_ReleaseNote

**禁止**只在某个页面里"临时改一下颜色"。
