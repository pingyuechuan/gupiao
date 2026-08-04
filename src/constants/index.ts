import type {
  DataProviderName,
  IndicatorConfig,
  IndicatorKey,
  KlinePeriod,
  Market,
  StrategyType,
} from '@/types';

/** 应用版本 / 阶段标识（Beta 反馈与首页展示用） */
export const APP_NAME = 'Project Phoenix';
export const APP_STAGE = 'Beta';
export const APP_VERSION = '0.8';

/** 默认数据源（本机东方财富 502，优先用同花顺） */
export const DEFAULT_PROVIDER: DataProviderName =
  (import.meta.env.VITE_DEFAULT_PROVIDER as DataProviderName) || 'tonghuashun';

/** AKShare 后端地址 */
export const AKSHARE_BASE_URL = import.meta.env.VITE_AKSHARE_BASE_URL || 'http://localhost:8000';

/** 颜色（深色主题） */
export const COLORS = {
  up: '#f5475b',
  down: '#2dbd6e',
  text: '#d7dae0',
  textDim: '#8a93a6',
  grid: 'rgba(255,255,255,0.06)',
  axis: '#5a6478',
  ma5: '#e8c64a',
  ma10: '#39a0ff',
  ma20: '#ff7ac3',
  ma60: '#9d7bff',
  macd: '#e8c64a',
  dif: '#39a0ff',
  dea: '#ff7ac3',
  vol: '#39a0ff',
  kdjK: '#e8c64a',
  kdjD: '#39a0ff',
  kdjJ: '#ff7ac3',
  bollMid: '#e8c64a',
  bollUp: '#39a0ff',
  bollLow: '#ff7ac3',
  bg: '#0b0e14',
  panel: '#12161f',
  border: 'rgba(255,255,255,0.08)',
} as const;

/** 指数/大盘代码（用于首页大盘概览） */
export const INDEX_CODES: string[] = [
  '1.000001', // 上证指数
  '0.399001', // 深证成指
  '0.399006', // 创业板指
  '1.000300', // 沪深300
];

/** 默认自选股 */
export const DEFAULT_WATCHLIST: string[] = [
  '1.600519', // 贵州茅台
  '0.000858', // 五粮液
  '1.601318', // 中国平安
  '0.300750', // 宁德时代
  '1.600036', // 招商银行
];

/** K线周期映射（东方财富 klt 参数） */
export const PERIOD_KLT: Record<Exclude<KlinePeriod, 'day' | 'week' | 'month'>, number> = {
  min5: 101,
  min15: 102,
  min30: 103,
  min60: 104,
};

/** 东方财富日/周/月字段 */
export const PERIOD_FIELD: Record<'day' | 'week' | 'month', string> = {
  day: '101',
  week: '102',
  month: '103',
};

/** 指标默认配置 */
export const DEFAULT_INDICATORS: Record<IndicatorKey, IndicatorConfig> = {
  MA: { key: 'MA', visible: true, params: { n1: 5, n2: 10, n3: 20, n4: 60 } },
  EMA: { key: 'EMA', visible: false, params: { n1: 12, n2: 26 } },
  MACD: { key: 'MACD', visible: true, params: { fast: 12, slow: 26, signal: 9 } },
  KDJ: { key: 'KDJ', visible: true, params: { n: 9, m1: 3, m2: 3 } },
  RSI: { key: 'RSI', visible: false, params: { n1: 6, n2: 12, n3: 24 } },
  BOLL: { key: 'BOLL', visible: false, params: { n: 20, k: 2 } },
  VOL: { key: 'VOL', visible: true, params: { n: 5 } },
  DMA: { key: 'DMA', visible: false, params: { n1: 10, n2: 50 } },
  WR: { key: 'WR', visible: false, params: { n: 14 } },
  DMI: { key: 'DMI', visible: false, params: { n: 14, m: 6 } },
};

/** 指标中文名 */
export const INDICATOR_LABELS: Record<IndicatorKey, string> = {
  MA: '均线',
  EMA: '指数均线',
  MACD: '指数平滑异同',
  KDJ: '随机指标',
  RSI: '相对强弱',
  BOLL: '布林带',
  VOL: '成交量',
  DMA: '平行线差',
  WR: '威廉指标',
  DMI: '趋向指标',
};

/** 选股策略元数据 */
export interface StrategyMeta {
  type: StrategyType;
  label: string;
  desc: string;
  /** 是否需要参数 */
  hasParams?: { key: string; label: string; default: number }[];
}

export const STRATEGY_META: StrategyMeta[] = [
  { type: 'MA_MULTI', label: 'MA多头排列', desc: 'MA5>MA10>MA20>MA60' },
  { type: 'MA5_CROSS_MA10', label: 'MA5上穿MA10', desc: '金叉' },
  { type: 'MA10_CROSS_MA20', label: 'MA10上穿MA20', desc: '金叉' },
  { type: 'MACD_GOLD', label: 'MACD金叉', desc: 'DIF 上穿 DEA' },
  { type: 'MACD_ABOVE_ZERO', label: 'MACD零轴以上', desc: 'DIF 与 DEA 均大于0' },
  { type: 'RSI_BELOW_30', label: 'RSI低于30', desc: '超卖' },
  { type: 'RSI_CROSS_50', label: 'RSI突破50', desc: 'RSI 上穿50' },
  { type: 'VOL_UP_GOING', label: '放量上涨', desc: '量比放大且收阳' },
  { type: 'VOL_BREAK_PLATFORM', label: '放量突破平台', desc: '突破N日新高且放量' },
  { type: 'NEW_HIGH_5', label: '五日新高', desc: '创5日收盘新高' },
  { type: 'NEW_HIGH_10', label: '十日新高', desc: '创10日收盘新高' },
  { type: 'NEW_HIGH_20', label: '二十日新高', desc: '创20日收盘新高' },
  {
    type: 'CONTINUE_YANG',
    label: '连续阳线',
    desc: '连续N根阳线',
    hasParams: [{ key: 'days', label: '天数', default: 3 }],
  },
  {
    type: 'CONTINUE_VOL',
    label: '连续放量',
    desc: '连续N日放量',
    hasParams: [{ key: 'days', label: '天数', default: 3 }],
  },
  { type: 'VOL_SHRINK_PULLBACK', label: '缩量回踩', desc: '缩量回踩未破MA20' },
];

/** 市场中文名 */
export const MARKET_LABELS: Record<Market, string> = {
  sh: '沪市',
  sz: '深市',
  bj: '北交所',
  hk: '港股',
  us: '美股',
};

/** 默认A股成分示例（用于列表/排行兜底，真实数据来自接口） */
export const FALLBACK_STOCKS: { code: string; name: string }[] = [
  { code: '1.600519', name: '贵州茅台' },
  { code: '0.000858', name: '五粮液' },
  { code: '1.601318', name: '中国平安' },
  { code: '0.300750', name: '宁德时代' },
  { code: '1.600036', name: '招商银行' },
  { code: '0.000001', name: '平安银行' },
  { code: '1.600276', name: '恒瑞医药' },
  { code: '0.002594', name: '比亚迪' },
];
