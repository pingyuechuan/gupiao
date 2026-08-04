/**
 * AIMS — AI Investment Management System
 * AI 统一决策引擎的类型定义。
 *
 * 所有 AI 建议（个股建议 / 推荐 / 持仓诊断 / 教练）都必须通过 analyzeAIMS 这一个入口，
 * 保证「同一套评分逻辑、同一个结论来源」。
 */

/** 五大评分维度（各占 20%） */
export type DimKey = 'market' | 'industry' | 'capital' | 'trend' | 'risk';

/** 统一操作动作（全产品共用） */
export type AiAction = '买入' | '加仓' | '持有' | '减仓' | '卖出' | '观望';

export interface DimensionScore {
  key: DimKey;
  label: string;
  /** 0-100；除 risk 外越高越好。risk 维度该值为「安全度」，越高越安全 */
  score: number;
  /** 权重，固定 0.2 */
  weight: number;
  /** 人话解释 */
  note: string;
  /** risk 维度为 true：颜色应反向（分数越高=越危险） */
  invertColor?: boolean;
  /** risk 维度原始风险等级（越高越危险），用于 UI 展示 */
  rawLevel?: number;
}

/** 传入引擎的用户上下文（来自 AI 记忆系统 + 用户画像） */
export interface AIMSContext {
  riskTolerance: '低' | '中' | '高';
  period: '短线' | '中线' | '长线';
  style: '稳健' | '价值' | '成长' | '激进';
  /** 连续追高次数（来自记忆系统） */
  chaseHighStreak: number;
  goals: string[];
}

/** AI 统一决策结果 */
export interface AIMSResult {
  secid: string;
  code: string;
  name: string;
  quoteCode?: string;
  /** 原始行情（页面渲染用） */
  quote?: import('@/types').Quote;

  /** 五大维度（各 20%） */
  dimensions: DimensionScore[];

  /** 五维加权分（0-100） */
  finalScore: number;
  /** 用户匹配度（0-100） */
  userMatch: number;
  /** 最终评分 = 五维 × 0.7 + 用户匹配度 × 0.3（0-100） */
  composite: number;

  /** 可以买指数（0-100）= composite */
  buyIndex: number;
  /** 上涨概率 % */
  upProb: number;
  /** 建议仓位 % */
  suggestedPosition: number;
  /** 风险指数（0-100，越高越危险） */
  riskIndex: number;

  /** 一句话建议 */
  oneLiner: string;
  /** 操作动作 */
  action: AiAction;
  /** 操作说明 */
  actionText: string;

  /** 止损参考价 */
  stopLoss: number;
  /** 止盈参考价 */
  takeProfit: number;

  /** 结合历史行为的提示（来自记忆系统），无则为空 */
  behavioralNote?: string;
  /** 本次建议是否使用了记忆系统 */
  usedMemory: boolean;
}
