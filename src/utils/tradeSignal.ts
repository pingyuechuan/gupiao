import type { Kline } from '@/types';
import { sma, computeMACD, computeKDJ, computeRSI } from './indicators';

export interface TradeSignal {
  /** 综合评分 0-100 */
  score: number;
  /** 操作建议 */
  signal: '买入' | '增持' | '观望' | '减持' | '卖出';
  /** 评分维度明细 */
  details: {
    maScore: number;
    macdScore: number;
    kdjScore: number;
    rsiScore: number;
    volumeScore: number;
    trendScore: number;
  };
  /** 文字理由 */
  reasons: string[];
}

/**
 * 基于 K 线数据给出综合评分与买卖建议。
 * 仅供学习参考，不构成投资建议。
 */
export function computeTradeSignal(klines: Kline[]): TradeSignal {
  if (klines.length < 30) {
    return {
      score: 0,
      signal: '观望',
      details: { maScore: 0, macdScore: 0, kdjScore: 0, rsiScore: 0, volumeScore: 0, trendScore: 0 },
      reasons: ['K线数据不足，无法评分'],
    };
  }

  const closes = klines.map((k) => k.close);
  const volumes = klines.map((k) => k.volume);

  // MA 多头排列评分
  const ma5 = sma(closes, 5);
  const ma10 = sma(closes, 10);
  const ma20 = sma(closes, 20);
  const ma60 = sma(closes, 60);
  const maScore = computeMaScore(closes, ma5, ma10, ma20, ma60);

  // MACD 评分
  const macdRes = computeMACD(closes);
  const macdScore = computeMacdScore(macdRes);

  // KDJ 评分
  const kdjRes = computeKDJ(
    klines.map((k) => k.high),
    klines.map((k) => k.low),
    closes,
  );
  const kdjScore = computeKdjScore(kdjRes);

  // RSI 评分
  const rsi6 = computeRSI(closes, 6);
  const rsi12 = computeRSI(closes, 12);
  const rsiScore = computeRsiScore(rsi6, rsi12);

  // 量能评分
  const volumeScore = computeVolumeScore(volumes);

  // 趋势评分（近期高低点、当前位置）
  const trendScore = computeTrendScore(closes);

  const total = maScore + macdScore + kdjScore + rsiScore + volumeScore + trendScore;
  const score = Math.max(0, Math.min(100, Math.round(total)));

  const reasons = buildReasons(score, maScore, macdScore, kdjScore, rsiScore, volumeScore, trendScore);

  let signal: TradeSignal['signal'] = '观望';
  if (score >= 80) signal = '买入';
  else if (score >= 65) signal = '增持';
  else if (score >= 40) signal = '观望';
  else if (score >= 25) signal = '减持';
  else signal = '卖出';

  return {
    score,
    signal,
    details: { maScore, macdScore, kdjScore, rsiScore, volumeScore, trendScore },
    reasons,
  };
}

function lastValid<T extends number | null | undefined>(arr: T[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) return v;
  }
  return null;
}

function computeMaScore(
  closes: number[],
  ma5: number[],
  ma10: number[],
  ma20: number[],
  ma60: number[],
): number {
  const l5 = lastValid(ma5);
  const l10 = lastValid(ma10);
  const l20 = lastValid(ma20);
  const l60 = lastValid(ma60);
  if (!l5 || !l10 || !l20 || !l60) return 10;

  const price = closes[closes.length - 1];
  let score = 0;
  // 多头排列
  if (l5 > l10 && l10 > l20 && l20 > l60) score += 20;
  else if (l5 > l10 && l10 > l20) score += 12;
  else if (l5 > l10) score += 6;
  else if (l5 < l10 && l10 < l20 && l20 < l60) score += 0;
  else score += 5;

  // 价格在 MA20/MA60 上方
  if (price > l20) score += 8;
  if (price > l60) score += 7;
  else if (price < l60) score -= 5;

  return Math.max(0, Math.min(35, score));
}

function computeMacdScore(macdRes: { dif: number[]; dea: number[]; macd: number[] }): number {
  const dif = lastValid(macdRes.dif);
  const dea = lastValid(macdRes.dea);
  const bar = lastValid(macdRes.macd);
  if (!dif || !dea || !bar) return 10;

  let score = 10;
  if (dif > dea) score += 8;
  if (bar > 0) score += 8;
  if (dif > 0 && dea > 0) score += 8;
  // 金叉（上穿）
  const prevDif = macdRes.dif[macdRes.dif.length - 2];
  const prevDea = macdRes.dea[macdRes.dea.length - 2];
  if (prevDif !== null && prevDea !== null && prevDif <= prevDea && dif > dea) score += 10;

  return Math.max(0, Math.min(30, score));
}

function computeKdjScore(kdjRes: { k: number[]; d: number[]; j: number[] }): number {
  const k = lastValid(kdjRes.k);
  const d = lastValid(kdjRes.d);
  const j = lastValid(kdjRes.j);
  if (!k || !d || !j) return 10;

  let score = 10;
  if (k > d) score += 5;
  if (j > k && k > d) score += 8;
  if (j < 20) score += 8;
  else if (j > 80) score -= 8;

  return Math.max(0, Math.min(20, score));
}

function computeRsiScore(rsi6: number[], rsi12: number[]): number {
  const r6 = lastValid(rsi6);
  const r12 = lastValid(rsi12);
  if (!r6 || !r12) return 10;

  let score = 10;
  if (r6 > r12) score += 4;
  if (r6 > 50) score += 4;
  if (r6 < 30) score += 4;
  else if (r6 > 70) score -= 6;

  return Math.max(0, Math.min(15, score));
}

function computeVolumeScore(volumes: number[]): number {
  if (volumes.length < 10) return 5;
  const recent = volumes.slice(-5).reduce((a, b) => a + b, 0) / 5;
  const before = volumes.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
  if (!before) return 5;
  const ratio = recent / before;
  let score = 5;
  if (ratio > 2) score += 12;
  else if (ratio > 1.5) score += 8;
  else if (ratio > 1.2) score += 4;
  else if (ratio < 0.8) score -= 3;
  return Math.max(0, Math.min(15, score));
}

function computeTrendScore(closes: number[]): number {
  if (closes.length < 20) return 5;
  const recent20 = closes.slice(-20);
  const high20 = Math.max(...recent20);
  const low20 = Math.min(...recent20);
  const price = closes[closes.length - 1];
  const range = high20 - low20;
  if (!range) return 5;

  const position = (price - low20) / range;
  let score = 5;
  if (position > 0.7) score += 8;
  else if (position > 0.5) score += 4;
  else if (position < 0.3) score -= 4;

  // 近5日趋势
  const change5 = (price - closes[closes.length - 5]) / closes[closes.length - 5];
  if (change5 > 0.1) score += 7;
  else if (change5 > 0.05) score += 4;
  else if (change5 < -0.1) score -= 6;
  else if (change5 < -0.05) score -= 3;

  return Math.max(0, Math.min(15, score));
}

function buildReasons(
  score: number,
  maScore: number,
  macdScore: number,
  kdjScore: number,
  rsiScore: number,
  volumeScore: number,
  trendScore: number,
): string[] {
  const reasons: string[] = [];
  if (score >= 70) reasons.push('综合评分较高，技术面偏强');
  else if (score <= 35) reasons.push('综合评分较低，技术面偏弱');
  else reasons.push('综合评分中性，建议观望');

  if (maScore >= 25) reasons.push('均线多头排列');
  else if (maScore <= 10) reasons.push('均线空头排列');

  if (macdScore >= 20) reasons.push('MACD 处于强势区');
  else if (macdScore <= 10) reasons.push('MACD 偏弱');

  if (kdjScore >= 14) reasons.push('KDJ 金叉或低位反弹');
  else if (kdjScore <= 6) reasons.push('KDJ 高位钝化或死叉');

  if (rsiScore >= 12) reasons.push('RSI 处于强势区');
  else if (rsiScore <= 6) reasons.push('RSI 偏弱或超卖');

  if (volumeScore >= 12) reasons.push('近期放量，资金关注');
  else if (volumeScore <= 5) reasons.push('量能萎缩');

  if (trendScore >= 12) reasons.push('处于近期高位或上升趋势');
  else if (trendScore <= 4) reasons.push('处于近期低位或下降趋势');

  return reasons;
}
