import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from '@/store/userStore';

export type OpAction = '买入' | '加仓' | '卖出' | '减仓' | '持有';

export interface OperationRecord {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  secid: string;
  code: string;
  name: string;
  action: OpAction;
  price: number;
  /** 操作时当日涨跌幅（用于判断是否追高） */
  changePercentAtAction: number;
  /** 是否追高（当日涨幅 > 5% 且动作为买入/加仓） */
  chasedHigh: boolean;
  note?: string;
}

export interface MistakePattern {
  type: string;
  label: string;
  detail: string;
  severity: 'high' | 'mid' | 'low';
}

/** AI 记忆系统：长期记住用户画像、风险偏好、持仓、历史操作、常见错误、投资目标 */
interface MemoryState {
  goals: string[];
  ops: OperationRecord[];
  setGoals: (g: string[]) => void;
  addOperation: (rec: Omit<OperationRecord, 'id' | 'date'>) => void;
  detectMistakes: () => MistakePattern[];
  recentChaseHighStreak: () => number;
  /** 给 AIMS 引擎使用的上下文（画像 + 风险 + 追高习惯 + 目标） */
  getContext: () => {
    riskTolerance: '低' | '中' | '高';
    period: '短线' | '中线' | '长线';
    style: '稳健' | '价值' | '成长' | '激进';
    chaseHighStreak: number;
    goals: string[];
  };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export const useAimsMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      goals: [],
      ops: [],

      setGoals: (goals) => set({ goals }),

      addOperation: (rec) => {
        const op: OperationRecord = { ...rec, id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, date: todayStr() };
        set({ ops: [...get().ops, op].slice(-200) });
      },

      recentChaseHighStreak: () => {
        const ops = get().ops;
        if (!ops.length) return 0;
        const sorted = [...ops].sort((a, b) => b.date.localeCompare(a.date));
        let streak = 0;
        for (const o of sorted) {
          if (o.chasedHigh) streak++;
          else break;
        }
        const recent = ops.filter((o) => {
          const days = (Date.now() - new Date(o.date).getTime()) / 86400000;
          return days <= 14 && o.chasedHigh;
        }).length;
        return Math.max(streak, recent >= 3 ? 3 : recent);
      },

      detectMistakes: () => {
        const ops = get().ops;
        const out: MistakePattern[] = [];
        const streak = get().recentChaseHighStreak();
        if (streak >= 2) {
          out.push({
            type: 'chase_high',
            label: '频繁追高',
            detail: `检测到你近期连续 ${streak} 次在个股大涨时买入/加仓，追高容易买在阶段性高点。`,
            severity: streak >= 3 ? 'high' : 'mid',
          });
        }
        // 不止损：卖出/减仓发生在较大亏损后（粗略以 changePercentAtAction < -5 记为被动砍仓）
        const passiveCut = ops.filter((o) => (o.action === '卖出' || o.action === '减仓') && o.changePercentAtAction < -6).length;
        if (passiveCut >= 2) {
          out.push({
            type: 'no_stop',
            label: '止损偏晚',
            detail: `有 ${passiveCut} 次在跌幅较大时才减仓/卖出，说明止损执行偏晚。`,
            severity: 'mid',
          });
        }
        // 频繁交易：7 天内操作 >= 6 次
        const last7 = ops.filter((o) => (Date.now() - new Date(o.date).getTime()) / 86400000 <= 7).length;
        if (last7 >= 6) {
          out.push({
            type: 'overtrade',
            label: '交易偏频繁',
            detail: `近 7 天操作 ${last7} 次，过于频繁容易追涨杀跌、增加摩擦成本。`,
            severity: 'low',
          });
        }
        return out;
      },

      getContext: () => {
        const p = useUserStore.getState().profile;
        return {
          riskTolerance: p.riskTolerance,
          period: p.period,
          style: p.style,
          chaseHighStreak: get().recentChaseHighStreak(),
          goals: get().goals,
        };
      },
    }),
    { name: 'phoenix-aims-memory' },
  ),
);
