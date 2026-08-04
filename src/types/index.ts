/**
 * 全局类型定义
 * 股票行情、K线、排行、板块、自选、指标、选股、公式等核心数据模型。
 */

/** 交易所 / 市场 */
export type Market = 'sh' | 'sz' | 'bj' | 'hk' | 'us';

/** K线周期 */
export type KlinePeriod = 'day' | 'week' | 'month' | 'min5' | 'min15' | 'min30' | 'min60';

/** 支持的指标键 */
export type IndicatorKey =
  | 'MA'
  | 'EMA'
  | 'MACD'
  | 'KDJ'
  | 'RSI'
  | 'BOLL'
  | 'VOL'
  | 'DMA'
  | 'WR'
  | 'DMI';

/** 个股基础信息 */
export interface StockInfo {
  code: string;
  name: string;
  market: Market;
  /** 东方财富 secid，如 1.600000 */
  secid: string;
  /** 拼音首字母（用于检索） */
  pinyin?: string;
  /** 所属行业 */
  industry?: string;
  /** 所属概念板块代码列表 */
  concepts?: string[];
}

/** 实时行情快照 */
export interface Quote {
  code: string;
  name: string;
  market: Market;
  /** 当前价 */
  price: number;
  /** 昨收 */
  preClose: number;
  /** 今开 */
  open: number;
  /** 最高 */
  high: number;
  /** 最低 */
  low: number;
  /** 成交量（手） */
  volume: number;
  /** 成交额（元） */
  amount: number;
  /** 振幅 (%) */
  amplitude: number;
  /** 涨跌幅 (%) */
  changePercent: number;
  /** 涨跌额 */
  change: number;
  /** 换手率 (%) */
  turnoverRate: number;
  /** 市盈率 */
  pe?: number;
  /** 总市值 */
  marketCap?: number;
  /** 流通市值 */
  floatCap?: number;
  /** 盘口：五档 */
  bids?: TradeTick[];
  asks?: TradeTick[];
  /** 更新时间戳 (ms) */
  timestamp: number;
}

/** 盘口档位 */
export interface TradeTick {
  price: number;
  volume: number;
}

/** 单根K线 */
export interface Kline {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  /** 成交额（元） */
  amount: number;
}

/** 分时数据点 */
export interface TimeSharePoint {
  time: string;
  price: number;
  /** 均价 */
  avgPrice: number;
  volume: number;
  /** 涨跌幅 */
  changePercent: number;
}

/** 板块信息 */
export interface Sector {
  code: string;
  name: string;
  /** 板块类型：行业 / 概念 / 地域 */
  type: 'industry' | 'concept' | 'region';
  changePercent: number;
  /** 领涨股 */
  leader?: string;
  /** 上涨家数 */
  upCount?: number;
  /** 下跌家数 */
  downCount?: number;
}

/** 排行榜条目 */
export interface RankItem {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  change: number;
  volume: number;
  amount: number;
  turnoverRate: number;
  /** 振幅（%） */
  amplitude?: number;
}

/** 指标参数配置 */
export interface IndicatorConfig {
  key: IndicatorKey;
  visible: boolean;
  params: Record<string, number>;
}

/** 选股条件类型 */
export type StrategyType =
  | 'MA_MULTI'
  | 'MA5_CROSS_MA10'
  | 'MA10_CROSS_MA20'
  | 'MACD_GOLD'
  | 'MACD_ABOVE_ZERO'
  | 'RSI_BELOW_30'
  | 'RSI_CROSS_50'
  | 'VOL_UP_GOING'
  | 'VOL_BREAK_PLATFORM'
  | 'NEW_HIGH_5'
  | 'NEW_HIGH_10'
  | 'NEW_HIGH_20'
  | 'CONTINUE_YANG'
  | 'CONTINUE_VOL'
  | 'VOL_SHRINK_PULLBACK';

/** 选股策略 */
export interface SelectStrategy {
  type: StrategyType;
  enabled: boolean;
  /** 自由参数，例如连续阳线天数 */
  params?: Record<string, number>;
}

/** 选股结果 */
export interface SelectResult {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  /** 换手率 (%) */
  turnoverRate: number;
  /** 成交额（元） */
  amount: number;
  /** 触发的条件 */
  matched: StrategyType[];
  /** 综合评分（0-100） */
  score?: number;
  /** 买入/卖出建议 */
  signal?: '买入' | '增持' | '观望' | '减持' | '卖出';
}

/**
 * 公式引擎 AST 节点。
 * 支持函数：MA EMA SMA REF COUNT IF CROSS HHV LLV ABS MAX MIN BARSLAST FILTER EVERY EXIST
 * 支持序列变量：OPEN HIGH LOW CLOSE VOL AMOUNT
 * 支持常量数字、二元运算 + - * /
 */
export type FormulaNode =
  | { kind: 'number'; value: number }
  | { kind: 'series'; field: 'OPEN' | 'HIGH' | 'LOW' | 'CLOSE' | 'VOL' | 'AMOUNT' }
  | {
      kind: 'binary';
      op: '+' | '-' | '*' | '/' | '&&' | '||' | '>' | '<' | '>=' | '<=' | '==' | '!=';
      left: FormulaNode;
      right: FormulaNode;
    }
  | {
      kind: 'call';
      name: string;
      args: FormulaNode[];
    };

/** 公式运行上下文（OHLCV 序列） */
export interface FormulaContext {
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  vol: number[];
  amount: number[];
}

/** 公式评估输出 */
export interface FormulaResult {
  /** 计算得到的序列（与输入等长） */
  series: number[];
  /** 文本错误信息（若有） */
  error?: string;
}

/** 数据源类型 */
export type DataProviderName = 'eastmoney' | 'sina' | 'tencent' | 'tonghuashun' | 'akshare';

/** 统一数据接口返回的错误 */
export interface ProviderError {
  message: string;
  provider: DataProviderName;
}
