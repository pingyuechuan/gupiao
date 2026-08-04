import { stockService } from '@/services/StockService';
import { computeTradeSignal, type TradeSignal } from '@/utils/tradeSignal';
import { computeKlineSignals, type KlineAiSignals } from '@/ai/klineSignals';
import { explainSignal } from '@/ai/translate';
import type { DerivedMetrics } from './metrics';
import { analyzeAIMS } from '@/aims/engine';
import type { Quote } from '@/types';
import type { AIMSResult, AiAction } from '@/aims/types';

export type { AiAction };

/** 把 AIMS 动作映射回 TradeSignal 的信号词（保持页面兼容） */
function mapActionToSignal(a: AiAction): TradeSignal['signal'] {
  switch (a) {
    case '买入':
      return '买入';
    case '加仓':
      return '增持';
    case '持有':
      return '观望';
    case '减仓':
      return '减持';
    case '卖出':
      return '卖出';
    case '观望':
    default:
      return '观望';
  }
}

export interface StockAdvice {
  quote: Quote;
  signal: TradeSignal;
  klineSignals: KlineAiSignals;
  headline: string;
  bullets: string[];
  action: AiAction;
  actionText: string;
  /** 建议仓位 % */
  positionPct: number;
  stopLoss: number;
  takeProfit: number;
  metrics: DerivedMetrics;
  /** AIMS 统一决策结果（所有 AI 建议的单一来源） */
  aims: AIMSResult;
}

/**
 * 拉取单只股票的全部 AI 建议。
 * 所有结论都来自 analyzeAIMS（AIMS 统一决策引擎）——个股建议、推荐、持仓诊断、教练共用同一套逻辑。
 */
export async function getStockAdvice(secid: string): Promise<StockAdvice> {
  const aims = await analyzeAIMS(secid);
  const klines = await stockService.getKline(secid, 'day');
  const klineSignals = computeKlineSignals(klines);
  const signal = computeTradeSignal(klines);
  const { headline, bullets } = explainSignal(signal, klines);

  const bulletsWithMemory = aims.behavioralNote ? [aims.behavioralNote, ...bullets] : bullets;

  return {
    quote: aims.quote!,
    signal: { ...signal, score: aims.composite, signal: mapActionToSignal(aims.action) },
    klineSignals,
    headline,
    bullets: bulletsWithMemory,
    action: aims.action,
    actionText: aims.actionText,
    positionPct: aims.suggestedPosition,
    stopLoss: aims.stopLoss,
    takeProfit: aims.takeProfit,
    metrics: { buyIndex: aims.buyIndex, upProb: aims.upProb, riskIndex: aims.riskIndex },
    aims,
  };
}

/** 批量拉取（自选股 / 持仓每日盯盘用） */
export async function getBatchAdvice(secids: string[]): Promise<StockAdvice[]> {
  const results = await Promise.all(secids.map((s) => getStockAdvice(s).catch(() => null)));
  return results.filter((x): x is StockAdvice => x !== null);
}
