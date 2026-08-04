import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_WATCHLIST } from '@/constants';
import {
  type InvestPeriod,
  type ProfileType,
} from '@/ai/recommend';

export type UserMode = 'beginner' | 'pro';

/** 投资风格 → 画像类型 */
export type InvestStyle = '稳健' | '价值' | '成长' | '激进';

export function deriveProfileType(style: InvestStyle): ProfileType {
  switch (style) {
    case '稳健':
      return '保守型';
    case '价值':
      return '价值型';
    case '成长':
      return '成长型';
    case '激进':
      return '激进型';
  }
}

export interface UserProfile {
  principal: number; // 本金（元）
  riskTolerance: '低' | '中' | '高';
  period: InvestPeriod;
  targetReturn: string; // 目标收益描述
  age: string; // 年龄段
  experience: '小白' | '1-3年' | '3年以上';
  style: InvestStyle;
  profileType: ProfileType;
}

export interface Holding {
  secid: string;
  code: string;
  name: string;
  cost: number; // 成本价
  shares: number; // 持仓股数
}

interface UserState {
  onboarded: boolean;
  mode: UserMode;
  profile: UserProfile;
  holdings: Holding[];
  favorites: string[]; // 关注的 secid（详情页星标用）

  setMode: (m: UserMode) => void;
  toggleMode: () => void;
  /** 更新画像（分步保存），并自动推导 profileType */
  setProfile: (p: Partial<UserProfile>) => void;
  completeOnboarding: () => void;
  resetProfile: () => void;

  addHolding: (h: Holding) => void;
  removeHolding: (secid: string) => void;
  updateHolding: (secid: string, patch: Partial<Holding>) => void;

  toggleWatch: (secid: string) => void;
  isWatched: (secid: string) => boolean;
}

const DEFAULT_PROFILE: UserProfile = {
  principal: 100000,
  riskTolerance: '中',
  period: '中线',
  targetReturn: '年化8%',
  age: '30-45',
  experience: '小白',
  style: '稳健',
  profileType: '保守型',
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      mode: 'beginner',
      profile: DEFAULT_PROFILE,
      holdings: [],
      favorites: [...DEFAULT_WATCHLIST],

      setMode: (mode) => set({ mode }),
      toggleMode: () =>
        set({ mode: get().mode === 'beginner' ? 'pro' : 'beginner' }),

      setProfile: (p) =>
        set((s) => {
          const next = { ...s.profile, ...p };
          if (p.style) next.profileType = deriveProfileType(p.style);
          return { profile: next };
        }),

      completeOnboarding: () => set({ onboarded: true }),
      resetProfile: () =>
        set({ onboarded: false, profile: DEFAULT_PROFILE, holdings: [] }),

      addHolding: (h) =>
        set({
          holdings: [
            ...get().holdings.filter((x) => x.secid !== h.secid),
            h,
          ],
        }),
      removeHolding: (secid) =>
        set({ holdings: get().holdings.filter((x) => x.secid !== secid) }),
      updateHolding: (secid, patch) =>
        set({
          holdings: get().holdings.map((h) =>
            h.secid === secid ? { ...h, ...patch } : h,
          ),
        }),

      toggleWatch: (secid) => {
        const has = get().favorites.includes(secid);
        set({
          favorites: has
            ? get().favorites.filter((s) => s !== secid)
            : [...get().favorites, secid],
        });
      },
      isWatched: (secid) => get().favorites.includes(secid),
    }),
    { name: 'phoenix-user' },
  ),
);
