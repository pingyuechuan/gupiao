import { stockService } from '@/services/StockService';
import { computeTradeSignal } from '@/utils/tradeSignal';
import { computeKlineSignals } from '@/ai/klineSignals';
import { clamp } from '@/ai/metrics';
import { getMarketContext } from './context';
import { useAimsMemoryStore } from '@/store/aimsMemoryStore';
import {
  scoreMarket,
  scoreIndustry,
  scoreCapital,
  scoreTrend,
  scoreRisk,
  scoreUserMatch,
  resolveSector,
} from './scoring';
import type { AIMSResult, AiAction, DimensionScore } from './types';

function basePosition(composite: number): number {
  if (composite >= 80) return 50;
  if (composite >= 65) return 40;
  if (composite >= 45) return 30;
  if (composite >= 30) return 15;
  return 0;
}

function buildActionText(action: AiAction, chg: number, riskLevel: number, note?: string): string {
  if (note) return note;
  switch (action) {
    case '买入':
      return chg < 6 ? '技术面与资金共振，可分批建仓，别一次买满。' : '结构偏强，但已涨不少，回踩再动手更稳。';
    case '加仓':
      return '趋势偏强，可逢低加仓。';
    case '持有':
      return '信号中性，先持有观察，别追高。';
    case '减仓':
      return riskLevel > 60 ? '波动加大，建议降低仓位、锁定部分利润。' : '动能转弱，建议降低仓位观望。';
    case '卖出':
      return '技术面偏弱，以控制风险为主。';
    case '观望':
    default:
      return '方向不明，先观望，等更明确的信号。';
  }
}

function buildOneLiner(action: AiAction, note: string | undefined, riskLevel: number): string {
  if (note) return note;
  const prefix =
    action === '买入' ? '可以买' : action === '加仓' ? '可加仓' : action === '持有' ? '继续持有' : action === '减仓' ? '建议减仓' : action === '卖出' ? '建议卖出' : '先观望';
  const riskTail = riskLevel >= 70 ? '（短期风险偏高，注意仓位）' : riskLevel >= 45 ? '（设好止损）' : '（风险可控）';
  return `${prefix}${riskTail}`;
}

/**
 * AIMS 统一决策入口。
 * 个股建议 / 推荐 / 持仓诊断 / 教练 全部走这里，保证「同一套评分、同一个结论」。
 */
export async function analyzeAIMS(secid: string): Promise<AIMSResult> {
  const [quote, klines, ctx] = await Promise.all([
    stockService.getQuote(secid),
    stockService.getKline(secid, 'day'),
    getMarketContext(),
  ]);

  const signal = computeTradeSignal(klines);
  const klineSignals = computeKlineSignals(klines);
  const sector = resolveSector(secid, ctx.sectors);

  const mem = useAimsMemoryStore.getState().getContext();

  const market = scoreMarket(ctx.avgIndexChange);
  const industry = scoreIndustry(sector);
  const capital = scoreCapital(quote, klines);
  const trend = scoreTrend(signal);
  const risk = scoreRisk(quote, klines);
  const userMatch = scoreUserMatch(quote, klines, mem);

  const dims: DimensionScore[] = [
    { key: 'market', label: '市场', score: market.score, weight: 0.2, note: market.note },
    { key: 'industry', label: '行业', score: industry.score, weight: 0.2, note: industry.note },
    { key: 'capital', label: '资金', score: capital.score, weight: 0.2, note: capital.note },
    { key: 'trend', label: '趋势', score: trend.score, weight: 0.2, note: trend.note },
    {
      key: 'risk',
      label: '风险',
      score: 100 - risk.level,
      weight: 0.2,
      note: risk.note,
      invertColor: true,
      rawLevel: risk.level,
    },
  ];

  // 安全兜底：任一维度 NaN 时该维度按 50（中性）计，防止全盘 NaN
  const safeDims = dims.map((d) => ({
    ...d,
    score: Number.isFinite(d.score) ? d.score : 50,
    rawLevel: Number.isFinite(d.rawLevel ?? 0) ? d.rawLevel : 50,
  }));

  const finalScore = Math.round(safeDims.reduce((s, d) => s + d.score * d.weight, 0));
  const composite = clamp(Math.round(finalScore * 0.7 + userMatch.score * 0.3), 0, 100);

  // 结合历史行为（AI 记忆系统）
  let behavioralNote: string | undefined;
  let positionMul = 1;
  if (mem.chaseHighStreak >= 2 && quote.changePercent > 5) {
    behavioralNote = `你之前连续 ${mem.chaseHighStreak} 次追高失败，今天这只已涨 ${quote.changePercent.toFixed(1)}%，建议先别追，等回踩企稳再考虑。`;
    positionMul = 0.4;
  } else if (mem.chaseHighStreak >= 1 && quote.changePercent > 7) {
    behavioralNote = `你近期有追高记录，这只已涨不少，注意分批、别一次买满。`;
    positionMul = 0.7;
  }

  const buyIndex = composite;
  const upProb = clamp(Math.round(50 + (composite - 50) * 0.9), 30, 92);

  let position = basePosition(composite);
  const safeRiskLevel = Number.isFinite(risk.level) ? risk.level : 50;
  if (safeRiskLevel > 70) position = Math.round(position * 0.5);
  else if (safeRiskLevel > 55) position = Math.round(position * 0.8);
  position = Math.round(position * positionMul);
  if (mem.riskTolerance === '低') position = Math.min(position, 40);
  if (mem.riskTolerance === '高') position = Math.min(position, 60);

  let action: AiAction;
  if (behavioralNote && quote.changePercent > 5) action = '观望';
  else if (composite >= 80) action = '买入';
  else if (composite >= 65) action = '加仓';
  else if (composite >= 45) action = '持有';
  else if (composite >= 30) action = '减仓';
  else action = '卖出';

  const actionText = buildActionText(action, quote.changePercent, safeRiskLevel, behavioralNote);
  const oneLiner = buildOneLiner(action, behavioralNote, safeRiskLevel);

  return {
    secid,
    code: quote.code,
    name: quote.name,
    quote,
    dimensions: dims,
    finalScore,
    userMatch: userMatch.score,
    composite,
    buyIndex,
    upProb,
    suggestedPosition: position,
    riskIndex: safeRiskLevel,
    oneLiner,
    action,
    actionText,
    stopLoss: klineSignals.stopLoss,
    takeProfit: klineSignals.takeProfit,
    behavioralNote,
    usedMemory: !!behavioralNote,
  };
}
