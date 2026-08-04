import type { IndicatorConfig, Kline } from '@/types';

/** 简单移动平均，数据不足返回 NaN */
export function sma(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** 指数移动平均 */
export function ema(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (period <= 0 || values.length === 0) return out;
  const k = 2 / (period + 1);
  let prev = NaN;
  for (let i = 0; i < values.length; i += 1) {
    const v = values[i];
    prev = Number.isNaN(prev) ? v : v * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** 周期内最大值 */
export function hhv(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - period + 1);
    let max = -Infinity;
    for (let j = start; j <= i; j += 1) if (values[j] > max) max = values[j];
    out[i] = max;
  }
  return out;
}

/** 周期内最小值 */
export function llv(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i += 1) {
    const start = Math.max(0, i - period + 1);
    let min = Infinity;
    for (let j = start; j <= i; j += 1) if (values[j] < min) min = values[j];
    out[i] = min;
  }
  return out;
}

/** Wilder 平滑（用于 RSI / DMI） */
function wilderSmooth(values: number[], period: number): number[] {
  const out: number[] = new Array(values.length).fill(NaN);
  if (values.length < period) return out;
  let prev = 0;
  for (let i = 0; i < values.length; i += 1) {
    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j += 1) sum += values[j];
      prev = sum / period;
      out[i] = prev;
    } else if (i >= period) {
      prev = (prev * (period - 1) + values[i]) / period;
      out[i] = prev;
    }
  }
  return out;
}

export interface MacdResult {
  dif: number[];
  dea: number[];
  macd: number[];
}

export function computeMACD(
  close: number[],
  fast = 12,
  slow = 26,
  signal = 9,
): MacdResult {
  const emaFast = ema(close, fast);
  const emaSlow = ema(close, slow);
  const dif: number[] = close.map((_, i) =>
    Number.isNaN(emaFast[i]) || Number.isNaN(emaSlow[i]) ? NaN : emaFast[i] - emaSlow[i],
  );
  const dea = ema(dif, signal);
  const macd = dif.map((d, i) =>
    Number.isNaN(d) || Number.isNaN(dea[i]) ? NaN : (d - dea[i]) * 2,
  );
  return { dif, dea, macd };
}

export interface KdjResult {
  k: number[];
  d: number[];
  j: number[];
}

export function computeKDJ(
  high: number[],
  low: number[],
  close: number[],
  n = 9,
  m1 = 3,
  m2 = 3,
): KdjResult {
  const k: number[] = new Array(close.length).fill(NaN);
  const d: number[] = new Array(close.length).fill(NaN);
  const j: number[] = new Array(close.length).fill(NaN);
  let prevK = 50;
  let prevD = 50;
  for (let i = 0; i < close.length; i += 1) {
    if (i < n - 1) {
      k[i] = NaN;
      d[i] = NaN;
      j[i] = NaN;
      continue;
    }
    const hh = hhv(high.slice(0, i + 1), n)[i];
    const ll = llv(low.slice(0, i + 1), n)[i];
    const rsv = hh === ll ? 50 : ((close[i] - ll) / (hh - ll)) * 100;
    const curK = (m1 - 1) / m1 * prevK + (1 / m1) * rsv;
    const curD = (m2 - 1) / m2 * prevD + (1 / m2) * curK;
    k[i] = curK;
    d[i] = curD;
    j[i] = 3 * curK - 2 * curD;
    prevK = curK;
    prevD = curD;
  }
  return { k, d, j };
}

export function computeRSI(close: number[], period = 6): number[] {
  const out: number[] = new Array(close.length).fill(NaN);
  if (close.length < period + 1) return out;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < close.length; i += 1) {
    const diff = close[i] - close[i - 1];
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? -diff : 0);
  }
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i += 1) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < close.length; i += 1) {
    avgGain = (avgGain * (period - 1) + gains[i - 1]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i - 1]) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface BollResult {
  mid: number[];
  upper: number[];
  lower: number[];
}

export function computeBOLL(close: number[], n = 20, k = 2): BollResult {
  const mid = sma(close, n);
  const upper: number[] = new Array(close.length).fill(NaN);
  const lower: number[] = new Array(close.length).fill(NaN);
  for (let i = 0; i < close.length; i += 1) {
    if (Number.isNaN(mid[i])) continue;
    let variance = 0;
    for (let j = i - n + 1; j <= i; j += 1) variance += (close[j] - mid[i]) ** 2;
    const std = Math.sqrt(variance / n);
    upper[i] = mid[i] + k * std;
    lower[i] = mid[i] - k * std;
  }
  return { mid, upper, lower };
}

export interface DmaResult {
  dma: number[];
  ama: number[];
}

export function computeDMA(close: number[], n1 = 10, n2 = 50, amaPeriod = 10): DmaResult {
  const ma1 = sma(close, n1);
  const ma2 = sma(close, n2);
  const dma = ma1.map((v, i) =>
    Number.isNaN(v) || Number.isNaN(ma2[i]) ? NaN : v - ma2[i],
  );
  const ama = sma(dma, amaPeriod);
  return { dma, ama };
}

export function computeWR(high: number[], low: number[], close: number[], n = 14): number[] {
  const out: number[] = new Array(close.length).fill(NaN);
  for (let i = 0; i < close.length; i += 1) {
    if (i < n - 1) continue;
    const hh = hhv(high.slice(0, i + 1), n)[i];
    const ll = llv(low.slice(0, i + 1), n)[i];
    out[i] = hh === ll ? 0 : ((hh - close[i]) / (hh - ll)) * 100;
  }
  return out;
}

export interface DmiResult {
  pdi: number[];
  mdi: number[];
  adx: number[];
  adxr: number[];
}

export function computeDMI(high: number[], low: number[], close: number[], n = 14, m = 6): DmiResult {
  const len = close.length;
  const tr: number[] = new Array(len).fill(NaN);
  const pdm: number[] = new Array(len).fill(0);
  const mdm: number[] = new Array(len).fill(0);
  for (let i = 1; i < len; i += 1) {
    const hl = high[i] - low[i];
    const hc = Math.abs(high[i] - close[i - 1]);
    const lc = Math.abs(low[i] - close[i - 1]);
    tr[i] = Math.max(hl, hc, lc);
    const hd = high[i] - high[i - 1];
    const ld = low[i - 1] - low[i];
    pdm[i] = hd > 0 && hd > ld ? hd : 0;
    mdm[i] = ld > 0 && ld > hd ? ld : 0;
  }
  const atr = wilderSmooth(tr, n);
  const pdiSm = wilderSmooth(pdm, n);
  const mdiSm = wilderSmooth(mdm, n);
  const pdi: number[] = new Array(len).fill(NaN);
  const mdi: number[] = new Array(len).fill(NaN);
  for (let i = 0; i < len; i += 1) {
    if (Number.isNaN(atr[i]) || atr[i] === 0) continue;
    pdi[i] = (pdiSm[i] / atr[i]) * 100;
    mdi[i] = (mdiSm[i] / atr[i]) * 100;
  }
  const dx: number[] = new Array(len).fill(NaN);
  for (let i = 0; i < len; i += 1) {
    const sum = (pdi[i] || 0) + (mdi[i] || 0);
    dx[i] = sum === 0 ? 0 : (Math.abs((pdi[i] || 0) - (mdi[i] || 0)) / sum) * 100;
  }
  const adx = wilderSmooth(dx, m);
  const adxr: number[] = new Array(len).fill(NaN);
  for (let i = m; i < len; i += 1) {
    if (!Number.isNaN(adx[i]) && !Number.isNaN(adx[i - m])) {
      adxr[i] = (adx[i] + adx[i - m]) / 2;
    }
  }
  return { pdi, mdi, adx, adxr };
}

export interface IndicatorSeries {
  ma?: { ma5: number[]; ma10: number[]; ma20: number[]; ma60: number[] };
  ema?: { ema12: number[]; ema26: number[] };
  macd?: MacdResult;
  kdj?: KdjResult;
  rsi?: { rsi6: number[]; rsi12: number[]; rsi24: number[] };
  boll?: BollResult;
  vol?: { maVol: number[] };
  dma?: DmaResult;
  wr?: { wr: number[] };
  dmi?: DmiResult;
}

/** 根据配置计算全部指标 */
export function computeIndicators(klines: Kline[], configs: IndicatorConfig[]): IndicatorSeries {
  const result: IndicatorSeries = {};
  const close = klines.map((k) => k.close);
  const high = klines.map((k) => k.high);
  const low = klines.map((k) => k.low);
  const vol = klines.map((k) => k.volume);
  const byKey = new Map(configs.map((c) => [c.key, c]));

  const ma = byKey.get('MA');
  if (ma?.visible) {
    result.ma = {
      ma5: sma(close, ma.params.n1 ?? 5),
      ma10: sma(close, ma.params.n2 ?? 10),
      ma20: sma(close, ma.params.n3 ?? 20),
      ma60: sma(close, ma.params.n4 ?? 60),
    };
  }
  const emaC = byKey.get('EMA');
  if (emaC?.visible) {
    result.ema = {
      ema12: ema(close, emaC.params.n1 ?? 12),
      ema26: ema(close, emaC.params.n2 ?? 26),
    };
  }
  const macd = byKey.get('MACD');
  if (macd?.visible) {
    result.macd = computeMACD(
      close,
      macd.params.fast ?? 12,
      macd.params.slow ?? 26,
      macd.params.signal ?? 9,
    );
  }
  const kdj = byKey.get('KDJ');
  if (kdj?.visible) {
    result.kdj = computeKDJ(
      high,
      low,
      close,
      kdj.params.n ?? 9,
      kdj.params.m1 ?? 3,
      kdj.params.m2 ?? 3,
    );
  }
  const rsi = byKey.get('RSI');
  if (rsi?.visible) {
    result.rsi = {
      rsi6: computeRSI(close, rsi.params.n1 ?? 6),
      rsi12: computeRSI(close, rsi.params.n2 ?? 12),
      rsi24: computeRSI(close, rsi.params.n3 ?? 24),
    };
  }
  const boll = byKey.get('BOLL');
  if (boll?.visible) {
    result.boll = computeBOLL(close, boll.params.n ?? 20, boll.params.k ?? 2);
  }
  const volC = byKey.get('VOL');
  if (volC?.visible) {
    result.vol = { maVol: sma(vol, volC.params.n ?? 5) };
  }
  const dma = byKey.get('DMA');
  if (dma?.visible) {
    result.dma = computeDMA(
      close,
      dma.params.n1 ?? 10,
      dma.params.n2 ?? 50,
    );
  }
  const wr = byKey.get('WR');
  if (wr?.visible) {
    result.wr = { wr: computeWR(high, low, close, wr.params.n ?? 14) };
  }
  const dmi = byKey.get('DMI');
  if (dmi?.visible) {
    result.dmi = computeDMI(high, low, close, dmi.params.n ?? 14, dmi.params.m ?? 6);
  }
  return result;
}
