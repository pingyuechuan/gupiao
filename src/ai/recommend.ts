import type { Quote } from '@/types';
import { stockService } from '@/services/StockService';
import { fetchBatchQuotes } from '@/services/batchQuote';
import { getRankUniverse, STATIC_SECTORS } from '@/constants/marketUniverse';
import { computeTradeSignal } from '@/utils/tradeSignal';
import { toSecid } from '@/utils/format';
import { analyzeAIMS } from '@/aims/engine';
import { useAimsAccuracyStore } from '@/store/aimsAccuracyStore';
import type { AIMSResult } from '@/aims/types';

export type RiskLevel = '保守' | '稳健' | '激进';
export type InvestPeriod = '短线' | '中线' | '长线';
export type ProfileType = '保守型' | '价值型' | '成长型' | '激进型';

/** 主题 → 板块代码映射（概念/行业板块） */
const THEME_SECTORS: Record<string, string[]> = {
  ai: ['CN02', 'CN05', 'CN07'],
  robot: ['CN06'],
  newenergy: ['BK07', 'BK08', 'CN03', 'CN08'],
  chip: ['BK09', 'CN05'],
  ztq: ['CN01'],
  dividend: ['BK01', 'BK12', 'BK19'],
  liquor: ['BK04', 'BK05'],
  medicine: ['BK06'],
  military: ['BK18'],
  consumption: ['BK04', 'BK05', 'BK16'],
  military_2: ['BK18'],
};

/** 蓝筹红利池（保守/价值型用户主推）：大盘、低波动、分红稳 */
const BLUE_CHIP_POOL = [
  '600941', // 中国移动
  '601728', // 中国电信
  '601088', // 中国神华
  '600938', // 中国海油
  '600900', // 长江电力
  '601398', // 工商银行
  '601939', // 建设银行
  '600036', // 招商银行
  '601318', // 中国平安
  '600028', // 中国石化
  '601857', // 中国石油
  '601288', // 农业银行
];

/** 从静态板块里收集代表股代码，用于成长/激进主题池 */
function leadersOf(sectorCodes: string[]): string[] {
  const set = new Set<string>();
  for (const sc of sectorCodes) {
    const sec = STATIC_SECTORS.find((s) => s.code === sc);
    if (!sec) continue;
    sec.leaders.forEach((l) => {
      const code = l.split('.')[1] ?? l;
      if (/^\d{6}$/.test(code)) set.add(code);
    });
  }
  return [...set];
}

const GROWTH_SECTORS = [
  ...THEME_SECTORS.ai,
  ...THEME_SECTORS.robot,
  ...THEME_SECTORS.newenergy,
  ...THEME_SECTORS.chip,
  ...THEME_SECTORS.military,
];
const GROWTH_POOL = leadersOf([...new Set(GROWTH_SECTORS)]).slice(0, 28);

/** 不同画像 → 不同股票池。同一时间，不同用户首页完全不同。 */
export const PROFILE_POOLS: Record<ProfileType, string[]> = {
  保守型: BLUE_CHIP_POOL,
  价值型: [...BLUE_CHIP_POOL, '600519', '000858', '601988', '600276'], // + 白酒/银行/医药
  成长型: GROWTH_POOL,
  激进型: [...GROWTH_POOL, ...leadersOf(THEME_SECTORS.ztq ?? [])],
};

/** 返回某画像对应的候选股票代码池 */
export function getProfilePool(type: ProfileType): string[] {
  return PROFILE_POOLS[type] ?? getRankUniverse();
}

export interface RecommendItem {
  code: string;
  name: string;
  price: number;
  changePercent: number;
  turnoverRate: number;
  amount: number;
  score: number;
  signal: '买入' | '增持' | '观望' | '减持' | '卖出';
  reasons: string[];
  /** AIMS 统一决策结果（单一来源） */
  aims?: AIMSResult;
}

/** 识别用户消息里的主题关键词 */
export function matchTheme(text: string): string | null {
  const t = text.toLowerCase();
  if (/ai|算力|人工智能|大模型|cpo|光模块/.test(t)) return 'ai';
  if (/机器人|机械人/.test(t)) return 'robot';
  if (/新能源|光伏|储能|锂电|电池|电动车|汽车/.test(t)) return 'newenergy';
  if (/半导体|芯片|集成电路/.test(t)) return 'chip';
  if (/中特估|国企改革|央企/.test(t)) return 'ztq';
  if (/高股息|红利|银行|电力|煤炭|公用事业/.test(t)) return 'dividend';
  if (/白酒|消费|食品/.test(t)) return 'consumption';
  if (/医药|医疗|生物|cro/.test(t)) return 'medicine';
  if (/军工|国防/.test(t)) return 'military';
  return null;
}

function themeQuotes(quotes: Quote[], theme: string | null): Quote[] {
  if (!theme) return quotes;
  const sectorCodes = THEME_SECTORS[theme];
  if (!sectorCodes) return quotes;
  const leaderCodes = new Set(
    STATIC_SECTORS.filter((s) => sectorCodes.includes(s.code)).flatMap((s) =>
      s.leaders.map((l) => l.split('.')[1] ?? l),
    ),
  );
  const matched = quotes.filter((q) => leaderCodes.has(q.code));
  return matched.length ? matched : quotes;
}

function momentumScore(
  q: Quote,
  period: InvestPeriod,
  risk: RiskLevel,
): number {
  const chg = Math.max(-6, Math.min(10, q.changePercent));
  const turnover = Math.min(20, q.turnoverRate || 0);
  const amtLog = Math.log10((Number.isFinite(q.amount) ? q.amount : 0) + 1) / 12;

  let score = chg * 1.0 + turnover * 0.18 + amtLog * 1.2;

  if (period === '短线') score += turnover * 0.1;
  if (period === '中线') {
    if (q.changePercent > 0.5 && q.changePercent < 6) score += 1.2;
  }
  if (period === '长线') {
    if (q.changePercent >= 0 && q.changePercent < 4.5) score += 1.0;
    if (turnover > 12) score -= 1.0; // 长线不喜欢过度炒作
  }
  // 风格
  if (risk === '保守' || risk === '稳健') {
    if (q.changePercent > 7.5) score -= 2.5; // 过热不追
    score += amtLog * 0.6; // 偏好大盘更稳
  }
  if (risk === '激进') {
    if (q.changePercent > 2) score += 1.2;
  }
  return score;
}

/**
 * 给出今日推荐名单（5~10只）。
 * 先按动量初筛，再对候选拉K线算综合评分，最后按评分取前 N。
 */
export async function getRecommendations(opts: {
  limit?: number;
  theme?: string | null;
  period?: InvestPeriod;
  risk?: RiskLevel;
  /** 限定候选股票代码池（画像策略引擎用）；不传则用全样本池 */
  pool?: string[];
}): Promise<RecommendItem[]> {
  const limit = opts.limit ?? 8;
  const period = opts.period ?? '中线';
  const risk = opts.risk ?? '稳健';

  const universe = opts.pool && opts.pool.length ? opts.pool : getRankUniverse();
  const quotes = await fetchBatchQuotes(universe);
  if (!quotes.length) return [];

  const filtered = themeQuotes(quotes, opts.theme ?? null);

  // 初筛候选
  const ranked = [...filtered]
    .map((q) => ({ q, m: momentumScore(q, period, risk) }))
    .sort((a, b) => b.m - a.m)
    .slice(0, 18)
    .map((x) => x.q);

  // 对候选计算技术面综合评分
  const detailed = await Promise.all(
    ranked.map(async (q) => {
      try {
        const secid = toSecid(q.code);
        const klines = await stockService.getKline(secid, 'day');
        const sig = computeTradeSignal(klines);
        return {
          code: q.code,
          name: q.name,
          price: q.price,
          changePercent: q.changePercent,
          turnoverRate: q.turnoverRate,
          amount: q.amount,
          score: sig.score,
          signal: sig.signal,
          reasons: sig.reasons,
        } as RecommendItem;
      } catch {
        return null;
      }
    }),
  );

  const base = detailed
    .filter((d): d is RecommendItem => d !== null)
    .filter((d) => d.score >= 45 && d.changePercent < 9.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // 统一决策：用 AIMS 引擎为每只候选生成最终评分与建议（单一来源）
  const enriched = await Promise.all(
    base.map(async (d) => {
      const secid = toSecid(d.code);
      let aims: AIMSResult;
      try {
        aims = await analyzeAIMS(secid);
      } catch {
        return d;
      }
      // 记录到 AI 历史准确率
      useAimsAccuracyStore.getState().recordAIMS(aims);
      const map: Record<string, RecommendItem['signal']> = {
        买入: '买入',
        加仓: '增持',
        持有: '观望',
        减仓: '减持',
        卖出: '卖出',
        观望: '观望',
      };
      return {
        ...d,
        score: aims.composite,
        signal: map[aims.action] ?? '观望',
        reasons: [aims.oneLiner, ...aims.dimensions.filter((x) => x.key !== 'risk').map((x) => x.note)].slice(0, 3),
        aims,
      } as RecommendItem;
    }),
  );

  return enriched.filter((d) => d.aims).sort((a, b) => (b.aims!.composite ?? 0) - (a.aims!.composite ?? 0));
}
