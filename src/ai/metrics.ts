export function clamp(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min; // NaN / Infinity 安全回落
  return Math.max(min, Math.min(max, v));
}

export interface DerivedMetrics {
  /** 可买指数 0-100（≈技术面评分） */
  buyIndex: number;
  /** 上涨概率 % */
  upProb: number;
  /** 风险指数 0-100（越高越危险） */
  riskIndex: number;
}

/**
 * 由技术面评分派生给小白看的三项指标。
 * 不是预测，而是把评分翻译成「可买 / 上涨概率 / 风险」三个直观数字。
 */
export function deriveMetrics(
  score: number,
  opts?: { riskZone?: boolean; volatility?: number },
): DerivedMetrics {
  const buyIndex = clamp(Math.round(score), 0, 100);
  // 评分 50 对应 50% 概率，每偏离 1 分约 ±0.9%
  const upProb = clamp(Math.round(50 + (score - 50) * 0.9), 30, 92);
  let risk = (100 - score) * 0.7;
  if (opts?.riskZone) risk += 12;
  if (opts?.volatility && opts.volatility > 4) risk += 6;
  const riskIndex = clamp(Math.round(risk), 5, 95);
  return { buyIndex, upProb, riskIndex };
}
