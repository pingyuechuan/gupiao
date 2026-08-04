import type { Quote, Sector } from '@/types';
import { stockService } from '@/services/StockService';
import { fetchBatchQuotes } from '@/services/batchQuote';
import { getRankUniverse } from '@/constants/marketUniverse';

/** 指数代码（用于大盘环境评分） */
const INDEX_SECIDS = ['1.000001', '0.399001', '0.399006', '1.000300'];

export interface MarketContext {
  indices: Quote[];
  sectors: Sector[];
  /** 大盘环境评分 0-100（越高越友好） */
  marketScore: number;
  /** 指数平均涨跌幅 */
  avgIndexChange: number;
}

let cache: { ts: number; data: MarketContext } | null = null;
const TTL = 30_000;

/**
 * 获取大盘环境上下文（带 30s 内存缓存，避免每次 analyze 都打接口）。
 * 这是 AIMS「市场」维度与「行业」维度匹配的数据来源。
 */
export async function getMarketContext(): Promise<MarketContext> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;
  const [indices, sectors, quotes] = await Promise.all([
    stockService.getQuotes(INDEX_SECIDS).catch(() => [] as Quote[]),
    stockService.getSectors().catch(() => [] as Sector[]),
    fetchBatchQuotes(getRankUniverse()).catch(() => [] as Quote[]),
  ]);
  // 指数优先用真实指数行情；缺失时用样本池涨跌近似
  const validIdx = indices.filter((q) => Number.isFinite(q.changePercent));
  let avgIndexChange =
    validIdx.length > 0
      ? validIdx.reduce((s, q) => s + q.changePercent, 0) / validIdx.length
      : quotes.length
        ? quotes.reduce((s, q) => s + q.changePercent, 0) / quotes.length
        : 0;
  const marketScore = Math.max(0, Math.min(100, Math.round(50 + avgIndexChange * 8)));
  const data: MarketContext = { indices, sectors, marketScore, avgIndexChange };
  cache = { ts: Date.now(), data };
  return data;
}
