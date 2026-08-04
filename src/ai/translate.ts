import type { Kline } from '@/types';
import {
  sma,
  ema,
  computeMACD,
  computeKDJ,
  computeRSI,
  computeBOLL,
} from '@/utils/indicators';
import { type TradeSignal } from '@/utils/tradeSignal';

/** 把专业指标翻译成一句大白话 */
export type IndicatorKeyHuman =
  | 'MA'
  | 'EMA'
  | 'MACD'
  | 'KDJ'
  | 'RSI'
  | 'BOLL'
  | 'VOL';

function lastValid(arr: (number | null | undefined)[]): number | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i];
    if (v !== null && v !== undefined && Number.isFinite(v)) return v;
  }
  return null;
}

/** 均线 → 人话 */
export function maHuman(klines: Kline[]): string {
  const closes = klines.map((k) => k.close);
  const ma5 = lastValid(sma(closes, 5));
  const ma20 = lastValid(sma(closes, 20));
  const price = closes[closes.length - 1];
  if (ma5 == null || ma20 == null) return '均线数据还不够，先观察。';
  if (price > ma5 && ma5 > ma20) return '股价站在均线之上，仍处于上涨趋势。';
  if (price < ma5 && ma5 < ma20) return '均线空头排列，趋势偏弱，先别急着抄底。';
  if (price > ma20) return '中长期均线向上，趋势没坏。';
  return '价格在均线下方，短期偏弱。';
}

/** EMA → 人话 */
export function emaHuman(klines: Kline[]): string {
  const closes = klines.map((k) => k.close);
  const e12 = lastValid(ema(closes, 12));
  const e26 = lastValid(ema(closes, 26));
  if (e12 == null || e26 == null) return '趋势线数据还不够。';
  if (e12 > e26) return '快慢线向上，动能偏强。';
  return '快慢线向下，动能转弱。';
}

/** MACD → 人话 */
export function macdHuman(klines: Kline[]): string {
  const res = computeMACD(klines.map((k) => k.close));
  const dif = lastValid(res.dif);
  const dea = lastValid(res.dea);
  const bar = lastValid(res.macd);
  if (dif == null || dea == null) return 'MACD 数据还不够。';
  if (dif > dea && bar != null && bar > 0) return '上涨趋势开始形成，红柱放大。';
  if (dif > dea) return '快慢线金叉，开始转强。';
  if (dif < dea) return '快慢线死叉，注意短期回调。';
  return 'MACD 走平，方向不明。';
}

/** KDJ → 人话 */
export function kdjHuman(klines: Kline[]): string {
  const res = computeKDJ(
    klines.map((k) => k.high),
    klines.map((k) => k.low),
    klines.map((k) => k.close),
  );
  const j = lastValid(res.j);
  if (j == null) return 'KDJ 数据还不够。';
  if (j > 80) return '短期涨得有点快，小心追高。';
  if (j < 20) return '短期跌过头了，可能随时反弹。';
  if (j > 50) return '人气还在，多头占优。';
  return '人气偏弱，资金偏谨慎。';
}

/** RSI → 人话 */
export function rsiHuman(klines: Kline[]): string {
  const r6 = lastValid(computeRSI(klines.map((k) => k.close), 6));
  if (r6 == null) return 'RSI 数据还不够。';
  if (r6 > 70) return '风险开始增加，已经偏热。';
  if (r6 < 30) return '跌出机会了，已经偏冷。';
  if (r6 > 50) return '走势健康，没到过热。';
  return '偏弱，但还没到超卖。';
}

/** BOLL → 人话 */
export function bollHuman(klines: Kline[]): string {
  const res = computeBOLL(klines.map((k) => k.close), 20, 2);
  const upper = lastValid(res.upper);
  const lower = lastValid(res.lower);
  const price = klines[klines.length - 1]?.close;
  if (upper == null || lower == null || price == null) return '布林带数据还不够。';
  if (price >= upper * 0.98) return '股价贴近上轨，短期有点拥挤。';
  if (price <= lower * 1.02) return '股价贴近下轨，可能有支撑。';
  return '股价在通道中间，运行平稳。';
}

/** 成交量 → 人话 */
export function volHuman(klines: Kline[]): string {
  if (klines.length < 6) return '成交量数据还不够。';
  const vols = klines.map((k) => k.volume);
  const recent = vols.slice(-3).reduce((a, b) => a + b, 0) / 3;
  const before = vols.slice(-6, -3).reduce((a, b) => a + b, 0) / 3;
  if (!before) return '成交量变化不大。';
  const ratio = recent / before;
  if (ratio > 1.4) return '今天有更多资金进入，放量明显。';
  if (ratio < 0.7) return '资金在撤退，缩量明显。';
  return '成交量温和，没有明显异动。';
}

const MAP: Record<IndicatorKeyHuman, (k: Kline[]) => string> = {
  MA: maHuman,
  EMA: emaHuman,
  MACD: macdHuman,
  KDJ: kdjHuman,
  RSI: rsiHuman,
  BOLL: bollHuman,
  VOL: volHuman,
};

export function explainIndicator(key: IndicatorKeyHuman, klines: Kline[]): string {
  return MAP[key](klines);
}

/** 把综合评分结构翻译成给小白看的诊断 */
export function explainSignal(signal: TradeSignal, klines: Kline[]): {
  headline: string;
  bullets: string[];
} {
  const bullets: string[] = [];
  bullets.push(maHuman(klines));
  bullets.push(macdHuman(klines));
  bullets.push(kdjHuman(klines));
  bullets.push(rsiHuman(klines));
  bullets.push(volHuman(klines));

  const headline =
    signal.score >= 80
      ? '技术面很强，可以考虑买入。'
      : signal.score >= 65
        ? '技术面偏强，可以分批关注。'
        : signal.score >= 40
          ? '信号中性，建议再等等看。'
          : signal.score >= 25
            ? '技术面偏弱，建议减仓观望。'
            : '技术面很弱，注意控制风险。';

  return { headline, bullets: bullets.filter(Boolean) };
}
