import type { Quote, Kline, Sector } from '@/types';
import type { TradeSignal } from '@/utils/tradeSignal';
import { computeRSI } from '@/utils/indicators';
import { clamp } from '@/ai/metrics';
import { STATIC_SECTORS } from '@/constants/marketUniverse';
import type { AIMSContext } from './types';

/* ===================== 市场维度 ===================== */
export function scoreMarket(avgIndexChange: number): { score: number; note: string } {
  const score = Math.max(0, Math.min(100, Math.round(50 + avgIndexChange * 8)));
  const note =
    avgIndexChange > 0.8
      ? `大盘偏暖（均涨跌 ${avgIndexChange.toFixed(2)}%），环境友好`
      : avgIndexChange < -0.8
        ? `大盘偏弱（均涨跌 ${avgIndexChange.toFixed(2)}%），注意系统性风险`
        : `大盘震荡（均涨跌 ${avgIndexChange.toFixed(2)}%），重个股轻指数`;
  return { score, note };
}

/* ===================== 行业维度 ===================== */
export function scoreIndustry(sector: Sector | null): { score: number; note: string } {
  if (!sector) return { score: 50, note: '未匹配到所属板块，按中性计' };
  const chg = sector.changePercent;
  const score = Math.max(0, Math.min(100, Math.round(50 + chg * 6)));
  const note =
    chg > 0
      ? `所在板块「${sector.name}」今日 ${chg.toFixed(2)}%，有资金关注`
      : chg < 0
        ? `所在板块「${sector.name}」今日 ${chg.toFixed(2)}%，短期承压`
        : `板块「${sector.name}」今日持平`;
  return { score, note };
}

/** 用静态板块表定位个股所属行业，再用实时涨跌幅赋值 */
export function resolveSector(secid: string, liveSectors: Sector[]): Sector | null {
  const myCode = secid.split('.')[1];
  const sec = STATIC_SECTORS.find(
    (s) => s.leaders.includes(secid) || s.leaders.some((l) => l.split('.')[1] === myCode),
  );
  if (!sec) return null;
  const live = liveSectors.find((s) => s.code === sec.code);
  if (live) return live;
  // 静态板块有，但实时没返回该板块 → 中性占位
  return { code: sec.code, name: sec.name, type: 'industry', changePercent: 0 };
}

/* ===================== 资金维度 ===================== */
export function scoreCapital(quote: Quote, klines: Kline[]): { score: number; note: string } {
  let score = 50;
  const turnover = Number.isFinite(quote.turnoverRate) ? quote.turnoverRate : 0; // ?? 拦不住 NaN
  score += Math.min(turnover, 12) * 1.4;
  if (klines.length >= 10) {
    const vol = klines.map((k) => k.volume);
    const recent = vol.slice(-5).reduce((a, b) => a + b, 0) / 5;
    const prev = vol.slice(-10, -5).reduce((a, b) => a + b, 0) / 5 || 1;
    const ratio = recent / prev;
    if (ratio > 1.8) score += 18;
    else if (ratio > 1.3) score += 10;
    else if (ratio > 1.1) score += 4;
    else if (ratio < 0.8) score -= 10;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));
  const note =
    score >= 70 ? '量能充沛，资金积极参与' : score >= 50 ? '量能温和，有资金关注' : score >= 35 ? '量能偏弱' : '量能萎缩，资金观望';
  return { score, note };
}

/* ===================== 趋势维度（技术结构，不含量能） ===================== */
export function scoreTrend(signal: TradeSignal): { score: number; note: string } {
  const d = signal.details;
  const tech = d.maScore + d.macdScore + d.kdjScore + d.rsiScore + d.trendScore; // 上限 115
  const score = Math.max(0, Math.min(100, Math.round((tech / 115) * 100)));
  const note =
    score >= 70
      ? '均线多头、趋势向上，技术结构强'
      : score >= 50
        ? '趋势中性偏强'
        : score >= 35
          ? '趋势震荡'
          : '趋势走弱，技术结构差';
  return { score, note };
}

/* ===================== 风险维度（level 越高越危险） ===================== */
export function scoreRisk(quote: Quote, klines: Kline[]): { level: number; note: string } {
  let level = 30;
  if (klines.length >= 20) {
    const recent = klines.slice(-20);
    // 跳过 high/low 为 NaN 的 K 线，防止污染波动率
    const valid = recent.filter((k) => Number.isFinite(k.high) && Number.isFinite(k.low) && (k.high + k.low) !== 0);
    if (valid.length > 0) {
      const volat = valid.reduce((s, k) => s + Math.abs(k.high - k.low) / ((k.high + k.low) / 2), 0) / valid.length * 100;
      if (Number.isFinite(volat)) level += Math.max(0, volat - 2) * 4;
    }
  }
  const c = Math.abs(quote.changePercent);
  if (c > 9) level += 16;
  else if (c > 6) level += 10;
  else if (c > 4) level += 5;
  else if (c < 1) level -= 4;

  const closes = klines.map((k) => k.close);
  const rsi = computeRSI(closes, 6);
  const r6 = rsi[rsi.length - 1];
  if (Number.isFinite(r6)) {
    if (r6 > 80) level += 12;
    else if (r6 > 72) level += 6;
    else if (r6 < 25) level -= 4;
  }
  level = clamp(Math.round(level), 5, 95);
  const note =
    level >= 70 ? '波动大、短期涨多，追高风险高' : level >= 45 ? '有一定波动，需设好止损' : '走势相对平稳，风险可控';
  return { level, note };
}

/* ===================== 用户匹配度 ===================== */
export function scoreUserMatch(
  quote: Quote,
  klines: Kline[],
  ctx: AIMSContext,
): { score: number; note: string } {
  let m = 58;
  const c = quote.changePercent;
  const risk = ctx.riskTolerance;
  let volat = 0;
  if (klines.length >= 20) {
    const r = klines.slice(-20);
    const valid = r.filter((k) => Number.isFinite(k.high) && Number.isFinite(k.low) && (k.high + k.low) !== 0);
    if (valid.length > 0) {
      volat = valid.reduce((s, k) => s + Math.abs(k.high - k.low) / ((k.high + k.low) / 2), 0) / valid.length * 100;
      if (!Number.isFinite(volat)) volat = 0;
    }
  }
  if (risk === '低') {
    if (c > 5) m -= 12;
    if (volat > 4) m -= 12;
    if (c < 2 && volat < 2) m += 8;
  } else if (risk === '高') {
    if (c > 2) m += 8;
    if (volat > 3) m += 6;
  } else {
    if (c > 4) m += 2;
    if (volat > 4) m -= 4;
  }
  if (ctx.period === '短线' && c > 0) m += 4;
  if (ctx.period === '长线' && volat < 2) m += 4;
  const score = clamp(Math.round(m), 20, 95);
  const note = score >= 70 ? '与你的风险偏好高度契合' : score >= 50 ? '基本契合你的画像' : '与你的风险偏好存在偏差，谨慎';
  return { score, note };
}
