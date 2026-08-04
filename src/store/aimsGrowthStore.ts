import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type StreakKey = 'learning' | 'correct' | 'stop' | 'review' | 'noChase' | 'trade';

export interface Medal {
  id: string;
  name: string;
  desc: string;
  icon: string;
  test: (s: { level: number; streaks: Record<StreakKey, number> }) => boolean;
}

/** 成长勋章定义 */
export const MEDALS: Medal[] = [
  { id: 'calm', name: '冷静投资者', desc: '连续 7 天没有追高', icon: '🧊', test: ({ streaks }) => streaks.noChase >= 7 },
  { id: 'learner', name: '持续学习者', desc: '连续 7 天保持学习/活跃', icon: '📚', test: ({ streaks }) => streaks.learning >= 7 },
  { id: 'disciplined', name: '纪律止损', desc: '连续 3 次纪律性止损', icon: '🛡️', test: ({ streaks }) => streaks.stop >= 3 },
  { id: 'reviewer', name: '复盘达人', desc: '连续 7 天坚持复盘', icon: '📝', test: ({ streaks }) => streaks.review >= 7 },
  { id: 'trader', name: '实战派', desc: '累计 10 次实操记录', icon: '⚔️', test: ({ streaks }) => streaks.trade >= 10 },
  { id: 'correct3', name: '连胜三连', desc: '连续 3 次正确操作', icon: '🔥', test: ({ streaks }) => streaks.correct >= 3 },
  { id: 'lv10', name: '新秀投资者', desc: '成长等级达到 Lv10', icon: '🌱', test: ({ level }) => level >= 10 },
  { id: 'lv30', name: '进阶投资者', desc: '成长等级达到 Lv30', icon: '🌿', test: ({ level }) => level >= 30 },
  { id: 'lv50', name: '资深投资者', desc: '成长等级达到 Lv50', icon: '🌳', test: ({ level }) => level >= 50 },
  { id: 'lv80', name: '投资大师', desc: '成长等级达到 Lv80', icon: '👑', test: ({ level }) => level >= 80 },
];

export function levelFromXp(xp: number): number {
  return Math.min(100, Math.floor(xp / 120) + 1);
}
/** 升到下一级所需 XP */
export function xpForNext(level: number): number {
  return level * 120;
}

interface GrowthState {
  xp: number;
  lastActiveDate: string; // YYYY-MM-DD
  streaks: Record<StreakKey, number>;
  medals: string[];
  awardDaily: () => void;
  addXp: (n: number) => void;
  recordTrade: () => void;
  recordStop: () => void;
  recordReview: () => void;
  recordNoChase: () => void;
  recordCorrect: () => void;
  checkMedals: () => void;
  level: () => number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}
function yesterdayStr(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

const EMPTY_STREAKS: Record<StreakKey, number> = {
  learning: 0,
  correct: 0,
  stop: 0,
  review: 0,
  noChase: 0,
  trade: 0,
};

export const useAimsGrowthStore = create<GrowthState>()(
  persist(
    (set, get) => {
      /** 更新某个连续天数 streak，并在跨天时正确续接/清零 */
      const touchStreak = (key: StreakKey, extraXp: number) => {
        const today = todayStr();
        const yest = yesterdayStr();
        const s = get();
        const streaks: Record<StreakKey, number> = { ...s.streaks };
        const newDay = s.lastActiveDate !== today;
        const wasYesterday = s.lastActiveDate === yest;
        if (newDay) {
          (Object.keys(streaks) as StreakKey[]).forEach((k) => {
            if (k !== key) streaks[k] = wasYesterday ? streaks[k] : 0;
          });
          streaks[key] = wasYesterday ? streaks[key] + 1 : 1;
        } else {
          streaks[key] = streaks[key] + 1;
        }
        const xp = s.xp + (newDay ? 10 : 0) + extraXp;
        set({ streaks, lastActiveDate: today, xp });
        get().checkMedals();
      };

      return {
        xp: 0,
        lastActiveDate: '',
        streaks: { ...EMPTY_STREAKS },
        medals: [],
        awardDaily: () => touchStreak('learning', 0),
        addXp: (n) => {
          set({ xp: get().xp + n });
          get().checkMedals();
        },
        recordTrade: () => touchStreak('trade', 8),
        recordStop: () => touchStreak('stop', 10),
        recordReview: () => touchStreak('review', 10),
        recordNoChase: () => touchStreak('noChase', 6),
        recordCorrect: () => touchStreak('correct', 10),
        checkMedals: () => {
          const s = get();
          const level = levelFromXp(s.xp);
          const earned = MEDALS.filter((m) => m.test({ level, streaks: s.streaks })).map((m) => m.id);
          const cur = new Set(s.medals);
          earned.forEach((id) => cur.add(id));
          set({ medals: [...cur] });
        },
        level: () => levelFromXp(get().xp),
      };
    },
    { name: 'phoenix-aims-growth' },
  ),
);
