import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface DiaryEntry {
  /** YYYY-MM-DD */
  date: string;
  marketTemp: number;
  marketLabel: string;
  recs: string[];
  opsCount: number;
  summary: string;
}

interface DiaryState {
  entries: DiaryEntry[];
  generate: (opts: { marketTemp: number; marketLabel: string; recs: string[]; opsCount: number }) => DiaryEntry;
  get: (date: string) => DiaryEntry | undefined;
  list: () => DiaryEntry[];
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAimsDiaryStore = create<DiaryState>()(
  persist(
    (set, get) => ({
      entries: [],

      generate: ({ marketTemp, marketLabel, recs, opsCount }) => {
        const date = todayStr();
        const names = recs.slice(0, 5);
        const summary =
          `今天市场${marketLabel}（${marketTemp}℃）。AI 为你筛选了 ${recs.length} 只关注标的` +
          `${names.length ? `：${names.join('、')}` : ''}。` +
          `${opsCount > 0 ? `记录了 ${opsCount} 笔操作。` : '暂无操作记录。'}` +
          `坚持不追高、设止损，稳步推进。`;
        const entry: DiaryEntry = { date, marketTemp, marketLabel, recs, opsCount, summary };
        const rest = get().entries.filter((e) => e.date !== date);
        set({ entries: [entry, ...rest].slice(0, 120) });
        return entry;
      },

      get: (date) => get().entries.find((e) => e.date === date),
      list: () => get().entries,
    }),
    { name: 'phoenix-aims-diary' },
  ),
);
