import { useQuery, QueryClient } from '@tanstack/react-query';
import { stockService } from '@/services/StockService';
import { fetchBatchQuotes } from '@/services/batchQuote';
import { getRankUniverse } from '@/constants/marketUniverse';
import { computeMarketDiagnosis, type MarketDiagnosis } from '@/ai/marketDiagnosis';
import { getRecommendations, type RecommendItem, type RiskLevel, type InvestPeriod } from '@/ai/recommend';
import { getBatchAdvice, type StockAdvice } from '@/ai/advice';
import { analyzeAIMS } from '@/aims/engine';
import type { AIMSResult } from '@/aims/types';
import type { KlinePeriod, Quote, Sector, RankItem, StockInfo, TimeSharePoint } from '@/types';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export function useQuote(secid: string | undefined) {
  return useQuery<Quote>({
    queryKey: ['quote', secid],
    enabled: !!secid,
    queryFn: () => stockService.getQuote(secid as string),
  });
}

export function useKline(secid: string | undefined, period: KlinePeriod = 'day') {
  return useQuery({
    queryKey: ['kline', secid, period],
    enabled: !!secid,
    queryFn: () => stockService.getKline(secid as string, period),
  });
}

export function useTimeShare(secid: string | undefined) {
  return useQuery<TimeSharePoint[]>({
    queryKey: ['timeshare', secid],
    enabled: !!secid,
    queryFn: () => stockService.getTimeShare(secid as string),
  });
}

export function useRank(type: 'change' | 'amount' | 'turnover' | 'amplitude', limit = 30) {
  return useQuery<RankItem[]>({
    queryKey: ['rank', type, limit],
    queryFn: () => stockService.getRankList(type, limit),
  });
}

export function useSectors() {
  return useQuery<Sector[]>({
    queryKey: ['sectors'],
    queryFn: () => stockService.getSectors(),
  });
}

export function useSearch(keyword: string) {
  return useQuery<StockInfo[]>({
    queryKey: ['search', keyword],
    enabled: keyword.trim().length > 0,
    queryFn: () => stockService.search(keyword.trim()),
  });
}

export function useWatchlistQuotes(secids: string[]) {
  return useQuery<Quote[]>({
    queryKey: ['watchlist', [...secids].sort().join(',')],
    enabled: secids.length > 0,
    queryFn: () => stockService.getQuotes(secids),
  });
}

export function useMarketDiagnosis() {
  return useQuery<{ diagnosis: MarketDiagnosis; quotes: Quote[]; sectors: Sector[] }>({
    queryKey: ['market-diagnosis'],
    queryFn: async () => {
      const universe = getRankUniverse();
      const [quotes, sectors] = await Promise.all([
        fetchBatchQuotes(universe),
        stockService.getSectors(),
      ]);
      const diagnosis = computeMarketDiagnosis(quotes, sectors);
      return { diagnosis, quotes, sectors };
    },
  });
}

export function useRecommendations(opts: {
  limit?: number;
  theme?: string | null;
  risk?: RiskLevel;
  period?: InvestPeriod;
  pool?: string[];
}) {
  return useQuery<RecommendItem[]>({
    queryKey: ['recommend', opts.limit, opts.theme, opts.risk, opts.period, (opts.pool ?? []).join(',')],
    queryFn: () => getRecommendations(opts),
  });
}

export function useBatchAdvice(secids: string[]) {
  return useQuery<StockAdvice[]>({
    queryKey: ['batch-advice', [...secids].sort().join(',')],
    enabled: secids.length > 0,
    queryFn: () => getBatchAdvice(secids),
  });
}

/** AIMS 统一决策（所有 AI 建议的单一来源） */
export function useAIMS(secid: string | undefined) {
  return useQuery<AIMSResult>({
    queryKey: ['aims', secid],
    enabled: !!secid,
    queryFn: () => analyzeAIMS(secid as string),
    staleTime: 15000,
  });
}
