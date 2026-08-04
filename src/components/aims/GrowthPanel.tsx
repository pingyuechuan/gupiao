import { GlassCard, Meter, SectionTitle } from '@/components/ui';
import { useAimsGrowthStore, levelFromXp, xpForNext, type StreakKey } from '@/store/aimsGrowthStore';
import { IconSpark, IconBook, IconShield } from '@/components/layout/icons';
import MedalWall from './MedalWall';

const STREAK_LABEL: Record<string, string> = {
  learning: '连续学习',
  correct: '连续正确',
  stop: '连续止损',
  review: '连续复盘',
  noChase: '未追高',
  trade: '实操记录',
};

/** AI 成长系统面板：等级 / 经验 / 连续天数 / 勋章 */
export default function GrowthPanel() {
  const xp = useAimsGrowthStore((s) => s.xp);
  const streaks = useAimsGrowthStore((s) => s.streaks);
  const medals = useAimsGrowthStore((s) => s.medals);
  const recordReview = useAimsGrowthStore((s) => s.recordReview);
  const recordNoChase = useAimsGrowthStore((s) => s.recordNoChase);

  const level = levelFromXp(xp);
  const need = xpForNext(level);
  const cur = xp - (level - 1) * 120;

  return (
    <div className="space-y-4">
      <SectionTitle icon={<IconSpark className="h-4 w-4" />} title="AI 成长系统" sub="等级 Lv1~100 · 每日成长 · 连续打卡 · 投资勋章" />
      <GlassCard className="bg-glass-grad">
        <div className="flex items-center gap-5 p-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-grad text-[15px] font-black text-ink-900">
            Lv{level}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center justify-between text-[13px]">
              <span className="font-bold text-txt">成长等级 {level} / 100</span>
              <span className="text-txt-faint">经验 {xp}</span>
            </div>
            <Meter value={(cur / need) * 100} color="#37e6c9" height={8} />
            <div className="mt-1 text-[11px] text-txt-faint">距 Lv{level + 1} 还需 {Math.max(0, need - cur)} 经验</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 border-t border-line p-4 sm:grid-cols-6">
          {(Object.keys(STREAK_LABEL) as (keyof typeof STREAK_LABEL)[]).map((k) => (
            <div key={k} className="rounded-xl bg-white/4 px-2 py-2 text-center">
              <div className="text-[16px] font-bold text-accent">{streaks[k as StreakKey]}</div>
              <div className="text-[10.5px] text-txt-faint">{STREAK_LABEL[k]}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2 border-t border-line p-4">
          <button onClick={recordReview} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-glass px-3 py-2 text-[12.5px] text-txt-dim hover:text-accent">
            <IconBook className="h-4 w-4" /> 记录今日复盘
          </button>
          <button onClick={recordNoChase} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-glass px-3 py-2 text-[12.5px] text-txt-dim hover:text-accent">
            <IconShield className="h-4 w-4" /> 标记今日没追高
          </button>
        </div>
      </GlassCard>

      <GlassCard title="投资勋章" icon={<IconSpark className="h-4 w-4" />}>
        <MedalWall earned={medals} />
      </GlassCard>
    </div>
  );
}
