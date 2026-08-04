# A股智能看盘终端 (A-Share Stock Terminal)

一套完整的 A 股股票看盘与智能选股软件，界面参考 TradingView / 同花顺 / 东方财富 专业布局，
基于 **React 18 + TypeScript + Vite + Ant Design + ECharts + Zustand + Axios** 构建。

## 功能一览

- **首页 Dashboard**：大盘指数概览、涨幅/成交额/换手率/振幅排行榜、板块动向。
- **个股详情**：实时行情、分时图、K 线（日/周/月/5·15·30·60 分）、成交量、五档盘口、指标面板。
- **行情排行**：涨跌幅 / 跌幅 / 成交额 / 换手率 / 振幅 多榜单。
- **自选股**：本地持久化（localStorage），实时报价，一键加/删。
- **板块浏览**：行业 / 概念 / 地域，支持筛选与搜索。
- **技术指标**：MA、EMA、MACD、KDJ、RSI、BOLL、VOL、DMA、WR、DMI，均可独立开关与参数调整。
- **智能选股**：内置 15 种策略（MA 多头排列、金叉系列、MACD 系列、RSI 系列、放量/缩量、各周期新高、
  连续阳线/放量、缩量回踩），支持多条件组合。
- **公式编辑器**：内置公式引擎，支持 `MA EMA SMA REF COUNT IF CROSS HHV LLV ABS MAX MIN BARSLAST FILTER EVERY EXIST`
  以及 `+ - * / > < >= <= == != && ||` 运算，可视化回测信号。

## 技术特性

- **多数据源抽象**：统一 `IDataProvider` 接口，内置 东方财富 / 新浪 / 腾讯 / AKShare 实现，
  业务层通过 `stockService` 调用，**切换数据源无需改动任何业务逻辑**（顶栏即可切换）。
- **深色专业主题**，左侧股票列表、顶部工具栏、中间 K 线、右侧指标 / 盘口的可缩放布局。
- **模块化工程**：`components / pages / hooks / services / store / utils / types / styles / assets / public`。
- **预留扩展能力**：AI 分析、策略引擎、指标引擎、插件系统、回测系统、预警系统、多数据源、消息中心
  均在架构层面预留接口（如 `useAlertStore` 预警、`IDataProvider` 多源、`FormulaEngine` 指标/公式引擎）。

## 运行方式

> ⚠️ **不要直接双击打开项目根目录的 `index.html`**（它本质是 Vite 开发入口，需要本地 dev server 转译 JS 并提供行情接口代理）。直接双击会白屏；正确方式如下：

### 方式一：命令行启动（推荐）

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（Vite 已配置公开行情接口代理，规避浏览器跨域）
npm run dev

# 3. 浏览器访问终端提示的地址（默认 http://localhost:5173 ）
```

### 方式二：Windows 一键启动

直接双击项目根目录的 **`start.bat`**，脚本会自动执行 `npm run dev` 并打开命令行窗口。

### 方式三：开发入口自动跳转

若误双击了 `index.html`，现在会显示启动指引页面，并自动尝试跳转到 `http://localhost:5173/`（前提是你已经运行了 `npm run dev`）。

### 常用脚本

```bash
npm run build      # 构建生产包到 dist/
npm run typecheck  # TypeScript 类型检查
npm run lint       # ESLint 代码检查
```

## 数据源说明

- 默认使用**东方财富**公开接口（经 `vite.config.ts` 的 dev proxy 转发，无需登录）。
- 公开行情接口存在频率与跨域限制，已在 `services/StockService.ts` 内做缓存与容错；
  若出现短暂失败会自动重试或降级。
- 若需接入 **AKShare** 本地后端，部署一个转发网关并在 `.env` 中设置
  `VITE_AKSHARE_BASE_URL`（同时可在顶栏切换数据源为 AKShare）。后端约定接口见
  `src/services/providers/AKShareProvider.ts` 注释。
- 未来接入券商 API：只需新增一个实现 `IDataProvider` 的类，注册到 `providers/index.ts` 即可，
  **业务代码零改动**。

## 目录结构

```
src/
├── components/      # 图表、股票、行情、板块、选股、公式、布局等组件
│   ├── charts/      # KLineChart / TimeShareChart
│   ├── stock/       # StockSearch / Watchlist / QuoteHeader / OrderBook
│   ├── market/      # RankTable
│   ├── sector/      # SectorList
│   ├── select/      # StrategyPanel
│   ├── formula/     # FormulaEditor
│   ├── indicators/  # IndicatorPanel
│   └── layout/      # AppHeader / AppLayout
├── pages/           # HomePage / StockDetailPage / MarketPage / WatchlistPage / SectorPage / SelectStockPage / FormulaEditorPage
├── hooks/           # useECharts / useStockQuote / useKline / useStockSearch / useMarketData
├── services/        # StockService + providers（多数据源）
├── store/           # Zustand：UI / 自选 / 策略 / 预警
├── utils/           # indicators / formula / selectors / format / echartsTheme
├── types/           # 全局类型
├── styles/          # global.css / theme.ts
├── assets/
├── App.tsx / main.tsx
└── vite-env.d.ts
```

> 本项目不依赖任何需要人工登录的数据，全部使用公开行情接口；如发现个别接口临时不可用，
> 可切换数据源或稍后重试，核心架构与功能不受影响。
