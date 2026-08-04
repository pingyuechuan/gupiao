import type { Kline } from '@/types';
import { computeMACD, computeRSI, computeBOLL } from '@/utils/indicators';
import { computeTradeSignal, type TradeSignal } from '@/utils/tradeSignal';

export interface AiMarkPoint {
  date: string;
  price: number;
  label: string;
}

export interface KlineAiSignals {
  /** 最近一次金叉（AI买点） */
  buy: AiMarkPoint | null;
  /** 最近一次死叉（AI卖点） */
  sell: AiMarkPoint | null;
  /** 止盈价 */
  takeProfit: number;
  /** 止损价 */
  stopLoss: number;
  /** 关键支撑 */
  support: number;
  /** 关键压力 */
  resistance: number;
  /** 风险区（价格带上沿），用于K线阴影 */
  riskZone: { from: number; to: number } | null;
  /** 当前综合建议 */
  signal: TradeSignal;
  /** 一句话结论 */
  conclusion: string;
}

function last(arr: (number | null | undefined)[], n = 1): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) return v;
    if (n <= 1) break;
    n--;
  }
  return null;
}

export function computeKlineSignals(klines: Kline[]): KlineAiSignals {
  const closes = klines.map((k) => k.close);
  const price = closes[closes.length - 1] ?? 0;
  const signal = computeTradeSignal(klines);

  // MACD 金叉 / 死叉
  const macd = computeMACD(closes);
  let buy: AiMarkPoint | null = null;
  let sell: AiMarkPoint | null = null;
  for (let i = 1; i < macd.dif.length; i++) {
    const d0 = macd.dif[i - 1];
    const de0 = macd.dea[i - 1];
    const d1 = macd.dif[i];
    const de1 = macd.dea[i];
    if (d0 == null || de0 == null || d1 == null || de1 == null) continue;
    if (d0 <= de0 && d1 > de1) {
      buy = { date: klines[i].date, price: klines[i].close, label: 'AI买点' };
    }
    if (d0 >= de0 && d1 < de1) {
      sell = { date: klines[i].date, price: klines[i].close, label: 'AI卖点' };
    }
  }

  // 支撑：近 20 日最低；压力：近 20 日最高
  const recent = klines.slice(-20);
  const low = Math.min(...recent.map((k) => k.low));
  const high = Math.max(...recent.map((k) => k.high));
  const support = +low.toFixed(2);
  const resistance = +high.toFixed(2);

  // 止损：支撑下方 1.5%
  const stopLoss = +(support * 0.985).toFixed(2);
  // 止盈：风险回报比 2:1（距止损的空间翻倍）
  const tp = price + (price - stopLoss) * 2;
  const takeProfit = +Math.min(tp, resistance * 1.04).toFixed(2);

  // 风险区：RSI 超买或价格贴近布林上轨的近端区间
  const rsi = computeRSI(closes, 6);
  const boll = computeBOLL(closes, 20, 2);
  const r6 = last(rsi);
  const upper = last(boll.upper);
  let riskZone: { from: number; to: number } | null = null;
  if (r6 != null && r6 > 75 && upper != null) {
    riskZone = { from: +(upper * 0.99).toFixed(2), to: +(high * 1.02).toFixed(2) };
  }

  const conclusion =
    signal.score >= 80
      ? '趋势与动能都在转强，回踩可分批买入。'
      : signal.score >= 65
        ? '技术面偏强，可逢低关注，别追高。'
        : signal.score >= 40
          ? '信号中性，等方向更明确再动手。'
          : signal.score >= 25
            ? '动能转弱，建议降低仓位观望。'
            : '技术面偏弱，注意止损、控制风险。';

  return { buy, sell, takeProfit, stopLoss, support, resistance, riskZone, signal, conclusion };
}
