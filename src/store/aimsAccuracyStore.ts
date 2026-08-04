import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { stockService } from '@/services/StockService';
import type { AIMSResult } from '@/aims/types';

export interface RecRecord {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  secid: string;
  code: string;
  name: string;
  composite: number;
  upProb: number;
  action: string;
  /** 推荐时的价格 */
  priceAtRec: number;
  resolved?: boolean;
  /** 后续表现：涨=win，跌=loss */
  result?: 'win' | 'loss';
  /** 当前价（reconcile 后填充） */
  currentPrice?: number;
}

interface AccuracyState {
  records: RecRecord[];
  recordAIMS: (aims: AIMSResult) => void;
  reconcile: () => Promise<void>;
  stats: (days?: number) => { total: number; resolved: number; wins: number; losses: number; rate: number };
  getRecords: () => RecRecord[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAimsAccuracyStore = create<AccuracyState>()(
  persist(
    (set, get) => ({
      records: [],

      recordAIMS: (aims) => {
        const t = todayStr();
        const exists = get().records.some((r) => r.secid === aims.secid && r.date === t);
        if (exists) return;
        const rec: RecRecord = {
          id: `rec_${Date.now()}_${aims.code}`,
          date: t,
          secid: aims.secid,
          code: aims.code,
          name: aims.name,
          composite: aims.composite,
          upProb: aims.upProb,
          action: aims.action,
          priceAtRec: aims.quote?.price ?? 0,
        };
        set({ records: [rec, ...get().records].slice(0, 500) });
      },

      reconcile: async () => {
        const recs = get().records.filter((r) => !r.resolved && r.priceAtRec > 0);
        if (!recs.length) return;
        const secids = recs.map((r) => r.secid);
        let quotes: { code: string; price: number }[] = [];
        try {
          quotes = await stockService.getQuotes(secids);
        } catch {
          return;
        }
        const byCode = new Map(quotes.map((q) => [q.code, q.price]));
        const map = new Map(recs.map((r) => [r.secid, r]));
        const next = get().records.map((r) => {
          const q = byCode.get(r.code);
          if (r.resolved || q == null || r.priceAtRec <= 0) return r;
          const change = (q - r.priceAtRec) / r.priceAtRec;
          return { ...r, resolved: true, result: change > 0 ? ('win' as const) : ('loss' as const), currentPrice: q };
        });
        void map;
        set({ records: next });
      },

      stats: (days = 30) => {
        const cutoff = Date.now() - days * 86400000;
        const inWindow = get().records.filter((r) => new Date(r.date).getTime() >= cutoff);
        const resolved = inWindow.filter((r) => r.resolved);
        const wins = resolved.filter((r) => r.result === 'win').length;
        const losses = resolved.filter((r) => r.result === 'loss').length;
        const rate = resolved.length ? Math.round((wins / resolved.length) * 100) : 0;
        return { total: inWindow.length, resolved: resolved.length, wins, losses, rate };
      },

      getRecords: () => get().records,
    }),
    { name: 'phoenix-aims-accuracy' },
  ),
);
